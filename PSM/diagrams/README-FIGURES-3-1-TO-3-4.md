# Chapter 3 Figures 3.1–3.4 (B&W, Word-ready)

All figures are **black and white**, **no figure title on the image**. Add captions in Word only.

| Figure | Caption | Insert this PNG in Word |
|--------|---------|-------------------------|
| **3.1** | Current Manual Defect Handling Activity Diagram | `figure-3-1-current-manual-defect-handling-activity.png` |
| **3.2** | Current Manual Defect Handling Sequence Diagram | `figure-3-2-current-manual-defect-handling-sequence.png` |
| **3.3** | QDTS Use Case Diagram | `figure-3-3-qdts-use-case.png` |
| **3.4** | Proposed QDTS Workflow Activity Diagram | `figure-3-4-proposed-qdts-workflow-activity.png` |

**Word:** Insert → Pictures → select PNG → resize to page width (~15 cm) → caption below.

## Chapter 4 (same B&W style)

| Figure | Caption | PNG file |
|--------|---------|----------|
| **4.1** | Three-Tier System Architecture | `figure-4-1-three-tier-system-architecture.png` |
| **4.2** | Navigation Flow | `figure-4-2-navigation-flow.png` |
| **4.15** | Core Entity Relationship Diagram (ERD) | `figure-4-15-core-entity-relationship-diagram.png` |
| **4.16** | Defect Lifecycle Activity Flow | `figure-4-16-defect-lifecycle-activity.png` |

Source files: matching `.svg` or `.mmd` in this folder.

## Report paragraphs (paste under each figure)

**Figure 3.1** — Figure 3.1 shows the current manual defect handling activity at Kak Norie. When a defect is detected, the worker records it in a paper notebook and informs the manager verbally. The manager reviews the case informally, decides corrective action without a structured workflow, and the worker or manager executes physical actions on the production floor. Verification depends on defect type and is not tracked in a central system. The case is closed informally with limited search, loss recording, and audit support.

**Figure 3.2** — Figure 3.2 presents the sequence of manual defect handling between the Worker and Manager. The worker detects a defect, writes details in a notebook, and informs the manager verbally. The manager decides corrective action without formal assignment. Physical action is performed on the floor, loss may be noted manually, and the paper record is filed locally without system verification or management reporting.

**Figure 3.3** — Figure 3.3 presents the use case diagram of QDTS. The Worker actor logs in, views the dashboard, reports defects, views defect records, executes corrective actions, and uploads evidence. The Manager actor reviews defects, assigns and verifies corrective actions, confirms root cause, closes cases, manages products and batches, adds users, generates reports, exports data, and views the activity log. Include relationships show that reviewing a defect includes root cause confirmation, executing an action includes evidence upload, and generating reports includes export.

**Figure 3.4** — Figure 3.4 shows the proposed QDTS digital workflow. A defect is reported with status New. The manager starts review, assigns corrective actions, and the assigned worker starts and completes each action with evidence. The manager verifies or rejects actions until all non-cancelled actions are verified. The worker may submit a suspected root cause; the manager confirms root cause and closes the defect. Closed cases update reports and the activity log.
