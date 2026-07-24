# Honors Expansion Plan — Pre-Authoring Audit

## v1.0 | June 2026

**Status:** AUDIT COMPLETE — Findings only. No catalog authoring (no `honorType` IDs, thresholds, or qualification logic) has been performed against `Honors-Expansion-Plan-v1.0.md` as a result of this audit.

**Type:** Audit Document (not an architecture amendment, not a spec)

**Subject:** `Docs/Honors-Expansion-Plan-v1.0.md` — 12 families, ~225 projected honors.

**Audited Against:**
- `Honor-Catalog-v1.0-LOCKED.md` (53 types, 11 catalog families, 7 categories)
- `HonorInstance-Architecture-v1.0.md` (LOCKED)
- `Honor-Evaluation-Service-Architecture-v1.0.md` (LOCKED — 8 evaluator families)
- `Honors-Spec-L10.md` v1.0.1 (LOCKED — 7 display categories)
- `Honor-Detail-Sheet-Spec-L11.md` v1.1 (LOCKED — 7 badge variants)
- `Honor-Earned-Modal-Spec-M2.md` v1.2 (LOCKED)
- `FORGE_LEGACY_PRODUCT_DNA.md` (Locked Source-of-Truth)
- `Exercise-Library-Architecture-v1.0.md` v1.1 (LOCKED)
- `Rank-Computation-Model.md` (cross-check for AD-27 — honors do not contribute to rank)

**Why this audit exists:** The Honors architecture workstream was explicitly closed (`Honor-Detail-Sheet-Spec-L11.md` §19: *"The Honors architecture workstream is complete... No remaining Honors workstream items exist"*), and the catalog itself is governed by a hard rule: *"No honor types may be added, removed, or modified without a formal architecture amendment"* (`Honor-Catalog-v1.0-LOCKED.md`, line 13). A 53→225 expansion (4.2×) is not a content tweak — it is the kind of change this project has repeatedly found benefits from an audit pass before authoring (cf. Rank-Computation-Model Lock Audit, Amendment Reconciliation Audit, Settings Ecosystem Audit). This document performs that pass.

---

## 1. Executive Summary

| # | Finding | Severity | Type |
|---|---------|----------|------|
| F1 | "Family" is a fourth, undefined meaning of an already-overloaded term (catalog family / evaluator family / display category all already exist and mean different things) | High | Architecture — terminology |
| F2 | Family 10 ("Milestones & Firsts") duplicates existing first-tier honors from other families | High | Content — duplicate reward |
| F3 | "First rank-up" contradicts the Evaluation Service's explicit non-trigger list | High | Architecture — contradiction |
| F4 | "First honor" is self-referential / evaluation-order-undefined | High | Architecture — design gap |
| F5 | Family 1 (Consistency) and Family 11 (Comebacks & Resilience) sit on top of statistics that do not exist, and brush against Product DNA's explicit "not a streak app" identity | High | Product DNA conflict + architecture gap |
| F6 | Family 6 (Endurance & Conditioning) has no underlying data model — Forge Legacy logs sets/reps/weight only; no cardio exercise category, no distance/time/pace field | High | Architecture — unimplementable as scoped |
| F7 | Family 5 (Strength) PR-record storage is hard-scoped to 3 lifts (bench/squat/deadlift); Overhead Press and Pull-Up are not in that storage layer | Medium | Architecture gap |
| F8 | Family 9 (Squads & Community) statistics (encouragement, support, engagement) do not exist anywhere in the Athlete Statistics Record | Medium | Architecture gap |
| F9 | Family 2 (Workout Count) silently drops "Hours Forged," which is currently part of the same catalog family and evaluator | Medium | Ambiguity |
| F10 | Family 12 (Prestige) implies multi-condition (AND) qualification logic; only existing precedent is Club's PR-sum, not a general pattern | Medium | Architecture gap |
| F11 | 12 families vs. 7 locked display categories / 7 locked badge variants — mapping is undefined | Medium | Architecture — downstream impact |
| F12 | M-2's "at most a handful of evaluation events" assumption was written against a 53-type catalog; untested at 225 | Low | Scaling — re-validate, not a defect |
| F13 | Family 8 (Longevity) and most of Family 3 (Programs) are clean, low-risk, additive extensions of existing evaluators | — | Positive control — no issue found |

