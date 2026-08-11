# Figure 3.1 — Landscape activity diagram (draw.io)

Open https://app.diagrams.net → **File → Open** → select this file.

## Page setup (before export)
- **File → Page setup**
- Paper: **A4**
- Orientation: **Landscape**
- Margins: 1 cm
- Grid: 10 px (optional)

## Swimlane layout (left → right)

| Column | Worker lane (y=40) | Manager lane (y=200) | Limitations (y=360) |
|--------|--------------------|----------------------|---------------------|
| 1 | Start: Defect detected | | |
| 2 | Identify and inspect | | |
| 3 | Record in notebook | | |
| 4 | Inform manager | Review informally | |
| 5 | | Decide action | |
| 6 | Perform corrective action | | |
| 7 | | Verification needed? (diamond) | |
| 8 | Update notebook | Informal check (Yes path) | |
| 9 | Case closed informally | | Limitations box |
| 10 | | | |

## Flow
Start → W1 → W2 → W3 → M1 → M2 → W4 → {Verification?}
- Yes → M5 → W5 → Done → Limitations
- No → W5 → Done → Limitations

## Style (B&W)
- Fill: **#FFFFFF**
- Stroke: **#000000**, 1.5 pt
- Font: **Arial 12 pt** (minimum)
- Start/End: rounded rectangle, 2 pt border
- Diamond: Verification needed?
- Limitations: dashed rectangle, bullet list inside

## Export for Word
- **File → Export as → SVG** (best text sharpness)
- Or **PNG** with **Zoom 200%** or width **2500 px**, transparent background **off**, border **0**
