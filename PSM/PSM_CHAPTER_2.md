# CHAPTER 2: LITERATURE REVIEW AND PROJECT METHODOLOGY

## 2.1 Introduction

This chapter presents the literature review and project methodology used in the development of the **Quality Defect Tracking System (QDTS)** for **Kak Norie / Retort Niaga**. It explains the research approach used to identify and confirm system requirements, discusses the project domain, reviews the existing system and related approaches, compares alternative techniques, and documents the Software Development Life Cycle (SDLC), project requirements, and project schedule.

The requirements for QDTS were developed using a combined research approach adapted from Bharosa et al. (2009). Bharosa et al. (2009) used **literature review**, **empirical case study**, and **semi-structured interviews** to identify and confirm information and system quality requirements in a multi-agency environment. Although the domain of that study differs from food manufacturing, the same three-step logic applies: literature review identifies general requirements, case investigation identifies context-specific problems, and stakeholder input confirms what the system must support.

This project **does not replicate semi-structured interviews**. It adapts Bharosa et al.’s logic using **WhatsApp communication** for initial consent and exploratory clarification, followed by a **structured Google Form questionnaire** and analysis of the current manual process at Kak Norie. Evidence is provided in **Appendix C** (WhatsApp, from 9 June 2026) and **Appendix B** (Google Form, 11 June 2026) respectively.

This project adapts that approach through three activities:

1. **Literature review** — to identify general quality-system requirements and suitable system features from published work on food quality management, defect tracking, traceability, CAPA, root cause analysis, expiry control, dashboards, and role-based access control.
2. **Current-system investigation / case study** — to examine the manual quality recording process at Kak Norie / Retort Niaga using WhatsApp clarification (Appendix C) and the Google Form response (*Kak Norie Quality Defect Tracking.csv*, 11 June 2026) as primary data.
3. **Requirement confirmation** — to consolidate WhatsApp and Google Form findings and translate them into QDTS requirements.

The findings from this chapter provide the foundation for the system analysis and design presented in Chapters 3 and 4.

---

## 2.2 Facts and Findings

### 2.2.1 Domain

Chapter 1 introduced the Kak Norie business context, problem statements, and project scope. This section focuses on the **research domain** and what the **literature review** contributes to QDTS requirement identification.

The project domain is **food quality management**, **defect tracking**, and **production traceability** in small-scale retort food manufacturing. In such environments, defects may arise across preparation, cooking, packing, sealing, retort, labelling, storage, and delivery. A digital quality system must therefore support stage-based defect capture, linked production records, corrective action follow-up, and management reporting—not only static data entry.

Published work reviewed for this project was grouped into themes that inform QDTS design rather than repeat Chapter 1 problem statements. The review is **critical**, not descriptive: each source is judged for SME fit, domain difference, and prototype feasibility.

Li et al. (2025) review Quality 4.0 quality-management information systems for broader digital environments. QDTS adopts structured records and dashboard ideas, but not full enterprise Quality 4.0 integration. Lisitsyn et al. (2021) discuss large-scale food safety management with formal corrective action documentation; Kak Norie needs a **lighter** workflow suitable for three staff. Puech et al. (2024) show that structured manufacturing data improves root cause analysis, but their multi-product assembly context exceeds this project scope. Barakat et al. (2025) examine digital cost-of-quality in agri-food firms; QDTS adapts **loss reporting**, not a complete cost-of-quality framework. Yin and Wang (2022) and Mariammal and Suresh (2025) come from different domains (fungi traceability and retail barcode expiry alerts); QDTS uses their **concepts** for batch linkage and expiry comparison only. Grino and Lasco (2025) implement RBAC in a government employee system; QDTS applies **role separation** with only Manager and Worker roles.

**Table 2.1: Literature themes and relevance to QDTS**

