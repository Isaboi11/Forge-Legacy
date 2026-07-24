# Profile & Progress Ecosystem Audit
## Architecture Audit — P-1, P-2, P-2.2, Rank System, Athlete Type System
### June 2026

**Status:** LOCKED

**Type:** Architecture Audit Report (reference document, not a screen specification)

**Date:** June 2026

**Scope:** P-1 Profile + Amendments 001/002, P-2 Progress Hub, P-2.2 Rank Journey Detail, Rank System Architecture, Rank Computation Model, Rank Calibration Decisions, Athlete Type System (O-2 Amendment 001), Rank-related ceremonies and navigation (M-1, L-1), P-3 Retirement Amendment.

**Authority Chain:** This document audits the following locked sources and makes no architectural changes to any of them:
- Profile-Wireframe-Spec-P1.md v1.3 (LOCKED) — note: this audit predates P-1's later Amendment 003/004 merges; treat P-1 v1.3 as current, this audit's findings as historical
- P-1-Amendment-001-Progress-Entry-Point.md v1.0 (LOCKED)
- P-1-Amendment-002-Athlete-Type-Editability.md v1.0 (LOCKED)
- P-2-Progress-Hub-Architecture.md v1.1 (LOCKED)
- P-2-Progress-Hub-Spec.md v1.0 (LOCKED)
- Rank-System-Architecture.md v1.0 (LOCKED)
- Rank-Computation-Model.md Sessions 1–5 (LOCKED)
- Rank-Calibration-Decisions.md v1.0 (LOCKED)
- Rank-Implementation-Readiness-Review.md (LOCKED)
- Rank-Up-Modal-Spec-M1.md v1.0 (LOCKED)
- Legacy-Hub-Wireframe-Spec-L1.md (LOCKED)
- O-2-Amendment-001-Athlete-Type-Declaration.md v1.0 (LOCKED)
- P-3-Retirement-Amendment.md v1.0 (LOCKED)

**Constraint compliance:** This audit does not redesign P-1, P-2, P-2.2, or the Rank System. It identifies obsolete scope, duplicate ownership, orphaned workstreams, unresolved dependencies, placeholder references, and simplification opportunities only.

---

## Section 1 — Audit Scope & Status Summary

Thirteen locked documents were audited across four ecosystem areas: Profile Surface, Progress Surface, Rank Systems, and Athlete Identity.

**Overall ecosystem health: CLEAN.** No spec gaps exist. No architecture redundancy exists. No unused architecture exists. The only findings are stale references — content in two locked documents that has been superseded by later amendments but never corrected in place.

| Finding Category | Count | Severity |
|---|---|---|
| Stale references already handled by existing amendments | 7 items | None — informational |
| Stale references requiring a new cleanup amendment | 10 items (2 documents) | Low — cosmetic, non-blocking |
| Spec gaps | 0 | N/A |
| Open dependencies (deferred, non-blocking) | 7 items | Low–Medium, all explicitly deferred |
| Orphaned items | 2 items | Low — already moot |
| Navigation redundancy | 0 | N/A |
| Unused architecture | 0 | N/A |
| Duplicate ownership | 0 | N/A |
| Recommended retirements | 0 (P-3 already retired) | N/A |

---

## Section 2 — Stale References Already Handled by Existing Amendments

These items are stale in their original locked document but have already been corrected by a subsequent locked amendment. Listed for completeness — no new action required.

| Source Document | Stale Content | Corrected By |
|---|---|---|
| Profile-Wireframe-Spec-P1.md v1.0 | "P-2 Edit Profile" naming (12+ instances: Sections 4.2–4.6, 6.4, 10.1, 14) | P-1-Amendment-002 → P-1.1 Edit Profile |
| Profile-Wireframe-Spec-P1.md v1.0 | Seven-type athlete type list; "Running" example (Sections 4.4, 6.2, 10.5) | P-1-Amendment-002 → four locked types (Strength, Bodybuilding, Endurance, Hybrid) |
| Profile-Wireframe-Spec-P1.md v1.0 | P-3 Rank Detail references (Sections 5.3, 5.5, 10.1, 14) | P-3-Retirement-Amendment → P-2 (openRankJourney: true) → P-2.2 |
| P-1-Amendment-001-Progress-Entry-Point.md | Section 10.1 "different ground" claim and Decision A001-D3 P-3 routing | P-3-Retirement-Amendment |
| Rank-Up-Modal-Spec-M1.md | "View Your Rank" → P-3 (navigation table, behavior table, validation checklist) | P-3-Retirement-Amendment |
| Legacy-Hub-Wireframe-Spec-L1.md | FLM Rank Up tap → P-1 fallback; Risk 8 (P-3 unspecced) | P-3-Retirement-Amendment (Risk 8 closed) |
| Rank-System-Architecture.md / Rank-Calibration-Decisions.md / Rank-Implementation-Readiness-Review.md | P-3 downstream dependent / workstream entries | P-3-Retirement-Amendment |

