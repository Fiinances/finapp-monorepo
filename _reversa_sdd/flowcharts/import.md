# Flowchart — Módulo: `import`

> Gerado pelo reversa-archaeologist em 2026-05-02 | `doc_level: detalhado`

---

## Fluxo geral de importação (OFX e CSV)

```mermaid
flowchart TD
    A([Usuário clica em Importar]) --> B{Escolha: OFX ou CSV?}
    B -->|OFX| C[openFor'ofx']
    B -->|CSV| D[openFor'csv']
    C --> E[Sheet abre: step=upload]
    D --> E

    E --> F[Usuário seleciona arquivo]
    F --> G[onFileChange → state: file, fileName]
    G --> H[Usuário clica em Enviar]

    H --> I{kind?}
    I -->|csv| J[processCsv]
    I -->|ofx| K[processOfxWithPreview]

    J --> L[Papa.parse com header:true, dynamicTyping:true]
    L -->|erro| M[toast.error + setError]
    L -->|dados| N[mapCsvToTransactions]
    N -->|erro colunas não encontradas| M
    N -->|transações| O[setPreviewTransactions]

    K --> P[parseOfx - lib ofx-js]
    P -->|erro| M
    P -->|dados| Q[mapOfxToTransactions]
    Q -->|erro formato OFX| M
    Q -->|transações| O

    O --> R[loadAccounts]
    R --> S[setStep: preview]

    S --> T[Usuário edita transações na tabela]
    T --> U{Auto-categorizar?}
    U -->|sim| V[autoCategories → ai.categorize via IPC]
    V -->|categorias| W[setPreviewTransactions com categorias]
    U -->|não| X

    W --> X[Usuário clica em Importar N transações]
    X --> Y{accountId selecionado?}
    Y -->|não| Z[toast.error: selecione conta]
    Y -->|sim| AA{É cartão de crédito?}

    AA -->|sim| AB{billingMonth válido?}
    AB -->|não| AC[toast.error: formato MM/AAAA]
    AB -->|sim| AD[Adiciona billing_month nas transações]
    AA -->|não| AE[Adiciona account_id nas transações]

    AD --> AF[db.transactions.insert via IPC]
    AE --> AF

    AF -->|resultado| AG[toast.success: N importadas, M ignoradas]
    AG --> AH[setOpen false + resetSheet + onSuccess]
    AF -->|erro| AI[toast.error]
```

---

## Flowchart por função: `mapCsvToTransactions`

```mermaid
flowchart TD
    A([rows: Record string,unknown array]) --> B[headers = Object.keys rows 0]
    B --> C[findCol: dateCol, descCol, amountCol]
    C --> D{Alguma coluna faltando?}
    D -->|sim| E[throw Error com colunas não encontradas]
    D -->|não| F[rows.flatMap row =>]

    F --> G[rawDate = row dateCol]
    G --> H[rawDesc = row descCol]
    H --> I{rawAmount é number?}
    I -->|sim| J[usa diretamente]
    I -->|não| K[parseFloat: remove . BR, substitui , por .]

    J --> L{rawDate ou rawDesc vazio?}
    K --> L
    L -->|sim| M[return vazio - ignora linha]
    L -->|não| N[detectInstallment rawDesc]
    N --> O[normalizeDateToISO rawDate]
    O --> P[Cria Transaction]

    P --> Q{rawAmount >= 0?}
    Q -->|sim| R[type: income]
    Q -->|não| S[type: expense]
    R --> T[amount: Math.abs rawAmount]
    S --> T
    T --> U([Transaction com installment_number])
```

---

## Flowchart por função: `inferBillingMonth`

```mermaid
flowchart TD
    A([transactions, closingDay, fallback]) --> B[votes = Map string, number]
    B --> C{Para cada transação}
    C --> D[parseTransactionDate t.date]
    D -->|null| E[pula]
    D -->|day,month,year| F{day > closingDay?}
    F -->|sim| G[month += 1]
    G --> H{month > 12?}
    H -->|sim| I[month = 1; year++]
    H -->|não| J
    F -->|não| J
    I --> J[key = MM/YYYY]
    J --> K[votes.set key, count+1]
    K --> C
    C -->|fim| L[Encontra chave com maior count]
    L --> M([Retorna MM/YYYY vencedor ou fallback])
```

---

## Flowchart por função: `detectInstallment`

```mermaid
flowchart TD
    A([desc: string]) --> B[regex match: n/m, n-m, n DE m]
    B -->|sem match| C([return null])
    B -->|match| D[current = parseInt m1]
    D --> E[total = parseInt m2]
    E --> F{total >= 2?}
    F -->|não| C
    F -->|sim| G{current >= 1 AND current <= total?}
    G -->|não| C
    G -->|sim| H([return current, total])
```
