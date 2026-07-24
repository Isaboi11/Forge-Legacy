# Honor Evaluation Service Architecture
## v1.1 — LOCKED | June 2026

**Status:** LOCKED
**Type:** Architecture Note
**Authority:** Honor-Catalog-v1.0-LOCKED.md (v1.5), HonorInstance-Architecture-v1.0.md, L-10 Honors Hub Spec, L-11 Honor Detail Sheet Spec v1.1, M-2 Honor Earned Modal Spec v1.1, Master PRD § 13, Product DNA, `Honors-Architecture-V1-Final-v1.0.md` (LOCKED)

> **Consuming-authority pointer — `Calendar-System-Architecture-v1.0` (LOCKED, June 2026).** The Calendar reads each earned `HonorInstance` as a **read-only date-anchored marker** on the day it was earned (CAL-D12). It **never** evaluates honor conditions, **never** awards or un-awards, and **never** alters a `HonorInstance` — this Service remains the sole evaluator/awarder, and earning still flows through the engine → M-2 unchanged. A Calendar honor marker links into Honor Detail (L-11) (CAL-D17). No change to this document is required.

> **Consuming-authority pointer — `Backend-Data-Model-Architecture-v1.0.md` (LOCK-CANDIDATE, June 2026).** Line 16's statement that "this document does not define database schemas" is now resolved: the `HonorInstance` schema is formalized in that document's Section 3.6, the `AthleteStatistics`/`PRRecord` supporting entities are formalized in Section 11.4, and the 7-step evaluation pipeline (Section 5 here) is restated as Section 11.3 there with Firestore transaction-batching guidance added (Section 4.2). This document remains the sole authority on evaluation *philosophy*, trigger mapping, and evaluator-family logic — the Backend doc only formalizes the data shapes this document already implied.

---

## 1. Purpose

This note defines the architecture of the Honor Evaluation Service — the system responsible for determining when athletes have qualified for honors, creating `HonorInstance` records, and triggering the appropriate ceremony outputs.

This document does not define database schemas, API contracts, or implementation code.

---

## 2. Evaluation Philosophy

**Event-specific evaluation.** The evaluation service does not evaluate every honor type on every event. Each trigger invokes only the evaluator families capable of producing new honors given that event type. A session save cannot produce goal honors; it never runs `GoalEvaluator`. A goal completion cannot produce strength honors; it never runs `StrengthEvaluator`. See ES-1.

**Immediate post-event evaluation.** Evaluation occurs immediately after the source event is persisted. No background evaluation workers exist in MVP. The pipeline runs synchronously as part of the triggering transaction. See ES-2.

**Award all qualifying honors.** When an evaluation transaction qualifies the athlete for multiple honors simultaneously, all are awarded. No suppression logic. No "highest only" rule. Historical accuracy takes priority over ceremony brevity. See ES-3.

**Evaluators operate against finalized state.** Statistics and PR records are updated before evaluators run. Evaluators never read stale data, never aggregate raw session history during evaluation, and never compute derived values themselves. See ES-4, ES-11.

**Family-based evaluators.** The service is organized into eight evaluator families — not one evaluator per honor type. Each family owns a coherent domain and evaluates all honors within it. See ES-5.

---

## 3. Trigger Mapping

### 3.1 Active Trigger Sources

| Trigger Event | Evaluator Families Invoked | M-2 Fires? | Notes |
|---------------|---------------------------|-----------|-------|
| Session Save (live) | `Training`, `Strength`, `Club`, `ChapterDepth`, `Longevity` | Yes | Program and Community evaluators also run if applicable (see below) |
| Session Save + Program Graduation detected | `Training`, `Strength`, `Club`, `ChapterDepth`, `Program`, `Longevity` | Yes | Graduation detected as part of session save; program honors bundled into M-2 |
| Session Save + WwF tagged (at W-17) | `Training`, `Strength`, `Club`, `ChapterDepth`, `Community`, `Longevity` | Yes | WwF tag fires at W-17 "Done"; community honors bundled into M-2 |
| Session Save (offline sync) | Same families as live session | No | source = `offline_sync`; honors delivered silently to L-10 |
| Goal Completion | `Goal`, `Longevity` | No | Goal completion is a separate user action, not a session save; honors delivered silently to L-10 |
| Program Graduation (standalone, if ever decoupled) | `Program`, `Longevity` | No | If program graduation ever triggers outside a session save context |
| Chapter Seal | `ChapterCount`, `Longevity` | No | Chapter-seal honors route to M-5/L-6 sealing flow, not M-2 |
| WwF Session Save (standalone) | `Community`, `Longevity` | See note | If WwF save triggers separately from session save: M-2 behavior follows session save rules |
| Import Completion | Retroactive pass — all relevant families | No | source = `import`; honors delivered silently to L-10; see Section 8 |
| Offline Sync | Deferred evaluation — same families as original session type | No | Treated as deferred session save; M-2 does not fire |
| Challenge Completion (winner) | `Challenge`, `Longevity` | No | *(v1.1 — Honor-Catalog-Amendment-001)* `ChallengeEvaluator` reads finalized `challenges_won_count`; honors delivered silently to L-10; co-winners each credited fully (CA2-D2) |
| Challenge Enrollment Finalized | `Challenge` (Participation + Participation Streak families) | No | *(v1.1)* reads finalized `challenges_entered_count` and `max_participation_streak`; counts entry, not outcome |

