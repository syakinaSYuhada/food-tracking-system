-- =========================================================
-- Kak Norie QDTS v2 Database Schema
-- PostgreSQL
-- =========================================================

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS corrective_actions CASCADE;
DROP TABLE IF EXISTS root_cause_investigation CASCADE;
DROP TABLE IF EXISTS defects CASCADE;
DROP TABLE IF EXISTS defect_workflow_options CASCADE;
DROP TABLE IF EXISTS defect_workflow_rules CASCADE;
DROP TABLE IF EXISTS defect_type_mappings CASCADE;
DROP TABLE IF EXISTS defect_types CASCADE;
DROP TABLE IF EXISTS root_causes CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'worker')),
  account_status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PRODUCTS
-- Product owns shelf life and loss rate.
-- =========================================================

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(150) NOT NULL,
  product_code VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  packaging_type VARCHAR(100) NOT NULL,
  size_weight VARCHAR(50) NOT NULL,
  shelf_life_months INT NOT NULL CHECK (shelf_life_months > 0),
  loss_rate_per_unit DECIMAL(10, 2) NOT NULL CHECK (loss_rate_per_unit >= 0),
  storage_condition VARCHAR(150),
  description TEXT,
  product_status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (product_status IN ('active', 'development', 'inactive', 'archived')),
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- BATCHES
-- Batch owns production date, retort date, expiry, quantity.
-- Correct expiry = retort date + product shelf life.
-- =========================================================

CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  batch_number VARCHAR(80) UNIQUE NOT NULL,
  product_id INT NOT NULL REFERENCES products(id),
  production_date DATE NOT NULL,
  retort_date DATE NOT NULL,
  correct_expiry_date DATE NOT NULL,
  printed_expiry_date DATE NOT NULL,
  quantity_produced INT NOT NULL CHECK (quantity_produced > 0),
  batch_status VARCHAR(30) NOT NULL DEFAULT 'approved'
    CHECK (batch_status IN ('approved', 'defective', 'on_hold', 'closed', 'archived')),
  notes TEXT,
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_retort_after_production
    CHECK (retort_date >= production_date)
);

-- =========================================================
-- DEFECT TYPES
-- Official categories used for reporting.
-- Other/unmapped text should not become report category yet.
-- =========================================================

