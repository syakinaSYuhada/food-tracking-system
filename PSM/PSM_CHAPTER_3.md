# CHAPTER 3: ANALYSIS

## 3.1 Introduction

Chapter 2 established the research approach, literature themes, Kak Norie as-is practices, selected technique, and SDLC framework for the **Quality Defect Tracking System (QDTS)**. This chapter translates those findings into formal **system analysis and requirements** for the **implemented QDTS prototype**.

The analysis phase addresses three questions:

1. What are the weaknesses of the **current manual process** at Kak Norie?
2. What **data**, **functions**, and **quality attributes** must QDTS support?
3. How do the confirmed requirements correspond to the **modules actually built** in React, Express, and PostgreSQL?

All requirements in Section 3.3 are based only on the running system: `schema.sql`, API routes and controllers, React pages, role access rules, report modules, and demo seed data (`seed.sql`, `seed_demo_timeline.sql`). Wording in this chapter uses **QDTS** (not internal version names) and describes exports as **CSV** and **browser print/save-as-PDF**, because the prototype does not generate native PDF files.

Chapter 4 will present system design. This chapter focuses on analysis only.

---

## 3.2 Problem Analysis

### 3.2.1 Current System Scenario

Chapter 1 (Section 1.2) and Chapter 2 (Table 2.2) summarise the manual process confirmed from WhatsApp communication (Appendix C) and the Google Form response (Appendix B). At Kak Norie today:

**Manual paper recording**  
Defects are recorded in a notebook (*“dalam buku / kertas”*). Records are not indexed, searchable, or linked to a central product or batch master.

**No formal batch numbering on every production**  
The form response to *“Adakah setiap production mempunyai batch number?”* was **“Tidak”**. Production history is therefore difficult to trace in a consistent coded format on paper.

**Manager and worker involvement**  
The manager (Nazhif) and workers both handle quality-related work (*“Pengurus dan pekerja”*), but there is no digital rule for who reports, who acts, who verifies, and who closes a case.

**Defect handling**  
When a quality issue is found (for example **loose sealing** at **Packing / Filling** or **Sealing**, as reported in the form), the team may segregate stock, relabel, discard, or adjust equipment. These steps are not tracked through a structured workflow with statuses.

**Corrective action monitoring**  
The manager reported *“tindakan pembetulan tidak dipantau”*. Due dates, completion, and verification are not centrally monitored, which supports the form finding *“Masalah yang sama boleh berulang”*.

**Loss recording**  
Loss is currently based on *“bilangan unit rosak sahaja”*. Relabelled, discarded, on-hold, and estimated financial loss are not consolidated in one auditable record.

**Expiry checking**  
Manual review of batch and expiry for wrong-print scenarios was reported as *“Ya, mudah”*, but there is no centralized digital record or automatic mismatch alert. Printed expiry had not been reported as different from correct expiry at response time (*“Tidak”*).

**Reporting limitations**  
The manager requested reports such as loss, corrective actions, and root causes. Paper records cannot produce filtered KPIs, charts, CSV exports, printable summaries, or user-timestamped audit trails.

---

### 3.2.2 Current Process Flow

The **real production flow** at Kak Norie is:

**Ingredient preparation → Cooking → Packing → Sealing → Retort → (Cooling) → Labelling → Storage → delivery / customer**

**Cooling** occurs after retort in actual production but is **not** a detected stage in QDTS. It is mentioned here only as real process context.

When a quality issue is detected, the **manual quality sub-process** is:

1. Issue found during or after production  
2. Problem written in a paper notebook  
3. Manager or worker informed informally  
4. Immediate physical action (discard, relabel, machine adjustment, hold stock)  
5. Loss noted manually (usually defective units only)  
6. No structured root cause link to product history  
7. No centralized report or audit log  

**Figure 3.1 — Current activity flow (recommended diagram)**

