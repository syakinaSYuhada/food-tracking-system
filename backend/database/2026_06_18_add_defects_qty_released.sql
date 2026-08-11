-- Align live databases with product-handling CA logic (defects.qty_released).
ALTER TABLE defects
  ADD COLUMN IF NOT EXISTS qty_released INTEGER NOT NULL DEFAULT 0;

-- Ensure non-negative constraint includes qty_released on upgraded databases.
ALTER TABLE defects DROP CONSTRAINT IF EXISTS chk_defect_quantities_not_negative;
ALTER TABLE defects ADD CONSTRAINT chk_defect_quantities_not_negative
  CHECK (
    qty_relabelled >= 0 AND
    qty_repacked >= 0 AND
    qty_discarded >= 0 AND
    qty_on_hold >= 0 AND
    qty_reworked >= 0 AND
    qty_released >= 0
  );
