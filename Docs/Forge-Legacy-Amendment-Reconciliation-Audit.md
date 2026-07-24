# Forge Legacy Amendment Reconciliation Audit
## June 2026

**Status:** LOCKED

**Type:** Reconciliation Audit (verification and classification only — no redesign, no new features, no findings resolved within this document)

**Date:** June 2026

**Method:** Three parallel research passes covering all 15 named ecosystems, followed by direct verification of the highest-stakes and contradictory claims before inclusion here. Where a finding could not be independently verified by direct read, it is marked **UNKNOWN** per this audit's own classification system rather than asserted with unwarranted confidence.

---

## Section 1 — Executive Summary

This audit confirms the pattern named by the prior correction pass is broader than initially scoped. Of roughly **15 amendment documents** identified across the repository, **6 are fully applied**, **2-3 are partially applied**, and **6-7 have real, confirmed gaps** in at least one target document. The single most severe finding is not a missing feature but an active **contradiction between two currently-LOCKED documents**: O-2-Amendment-001 and P-1-Amendment-002 both specify a 4-athlete-type model (Strength/Bodybuilding/Endurance/Hybrid), while the base documents they target — First-Time-Setup-Wireframe-Spec-O2.md and Profile-Wireframe-Spec-P1.md — still show the old 7-type list (Strength/Bodybuilding/Hybrid/Running/Cycling/Combat/General) in their own body text. Both pairs are LOCKED. They disagree.