**Bottom line:** This plan should not move to catalog authoring yet. Several families (8, and most of 3) are safe to author today. Several others (1, 6, 9, 10, 11, 12) require explicit product/architecture decisions — some of which are policy questions for the user, not something to infer or invent.

---

## 2. Terminology Collision (F1)

Three terms already exist in locked architecture, each meaning something different:

| Term | Defined In | Meaning | Count |
|------|-----------|---------|-------|
| Catalog family | `Honor-Catalog-v1.0-LOCKED.md` | Sub-grouping within a category (e.g., "Bench Press Family," "Clubs lbs Family") | 11 |
| Evaluator family | `Honor-Evaluation-Service-Architecture-v1.0.md` §4 | A service component that evaluates a coherent domain (e.g., `StrengthEvaluator`, `ChapterEvaluator`) | 8 |
| Display category | `Honors-Spec-L10.md` §5.1 | The 7 sections athletes see in L-10, each with its own badge in L-11 | 7 |

The expansion plan's "Family" (12) does not map 1:1 to any of these. Some of its families are closer to *display categories* (e.g., "Legacy & Chapters," "Longevity" — explicitly called "signature Forge Legacy families," which reads as category-level identity, not a sub-grouping). Others are closer to *evaluator domains* (e.g., "Endurance & Conditioning" would need its own evaluator). Before authoring, "Family" needs to be resolved into the existing three-layer model — reusing the established vocabulary — rather than introducing an ambiguous fourth term into a project that has twice before (Rank-Computation-Model, P-1) suffered from documentation produced before terminology was reconciled.

**Recommendation:** Rename plan-level "Family" to "Display Category" if 12 are intended to replace/extend the locked 7 (this is the larger, more disruptive option — it requires amending `Honors-Spec-L10.md` §5.1 and `Honor-Detail-Sheet-Spec-L11.md` §6.1–6.2), or restructure so the 12 groupings nest under the existing 7 categories as new catalog families (the smaller, less disruptive option). This is a decision for the user — not inferred here.

---

## 3. Duplicate Reward Findings (F2–F4)

### F2 — Family 10 duplicates existing honors

| Family 10 item | Already exists as | Family/Category |
|----------------|-------------------|-----------------|
| "First workout" | `first_workout_logged` | Training (Family 2 in the new plan) |
| "First graduation" | `first_program_graduated` | Programs (Family 3) |
| "First chapter sealed" | `first_chapter_sealed` | Chapters (Family 7) |

If Family 10 is authored as written, an athlete would receive two separate honor records for the same accomplishment (e.g., both `first_workout_logged` and a new `first_workout_milestone`-style entry) the first time they log a workout. `Honor-Catalog-v1.0-LOCKED.md`'s own closure record explicitly ran a "Duplicate check" and "Category/family conflicts" pass before locking — that same discipline applies here, and this plan fails it as currently scoped.

**Recommendation:** Either cut the three duplicated items from Family 10, or make Family 10 a non-catalog UI treatment (e.g., a one-time L-1/L-10 callout that *references* the existing honor record rather than creating a second one).

### F3 — "First rank-up" contradicts a locked non-trigger list

`Honor-Evaluation-Service-Architecture-v1.0.md` §3.2 explicitly lists **Rank Up** as an event that does **not** invoke the evaluation service. This is not an oversight — `Honor-Catalog-v1.0-LOCKED.md` AD-27 states "Honors do not contribute to rank," and the separation between the rank system (M-1 Rank-Up ceremony, Rank-Computation-Model) and the honors system has been a deliberate boundary throughout this project. Adding "First Rank-Up" as an honor requires:
1. Amending ES §3.2's trigger list (a locked architecture decision, not a content addition)
2. A new `RankEvaluator` family
3. A sequencing decision for M-1 vs. M-2 — does a rank-up that also earns an honor show two ceremonies, or one? No precedent exists for two ceremony surfaces firing from the same event (the closest analog, Chapter Seal, deliberately routes honors *away* from M-2 and into M-5/L-6 specifically to avoid this).