---

## Section 3 — Stale References Requiring a Cleanup Amendment

Unlike Section 2, these items have **no amendment correcting them yet.** They exist in P-2-Progress-Hub-Architecture.md and P-2-Progress-Hub-Spec.md, both locked, and have gone stale due to later workstreams (RSA lock, O-2 Amendment 001 lock, P-1 Amendment 001/002 lock, P-3 retirement) completing after these documents were written.

### 3.1 P-2-Progress-Hub-Architecture.md (v1.1)

| Item | Stale Content | Correct State |
|---|---|---|
| OQ-1 | "Sub-screen codes pending a naming convention decision" | RESOLVED — P-2.1–P-2.5 established in P-2-Progress-Hub-Spec.md (PH-D20) |
| OQ-2 | "P-1 Amendment required before this navigation path can be built" | RESOLVED — P-1-Amendment-001 locked June 2026 |
| OQ-3 | "Edit Profile renumbering required"; proposes candidate code P-9 | RESOLVED — P-1.1 Edit Profile locked by P-1-Amendment-002. P-9 is superseded and should not be referenced going forward. |
| OQ-4 | "Rank system specification... does not yet exist" | RESOLVED — Rank-System-Architecture.md locked June 2026 |
| PH-D15 (line 154) | "Candidate: P-9 (after the informal P-3–P-8 settings range)" | STALE — P-3 is retired; correct designation is P-1.1 Edit Profile, not a P-series settings code |
| Lines 521, 691 | "The rank ladder's specific names... are defined in the Rank System Architecture specification, which does not yet exist." | STALE — RSA is locked; the rank ladder, sub-tier structure, and thresholds are fully defined there |
| Line 1003 | "The informal P-3–P-8 range covers rank detail and settings screens" | STALE — P-3 is retired (no "rank detail" in this range); the range is now P-4–P-8 (settings only) |

### 3.2 P-2-Progress-Hub-Spec.md (v1.0)

| Item | Stale Content | Correct State |
|---|---|---|
| Line 419 | Personal Improvement signal examples: "Personal Improvement (Strength)", "Personal Improvement (Running)", "Personal Improvement (Boxing)", "Personal Improvement (Hybrid)" | STALE — "Running" and "Boxing" were Q8 provisional labels, superseded by O-2-Amendment-001's locked four types: Strength, Bodybuilding, Endurance, Hybrid |
| Line 31 | "P-3 Rank Detail (blocked on this spec + TBD-12 data model completion)" | STALE — P-3 retired by P-3-Retirement-Amendment |
| Line 1046 | "P-3 Rank Detail screen \| P-3 workstream \| Blocked on TBD-12 verification" | STALE — P-3 retired; this workstream entry no longer exists |
| Line 1043 | "O-2 Amendment (athlete type declaration)... Required before Personal Improvement evaluation runs for new athletes" | STALE — O-2-Amendment-001 is locked June 2026; this dependency is resolved |

---

## Section 4 — Spec Gap Assessment

**No spec gap exists.**

An earlier draft of this audit incorrectly flagged the P-2.2 Personal Improvement Updating State (the `⟳ Updating` indicator shown during athlete type re-attribution) as a gap requiring a P-2 spec amendment. This is corrected: **P-1-Amendment-002, Section 5.3 is the full and sufficient authority for this state.** P-2.2 does not originate or own this behavior — it receives an already-authorized state from P-1 Amendment 002 (`athlete.reattributionInProgress: boolean`, type parenthetical behavior, copy, and clearing condition are all fully specified there). No P-2 document needs to restate it.

This distinction matters for the ecosystem's ownership model: P-2.2 is a rendering surface for state that originates elsewhere (the athlete type change flow on P-1). Not every cross-referenced behavior requires the referenced screen's own spec to restate it.

---

## Section 5 — Open Dependencies (Deferred, Non-Blocking)

All items below are explicitly deferred in their locked source document. None block the Profile/Progress ecosystem or its implementation readiness.

| Item | Source | Deferred To | Priority |
|---|---|---|---|
| Q3 — Imported session duration handling | Rank-Calibration-Decisions.md | Import spec workstream | Medium |
| Q4 — Goal Participation import treatment | Rank-Calibration-Decisions.md | Import spec workstream | Medium |
| Q5 — Achievement amplification for Goal Participation | Rank-Calibration-Decisions.md | Post-MVP | Low |
| Q6 — Longevity signal unit (months vs. years) | Rank-Calibration-Decisions.md | Display implementation | Medium |
| TBD-11 — Legacy display format in M-1 | Rank-System-Architecture.md | M-1 Amendment (far-future; Legacy rank) | Low |
| OQ-5 — Weight & Body Metrics sub-architecture | P-2-Progress-Hub-Architecture.md | Pre-implementation supplement | Low |
| OQ-6 — Streak definition edge case | P-2-Progress-Hub-Architecture.md | Engineering awareness only | Low |

