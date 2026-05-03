# SDD — Importação de Extratos (`import`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `components/import-dropdown.tsx`

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `import` |
| **Camada** | Frontend — componente React |
| **Arquivos** | `components/import-dropdown.tsx` |
| **Responsável por** | Importação de extratos bancários (OFX/CSV) com preview editável, inferência de mês de fatura e auto-categorização por IA |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Componente React que implementa o fluxo completo de importação de extratos financeiros externos. Suporta dois formatos (OFX e CSV), executa o parsing no browser, apresenta uma tela de preview editável onde o usuário pode revisar e corrigir cada transação, e persiste os dados via `window.electronAPI.db.transactions.insert`. Inclui integração com IA para auto-categorização.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Parsing de arquivos OFX para `Transaction[]` | **Must** | 🟢 |
| Parsing de arquivos CSV para `Transaction[]` | **Must** | 🟢 |
| Preview editável das transações antes de salvar | **Must** | 🟢 |
| Seleção de conta/cartão de destino | **Must** | 🟢 |
| Persistência via IPC (`db.transactions.insert`) | **Must** | 🟢 |
| Deduplicação automática de OFX por `external_id` (via IPC) | **Must** | 🟢 |
| Inferência automática de `billing_month` pelo `closing_day` do cartão | **Should** | 🟢 |
| Auto-categorização por IA (`ai.categorize`) | **Should** | 🟢 |
| Detecção de padrão de parcelamento na descrição | **Should** | 🟢 |
| Suporte a múltiplos formatos de data de entrada | **Should** | 🟢 |
| Validação de `billing_month` antes de salvar | **Should** | 🟢 |

---

## 4. Fluxo Principal

### Etapa 1 — Upload

```
1. Usuário abre Dropdown → escolhe "OFX" ou "CSV"
2. Sheet abre no step = "upload"
3. Usuário seleciona arquivo via <input type="file">
4. Usuário submete → onSubmit()
5. Dispatch para processCsv() ou processOfxWithPreview()
6. Parsing do arquivo → mapCsvToTransactions() ou mapOfxToTransactions()
7. loadAccounts() → carrega contas e cartões via IPC
8. setStep("preview")
```

### Etapa 2 — Preview / Confirmação

```
1. Tabela editável exibe todas as transações parseadas
2. Usuário pode: editar description, amount, type (toggle), category, remover linha
3. Botão "Wand" → autoCategories() → ai.categorize via IPC → aplica categorias
4. Se cartão selecionado → billing_month é inferido e exibido (MonthPicker)
5. Usuário confirma → confirmImport()
6. Validações: accountId preenchido, billing_month válido (se cartão)
7. Enriquece transações com account_id/credit_card_id/billing_month
8. db.transactions.insert() via IPC
9. Toast de sucesso com contagem + ignoradas
10. Fecha sheet, chama onSuccess()
```

---

## 5. Funções Principais

### 5.1 `mapCsvToTransactions(rows): Transaction[]`

🟢 Mapeamento fuzzy de colunas CSV para a estrutura `Transaction`.

**Detecção de colunas por substring (case-insensitive):**

| Campo | Candidatos |
|---|---|
| Data | `data`, `date`, `dt` |
| Descrição | `descri`, `historico`, `title`, `lancamento`, `lançamento`, `memo`, `payee`, `name` |
| Valor | `valor`, `amount`, `value`, `montante` |

**Parsing de valor:**
- Se já é `number` → usa diretamente
- Se `string` → remove `.` (milhar BR) → substitui `,` por `.` → `parseFloat`

**Tipo por sinal:**
- `rawAmount >= 0` → `type: "income"`
- `rawAmount < 0` → `type: "expense"`

**Linhas ignoradas:** se `rawDate` ou `rawDesc` vazios → `flatMap` retorna `[]`

---

### 5.2 `mapOfxToTransactions(data): Transaction[]`

🟢 Mapeamento de estrutura OFX parseada para `Transaction[]`.

**Suporta dois tipos de extrato OFX:**
- Bancário: `OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS`
- Cartão: `OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS`

**Mapeamento de campos:**
| OFX | Transaction |
|---|---|
| `DTPOSTED` | `date` (via `parseOfxDate`) |
| `TRNAMT` | `amount` (Math.abs) |
| `TRNTYPE` | `type` (CREDIT→income, DEBIT→expense) |
| `MEMO` / `NAME` | `description` |
| `FITID` | `external_id` |

**Fallback de tipo:** se `TRNTYPE` não é `CREDIT` nem `DEBIT` → usa sinal de `TRNAMT`

---

### 5.3 `detectInstallment(desc: string): {current, total} | null`

🟢 Regex para identificar padrão de parcela na descrição.

