# Honors Catalog — Expansion Pass 1

## v1.0 | June 2026

**Status:** AUTHORED CONTENT — DRAFT. Not a formal architecture amendment. Not yet applied to `Honor-Catalog-v1.0-LOCKED.md`. This document is staged content for a future amendment-authoring pass.

**Type:** Catalog Authoring Document

**Predecessor:** `Honors-Expansion-Plan-v1.0.md` → `Honors-Expansion-Plan-Pre-Authoring-Audit.md` → `Honors-Taxonomy-Reconciliation-v1.0.md`

**Scope discipline:** This pass authors honors **only** within the families the Reconciliation classified "Ready for immediate authoring": Strength (Overhead Press, Pull-Up), Training (Workout Count, Hours Forged), Programs (Graduation Volume, Family Mastery), Goals (Goal Volume), Chapters (Sealing, Duration), and Longevity. No honor is authored in any family classified "Requires Clarification," "Future Architecture Dependent," or "Eliminated." All 53 existing honors are preserved unmodified. No architecture document is redesigned. No amendment is drafted.

---

## Section 1 — Existing Catalog Preservation

| Category | Existing Count | Proposed Additions (this pass) | New Total |
|----------|----------------|----------------------------------|-----------|
| Strength | 18 | +8 | 26 |
| Chapters | 8 | +4 | 12 |
| Training | 12 | +5 | 17 |
| Goals | 4 | +2 | 6 |
| Programs | 4 | +3 | 7 |
| Community | 3 | +0 (not approved this pass) | 3 |
| Longevity | 4 | +3 | 7 |
| **Total** | **53** | **+25** | **78** |

No existing `honorType`, `displayName`, qualification rule, or metadata shape is changed anywhere in this document. Every addition is a new row appended to an existing catalog family or a new family nested inside an existing category — never a modification of a locked one.

---

## Section 2 — Longevity Expansion

**Requirements check:** multi-year journey support (✓ — extends to 20 years), meaningful spacing (✓ — ratios below), no impossible thresholds (✓ — pure calendar-time, always reachable by any athlete who keeps an account open that long), decades-level support (✓).

| # | honorType | Display Name | Qualification | Rationale |
|---|-----------|--------------|----------------|-----------|
| 54 | `longevity_90_days` | 90 Days Forging | `account_creation_date + 90 days ≤ current_date` | Fills the one real gap in the existing ladder — today an athlete has no Longevity-category recognition between account creation and the 1-year mark. 90 days is a culturally meaningful "first quarter" commitment threshold, not a trivial one (unlike 30 days, which risks reading as filler). |
| 55 | `longevity_15_years` | 15 Years Forging | `account_creation_date + 5,475 days ≤ current_date` | Extends the existing 1→3→5→10 ladder one smooth step further (10→15 = 1.5×, matching the deceleration pattern already present at 5→10 = 2×). Directly serves the "decades" requirement. |
| 56 | `longevity_20_years` | 20 Years Forging | `account_creation_date + 7,300 days ≤ current_date` | The new ceiling. 15→20 = 1.33×, continuing the existing ratio-deceleration shape. A 20-year account is the longest horizon any Forge Legacy honor currently reaches toward — appropriately rare without being unreachable. |

**Metadata:** `{}` for all three — identical to the existing Longevity family pattern (self-contained templates, no type-specific context required). `dateEarned` = computed anniversary date, exactly per AD-33/ES-10, unchanged.

**Evaluator impact:** None beyond adding three more threshold comparisons to the existing `LongevityEvaluator` loop — the evaluator already iterates "for each longevity threshold" generically (ES §4.8). No new trigger, no new data source.

---

## Section 3 — Training Expansion

### 3A. Workout Count

