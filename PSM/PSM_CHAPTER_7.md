# CHAPTER 7: CONCLUSION AND FUTURE WORK

## 7.1 Introduction

This chapter summarises the QDTS project for Kak Norie / Retort Niaga, evaluates achievement against the objectives in Chapter 1, states limitations, and proposes future enhancements.

---

## 7.2 Project Summary

Kak Norie previously relied on informal channels (including WhatsApp) and paper-based recording for quality defects, which made traceability, overdue follow-up, and expiry mismatch tracking difficult. The **Quality Defect Tracking System (QDTS)** web prototype addresses these gaps with a structured workflow from defect report through corrective action, root cause confirmation, and closure.

The system was developed using React 19, Express 5, and PostgreSQL, following the SDLC approach described in Chapter 2. Requirements were gathered through WhatsApp discussion (9 June 2026) and a Google Form questionnaire (11 June 2026), then analysed and designed in Chapters 3 and 4. Implementation and testing are documented in Chapters 5 and 6.

---

## 7.3 Objectives Achievement

**Table 7.1 — Objectives vs outcomes**

| Objective (from Ch 1) | Outcome |
|-------------------------|---------|
| Centralise defect recording in one system | Achieved — defect records with evidence in PostgreSQL |
| Support manager review before corrective work | Achieved — **New** → **Under Review** on manager open |
| Assign and track corrective actions | Achieved — assignment, start, complete, verify, overdue alerts |
| Record root cause after corrective action | Achieved — worker suspect, manager confirm (1:1 per defect) |
| Improve batch and expiry traceability | Achieved — batch detail, expiry mismatch reports |
| Provide role-based access (Manager / Worker) | Achieved — JWT + access control |
| Support reporting and export | Partially achieved — CSV + browser print; not native server PDF/Excel |
| Replace informal WhatsApp for defect logging | Partially achieved — prototype ready; production rollout not done |

---

## 7.4 Contributions

1. A working QDTS prototype tailored to retort food operations (batch numbers, expiry mismatch, product handling actions).  
2. Documented requirements, design diagrams, and database schema suitable for future maintenance.  
3. Automated API tests and a repeatable demo script for supervisor/evaluator sessions.  
4. Primary data from Kak Norie manager (questionnaire + WhatsApp) grounding the problem and requirements.

---

## 7.5 Limitations

| Limitation | Detail |
|------------|--------|
| Prototype scope | Localhost deployment only; not production-hardened |
| Roles | Manager and Worker only—no separate QA or admin roles |
| Notifications | In-app bell only—no email or SMS |
| Export | CSV and browser print—not server-generated PDF/Excel |
| User management | List and add users only—no edit/deactivate in UI |
| Product lifecycle | Archive only—no hard delete |
| Activity log | Workflow events only—not a full audit trail of every field change |
| CAPA / ERP | Not integrated with external ERP or full CAPA modules |
| Testing | No large-scale performance or security audit |

---

## 7.6 Future Work

1. **Production deployment** — Host on a secure server with HTTPS, backups, and environment-based configuration.  
2. **Email or WhatsApp notifications** — Alert managers when review is due or actions are overdue.  
3. **Mobile-friendly PWA** — Optimise for shop-floor tablets and phones.  
4. **Enhanced user admin** — Edit, deactivate, and password reset for staff turnover.  
5. **Advanced reporting** — Scheduled reports, trend charts by defect type and batch.  
6. **Integration** — Link to inventory or ERP if Kak Norie adopts such systems later.  
7. **Expanded testing** — Formal UAT with all production staff and penetration testing before go-live.

---

## 7.7 Conclusion

QDTS demonstrates that a structured web-based defect tracking workflow is feasible for Kak Norie’s retort operations. The prototype covers the core path from worker report to manager closure, highlights expiry mismatches, and provides exportable records that improve on paper and chat-only practices. With production deployment and notification enhancements, the system could support daily quality operations at Retort Niaga.

---

## Word paste notes

- Align objective wording with your **Chapter 1** exact bullet list—edit Table 7.1 if your Ch1 objectives differ.  
- Keep methodology sentence: WhatsApp **first**, Google Form **second**.  
- End report with **REFERENCES** then **APPENDICES** (A–D).
