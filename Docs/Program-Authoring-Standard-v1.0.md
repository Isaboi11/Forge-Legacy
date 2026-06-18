# Forge Legacy — Program Authoring Standard
## Version 1.1 | June 2026

**Status:** LOCKED
**Authority:** Program-Catalog-Architecture-v1.0.md, Program-Ecosystem-Architecture-v1.0.md, ExercisePrescription-Amendment-001.md, Exercise-Library-Architecture-v1.0.md, FORGE_LEGACY_PRODUCT_DNA.md

---

## Section 1 — Purpose and Scope

### 1.1 What This Document Is

The Program Authoring Standard (PAS) is the internal rulebook governing how every Forge Legacy program is authored, validated, and imported. It is the sole operational authority between the locked architecture documents and the people who create the 25 launch programs.

Before any program is exported to CSV and submitted to the import pipeline, it must conform to this standard in full.

### 1.2 What This Document Is Not

- **Not the 25 programs.** No programs are authored here.
- **Not a schema definition.** The data model is locked in Program-Catalog-Architecture-v1.0.md and ExercisePrescription-Amendment-001.md. This document references those schemas; it does not redefine them.
- **Not the import tool specification.** The technical behavior of the Forge Admin Import Tool is defined in Program-Ecosystem-Architecture-v1.0.md §6.
- **Not a public document.** It is an internal content-team resource.
- **Not applicable to athlete-created or imported programs.** It applies to `source: 'FORGE'` programs only.

### 1.3 Why This Document Exists

The 25 launch programs will be authored by one or more content creators, potentially in parallel. Without a shared standard, programs will diverge in:

- Naming conventions
- Difficulty calibration across categories
- Workout structure and section use
- Exercise prescription style
- Progression model
- Warm-up and cooldown presence and depth
- Deload architecture
- Import format

A divergent catalog feels arbitrary to athletes. The PAS exists so that every Forge program feels like it belongs in the same system — authored by the same hand, governed by the same philosophy.

### 1.4 Audience

Content creators authoring the 25 Forge launch programs. Product reviewers approving programs before publish.

### 1.5 Authority Chain

This document operates within, and is subordinate to:

| Authority Document | Governs |
|--------------------|---------|
| Program-Catalog-Architecture-v1.0.md | Data model, taxonomy, content rules, catalog governance |
| Program-Ecosystem-Architecture-v1.0.md | Import pipeline, succession, catalog structure, 25-program names |
| ExercisePrescription-Amendment-001.md | ExercisePrescription schema, field semantics |
| Exercise-Library-Architecture-v1.0.md | ExerciseDefinition schema, equipment tags, environment tags |
| FORGE_LEGACY_PRODUCT_DNA.md | Brand, UX philosophy, prohibited patterns |

Where this document and an authority document conflict, the authority document governs.

---

## Section 2 — Locked Architecture Reference

This section consolidates the fields and rules an author touches during program authoring. It is a reference, not a substitute for the authority documents.

### 2.1 ProgramDefinition — Author-Facing Fields

| Field | Type | Required | Rule |
|-------|------|----------|------|
| `name` | string | Yes | Max 60 chars. Follow PAS-D1 naming pattern. |
| `version` | string | Yes | Always `v1.0` for new programs. |
| `category` | enum | Yes | Exactly one. See Section 3. |
| `level` | enum | Yes | `BEGINNER`, `INTERMEDIATE`, or `ADVANCED`. See Section 3. |
| `environment` | enum | Yes | `GYM`, `HOME`, `OUTDOOR`, or `MIXED`. See Section 3. |
| `goalAlignment` | TrainingGoal[] | Yes | 1–2 values. See Section 3. |
| `durationWeeks` | integer | Yes | Program length in weeks. |
| `workoutsPerWeek` | integer | Yes | Sessions per week (same every week, including deload weeks). |
| `totalWorkouts` | integer | Yes | **Must equal `durationWeeks × workoutsPerWeek` exactly. Import fails otherwise.** |
| `description` | string | Yes | 60–120 chars. One sentence. Follow PAS-D2. |
| `isFeatured` | boolean | Yes | `FALSE` for all programs except Strength Foundation I and Bodyweight Foundation. |
| `sortOrder` | integer | Yes | Use the locked sort order from Section 13. |
| `successorProgramName` | string | No | Exact canonical name of the next program. Blank for terminal programs. Resolves to `successorProgramId` at import. |

Fields set by the import tool (authors do not set these): `id`, `source` (always `FORGE`), `authorId` (always `null`), `publishedAt` (null at import; set by product team at publish), `createdAt`, `updatedAt`.

### 2.2 ProgramSlot — Author-Facing Fields

| Field | Type | Rule |
|-------|------|------|
| `slotIndex` | integer | 0-based. Authors number slots 1–N in the sheet; the import tool subtracts 1. |
| `weekNumber` | integer | 1-based. All slots in the same training week share the same `weekNumber`. |
| `slotName` | string | Required. Descriptive. Include `[DELOAD]` tag for deload weeks (PAS-D8). |
| `sections` | WorkoutSection[] | Section-first model (WS-A5). `MAIN` always present. `WARM_UP` and `COOL_DOWN`: see PAS-D9. |

**Critical locked rule:** `dayOfWeek` is always `null` for Forge programs. Programs are sequential, not calendar-based. Do not author programs assuming specific days of the week.

### 2.3 ExercisePrescription — Author-Facing Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `exerciseName` | string | Yes | Must match an `ExerciseDefinition.name` exactly. Resolved to `exerciseId` at import. |
| `section` | enum | Yes | `WARM_UP`, `MAIN`, or `COOL_DOWN`. |
| `order` | integer | Yes | 1-based within each section. Restarts at 1 for each new section within a slot. |
| `sets` | integer | No | Positive integer or blank. |
| `reps` | integer | No | Positive integer or blank. Mutually exclusive with `durationSeconds`. Use lower bound of rep range; encode upper bound in `notes`. |
| `durationSeconds` | integer | No | Positive integer or blank. Mutually exclusive with `reps`. |
| `weightValue` | decimal | No | Positive number or blank. |
| `weightUnit` | string | No | `lbs` or `kg`. Required when `weightValue` is set; blank otherwise. |
| `distanceValue` | decimal | No | Positive number or blank. Always co-present or co-absent with `distanceUnit`. |
| `distanceUnit` | string | No | `m`, `km`, or `mi`. Required when `distanceValue` is set. |
| `restSeconds` | integer | No | Positive integer or blank. **Reference-only per EPA1-D2.** W-9 may display as muted info; it does not constrain the athlete's timer. |
| `notes` | string | No | Max 200 chars. Use for RPE encoding (PAS-D3), rep range upper bounds, deload context, and technique cues. |

**No RPE field. No tempo field.** These do not exist in the locked schema. See Section 6.

---

## Section 3 — Taxonomy Quick Reference

### 3.1 Categories (8)

| Category | What athletes do in this program |
|----------|----------------------------------|
| `STRENGTH` | Train compound barbell or dumbbell movements at high intensity; pursue progressive overload toward maximal strength |
| `HYPERTROPHY` | Accumulate training volume with moderate-to-high intensity; build muscle through repeated stimulus |
| `CONDITIONING` | Develop cardiovascular capacity and work output through circuit training, intervals, or mixed modalities |
| `RUNNING` | Build structured running volume; develop aerobic base, pace, and mileage |
| `CYCLING` | Build structured ride volume; develop aerobic base, cadence, and sustained power output |
| `COMBAT_SPORTS` | Train striking, grappling, and sport-specific conditioning; develop athletic capacity for combat sports |
| `FULL_BODY` | Train the whole body each session with bodyweight or minimal equipment; develop general fitness and movement quality |
| `MOBILITY` | Develop flexibility, joint range of motion, and movement quality through structured stretching and mobility work |

**Rule:** Assign exactly one category. If a program genuinely spans two categories, assign based on primary training stimulus. A strength program with conditioning finishers is `STRENGTH`.

### 3.2 Levels (3)

| Level | Training experience with this type of program |
|-------|-----------------------------------------------|
| `BEGINNER` | 0–1 year. No assumed baseline with this training style. Technical patterns must be introduced, not assumed. |
| `INTERMEDIATE` | 1–3 years. Familiar with foundational movement patterns. Can self-regulate effort. |
| `ADVANCED` | 3+ years. Understands periodization. Assumes baseline technique. Can manage complex programming. |

**Critical rule:** Level is specific to this training type, not overall fitness history. A marathon runner with 5 years of experience is `BEGINNER` in a strength program. A veteran weightlifter is `BEGINNER` in a cycling program.

### 3.3 Environments (4)

| Environment | What it means |
|-------------|--------------|
| `GYM` | Full commercial gym: barbells, squat rack, cable machine, machines, dumbbells. |
| `HOME` | No equipment or minimal home equipment: bodyweight, resistance bands, pull-up bar, limited dumbbells. |
| `OUTDOOR` | No equipment. Space for running, bodyweight drills, or sport-specific movement. |
| `MIXED` | The program explicitly alternates between sessions that require a gym and sessions that do not. |

**MIXED tie-breaker:** `MIXED` is reserved for programs where the week structure itself requires athletes to use both a gym and a non-gym setting across different sessions. A program that primarily requires a gym but has two optional outdoor runs is `GYM`.

