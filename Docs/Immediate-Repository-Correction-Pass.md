# Immediate Repository Correction Pass
## Tier 1 + Tier 2
### June 2026

**Status:** LOCKED

**Type:** Correction Pass (not an audit, not a redesign — status/metadata reconciliation only)

**Date:** June 2026

**Triggered by:** The MVP Implementation Readiness Audit's direct verification that several "amendment locked" documents were never actually applied to their target files.

---

## Section 1 — Scope

This is a correction pass, not a discovery audit. Exactly four already-verified items are resolved here, no others:

1. Apply Rank-Computation-Model-Amendment-001.md's six specified edits to Rank-Computation-Model.md.
2. Verify whether Legacy-Hub-Wireframe-Spec-L1.md satisfies its own lock conditions; promote only if it does.
3. Normalize the missing `Status` field on Active-Workout-Flow-Spec-W9-W16.md.
4. Reconcile the header/footer status contradiction on P-4-Settings-Root-Architecture.md.

No new searching was performed beyond what each item required to verify directly. No behavioral, architectural, or design content was altered anywhere.

---

## Section 2 — Corrections Applied

### 2.1 Rank-Computation-Model.md — Lock Completion (Applied)

All six edits specified in Rank-Computation-Model-Amendment-001.md §2 were applied verbatim, plus the footer line (§2.7):

- Header line 2: `DRAFT — June 2026` → `LOCKED v1.0 — June 2026`
- Header line 4 (`Status:`): `DRAFT — Session 5` → `LOCKED v1.0`
- Section 25 title: `Open Questions for Session 6` → `Carried-Forward Items (Non-Blocking)`
- Section 25 intro line: rewritten to state only Q3–Q6 remain open (Q1, Q2, Q7–Q14 resolved by Rank-Calibration-Decisions.md) and that no Session 6 is planned
- Q23: appended the "Resolved by Rank-Computation-Model-Amendment-001.md" closing note beneath the existing, unmodified Q23 question text
- Amendment Log: replaced the "*None... draft-status*" placeholder with the full v1.0 (Lock) entry specified by the amendment
- Footer closing line: `Sessions 1–5 DRAFT + Audit` → `Sessions 1–5 LOCKED v1.0`

Sections 1–24 (every TBD resolution, every decision record D-RCM-1 through D-RCM-28, every threshold table) were not touched — confirmed by editing only the six named locations.

### 2.2 Legacy-Hub-Wireframe-Spec-L1.md — Promotion (Not Performed)

**L-1 does not currently satisfy its own lock conditions.** Per the task's explicit instruction, no promotion was forced. See Section 6 for the exact unmet conditions.

### 2.3 Active-Workout-Flow-Spec-W9-W16.md — Status Normalization (Applied)