**Recommendation:** Treat this single item as its own small architecture decision, not a catalog row. Do not author it without resolving the M-1/M-2 sequencing question.

### F4 — "First honor" is self-referential

An honor for "earning your first honor" must fire in the same evaluation transaction as whichever honor is actually earned first (almost always `first_workout_logged`). No existing evaluator has visibility into "is this the athlete's first honor across all families" — each evaluator family is domain-scoped by design (ES §2: "Event-specific evaluation... each trigger invokes only the evaluator families capable of producing new honors given that event type"). Awarding this honor would require a cross-family check that runs *after* all other evaluators in the same transaction and asks "did this transaction produce the athlete's first-ever `HonorInstance`?" — a new pipeline stage, not a new evaluator.

**Recommendation:** Either accept the new pipeline stage as a scoped architecture decision, or drop this item — the practical effect ("First Workout Logged" already reads as a clear first-honor moment per its own L-11 description: *"The first session is the hardest to start. You started."*) may already cover the intended emotional beat without a second mechanism.

---

## 4. Product DNA Conflicts (F5)

`FORGE_LEGACY_PRODUCT_DNA.md` §4 ("What Forge Legacy Is Not") opens with: *"A streak app."* §10 ("Explicitly Prohibited Patterns") lists, without qualification beyond requiring formal review: *"Streak pressure systems"* and *"'Days since workout' shame mechanics."* §2 ("Accountability Without Shame") states the athlete should never feel punished for *"Missing a workout, Taking time off... Starting over."*

This is not an absolute ban — §10's own closing line is *"Without a formal architecture review"* — but it means Family 1 (Consistency: consecutive weeks/months) and Family 11 (Comebacks & Resilience: return after absence, rebuild streak) are exactly the category of feature the Product DNA flags for review, not something that can be added as routine catalog content. Two specific risks:

1. **Mechanism risk:** Both families require tracking "current streak" or "gap since last session" as live state. Today, no such state exists anywhere in the locked statistics model (`Honor-Evaluation-Service-Architecture-v1.0.md` §9.1's six counters: `workoutCount`, `hoursForged`, `chaptersSealed`, `goalsAchieved`, `programsGraduated`, `workoutsWithFriend` — none of them track time-since-last-session or run-length). Building this is a new statistics domain, not a threshold addition.
2. **Framing risk:** Even if built honor-positive-only (per L-10's own philosophy: only earned things are ever shown — no progress bars, no "X of Y," no countdown), the *existence* of a system that silently tracks gaps to detect "comebacks" is adjacent to the prohibited "days since workout" mechanic even if the UI never surfaces a negative number. This is exactly the kind of feature the Product DNA's own test (§11, the 7-question Product Decision Test) exists to run before implementation — questions 5 and 6 ("Does this avoid comparison?" / "Does this avoid shame?") apply directly.

**Recommendation:** Run Families 1 and 11 through the Product DNA's 7-question test explicitly (as a named decision record) before authoring, and design them so the underlying counters can only ever produce positive, retrospective honors (e.g., "Trained in 50 of the last 52 weeks" computed and awarded after the fact) rather than any live-tracked, breakable counter.

---

## 5. Unimplementable as Scoped — Family 6 (F6)

`Exercise-Library-Architecture-v1.0.md` §3.2 defines exactly six `ExerciseCategory` values: `PUSH`, `PULL`, `LEGS_AND_GLUTES`, `CORE`, `FULL_BODY`, `MOBILITY`. There is no cardio, running, or cycling category. `Honor-Catalog-v1.0-LOCKED.md` AD-30 establishes that the entire honors qualification model for physical performance is **"actual weight only — no RPE, no estimated 1RM"** — i.e., the data model honors evaluate against is weight-based, not duration- or distance-based. No exercise log field for distance, pace, or elapsed cardio time exists in any document this audit located. Rowing Machine and Battle Ropes appear in the library as `FULL_BODY` equipment, but as weight/rep-logged exercises, not distance/time-logged ones.

This means Family 6 — "Running, Cycling, Conditioning, Distance milestones, Time milestones" — has no feature to attach to. This is not a missing evaluator (which can be built); it is a missing *product capability* (cardio logging with distance/pace/time fields), which is a roadmap decision, not an honors-architecture decision.

**Recommendation:** Defer Family 6 out of this expansion entirely until/unless cardio/distance logging is independently decided as a roadmap item. Do not author placeholder honor types against a feature that doesn't exist (violates Rule 3 — "Do not assume implementation if not documented").

---

## 6. Architecture Gaps Requiring New Infrastructure (F7–F10)

| Family | Gap | What exists today | What's missing |
|--------|-----|--------------------|-----------------|
| 5 — Strength (Overhead Press, Pull-Up) | PR storage is hard-scoped to 3 lifts | `Honor-Evaluation-Service-Architecture-v1.0.md` §9.2: "One record per canonical qualifying lift (bench press, squat, deadlift)" | Two new PR record slots. Exercises themselves already exist canonically (`Exercise-Library-Architecture-v1.0.md` §3.3: Overhead Press under `PUSH`, Pull-Up under `PULL`) — only the PR-tracking layer is missing. Also undecided: does the 3-lift "Club" combined-total concept become a 5-lift concept, or stay 3-lift? Plan doesn't say. |
| 9 — Squads & Community | No statistics counters for reactions, check-ins, or "support/encouragement" | ES §9.1's six counters do not include any squad-interaction metric | A new statistics domain + new evaluator family. Must also be checked against Product DNA §10's prohibition on "Public workout statistics" and squad's own "Small, Private, High Trust" framing (§9) — squad honors should reward private participation, not anything leaderboard-adjacent. |
| 12 — Prestige | Multi-condition (AND) qualification | The only existing multi-signal pattern is `ClubEvaluator`, which sums three PRs into one comparable total (still a single-value-vs-threshold check) | A genuinely new evaluator pattern: comparing multiple independent counters (e.g., years AND workout count AND chapters sealed) simultaneously. Until Prestige criteria are concrete, the catalog's own "no duplicate/no threshold conflict" consistency pass (performed for the 53-type lock) cannot be run. |

---

## 7. Ambiguity — Family 2 Drops Hours Forged (F9)

Today, the Training catalog family (`Honor-Catalog-v1.0-LOCKED.md`) bundles two sub-families under one evaluator (`TrainingEvaluator`): Workout Count (5 types) and Hours Forged (6 types) — 12 types total including `first_workout_logged`. The expansion plan's Family 2 is titled "Workout Count" and its examples are all count-based ("10 workouts," "100 workouts," etc.) — Hours Forged is not mentioned anywhere in any of the 12 new families.

This could mean: (a) Hours Forged folds into Family 2 silently, (b) Hours Forged is intentionally dropped from the expansion, or (c) Hours Forged was simply omitted from the plan by oversight. These have materially different outcomes and should not be guessed.

**Recommendation:** Resolve explicitly before authoring Family 2.

---

## 8. Downstream Impact on Locked UX Specs (F11)

`Honors-Spec-L10.md` §5.1 locks exactly 7 display categories in a fixed order, and `Honor-Detail-Sheet-Spec-L11.md` §6.1–6.2 locks exactly 7 badge variants, one per display category (Club already merges into Strength as the established precedent for "catalog family ≠ display category"). Whatever the 12 plan-level families resolve to (per Finding F1), one of two things must happen, and both are real work beyond catalog content:

- **If new display categories are added:** `Honors-Spec-L10.md` §5.1's category table, §7.2's progression-order tables, and §18's validation checklist all need amendment; `Honor-Detail-Sheet-Spec-L11.md` §6.2's badge mapping table needs amendment plus new badge artwork (visual design scope, currently deferred per L-11 §19's "Remaining Honors Workstream Items").
- **If new families nest under the existing 7 categories** (the Club precedent): no L-10/L-11 amendment needed, only catalog and evaluation-service amendments. This is the lower-disruption path.

**Recommendation:** This is the same decision as F1, viewed from the UX-spec side. Resolving F1 resolves this automatically.

---

## 9. Scaling Re-Validation, Not a Defect (F12)

`Honor-Earned-Modal-Spec-M2.md` §5 states multi-honor bundling is an edge case because "a single session typically triggers at most a handful of evaluation events even across the full 53-type catalog." At 225 types — particularly with denser ladder families (Strength at 35, Legacy & Chapters at 25) — a single large PR jump or a single chapter seal could plausibly cross more thresholds at once than today. `Honors-Spec-L10.md` §16 already anticipated *instance* volume growth (100+ HonorInstances per long-tenured athlete, no pagination) — that part of the architecture is already future-proof. What hasn't been validated is *simultaneous* multi-threshold crossing at the new catalog density. This is not a contradiction in the locked specs; it's an assumption worth re-confirming once concrete thresholds exist.

---

## 10. What's Clean — No Issue Found (F13)

- **Family 8 (Longevity → 20 types):** `LongevityEvaluator` already runs on every evaluation-triggering event (ES-10) and its logic is a pure date-threshold comparison against `accountCreationDate`. Adding 30-day, 90-day, 15-year, and 20-year thresholds is a content-only change — no new statistics, no new evaluator, no new metadata shape. **This is the reference example for how the rest of this expansion should look.**
- **Family 3 (Programs), excluding "program streaks" and "program family mastery":** straightforward extension of `ProgramEvaluator`'s existing `programsGraduated` counter pattern. "Program family mastery" (graduating an entire program lineage via `successorProgramId` chains, per the locked Program Ecosystem Architecture) is a new but well-grounded evaluation pattern — feasible, just not a pure threshold check.

---

## 11. Recommended Resolution Order Before Authoring

1. Resolve F1 (terminology: 12 plan-families → existing 3-layer model). Everything else depends on this.
2. Resolve F2–F4 (cut or redesign Family 10; explicitly scope "First Rank-Up" as its own decision with M-1/M-2 sequencing; decide whether "First Honor" is a catalog entry or a UI treatment).
3. Run the Product DNA 7-question test explicitly against Families 1 and 11 (F5); record the decision.
4. Decide Family 6's fate (F6) — defer entirely, pending a separate cardio-logging roadmap decision.
5. Resolve F9 (Hours Forged disposition).
6. Author Families 8 and the count-based parts of 3 first — they require no new architecture and can proceed as a straightforward catalog amendment once F1 is resolved.
7. Scope new architecture for Families 5 (PR storage extension), 9 (squad statistics), and 12 (multi-condition evaluation) as their own small architecture notes — each is buildable, none should be bundled silently into a "just add catalog rows" pass.
8. Author the eventual catalog change as a numbered amendment to `Honor-Catalog-v1.0-LOCKED.md` (e.g., `Honor-Catalog-Amendment-001-Expansion.md`), following this project's established amendment pattern (cf. `Architecture-Amendment-001-Import.md`) rather than replacing the locked v1.0 document outright.

---

## 12. Open Questions for the User (Not Decided Here)

- Should the 12 plan-level families become 12 new display categories (larger UX change) or nest under the existing 7 (smaller, Club-precedent change)?
- Is cardio/distance/time logging a roadmap item at all? If not, Family 6 should be removed from this plan rather than deferred indefinitely.
- Should "First Rank-Up" exist as an honor, and if so, what happens when it coincides with a session that also fires M-2 — does M-1 take precedence, does M-2 absorb it, or do both fire?
- Is "Hours Forged" intended to continue as a parallel ladder to Workout Count, or was its omission from Family 2 intentional?

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial audit of Honors-Expansion-Plan-v1.0.md. 13 findings (F1–F13) against locked Honors architecture, Honor Catalog, and Product DNA. No catalog authoring performed. |

---

*Honors Expansion Plan — Pre-Authoring Audit v1.0*
*Forge Legacy | June 2026*