**`ChallengeEvaluator` (v1.1):** invoked only by the two Challenge triggers above; reads finalized challenge statistics after they are updated (ES-4 pattern); event-specific (ES-1) — does not run Strength/Training/Goal/Program evaluators. HonorInstance `source` = `challenge`. No rank effect (AD-27).

> **Participant-based reconciliation (Challenge-Architecture-Amendment-003 v1.1 / CA3-D9 — no change to this service):** Both Challenge triggers are **context-agnostic and participant-based** — a `context = SQUAD` **or** `context = FRIENDS` challenge emits the **same** Challenge Completion / Challenge Enrollment Finalized events to `ChallengeEvaluator`, which reads the same finalized counters. `challenges_won_count` and `challenges_entered_count` accrue from **both** contexts; `max_participation_streak` is finalized from **SQUAD-context challenges only** (CS-D27), so friend challenges never affect streak honors. No new trigger, no schema change, no evaluator change.

### 3.2 Events That Are NOT Triggers

The following events do not invoke the evaluation service:

- Rank Up
- Profile Edit (including display name, athlete type, unit system change)
- Squad creation or join
- Entity renames (chapter rename, goal name edit, program rename)
- Settings changes
- Follow events (post-MVP concept)

A unit system change (lbs → kg) does not retroactively re-evaluate strength honors. Honors already earned in the prior unit system retain their earn-time `displayName` and `metadata.weightDisplay` per AD-58 and AD-52.

---

## 4. Evaluator Family Definitions

### 4.1 TrainingEvaluator

**Domain:** Training volume — workout count and hours forged.

**Honors evaluated (12 types):**
`first_workout_logged`, `workouts_logged_50`, `workouts_logged_100`, `workouts_logged_250`, `workouts_logged_500`, `workouts_logged_1000`, `hours_forged_100`, `hours_forged_250`, `hours_forged_500`, `hours_forged_1000`, `hours_forged_2500`, `hours_forged_5000`

**Invoked by:** Session Save

**Data source:** Athlete statistics record — `workoutCount`, `hoursForged` (post-update values, after pipeline step [2])

**Evaluation logic:**
For each honor in the workout count family: check if `workoutCount` has crossed the threshold and the athlete does not yet hold this one-time honor.
For each honor in the hours forged family: check if `hoursForged` has crossed the threshold and the athlete does not yet hold this one-time honor.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

---

### 4.2 StrengthEvaluator

**Domain:** Individual lift personal records — bench press, squat, deadlift.

**Honors evaluated (12 types):**
`bench_milestone_1/2/3/4`, `squat_milestone_1/2/3/4`, `deadlift_milestone_1/2/3/4`

**Invoked by:** Session Save

**Data source:** PR records — one record per canonical lift (bench, squat, deadlift), storing the all-time max weight in the athlete's unit (post-update values, after pipeline step [3])

**Evaluation logic:**
For each lift family, compare the athlete's current PR against each threshold. If the PR has crossed a threshold the athlete does not yet hold, award the honor.

Unit system is read from the athlete's account at earn time. Thresholds are evaluated against the unit-appropriate value (lbs thresholds for lbs athletes, kg thresholds for kg athletes). `metadata.weightDisplay` and `metadata.unitSystem` are snapshotted from the PR and athlete unit at earn time.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

---

### 4.3 ClubEvaluator

**Domain:** Combined all-time PR totals — lbs clubs and kg clubs.

**Honors evaluated (6 types):**
`club_1000`, `club_1200`, `club_1500`, `club_400kg`, `club_500kg`, `club_600kg`

**Invoked by:** Session Save

**Data source:** Same PR records as `StrengthEvaluator`. `ClubEvaluator` reads bench + squat + deadlift PRs and computes the combined total. Reads post-update PR state (after pipeline step [3]).

**Evaluation logic:**
Compute `combinedTotal = benchPR + squatPR + deadliftPR` in the athlete's unit. Compare against the relevant club thresholds for that unit system. Award any thresholds crossed that the athlete does not yet hold.

lbs athletes are evaluated only against lbs club thresholds (`club_1000/1200/1500`).
kg athletes are evaluated only against kg club thresholds (`club_400kg/500kg/600kg`).
Club types are separate per unit system — not unit-adaptive (AD-31e).

`metadata.benchPR`, `metadata.squatPR`, `metadata.deadliftPR` are snapshotted from the PR records at earn time. `metadata.unitSystem` is snapshotted from the athlete's unit preference at earn time.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

---

### 4.4 GoalEvaluator

**Domain:** Goal achievement milestones.

