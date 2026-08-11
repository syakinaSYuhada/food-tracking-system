# PSM Word Report — Full Improvement Guide (Ch2–Ch4)

Use this in **`report fyp 1.docx`**. Paste/replace manually. All claims below match the **implemented prototype** (verified against `schema.sql`, controllers, and React pages).

---

## A. DELETE or FIX — Inaccurate / Exaggerated Claims

| If your report says… | Fix to… |
|----------------------|---------|
| “System generates PDF reports” | “CSV export and **browser print / save-as-PDF**” |
| “Email/SMS notifications” | “**In-app** notification bell only (refreshed on page load)” |
| “Real-time push notifications” | “Client-side alerts from REST data” |
| “Complete audit trail of all changes” | “**Workflow activity log** (13 action types); product/batch CRUD and evidence upload are **not** logged” |
| “Full user management (edit/deactivate/delete)” | “Manager can **list and add** users only” |
| “Workers cannot access product/batch data” | “UI hides manager pages; **read API** for products/batches still available to workers” |
| “Worker submits root cause when reporting defect” | “Worker submits **suspected** root cause **after** being assigned a corrective action” |
| “Defect auto-enters Under Review on submit” | “Status stays **New** until manager opens defect / starts review” |
| “Sequential batch numbers (B-001, B-002)” | “Auto format **`{product_code}-B-{YYYYMMDD}`** from retort date” |
| “Full CAPA / enterprise QMS / ISO platform” | “**Simplified CAPA-oriented** SME prototype” |
| “Twelve-month shelf life for all products” | “Shelf life stored **per product** in master data” |
| “mapping_status review workflow” | **Delete** — column exists but app always sets `mapped` |
| “Evidence is mock/placeholder” | **Delete** — real Multer upload to disk |
| “Interview response” (for Google Form) | “**Questionnaire response** (Google Form)” |

---

## B. Caption Format (all chapters)

**Rule:** `Table X.Y: Title` and `Figure X.Y: Title` — **no space** before number (`Table 2.1:` not `Table 2. 1:`).

### Chapter 3 — correct figure order

| Figure | Caption |
|--------|---------|
| 3.1 | Current Defect Tracking Activity Flow |
| 3.2 | Current Defect Handling Sequence Diagram |
| 3.3 | Proposed QDTS Workflow Activity |
| 3.4 | QDTS Use Case Diagram |

**Delete** duplicate “Figure 3.1” on sequence diagram. **Delete** author note: *“Recommended diagrams for this section…”*

### Chapter 4 — correct figure order (match your Word body)

| Figure | Caption |
|--------|---------|
| 4.1 | Three-Tier System Architecture |
| 4.2 | High-Level Class Diagram of QDTS (Static View) |
| 4.3 | Sequence Diagram of Defect Lifecycle (Dynamic View) |
| 4.4 | Navigation Flow |
| 4.5 | Login Form Interface |
| 4.6 | Report Defect Form Interface |
| 4.7 | Manager Dashboard Interface |
| 4.8 | Defect Details Interface |
| 4.9 | Core Entity Relationship Diagram (ERD) |
| 4.10 | Defect Lifecycle Activity Flow |

Update **List of Figures** and in-text references to match.

---

## C. Chapter 2 — Paste: Critical Literature (replace §2.2.1 opening + Table 2.1 intro)

**Before Table 2.1, paste:**

> The literature review in this project does not treat each paper as direct proof that QDTS must copy every feature. Instead, each source is evaluated for **relevance**, **limitations**, and **fit for a three-person SME**. Li et al. (2025) describe Quality 4.0 platforms for larger digital quality environments; QDTS adopts only the practical ideas of structured records and dashboards, not full enterprise integration. Lisitsyn et al. (2021) discuss large-scale food safety systems with formal CAPA documentation; Kak Norie needs a **lighter** workflow. Puech et al. (2024) show that structured defect data improves root cause analysis, but their study targets multi-product assembly lines with analytics infrastructure beyond this project scope. Barakat et al. (2025) focus on digital cost-of-quality in Moroccan agri-food firms; the loss-reporting concept is adapted, not the full cost-of-quality framework. Yin and Wang (2022) and Mariammal and Suresh (2025) come from different domains (fungi traceability and retail barcode expiry alerts); QDTS uses their **concepts** for batch linkage and expiry comparison only. Grino and Lasco (2025) implement RBAC in a government HR system; QDTS applies the **role-separation idea** with only two roles.

**After Table 2.1, paste:**

> Table 2.1 shows that literature supports **design direction**, not automatic feature inclusion. Features were included only when confirmed by Kak Norie primary data (Appendices B and C) and when feasible within prototype scope.

---