### 3.4 Goal Alignments (10)

| Alignment | Primary training outcome |
|-----------|-------------------------|
| `BUILD_STRENGTH` | Maximal strength, heavy compound lifts, 1RM progression |
| `BUILD_MUSCLE` | Muscle hypertrophy, volume accumulation |
| `IMPROVE_ENDURANCE` | Aerobic base, sustained cardiovascular capacity |
| `LOSE_FAT` | Caloric output, metabolic conditioning, energy system training |
| `IMPROVE_CONDITIONING` | Work capacity, anaerobic threshold, circuit endurance |
| `IMPROVE_RUNNING` | Running-specific aerobic base, mileage, pace development |
| `IMPROVE_CYCLING` | Cycling-specific aerobic base, FTP, sustained power output |
| `IMPROVE_MOBILITY` | Flexibility, joint health, range of motion |
| `SPORT_PERFORMANCE` | Sport-specific conditioning and athletic capacity |
| `GENERAL_FITNESS` | Well-rounded physical capability, movement quality, baseline health |

**Rule:** Programs have 1–2 goal alignments. More than 2 signals miscategorization.

**Worked example:** Strength Foundation I is `STRENGTH` + `BEGINNER` + `GYM` + `BUILD_STRENGTH` (1 alignment). It is a foundational barbell program for athletes new to structured strength training. Beginner athletes gain strength and muscle simultaneously; `BUILD_MUSCLE` is not needed as a co-primary goal at this level.

---

## Section 4 — Program Naming Standard

### 4.1 Naming Pattern (PAS-D1)

Forge program names follow a two-part structure:

```
[Methodology or Subject] [Tier Descriptor]
```

**Tier Descriptor vocabulary (controlled):**

| Tier | When to use |
|------|-------------|
| Foundation | Entry point to a family. BEGINNER level. First program in a ladder. |
| Base | Cardio or endurance entry point. Used for RUNNING, CYCLING, CONDITIONING at BEGINNER. |
| Development | Cardio or endurance intermediate step. |
| Intermediate | Intermediate-level program in any category. |
| Advanced | Advanced-level program in any category. |
| I, II, III | Sequential programs in the same methodology at escalating levels (Strength Foundation I → II → III). |

### 4.2 Naming Constraints

| Rule | Compliant | Non-Compliant |
|------|-----------|---------------|
| No superlatives | Strength Foundation I | Elite Strength Protocol |
| No branded methodology names | Strength Foundation II | 5/3/1 Intermediate |
| No gendered terms | Bodyweight Foundation | Women's Bodyweight Foundation |
| No outcome promises | Body Recomposition Foundation | Burn Fat in 8 Weeks |
| No abbreviations in canonical name | Bodyweight Foundation | BW Foundation |
| Max 60 characters (hard limit) | — | Names exceeding 60 chars |

**Authoring target:** ≤ 40 characters. The 60-character hard limit is enforced at import; the 40-character target leaves room for version context in future naming.

### 4.3 Locked Names

The canonical names for all 25 launch programs are locked in Program-Ecosystem-Architecture-v1.0.md §6.5. See Section 13. Future programs beyond the 25 follow the PAS-D1 pattern.

---

## Section 5 — Description Standard

### 5.1 Format Requirements

| Requirement | Rule |
|-------------|------|
| Length | 60–120 characters. Import tool hard-enforces both bounds. |
| Structure | One sentence. No semicolons joining two clauses as separate sentences. |
| Voice | Athlete-centered. Describe what the athlete trains, how they train it, what they develop. |
| Language | Gender-neutral. No marketing copy. |

### 5.2 Sentence Structure (PAS-D2)

```
[Level/Audience signal] + [primary training focus] + [structural signature or methodology hook]
```

At least two of the three elements must be present. They do not need to appear in this order.

### 5.3 Compliant Examples

| Description | Chars | Elements Present |
|-------------|-------|-----------------|
| A beginner strength program built around the five fundamental barbell movements. | 76 | Level + Focus + Signature |
| An 8-week hypertrophy block using push/pull/legs structure with undulating volume. | 80 | Focus + Signature |
| A 12-week program for intermediate lifters pursuing block periodization for maximal strength. | 91 | Level + Focus + Signature |
| A progressive running program building from 20-minute easy runs to structured tempo work. | 87 | Focus + Signature |
| Four weeks of daily mobility work developing joint range of motion and movement quality. | 86 | Focus + Signature |

### 5.4 Non-Compliant Examples

| Description | Violation |
|-------------|-----------|
| Get strong! | Too vague; no training focus; marketing copy |
| Transform your physique in 8 weeks with our proven system. | Outcome promise; marketing copy |
| The best program for women who want to tone up without bulking. | Gendered; appearance-focused language |
| Advanced, Intermediate or Beginner — works for anyone! | No level signal; no training focus |
| Elite program designed by top coaches for serious athletes. | Superlative; no training focus or structure |

### 5.5 Prohibited Terms

| Prohibited | Reason |
|-----------|--------|
| lean, toned, tone up, shredded, bulk, bulking | Appearance-focused language |
| lose X lbs, gain X lbs of muscle, burn fat fast | Outcome promise |
| he, she, his, her, him, guys, ladies | Gendered language |
| Rogue, Peloton, Nike, any equipment brand | Brand reference |
| 5/3/1, Starting Strength, StrongLifts, CrossFit | Branded methodology names |
| proven, guaranteed, science-based, optimal, best | Marketing copy |
| transform, change your body, get fit | Outcome-promise language |

---

## Section 6 — RPE and Tempo in MVP Programs

### 6.1 The Schema Reality

The locked `ExercisePrescription` schema contains: `sets`, `reps`, `durationSeconds`, `weightValue`, `weightUnit`, `distanceValue`, `distanceUnit`, `restSeconds`, `notes`. There is no `rpe` field. There is no `tempo` field. Adding either requires a schema amendment cascading through the import pipeline, W-9, W-24, and W-19.

### 6.2 RPE — Notes Encoding (PAS-D3)

RPE guidance is encoded in the `notes` field when needed. No schema amendment is made for MVP.

**When RPE may be used:**
- STRENGTH programs at INTERMEDIATE and ADVANCED level only
- HYPERTROPHY programs at INTERMEDIATE and ADVANCED level only

**When RPE must NOT be used:**
- Any BEGINNER program in any category
- CONDITIONING, RUNNING, CYCLING, COMBAT_SPORTS, FULL_BODY, and MOBILITY programs at any level

**Rationale for BEGINNER exclusion:** BEGINNER athletes are assumed to be unfamiliar with RPE as a training concept. Including it in BEGINNER programs undermines the program's self-contained executability (QC-5) and introduces a calibration concept the athlete has no frame of reference for.

### 6.3 RPE Encoding Format (PAS-D5)

When RPE is encoded in `notes`, the exact format is:

```
RPE [integer or integer–integer range]
```

**Valid:** `RPE 7`, `RPE 8`, `RPE 7–8`, `RPE 8–9`

**Invalid:** `@RPE 8`, `RPE: 8`, `Rate of Perceived Exertion 8`, `RPE 8, focus on bar path`

When RPE appears in `notes`, it is the only content in that field. Do not mix RPE with technique cues or other guidance in the same prescription row. If a technique cue is also needed, it belongs in a separate exercise row's `notes` field or in the slot name.

### 6.4 Tempo — Excluded from MVP (PAS-D4)

Tempo notation is **not used in any MVP Forge program**. Tempo prescription requires authors to make independent encoding choices (numeric notation, descriptive text, phase labels) that produce inconsistent results across programs. The 200-character `notes` field is too unstructured for reliable tempo encoding at scale. MVP programs communicate intensity via weight prescription, rep ranges, and RPE notes where permitted. Tempo prescription is a post-MVP authoring capability.

### 6.5 Post-MVP Schema Amendment (PAS-D12)

A dedicated `rpe: integer | null` field on `ExercisePrescription` is the correct long-term solution for intensity prescription in STRENGTH and HYPERTROPHY programs. The notes encoding in PAS-D3 is explicitly a temporary MVP accommodation. This schema amendment — cascading through the import pipeline, W-9 execution display, W-24 Program Workout Builder, and W-19 Activity Detail — is recommended as the first post-launch prescription enhancement. When the `rpe` field is added, MVP programs authored with RPE in `notes` should be reviewed and migrated to the dedicated field via a `v1.1` version update.

---

## Section 7 — Progression Models

### 7.1 Approved MVP Progression Models (PAS-D6)

Five progression models are approved for MVP Forge programs. Additional models require a PAS amendment before use.

---

#### Model 1 — Linear Progression

**Definition:** The prescribed weight for a given exercise increases by a fixed amount each time it appears across the slot sequence. The weight ladder is authored explicitly — each slot's prescription carries a different `weightValue` for the same exercise.

**Applies to:** STRENGTH BEGINNER, FULL_BODY (all levels), CONDITIONING BEGINNER

**In the sheet:**
```
Week 1 — Back Squat: sets: 3, reps: 5, weightValue: 95, weightUnit: lbs
Week 2 — Back Squat: sets: 3, reps: 5, weightValue: 100, weightUnit: lbs
Week 3 — Back Squat: sets: 3, reps: 5, weightValue: 105, weightUnit: lbs
```