**Pattern:** `/\b(\d{1,2})\s*(?:\/|-|de)\s*(\d{1,2})\b/i`

**Exemplos reconhecidos:** `3/12`, `03/12`, `3 DE 12`, `PARC 03/12`, `3-12`

**Validação:**
- `total >= 2`
- `1 <= current <= total`
- Retorna `null` se inválido

---

### 5.4 `inferBillingMonth(transactions, closingDay, fallback): string`

🟢 Determina o mês de fatura por votação majoritária com base no `closing_day` do cartão.

**Algoritmo:**
```
PARA CADA transação:
  parsed = parseTransactionDate(t.date)
  SE parsed.day > closingDay:
    month += 1
    SE month > 12: month = 1, year++
  key = "MM/YYYY"
  votes[key]++

retorna key com maior contagem (ou fallback se empate)
```

---

### 5.5 `normalizeDateToISO(raw: string): string`

🟢 Normaliza datas de entrada para ISO `YYYY-MM-DD`.

| Entrada | Saída |
|---|---|
| `15/01/2025` | `2025-01-15` |
| `15-01-2025` | `2025-01-15` |
| `2025-01-15` | `2025-01-15` (sem alteração) |
| Outros | retorna como está |

---

### 5.6 `parseOfxDate(raw: string): string`

🟢 Extrai apenas a data de uma string OFX `YYYYMMDDHHMMSS[tz]`.

**Pattern:** `/^(\d{4})(\d{2})(\d{2})/`  
**Saída:** `YYYY-MM-DD`

---

## 6. Estado do Componente

```typescript
open: boolean            // Sheet aberta/fechada
kind: 'ofx' | 'csv' | null   // Formato de importação
step: 'upload' | 'preview'   // Etapa atual
fileName: string | null  // Nome do arquivo selecionado
file: File | null        // Objeto File para processamento
loading: boolean         // Processando arquivo
saving: boolean          // Salvando no banco
autoCategorizing: boolean // IA em execução
error: string | null     // Erro de parsing
previewTransactions: Transaction[]  // Transações para preview
accounts: Account[]      // Contas carregadas
creditCards: CreditCard[] // Cartões carregados
accountId: string        // Formato: "a:ID" (conta) ou "c:ID" (cartão)
billingMonth: string     // MM/YYYY
```

---

## 7. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | Deduplicação é responsabilidade do IPC (external_id) — front não valida | `confirmImport():412` | 🟢 |
| RN-02 | `billing_month` só é obrigatório quando o destino é cartão (`c:`) | `confirmImport():400-403` | 🟢 |
| RN-03 | `billing_month` é inferido automaticamente pelo `closing_day` do cartão | `useEffect:281-288` | 🟢 |
| RN-04 | Tipo é clicável na tabela de preview (ciclo: income→expense→investment→transfer→card_payment→income) | `updateRow:618` | 🟢 |
| RN-05 | Auto-categorização aplica a **todas** as transações, substituindo categoria existente | `autoCategories():376-379` | 🟢 |
| RN-06 | Transações sem conta/cartão de destino configurado no context recebem seletor no preview | `!defaultCreditCardId && !defaultAccountId` | 🟢 |
| RN-07 | Categorias predefinidas (hardcoded): Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Salário, Investimento, Transferência, Boleto, Outros | `CATEGORIES const` | 🟢 |
| RN-08 | `amount` sempre positivo — sinal determinado pelo `type` | `Math.abs(rawAmount)` | 🟢 |
| RN-09 | `source` é fixo: `"csv"` ou `"ofx"` conforme o tipo de arquivo | `mapCsvToTransactions:71` | 🟢 |
| RN-10 | `installment_number` é preenchido se padrão N/M detectado na descrição | `detectInstallment():63` | 🟢 |

---

## 8. Props do Componente

```typescript
interface ImportDropdownProps {
  defaultAccountId?: number    // Pré-seleciona conta (omite seletor)
  defaultCreditCardId?: number // Pré-seleciona cartão (omite seletor)
  onSuccess?: () => void       // Callback após importação bem-sucedida
}
```

---

## 9. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Parsing no browser** | PapaParse e ofx-js rodam no renderer, sem envio do arquivo ao processo principal | 🟢 |
| **Zero persistência sem confirmação** | Nada é salvo até o usuário clicar em "Importar N transações" | 🟢 |
| **Extensibilidade de formatos** | `kind` é um enum — novos formatos podem ser adicionados com nova branch no `onSubmit` | 🟡 |
| **Sem limite de transações** | Não há limit imposto no parsing — arquivos grandes podem travar a UI | 🔴 |

---

## 10. Critérios de Aceitação

### CA-01 — CSV com colunas reconhecíveis é parseado corretamente

