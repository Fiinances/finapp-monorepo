-- Add essential-flag for transactions used by mobile create/edit sheets.
-- Default behavior: non-essential (FALSE).

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_essential BOOLEAN;

UPDATE transactions
SET is_essential = FALSE
WHERE is_essential IS NULL;

ALTER TABLE transactions
  ALTER COLUMN is_essential SET DEFAULT FALSE;

ALTER TABLE transactions
  ALTER COLUMN is_essential SET NOT NULL;
