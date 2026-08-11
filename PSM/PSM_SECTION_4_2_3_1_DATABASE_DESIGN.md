# 4.2.3.1 Conceptual and Logical Database Design — QDTS v2

Use this section in **Chapter 4 (Design)**. Insert the **core ERD** from `PSM/diagrams/erd-qdts-core-report.svg`.

> **Scope:** This report uses **8 core tables** only. Lookup/config tables (`defect_types`, `root_causes`, `defect_workflow_rules`, etc.) exist in the full database (`schema.sql`) but are omitted here to keep the logical model readable. The full ERD is available in `PSM/diagrams/erd-qdts-full.svg`.

---

## 4.2.3.1 Conceptual and Logical Database Design

### Introduction to the Logical Data Model (LDM)

The **logical data model (LDM)** describes *what data the system stores* and *how entities relate*, without specifying physical storage details such as indexes or file paths. In this project, the LDM is expressed as an **entity–relationship diagram (ERD)**.

An ERD is the bridge between business requirements and the physical database:

| Layer | Purpose in QDTS |
|-------|-----------------|
| **Conceptual** | Main business objects: Product, Batch, Defect, Corrective Action, User |
| **Logical (LDM)** | Tables, primary keys (PK), foreign keys (FK), cardinality, and business rules |
| **Physical** | PostgreSQL `schema.sql` — column types, CHECK constraints, indexes |

The QDTS logical model supports the defect workflow: master data (products, batches) → defect capture → root-cause investigation → corrective actions → evidence and audit logs. Relationships enforce traceability (which batch, which product, who acted) and prevent inconsistent duplication of production dates or expiry values on the defect record itself.

---

### Figure 4.10: Core Logical ERD of QDTS Database

**File:** `PSM/diagrams/erd-qdts-core-report.svg`

**Core entities (8 tables):**

| # | Entity | Role |
|---|--------|------|
| 1 | `users` | Authentication, role (manager/worker), audit attribution |
| 2 | `products` | Product master — shelf life, loss rate, status |
| 3 | `batches` | Production batch — dates, quantity, expiry traceability |
| 4 | `defects` | Defect record — quantities, status, loss |
| 5 | `root_cause_investigation` | One investigation record per defect |
| 6 | `corrective_actions` | Tasks assigned to workers, verified by managers |
| 7 | `evidence` | File metadata linked to defect or corrective action |
| 8 | `activity_logs` | Append-only audit trail |

**Cardinality summary:**

```
products (1) ──< batches (M)
products (1) ──< defects (M)
batches  (1) ──< defects (M)
defects  (1) ──| root_cause_investigation (0..1)
defects  (1) ──< corrective_actions (M)
defects  (1) ──< evidence (M)
corrective_actions (1) ──< evidence (M)
users (1) ──< defects / corrective_actions / activity_logs (M)  [via FK columns]
```

---

### Entity Relationships and Business Rules

Each relationship below is enforced by a **foreign key** in `schema.sql`. The business rule explains *why* the relationship exists.

#### Table 4.2: Entity Relationships and Business Rules