| Step | Activity | Actor | Output |
|------|----------|-------|--------|
| 1 | Ingredient preparation | Worker | Prepared ingredients |
| 2 | Cooking | Worker | Cooked product |
| 3 | Packing / filling | Worker | Filled packs |
| 4 | Sealing | Worker | Sealed packs |
| 5 | Retort process | Worker | Retorted packs |
| 6 | Cooling (real process only) | Worker | Cooled packs |
| 7 | Labelling / expiry printing | Worker | Labelled stock |
| 8 | Stock storage | Worker/Manager | Stored inventory |
| 9 | Detect quality issue | Worker/Manager | Problem identified |
| 10 | Write in notebook | Worker/Manager | Paper defect note |
| 11 | Inform manager/worker verbally | Both | Informal decision |
| 12 | Take corrective action | Worker/Manager | Physical action |
| 13 | Record loss manually | Worker/Manager | Partial loss note |
| 14 | File paper — no central search | — | Weak traceability |

**Figure 3.2 — Current sequence diagram (recommended narrative)**

1. **Worker** detects a defect during packing, sealing, labelling, storage, or delivery.  
2. **Worker** writes product name, approximate date, and quantity in a notebook.  
3. **Worker** informs the **Manager** verbally.  
4. **Manager** decides corrective action without formal system assignment.  
5. **Worker/Manager** performs the action on the production floor.  
6. **Manager** may note loss on paper.  
7. Completion is not verified in a system; similar defects may recur.  
8. **Manager** cannot easily produce loss or root cause summaries from paper files.

*Diagram sources in project:* `PSM/diagrams/figure-3-1-current-manual-defect-handling-activity.png`, `PSM/diagrams/figure-3-2-current-manual-defect-handling-sequence.png`, `PSM/diagrams/figure-3-3-qdts-use-case.png`, `PSM/diagrams/figure-3-4-proposed-qdts-workflow-activity.png`

---

### 3.2.3 Problem Analysis

Table 3.1 links each Chapter 1 problem to its manual cause and the matching function in the **implemented** QDTS prototype.

**Table 3.1: Chapter 1 problem statements — cause, impact, and QDTS solution**

| # | Problem (Ch. 1) | Cause (manual process) | Impact | QDTS solution (implemented) |
|---|-----------------|------------------------|--------|----------------------------|
| P1 | Unstructured record keeping | Paper notebook only | Slow search; incomplete history | Digital defect records linked to product and batch master |
| P2 | Corrective actions not monitored | No assignment or status tracking | Actions forgotten | CA workflow: Assigned → In Progress → Submitted — Pending Review → Verified / Rejected / Cancelled |
| P3 | Recurring defects | Root cause not linked to history | Same problems repeat | Root cause investigation + root cause reports + batch/defect history |
| P4 | Expiry traceability gaps | No digital compare of printed vs correct expiry; no formal batch no. on every run | Weak label audit | **New batch master** in QDTS; auto `correct_expiry_date`; mismatch alerts; Expiry Issues and Batch Expiry Audit reports |
| P5 | Loss not quantified in one system | Loss = defective units only on paper | Cannot total disposal cost | Quantity fields + `estimated_loss`; Loss report KPIs |
| P6 | Limited audit trail | Paper lacks user/time trail | Weak accountability | `activity_logs` + defect activity timeline + Activity Log page |
| P7 | No role-based digital workflow | Informal shared responsibilities | Unclear verify/close roles | JWT roles; manager-only routes; worker scoped access |

Table 3.1 confirms that every problem in Chapter 1 has a corresponding feature in the running system, not only a planned design.

**Note on batch numbering (P4):** The Google Form response mentioned a format such as `(product)-B-001`. QDTS implements **`{product_code}-B-{YYYYMMDD}`** from retort date when a manager creates a batch. This is a **new digital capability**; it replaces the current absence of formal batch numbers on every production.

---

## 3.3 Requirement Analysis

All requirements below exist in the **current implemented prototype**. No unimplemented features are included.

### 3.3.1 Data Requirement

#### Input data

| Data area | Key inputs | Source / validation |
|-----------|------------|---------------------|
| **User** | username, email, full_name, role, password | Login; manager Add User form |
| **Product** | product_name, product_code, category, packaging_type, size_weight, shelf_life_months, loss_rate_per_unit, storage_condition, product_status | Manager product form |
| **Batch** | product_id, production_date, retort_date, printed_expiry_date, quantity_produced, notes | Manager batch form; `retort_date ≥ production_date` |
| **Defect** | product_id, batch_id, detected_at_stage, defect_type, problem_level, description, qty_affected, optional handling quantities, evidence, review_due_date (manager) | Worker 2-step report or manager 3-step report; qty ≤ batch quantity |
| **Corrective Action** | action_type, task, assigned_to, due_date, priority, completion quantities, evidence | Manager assign; assigned worker complete |
| **Root Cause** | suspected fields (worker) or confirmed fields (manager) | One investigation row per defect |
| **Evidence** | image file, evidence_note | Defect or CA upload |

