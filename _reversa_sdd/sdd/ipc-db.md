# SDD — Camada de Dados IPC/SQLite (`ipc-db`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `electron/db-handlers.js`, `electron/database.js`
>
> 🟡 **[Revisão Q-07 — 2026-05-02]** Sem backup automático do SQLite — risco aceito para versão atual (uso pessoal). **Roadmap:** migração futura para Supabase resolverá backup e sincronização. Não há plano de backup local no curto prazo.

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `ipc-db` |
| **Camada** | Main Process (Node.js) |
| **Arquivos** | `electron/db-handlers.js`, `electron/database.js` |
| **Responsável por** | Todo acesso ao banco de dados SQLite via canais IPC |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Este componente registra todos os handlers IPC de banco de dados no processo principal do Electron. É o **único ponto de acesso** ao SQLite no sistema — o renderer nunca acessa o banco diretamente. Também encapsula os algoritmos de detecção de padrões financeiros (recorrência e parcelamento).

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| CRUD de transações (`list`, `insert`, `update`, `delete`) | **Must** | 🟢 |
| Deduplicação de transações por `external_id` | **Must** | 🟢 |
| CRUD de contas bancárias (`accounts`) | **Must** | 🟢 |
| CRUD de cartões de crédito (`credit_cards`) | **Must** | 🟢 |
| CRUD de parcelamentos (`installment_groups`) | **Must** | 🟢 |
| Cálculo computado de progresso de parcelamento | **Must** | 🟢 |
| CRUD de assinaturas (`subscriptions`) | **Must** | 🟢 |
| Detecção de assinaturas recorrentes (`detect`) | **Should** | 🟢 |
| CRUD de categorias (`transaction_categories`) | **Should** | 🟢 |
| Detecção de parcelamentos por regex (`installmentGroups:detect`) | **Should** | 🟢 |
| Exclusão por mês (`deleteByMonth`, `creditCards:deleteByMonth`) | **Should** | 🟢 |
| Execução automática de migrations na inicialização | **Must** | 🟢 |

---

## 4. Canais IPC Registrados

### 4.1 Transactions

| Canal | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `db:transactions:list` | `filters?: { type?, accountId?, creditCardId?, source? }` | `Transaction[]` | 🟢 |
| `db:transactions:insert` | `rows: Transaction \| Transaction[]` | `{ inserted: number, skipped: number }` | 🟢 |
| `db:transactions:update` | `id: number, data: Partial<Transaction>` | `number` (rows affected) | 🟢 |
| `db:transactions:delete` | `id: number` | `number` (rows affected) | 🟢 |
| `db:transactions:deleteByMonth` | `accountId: number, monthYear: string (MM/YYYY)` | `number` (rows affected) | 🟢 |

### 4.2 Accounts

| Canal | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `db:accounts:list` | — | `Account[]` | 🟢 |
| `db:accounts:insert` | `account: Omit<Account, 'id'>` | `number` (id) | 🟢 |
| `db:accounts:update` | `id: number, data: Partial<Account>` | `number` | 🟢 |
| `db:accounts:delete` | `id: number` | `number` | 🟢 |

### 4.3 Credit Cards

| Canal | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `db:creditCards:list` | — | `CreditCard[]` | 🟢 |
| `db:creditCards:insert` | `card: Omit<CreditCard, 'id'>` | `number` (id) | 🟢 |
| `db:creditCards:update` | `id: number, data: Partial<CreditCard>` | `number` | 🟢 |
| `db:creditCards:delete` | `id: number` | `number` | 🟢 |
| `db:creditCards:deleteByMonth` | `creditCardId: number, monthYear: string` | `number` | 🟢 |

### 4.4 Subscriptions

| Canal | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `db:subscriptions:list` | — | `Subscription[]` | 🟢 |
| `db:subscriptions:insert` | `data: Omit<Subscription, 'id'>` | `number` (id) | 🟢 |
| `db:subscriptions:update` | `id: number, data: Partial<Subscription>` | `number` | 🟢 |
| `db:subscriptions:delete` | `id: number` | `number` | 🟢 |
| `db:subscriptions:detect` | — | `RecurringTransaction[]` | 🟢 |

### 4.5 Transaction Categories

| Canal | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `db:transaction_categories:list` | — | `Category[]` | 🟢 |
| `db:transaction_categories:create` | `data: Omit<Category, 'id'>` | `Category` (row completo) | 🟢 |
| `db:transaction_categories:update` | `id: number, data: Partial<Category>` | `number` | 🟢 |
| `db:transaction_categories:delete` | `id: number` | `number` | 🟢 |

### 4.6 Installment Groups