**Standard increments (guidance, not hard rules):**
- Lower body compound movements: +5 lbs per session or +10 lbs per week
- Upper body compound movements: +2.5 lbs per session or +5 lbs per week
- Bodyweight linear rep progression (FULL_BODY): +1–2 reps per week for the same exercise

**Programs:** Strength Foundation I, Powerbuilding Foundation, Athletic Conditioning Foundation, Bodyweight Foundation (rep-based variant), Bodyweight Strength (rep-based variant)

---

#### Model 2 — Double Progression

**Definition:** A rep range is prescribed. The athlete works at a given weight until they reach the top of the rep range on all sets, then increases weight in the next session. The author prescribes the rep range and starting weight; the athlete self-manages increases within the range.

**Applies to:** HYPERTROPHY (all levels), STRENGTH INTERMEDIATE and ADVANCED, CONDITIONING INTERMEDIATE

**In the sheet:** Set `reps` to the lower bound. Encode the upper bound in `notes` using the standard format:

```
reps: 8
notes: Rep target: 8–12. Add weight when all sets reach 12.
```

**Programs:** Hypertrophy Foundation, Hypertrophy Intermediate, Hypertrophy Advanced, Strength Foundation II, Strength Foundation III (accessory work), Powerbuilding Intermediate, Conditioning Intermediate, Body Recomposition Foundation, Body Recomposition Intermediate

---

#### Model 3 — Block Periodization

**Definition:** The program is divided into distinct training blocks (phases) with different rep schemes, intensities, or volume targets per block. For running and cycling: structured mileage or duration increases with alternating easy and intensity weeks.

**Applies to:** STRENGTH ADVANCED, HYPERTROPHY ADVANCED (overall structure), RUNNING (all levels), CYCLING (all levels)

**In the sheet:** Include the phase label in slot names:
```
Week 1 — Lower Body: Accumulation
Week 5 — Lower Body: Intensification
Week 9 — Lower Body: Realization
```

For running: slots use `durationSeconds` or `distanceValue`/`distanceUnit`. Weekly mileage increases per the 10% rule (see Section 11.4).

**Programs:** Strength Foundation III, Hypertrophy Advanced, Running Base I, Running Base II

---

#### Model 4 — Volume Accumulation

**Definition:** Sets per exercise increase over the program's duration while rep ranges and weights remain relatively stable. Early weeks: lower set counts. Peak weeks: higher set counts. Deload week: reduced set counts before the next block.

**Applies to:** HYPERTROPHY BEGINNER and INTERMEDIATE (layered with double progression), COMBAT_SPORTS, CONDITIONING BEGINNER

**In the sheet:**
```
Weeks 1–3: sets: 3
Weeks 4–6: sets: 4
Weeks 7–9: sets: 5
Week 10 (deload): sets: 2
```

**Programs:** Hypertrophy Foundation, Hypertrophy Intermediate (within double-progression structure), Lower Body Foundation, Lower Body Intermediate, Home Conditioning

---

#### Model 5 — Time-Based Progression

**Definition:** Duration in seconds increases per slot rather than load or volume. Prescriptions use `durationSeconds`. The progression variable is endurance of a position, hold, or interval.

**Applies to:** MOBILITY (all levels), CONDITIONING cardio elements, CYCLING interval segments

**In the sheet:**
```
Week 1 — Hip Flexor Stretch: durationSeconds: 30
Week 3 — Hip Flexor Stretch: durationSeconds: 45
Week 5 — Hip Flexor Stretch: durationSeconds: 60
```

**Programs:** Mobility Foundation, Mobility Intermediate, conditioning HIIT slots, cycling interval slots

---

### 7.2 Model Selection by Category and Level

| Program type | Primary model |
|-------------|---------------|
| STRENGTH BEGINNER | Linear Progression |
| STRENGTH INTERMEDIATE / ADVANCED | Double Progression (lifts) + Block Periodization (phase structure) |
| HYPERTROPHY all levels | Double Progression + Volume Accumulation |
| CONDITIONING BEGINNER | Linear Progression or Volume Accumulation |
| CONDITIONING INTERMEDIATE | Double Progression |
| RUNNING / CYCLING | Block Periodization |
| COMBAT_SPORTS | Volume Accumulation |
| FULL_BODY | Linear Progression (or linear rep progression for bodyweight) |
| MOBILITY | Time-Based Progression |

Layering models is acceptable (e.g., STRENGTH ADVANCED uses Block Periodization for phase structure and Double Progression for accessory work within each phase).

---

## Section 8 — Deload Architecture

### 8.1 Deload Requirements by Program Length (PAS-D7)

| Program Duration | Deload Rule |
|-----------------|-------------|
| 4–6 weeks | No mandatory deload. Optional at the author's discretion. |
| 7–10 weeks | One mandatory deload. Position: penultimate week, leaving the final week as peak or test. |
| 11–14 weeks | Two mandatory deloads. First: Week 4 (concluding the opening mesocycle). Second: penultimate week, leaving the final week as peak. |

**What a deload is:** A structured reduction week that maintains training frequency but reduces primary compound set volume by 40–50%. A deload is not a rest week. The athlete still trains.

### 8.2 Deload Encoding (PAS-D8)

**Slot name:** Include the `[DELOAD]` tag in every slot name within the deload week.

```
Week 7 — Upper Body Push [DELOAD]
Week 7 — Lower Body [DELOAD]
Week 7 — Upper Body Pull [DELOAD]
```

**Set reduction:** Reduce `sets` on primary compound exercises by 40–50% compared to the preceding non-deload week's equivalent session.

```
Peak week: Back Squat — sets: 5, reps: 3
Deload week: Back Squat — sets: 3, reps: 3   (−40%)
```

**Weight:** Hold at the previous week's value or reduce 10–15%. Do not use the deload week to introduce new weight targets.

**Exercise selection:** Same exercises as the preceding week's equivalent session. No new exercise introductions in deload weeks.

**Frequency:** Maintain the same `workoutsPerWeek` as all other weeks. Deload weeks contain the same number of slots as training weeks.

**Optional notes:** Deload exercise rows may include `notes: "Deload week. Focus on movement quality and recovery."` Optional; use at the author's discretion.

### 8.3 Why Deloads Maintain Frequency

Programs are sequential and not calendar-based. The athlete cannot skip sessions without the program counter appearing to stall. Maintaining frequency during deload weeks ensures the program advances normally. Training stress reduction comes entirely from reduced volume (sets), not reduced frequency.

---

## Section 9 — Warm-Up and Cooldown Standard

### 9.1 Requirements by Category (PAS-D9)

| Category | WARM_UP Section | COOL_DOWN Section |
|----------|-----------------|------------------|
| STRENGTH | **Required** | Optional (recommended for heavy compound programs) |
| HYPERTROPHY | **Required** | Optional |
| CONDITIONING | **Required** | **Required** |
| RUNNING | **Required** (dynamic only; no static stretching pre-run) | **Required** (post-run static stretch) |
| CYCLING | **Required** (easy cadence ramp + activation) | **Required** (cooldown spin + stretch) |
| COMBAT_SPORTS | **Required** | **Required** |
| FULL_BODY | **Required** | Optional |
| MOBILITY | None — the program itself is the mobility practice; `MAIN` only | None |

### 9.2 Warm-Up Must Use the WARM_UP Section (PAS-D10)

Warm-up exercises for Forge programs must be authored as a proper `WARM_UP` section with `ExercisePrescription` rows. They must not be:
- Encoded as `notes` on MAIN section exercises
- Listed as free text in the slot name
- Omitted in favor of a generic note ("warm up before starting")

**Why:** W-9 renders section headers (`WARM-UP → MAIN → COOL-DOWN`) from the section data in the slot. Programs with proper sections display a structured session. Programs that skip the WARM_UP section and add warm-up notes to MAIN exercises display as a single undifferentiated exercise list.

### 9.3 Warm-Up Content Guidance

| Property | Guidance |
|----------|----------|
| Exercise count | 3–6 exercises |
| Prescription type | Primarily `durationSeconds` for mobility and activation; `sets × reps` for activation movements |
| Rest | Omit `restSeconds`; athletes flow through warm-up continuously |
| Exercise selection | Use MOBILITY category exercises (Stretch Dynamic, Joint Mobility, Foam Roll, Breathwork); activation exercises from FULL_BODY or LEGS_AND_GLUTES categories |
| Alignment | Warm-up prepares the primary muscle groups trained in MAIN; a squat-focused session warms up hips, ankles, and quads |

### 9.4 Cooldown Content Guidance

| Property | Guidance |
|----------|----------|
| Exercise count | 3–5 exercises |
| Prescription type | `durationSeconds`. Holds are typically 30–90 seconds. |
| Exercise selection | MOBILITY category (Stretch Static, Foam Roll); target the muscle groups trained in MAIN |
| Rest | Omit `restSeconds`; athletes flow through cooldown continuously |

---

## Section 10 — Volume Standards

### 10.1 Volume Guardrails by Category (PAS-D11)

The following ranges govern the **MAIN section only**. WARM_UP and COOL_DOWN are not counted. These are guardrails — not targets. Satisfying the guardrails does not guarantee quality; see Section 15.

