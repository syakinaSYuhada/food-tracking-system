# Use Case Diagram — QDTS

**File:** `use-case-qdts.svg` — insert into Chapter 3.3.2 Functional Requirement

**Caption:** Figure 3.x: Use Case Diagram of Quality Defect Tracking System

## Actors

| Actor | Use cases |
|-------|-----------|
| **Worker** | Login, View Dashboard, Report Defect (2-step form), View Defect Records, Execute Corrective Action, Upload Action Evidence |
| **Manager** | Login, View Dashboard, Add Defect (3-step form; same `POST /defects` as worker), View Defect Records, Review Defect, Confirm Root Cause, Assign Corrective Action, Verify / Reject Action, Close Defect Case, Generate Reports, Export Reports, Manage Products and Batches, Manage User Accounts, View Activity Log |

## «include» relationships

| Base use case | «include» |
|---------------|-----------|
| Review Defect | Confirm Root Cause |
| Execute Corrective Action | Upload Action Evidence |
| Generate Reports | Export Reports |

## Report paragraph

> Figure 3.3 presents the use case diagram of the Quality Defect Tracking System (QDTS). Two actors interact with the system: Worker and Manager. Workers log in, view the dashboard, report defects (2-step form), view defect records, execute corrective actions, and upload action evidence. Managers also create defect records through Add Defect (3-step form; same API as worker report), and perform review, assignment, verification, root cause confirmation, case closure, master data management, reporting, user administration, and activity log viewing.