```
Dado:  arquivo CSV com cabeçalho "Data;Historico;Valor"
       e linha "15/01/2025;Supermercado;-150,00"
Quando: usuário submete o arquivo como CSV
Então: 1 transação no preview
       date = "2025-01-15"
       description = "Supermercado"
       amount = 150.00
       type = "expense"
       source = "csv"
```

### CA-02 — CSV com colunas não reconhecíveis exibe erro

```
Dado:  arquivo CSV com cabeçalho "Col1;Col2;Col3"
Quando: usuário submete o arquivo como CSV
Então: toast de erro exibido
       mensagem: "Não foi possível identificar as colunas: data, descrição, valor"
       step permanece em "upload"
```

### CA-03 — OFX bancário é parseado corretamente

```
Dado:  arquivo OFX com BANKMSGSRSV1 contendo 3 transações
       TRNTYPE = DEBIT, TRNAMT = -200.00, FITID = "abc123"
Quando: usuário submete o arquivo como OFX
Então: 3 transações no preview
       amount = 200.00, type = "expense", external_id = "abc123", source = "ofx"
```

### CA-04 — billing_month é inferido pelo closing_day

```
Dado:  cartão com closing_day = 10
       transações importadas com datas entre 11/01 e 05/02
Quando: o cartão é selecionado como destino
Então: billing_month = "02/2025" (maioria das transações após dia 10 vai para fevereiro)
```

### CA-05 — Importação salva com billing_month para cartão

```
Dado:  5 transações no preview, destino = cartão, billingMonth = "02/2025"
Quando: usuário clica em "Importar 5 transações"
Então: todas as 5 transações são inseridas com billing_month = "02/2025"
       e credit_card_id preenchido com o id do cartão selecionado
```

### CA-06 — Importação para conta bancária não inclui billing_month

```
Dado:  3 transações no preview, destino = conta bancária
Quando: usuário clica em "Importar"
Então: transações inseridas com account_id preenchido e billing_month = undefined/null
```

### CA-07 — Auto-categorização substitui categorias

```
Dado:  3 transações sem categoria no preview
Quando: usuário clica no ícone Wand (auto-categorizar)
       IA retorna ["Alimentação", "Transporte", "Saúde"]
Então: transações recebem as categorias na mesma ordem
       toast: "3 transação(ões) categorizadas"
```

### CA-08 — Importação sem conta selecionada exibe erro

```
Dado:  preview com transações mas accountId vazio
Quando: usuário clica em "Importar"
Então: toast.error "Selecione uma conta ou cartão de destino"
       nenhuma transação é salva
```

---

## 11. Cenários de Borda (detalhado)

### CB-01 — OFX com STMTTRN como objeto único (não array)

```
Dado:  arquivo OFX com apenas 1 transação (STMTTRN não é array)
Quando: mapOfxToTransactions é chamado
Então: Array.isArray(txList) = false → [txList] → processa como array de 1 item
       1 transação retornada corretamente
```

### CB-02 — CSV com valor positivo interpretado como income

```
Dado:  linha CSV com valor = "+500" ou "500,00"
Quando: mapCsvToTransactions é chamado
Então: rawAmount = 500 (positivo) → type = "income", amount = 500
```

### CB-03 — Descrição com padrão N/M detecta installment_number

```
Dado:  linha CSV com historico = "AMAZON PRIME 2/6"
Quando: mapCsvToTransactions é chamado
Então: detectInstallment retorna { current: 2, total: 6 }
       installment_number = 2 na transação gerada
```

### CB-04 — inferBillingMonth com closing_day = 31 (meses curtos)

```
Dado:  cartão com closing_day = 31
       transação com date = "2025-02-28" (fevereiro — sem dia 31)
Quando: inferBillingMonth é chamado
Então: day (28) < closingDay (31) → mês não avança → billing_month = "02/2025"
       ⚠️ comportamento correto mas pode surpreender usuário de cartões com closing_day > 28
```

### CB-05 — Arquivo OFX de cartão de crédito (CREDITCARDMSGSRSV1)

```
Dado:  arquivo OFX com estrutura CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS
Quando: mapOfxToTransactions é chamado
Então: extrato de cartão parseado corretamente (fallback para ccMsgs)
```

---

## 12. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `papaparse` | npm | Parsing de CSV |
| `ofx-js` | npm | Parsing de OFX |
| `lib/transactions.ts` | interno | `parseMaskedAmount` |
| `window.electronAPI.db.accounts.list` | IPC | Carrega contas |
| `window.electronAPI.db.creditCards.list` | IPC | Carrega cartões |
| `window.electronAPI.db.transactions.insert` | IPC | Persiste transações |
| `window.electronAPI.ai.categorize` | IPC | Auto-categorização |
| `components/month-picker` | interno | Seleção de billing_month |
| `sonner` | npm | Toasts de feedback |
