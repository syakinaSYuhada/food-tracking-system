# APPENDIX D — Complete Data Dictionary (QDTS)

Paste this section at the back of `report fyp 1.docx` as **Appendix D**.  
It matches the sentence in **Table 4.8**: *“A complete data dictionary containing all attributes, data types, keys, and constraints is provided in Appendix D.”*

**Source:** `backend/database/schema.sql` (PostgreSQL)

**Key legend:** PK = Primary Key, FK = Foreign Key, UQ = Unique, NN = Not Null

---

## D.1 Introduction

This appendix documents all thirteen database tables implemented in QDTS. The schema uses PostgreSQL with primary keys, foreign keys, check constraints, and unique constraints to support defect management, batch traceability, corrective actions, root cause investigation, evidence storage, activity logging, and workflow configuration.

Core transactional tables are used for daily operations. Lookup and configuration tables (`defect_types`, `defect_type_mappings`, `root_causes`, `defect_workflow_rules`, `defect_workflow_options`) support dropdown data, stage–type validation, and workflow suggestions.

---

## D.2 Core Transactional Tables

### Table D.1: users

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique user identifier |
| username | VARCHAR(50) | UQ | NN | Login username |
| email | VARCHAR(120) | UQ | NN | User email address |
| password_hash | VARCHAR(255) | | NN | Hashed login password |
| full_name | VARCHAR(120) | | NN | Display name |
| role | VARCHAR(20) | | NN | `manager` or `worker` |
| account_status | VARCHAR(20) | | NN, default `active` | `active` or `inactive` |
| created_at | TIMESTAMP | | NN | Record creation timestamp |
| updated_at | TIMESTAMP | | NN | Last update timestamp |

---

### Table D.2: products

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique product identifier |
| product_name | VARCHAR(150) | | NN | Product name |
| product_code | VARCHAR(50) | UQ | NN | Unique product code |
| category | VARCHAR(100) | | NN | Product category |
| packaging_type | VARCHAR(100) | | NN | Packaging type |
| size_weight | VARCHAR(50) | | NN | Size or weight label |
| shelf_life_months | INT | | NN, > 0 | Shelf life in months |
| selling_price | DECIMAL(10,2) | | default 0 | Selling price |
| loss_rate_per_unit | DECIMAL(10,2) | | NN, >= 0 | Loss rate per unit |
| storage_condition | VARCHAR(150) | | | Storage condition |
| description | TEXT | | | Product description |
| product_status | VARCHAR(30) | | NN, default `active` | `active`, `development`, `inactive`, `archived` |
| created_by | INT | FK | → users.id | User who created record |
| updated_by | INT | FK | → users.id | User who last updated record |
| created_at | TIMESTAMP | | NN | Record creation timestamp |
| updated_at | TIMESTAMP | | NN | Last update timestamp |

---

### Table D.3: batches

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique batch identifier |
| batch_number | VARCHAR(80) | UQ | NN | Unique batch number |
| product_id | INT | FK | NN, → products.id | Linked product |
| production_date | DATE | | NN | Production date |
| retort_date | DATE | | NN | Retort date |
| correct_expiry_date | DATE | | NN | Calculated correct expiry |
| printed_expiry_date | DATE | | NN | Printed expiry on label |
| quantity_produced | INT | | NN, > 0 | Batch quantity produced |
| batch_status | VARCHAR(30) | | NN, default `approved` | `approved`, `defective`, `on_hold`, `closed`, `archived` |
| notes | TEXT | | | Batch notes |
| created_by | INT | FK | → users.id | User who created record |
| updated_by | INT | FK | → users.id | User who last updated record |
| created_at | TIMESTAMP | | NN | Record creation timestamp |
| updated_at | TIMESTAMP | | NN | Last update timestamp |

**Table constraint:** `retort_date >= production_date`

---

