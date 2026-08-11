# CHAPTER 5: IMPLEMENTATION

## 5.1 Introduction

This chapter describes how the **Quality Defect Tracking System (QDTS)** prototype was implemented after the design in Chapter 4. The implementation follows the three-tier architecture: React 19 (presentation), Express 5 REST API (application), and PostgreSQL with local file storage (data). All descriptions match the running codebase in `frontend/` and `backend/`.

The prototype targets Kak Norie / Retort Niaga operations with two roles only: **Manager** and **Worker**. It supports defect reporting, manager review, corrective action assignment and completion, root cause confirmation, defect closure, batch expiry traceability, in-app notifications, CSV export, and browser print for summaries.

---

## 5.2 Development Environment

| Item | Value |
|------|-------|
| Frontend dev server | `http://localhost:5173` (Vite) |
| API server | `http://localhost:3000` (`/api/*`) |
| Database | PostgreSQL (local instance) |
| Demo credentials | Manager `nazhif`, Worker `siti_aminah` — password `demo_password_only` |
| Seed data | `npm run reseed` in `backend/` |

Software and hardware platforms are listed in Chapter 2 (Tables 2.7 and 2.8). The project uses Node.js, npm, Git, and Visual Studio Code as the main development tools.

---

## 5.3 Project Structure

### 5.3.1 Backend (`backend/`)

| Folder / file | Purpose |
|---------------|---------|
| `src/server.js` | Express app entry, CORS, static `/uploads` |
| `src/routes/` | REST route modules (auth, defects, batches, products, users, reports, etc.) |
| `src/controllers/` | HTTP handlers, validation, transactions |
| `src/services/` | Business rules (defect status, batch expiry, loss calculation, root cause) |
| `src/middleware/auth.js` | JWT sign/verify (8-hour session) |
| `src/utils/accessControl.js` | Role guards and worker data scoping |
| `database/schema.sql` | 13-table PostgreSQL schema |
| `uploads/evidence/` | Multer-stored defect and CA evidence images |
| `scripts/` | Reseed, smoke test, API integration test |

### 5.3.2 Frontend (`frontend/`)

| Folder / file | Purpose |
|---------------|---------|
| `src/pages/` | Route pages (Dashboard, Defects, Batches, Reports, Users, etc.) |
| `src/components/` | Reusable UI (forms, tables, modals, notification bell) |
| `src/context/AuthContext.jsx` | Login state and JWT storage |
| `src/utils/api.js` | Axios client with Bearer token |
| `scripts/` | Playwright screenshot capture for report figures |

---

## 5.4 Database Implementation

The physical database follows `backend/database/schema.sql` with **13 tables**:

1. `users` — Manager and Worker accounts  
2. `products` — Product catalogue (archive supported, no hard delete)  
3. `batches` — Retort batches with expected and printed expiry  
4. `defect_types` — Problem type master data  
5. `defect_type_mappings` — Stage-to-type mappings  
6. `root_causes` — Root cause lookup list  
7. `defects` — Main defect records and workflow status  
8. `root_cause_investigation` — Worker suspect after CA; 1:1 with defect  
9. `corrective_actions` — Assigned handling tasks  
10. `evidence` — File metadata for defect and CA uploads  
11. `activity_logs` — Workflow events (13 action types)  
12. `defect_workflow_rules` — Configurable transition rules  
13. `defect_workflow_options` — Dropdown options for workflow fields  

Batch numbers are generated as `{product_code}-B-{YYYYMMDD}` from the retort date. CHECK constraints enforce valid statuses, quantities, and role values at the database level.

---

## 5.5 Key Module Implementation

### 5.5.1 Authentication and access control

- Login returns a JWT stored in browser `localStorage`.  
- `requireAuth` middleware protects all `/api/*` routes except login.  
- Managers have full access; workers see only defects they reported or corrective actions assigned to them.

### 5.5.2 Defect reporting (Worker)

- Multi-step form: product → batch → stage → problem type → description and optional evidence.  
- Worker may set **Manager Review Due Date** on the report form.  
- On submit, status is **New** (not auto **Under Review**).

### 5.5.3 Manager review and corrective actions

- Opening a **New** defect moves it to **Under Review** and logs `START_REVIEW`.  
- Manager assigns **Product Handling** corrective action to a worker.  
- Worker starts, completes (with findings and evidence), or manager verifies/rejects.  
- Overdue actions appear on dashboard KPIs and the notification bell.

### 5.5.4 Root cause and closure

- After corrective action verification, worker submits root cause suspect (`root_cause_investigation`).  
- Manager confirms root cause (`CONFIRM_ROOT_CAUSE`).  
- Manager closes defect (`CLOSE_DEFECT`).  
- Activity log records workflow events only—not every UI click.

### 5.5.5 Batch expiry and reports

- System compares **printed pouch expiry** vs **correct retort expiry** and flags mismatches.  
- Reports module provides defect cases, batch expiry audit, and CSV export.  
- Print Summary uses browser print / save-as-PDF (no server-side PDF generation).

### 5.5.6 Notifications

- In-app bell only—no email or SMS in the prototype.

---

## 5.6 User Interface Implementation

The UI uses React Router for navigation, Tailwind CSS for layout, and role-based sidebars (manager vs worker). Key screens implemented:

| Screen | Role | Main functions |
|--------|------|----------------|
| Login | Both | Username/password authentication |
| Dashboard | Both | KPIs, queues, expiry alerts |
| Report Defect | Worker | New defect submission |
| Defect list / detail | Both | Workflow tabs (details, CA, root cause) |
| Batches | Manager | Batch list, expiry trace |
| Reports | Manager | Tabbed reports, CSV export |
| Users | Manager | List and add users |
| Products | Manager | Add and archive products |

Screenshots of selected interfaces are shown in Chapter 4 (Figures 4.5–4.8).

---

## 5.7 Implementation Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| Expiry mismatch traceability | Linked batch, defect, and CA views with dedicated report tab |
| Role-based data visibility | `accessControl.js` filters queries by reporter and assignee |
| Evidence upload size/type | Multer limits: JPG/PNG/WEBP, max 5 MB per file |
| Workflow audit | `activity_logs` with 13 defined action types |
| Demo repeatability | `reseed-database.js` loads consistent Kak Norie sample data |

---

## 5.8 Chapter Summary

QDTS was implemented as a full-stack web prototype matching the Chapter 4 design. The backend exposes REST endpoints with JWT security; the frontend provides role-specific workflows from defect report through closure. The database enforces integrity across 13 tables. Chapter 6 describes how the system was tested.

---

## Word paste notes

- Insert after Chapter 4; renumber TOC.  
- Optional: add one screenshot of folder structure from VS Code (not required if space is tight).  
- Keep export wording: **CSV** and **browser print**—not native Excel/PDF server export.