| Parent Entity | Child Entity | Cardinality | FK Column(s) | Business Rule |
|---------------|--------------|-------------|--------------|---------------|
| `products` | `batches` | 1 : M | `batches.product_id` | Every production batch is manufactured for **exactly one product**. A product may have many batches over time. Batch expiry is derived from the product’s `shelf_life_months` and the batch `retort_date`; batch data is not duplicated on the product row. |
| `products` | `defects` | 1 : M | `defects.product_id` | Every defect concerns **one product**. The FK supports reporting and filtering (e.g. loss by product) without storing `product_name` or `product_code` again on the defect row. |
| `batches` | `defects` | 1 : M | `defects.batch_id` | Every defect is tied to **one specific batch** for traceability. Multiple defects may be logged against the same batch (e.g. relabelling issue and machine check). Defect does **not** store `retort_date`, `printed_expiry_date`, or `quantity_produced` — those remain on `batches` and are joined at query time. |
| `defects` | `root_cause_investigation` | 1 : 0..1 | `root_cause_investigation.defect_id` (UNIQUE) | Each defect has **at most one** root-cause investigation record. When a worker reports a defect, investigation may start as `pending_investigation`; the manager confirms the root cause later. `ON DELETE CASCADE` removes investigation if the parent defect is deleted. |
| `defects` | `corrective_actions` | 1 : M | `corrective_actions.defect_id` | A defect may require **one or more** corrective actions (e.g. relabel stock and check retort machine). Each corrective action belongs to exactly one defect. Status workflow: assigned → in_progress → completed → verified/rejected. |
| `defects` | `evidence` | 1 : M | `evidence.defect_id` | Supporting files (photos, documents) may be attached at defect level. Optional FK — evidence may instead link only to a corrective action. |
| `corrective_actions` | `evidence` | 1 : M | `evidence.corrective_action_id` | Evidence can be uploaded when a worker completes an action (e.g. photo of relabelled cans). One action may have multiple evidence files. |
| `users` | `defects` | 1 : M | `defects.created_by`, `updated_by`, `closed_by` | Defect creation and closure must be attributable to a **registered user**. Workers typically create; managers may update status or close. Nullable `closed_by` until defect is closed. |
| `users` | `corrective_actions` | 1 : M | `assigned_to`, `assigned_by`, `started_by`, `completed_by`, `verified_by`, `rejected_by` | **Separation of duties:** manager assigns (`assigned_by` → `assigned_to` worker); worker starts/completes; manager verifies or rejects. Each transition records the responsible user. |
| `users` | `evidence` | 1 : M | `evidence.uploaded_by` | Every uploaded file records **who uploaded** it for audit. |
| `users` | `activity_logs` | 1 : M | `activity_logs.user_id` | System events (create, update, status change) are logged per user. Supports Activity Log screen and viva demonstration of audit trail. |
| `users` | `products` | 1 : M | `products.created_by`, `updated_by` | Optional audit — who added or last edited a product master record. |
| `users` | `batches` | 1 : M | `batches.created_by`, `updated_by` | Optional audit — who registered or updated batch production data. |

#### Design decisions reflected in the ERD

1. **Batch owns dates and quantity** — `production_date`, `retort_date`, `correct_expiry_date`, `printed_expiry_date`, and `quantity_produced` live only on `batches`. This supports the **Batch Expiry Audit** report (compare correct vs printed expiry) without conflicting copies on `defects`.

2. **Product owns shelf life and loss rate** — `shelf_life_months` and `loss_rate_per_unit` are master data on `products`. When a defect is created, `loss_rate_per_unit` may be copied to the defect row as a **snapshot** for historical accuracy if the product rate changes later.

3. **Defect quantity breakdown** — `qty_affected`, `qty_relabelled`, `qty_discarded`, etc. are separate atomic columns (not a repeating group), satisfying first normal form and supporting loss calculations per handling type.

4. **Root cause deferred** — Root cause is not required at initial defect report. The 1:1 `root_cause_investigation` table allows `pending_investigation` → `suspected` → `confirmed` without overloading the `defects` table.

5. **Lookup tables excluded from core ERD** — `defect_type` on `defects` is stored as text (with `mapping_status` for “Other” types). Reference lists (`defect_types`, `root_causes`, `defect_workflow_rules`) support dropdowns and suggestions but are not part of the core transactional path shown in this diagram.

---

### Data Dictionary (Core Tables)

The tables below list **key columns** for the report. Full column lists are in `backend/database/schema.sql`.

#### Table 4.3: Data Dictionary — `users`

| Column | Data Type | PK/FK | Nullable | Description |
|--------|-----------|-------|----------|-------------|
| `id` | SERIAL | PK | No | Unique user identifier |
| `username` | VARCHAR(50) | — | No | Login name (unique) |
| `role` | VARCHAR(20) | — | No | `manager` or `worker` — controls UI and API permissions |
| `full_name` | VARCHAR(120) | — | No | Display name on dashboards and assignment lists |
| `account_status` | VARCHAR(20) | — | No | `active` or `inactive` — inactive users cannot log in |

#### Table 4.4: Data Dictionary — `products`

| Column | Data Type | PK/FK | Nullable | Description |
|--------|-----------|-------|----------|-------------|
| `id` | SERIAL | PK | No | Unique product identifier |
| `product_code` | VARCHAR(50) | — | No | Short code (unique), e.g. for batch labels |
| `product_name` | VARCHAR(150) | — | No | Commercial product name |
| `shelf_life_months` | INT | — | No | Months added to retort date to compute correct expiry |
| `loss_rate_per_unit` | DECIMAL(10,2) | — | No | Default monetary loss per affected unit (RM) |
| `product_status` | VARCHAR(30) | — | No | `active`, `development`, `inactive`, or `archived` |