---

## Section 6 — Orphaned Items

1. **Rank-Implementation-Readiness-Review.md — Phase 3 task "Author P-3 Rank Detail screen spec."** Orphaned. P-3 is retired; no spec will be authored. This task should be marked closed, not merely deferred.
2. **RSA / Calibration / Readiness dependency chains stating "P-3 can begin after TBD-12 is resolved."** Obsolete. TBD-12 resolution is no longer relevant to P-3, since P-3 will never be authored. (TBD-12 itself remains relevant to other rank data model consumers — only its relationship to P-3 is obsolete.)

---

## Section 7 — Redundancy and Unused Architecture Review

**Navigation redundancy:** None found.
- P-1's Identity Header rank display (identity statement, non-interactive) and P-1's Rank row (navigational, → P-2 → P-2.2) serve distinct roles — display vs. navigation. Not redundant.
- P-2's What's Next Priority 3a/3b and the Rank Journey Preview both route to P-2.2, but from different surfaces with different triggering conditions (directed guidance vs. direct exploration). Not redundant — this is intentional multi-entry design, consistent with P-2S-D rationale already locked.

**Unused architecture:** None found.
- All four rank categories (Consistency, Improvement, Depth, Longevity) are actively read by the evaluation model and surfaced in P-2.2 Category Signals.
- Honor Evaluation Service, import partial-credit system (50% rate), and the promotion queue are all wired into locked specs with no dangling/unreferenced components.

**Duplicate ownership:** None found.
- Current chapter appears on both P-1 (identity context) and P-2 Hero (progress narrative) — intentional mirroring of athlete state across two different surfaces, not duplicated ownership.
- Lifetime Workouts appears in P-2 Hero (single summary number) and P-2 Consistency & Training (detailed metric) — different levels of detail for the same underlying data, not duplication.
- Athlete type is declared once (O-2 onboarding), edited once (P-1.1 Edit Profile), and displayed in two places (P-1 Identity Header, P-2.2 Personal Improvement parenthetical) — single source of truth (`athlete.athleteType`), multiple read-only displays. Not duplicated ownership.

---

## Section 8 — Recommended Retirements

**None.** P-3 Rank Detail is the only screen retirement identified across this ecosystem, and it is already locked via P-3-Retirement-Amendment.md. No further retirement candidates were found in P-1, P-2, P-2.2, Rank System Architecture, or Athlete Type System.

---

## Section 9 — Recommended Amendments

### P-2 Amendment 001 — Stale Reference Cleanup
**Priority: Low. Not a blocker.** No spec gap motivates this amendment — it exists solely to bring two locked documents current with workstreams that completed after they were written.

Scope:
1. Formally close Architecture OQ-1 through OQ-4 (Section 3.1 of this audit) — all four are resolved by other locked documents.
2. Correct stale language at Architecture lines 521, 691, 1003, and PH-D15 — remove "does not yet exist" framing for RSA; correct the Edit Profile code reference from "P-9" to "P-1.1"; correct the "P-3–P-8" range to "P-4–P-8".
3. Correct P-2 Spec line 419 — replace "Running"/"Boxing" examples with "Endurance"/"Bodybuilding".
4. Close P-2 Spec lines 31, 1046, 1043 — remove P-3 blocked-dependency framing; remove O-2 Amendment "required" framing (it is locked).

### M-1 Amendment 001 — Legacy Display Format
**Priority: Low. Defer.** Resolves TBD-11 (M-1 ceremony copy format when an athlete reaches Legacy, which has no sub-tier). Not time-sensitive — Legacy is the final, far-future rank. Recommend deferring authorship until Legacy-adjacent athletes exist in the population or until a broader M-1 refresh is scheduled.

---

## Section 10 — Recommended Next Workstream

1. **P-2 Amendment 001** (Section 9) — small cleanup pass, recommended before the P-2/P-2.2 implementation workstream begins, but not gating.
2. **P-4 Settings Root** — next screen in the locked Phase 2C P-series order (P-4–P-8), per Architecture Backlog & Completion (June 2026).

---

## Section 11 — Conclusion

The Profile and Progress ecosystem is architecturally complete and internally consistent. P-3's retirement was executed cleanly with no orphaned navigation or content gaps. The athlete type editability flow (Amendment 002) and the rank depth surface (P-2.2) are correctly bounded — P-2.2 renders state it does not own, and no duplicate specification was required or is needed. The only outstanding work is cosmetic: ten stale references across two documents, none of which affect behavior, navigation, or implementation readiness.

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*Profile & Progress Ecosystem Audit*
*Architecture Audit — P-1, P-2, P-2.2, Rank System, Athlete Type System*
*June 2026*
*Status: LOCKED*
