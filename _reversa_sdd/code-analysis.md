# Análise Técnica de Código — Finapp

> Gerado pelo reversa-archaeologist em 2026-05-02
> `doc_level: detalhado`

---

## Visão Geral do Sistema

O **Finapp** é uma aplicação desktop de controle financeiro pessoal construída com a arquitetura **Electron + Next.js**. O processo principal (Electron/Node.js) gerencia o banco de dados SQLite local e expõe uma API IPC. O processo renderer (Next.js/React) implementa a UI e consome essa API via `window.electronAPI`.

---

## Módulo 1: `transactions`

**Arquivos:** `lib/transactions.ts`, `app/page.tsx`, `app/types/electron.d.ts`

### Funções principais

| Função | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `parseMaskedAmount(input)` | `string` | `number` | 🟢 CONFIRMADO |
| `formatDate(date)` | `string` | `string` | 🟢 CONFIRMADO |
| `parseDateToISO(date)` | `string` | `string` | 🟢 CONFIRMADO |
| `parseYearMonth(date)` | `string` | `string` | 🟢 CONFIRMADO |
| `buildSummaries(transactions)` | `Transaction[]` | `MonthSummary[]` | 🟢 CONFIRMADO |
| `txBillingMonth(t)` | `Transaction` | `string` | 🟢 CONFIRMADO |

### Algoritmos não-triviais

#### `buildSummaries` — Agrupamento por mês de cobrança

Agrega transações em `MonthSummary[]` usando `Map<string, MonthSummary>`:
- **Chave de agrupamento:** Se `billing_month` existe, usa-o diretamente. Senão, deriva do campo `date` via `parseYearMonth()`.
- **Chave formato:** `MM/YYYY`
- **Acumuladores:** `income`, `expense`, `investment`, `total`
- **`total`** = `income - expense` (investimentos **não** entram no total) 🟢
- **Ordenação:** Descrescente por `monthYear` (string `MM/YYYY`), usando `localeCompare`
- 🔴 **LACUNA** — A ordenação de `MM/YYYY` por `localeCompare` pode produzir ordenação incorreta quando meses de anos diferentes se misturam (ex: `12/2025` vs `01/2026`). Precisa de validação.

#### `parseMaskedAmount`

Remove todos os caracteres não-numéricos e divide por 100:
```
"1.234,56" → remove não-dígitos → "123456" → parseInt → 123456 / 100 → 1234.56
```

### Estruturas de dados — Entidade `Transaction`

🟢 CONFIRMADO (via `app/types/electron.d.ts`)

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `id` | `number` | não | auto-increment |
| `account_id` | `number \| null` | não | FK → accounts |
| `credit_card_id` | `number \| null` | não | FK → credit_cards |
| `date` | `string` | sim | ISO `YYYY-MM-DD` (ou legado `DD/MM/YYYY`) |
| `description` | `string` | sim | texto livre |
| `amount` | `number` | sim | sempre positivo |
| `type` | `enum` | sim | `income \| expense \| investment \| transfer \| card_payment` |
| `category` | `string` | não | texto livre ou predefinido |
| `source` | `enum` | não | `manual \| csv \| ofx` |
| `external_id` | `string` | não | ID OFX (deduplicação) |
| `category_id` | `number \| null` | não | FK → transaction_categories |
| `billing_month` | `string \| null` | não | formato `MM/YYYY` |
| `installment_group_id` | `number \| null` | não | FK → installment_groups |
| `installment_number` | `number \| null` | não | 1-based |
| `created_at` | `string` | não | ISO datetime |
| `updated_at` | `string` | não | ISO datetime |

### Regras de negócio identificadas

1. 🟢 **Deduplicação por `external_id`**: ao inserir, transações com `external_id` já existente são ignoradas. Aplica-se apenas a importações OFX.
2. 🟢 **Tipo por sinal do valor**: em importações CSV/OFX, valor ≥ 0 → `income`, valor < 0 → `expense`.
3. 🟢 **`amount` sempre positivo**: o sinal de entrada/saída é determinado pelo campo `type`, não pelo sinal do `amount`.
4. 🟢 **`total` exclui investimentos**: `total = income - expense` (investments são rastreados separadamente).

---

## Módulo 2: `ipc-db`

**Arquivo:** `electron/db-handlers.js`, `electron/database.js`

### Inicialização do banco