#### Table 4.5: Data Dictionary — `batches`

| Column | Data Type | PK/FK | Nullable | Description |
|--------|-----------|-------|----------|-------------|
| `id` | SERIAL | PK | No | Unique batch identifier |
| `product_id` | INT | FK → `products.id` | No | Product manufactured in this batch |
| `batch_number` | VARCHAR(80) | — | No | Human-readable batch ID (unique) |
| `retort_date` | DATE | — | No | Sterilisation date — base for correct expiry |
| `correct_expiry_date` | DATE | — | No | System-calculated expiry (retort + shelf life) |
| `printed_expiry_date` | DATE | — | No | Expiry printed on label — compared for mismatch alerts |
| `quantity_produced` | INT | — | No | Total units in batch (must be > 0) |
| `batch_status` | VARCHAR(30) | — | No | `approved`, `defective`, `on_hold`, `closed`, `archived` |

#### Table 4.6: Data Dictionary — `defects`

| Column | Data Type | PK/FK | Nullable | Description |
|--------|-----------|-------|----------|-------------|
| `id` | SERIAL | PK | No | Unique defect identifier |
| `defect_code` | VARCHAR(30) | — | No | Business reference code (unique), shown in UI |
| `product_id` | INT | FK → `products.id` | No | Affected product |
| `batch_id` | INT | FK → `batches.id` | No | Affected batch |
| `detected_at_stage` | VARCHAR(80) | — | No | Process stage where defect was found |
| `defect_type` | VARCHAR(120) | — | No | Category of defect (from list or “Other”) |
| `problem_level` | VARCHAR(50) | — | No | Severity: Can Be Corrected, Hold for Review, Cannot Be Sold, Food Safety Risk |
| `qty_affected` | INT | — | No | Number of units impacted (must be > 0) |
| `defect_status` | VARCHAR(40) | — | No | Workflow: `new` → `under_review` → … → `closed` |
| `loss_status` | VARCHAR(40) | — | No | `pending_review`, `no_loss`, or `loss_confirmed` |
| `created_by` | INT | FK → `users.id` | Yes | User who reported/created the defect |

#### Table 4.7: Data Dictionary — `root_cause_investigation`

| Column | Data Type | PK/FK | Nullable | Description |
|--------|-----------|-------|----------|-------------|
| `id` | SERIAL | PK | No | Unique investigation identifier |
| `defect_id` | INT | FK → `defects.id` | No | Parent defect (unique — one row per defect) |
| `root_cause_status` | VARCHAR(50) | — | No | `pending_investigation`, `suspected`, or `confirmed` |
| `confirmed_root_cause` | VARCHAR(150) | — | Yes | Final root cause after manager confirmation |
| `confirmed_by` | INT | FK → `users.id` | Yes | Manager who confirmed the root cause |

#### Table 4.8: Data Dictionary — `corrective_actions`

| Column | Data Type | PK/FK | Nullable | Description |
|--------|-----------|-------|----------|-------------|
| `id` | SERIAL | PK | No | Unique action identifier |
| `action_code` | VARCHAR(30) | — | No | Business reference code (unique) |
| `defect_id` | INT | FK → `defects.id` | No | Parent defect |
| `action_type` | VARCHAR(40) | — | No | `product_handling` or `machine_process_check` |
| `task` | TEXT | — | Yes | Short task label shown to worker |
| `assigned_to` | INT | FK → `users.id` | No | Worker responsible for execution |
| `assigned_by` | INT | FK → `users.id` | No | Manager who created the assignment |
| `due_date` | DATE | — | Yes | Target completion date |
| `ca_status` | VARCHAR(40) | — | No | `assigned`, `in_progress`, `completed`, `verified`, `rejected` |
| `calculated_loss` | DECIMAL(12,2) | — | No | Loss amount computed when action is completed |

#### Table 4.9: Data Dictionary — `evidence`

| Column | Data Type | PK/FK | Nullable | Description |
|--------|-----------|-------|----------|-------------|
| `id` | SERIAL | PK | No | Unique evidence record |
| `defect_id` | INT | FK → `defects.id` | Yes | Optional link to defect |
| `corrective_action_id` | INT | FK → `corrective_actions.id` | Yes | Optional link to corrective action |
| `file_name` | VARCHAR(255) | — | No | Original uploaded file name |
| `uploaded_by` | INT | FK → `users.id` | Yes | User who attached the file |

