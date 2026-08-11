# CHAPTER 1: INTRODUCTION

## 1.1 Introduction

Kak Norie operates as a small-scale retort food manufacturing business producing shelf-stable pouch and bottled products (200g–250g) with a typical shelf life of twelve months. Quality problems such as incorrect expiry printing, loose sealing, and product spoilage are currently recorded using paper notebooks. This manual approach makes it difficult to trace defects back to production batches, monitor corrective actions, and produce management reports for loss and root cause analysis.

This project develops a **Quality Defect Tracking System (QDTS)** — a web-based application that digitises the defect lifecycle from worker reporting through manager review, corrective action assignment, verification, root cause confirmation, and closure. The system is grounded in primary data collected from Kak Norie's manager through WhatsApp communication (9 June 2026, Appendix C) and a structured Google Form questionnaire (11 June 2026, Appendix B), supported by literature on food quality management, traceability, and manufacturing analytics (Li et al., 2025; Lisitsyn et al., 2021; Puech et al., 2024).

The implemented prototype uses a three-tier architecture: React frontend, Express REST API, and PostgreSQL database. It supports two roles — **Manager** and **Worker** — with role-based dashboards, notifications, activity logging, expiry mismatch alerts, batch traceability, CSV export, and browser print / save-as-PDF summaries.

## 1.2 Problem Statement(s)

Based on WhatsApp clarification and the Google Form response from the manager (Nazhif, 11 June 2026) and observation of the existing manual process, the following problems directly motivate this project:

1. **Unstructured record keeping** — Defects are recorded *"dalam buku / kertas"* (in books/paper), making retrieval of historical cases slow and error-prone (Kak Norie, 2026).

2. **Corrective actions are not monitored** — The manager identified *"tindakan pembetulan tidak dipantau"* (corrective actions are not monitored), allowing the same problems to recur (Kak Norie, 2026).

3. **Recurring defects** — *"Masalah yang sama boleh berulang"* (the same problem can repeat) because root causes and completed actions are not systematically linked to batch and product history (Kak Norie, 2026; Puech et al., 2024).

4. **Expiry date traceability** — Although batch review is *"mudah"* (easy) manually, printed expiry on pouches can differ from the correct retort-based expiry. The Google Form response notes actions such as relabelling and mould changes, but there is no automated flag when **correct expiry ≠ printed expiry** (Kak Norie, 2026; Mariammal and Suresh, 2025).

5. **Loss and disposal not quantified in one system** — Loss is calculated from *"bilangan unit rosak sahaja"* (number of defective units only), but discarded quantity, relabelled quantity, and estimated financial loss are scattered across paper notes (Kak Norie, 2026; Barakat et al., 2025).

6. **Limited audit trail** — Records are needed for manager reference, worker reference, customer complaints, and inspections, but paper files lack timestamps and user accountability (Kak Norie, 2026; Yin and Wang, 2022).

7. **No role-based digital workflow** — Both manager and workers perform corrective work, yet verification before closure *"bergantung kepada jenis defect"* (depends on defect type). A system must enforce who reports, who acts, and who verifies (Kak Norie, 2026; Grino and Lasco, 2025).

## 1.3 Objective

The general objective is to design and implement a web-based Quality Defect Tracking System that supports structured defect recording, traceability, and reporting for Kak Norie.

Specific objectives:

- **O1** — To replace paper-based defect recording with a structured digital form linked to product and batch master data.
- **O2** — To implement a role-based workflow (Worker reports → Manager reviews → Assign corrective action → Worker completes → Manager verifies → Close defect).
- **O3** — To automate batch expiry validation (correct expiry from retort date + shelf life) and highlight expiry mismatches (Kak Norie, 2026; Mariammal and Suresh, 2025).
- **O4** — To track corrective actions with due dates, overdue alerts, evidence upload, and manager verification or rejection.
- **O5** — To calculate and report product loss from handled quantities and product loss rate per unit (Barakat et al., 2025).
- **O6** — To provide management reports (loss, root cause, expiry issues, batch expiry audit, by product, by batch) with CSV export and browser print / save-as-PDF summaries (Maryadi et al., 2025; Bhimanpallewar et al., 2024).
- **O7** — To maintain an activity log and per-defect timeline for audit and compliance (Lisitsyn et al., 2021).

## 1.4 Scope

**In scope:**

- **Users:** One manager and two workers (demo: nazhif, siti_aminah, hairul_nizam), expandable via users table.
- **Products:** Retort pouch and bottled products; categories, packaging, size, shelf life, loss rate.
- **Batches:** Production date, retort date, auto-generated batch number, correct vs printed expiry, quantity produced.
- **Defects:** Nine detection stages; defect types filtered by stage; evidence photos; quantity fields; status workflow.
- **Corrective actions:** Product handling and machine/process check types; assignment, start, complete, verify, reject, cancel; due date editing by manager.
- **Root cause:** Worker suspected cause and manager confirmation after investigation.
- **Reports & dashboards:** KPI cards, charts, expiry audit, CSV export, browser print summaries.
- **Platform:** Web browser on Windows PC; backend API port 3000; frontend port 5173; PostgreSQL database.

**Out of scope (v1):**

- AI/YOLO visual defect detection (Dhelia et al., 2024; Abu Mangshor et al., 2025).
- OCR label reading (Ibrahim and Tejaswi, 2024).
- Blockchain traceability (Chen et al., 2024; Xu et al., 2024).
- IoT smart warehouse (Gowrishankar et al., 2023).
- Email/SMS notifications (in-app bell only).
- Mobile native app (responsive web shell only).
- ERP integration.

**Reason for scope limits:** Kak Norie is a three-person operation; requirement gathering prioritised organised records, batch checking, loss recording, and corrective action tracking over advanced automation (Kak Norie, 2026).

## 1.5 Project Significance

| Stakeholder | Benefit |
|-------------|---------|
| **Manager (Nazhif)** | Dashboard KPIs, new-report alerts, overdue actions, expiry mismatch reports, verify/close workflow, export for audit |
| **Workers** | Simple defect reporting, clear action queue, overdue reminders, status visibility on own reports |
| **Kak Norie business** | Reduced recurrence through root cause logging; quantified loss; batch-level traceability for retort pouches |
| **Academic / PSM** | Demonstrates SDLC + OOAD applied to real SME food-quality problem with WhatsApp and Google Form primary data |

The project aligns with Quality 4.0 principles of digital quality information systems (Li et al., 2025) while remaining appropriate for micro-enterprise resources.

## 1.6 Expected Output

1. Working **QDTS** prototype (frontend + backend + database).
2. **PostgreSQL schema** with seed data representing Kak Norie products, batches, and sample defects.
3. **User documentation** (`DEMO.md`) and API smoke test script.
4. **This PSM report** (Chapters 1–4) with diagrams, requirements, and design aligned to the built system.
5. **Demonstration** of end-to-end flow: worker report → manager assign → worker complete → manager verify → close → reports update.

## 1.7 Conclusion

Chapter 1 introduced Kak Norie's manual quality recording problems and defined objectives for a focused defect tracking system. The next chapter reviews literature on food quality, traceability, analytics dashboards, and RBAC, and describes the SDLC methodology, requirements, and project schedule used to deliver QDTS.