A second, newly-discovered finding (found during this audit's own verification step, not flagged by any prior pass): Profile-Wireframe-Spec-P1.md's Identity Header still routes "Edit Profile" and the profile photo to *"P-2 Edit Profile"* — but P-2 is the Progress Hub, a different screen entirely. P-1-Amendment-002 established a distinct P-1.1 Edit Profile code that was never substituted into P-1's own text. The same section also still says the rank progress bar *"lives on P-3 Rank Detail exclusively"* — P-3 was retired this session, with progress moved to P-2.2.

**Profile-Wireframe-Spec-P1.md is the single most amendment-targeted document in the project and carries the largest concentration of unmerged edits.**

---

## Section 2 — Amendment Inventory

| # | Amendment | Ecosystem | Status (own header) |
|---|---|---|---|
| 1 | Rank-Computation-Model-Amendment-001.md | Rank | LOCKED |
| 2 | P-3-Retirement-Amendment.md | Rank/Profile/Legacy | LOCKED |
| 3 | O-2-Amendment-001-Athlete-Type-Declaration.md | Onboarding | LOCKED v1.0 |
| 4 | P-1-Amendment-001-Progress-Entry-Point.md | Profile | LOCKED |
| 5 | P-1-Amendment-002-Athlete-Type-Editability.md | Profile | LOCKED v1.0 |
| 6 | Identity-Amendment-001-Username.md | Profile/Settings/Sharing | LOCKED |
| 7 | FLM/Sealed-Chapter-Amendment-001.md | Legacy | LOCKED v1.0 |
| 8 | Critical-Decisions-Amendment-001.md | Cross-cutting (Goals/Squads/Legacy/Monetization) | LOCKED v1.0 |
| 9 | Program-Architecture-Amendment-001-Active-Program-Rule.md | Programs | LOCKED |
| 10 | Architecture-Amendment-001-Import.md | Programs/Legacy | LOCKED |
| 11 | MVP-Amendment-Environment-Tags-v1.0.md | Programs | LOCKED |
| 12 | ExercisePrescription-Amendment-001.md | Workouts/Exercise Library | LOCKED |
| 13 | W3-Amendment-001-Workout-Builder-Integration.md | Workouts/Programs | LOCKED |
| 14 | W9-Amendment-001-Workout-Builder-Active-Workout-Integration.md | Workouts | LOCKED |
| 15 | W9-Amendment-002-Exercise-Substitution-Integration.md | Workouts/Exercise Library | LOCKED |
| — | Exercise-002-Exercise-Substitution-Architecture.md (functions as an amendment via its own required-update table) | Exercise Library/Workouts | LOCKED |
| — | M-7-Premium-Upsell-Spec.md (self-flags a W-4/W-5 gap) | Monetization/Programs | LOCKED |
| — | WSR-001-Workout-Share-Result-Architecture.md (functions as an amendment via its own downstream-impact table) | Sharing | LOCKED |
| — | Workout-Templates-Hub-Spec-W26.md (self-flags W-1/W-8 gaps) | Workouts | LOCKED |

Monetization-Architecture-Amendment-001.md, Settings-Ecosystem-Audit.md, and Settings-Ecosystem-Final-Closure-Audit.md function as audits/secondary amendments rather than primary ones and are folded into the matrix below under their respective findings. No amendment-style document was found for Squads, Goals (beyond Critical-Decisions-Amendment-001's rows), or Account/Auth specifically — those ecosystems' own architecture/wireframe pairs were authored together rather than amended after the fact.

---

## Section 3 — Reconciliation Matrix

| Amendment | Target | Required Change | Status | Severity | Confidence | Evidence |
|---|---|---|---|---|---|---|
| Rank-Computation-Model-Amendment-001 | Rank-Computation-Model.md | 6 header/section/log edits | FULLY APPLIED | CRITICAL | **Verified** | Fixed directly this session; header now reads "LOCKED v1.0" |
| (Correction pass) | P-4-Settings-Root-Architecture.md | Footer status reconciliation | FULLY APPLIED | COSMETIC | **Verified** | Fixed directly this session |
| W3-Amendment-001 | Program-Detail-Wireframe-Spec-W3.md | 7 Validation Checklist items | FULLY APPLIED | IMPORTANT | **Verified** | Applied directly this session; W-3 now v1.6 |
| W9-Amendment-001 | Active-Workout-Flow-Spec-W9-W16.md | Confirm W9-A1 already satisfied | FULLY APPLIED | COSMETIC | **Verified** | Confirmed already satisfied at W-9 v1.1; Status field added separately |
| W9-Amendment-002 | Active-Workout-Flow-Spec-W9-W16.md | New §5.8 Exercise Substitution | FULLY APPLIED | CRITICAL | **Verified** | Applied directly this session; W-9 now v1.2 |
| Exercise-002-Exercise-Substitution-Architecture | Active-Workout-Flow-Spec-W9-W16.md | "Replace Exercise" trigger, persistence UI | FULLY APPLIED | CRITICAL | **Verified** | Closed by W9-Amendment-002, same edit |
| Critical-Decisions-Amendment-001 | Squad-Hub-Wireframe-Spec-S1.md | 1 → 2 squad limit | FULLY APPLIED | CRITICAL | Agent-reported, direct quote given | §5.2: "Free tier: Maximum 2 squads" |
| Critical-Decisions-Amendment-001 | Monetization-Architecture-Amendment-001.md | Photo "account-wide" qualifier; squad 1→2 | FULLY APPLIED | CRITICAL | Agent-reported, direct quote given | §3 line 66-68 confirmed present |
| **P-1-Amendment-001** | Profile-Wireframe-Spec-P1.md | Add Progress row between Rank and Honors | **NOT APPLIED** | **CRITICAL** | **Verified directly — corrects a contradictory agent report** | Read the wireframe directly: TIER 3 "RANK [→]" is immediately followed by TIER 4 "HONORS." No Progress row exists anywhere in the document. |
| **O-2-Amendment-001** | First-Time-Setup-Wireframe-Spec-O2.md | 7-type list → 4-type list (Strength/Bodybuilding/Endurance/Hybrid) | **NOT APPLIED** | **CRITICAL** | Agent-reported, corroborated by 2 of 3 agents independently | O-2's own Decision 2 still enumerates "Strength, Bodybuilding, Hybrid, Running, Cycling, Combat, General" |
| **P-1-Amendment-002** | Profile-Wireframe-Spec-P1.md §4.4/§6.2 | Same 7→4 type list correction | **NOT APPLIED** | **CRITICAL** | Agent-reported, corroborated by all 3 agents independently | P-1 §4.4 still says "the seven athlete types" |
| **P-1-Amendment-002** | Profile-Wireframe-Spec-P1.md (Edit Profile references) | "P-2 Edit Profile" → "P-1.1 Edit Profile" throughout | **NOT APPLIED** | **CRITICAL** | **Verified directly — newly found by this audit, not flagged by any prior pass** | P-1 §4.1, §4.2 lines 183/190: "Tapping the photo → P-2 Edit Profile"; "Edit Profile" CTA also routes to "P-2 Edit Profile" — P-2 is the Progress Hub, a different screen |
| **P-3-Retirement-Amendment** | Profile-Wireframe-Spec-P1.md §5.5 | Progress bar destination: P-3 → P-2.2 | **NOT APPLIED** | **CRITICAL** | **Verified directly — newly found by this audit** | P-1 §5.5: "Progress bar lives on P-3 Rank Detail exclusively" — P-3 is retired |
| **Identity-Amendment-001** | Profile-Wireframe-Spec-P1.md Identity Header | Add @username line below Display Name | **NOT APPLIED** | **CRITICAL** | **Verified directly** | Identity Header anatomy (§4.1) lists Photo/Name/Type/Rank/Forging-since/Edit-Profile only — no username line |
| Identity-Amendment-001 | P-6-Privacy-Wireframe-Spec.md | Username search opt-out toggle | FULLY APPLIED | IMPORTANT | Agent-reported | Confirmed present per Settings audit cross-reference |
| Identity-Amendment-001 | Workout-With-Friend-Spec-WwF.md | Search by username; @username display | UNKNOWN | IMPORTANT | Agent-reported, not independently verified | Agent did not read WwF directly |
| **P-3-Retirement-Amendment** | Legacy-Hub-Wireframe-Spec-L1.md (Risk 3/7/8) | Reroute Honor Earned + Rank Up FLM taps; remove stale "unspecced" framing | **NOT APPLIED** | **CRITICAL** | **Verified directly in the prior correction-pass turn** | L-1 still says "L-10 does not yet exist" (false — it's LOCKED) and describes the pre-retirement P-1 fallback instead of the P-2.2 reroute |
| **ExercisePrescription-Amendment-001** | Workout-Builder-Wireframe-Spec-W24.md §7.6 | Add `restSeconds`, `distanceValue`, `distanceUnit` to schema | **NOT APPLIED** | **CRITICAL** | Agent-reported, specific quote given | §7.6 schema block lists only 7 original fields; three EP-A1 fields absent |
| ExercisePrescription-Amendment-001 | Free-Workout-Builder-Spec-W25.md | Reference EP-A1 schema | FULLY APPLIED | IMPORTANT | Agent-reported, direct quote given | W-25 §5.1 already cites EP-A1 |
| **ExercisePrescription-Amendment-001** | Active-Workout-Flow-Spec-W9-W16.md §7 | Add restSeconds reference-display note | **NOT APPLIED** | COSMETIC | **Verified directly (this session's own W9-Amendment-001, "Finding A")** | Confirmed: zero mentions of restSeconds/EP-A1 in W-9; behavior itself is optional per EP-A1's own text, so this is non-behavioral |
| ExercisePrescription-Amendment-001 | Architecture-Amendment-001-Import.md | Import rule: 3 fields null | UNKNOWN | IMPORTANT | Agent could not locate the section | Not independently verified |
| ExercisePrescription-Amendment-001 | Activity-Detail-Wireframe-Spec-W19.md | Display rule for distance fields | UNKNOWN | IMPORTANT | Agent could not locate the section | Not independently verified |
| **M-7-Premium-Upsell-Spec** | Program-Creation-Wireframe-Spec-W4.md | Pre-entry 3-program limit gate | **NOT APPLIED** | **CRITICAL** | Agent-reported; M-7's own text self-admits the gap | M-7 explicitly states W-4 "does not currently document the program-count limit gate" |
| M-7-Premium-Upsell-Spec | Program-Fork-Edit-Wireframe-Spec-W5.md | Same gate before fork | UNKNOWN | CRITICAL | Agent-reported, not independently confirmed | Plausibly correct (W-5 handles M-7 elsewhere per other citations) but not verified |
| **MVP-Amendment-Environment-Tags-v1.0** | Program-Browse/Detail/Creation (W-2/W-3/W-4) | Environment badges/field | **NOT APPLIED** | IMPORTANT | Agent-reported, absence-based | No environment_tags references found in any of the three targets |
| WSR-001-Workout-Share-Result-Architecture | W-17, W-19, M-1–M-4, L-11, S-2 | "Share" CTA across 8 targets | UNKNOWN | CRITICAL (if confirmed) | Agent-reported, partial evidence only | Several targets' own Non-Behaviors sections explicitly state no sharing exists (e.g., M-1: "no sharing surface exists") — real signal, but not all 8 targets individually confirmed |
| Workout-Templates-Hub-Spec-W26 | Workouts-Hub-Wireframe-Spec-W1.md, Activity-Type-Picker-Spec-W8.md | "My Templates" link; sourceTemplateId context | NOT APPLIED | IMPORTANT | Agent-reported; W-26's own text self-admits "W-1 amendment required" | W-8's own Non-Behaviors explicitly contradicts: "No 'Browse Templates' option is present on W-8" |
| Settings-Ecosystem-Final-Closure-Audit | P-4-Settings-Root-Architecture.md | Remove 4 stale "Account/Auth doesn't exist" references | NOT APPLIED | COSMETIC | Agent-reported; self-documented as deferred by the audit itself | Audit explicitly calls this "documentation lag, not a behavioral gap" |
| Settings-Ecosystem-Audit | P-6-Privacy-Architecture.md | "Share workouts with my squad" → "Allow squad check-in cards" | PARTIALLY APPLIED | COSMETIC | Agent-reported | Wireframe spec correct; architecture doc still stale in 2 spots |
| Critical-Decisions-Amendment-001 | Chapter-Detail-Wireframe-Spec-L3-L4.md | "Complete This Chapter" → "Seal This Chapter" | UNKNOWN | IMPORTANT | Not independently verified by any agent with a direct quote | Flagged for follow-up verification |
| Critical-Decisions-Amendment-001 | Goal-Hub-Wireframe-Spec-G1.md | Mark Risk 2/3 resolved | UNKNOWN | IMPORTANT | Not independently verified | Flagged for follow-up verification |

---

## Section 4 — Critical Findings

1. **O-2 / P-1 athlete-type model contradiction** — two pairs of LOCKED documents (O-2-Amendment-001 ↔ O-2; P-1-Amendment-002 ↔ P-1) disagree on the athlete-type taxonomy itself. This is not staleness in one direction — it's an active conflict between currently-authoritative sources.
2. **P-1's "P-2 Edit Profile" references** — literally point to the wrong screen (Progress Hub instead of the P-1.1 Edit Profile code P-1-Amendment-002 established). Found directly by this audit, not previously flagged.
3. **P-1's "P-3 Rank Detail" progress-bar reference** — describes a retired screen instead of the actual P-2.2 destination. Found directly by this audit, not previously flagged.
4. **P-1-Amendment-001's Progress row** — entirely absent from P-1's wireframe; an agent incorrectly reported this as applied without verifying.
5. **Identity-Amendment-001's @username field** — absent from P-1's Identity Header entirely.
6. **L-1's Risk 3/7/8** — already-confirmed stale text describing destinations (L-10, P-3 fallback) that no longer match reality.
7. **EP-A1's W-24 schema fields** — `restSeconds`/`distanceValue`/`distanceUnit` absent from the canonical ExercisePrescription schema definition, creating a discrepancy with W-25 (which already references them).
8. **M-7's W-4/W-5 program-limit gate** — self-admitted gap; free-tier athletes may be able to bypass the 3-program limit via W-4 directly.

---

## Section 5 — Important Findings

- MVP-Amendment-Environment-Tags-v1.0's three targets (W-2/W-3/W-4) — a self-contained feature amendment, fully unimplemented, but no evidence it's urgent for MVP.
- Workout-Templates-Hub-Spec-W26's two targets (W-1, W-8) — W-8's own text actively contradicts the requirement.
- WSR-001's Share CTA across 8 targets — real signal of a gap, but individually unconfirmed across all targets; marked UNKNOWN pending direct verification.
- EP-A1's Import Amendment and W-19 display-rule rows — UNKNOWN, not independently verified.
- Critical-Decisions-Amendment-001's "Seal This Chapter" terminology and G-1 risk-resolution rows — UNKNOWN, not independently verified.

---

## Section 6 — Cosmetic Findings

- P-6-Privacy-Architecture.md's stale "Share workouts with my squad" naming (2 spots) — wireframe spec already correct.
- P-4-Settings-Root-Architecture.md's 4 stale "Account/Auth doesn't exist" references — self-documented as deferred.
- EP-A1's W-9 rest-overlay note — optional behavior, missing note only.
- Workout-Builder-Wireframe-Spec-W24.md's stale "Authority: W-3 v1.2" citation and §22 "Required" framing for W3-A1/W9-A1 — both now resolved, citations never updated (named in this session's own W3/W9 amendments).

This brings the project's running consolidated documentation-lag cleanup backlog (tracked in Global-Architecture-Status-Audit.md §7) to well over a dozen items.

---

## Section 7 — Fully Applied Amendments

Rank-Computation-Model-Amendment-001, P-4 footer correction, W3-Amendment-001, W9-Amendment-001, W9-Amendment-002, Exercise-002's W-9 requirement (closed by W9-Amendment-002), and the Critical-Decisions-Amendment-001 rows targeting S-1 and the Monetization Amendment.

---

## Section 8 — Partially Applied Amendments

- **Identity-Amendment-001** — P-6's search toggle is applied; P-1's @username field and WwF's search-by-username are not (one confirmed NOT APPLIED, one UNKNOWN).
- **Settings-Ecosystem-Audit's P-6 finding** — the wireframe spec is correct; the architecture document is not.
- **ExercisePrescription-Amendment-001** — W-25 correctly references it; W-24 (the canonical schema owner) does not yet contain the fields.

---

## Section 9 — Not Applied Amendments

P-1-Amendment-001 (Progress row), O-2-Amendment-001 + P-1-Amendment-002 (jointly, the athlete-type model), P-3-Retirement-Amendment's P-1 and L-1 targets, ExercisePrescription-Amendment-001's W-24 schema row, M-7-Premium-Upsell-Spec's W-4 gate, MVP-Amendment-Environment-Tags-v1.0 (all 3 targets), Workout-Templates-Hub-Spec-W26 (both targets), Settings-Ecosystem-Final-Closure-Audit's P-4 cleanup, Settings-Ecosystem-Audit's P-6 architecture-doc cleanup.

---

## Section 10 — Superseded Amendments

**None confidently identified.** No amendment was found whose intent was achieved through a later document such that its original merge requirement no longer applies. Every gap found is a genuine pending-or-missing merge, not an obsolete one.

---

## Section 11 — Repository Consistency Assessment

The repository's overall architecture and wireframe coverage is strong — the prior Global Architecture Status Audit's finding that every MVP screen has a spec remains accurate. The problem this audit surfaces is a **separate axis**: documents that exist and are individually well-formed can still be **internally inconsistent with each other** once an amendment is locked but not merged.

The O-2/P-1 athlete-type contradiction is the clearest instance of this: it is not a missing destination (like L-1's stale risk callouts) but two LOCKED sources of truth that actively disagree. Profile-Wireframe-Spec-P1.md is the repository's highest-concentration failure point — it is the target of at least four separate amendments (P-1-Amendment-001, P-1-Amendment-002, Identity-Amendment-001, P-3-Retirement-Amendment) and has unmerged or contradictory content from three of them.

The pattern is consistent across ecosystems: an amendment is authored, reviewed, and locked as a standalone artifact, but the act of locking it does not appear to have ever required re-opening and editing its named targets. This matches the structure already named in the prior correction pass and is now confirmed at a project-wide scale.

---

## Section 12 — Recommended Remediation Order

1. **Profile-Wireframe-Spec-P1.md** — the highest-concentration target. Apply, in one pass: the 4-athlete-type correction (§4.4, §6.2), the @username line (Identity Header), the Progress row (between Rank and Honors), the P-2→P-1.1 Edit Profile reference correction, and the P-3→P-2.2 progress-bar destination correction. Five distinct fixes, one document, one pass.
2. **First-Time-Setup-Wireframe-Spec-O2.md** — the matching 4-athlete-type correction, plus its own P-2→P-1 editability-reference correction (per O-2-Amendment-001 §12.1).
3. **Workout-Builder-Wireframe-Spec-W24.md §7.6** — add the three EP-A1 schema fields, resolving the W-24/W-25 discrepancy.
4. **Program-Creation-Wireframe-Spec-W4.md / Program-Fork-Edit-Wireframe-Spec-W5.md** — add the M-7 program-count limit gate (revenue-relevant; verify W-5's status directly before assuming it needs the same fix).
5. **Legacy-Hub-Wireframe-Spec-L1.md** — Risk 3/7/8 text corrections (already scoped in the prior correction pass's "Remaining Known Issues").
6. **WSR-001's 8 targets** — verify each individually before remediating; currently UNKNOWN, not confirmed NOT APPLIED.
7. **The consolidated cosmetic cleanup backlog** — single pass across all COSMETIC items found this session and in Section 6 above.

Items 1-4 are CRITICAL and should be resolved before implementation begins. Items 5-7 are IMPORTANT/COSMETIC and can proceed in parallel with early implementation work.

---

## Final Questions

1. **How many total amendments exist?** ~15 primary amendment documents, plus 3 architecture/audit documents that function as amendments via their own required-update tables (Exercise-002, M-7, WSR-001, W-26).
2. **How many are fully applied?** 6 confirmed (RCM, P-4, W3-A1, W9-A1, W9-A2, Exercise-002→W-9), plus the Critical-Decisions-Amendment-001 rows targeting S-1/Monetization.
3. **How many are partially applied?** 2-3 (Identity-Amendment-001, the P-6 architecture/wireframe split, EP-A1).
4. **How many are not applied?** 6-7 confirmed, with several more UNKNOWN pending individual verification (notably all of WSR-001's targets).
5. **Which findings are actual MVP launch blockers?** The O-2/P-1 athlete-type contradiction (two LOCKED sources disagree on the taxonomy) and P-1's stale P-1.1/P-2/P-3 navigation references (could send an engineer to build against the wrong screen) are the clearest launch blockers — they affect the single most-referenced identity/profile surface in the app. EP-A1's missing W-24 schema fields are a blocker if any implementation work has already started against W-25's (correct) schema while assuming W-24 matches.
6. **Which findings can safely be deferred?** All COSMETIC items, and MVP-Amendment-Environment-Tags-v1.0 (no evidence of urgency for a self-contained feature amendment).
7. **After remediation, what exact work remains before implementation can begin?** Remediation Order items 1-4 (Section 12) must close before implementation begins. Items 5-7 do not block implementation and can run in parallel.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Full reconciliation audit across 15 ecosystems. Corrects two contradictory agent claims (P-1's Progress row, W-17's existence) and surfaces two new findings not previously flagged by any prior audit pass (P-1's stale P-2/P-1.1 Edit Profile references; P-1's stale P-3/P-2.2 progress-bar reference). |

---

*Forge Legacy Amendment Reconciliation Audit*
*June 2026*
*Status: LOCKED*
