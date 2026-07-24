# Honor Catalog — MVP
## v1.6 — LOCKED | June 2026

**Status:** LOCKED
**Authority:** L-10 Honors Hub Spec, L-11 Honor Detail Sheet Spec, M-2 Honor Earned Modal Spec, Master PRD § 13, Product DNA. **v1.1:** Honor-Catalog-Amendment-001-Challenge-Honors (LOCKED) — adds the Competition category under Comparison-Philosophy-Amendment-001. **v1.2:** Challenge-Architecture-Amendment-003 v1.1 (LOCKED) — challenges are participant-based; COMPETITION Wins/Participation families credit both SQUAD and FRIENDS challenges, Participation Streak stays SQUAD-context only (no schema change; see the COMPETITION architecture notes). **v1.3:** Honor-Catalog-Amendment-002-Community-Honors (LOCKED) — renames the legacy `COMMUNITY` category to `PARTNERSHIP` (label only; a naming collision with the new Communities subsystem, found and resolved during reconciliation) and adds a new `COMMUNITIES` category (5 types) per `Community-System-Architecture-v1.0` COM-D11. **v1.4:** `Squad-System-Architecture-v1.0` (LOCKED) SQ-D10 — adds a new `SQUAD` category (15 types, 7 families): Squad Founder, Perfect Week, Squad Streak, Mission Complete, Team Player, 100 Squad Workouts, Everyone Finished Program. **v1.5:** `Honors-Architecture-V1-Final-v1.0.md` (LOCKED) — reconciles the previously-unmerged Expansion Passes 1–2 (Strength Overhead Press/Pull-Up, Training/Chapters/Goals/Programs/Longevity depth) and Passes 3–6 (Endurance for Running/Walking/Cycling/Swimming, Consistency, Prestige) into this catalog; adds a new Hidden category. Two new Strength families (Sex-Specific Milestones, Relative Strength Milestones) were designed during this pass and **deferred to V2 by PO decision** before final lock — full design preserved in § DEFERRED TO V2. Hiking/Rowing Endurance, Comebacks & Resilience, and a Bodybuilding volume-PR family remain separately, genuinely blocked (see `Honors-Architecture-V1-Final-v1.0.md` §9). **v1.6:** Honor-Catalog-Amendment-003-Initiative-Honor (LOCKED) — adds the Origin-family `initiative` honor (the fresh athlete's first-move honor: program built/chosen or first workout logged; migrations 0014/0015; per Onboarding-Amendment-003). **Training 23→24, catalog 167→168**; the Category Summary + TRAINING count-table reconciliation folds in with this doc's pending catalog-expansion backlog (the Origin family row + the amendment are the governing record meanwhile).

---

## MVP Honor Catalog — LOCKED

**167 honor types. 13 categories. 34 families.** (v1.0: 53 / 7 / 11; v1.1 adds the 9-type Competition category; v1.3 adds the 5-type Communities category and relabels the legacy Community category to Partnership; v1.4 adds the 15-type Squad category, reaching 82 / 10 / 25 — note: the v1.4 header previously claimed 22 families, but the category table's own family breakdown sums to 25; this was a recurring arithmetic error first caught and fixed at the v1.0/v1.2.1 stage that crept back in and was never re-checked at v1.3/v1.4 — corrected here. v1.5 reconciles the previously-unmerged Expansion Passes 1–6 and adds a new Hidden category, reaching 167 / 13 / 34. Two additional Strength families [Sex-Specific Milestones, Relative Strength Milestones — 24 types, 2 families] were designed and then deferred to V2 by PO decision; see § DEFERRED TO V2.)

No honor types may be added, removed, or modified without a formal architecture amendment.

> **Reconciliation note — Social-System-Architecture-v1.0 (LOCKED, June 2026; governing social authority).** An earned Honor may serve as a **milestone trigger** for an **optional automatic milestone Post** (SOC-D9/D12/D16), gated by the athlete's Automatically-Share-Milestones setting. This hook lives in Social-System-Architecture and the Honor Evaluation Service's post-commit path — **honors remain account-based, no honor type or schema changes, and posting an honor never alters the honor or affects Honor evaluation** (SOC-D13). The catalog is unchanged.

---

## Category Summary

| Category | Types | Families |
|----------|-------|---------|
| Strength | 26 | Bench (4), Squat (4), Deadlift (4), Clubs lbs (3), Clubs kg (3), Overhead Press (4), Pull-Up (4) |
| Chapters | 14 | Count (5), Depth (5), Duration (4) |
| Training | 23 | Origin (1), Workout Count (9), Hours Forged (8), Consistency (5) |
| Goals | 6 | Goals (6) |
| Programs | 7 | Programs (5), Family Mastery (2) |
| Partnership *(v1.3 — renamed from Community, label only)* | 3 | Partnership (3) |
| Longevity | 7 | Longevity (7) |
| Competition | 9 | Wins (3), Participation (3), Participation Streak (3) |
| Communities *(v1.3, new)* | 5 | Communities (5) |
| Squad *(v1.4, new)* | 15 | Founder (1), Perfect Week (3), Squad Streak (3), Mission Complete (3), Team Player (1), Squad Workouts (3), Program (1) |
| Endurance *(v1.5, new)* | 38 | Running (10), Walking (10), Cycling (9), Swimming (9) |
| Prestige *(v1.5, new)* | 8 | Breadth Ladder (4), Named Combinations (4) |
| Hidden *(v1.5, new)* | 6 | Hidden (6) |
| **Total** | **167** | **34** |

---

## STRENGTH — 26 Types

**Architecture notes:**
- Unit-adaptive: single `honorType` ID, dual lbs/kg thresholds. Display name snapshotted at earn time (AD-30a).
- Club types are genuinely separate per unit system — not unit-adaptive. lbs and kg club totals do not map to each other (AD-31e).
- Trigger: Session Save → PR Evaluation
- Qualification: actual weight only — no RPE, no estimated 1RM (AD-30)
- Qualifying movements: canonical exercise library only; custom exercises excluded (AD-28b, AD-28c)
- PR batch evaluation at session save; no minimum rep requirement (AD-29a, AD-29b)
- Club totals use all-time PRs across all sessions (AD-31a)
- **v1.5:** PR-record storage extends from three lifts to five — bench press, squat, deadlift, overhead press, pull-up (Pull-Up qualifies on added-weight PR, not bodyweight reps, preserving AD-30's actual-weight-only rule). See `Honor-Evaluation-Service-Architecture-v1.0.md` §9.2.
- **v1.5 — deferred to V2:** Two new Strength families (Sex-Specific Milestones, Relative Strength Milestones) were designed for this pass and then deferred to V2 by PO decision prior to final lock. Full design preserved in **§ DEFERRED TO V2** below for future use. No Profile field changes ship in V1 as a result.

### Bench Press Family — 4 types

| # | honorType | Display Name (lbs) | Display Name (kg) | Qualification |
|---|-----------|-------------------|-------------------|---------------|
| 1 | `bench_milestone_1` | Bench 135 | Bench 60kg | bench PR ≥ 135 lbs or ≥ 60 kg |
| 2 | `bench_milestone_2` | Bench 225 | Bench 100kg | bench PR ≥ 225 lbs or ≥ 100 kg |
| 3 | `bench_milestone_3` | Bench 315 | Bench 140kg | bench PR ≥ 315 lbs or ≥ 140 kg |
| 4 | `bench_milestone_4` | Bench 405 | Bench 180kg | bench PR ≥ 405 lbs or ≥ 180 kg |

### Squat Family — 4 types

| # | honorType | Display Name (lbs) | Display Name (kg) | Qualification |
|---|-----------|-------------------|-------------------|---------------|
| 5 | `squat_milestone_1` | Squat 225 | Squat 100kg | squat PR ≥ 225 lbs or ≥ 100 kg |
| 6 | `squat_milestone_2` | Squat 315 | Squat 140kg | squat PR ≥ 315 lbs or ≥ 140 kg |
| 7 | `squat_milestone_3` | Squat 405 | Squat 180kg | squat PR ≥ 405 lbs or ≥ 180 kg |
| 8 | `squat_milestone_4` | Squat 500 | Squat 225kg | squat PR ≥ 500 lbs or ≥ 225 kg |

### Deadlift Family — 4 types

| # | honorType | Display Name (lbs) | Display Name (kg) | Qualification |
|---|-----------|-------------------|-------------------|---------------|
| 9 | `deadlift_milestone_1` | Deadlift 315 | Deadlift 140kg | deadlift PR ≥ 315 lbs or ≥ 140 kg |
| 10 | `deadlift_milestone_2` | Deadlift 405 | Deadlift 180kg | deadlift PR ≥ 405 lbs or ≥ 180 kg |
| 11 | `deadlift_milestone_3` | Deadlift 500 | Deadlift 225kg | deadlift PR ≥ 500 lbs or ≥ 225 kg |
| 12 | `deadlift_milestone_4` | Deadlift 600 | Deadlift 270kg | deadlift PR ≥ 600 lbs or ≥ 270 kg |

### Clubs lbs Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 13 | `club_1000` | 1,000 Pound Club | bench + squat + deadlift all-time PRs ≥ 1,000 lbs |
| 14 | `club_1200` | 1,200 Pound Club | combined all-time PRs ≥ 1,200 lbs |
| 15 | `club_1500` | 1,500 Pound Club | combined all-time PRs ≥ 1,500 lbs |

### Clubs kg Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 16 | `club_400kg` | 400 Kilogram Club | bench + squat + deadlift all-time PRs ≥ 400 kg |
| 17 | `club_500kg` | 500 Kilogram Club | combined all-time PRs ≥ 500 kg |
| 18 | `club_600kg` | 600 Kilogram Club | combined all-time PRs ≥ 600 kg |

### Overhead Press Family — 4 types *(v1.5, merged from Expansion Pass 1)*

| # | honorType | Display Name (lbs) | Display Name (kg) | Qualification |
|---|-----------|--------------------|--------------------|--------------|
| 83 | `overhead_press_milestone_1` | Overhead Press 95 | Overhead Press 40kg | OHP PR ≥ 95 lbs or ≥ 40 kg |
| 84 | `overhead_press_milestone_2` | Overhead Press 135 | Overhead Press 60kg | OHP PR ≥ 135 lbs or ≥ 60 kg |
| 85 | `overhead_press_milestone_3` | Overhead Press 185 | Overhead Press 80kg | OHP PR ≥ 185 lbs or ≥ 80 kg |
| 86 | `overhead_press_milestone_4` | Overhead Press 225 | Overhead Press 100kg | OHP PR ≥ 225 lbs or ≥ 100 kg |

### Pull-Up Family — 4 types *(v1.5, merged from Expansion Pass 1, weighted/added-load qualification)*

| # | honorType | Display Name (lbs) | Display Name (kg) | Qualification |
|---|-----------|--------------------|--------------------|--------------|
| 87 | `pull_up_milestone_1` | Weighted Pull-Up +25 | Weighted Pull-Up +10kg | Added-weight PR ≥ 25 lbs or ≥ 10 kg |
| 88 | `pull_up_milestone_2` | Weighted Pull-Up +50 | Weighted Pull-Up +20kg | Added-weight PR ≥ 50 lbs or ≥ 20 kg |
| 89 | `pull_up_milestone_3` | Weighted Pull-Up +75 | Weighted Pull-Up +35kg | Added-weight PR ≥ 75 lbs or ≥ 35 kg |
| 90 | `pull_up_milestone_4` | Weighted Pull-Up +100 | Weighted Pull-Up +45kg | Added-weight PR ≥ 100 lbs or ≥ 45 kg |

---

## CHAPTERS — 14 Types

**Architecture notes:**
- Count family: Trigger = Chapter Seal Event. One-time.
- Depth family: Trigger = Session Save → chapter session count check. **Repeatable per chapter.** Unique key: `honorType + chapterId`.
- **v1.5 Duration family (new):** Trigger = Chapter Seal Event (same trigger as Count — elapsed time is computed from the chapter's own start/seal timestamps at the moment it is already being sealed). **Repeatable per chapter.** Unique key: `honorType + chapterId`. Measures calendar time elapsed in a chapter — a distinct dimension from Depth (session count within a chapter); an athlete can earn one without the other.

### Count Family — 5 types *(v1.5: +1, merged from Expansion Pass 1)*

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 19 | `first_chapter_sealed` | First Chapter Sealed | chapters_sealed_count ≥ 1 |
| 20 | `chapters_sealed_5` | 5 Chapters Sealed | chapters_sealed_count ≥ 5 |
| 21 | `chapters_sealed_10` | 10 Chapters Sealed | chapters_sealed_count ≥ 10 |
| 22 | `chapters_sealed_25` | 25 Chapters Sealed | chapters_sealed_count ≥ 25 |
| 91 | `chapters_sealed_50` | 50 Chapters Sealed | chapters_sealed_count ≥ 50 |

### Depth Family — 5 types, repeatable per chapter *(v1.5: +1, merged from Expansion Pass 2)*

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 23 | `workouts_in_chapter_10` | 10 Workouts in a Chapter | session_count_in_chapter ≥ 10 |
| 24 | `workouts_in_chapter_25` | 25 Workouts in a Chapter | session_count_in_chapter ≥ 25 |
| 25 | `workouts_in_chapter_50` | 50 Workouts in a Chapter | session_count_in_chapter ≥ 50 |
| 26 | `workouts_in_chapter_100` | 100 Workouts in a Chapter | session_count_in_chapter ≥ 100 |
| 96 | `workouts_in_chapter_250` | 250 Workouts in a Chapter | session_count_in_chapter ≥ 250 |

### Duration Family — 4 types, repeatable per chapter *(v1.5, new — merged from Expansion Passes 1 and 2)*

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 92 | `chapter_duration_6_months` | Half a Year, One Chapter | Chapter's sealed-minus-started elapsed time ≥ 182 days |
| 93 | `chapter_duration_1_year` | A Full Year, One Chapter | Elapsed time ≥ 365 days |
| 94 | `chapter_duration_2_years` | Two Years, One Chapter | Elapsed time ≥ 730 days |
| 95 | `chapter_duration_3_years` | Three Years, One Chapter | Elapsed time ≥ 1,095 days |

Metadata for both new families: `chapterName`, snapshotted — identical pattern to the existing Count/Depth families.

---

## TRAINING — 23 Types

**Architecture notes:**
- Trigger: Session Save → AthleteTrainingStats update → evaluation
- Partial sessions (Save & Exit) count toward all Training metrics (AD-42)
- Discarded sessions count nothing (AD-42)
- Hours Forged: session timer runs from screen entry to Save confirmation, including backgrounded and device-locked time (AD-40 trust model)
- **v1.5 Consistency family (new):** Trigger = Session Save → reads `cumulativeActiveWeeks`, mirrored from the Rank Computation Model's existing Active Week computation into the Athlete Statistics Record at the same step that updates every other Training statistic. Cumulative, never-revocable, retrospective-only — no current streak is ever tracked or shown (see `Honor-Evaluation-Service-Architecture-v1.0.md` §9.1, §4.12 ConsistencyEvaluator).

### Origin Family — 2 types *(Amendment 2026-07-19: +1 `initiative`)*

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 27 | `first_workout_logged` | First Workout Logged | total_sessions ≥ 1 |
| 101 | `initiative` | Initiative | First program committed — built OR chosen (≥ 1) |

**`initiative` architecture note (Amendment 2026-07-19):** the fresh-athlete "first move" honor — earned the moment an athlete commits to a starting program (builds their own, or accepts a suggested one on the Home on-ramp). It anchors the "Legacy Unlocked" ceremony (Onboarding-Amendment-003). Unlike every other Training honor, its trigger is **program-commit, not a count over committed session data**, and the "chosen a suggestion" path persists no program row — so it is granted by a dedicated client-callable RPC `claim_initiative_honor` (migration `0014`) rather than inside `evaluate_honors`/`save_workout`. It reuses the identical grant machinery: one-time (`chapter_id` null), DB-enforced grant-once via the `honor_once` partial unique index + `ON CONFLICT DO NOTHING`, and a live `HONOR_EARNED` timeline event. Read path is unchanged — it appears in Legacy Honors like any other earned honor.

### Workout Count Family — 9 types *(v1.5: +4, merged from Expansion Passes 1 and 2)*

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 97 | `workouts_logged_25` | 25 Workouts Logged | total_sessions ≥ 25 |
| 28 | `workouts_logged_50` | 50 Workouts Logged | total_sessions ≥ 50 |
| 29 | `workouts_logged_100` | 100 Workouts Logged | total_sessions ≥ 100 |
| 30 | `workouts_logged_250` | 250 Workouts Logged | total_sessions ≥ 250 |
| 31 | `workouts_logged_500` | 500 Workouts Logged | total_sessions ≥ 500 |
| 32 | `workouts_logged_1000` | 1,000 Workouts Logged | total_sessions ≥ 1,000 |
| 98 | `workouts_logged_1500` | 1,500 Workouts Logged | total_sessions ≥ 1,500 |
| 99 | `workouts_logged_2500` | 2,500 Workouts Logged | total_sessions ≥ 2,500 |
| 100 | `workouts_logged_5000` | 5,000 Workouts Logged | total_sessions ≥ 5,000 |

### Hours Forged Family — 8 types *(v1.5: +2, merged from Expansion Pass 1)*

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 33 | `hours_forged_100` | 100 Hours Forged | cumulative_session_hours ≥ 100 |
| 34 | `hours_forged_250` | 250 Hours Forged | cumulative_session_hours ≥ 250 |
| 35 | `hours_forged_500` | 500 Hours Forged | cumulative_session_hours ≥ 500 |
| 36 | `hours_forged_1000` | 1,000 Hours Forged | cumulative_session_hours ≥ 1,000 |
| 37 | `hours_forged_2500` | 2,500 Hours Forged | cumulative_session_hours ≥ 2,500 |
| 38 | `hours_forged_5000` | 5,000 Hours Forged | cumulative_session_hours ≥ 5,000 |
| 101 | `hours_forged_7500` | 7,500 Hours Forged | cumulative_session_hours ≥ 7,500 |
| 102 | `hours_forged_10000` | 10,000 Hours Forged | cumulative_session_hours ≥ 10,000 |

### Consistency Family — 5 types *(v1.5, new — merged from Expansion Pass 5)*

Cumulative, never-revocable, retrospective-only. No current streak is ever tracked or visible; an athlete cannot lose an already-earned week.

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 103 | `consistency_active_weeks_1` | 10 Active Weeks | Cumulative Active Weeks ≥ 10 |
| 104 | `consistency_active_weeks_2` | 50 Active Weeks | Cumulative Active Weeks ≥ 50 |
| 105 | `consistency_active_weeks_3` | 150 Active Weeks | Cumulative Active Weeks ≥ 150 |
| 106 | `consistency_active_weeks_4` | 300 Active Weeks | Cumulative Active Weeks ≥ 300 |
| 107 | `consistency_active_weeks_5` | 500 Active Weeks | Cumulative Active Weeks ≥ 500 |

Metadata: `{}` for all new Training honors — identical to the existing family pattern.

---

## GOALS — 6 Types

**Architecture notes:**
- Trigger: Goal Completion Event
- One-time

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 39 | `first_goal_achieved` | First Goal Achieved | goals_achieved_count ≥ 1 |
| 108 | `goals_achieved_5` | 5 Goals Achieved | goals_achieved_count ≥ 5 |
| 40 | `goals_achieved_10` | 10 Goals Achieved | goals_achieved_count ≥ 10 |
| 41 | `goals_achieved_25` | 25 Goals Achieved | goals_achieved_count ≥ 25 |
| 42 | `goals_achieved_50` | 50 Goals Achieved | goals_achieved_count ≥ 50 |
| 109 | `goals_achieved_100` | 100 Goals Achieved | goals_achieved_count ≥ 100 |

*(v1.5: +2, merged from Expansion Pass 1 — `goals_achieved_5`, `goals_achieved_100`. Metadata `{}`, identical to existing pattern.)*

---

## PROGRAMS — 7 Types

**Architecture notes:**
- Trigger: Program Graduation Event
- One-time
- **v1.5 Family Mastery family (new):** same trigger and evaluator as Graduation Volume. Rewards graduating every program within a single successor lineage (`successorProgramId` chain) — a distinct dimension from graduation count (breadth vs. depth of commitment to one path). Metadata: `lineageId` (navigation), `lineageName` (snapshotted).

### Graduation Volume Family — 5 types *(v1.5: +1, merged from Expansion Pass 1)*

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 43 | `first_program_graduated` | First Program Graduated | programs_graduated_count ≥ 1 |
| 44 | `programs_graduated_5` | 5 Programs Graduated | programs_graduated_count ≥ 5 |
| 45 | `programs_graduated_10` | 10 Programs Graduated | programs_graduated_count ≥ 10 |
| 46 | `programs_graduated_25` | 25 Programs Graduated | programs_graduated_count ≥ 25 |
| 110 | `programs_graduated_50` | 50 Programs Graduated | programs_graduated_count ≥ 50 |

### Family Mastery Family — 2 types *(v1.5, new — merged from Expansion Pass 1)*

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 111 | `program_family_mastery_1` | Program Family Mastery | Athlete has graduated every program within a single successor lineage, for the first time |
| 112 | `program_family_mastery_3` | Three Lineages Mastered | Athlete has fully mastered 3 distinct successor lineages across their legacy |

---

## PARTNERSHIP — 3 Types *(v1.3 — renamed from "Community"; label only, per Honor-Catalog-Amendment-002. These are Workout-With-Friend training-partner honors, unrelated to the Communities subsystem — see the COMMUNITIES category below.)*

**Architecture notes:**
- Trigger: WwF Session Save → wwf_sessions_count evaluation
- Count is cumulative across all training partners
- One-time

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 47 | `first_workout_with_friend` | First Workout With Friend | wwf_sessions_count ≥ 1 |
| 48 | `workout_with_friend_10` | 10 Workouts With Friend | wwf_sessions_count ≥ 10 |
| 49 | `workout_with_friend_50` | 50 Workouts With Friend | wwf_sessions_count ≥ 50 |

---

## LONGEVITY — 7 Types

**Architecture notes:**
- Trigger: Session Save → Anniversary Check
- `dateEarned` = account anniversary date (NOT session save date) — AD-33
- Qualification evaluated against `account_creation_date`
- One-time
- **v1.5:** extended with a 90-day early rung and two new ceiling rungs (15/20 years), merged from Expansion Pass 1. No evaluator logic change — `LongevityEvaluator` already iterates "for each longevity threshold" generically.

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 113 | `longevity_90_days` | 90 Days Forging | account_creation_date + 90 days ≤ current_date |
| 50 | `longevity_1_year` | 1 Year Forging | account_creation_date + 365 days ≤ current_date |
| 51 | `longevity_3_years` | 3 Years Forging | account_creation_date + 1,095 days ≤ current_date |
| 52 | `longevity_5_years` | 5 Years Forging | account_creation_date + 1,825 days ≤ current_date |
| 53 | `longevity_10_years` | 10 Years Forging | account_creation_date + 3,650 days ≤ current_date |
| 114 | `longevity_15_years` | 15 Years Forging | account_creation_date + 5,475 days ≤ current_date |
| 115 | `longevity_20_years` | 20 Years Forging | account_creation_date + 7,300 days ≤ current_date |

---

## ENDURANCE — 38 Types *(v1.5, new — merged from Expansion Passes 3 and 4, Running/Walking/Cycling/Swimming only)*

**Architecture notes:**
- Trigger: Session Save. Single-Session family reads `distanceValue`/`distanceUnit` directly from the session record. Lifetime Distance family reads `lifetimeDistance` per `(athleteId, activityType)`, defined and LOCKED in `Endurance-Statistics-Architecture-Amendment-001.md`.
- No new architecture required — both fields/statistics already exist and are LOCKED.
- One-time. Obeys AD-7 (no catalog visibility), AD-27 (no rank effect), AD-33 (dual dates).
- **Hiking and Rowing honors are explicitly deferred** — `HIKE`/`ROW` are not yet in the locked `ActivityType` enum (see `ActivityType-Expansion-Evaluation-Hiking-Rowing.md`). 18 honors (9 Hiking, 9 Rowing) are fully authored in the source passes and ready to merge the moment the enum amendment lands — see `Honors-Architecture-V1-Final-v1.0.md` §9.

### Running — Single-Session Family — 5 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 116 | `run_milestone_1` | First Mile Run | RUN session ≥ 1 mi or ≥ 1.6 km |
| 117 | `run_milestone_2` | First 5K Run | RUN session ≥ 5 km or ≥ 3.1 mi |
| 118 | `run_milestone_3` | First 10K Run | RUN session ≥ 10 km or ≥ 6.2 mi |
| 119 | `run_milestone_4` | First Half Marathon Run | RUN session ≥ 21.1 km or ≥ 13.1 mi |
| 120 | `run_milestone_5` | First Marathon Run | RUN session ≥ 42.2 km or ≥ 26.2 mi |

### Running — Lifetime Distance Family — 5 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 121 | `run_lifetime_distance_1` | 100 Lifetime Running Miles | lifetimeDistance (RUN) ≥ 100 mi or ≥ 160 km |
| 122 | `run_lifetime_distance_2` | 500 Lifetime Running Miles | lifetimeDistance (RUN) ≥ 500 mi or ≥ 800 km |
| 123 | `run_lifetime_distance_3` | 1,000 Lifetime Running Miles | lifetimeDistance (RUN) ≥ 1,000 mi or ≥ 1,600 km |
| 124 | `run_lifetime_distance_4` | 5,000 Lifetime Running Miles | lifetimeDistance (RUN) ≥ 5,000 mi or ≥ 8,000 km |
| 125 | `run_lifetime_distance_5` | 15,000 Lifetime Running Miles | lifetimeDistance (RUN) ≥ 15,000 mi or ≥ 24,000 km |

### Walking — Single-Session Family — 5 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 126 | `walk_milestone_1` | First Mile Walk | WALK session ≥ 1 mi or ≥ 1.6 km |
| 127 | `walk_milestone_2` | First 5K Walk | WALK session ≥ 5 km or ≥ 3.1 mi |
| 128 | `walk_milestone_3` | First 10K Walk | WALK session ≥ 10 km or ≥ 6.2 mi |
| 129 | `walk_milestone_4` | First Half Marathon Walk | WALK session ≥ 21.1 km or ≥ 13.1 mi |
| 130 | `walk_milestone_5` | First Marathon Walk | WALK session ≥ 42.2 km or ≥ 26.2 mi |

### Walking — Lifetime Distance Family — 5 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 131 | `walk_lifetime_distance_1` | 100 Lifetime Walking Miles | lifetimeDistance (WALK) ≥ 100 mi or ≥ 160 km |
| 132 | `walk_lifetime_distance_2` | 500 Lifetime Walking Miles | lifetimeDistance (WALK) ≥ 500 mi or ≥ 800 km |
| 133 | `walk_lifetime_distance_3` | 1,000 Lifetime Walking Miles | lifetimeDistance (WALK) ≥ 1,000 mi or ≥ 1,600 km |
| 134 | `walk_lifetime_distance_4` | 5,000 Lifetime Walking Miles | lifetimeDistance (WALK) ≥ 5,000 mi or ≥ 8,000 km |
| 135 | `walk_lifetime_distance_5` | 15,000 Lifetime Walking Miles | lifetimeDistance (WALK) ≥ 15,000 mi or ≥ 24,000 km |

### Cycling — Single-Session Family — 4 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 136 | `bike_milestone_1` | First 25-Mile Ride | BIKE session ≥ 25 mi or ≥ 40 km |
| 137 | `bike_milestone_2` | First 50-Mile Ride | BIKE session ≥ 50 mi or ≥ 80 km |
| 138 | `bike_milestone_3` | First Century Ride | BIKE session ≥ 100 mi or ≥ 161 km |
| 139 | `bike_milestone_4` | First Double Century Ride | BIKE session ≥ 200 mi or ≥ 322 km |

### Cycling — Lifetime Distance Family — 5 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 140 | `bike_lifetime_distance_1` | 250 Lifetime Cycling Miles | lifetimeDistance (BIKE) ≥ 250 mi or ≥ 400 km |
| 141 | `bike_lifetime_distance_2` | 1,000 Lifetime Cycling Miles | lifetimeDistance (BIKE) ≥ 1,000 mi or ≥ 1,600 km |
| 142 | `bike_lifetime_distance_3` | 5,000 Lifetime Cycling Miles | lifetimeDistance (BIKE) ≥ 5,000 mi or ≥ 8,000 km |
| 143 | `bike_lifetime_distance_4` | 15,000 Lifetime Cycling Miles | lifetimeDistance (BIKE) ≥ 15,000 mi or ≥ 24,000 km |
| 144 | `bike_lifetime_distance_5` | 50,000 Lifetime Cycling Miles | lifetimeDistance (BIKE) ≥ 50,000 mi or ≥ 80,000 km |

### Swimming — Single-Session Family — 4 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 145 | `swim_milestone_1` | First 500m Swim | SWIM session ≥ 500 m or ≥ 547 yd |
| 146 | `swim_milestone_2` | First 1000m Swim | SWIM session ≥ 1,000 m or ≥ 1,094 yd |
| 147 | `swim_milestone_3` | First Mile Swim | SWIM session ≥ 1,609 m or ≥ 1,760 yd |
| 148 | `swim_milestone_4` | First 5K Swim | SWIM session ≥ 5,000 m or ≥ 3.1 mi |

### Swimming — Lifetime Distance Family — 5 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 149 | `swim_lifetime_distance_1` | 25 Lifetime Swimming Kilometers | lifetimeDistance (SWIM) ≥ 25 km or ≥ 15.5 mi |
| 150 | `swim_lifetime_distance_2` | 100 Lifetime Swimming Kilometers | lifetimeDistance (SWIM) ≥ 100 km or ≥ 62 mi |
| 151 | `swim_lifetime_distance_3` | 250 Lifetime Swimming Kilometers | lifetimeDistance (SWIM) ≥ 250 km or ≥ 155 mi |
| 152 | `swim_lifetime_distance_4` | 500 Lifetime Swimming Kilometers | lifetimeDistance (SWIM) ≥ 500 km or ≥ 310 mi |
| 153 | `swim_lifetime_distance_5` | 1,000 Lifetime Swimming Kilometers | lifetimeDistance (SWIM) ≥ 1,000 km or ≥ 621 mi |

Metadata for all Endurance honors: `distanceDisplay` (pre-formatted), `unitSystem`, `activityType`.

---

## COMPETITION — 9 Types  *(v1.1 — Honor-Catalog-Amendment-001; v1.2 — Challenge-Architecture-Amendment-003 participant-based reconciliation; v1.3 — Challenge-Architecture-Amendment-004 extends crediting to the COMMUNITY context, no new types)*

**Architecture notes:**
- Trigger: Challenge Completion (winner) → Wins family; Challenge Enrollment Finalized → Participation + Participation Streak families. Evaluated by `ChallengeEvaluator`.
- **Account-cumulative across all three challenge contexts (v1.2 CA3-D9; v1.3/CC4-D6):** challenges are participant-based — a roster is a **Squad** (`context = SQUAD`), a set of accepted Friends (`context = FRIENDS`), **or a Community's membership (`context = COMMUNITY`)**. **Friend and Community Challenges count toward `challenges_won_count` and `challenges_entered_count` exactly as squad challenges do** — the **Wins** and **Participation** families credit all three contexts (account-cumulative across all squads, friend challenges, **and community challenges**). The **Participation Streak** family is the sole carve-out: `max_participation_streak` is **SQUAD-context only** (per-(athlete, squad), CS-D27) — **friend and community challenges do not contribute to streak honors.** No honor schema change.
- Permanent; obey AD-7 (no catalog visibility), AD-27 (no rank effect), AD-33 (dual dates).
- No negative honors; co-winners each receive full Win credit (Challenge-Architecture-Amendment-002 CA2-D2).

### Wins Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 54 | `first_challenge_won` | First Victory | challenges_won_count ≥ 1 |
| 55 | `challenges_won_10` | 10 Challenge Wins | challenges_won_count ≥ 10 |
| 56 | `challenges_won_25` | 25 Challenge Wins | challenges_won_count ≥ 25 |

### Participation Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 57 | `first_challenge_joined` | First Challenge Entered | challenges_entered_count ≥ 1 |
| 58 | `challenges_entered_10` | 10 Challenges Entered | challenges_entered_count ≥ 10 |
| 59 | `challenges_entered_25` | Challenge Veteran | challenges_entered_count ≥ 25 |

### Participation Streak Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 60 | `challenge_streak_3` | 3-Challenge Streak | max_participation_streak ≥ 3 |
| 61 | `challenge_streak_5` | 5-Challenge Streak | max_participation_streak ≥ 5 |
| 62 | `challenge_streak_10` | 10-Challenge Streak | max_participation_streak ≥ 10 |

---

## COMMUNITIES — 5 Types  *(v1.3 — Honor-Catalog-Amendment-002, per Community-System-Architecture-v1.0 COM-D11)*

**Architecture notes:**
- Trigger: Community membership events, `CommunityComment` like events, Community Event lifecycle events. New milestone sources for the Honor Evaluation Service; no `HonorInstance` schema change.
- Account-based; never community-scoped. No community-leaderboard surface exists for any of these (Community-System-Architecture-v1.0 §15.3).
- One-time. Obeys AD-7 (no catalog visibility), AD-27 (no rank effect), AD-33 (dual dates).
- `community_builder`, `helpful_contributor`, and `mentor` thresholds are flagged **Initial MVP Assumption — Subject to Future Revision** (same posture as Monetization-Architecture-Amendment-001's numeric limits).

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 63 | `first_community_joined` | First Community Joined | communities_joined_count ≥ 1 |
| 64 | `community_builder` | Community Builder | Owned community reaches 50 members |
| 65 | `helpful_contributor` | Helpful Contributor | Cumulative comment likes received ≥ 25 |
| 66 | `mentor` | Mentor | 10 distinct liked top-level comments across ≥ 3 distinct communities |
| 67 | `event_organizer` | Event Organizer | 1 hosted Community Event reaches its scheduled end |

---

## SQUAD — 15 Types  *(v1.4 — `Squad-System-Architecture-v1.0` SQ-D10, per the LOCKED Squad decision set)*

**Architecture notes:**
- Trigger: a new `SquadEvaluator` service (parallel to `ChallengeEvaluator`) feeding the existing Honor Evaluation Service pipeline — Squad creation, daily check-in evaluation (Streak/Perfect Week), Mission completion events, Goal completion events, squad cumulative workout-count updates, and Program Graduation events evaluated against the squad roster.
- **Account-cumulative across all squads the athlete belongs to** (parallel to the COMPETITION category's account-cumulative rule, AD-7/AD-27/AD-33 apply unchanged) — an athlete in two squads accumulates one combined count, not a per-squad count.
- **Squad-collective honors (Squad Founder, Perfect Week, Squad Streak, Mission Complete, 100 Squad Workouts, Everyone Finished Program) are evaluated against the squad's current roster at the qualifying moment; each current member receives their own `HonorInstance`** — there is no shared, squad-owned honor record (consistent with the COMMUNITIES category's "account-based; never community-scoped" posture).
- Permanent; obeys AD-7 (no catalog visibility), AD-27 (no rank effect), AD-33 (dual dates).
- Per `Squad-System-Architecture-v1.0` SQ-D2, earned Squad Honors may surface in the Squad Feed and the Squad's Honors section (`Squad-Detail-Wireframe-Spec-S2.md` §§18, 20) in addition to the standard M-2 ceremony — the ceremony rule is unchanged (SQ-D10 Rule 2): a Squad Honor is never itself a push notification.
- "Everyone Finished Program" is evaluated against the squad roster at the moment the final current member graduates the same program; later membership changes do not retroactively gain or lose the honor (snapshot rule, consistent with AD-52).

### Founder Family — 1 type

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 68 | `squad_founder` | Squad Founder | athlete created a squad (squads_founded_count ≥ 1) |

### Perfect Week Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 69 | `perfect_week_1` | First Perfect Week | perfect_weeks_count ≥ 1 — every current member of a squad checked in Trained on every day of a 7-day window |
| 70 | `perfect_week_10` | 10 Perfect Weeks | perfect_weeks_count ≥ 10 |
| 71 | `perfect_week_25` | 25 Perfect Weeks | perfect_weeks_count ≥ 25 |

### Squad Streak Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 72 | `squad_streak_7` | 7-Day Squad Streak | max_squad_streak ≥ 7 (Squad-System-Architecture-v1.0 SQ-D6) |
| 73 | `squad_streak_30` | 30-Day Squad Streak | max_squad_streak ≥ 30 |
| 74 | `squad_streak_100` | 100-Day Squad Streak | max_squad_streak ≥ 100 |

### Mission Complete Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 75 | `mission_complete_1` | First Mission Complete | missions_completed_count ≥ 1 |
| 76 | `mission_complete_10` | 10 Missions Complete | missions_completed_count ≥ 10 |
| 77 | `mission_complete_25` | 25 Missions Complete | missions_completed_count ≥ 25 |

### Team Player Family — 1 type

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 78 | `team_player` | Team Player | cumulative_checkins_logged ≥ 50 (across all squads) |

### Squad Workouts Family — 3 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 79 | `squad_workouts_100` | 100 Squad Workouts | squad cumulative workouts logged ≥ 100 |
| 80 | `squad_workouts_500` | 500 Squad Workouts | squad cumulative workouts logged ≥ 500 |
| 81 | `squad_workouts_1000` | 1,000 Squad Workouts | squad cumulative workouts logged ≥ 1,000 |

### Program Family — 1 type

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 82 | `everyone_finished_program` | Everyone Finished Program | every current squad member graduates the same program (snapshot at final graduation) |

---

## PRESTIGE — 8 Types *(v1.5, new — merged from Expansion Pass 6 Part B)*

**Architecture notes:**
- Trigger: new pipeline step `[4.5] RUN PRESTIGE EVALUATOR`, inserted between the existing `[4] RUN EVALUATORS` and `[5] CREATE HONORINSTANCES` steps. Runs after every other evaluator in the same Session Save transaction, reading both the athlete's full existing `HonorInstance` history and anything newly qualified within this same transaction — necessary because an athlete can complete a named combination in the very session that should trigger it. See `Honor-Evaluation-Service-Architecture-v1.0.md` §5, §9.5.
- Breadth Ladder denominator: the 7 solo-achievable categories — Strength, Training, Programs, Goals, Chapters, Longevity, Endurance. Partnership/Squad/Communities/Competition are excluded because their top tiers require another person's participation, not solo achievement.
- **No-Prestige-on-Prestige:** a Prestige honor is never itself counted toward another Prestige honor's qualification.
- One-time. Obeys AD-7 (no catalog visibility), AD-27 (no rank effect), AD-33 (dual dates).

### Breadth Ladder Family — 4 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 154 | `prestige_breadth_1` | Many Paths | Top-tier in ≥ 4 of 7 solo-achievable categories + `longevity_1_year` |
| 155 | `prestige_breadth_2` | A Wider Legacy | Top-tier in ≥ 5 of 7 + `longevity_3_years` |
| 156 | `prestige_breadth_3` | Almost Every Path | Top-tier in ≥ 6 of 7 + `longevity_5_years` |
| 157 | `prestige_breadth_4` | The Complete Legacy | Top-tier in all 7 of 7 + `longevity_10_years` |

### Named Combinations Family — 4 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 158 | `prestige_complete_lifter` | The Complete Lifter | `bench_milestone_4` AND `squat_milestone_4` AND `deadlift_milestone_4` + `longevity_3_years` |
| 159 | `prestige_three_disciplines` | Three Disciplines | `run_milestone_5` AND `bike_milestone_3` AND `swim_milestone_4` + `longevity_3_years` |
| 160 | `prestige_built_by_the_plan` | Built by the Plan | `program_family_mastery_3` AND (`club_1500` OR `club_600kg`) + `longevity_5_years` |
| 161 | `prestige_life_in_chapters` | A Life in Chapters | `chapters_sealed_25` AND `goals_achieved_50` + `longevity_5_years` |

Metadata: `{}` for the Breadth Ladder; Named Combinations need no extra metadata since each `honorType`'s constituent honors are fixed and narratable from the catalog definition itself.

---

## HIDDEN — 6 Types *(v1.5, new)*

**Architecture notes:**
- Trigger: Session Save. Every qualification below reads only data already available at the event being evaluated — its own timestamp, simple `accountCreationDate` calendar math, or the same-transaction set of qualifying honors the pipeline has already produced. **No new persistent statistic is introduced for any Hidden honor.**
- **Zero new schema.** L-10's existing rule that a category with zero earned honors is entirely absent (§5.4) already provides total invisibility-until-earned. No `isRevealed` field, no placeholder UI. Once earned, a Hidden honor displays exactly like any other honor.
- Qualification criteria for this category are never surfaced, hinted at, or documented anywhere discoverable by the athlete before they earn it — a binding authoring-standards rule, not a schema rule (`Honors-Authoring-Standards-v1.0.md`).
- One-time. Obeys AD-7 (no catalog visibility), AD-27 (no rank effect), AD-33 (dual dates).

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 162 | `hidden_early_forge` | Early Forge | Session logged with local start time before 6:00 AM |
| 163 | `hidden_midnight_forge` | Midnight Forge | Session logged with local start time between 12:00 AM and 3:00 AM |
| 164 | `hidden_new_years_forge` | New Year's Forge | Session logged on January 1 |
| 165 | `hidden_leap_day_forge` | Leap Day Forge | Session logged on February 29 |
| 166 | `hidden_full_circle` | Full Circle | Session logged on the account-creation month+day anniversary, in a year that does not also trigger a Longevity honor (not year 1, 3, 5, or 10) |
| 167 | `hidden_triple_threat` | Triple Threat | Honors from 3 different categories awarded within the same evaluation transaction (reuses ES-3's "award all qualifying honors together" rule) |

Metadata: `{}` for all six.

---

## DEFERRED TO V2 — Not Part of the V1 Catalog

The two Strength families below were fully designed during the V1 architecture pass and then **deferred to V2 by explicit PO decision** before final lock — not blocked by any missing data or architecture (unlike the Hiking/Rowing/Comebacks/Bodybuilding deferrals below, which are genuinely blocked). They are preserved here in full so a future V2 pass can pick them up without re-deriving the design.

**These honor types do not exist in the V1 catalog.** They carry no `#` index, are not evaluated by any V1 evaluator, and are not counted in the 167-type V1 manifest total. The two new optional Profile fields they depend on (`biologicalSex`, `bodyweightValue`) are correspondingly not part of V1 — `Profile-Wireframe-Spec-P1.md` ships unchanged at v1.3.

### Sex-Specific Milestones Family — 12 types (V2 candidate)

Same `honorType` regardless of which table applied — sex-adaptive, identical pattern to the existing lbs/kg-adaptive milestones (AD-31e). Would require `biologicalSex` declared; the athlete's declared value at earn time would be snapshotted in `metadata.biologicalSexAtEarn`.

**Female table:**

| honorType | Tier | Bench | Squat | Deadlift |
|---|---|---|---|---|
| `bench_sex_milestone_1` | 1 | 65 lbs / 30 kg | — | — |
| `bench_sex_milestone_2` | 2 | 95 lbs / 45 kg | — | — |
| `bench_sex_milestone_3` | 3 | 125 lbs / 55 kg | — | — |
| `bench_sex_milestone_4` | 4 | 175 lbs / 80 kg | — | — |
| `squat_sex_milestone_1` | 1 | — | 95 lbs / 45 kg | — |
| `squat_sex_milestone_2` | 2 | — | 135 lbs / 60 kg | — |
| `squat_sex_milestone_3` | 3 | — | 185 lbs / 85 kg | — |
| `squat_sex_milestone_4` | 4 | — | 245 lbs / 110 kg | — |
| `deadlift_sex_milestone_1` | 1 | — | — | 115 lbs / 55 kg |
| `deadlift_sex_milestone_2` | 2 | — | — | 165 lbs / 75 kg |
| `deadlift_sex_milestone_3` | 3 | — | — | 225 lbs / 100 kg |
| `deadlift_sex_milestone_4` | 4 | — | — | 295 lbs / 135 kg |

**Male table** (same 12 `honorType` IDs, different thresholds):

| honorType | Tier | Bench | Squat | Deadlift |
|---|---|---|---|---|
| `bench_sex_milestone_1` | 1 | 185 lbs / 85 kg | — | — |
| `bench_sex_milestone_2` | 2 | 245 lbs / 110 kg | — | — |
| `bench_sex_milestone_3` | 3 | 295 lbs / 135 kg | — | — |
| `bench_sex_milestone_4` | 4 | 345 lbs / 155 kg | — | — |
| `squat_sex_milestone_1` | 1 | — | 275 lbs / 125 kg | — |
| `squat_sex_milestone_2` | 2 | — | 345 lbs / 155 kg | — |
| `squat_sex_milestone_3` | 3 | — | 415 lbs / 185 kg | — |
| `squat_sex_milestone_4` | 4 | — | 465 lbs / 210 kg | — |
| `deadlift_sex_milestone_1` | 1 | — | — | 365 lbs / 165 kg |
| `deadlift_sex_milestone_2` | 2 | — | — | 435 lbs / 195 kg |
| `deadlift_sex_milestone_3` | 3 | — | — | 495 lbs / 230 kg |
| `deadlift_sex_milestone_4` | 4 | — | — | 565 lbs / 255 kg |

**Rationale (preserved from the V1 design pass):** every threshold above was checked against the universal ladder (Bench 135/225/315/405, Squat 225/315/405/500, Deadlift 315/405/500/600) and Club's thresholds for exact-value collisions — none found. The male table is deliberately not a copy of the universal ladder (which would award two honors for one PR); both tables are genuinely distinct, population-calibrated recognition axes, additive to the always-available universal path.

### Relative Strength Milestones Family — 12 types (V2 candidate)

Sex-neutral, bodyweight-ratio thresholds. Would require `bodyweightValue` declared; computed as `weight lifted ÷ currently declared bodyweight` at the moment of the qualifying session.

| honorType | Tier | Bench | Squat | Deadlift |
|---|---|---|---|---|
| `bench_relative_milestone_1` | 1 | 0.75× bodyweight | — | — |
| `bench_relative_milestone_2` | 2 | 1.0× bodyweight | — | — |
| `bench_relative_milestone_3` | 3 | 1.5× bodyweight | — | — |
| `bench_relative_milestone_4` | 4 | 2.0× bodyweight | — | — |
| `squat_relative_milestone_1` | 1 | — | 1.0× bodyweight | — |
| `squat_relative_milestone_2` | 2 | — | 1.5× bodyweight | — |
| `squat_relative_milestone_3` | 3 | — | 2.0× bodyweight | — |
| `squat_relative_milestone_4` | 4 | — | 2.5× bodyweight | — |
| `deadlift_relative_milestone_1` | 1 | — | — | 1.25× bodyweight |
| `deadlift_relative_milestone_2` | 2 | — | — | 1.75× bodyweight |
| `deadlift_relative_milestone_3` | 3 | — | — | 2.25× bodyweight |
| `deadlift_relative_milestone_4` | 4 | — | — | 3.0× bodyweight |

Metadata (if implemented): Sex-Specific would carry `weightDisplay`, `unitSystem`, `biologicalSexAtEarn`. Relative would carry `weightDisplay`, `bodyweightDisplay` (snapshotted), `ratioDisplay`, `unitSystem`.

### Other V1 Deferrals (genuinely blocked, not scope decisions)

See the Closure Record below for Hiking Endurance, Rowing Endurance, Comebacks & Resilience, and the Bodybuilding volume-PR family — each blocked by a missing statistic or enum value, not a PO scope decision.

---

## Architecture Decision Index

| Decision | Summary |
|----------|---------|
| AD-6 | Strength honors are MVP scope; specific lift families and thresholds locked |
| AD-7 | No catalog visibility or "hint" philosophy — catalog never surfaced to athlete |
| AD-8 | Retroactive evaluation applies to imported historical data |
| AD-27 | Honors do not contribute to rank |
| AD-28b | Qualifying movements defined by canonical exercise library (stable IDs) |
| AD-28c | Custom exercises excluded from honor evaluation |
| AD-29a | PR batch evaluation runs at session save |
| AD-29b | No minimum rep requirement for PR recognition |
| AD-30 | Actual weight only — no RPE, no estimated 1RM |
| AD-30a | Single honorType per lift; dual lbs/kg thresholds; display name snapshotted at earn time |
| AD-31a | Club totals use all-time PRs across all sessions |
| AD-31e | Club types are genuinely separate per unit system (lbs and kg clubs are parallel, not converted) |
| AD-33 | HonorInstance carries dual date fields: dateEarned (qualification date, displayed) and awardedAt (session save timestamp) |
| AD-40 | Trust model accepted for duration integrity — no idle detection or background exclusion |
| AD-42 | Partial sessions count toward Training metrics; discarded sessions count nothing |
| AD-V1-1 | Two-lineage reconciliation: the locked v1.4 catalog and six previously-unmerged Expansion Pass documents are reconciled in this single v1.5 pass; no future honor addition is left unmerged in a standalone pass document |
| AD-V1-2 | Sex-Specific Milestones and Relative Strength Milestones (both fully designed, § DEFERRED TO V2) are deferred to V2 by PO decision, not a technical blocker — the universal Bench/Squat/Deadlift ladder was unaffected by their design and remains the only Strength-milestone path in V1. No Profile field changes ship in V1 as a result. |
| AD-V1-5 | Endurance merges for Running/Walking/Cycling/Swimming because those activity types are loggable today — independent of declared Athlete Type |
| AD-V1-6 | Prestige runs at pipeline step [4.5]; reading HonorInstance history at this step is not a violation of ES §9.5's source-record invariant |
| AD-V1-7 | `cumulativeActiveWeeks` is mirrored into the Athlete Statistics Record, not cross-read from RCM — preserves the Evaluation Service's existing read-only-precomputed-state rule |
| AD-V1-8 | Hidden Honors require zero new schema — L-10's existing zero-count-is-invisible rule (§5.4) is sufficient |
| AD-V1-9 | Strength Club's future expansion path is absolute-tiers-only — no sex-specific or relative-strength Club variants, no new membership/prestige wrapper |
| AD-V1-10 | PR-record storage extends to five lifts — bench, squat, deadlift, overhead press, pull-up |
| AD-V1-11 | Bodybuilding volume-PR and Comebacks & Resilience honors are not invented — both remain written, honest deferrals pending future statistics architecture |

---

## Closure Record

### Final Catalog Counts

| Dimension | Count |
|-----------|-------|
| Total honor types | 167 |
| Categories | 13 |
| Families | 34 |
| One-time honors | 158 |
| Repeatable honors (per chapter) | 9 |

*(v1.1: +9 Competition types, +1 category, +3 families, +9 one-time honors. v1.3: +5 Communities types, +1 category, +1 family, +5 one-time honors; Community category relabeled Partnership, no count change. v1.4: +15 Squad types, +1 category, +7 families, +15 one-time honors. v1.5: +85 types (+8 Strength [Overhead Press, Pull-Up], +6 Chapters [incl. 5 newly repeatable: 1 Depth extension + 4 new Duration family, repeatable per chapter], +11 Training, +2 Goals, +3 Programs, +3 Longevity, +38 new Endurance category, +8 new Prestige category, +6 new Hidden category), +3 categories, +9 families. v1.0 baseline: 53 / 7 / 11 / 49 / 4. Deferred, not counted in the 167: 24 honors by PO scope decision (Sex-Specific Strength Milestones, Relative Strength Milestones — fully designed, see § DEFERRED TO V2) plus 18 honors genuinely blocked — Hiking Endurance (9), Rowing Endurance (9) — plus 0 honors each for Comebacks & Resilience and a Bodybuilding volume-PR family, both explicitly written deferrals with no placeholder logic invented; see `Honors-Architecture-V1-Final-v1.0.md` §9.)*

### Consistency Pass Results

- **Duplicate check:** All 167 `honorType` IDs unique — the 85 new IDs introduced at v1.5 were checked against the existing 82 and against each other. No duplicates.
- **Threshold conflicts:** None. Coincidental weight overlaps across different movements (e.g., `bench_milestone_2`/`squat_milestone_1` at 225 lbs) are not conflicts, per the original precedent.
- **Category/family conflicts:** None. Each honor belongs to exactly one category and one family. **The family-count arithmetic error first found at v1.0/v1.2.1 (Honors-Taxonomy-Reconciliation-v1.0.md Finding T1) recurred at v1.4 (header claimed 22, table summed to 25) and is corrected here** — see the header note above. Endurance, Prestige, and Hidden are wholly new categories with no naming overlap against the existing 10. Consistency's 5 honors live inside the existing Training category by design, not a new category.
- **AD-33 compliance:** All 167 types carry both `dateEarned` and `awardedAt`. Longevity `dateEarned` = anniversary date.

### Result

**MVP Honor Catalog — LOCKED**

No contradictions found. Catalog reconciled across both previously-parallel lineages and is ready for the next phase: full L-11 descriptive content authoring for the 85 new honor types, governed by `Honors-Authoring-Standards-v1.0.md`.

---

## Open Items (Deferred to Next Workstream)

- Full `HonorInstance` schema specification (field definitions, types, nullable fields, metadata spec per honor type)
- Evaluation service trigger mapping (concrete implementation per trigger event)
- L-11 description generation service (template resolution at render time)

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.5 | June 2026 | `Honors-Architecture-V1-Final-v1.0.md` (LOCKED) reconciled. Merged the previously-unmerged Expansion Passes 1–6: **Strength** +8 (Overhead Press 4, Pull-Up 4); **Chapters** +6 (Count +1, Depth +1, new Duration family +4); **Training** +11 (Workout Count +4, Hours Forged +2, new Consistency family +5); **Goals** +2; **Programs** +3 (Graduation Volume +1, new Family Mastery family +2); **Longevity** +3; new **Endurance** category +38 (Running/Walking/Cycling/Swimming only — Hiking/Rowing explicitly deferred pending an `ActivityType` enum amendment); new **Prestige** category +8 (Breadth Ladder 4, Named Combinations 4 — requires new pipeline step [4.5], see `Honor-Evaluation-Service-Architecture-v1.0.md`); new **Hidden** category +6 (zero new schema — uses only existing/derivable Session Save data). Two new Strength families designed this pass — **Sex-Specific Milestones (12)** and **Relative Strength Milestones (12)** — were **deferred to V2 by PO decision** before final lock; full design preserved in § DEFERRED TO V2 for future use; the two Profile fields they would have required do not ship in V1. Corrected a recurring family-count arithmetic error (header claimed 22, table summed to 25 at v1.4; corrected baseline 25 → 34 after this pass's additions). Separately, genuinely (not by choice) deferred: Hiking Endurance (9), Rowing Endurance (9), Comebacks & Resilience (0, no statistic exists), Bodybuilding volume-PR family (0, no statistic exists) — no placeholder logic invented for either. Totals: 167 types / 13 categories / 34 families / 158 one-time / 9 repeatable. Architecture/schema only — no L-11 descriptive content authored for any new honor type. |
| v1.4 | June 2026 | `Squad-System-Architecture-v1.0` (LOCKED) SQ-D10 merged. **Added new `SQUAD` category** (15 types, types 68–82, 7 families: Founder 68, Perfect Week 69–71, Squad Streak 72–74, Mission Complete 75–77, Team Player 78, Squad Workouts 79–81, Program 82). Account-cumulative across all squads; squad-collective honors evaluated against the current roster, each qualifying member receives their own `HonorInstance` (no shared squad-owned record), consistent with the COMMUNITIES posture. No existing honor type changed. Totals: 82 types / 10 categories / 22 families / 78 one-time. |
| v1.3 | June 2026 | Honor-Catalog-Amendment-002-Community-Honors merged. **Found and resolved a category-name collision** discovered during Communities reconciliation: the existing `COMMUNITY` category (Workout-With-Friend honors, types 47–49) is **relabeled `PARTNERSHIP`** — label only, no `honorType`/threshold/qualification change. **Added new `COMMUNITIES` category** (5 types, 63–67: First Community Joined, Community Builder, Helpful Contributor, Mentor, Event Organizer) per `Community-System-Architecture-v1.0` COM-D11 — account-based, one-time, no community leaderboard; three thresholds flagged provisional. Extended the COMPETITION category's architecture note to credit the new `COMMUNITY` challenge context (Challenge-Architecture-Amendment-004) toward Wins/Participation, with Participation Streak remaining SQUAD-only — no new Competition honor types. Totals: 67 types / 9 categories / 15 families / 63 one-time. |
| v1.2.1 | June 2026 | Reconciliation pass for `Social-System-Architecture-v1.0`. Added a milestone-post reconciliation note (earned Honor → optional automatic milestone Post, gated by Automatically-Share-Milestones; honors stay account-based; no type/schema change; posting never affects evaluation, SOC-D13). No honor type changed. |
| v1.2 | June 2026 | COMPETITION reconciled to participant-based challenges per Challenge-Architecture-Amendment-003 v1.1 (Wins/Participation credit SQUAD + FRIENDS; Participation Streak stays SQUAD-context). No schema change; no honor type added/removed. |
| v1.1 | June 2026 | Added COMPETITION category (9 types, 3 families: Wins 54–56, Participation 57–59, Participation Streak 60–62) per Honor-Catalog-Amendment-001 (LOCKED). Totals: 62 types / 8 categories / 14 families / 58 one-time. No existing honor changed; no rank effect (AD-27); no catalog visibility (AD-7). |
| v1.0 | June 2026 | Initial lock. 53 honor types across 7 categories and 11 families. |

---

*Honor Catalog — MVP v1.5 — LOCKED*
*Forge Legacy | June 2026*