## D. Chapter 2 — Paste: Existing Systems Discussion (replace §2.2.2 B prose)

**Manual paper records**  
Paper notebooks are low cost and familiar to Kak Norie (*“dalam buku/kertas”*). However, they cannot enforce workflow, cannot link a defect to batch expiry automatically, and cannot produce filtered management reports. Search depends on manual reading, which conflicts with the manager’s request for easier retrieval of old records.

**Spreadsheet / Excel**  
Excel improves sorting and simple calculations compared with paper. For Kak Norie, a spreadsheet could list defects and losses in columns. Still, it lacks enforced roles (manager vs worker), has weak concurrent editing control for three staff, and does not maintain a proper relational link between product master, batch dates, corrective action status, and root cause history. Formula errors and version duplication are also common in informal SME use.

**Google Form only**  
Google Form was useful for **collecting** requirement data (Appendix B) but is not an operational defect system. It captures one-time answers, not live workflow states, due dates, verification steps, or batch-level expiry logic. It cannot replace day-to-day defect tracking after implementation.

**CAPA / QMS systems**  
Enterprise CAPA platforms support investigation, verification, audit trails, and compliance documentation (Lisitsyn et al., 2021). They are suitable for regulated large operations but require configuration, training, and cost that are disproportionate for a three-person retort kitchen. Kak Norie needs corrective action monitoring, not a full compliance suite.

**ERP systems**  
ERP integrates inventory, production, finance, and quality. For Kak Norie, ERP would be expensive, slow to configure, and broader than the immediate problem (defect recording and follow-up). The Google Form and WhatsApp findings prioritised organised defect records and batch checking, not full enterprise resource planning.

**Manufacturing defect tracking systems**  
This category is closest to QDTS: defect logging, action assignment, analytics, and traceability. Commercial MES/QMS modules often assume larger teams and shop-floor integration. QDTS implements a **subset** of this category at web-app scale.

**Traceability systems**  
Traceability links batches to incidents (Yin and Wang, 2022). QDTS supports batch-to-defect linkage and expiry audit reports, but batch records are **entered manually** by the manager; there is no automatic capture from production machines.

---

## E. Chapter 2 — NEW Table 2.4 (replace existing comparison table)

**Before table, paste:**

> Table 2.4 compares practical alternatives for Kak Norie. The comparison focuses on **operational suitability**, not maximum feature count.

**Table 2.4: Comparison of quality recording alternatives for Kak Norie**

| Criterion | Manual paper | Excel / spreadsheet | Google Form only | CAPA / QMS | ERP | **QDTS (selected)** |
|-----------|--------------|---------------------|------------------|------------|-----|---------------------|
| Initial cost | Very low | Low | Low | High | Very high | Low (prototype) |
| Training effort | Low | Medium | Low | High | High | Medium |
| Role separation (manager/worker) | Informal | Weak | None | Strong | Strong | **Implemented (2 roles)** |
| Workflow status tracking | None | Manual columns | None | Strong | Strong | **Implemented** |
| Batch + expiry linkage | Manual | Manual setup | Not designed for operations | Yes | Yes | **Yes (manual batch entry)** |
| Expiry mismatch alert | None | Formula-based only | None | Possible | Possible | **Implemented** |
| Corrective action verify/reject | Informal | Informal | None | Strong | Strong | **Implemented** |
| Root cause history | Paper notes | Columns | One-time survey | Strong | Strong | **1:1 investigation record** |
| Reports / CSV export | None | Basic | Response export only | Strong | Strong | **10 report tabs + CSV** |
| Audit trail | Weak | Weak | None | Strong | Strong | **Workflow activity log** |
| Fit for 3-person SME | Familiar but limited | Possible but fragile | Wrong tool type | Over-scoped | Over-scoped | **Best fit for scope** |

**After table, paste:**

> Table 2.4 compares six operational alternatives against eleven suitability criteria. The alternatives excluded from this matrix (AI inspection, OCR, blockchain) are out of scope as stated in Chapter 1.4.
>
> QDTS is selected because it is the only option that combines structured defect workflow, batch traceability, role-based access, and reporting without ERP-level cost. Section 2.2.2 B already describes each alternative in narrative form; Table 2.4 provides the structured comparison that supports the selection.

**Do not add Table 2.4a** — the numbered summary list is redundant with §2.2.2 B prose and the matrix above.

---

## F. Chapter 2 — Paste: Why QDTS suits Kak Norie (add after Selected technique bullets)

> Kak Norie operates with one manager and two workers handling multiple production tasks. The primary data showed that the manager’s priority is **organised defect records**, **batch checking**, **loss recording**, and **corrective action follow-up**, not advanced automation. QDTS matches this because it digitises the existing notebook process without forcing ERP adoption. It supports the most common reported defect context (expiry printing and sealing issues) through stage-based reporting, expiry mismatch flags, and root cause confirmation. The prototype runs on localhost for academic demonstration, which is acceptable for FYP scope while still showing an end-to-end digital workflow.

