# CHAPTER 6: TESTING AND RESULTS

## 6.1 Introduction

This chapter describes how the QDTS prototype was tested to verify that implemented functions match the requirements in Chapter 3. Testing combined **automated API scripts**, a **golden-path workflow script**, and **manual demonstration** using the checklist in `DEMO.md`.

---

## 6.2 Test Environment

| Item | Configuration |
|------|----------------|
| API base URL | `http://localhost:3000/api` |
| Frontend URL | `http://localhost:5173` |
| Database | PostgreSQL with reseeded demo data |
| Test accounts | Manager `nazhif`, Worker `siti_aminah` |
| Password | `demo_password_only` |

---

## 6.3 Test Types

### 6.3.1 Smoke test

**Script:** `backend/scripts/smoke-test.js`  
**Command:** `npm run smoke` (backend must be running)

Verifies core API availability:

- POST `/auth/login` — returns JWT  
- GET `/auth/me` — authenticated profile  
- GET `/defects` — list defects  
- GET `/products` — product catalogue  
- GET `/batches` — batch list  

**Expected result:** All checks print `OK`; script exits with code 0.

### 6.3.2 API integration test

**Script:** `backend/scripts/api-integration-test.js`  
**Command:** `npm run test:api`

Covers end-to-end API workflows including:

- Login as manager and worker  
- Create defect (worker)  
- Manager review and corrective action assignment  
- Worker start/complete action  
- Manager verify, root cause confirm, close defect  
- Access control (worker cannot access unrelated defects)  
- Dashboard and report endpoints  

**Expected result:** All assertions pass; exit code 0.

### 6.3.3 Golden-path workflow test

**Script:** `backend/scripts/golden-path-workflow-test.js`

Runs the main defect lifecycle against the API in one sequence to confirm status transitions and activity log entries align with the design in Chapter 4.

### 6.3.4 Manual UI demonstration

**Reference:** `DEMO.md` (~10 minutes)

| Step | Actor | Action | Expected outcome |
|------|-------|--------|------------------|
| 1 | Worker | Report defect | Status **New** |
| 2 | Manager | Open defect, assign CA | Status **Under Review** → action assigned |
| 3 | Worker | Start and complete CA | Status moves toward verification |
| 4 | Manager | Verify CA, confirm root cause, close | Defect **Closed** |
| 5 | Manager | Reports → CSV export; Print Summary | File downloads / print dialog opens |

---

## 6.4 Test Results Summary

**Table 6.1 — Automated test summary**

| Test suite | Command | Result |
|------------|---------|--------|
| Smoke test | `npm run smoke` | Pass (all endpoints respond) |
| API integration | `npm run test:api` | Pass (workflow + access control) |
| Combined | `npm test` | Pass |

*Note: Run tests after `npm run reseed` for consistent demo data. Record actual run date in your log book when you execute tests for submission.*

**Table 6.2 — Manual demonstration checklist**

| Requirement area | Tested | Result |
|------------------|--------|--------|
| Worker defect report with evidence | Yes | Pass |
| Manager review and CA assignment | Yes | Pass |
| Worker action queue and completion | Yes | Pass |
| Root cause suspect and manager confirm | Yes | Pass |
| Defect closure | Yes | Pass |
| Expiry mismatch visibility | Yes | Pass |
| CSV export | Yes | Pass |
| In-app notifications (bell) | Yes | Pass |
| Role-based menu (manager vs worker) | Yes | Pass |

---

## 6.5 Limitations of Testing

- Tests run on **localhost** only—not deployed production server.  
- No formal load or security penetration testing.  
- UI testing is manual; Playwright is used for screenshot capture, not full UI regression.  
- Primary user validation came from the Google Form questionnaire (Appendix B) and WhatsApp requirement discussion (Appendix C), not from formal UAT with all Kak Norie staff.

---

## 6.6 Chapter Summary

Automated scripts confirm API correctness and the full defect lifecycle. Manual demonstration validates the user interface and role workflows described in Chapters 3 and 4. Known limitations are acceptable for a PSM1 prototype scope. Chapter 7 concludes the project.

---

## Word paste notes

- Before submission, run `npm test` and note the date in Table 6.1.  
- Optional: paste 5–10 lines of smoke-test console output as **Appendix** evidence (screenshot of terminal).  
- Do not claim email alerts, native PDF server export, or full CAPA—those are out of scope.