Added `**Status:** LOCKED` immediately after the title/version header line, matching the convention used by every other locked document in this project. No other header field was invented (this document has no `Type:`/`Authority:`-style fields at all; only the one missing field — Status — was added, per the task's instruction to normalize status metadata only). No body content was touched.

### 2.4 P-4-Settings-Root-Architecture.md — Header/Footer Reconciliation (Applied)

The document's own Change Log already recorded a legitimate lock: *"Status DRAFT → LOCKED. Open Questions 1, 6, 7 resolved. Items 3, 4, 5 reclassified as downstream workstream questions, not P-4 blockers."* The header (`LOCKED`) was correct; only the footer was stale. Changed the footer's status line from `DRAFT — Pending Open Questions resolution before lock` to `LOCKED`. No architecture content touched.

---

## Section 3 — Files Modified

| File | Change |
|---|---|
| Rank-Computation-Model.md | 6 edits + footer, per §2.1 |
| Active-Workout-Flow-Spec-W9-W16.md | 1 line added (`Status: LOCKED`) |
| P-4-Settings-Root-Architecture.md | 1 line changed (footer status) |
| Legacy-Hub-Wireframe-Spec-L1.md | **Not modified** — see Section 6 |

---

## Section 4 — Before/After Status Table

| Document | Before | After |
|---|---|---|
| Rank-Computation-Model.md | `DRAFT — Session 5` | `LOCKED v1.0` |
| Active-Workout-Flow-Spec-W9-W16.md | (no Status field) | `LOCKED` |
| P-4-Settings-Root-Architecture.md | Header `LOCKED` / Footer `DRAFT — Pending...` (contradictory) | Header `LOCKED` / Footer `LOCKED` (consistent) |
| Legacy-Hub-Wireframe-Spec-L1.md | `Lock-Ready` | `Lock-Ready` (unchanged — conditions not met) |

---

## Section 5 — Validation

- [x] Rank-Computation-Model.md Sections 1–24 unmodified — only the six named locations (header ×2, §25 title, §25 intro, Q23 append, Amendment Log) plus the footer line were edited
- [x] No TBD resolution (TBD-1 through TBD-16) reopened, reversed, or modified
- [x] No data model entity in Rank-Computation-Model.md modified
- [x] Active-Workout-Flow-Spec-W9-W16.md body content (including this session's own §5.8 Exercise Substitution work) unchanged — only one header line added
- [x] P-4-Settings-Root-Architecture.md architecture/content sections unchanged — only the footer status line changed
- [x] Legacy-Hub-Wireframe-Spec-L1.md received zero edits — promotion correctly withheld rather than forced

---

## Section 6 — Remaining Known Issues

**L-1's two specific unmet lock conditions (verified directly, not forced):**

- **Risk 3 / Risk 7 (Honor Earned FLM tap "inert")** — L-1's own body text (line 460 and lines 1065–1067) still states *"Tap → Inert for MVP v1.0 (no honor detail screen exists)"* and *"L-10 (Honors List) does not yet exist."* Verified directly: `Honors-Spec-L10.md` exists and is `Status: LOCKED`. L-1's claim is factually stale — the destination exists, but L-1's tap-handling text was never updated to route there. Fixing this requires a behavioral/content edit (the actual tap destination and copy), which is out of scope for a status-metadata-only correction pass.
- **Risk 8 (P-3 Rank Detail fallback)** — L-1's text still describes Rank Up FLM taps falling back to P-1 *"because P-3 (Rank Detail) has no wireframe spec."* P-3 was deliberately retired (P-3-Retirement-Amendment.md) with a defined reroute to P-2 (`openRankJourney:true`) — L-1 describes the old pre-retirement fallback, not the current behavior. Same out-of-scope reasoning applies.

**Broader, not addressed in this pass** (named for the record, per the prior audit's findings, not investigated further here):

- WSR-001's required "Share" CTA, unimplemented across 8 named target screens (W-17, W-19, M-1, M-2, M-3, M-4, L-11, S-2)
- P-3-Retirement-Amendment.md's other ~5 unapplied targets beyond L-1 (P-1, M-1, Rank-Implementation-Readiness-Review.md, Rank-System-Architecture.md)
- O-2-Amendment-001 / P-1-Amendment-002's 4-athlete-type model never merged into the base O-2/P-1 specs (still show the old 7-type list)
- Identity-Amendment-001-Username.md — 4 of 5 targets gapped (no `@username` line in P-1, WwF not bumped)
- ExercisePrescription-Amendment-001.md — 4 of 5 targets gapped (W-24 §7.6, W-9 §7 rest-display note, Import Amendment, W-19 display rule)
- MVP-Amendment-Environment-Tags-v1.0.md — 0 of 3 targets implemented (W-2, W-3, W-4)
- Workout-Templates-Hub-Spec-W26.md — both downstream targets unimplemented (W-1, W-8)
- Critical-Decisions-Amendment-001.md — several "Pending" rows never actioned

---

## Section 7 — Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Applies the four verified Tier 1/Tier 2 corrections: completes the Rank-Computation-Model.md lock, normalizes W-9's missing Status field, reconciles P-4's header/footer contradiction, and correctly withholds L-1's promotion pending two specific unmet conditions (Risk 3/7, Risk 8). |

---

## Final Question — Next Workstream Recommendation

**Recommend (A) Full Amendment Reconciliation Audit, not (B) Targeted Critical-Amendment Reconciliation Pass.**

**Justification:** This correction pass itself just surfaced a *new* instance of the same failure mode — L-1's Risk 3/7/8 staleness — that neither of the two prior audit agents had named among their headline findings. It was found only because verifying a status promotion required directly re-reading L-1's full risk section. That is direct, fresh evidence that a "targeted" pass scoped to whatever has already been flagged as high-profile will still miss real gaps; the targeting itself is the unreliable part, not the fixing.

The underlying failure mode — an amendment document written and locked, but its specified edits never applied to the target — has now been confirmed across at least six distinct amendments (Rank-Computation-Model-Amendment-001, P-3-Retirement-Amendment, WSR-001, Identity-Amendment-001, ExercisePrescription-Amendment-001, Environment-Tags-Amendment) spanning at least four ecosystems (Rank, Legacy, Profile/Identity, Workout/Exercise). At this breadth, systematic document-by-document verification is the only way to have actual confidence in the project's MVP-readiness claim — hand-picking "the critical ones" repeats the exact assumption that produced this correction pass in the first place.

---

*Immediate Repository Correction Pass — Tier 1 + Tier 2*
*June 2026*
*Authority: Rank-Computation-Model-Amendment-001.md (LOCKED), Legacy-Hub-Wireframe-Spec-L1.md (Lock-Ready), Active-Workout-Flow-Spec-W9-W16.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED)*
*Status: LOCKED*