CREATE TABLE defect_types (
  id SERIAL PRIMARY KEY,
  defect_type_name VARCHAR(120) UNIQUE NOT NULL,
  defect_category VARCHAR(80),
  default_problem_level VARCHAR(50)
    CHECK (
      default_problem_level IN (
        'Can Be Corrected',
        'Hold for Review',
        'Cannot Be Sold',
        'Food Safety Risk'
      )
    ),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- DEFECT TYPE MAPPINGS
-- Which defect types are logical at each detected stage.
-- =========================================================

CREATE TABLE defect_type_mappings (
  id SERIAL PRIMARY KEY,
  detected_at_stage VARCHAR(80) NOT NULL,
  defect_type_id INT NOT NULL REFERENCES defect_types(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (detected_at_stage, defect_type_id)
);

-- =========================================================
-- ROOT CAUSES MASTER
-- =========================================================

CREATE TABLE root_causes (
  id SERIAL PRIMARY KEY,
  root_cause_source VARCHAR(80) NOT NULL,
  root_cause_name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (root_cause_source, root_cause_name)
);

-- =========================================================
-- DEFECTS
-- Defect references product and batch.
-- Defect does NOT duplicate batch dates/expiry/quantity produced.
-- =========================================================

CREATE TABLE defects (
  id SERIAL PRIMARY KEY,
  defect_code VARCHAR(30) UNIQUE NOT NULL,

  product_id INT NOT NULL REFERENCES products(id),
  batch_id INT NOT NULL REFERENCES batches(id),

  detected_at_stage VARCHAR(80) NOT NULL,
  defect_type VARCHAR(120) NOT NULL,
  defect_type_other TEXT,
  mapping_status VARCHAR(40) NOT NULL DEFAULT 'mapped'
    CHECK (mapping_status IN ('mapped', 'needs_manager_review', 'approved_as_other')),

  problem_level VARCHAR(50) NOT NULL
    CHECK (
      problem_level IN (
        'Can Be Corrected',
        'Hold for Review',
        'Cannot Be Sold',
        'Food Safety Risk'
      )
    ),

  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical', 'urgent')),

  review_due_date DATE,
  urgency_reason TEXT,

  description TEXT NOT NULL,

  qty_affected INT NOT NULL CHECK (qty_affected > 0),
  qty_relabelled INT NOT NULL DEFAULT 0 CHECK (qty_relabelled >= 0),
  qty_repacked INT NOT NULL DEFAULT 0 CHECK (qty_repacked >= 0),
  qty_discarded INT NOT NULL DEFAULT 0 CHECK (qty_discarded >= 0),
  qty_on_hold INT NOT NULL DEFAULT 0 CHECK (qty_on_hold >= 0),
  qty_reworked INT NOT NULL DEFAULT 0 CHECK (qty_reworked >= 0),
  qty_released INT NOT NULL DEFAULT 0 CHECK (qty_released >= 0),
  still_sellable INT NOT NULL DEFAULT 0 CHECK (still_sellable >= 0),

  loss_rate_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estimated_loss DECIMAL(12, 2) NOT NULL DEFAULT 0,
  loss_status VARCHAR(40) NOT NULL DEFAULT 'pending_review'
    CHECK (loss_status IN ('pending_review', 'no_loss', 'loss_confirmed')),
  loss_confirmed_date DATE,

  defect_status VARCHAR(40) NOT NULL DEFAULT 'new'
    CHECK (
      defect_status IN (
        'new',
        'under_review',
        'action_assigned',
        'in_progress',
        'pending_verification',
        'ready_verification',
        'closed'
      )
    ),

  containment_status VARCHAR(80) NOT NULL DEFAULT 'Segregated / On Hold'
    CHECK (containment_status IN ('Segregated / On Hold', 'Not Yet Segregated', 'No Hold Needed')),
  suggested_product_handling TEXT,
  suggested_machine_handling TEXT,
  handling_notes TEXT,

  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  closed_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,

  CONSTRAINT chk_defect_quantities_not_negative
    CHECK (
      qty_relabelled >= 0 AND
      qty_repacked >= 0 AND
      qty_discarded >= 0 AND
      qty_on_hold >= 0 AND
      qty_reworked >= 0 AND
      qty_released >= 0
    )
);

-- =========================================================
-- ROOT CAUSE INVESTIGATION
-- Root cause may be pending during initial defect record.
-- Manager confirms later.
-- =========================================================

CREATE TABLE root_cause_investigation (
  id SERIAL PRIMARY KEY,
  defect_id INT UNIQUE NOT NULL REFERENCES defects(id) ON DELETE CASCADE,

  root_cause_status VARCHAR(50) NOT NULL DEFAULT 'pending_investigation'
    CHECK (
      root_cause_status IN (
        'pending_investigation',
        'suspected',
        'confirmed'
      )
    ),

  suspected_root_cause_source VARCHAR(100),
  suspected_root_cause VARCHAR(150),
  related_tool_machine VARCHAR(120),

  confirmed_root_cause_source VARCHAR(100),
  confirmed_root_cause VARCHAR(150),
  confirmed_by INT REFERENCES users(id),
  confirmed_date TIMESTAMP,

  investigation_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- CORRECTIVE ACTIONS
-- Corrective Action is linked to a defect.
-- Manager assigns. Worker starts/completes. Manager verifies/rejects.
-- =========================================================

CREATE TABLE corrective_actions (
  id SERIAL PRIMARY KEY,
  action_code VARCHAR(30) UNIQUE NOT NULL,

  defect_id INT NOT NULL REFERENCES defects(id) ON DELETE CASCADE,

  action_type VARCHAR(40) NOT NULL DEFAULT 'product_handling'
    CHECK (action_type IN ('product_handling', 'machine_process_check')),
  task TEXT,
  action_description TEXT,
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,

  containment_actions TEXT, -- DEPRECATED: unused; assignment text lives in task
  corrective_actions TEXT, -- DEPRECATED: unused column (not the table); assignment text lives in task

  assigned_to INT NOT NULL REFERENCES users(id),
  assigned_by INT NOT NULL REFERENCES users(id),

  due_date DATE,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  ca_status VARCHAR(40) NOT NULL DEFAULT 'assigned'
    CHECK (
      ca_status IN (
        'assigned',
        'in_progress',
        'completed',
        'verified',
        'rejected',
        'cancelled'
      )
    ),

  started_by INT REFERENCES users(id),
  started_date TIMESTAMP,

  completed_by INT REFERENCES users(id),
  completed_date TIMESTAMP,
  completion_notes TEXT,

  investigation_finding TEXT,
  action_taken TEXT,
  related_tool_machine_checked VARCHAR(150),

  qty_relabelled INT NOT NULL DEFAULT 0 CHECK (qty_relabelled >= 0),
  qty_repacked INT NOT NULL DEFAULT 0 CHECK (qty_repacked >= 0),
  qty_reworked INT NOT NULL DEFAULT 0 CHECK (qty_reworked >= 0),
  qty_discarded INT NOT NULL DEFAULT 0 CHECK (qty_discarded >= 0),
  qty_released INT NOT NULL DEFAULT 0 CHECK (qty_released >= 0),
  qty_on_hold INT NOT NULL DEFAULT 0 CHECK (qty_on_hold >= 0),
  calculated_loss DECIMAL(12, 2) NOT NULL DEFAULT 0,

  verified_by INT REFERENCES users(id),
  verified_date TIMESTAMP,
  verification_notes TEXT,

  rejected_by INT REFERENCES users(id),
  rejected_date TIMESTAMP,
  rejection_reason TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- EVIDENCE
-- Mock file metadata for future upload/evidence.
-- =========================================================

CREATE TABLE evidence (
  id SERIAL PRIMARY KEY,
  defect_id INT REFERENCES defects(id) ON DELETE CASCADE,
  corrective_action_id INT REFERENCES corrective_actions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_type VARCHAR(80),
  evidence_note TEXT,
  uploaded_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_evidence_has_parent
    CHECK (defect_id IS NOT NULL OR corrective_action_id IS NOT NULL)
);

-- =========================================================
-- ACTIVITY LOGS
-- =========================================================

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- DEFECT WORKFLOW RULES (DB-driven defect suggestions)
-- =========================================================

CREATE TABLE defect_workflow_rules (
  id SERIAL PRIMARY KEY,
  defect_type VARCHAR(120) UNIQUE NOT NULL,
  default_problem_level VARCHAR(50) NOT NULL
    CHECK (default_problem_level IN ('Can Be Corrected', 'Hold for Review', 'Cannot Be Sold', 'Food Safety Risk')),
  recommended_priority VARCHAR(20) NOT NULL
    CHECK (recommended_priority IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE defect_workflow_options (
  id SERIAL PRIMARY KEY,
  defect_type VARCHAR(120) NOT NULL REFERENCES defect_workflow_rules(defect_type) ON DELETE CASCADE,
  option_type VARCHAR(40) NOT NULL
    CHECK (option_type IN ('product_handling', 'machine_check', 'related_tool', 'root_cause')),
  option_value TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (defect_type, option_type, option_value)
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_defect_workflow_options_type ON defect_workflow_options(defect_type, option_type, sort_order);

CREATE INDEX idx_products_status ON products(product_status);
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_status ON batches(batch_status);
CREATE INDEX idx_batches_retort_date ON batches(retort_date);

CREATE INDEX idx_defects_product_id ON defects(product_id);
CREATE INDEX idx_defects_batch_id ON defects(batch_id);
CREATE INDEX idx_defects_status ON defects(defect_status);
CREATE INDEX idx_defects_problem_level ON defects(problem_level);
CREATE INDEX idx_defects_created_at ON defects(created_at);
CREATE INDEX idx_defects_review_due_date ON defects(review_due_date);

CREATE INDEX idx_root_cause_defect_id ON root_cause_investigation(defect_id);

CREATE INDEX idx_corrective_actions_defect_id ON corrective_actions(defect_id);
CREATE INDEX idx_corrective_actions_assigned_to ON corrective_actions(assigned_to);
CREATE INDEX idx_corrective_actions_status ON corrective_actions(ca_status);
CREATE INDEX idx_corrective_actions_due_date ON corrective_actions(due_date);

CREATE INDEX idx_evidence_defect_id ON evidence(defect_id);
CREATE INDEX idx_evidence_ca_id ON evidence(corrective_action_id);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);