#### Output data

| Output | Description | Module |
|--------|-------------|--------|
| **Dashboard KPIs** | Defect, loss, action, expiry, and chart summaries | `GET /reports/dashboard/summary` |
| **Reports** | Ten manager report tabs | `GET /reports/*` |
| **Notifications** | In-app bell only (no email/SMS) | `NotificationsPanel` |
| **CSV export** | Downloadable table data from reports/lists | `TableExportActions`, `ListCsvExport` |
| **Print summary** | Browser print/save-as-PDF for reports and defect/CA summaries | `reportExport.js`, `defectExport.js`, `correctiveActionExport.js` |

#### Stored data — thirteen entities

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Accounts and roles |
| 2 | `products` | Product master |
| 3 | `batches` | Production and expiry records |
| 4 | `defect_types` | Defect type catalogue |
| 5 | `defect_type_mappings` | Stage-to-type rules |
| 6 | `defect_workflow_rules` | Default level/priority by type |
| 7 | `defect_workflow_options` | Suggested handling options |
| 8 | `root_causes` | Master root cause list |
| 9 | `defects` | Defect cases |
| 10 | `root_cause_investigation` | Investigation per defect |
| 11 | `corrective_actions` | Assigned tasks |
| 12 | `evidence` | Upload metadata |
| 13 | `activity_logs` | Audit trail |

#### Key business rules and calculations (implemented)

QDTS applies automatic calculations and validation checks when managers create batches, when workers or managers report defects, and when corrective actions are completed. Table 3.8 summarises the main rules in plain language. Selected rules are explained further in the paragraphs after the table.

**Table 3.8: Key business rules and calculations (implemented)**

| Rule | Implementation |
|------|----------------|
| Batch number | The system automatically generates a batch number using the product code and retort date when the manager creates a batch (format: `{product_code}-B-{YYYYMMDD}`). |
| Batch date validation | The retort date cannot be earlier than the production date. |
| Correct expiry date | The correct expiry date is calculated from the retort date and the product shelf life in months. |
| Expiry mismatch | If the correct expiry date is different from the printed expiry date, the batch is marked as defective and an alert is shown. If both dates match, the batch is marked as approved. |
| Expiry difference | The system calculates the difference between the correct expiry date and printed expiry date in days for reporting purposes. |
| Affected quantity limit | The affected quantity cannot be more than the batch quantity produced. |
| Handled quantity limit | The total handled quantity (relabelled, repacked, reworked, released, discarded, and on hold) cannot be more than the affected quantity. |
| Initial quantity on hold | When a defect is reported, all affected units are initially placed on hold. |
| Still sellable quantity | The system calculates still sellable units from relabelled, repacked, reworked, and released quantities. |
| Remaining quantity on hold | After handling actions are recorded, the system calculates the remaining quantity still on hold. |
| Loss rate | The loss rate is taken from the product record when the defect is reported and stored on the defect for historical accuracy. |
| Corrective action loss | When a worker completes a product-handling corrective action, the system calculates loss based on **discarded quantity only** and the product loss rate. |
| Defect estimated loss | The defect estimated loss is updated by adding the loss from each completed product-handling corrective action. |
| Loss status | The loss status shows whether the defect has **no financial loss**, **loss recorded but case still open**, or **loss confirmed at closure** (see explanation below). |
| Potential loss | For open defects, the system estimates potential loss based on quantity on hold and product loss rate for reporting purposes only. |
| Confirm root cause | The manager can confirm the root cause only after all non-cancelled corrective actions have been verified. |
| Close defect | A defect can be closed only when the root cause is confirmed and all non-cancelled corrective actions are verified. |

**Explanation of selected rules**