| # | honorType | Display Name | Qualification | Rationale |
|---|-----------|--------------|----------------|-----------|
| 57 | `workouts_logged_25` | 25 Workouts Logged | `total_sessions ≥ 25` | The existing ladder jumps from `first_workout_logged` (1) straight to 50 — a 50× gap, far larger than every other step in the entire Training family (all of which are 2–2.5×). This is the one genuine "obvious gap" in Training; 25 smooths it without adding a trivial low-effort milestone. |
| 58 | `workouts_logged_1500` | 1,500 Workouts Logged | `total_sessions ≥ 1,500` | Extends the ladder past its current 1,000 ceiling. 1,000→1,500 = 1.5×, consistent with the deceleration already present at 500→1,000 = 2×. Reachable in roughly 8–12 years at 3–4 sessions/week — squarely within the decades-long design horizon. |
| 59 | `workouts_logged_2500` | 2,500 Workouts Logged | `total_sessions ≥ 2,500` | New ceiling. 1,500→2,500 = 1.67×. A genuinely rare, multi-decade marker for the most dedicated long-tenured athletes, without requiring an implausible pace. |

### 3B. Hours Forged

| # | honorType | Display Name | Qualification | Rationale |
|---|-----------|--------------|----------------|-----------|
| 60 | `hours_forged_7500` | 7,500 Hours Forged | `cumulative_session_hours ≥ 7,500` | Extends past the current 5,000 ceiling. 5,000→7,500 = 1.5×, matching the deceleration shape already present in the upper half of the ladder (1,000→2,500 = 2.5×, 2,500→5,000 = 2×). |
| 61 | `hours_forged_10000` | 10,000 Hours Forged | `cumulative_session_hours ≥ 10,000` | New ceiling. "10,000 hours" carries genuine cultural weight as a mastery benchmark — a meaningful, non-arbitrary number rather than a manufactured round figure. Reachable over 15–20 years for a serious long-term athlete; not reachable casually, which is the correct property for a top-tier honor. |

**Metadata:** `{}` for all five — identical to the existing Training family pattern.

**Evaluator impact:** None. `TrainingEvaluator` already evaluates "for each honor in the workout count family" / "for each honor in the hours forged family" generically against `workoutCount` / `hoursForged` (ES §4.1) — adding thresholds requires no logic change.

---

## Section 4 — Strength Expansion

**Requirements check:** matches existing strength-honor philosophy (unit-adaptive, dual lbs/kg thresholds, actual-weight-only qualification per AD-30, canonical-exercise-only per AD-28b/c), meaningful milestones only, no novelty achievements.

**Scope note (transparency, not a blocker):** Overhead Press and Pull-Up already exist as canonical exercises (`Exercise-Library-Architecture-v1.0.md` §3.3, under `PUSH` and `PULL` respectively). PR-record storage today covers exactly three lifts (`Honor-Evaluation-Service-Architecture-v1.0.md` §9.2); this pass's content assumes two more PR slots of the same shape are added as a content-driven extension of an already-generic pattern — not a redesign of the evaluator's logic, which already reads generically as "for each lift family, compare the athlete's current PR against each threshold" (ES §4.2). This is named here for transparency, consistent with how the Reconciliation classified it ("implementation detail, not a taxonomy blocker").

**Club totals are explicitly NOT modified.** Whether Club expands from 3 lifts to 5 was flagged "Requires Clarification — do not infer" and remains untouched this pass, per rule 8.

### 4A. Overhead Press

| # | honorType | Display Name (lbs) | Display Name (kg) | Qualification |
|---|-----------|--------------------|--------------------|--------------|
| 62 | `overhead_press_milestone_1` | Overhead Press 95 | Overhead Press 40kg | OHP PR ≥ 95 lbs or ≥ 40 kg |
| 63 | `overhead_press_milestone_2` | Overhead Press 135 | Overhead Press 60kg | OHP PR ≥ 135 lbs or ≥ 60 kg |
| 64 | `overhead_press_milestone_3` | Overhead Press 185 | Overhead Press 80kg | OHP PR ≥ 185 lbs or ≥ 80 kg |
| 65 | `overhead_press_milestone_4` | Overhead Press 225 | Overhead Press 100kg | OHP PR ≥ 225 lbs or ≥ 100 kg |