#### Table 4.10: Data Dictionary — `activity_logs`

| Column | Data Type | PK/FK | Nullable | Description |
|--------|-----------|-------|----------|-------------|
| `id` | SERIAL | PK | No | Unique log entry |
| `user_id` | INT | FK → `users.id` | Yes | User who performed the action |
| `action_type` | VARCHAR(100) | — | No | e.g. `CREATE`, `UPDATE`, `STATUS_CHANGE` |
| `entity_type` | VARCHAR(80) | — | No | e.g. `defect`, `corrective_action`, `batch` |
| `entity_id` | INT | — | Yes | Primary key of affected record |
| `description` | TEXT | — | No | Human-readable audit message |

---

### Normalization

The QDTS database is designed to **Third Normal Form (3NF)**. Below is how each normal form applies to this project.

#### First Normal Form (1NF)

**Rule:** Each column holds a single atomic value; no repeating groups or multi-valued fields in one cell.

**How QDTS complies:**

- Quantity handling uses separate columns (`qty_affected`, `qty_relabelled`, `qty_discarded`, …) instead of one comma-separated list or multiple rows in a “quantity type” repeating group within `defects`.
- User roles, statuses, and enums are single values per row with CHECK constraints.
- Each table has a primary key (`id` SERIAL).

#### Second Normal Form (2NF)

**Rule:** All non-key attributes depend on the **whole** primary key (relevant when PK is composite).

**How QDTS complies:**

- Every core table uses a **single-column surrogate primary key** (`id`). There are no partial dependencies on part of a composite key.
- In `defect_type_mappings` (full schema), the composite unique key `(detected_at_stage, defect_type_id)` is not used as the primary key; `id` remains the PK.

#### Third Normal Form (3NF)

**Rule:** No non-key attribute depends on another non-key attribute (no transitive dependencies).

**How QDTS complies:**

| Avoided redundancy | Correct design |
|--------------------|----------------|
| Storing `product_name` on every `defects` row | `defects.product_id` FK only; name retrieved via JOIN |
| Storing `retort_date` / expiry on `defects` | Dates stay on `batches`; defect links via `batch_id` |
| Storing `shelf_life_months` only on product | `batches` does not duplicate shelf life; expiry computed from `products` + `retort_date` |
| Mixing investigation fields into `defects` | Separate `root_cause_investigation` table (1:1) |
| Embedding corrective-action history in `defects` | Separate `corrective_actions` table (1:M) |

**Controlled denormalization (documented exception):**

- `defects.loss_rate_per_unit` and `defects.estimated_loss` may snapshot values at defect creation time so historical loss reports remain accurate if the product master rate changes later. This is an intentional trade-off for auditability, not an uncontrolled transitive dependency.

**Conclusion:** The logical model separates master data (`products`), production context (`batches`), operational records (`defects`, `corrective_actions`), and audit (`activity_logs`). Relationships use foreign keys rather than duplicated descriptive fields, which reduces update anomalies and supports consistent reporting for the FYP demonstration.

---

## Copy-paste paragraph (report body)

The logical database design for Kak Norie QDTS v2 is modelled using an entity–relationship diagram that captures eight core entities: users, products, batches, defects, root cause investigation, corrective actions, evidence, and activity logs. The LDM translates business rules into referential integrity — for example, every batch belongs to one product, every defect references exactly one product and one batch without duplicating batch production dates, and each defect has at most one root-cause investigation record while supporting multiple corrective actions. Master data such as shelf life and loss rate remain on the product entity; batch-level dates and quantities remain on the batch entity; defect rows store only affected quantities and workflow status. The schema satisfies Third Normal Form through atomic columns, single-column primary keys, and foreign-key relationships instead of redundant descriptive fields. A core data dictionary documents primary keys, foreign keys, data types, and the business meaning of each important column. Lookup tables for defect types and workflow suggestions exist in the physical schema but are excluded from the core ERD to keep the report focused on the main transactional workflow.

---

## Files reference

| Item | Path |
|------|------|
| Core ERD (report) | `PSM/diagrams/erd-qdts-core-report.svg` |
| Full ERD (all 13 tables) | `PSM/diagrams/erd-qdts-full.svg` |
| Physical schema | `backend/database/schema.sql` |
| Regenerate ERD | `cd backend && npm run erd` |
