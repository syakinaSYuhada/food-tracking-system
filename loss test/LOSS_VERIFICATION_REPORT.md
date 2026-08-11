# Loss Logic Verification Report

**Date:** 2026-06-18  
**Environment:** `http://localhost:3000/api` (backend running) · `http://localhost:5173` (frontend running)  
**Test defect created:** `D012` · `qty_affected = 100` · `loss_rate_per_unit = RM 4.99`  
**Method:** Live API workflow (no application source files modified for this verification)

---

## Summary

| Case | Result | Notes |
|------|--------|-------|
| 1. Create defect | **PASS** | All four fields match expected values |
| 2. Complete CA with discard | **BLOCKED** | CA complete returns HTTP 500 |
| 3. Reject completed CA | **NOT RUN** | Depends on case 2; reject correctly refused because CA never reached `completed` |
| 4. Re-complete rejected CA | **BLOCKED** | Same HTTP 500 on complete |
| 5. Loss Report | **PASS (API + code)** | KPIs and row fields correct; UI uses one table |

**Overall:** 2 / 5 cases verified green on live environment. Cases 2–4 are blocked by a **database schema mismatch**, not by missing application code.

---

## Blocker found during verification

```
PATCH /corrective-actions/:id/complete
→ HTTP 500
→ "column d.qty_released does not exist"
```

The application code (`correctiveActionController.js`) selects and updates `d.qty_released` on the **defects** table, but the live PostgreSQL `defects` table has **no `qty_released` column** (see `backend/database/schema.sql` lines 172–178).

**Impact:** Product-handling CA complete cannot run. Reject/rollback and re-complete logic cannot be exercised until the DB is migrated.

**Fix required (future step, not applied in this verification):** Add `qty_released INT NOT NULL DEFAULT 0` to `defects`, then re-run this script.

---

## Case 1 — Create defect

**Expected**

| Field | Value |
|-------|-------|
| qty_on_hold | = qty_affected (100) |
| qty_discarded | 0 |
| estimated_loss | 0 |
| loss_status | no_loss |

**Actual (D012)**

| Field | Value |
|-------|-------|
| qty_on_hold | 100 |
| qty_discarded | 0 |
| estimated_loss | 0 |
| loss_status | no_loss |

**Verdict: PASS**

Implementation: `backend/src/controllers/defectController.js` — INSERT sets `loss_status = 'no_loss'`, `qty_on_hold = qty_affected`.

---

## Case 2 — Complete CA with discard

**Test payload:** relabel 80 · discard 20 · loss rate RM 4.99 → expected loss RM 99.80 · expected qty_on_hold 0 · expected loss_status pending_review

**API response**

| Field | Value |
|-------|-------|
| complete_status | 500 |
| complete_message | column d.qty_released does not exist |

**Defect after failed complete**

| Field | Value |
|-------|-------|
| qty_discarded | 0 (unchanged) |
| estimated_loss | 0 |
| qty_on_hold | 100 |
| loss_status | no_loss |

**Verdict: BLOCKED — cannot verify logic until DB schema fixed**

**Code intent (would apply if DB allowed):** `completeCorrectiveAction` increments discard/loss, then `syncDefectHandlingTotals()` sets `qty_on_hold = qty_affected − handled` and `loss_status = pending_review` when discard > 0.

---

## Case 3 — Reject completed CA

**Expected after case 2:** discard and estimated_loss roll back; qty_on_hold returns to 100; loss_status returns to no_loss

**Actual:** Case 2 never completed, so reject returned:

```
HTTP 400 — Only completed actions can be rejected
```

**Verdict: NOT RUN (dependency blocked)**

**Code intent:** `rejectCorrectiveAction` → `rollbackProductHandlingFromDefect()` subtracts CA quantities and loss, then recalculates qty_on_hold.

---

## Case 4 — Re-complete rejected CA

**Expected:** discard 15 · loss RM 74.85 · total handled 100 · no double-count (not 35)

**Actual:** Complete again returned HTTP 500 (`qty_released` column missing).

**Verdict: BLOCKED**

---

## Case 5 — Loss Report

### API (PASS)

Financial KPIs (`GET /reports/loss?period=all_time`):

| KPI | Value (RM) |
|-----|------------|
| loss_at_risk | 5,181.42 |
| pending_loss | 620.00 |
| confirmed_loss | 390.00 |

Test defect row (`D012`, open, 100 on hold):

| Column | Value |
|--------|-------|
| qty_on_hold | 100 |
| qty_discarded | 0 |
| loss_at_risk | 499.00 (= 100 × 4.99) |
| estimated_loss | 0.00 |
| loss_status | no_loss |

**Interpretation:** Open held inventory shows **Loss at Risk** even with zero discard — matches Phase 1 design. Pending/confirmed KPIs aggregate other seeded defects correctly.

### UI structure (PASS — code inspection)

`frontend/src/pages/Reports.jsx` Loss tab uses **one** table:

```jsx
<ReportTable rows={lossRows} columns={[...]} />
```

Not `lossRows.map(...)` per row. Columns: Defect Code, Product, Batch, Qty On Hold, Qty Discarded, Loss at Risk, Estimated Loss, Loss Status.

**Verdict: PASS**

---

## What was implemented (prior fix batch)

| Priority | Change | Files |
|----------|--------|-------|
| 1 | Create defect → `loss_status = no_loss` | `defectController.js` |
| 2 | Loss Report — single table + row columns | `reportController.js`, `Reports.jsx` |
| 3 | CA reject rollback + re-complete without double-count + qty_on_hold formula | `lossService.js`, `correctiveActionController.js` |
| — | Financial KPIs (Loss at Risk / Pending / Confirmed) | `reportController.js`, Dashboard, Reports |

---

## Artifacts in this folder

| File | Description |
|------|-------------|
| `LOSS_VERIFICATION_REPORT.md` | This report |
| `api-results.json` | Full JSON output from live API test run |
| `run-verification.mjs` | Repeatable verification script |
| `capture-screenshots.mjs` | Playwright screenshot helper (requires `npx playwright install`) |
| `screenshots/` | UI captures (run screenshot script after Playwright browsers installed) |

### To capture screenshots manually

1. Log in as manager (`nazhif` / `demo_password_only`)
2. Open **Reports → Loss** tab
3. Confirm one table with KPI strip above
4. Save screenshots into `loss test/screenshots/`

Or from `frontend/`:

```bash
npx playwright install
node "../loss test/capture-screenshots.mjs"
```

---

## Recommended next step

1. Migrate live DB: add `qty_released` to `defects` table (align with application code)
2. Re-run: `node "loss test/run-verification.mjs"`
3. Expect cases 2–4 to pass if schema matches code

---

## Backend regression tests (already green before this verification)

```
npm test  →  7 smoke + 21 integration passed
```

Integration test confirms case 1 (`loss_status = no_loss` on create). CA workflow tests are not yet in the integration suite.