**Rationale:** Thresholds chosen to mirror the existing Bench ladder's decreasing-ratio shape (95→135 = 1.42×, 135→185 = 1.37×, 185→225 = 1.22×; compare Bench's 135→225 = 1.67×, 225→315 = 1.4×, 315→405 = 1.29×). 225 lbs OHP is a genuinely elite, rare achievement — appropriate as a top rung, not a novelty number. Both lbs and kg figures are independently round, matching the existing convention of "clean numbers in both systems" rather than strict unit conversion.

### 4B. Pull-Up (Weighted)

| # | honorType | Display Name (lbs) | Display Name (kg) | Qualification |
|---|-----------|--------------------|--------------------|--------------|
| 66 | `pull_up_milestone_1` | Weighted Pull-Up +25 | Weighted Pull-Up +10kg | Weighted Pull-Up added-weight PR ≥ 25 lbs or ≥ 10 kg |
| 67 | `pull_up_milestone_2` | Weighted Pull-Up +50 | Weighted Pull-Up +20kg | Added-weight PR ≥ 50 lbs or ≥ 20 kg |
| 68 | `pull_up_milestone_3` | Weighted Pull-Up +75 | Weighted Pull-Up +35kg | Added-weight PR ≥ 75 lbs or ≥ 35 kg |
| 69 | `pull_up_milestone_4` | Weighted Pull-Up +100 | Weighted Pull-Up +45kg | Added-weight PR ≥ 100 lbs or ≥ 45 kg |

**Rationale:** Pull-Up has no natural "load on a bar" the way Bench/Squat/Deadlift/OHP do — a bodyweight pull-up has no weight value to threshold against, and a rep-count ladder would break AD-30's "actual weight only, no estimated 1RM" qualification philosophy (rep-max formulas are exactly what AD-30 excludes for the existing lifts). Defining the qualifying metric as **added weight** (a weighted vest/belt/dip-belt load on top of bodyweight) preserves the identical "actual weight only" mechanic used everywhere else in Strength, reuses the same PR-record/threshold-comparison pattern, and avoids inventing a new qualification model. **Verification item, not a blocker:** whether the Exercise Library logs a discrete "added weight" field for Pull-Up sets the same way it logs barbell load for Bench/Squat/Deadlift should be confirmed at implementation time — this was not independently re-verified this pass, in line with Rule 2's scope of "Honors documents," and is named here rather than silently assumed.

**Metadata for all 8 (4A + 4B):** `weightDisplay`, `unitSystem` — identical shape to the existing Bench/Squat/Deadlift milestone metadata (`HonorInstance-Architecture-v1.0.md` §4.1).

---

## Section 5 — Programs Expansion

### 5A. Graduation Volume

| # | honorType | Display Name | Qualification | Rationale |
|---|-----------|--------------|----------------|-----------|
| 70 | `programs_graduated_50` | 50 Programs Graduated | `programs_graduated_count ≥ 50` | Extends the existing 1→5→10→25 ladder one smooth step further (25→50 = 2×, matching the existing 10→25 = 2.5× and earlier 5→10 = 2× steps). Supports a multi-decade structured-training career without inventing an intermediate rung the existing ladder doesn't already imply. |

### 5B. Program Family Mastery (new catalog family, same evaluator)

