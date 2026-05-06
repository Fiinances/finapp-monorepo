-- Remove redundant text category column from transactions.
-- category_id FK + transaction_categories join is the correct approach.
ALTER TABLE transactions DROP COLUMN IF EXISTS category;
