# QDTS ERD — Exact Attribute Names (copy into your diagram)

Use these names **exactly** as in `backend/database/schema.sql`.  
**Rule:** Every table uses **`id`** as primary key (PK). Do **not** rename PK to `product_id`, `user_id`, `defect_id`, etc.

---

## Fix these common mistakes in your current ERD

| Wrong in your diagram | Correct in QDTS |
|----------------------|-----------------|
| `product_id` (PK) on products | **`id`** (PK) |
| `batches_id` (PK) | **`id`** (PK) |
| `defect_id` (PK) on defects | **`id`** (PK) |
| `user_id` (PK) on users | **`id`** (PK) |
| `defects.user_id` | **`created_by`** (FK → users.id) |
| `root_cause_id` (PK) | **`id`** (PK) |
| `root_cause_investigation.user_id` | **`confirmed_by`** (FK → users.id) |
| `action_id` (PK) | **`id`** (PK) |
| `corrective_actions.user_id` | **`assigned_to`** and **`assigned_by`** (two FKs) |
| `evidence_id` (PK) | **`id`** (PK) |
| `activity_logs_id` (PK) | **`id`** (PK) |
| `defect_types_id`, `defect_workflow_rules_id`, etc. | **`id`** (PK) on every table |
| Placeholder **Table** box | **Delete** — not in QDTS |
| Missing table | Add **`defect_workflow_options`** |

---

## 13 tables — important attributes only

### 1. users

| Type | Attribute |
|------|-----------|
| PK | **id** |
| | username |
| | email |
| | full_name |
| | role |
| | account_status |

---

### 2. products

| Type | Attribute |
|------|-----------|
| PK | **id** |
| | product_code |
| | product_name |
| | category |
| | packaging_type |
| | size_weight |
| | shelf_life_months |
| | loss_rate_per_unit |
| | product_status |
| FK | created_by → users.id *(optional on core ERD)* |
| FK | updated_by → users.id *(optional on core ERD)* |

---

### 3. batches

| Type | Attribute |
|------|-----------|
| PK | **id** |
| FK | **product_id** → products.id |
| FK | **created_by** → users.id *(optional on core ERD)* |
| FK | **updated_by** → users.id *(optional on core ERD)* |
| | batch_number |
| | production_date |
| | retort_date |
| | correct_expiry_date |
| | printed_expiry_date |
| | quantity_produced |
| | batch_status |

*Omitted from core ERD for readability — not because the column is missing. Manager who adds/edits a batch is stored in `created_by` / `updated_by`.*

---

### 4. defects

| Type | Attribute |
|------|-----------|
| PK | **id** |
| | defect_code |
| FK | **product_id** → products.id |
| FK | **batch_id** → batches.id |
| FK | **created_by** → users.id |
| | detected_at_stage |
| | defect_type |
| | problem_level |
| | priority |
| | description |
| | qty_affected |
| | defect_status |
| | loss_status |
| | estimated_loss |

*Form labels:* Detected Stage, Defect Type, Problem Level, Quantity Affected, Defect Status.

---

### 5. root_cause_investigation

| Type | Attribute |
|------|-----------|
| PK | **id** |
| FK | **defect_id** → defects.id (1:1, UNIQUE) |
| FK | **confirmed_by** → users.id |
| | root_cause_status |
| | suspected_root_cause |
| | confirmed_root_cause |

*Status values:* pending_investigation, suspected, confirmed.

---

### 6. corrective_actions

| Type | Attribute |
|------|-----------|
| PK | **id** |
| | action_code |
| FK | **defect_id** → defects.id |
| FK | **assigned_to** → users.id |
| FK | **assigned_by** → users.id |
| | action_type |
| | task |
| | due_date |
| | ca_status |
| | calculated_loss |

*Form labels:* Action Type, Task, Assigned To, Due Date, Status (ca_status).

---

### 7. evidence

| Type | Attribute |
|------|-----------|
| PK | **id** |
| FK | **defect_id** → defects.id |
| FK | **corrective_action_id** → corrective_actions.id |
| FK | **uploaded_by** → users.id |
| | file_name |

---

### 8. activity_logs

| Type | Attribute |
|------|-----------|
| PK | **id** |
| FK | **user_id** → users.id |
| | action_type |
| | entity_type |
| | entity_id |
| | description |

---

### 9. defect_types *(lookup)*

| Type | Attribute |
|------|-----------|
| PK | **id** |
| | defect_type_name |
| | defect_category |
| | default_problem_level |
| | is_active |

---

### 10. defect_type_mappings *(lookup)*

| Type | Attribute |
|------|-----------|
| PK | **id** |
| FK | **defect_type_id** → defect_types.id |
| | detected_at_stage |

---

### 11. root_causes *(lookup)*

| Type | Attribute |
|------|-----------|
| PK | **id** |
| | root_cause_source |
| | root_cause_name |
| | is_active |

*No FK to root_cause_investigation* — values copied as text when user selects dropdown.

---

### 12. defect_workflow_rules *(lookup)*

| Type | Attribute |
|------|-----------|
| PK | **id** |
| | defect_type |
| | default_problem_level |
| | recommended_priority |
| | is_active |

---

### 13. defect_workflow_options *(lookup)*

| Type | Attribute |
|------|-----------|
| PK | **id** |
| FK | **defect_type** → defect_workflow_rules.defect_type |
| | option_type |
| | option_value |
| | sort_order |

*option_type:* product_handling, machine_check, related_tool, root_cause.

---

## Relationships to draw (solid = FK in database)

```
users ──< products (created_by, updated_by)
users ──< batches (created_by, updated_by)
products ──< batches (product_id)
products ──< defects (product_id)
batches ──< defects (batch_id)
users ──< defects (created_by)
defects ──|| root_cause_investigation (defect_id UNIQUE)
users ──< root_cause_investigation (confirmed_by)
defects ──< corrective_actions (defect_id)
users ──< corrective_actions (assigned_to, assigned_by)
defects ──< evidence (defect_id)
corrective_actions ──< evidence (corrective_action_id)
users ──< evidence (uploaded_by)
users ──< activity_logs (user_id)
defect_types ──< defect_type_mappings (defect_type_id)
defect_workflow_rules ──< defect_workflow_options (defect_type)
```

**Dashed lines (logical only, no FK):**
- defect_type_mappings ↔ defects (validates detected_at_stage + defect_type)
- root_causes ↔ root_cause_investigation (dropdown text)
- defect_workflow_rules ↔ defects (suggestions by defect_type name)

---

## Which diagram for report?

| Diagram | Tables | File |
|---------|--------|------|
| **Core ERD (Chapter 4)** | 8 tables (#1–8) | `PSM/diagrams/figure-4-15-core-entity-relationship-diagram.png` |
| **Full ERD (Appendix D)** | All 13 tables | `PSM/diagrams/erd-qdts-simplified.png` (regenerate with script below) |

Regenerate from schema:

```powershell
cd backend
node scripts/generate-erd-svg.js core
node scripts/generate-erd-svg.js simple
```
