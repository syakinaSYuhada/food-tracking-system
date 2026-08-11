# 4.2.2 User Interface Design — QDTS v2

Use this section in **Chapter 4 (Design)**. Insert **screenshots** from `PSM/screenshots/` and **diagrams** from `PSM/diagrams/`.

> **Important:** Your system uses **username + password**, not email login. Tables below match the real implementation.

---

## 4.2.2 User Interface Design

The QDTS user interface is a responsive web application built with React and Tailwind CSS. The design supports two roles — **Manager** and **Worker** — with role-specific navigation, guided forms for data entry, and dashboard/report screens for output.

---

## (a) Navigation Design

Navigation is controlled through a **left sidebar** on desktop, a **collapsible sidebar** on tablet, and a **hamburger menu** on mobile. Managers access the full module set; workers see a simplified menu focused on reporting and assigned actions. Deep navigation uses KPI cards, table row buttons, notification bell links, and tab controls on Reports and Defect Details pages.

### Figure 4.2: Navigation Flow of QDTS

**File:** `PSM/diagrams/navigation-flow-qdts.svg`

**Manager flow:**

```
Login → Dashboard → Products | Batches | Defects | Corrective Actions | Reports | Activity Log | Users
                              Defects → Defect Details → Corrective Actions
```

**Worker flow:**

```
Login → Dashboard → My Defects → Defect Details
                 → My Actions → Action Details
```

### Figure 4.3: Main Sidebar Navigation for Manager

**Screenshot:** `PSM/screenshots/fig-4-3-manager-sidebar.png`

Shows: Dashboard, Products, Batches, Defect Records, Corrective Actions, Reports, Users, Activity Log.

### Figure 4.4: Worker Navigation Menu

**Screenshot:** `PSM/screenshots/fig-4-4-worker-sidebar.png`

Shows: Dashboard, My Defects, My Actions.

### Navigation controls

| Control type | Location | Function |
|--------------|----------|----------|
| Sidebar link | Left panel | Primary module navigation |
| Hamburger menu | Top header (mobile) | Open/close sidebar |
| Notification bell | Top header | Jump to overdue/expiry/new-report items |
| KPI card | Dashboard | Quick filter / drill-down |
| Tab pills | Reports, Defect Details | Switch sub-views |
| Row action button | Tables | Open details, edit, trace batch |

---

## (b) Input Design

Input screens use text fields, number fields, date pickers, dropdowns, text areas, and file upload controls. Client-side validation is applied before submit; server-side validation enforces business rules (quantity limits, required fields, role permissions).

### Recommended figures (screenshots)

| Figure | Title | Screenshot file |
|--------|-------|-----------------|
| 4.5 | Login Form Interface | `fig-4-5-login.png` |
| 4.6 | Add Product Form Interface | `fig-4-6-add-product.png` |
| 4.7 | Add Batch Form Interface | `fig-4-7-add-batch.png` |
| 4.8 | Report Defect Form Interface | `fig-4-8-report-defect-worker.png` (worker) or `fig-4-8-report-defect.png` (manager Add Defect) |
| 4.9 | Assign Corrective Action Form Interface | `fig-4-9-assign-action.png` |

**Most important for viva:** Figure 4.8 (Report Defect) — proves core data capture.

### Table 4.1: Input Fields and Validation Rules

| Screen/Form | Input Field | Input Type | Validation Rule |
|-------------|-------------|------------|-----------------|
| Login | Username | Dropdown | Required; must be an active system user |
| Login | Password | Password | Required; must match stored bcrypt hash |
| Add Product | Product Name | Text | Required |
| Add Product | Category | Dropdown | Required; selected from predefined list |
| Add Product | Packaging | Dropdown | Required |
| Add Product | Size/Weight | Dropdown | Required |
| Add Product | Shelf Life (months) | Number | Required; must be greater than 0 |
| Add Product | Loss Rate per Unit | Number | Required; must be ≥ 0 |
| Add Product | Storage Condition | Dropdown | Required |
| Add Product | Description | Text area | Optional |
| Add Batch | Product | Dropdown | Required |
| Add Batch | Production Date | Date | Required |
| Add Batch | Retort Date | Date | Required; must be ≥ production date |
| Add Batch | Printed Expiry Date | Date | Required; system warns if ≠ expected expiry |
| Add Batch | Quantity Produced | Number | Required; must be greater than 0 |
| Add Batch | Notes | Text area | Optional |
| Report Defect (Step 1) | Product | Dropdown | Required |
| Report Defect (Step 1) | Batch | Dropdown | Required; must belong to selected product |
| Report Defect (Step 1) | Where Found (Stage) | Dropdown | Required |
| Report Defect (Step 1) | Problem Type | Dropdown | Required; filtered by stage |
| Report Defect (Step 1) | Qty Affected | Number | Required; must be > 0 and ≤ batch quantity |
| Report Defect (Step 2) | Description | Text area | Required |
| Report Defect (Step 2) | Photo Evidence | File upload | Optional |
| Report Defect (Step 2) | Possible Cause | Text area | Optional |
| Assign Corrective Action | Action Type | Dropdown | Required |
| Assign Corrective Action | Task | Text area | Required |
| Assign Corrective Action | Assign To Worker | Dropdown | Required |
| Assign Corrective Action | Due Date | Date | Optional on assign; editable later by manager |
| Assign Corrective Action | Priority | Dropdown | Required (low/medium/high/critical) |
| Complete Corrective Action | Handling quantities | Number | Sum must not exceed qty affected |
| Complete Corrective Action | Evidence photo | File upload | Optional unless evidence required |

