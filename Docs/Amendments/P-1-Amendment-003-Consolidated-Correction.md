# P-1 Amendment 003 — Consolidated Correction
## Amendment to Profile Wireframe Spec (P-1)
### June 2026

**Status:** LOCKED

**Type:** Reconciliation Amendment (no new decisions; merges already-LOCKED content into P-1)

**Date:** June 2026

**Amends:** Profile-Wireframe-Spec-P1.md v1.0 → v1.1

**Origin:** Forge-Legacy-Amendment-Reconciliation-Audit.md (June 2026) identified that four separately-LOCKED amendments targeting Profile-Wireframe-Spec-P1.md had never been merged into the document, including one active contradiction (athlete-type taxonomy) and two stale destination references (P-2 vs. P-1.1 Edit Profile; P-3 vs. P-2.2 Rank Journey Detail).

**Authority Chain (all LOCKED, none reopened by this amendment):**
- P-1-Amendment-001-Progress-Entry-Point.md v1.0
- P-1-Amendment-002-Athlete-Type-Editability.md v1.0
- Identity-Amendment-001-Username.md v1.1 (Section 8)
- P-3-Retirement-Amendment.md v1.0

**Amendment Log:** None at v1.0. Initial and final — no open questions.

---

## Section 1 — Purpose

This amendment makes no new product decisions. It exists solely to consolidate four already-LOCKED corrections to Profile-Wireframe-Spec-P1.md into a single reconciliation pass, so that P-1 v1.1 reflects the current state of every amendment that targets it. Where two source amendments touched the same P-1 content (e.g., the Section 13.2 navigation stack table is touched by both P-1-Amendment-001 and P-3-Retirement-Amendment), this amendment specifies the single merged result.

## Section 2 — What This Amendment Applies

| # | Source | Required Change | Applied To P-1 v1.1 |
|---|---|---|---|
| 1 | P-1-Amendment-001 | Add Progress row between RANK and HONORS; update Section 2, 3, 9.3, 13.2, 13.4, 13.9, 14 | New Section 5A; wireframe (Section 3); Section 9.3 and 13.2 tables; Section 13.4 tap targets; Section 13.9 accessibility; Section 14 new "Progress Section" checklist |
| 2 | P-1-Amendment-002 | Replace 7-type model with 4 types (Strength/Bodybuilding/Endurance/Hybrid); replace all "P-2 Edit Profile" references with "P-1.1 Edit Profile" | Sections 4.1–4.7, 6.2, 6.4, 9.3, 10.1, 10.5, 13.2, 14 |
| 3 | Identity-Amendment-001 §8.1 | Add @username line below Display Name in Identity Header | Section 3 wireframe; Section 4.1 anatomy + new 4.1a |
| 4 | P-3-Retirement-Amendment | Replace all "P-3 Rank Detail" references with P-2 (`openRankJourney: true`) → P-2.2 Rank Journey Detail routing | Sections 2, 4.5, 5.1–5.5, 9.3, 13.2, 13.4, 14 |

## Section 3 — Reconciliation Notes (Content Touched by More Than One Source)

- **Section 9.3 (Settings Hierarchy Reminder) and Section 13.2 (Navigation Stack) tables** are each touched by all of Amendments 1, 2, and 4. The merged tables in P-1 v1.1 reflect: the Progress row added (Amendment 1), the Edit Profile entry renamed to P-1.1 (Amendment 2), and the Rank entry corrected to P-2.2-via-P-2 with the standalone P-3 row removed (Amendment 4 — P-3-Retirement-Amendment explicitly instructs no replacement row, since P-2.2 is reached via the Progress row's P-2 entry).
- **Section 14 Validation Checklist "What Does NOT Appear" items inherited from P-1-Amendment-001** (e.g., "no progress bars on P-1 — bars belong to P-2 and P-3") are applied using the post-retirement destination (P-2 and P-2.2), not the literal P-3-era wording in Amendment-001's own text, since P-3 no longer exists as a destination.
- **The v1.0 Change Log entry** stating "Progress bar lives on P-3 Rank Detail exclusively" is preserved unedited as the historical record of the original v1.0 decision. The correction is recorded in a new v1.1 Change Log entry rather than by rewriting history.

## Section 4 — What This Amendment Does Not Change

- No new screens, fields, or interactions are introduced beyond what the four source amendments already specify
- P-1's information hierarchy, emotional framing, and modal presentation model are unchanged
- No decision made by any of the four source amendments is reopened or altered
- Athlete type taxonomy, Edit Profile screen code, username display rules, and P-2.2 routing are unchanged from their respective locked authorities — only merged into P-1

## Section 5 — Validation Checklist

- [x] Progress row present in P-1 wireframe and Section 5A, between RANK and HONORS
- [x] All P-1 athlete-type references show exactly: Strength, Bodybuilding, Endurance, Hybrid
- [x] No remaining "P-2 Edit Profile" string anywhere in P-1
- [x] No remaining "P-3 Rank Detail" string anywhere in P-1
- [x] @username line present in both the Section 3 wireframe and Section 4.1 header anatomy
- [x] P-1 and First-Time-Setup-Wireframe-Spec-O2.md (post O-2-Amendment-002) show the identical 4-type model

---

*P-1 Amendment 003 — Consolidated Correction*
*Amendment to Profile-Wireframe-Spec-P1.md v1.0 → v1.1*
*June 2026*
*Authority: P-1-Amendment-001 v1.0 (LOCKED), P-1-Amendment-002 v1.0 (LOCKED), Identity-Amendment-001 v1.1 (LOCKED), P-3-Retirement-Amendment v1.0 (LOCKED)*
*Status: LOCKED*
