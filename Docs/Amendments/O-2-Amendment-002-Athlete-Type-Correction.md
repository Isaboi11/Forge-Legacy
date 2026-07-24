# O-2 Amendment 002 — Athlete Type Correction
## Amendment to First-Time Setup Wireframe Spec (O-2)
### June 2026

**Status:** LOCKED

**Type:** Reconciliation Amendment (no new decisions; merges already-LOCKED content into O-2)

**Date:** June 2026

**Amends:** First-Time-Setup-Wireframe-Spec-O2.md v1.0 (+ O-2-A1) → v1.1

**Origin:** Forge-Legacy-Amendment-Reconciliation-Audit.md (June 2026) identified that O-2-Amendment-001-Athlete-Type-Declaration.md had never been merged into First-Time-Setup-Wireframe-Spec-O2.md — both documents were LOCKED but disagreed: O-2-Amendment-001 specified a four-type model while O-2 v1.0's own body text, tile layout, and validation checklist still showed the seven-type model. This is the same taxonomy contradiction also resolved on the P-1 side by P-1-Amendment-003-Consolidated-Correction.md.

**Authority Chain (LOCKED, not reopened by this amendment):**
- O-2-Amendment-001-Athlete-Type-Declaration.md v1.0 (athlete type taxonomy, tile layout, editability correction)
- P-1-Amendment-002-Athlete-Type-Editability.md v1.0, Decision A002-D9 (canonical "P-1.1 Edit Profile" screen code)

**Amendment Log:** None at v1.0. Initial and final — no open questions.

---

## Section 1 — Purpose

This amendment makes no new product decisions. It merges O-2-Amendment-001's four-type model and editability correction into First-Time-Setup-Wireframe-Spec-O2.md, and propagates the canonical "P-1.1 Edit Profile" screen code (established after O-2-Amendment-001 was written, by P-1-Amendment-002 A002-D9) to the same editability references for consistency with the now-corrected P-1.

## Section 2 — What This Amendment Applies

| # | Source | Required Change | Applied To O-2 v1.1 |
|---|---|---|---|
| 1 | O-2-Amendment-001 §2, §4 | Replace 7-tile O-2b layout with 4-tile layout (Strength, Bodybuilding, Endurance, Hybrid); update subtitle copy | Section 5 (full replacement), Decision 2 |
| 2 | O-2-Amendment-001 §12.1 | Correct editability reference from "P-2" to "P-1 Edit Profile" | Decision 2, Section 5 |
| 3 | O-2-Amendment-001 §12.2–§12.5 | Update Section 10.1 footnote, Section 14.3 tap targets, Section 15 accessibility, Section 19 data model note | Sections 10.1, 14.3, 15, 19 |
| 4 | O-2-Amendment-001 §11 | Replace O-2b Validation Checklist (Section 18) | Section 18 |
| 5 | P-1-Amendment-002 A002-D9 | Downstream consistency: use canonical "P-1.1 Edit Profile" wherever the editability correction from item 2 is applied, plus the same stale "P-2 (Edit Profile)" pattern found in Decision 4 (photo), Section 4 (path rationale), and Section 10.3 (skip-and-return) | Decision 2, Decision 4, Section 4, Section 5, Section 10.3, Section 19 |

## Section 3 — Reconciliation Note

O-2-Amendment-001's own text (§8.1, §9, §12.1) was written before P-1-Amendment-002 assigned the canonical screen code "P-1.1 Edit Profile" (A002-D9) — it corrects O-2 v1.0's "P-2" error to "P-1 Edit Profile," not yet "P-1.1." This amendment applies O-2-Amendment-001's substantive correction (the surface is P-1, not P-2) using the now-canonical code, so that O-2 and the corrected Profile-Wireframe-Spec-P1.md (v1.1, per P-1-Amendment-003) use identical terminology. This is the same kind of cross-amendment-chain reconciliation P-1-Amendment-003 performs on the P-1 side — not a new decision.

Section 20 (Post-MVP Athlete Type Expansion Framework) is also corrected for the same defect even though it is not separately named by O-2-Amendment-001: its own text asserted "the seven MVP athlete types are locked," directly contradicting the now-merged four-type model.

## Section 4 — What This Amendment Does Not Change

- No new screens, fields, or interactions are introduced beyond what O-2-Amendment-001 already specifies
- O-2's onboarding flow, path structure, skip behavior, and navigation map are unchanged
- No decision made by O-2-Amendment-001 or P-1-Amendment-002 is reopened or altered
- Athlete type taxonomy and evaluation logic are unchanged from O-2-Amendment-001 — only merged into O-2

## Section 5 — Validation Checklist

- [x] O-2b shows exactly four tiles: Strength, Bodybuilding, Endurance, Hybrid
- [x] O-2b tile layout is 2×2, 88dp minimum tile height
- [x] No remaining "P-2" editability reference for athlete type, photo, or general profile editing in O-2
- [x] No remaining seven-type enumeration in O-2 body text, checklist, tap targets, or accessibility labels (Section 20's backlog discussion of deferred/considered types is historical/forward-looking context, not a live spec claim, and is excluded from this check)
- [x] O-2 and Profile-Wireframe-Spec-P1.md (post P-1-Amendment-003) show the identical 4-type model

---

*O-2 Amendment 002 — Athlete Type Correction*
*Amendment to First-Time-Setup-Wireframe-Spec-O2.md v1.0 (+ O-2-A1) → v1.1*
*June 2026*
*Authority: O-2-Amendment-001-Athlete-Type-Declaration.md v1.0 (LOCKED), P-1-Amendment-002-Athlete-Type-Editability.md v1.0 (LOCKED)*
*Status: LOCKED*
