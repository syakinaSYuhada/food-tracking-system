# QDTS Presentation Slides

**File:** `PSM/QDTS_Presentation_Slides.pptx`  
**Format:** 8 slides (1 title + 7 content per supervisor requirement)  
**Timing:** ~5 minutes slides + ~15 minutes live demo

---

## Before you email supervisor

1. Open `QDTS_Presentation_Slides.pptx` in PowerPoint
2. **Slide 1** — replace `[Your Name]`, `[Matric Number]`, `[Programme / Faculty]`
3. **Slide 6** — optional: Insert → Pictures → `PSM/diagrams/erd-qdts-core-report.svg` (or export SVG to PNG from browser)
4. **File → Export → PDF** — attach PDF to email for review
5. Keep `.pptx` for presenting

---

## Slide list

| # | Title |
|---|--------|
| 1 | Title — QDTS for Kak Norie |
| 2 | Introduction |
| 3 | Problem Statement |
| 4 | Objectives |
| 5 | Scope (In / Out) |
| 6 | Database Design |
| 7 | Methodology |
| 8 | Conclusion + demo cue |

*Note: Slide order in file is Title → 1–5 → 6 DB → 7 Methodology was swapped - let me check actual order in script*

Actually from script:
- Title
- 1 Introduction
- 2 Problem
- 3 Objectives
- 4 Scope
- 5 Methodology
- 6 Database
- 7 Conclusion

Supervisor asked: Intro, Problem, Objective, Scope, Methodology, DB, Conclusion — that matches!

---

## Regenerate slides

```powershell
cd "c:\Users\Admin\Downloads\PSM 1\kak-norie-qdts-v2"
python PSM/scripts/generate_presentation.py
```

---

## Demo reminder

- URL: http://localhost:5173
- Manager: `nazhif` / Worker: `siti_aminah`
- Password: `demo_password_only`
- Run `npm run reseed` in backend before demo if data is stale

See `DEMO.md` for full 15-minute demo script.
