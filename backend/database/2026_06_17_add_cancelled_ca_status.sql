-- Allow managers to cancel rejected corrective actions so defects are not blocked indefinitely.
ALTER TABLE corrective_actions
  DROP CONSTRAINT IF EXISTS corrective_actions_ca_status_check;

ALTER TABLE corrective_actions
  ADD CONSTRAINT corrective_actions_ca_status_check
  CHECK (
    ca_status IN (
      'assigned',
      'in_progress',
      'completed',
      'verified',
      'rejected',
      'cancelled'
    )
  );
