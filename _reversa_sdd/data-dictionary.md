# Dicionário de Dados — Finapp

> Gerado pelo reversa-archaeologist em 2026-05-02
> Fonte: `app/types/electron.d.ts`, `electron/db-handlers.js`, `electron/migrations/`

---

## Entidade: `transactions`

| Campo | Tipo SQL | Tipo TS | Obrigatório | Default | Descrição |
|---|---|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | `number?` | não | auto | Identificador único |
| `account_id` | INTEGER | `number \| null` | não | NULL | FK → `accounts.id` |
| `credit_card_id` | INTEGER | `number \| null` | não | NULL | FK → `credit_cards.id` |
| `date` | TEXT | `string` | sim | — | Data da transação (`YYYY-MM-DD` ou legado `DD/MM/YYYY`) |
| `description` | TEXT | `string` | sim | — | Descrição/estabelecimento |
| `amount` | REAL | `number` | sim | — | Valor absoluto (sempre ≥ 0) |
| `type` | TEXT | `'income' \| 'expense' \| 'investment' \| 'transfer' \| 'card_payment'` | sim | — | Tipo da transação |
| `category` | TEXT | `string?` | não | NULL | Categoria textual (livre ou predefinida) |
| `source` | TEXT | `'manual' \| 'csv' \| 'ofx'` | não | NULL | Origem da transação |
| `external_id` | TEXT | `string?` | não | NULL | ID externo OFX (FITID) — chave de deduplicação |
| `category_id` | INTEGER | `number \| null` | não | NULL | FK → `transaction_categories.id` |
| `billing_month` | TEXT | `string \| null` | não | NULL | Mês da fatura do cartão (`MM/YYYY`) |
| `installment_group_id` | INTEGER | `number \| null` | não | NULL | FK → `installment_groups.id` |
| `installment_number` | INTEGER | `number \| null` | não | NULL | Número da parcela (1-based) |
| `created_at` | DATETIME | `string?` | não | NOW | Timestamp de criação |
| `updated_at` | DATETIME | `string?` | não | NOW | Timestamp de atualização |

**Índices:** 🔴 LACUNA — índices não verificados nas migrations  
**Constraints:** `external_id` único 🟡 INFERIDO — não verificado no DDL

---

## Entidade: `accounts`

| Campo | Tipo SQL | Tipo TS | Obrigatório | Default | Descrição |
|---|---|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | `number?` | não | auto | Identificador único |
| `name` | TEXT | `string` | sim | — | Nome da conta |
| `bank` | TEXT | `string?` | não | NULL | Nome do banco |
| `balance` | REAL | `number?` | não | NULL | Saldo (manual, não calculado) |
| `color` | TEXT | `string?` | não | NULL | Cor hex (ex: `#6366f1`) |
| `created_at` | DATETIME | `string?` | não | NOW | Timestamp de criação |
| `updated_at` | DATETIME | `string?` | não | NOW | Timestamp de atualização |

---

## Entidade: `credit_cards`

| Campo | Tipo SQL | Tipo TS | Obrigatório | Default | Descrição |
|---|---|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | `number?` | não | auto | Identificador único |
| `account_id` | INTEGER | `number` | sim | — | FK → `accounts.id` (conta vinculada) |
| `name` | TEXT | `string` | sim | — | Nome do cartão |
| `color` | TEXT | `string?` | não | NULL | Cor hex |
| `credit_limit` | REAL | `number?` | não | NULL | Limite de crédito |
| `closing_day` | INTEGER | `number?` | não | NULL | Dia de fechamento da fatura (1-31) |
| `due_day` | INTEGER | `number?` | não | NULL | Dia de vencimento da fatura (1-31) |
| `created_at` | DATETIME | `string?` | não | NOW | |
| `updated_at` | DATETIME | `string?` | não | NOW | |

---

## Entidade: `installment_groups`

| Campo | Tipo SQL | Tipo TS | Obrigatório | Default | Descrição |
|---|---|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | `number?` | não | auto | |
| `credit_card_id` | INTEGER | `number` | sim | — | FK → `credit_cards.id` |
| `description` | TEXT | `string` | sim | — | Descrição da compra |
| `total_amount` | REAL | `number` | sim | — | Valor total do parcelamento |
| `installments` | INTEGER | `number` | sim | — | Número total de parcelas (≥ 2) |
| `first_billing_month` | TEXT | `string` | sim | — | Mês da 1ª parcela (`MM/YYYY`) |
| `category` | TEXT | `string \| null` | não | NULL | Categoria opcional |
| `created_at` | DATETIME | `string?` | não | NOW | |
| `updated_at` | DATETIME | `string?` | não | NOW | |