**Batch and expiry rules (rows 1–5).** Kak Norie did not use a formal batch number on every production run before QDTS. The system therefore creates a readable batch code when the manager enters production and retort dates. The correct expiry date is computed automatically so the manager can compare it with the printed expiry on the label. This supports the expiry printing problems reported in the Google Form. The expiry difference in days is used mainly in the Expiry Issues and Batch Expiry Audit reports, not for daily workflow by itself.

**Quantity rules (rows 6–10).** When a defect is reported, the worker or manager enters how many units are affected. This value cannot exceed the quantity produced for that batch. At first, all affected units are treated as on hold because no handling action has been recorded yet. When a worker completes a product-handling corrective action, the system records how many units were relabelled, repacked, reworked, released, or discarded. Units that can still be sold are counted as still sellable. Any affected units not yet handled remain on hold. The system blocks data entry if the total handled quantity exceeds the affected quantity.

**Loss rules (rows 11–14).** The loss rate comes from the product master data (for example, estimated cost per damaged unit). Financial loss is calculated from **discarded units only**, not from relabelled or repacked units that can still be recovered. Each completed corrective action stores its own loss value; the defect record keeps a running total called estimated loss. Potential loss is different: it is an estimate for **open** defects where units are still on hold, and it appears in the Loss report as a warning figure before the case is closed.

**Loss status — three values (row 14).** Loss status is separate from estimated loss. Estimated loss is a **number** (RM value from discarded units). Loss status is a **label** that tells the manager whether financial loss applies and whether it is final. QDTS uses three values:

| Loss status (system value) | Meaning | When it is set | Example at Kak Norie |
|----------------------------|---------|----------------|----------------------|
| **No loss** | No units were discarded for this defect | `qty_discarded = 0` — for example after relabelling only | Wrong expiry label fixed by relabelling 120 packs; no stock thrown away |
| **Pending review** | Units were discarded and loss is recorded, but the defect is **not closed yet** | Worker completes a corrective action with discarded quantity while the case is still open | 20 leaking pouches discarded; manager still needs to verify the action and close the case |
| **Loss confirmed** | Discarded units exist and the defect is **closed** | Manager closes the defect after verification when `qty_discarded > 0` | Closed case with 4 loose-seal units discarded; estimated loss is treated as confirmed in Loss reports |

The status changes automatically when handling quantities are updated and when the manager closes the defect. On a new defect report, the status starts as **No loss** because no corrective action has been completed yet. After a worker records discarded units in a completed corrective action, the status becomes **Pending review** if the defect remains open. When the manager closes the defect and discarded units exist, the status becomes **Loss confirmed** and the system may record a loss confirmed date. If the defect is closed with zero discarded units, the status remains **No loss** even after closure.

This design supports Kak Norie’s need to record loss from damaged units (*“bilangan unit rosak”*) while keeping open cases clearly marked as not yet final. The Loss report uses **Loss confirmed** (and closed defects) for confirmed totals, and **Potential loss** (row 15) for units still on hold in open cases.

**Workflow rules (rows 15–16).** Root cause confirmation and defect closure are separate steps. The manager must verify corrective actions first so that handling quantities and loss values are final. Only then can the manager confirm the root cause and close the defect. This order prevents a case from being closed before corrective work is properly checked.

**Table 3.8** therefore shows that QDTS uses automatic calculations for batch traceability, expiry checking, quantity control, and loss reporting, while workflow rules ensure that closure happens only after verification and root cause confirmation.

#### Recommended references

- **Figure 3.3** — Context diagram / Context DFD Level 0 (`PSM/diagrams/dfd-as-is-level0-context.mmd`)  
- **Figure 3.4** — ERD core entities (`PSM/diagrams/erd-qdts-core.svg`)  
- **Data dictionary** — Field definitions (Appendix or Chapter 4 database section)

**Table 3.2: Data requirement summary**

