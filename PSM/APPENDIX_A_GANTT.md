# APPENDIX A — Gantt Chart Only

Appendix A = **one Gantt chart image** + caption. No long text needed.

For a professional FYP report, **GanttProject** is recommended because it produces a cleaner and more formal Gantt chart suitable for academic reports.

---

## Recommended: GanttProject (free, open source)

**Download:** https://www.ganttproject.biz/

---

## Step-by-step in GanttProject

### 1. New project
- Open GanttProject → **New project**
- **Project → Project properties**
  - Name: `QDTS Planned Schedule`
  - Start date: **1 April 2026**
  - OK

### 2. Add 8 tasks

Copy this table into GanttProject (Task name, Start, End):

| # | Task name | Start | End | Duration |
|---|-----------|-------|-----|----------|
| 1 | Requirement gathering (WhatsApp + Google Form) | 01/04/2026 | 14/04/2026 | 2 weeks |
| 2 | Literature review | 15/04/2026 | 28/04/2026 | 2 weeks |
| 3 | System analysis | 29/04/2026 | 12/05/2026 | 2 weeks |
| 4 | System design | 13/05/2026 | 26/05/2026 | 2 weeks |
| 5 | System development | 27/05/2026 | 30/06/2026 | 5 weeks |
| 6 | Testing | 01/07/2026 | 14/07/2026 | 2 weeks |
| 7 | Documentation | 15/07/2026 | 28/07/2026 | 2 weeks |
| 8 | Final submission and presentation | 29/07/2026 | 04/08/2026 | 1 week |

**Total:** 18 weeks — must match **Table 2.6 / 2.7** in Chapter 2.

### 3. Optional milestones (looks more formal)
Add milestone at end of each phase (or only key ones):

| Milestone | Date |
|-----------|------|
| Initial requirements confirmed | 14/04/2026 |
| Literature review complete | 28/04/2026 |
| Analysis complete | 12/05/2026 |
| Design complete | 26/05/2026 |
| Prototype complete | 30/06/2026 |
| Testing complete | 14/07/2026 |
| Documentation complete | 28/07/2026 |
| Final submission | 04/08/2026 |

### 4. Format for report (professional look)
- **View → Zoom** — fit all tasks on one screen
- Hide unnecessary columns (keep: Task name, Start, End, Duration)
- Use default clean theme (white background)
- Title on chart: **QDTS Planned Project Schedule (18 Weeks)**

### 5. Export for Word
- **File → Export chart** (or Export → PNG / PDF)
- Save as: `appendix-a-gantt-qdts.png`
- Recommended width: landscape, readable when printed on A4

### 6. Insert in Word

```
APPENDIX A — PROJECT GANTT CHART

[insert exported PNG]

Figure A.1: Planned Project Gantt Chart for QDTS (18 Weeks)
```

That is enough for Appendix A.

---

## GanttProject import (CSV — fixed date format)

**Important:** GanttProject on your PC expects dates as **`dd/MM/yyyy`** (e.g. `01/04/2026`), **NOT** `2026-04-01`.

Use this file: **`PSM/diagrams/gantt-qdts-tasks.csv`**

```csv
Name,Begin date,End date
Requirement gathering (WhatsApp + Google Form),01/04/2026,14/04/2026
Literature review,15/04/2026,28/04/2026
System analysis,29/04/2026,12/05/2026
System design,13/05/2026,26/05/2026
System development,27/05/2026,30/06/2026
Testing,01/07/2026,14/07/2026
Documentation,15/07/2026,28/07/2026
Final submission and presentation,29/07/2026,04/08/2026
```

**Import steps:**
1. GanttProject → **Project → Import → CSV**
2. Select `gantt-qdts-tasks.csv`
3. Map columns: **Name**, **Begin date**, **End date**
4. Click OK

**If import still fails:** skip CSV — type the 8 tasks manually using the table in Step 2 above (fastest fix).

---

## Troubleshooting: "Unparseable date" error

| Error | Fix |
|-------|-----|
| `Unparseable date: "2026-04-01"` | Use **`01/04/2026`** format in CSV |
| `date must not be null` | Same — wrong date format caused empty dates |
| CSV import wizard confusing | **Manual entry** — 8 rows, 2 minutes |

**Optional:** GanttProject → **Edit → Settings → Date format** — but easiest is still use `dd/MM/yyyy` in CSV.

---

## Alternative (quick draft only)

**Mermaid Live** — https://mermaid.live/ — fast but less formal.  
Source file: `PSM/diagrams/appendix-a-gantt-qdts.mmd`  
Pre-exported PNG: `PSM/diagrams/appendix-a-gantt-qdts.png` (use only if you cannot install GanttProject).

For final submission, prefer **GanttProject export**.

---

## ChatGPT prompt (GanttProject task list)

```
I am creating Appendix A Gantt chart for UTeM FYP using GanttProject (free).
Project: QDTS, 18 weeks, start 1 April 2026, 8 phases matching Table 2.6:

1 Requirement gathering (WhatsApp + Google Form) — 2 weeks
2 Literature review — 2 weeks
3 System analysis — 2 weeks
4 System design — 2 weeks
5 System development — 5 weeks
6 Testing — 2 weeks
7 Documentation — 2 weeks
8 Final submission — 1 week

Output ONLY:
1) Table: Task | Start date | End date (DD/MM/YYYY) for GanttProject entry
2) CSV content I can import
3) 8 milestone names with dates
4) Figure A.1 caption
No essay paragraphs.
```

---

## Checklist before submission

- [ ] 8 tasks match Chapter 2 Table 2.6 names and durations
- [ ] Total = 18 weeks
- [ ] Chart is readable on A4 (landscape PNG or PDF)
- [ ] Caption: **Figure A.1: Planned Project Gantt Chart for QDTS (18 Weeks)**
- [ ] List of Figures updated in Word
