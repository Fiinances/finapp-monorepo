# Flowchart — Módulo: `transactions`

> Gerado pelo reversa-archaeologist em 2026-05-02 | `doc_level: detalhado`

---

## Fluxo: `buildSummaries` — agrupamento mensal

```mermaid
flowchart TD
    A([transactions: Transaction array]) --> B[map = new Map]
    B --> C{Para cada transação t}
    C --> D{t.billing_month existe?}
    D -->|sim| E[key = billing_month MM/YYYY\nlabel = NOME_MES YYYY]
    D -->|não| F[parseYearMonth t.date\nkey = MM/YYYY\nlabel = NOME_MES YYYY]
    E --> G
    F --> G{map.has key?}
    G -->|não| H[Cria entrada: count=0, income=0, expense=0, investment=0, total=0]
    G -->|sim| I[Recupera entrada existente]
    H --> I
    I --> J[entry.count++\nentry.transactions.push t]
    J --> K{t.type?}
    K -->|income| L[entry.income += t.amount]
    K -->|investment| M[entry.investment += t.amount]
    K -->|expense/transfer/card_payment| N[entry.expense += t.amount]
    L --> O[entry.total = entry.income - entry.expense]
    M --> O
    N --> O
    O --> C
    C -->|fim| P[Array.from map.values]
    P --> Q[sort por monthYear DESC: localeCompare]
    Q --> R([MonthSummary array])
```

---

## Flowchart por função: `formatDate` — normalização de data para exibição

```mermaid
flowchart TD
    A([date: string]) --> B{Match ISO: YYYY-MM-DD?}
    B -->|sim| C([return DD/MM/YYYY])
    B -->|não| D{Match D-M-YYYY?}
    D -->|sim| E([return DD/MM/YYYY com padStart])
    D -->|não| F([return date original])
```

---

## Flowchart por função: `parseDateToISO` — DD/MM/YYYY → YYYY-MM-DD

```mermaid
flowchart TD
    A([date: string]) --> B{Match DD/MM/YYYY?}
    B -->|sim| C([return YYYY-MM-DD com padStart])
    B -->|não| D([return date original])
```

---

## Flowchart por função: `txBillingMonth` — extrai mês de cobrança

```mermaid
flowchart TD
    A([t: Transaction]) --> B{t.billing_month existe?}
    B -->|sim| C([return billing_month])
    B -->|não| D{t.date formato ISO YYYY-MM-DD?}
    D -->|sim| E([return MM/YYYY extraído de t.date.slice])
    D -->|não| F{t.date match DD/MM/YYYY?}
    F -->|sim| G([return MM/YYYY: br 2 / br 3])
    F -->|não| H([return string vazia])
```