| Theme | Representative source | Design implication for QDTS |
|-------|----------------------|----------------------------|
| Quality information systems / Quality 4.0 | Li et al. (2025) | Dashboard, digital workflow, structured records |
| Food quality and safety management | Lisitsyn et al. (2021) | Documented corrective action and audit support |
| Defect analytics and root cause | Puech et al. (2024) | Root cause module and analysis reports |
| Quality cost / loss measurement | Barakat et al. (2025) | Loss calculation and loss reporting |
| Traceability | Yin and Wang (2022) | Product and batch linkage in defect records |
| Expiry control concepts | Mariammal and Suresh (2025) — retail barcode/QR expiry alerts | Expiry mismatch comparison (**concept adapted, not identical domain**) |
| Access control | Grino and Lasco (2025) — LGU employee RBAC system | Manager/worker role separation (**concept adapted, not identical domain**) |

Table 2.1 shows that literature supports **design direction**, not automatic feature inclusion. A feature was included only when it was supported by Kak Norie primary data (Appendices B and C) and feasible within prototype scope.

Cooling occurs in the real production process after retort, but QDTS does **not** treat Cooling as a separate detected stage; related issues may be recorded under stages such as **Retort Process** or **Stock Storage**, or through root cause and process/tool fields.

The purpose of the literature review in this chapter is to identify **general** system requirements and evaluate alternative techniques before they are combined with Kak Norie primary data in Sections 2.2.2 and 2.2.3.

---

### 2.2.2 Existing System

#### A. Existing system at Kak Norie / Retort Niaga

Chapter 1 (Section 1.2) states the problems that motivate QDTS. This section does **not** repeat that list. Instead, it summarises the **as-is quality recording process** confirmed from primary data (WhatsApp communication, Appendix C; structured Google Form response, Appendix B).

The current approach is **manual**: defects are noted in paper records (*“dalam buku / kertas”*), follow-up is partly informal, and there is no central digital system for search, workflow, or audit.

**Table 2.2: As-is practices confirmed from primary data**

| Area | Current practice (Kak Norie) | Implication for QDTS |
|------|------------------------------|----------------------|
| Record format | Paper notebook / notes | Need structured digital defect records |
| Search and history | No central searchable archive; respondent requested easier search of old records (*“Senang cari semula rekod lama”*) | Need indexed search and history |
| Batch identification | No formal batch number on every production (*“Tidak”*) | Need batch master data in system |
| Corrective action monitoring | *“Tindakan pembetulan tidak dipantau”* | Need CA assignment and status tracking |
| Defect recurrence | *“Masalah yang sama boleh berulang”* | Need root cause and history linkage |
| Expiry / label control | Manual review reported as *“Ya, mudah”*; no digital mismatch alert; no reported printed/correct expiry difference at response time (*“Tidak”*) | Need central expiry record and mismatch flag |
| Loss recording | Based on defective units only (*“bilangan unit rosak sahaja”*) | Need consolidated loss fields and reports |
| Accountability | Paper lacks timestamps and user trail | Need activity log and role-based actions |
| Roles | Manager and workers both handle corrective work; closure depends on defect type | Need manager/worker workflow rules |

The manager’s most recently reported practical defect example in the form was **loose sealing** (*“Sealing tidak rapat”*) at **Packing** and **Sealing** stages. These as-is findings confirm that Kak Norie needs a focused digital system rather than a full enterprise platform.

#### B. Related systems and approaches from literature

Literature and industry practice describe several approaches to quality and defect management. Each option is evaluated for Kak Norie’s **three-person SME** context.

**Manual paper records**  
Paper notebooks are low cost and already used at Kak Norie. They cannot enforce workflow, link defects to batch expiry automatically, or produce filtered reports. Search depends on manual reading, which conflicts with the manager’s request for easier retrieval of old records.

**Spreadsheet / Excel tracking**  
Excel improves sorting and simple calculations. For Kak Norie it could list defects in columns, but it lacks enforced manager/worker roles, weak concurrent editing control, and no relational link between product master, batch dates, corrective action status, and root cause history. Informal SME spreadsheets often suffer formula errors and duplicate file versions.

**Google Form only**  
Google Form was useful for **collecting** requirement data (Appendix B) but is not an operational defect system. It captures one-time answers, not live workflow states, due dates, verification, or batch-level expiry logic.

**CAPA / Quality Management Systems (QMS)**  
Enterprise CAPA platforms support investigation, verification, and audit documentation (Lisitsyn et al., 2021). They suit regulated large operations but require configuration, training, and cost disproportionate for a three-person retort kitchen.