**Honors evaluated (4 types):**
`first_goal_achieved`, `goals_achieved_10`, `goals_achieved_25`, `goals_achieved_50`

**Invoked by:** Goal Completion event

**Data source:** Athlete statistics record — `goalsAchieved` (post-update value, after pipeline step [2])

**Evaluation logic:**
Check if `goalsAchieved` has crossed each threshold the athlete does not yet hold.

For `first_goal_achieved`: snapshot `metadata.goalId` and `metadata.goalName` from the goal that was just achieved.
For `goals_achieved_10/25/50`: no goal-specific metadata required.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

**Ceremony:** Goal completion honors are delivered silently to L-10. M-2 does not fire for this trigger (Goal Completion is not a session save event). The goal achievement itself may trigger M-3 (Goal Achieved Modal) independently; the honor evaluation is a separate concern.

---

### 4.5 ProgramEvaluator

**Domain:** Program graduation milestones.

**Honors evaluated (4 types):**
`first_program_graduated`, `programs_graduated_5`, `programs_graduated_10`, `programs_graduated_25`

**Invoked by:** Program Graduation event (detected at session save / W-17 context in MVP)

**Data source:** Athlete statistics record — `programsGraduated` (post-update value, after pipeline step [2])

**Evaluation logic:**
Check if `programsGraduated` has crossed each threshold the athlete does not yet hold.

For `first_program_graduated`: snapshot `metadata.programId` and `metadata.programName` from the program just graduated.
For volume milestones: no program-specific metadata required.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

**Ceremony:** In MVP, program graduation is detected at session save. Program honors are bundled into the session's M-2 payload alongside other session-triggered honors.

---

### 4.6 CommunityEvaluator

**Domain:** Workout With Friend (WwF) session milestones.

**Honors evaluated (3 types):**
`first_workout_with_friend`, `workout_with_friend_10`, `workout_with_friend_50`

**Invoked by:** WwF Session Save (tag confirmed at W-17 "Done")

**Data source:** Athlete statistics record — `workoutsWithFriend` (post-update value, after pipeline step [2])

**Evaluation logic:**
Check if `workoutsWithFriend` has crossed each threshold the athlete does not yet hold.

For `first_workout_with_friend`: snapshot `metadata.partnerId` and `metadata.partnerDisplayName` from the confirmed training partner.
For `workout_with_friend_10/50`: no partner-specific metadata required (cumulative count across all partners).

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

**Ceremony:** WwF tag fires at W-17 "Done" as part of the session save context. Community honors are bundled into the session's M-2 payload.

---

### 4.7 ChapterEvaluator

**Domain:** Chapter count milestones and chapter depth milestones. Two distinct sub-evaluators operating under one family.

#### ChapterCount Sub-Evaluator

**Honors evaluated (4 types):**
`first_chapter_sealed`, `chapters_sealed_5`, `chapters_sealed_10`, `chapters_sealed_25`

**Invoked by:** Chapter Seal event

**Data source:** Athlete statistics record — `chaptersSealed` (post-update value, after pipeline step [2])

**Evaluation logic:**
Check if `chaptersSealed` has crossed each threshold the athlete does not yet hold.

For all types: snapshot `metadata.chapterName` from the chapter that was just sealed (per AD-56).
`chapterId` (top-level field) is set to the just-sealed chapter's ID.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

**Ceremony:** Chapter-seal honors route to the M-5/L-6 sealing flow. M-2 does not fire for this trigger.

---

#### ChapterDepth Sub-Evaluator

**Honors evaluated (4 types):**
`workouts_in_chapter_10`, `workouts_in_chapter_25`, `workouts_in_chapter_50`, `workouts_in_chapter_100`

**Invoked by:** Session Save

**Data source:** Per-chapter session count — a counter on the chapter record, incremented at session save (post-update value, after pipeline step [2])

**Evaluation logic:**
Check if the current chapter's session count has crossed each depth threshold for which the athlete does not yet hold an instance scoped to this chapter.

Snapshot `metadata.chapterName` from the current chapter at earn time.
`chapterId` (top-level field) is set to the current active chapter's ID.

**Uniqueness key:** `(athleteId, honorType, chapterId)` — **repeatable honors**. The same depth threshold can be earned again in a new chapter.

**Ceremony:** Chapter depth honors fire at session save. They are bundled into the session's M-2 payload alongside other session-triggered honors.

---

### 4.8 LongevityEvaluator

**Domain:** Account anniversary milestones.

**Honors evaluated (4 types):**
`longevity_1_year`, `longevity_3_years`, `longevity_5_years`, `longevity_10_years`

**Invoked by:** Every evaluation-triggering event (Session Save, Goal Completion, Program Graduation, Chapter Seal, WwF Session Save). See ES-10.

**Data source:** `athlete.accountCreationDate` — immutable; set at O-1b completion.

**Evaluation logic:**
For each longevity threshold, compute the anniversary date: `accountCreationDate + N days`. If the current date has crossed the anniversary date and the athlete does not yet hold this honor, award it.

