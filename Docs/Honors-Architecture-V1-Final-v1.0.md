# Forge Legacy — Honors System: Final V1 Architecture
## Version 1.0 | June 2026

**Status:** LOCKED — Master Synthesis & Reconciliation Document
**Type:** Architecture/schema-level document. Defines every honor's `honorType`, category, family, and qualification threshold. Does **not** author the full descriptive catalog content (L-11 descriptions, rationale copy, preview-line templates) for the new honors introduced here — that is a separate, future content-authoring pass, gated on this document's approval, governed by the companion `Honors-Authoring-Standards-v1.0.md`.
**Authority:** `Honor-Catalog-v1.0-LOCKED.md` (LOCKED), `Honor-Evaluation-Service-Architecture-v1.0.md` (LOCKED), `HonorInstance-Architecture-v1.0.md` (LOCKED), `Honors-Spec-L10.md` (LOCKED), `Honors-Expansion-Plan-Pre-Authoring-Audit.md`, `Honors-Taxonomy-Reconciliation-v1.0.md`, `Honors-Reserved-Categories-Strategic-Evaluation.md`, `Honors-Catalog-Expansion-Pass-1.md` through `-6-Comebacks-Prestige.md`, `Endurance-Multi-Activity-Architecture-Evaluation.md`, `Endurance-Statistics-Architecture-Amendment-001.md`, `Pace-Speed-Definition-Architecture-Note.md`, `ActivityType-Expansion-Evaluation-Hiking-Rowing.md`, `Rank-Computation-Model.md`, Product DNA (LOCKED)
**Downstream impact:** `Honor-Catalog-v1.0-LOCKED.md` (→ v1.5), `Honor-Evaluation-Service-Architecture-v1.0.md` (amended), `HonorInstance-Architecture-v1.0.md` (amended), `Honors-Spec-L10.md` (amended), `Honors-Authoring-Standards-v1.0.md` (companion doc). `Profile-Wireframe-Spec-P1.md` is **not** amended — the two new fields designed in §3 are deferred to V2 alongside the Strength families that needed them.

---

## Section 1 — Purpose and Reconciliation Summary

### 1.1 The Two-Lineage Discovery

The Honors system accumulated two parallel lineages after the original 53-honor v1.0 lock, neither aware of the other's full scope:

1. **The locked production catalog** (`Honor-Catalog-v1.0-LOCKED.md`) progressed through v1.1 (+9 Competition), v1.3 (+5 Communities, "Community"→"Partnership" rename), v1.4 (+15 Squad) — reaching **82 honors across 10 categories**. Each of these additions was fully merged and locked at the time it landed.

2. **Six "Expansion Pass" documents** (`Honors-Catalog-Expansion-Pass-1.md` through `-6-Comebacks-Prestige.md`) were authored against the same 53-honor baseline, working through a structured pre-authoring audit and reconciliation process, but were **never merged into the locked lineage**. These cover an entirely different axis: Strength depth (Overhead Press, Pull-Up), Training/Chapters/Goals/Programs/Longevity depth, full Endurance support, cumulative Consistency, and Prestige.

Pass 3 and Pass 4 in particular were nearly lost to project memory: an earlier audit (`Honors-Expansion-Plan-Pre-Authoring-Audit.md`, Finding F6) correctly identified that no cardio data model existed at the time and called Endurance honors unimplementable. That gap was separately closed by `Endurance-Statistics-Architecture-Amendment-001.md` (LOCKED) and `Pace-Speed-Definition-Architecture-Note.md` (LOCKED), after which Pass 3 and Pass 4 were authored against the new, real data — but nothing ever recorded that the original blocker had been resolved, so the Endurance category sat finished but invisible.

This document is the bridge: it reconciles both lineages, resolves every named architecture prerequisite the six passes left open, adds the two new capabilities requested for V1 (sex-specific milestones, relative-strength milestones), formalizes Strength Club, and adds a new Hidden Honors category.

### 1.2 What This Document Does Not Do

