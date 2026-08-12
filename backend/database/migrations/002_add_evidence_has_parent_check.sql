-- Require evidence to belong to a defect and/or corrective action.

BEGIN;

ALTER TABLE evidence ADD CONSTRAINT chk_evidence_has_parent
  CHECK (defect_id IS NOT NULL OR corrective_action_id IS NOT NULL);

COMMIT;
