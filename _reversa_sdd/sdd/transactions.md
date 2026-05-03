# SDD — Utilitários de Transações (`transactions`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `lib/transactions.ts`, `app/types/electron.d.ts`

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `transactions` |
| **Camada** | Frontend — biblioteca compartilhada (lib) |
| **Arquivos** | `lib/transactions.ts` |
| **Responsável por** | Parsing de datas, formatação, agrupamento mensal e extração do mês de cobrança |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Biblioteca de funções puras para manipulação de transações financeiras no renderer. Centraliza toda a lógica de parsing de datas (em múltiplos formatos legados), formatação de valores e o algoritmo de agrupamento mensal (`buildSummaries`) que alimenta o dashboard e as páginas de conta/cartão.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Agrupar transações por mês em `MonthSummary[]` (`buildSummaries`) | **Must** | 🟢 |
| Determinar o mês de cobrança de uma transação (`txBillingMonth`) | **Must** | 🟢 |
| Parsear valor monetário mascarado para `number` (`parseMaskedAmount`) | **Must** | 🟢 |
| Normalizar data para formato ISO `YYYY-MM-DD` (`parseDateToISO`) | **Must** | 🟢 |
| Extrair chave de agrupamento `MM/YYYY` de uma data (`parseYearMonth`) | **Must** | 🟢 |
| Formatar data ISO para exibição `DD/MM/YYYY` (`formatDate`) | **Should** | 🟢 |

---

## 4. API Pública

### 4.1 `buildSummaries(transactions: Transaction[]): MonthSummary[]`

🟢 Agrupa uma lista de transações por mês de referência e retorna os totais calculados, ordenados do mais recente para o mais antigo.

**Lógica de chave de agrupamento:**
- Se `t.billing_month` existe → usa diretamente como chave `MM/YYYY`
- Caso contrário → deriva de `t.date` via `parseYearMonth()`

**Acumuladores por mês:**
```
entry.income      += t.amount  (quando type === 'income')
entry.investment  += t.amount  (quando type === 'investment')
entry.expense     += t.amount  (quando type === 'expense' | 'transfer' | 'card_payment')
entry.total        = entry.income - entry.expense
```

> ⚠️ 🟢 `transfer` e `card_payment` somam em `expense` para fins de cálculo de total.  
> ⚠️ 🟢 `investment` **não** entra no `total`.

**Ordenação:** `.sort((a, b) => b.monthYear.localeCompare(a.monthYear))` 🟡

> ⚠️ 🟡 Potencial bug: `localeCompare` em strings `MM/YYYY` pode ordenar incorretamente meses de anos diferentes (ex: `12/2025` vs `01/2026`). A comparação léxica funciona corretamente apenas se ano for o primeiro campo (ISO).

---

### 4.2 `txBillingMonth(t: Transaction): string`

🟢 Retorna o mês de cobrança de uma transação no formato `MM/YYYY`.

**Lógica de derivação (em ordem de prioridade):**
1. Se `t.billing_month` existe → retorna diretamente
2. Se `t.date` bate com `YYYY-MM-DD` → retorna `MM/YYYY` via slice
3. Se `t.date` bate com `DD/MM/YYYY` → extrai e retorna `MM/YYYY`
4. Fallback → retorna string vazia

---

### 4.3 `parseMaskedAmount(input: string): number`

🟢 Converte uma string de valor monetário mascarada para `number`.

**Algoritmo:**
```
"1.234,56"
→ remove todos os não-dígitos exceto vírgula e ponto: "1.234,56"
→ remove separadores de milhar (ponto BR): "1234,56"
→ substitui vírgula decimal por ponto: "1234.56"
→ parseFloat: 1234.56
```

**Implementação real:** remove todos os caracteres não-dígitos, depois divide por 100:
```
"1.234,56" → remove [^0-9] → "123456" → parseInt → 123456 / 100 → 1234.56
```

---

### 4.4 `parseDateToISO(date: string): string`

🟢 Converte `DD/MM/YYYY` para `YYYY-MM-DD`. Retorna a string original se não reconhecer o formato.

**Regras:**
- Match `/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/` → `YYYY-MM-DD` com padStart
- Qualquer outro formato → retorna como está

---

### 4.5 `parseYearMonth(date: string): string`

🟢 Extrai a chave de agrupamento `MM/YYYY` de uma string de data.

**Regras (em ordem):**
- `YYYY-MM-DD` → retorna `MM/YYYY`
- `DD/MM/YYYY` → retorna `MM/YYYY`
- Outros → 🔴 comportamento não especificado (retorna string vazia ou parte da data)

---

### 4.6 `formatDate(date: string): string`

🟢 Formata uma data para exibição no padrão brasileiro `DD/MM/YYYY`.

**Regras:**
- `YYYY-MM-DD` → `DD/MM/YYYY`
- `D-M-YYYY` → `DD/MM/YYYY` (com padStart)
- Outros → retorna como está

---

## 5. Tipos de Dados

### `Transaction` (interface core)

🟢 Definida em `app/types/electron.d.ts`

| Campo | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `number?` | não | PK auto |
| `account_id` | `number \| null` | não | FK → accounts |
| `credit_card_id` | `number \| null` | não | FK → credit_cards |
| `date` | `string` | sim | ISO ou legado DD/MM/YYYY |
| `description` | `string` | sim | Estabelecimento/descrição |
| `amount` | `number` | sim | Sempre ≥ 0 |
| `type` | `'income' \| 'expense' \| 'investment' \| 'transfer' \| 'card_payment'` | sim | Tipo da movimentação |
| `category` | `string?` | não | Categoria textual |
| `source` | `'manual' \| 'csv' \| 'ofx'` | não | Origem |
| `external_id` | `string?` | não | ID OFX para deduplicação |
| `category_id` | `number \| null` | não | FK → transaction_categories |
| `billing_month` | `string \| null` | não | `MM/YYYY` — fatura do cartão |
| `installment_group_id` | `number \| null` | não | FK → installment_groups |
| `installment_number` | `number \| null` | não | Número da parcela (1-based) |

