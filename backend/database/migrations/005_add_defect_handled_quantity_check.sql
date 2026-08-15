-- Prevent handled quantities from exceeding the quantity affected on a defect.
-- qty_on_hold is intentionally excluded: it is not a "handled" bucket (see lossService.validateCumulativeHandledQuantities).

BEGIN;

ALTER TABLE defects ADD CONSTRAINT chk_defect_handled_not_exceed_affected
  CHECK (qty_relabelled + qty_repacked + qty_reworked + qty_released + qty_discarded <= qty_affected);

COMMIT;
