# Rank-Computation-Model Amendment 001
## Administrative Lock Amendment
### June 2026

**Status:** LOCKED

**Type:** Administrative/Governance Amendment (no computational, calibration, threshold, or schema changes)

**Date:** June 2026

**Amends:** Rank-Computation-Model.md (currently header-marked DRAFT — this amendment locks it)

**Authority Chain:**
- Rank-Computation-Model-Lock-Audit.md (LOCKED) — the audit that determined this amendment's exact scope and recommended Action B
- Rank-Calibration-Decisions.md v1.0 (LOCKED) — resolved Q1, Q2, Q7–Q14
- P-2-Progress-Hub-Spec.md v1.0 (LOCKED) — resolved TBD-2
- Rank-Implementation-Readiness-Review.md (COMPLETE) — originally specified the three lock conditions this amendment now satisfies

**Downstream Dependents:** Every document that already cites Rank-Computation-Model.md as "LOCKED v1.0" (Rank-Calibration-Decisions.md, P-2-Progress-Hub-Spec.md, O-2-Amendment-001, P-1-Amendment-002, Profile-Progress-Ecosystem-Audit.md) — this amendment makes those citations accurate rather than premature.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Lock Recommendation

**Locked.** Per Rank-Computation-Model-Lock-Audit.md, no genuine computational, product, or calibration gap exists anywhere in Rank-Computation-Model.md. Every remaining open item (TBD-11, Q3–Q6, Q17, Q19–Q22) is explicitly characterized — in the source document's own words — as non-blocking, deferred, or implementation-layer. This amendment performs exactly the administrative correction the lock audit specified: update the status, correct the Amendment Log to reflect actual resolution history, and reconcile the "Open Questions for Session 6" section with the fact that no Session 6 is planned.

This amendment changes no rank computation, no threshold, no calibration decision, and no schema. Sections 1 through 24 of Rank-Computation-Model.md (every TBD resolution, every decision record D-RCM-1 through D-RCM-28, every threshold table) are unmodified.

---

## Section 2 — Exact Document Changes Required

Six precise edits to Rank-Computation-Model.md. Nothing else in the document changes.

### 2.1 Header, line 2

**Before:**
```
## Sessions 1–5 | DRAFT — June 2026
```

**After:**
```
## Sessions 1–5 | LOCKED v1.0 — June 2026
```

### 2.2 Header, line 4

**Before:**
```
**Status:** DRAFT — Session 5
```

**After:**
```
**Status:** LOCKED v1.0
```

### 2.3 Section 25 title (line 3369)

**Before:**
```
## 25. Open Questions for Session 6
```

**After:**
```
## 25. Carried-Forward Items (Non-Blocking)
```

### 2.4 Section 25 introductory line (immediately following the line 3369 title)

**Before:**
```
Q1–Q14 from prior sessions remain open (threshold and definitional questions). Questions specific to post-Session-5 planning begin at Q20.
```

**After:**
```
Of Q1–Q14, only Q3, Q4, Q5, and Q6 remain open — Q1, Q2, Q7 through Q14 were resolved by Rank-Calibration-Decisions.md (LOCKED). The items below (Q3–Q6, plus Q17, Q19–Q22 carried from Sessions 4–5) are not active work items awaiting a future session — they are explicitly non-blocking items, each deferred to the future workstream noted against it. No Session 6 is planned; see the Q23 resolution below.
```

### 2.5 Q23 resolution (appended immediately after the existing Q23 text, before the Amendment Log)

**Add (new text, existing Q23 question text is preserved unchanged above it):**
```
**Resolved by Rank-Computation-Model-Amendment-001.md (June 2026):** Closing as computationally complete. No Session 6 is planned. The computational model reached its natural scope limit at Session 5, as this question itself anticipated. Q3–Q6, Q17, Q19–Q22, and TBD-11 are carried forward as non-blocking items for their respective future workstreams (import spec, display implementation, Rank Evaluation Service implementation, future UI work), not as unfinished business of this document.
```

### 2.6 Amendment Log (full replacement)

**Before:**
```
## Amendment Log

*None. All decisions in this document are draft-status pending user review and lock.*
```

