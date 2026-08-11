# OOAD Views — QDTS (Chapter 4)

## Files

| View | File | Use in report |
|------|------|---------------|
| **Static** — High-level class diagram | `class-diagram-qdts-high-level.svg` | Figure 4.x Static View |
| **Dynamic** — Sequence / interaction diagram | `sequence-diagram-defect-lifecycle.mmd` | Figure 4.x Dynamic View (export from mermaid.live) |

Editable sources: `.mmd` files in this folder.

## Suggested captions

- **Static:** Figure 4.x: High-Level Class Diagram of QDTS (Static View)
- **Dynamic:** Figure 4.x: Sequence Diagram of Defect Lifecycle (Dynamic View)
- **Architecture:** Figure 4.1: Three-Tier Component Architecture of QDTS

## Architecture diagram

**File:** `architecture-qdts-three-tier.svg`

Correct flow:
`Worker/Manager → React SPA → REST API → Routes → Middleware → Controllers → Services → PostgreSQL / Evidence Storage`
