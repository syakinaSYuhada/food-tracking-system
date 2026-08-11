# Kak Norie QDTS — Demo Cheat Sheet (~10 min)

## Start the system

```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Open **http://localhost:5173**

Demo password for all accounts: `demo_password_only`

| Role | Username |
|------|----------|
| Manager | `nazhif` |
| Worker | `siti_aminah` or `hairul_nizam` |

On mobile or narrow screens, use the **hamburger menu** (top-left) to open navigation.

---

## Demo flow

### 1. Worker reports a defect (~2 min)

1. Log in as **siti_aminah** (Worker)
2. Dashboard → **Report Defect** (or Defects → Report Defect)
3. Step 1: pick product, batch, stage, problem type, qty
4. Step 2: describe problem, optional photo, optional possible cause
5. Submit → status is **New** (not auto-assigned)

**Say:** *"Workers only report. Manager must review before work starts."*

### 2. Manager reviews and assigns (~2 min)

1. Log out → log in as **nazhif** (Manager)
2. Defect Records → click **New Reports** KPI, dashboard banner, or **bell** notification
3. Open the new defect — status auto-changes to **Under Review**
4. Corrective Actions tab → **Assign Product Handling** (or quick assign to reporter)
5. Assign task to the worker who reported it

**Say:** *"Opening a report moves it to Under Review and logs the action in Activity Log."*

### 3. Worker completes action (~2 min)

1. Log in as **siti_aminah**
2. Dashboard **My Action Queue** or **My Actions** → open assigned action → **Start Action**
3. Fill findings, quantities, evidence → **Mark as Completed**
4. If overdue, worker dashboard and bell show **Overdue** alerts

### 4. Manager verifies and closes (~3 min)

1. Log in as **nazhif**
2. Open defect or Corrective Actions → **Verify** the completed action
3. Root Cause tab → **Confirm Root Cause**
4. **Close Defect**

### 5. Reports, expiry & export (~1 min)

1. Dashboard → **Expiry Mismatches** KPI or red banner → **View Expiry Issues Report**
2. Reports → **Expiry Issues** tab → show **Defect Cases** + **Batch Expiry Audit** (click **Trace** → batch detail page)
3. Batches → **Open Batch** on any row → full expiry traceability, linked defects & actions
4. **Export Excel** (CSV) or **Export PDF**
5. Open any defect → **Print Summary** · open any CA → **Print Summary**
6. Manager: open overdue CA → **Edit** due date if extension needed

---

## Extra talking points (30 sec each)

| Feature | Where to show | What to say |
|---------|---------------|-------------|
| **Expiry mismatch** | Defect detail, CA detail, Batch detail, Dashboard KPI, Reports, bell | Printed pouch expiry ≠ correct retort expiry — core Kak Norie pain point |
| **Batch traceability** | Batches → Open Batch, Reports → Batch Expiry Audit → Trace | Full chain: retort date → expected expiry → printed expiry → defects → actions |
| **Manager due date** | Corrective Action detail → Edit due date | Manager can extend deadlines on overdue work; logged in Activity Log |
| **Overdue actions** | Dashboard banner, Corrective Actions filter, bell | System flags past-due work so nothing is forgotten |
| **Worker dashboard** | Log in as siti_aminah | Workers see only their reports + assigned actions, with overdue count |
| **Activity trail** | Activity Log + defect Activity tab | Full audit: who reported, reviewed, assigned, completed, verified |
| **Role access** | Switch worker vs manager | Workers cannot open Products, Batches, Reports, Users |
| **DB-backed** | Any list after creating a record | All data from PostgreSQL — seed + live demo records |

---

## Bell notifications (what appears)

**Manager:** overdue actions · expiry mismatches · actions awaiting verify · new worker reports · defects ready to close

**Worker:** overdue assigned actions · open assigned work · expiry mismatch on their reports · reports awaiting manager review

---

## Good talking points

- All data comes from **PostgreSQL** (seed + live records you create in the demo)
- **Role-based access**: workers see only their reports and assigned actions
- **Activity Log** shows who did what (report, assign, verify, close)
- **Activity tab** on each defect shows timeline for that case only
- **Expiry mismatch alert** when printed expiry ≠ correct retort expiry (Kak Norie pain point)
- **Overdue tracking** on dashboard, corrective actions list, and notifications
- **Print Summary** on defects and corrective actions for audit records
- **Loss tracking** tied to corrective action quantities
- **Mobile-friendly** navigation for floor use on a phone or tablet

## Quick health check (optional)

With backend running:

```powershell
cd backend
npm run smoke          # fast 7-check smoke test
npm run test:api       # extended API integration (roles, reports, batches)
npm run test           # smoke + integration
```

Frontend utility tests (no server needed):

```powershell
cd frontend
npm run test
```

All checks should show `OK`. If login fails or data looks stale, run `npm run reseed` in `backend/`.

## If something fails

| Problem | Fix |
|---------|-----|
| Login fails / stale data | Run `npm run reseed` in `backend/` |
| API errors | Check backend on port **3000**, `.env` DB settings |
| Empty lists | Run `npm run reseed` in `backend/` |
| Pop-up blocked (print) | Allow pop-ups for localhost when using Print Summary |

## Not built (OK to mention in Q&A)

- Real Google Form import
- Email/SMS alerts (in-app bell notifications only)
- Mobile app / ERP integration
- True `.xlsx` workbook (CSV used for Excel)
- Manager edit due date on corrective actions
- Batch detail page (`/batches/:id`) with expiry traceability