- **Caminho:** `app.getPath('userData')/Database/finapp.db`
- **Driver:** `better-sqlite3` (síncrono, mas exposto via Knex assíncrono)
- **Migrations:** executadas automaticamente no `registerDbHandlers()` via `db.migrate.latest()`
- **Singleton:** instância Knex é mantida em `_knex` (módulo-level), lazy-initialized

### Handlers IPC registrados

| Canal IPC | Operação | Observações |
|---|---|---|
| `db:transactions:list` | SELECT com filtros opcionais | Ordenado por `date DESC` |
| `db:transactions:insert` | INSERT em batch | Deduplicação por `external_id` |
| `db:transactions:update` | UPDATE por `id` | |
| `db:transactions:delete` | DELETE por `id` | |
| `db:transactions:deleteByMonth` | DELETE por `accountId` + `monthYear` | SQL raw com duplo match (ISO + legacy) |
| `db:accounts:list` | SELECT | Ordenado por `name` |
| `db:accounts:insert` | INSERT | Retorna `id` |
| `db:accounts:update` | UPDATE por `id` | |
| `db:accounts:delete` | DELETE por `id` | |
| `db:creditCards:list` | SELECT | Ordenado por `name` |
| `db:creditCards:insert` | INSERT | Retorna `id` |
| `db:creditCards:update` | UPDATE por `id` | |
| `db:creditCards:delete` | DELETE por `id` | |
| `db:creditCards:deleteByMonth` | DELETE por `creditCardId` + `monthYear` | Deleta de `transactions`, não de `credit_cards` |
| `db:subscriptions:list` | SELECT | Ordenado por `name` |
| `db:subscriptions:insert` | INSERT | Retorna `id` |
| `db:subscriptions:update` | UPDATE por `id` | |
| `db:subscriptions:delete` | DELETE por `id` | |
| `db:subscriptions:detect` | Raw SQL — detecção de recorrência | Threshold: ≥3 ocorrências, variância < 5% |
| `db:transaction_categories:list` | SELECT | Ordenado por `name` |
| `db:transaction_categories:create` | INSERT | Retorna row completo |
| `db:transaction_categories:update` | UPDATE por `id` | |
| `db:transaction_categories:delete` | DELETE por `id` | |
| `db:installmentGroups:list` | SELECT + JOIN + cálculo de progresso | Retorna campos computados |
| `db:installmentGroups:insert` | INSERT | Retorna `id` |
| `db:installmentGroups:update` | UPDATE por `id` | |
| `db:installmentGroups:delete` | DELETE + unlink transactions | |
| `db:installmentGroups:detect` | Varredura últimos 2 meses | Pattern matching em `description` |

### Algoritmos não-triviais

#### `db:transactions:deleteByMonth` — duplo match por data

```sql
WHERE account_id = ?
AND (strftime('%m/%Y', date) = ? OR SUBSTR(date, 4, 7) = ?)
```
Suporta dois formatos de data históricos: `YYYY-MM-DD` (ISO) e `DD/MM/YYYY` (legado).

#### `db:installmentGroups:list` — cálculo de progresso por calendário

Calcula parcelas pagas/restantes baseado na **diferença temporal** entre `first_billing_month` e o mês atual:
- `real_paid_installments = monthsBetween(start, current) + 1`
- **Não** conta transações reais — usa apenas o calendário.
- 🔴 **LACUNA** — Se o usuário pausar pagamentos, o cálculo ainda avança. O campo `paid_installments` da tabela existe mas **não é usado** neste handler.

#### `db:subscriptions:detect` — detecção de recorrência

```sql
GROUP BY description
HAVING COUNT(*) >= 3
AND (MAX(amount) - MIN(amount)) / AVG(amount) < 0.05
```
Agrupa por `description` exata, requer ≥3 ocorrências e variação de valor < 5%.
- 🟡 **INFERIDO** — Só detecta `type = 'expense'`. Assinaturas de entrada não são detectadas automaticamente.

#### `db:installmentGroups:detect` — detecção de padrão de parcelamento

1. Busca transações de cartão dos últimos 2 meses sem `installment_group_id`
2. Aplica regex na `description`: `\b(\d{1,2})\s*(?:\/|-|de)\s*(\d{1,2})\b`
3. Valida: `total ≥ 2`, `current ≥ 1`, `current ≤ total`
4. Agrupa por chave `creditCardId::baseDescription::totalInstallments`
5. Retroage para calcular `first_billing_month` baseado em `installment_number`