- Does not touch any exercise, program, or taxonomy content.
- Does not author L-11 descriptive copy, rationale text, or preview-line templates for any new honor — only `honorType`, category/family placement, and qualification threshold.
- Does not retroactively fix `Honor-Evaluation-Service-Architecture-v1.0.md`'s and `HonorInstance-Architecture-v1.0.md`'s pre-existing drift around Competition/Communities/Squad (those categories were locked into the catalog at v1.1/v1.3/v1.4 without ever being reflected in the Evaluation Service or HonorInstance docs — a real, separate gap, noted in §9.5 but not repaired here, to keep this pass's scope to what was requested).
- Does not produce any actual media, artwork, or badge visuals for new categories — only confirms each new category needs its own badge slot (visual production is separate, future work, consistent with how this project treats production-standards-vs-production-itself elsewhere).

---

## Section 2 — Full V1 Manifest

### 2.1 Manifest Table

| Category | v1.4 today | This pass adds | New total |
|---|---:|---|---:|
| Training | 12 | +5 (Pass 1) +1 (Pass 2) +5 (Pass 5 Consistency) | **23** |
| Strength | 18 | +8 (Pass 1: Overhead Press, Pull-Up) | **26** |
| Goals | 4 | +2 (Pass 1) | **6** |
| Programs | 4 | +3 (Pass 1, incl. Family Mastery) | **7** |
| Chapters | 8 | +4 (Pass 1) +2 (Pass 2) | **14** |
| Longevity | 4 | +3 (Pass 1) | **7** |
| Partnership | 3 | unchanged | **3** |
| Competition | 9 | unchanged | **9** |
| Communities | 5 | unchanged | **5** |
| Squad | 15 | unchanged | **15** |
| **Endurance** *(new category)* | 0 | +38 (Pass 3 + Pass 4, Running/Walking/Cycling/Swimming only) | **38** |
| **Prestige** *(new category)* | 0 | +8 (Pass 6 Part B) | **8** |
| **Hidden** *(new category)* | 0 | +6 (new, this document) | **6** |
| **TOTAL** | **82** | **+85** | **167** |

**Not in this manifest:** two new Strength families — Sex-Specific Milestones (12) and Relative Strength Milestones (12) — were fully designed during this pass and then **deferred to V2 by explicit PO decision** before final lock. Full design preserved in §3 below. This is a scope decision, not a technical blocker, and is tracked separately from the genuinely-blocked deferrals in §9.

### 2.2 Explicitly Deferred — Not in the 167

Two distinct kinds of deferral are tracked separately: **scope decisions** (the design is complete and architecture-clean; a PO chose not to ship it in V1) and **genuine blockers** (something else has to be built first).

**Scope decisions (PO-approved deferral, not a technical blocker):**

| Deferred item | Honor count | Why deferred | What unblocks it |
|---|---:|---|---|
| Sex-Specific Strength Milestones | 12 | Fully designed (§3); deferred to V2 by PO decision before final V1 lock | A future V2 scoping pass — no architecture work required, design is ready to merge as-is |
| Relative Strength Milestones | 12 | Fully designed (§3); deferred to V2 by PO decision before final V1 lock | Same — design-complete, ready to merge |

**Genuine blockers (a missing dependency, not a choice):**

| Deferred item | Honor count | Why deferred | What unblocks it |
|---|---:|---|---|
| Hiking Endurance (Pass 3 + 4) | 9 | `HIKE` not yet in the locked `ActivityType` enum | The enum amendment evaluated and ready in `ActivityType-Expansion-Evaluation-Hiking-Rowing.md`, not yet executed |
| Rowing Endurance (Pass 3 + 4) | 9 | `ROW` not yet in the locked `ActivityType` enum | Same enum amendment |
| Comebacks & Resilience (Pass 6 Part A) | 0 | No gap-since-last-session statistic exists anywhere in the architecture; none invented | A future "most recent session date + gap duration" statistics amendment, scoped and approved-in-principle per Pass 6 §2 but not yet built |
| Bodybuilding volume-PR family | 0 | No session-volume tracking statistic exists for any lift; Strength's load-PR pattern has no Bodybuilding equivalent | A future volume-tracking architecture decision (out of this pass's scope per explicit instruction — no placeholder logic invented) |

Total deferred: 42 honors (24 by scope decision + 18 genuinely blocked) with content already drafted and ready, withheld from the V1 manifest.

### 2.3 Family Count Correction

`Honor-Catalog-v1.0-LOCKED.md` v1.4's header claims **22 families**. Recounting the catalog's own per-category family breakdown (Strength 5 + Chapters 2 + Training 3 + Goals 1 + Programs 1 + Partnership 1 + Longevity 1 + Competition 3 + Communities 1 + Squad 7) sums to **25**, not 22. This is a recurrence of the arithmetic inconsistency `Honors-Taxonomy-Reconciliation-v1.0.md` (Finding T1) first caught at the v1.0/v1.2.1 stage — the check was never re-run after the v1.3/v1.4 Competition/Communities/Squad additions, and the error crept back in.

This pass adds: Strength +2 families (Overhead Press, Pull-Up), Chapters +1 (Duration), Training +1 (Consistency), Endurance +2 (Milestone, Lifetime Distance — wholly new category), Prestige +2 (Breadth Ladder, Named Combinations — wholly new category), Hidden +1 (single family, consistent with how Goals/Programs/Longevity each use one family per category).

