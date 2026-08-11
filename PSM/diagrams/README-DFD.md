# DFD — Current System (As-Is) at Retort Niaga

SSADM Data Flow Diagrams for **§3.2 — Investigate and describe current system scenario**.

Based on Kak Norie requirement gathering (WhatsApp, 9 June 2026; Google Form, 11 June 2026): paper notebook recording, verbal manager notification, informal corrective actions, no central database.

## Files

| File | Diagram | Use in report |
|------|---------|---------------|
| `dfd-as-is-level0-context.mmd` | **Level 0** context diagram | One process (0.0) + Worker & Manager external entities |
| `dfd-as-is-level1-detailed.mmd` | **Level 1** logical DFD | Eight sub-processes + three data stores (D1–D3) |

## How to export for Word/PDF

1. Open [mermaid.live](https://mermaid.live)
2. Paste contents of `.mmd` file
3. Export as **PNG** or **SVG**
4. Insert as Figure 3.x with caption below

## Suggested report text

> The current quality defect management at Retort Niaga operates manually without an integrated information system. Figure 3.x (DFD Level 0) shows the system boundary: workers submit defect information and receive verbal instructions, while the manager reviews cases and receives ad-hoc updates. Figure 3.x (DFD Level 1) decomposes the manual process into recording, notification, review, decision, execution, optional verification, filing, and informal reporting. Data is stored in a **paper defect notebook (D1)**, with inconsistent batch logs **(D2)** and optional photo evidence **(D3)**. There is no automated loss calculation, status workflow, or searchable central repository.

## Process catalogue (Level 1)

| Process | Description | Actor |
|---------|-------------|-------|
| 1.0 | Record defect in paper notebook | Worker |
| 2.0 | Notify manager verbally | Worker → Manager |
| 3.0 | Review defect informally | Manager |
| 4.0 | Decide corrective action (relabel, discard, machine adjust) | Manager |
| 5.0 | Execute corrective action | Worker / Manager |
| 6.0 | Verify action (depends on defect type) | Manager |
| 7.0 | File paper record | Worker / Manager |
| 8.0 | Prepare management report (ad-hoc, units only) | Manager |

## Data store catalogue

| Store | Contents | Limitation |
|-------|----------|------------|
| D1 | Paper defect notebook | Not searchable; no status field |
| D2 | Batch / production log | Inconsistent batch numbering (Google Form response: "Tidak") |
| D3 | Photo evidence (optional) | Scattered on phones; not linked to cases |