| Category | Exercises in MAIN | Sets in MAIN | Notes |
|----------|-------------------|-------------|-------|
| STRENGTH | 4–6 | 15–25 | Minimum 3 compound movements per session |
| HYPERTROPHY | 5–8 | 18–30 | Higher end permissible at ADVANCED level |
| CONDITIONING | 4–8 | 12–24 | Circuit rounds may count as sets for this guardrail |
| RUNNING | 1–3 | N/A — duration-based | Use `durationSeconds` or `distanceValue`/`distanceUnit` |
| CYCLING | 1–3 | N/A — duration-based | Use `durationSeconds` or `distanceValue`/`distanceUnit` |
| COMBAT_SPORTS | 4–7 | 12–20 | Bag/pad drills encoded as `sets × durationSeconds` |
| FULL_BODY | 4–7 | 12–20 | HOME environment may use higher reps with lower weights |
| MOBILITY | 5–10 | N/A — duration-based | All holds use `durationSeconds` |

Programs authored outside these ranges require a written deviation note in the authoring sheet. The quality reviewer (Section 16, Group C) confirms the deviation is justified.

### 10.2 Estimated Session Duration (Quality Guideline)

The following ranges are **quality-review guidelines, not import rules**. The import tool does not enforce them. They exist because volume guardrails (exercise count × set count) do not capture session duration — two programs can both satisfy PAS-D11 and yet produce sessions of 35 minutes or 95 minutes depending on rest periods and exercise complexity.

| Category | Estimated Session Duration |
|----------|--------------------------|
| STRENGTH | 45–75 min |
| HYPERTROPHY | 50–80 min |
| CONDITIONING | 30–60 min |
| RUNNING | 20–75 min |
| CYCLING | 30–90 min |
| COMBAT_SPORTS | 45–75 min |
| FULL_BODY | 40–70 min |
| MOBILITY | 10–30 min |

Estimates assume: the athlete sets up promptly, follows prescribed rest periods, and works at a consistent pace. They exclude commute, preparation, and post-workout time.

**ADVANCED programs** may approach or slightly exceed the upper bound due to higher set volumes. This is expected and does not require justification.

**Programs outside the range** require a written note in the authoring sheet explaining why. The quality reviewer confirms the duration is appropriate for the stated level.

### 10.3 Additional Volume Rules

**No duplicate exercises per section.** If the same exercise appears twice in a MAIN section, combine it into one prescription row with the total set count.

**Superset encoding.** The schema does not natively support superset groupings at MVP. If supersets are intended, indicate this in `notes` on adjacent exercises: `notes: "Superset with the exercise above."` W-9 will present them as individual sequential exercises.

**Rest prescription (`restSeconds`) guidance by level:**

| Level | Primary compound exercises | Accessory / isolation |
|-------|---------------------------|-----------------------|
| BEGINNER | Optional (60–90s typical; athlete self-regulates) | Omit |
| INTERMEDIATE | Recommended (90–180s for compounds; 60–90s for accessories) | Optional |
| ADVANCED | Required for primary compounds (120–240s) | Optional |

`restSeconds` is always reference-only (EPA1-D2).

---

## Section 11 — Category-Specific Authoring Guidelines

### 11.1 STRENGTH

**Session structure:** Foundation programs: 3 days/week. Intermediate: 4 days, Upper/Lower split. Advanced: 4 days, block-structured phases. Every MAIN section includes at minimum one Squat or Hip Hinge pattern and one horizontal push or pull.

**Core compound movements:** Back Squat, Front Squat, Deadlift, Romanian Deadlift, Bench Press, Overhead Press, Barbell Row, Pull-Up. At least two must appear in every MAIN section.

**Exercise order:** Primary compound first (highest neurological demand). Secondary compound second. Accessory work last. Never open with isolation or machine exercises.

**Load prescription:**
- BEGINNER: Absolute weight with linear progression (Model 1)
- INTERMEDIATE: Absolute weight with double progression (Model 2); RPE notes permitted
- ADVANCED: Block periodization structure; RPE notes required for primary lifts; percentage-of-1RM guidance in `notes` acceptable

**Avoid:**
- More than one machine isolation exercise per session at BEGINNER or INTERMEDIATE
- Olympic lifts (Clean & Jerk, Snatch) in BEGINNER programs — these require technical coaching a self-directed program cannot provide
- Missing a Hip Hinge pattern for multiple consecutive sessions
- Identical prescription values every week (no progression)

---

### 11.2 HYPERTROPHY

**Session structure:** 4 days/week at BEGINNER and INTERMEDIATE; 5 days at ADVANCED. Push/Pull/Legs or Upper/Lower split.

**Volume target:** 10–20 sets per muscle group per week. Distribute across sessions; do not concentrate all sets for one muscle group into a single session.

**Exercise order:** Compound movements first (Bench Press, Barbell Row, Squat variations, RDL). Isolation work last (dumbbell fly, leg curl, lateral raise). Cable and machine exercises are appropriate — do not avoid them.

**Load prescription:** Double progression (Model 2) with volume accumulation layered across the program (Model 4). RPE notes permitted at INTERMEDIATE and ADVANCED levels.

**Avoid:**
- 1RM-style heavy singles as the primary training stimulus (that is STRENGTH, not HYPERTROPHY)
- Insufficient volume in early weeks (BEGINNER needs accumulation, not a peak)
- Symmetric push/pull neglect (4 pushing exercises and 1 pulling exercise is unbalanced)

---

### 11.3 CONDITIONING

**Session structure:** Sessions alternate or combine strength and cardio elements. Work-to-rest ratios are a primary prescription variable. Always populate `restSeconds` for CONDITIONING programs.

**Circuit encoding:** If the session is a circuit, indicate this in the slot name: `"Week 3 — AMRAP 20 Min Circuit"` or `"Week 5 — 5 Rounds: Strength Circuit"`. Note circuit intent in exercise `notes`: `"Move directly to the next exercise. Rest only after completing all exercises in the circuit."` Set `restSeconds` on the circuit's final exercise to indicate between-round rest.

**Avoid:**
- No prescribed rest, leaving athletes guessing on work-to-rest ratios
- Complex barbell lifts without adequate instruction — CONDITIONING athletes may not have a strength training background

---

### 11.4 RUNNING

**Session structure:** 4 sessions/week at BEGINNER; 5 at INTERMEDIATE. Mix of easy pace runs (duration-based), tempo runs (distance-based), and long runs. One easy or rest day between intensity sessions.

**Prescription format:** Use `durationSeconds` for easy/recovery runs. Use `distanceValue`/`distanceUnit` for tempo and long runs where distance is the target. Use `notes` for pace guidance: `"Easy conversational pace. You should be able to speak in full sentences."` or `"Tempo pace. Comfortably hard — a few words, not full sentences."`

**Mileage progression:** Weekly total running distance must not increase more than 10% week-over-week. Build this into the progressive distance prescriptions across the slot sequence.

**WARM_UP for running:** Dynamic warm-up only (leg swings, hip circles, high knees). No static stretching pre-run; static stretches belong in the COOL_DOWN section.

**Avoid:**
- Prescribing pace in minutes-per-mile in the schema — use descriptive guidance in `notes`; absolute pace does not account for individual fitness levels
- Increasing weekly mileage more than 10% per week
- All sessions at high intensity — easy aerobic volume is essential

---

### 11.5 CYCLING

**Session structure:** 4 sessions/week at BEGINNER; 5 at INTERMEDIATE. Mix of easy aerobic rides (duration-based), interval sessions, and longer steady rides.

**Prescription format:** Use `durationSeconds` for ride duration. Use `distanceValue`/`distanceUnit` for distance targets. For interval sessions, encode each interval type as an exercise row:

```
Exercise: Zone 2 Steady Ride — durationSeconds: 2400  (40 min)
Exercise: Threshold Intervals (5 × 4 min) — sets: 5, durationSeconds: 240
```

**Effort guidance:** Use `notes` for zone references: `"Zone 2: 60–70% max heart rate. Comfortable, sustainable effort."` or `"Threshold: RPE 7–8. Comfortably hard, sustainable for 10–20 min."` Note: RPE in notes for cycling refers to cardiovascular effort, consistent with the PAS-D5 format.

**Avoid:**
- Not encoding rest intervals between hard cycling intervals
- All sessions at the same effort level (missing easy aerobic volume)

---

### 11.6 COMBAT_SPORTS

**Session structure:** 3 sessions/week at BEGINNER (GYM); 4 at INTERMEDIATE (MIXED). Sessions combine technical conditioning drills, strength work, and metabolic conditioning.

**Drill encoding:** Shadowboxing, bag work, pad work, and grappling drills are encoded as `sets × durationSeconds`. Each round = one set.

```
Exercise: Heavy Bag Rounds
sets: 4
durationSeconds: 180    (3-minute round)
restSeconds: 60         (1 minute between rounds)
```

**Strength work:** Use exercises from PUSH, PULL, and FULL_BODY categories. COMBAT_SPORTS athletes need functional upper body pulling strength and explosive power. Avoid heavy barbell work in BEGINNER programs — these athletes may have no strength training background.

**Avoid:**
- All conditioning, no strength work (or vice versa)
- Advanced plyometrics (box jumps, hurdle hops) in BEGINNER programs without regression options

---

### 11.7 FULL_BODY