| # | honorType | Display Name | Qualification | Rationale |
|---|-----------|--------------|----------------|-----------|
| 71 | `program_family_mastery_1` | Program Family Mastery | Athlete has graduated every program within a single successor lineage (a chain of programs linked via `successorProgramId`, per the locked Program Ecosystem Architecture), for the first time across their legacy | This is a genuinely new accomplishment shape — not "graduated N programs" but "graduated an entire structured lineage, start to finish." It rewards depth of commitment to one training path, distinct from breadth (which `programs_graduated_N` already covers). Defined generically (no specific lineage name hardcoded) so it remains valid as the Program Catalog grows. |
| 72 | `program_family_mastery_3` | Three Lineages Mastered | Athlete has fully mastered (graduated every program within) 3 distinct successor lineages across their legacy | A second rung for the same accomplishment shape, scaled to long-term progression. Capped at 3 rather than reaching for 5+ — the current Program Catalog's lineage depth (per the locked Program Catalog/Ecosystem Architecture) does not yet clearly support a 5-lineage ceiling without risking an impossible threshold; 3 is a defensible, reachable "decades" marker without overreaching into unverified catalog depth. |

**Metadata:** `lineageId` (optional navigation), `lineageName` (snapshotted) — same ID+name snapshot pattern already used for `first_program_graduated`'s `programId`/`programName` (`HonorInstance-Architecture-v1.0.md` §4.1).

**No redundancy with existing program honors:** An athlete completing the final program in a lineage will, in the same transaction, also likely cross a `programs_graduated_N` threshold. This is not a duplicate reward — it is the existing, intended "award all qualifying honors, no suppression" behavior (`Honor-Evaluation-Service-Architecture-v1.0.md` ES-3), the same mechanism that already lets a single session trigger multiple Training/Strength honors at once.

**Evaluator impact:** None new — both items run under the existing `ProgramEvaluator`, triggered by the existing Program Graduation event. Family Mastery's qualification logic is a lineage-completion check rather than a raw counter comparison, but it consumes the same already-locked `successorProgramId` data and the same trigger; no new trigger source is introduced.

---

## Section 6 — Goals Expansion

| # | honorType | Display Name | Qualification | Rationale |
|---|-----------|--------------|----------------|-----------|
| 73 | `goals_achieved_5` | 5 Goals Achieved | `goals_achieved_count ≥ 5` | The existing ladder jumps from `first_goal_achieved` (1) to 10 — a 10× gap, the largest in the Goals family by far (10→25 = 2.5×, 25→50 = 2×). 5 smooths this without trivializing the early-game experience. |
| 74 | `goals_achieved_100` | 100 Goals Achieved | `goals_achieved_count ≥ 100` | New ceiling. 50→100 = 2×, consistent with the existing ladder's shape. A goal-driven athlete setting and completing several goals per year over a decade-plus reaches this range; it is not a trivial milestone. |

**Metadata:** `{}` for both — identical to the existing Goals volume-milestone pattern (`goals_achieved_10/25/50`).

**Evaluator impact:** None. `GoalEvaluator` already checks "if `goalsAchieved` has crossed each threshold" generically (ES §4.4).

---

## Section 7 — Chapters Expansion

**Scope exception, named rather than silently dropped:** the brief asked for Creation, Completion, Sealing, and Duration. **"Chapter Creation" is not authored this pass.** Reasoning: every chapter that is ever sealed was, by definition, also created — counting "chapters created" would either (a) require an entirely new trigger source (Chapter Creation/Start), which today's Evaluation Service does not have (`Honor-Evaluation-Service-Architecture-v1.0.md` §3.1's trigger list has no chapter-creation event) and which this pass is forbidden from adding, or (b) be computed at seal time, in which case it is mathematically identical to the existing/extended Sealing ladder and would be a pure duplicate reward — exactly what Rule 9 forbids. Authoring it would require either a new architecture surface or a manufactured duplicate; neither is acceptable, so it is omitted with this explanation rather than forced. **"Chapter Completion" is treated as the same concept as "Chapter Sealing"** — Forge Legacy's locked terminology (per the Critical Decisions Amendment) uses "Seal Chapter" as the one completion event; there is no separate completion concept in the locked product vocabulary. The Sealing ladder below covers both.

### 7A. Sealing (extends existing Count family)