### Table D.4: defects

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique defect identifier |
| defect_code | VARCHAR(30) | UQ | NN | Human-readable defect code (e.g. D001) |
| product_id | INT | FK | NN, → products.id | Linked product |
| batch_id | INT | FK | NN, → batches.id | Linked batch |
| detected_at_stage | VARCHAR(80) | | NN | Production stage where defect was detected |
| defect_type | VARCHAR(120) | | NN | Defect type name (text; validated by mapping rules) |
| defect_type_other | TEXT | | | Required description when type is Other |
| mapping_status | VARCHAR(40) | | NN, default `mapped` | `mapped`, `needs_manager_review`, `approved_as_other` |
| problem_level | VARCHAR(50) | | NN | `Can Be Corrected`, `Hold for Review`, `Cannot Be Sold`, `Food Safety Risk` |
| priority | VARCHAR(20) | | NN, default `medium` | `low`, `medium`, `high`, `critical`, `urgent` |
| review_due_date | DATE | | | Manager review due date |
| urgency_reason | TEXT | | | Reason for urgent priority |
| description | TEXT | | NN | Defect description |
| qty_affected | INT | | NN, > 0 | Quantity affected |
| qty_relabelled | INT | | NN, default 0, >= 0 | Relabelled quantity |
| qty_repacked | INT | | NN, default 0, >= 0 | Repacked quantity |
| qty_discarded | INT | | NN, default 0, >= 0 | Discarded quantity |
| qty_on_hold | INT | | NN, default 0, >= 0 | On-hold quantity |
| qty_reworked | INT | | NN, default 0, >= 0 | Reworked quantity |
| qty_released | INT | | NN, default 0, >= 0 | Released quantity |
| still_sellable | INT | | NN, default 0, >= 0 | Still sellable quantity |
| loss_rate_per_unit | DECIMAL(10,2) | | NN, default 0 | Loss rate copied from product |
| estimated_loss | DECIMAL(12,2) | | NN, default 0 | Estimated financial loss |
| loss_status | VARCHAR(40) | | NN, default `pending_review` | `pending_review`, `no_loss`, `loss_confirmed` |
| loss_confirmed_date | DATE | | | Date loss was confirmed |
| defect_status | VARCHAR(40) | | NN, default `new` | `new`, `under_review`, `action_assigned`, `in_progress`, `ready_verification`, `closed` |
| containment_status | VARCHAR(80) | | NN | Containment status label |
| suggested_product_handling | TEXT | | | Suggested product handling text |
| suggested_machine_handling | TEXT | | | Suggested machine/process handling text |
| handling_notes | TEXT | | | Handling notes |
| created_by | INT | FK | → users.id | User who reported defect |
| updated_by | INT | FK | → users.id | User who last updated defect |
| closed_by | INT | FK | → users.id | Manager who closed defect |
| created_at | TIMESTAMP | | NN | Record creation timestamp |
| updated_at | TIMESTAMP | | NN | Last update timestamp |
| closed_at | TIMESTAMP | | | Defect closure timestamp |

---

### Table D.5: root_cause_investigation

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique investigation identifier |
| defect_id | INT | FK, UQ | NN, → defects.id, ON DELETE CASCADE | Linked defect (one record per defect) |
| root_cause_status | VARCHAR(50) | | NN, default `pending_investigation` | `pending_investigation`, `suspected`, `confirmed` |
| suspected_root_cause_source | VARCHAR(100) | | | Suspected root cause source |
| suspected_root_cause | VARCHAR(150) | | | Suspected root cause text |
| related_tool_machine | VARCHAR(120) | | | Related tool or machine |
| confirmed_root_cause_source | VARCHAR(100) | | | Confirmed root cause source |
| confirmed_root_cause | VARCHAR(150) | | | Confirmed root cause text |
| confirmed_by | INT | FK | → users.id | Manager who confirmed root cause |
| confirmed_date | TIMESTAMP | | | Root cause confirmation timestamp |
| investigation_notes | TEXT | | | Investigation notes |
| created_at | TIMESTAMP | | NN | Record creation timestamp |
| updated_at | TIMESTAMP | | NN | Last update timestamp |

---