| Canal | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `db:installmentGroups:list` | `filters?: { creditCardId? }` | `InstallmentGroup[]` (com campos computados) | 🟢 |
| `db:installmentGroups:insert` | `data: Omit<InstallmentGroup, 'id' \| computed>` | `number` (id) | 🟢 |
| `db:installmentGroups:update` | `id: number, data: Partial<InstallmentGroup>` | `number` | 🟢 |
| `db:installmentGroups:delete` | `id: number` | `number` | 🟢 |
| `db:installmentGroups:detect` | — | `DetectedInstallment[]` | 🟢 |

---

## 5. Algoritmos Críticos

### 5.1 Deduplicação de transações por `external_id`

**Localização:** `db-handlers.js:19-33` 🟢

```
ENTRADA: rows (array de Transaction)
SAÍDA:   { inserted: number, skipped: number }

1. Normalizar para array
2. Extrair external_ids não-nulos
3. SE ids.length > 0:
   a. SELECT external_id WHERE external_id IN (ids)
   b. existing = Set dos ids encontrados
4. toInsert = rows que: sem external_id OU external_id ∉ existing
5. SE toInsert.length == 0: retornar { inserted: 0, skipped: total }
6. INSERT toInsert
7. retornar { inserted: toInsert.length, skipped: total - toInsert.length }
```

### 5.2 Cálculo de progresso de parcelamento

**Localização:** `db-handlers.js:188-220` 🟢

```
PARA CADA installment_group:
  start = parseMonthYear(first_billing_month)    → { mm, yyyy }
  current = { mm: hoje.month, yyyy: hoje.year }
  real_paid = monthsBetween(start, current) + 1  → diferença em meses + 1
  real_remaining = installments - real_paid
  perInstallment = total_amount / installments
  real_paid_amount = perInstallment × real_paid
  real_remaining_amount = total_amount - real_paid_amount
```

> ⚠️ 🟢 O progresso é calculado pelo **calendário**, não por pagamentos reais.

### 5.3 Detecção de assinaturas recorrentes

**Localização:** `db-handlers.js:149-166` 🟢

```sql
SELECT description, COUNT(*) AS occurrences, AVG(amount) AS avg_amount,
       MIN(amount), MAX(amount), MIN(date), MAX(date)
FROM transactions
WHERE type = 'expense'
GROUP BY description
HAVING COUNT(*) >= 3
   AND (MAX(amount) - MIN(amount)) / AVG(amount) < 0.05
ORDER BY occurrences DESC
```

### 5.4 Detecção de parcelamentos por regex

**Localização:** `db-handlers.js:241-318` 🟢

```
1. cutoff = hoje - 2 meses
2. SELECT transações de cartão, sem installment_group_id, date >= cutoff
3. PARA CADA row:
   a. regex: /\b(\d{1,2})\s*(?:\/|-|de)\s*(\d{1,2})\b/i
   b. SE match: current = m[1], total = m[2]
   c. Validar: total >= 2, 1 <= current <= total
   d. base = desc sem a parte "N/M"
   e. key = `${creditCardId}::${base}::${total}`
   f. Agrupar no Map por key
4. PARA CADA grupo:
   a. Ordenar transações por installment_number
   b. Calcular first_billing_month (retroagindo do installment_number)
   c. total_amount = installment_amount × total (arredondado 2 casas)
```

### 5.5 `deleteByMonth` — suporte a dual formato de data

**Localização:** `db-handlers.js:43-53` 🟢

```sql
-- Para contas (transactions.account_id)
WHERE account_id = ?
AND (strftime('%m/%Y', date) = ?    -- ISO YYYY-MM-DD
     OR SUBSTR(date, 4, 7) = ?)     -- Legado DD/MM/YYYY

-- Para cartões (transactions.credit_card_id)
WHERE credit_card_id = ?
AND (billing_month = ?              -- Preferencial
     OR (billing_month IS NULL
         AND (strftime('%m/%Y', date) = ?
              OR SUBSTR(date, 4, 7) = ?)))
```

---

## 6. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | Deduplicação só aplica a transações com `external_id` (OFX) | `db-handlers.js:23` | 🟢 |
| RN-02 | `db:installmentGroups:delete` desvincula transações antes de deletar | `db-handlers.js:235-237` | 🟢 |
| RN-03 | Detecção de recorrência: apenas `type = 'expense'` | `db-handlers.js:160` | 🟢 |
| RN-04 | Detecção de recorrência: variação máxima de 5% no valor | `db-handlers.js:163` | 🟢 |
| RN-05 | Detecção de recorrência: mínimo 3 ocorrências | `db-handlers.js:162` | 🟢 |
| RN-06 | Detecção de parcelamento: janela de 2 meses | `db-handlers.js:244-246` | 🟢 |
| RN-07 | Progresso calculado por meses decorridos desde `first_billing_month` | `db-handlers.js:207` | 🟢 |
| RN-08 | `db:transaction_categories:create` retorna a row completa (com id gerado) | `db-handlers.js:79-82` | 🟢 |
| RN-09 | Migrations executam automaticamente no `registerDbHandlers()` | `db-handlers.js:5` | 🟢 |

