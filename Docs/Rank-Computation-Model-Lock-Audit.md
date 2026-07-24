# Rank-Computation-Model Lock Audit
## Governance Audit — Status Verification and Lock Readiness
### June 2026

**Status:** LOCKED

**Type:** Governance/Status Audit (reference document, not a screen specification or architecture revision)

**Date:** June 2026

**Scope:** Rank-Computation-Model.md and every locked document that cites it as authority.

**Authority Chain:** This document audits the following sources and changes none of them:
- Rank-Computation-Model.md (currently header-marked DRAFT — the subject of this audit)
- Rank-System-Architecture.md v1.0 (LOCKED)
- Rank-Calibration-Decisions.md v1.0 (LOCKED)
- Rank-Implementation-Readiness-Review.md (COMPLETE — itself contains a prior lock recommendation this audit verifies against current state)
- P-2-Progress-Hub-Spec.md v1.0 (LOCKED)
- O-2-Amendment-001-Athlete-Type-Declaration.md (LOCKED)
- P-1-Amendment-002-Athlete-Type-Editability.md (LOCKED)
- Profile-Progress-Ecosystem-Audit.md (LOCKED)

**Constraint compliance:** This audit does not redesign rank architecture, rank computation, or calibration decisions, and does not create new rank systems. It verifies status and dependency consistency only, working directly from document contents (Rank-Computation-Model.md read in full — 3,458 lines — not summarized from memory) and cross-checked against every downstream citation.

---

## Section 1 — Rank-Computation-Model Status Review

**Current header status (line 4):** `**Status:** DRAFT — Session 5`

**Current footer status (lines 3450–3458):**
```
## Amendment Log
*None. All decisions in this document are draft-status pending user review and lock.*
---
*Rank Computation Model — Sessions 1–5 DRAFT + Audit (CD-1, CD-2 Applied)*
*June 2026*
*Computational Authority for Rank-System-Architecture.md v1.0 (LOCKED)*
```

Header and footer are **consistent with each other** (both say DRAFT) — unlike the P-2/P-4 header/footer mismatches found in earlier audits, this is not a mismatch. The document is genuinely, consistently marked DRAFT throughout. The question is whether that's still accurate.

**Decision records:** 28 numbered architectural decisions (D-RCM-1 through D-RCM-28) are made across five sessions, each with a "Recommendation" and "Downstream Impacts" subsection — not tentative language, but resolved-decision language throughout.

**TBD resolution status (16 original TBDs from Rank-System-Architecture.md):**

| TBD | Topic | Status |
|---|---|---|
| TBD-1 | Evaluation trigger events | Resolved in RCM §19 (Session 4) |
| TBD-2 | Sub-tier surfacing mechanism | Correctly out of RCM's scope — deferred to P-2; **resolved by P-2-Progress-Hub-Spec.md (LOCKED)** |
| TBD-3 | Sub-tier thresholds | Resolved in RCM §13 |
| TBD-4 | Family promotion thresholds | Resolved in RCM §14 |
| TBD-5 | Promotion spacing values | Resolved in RCM §15 |
| TBD-6 | Active week/month definitions | Resolved in RCM §2 |
| TBD-7 | Meaningful work definition | Resolved in RCM §3 |
| TBD-8 | Personal Improvement metrics by type | Resolved in RCM §9 (declaration mechanism sub-piece deferred to O-2, **resolved by O-2-Amendment-001 (LOCKED)**) |
| TBD-9 | Import history treatment | Resolved via RSA Amendment 001 (R-D46) — not RCM's concern |
| TBD-10 | Recent engagement definition | Resolved in RCM §10 |
| TBD-11 | Legacy display format | **Genuinely still open** — UI/display scope, explicitly low-priority (Legacy is the rarest, final rank) |
| TBD-12 | Rank data model schema | Resolved in RCM §23 (Session 5) |
| TBD-13 | Chapter progression category | Resolved in RCM §4 |
| TBD-14 | Longevity secondary category | Resolved in RCM §5 |
| TBD-15 | Goal participation definition | Resolved in RCM §6 |
| TBD-16 | Rank Evaluation Service architecture | Resolved in RCM §20 (Session 4) |

**14 of 16 TBDs are resolved within RCM itself. The remaining 2 are correctly out of scope** — TBD-2 was deferred by design and has since been resolved by a sibling locked document; TBD-11 is a minor, far-future UI detail.

**Open Q-items carried in RCM's own "Open Questions" sections (Q1 through Q23):**

