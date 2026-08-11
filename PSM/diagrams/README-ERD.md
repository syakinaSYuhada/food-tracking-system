# ERD — QDTS Database

## Three versions

| File | Purpose | Tables | Columns shown |
|------|---------|--------|-----------------|
| `erd-qdts-simplified.svg` | **Recommended for FYP** — all tables, key columns only | 13 | ~70 key attributes |
| `erd-qdts-core.svg` | Old overview (8 tables only) | 8 | Fewest |
| `erd-qdts-full.svg` | Complete physical ERD | 13 | All 162 columns |

Regenerate after schema changes:

```powershell
cd backend
npm run erd
# or individually:
node scripts/generate-erd-svg.js simple   # simplified
node scripts/generate-erd-svg.js          # full
```

## Simplified ERD — columns shown per table

| Table | Key columns shown |
|-------|-------------------|
| users | id, username, role, full_name, account_status |
| products | id, product_code, product_name, shelf_life_months, loss_rate_per_unit, product_status |
| batches | id, product_id, batch_number, retort_date, correct_expiry_date, printed_expiry_date, quantity_produced, batch_status |
| defect_types | id, defect_type_name, defect_category, is_active |
| defect_type_mappings | id, detected_at_stage, defect_type_id |
| root_causes | id, root_cause_source, root_cause_name, is_active |
| defects | id, defect_code, product_id, batch_id, detected_at_stage, defect_type, problem_level, qty_affected, defect_status, loss_status, created_by |
| root_cause_investigation | id, defect_id, root_cause_status, confirmed_root_cause, confirmed_by |
| corrective_actions | id, action_code, defect_id, action_type, task, assigned_to, assigned_by, due_date, ca_status, calculated_loss |
| evidence | id, defect_id, corrective_action_id, file_name, uploaded_by |
| activity_logs | id, user_id, action_type, entity_type, entity_id, description |
| defect_workflow_rules | id, defect_type, default_problem_level, recommended_priority |
| defect_workflow_options | id, defect_type, option_type, option_value |

Omitted from simplified view: timestamps (`created_at`, `updated_at`), audit FKs (`updated_by`, `closed_by`), quantity breakdown fields, and password hash.

## Suggested captions

**Simplified (Chapter 3 or 4):**
> Figure X.X Entity Relationship Diagram of the QDTS database showing all tables with primary keys (PK), foreign keys (FK), and key business attributes.

**Full (Chapter 4 appendix):**
> Figure X.X Complete logical ERD of the QDTS database generated from `schema.sql`.
