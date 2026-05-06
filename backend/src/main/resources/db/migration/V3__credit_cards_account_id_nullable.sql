-- V3: Torna account_id opcional em credit_cards
-- Contexto: o app mobile permite criar cartões de crédito sem vínculo com conta bancária
-- (ex: cartões de loja, mercado ou emissor não-bancário). A coluna era NOT NULL,
-- causando erro de constraint ao inserir cartão standalone (account_id = null).
--
-- Adicionalmente, altera o comportamento de FK: ao deletar uma conta bancária,
-- os cartões vinculados passam a ser "standalone" (SET NULL) em vez de deletados (CASCADE).
-- A exclusão em cascata de cartões ao deletar conta deve ser feita pelo app quando desejado.

ALTER TABLE credit_cards ALTER COLUMN account_id DROP NOT NULL;

ALTER TABLE credit_cards DROP CONSTRAINT IF EXISTS credit_cards_account_id_fkey;
ALTER TABLE credit_cards
  ADD CONSTRAINT credit_cards_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
