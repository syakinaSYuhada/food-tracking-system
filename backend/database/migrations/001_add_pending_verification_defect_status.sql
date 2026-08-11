-- Issue #6: split "all CAs submitted, not verified" from "all CAs verified, awaiting close"
-- Adds pending_verification to defect_status and reclassifies existing mislabeled rows.

BEGIN;

ALTER TABLE defects DROP CONSTRAINT IF EXISTS defects_defect_status_check;

ALTER TABLE defects ADD CONSTRAINT defects_defect_status_check
  CHECK (defect_status IN (
    'new',
    'under_review',
    'action_assigned',
    'in_progress',
    'pending_verification',
    'ready_verification',
    'closed'
  ));

UPDATE defects d
SET defect_status = 'pending_verification',
    updated_at = CURRENT_TIMESTAMP
WHERE d.defect_status = 'ready_verification'
  AND EXISTS (
    SELECT 1 FROM corrective_actions ca
    WHERE ca.defect_id = d.id AND ca.ca_status != 'cancelled'
  )
  AND (
    SELECT COUNT(*) FILTER (WHERE ca_status = 'verified')
    FROM corrective_actions WHERE defect_id = d.id
  ) < (
    SELECT COUNT(*) FILTER (WHERE ca_status != 'cancelled')
    FROM corrective_actions WHERE defect_id = d.id
  );

COMMIT;