**Session structure:** 3 sessions/week at BEGINNER (Bodyweight Foundation, Home Conditioning); 4 at INTERMEDIATE (Bodyweight Strength). HOME environment requires no barbells, squat racks, or cable machines.

**Equipment constraints for HOME programs:**
- Available: bodyweight, pull-up bar, resistance bands, limited dumbbells (if specified)
- Not available: barbell, squat rack, cables, machines

**Bodyweight progression:** Increase `reps` values across the slot sequence for the same exercise (linear rep progression, Model 1 variant). Introduce harder variations in later weeks rather than only adding reps indefinitely. Use `notes` to indicate progression intent: `"Master 3 × 15 before progressing to Pike Push-Ups."`

**Avoid:**
- Equipment not available in a typical home
- Bodyweight exercises requiring advanced technique without progressions (handstand push-ups in BEGINNER)
- Insufficient lower body work

---

### 11.8 MOBILITY

**Session structure:** 5 sessions/week (daily or near-daily practice). Sessions are 10–30 minutes. `MAIN` section only — no `WARM_UP` or `COOL_DOWN` sections.

**Prescription format:** Static holds use `durationSeconds`. Dynamic movements use `sets × reps`. Never use `sets` for static hold prescriptions.

```
Hip Flexor Stretch (Static): durationSeconds: 45
Cat-Cow (Dynamic): sets: 2, reps: 10
Pigeon Pose (Static): durationSeconds: 60
```

**Session organization:** Begin with global mobility or breathwork. Progress to joint-specific work. End with deep, long-hold stretches. Do not front-load complex or deep holds in Week 1.

**Progression:** Time-based (Model 5). Increase hold durations from earlier to later weeks. Introduce more challenging variations in intermediate programs.

**Avoid:**
- Static stretching before dynamic mobility work — reverse the order
- Front-loading the hardest stretches in Week 1
- Sessions longer than 30 minutes

---

## Section 12 — Google Sheets Authoring Template

### 12.1 Template Structure

The authoring template is a Google Sheets workbook with three tabs. Authors copy the template for each program they author. The CSV is exported at submission time. All corrections go back to the Google Sheet — never patch the CSV directly.

### 12.2 Tab 1 — Program Header

One row per program.

| Column | Type | Required | Validation | Notes |
|--------|------|----------|-----------|-------|
| `name` | string | Yes | Max 60 chars; must match locked name from Section 13 | Import tool enforces uniqueness against published programs |
| `version` | string | Yes | Must be `v1.0` | |
| `category` | enum | Yes | One of 8 values, uppercase | STRENGTH, HYPERTROPHY, CONDITIONING, RUNNING, CYCLING, COMBAT_SPORTS, FULL_BODY, MOBILITY |
| `level` | enum | Yes | BEGINNER, INTERMEDIATE, or ADVANCED (uppercase) | |
| `environment` | enum | Yes | GYM, HOME, OUTDOOR, or MIXED (uppercase) | |
| `goalAlignment` | string | Yes | 1–2 enum values, comma-separated | e.g., `BUILD_STRENGTH,BUILD_MUSCLE` |
| `durationWeeks` | integer | Yes | Positive integer | |
| `workoutsPerWeek` | integer | Yes | Positive integer | |
| `description` | string | Yes | 60–120 chars | Import tool enforces length; content review is human |
| `isFeatured` | boolean | Yes | `TRUE` or `FALSE` (caps) | TRUE only for Strength Foundation I and Bodyweight Foundation |
| `sortOrder` | integer | Yes | Integer ≥ 1; use locked value from Section 13 | |
| `successorProgramName` | string | No | Exact canonical name of successor; blank for terminal programs | Import tool resolves to `successorProgramId` |

**Validation helper:** Add a formula in a helper column to track description length: `=LEN(B2)`. This provides real-time character count feedback without waiting for the import tool.

`totalWorkouts` is not in this tab. It is computed and enforced by the import tool as `durationWeeks × workoutsPerWeek`. The number of distinct slot groups in Tab 3 must equal this computed value.

### 12.3 Tab 2 — Program Slots

One row per workout slot, ordered by `slotIndex` ascending.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `programName` | string | Yes | Must match Tab 1 name exactly |
| `slotIndex` | integer | Yes | 0-based; starts at 0; sequential, no gaps |
| `weekNumber` | integer | Yes | 1-based; all slots in the same week share the same value |
| `slotName` | string | Yes | Descriptive. Include phase context and `[DELOAD]` tag where applicable. |

**Slot name format examples:**

```
Week 1 — Upper Body Push
Week 1 — Lower Body
Week 7 — Upper Body Push [DELOAD]
Week 7 — Lower Body [DELOAD]
Week 8 — Upper Body Push (Peak Week)
Week 9 — Lower Body: Intensification
```

### 12.4 Tab 3 — Exercises

One row per exercise prescription. Linked to a slot by `programName` + `slotIndex`. Multiple rows with the same `programName` and `slotIndex` belong to the same slot.

Row order within a slot: all WARM_UP rows first, then MAIN rows, then COOL_DOWN rows. Within each section, rows are ordered by `order` ascending.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `programName` | string | Yes | Must match Tab 1 |
| `slotIndex` | integer | Yes | 0-based; links to Tab 2 |
| `section` | enum | Yes | `WARM_UP`, `MAIN`, or `COOL_DOWN` (uppercase) |
| `order` | integer | Yes | 1-based within each section; restarts at 1 for each new section |
| `exerciseName` | string | Yes | Must match `ExerciseDefinition.name` exactly |
| `sets` | integer | No | Leave blank (not `0`) when null |
| `reps` | integer | No | Lower bound of rep range; blank when null or when `durationSeconds` is set |
| `durationSeconds` | integer | No | Mutually exclusive with `reps`; blank when null |
| `weightValue` | decimal | No | Positive number; blank when null |
| `weightUnit` | string | No | `lbs` or `kg`; required when `weightValue` is set; blank otherwise |
| `distanceValue` | decimal | No | Positive number; blank when null |
| `distanceUnit` | string | No | `m`, `km`, or `mi`; required when `distanceValue` is set; blank otherwise |
| `restSeconds` | integer | No | Positive integer; blank when null; reference-only |
| `notes` | string | No | Max 200 chars; RPE encoding, rep range upper bounds, deload notes, technique cues |

### 12.5 Exercise Name Resolution

Exercise names in Tab 3 are resolved to `exerciseId` UUIDs at import. The import tool performs a case-insensitive match against `ExerciseDefinition.name` (exact match preferred).

If an exercise name does not resolve, the import tool reports it as a validation error. The author must verify the name in the exercise library and correct the sheet before re-importing.

**Best practice:** Keep the exercise library catalog open alongside the authoring sheet. Do not abbreviate exercise names. Use "Romanian Deadlift" not "RDL". Use "Pull-Up" not "Pullup" or "Pull Up".

---

## Section 13 — The 25 Launch Programs Reference Table

All 25 Forge launch programs are locked in Program-Ecosystem-Architecture-v1.0.md §5.2. Authors must use the exact values in this table.

`Total` = `Weeks × /Week` (computed). Verify that the number of unique `slotIndex` groups in Tab 3 equals `Total` before export.

