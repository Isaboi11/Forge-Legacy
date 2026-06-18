# Honor Catalog — MVP
## v1.0 — LOCKED | June 2026

**Status:** LOCKED
**Authority:** L-10 Honors Hub Spec, L-11 Honor Detail Sheet Spec, M-2 Honor Earned Modal Spec, Master PRD § 13, Product DNA

---

## MVP Honor Catalog — LOCKED

**53 honor types. 7 categories. 11 families.**

No honor types may be added, removed, or modified without a formal architecture amendment.

---

## Category Summary

| Category | Types | Families |
|----------|-------|---------|
| Strength | 18 | Bench (4), Squat (4), Deadlift (4), Clubs lbs (3), Clubs kg (3) |
| Chapters | 8 | Count (4), Depth (4) |
| Training | 12 | Origin (1), Workout Count (5), Hours Forged (6) |
| Goals | 4 | Goals (4) |
| Programs | 4 | Programs (4) |
| Community | 3 | Community (3) |
| Longevity | 4 | Longevity (4) |
| **Total** | **53** | **11** |

---

## STRENGTH — 18 Types

**Architecture notes:**
- Unit-adaptive: single `honorType` ID, dual lbs/kg thresholds. Display name snapshotted at earn time (AD-30a).
- Club types are genuinely separate per unit system — not unit-adaptive. lbs and kg club totals do not map to each other (AD-31e).
- Trigger: Session Save → PR Evaluation
- Qualification: actual weight only — no RPE, no estimated 1RM (AD-30)
- Qualifying movements: canonical exercise library only; custom exercises excluded (AD-28b, AD-28c)
- PR batch evaluation at session save; no minimum rep requirement (AD-29a, AD-29b)
- Club totals use all-time PRs across all sessions (AD-31a)

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

---

## CHAPTERS — 8 Types

**Architecture notes:**
- Count family (19–22): Trigger = Chapter Seal Event. One-time.
- Depth family (23–26): Trigger = Session Save → chapter session count check. **Repeatable per chapter.** Unique key: `honorType + chapterId`.

### Count Family — 4 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 19 | `first_chapter_sealed` | First Chapter Sealed | chapters_sealed_count ≥ 1 |
| 20 | `chapters_sealed_5` | 5 Chapters Sealed | chapters_sealed_count ≥ 5 |
| 21 | `chapters_sealed_10` | 10 Chapters Sealed | chapters_sealed_count ≥ 10 |
| 22 | `chapters_sealed_25` | 25 Chapters Sealed | chapters_sealed_count ≥ 25 |

### Depth Family — 4 types (repeatable per chapter)

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 23 | `workouts_in_chapter_10` | 10 Workouts in a Chapter | session_count_in_chapter ≥ 10 |
| 24 | `workouts_in_chapter_25` | 25 Workouts in a Chapter | session_count_in_chapter ≥ 25 |
| 25 | `workouts_in_chapter_50` | 50 Workouts in a Chapter | session_count_in_chapter ≥ 50 |
| 26 | `workouts_in_chapter_100` | 100 Workouts in a Chapter | session_count_in_chapter ≥ 100 |

---

## TRAINING — 12 Types

**Architecture notes:**
- Trigger: Session Save → AthleteTrainingStats update → evaluation
- Partial sessions (Save & Exit) count toward all Training metrics (AD-42)
- Discarded sessions count nothing (AD-42)
- Hours Forged: session timer runs from screen entry to Save confirmation, including backgrounded and device-locked time (AD-40 trust model)

### Origin Family — 1 type

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 27 | `first_workout_logged` | First Workout Logged | total_sessions ≥ 1 |

### Workout Count Family — 5 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 28 | `workouts_logged_50` | 50 Workouts Logged | total_sessions ≥ 50 |
| 29 | `workouts_logged_100` | 100 Workouts Logged | total_sessions ≥ 100 |
| 30 | `workouts_logged_250` | 250 Workouts Logged | total_sessions ≥ 250 |
| 31 | `workouts_logged_500` | 500 Workouts Logged | total_sessions ≥ 500 |
| 32 | `workouts_logged_1000` | 1,000 Workouts Logged | total_sessions ≥ 1,000 |

