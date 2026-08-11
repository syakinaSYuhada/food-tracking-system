# PSM Milestone Preparation — QDTS (Retort Niaga / Kak Norie)

**Target:** `report fyp 1.docx` + ULearn milestones  
**Today context:** PRJ-5 (Ch4) due **29 May 2026** · PRJ-10 (PSM1 Draft) due **26 Jun 2026**

---

## 1. Milestone map (what to submit when)

| Code | Milestone | Your deliverable | Status |
|------|-----------|------------------|--------|
| PRJ-1 | Proposal | Proposal form + log | Submit in ULearn if not done |
| PRJ-2 | Project Progress 1 | Working prototype + log | System runs locally |
| PRJ-3 | Report Ch 1–3 | Word Chapters 1–3 + log | **Mostly done** — fix items in §4 |
| PRJ-4 | Project Progress 2 | Demo + log | Use `DEMO.md` |
| PRJ-5 | Report Ch 4 | Word Chapter 4 + diagrams + log | **In progress** — §3 diagrams |
| PRJ-6 | Demonstration (Supervisor) | Live demo + log | Prepare from `DEMO.md` |
| PRJ-9 | Report Evaluation (Supervisor) | Draft chapters + log | After PRJ-5 |
| PRJ-10 | Report Evaluation (Evaluator) | **PSM1 Draft Report** + log | **Need Ch 5–7** for full draft |

---

## 2. Diagram master list — export all for Word

**How to export every `.mmd` file:**
1. Open https://mermaid.live  
2. Paste file contents  
3. **Actions → SVG** (best) or PNG **width ≥ 2500 px**  
4. Insert in Word; width **24–25 cm** on **A4 landscape** pages for wide diagrams  

| Figure | Caption (Word) | Source file | Chapter |
|--------|----------------|-------------|---------|
| **3.1** | Current defect tracking activity flow | `diagrams/figure-3-1-current-defect-tracking-activity-landscape.mmd` | Ch3 §3.2.2 |
| **3.2** | Current defect handling sequence diagram | `diagrams/figure-3-2-current-manual-defect-handling-sequence.mmd` | Ch3 §3.2.2 |
| **3.3** | Proposed QDTS workflow activity | `diagrams/figure-3-4-proposed-qdts-workflow-activity.mmd` | Ch3 §3.3.3 |
| **3.4** | QDTS use case diagram | `diagrams/figure-3-3-qdts-use-case.mmd` | Ch3 §3.3.3 |
| **4.1** | Three-tier system architecture | `diagrams/figure-4-1-three-tier-system-architecture.mmd` | Ch4 §4.2.1 |
| **4.2** | High-level class diagram (static view) of QDTS | `diagrams/class-diagram-qdts-domain-static.mmd` | Ch4 §4.2.1 |
| **4.3** | Sequence diagram of defect lifecycle (dynamic view) | `diagrams/sequence-diagram-defect-lifecycle-word-compact.mmd` | Ch4 §4.2.1 |
| **4.4** | Navigation flow | `diagrams/navigation-flow-qdts.svg` (or draw.io) | Ch4 §4.2.2 |
| **4.5** | Login form interface | `screenshots/fig-4-5-login.png` | Ch4 §4.2.2 |
| **4.6** | Report defect form interface (worker) | `screenshots/fig-4-8-report-defect-worker.png` | Ch4 §4.2.2 |
| **4.7** | Manager dashboard interface | `screenshots/fig-4-7-dashboard-manager.png` | Ch4 §4.2.2 |
| **4.8** | Defect details interface | `screenshots/fig-4-8-defect-details.png` | Ch4 §4.2.2 |
| **4.9** | Core entity relationship diagram (ERD) | `diagrams/erd-qdts-core-report.svg` | Ch4 §4.2.3 |
| **4.10** | Defect lifecycle activity flow | `diagrams/figure-4-16-defect-lifecycle-activity.mmd` | Ch4 §4.2.5 |

**Intro sentence before each figure** (one line, indented) — examiner expects this.

---

## 3. Screenshots — capture before inserting in Word

PNG files are **not** in the repo (gitignored or not committed). Re-capture:

```powershell
# Terminal 1
Set-Location "c:\Users\Admin\Downloads\PSM 1\kak-norie-qdts-v2\backend"; npm run dev

# Terminal 2
Set-Location "c:\Users\Admin\Downloads\PSM 1\kak-norie-qdts-v2\frontend"; npm run dev

# Terminal 3 (after both servers are up)
Set-Location "c:\Users\Admin\Downloads\PSM 1\kak-norie-qdts-v2\frontend"; npm run screenshots
```

**Minimum for agreed figure set:** `fig-4-5-login.png`, `fig-4-8-report-defect-worker.png`, `fig-4-10-dashboard-manager.png`, `fig-4-12-defect-details.png`  
(Map to Figures **4.5–4.8** in Word — see `screenshots/README.md` for full list.)

---

## 4. Word report — fix checklist (do before PRJ-10)

### Critical (do first)