### Table D.6: corrective_actions

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique corrective action identifier |
| action_code | VARCHAR(30) | UQ | NN | Human-readable action code (e.g. CA-001) |
| defect_id | INT | FK | NN, → defects.id, ON DELETE CASCADE | Linked defect |
| action_type | VARCHAR(40) | | NN, default `product_handling` | `product_handling` or `machine_process_check` |
| task | TEXT | | | Assigned task description |
| action_description | TEXT | | | Action description |
| evidence_required | BOOLEAN | | NN, default FALSE | Whether evidence upload is required |
| containment_actions | TEXT | | | Containment action notes |
| corrective_actions | TEXT | | | Corrective action notes |
| assigned_to | INT | FK | NN, → users.id | Worker assigned to complete action |
| assigned_by | INT | FK | NN, → users.id | Manager who assigned action |
| due_date | DATE | | | Corrective action due date |
| priority | VARCHAR(20) | | NN, default `medium` | `low`, `medium`, `high`, `critical` |
| ca_status | VARCHAR(40) | | NN, default `assigned` | `assigned`, `in_progress`, `completed`, `verified`, `rejected`, `cancelled` |
| started_by | INT | FK | → users.id | Worker who started action |
| started_date | TIMESTAMP | | | Start timestamp |
| completed_by | INT | FK | → users.id | Worker who completed action |
| completed_date | TIMESTAMP | | | Completion timestamp |
| completion_notes | TEXT | | | Completion notes |
| investigation_finding | TEXT | | | Investigation finding |
| action_taken | TEXT | | | Action taken by worker |
| related_tool_machine_checked | VARCHAR(150) | | | Tool or machine checked |
| qty_relabelled | INT | | NN, default 0, >= 0 | Relabelled quantity |
| qty_repacked | INT | | NN, default 0, >= 0 | Repacked quantity |
| qty_reworked | INT | | NN, default 0, >= 0 | Reworked quantity |
| qty_discarded | INT | | NN, default 0, >= 0 | Discarded quantity |
| qty_released | INT | | NN, default 0, >= 0 | Released quantity |
| qty_on_hold | INT | | NN, default 0, >= 0 | On-hold quantity |
| calculated_loss | DECIMAL(12,2) | | NN, default 0 | Calculated loss for action |
| verified_by | INT | FK | → users.id | Manager who verified action |
| verified_date | TIMESTAMP | | | Verification timestamp |
| verification_notes | TEXT | | | Verification notes |
| rejected_by | INT | FK | → users.id | Manager who rejected action |
| rejected_date | TIMESTAMP | | | Rejection timestamp |
| rejection_reason | TEXT | | | Reason for rejection |
| created_at | TIMESTAMP | | NN | Record creation timestamp |
| updated_at | TIMESTAMP | | NN | Last update timestamp |

---

### Table D.7: evidence

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique evidence identifier |
| defect_id | INT | FK | → defects.id, ON DELETE CASCADE | Linked defect |
| corrective_action_id | INT | FK | → corrective_actions.id, ON DELETE CASCADE | Linked corrective action |
| file_name | VARCHAR(255) | | NN | Uploaded file name |
| file_path | VARCHAR(500) | | | Stored file path |
| file_type | VARCHAR(80) | | | File MIME/type |
| evidence_note | TEXT | | | Evidence note |
| uploaded_by | INT | FK | → users.id | User who uploaded evidence |
| created_at | TIMESTAMP | | NN | Upload timestamp |

---

### Table D.8: activity_logs

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique log identifier |
| user_id | INT | FK | → users.id | User who performed action |
| action_type | VARCHAR(100) | | NN | Action type label |
| entity_type | VARCHAR(80) | | NN | Entity type (e.g. defect, corrective_action) |
| entity_id | INT | | | Related entity identifier |
| description | TEXT | | NN | Activity description |
| old_value | TEXT | | | Previous value |
| new_value | TEXT | | | New value |
| created_at | TIMESTAMP | | NN | Activity timestamp |

---

## D.3 Lookup and Configuration Tables

### Table D.9: defect_types

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique defect type identifier |
| defect_type_name | VARCHAR(120) | UQ | NN | Defect type name |
| defect_category | VARCHAR(80) | | | General defect category |
| default_problem_level | VARCHAR(50) | | CHECK values | Default problem level |
| is_active | BOOLEAN | | NN, default TRUE | Active flag |
| created_at | TIMESTAMP | | NN | Record creation timestamp |

---

### Table D.10: defect_type_mappings

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique mapping identifier |
| detected_at_stage | VARCHAR(80) | UQ (composite) | NN | Detected production stage |
| defect_type_id | INT | FK, UQ (composite) | NN, → defect_types.id | Allowed defect type for stage |
| created_at | TIMESTAMP | | NN | Record creation timestamp |

**Purpose:** Enforces valid defect type options for each detected stage.

---

### Table D.11: root_causes

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique root cause option identifier |
| root_cause_source | VARCHAR(80) | UQ (composite) | NN | Root cause source category |
| root_cause_name | VARCHAR(150) | UQ (composite) | NN | Root cause option name |
| is_active | BOOLEAN | | NN, default TRUE | Active flag |
| created_at | TIMESTAMP | | NN | Record creation timestamp |