### Hours Forged Family — 6 types

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 33 | `hours_forged_100` | 100 Hours Forged | cumulative_session_hours ≥ 100 |
| 34 | `hours_forged_250` | 250 Hours Forged | cumulative_session_hours ≥ 250 |
| 35 | `hours_forged_500` | 500 Hours Forged | cumulative_session_hours ≥ 500 |
| 36 | `hours_forged_1000` | 1,000 Hours Forged | cumulative_session_hours ≥ 1,000 |
| 37 | `hours_forged_2500` | 2,500 Hours Forged | cumulative_session_hours ≥ 2,500 |
| 38 | `hours_forged_5000` | 5,000 Hours Forged | cumulative_session_hours ≥ 5,000 |

---

## GOALS — 4 Types

**Architecture notes:**
- Trigger: Goal Completion Event
- One-time

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 39 | `first_goal_achieved` | First Goal Achieved | goals_achieved_count ≥ 1 |
| 40 | `goals_achieved_10` | 10 Goals Achieved | goals_achieved_count ≥ 10 |
| 41 | `goals_achieved_25` | 25 Goals Achieved | goals_achieved_count ≥ 25 |
| 42 | `goals_achieved_50` | 50 Goals Achieved | goals_achieved_count ≥ 50 |

---

## PROGRAMS — 4 Types

**Architecture notes:**
- Trigger: Program Graduation Event
- One-time

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 43 | `first_program_graduated` | First Program Graduated | programs_graduated_count ≥ 1 |
| 44 | `programs_graduated_5` | 5 Programs Graduated | programs_graduated_count ≥ 5 |
| 45 | `programs_graduated_10` | 10 Programs Graduated | programs_graduated_count ≥ 10 |
| 46 | `programs_graduated_25` | 25 Programs Graduated | programs_graduated_count ≥ 25 |

---

## COMMUNITY — 3 Types

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

## LONGEVITY — 4 Types

**Architecture notes:**
- Trigger: Session Save → Anniversary Check
- `dateEarned` = account anniversary date (NOT session save date) — AD-33
- Qualification evaluated against `account_creation_date`
- One-time

| # | honorType | Display Name | Qualification |
|---|-----------|-------------|---------------|
| 50 | `longevity_1_year` | 1 Year Forging | account_creation_date + 365 days ≤ current_date |
| 51 | `longevity_3_years` | 3 Years Forging | account_creation_date + 1,095 days ≤ current_date |
| 52 | `longevity_5_years` | 5 Years Forging | account_creation_date + 1,825 days ≤ current_date |
| 53 | `longevity_10_years` | 10 Years Forging | account_creation_date + 3,650 days ≤ current_date |

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

---

## Closure Record

### Final Catalog Counts

| Dimension | Count |
|-----------|-------|
| Total honor types | 53 |
| Categories | 7 |
| Families | 11 |
| One-time honors | 49 |
| Repeatable honors (per chapter) | 4 |

### Consistency Pass Results

- **Duplicate check:** All 53 `honorType` IDs unique. No duplicates.
- **Threshold conflicts:** None. Coincidental weight overlaps (e.g., bench_milestone_2 and squat_milestone_1 both at 225 lbs) are different movements — not conflicts.
- **Category/family conflicts:** None. Each honor belongs to exactly one category and one family.
- **AD-33 compliance:** All 53 types carry both `dateEarned` and `awardedAt`. Longevity `dateEarned` = anniversary date.

### Result

**MVP Honor Catalog — LOCKED**

No contradictions found. Catalog is clean and ready for HonorInstance schema finalization.

---

## Open Items (Deferred to Next Workstream)

- Full `HonorInstance` schema specification (field definitions, types, nullable fields, metadata spec per honor type)
- Evaluation service trigger mapping (concrete implementation per trigger event)
- L-11 description generation service (template resolution at render time)

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial lock. 53 honor types across 7 categories and 11 families. |

---

*Honor Catalog — MVP v1.0 — LOCKED*
*Forge Legacy | June 2026*