### `MonthSummary` (calculado, não persistido)

🟢 Produzido por `buildSummaries()`

| Campo | Tipo TS | Descrição |
|---|---|---|
| `monthYear` | `string` | Chave `MM/YYYY` |
| `label` | `string` | Ex: `"Janeiro 2025"` |
| `count` | `number` | Total de transações no mês |
| `income` | `number` | Soma das entradas |
| `expense` | `number` | Soma das saídas (inclui transfer e card_payment) |
| `investment` | `number` | Soma dos investimentos |
| `total` | `number` | `income - expense` |
| `transactions` | `Transaction[]` | Lista completa de transações do mês |

---

## 6. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | `amount` é sempre positivo — `type` determina entrada/saída | `app/types/electron.d.ts` | 🟢 |
| RN-02 | `total = income - expense` (investment não entra) | `lib/transactions.ts:70` | 🟢 |
| RN-03 | `transfer` e `card_payment` somam em `expense` | `lib/transactions.ts:67-70` | 🟢 |
| RN-04 | Prioridade do `billing_month` sobre `date` para agrupamento | `lib/transactions.ts:45-50` | 🟢 |
| RN-05 | Suporte a dois formatos de data coexistentes (ISO e DD/MM/YYYY) | `lib/transactions.ts` | 🟢 |
| RN-06 | Ordenação de meses por `localeCompare` em `MM/YYYY` | `lib/transactions.ts:72` | 🟢 |

---

## 7. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Funções puras** | Nenhuma das funções tem side effects — todas recebem input e retornam output | 🟢 |
| **Sem I/O** | Nenhuma chamada IPC, fetch ou acesso a estado global | 🟢 |
| **Performance** | `buildSummaries` usa `Map` para O(N) na agregação | 🟢 |

---

## 8. Critérios de Aceitação

### CA-01 — `buildSummaries` agrupa corretamente por billing_month

```
Dado:  3 transações de crédito com billing_month = "03/2025"
       e 2 transações bancárias com date = "2025-02-15"
Quando: buildSummaries é chamado com as 5 transações
Então: retorna 2 MonthSummary
       - "03/2025": count = 3
       - "02/2025": count = 2
       ordenados: "03/2025" primeiro, "02/2025" depois
```

### CA-02 — `buildSummaries` calcula total corretamente

```
Dado:  1 transação income = 5000
       1 transação expense = 1500
       1 transação investment = 500
       1 transação transfer = 200
       (todas no mesmo mês)
Quando: buildSummaries é chamado
Então: income = 5000, expense = 1700, investment = 500, total = 3300
       (transfer soma em expense, investment NÃO entra no total)
```

### CA-03 — `parseMaskedAmount` com formato brasileiro

```
Dado:  input = "1.234,56"
Quando: parseMaskedAmount é chamado
Então: retorna 1234.56 (number)
```

### CA-04 — `parseDateToISO` normaliza DD/MM/YYYY

```
Dado:  date = "05/03/2025"
Quando: parseDateToISO é chamado
Então: retorna "2025-03-05"
```

### CA-05 — `parseDateToISO` retorna ISO inalterado

```
Dado:  date = "2025-03-05"
Quando: parseDateToISO é chamado
Então: retorna "2025-03-05"
```

### CA-06 — `txBillingMonth` prioriza billing_month

```
Dado:  transação com billing_month = "03/2025" e date = "2025-02-28"
Quando: txBillingMonth é chamado
Então: retorna "03/2025" (billing_month tem prioridade sobre date)
```

### CA-07 — `txBillingMonth` deriva de date ISO quando sem billing_month

```
Dado:  transação com billing_month = null e date = "2025-03-15"
Quando: txBillingMonth é chamado
Então: retorna "03/2025"
```

---

## 9. Cenários de Borda (detalhado)

### CB-01 — `buildSummaries` com lista vazia

```
Dado:  transactions = []
Quando: buildSummaries é chamado
Então: retorna []
```

### CB-02 — Ordenação cross-year com localeCompare

```
Dado:  transações em "12/2025" e "01/2026"
Quando: buildSummaries é chamado
Então: ⚠️ "12/2025".localeCompare("01/2026") > 0 → "12/2025" vem primeiro
       Comportamento CORRETO neste caso específico, mas frágil
       O correto seria comparar por YYYY × 12 + MM
```

### CB-03 — `parseMaskedAmount` com entrada vazia ou não-numérica

```
Dado:  input = "" ou "abc"
Quando: parseMaskedAmount é chamado
Então: ⚠️ remove todos os não-dígitos → "" → parseInt("") = NaN → NaN / 100 = NaN
       LACUNA: não há tratamento de NaN
```

### CB-04 — `txBillingMonth` com date em formato não reconhecido

```
Dado:  transação com billing_month = null e date = "2025/03/15"
Quando: txBillingMonth é chamado
Então: retorna "" (string vazia — nenhum match de regex)
```

---

## 10. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `app/types/electron.d.ts` | Tipo TypeScript | Interface `Transaction`, `MonthSummary` |
| Nenhuma dependência runtime | — | Todas as funções são puras e não têm imports externos |