---

## Módulo 3: `ipc-llm`

**Arquivos:** `electron/llm-handlers.js`, `lib/llm-client.ts`, `lib/llm-worker.ts`

### Caminho 1 — Groq API (nuvem, processo principal)

| Função | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `categorizeTransactions(_, transactions)` | `Transaction[]` | `string[]` | 🟢 CONFIRMADO |

- **Modelo:** `openai/gpt-oss-120b` via Groq API
- **Temperature:** 0 (determinístico)
- **Parsing da resposta:** busca primeiro `["` e último `"]` no output — frágil se o modelo incluir prefixo/sufixo
- 🔴 **LACUNA** — Modelo `openai/gpt-oss-120b` não é um modelo Groq padrão conhecido. Pode ser alias interno ou erro de configuração.
- **GROQ_API_KEY:** carregada de `process.env` (via `.env` ou `runtime-config.js`)

### Caminho 2 — MediaPipe LLM (local, Web Worker)

| Função | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `initLLM(modelBuffer)` | `ReadableStream<Uint8Array>` | `Promise<void>` | 🟢 CONFIRMADO |
| `generate(prompt)` | `string` | `Promise<string>` | 🟢 CONFIRMADO |
| `isLLMReady()` | — | `boolean` | 🟢 CONFIRMADO |

- Executa em Web Worker isolado
- Comunicação por `postMessage` com protocolo: `init`, `generate`, `ready`, `init-error`, `generate-result`, `generate-error`
- **WASM:** carregado de CDN (`cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.26/wasm`)
- **Transferência zero-copy:** `modelBuffer` é transferido para o worker (referência local é detached)
- **maxTokens:** 20480

---

## Módulo 4: `import`

**Arquivo:** `components/import-dropdown.tsx`

### Funções principais

| Função | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `mapCsvToTransactions(rows)` | `Record<string,unknown>[]` | `Transaction[]` | 🟢 CONFIRMADO |
| `mapOfxToTransactions(data)` | `Record<string,unknown>` | `Transaction[]` | 🟢 CONFIRMADO |
| `detectInstallment(desc)` | `string` | `{current,total}\|null` | 🟢 CONFIRMADO |
| `inferBillingMonth(txns, closingDay, fallback)` | `Transaction[], number, string` | `string` | 🟢 CONFIRMADO |
| `normalizeDateToISO(raw)` | `string` | `string` | 🟢 CONFIRMADO |
| `parseOfxDate(raw)` | `string` | `string` | 🟢 CONFIRMADO |
| `findCol(headers, ...candidates)` | `string[], ...string[]` | `string\|undefined` | 🟢 CONFIRMADO |

### Algoritmos não-triviais

#### `mapCsvToTransactions` — Mapeamento fuzzy de colunas

Detecta colunas por substring case-insensitive em múltiplos candidatos:
- **Data:** `data`, `date`, `dt`
- **Descrição:** `descri`, `historico`, `title`, `lancamento`, `lançamento`, `memo`, `payee`, `name`
- **Valor:** `valor`, `amount`, `value`, `montante`

Parsing de valores:
- Se numérico, usa diretamente
- Se string: remove `.` (separador de milhar BR), substitui `,` por `.`

#### `inferBillingMonth` — Inferência de mês de fatura

Para cada transação, verifica o `closing_day` do cartão:
- `day <= closingDay` → mês atual da transação
- `day > closingDay` → próximo mês (com carry para janeiro se mês > 12)
- Usa **votação por maioria** entre as transações importadas

#### `detectInstallment` — Regex para padrão de parcela

```regex
\b(\d{1,2})\s*(?:\/|-|de)\s*(\d{1,2})\b
```
Captura: `3/12`, `03/12`, `3 DE 12`, `PARC 03/12`, `3-12`
Validação: `total ≥ 2`, `1 ≤ current ≤ total`

#### Fluxo de importação (2 etapas)

1. **Upload:** usuário seleciona arquivo → `processCsv()` ou `processOfxWithPreview()` → preview
2. **Confirmação:** usuário edita/aprova transações → `confirmImport()` → `window.electronAPI.db.transactions.insert()`

### Categorias predefinidas (hardcoded)