---

## (c) Output Design

QDTS outputs include on-screen summaries, detail lists, audit logs, charts, and exportable turnaround documents (CSV/print PDF).

### Recommended figures (screenshots)

| Figure | Title | Screenshot file |
|--------|-------|-----------------|
| 4.10 | Dashboard Output Interface | `fig-4-10-dashboard-manager.png` |
| 4.11 | Defect List Output Interface | `fig-4-11-defect-list.png` |
| 4.12 | Defect Details Output Interface | `fig-4-12-defect-details.png` |
| 4.13 | Reports Output Interface | `fig-4-13-reports.png` |
| 4.14 | Activity Log Output Interface | `fig-4-14-activity-log.png` |

### Table 4.2: Output Design Classification

| Output | Description | Output Type | Frequency |
|--------|-------------|-------------|-----------|
| Dashboard (Manager) | KPI cards, defect trend chart, latest defects, expiry alerts | Summary output / graph | Daily / ad-hoc |
| Dashboard (Worker) | My reports, my action queue, overdue alerts | Summary output | Daily / ad-hoc |
| Defect List | All recorded defects with status, product, batch, qty | Detail output | Ad-hoc |
| Defect Details | Full defect record, root cause, linked actions, timeline | Detail output | Ad-hoc |
| Corrective Action List | Assigned actions with due date, priority, status | Detail output | Daily / ad-hoc |
| Batch Details | Batch traceability, expiry comparison, linked defects | Detail output | Ad-hoc |
| Loss Report | Estimated and confirmed loss by product/period | Summary report | Monthly / ad-hoc |
| Root Cause Report | Root cause frequency and status | Summary report | Monthly / ad-hoc |
| Expiry Issue Report | Wrong printed expiry cases | Summary report | Monthly / ad-hoc |
| Batch Expiry Audit | All batches with expiry mismatch | Summary report | Ad-hoc / audit |
| By Product / By Batch Report | Defect and loss breakdown | Summary report | Monthly / ad-hoc |
| Activity Log | User actions for audit review | Audit output | Ad-hoc |
| Print Summary (Defect/CA) | Printable case summary | Turnaround document | Ad-hoc |
| Export Report (CSV/PDF) | Downloadable management report | Turnaround document | Monthly / ad-hoc |

---

## Minimum figures for submission

| Section | Figure | Required? |
|---------|--------|-----------|
| Navigation | 4.2 Navigation Flow Diagram | Yes |
| Navigation | 4.3 Manager Sidebar | Recommended |
| Input | 4.8 Report Defect Form | **Yes (most important)** |
| Output | 4.10 Dashboard | Yes |
| Output | 4.13 Reports Page | Yes |

## Best complete set (recommended)

1. Figure 4.2 — Navigation flow diagram (SVG provided)
2. Figure 4.3 — Manager sidebar screenshot
3. Figure 4.4 — Worker sidebar screenshot
4. Figure 4.5 — Login form
5. Figure 4.6 — Add product form
6. Figure 4.7 — Add batch form
7. Figure 4.8 — Report defect form
8. Figure 4.9 — Assign corrective action form
9. Figure 4.10 — Manager dashboard
10. Figure 4.12 — Defect details
11. Figure 4.13 — Reports page
12. Table 4.1 and Table 4.2

---

## How to capture screenshots

```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev

# Terminal 3 (optional automated capture)
cd frontend
npm run screenshots
```

Open http://localhost:5173

| Screenshot | Steps |
|------------|-------|
| fig-4-5-login | Open app before login |
| fig-4-3-manager-sidebar | Login as `nazhif` → capture sidebar |
| fig-4-4-worker-sidebar | Login as `siti_aminah` → capture sidebar |
| fig-4-6-add-product | Products → Add Product |
| fig-4-7-add-batch | Batches → Add Batch |
| fig-4-8-report-defect | Defects → Report Defect (Step 1 filled) |
| fig-4-9-assign-action | Open defect as manager → Assign Action modal |
| fig-4-10-dashboard-manager | Dashboard as `nazhif` |
| fig-4-11-defect-list | Defect Records page |
| fig-4-12-defect-details | Open any defect (e.g. D001) |
| fig-4-13-reports | Reports page with period filter |
| fig-4-14-activity-log | Activity Log as manager |

Demo password: `demo_password_only`

---

## Report paragraph (copy-paste)

> Section 4.2.2 presents the user interface design of QDTS v2. Figure 4.2 shows the navigation flow from login to dashboard and module access. Managers navigate through products, batches, defects, corrective actions, reports, users, and activity log, while workers use a simplified menu for my defects and my actions. Input design is supported by guided forms for login, product registration, batch registration, defect reporting, and corrective action assignment. Table 4.1 summarises the input fields and validation rules applied in the system. Output design includes dashboard summaries, detail screens, analytical reports, activity logs, and exportable CSV/PDF documents, as classified in Table 4.2. Screenshots Figures 4.3–4.14 illustrate the implemented interface and confirm that the prototype supports the functional requirements defined in Chapter 3.
