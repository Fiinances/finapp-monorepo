# Flowchart — Módulo: `ipc-db`

> Gerado pelo reversa-archaeologist em 2026-05-02 | `doc_level: detalhado`

---

## Fluxo geral: ciclo de vida do banco de dados

```mermaid
flowchart TD
    A([app.whenReady]) --> B[registerDbHandlers]
    B --> C[migrate — db.migrate.latest]
    C -->|erro| D[console.error migration failed]
    C -->|ok| E[13 handlers IPC registrados]
    E --> F([App pronto para receber IPC calls])

    F --> G{Chamada IPC chegou}
    G --> H[getKnex]
    H --> I{_knex existe?}
    I -->|não| J[Cria instância Knex + SQLite]
    I -->|sim| K[Retorna singleton]
    J --> K
    K --> L[Executa query]
    L -->|ok| M([Retorna resultado ao renderer])
    L -->|erro| N([Propaga erro ao renderer])
```

---

## Flowchart por função: `db:transactions:insert` — deduplicação

```mermaid
flowchart TD
    A([rows: Transaction ou Transaction array]) --> B[Normaliza para array list]
    B --> C[Extrai external_ids não-nulos]
    C --> D{ids.length > 0?}
    D -->|sim| E[SELECT external_id WHERE external_id IN ids]
    D -->|não| F[existing = Set vazio]
    E --> F

    F --> G[toInsert = list.filter: sem external_id OU external_id não existe]
    G --> H{toInsert vazio?}
    H -->|sim| I([return inserted:0, skipped: list.length])
    H -->|não| J[INSERT toInsert]
    J --> K([return inserted: toInsert.length, skipped: list.length - toInsert.length])
```

---

## Flowchart por função: `db:installmentGroups:list` — cálculo de progresso

```mermaid
flowchart TD
    A([filters]) --> B[SELECT installment_groups]
    B --> C{groups vazio?}
    C -->|sim| D([return empty array])
    C -->|não| E[SELECT transactions WHERE installment_group_id IN ids]
    E --> F[Monta txMap: groupId -> transactions]
    F --> G[current = mês/ano atual]
    G --> H{Para cada group}
    H --> I[parseMonthYear first_billing_month]
    I --> J{start válido?}
    J -->|não| K[real_paid_installments = 0]
    J -->|sim| L[real_paid = monthsBetween start, current + 1]
    K --> M
    L --> M[real_remaining = installments - real_paid]
    M --> N[perInstallment = total_amount / installments]
    N --> O[real_paid_amount = perInstallment * real_paid]
    O --> P[real_remaining_amount = total_amount - real_paid_amount]
    P --> Q([Retorna group com campos computados])
    Q --> H
```

---

## Flowchart por função: `db:installmentGroups:detect` — detecção de padrão

```mermaid
flowchart TD
    A([sem params]) --> B[cutoff = hoje - 2 meses]
    B --> C[SELECT transações cartão, sem grupo, date >= cutoff]
    C --> D{Para cada row}
    D --> E[detectInDesc: regex na description]
    E -->|sem match| F[pula]
    E -->|match| G[current, total, raw]
    G --> H[base = stripInstallmentPart desc, raw]
    H --> I[key = creditCardId :: base :: total]
    I --> J{groupMap.has key?}
    J -->|não| K[Cria novo grupo no map]
    J -->|sim| L
    K --> L[Adiciona transaction ao grupo]
    L --> D
    D -->|fim| M[Para cada grupo no map]
    M --> N[sorted = transactions por installment_number]
    N --> O[earliest = sorted 0]
    O --> P{earliest.billing_month existe?}
    P -->|sim| Q[refMonth = billing_month]
    P -->|não| R[refMonth = MM/YYYY do date]
    Q --> S
    R --> S{earliest.installment_number > 1?}
    S -->|sim| T[Retroage first_billing_month: mm - installment_number + 1]
    S -->|não| U[first_billing_month = refMonth]
    T --> V
    U --> V[total_amount = installment_amount * total arredondado]
    V --> W([Retorna DetectedInstallment])
    W --> M
```