| Sort | Program Name | Cat | Lvl | Env | Wks | /Wk | Total | Goal Alignment(s) | Successor | Featured |
|------|-------------|-----|-----|-----|-----|-----|-------|--------------------|-----------|---------|
| 1 | Strength Foundation I | STRENGTH | BEG | GYM | 8 | 3 | 24 | BUILD_STRENGTH | Strength Foundation II | TRUE |
| 2 | Strength Foundation II | STRENGTH | INT | GYM | 10 | 4 | 40 | BUILD_STRENGTH, BUILD_MUSCLE | Strength Foundation III | FALSE |
| 3 | Strength Foundation III | STRENGTH | ADV | GYM | 12 | 4 | 48 | BUILD_STRENGTH | — | FALSE |
| 4 | Powerbuilding Foundation | STRENGTH | BEG | GYM | 10 | 4 | 40 | BUILD_STRENGTH, BUILD_MUSCLE | Powerbuilding Intermediate | FALSE |
| 5 | Powerbuilding Intermediate | STRENGTH | INT | GYM | 12 | 4 | 48 | BUILD_STRENGTH, BUILD_MUSCLE | — | FALSE |
| 6 | Hypertrophy Foundation | HYPERTROPHY | BEG | GYM | 8 | 4 | 32 | BUILD_MUSCLE | Hypertrophy Intermediate | FALSE |
| 7 | Hypertrophy Intermediate | HYPERTROPHY | INT | GYM | 10 | 4 | 40 | BUILD_MUSCLE | Hypertrophy Advanced | FALSE |
| 8 | Hypertrophy Advanced | HYPERTROPHY | ADV | GYM | 12 | 5 | 60 | BUILD_MUSCLE | — | FALSE |
| 9 | Lower Body Foundation | HYPERTROPHY | BEG | GYM | 8 | 3 | 24 | BUILD_MUSCLE | Lower Body Intermediate | FALSE |
| 10 | Lower Body Intermediate | HYPERTROPHY | INT | GYM | 10 | 4 | 40 | BUILD_MUSCLE | — | FALSE |
| 11 | Running Base I | RUNNING | BEG | OUT | 8 | 4 | 32 | IMPROVE_RUNNING, IMPROVE_ENDURANCE | Running Base II | FALSE |
| 12 | Running Base II | RUNNING | INT | OUT | 10 | 5 | 50 | IMPROVE_RUNNING, IMPROVE_ENDURANCE | — | FALSE |
| 13 | Athletic Conditioning Foundation | CONDITIONING | BEG | GYM | 8 | 3 | 24 | IMPROVE_CONDITIONING, GENERAL_FITNESS | Conditioning Intermediate | FALSE |
| 14 | Body Recomposition Foundation | CONDITIONING | BEG | GYM | 8 | 4 | 32 | LOSE_FAT, BUILD_MUSCLE | Body Recomposition Intermediate | FALSE |
| 15 | Conditioning Intermediate | CONDITIONING | INT | GYM | 10 | 4 | 40 | IMPROVE_CONDITIONING | — | FALSE |
| 16 | Body Recomposition Intermediate | CONDITIONING | INT | GYM | 10 | 4 | 40 | LOSE_FAT, BUILD_MUSCLE | — | FALSE |
| 17 | Hybrid Foundation | CONDITIONING | BEG | MIX | 8 | 4 | 32 | BUILD_STRENGTH, IMPROVE_CONDITIONING | Hybrid Intermediate | FALSE |
| 18 | Hybrid Intermediate | CONDITIONING | INT | MIX | 10 | 4 | 40 | BUILD_STRENGTH, IMPROVE_CONDITIONING | — | FALSE |
| 19 | Bodyweight Foundation | FULL_BODY | BEG | HOME | 6 | 3 | 18 | GENERAL_FITNESS | Bodyweight Strength | TRUE |
| 20 | Bodyweight Strength | FULL_BODY | INT | HOME | 8 | 4 | 32 | BUILD_STRENGTH, GENERAL_FITNESS | Bodyweight Performance | FALSE |
| 21 | Bodyweight Performance | FULL_BODY | ADV | HOME | 10 | 4 | 40 | BUILD_STRENGTH, GENERAL_FITNESS | — | FALSE |
| 22 | Home Conditioning | FULL_BODY | BEG | HOME | 6 | 3 | 18 | LOSE_FAT, IMPROVE_CONDITIONING | — | FALSE |
| 23 | Home Strength Foundation | FULL_BODY | BEG | HOME | 8 | 3 | 24 | BUILD_STRENGTH, GENERAL_FITNESS | — | FALSE |
| 24 | Mobility Foundation | MOBILITY | BEG | HOME | 4 | 5 | 20 | IMPROVE_MOBILITY | Mobility Intermediate | FALSE |
| 25 | Mobility Intermediate | MOBILITY | INT | HOME | 6 | 5 | 30 | IMPROVE_MOBILITY | — | FALSE |

*BEG = BEGINNER, INT = INTERMEDIATE, ADV = ADVANCED, OUT = OUTDOOR, MIX = MIXED*

**Terminal programs** (`successorProgramName` blank): Strength Foundation III, Powerbuilding Intermediate, Hypertrophy Advanced, Lower Body Intermediate, Running Base II, Conditioning Intermediate, Body Recomposition Intermediate, Hybrid Intermediate, Bodyweight Performance, Home Conditioning, Home Strength Foundation, Mobility Intermediate.

---

## Section 14 — Deload Schedules by Program

The following table applies PAS-D7 to all 25 programs. Authors do not need to derive these schedules.

**Slot numbers are 1-based** (as authors count them). `slotIndex` in the Google Sheet Tab 2 is 0-based — subtract 1 from the slot number shown here.

| Program Name | Wks | /Wk | Deload? | Deload Week(s) | Deload Slots (1-based) | Peak Period |
|-------------|-----|-----|---------|---------------|----------------------|-------------|
| Strength Foundation I | 8 | 3 | Yes — 1 | 7 | 19–21 | Week 8 (slots 22–24) |
| Strength Foundation II | 10 | 4 | Yes — 1 | 9 | 33–36 | Week 10 (slots 37–40) |
| Strength Foundation III | 12 | 4 | Yes — 2 | 4 and 11 | 13–16 and 41–44 | Week 12 (slots 45–48) |
| Powerbuilding Foundation | 10 | 4 | Yes — 1 | 9 | 33–36 | Week 10 (slots 37–40) |
| Powerbuilding Intermediate | 12 | 4 | Yes — 2 | 4 and 11 | 13–16 and 41–44 | Week 12 (slots 45–48) |
| Hypertrophy Foundation | 8 | 4 | Yes — 1 | 7 | 25–28 | Week 8 (slots 29–32) |
| Hypertrophy Intermediate | 10 | 4 | Yes — 1 | 9 | 33–36 | Week 10 (slots 37–40) |
| Hypertrophy Advanced | 12 | 5 | Yes — 2 | 4 and 10 | 16–20 and 46–50 | Weeks 11–12 (slots 51–60) |
| Lower Body Foundation | 8 | 3 | Yes — 1 | 7 | 19–21 | Week 8 (slots 22–24) |
| Lower Body Intermediate | 10 | 4 | Yes — 1 | 9 | 33–36 | Week 10 (slots 37–40) |
| Running Base I | 8 | 4 | Yes — 1 | 7 | 25–28 | Week 8 (slots 29–32) |
| Running Base II | 10 | 5 | Yes — 1 | 9 | 41–45 | Week 10 (slots 46–50) |
| Athletic Conditioning Foundation | 8 | 3 | Yes — 1 | 7 | 19–21 | Week 8 (slots 22–24) |
| Body Recomposition Foundation | 8 | 4 | Yes — 1 | 7 | 25–28 | Week 8 (slots 29–32) |
| Conditioning Intermediate | 10 | 4 | Yes — 1 | 9 | 33–36 | Week 10 (slots 37–40) |
| Body Recomposition Intermediate | 10 | 4 | Yes — 1 | 9 | 33–36 | Week 10 (slots 37–40) |
| Hybrid Foundation | 8 | 4 | Yes — 1 | 7 | 25–28 | Week 8 (slots 29–32) |
| Hybrid Intermediate | 10 | 4 | Yes — 1 | 9 | 33–36 | Week 10 (slots 37–40) |
| Bodyweight Foundation | 6 | 3 | No | — | — | All 6 weeks training |
| Bodyweight Strength | 8 | 4 | Yes — 1 | 7 | 25–28 | Week 8 (slots 29–32) |
| Bodyweight Performance | 10 | 4 | Yes — 1 | 9 | 33–36 | Week 10 (slots 37–40) |
| Home Conditioning | 6 | 3 | No | — | — | All 6 weeks training |
| Home Strength Foundation | 8 | 3 | Yes — 1 | 7 | 19–21 | Week 8 (slots 22–24) |
| Mobility Foundation | 4 | 5 | No | — | — | All 4 weeks training |
| Mobility Intermediate | 6 | 5 | No | — | — | All 6 weeks training |

**Deload slot naming example** (Hypertrophy Foundation, deload Week 7, slots 25–28):

```
Tab 2, slotIndex 24 (slot 25): Week 7 — Upper Body Push [DELOAD]
Tab 2, slotIndex 25 (slot 26): Week 7 — Lower Body [DELOAD]
Tab 2, slotIndex 26 (slot 27): Week 7 — Upper Body Pull [DELOAD]
Tab 2, slotIndex 27 (slot 28): Week 7 — Full Body [DELOAD]
```

---

## Section 15 — Quality Standards

A program that passes all technical validation (Section 16, Groups A and B) but fails these criteria is not ready to publish. All 7 criteria must be satisfied. Quality review requires a second reviewer — not the author.

### QC-1 — Exercise Selection Reflects the Primary Training Stimulus

Every MAIN exercise can be directly justified by the program's category and goal alignment. A STRENGTH BEGINNER program does not include more than one machine isolation exercise per session. A HYPERTROPHY program does not rely on 1RM-style heavy singles as the primary stimulus. A CONDITIONING BEGINNER program does not use exercises that require technical coaching unavailable to a self-directed athlete.

**Test:** For each exercise in the MAIN section, the reviewer should be able to state in one sentence why this exercise belongs here. If no clear reason exists, the exercise does not belong.

### QC-2 — Progression Is Visible Across the Slot Sequence

Comparing Week 1 prescriptions to Week 4 prescriptions to the peak week should show measurable change in load, volume, or intensity. A program where every session carries identical prescriptions is a workout template repeated, not a program.

**Test:** Compare the prescription for the same primary exercise in Week 1 vs. Week 4 vs. the penultimate training week. If the values are identical, the program lacks progression.

### QC-3 — Session Balance Is Maintained

No single movement pattern dominates to the exclusion of its opposing pattern across the week's sessions. A week with four horizontal press exercises and no horizontal pulling is unbalanced. A strength program that trains lower body once and upper body three times per week is structurally imbalanced.

**Test:** Map each MAIN section exercise to its movement pattern (Section 3.1 for category guidance; exercise library for pattern data). Confirm the week's pattern distribution is defensible by training principles.

### QC-4 — Level Is Accurately Represented

BEGINNER programs do not include exercises requiring high technical proficiency or coaching to perform safely: barbell snatches, complex gymnastics (muscle-up, L-sit), heavy Olympic lifts, advanced plyometrics without progressions. ADVANCED programs may assume foundational technique and can prescribe complex movements, high intensity, and advanced periodization.

