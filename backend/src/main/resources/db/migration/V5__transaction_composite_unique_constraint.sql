-- V5: Altera a constraint de unicidade das transações
-- Contexto: A deduplicação por importação utilizava apenas o `external_id`.
-- Isso causava problemas com parcelamentos (que podem compartilhar o mesmo `external_id` em faturas futuras),
-- resultando em sobrescrita indevida das parcelas.
-- A nova constraint `uq_tx_dedup` considera a combinação de `user_id`, `external_id`, `date`, `account_id` e `credit_card_id`.
-- O uso de NULLS NOT DISTINCT (suportado no Postgres 15+) garante que as transações onde
-- account_id ou credit_card_id sejam NULL também sejam tratadas como únicas de forma correta.

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS uq_external_id;

ALTER TABLE transactions
  ADD CONSTRAINT uq_tx_dedup 
  UNIQUE NULLS NOT DISTINCT (user_id, external_id, date, account_id, credit_card_id);