**ERP systems**  
ERP integrates inventory, production, finance, and quality. For Kak Norie, ERP would be expensive and broader than the immediate need (defect recording and follow-up). Primary data prioritised organised defect records, not full enterprise planning.

**Manufacturing defect tracking systems**  
This category is closest to QDTS: defect logging, action assignment, analytics, and traceability. Commercial modules often assume larger teams and shop-floor integration. QDTS implements a **subset** at web-app scale.

**Traceability systems**  
Traceability links batches to incidents (Yin and Wang, 2022). QDTS supports batch-to-defect linkage and expiry audit reports, but batch records are **entered manually** by the manager; there is no automatic production-line capture.

**Table 2.3: Related approaches and relevance to QDTS**

| Approach | Finding | Relevance to QDTS |
|----------|---------|-------------------|
| QMIS / Quality 4.0 (Li et al., 2025) | Digital platforms integrate inspection, corrective action, and reporting | Supports dashboard and workflow design |
| Defect root cause analytics (Puech et al., 2024) | Structured data improves root cause analysis | Supports root cause module and reports |
| BI dashboards (Bhimanpallewar et al., 2024; Maryadi et al., 2025) | KPI dashboards improve visibility | Supports manager dashboard |
| Food traceability (Yin and Wang, 2022) | Batch-level trace links production to incidents | Supports batch detail and expiry audit |
| Expiry alert systems (Mariammal and Suresh, 2025) | Retail barcode/QR expiry alert concept | Supports expiry mismatch alerts — **concept adapted for batch expiry comparison, not identical domain** |
| RBAC (Grino and Lasco, 2025) | RBAC in a local-government employee system | Supports manager/worker roles — **role-separation concept adapted, not identical domain** |
| Vision AI / YOLO (Abu Mangshor et al., 2025) | Automated packaging defect detection | Not adopted — scope and cost |
| Blockchain traceability (Xu et al., 2024) | Tamper-proof distributed records | Not adopted — SME overhead |

QDTS adopts **selected concepts** from CAPA and manufacturing defect tracking, but not a full enterprise CAPA, ERP, or AI-based inspection system.

---

### 2.2.3 Technique

Several techniques can be used to manage quality defects and production problems. Table 2.4 compares **operational alternatives** for Kak Norie on suitability criteria, not maximum feature count.

**Table 2.4: Comparison of quality recording alternatives for Kak Norie**

| Criterion | Manual paper | Excel / spreadsheet | Google Form only | CAPA / QMS | ERP | **QDTS (selected)** |
|-----------|--------------|---------------------|------------------|------------|-----|---------------------|
| Initial cost | Very low | Low | Low | High | Very high | Low (prototype) |
| Training effort | Low | Medium | Low | High | High | Medium |
| Role separation (manager/worker) | Informal | Weak | None | Strong | Strong | **Implemented (2 roles)** |
| Workflow status tracking | None | Manual columns | None | Strong | Strong | **Implemented** |
| Batch + expiry linkage | Manual | Manual setup | Not for operations | Yes | Yes | **Yes (manual batch entry)** |
| Expiry mismatch alert | None | Formula only | None | Possible | Possible | **Implemented** |
| CA verify / reject | Informal | Informal | None | Strong | Strong | **Implemented** |
| Root cause history | Paper notes | Columns | One-time survey | Strong | Strong | **1:1 investigation record** |
| Reports / CSV export | None | Basic | Response export only | Strong | Strong | **10 report tabs + CSV** |
| Audit trail | Weak | Weak | None | Strong | Strong | **Workflow activity log** |
| Fit for 3-person SME | Familiar but limited | Possible but fragile | Wrong tool type | Over-scoped | Over-scoped | **Best fit for scope** |

Table 2.4 compares six operational alternatives against eleven suitability criteria. The alternatives excluded from this matrix (AI inspection, OCR, blockchain) are out of scope as stated in Chapter 1.4; they were not treated as day-to-day recording options for Kak Norie.

QDTS is selected because it is the only option that combines structured defect workflow, batch traceability, role-based access, and reporting without ERP-level cost. Section 2.2.2 B already describes each alternative in narrative form; Table 2.4 provides the structured comparison that supports the selection.