**Note:** Used as lookup/reference data. Confirmed values are stored as text in `root_cause_investigation`.

---

### Table D.12: defect_workflow_rules

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique rule identifier |
| defect_type | VARCHAR(120) | UQ | NN | Defect type name |
| default_problem_level | VARCHAR(50) | | NN | Default problem level |
| recommended_priority | VARCHAR(20) | | NN | `low`, `medium`, `high`, `critical` |
| is_active | BOOLEAN | | NN, default TRUE | Active flag |
| created_at | TIMESTAMP | | NN | Record creation timestamp |
| updated_at | TIMESTAMP | | NN | Last update timestamp |

---

### Table D.13: defect_workflow_options

| Attribute | Data Type | Key | Constraint | Description |
|-----------|-----------|-----|------------|-------------|
| id | SERIAL | PK | NN | Unique option identifier |
| defect_type | VARCHAR(120) | FK, UQ (composite) | NN, → defect_workflow_rules.defect_type | Related defect type |
| option_type | VARCHAR(40) | UQ (composite) | NN | `product_handling`, `machine_check`, `related_tool`, `root_cause` |
| option_value | TEXT | UQ (composite) | NN | Suggested option text |
| sort_order | INT | | NN, default 1 | Display order |
| is_active | BOOLEAN | | NN, default TRUE | Active flag |
| created_at | TIMESTAMP | | NN | Record creation timestamp |

---

## D.4 Key Relationships Summary

| Parent Table | Child Table | Relationship | Foreign Key | Business Rule |
|--------------|-------------|--------------|-------------|---------------|
| users | products | 1:M | created_by, updated_by | Audit user for product changes |
| users | batches | 1:M | created_by, updated_by | Audit user for batch changes |
| products | batches | 1:M | product_id | One product, many batches |
| products | defects | 1:M | product_id | One product, many defects |
| batches | defects | 1:M | batch_id | One batch, many defects |
| users | defects | 1:M | created_by, updated_by, closed_by | User actions on defect |
| defects | root_cause_investigation | 1:1 | defect_id (UNIQUE) | One root cause record per defect |
| defects | corrective_actions | 1:M | defect_id | Many corrective actions per defect |
| defects | evidence | 1:M | defect_id | Evidence linked to defect |
| corrective_actions | evidence | 1:M | corrective_action_id | Evidence linked to action |
| users | corrective_actions | 1:M | assigned_to, assigned_by, etc. | Assignment and workflow users |
| users | root_cause_investigation | 1:M | confirmed_by | Manager confirms root cause |
| users | evidence | 1:M | uploaded_by | Evidence uploader |
| users | activity_logs | 1:M | user_id | Audit trail user |
| defect_types | defect_type_mappings | 1:M | defect_type_id | Stage–type mapping |
| defect_workflow_rules | defect_workflow_options | 1:M | defect_type | Suggested workflow options |

---

## D.5 Indexes (Selected)

| Table | Index | Purpose |
|-------|-------|---------|
| products | product_status | Filter active/archived products |
| batches | product_id, batch_status, retort_date | Batch lookup and reporting |
| defects | product_id, batch_id, defect_status, created_at | Defect filtering |
| root_cause_investigation | defect_id | One-to-one lookup |
| corrective_actions | defect_id, assigned_to, ca_status, due_date | Action queue and monitoring |
| evidence | defect_id, corrective_action_id | Evidence lookup |
| activity_logs | user_id, entity_type/entity_id, created_at | Audit trail queries |
| defect_workflow_options | defect_type, option_type, sort_order | Dropdown loading |

---

## Word paste instructions

1. In Word, go to the **Appendices** section (after References).
2. Add page heading: **APPENDIX D — COMPLETE DATA DICTIONARY**
3. Paste **D.1 Introduction** as normal paragraph text.
4. Paste each table (D.1 to D.13) using Word **Insert Table** or paste from this file and format as report tables.
5. Paste **D.4** and **D.5** as summary tables.
6. Update **List of Tables** if your template requires appendix table numbering.
7. **Do not change** the sentence in Table 4.8 — it already points here correctly.

**File location:** `PSM/APPENDIX_D_DATA_DICTIONARY.md`