| # | honorType | Display Name | Qualification | Rationale |
|---|-----------|--------------|----------------|-----------|
| 75 | `chapters_sealed_50` | 50 Chapters Sealed | `chapters_sealed_count ≥ 50` | Extends the existing 1→5→10→25 ladder (25→50 = 2×, matching the existing 10→25 = 2.5× step). **Pacing caveat, stated plainly:** reaching 50 within a 10–15 year horizon implies an average chapter length of a few months — shorter than the "real period of life" framing chapters carry elsewhere in the product. This rung is intended as a genuine multi-decade legacy-tier ceiling for athletes who chapter at a brisk, deliberate pace over a long career, not a near-term target. It is reachable, not impossible, but it is the rarest rung in the Chapters category by design. |

### 7B. Duration (new catalog family, same evaluator and trigger)

| # | honorType | Display Name | Qualification | Rationale |
|---|-----------|--------------|----------------|-----------|
| 76 | `chapter_duration_6_months` | Half a Year, One Chapter | Chapter's sealed-minus-started elapsed time ≥ 182 days | Rewards sustained calendar commitment to a single life period, distinct from the existing Depth family (which counts *workouts within* a chapter, not *calendar time*). A genuinely different dimension of chapter depth — duration without volume is its own meaningful story (e.g., a chapter built around consistency rather than frequency). |
| 77 | `chapter_duration_1_year` | A Full Year, One Chapter | Elapsed time ≥ 365 days | One full year inside a single named period of life — a strong, unambiguous milestone. |
| 78 | `chapter_duration_2_years` | Two Years, One Chapter | Elapsed time ≥ 730 days | New ceiling. A chapter spanning two full years represents one of the longest single "periods of life" the product's chapter model is designed to hold — rare, meaningful, not impossible. |

**Repeatability:** Like the existing Depth family, these are repeatable per chapter — an athlete can earn `chapter_duration_1_year` again in a different chapter later in their legacy. Uniqueness key: `(athleteId, honorType, chapterId)`, identical pattern to `workouts_in_chapter_N` (AD-55).

**Metadata:** `chapterName`, snapshotted — identical pattern to the existing Count and Depth families (AD-56: "always snapshotted when `chapterId` is set"). `chapters_sealed_50` also carries `chapterName` for the same reason, consistent with all four existing Count-family types.

**Evaluator impact:** Both sub-items run under the existing `ChapterEvaluator` and existing Chapter Seal trigger. Duration requires no new trigger — elapsed time is computed from the chapter's own start and seal timestamps at the moment it is already being sealed, the same moment the Count family already evaluates. No new data source beyond what the Chapter Seal event already provides.

---

## Section 8 — Duplicate Review

### 8.1 ID Collision Check

All 25 new `honorType` values were checked against the existing 53 and against each other. **Zero collisions.** No new `honorType` reuses an existing identifier, and no two new identifiers collide with each other.

### 8.2 Threshold Coincidence Check

| Coincidence | Honors involved | Verdict |
|-------------|------------------|---------|
| 225 lbs appears three times | `squat_milestone_1` (existing), `bench_milestone_2` (existing), `overhead_press_milestone_4` (new) | **Not a conflict.** The existing catalog's own Closure Record already established the precedent: coincidental weight overlaps across different movements are not conflicts (`bench_milestone_2` and `squat_milestone_1` already share 225 lbs today). The new OHP honor follows the identical, already-accepted pattern. |
| No other numeric coincidences | — | Checked across all new lbs/kg, session-count, hour, and day thresholds. None collide with an existing or newly-proposed threshold within the same family. |

### 8.3 Category / Family Placement Check

Every new honor belongs to exactly one category and exactly one catalog family — no honor spans two, matching the existing rule (`Honor-Catalog-v1.0-LOCKED.md` Closure Record: "Each honor belongs to exactly one category and one family").

### 8.4 Meaning-Conflict Check