**Corrected family count: 25 (fixed v1.4 baseline) + 9 (this pass) = 34 families.** (Two additional families — Sex-Specific Milestones, Relative Strength Milestones — were designed and then deferred to V2; see §3.)

---

## Section 3 — Deferred to V2: New Strength Families (Not in V1)

> **Status: DEFERRED TO V2 by PO decision.** Both families below were fully designed during this V1 architecture pass — thresholds checked for collisions, metadata shapes specified, evaluator logic written — and then deferred before final V1 lock. This is a **scope decision, not a technical blocker**: nothing here is unbuildable or unresolved, it simply isn't shipping in V1. The design is preserved in full so a future V2 pass can merge it without rework. **Neither family exists in the V1 catalog, V1 evaluators, or V1 Profile schema.** `Profile-Wireframe-Spec-P1.md` ships unchanged at v1.3 as a direct consequence.

Both new families were scoped to **Bench Press, Squat, and Deadlift only** — matching Club's existing scope discipline, not extended to Overhead Press or Pull-Up. Both were designed to be strictly **additive**: the existing universal ladder (Bench 135/225/315/405 lbs, Squat 225/315/405/500 lbs, Deadlift 315/405/500/600 lbs — unit-adaptive, unchanged) remains the only Strength-milestone path in V1. Neither new field is mandatory, and neither would be framed in any UI as a path to unlocking honors (see §3.3) — that design constraint carries forward unchanged for whenever V2 picks this up.

### 3.1 Relative Strength Milestones (12 honors) — bodyweight-ratio, sex-neutral

Requires only `bodyweightValue` declared (see §3.3). Computed as `weight lifted ÷ currently declared bodyweight` at the moment of the qualifying Session Save event — V1 uses whatever bodyweight value is currently on the athlete's profile at evaluation time, not a historical log (documented simplification, §10 AD-V1-2).

| honorType | Tier | Bench | Squat | Deadlift |
|---|---|---|---|---|
| `bench_relative_milestone_1` / `squat_relative_milestone_1` / `deadlift_relative_milestone_1` | 1 | 0.75× bodyweight | 1.0× bodyweight | 1.25× bodyweight |
| `bench_relative_milestone_2` / `squat_relative_milestone_2` / `deadlift_relative_milestone_2` | 2 | 1.0× bodyweight | 1.5× bodyweight | 1.75× bodyweight |
| `bench_relative_milestone_3` / `squat_relative_milestone_3` / `deadlift_relative_milestone_3` | 3 | 1.5× bodyweight | 2.0× bodyweight | 2.25× bodyweight |
| `bench_relative_milestone_4` / `squat_relative_milestone_4` / `deadlift_relative_milestone_4` | 4 | 2.0× bodyweight | 2.5× bodyweight | 3.0× bodyweight |

Metadata: `weightDisplay` (the actual weight lifted), `bodyweightDisplay` (snapshotted bodyweight used in the calculation), `ratioDisplay` (pre-formatted, e.g. "1.5× bodyweight"), `unitSystem`.

### 3.2 Sex-Specific Strength Milestones (12 honors) — absolute weight, sex-adaptive thresholds

Requires only `biologicalSex` declared (see §3.3). Same `honorType` ID regardless of which table applies to the athlete — identical pattern to the existing lbs/kg-adaptive Club mechanic (AD-31e). Every threshold below was checked against the universal ladder and against Club's thresholds to confirm zero exact-value collisions — this is a genuinely distinct recognition axis, not a relabeled duplicate of an existing honor.

**Female table:**

| honorType | Tier | Bench | Squat | Deadlift |
|---|---|---|---|---|
| `bench_sex_milestone_1` / `squat_sex_milestone_1` / `deadlift_sex_milestone_1` | 1 | 65 lbs / 30 kg | 95 lbs / 45 kg | 115 lbs / 55 kg |
| `bench_sex_milestone_2` / `squat_sex_milestone_2` / `deadlift_sex_milestone_2` | 2 | 95 lbs / 45 kg | 135 lbs / 60 kg | 165 lbs / 75 kg |
| `bench_sex_milestone_3` / `squat_sex_milestone_3` / `deadlift_sex_milestone_3` | 3 | 125 lbs / 55 kg | 185 lbs / 85 kg | 225 lbs / 100 kg |
| `bench_sex_milestone_4` / `squat_sex_milestone_4` / `deadlift_sex_milestone_4` | 4 | 175 lbs / 80 kg | 245 lbs / 110 kg | 295 lbs / 135 kg |

