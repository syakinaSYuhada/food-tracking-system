-- Drop unused products.selling_price (removed from application code; loss_rate_per_unit is used instead).

BEGIN;

ALTER TABLE products DROP COLUMN IF EXISTS selling_price;

COMMIT;
