-- ============================================================
-- V1 — Schema Inicial do Finapp
-- Gerado em: 2026-05-03
-- Gerenciado por: Flyway (quarkus-flyway)
--
-- NOTA: Esta migration já foi aplicada manualmente ao Supabase
-- durante o bootstrap do projeto. O Flyway usa baseline-version=2
-- e baseline-on-migrate=true para reconhecer V1 e V2 como já
-- aplicadas sem re-executar.
-- ============================================================

-- Extensão para UUIDs (Supabase Auth)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATEGORIAS DE TRANSAÇÃO
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_categories (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT,
  icon       TEXT,
  type       TEXT CHECK (type IN ('income', 'expense')),
  parent_id  BIGINT REFERENCES transaction_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTAS BANCÁRIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  bank       TEXT,
  balance    NUMERIC(15,2),
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CARTÕES DE CRÉDITO
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_cards (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id   BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT,
  credit_limit NUMERIC(15,2),
  closing_day  INTEGER CHECK (closing_day BETWEEN 1 AND 31),
  due_day      INTEGER CHECK (due_day BETWEEN 1 AND 31),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GRUPOS DE PARCELAMENTO
-- ============================================================
CREATE TABLE IF NOT EXISTS installment_groups (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_card_id      BIGINT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  total_amount        NUMERIC(15,2) NOT NULL,
  installments        INTEGER NOT NULL CHECK (installments >= 2),
  first_billing_month TEXT NOT NULL,
  category            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id           BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_id       BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL,
  date                 DATE NOT NULL,
  description          TEXT NOT NULL,
  amount               NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  type                 TEXT NOT NULL CHECK (type IN ('income','expense','investment','transfer','card_payment')),
  category             TEXT,
  source               TEXT CHECK (source IN ('manual','csv','ofx')),
  external_id          TEXT,
  category_id          BIGINT REFERENCES transaction_categories(id) ON DELETE SET NULL,
  billing_month        TEXT,
  installment_group_id BIGINT REFERENCES installment_groups(id) ON DELETE SET NULL,
  installment_number   INTEGER,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_account_or_card CHECK (
    (account_id IS NOT NULL AND credit_card_id IS NULL) OR
    (account_id IS NULL     AND credit_card_id IS NOT NULL) OR
    (account_id IS NULL     AND credit_card_id IS NULL)
  ),
  CONSTRAINT uq_external_id UNIQUE (user_id, external_id)
);

-- ============================================================
-- ASSINATURAS RECORRENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  amount         NUMERIC(15,2) NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('expense','income')),
  period         TEXT NOT NULL CHECK (period IN ('weekly','monthly','yearly')),
  next_due       DATE,
  category       TEXT,
  color          TEXT,
  account_id     BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date       ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type       ON transactions (user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_account         ON transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card     ON transactions (credit_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_billing_month   ON transactions (user_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_grp ON transactions (installment_group_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active    ON subscriptions (user_id, active);
CREATE INDEX IF NOT EXISTS idx_categories_user_parent       ON transaction_categories (user_id, parent_id);

-- ============================================================
-- TRIGGER: auto-update de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_installment_groups_updated_at
  BEFORE UPDATE ON installment_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_groups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions           ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users: own categories"    ON transaction_categories USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "users: own accounts"      ON accounts               USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "users: own cards"         ON credit_cards           USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "users: own installments"  ON installment_groups     USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "users: own transactions"  ON transactions           USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "users: own subscriptions" ON subscriptions          USING (auth.uid() = user_id);