**Male table:**

| honorType | Tier | Bench | Squat | Deadlift |
|---|---|---|---|---|
| `bench_sex_milestone_1` / `squat_sex_milestone_1` / `deadlift_sex_milestone_1` | 1 | 185 lbs / 85 kg | 275 lbs / 125 kg | 365 lbs / 165 kg |
| `bench_sex_milestone_2` / `squat_sex_milestone_2` / `deadlift_sex_milestone_2` | 2 | 245 lbs / 110 kg | 345 lbs / 155 kg | 435 lbs / 195 kg |
| `bench_sex_milestone_3` / `squat_sex_milestone_3` / `deadlift_sex_milestone_3` | 3 | 295 lbs / 135 kg | 415 lbs / 185 kg | 495 lbs / 230 kg |
| `bench_sex_milestone_4` / `squat_sex_milestone_4` / `deadlift_sex_milestone_4` | 4 | 345 lbs / 155 kg | 465 lbs / 210 kg | 565 lbs / 255 kg |

**Design rationale.** The existing universal ladder's calibration implicitly suits male-typical strength distribution well, but leaves athletes whose realistic strength curve sits well below it — most female athletes — without any meaningful Strength-category recognition until they reach its very first rung (135 lbs bench). These two tables give every athlete who declares a dedicated, population-realistic progression, while the universal ladder stays open to anyone who would rather not declare. The male table is not a copy of the universal ladder (which would award two honors for one PR, a duplicate-reward pattern this project has consistently rejected) — it is a distinct, finer-grained progression that sits between/around the universal rungs.

Metadata: `weightDisplay`, `unitSystem`, `biologicalSexAtEarn` (snapshotted at earn time — protects historical accuracy if the athlete edits their declared sex later, consistent with the project's established snapshot philosophy for any value that could change after the fact).

### 3.3 New Profile Fields (V2 — not built in V1)

Two new optional fields would be required to support §3.1 and §3.2, were they ever merged. **Neither field exists in V1** — `Profile-Wireframe-Spec-P1.md` ships unchanged at v1.3. Design preserved here for the future V2 pass:

| Field | Type | Required? | Captured | Editable |
|---|---|---|---|---|
| `biologicalSex` | `'MALE' \| 'FEMALE' \| null` | Optional, default `null` | Never at onboarding (O-2) | Profile → P-1.1 Edit Profile only |
| `bodyweightValue` / `bodyweightUnit` | `number \| null` / `'lbs' \| 'kg' \| null` | Optional, default `null` | Never at onboarding (O-2) | Profile → P-1.1 Edit Profile only |

**Binding rule (carries forward to V2):** neither field would ever be presented anywhere in the product as a path to unlocking honors. L-10's existing locked non-behaviors ("Display achievement recommendations" — explicitly forbidden) would apply without exception. Both fields are ordinary, optional profile self-description, exactly like Athlete Type — their only special property would be that two opt-in Strength honor families read them.

---

## Section 4 — Merged Endurance Category (38 honors)

### 4.1 Scope

Running, Walking, Cycling, and Swimming only — the four `ActivityType` values already locked in the product today. Verbatim, unmodified transcription from already-authored `Honors-Catalog-Expansion-Pass-3-Endurance.md` (single-session distance milestones) and `Honors-Catalog-Expansion-Pass-4-Lifetime-Endurance.md` v1.1 (lifetime cumulative distance, using the v1.1-corrected tier-3 values for Running/Walking — 1,000 mi, not 1,500 mi). No new architecture is required: both passes read only fields and statistics that already exist and are LOCKED (`distanceValue`/`distanceUnit` on the session record, and `lifetimeDistance` per `Endurance-Statistics-Architecture-Amendment-001.md`).

### 4.2 Single-Session Milestones (18 honors)

| Activity | Tiers | Qualification |
|---|---|---|
| Running | 5 (`run_milestone_1`–`5`) | First Mile (≥1 mi/1.6 km) → First 5K → First 10K → First Half Marathon → First Marathon |
| Walking | 5 (`walk_milestone_1`–`5`) | Same distance ladder as Running |
| Cycling | 4 (`bike_milestone_1`–`4`) | First 25-Mile Ride → First 50-Mile → First Century (100 mi) → First Double Century (200 mi) |
| Swimming | 4 (`swim_milestone_1`–`4`) | First 500m → First 1000m → First Mile (1,609m) → First 5K |

### 4.3 Lifetime Distance Milestones (20 honors)

| Activity | Tiers | Top tier (v1.1-corrected) |
|---|---|---|
| Running | 5 (`run_lifetime_distance_1`–`5`) | 100 → 500 → 1,000 → 5,000 → 15,000 lifetime miles |
| Walking | 5 (`walk_lifetime_distance_1`–`5`) | 100 → 500 → 1,000 → 5,000 → 15,000 lifetime miles |
| Cycling | 5 (`bike_lifetime_distance_1`–`5`) | 250 → 1,000 → 5,000 → 15,000 → 50,000 lifetime miles |
| Swimming | 5 (`swim_lifetime_distance_1`–`5`) | 25 → 100 → 250 → 500 → 1,000 lifetime kilometers |

### 4.4 Deferred: Hiking and Rowing

`hike_milestone_1`–`4`, `hike_lifetime_distance_1`–`5`, `row_milestone_1`–`4`, `row_lifetime_distance_1`–`5` (18 honors total) are fully authored in the same two passes but are **not** part of this manifest. `ActivityType-Expansion-Evaluation-Hiking-Rowing.md` confirms both activities are mechanically ready to support (Hiking = identical logging pattern to Walking; Rowing = identical to Cycling/Running, with split-pace-per-500m display) the moment the `HIKE`/`ROW` enum values are added — that addition is explicitly out of this pass's scope.

---

## Section 5 — Consistency Family (5 honors, lives in Training category)

Verbatim from `Honors-Catalog-Expansion-Pass-5-Consistency.md`: cumulative, never-revocable, retrospective-only Active Weeks. No current streak is ever tracked or shown; an athlete cannot lose an already-earned week.

| honorType | Display Name | Qualification |
|---|---|---|
| `consistency_active_weeks_1` | 10 Active Weeks | Cumulative Active Weeks ≥ 10 |
| `consistency_active_weeks_2` | 50 Active Weeks | Cumulative Active Weeks ≥ 50 |
| `consistency_active_weeks_3` | 150 Active Weeks | Cumulative Active Weeks ≥ 150 |
| `consistency_active_weeks_4` | 300 Active Weeks | Cumulative Active Weeks ≥ 300 |
| `consistency_active_weeks_5` | 500 Active Weeks | Cumulative Active Weeks ≥ 500 |

**Architecture prerequisite, resolved.** Pass 5 correctly identified that "Active Week" is defined and computed inside the Rank Computation Model, not inside the Honor Evaluation Service's own statistics. Rather than have evaluators reach into RCM directly (which would violate the Evaluation Service's existing invariant that evaluators only ever read the precomputed Athlete Statistics Record), this pass mirrors RCM's existing, already-locked cumulative Active Week count **into** the Athlete Statistics Record at the same Session-Save pipeline step that already updates every other statistic (`workoutCount`, `hoursForged`, etc.). A new `ConsistencyEvaluator` (Training category) reads it from there like any other evaluator. See the amendment to `Honor-Evaluation-Service-Architecture-v1.0.md` §9.1/§9.5.