**Test:** Take the role of an athlete at the stated level. Read through the first week's session. Would a real athlete at this level be able to execute this session safely and productively on their own?

### QC-5 — The Athlete Can Execute Without External Instruction

A real athlete running this program from the slot prescriptions and notes should not need an external resource (PDF, YouTube video, coach) to understand what to do, in what order, for how many sets and reps. Notes fields are used where needed. The program is self-contained.

**Test:** Read through one complete session as if encountering the program for the first time. Identify any point requiring external reference. That point is a gap.

### QC-6 — Environment Matches the Equipment Required

Every exercise in the program can be performed in the stated environment. GYM programs require no home equipment a commercial gym would not provide. HOME programs require no equipment beyond bodyweight, bands, pull-up bar, and limited dumbbells. OUTDOOR programs require no equipment. MIXED programs explicitly indicate which sessions require gym equipment and which do not.

**Test:** List every piece of equipment required by every exercise in the program. Confirm the equipment list matches the program's `environment` field.

### QC-7 — The Program Has a Coherent Narrative Arc

Week 1 introduces the core movements at a manageable entry point. The middle weeks accumulate training stress. The peak weeks test or demonstrate the adaptation. Deloads occur at the right position. The final session completes something — it does not end arbitrarily.

**Test:** Read the slot names in order from Week 1 through the final week. Does the sequence tell a coherent story of escalating challenge and purposeful completion?

---

## Section 16 — Pre-Import Validation Checklist

Complete this checklist before exporting CSV and submitting to the import tool. Groups A and B: completed by the author. Group C: completed by a second reviewer, not the author.

### Group A — Automated (Import Tool Will Catch These)

- [ ] Description is 60–120 characters (verify using the helper column formula; do not estimate visually)
- [ ] Slot count in Tab 3 equals `durationWeeks × workoutsPerWeek` (count distinct `slotIndex` values)
- [ ] No duplicate program name among published programs
- [ ] `successorProgramName` matches the exact locked canonical name from Section 13 (or is blank for terminal programs)
- [ ] All enum values are uppercase: `STRENGTH` not `Strength`; `BEGINNER` not `beginner`; `GYM` not `Gym`
- [ ] All `distanceValue` and `distanceUnit` pairs are co-present or co-absent
- [ ] `isFeatured` is `TRUE` for Strength Foundation I and Bodyweight Foundation; `FALSE` for all others
- [ ] `sortOrder` matches the locked value in Section 13

### Group B — Content (Human Review by Author)

- [ ] Description passes all content rules: one sentence, gender-neutral, athlete-centered, no outcome promises, no brand names, no appearance-focused language
- [ ] All exercise names in Tab 3 exist in the exercise library (verify before submitting; the import tool catches mismatches but catching them early saves re-import cycles)
- [ ] RPE notes (if present) comply with PAS-D3 and PAS-D5: INTERMEDIATE or ADVANCED STRENGTH or HYPERTROPHY only; exact format `RPE [value]`; no other content in the same notes field when RPE is present
- [ ] Rep range upper bounds are encoded in `notes` using the standard format: `Rep target: [min]–[max]. Add weight when all sets reach [max].`
- [ ] All slots in deload weeks are tagged with `[DELOAD]` in the slot name per PAS-D8
- [ ] WARM_UP sections are present where required per PAS-D9, and are authored as proper `WARM_UP` section rows (not notes on MAIN exercises)
- [ ] COOL_DOWN sections are present where required per PAS-D9
- [ ] Volume guardrails (Section 10.1) are satisfied, or a written deviation note exists in the authoring sheet
- [ ] Estimated session duration falls within the category range in Section 10.2, or a written deviation note explains why
- [ ] No exercise appears more than once within the same section of the same slot
- [ ] Weight units (`lbs` or `kg`) are consistent across all slots within the program

### Group C — Quality (Second Reviewer; Not the Author)

- [ ] QC-1: Every MAIN exercise can be justified against the program's category and goal alignment
- [ ] QC-2: Progression is visible when comparing Week 1, Week 4, and the penultimate training week for the same primary exercise
- [ ] QC-3: No movement pattern dominates the weekly structure without its opposing pattern
- [ ] QC-4: A real athlete at the stated level can safely and productively execute the first week without external coaching
- [ ] QC-5: The first complete session is fully self-contained; no point requires an external resource
- [ ] QC-6: Every exercise can be performed in the stated environment; no equipment mismatch
- [ ] QC-7: The slot name sequence tells a coherent narrative arc from foundation through peak completion

---

## Section 17 — Import Process and Publish Gate

### 17.1 Step-by-Step Workflow

1. Author completes the Google Sheets template (Tabs 1, 2, and 3)
2. Author completes Groups A and B of the Pre-Import Checklist (Section 16)
3. Second reviewer completes Group C
4. Author exports Tab 1 and Tab 3 as separate CSVs per the import tool's expected input format
5. Admin submits the CSVs to the Forge Admin Import Tool
6. Import tool runs automated validation: description length, `totalWorkouts` math, enum values, name uniqueness, successor name resolution, co-presence rules for `distanceValue`/`distanceUnit`
7. On validation failure: the tool produces an error report with field and row references. Author corrects errors **in the Google Sheet**, re-exports, and re-submits. Never patch the CSV directly.
8. On validation success: a draft `ProgramDefinition` is created with `publishedAt: null`. The program is invisible in W-2.
9. Product team reviews the draft: checks exercise display, slot structure, section ordering, prescription values, succession links, description render
10. Product team approves and sets `publishedAt`. The program becomes visible in W-2.

### 17.2 Succession Import Order

The import tool resolves `successorProgramName` to a `successorProgramId` UUID. The referenced successor must already exist in the database at import time.

**Recommended order for the initial batch:** Import terminal programs first (those with no successor). Then import programs that reference them.

**Terminal programs to import first:** Strength Foundation III (Sort 3), Powerbuilding Intermediate (Sort 5), Hypertrophy Advanced (Sort 8), Lower Body Intermediate (Sort 10), Running Base II (Sort 12), Conditioning Intermediate (Sort 15), Body Recomposition Intermediate (Sort 16), Hybrid Intermediate (Sort 18), Bodyweight Performance (Sort 21), Home Conditioning (Sort 22), Home Strength Foundation (Sort 23), Mobility Intermediate (Sort 25).

### 17.3 Draft Review Criteria

During product team draft review, verify:
- No unresolved `[Unknown Exercise]` placeholders
- Section headers render correctly in the admin interface
- Succession link resolves to the correct program
- Description renders within the 60–120 character visual space
- Slot names are clear and appropriately structured for the athlete experience

---

## Section 18 — Post-Publish Governance

### 18.1 Content Corrections

**Minor corrections** (typos in `notes`, slot name wording, description copy errors that do not alter training intent): product team judgment call. If the correction does not affect any athlete's active or future instance data, the existing `ProgramDefinition` record may be edited directly. Document the correction in a change log maintained alongside this document.

**Structural corrections** (exercise prescriptions changed, exercises added or removed, progression model altered): a new `ProgramDefinition` record is required with version `v1.1`. The original `v1.0` record is preserved. Athletes with active or future instances of `v1.0` continue on `v1.0` (Program-Catalog-Architecture-v1.0.md §4.5 — History Cannot Be Rewritten).

### 18.2 New Catalog Additions

Programs added to the catalog beyond the initial 25 must:
1. Pass the catalog expansion policy gate (Program-Catalog-Architecture-v1.0.md §5.4)
2. Satisfy family cap governance if adding to an existing family with 5 programs (Program-Ecosystem-Architecture-v1.0.md §2.2)
3. Comply with all PAS authoring standards in this document
4. Complete the full import-to-publish workflow (Section 17)

### 18.3 PAS Amendments

Changes to this document follow the amendment pattern established across all Forge architecture documents. Amendments are numbered sequentially: PAS-Amendment-001, PAS-Amendment-002, etc. Each amendment is a separate document referencing the section(s) it supersedes or extends. The change log (Section 21) records all amendments applied.

### 18.4 PAS-R1 — Difficulty Calibration Audit (Pre-Launch Governance Activity)

After all 25 launch programs are authored and imported as drafts — **before any program is published** — perform a catalog-wide difficulty calibration audit.

**Purpose:** Verify cross-category level consistency. Confirm that `BEGINNER` means the same thing in `STRENGTH` as in `CYCLING` as in `MOBILITY`, and likewise for `INTERMEDIATE` and `ADVANCED`. Programs authored sequentially or in parallel can develop subtle level drift that is only visible when the full catalog is viewed together.

**Trigger:** All 25 programs exist as drafts in the admin system. No program has been published yet.

**Output:** A written finding confirming cross-category level consistency, or a set of targeted corrections to program levels (and affected descriptions) before publish.

**Owner:** Product team.

This is not a PAS amendment and requires no decision ID. It is a one-time pre-launch governance checkpoint. If the audit finds level drift, corrections are made to the affected draft programs before publish — no existing athlete instances are affected, because nothing is published yet at audit time.

---

## Section 19 — Non-Behaviors

The Program Authoring Standard does NOT:

| Non-Behavior | Reason |
|-------------|--------|
| Write any of the 25 programs | The PAS is the rulebook; the programs are the content |
| Define exercise library content | Governed by Exercise-Library-Architecture-v1.0.md and the FORGE exercise catalog |
| Create code or schema changes | Schema is locked in the authority documents |
| Define a public program marketplace | Post-MVP; requires separate architecture |
| Define AI-generated program creation | Post-MVP; requires separate architecture |
| Define the import tool's internal implementation | Governed by Program-Ecosystem-Architecture-v1.0.md §6 |
| Apply to athlete-created programs (`source: 'ATHLETE_CREATED'`) | Governed by W-4 and the athlete experience |
| Apply to imported programs (`source: 'IMPORTED'`) | Imported programs arrive without taxonomy; enriched post-import via W-5 |
| Define succession branching | Succession is one-to-one; branching paths are not supported |
| Govern program ratings, reviews, or social proof | Prohibited by Product DNA regardless of this standard |

---

## Section 20 — Architecture Decisions

| Decision | Rule |
|----------|------|
| **PAS-D1 — Program Naming Pattern** | Forge program names follow a two-part structure: `[Methodology or Subject] [Tier Descriptor]`. Tier descriptor vocabulary is controlled: Foundation (BEGINNER entry point to a family), Base (cardio/endurance BEGINNER entry), Development (cardio/endurance INTERMEDIATE), Intermediate (INTERMEDIATE in any category), Advanced (ADVANCED in any category), Roman numerals (I, II, III) for sequential programs in the same methodology at escalating levels. No superlatives, branded methodology names, gendered terms, or abbreviations in canonical names. Authoring target: ≤ 40 characters; 60-character hard limit enforced at import. |
| **PAS-D2 — Description Sentence Structure** | Descriptions follow the template: `[Level/Audience signal] + [primary training focus] + [structural signature or methodology hook]`. At least two of the three elements must be present. One sentence, 60–120 characters. Athlete-centered verbs ("builds," "develops," "trains") — not coach-voice ("teaches you to build," "helps you develop"). |
| **PAS-D3 — RPE Encoding for MVP** | RPE guidance is encoded in the `notes` field only. No schema amendment for an `rpe` field in MVP. Permitted only in STRENGTH and HYPERTROPHY programs at INTERMEDIATE and ADVANCED levels. Not permitted in BEGINNER programs or any other category. The notes encoding is explicitly a temporary MVP accommodation — PAS-D12 is the forward reference for the correct long-term solution. |
| **PAS-D4 — Tempo Excluded from MVP Programs** | Tempo notation is not used in any MVP Forge program. Independent author encoding choices produce inconsistent results at scale. The 200-character `notes` field is insufficient for reliable tempo encoding. Tempo prescription is a post-MVP authoring capability requiring a schema amendment and standardized display behavior. |
| **PAS-D5 — RPE Format Enforcement** | When RPE is encoded in `notes`, the exact format is: `RPE [integer or integer–integer range]` (e.g., `RPE 8`, `RPE 7–8`). No other prefix, punctuation, or surrounding content is permitted in the same `notes` field when RPE is present. This format supports future machine parsing when a dedicated `rpe` field is added post-MVP. |
| **PAS-D6 — Five Approved Progression Models** | Approved models for MVP: (1) Linear Progression — STRENGTH BEGINNER, FULL_BODY, CONDITIONING BEGINNER; (2) Double Progression — HYPERTROPHY all levels, STRENGTH INTERMEDIATE/ADVANCED, CONDITIONING INTERMEDIATE; (3) Block Periodization — STRENGTH ADVANCED, HYPERTROPHY ADVANCED, RUNNING all levels, CYCLING all levels; (4) Volume Accumulation — HYPERTROPHY BEGINNER/INTERMEDIATE (layered), COMBAT_SPORTS; (5) Time-Based Progression — MOBILITY all levels, cardio interval elements. Additional progression models require a PAS amendment before use in Forge programs. |
| **PAS-D7 — Deload Requirements by Program Length** | 4–6 weeks: no mandatory deload; optional at author's discretion. 7–10 weeks: one mandatory deload at the penultimate week, leaving the final week as peak. 11–14 weeks: two mandatory deloads — first at Week 4 (concluding the opening mesocycle), second at the penultimate week, leaving the final week as peak. |
| **PAS-D8 — Deload Encoding Convention** | Deload weeks are encoded by: (1) including `[DELOAD]` in every slot name for the deload week; (2) reducing `sets` on primary compound exercises by 40–50% compared to the preceding week's equivalent session; (3) maintaining the same `workoutsPerWeek` as all other weeks; (4) using the same exercises as the preceding week's equivalent session (no new exercise introductions in deload weeks). Weight values are held at the previous week's level or reduced 10–15%. |
| **PAS-D9 — WARM_UP and COOL_DOWN Requirements by Category** | WARM_UP section required: STRENGTH, HYPERTROPHY, CONDITIONING, RUNNING, CYCLING, COMBAT_SPORTS, FULL_BODY. COOL_DOWN section required: CONDITIONING, RUNNING, CYCLING, COMBAT_SPORTS. MOBILITY programs use MAIN only — no WARM_UP or COOL_DOWN sections. WARM_UP and COOL_DOWN are optional (not prohibited) for STRENGTH, HYPERTROPHY, and FULL_BODY cooldowns. |
| **PAS-D10 — Warm-Up Must Use the WARM_UP Section** | Warm-up exercises for Forge programs must be authored as a proper `WARM_UP` section with `ExercisePrescription` rows. Warm-up content must not be encoded as `notes` on MAIN section exercises or as free text in slot names. This ensures W-9 renders section headers correctly, prescription data is complete, and athletes see a clearly structured session layout in-app. |
| **PAS-D11 — Volume Guardrails by Category** | Permitted MAIN section ranges: STRENGTH 4–6 exercises / 15–25 sets; HYPERTROPHY 5–8 / 18–30; CONDITIONING 4–8 / 12–24; RUNNING 1–3 duration-based; CYCLING 1–3 duration-based; COMBAT_SPORTS 4–7 / 12–20; FULL_BODY 4–7 / 12–20; MOBILITY 5–10 duration-based holds. Programs outside these ranges require a written deviation justification in the authoring sheet, confirmed by the quality reviewer. |
| **PAS-D12 — Post-MVP RPE Field Amendment (Forward Reference)** | A dedicated `rpe: integer \| null` field on `ExercisePrescription` is the correct long-term solution for intensity prescription in STRENGTH and HYPERTROPHY programs. PAS-D3's `notes` encoding is explicitly temporary. This schema amendment — cascading through the import pipeline, W-9, W-24, and W-19 — is recommended as the first post-launch prescription enhancement. When implemented, MVP programs with RPE in `notes` should be reviewed and migrated via a `v1.1` version update. |

---

## Section 21 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.1 | June 2026 | Catalog Revision Amendment applied. Updated Section 13 reference table: removed Cycling Base (Sort 11), Cycling Development (Sort 12), Combat Foundation (Sort 19), Combat Conditioning (Sort 20); added Lower Body Foundation (Sort 9), Lower Body Intermediate (Sort 10), Bodyweight Performance (Sort 21), Home Strength Foundation (Sort 23); renumbered Running Base I/II to Sorts 11/12; updated Bodyweight Foundation to Sort 19 and Bodyweight Strength to Sort 20 with new successor. Updated Section 14 deload schedules: removed Cycling and Combat rows; added Lower Body Foundation, Lower Body Intermediate, Bodyweight Performance, Home Strength Foundation deload schedules. Updated terminal programs list (§13). Updated succession import order (§17.2). Updated Section 7 Model 3 programs list (removed Cycling programs); updated Model 4 programs list (removed Combat programs, added Lower Body Foundation/Intermediate). Status: LOCKED. |
| v1.0 | June 2026 | Initial specification. Defines the Program Authoring Standard governing all 25 Forge Legacy launch programs. Introduces PAS-D1 through PAS-D12. Covers: program naming pattern (PAS-D1), description sentence structure (PAS-D2), RPE and tempo handling for MVP (PAS-D3, PAS-D4, PAS-D5, PAS-D12), five approved progression models (PAS-D6), deload architecture (PAS-D7, PAS-D8), warm-up and cooldown requirements by category (PAS-D9, PAS-D10), volume guardrails by category (PAS-D11), session duration quality guidelines (Section 10.2 — no decision ID; quality-review tier), Google Sheets authoring template column specification (Section 12), 25-program reference table with computed totals (Section 13), per-program deload schedules with 1-based and 0-based slot indices (Section 14), seven quality criteria with testable pass conditions (Section 15), pre-import validation checklist in three groups (Section 16), import-to-publish workflow and succession import order (Section 17), post-publish governance including PAS-R1 Difficulty Calibration Audit pre-launch checkpoint (Section 18). Authority for all Forge program authoring, validation, and import workflows. |

---

*Forge Legacy — Program Authoring Standard — v1.1*
*June 2026*
*Internal authority for all `source: 'FORGE'` program authoring, validation, and import.*
*Implements PC-D4, PC-D7, PC-D9. Operationalizes the import pipeline defined in Program-Ecosystem-Architecture-v1.0.md §6. Extends ExercisePrescription-Amendment-001.md with authoring guidance. Records PAS-R1 Difficulty Calibration Audit as the pre-launch catalog governance checkpoint.*