**Campos computados (não persistidos):**

| Campo | Tipo | Cálculo |
|---|---|---|
| `real_paid_installments` | `number` | `monthsBetween(first_billing_month, current) + 1` |
| `real_remaining_installments` | `number` | `installments - real_paid_installments` |
| `real_paid_amount` | `number` | `(total_amount / installments) * real_paid_installments` |
| `real_remaining_amount` | `number` | `total_amount - real_paid_amount` |
| `paid_installments` | `number` | 🔴 LACUNA — campo existe na interface mas não é calculado no handler atual |
| `remaining_installments` | `number` | 🔴 LACUNA — mesmo |

---

## Entidade: `subscriptions`

| Campo | Tipo SQL | Tipo TS | Obrigatório | Default | Descrição |
|---|---|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | `number?` | não | auto | |
| `name` | TEXT | `string` | sim | — | Nome da assinatura |
| `amount` | REAL | `number` | sim | — | Valor |
| `type` | TEXT | `'expense' \| 'income'` | sim | — | Tipo |
| `period` | TEXT | `'weekly' \| 'monthly' \| 'yearly'` | sim | — | Periodicidade |
| `next_due` | TEXT | `string \| null` | não | NULL | Próximo vencimento (ISO date) |
| `category` | TEXT | `string \| null` | não | NULL | Categoria |
| `color` | TEXT | `string \| null` | não | NULL | Cor hex |
| `account_id` | INTEGER | `number \| null` | não | NULL | FK → `accounts.id` |
| `credit_card_id` | INTEGER | `number \| null` | não | NULL | FK → `credit_cards.id` |
| `active` | INTEGER | `number` | não | 1 | Flag ativo/inativo (0 ou 1) |
| `created_at` | DATETIME | `string?` | não | NOW | |
| `updated_at` | DATETIME | `string?` | não | NOW | |

---

## Entidade: `transaction_categories`

| Campo | Tipo SQL | Tipo TS | Obrigatório | Default | Descrição |
|---|---|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | `number \| string` | não | auto | |
| `name` | TEXT | `string` | sim | — | Nome da categoria |
| `color` | TEXT | `string \| null` | não | NULL | Cor hex |
| `icon` | TEXT | `string \| null` | não | NULL | Ícone (emoji ou nome) |
| `type` | TEXT | `string \| null` | não | NULL | 🔴 LACUNA — tipo da categoria (income/expense?) |
| `parent_id` | INTEGER | `number \| null` | não | NULL | FK → `transaction_categories.id` (hierarquia) |

---

## DTOs / Interfaces auxiliares

### `TransactionFilters`
```typescript
{
  type?: 'income' | 'expense' | 'investment' | 'transfer' | 'card_payment'
  accountId?: number
  creditCardId?: number
  source?: 'manual' | 'csv' | 'ofx'
}
```

### `InsertResult`
```typescript
{ inserted: number; skipped: number }
```

### `MonthSummary` (frontend, não persistido)
```typescript
{
  monthYear: string   // MM/YYYY
  label: string       // "Janeiro 2025"
  count: number
  income: number
  expense: number
  investment: number
  total: number       // income - expense
  transactions: Transaction[]
}
```

### `DetectedInstallment`
```typescript
{
  credit_card_id: number
  base_description: string
  total_installments: number
  installment_amount: number
  total_amount: number
  first_billing_month: string
  occurrences: number
  transactions: Array<{ id: number; installment_number: number }>
}
```

### `RecurringTransaction`
```typescript
{
  description: string
  occurrences: number
  avg_amount: number
  min_amount: number
  max_amount: number
  first_date: string
  last_date: string
}
```

---

## Relacionamentos

```
accounts (1) ──────────── (N) transactions
accounts (1) ──────────── (N) credit_cards
accounts (1) ──────────── (N) subscriptions
credit_cards (1) ────────── (N) transactions
credit_cards (1) ────────── (N) subscriptions
credit_cards (1) ────────── (N) installment_groups
installment_groups (1) ──── (N) transactions
transaction_categories (1) ─ (N) transactions
transaction_categories (1) ─ (N) transaction_categories (auto-ref hierarquia)
```