---

## G. Chapter 3 — Key fixes in Word

### Table / figure intro-outro templates

Use this pattern **everywhere**:

**Before:** “Table 3.1 summarises how each Chapter 1 problem is caused by the manual process and addressed by the implemented QDTS prototype.”

**After:** “Table 3.1 confirms that each problem statement in Chapter 1 has a matching function in the running system, not only a planned feature.”

Apply same pattern to Tables 3.2–3.4 and Figures 3.1–3.4.

### FR-31 fix (root cause)

**Find:** worker can submit suspected root cause without qualification  
**Replace with:** “Worker **with assigned corrective action access** submits suspected root cause via `PATCH /root-causes/defects/:id/suspect`.”

### Activity log scope (NFR-14)

Add: “Logs **workflow events only** (report, review, assign, complete, verify, reject, cancel, root cause, close). Does not log product edits, batch edits, or evidence uploads.”

### Table 3.3 count

Report has **39 functional requirements (FR-01 to FR-39)** — ensure Word matches `PSM_CHAPTER_3.md`.

---

## H. Chapter 4 — Intro/outro for every table & figure

Copy this block pattern for each item (customise title):

**Before Table 4.X:**  
> Table 4.X presents [what]. It is based on the implemented [files/modules].

**After Table 4.X:**  
> In summary, Table 4.X shows that [one sentence linking back to Kak Norie need].

**Before Figure 4.X:**  
> Figure 4.X illustrates [what]. This supports the design described in Section [x.x].

**After Figure 4.X:**  
> Figure 4.X therefore confirms that [one sentence — e.g. manager and worker use separate navigation paths].

### Minimum screenshots for design evidence (capture if missing)

| Figure | Screen | Login as |
|--------|--------|----------|
| 4.5 | Login page | — |
| 4.6 | Worker Report Defect (step 1–2) | siti_aminah |
| 4.7 | Manager dashboard KPIs | nazhif |
| 4.8 | Defect Details (Actions + Root Cause tabs) | nazhif |
| 4.9 | ERD diagram | export PNG |
| 4.10 | Lifecycle activity diagram | export PNG |

**Optional but strengthens Ch4:** Assign CA form, Reports Loss tab, Activity Log, Batch Details with expiry mismatch badge.

Run: `cd frontend && npm run screenshots` (backend + frontend must be running).

---

## I. Diagrams — Keep vs Redraw

| Diagram | Action |
|---------|--------|
| Figure 3.1 Activity (as-is) | **Keep** `figure-3-1-current-manual-defect-handling-activity.png` |
| Figure 3.2 Sequence (as-is) | **Redraw** if still duplicate numbered 3.1 — export from `figure-3-2-current-manual-defect-handling-sequence.svg` |
| Figure 3.3 Proposed workflow | **Keep** `figure-3-4-proposed-qdts-workflow-activity.svg` (renumber to 3.3) |
| Figure 3.4 Use case | **Keep** `use-case-qdts.svg` |
| Figure 4.1 Architecture | **Keep** |
| Figure 4.2 Class diagram | **Keep** — verify labels match 8 core classes |
| Figure 4.3 Sequence | **Redraw if needed** — ensure Worker suspect RC happens **after** CA assign, not at report |
| Figure 4.4 Navigation | **Keep** |
| Figure 4.9 ERD | **Keep** — must show Defect → Root Cause **1:1** |
| Figure 4.10 Lifecycle | **Keep** — add note: close requires Confirmed RC + verified CAs |

**Do not use in report body:** Mermaid-only drafts unless exported to PNG.

---

## J. Contents / List of Tables / List of Figures checklist

After all edits:

1. Update **Contents** page numbers (Word → Update entire table).
2. Update **List of Tables** — Ch4 now has Tables 4.1–4.12 (+ mapping example if you add Table 4.9 Example Mapping — renumber API table to 4.10+).
3. Update **List of Figures** — Ch3: 4 figures; Ch4: 10 figures; Appendices A–C figures.
4. Search document for old captions: `Figure 4.15`, duplicate `Figure 3.1`, `Figure 4.7: Defect Lifecycle`.

---

## K. Chapter 1.7 — complete cut-off sentence

**Replace ending:**  
> “…The next chapter discusses the literature review, related systems, project methodology, and the planned development approach for QDTS.”

---

*End of guide. Source chapters: `PSM_CHAPTER_2.md`, `PSM_CHAPTER_3.md`, `PSM_CHAPTER_4.md`.*