| ID | Category | I/O | Description | Entity |
|----|----------|-----|-------------|--------|
| DR-01 | User | In, stored | Authentication identity | `users` |
| DR-02 | Product | In, stored | SKU, shelf life, loss rate | `products` |
| DR-03 | Batch | In, stored | Production record with auto batch no. | `batches` |
| DR-04 | Defect | In, stored | Quality case linked to batch | `defects` |
| DR-05 | Stage/type rules | Stored | Valid types per detected stage | `defect_type_mappings` |
| DR-06 | Corrective action | In, stored | Task and completion data | `corrective_actions` |
| DR-07 | Root cause | In, stored | Suspected/confirmed investigation | `root_cause_investigation` |
| DR-08 | Evidence | In, stored | Photo file metadata | `evidence` |
| DR-09 | Activity log | Out, stored | Audit entries | `activity_logs` |
| DR-10 | Dashboard KPI | Out | Aggregated metrics | Report queries |
| DR-11 | Report rows | Out | Analytical datasets | Report queries |
| DR-12 | Notification | Out | In-app alert items | Frontend aggregation |
| DR-13 | CSV export | Out | Downloadable tables | Frontend export |
| DR-14 | Print summary | Out | Browser print layout | Frontend print utils |

---

### 3.3.2 Functional Requirement

#### Detected stages (nine — implemented)

1. Ingredient Preparation  
2. Cooking  
3. Packing / Filling  
4. Sealing  
5. Retort Process  
6. Labelling / Expiry Printing  
7. Stock Storage  
8. Before Delivery  
9. After Customer Receives Product  

Cooling is **not** a detected stage.

#### Workflow statuses (system display labels)

**Defect workflow**

New → Under Review → Actions Assigned → In Progress → Ready for Verification → Closed

**Corrective action workflow**

Assigned → In Progress → Submitted — Pending Review → Verified / Rejected / Cancelled

**Root cause workflow**

Pending Investigation → Suspected → Confirmed

*Note:* The database stores snake_case values (for example `ready_verification`, `completed`). The labels above are the **user-facing statuses** shown in QDTS. Workers may see **Work Assigned** instead of **Actions Assigned** on their own defect view.

#### Primary API paths for root cause (implemented)

| Action | Actor | API |
|--------|-------|-----|
| Submit suspected root cause | Worker | `PATCH /root-causes/defects/:defectId/suspect` |
| Confirm root cause | Manager | `PATCH /defects/:id/root-cause` |

**Table 3.3: Functional requirements (implemented)**

| ID | Module | Function | Actor | Input | Output |
|----|--------|----------|-------|-------|--------|
| FR-01 | Authentication | Login | Manager, Worker | username, password | JWT session |
| FR-02 | Authentication | View current user | Manager, Worker | token | `/auth/me` profile |
| FR-03 | User Management | List active users | Manager | optional role filter | User list |
| FR-04 | User Management | Add new user | Manager | username, email, name, role, password | New active user |
| FR-05 | Product Management | List/view products | Manager, Worker | — | Product records |
| FR-06 | Product Management | Create product | Manager | product fields | New product |
| FR-07 | Product Management | Update product | Manager | product fields | Updated product |
| FR-08 | Product Management | Archive product | Manager | product id | `product_status = archived` |
| FR-09 | Batch Management | List/view batches | Manager, Worker | — | Batch records |
| FR-10 | Batch Management | Create batch | Manager | dates, printed expiry, qty | Auto batch no. + correct expiry |
| FR-11 | Batch Management | Update batch | Manager | batch fields | Updated batch |
| FR-12 | Batch Management | View linked defects/CAs | Manager, Worker | batch id | Related records |
| FR-13 | Defect Management | Report defect (worker) | Worker | 2-step form + evidence | Status **New** |
| FR-14 | Defect Management | Create/report defect (manager) | Manager | 3-step form + evidence | Status **New** |
| FR-15 | Defect Management | List defects (scoped) | Manager (all), Worker (own/assigned) | filters | Defect list |
| FR-16 | Defect Management | View defect details | Manager, Worker | defect id | Detail + expiry alert |
| FR-17 | Defect Management | Start review | Manager | defect id | **Under Review** |
| FR-18 | Defect Management | Update defect | Manager | fields, review due date | Updated defect |
| FR-19 | Defect Management | Upload defect evidence | Manager, Worker (with access) | file | Evidence row |
| FR-20 | Defect Management | View defect activity | Manager, Worker (with access) | defect id | Timeline |
| FR-21 | Corrective Action | Assign action | Manager | type, task, assignee, due date | **Assigned**; defect **Actions Assigned** |
| FR-22 | Corrective Action | List actions (scoped) | Manager (all), Worker (assigned) | filters | CA list |
| FR-23 | Corrective Action | Start action | Worker (assignee) | action id | **In Progress** |
| FR-24 | Corrective Action | Complete action | Worker (assignee) | quantities, notes, evidence | **Submitted — Pending Review**; defect **Ready for Verification** |
| FR-25 | Corrective Action | Verify action | Manager | action id | **Verified** |
| FR-26 | Corrective Action | Reject action | Manager | reason | **Rejected** |
| FR-27 | Corrective Action | Cancel rejected action | Manager | action id | **Cancelled** |
| FR-28 | Corrective Action | Edit due date | Manager | new date | Updated due date |
| FR-29 | Corrective Action | Upload CA evidence | Worker (assignee) | file | Evidence row |
| FR-30 | Root Cause | View investigation | Manager, Worker (with access) | defect id | Investigation record |
| FR-31 | Root Cause | Submit suspected cause | Worker **with assigned CA access** | source, cause, tool | **Suspected** |
| FR-32 | Root Cause | Confirm root cause | Manager | confirmed fields | **Confirmed** |
| FR-33 | Defect Management | Close defect | Manager | defect id | **Closed** (rules enforced) |
| FR-34 | Dashboard | Manager dashboard | Manager | period filter | KPIs, charts, latest defects |
| FR-35 | Dashboard | Worker dashboard | Worker | — | My actions, my defects, alerts |
| FR-36 | Reports | View and export reports | Manager | period filter | Tables, CSV, browser print |
| FR-37 | Activity Log | View activity log | Manager | search/filter | Log entries |
| FR-38 | Notifications | View in-app notifications | Manager, Worker | — | Bell panel |
| FR-39 | Workflow rules | Load stages/types/options | Manager, Worker | stage or type | Form dropdown data |

