-- Drop unused defects.handling_notes (never read; notes live in root_cause_investigation.investigation_notes).

BEGIN;

ALTER TABLE defects DROP COLUMN IF EXISTS handling_notes;

COMMIT;
