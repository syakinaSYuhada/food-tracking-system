# Chapter 4 — Word Completion Guide (QDTS)

Use this checklist to finish **Chapter 4: DESIGN** in `report fyp 1.docx`.

Your chapter text is **~90% complete**. Fix figures, add two OOAD diagrams, and renumber captions.

---

## Final figure numbering (use this in Word)

| Figure | Caption | Insert after | File |
|--------|---------|--------------|------|
| 4.1 | Three-Tier System Architecture | Architecture paragraph, before Table 4.1 | `PSM/diagrams/figure-4-1-three-tier-system-architecture.png` |
| 4.2 | Navigation Flow | Navigation Design text, before Table 4.3 | `PSM/diagrams/figure-4-2-navigation-flow.png` |
| 4.3 | Login Form Interface | Table 4.5 (Input Design) | `PSM/screenshots/fig-4-5-login.png` |
| 4.4 | Report Defect Form Interface | Below Figure 4.3 | `PSM/screenshots/fig-4-8-report-defect-worker.png` |
| 4.5 | Manager Dashboard Interface | **Table 4.6** (Output Design) | `PSM/screenshots/fig-4-10-dashboard-manager.png` |
| 4.6 | Defect Details Interface | Below Figure 4.5 | `PSM/screenshots/fig-4-12-defect-details.png` |
| 4.7 | Core Entity Relationship Diagram (ERD) | ERD paragraph, before Table 4.7 | `PSM/diagrams/figure-4-15-core-entity-relationship-diagram.png` |
| 4.8 | High-Level Class Diagram of QDTS (Static View) | **New text §4.2.1** (paste below) | `PSM/diagrams/figure-4-9-high-level-class-diagram.png` |
| 4.9 | Sequence Diagram of Defect Lifecycle (Dynamic View) | **New text §4.2.1** (paste below) | `PSM/diagrams/figure-4-10-sequence-diagram-defect-lifecycle.png` |
| 4.10 | Defect Lifecycle Activity Flow | Table 4.10 area / Software Design | `PSM/diagrams/figure-4-16-defect-lifecycle-activity.png` |

**Delete old captions:** Figure 4.15, duplicate Figure 4.7 lifecycle label if still present.

---

## Step-by-step in Word

### Step 1 — Fix figure numbering
1. Renumber all Chapter 4 figure captions using the table above.
2. Update in-text references (`Figure 4.1`, `Figure 4.7`, etc.).
3. Right-click **List of Figures** → **Update Field** → **Update entire table**.

### Step 2 — Insert missing ERD image
1. Go to **Database Design → Conceptual and Logical Database Design**.
2. Find caption **Figure 4.7: Core Entity Relationship Diagram (ERD)** (renamed from 4.15).
3. Place the **image above** the caption.
4. Insert `figure-4-15-core-entity-relationship-diagram.png`.

### Step 3 — Move output screenshots
1. Cut **Figure 4.5** (Dashboard) and **Figure 4.6** (Defect Details).
2. Paste **after Table 4.6: Output Design Classification** (section **4.2.2(c) Output Design**).
3. Keep input screenshots (4.3, 4.4) after Table 4.5.

### Step 4 — Add Static View (paste text + figure)

**Location:** Section **4.2.1 System Architecture**, after Table 4.2 and workflow status paragraph, **before** section 4.2.2 User Interface Design.

**Paste this paragraph:**

> In addition to the three-tier architecture, QDTS is modelled using object-oriented analysis and design (OOAD). The static view presents the main domain classes and their relationships. The core classes are User, Product, Batch, Defect, CorrectiveAction, RootCauseInvestigation, Evidence, and ActivityLog. A User may create or manage defects and corrective actions depending on role. A Product has many Batches; each Batch may have many Defects. Each Defect has one RootCauseInvestigation record and may have many CorrectiveActions and Evidence files. This structure supports traceability from product master data to defect handling and audit records.

**Insert image:** `figure-4-9-high-level-class-diagram.png`  
**Caption below image:** `Figure 4.8: High-Level Class Diagram of QDTS (Static View)`

### Step 5 — Add Dynamic View (paste text + figure)

**Location:** Immediately after Figure 4.8.

**Paste this paragraph:**

> The dynamic view shows how the main actors and system components interact during the defect lifecycle. When a Worker reports a defect, the frontend sends a POST request to the DefectController, which validates batch quantity and inserts records into PostgreSQL. The Manager starts review, assigns corrective actions, and the assigned Worker completes each action with evidence. The Manager verifies or rejects actions until all non-cancelled actions are verified. The Worker may submit a suspected root cause; the Manager confirms root cause and closes the defect. Activity is recorded in the activity log at each major step.

**Insert image:** `figure-4-10-sequence-diagram-defect-lifecycle.png`  
**Caption below image:** `Figure 4.9: Sequence Diagram of Defect Lifecycle (Dynamic View)`

### Step 6 — Rename lifecycle activity figure
1. Find **Defect Lifecycle Activity Flow** diagram (currently wrongly numbered 4.7 in some places).
2. Renumber to **Figure 4.10: Defect Lifecycle Activity Flow**.
3. Keep it in **4.3.1 Software Design** after Table 4.10 or before Table 4.11.

### Step 7 — Update chapter conclusion (optional strengthen)

Replace or extend your **4.4 Conclusion** closing sentence with:

> The design also includes OOAD static and dynamic views, a normalized thirteen-table database, and physical implementation details such as indexes, constraints, and evidence file storage. These design artefacts provide the blueprint for system implementation and testing in the next chapters.

### Step 8 — Update List of Figures
- Split **List of Tables** and **List of Figures** if your template requires separate pages.
- Update both lists after all changes.

---

## What is already done (do not rewrite)

| Section | Status |
|---------|--------|
| 4.1 Introduction | Done |
| 4.2.1 System Architecture + Tables 4.1–4.2 | Done |
| 4.2.2(a) Navigation Design + Tables 4.3–4.4 + Figure 4.2 | Done |
| 4.2.2(b) Input Design + Table 4.5 | Done |
| 4.2.2(c) Output Design + Table 4.6 | Done (move screenshots here) |
| 4.2.3 Database Design + Tables 4.7–4.8 | Done (add ERD image) |
| Normalization paragraph | Done |
| 4.3.1 Software Design + Tables 4.9–4.11 | Done |
| 4.3.2 Physical Database Design + Table 4.12 | Done |
| 4.4 Conclusion | Done (optional tweak above) |

---

## Capture screenshots (if not done)

```powershell
cd backend ; npm run dev
cd frontend ; npm run dev
cd frontend ; npm run screenshots
```

Export OOAD diagrams:

```powershell
cd frontend ; node scripts/export-ch4-diagrams.mjs
```

---

## BITS checklist for Chapter 4

- [x] System Architecture
- [x] Navigation / Input / Output Design
- [x] Database Design + Normalization
- [x] Software Design + Physical Database Design
- [ ] **Static view (class diagram)** — add Figure 4.8
- [ ] **Dynamic view (sequence diagram)** — add Figure 4.9
- [ ] ERD image inserted
- [ ] Figure numbering continuous
- [ ] List of Figures updated