| Q-Item(s) | Status |
|---|---|
| Q1, Q2, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14 | **All resolved** — Rank-Calibration-Decisions.md (LOCKED) closing line states explicitly: *"Resolves: Q1, Q2, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14 from Rank-Computation-Model.md"* |
| Q15, Q16 | Resolved within RCM Session 5 itself (§24.1 — "Pre-decisions applied") |
| Q18 | Resolved — was a scoping question for what Session 5 needed; Session 5 occurred using the Q8/Q15/Q16 resolutions |
| Q3, Q4, Q5, Q6 | **Genuinely open** — narrow, explicitly deferred to the import spec workstream (Q3, Q4), post-MVP (Q5), and display implementation (Q6). Already characterized as non-blocking by Rank-Calibration-Decisions.md itself at the time it locked. |
| Q17, Q19 | **Genuinely open** — background queue processing strategy and error-recovery strategy. RCM's own Session 5 report states explicitly: *"The schema is neutral to this decision"* (§24.5) — these do not affect the computational model that's already locked into the data schema. |
| Q20, Q21, Q22 | **Genuinely open** — schema migration strategy and storage optimization (JSON vs. normalized sub-table). RCM's own text states: *"Can be deferred to implementation; the semantic contract is stable either way."* |
| Q23 | RCM's own self-assessment question: *"Whether to continue in this document with a Session 6... or to close this document as computationally complete."* This question, asked by the document about itself, is the clearest evidence that the document's own authorship process recognized it might already be done. |

**Lock status consistency:** Internally consistent (header matches footer), but **externally inconsistent** — five separately LOCKED documents cite Rank-Computation-Model.md as already LOCKED (Section 2 below), while it has never actually been re-labeled.

---

## Section 2 — Dependency Review

Every document citing Rank-Computation-Model, with exact citation text:

| Document | Status | Citation |
|---|---|---|
| Rank-Calibration-Decisions.md | LOCKED | *"Rank-Computation-Model.md Sessions 1–5 (LOCKED v1.0 — computational authority)"* |
| P-2-Progress-Hub-Spec.md | LOCKED | *"Rank-Computation-Model.md Sessions 1–5 (LOCKED v1.0 — computational authority)"* (header) and *"(LOCKED)"* (footer) |
| Profile-Progress-Ecosystem-Audit.md | LOCKED | *"Rank-Computation-Model.md Sessions 1–5 (LOCKED)"* |
| O-2-Amendment-001-Athlete-Type-Declaration.md | LOCKED | *"Rank-Computation-Model.md Sessions 1–5 (LOCKED — Personal Improvement evaluation model)"* |
| P-1-Amendment-002-Athlete-Type-Editability.md | LOCKED | *"Rank-Computation-Model.md Sessions 1–5 (LOCKED — Personal Improvement evaluation model)"* |
| Rank-System-Architecture.md | LOCKED | References RCM as a forward dependency ("not yet authored" at RSA's own time of writing) — historically accurate framing, not a current-state claim, not a problem |
| Rank-Implementation-Readiness-Review.md | COMPLETE | Honestly labels it *"Rank-Computation-Model.md Sessions 1–3 (DRAFT)"* — but this document is itself frozen at RCM's **Session 3** state, predating Sessions 4 and 5 |

**Finding D-1:** Five separately-locked documents (Rank-Calibration-Decisions.md, P-2-Progress-Hub-Spec.md, Profile-Progress-Ecosystem-Audit.md, O-2-Amendment-001, P-1-Amendment-002) all assert Rank-Computation-Model.md is "LOCKED v1.0," when its own header says DRAFT. This is the same documentation-lag pattern found three times in the prior Global Architecture Status Audit research (P-6, P-4, L-1) — but here it runs in the **opposite direction**: instead of an original document failing to reflect a later resolution, five *downstream* documents got ahead of an *upstream* document's own status field.

**Do any of these five documents assume content that isn't actually resolved?** No. Each citation references content that genuinely is resolved within RCM (the threshold tables, the data model schema, the Personal Improvement structural model) or correctly defers a sub-piece to itself (e.g., Calibration Decisions filling in RCM's placeholder threshold values — the intended division of labor, now complete on both sides). No downstream document is building on a foundation that doesn't exist.

**Rank-Implementation-Readiness-Review.md is the most important document in this review** — not because it's wrong, but because it already performed almost this exact audit, at an earlier point in RCM's life (Session 3), and already gave a recommendation.

---

## Section 3 — Open Issue Inventory

| # | Description | Severity | Blocking? | Impacted Documents |
|---|---|---|---|---|
| 1 | **Administrative status never updated.** RCM's header/footer still say DRAFT despite Sessions 4–5 resolving the remaining TBDs, and despite Rank-Calibration-Decisions.md resolving 10 of its Q-items. | High (governance, not architecture) | **Blocks nothing computationally** — but blocks accurate status tracking and creates the five-document inconsistency in Section 2 | All five citing documents; engineering, who would reasonably distrust a "DRAFT" label on a document everything else calls "LOCKED" |
| 2 | TBD-11 (Legacy display format) | Low | No — Legacy is the rarest, final rank; explicitly a future UI decision | M-1 (eventually) |
| 3 | Q3, Q4 (import session duration, Goal Participation import treatment) | Medium | No — explicitly deferred to the import spec workstream, already characterized this way by Rank-Calibration-Decisions.md | Import architecture (future) |
| 4 | Q5 (Goal Participation achievement amplification) | Low | No — explicitly post-MVP | None currently |
| 5 | Q6 (Longevity signal display unit) | Medium | No — display/implementation choice, not computational | Display implementation (future) |
| 6 | Q17, Q19 (background queue processing, error recovery strategy) | Medium | No — RCM's own analysis states the schema (already locked) is neutral to both | Rank Evaluation Service implementation (future) |
| 7 | Q20, Q21, Q22 (migration strategy, storage optimization) | Low | No — explicitly implementation-layer; RCM states the semantic contract is stable regardless of which option is chosen | Backend implementation (future) |

