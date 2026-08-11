-- Worker defect urgency: manager review due date and reason (not CA due date).
ALTER TABLE defects
  ADD COLUMN IF NOT EXISTS review_due_date DATE,
  ADD COLUMN IF NOT EXISTS urgency_reason TEXT;

ALTER TABLE defects
  DROP CONSTRAINT IF EXISTS defects_priority_check;

ALTER TABLE defects
  ADD CONSTRAINT defects_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'critical', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_defects_review_due_date ON defects(review_due_date);
