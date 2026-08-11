# Appendix Example — Defect D001 (One Case, Many Corrective Actions, One Root Cause)

Use this example in **Appendix D** or for **viva** to explain how `defect_id`, corrective actions, and root cause investigation relate.

**Key rule:** One **defect** = one **defect_id** (one quality case).  
One defect → **many** corrective actions.  
One defect → **one** root cause investigation (not one per corrective action).

---

## Scenario (Kak Norie)

Batch **KN-Rendang-B-20250601** has wrong expiry date printed on labels.  
Worker reports **one defect record**. Manager assigns **two corrective actions**.  
After both are verified, worker suspects root cause; manager confirms and closes the case.

---

## Flow diagram

```
Product: Kak Norie Beef Rendang
    └── Batch: KN-Rendang-B-20250601
            └── Defect D001  (ONE defect_id)
                    ├── Corrective Action CA-001  (fix labels on hold stock)
                    ├── Corrective Action CA-002  (check expiry printer settings)
                    └── Root Cause Investigation   (ONE record for D001)
                            suspected → confirmed
```

---

## Table 1 — Sample row: `defects` (ONE record)

| defect_id | defect_code | product_id | batch_id | defect_type | detected_at_stage | qty_affected | defect_status | created_by |
|-----------|-------------|------------|----------|-------------|-------------------|--------------|---------------|------------|
| 1 | D001 | 1 | 3 | Wrong expiry date printed | Labelling / expiry printing | 120 | closed | 2 (worker) |

*One row = one reported case. `defect_type` is a category name, not the primary key.*

---

## Table 2 — Sample rows: `corrective_actions` (MANY per defect)

| action_id | action_code | defect_id | action_type | task | assigned_to | assigned_by | ca_status |
|-----------|-------------|-----------|-------------|------|-------------|-------------|-----------|
| 1 | CA-001 | **1** | product_handling | Relabel affected packs | 2 (worker) | 1 (manager) | verified |
| 2 | CA-002 | **1** | machine_process_check | Verify expiry printer calibration | 2 (worker) | 1 (manager) | verified |

Both rows share **defect_id = 1** (same defect D001).  
Each corrective action is a **separate task** with its own status and evidence.

---

## Table 3 — Sample row: `root_cause_investigation` (ONE per defect)

| root_cause_id | defect_id | root_cause_status | suspected_root_cause | confirmed_root_cause | confirmed_by |
|---------------|-----------|-------------------|----------------------|----------------------|--------------|
| 1 | **1** | confirmed | Wrong label template selected | Operator selected wrong expiry template on printer | 1 (manager) |

**Only one row** for defect_id = 1.  
It does **not** repeat for CA-001 or CA-002.

---

## Table 4 — Sample rows: `evidence` (optional files)

| evidence_id | defect_id | corrective_action_id | file_name | uploaded_by |
|-------------|-----------|----------------------|-----------|-------------|
| 1 | 1 | NULL | d001-label-photo.jpg | 2 |
| 2 | 1 | 1 | ca001-relabel-proof.jpg | 2 |
| 3 | 1 | 2 | ca002-calibration-check.jpg | 2 |

Evidence can attach to the **defect** and/or a **specific corrective action**.

---

## Lifecycle order (system flow)

| Step | Who | What happens | defect_status | CA / RC |
|------|-----|--------------|---------------|---------|
| 1 | Worker | Report defect D001 | new | RC row created (pending) |
| 2 | Manager | Start review | under_review | — |
| 3 | Manager | Assign CA-001, CA-002 | action_assigned | 2 CAs created |
| 4 | Worker | Complete each CA | in_progress → ready_verification | each CA completed |
| 5 | Manager | Verify both CAs | ready_verification | both verified |
| 6 | Worker | Submit suspected root cause | — | RC → suspected |
| 7 | Manager | Confirm root cause | — | RC → confirmed |
| 8 | Manager | Close defect D001 | **closed** | — |

---

## ERD cardinality (from this example)

| Relationship | Example with D001 |
|--------------|-------------------|
| defects → corrective_actions | D001 has **2** actions (CA-001, CA-002) → **1 : M** |
| defects → root_cause_investigation | D001 has **1** investigation row → **1 : 1** |
| corrective_actions → root_cause_investigation | **No direct link** |

---

## Viva answers (short)

**Q: One defect means what?**  
A: One defect record — one `defect_id` / defect_code such as D001 — for one quality problem on one batch.

**Q: Can one defect have many corrective actions?**  
A: Yes. D001 can have CA-001, CA-002, and more.

**Q: Does each corrective action have its own root cause?**  
A: No. Root cause is stored once per defect in `root_cause_investigation`, after corrective actions are verified.

**Q: What is defect_type then?**  
A: A category label on the defect row (e.g. “Wrong expiry date printed”), not a separate case ID.

---

## Paste into Word (one paragraph)

> Figure 4.7 shows that each defect record (defect_id) represents one quality case. For example, defect D001 may require multiple corrective actions such as product relabelling and machine calibration checks, modelled as separate rows in corrective_actions linked by defect_id. Root cause investigation is stored once per defect in root_cause_investigation, not once per corrective action. After all corrective actions are verified, the worker submits a suspected root cause and the manager confirms it before the defect is closed.
