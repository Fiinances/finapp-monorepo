# ERD Completo — Finapp

> Gerado pelo reversa-architect em 2026-05-02
> Fonte: `data-dictionary.md`, `electron/db-handlers.js`, `app/types/electron.d.ts`

```mermaid
erDiagram
    accounts {
        INTEGER id PK "AUTO INCREMENT"
        TEXT name "NOT NULL"
        TEXT bank
        REAL balance "saldo manual"
        TEXT color "hex color"
        DATETIME created_at
        DATETIME updated_at
    }

    credit_cards {
        INTEGER id PK "AUTO INCREMENT"
        INTEGER account_id FK "→ accounts.id"
        TEXT name "NOT NULL"
        TEXT color "hex color"
        REAL credit_limit
        INTEGER closing_day "dia fechamento 1-31"
        INTEGER due_day "dia vencimento 1-31"
        DATETIME created_at
        DATETIME updated_at
    }

    transactions {
        INTEGER id PK "AUTO INCREMENT"
        INTEGER account_id FK "→ accounts.id (null se cartão)"
        INTEGER credit_card_id FK "→ credit_cards.id (null se conta)"
        TEXT date "YYYY-MM-DD ou DD/MM/YYYY legado"
        TEXT description "NOT NULL"
        REAL amount "sempre >= 0"
        TEXT type "income|expense|investment|transfer|card_payment"
        TEXT category "texto livre"
        TEXT source "manual|csv|ofx"
        TEXT external_id "FITID OFX — deduplicação"
        INTEGER category_id FK "→ transaction_categories.id"
        TEXT billing_month "MM/YYYY — para cartão"
        INTEGER installment_group_id FK "→ installment_groups.id"
        INTEGER installment_number "1-based"
        DATETIME created_at
        DATETIME updated_at
    }

    installment_groups {
        INTEGER id PK "AUTO INCREMENT"
        INTEGER credit_card_id FK "→ credit_cards.id"
        TEXT description "NOT NULL"
        REAL total_amount "NOT NULL"
        INTEGER installments "NOT NULL >= 2"
        TEXT first_billing_month "MM/YYYY"
        TEXT category
        DATETIME created_at
        DATETIME updated_at
    }

    subscriptions {
        INTEGER id PK "AUTO INCREMENT"
        TEXT name "NOT NULL"
        REAL amount "NOT NULL"
        TEXT type "expense|income"
        TEXT period "weekly|monthly|yearly"
        TEXT next_due "ISO date — próximo vencimento"
        TEXT category
        TEXT color "hex color"
        INTEGER account_id FK "→ accounts.id"
        INTEGER credit_card_id FK "→ credit_cards.id"
        INTEGER active "0|1 — SQLite boolean"
        DATETIME created_at
        DATETIME updated_at
    }

    transaction_categories {
        INTEGER id PK "AUTO INCREMENT"
        TEXT name "NOT NULL"
        TEXT color "hex color"
        TEXT icon "emoji ou nome"
        TEXT type "income|expense — inferido"
        INTEGER parent_id FK "→ transaction_categories.id"
    }

    accounts ||--o{ credit_cards : "possui"
    accounts ||--o{ transactions : "registra"
    accounts ||--o{ subscriptions : "vincula"
    credit_cards ||--o{ transactions : "registra"
    credit_cards ||--o{ subscriptions : "vincula"
    credit_cards ||--o{ installment_groups : "possui"
    installment_groups ||--o{ transactions : "agrupa"
    transaction_categories ||--o{ transactions : "classifica"
    transaction_categories ||--o{ transaction_categories : "hierarquia"
```

---

## Relacionamentos Detalhados

| Origem | Destino | Cardinalidade | Tipo | Confiança |
|---|---|---|---|---|
| `accounts` | `credit_cards` | 1:N | FK | 🟢 |
| `accounts` | `transactions` | 1:N | FK opcional | 🟢 |
| `accounts` | `subscriptions` | 1:N | FK opcional | 🟢 |
| `credit_cards` | `transactions` | 1:N | FK opcional | 🟢 |
| `credit_cards` | `subscriptions` | 1:N | FK opcional | 🟢 |
| `credit_cards` | `installment_groups` | 1:N | FK | 🟢 |
| `installment_groups` | `transactions` | 1:N | FK opcional (unlink no delete) | 🟢 |
| `transaction_categories` | `transactions` | 1:N | FK opcional | 🟢 |
| `transaction_categories` | `transaction_categories` | 1:N auto-ref | FK opcional (hierarquia) | 🟢 |

---

## Notas

- 🟢 Uma transação pertence a uma conta OU a um cartão — não a ambos
- 🟡 Constraints de FK não verificadas no DDL — podem não estar ativas (SQLite exige `PRAGMA foreign_keys = ON`)
- 🔴 LACUNA — `paid_installments` e `remaining_installments` aparecem na interface TypeScript mas podem não existir como colunas reais (calculados em runtime)