**User management scope:** FR-03 and FR-04 are the **only** implemented user-admin functions. There is no edit-user, deactivate-user, or delete-user screen in the prototype.

**Product scope:** FR-08 archives a product; there is **no delete product** function.

**Reports scope (FR-36):** Ten tabs — Overview (includes recent corrective actions via `/reports/corrective-actions`), Loss, Root Cause, By Detection Stage, Root Cause Area, Process / Tool, Expiry Issues (defect cases + batch expiry audit), Discarded Products, By Product, By Batch.

#### Recommended diagrams

- **Figure 3.5** — Use Case Diagram (`PSM/diagrams/use-case-qdts.svg`)  
- **Appendix** — Use case descriptions for Report Defect, Assign CA, Complete CA, Verify CA, Confirm Root Cause, Close Defect

---

### 3.3.3 Non-Functional Requirement

**Table 3.4: Non-functional requirements**

| ID | Category | Requirement | Description | Justification |
|----|----------|-------------|-------------|---------------|
| NFR-01 | Security | Authentication | JWT on protected API routes | `requireAuth` |
| NFR-02 | Security | Password protection | bcrypt password hash | `users.password_hash` |
| NFR-03 | Security | Role-based access | Manager vs worker operations | `requireManager`, `requireWorker`, access checks |
| NFR-04 | Security | Route guard | Workers blocked from manager pages | `RequireRole`, `MANAGER_ONLY_PREFIXES` |
| NFR-05 | Performance | Local response | Acceptable load on demo seed (~55 defects) | Smoke/API tests on localhost |
| NFR-06 | Availability | Prototype hosting | Frontend `:5173`, API `:3000`, local PostgreSQL | PSM demo |
| NFR-07 | Usability | Role-based UI | Separate manager dashboard and worker queue | `Dashboard.jsx` |
| NFR-08 | Usability | Status labels | Defect, CA, and root cause labels as listed in §3.3.2 | `StatusBadge`, `caStatusLabel` |
| NFR-09 | Usability | Feedback states | Loading and empty states | Shared UI components |
| NFR-10 | Reliability | Transactions | Assign, complete, close use DB transactions | Controller `BEGIN/COMMIT` |
| NFR-11 | Reliability | Data integrity | FK chain product → batch → defect → CA | PostgreSQL constraints |
| NFR-12 | Maintainability | Layered code | Routes, controllers, services | Express structure |
| NFR-13 | Maintainability | Shared utilities | Expiry, loss, due date, export helpers | `utils/` modules |
| NFR-14 | Auditability | Activity log | **Workflow events only** (report, review, assign, start/complete/verify/reject/cancel CA, root cause suspect/confirm, close). Does **not** log product edits, batch edits, or evidence uploads | `activity_logs` |
| NFR-15 | Auditability | Retention | No hard delete of defects/batches; product archive only | Schema design |
| NFR-16 | Compatibility | Browser | Modern browser for React SPA | Chrome/Edge demo |
| NFR-17 | Export | CSV and print | CSV download; print via browser (not native PDF engine) | Export components |