`dateEarned` = the computed anniversary date (not the current session date). This is the qualification date displayed to the athlete per AD-33.
`awardedAt` = the timestamp the record is written (the actual session date, which is ≥ anniversary date).

No scheduler exists. The honor is awarded on the first qualifying evaluation event after the anniversary date passes. If the athlete trains on their exact anniversary date, the honor is awarded in that session's evaluation. If they train three months later, it is awarded then — with `dateEarned` reflecting the actual anniversary.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

**Ceremony:** Longevity honors follow the ceremony path of the triggering event:
- Triggered by Session Save → bundled into M-2
- Triggered by Chapter Seal → routes to M-5/L-6 flow
- Triggered by Goal Completion → silently to L-10

---

### 4.9 EnduranceEvaluator *(v1.5, new)*

**Domain:** Single-session distance milestones and lifetime cumulative distance, per activity type (Running, Walking, Cycling, Swimming).

**Honors evaluated (38 types):** the full Endurance category — see `Honor-Catalog-v1.0-LOCKED.md` § ENDURANCE.

**Invoked by:** Session Save

**Data source:** Single-Session family reads `distanceValue`/`distanceUnit` directly from the session record being saved. Lifetime Distance family reads `lifetimeDistance` per `(athleteId, activityType)`, defined and updated per `Endurance-Statistics-Architecture-Amendment-001.md` (post-update value, after pipeline step [2]).

**Evaluation logic:** For each activity type the session matches, compare the session's logged distance against that activity's Single-Session thresholds, and compare the athlete's post-update `lifetimeDistance` for that activity against the Lifetime Distance thresholds. Award any not yet held.

Hiking and Rowing thresholds are defined in the source content but are not evaluated by this service until `HIKE`/`ROW` are added to the `ActivityType` enum — no honor type for those activities exists in the locked catalog yet (see `Honors-Architecture-V1-Final-v1.0.md` §9).

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

---

> **Deferred to V2:** `SexSpecificStrengthEvaluator` and `RelativeStrengthEvaluator` were designed during this pass to support the Sex-Specific Milestones and Relative Strength Milestones families. Both families were deferred to V2 by PO decision before final lock (see `Honor-Catalog-v1.0-LOCKED.md` § DEFERRED TO V2). Neither evaluator exists in the V1 pipeline.

### 4.10 ConsistencyEvaluator *(v1.5, new)*

**Domain:** Cumulative Active Weeks (Training category).

**Honors evaluated (5 types):** `consistency_active_weeks_1/2/3/4/5`

**Invoked by:** Session Save

**Data source:** Athlete statistics record — `cumulativeActiveWeeks` (post-update value, after pipeline step [2]; see § 9.1).

**Evaluation logic:** Check if `cumulativeActiveWeeks` has crossed each threshold the athlete does not yet hold. Cumulative and never-revocable — there is no "current streak" concept anywhere in this evaluator; a week, once counted, is never un-counted.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

---

### 4.11 PrestigeEvaluator *(v1.5, new)*

**Domain:** Cross-category breadth recognition and named multi-honor combinations.

**Honors evaluated (8 types):** the full Prestige category — see `Honor-Catalog-v1.0-LOCKED.md` § PRESTIGE.

**Invoked by:** runs at the new pipeline step **[4.5]**, after every other evaluator family in the same Session Save transaction (see § 5).

**Data source:** The athlete's full existing `HonorInstance` history, plus the set of honors this same transaction's other evaluators (§ 4.1–4.10) have already determined qualify. **This is not a violation of § 9.5's invariant** — `HonorInstance` records are the Honors system's own derived output, not a source-entity query (session history, goal records, program records, chapter records); reading them is consistent with "read only precomputed state," not an exception to it.

**Evaluation logic:** For the Breadth Ladder, count how many of the 7 solo-achievable categories (Strength, Training, Programs, Goals, Chapters, Longevity, Endurance) the athlete holds a top-tier honor in, including any newly qualified in this same transaction, then check against each tier's category-count + Longevity co-requirement. For Named Combinations, check whether the athlete holds (or newly qualifies for, in this same transaction) every constituent honor listed for that combination. No-Prestige-on-Prestige: a Prestige honor is never itself counted as a qualifying category top-tier for another Prestige honor.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

---

### 4.12 HiddenEvaluator *(v1.5, new)*

**Domain:** Six honors using only data already available at the Session Save event being evaluated.

**Honors evaluated (6 types):** the full Hidden category — see `Honor-Catalog-v1.0-LOCKED.md` § HIDDEN.

**Invoked by:** Session Save