Metadata: `{}` (empty, self-contained — same pattern as the existing Training-category honors).

---

## Section 6 — Prestige Category (8 honors, new)

Verbatim from `Honors-Catalog-Expansion-Pass-6-Comebacks-Prestige.md` Part B, v1.1.

### 6.1 Breadth Ladder (4 honors)

Counts top-tier honors held across the seven solo-achievable categories (Strength, Training, Programs, Goals, Chapters, Longevity, Endurance — Partnership/Squad/Communities/Competition are excluded from the denominator because their top tiers require another person's participation, not solo achievement).

| honorType | Display Name | Qualification |
|---|---|---|
| `prestige_breadth_1` | Many Paths | Top-tier in ≥ 4 of 7 solo-achievable categories + `longevity_1_year` |
| `prestige_breadth_2` | A Wider Legacy | Top-tier in ≥ 5 of 7 + `longevity_3_years` |
| `prestige_breadth_3` | Almost Every Path | Top-tier in ≥ 6 of 7 + `longevity_5_years` |
| `prestige_breadth_4` | The Complete Legacy | Top-tier in all 7 of 7 + `longevity_10_years` |

### 6.2 Named Combinations (4 honors)

| honorType | Display Name | Qualification |
|---|---|---|
| `prestige_complete_lifter` | The Complete Lifter | `bench_milestone_4` AND `squat_milestone_4` AND `deadlift_milestone_4` + `longevity_3_years` |
| `prestige_three_disciplines` | Three Disciplines | `run_milestone_5` AND `bike_milestone_3` AND `swim_milestone_4` + `longevity_3_years` |
| `prestige_built_by_the_plan` | Built by the Plan | `program_family_mastery_3` AND (`club_1500` OR `club_600kg`) + `longevity_5_years` |
| `prestige_life_in_chapters` | A Life in Chapters | `chapters_sealed_25` AND `goals_achieved_50` + `longevity_5_years` |

**Structural rule:** no-Prestige-on-Prestige — a Prestige honor is never itself counted toward another Prestige honor's qualification.

**Architecture prerequisites, resolved:**

1. **New pipeline step `[4.5] RUN PRESTIGE EVALUATOR`**, inserted between the existing locked `[4] RUN EVALUATORS` and `[5] CREATE HONORINSTANCES` steps. Deliberately uses "4.5" notation rather than renumbering subsequent steps, since other locked documents reference steps 5/6/7 by number and a renumber would silently break those references. PrestigeEvaluator runs after every other evaluator in the same transaction, so it can see both the athlete's full pre-existing HonorInstance history and anything newly qualified within this same Session Save — necessary because an athlete can complete a named combination (e.g., their final big-lift milestone) in the very session that should trigger the Prestige honor. See the amendment to `Honor-Evaluation-Service-Architecture-v1.0.md` §5.
2. **Clarification that this is not an invariant violation.** The Evaluation Service's existing rule (§9.5) is that evaluators never query session history, goal records, program records, or chapter records. HonorInstance records are the Honors system's own derived output, not a forbidden source-entity query — reading them is consistent with the "read only precomputed state" philosophy, not an exception to it. One clarifying sentence is added directly to §9.5.

Metadata: `{}` for the breadth ladder; named combinations need no extra metadata since each `honorType`'s constituent honors are fixed and can be narrated from the catalog definition itself, not from a per-instance snapshot.

---

## Section 7 — Hidden Honors (6 honors, new)

### 7.1 Design Principle: Zero New Schema

L-10's existing locked rule (§5.4: "a category with zero earned honors is entirely absent — not shown as locked, empty, or grayed... it does not appear at all") already provides total invisibility-until-earned for any honor, Hidden or otherwise, for free. No `isRevealed` field, no "???" placeholder UI, and no new pipeline behavior are needed or proposed. A Hidden honor is architecturally identical to any other honor — its only distinguishing property is that its qualification criteria are intentionally never surfaced, hinted at, or documented anywhere discoverable by the athlete before they earn it (an authoring-standards concern, formalized in `Honors-Authoring-Standards-v1.0.md`, not a schema concern).

### 7.2 The Six Honors

Every trigger below uses only data already available at the Session Save event being evaluated (its own timestamp, simple `accountCreationDate` calendar math, or the same-transaction set of qualifying honors the pipeline has already produced) — consistent with the Real Athlete Test's architecture-honesty rule (§5 of the Authoring Standards doc): no new persistent statistic is invented for any of these.

| honorType | Display Name | Trigger |
|---|---|---|
| `hidden_early_forge` | Early Forge | Session logged with local start time before 6:00 AM |
| `hidden_midnight_forge` | Midnight Forge | Session logged with local start time between 12:00 AM and 3:00 AM |
| `hidden_new_years_forge` | New Year's Forge | Session logged on January 1 |
| `hidden_leap_day_forge` | Leap Day Forge | Session logged on February 29 |
| `hidden_full_circle` | Full Circle | Session logged on the athlete's account-creation month+day anniversary, in a year that does not also trigger a Longevity honor (i.e., not year 1, 3, 5, or 10) |
| `hidden_triple_threat` | Triple Threat | Honors from 3 different categories are awarded within the same evaluation transaction — reuses the existing "award all qualifying honors together, no suppression" rule (ES-3); reads only this transaction's own in-flight qualifying-honor list |

Metadata: `{}` for all six — each is self-contained and narratable from its fixed display name and earned date alone.

### 7.3 Display

A new "Hidden" display category in L-10, positioned last in the category order (see amendment to `Honors-Spec-L10.md` §5.1) — appearing only once the athlete has earned at least one, exactly like every other category's existing zero-count-is-invisible behavior.

---

## Section 8 — Strength Club: Formalized, Unchanged in Substance

Club (1,000 / 1,200 / 1,500 lb and 400 / 500 / 600 kg combined bench+squat+deadlift PR totals) is confirmed as its own evaluator family (`ClubEvaluator`, distinct inputs — a sum, not a single PR) and its own catalog family, which displays merged into the Strength badge category — exactly as `Honors-Taxonomy-Reconciliation-v1.0.md` Finding T2 already established. This document formalizes that design intent explicitly rather than leaving it implicit.

**Per your decision this session:** Club's future expansion path is **additional absolute tiers only** (e.g., a hypothetical future 1,750 lb / 750 kg tier). Club does **not** gain sex-specific or relative-strength variants, and does **not** become a new membership/prestige layer — those needs are served by the genuinely new Sex-Specific Milestones, Relative Strength Milestones (§3), and Prestige (§6) categories instead, each purpose-built for its own distinct recognition axis.

---

## Section 9 — Explicit Deferrals (Detail)

Each deferral below is a written, intentional decision — not a silent gap. This mirrors the project's established convention (see Decision Queue items elsewhere in `Forge-Legacy-Master-Status.md`) of distinguishing "not yet built, with a clear reason and a clear unblock condition" from an oversight.

| Deferred | Rationale | Unblock condition |
|---|---|---|
| **Sex-Specific Strength Milestones** (12 honors) | Fully designed (§3); deferred to V2 by **PO decision**, not a technical blocker | A future V2 scoping pass — design is ready to merge as-is |
| **Relative Strength Milestones** (12 honors) | Fully designed (§3); deferred to V2 by **PO decision**, not a technical blocker | Same — design-complete |
| **Hiking / Rowing Endurance** (18 honors) | `HIKE`/`ROW` are not yet in the locked `ActivityType` enum — the honors would have no activity to attach to | Execute the enum amendment already evaluated and ready in `ActivityType-Expansion-Evaluation-Hiking-Rowing.md` |
| **Comebacks & Resilience** (0 honors) | No statistic anywhere in the architecture tracks "gap since last session" or "renewed training block" — Pass 6 Part A confirmed this honestly rather than inventing one | A future, scoped statistics amendment (gap-length tracking, retroactive-only, zero live visibility — approved in principle per Pass 6 §2, not yet built) |
| **Bodybuilding volume-PR family** (0 honors) | Strength's load-PR pattern (the heaviest weight moved) has no Bodybuilding equivalent — no session-volume tracking statistic exists for any lift today | A future volume-tracking architecture decision, explicitly out of this pass's scope; no placeholder logic is invented in its place |

### 9.1 Discipline Coverage — Honest Verdict

Of the four locked Athlete Types (Strength, Bodybuilding, Endurance, Hybrid):

- **Strength** athletes: well served — 26 Strength-category honors (universal Bench/Squat/Deadlift ladder + Club + Overhead Press + Pull-Up) plus every discipline-agnostic category. The two new opt-in families (Sex-Specific, Relative Strength) would have added a fairer recognition layer for athletes underserved by the universal ladder's calibration; their deferral to V2 means that specific gap remains open, but it is not a regression — V1 Strength coverage is identical in depth to what shipped in prior sessions.
- **Endurance** athletes: fully served for the four currently-loggable activity types (38 Endurance honors) plus every discipline-agnostic category; Hiking/Rowing depth is deferred alongside those activity types themselves, not as an independent Honors gap.
- **Hybrid** athletes: fully served — by design, honors are activity/data-driven, not athlete-type-gated, so a Hybrid athlete can earn from every category they actually train in.
- **Bodybuilding** athletes: served by every discipline-agnostic category (Training, Goals, Programs, Chapters, Longevity, Prestige, Hidden), but have **no dedicated skill-specific family** the way Strength and Endurance do. This is an honest, explicit, written gap (§9, row 5) — not a silent one.

---

## Section 10 — Architecture Decision Index

| Decision | Value |
|---|---|
| AD-V1-1 — Two-lineage reconciliation | The locked v1.4 catalog and the six unmerged Expansion Pass documents are reconciled in this single pass; no further parallel-lineage drift is permitted going forward — all future honor additions amend `Honor-Catalog-v1.0-LOCKED.md` directly, never a standalone pass document left unmerged. |
| AD-V1-2 — Sex-Specific and Relative Strength Milestones deferred to V2 | Both fully designed (§3) — additive design, never-required Profile fields, snapshot semantics for any value that could later be edited — and then deferred to V2 by explicit PO decision before final lock. A scope decision, not a technical blocker; preserved in full for a future V2 pass. |
| AD-V1-5 — Endurance merge scope is activity-data-driven, not athlete-type-driven | Endurance honors merge for Running/Walking/Cycling/Swimming because those activity types are loggable today — independent of which Athlete Type declared them. |
| AD-V1-6 — Prestige runs at pipeline step [4.5] | See §6.2. Reading HonorInstance history at this step is not a violation of ES §9.5's source-record invariant. |
| AD-V1-7 — `cumulativeActiveWeeks` is mirrored, not cross-read | Preserves the Evaluation Service's existing rule that evaluators only ever read the Athlete Statistics Record. |
| AD-V1-8 — Hidden Honors require zero new schema | L-10's existing zero-count-is-invisible rule (§5.4) is sufficient; no `isRevealed` field or placeholder UI is introduced. |
| AD-V1-9 — Strength Club expansion path is absolute-tiers-only | No sex-specific or relative-strength Club variants; no new membership/prestige wrapper. |
| AD-V1-10 — PR storage extends to five lifts | Bench, squat, deadlift, overhead press, pull-up — resolves the original audit's Finding F7. |
| AD-V1-11 — Bodybuilding and Comebacks honors are not invented | Per explicit instruction: no placeholder logic for a statistic that does not exist. Both remain written, honest deferrals. |

---

## Section 11 — Closure Record

### 11.1 Final Catalog Counts

| Metric | Count |
|---|---:|
| Total honor types (V1 manifest) | 167 |
| Categories | 13 |
| Families | 34 |
| Deferred — PO scope decision (§3, design-complete) | 24 |
| Deferred — genuinely blocked (§9) | 18 |

### 11.2 Consistency Pass

- **Duplicate `honorType` check:** every new ID introduced in §3–§7 (38 + 5 + 8 + 6 = 57 new IDs merged into V1, plus 24 designed-but-deferred IDs in §3) checked against the existing 82 locked IDs and against each other — zero collisions.
- **Threshold conflict check:** every Sex-Specific/Relative Strength threshold designed in §3 was checked against the universal ladder and Club's thresholds — zero exact-value collisions (see §3.2 rationale for why this matters) — preserved for V2 even though not merged in V1.
- **Category/family conflict check:** Endurance, Prestige, and Hidden are wholly new categories with no naming overlap against the existing 10. Consistency's honors live inside the existing Training category by design (§5), not a new category — confirmed no duplicate "Consistency" category is introduced.
- **Family-count arithmetic:** independently recomputed in §2.3 against the catalog's own per-category table, not assumed.

### 11.3 Dependencies Confirmed

| Dependency | Status |
|---|---|
| `Honor-Catalog-v1.0-LOCKED.md` v1.4 | LOCKED, reconciled to v1.5 by this pass |
| Expansion Passes 1–6 | Source content verbatim-transcribed where merged (§4–§7); Sex-Specific/Relative Strength designed in §3 and deferred to V2; Hiking/Rowing/Comebacks/Bodybuilding portions explicitly withheld (§9) |
| `Endurance-Statistics-Architecture-Amendment-001.md` | LOCKED, consumed by §4 |
| `Pace-Speed-Definition-Architecture-Note.md` | LOCKED, no display change needed by this pass |
| `Honor-Evaluation-Service-Architecture-v1.0.md` | Amended by this pass (§5, §6.2, §9.1, §9.2, §9.5) |
| `HonorInstance-Architecture-v1.0.md` | Amended by this pass (new metadata shapes) |
| `Honors-Spec-L10.md` | Amended by this pass (category table, badge slots) — note: this document was already stale relative to v1.4 before this pass (see its own amendment's Change Log) |
| `Profile-Wireframe-Spec-P1.md` | **Unchanged** — ships at v1.3, no edit. The two new fields designed in §3 are deferred to V2 alongside the families that needed them. |

---

## Section 12 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial document. Reconciles the locked v1.4 catalog with six previously-unmerged Expansion Pass documents. Designed two new Strength families — Sex-Specific Strength Milestones (12) and Relative Strength Milestones (12) — then **deferred both to V2 by PO decision before final lock**; full design preserved in §3 for future use, including the two Profile fields they would have required (`Profile-Wireframe-Spec-P1.md` ships unchanged). Merges Endurance (38, Running/Walking/Cycling/Swimming only), Consistency (5), and Prestige (8) from Passes 3–6. Adds Hidden Honors (6, new). Formalizes Strength Club. Resolves three named architecture prerequisites (Prestige pipeline step [4.5], Consistency statistic mirroring, PR storage 5-lift extension). Corrects a recurring family-count arithmetic error (22 claimed → 25 actual baseline → 34 final). Final V1 manifest: **167 honors, 13 categories, 34 families**. 42 honors explicitly deferred — 24 by PO scope decision (design-complete, §3), 18 genuinely blocked (Hiking, Rowing, Comebacks & Resilience, Bodybuilding volume-PR, §9). Architecture/schema only — no L-11 descriptive content authored for any new honor; that is a separate future pass governed by the companion `Honors-Authoring-Standards-v1.0.md`. |

---

*Forge Legacy — Honors System: Final V1 Architecture*
*Version 1.0 | June 2026*