#### Selected technique

The selected technique is a **web-based three-tier Quality Defect Tracking System (QDTS)** with:

- **Presentation layer:** React, Vite, and Tailwind CSS
- **Application layer:** Node.js and Express REST API with JWT authentication
- **Data layer:** PostgreSQL relational database
- **Workflow model:** simplified **CAPA-oriented** defect and corrective action workflow
- **Access control:** Manager and Worker roles

This approach is suitable for Kak Norie because it is:

- **Practical** — matches the current size of the operation and daily workflow
- **Affordable** — uses open-source/web technologies without ERP, AI, or blockchain cost
- **Role-aware** — separates manager review/verification from worker reporting/action completion
- **Traceable** — links defects to product, batch, expiry, and corrective actions
- **Reportable** — supports loss, root cause, expiry, and batch/product analysis
- **Auditable** — maintains activity logs and structured records
- **Demonstrable** — can run on localhost for academic prototype evaluation

Kak Norie operates with one manager and two workers. Primary data showed that the manager’s priority is **organised defect records**, **batch checking**, **loss recording**, and **corrective action follow-up**, not advanced automation. QDTS digitises the notebook process without ERP adoption. It supports reported defect contexts (expiry printing, sealing) through stage-based reporting, expiry mismatch flags, and root cause confirmation. The prototype uses CSV export and browser print/save-as-PDF, not native server PDF or email alerts.

QDTS is **not** a full CAPA system, full ERP, AI inspection system, OCR label reader, or blockchain platform. It is a focused defect tracking prototype for SME quality record keeping and monitoring.

---

## 2.3 Project Methodology

### Research approach

Following the adapted Bharosa et al. (2009) logic, requirements were identified and confirmed through:

| Step | Method | Purpose in QDTS project | Output |
|------|--------|------------------------|--------|
| 1 | Literature review | Identify general quality-system requirements and suitable features | Requirement themes for QDTS |
| 2 | Case / current-system investigation | Understand Kak Norie manual process and context-specific problems | Problem statements and as-is process description |
| 3 | WhatsApp + structured Google Form | Consolidate initial and structured findings from manager (Nazhif) | Confirmed functional requirements for QDTS |

Primary data sources (in collection order):

1. WhatsApp communication with the manager (Nazhif) from **9 June 2026** onwards — **Appendix C** (initial contact, consent, exploratory clarification)
2. Structured Google Form questionnaire completed on **11 June 2026** — **Appendix B** (main structured primary data source)

Requirement gathering followed the sequence **WhatsApp first, then Google Form**. WhatsApp established contact and informed the questionnaire scope. The Google Form is the **main structured primary data source** for as-is process, defect types, reporting needs, and expected system support.

#### Relationship between research approach and SDLC

Table 2.5 below follows **SDLC phase order**, which differs slightly from the conceptual order in the research table above. In practice:

- **Phase 1 (Requirement Gathering)** began with WhatsApp communication (9 June 2026), followed by the structured Google Form (11 June 2026).
- **Phase 2 (Literature Review)** ran after initial case data were collected and in parallel with early analysis reading.
- **Phase 3 (System Analysis)** consolidated WhatsApp and Google Form findings, literature themes, and confirmed requirements into the requirement specification in Chapter 3.

Thus, primary data collection started first, literature supported requirement validation and technique selection, and full requirement consolidation occurred before detailed design.

### Software Development Life Cycle (SDLC)

After requirements were identified and confirmed, the system was developed using a **modified waterfall SDLC** with **Object-Oriented Analysis and Design (OOAD)** for module structure, class/entity modelling, and database design. Phases were completed in sequence from requirement gathering through final submission. Minor refinements to UI layout, export behaviour, and role permissions were made during development and testing when prototype review revealed gaps; these refinements stayed within the development and testing phases rather than restarting the full lifecycle.

**Table 2.5: SDLC phases, activities, outputs, and relation to QDTS**