---

### 3.3.4 Other Requirements

#### Software stack (implemented)

| Component | Purpose |
|-----------|---------|
| React + Vite + Tailwind CSS | Web interface |
| Node.js + Express | REST API |
| PostgreSQL | Data storage |
| JWT + bcrypt | Authentication |
| Multer | Evidence upload |

#### Hardware and tools

Refer to Chapter 2 Section 2.4 for hardware minimums (Windows 10/11, Core i5, 8 GB RAM, 256 GB storage) and development tools (VS Code/Cursor, pgAdmin/DBeaver, Git, Postman/Thunder Client, Draw.io, Chrome, Word).

The prototype is demonstrated on **localhost**; external production hosting is out of scope.

---

## 3.4 Conclusion

Problem analysis shows that Kak Norie’s manual notebook process cannot support structured defect recording, corrective action monitoring, formal batch traceability, consolidated loss reporting, or auditability. QDTS addresses these gaps through a web-based prototype with nine detected stages, role-based workflows, thirteen database entities, manager reports, in-app notifications, CSV export, and browser print/save-as-PDF summaries.

Requirement analysis documents only implemented functions, including **view/add users** (not full user administration), **product archive** (not delete), **manager and worker defect reporting**, and **auto-generated batch numbers** as a new digital capability. Chapter 4 will present the detailed system design based on these requirements.

---

## FINAL LIST — DIAGRAMS FOR CHAPTER 3

| Figure | Title | Section | Source / action |
|--------|-------|---------|-----------------|
| 3.1 | Current Activity Diagram (As-Is Manual Process) | 3.2.2 | `PSM/diagrams/flowchart-as-is-current-process.svg` |
| 3.2 | Current Sequence Diagram (Manual Defect Handling) | 3.2.2 | Draw from §3.2.2 narrative |
| 3.3 | Context Diagram / Context DFD Level 0 | 3.3.1 | `PSM/diagrams/dfd-as-is-level0-context.mmd` |
| 3.4 | Entity Relationship Diagram (Core Entities) | 3.3.1 | `PSM/diagrams/erd-qdts-core.svg` |
| 3.5 | Use Case Diagram (Manager and Worker) | 3.3.2 | `PSM/diagrams/use-case-qdts.svg` |

---

## FINAL LIST — TABLES FOR CHAPTER 3

| Table | Title | Section |
|-------|-------|---------|
| 3.1 | Problem analysis — cause, impact, QDTS solution | 3.2.3 |
| 3.2 | Data requirement summary | 3.3.1 |
| 3.3 | Functional requirements (FR-01 to FR-39) | 3.3.2 |
| 3.4 | Non-functional requirements (NFR-01 to NFR-17) | 3.3.3 |
| 3.5 | Current activity flow steps (Figure 3.1 narrative) | 3.2.2 |
| 3.6 | Input data summary | 3.3.1 |
| 3.7 | Stored entities (thirteen tables) | 3.3.1 |
| 3.8 | Key business rules and calculations | 3.3.1 |
| 3.9 | Software stack | 3.3.4 |
| 3.10 | Defect / CA / root cause workflow labels | 3.3.2 |
| 3.11 | Root cause API paths | 3.3.2 |
| 3.12 | Manager report tabs and API endpoints (optional appendix) | 3.3.2 |
| 3.13 | Role access summary (optional appendix) | 3.3.2 |

**Optional appendix tables (recommended before submission):**

- Use case descriptions (UC-01 to UC-06)  
- Requirement traceability matrix (Chapter 1 objectives O1–O7 → FR IDs)  
- Data dictionary for core tables