**Data source:** The session save event's own timestamp (for `hidden_early_forge`, `hidden_midnight_forge`, `hidden_new_years_forge`, `hidden_leap_day_forge`); `athlete.accountCreationDate` (for `hidden_full_circle`, computed via calendar math — no new statistic); this same transaction's set of qualifying honors from every other evaluator family that has already run (for `hidden_triple_threat`, identical data source to `PrestigeEvaluator`'s in-transaction pool). **No new persistent statistic is introduced for any Hidden honor.**

**Evaluation logic:** Each of the six checks a simple, self-contained condition against the data sources above — no cross-evaluator dependency beyond the same in-transaction qualifying-honor list `PrestigeEvaluator` also reads.

**Uniqueness key:** `(athleteId, honorType)` — one-time honors.

---

## 5. Evaluation Pipeline

The evaluation pipeline is a fixed, deterministic sequence. Evaluators always operate against finalized state. See ES-4.

```
┌─────────────────────────────────────────────────────────────┐
│  SOURCE EVENT                                               │
│  (Session Save / Goal Completion / Chapter Seal / etc.)     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  [1] PERSIST SOURCE EVENT                                   │
│  The source event is committed first and independently.     │
│  If this step fails, the pipeline stops here.               │
│  All downstream steps depend on this succeeding.            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  [2] UPDATE DERIVED STATISTICS                              │
│  Increment athlete statistics relevant to this trigger:     │
│  workoutCount, hoursForged, chaptersSealed, goalsAchieved,  │
│  programsGraduated, workoutsWithFriend, chapter.sessionCount│
│                                                             │
│  Evaluators read from these post-update values.             │
│  Evaluators never read pre-update statistics.               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  [3] UPDATE PR RECORDS                                      │
│  (Session Save only)                                        │
│  Identify new all-time PRs from the session's logged sets.  │
│  Update PR records for bench, squat, deadlift as needed.    │
│                                                             │
│  StrengthEvaluator and ClubEvaluator read from these        │
│  post-update PR values.                                     │
│  Skipped for triggers that cannot produce PR changes.       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
╔═════════════════════════════════════════════════════════════╗
║  EVALUATION TRANSACTION (ATOMIC — steps [4] through [7])   ║
╠═════════════════════════╦═══════════════════════════════════╣
║  [4] RUN EVALUATORS     ║                                   ║
║  Only the evaluator     ║  Each evaluator:                  ║
║  families invoked by    ║  • Reads finalized stats/PRs      ║
║  this trigger type      ║  • Checks uniqueness              ║
║  are executed.          ║  • Returns qualifying honors      ║
║                         ║  • Prepares metadata snapshots    ║
║  LongevityEvaluator     ║                                   ║
║  always runs.           ║                                   ║
╠═════════════════════════╩═══════════════════════════════════╣
║  [4.5] RUN PRESTIGE EVALUATOR  (v1.5, new)                  ║
║  Runs after every other evaluator family in this same       ║
║  transaction. Reads the athlete's full existing              ║
║  HonorInstance history + this transaction's newly-           ║
║  qualifying honors (the union of both is the qualification   ║
║  pool for Breadth Ladder / Named Combination checks).        ║
║  Not a violation of § 9.5 — HonorInstance is this system's   ║
║  own derived output, not a source-entity query.               ║
╠═════════════════════════════════════════════════════════════╣
║  [5] CREATE HONORINSTANCES                                  ║
║  For each qualifying honor returned by evaluators:          ║
║  • Create HonorInstance with all fields per AD-33/AD-50–58  ║
║  • source, dateEarned, awardedAt, displayName, metadata     ║
║  • All instances created in this step or none (atomic)      ║
╠═════════════════════════════════════════════════════════════╣
║  [6] CREATE TIMELINE EVENTS                                 ║
║  For each new HonorInstance:                                ║
║  • Create Timeline Event referencing honorId (AD-53)        ║
║  • One Timeline Event per HonorInstance                     ║
╠═════════════════════════════════════════════════════════════╣
║  [7] QUEUE M-2 CEREMONY PAYLOAD                             ║
║  (Live session saves only)                                  ║
║  Bundle all HonorInstances from this transaction            ║
║  into a single M-2 payload (ES-8)                           ║
║  Payload queued for delivery at W-17 load                   ║
║  Chapter-seal honors are excluded from M-2 payload;         ║
║  they are routed to M-5/L-6 sealing flow instead            ║
╚═════════════════════════════════════════════════════════════╝
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  PIPELINE COMPLETE                                          │
│  Control returns to the originating event handler           │
└─────────────────────────────────────────────────────────────┘
```

> **Reconciliation note — Social-System-Architecture-v1.0 (LOCKED, June 2026; governing social authority).** An **earned Honor is a milestone trigger** for an **optional automatic milestone Post** (SOC-D9 / SOC-D12 / SOC-D16), gated by the athlete's account-level **Automatically-Share-Milestones** setting (default ON). This hook is **owned by Social-System-Architecture-v1.0, not by this service**, and is strictly a **post-commit, read-only consumer** of the honor-earned event — it is **not** a step in the atomic transaction above (steps [4]–[7]), it creates **no** `HonorInstance` and **no** schema change, and **posting an honor never alters the HonorInstance and never affects honor evaluation** (SOC-D13: no social action affects any progression). Honors remain **account-based**. If the milestone post fails or is disabled, honor evaluation, ceremony, and timeline behavior are completely unaffected.

---

## 6. Transactional Integrity and Failure Handling

Per ES-6, steps [4] through [7] form a single atomic transaction.

### 6.1 Commit Rules

| Outcome | HonorInstances Created | Timeline Events Created | M-2 Queued |
|---------|----------------------|------------------------|-----------|
| All evaluators succeed | Yes — all qualifying | Yes — all | Yes (if live session) |
| Any evaluator fails | No | No | No |
| HonorInstance write fails | No | No | No |
| Timeline Event write fails | Rolled back | No | No |

### 6.2 Source Event Independence

The source event (session save, goal completion, chapter seal) is committed in step [1], independently of evaluation. If the evaluation transaction (steps [4]–[7]) fails:

- The source event remains committed. The athlete's session, goal, or chapter seal is not lost.
- Honor evaluation is retried at a later time.
- The athlete never permanently loses a qualifying honor due to evaluation failure.
- M-2 does not fire for that event. If the retry succeeds later, the honors are delivered silently to L-10 without ceremony — consistent with the offline sync and evaluation timeout behavior specified in M-2 §2 and §10 E-1.

### 6.3 M-2 Timeout Behavior

If evaluation has not returned before W-17 becomes fully interactive (~5 seconds post-load, per M-2 §2), the evaluation is abandoned for that session. The honor, if subsequently awarded on retry, is delivered silently to L-10. M-2 does not fire retroactively. This is the specified behavior — it is not a failure state.

---

## 7. Retroactive Evaluation

### 7.1 Import Completion (AD-8)

When the athlete imports historical training data (Architecture Amendment 001 — Import), the evaluation service runs a retroactive pass after the import is committed.

**Scope:** Only the evaluator families relevant to the imported data type are run. The system never performs a full catalog re-evaluation (ES-7).

Example mappings:

| Imported data | Evaluator families |
|---------------|-------------------|
| Historical sessions (strength) | `Training`, `Strength`, `Club` |
| Historical sessions (cardio) | `Training` |
| Historical chapter data | `ChapterCount`, `ChapterDepth` |
| Historical goal achievements | `Goal` |
| Historical program graduations | `Program` |

`LongevityEvaluator` may also run if the import data spans time periods that would have crossed anniversary thresholds.

**dateEarned:** Set to the historical date when the threshold was crossed — not the import date.
**awardedAt:** Set to the import completion timestamp.
**source:** `import`

M-2 does not fire for import honors (per M-2 §2 non-behaviors). All import honors are delivered silently to L-10, appearing in chronological position per their `dateEarned`.

### 7.2 New Honor Types (Future Catalog Expansion)

When new honor types are introduced in V1.1+:

The relevant evaluator family runs a retroactive pass against existing athlete data. The pass is family-targeted — it evaluates only the new honor type(s) within that family's domain. No other evaluator families run.

Examples:

| New honor type | Retroactive evaluator |
|----------------|----------------------|
| New training volume threshold | `TrainingEvaluator` retroactive pass |
| New strength milestone | `StrengthEvaluator` retroactive pass |
| New community threshold | `CommunityEvaluator` retroactive pass |

Retroactive honors from catalog expansion use `source: import` and have `dateEarned` set to the historical date when the threshold was crossed.

---

## 8. M-2 Integration Rules

Per ES-8, all honors earned during a single evaluation transaction are bundled into one M-2 ceremony payload.

### 8.1 M-2 Fire Conditions

M-2 fires only when all of the following are true:
1. The triggering event was a session save
2. The session was live (online) at save time (`source: live_session`)
3. At least one honor was awarded in the evaluation transaction
4. The evaluation completed within the M-2 timeout window (~5 seconds post W-17 load)

### 8.2 M-2 Does Not Fire When

- Session was saved offline (`source: offline_sync`) — honors silently to L-10
- Evaluation was triggered by chapter seal — honors routed to M-5/L-6 sealing flow
- Evaluation was triggered by goal completion — honors silently to L-10
- Evaluation timed out before W-17 became interactive — honors silently to L-10 on retry
- No honors were awarded in the transaction

### 8.3 Bundling Logic

All `HonorInstance` records created in a single evaluation transaction are included in one M-2 payload. Order within the payload follows the evaluator sequence: Training → Strength → Club → ChapterDepth → Program → Community → Longevity.

Chapter-seal honors (`first_chapter_sealed`, `chapters_sealed_5/10/25`) are excluded from M-2 payloads even if they somehow appear in the same timeframe as a session save. Per M-2 §10 E-5: these delivery paths never merge.

### 8.4 M-2 Payload Minimum Content

Each entry in the M-2 bundle contains:
- `honorId` — for L-11 navigation on multi-honor row tap
- `displayName` — for rendering the honor name in the modal

No other HonorInstance fields are required by M-2 for rendering.

---

## 9. Statistics Source of Truth

Per ES-11, evaluators operate exclusively against precomputed state. Evaluators do not perform aggregation or computation during evaluation.

### 9.1 Athlete Statistics Record

The following counters are maintained on the athlete's statistics record and updated in pipeline step [2] before evaluators run:

| Field | Updated By | Read By |
|-------|-----------|---------|
| `workoutCount` | Session Save | `TrainingEvaluator` |
| `hoursForged` | Session Save | `TrainingEvaluator` |
| `chaptersSealed` | Chapter Seal | `ChapterEvaluator` (count) |
| `goalsAchieved` | Goal Completion | `GoalEvaluator` |
| `programsGraduated` | Program Graduation | `ProgramEvaluator` |
| `workoutsWithFriend` | WwF Session Save | `CommunityEvaluator` |
| `lifetimeDistance` (per `activityType`) | Session Save | `EnduranceEvaluator` *(v1.5; defined in `Endurance-Statistics-Architecture-Amendment-001.md`)* |
| `cumulativeActiveWeeks` | Session Save — mirrored from Rank Computation Model's existing locked Active Week computation, at the same step that updates every statistic above | `ConsistencyEvaluator` *(v1.5)* |

**v1.5 note on `cumulativeActiveWeeks`:** "Active Week" is defined and computed inside the Rank Computation Model, not natively inside this service's own statistics. Rather than have `ConsistencyEvaluator` reach into RCM directly — which would violate § 9.5's invariant — RCM's existing, already-locked cumulative count is mirrored **into** the Athlete Statistics Record at pipeline step [2], identically to how every other statistic above is populated. `ConsistencyEvaluator` reads it from there like any other evaluator (AD-V1-7).

### 9.2 PR Records

One record per canonical qualifying lift — **bench press, squat, deadlift, overhead press, pull-up** *(v1.5: extended from three lifts to five; pull-up qualifies on added-weight PR, not bodyweight reps, preserving AD-30's actual-weight-only rule — resolves the original Pre-Authoring-Audit's Finding F7)*. Each record stores the athlete's all-time maximum weight (or, for pull-up, maximum added weight) in their unit system.

PR records are updated in pipeline step [3] before `StrengthEvaluator` and `ClubEvaluator` run. Evaluators read post-update PR state — they never compute session maxima from raw logged sets.

### 9.3 Per-Chapter Session Count

A session counter on the chapter record, incremented at session save in pipeline step [2]. `ChapterDepthEvaluator` reads this counter, not a raw count of session records.

### 9.4 Account Creation Date

`athlete.accountCreationDate` is immutable after account creation. `LongevityEvaluator` reads it directly. No statistics update is needed.

### 9.5 Invariant

**Evaluators never query session history, goal records, program records, or chapter records to perform threshold comparisons.** They read only from the precomputed state listed above. This invariant enables consistent evaluation performance regardless of legacy size.

**v1.5 clarification:** `PrestigeEvaluator` (§ 4.13) and `HiddenEvaluator`'s `hidden_triple_threat` check (§ 4.14) read `HonorInstance` records — the Honors system's own derived output — and this same transaction's in-flight qualifying-honor list. This is consistent with this invariant, not an exception to it: `HonorInstance` is precomputed state the Honors system itself produced, not a source-entity query into session/goal/program/chapter records.

---

## 10. Architecture Decision Index

| Decision | Summary |
|----------|---------|
| ES-1 | Evaluation is event-specific — only evaluator families capable of producing new honors for the trigger type are invoked |
| ES-2 | Evaluation occurs immediately post-event — no background workers in MVP |
| ES-3 | All qualifying honors are awarded in a single transaction — no suppression, no "highest only" logic |
| ES-4 | Fixed deterministic pipeline: Persist → Statistics → PRs → Evaluate → Create Honors → Create Timeline Events → Queue M-2 |
| ES-5 | Eight evaluator families: `Training`, `Strength`, `Club`, `Goal`, `Program`, `Community`, `Chapter`, `Longevity` |
| ES-6 | Evaluation is an atomic transaction (steps [4]–[7]); source event committed independently in step [1]; failures retry without data loss |
| ES-7 | Retroactive evaluation is family-targeted — only the relevant evaluator family runs; no full catalog re-evaluation |
| ES-8 | All honors from a single evaluation transaction bundle into one M-2 payload; grouping is by transaction, not by honor type |
| ES-9 | Trigger sources: Session Save, Goal Completion, Program Graduation, Chapter Seal, WwF Session Save, Import Completion, Offline Sync |
| ES-10 | `LongevityEvaluator` runs on every evaluation-triggering event; no anniversary scheduler; first qualifying event after anniversary awards the honor |
| ES-11 | Evaluators read precomputed statistics and PR records — never raw history; statistics updated before evaluators run |
| ES-12 | *(v1.5)* `PrestigeEvaluator` runs at new pipeline step [4.5], after every other evaluator in the same transaction; reads `HonorInstance` history + this transaction's in-flight qualifying pool; not an ES-11 violation (§ 9.5 clarification) |
| ES-13 | *(v1.5)* `cumulativeActiveWeeks` is mirrored into the Athlete Statistics Record at pipeline step [2] from RCM's existing locked computation — never cross-read directly, preserving ES-11 |
| ES-14 | *(v1.5)* PR-record storage covers five lifts (bench, squat, deadlift, overhead press, pull-up), not three — resolves the original Pre-Authoring-Audit's Finding F7 |

---

## 11. Open Items

The following are deferred from this architecture note:

- **Database schema** for athlete statistics record, PR records, per-chapter session counter
- **Retry mechanism** for failed evaluation transactions — implementation detail, not specified here
- **Import evaluation ordering** — when multiple evaluator families run for an import, their sequence is an implementation detail
- **M-5 Chapter Sealing ceremony integration** — how chapter-seal honors are passed to the M-5/L-6 flow is governed by M-5 spec (not yet written)
- **M-3 Goal Achieved ceremony sequencing** — the relationship between M-3 firing and `GoalEvaluator` running is an implementation coordination detail
- **Partial session handling** — how `hoursForged` and `workoutCount` are incremented for partial sessions (Save & Exit) vs. complete sessions; confirmed by AD-42 that both count; implementation detail
- **WwF mutual evaluation** — whether the training partner's counters update (and their evaluators run) in the same transaction; implementation detail

---

## 12. Closure Record

The Honors Architecture workstream is complete.

### Completed Architecture Documents

| Document | Status |
|----------|--------|
| `Docs/Honor-Catalog-v1.0-LOCKED.md` | LOCKED |
| `Docs/HonorInstance-Architecture-v1.0.md` | LOCKED |
| `Docs/Honor-Evaluation-Service-Architecture-v1.0.md` | LOCKED |

### Completed Spec Documents (L-10 updated to reflect the current 167-type catalog as of this pass; L-11/M-2 still reflect the original 53-type design and have not been re-verified against the v1.5 catalog)

| Document | Version |
|----------|---------|
| `Docs/Honors-Spec-L10.md` | v1.1 |
| `Docs/Honor-Detail-Sheet-Spec-L11.md` | v1.1 |
| `Docs/Honor-Earned-Modal-Spec-M2.md` | v1.1 |

### Architecture Coverage Confirmation

| Area | Status |
|------|--------|
| Catalog defined and locked (167 types as of v1.5) | ✓ |
| All evaluator families defined | ✓ |
| All trigger sources defined | ✓ |
| Evaluation pipeline order defined | ✓ |
| Transactional integrity rules defined | ✓ |
| Failure handling defined | ✓ |
| Retroactive evaluation defined | ✓ |
| M-2 integration defined | ✓ |
| Statistics source of truth defined | ✓ |
| HonorInstance schema locked | ✓ |

### Remaining Honors Workstream Items

The Honors architecture workstream is closed. No remaining architecture documents are required before Honors implementation can begin.

Outstanding items are **implementation concerns**, not architecture concerns:

- Database schema (statistics tables, PR records, chapter counters)
- Evaluation service implementation (each evaluator family's code)
- M-5 Chapter Sealing ceremony spec — governs how chapter-seal honors enter the ceremony path (M-5 is an unspecced ceremony; when M-5 is specced, it must define how it receives and displays chapter-seal honors)
- Retry mechanism implementation
- API contracts for HonorInstance sync to local storage

---

## 13. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial lock |
| v1.0.1 | June 2026 | Reconciliation pass for `Social-System-Architecture-v1.0`. Added a post-pipeline reconciliation note: an earned Honor is a milestone trigger for an optional automatic milestone Post (owned by Social-System-Architecture, post-commit read-only consumer, gated by Automatically-Share-Milestones). No schema change; honors remain account-based; posting never alters the HonorInstance or affects evaluation (SOC-D13). No existing decision changed. |
| v1.1 | June 2026 | `Honors-Architecture-V1-Final-v1.0.md` reconciled. Added four new evaluator families (§ 4.9–4.12): `EnduranceEvaluator`, `ConsistencyEvaluator`, `PrestigeEvaluator`, `HiddenEvaluator`. Added new pipeline step `[4.5] RUN PRESTIGE EVALUATOR` (§ 5). Extended § 9.1's Statistics Source of Truth with `lifetimeDistance` and `cumulativeActiveWeeks` (the latter mirrored from RCM, not cross-read). Extended § 9.2's PR storage scope from three lifts to five (resolves Pre-Authoring-Audit Finding F7). Added one clarifying sentence to § 9.5 confirming Prestige/Hidden's HonorInstance-history reads are not an invariant violation. Added ES-12/13/14 to the Decision Index. `SexSpecificStrengthEvaluator` and `RelativeStrengthEvaluator` were designed in this pass and then deferred to V2 by PO decision before final lock (§ 4.9 deferral note) — neither exists in the V1 pipeline. No existing evaluator, trigger, or pipeline step changed. |

---

*Honor Evaluation Service Architecture — v1.1 — LOCKED*
*Forge Legacy | June 2026*