`Alimentação`, `Transporte`, `Moradia`, `Saúde`, `Educação`, `Lazer`, `Vestuário`, `Salário`, `Investimento`, `Transferência`, `Boleto`, `Outros`

---

## Módulo 5: `electron-main`

**Arquivo:** `electron/main.js`

### Funções principais

| Função | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `createWindow()` | — | `Promise<BrowserWindow>` | 🟢 CONFIRMADO |
| `setupAutoUpdater(mainWindow)` | `BrowserWindow` | `void` | 🟢 CONFIRMADO |

### Configurações da janela

- **Tamanho inicial:** 1200×800
- **show: false** + `ready-to-show` → evita flash branco
- **backgroundColor:** `#2B2D31` (cor de fundo antes do carregamento)
- **nodeIntegration: false** + **contextIsolation: true** (segurança)
- **sandbox: false** — necessário para WebGPU no worker
- **Menu:** desativado (`setMenu(null)`)

### Flags WebGPU

Necessárias para o LLM local via MediaPipe:
```
enable-unsafe-webgpu
enable-features: WebGPU,WebGPUExperimentalFeatures,WebGPUSubgroups
ignore-gpu-blocklist
disable-gpu-process-crash-limit
```

### Auto-updater

- **Só ativa em produção** (`!app.isPackaged`)
- **autoDownload: false** — download manual pelo usuário
- **autoInstallOnAppQuit: false** — instalação manual
- Canais IPC: `updater:available`, `updater:downloaded`, `updater:download`, `updater:install`

### IPC de janela (via `ipcMain.on`)

| Canal | Ação |
|---|---|
| `window:minimize` | minimiza a janela |
| `window:maximize` | maximiza/restaura a janela |
| `window:close` | fecha a janela |

---

## Módulo 6: `banks`

**Arquivo:** `app/banks/page.tsx`

### Entidade `Account`

| Campo | Tipo | Obrigatório |
|---|---|---|
| `id` | `number` | não |
| `name` | `string` | sim |
| `bank` | `string` | não |
| `balance` | `number` | não |
| `color` | `string` | não (hex, ex: `#6366f1`) |

### Entidade `CreditCard`

| Campo | Tipo | Obrigatório |
|---|---|---|
| `id` | `number` | não |
| `account_id` | `number` | sim (FK → accounts) |
| `name` | `string` | sim |
| `color` | `string` | não |
| `credit_limit` | `number` | não |
| `closing_day` | `number` | não (1-31) |
| `due_day` | `number` | não (1-31) |

### Regras de negócio

1. 🟢 **Cartão pertence a uma conta:** `credit_card_id → account_id` obrigatório no insert
2. 🟡 **INFERIDO — balance não atualizado automaticamente:** o campo `balance` em `Account` não é recalculado automaticamente a partir das transações. Parece ser valor manual.
3. 🟢 **Delete não cascateia transações:** `db:accounts:delete` não remove transações associadas — apenas a conta.

---

## Módulo 7: `subscriptions`

**Arquivo:** `app/subscriptions/page.tsx`

### Entidade `Subscription`

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `id` | `number` | não | |
| `name` | `string` | sim | |
| `amount` | `number` | sim | |
| `type` | `enum` | sim | `expense \| income` |
| `period` | `enum` | sim | `weekly \| monthly \| yearly` |
| `next_due` | `string \| null` | não | ISO date |
| `category` | `string \| null` | não | |
| `color` | `string \| null` | não | hex |
| `account_id` | `number \| null` | não | FK → accounts |
| `credit_card_id` | `number \| null` | não | FK → credit_cards |
| `active` | `number` | não | `0 \| 1` (SQLite boolean) |

### Regras de negócio

1. 🟢 **Normalização para mensal:** weekly × 52 / 12; yearly / 12 — para comparação
2. 🟢 **Alerta de vencimento:** assinaturas com `next_due` nos próximos 7 dias são destacadas
3. 🟢 **Toggle ativo/inativo:** atualiza apenas o campo `active`, não deleta
4. 🔴 **LACUNA** — `next_due` não é atualizado automaticamente após o pagamento/vencimento. Precisa de mecanismo de renovação automática.

---

## Módulo 8: `installments`

**Arquivo:** `app/installments/page.tsx`