**No item in this inventory blocks Rank-Computation-Model's own lock.** Item 1 is the only one with any real weight, and it's a documentation/governance gap, not a computational one.

---

## Section 4 — Lock Readiness Assessment

**Is the document complete?** Yes, at the computational/product-decision level. 14 of 16 original TBDs are resolved within the document itself; the 2 deferred TBDs are correctly out of scope and have since been resolved elsewhere (TBD-2) or remain a minor, explicitly low-priority future item (TBD-11). 10 of its own carried-forward Q-items are resolved by a sibling locked document (Rank-Calibration-Decisions.md). The remaining open items (Q3–Q6, Q17, Q19–Q22) are uniformly characterized — by the document's own text — as non-computational, deferred, or implementation-layer.

**Is the document internally consistent?** Yes. Each session's refinement report cross-checks new decisions against prior ones (e.g., §24.2's "Structural Coherence Check" maps every prior decision to a schema field). No contradiction was found across Sessions 1–5.

**Is the document already functioning as authority?** Yes — unambiguously. Five separately-locked documents already cite it as locked computational authority and build directly on its content (the threshold tables, the Personal Improvement model, the data model schema). It has been functioning as authoritative for some time; only its own label hasn't caught up.

**Can it be locked immediately?** The content is ready. The administrative artifacts are not: the Amendment Log still reads *"None. All decisions in this document are draft-status pending user review and lock"* — a sentence that would become actively misleading the moment the header changes, since substantial resolution history exists and should be recorded. Locking the header alone, without reconciling the Amendment Log and the still-open "Open Questions for Session 6" framing (which implies an active, pending session that the document's own Q23 already questions the need for), would just relocate the documentation-lag problem rather than resolve it.

---

## Section 5 — Recommended Action

**B. Small amendment required before lock.**

**Justification:** This is not "A. Lock immediately" because the document's closing Amendment Log is currently factually wrong about its own resolution history, and locking without correcting it would lock in a false statement. It is not "C. Additional architecture work required" because no genuine computational, product, or calibration gap was found anywhere in this audit — every remaining open item is explicitly characterized, in the document's own words, as non-blocking, deferred, or implementation-layer.

**The amendment is administrative, not architectural:**
1. Update the header from `DRAFT — Session 5` to `LOCKED v1.0`.
2. Rewrite the Amendment Log to state what actually happened: Sessions 1–5 resolved 14 of 16 TBDs; Rank-Calibration-Decisions.md (LOCKED) resolved Q1, Q2, Q7–Q14; TBD-2 was resolved by P-2-Progress-Hub-Spec.md (LOCKED); TBD-11 and Q3–Q6/Q17/Q19–Q22 are carried forward as explicitly non-blocking items for their respective future workstreams.
3. Re-title Section 25 from "Open Questions for Session 6" to something that doesn't imply an active, pending session — Q23 already raises the question of whether a Session 6 is even needed; the amendment should answer it rather than leave it open indefinitely.

This recommendation is identical in substance to the "LOCK with conditions" recommendation Rank-Implementation-Readiness-Review.md already gave at Session 3 — this audit confirms those conditions have since been substantively met by Sessions 4–5 and by Rank-Calibration-Decisions.md, and that closing the administrative gap is now overdue rather than premature. No part of this recommendation touches rank architecture, rank computation, or calibration decisions themselves.

---

## Final Question

**Should Rank-Computation-Model.md be considered MVP-blocking, and can it be locked today?**

**Not MVP-blocking.** Every downstream document that depends on it already treats it as authoritative and has built correctly on its actual content — the DRAFT label has not stopped the rest of the project from progressing, because nothing genuinely unresolved sits between this document and MVP.

**Can it be locked today?** Yes, once the small administrative amendment in Section 5 is made. The content has been ready since Session 5; what's outstanding is reconciling the document's own header and Amendment Log with the resolution work that already happened — the same gap Rank-Implementation-Readiness-Review.md flagged at Session 3 and that was never closed out.

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*Rank-Computation-Model Lock Audit*
*Governance Audit — Status Verification and Lock Readiness*
*June 2026*
*Status: LOCKED*
