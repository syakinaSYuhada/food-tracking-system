-- Align the column default with the value defectController.createDefect actually inserts.
-- The application always supplies loss_status explicitly ('no_loss' at creation), so this
-- has no functional effect on existing behavior -- it only fixes the schema's documentation value.

BEGIN;

ALTER TABLE defects ALTER COLUMN loss_status SET DEFAULT 'no_loss';

COMMIT;