**After:**
```
## Amendment Log

### v1.0 — June 2026 (Lock)

Sessions 1–5 resolved 14 of the 16 TBDs carried from Rank-System-Architecture.md: TBD-1, TBD-3, TBD-4, TBD-5, TBD-6, TBD-7, TBD-8, TBD-9 (via RSA Amendment 001, not this document), TBD-10, TBD-12, TBD-13, TBD-14, TBD-15, TBD-16. TBD-2 (sub-tier surfacing mechanism) was correctly scoped out of this document and resolved by P-2-Progress-Hub-Spec.md (LOCKED). TBD-11 (Legacy display format) remains open as a minor, low-priority future UI decision.

Of the Q-items carried forward within this document: Q1, Q2, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14 were resolved by Rank-Calibration-Decisions.md (LOCKED) — see that document's closing line: "Resolves: Q1, Q2, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14 from Rank-Computation-Model.md." Q15, Q16, and Q18 were resolved within this document during Session 5 (Section 24).

Remaining items — TBD-11, Q3, Q4, Q5, Q6, Q17, Q19, Q20, Q21, Q22 — are carried forward as explicitly non-blocking per Section 25, each deferred to its own future workstream (import spec, display implementation, Rank Evaluation Service implementation, future UI work). None require this document to remain open.

Locked per Rank-Computation-Model-Amendment-001.md (June 2026), following the lock conditions originally specified in Rank-Implementation-Readiness-Review.md and verified against current state by Rank-Computation-Model-Lock-Audit.md.
```

### 2.7 Footer closing line (line 3456)

**Before:**
```
*Rank Computation Model — Sessions 1–5 DRAFT + Audit (CD-1, CD-2 Applied)*
```

**After:**
```
*Rank Computation Model — Sessions 1–5 LOCKED v1.0 (CD-1, CD-2 Applied)*
```

The remaining two footer lines (`*June 2026*` and `*Computational Authority for Rank-System-Architecture.md v1.0 (LOCKED)*`) are already accurate and unchanged.

---

## Section 3 — Validation Checklist (No Computational Behavior Changed)

- [ ] Sections 1–24 of Rank-Computation-Model.md are byte-identical before and after this amendment — no threshold value, decision record (D-RCM-1 through D-RCM-28), table, or recommendation is altered.
- [ ] No TBD resolution (TBD-1 through TBD-16) is reopened, reversed, or modified.
- [ ] No calibration decision from Rank-Calibration-Decisions.md is referenced differently than it already was.
- [ ] No data model entity (Section 23: AthleteRankState, CategorySignalState, PromotionQueue, QueueItem, PromotionRecord, RankEvaluationEvent, ClientRankSnapshot) is modified.
- [ ] The six edits in Section 2 are confined to: the header (2 lines), the Section 25 title and intro line (2 edits), a single appended resolution note under the existing Q23 text, and the Amendment Log (1 full replacement).
- [ ] Q1–Q22's individual question text is preserved verbatim — only the Section 25 framing around them changes, not the questions themselves.
- [ ] No new TBD, Q-item, or decision record is introduced.
- [ ] The document's role as "Computational Authority for Rank-System-Architecture.md v1.0 (LOCKED)" is unchanged — this amendment confirms that role, not redefines it.
- [ ] After this amendment, Rank-Computation-Model.md's own status matches what every downstream document (Rank-Calibration-Decisions.md, P-2-Progress-Hub-Spec.md, O-2-Amendment-001, P-1-Amendment-002, Profile-Progress-Ecosystem-Audit.md) has already been citing it as.

---

## Section 4 — What This Amendment Does Not Do

- Does not resolve TBD-11 (Legacy display format) — remains open, carried to future UI work.
- Does not resolve Q3, Q4, Q5, or Q6 — remain open, carried to the import spec and display implementation workstreams respectively.
- Does not resolve Q17, Q19, Q20, Q21, or Q22 — remain open, carried to Rank Evaluation Service implementation and backend implementation respectively.
- Does not redesign, re-derive, or second-guess any threshold, formula, or category definition.
- Does not author Session 6 — explicitly closes the question of whether one is needed, per Q23.

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*Rank-Computation-Model Amendment 001*
*Administrative Lock Amendment*
*June 2026*
*Authority: Rank-Computation-Model-Lock-Audit.md (LOCKED), Rank-Calibration-Decisions.md (LOCKED), Rank-Implementation-Readiness-Review.md (COMPLETE)*
*Status: LOCKED*