| Phase | Activities | Outputs | Relation to QDTS |
|-------|------------|---------|------------------|
| 1. Requirement Gathering | WhatsApp communication (initial contact, 9 June 2026); structured Google Form questionnaire (11 June 2026); review of business process and product/batch practices | WhatsApp evidence (Appendix C); Google Form CSV (Appendix B); initial requirement list | Defines what QDTS must support at Kak Norie |
| 2. Literature Review | Review articles on quality management, traceability, CAPA, dashboards, RBAC, expiry control | Literature summary; requirement themes; technique comparison | Supports design decisions and justifies selected features |
| 3. System Analysis | Analyse manual process; define as-is/to-be flow; identify functional and non-functional requirements | Use case summary; DFD; problem analysis; requirement specification (Chapter 3) | Translates findings into system requirements |
| 4. System Design | Design architecture, UI, database ERD, workflows, navigation, API modules | Architecture diagram; ERD; UI design; workflow design (Chapter 4) | Blueprint for implementation |
| 5. System Development | Implement frontend pages, backend controllers/services, PostgreSQL schema and seed data | Working QDTS prototype modules | Real system aligned with Kak Norie workflow |
| 6. Testing | Smoke test, API integration test, manual demo script, role-based access verification | Test results; demo checklist; screenshot evidence | Verifies system behaviour before submission |
| 7. Documentation | Prepare DEMO.md, diagrams, screenshots, PSM report, user/system documentation | Report chapters; appendices; demo guide | Supports evaluation and viva |
| 8. Final Submission | Finalize report, prototype, appendices, and presentation materials | Completed PSM submission package | Final deliverable |

#### Phase details

**Phase 1: Requirement Gathering**  
Activities began with WhatsApp communication for consent and initial clarification (9 June 2026, Appendix C), followed by a structured Google Form questionnaire completed on 11 June 2026 (Appendix B). The investigation focused on current record keeping, defect types, expiry printing problems, batch practices, loss recording, corrective actions, reporting needs, and user roles.

**Phase 2: Literature Review**  
Published work on food quality systems, traceability, CAPA, dashboards, and RBAC was reviewed to identify general system requirements and evaluate alternative techniques.

**Phase 3: System Analysis**  
The manual process was analysed and compared with the proposed digital workflow. Functional requirements, non-functional requirements, and data requirements were defined based on WhatsApp and Google Form findings and literature support.

**Phase 4: System Design**  
The three-tier architecture, user interface, database structure, and workflow logic were designed. QDTS supports nine detected stages, manager/worker roles, corrective action lifecycle, root cause investigation, and reporting modules.

**Phase 5: System Development**  
QDTS was implemented as a web-based system with modules for authentication, products, batches, defects, corrective actions, root cause, dashboards, reports, activity log, evidence upload, and user management.

**Phase 6: Testing**  
Testing included backend smoke testing, API integration testing, manual workflow testing using DEMO.md, and verification of manager/worker permissions.

**Phase 7: Documentation**  
Documentation included technical files, PSM diagrams, screenshots, and report writing.

**Phase 8: Final Submission**  
All project deliverables were compiled for final evaluation.

---

## 2.4 Project Requirements

### 2.4.1 Software Requirement

The software requirements for developing and demonstrating QDTS are as follows:

- Microsoft Windows 10/11
- Visual Studio Code / Cursor IDE
- Node.js and npm
- React
- Vite
- Tailwind CSS
- Express.js
- PostgreSQL
- pgAdmin / DBeaver
- Git / GitHub
- Google Chrome
- Postman / Thunder Client
- Draw.io / diagrams.net
- Microsoft Word

These tools support coding, database management, API testing, diagram creation, version control, and report preparation.

### 2.4.2 Hardware Requirement

The hardware requirements for development and prototype demonstration are:

- Laptop or desktop computer
- Intel Core i5 processor or equivalent
- Minimum 8 GB RAM
- Minimum 256 GB storage
- Internet connection for literature access, repository work, and reference materials
- Localhost demo environment for prototype execution

The prototype runs locally using:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

External hosting is not required for PSM prototype demonstration.

### 2.4.3 Other Requirements

Other requirements for completing the project include:

- Kak Norie Google Form questionnaire response (*Kak Norie Quality Defect Tracking.csv*) — **Appendix B**
- WhatsApp communication evidence with the manager (Nazhif) — **Appendix C**
- Sample product, batch, and defect data for demonstration
- Supervisor feedback and guidance
- Testing and demo environment
- Documentation and diagram tools
- PSM appendices for Gantt chart, requirement gathering evidence, and screenshots

---

## 2.5 Project Schedule and Milestones

Table 2.6 presents the **planned project schedule** for April to June 2026. It follows the SDLC phases described in Section 2.3 and is intended as a milestone plan for the PSM period, not a claim that every phase was completed exactly on the dates shown unless supported by Appendix A or project logs.

**Table 2.6: Planned project schedule and milestones**

| Phase | Activity | Duration | Output |
|-------|----------|----------|--------|
| 1 | Requirement gathering (WhatsApp + Google Form) | 2 weeks | Confirmed problem list and initial requirements |
| 2 | Literature review | 2 weeks | Literature summary and requirement themes |
| 3 | System analysis | 2 weeks | Requirement specification and as-is/to-be analysis |
| 4 | System design | 2 weeks | Architecture, ERD, UI, and workflow design |
| 5 | System development | 5 weeks | Working QDTS prototype |
| 6 | Testing | 2 weeks | Test results and demo verification |
| 7 | Documentation | 2 weeks | DEMO.md, diagrams, screenshots, report drafts |
| 8 | Final submission | 1 week | Final report and presentation package |

**Total planned duration:** 18 weeks (April–June 2026)

A detailed planned Gantt chart is presented in **Appendix A**.

---

## 2.6 Conclusion

This chapter established the **research and development framework** for QDTS. It adapted Bharosa et al.’s three-step logic using literature review, Kak Norie case investigation, and primary data collection beginning with WhatsApp communication (Appendix C) and continuing with a structured Google Form questionnaire (Appendix B).

From the literature, seven themes were mapped to QDTS design implications (Table 2.1). Primary data summarised the as-is manual process without repeating Chapter 1 problem statements (Table 2.2). Technique comparison showed that a web-based three-tier QDTS is the most suitable option for a three-person SME, while advanced automation remains out of scope as stated in Chapter 1.4 (Table 2.4).

The chapter also documented the modified waterfall SDLC with OOAD (Table 2.5), software/hardware/other requirements, and the planned April–June 2026 schedule (Table 2.6). Chapter 3 will translate these findings into formal system analysis and confirmed requirements.

---

## REFERENCES USED IN CHAPTER 2

All entries below were verified against Crossref (June 2026) or the ISCRAM Digital Library. DOIs resolve to the stated title and authors.

Bharosa, N., van Zanten, B., Appelman, J. and Zuurmond, A. (2009) 'Identifying and confirming information and system quality requirements for multi-agency disaster management', in *Proceedings of the 6th International Conference on Information Systems for Crisis Response and Management (ISCRAM 2009): Boundary Spanning Initiatives and New Perspectives*, Gothenburg, Sweden, 10–13 May. Available at: https://idl.iscram.org/show.php?record=891 (Accessed: 17 June 2026).

Kak Norie (2026) *Quality defect tracking questionnaire response (Google Form)*. Respondent: Nazhif (Manager). Available at: *Kak Norie Quality Defect Tracking.csv* (Accessed: 11 June 2026).

Li, J., Xu, Y., Wang, H., Swatdikun, T., Li, X. and Chen, J. (2025) 'The development of quality management information system under quality 4.0 era: a review', in *2025 8th International Symposium on Big Data and Applied Statistics (ISBDAS)*, pp. 473–478. DOI: 10.1109/ISBDAS64762.2025.11116953.

Lisitsyn, A.B., Nikitina, M.A. and Chernukha, I.M. (2021) 'Product quality and safety management in large-scale systems', in *2021 14th International Conference on Management of Large-Scale System Development (MLSD)*. DOI: 10.1109/MLSD52249.2021.9600217.

Puech, L., Dupuis, A., Dadouchi, C. and Pellerin, R. (2024) 'Applied data analytics approach for defect root causes analysis in manufacturing: the case of multi-product assembly lines', in *2024 IEEE 48th Annual Computers, Software, and Applications Conference (COMPSAC)*. DOI: 10.1109/COMPSAC61105.2024.00044.