### Entidade `InstallmentGroup`

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `id` | `number` | não | |
| `credit_card_id` | `number` | sim | FK → credit_cards |
| `description` | `string` | sim | |
| `total_amount` | `number` | sim | |
| `installments` | `number` | sim | ≥ 2 |
| `first_billing_month` | `string` | sim | `MM/YYYY` |
| `category` | `string \| null` | não | |
| `real_paid_installments` | `number` | computado | |
| `real_remaining_installments` | `number` | computado | |
| `real_paid_amount` | `number` | computado | |
| `real_remaining_amount` | `number` | computado | |

### Validações de formulário

1. 🟢 `credit_card_id` obrigatório e ≠ 0
2. 🟢 `description` não-vazio
3. 🟢 `total_amount > 0`
4. 🟢 `installments >= 2`
5. 🟢 `first_billing_month` no formato `MM/AAAA` (regex: `/^(0[1-9]|1[0-2])\/\d{4}$/`)

### Regras de negócio

1. 🟢 **Parcela por mês = `total_amount / installments`**
2. 🟢 **Progresso é temporal, não por pagamentos reais** (ver ipc-db)
3. 🟢 **Delete unlinks transações:** `installment_group_id` e `installment_number` das transações vinculadas são zerados antes do delete do grupo

---

## Módulo 9: `dashboard`

**Arquivo:** `app/dashboard/page.tsx`, `app/dashboard/components/`

### Componentes de gráficos

| Componente | Dados | Tipo de gráfico |
|---|---|---|
| `MonthlyIncomeExpenseChart` | Receitas e despesas por mês | 🟡 INFERIDO — BarChart ou LineChart via Recharts |
| `CategoryExpenseChart` | Despesas por categoria | 🟡 INFERIDO — PieChart ou BarChart |
| `CreditCardFaturaChart` | Faturas de cartão por mês | 🟡 INFERIDO — BarChart |
| `AccountSubscriptionsCalendar` | Vencimentos de assinaturas | 🟡 INFERIDO — Calendário mensal |

- 🔴 **LACUNA** — Componentes internos dos gráficos não foram lidos. Análise superficial.

---

## Módulo 10: `categories`

**Arquivo:** `app/features/categories/` (diretório vazio ou sem page.tsx no nível raiz)

- 🟡 **INFERIDO** — Categorias são gerenciadas via `db:transaction_categories` IPC handlers. A UI pode estar integrada em outro módulo.
- 🔴 **LACUNA** — Não há página dedicada a categorias na estrutura `app/features/categories/`. A gestão de categorias pode ocorrer apenas via modal/sheet em outros módulos.

---

## Módulo 11: `layout / navegação`

**Arquivo:** `app/layout.tsx`, `app/store.tsx`, `app/StoreProvider.tsx`

### Estrutura de layout

```
RootLayout
└── StoreProvider (Redux)
    └── SidebarProvider (Shadcn)
        ├── Toaster (sonner)
        ├── UpdateNotifier
        ├── AppSidebar
        └── SidebarInset
            ├── header (SidebarTrigger + DynamicBreadcrumb)
            └── main (children)
```

- **Google Charts Loader:** carregado via CDN (`gstatic.com/charts/loader.js`) no `<head>` — 🟡 INFERIDO — possivelmente usado por algum componente de dashboard.
- **Redux Store:** configurado com `@reduxjs/toolkit`, mas o store está praticamente vazio (ver `app/store.tsx`).
- 🔴 **LACUNA** — O store Redux está importado mas seu conteúdo/slices não foram verificados.

---

## Observações Transversais

| Observação | Confiança |
|---|---|
| Não há sistema de autenticação/login | 🟢 CONFIRMADO — app local sem auth |
| Dados 100% locais — nenhuma chamada de API de backend próprio | 🟢 CONFIRMADO |
| Dois formatos de data coexistem no banco (ISO e DD/MM/YYYY legado) | 🟢 CONFIRMADO |
| `window.electronAPI` pode ser `undefined` fora do Electron (Next.js dev mode) | 🟢 CONFIRMADO — guards com `?.` em todos os calls |
| Nenhum teste automatizado | 🟢 CONFIRMADO |
| LLM pode funcionar offline (MediaPipe) ou online (Groq) | 🟢 CONFIRMADO |
| Modelo LLM local requer carregamento manual do arquivo `.litertlm` | 🟡 INFERIDO |