| Pair checked | Verdict |
|--------------|---------|
| `chapter_duration_*` vs. `workouts_in_chapter_*` (existing Depth family) | **Distinct dimensions, not a duplicate.** Duration measures calendar time elapsed in a chapter; Depth measures session count within a chapter. An athlete could earn one without the other (a low-frequency, long-duration chapter; or a short, intense, high-session-count chapter). |
| `chapter_duration_*` vs. Longevity family | **Distinct scope, not a duplicate.** Longevity measures account-wide elapsed time (one continuous clock); chapter duration measures a single chapter's lifespan (repeatable, per-chapter, can reset with each new chapter). |
| `program_family_mastery_*` vs. `programs_graduated_*` | **Distinct dimensions, not a duplicate** — see Section 5B. Volume counts individual program completions; Mastery counts completed lineages. Simultaneous qualification in the same transaction is expected, intended behavior (ES-3), not a duplicate reward. |
| `workouts_logged_25` vs. `first_workout_logged` | **No overlap.** 1 and 25 are distinct, non-overlapping thresholds; 25 fills the gap between them, it does not duplicate either endpoint. |
| New Pull-Up ladder vs. existing canonical "Pull-Up" exercise honors | **None exist today** — there is no existing Pull-Up-related honor of any kind in the locked 53, so no conflict is possible. |

### 8.5 Filler Check

Every new honor was tested against "does this represent a meaningful achievement an athlete would be proud to earn, distinct from padding an existing ladder for its own sake." Two candidate additions were considered and rejected during authoring specifically for failing this test: a sub-25 Workout Count rung (e.g., "10 workouts" — too easy, would cheapen the early-game moment `first_workout_logged` already owns) and a 30-day Longevity rung (rejected in favor of 90 days for the same reason). No rejected candidates are included in the tables above.

**Result: zero unresolved duplicates, overlaps, threshold conflicts, or meaning conflicts.**

---

## Section 9 — Catalog Summary

| Category | Before | Added | After |
|----------|--------|-------|-------|
| Strength | 18 | 8 | 26 |
| Chapters | 8 | 4 | 12 |
| Training | 12 | 5 | 17 |
| Goals | 4 | 2 | 6 |
| Programs | 4 | 3 | 7 |
| Community | 3 | 0 | 3 |
| Longevity | 4 | 3 | 7 |
| **Catalog Total** | **53** | **25** | **78** |

**New honors created this pass: 25.**

**Running catalog total: 78** (a 47% increase over the locked 53, achieved entirely within already-approved, architecture-compatible families).

**Explicitly not advanced this pass** (per Rule 8 — still Requires Clarification / Future Architecture Dependent / Eliminated, unchanged from the Reconciliation): Endurance & Conditioning, Community Expansion, Consistency, Comebacks & Resilience, Prestige, Reflection Writing, Milestones & Firsts, and the Club 3-lift-vs-5-lift scope decision. None of these were touched, inferred, or partially authored.

**Deferred to a future pass, named for transparency:** L-10/L-11 description and preview-line templates for all 25 new honors (the existing 53 each have hand-written `displayName`-adjacent copy per `Honors-Spec-L10.md` §8.2 and `Honor-Detail-Sheet-Spec-L11.md` §9.3 — this pass defines qualification and rationale, not athlete-facing description prose, consistent with this pass's brief). The formal architecture amendment to `Honor-Catalog-v1.0-LOCKED.md` that would actually apply this content is also deferred, per Rule 6.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial Expansion Pass 1. 25 new honors authored across Strength, Training, Programs, Goals, Chapters, and Longevity — all within families the Taxonomy Reconciliation classified "Ready for immediate authoring." Zero modifications to the existing 53. Zero architecture changes. Zero amendments drafted. One scope exception named explicitly (Chapter Creation, omitted with rationale rather than forced). |

---

*Honors Catalog — Expansion Pass 1 — v1.0 — DRAFT*
*Forge Legacy | June 2026*