Barakat, O., Elassimi, T. and Bouhsain, I. (2025) 'Digital cost of quality management in Moroccan agri-food firms: adoption insights and benefits', in *2025 IEEE International Conference on Advanced Technologies in Supply Chain Management (ATSCM)*. DOI: 10.1109/ATSCM67505.2025.11473424.

Mariammal, G. and Suresh, S. (2025) 'Real-time expiry alert system for safer retail using barcode and QR code recognition', in *2025 6th International Conference on Intelligent Communication Technologies and Virtual Mobile Networks (ICICV)*. DOI: 10.1109/ICICV64824.2025.11085659.

Grino, F.M., Abellar, J.P., Cagmat, R. and Lasco, C.F. (2025) 'A secure role-based access control framework for employee plantilla management system in the local government unit of Magallanes, Agusan del Norte', in *2025 International Conference on Emerging Technologies and Innovation for Sustainability (EmergIN)*. DOI: 10.1109/EmergIN67762.2025.11450678.

Yin, X. and Wang, B. (2022) 'Edible fungi quality and safety traceability management system', in *2022 Global Conference on Robotics, Artificial Intelligence and Information Technology (GCRAIT)*. DOI: 10.1109/GCRAIT55928.2022.00177.

Bhimanpallewar, R., Jagtap, D., Raut, V. and Tonge, S. (2024) 'OEE dashboard using data analytics', in *2024 4th Asian Conference on Innovation in Technology (ASIANCON)*. DOI: 10.1109/ASIANCON62057.2024.10838144.

Maryadi, D., Singgih, M.L. and Dewi, D.S. (2025) 'Integrating Lean Six Sigma indicators into business intelligence systems: a systematic review across sectors and metrics', in *2025 9th International Conference on Information Technology, Information Systems and Electrical Engineering (ICITISEE)*. DOI: 10.1109/ICITISEE68184.2025.11355031.

Abu Mangshor, N.N., Ahmad Tahiruddin, A.M., Aminuddin, R., Abdul Jalil, U.M., Sheng, C.C. and Ibrahim, S. (2025) 'Application of lightweight YOLOv8 variants for defect detection and classification in canned food packaging', in *2025 IEEE 16th Control and System Graduate Research Colloquium (ICSGRC)*, pp. 149–154. DOI: 10.1109/ICSGRC65918.2025.11159707.

Xu, Y., He, P., Sheng, P. and Li, N. (2024) 'Design and implementation of a blockchain-based food traceability system', in *2024 4th International Symposium on Computer Technology and Information Science (ISCTIS)*. DOI: 10.1109/ISCTIS63324.2024.10698760.

Chen, G.-H., Liu, Y. and Yang, J. (2024) 'Food safety traceability technology and application based on blockchain', in *2024 International Conference on Industrial IoT, Big Data and Supply Chain (IIoTBDSC)*. DOI: 10.1109/IIoTBDSC64371.2024.00087.

Gowrishankar, V., Veena, P., Ponmurugan, P., Annapoorani, B.T., Vijayakumar, P. and Siva Ramkumar, M. (2023) 'Edge computing enabled smart warehouse management system for food processing industries', in *2023 14th International Conference on Computing Communication and Networking Technologies (ICCCNT)*, pp. 1–7. DOI: 10.1109/ICCCNT56998.2023.10308398.

Ibrahim, S.P., Karthikeyan, L., Bhoomika, P., Tejaswi, K., Khande, L.S. and Vemishetti, N.S. (2024) 'Automating nutritional claim verification: the role of OCR and machine learning in enhancing food label transparency', in *2024 International Conference on IoT Based Control Networks and Intelligent Systems (ICICNIS)*, pp. 1164–1171. DOI: 10.1109/ICICNIS64247.2024.10823177.

Dhelia, A., Chordia, S. and B, K. (2024) 'YOLO-based food damage detection: an automated approach for quality control in food industry', in *2024 8th International Conference on I-SMAC (IoT in Social, Mobile, Analytics and Cloud) (I-SMAC)*. DOI: 10.1109/I-SMAC61858.2024.10714664.