- [ ] **REFERENCES:** Add Bharosa (2009); remove 8 uncited entries (Abu Mangshor, Bhimanpallewar, Chen, Dhelia, Gowrishankar, Ibrahim, Maryadi, Xu) — see `PSM_REFERENCES_FINAL.md`
- [ ] **Ch1:** Change *“interview”* → Google Form (Appendix B) + WhatsApp (Appendix C)
- [ ] **Ch3 §3.2.1:** WhatsApp **first** (9 Jun), then Form (11 Jun)
- [ ] **Replace Figure 4.2** with new class diagram (no controllers/UI)
- [ ] **Replace Figure 4.3** with compact sequence diagram
- [ ] **Replace Figure 3.1** with landscape swimlane version

### List of Tables / Figures

- [ ] Update **List of Tables:** 2.7 software, 2.8 hardware, 2.9 schedule (remove glued page numbers)
- [ ] Update **List of Figures** to match body captions
- [ ] **Do not delete** List of Tables entries — they duplicate chapter captions (normal)

### Medium

- [ ] Table 2.4 title → *Comparison of quality recording alternatives for Kak Norie*
- [ ] Intro before Tables 2.6, 2.7, 2.8 and Figure 4.2
- [ ] Delete stray **“.”** paragraph before Chapter 4
- [ ] Update **Table of Contents** (right-click → Update entire table)

### Chapters 5–7 (paste from repo — ready for PRJ-10)

- [ ] Paste **`PSM_CHAPTER_5.md`** → Chapter 5 Implementation  
- [ ] Paste **`PSM_CHAPTER_6.md`** → Chapter 6 Testing (run `npm test` first; note date in Table 6.1)  
- [ ] Paste **`PSM_CHAPTER_7.md`** → Chapter 7 Conclusion (align Table 7.1 with your Ch1 objectives)  

---

## 5. Final REFERENCES (paste into Word)

See **`PSM_REFERENCES_FINAL.md`** — 10 entries, all cited.

---

## 6. Figure intro + explanation paragraphs (paste-ready)

### Figure 3.1
> Figure 3.1 illustrates the current manual activity flow from defect detection through informal closure and the limitations of paper-based recording.

### Figure 4.2
> Figure 4.2 presents the high-level static class diagram of the QDTS domain model, showing main entity classes and their relationships.

### Figure 4.3
> Figure 4.3 presents the dynamic view of the defect lifecycle from reporting through corrective action verification, root cause confirmation, and closure.

---

## 7. PRJ-5 log record (what to write in ULearn)

Suggested log entry text:

> Completed Chapter 4 (Design) for QDTS. Updated system architecture (Figure 4.1), high-level class diagram (Figure 4.2), sequence diagram of defect lifecycle (Figure 4.3), UI design with input/output tables and screenshots (Figures 4.5–4.8), database ERD (Figure 4.9), software module design, and physical database tables. Diagrams exported as SVG for Word. Prototype verified on localhost.

---

## 8. PRJ-10 PSM1 Draft — minimum contents

| Section | Include |
|---------|---------|
| Front matter | Title, abstract (EN + Malay), acknowledgement, TOC, LOT, LOF |
| Ch 1–4 | Your current Word chapters (after §4 fixes) |
| Ch 5 | Stack, folder structure, key modules implemented |
| Ch 6 | Smoke test, API test, manual demo checklist, sample results |
| Ch 7 | Summary, limitations, future work |
| References | 10 entries (final list) |
| Appendices | A Gantt, B Form, C WhatsApp, D Data dictionary |

---

## 9. Demo preparation (PRJ-4 / PRJ-6)

1. `npm run reseed` in backend (fresh demo data)  
2. Run `DEMO.md` script — manager **nazhif**, worker **siti_aminah**, password **demo_password_only**  
3. Show: report defect → review → assign CA → complete → verify → root cause → close  
4. Show one report tab + CSV export  

---

## 10. File index (repo)

| Path | Purpose |
|------|---------|
| `PSM/PSM_CHAPTER_1.md` … `PSM_CHAPTER_7.md` | Source text (Ch5–7 new) |
| `PSM/PSM_MILESTONE_PREPARATION.md` | This checklist |
| `PSM/PSM_REFERENCES_FINAL.md` | Paste-ready references |
| `PSM/PSM_WORD_FULL_IMPROVEMENT_GUIDE.md` | Detailed Word edits |
| `PSM/diagrams/*.mmd` | All Mermaid diagrams |
| `PSM/screenshots/*.png` | UI figures |
| `DEMO.md` | Demo script |
| `backend/database/schema.sql` | Database truth |

---

## 11. Priority order (this week)

1. Export & insert **Figures 3.1, 4.2, 4.3**  
2. Fix **REFERENCES** + interview/WhatsApp wording  
3. Update **List of Tables/Figures** + TOC  
4. Paste **Chapters 5–7** from `PSM_CHAPTER_5.md` … `PSM_CHAPTER_7.md`  
5. Run `npm test` in backend; screenshot terminal for evidence  
6. Submit **PRJ-5** log in ULearn before **29 May 2026**  
7. Full draft for **PRJ-10** before **26 Jun 2026**