---

## 7. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Sincronicidade** | `better-sqlite3` é síncrono — handlers IPC usam `async/await` por contrato, mas internamente são síncronos | 🟢 |
| **Singleton** | `getKnex()` mantém uma única instância da conexão (lazy-init) | 🟢 |
| **Migrations automáticas** | `migrate()` roda no boot — nenhuma ação manual necessária | 🟢 |
| **Sem transações SQL** | 🟡 Não foi identificado uso de `trx` (Knex transactions) — inserções em batch não são atômicas exceto o próprio INSERT | 🟡 |
| **Sem validação de input** | 🔴 Os handlers não sanitizam dados recebidos do renderer | 🟡 |

---

## 8. Critérios de Aceitação

### CA-01 — `db:transactions:insert` insere novas transações sem duplicar OFX

```
Dado:  2 transações OFX com external_id únicos não presentes no banco
Quando: db:transactions:insert é chamado
Então: inserted = 2, skipped = 0
```

### CA-02 — `db:transactions:insert` ignora duplicatas OFX

```
Dado:  1 transação OFX com external_id já presente no banco + 1 nova
Quando: db:transactions:insert é chamado com as 2 transações
Então: inserted = 1, skipped = 1
```

### CA-03 — `db:transactions:insert` insere transações manuais sem deduplicação

```
Dado:  2 transações sem external_id (manuais ou CSV)
Quando: db:transactions:insert é chamado
Então: inserted = 2, skipped = 0 (mesmo que tenham mesma descrição)
```

### CA-04 — `db:installmentGroups:list` retorna progresso correto

```
Dado:  um grupo com first_billing_month = "01/2025", installments = 12
       e a data atual é "03/2025"
Quando: db:installmentGroups:list é chamado
Então: real_paid_installments = 3
       real_remaining_installments = 9
       real_paid_amount = total_amount × (3/12)
       real_remaining_amount = total_amount × (9/12)
```

### CA-05 — `db:installmentGroups:delete` desvincula transações

```
Dado:  um grupo com 3 transações vinculadas (installment_group_id preenchido)
Quando: db:installmentGroups:delete é chamado com o id do grupo
Então: o grupo é deletado
       as 3 transações existem com installment_group_id = null e installment_number = null
```

### CA-06 — `db:subscriptions:detect` retorna padrão de recorrência

```
Dado:  5 transações do tipo 'expense' com description = "Netflix" e amount entre 49.90-50.10
Quando: db:subscriptions:detect é chamado
Então: retorna 1 item com description = "Netflix", occurrences = 5
       (MAX - MIN) / AVG < 0.05 → incluído
```

### CA-07 — `db:creditCards:deleteByMonth` respeita billing_month

```
Dado:  3 transações de cartão com billing_month = "02/2025"
       e 2 transações com billing_month = "03/2025"
Quando: deleteByMonth é chamado com creditCardId e "02/2025"
Então: apenas as 3 transações de 02/2025 são deletadas
```

---

## 9. Cenários de Borda (detalhado)

### CB-01 — `deleteByMonth` com dados em formato legado (DD/MM/YYYY)

```
Dado:  transações antigas com date = "15/02/2024" (sem billing_month)
Quando: deleteByMonth é chamado com monthYear = "02/2024"
Então: SUBSTR(date, 4, 7) = "02/2024" → transações deletadas corretamente
```

### CB-02 — Installment group com first_billing_month no futuro

```
Dado:  grupo criado com first_billing_month = "12/2026" (meses à frente)
       e data atual = "05/2026"
Quando: installmentGroups:list é chamado
Então: real_paid_installments pode ser negativo ou zero
       (monthsBetween retorna valor negativo) → real_remaining = installments
```

> ⚠️ 🔴 LACUNA — O código não trata `real_paid_installments < 0`. O sistema pode exibir progresso incorreto para parcelamentos futuros.

### CB-03 — `db:installmentGroups:detect` com installment_number = 1 (primeira parcela)

```
Dado:  transação com description = "Notebook Dell 1/12", billing_month = "03/2025"
Quando: detect é chamado
Então: first_billing_month = "03/2025" (sem retroação pois installment_number = 1)
```

### CB-04 — Regex de detecção com separador "de" (ex: "1 de 3")

```
Dado:  transação com description = "AMAZON 2 DE 6"
Quando: detect é chamado
Então: detectInDesc retorna { current: 2, total: 6 }
       base_description = "AMAZON"
```

---

## 10. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `better-sqlite3` | npm — driver SQLite | Conexão ao banco via Knex.js |
| `knex` | npm — query builder | Queries e migrations |
| `electron` (ipcMain) | Electron API | Registro dos handlers |
| `electron/database.js` | Módulo interno | `getKnex()`, `migrate()` |
