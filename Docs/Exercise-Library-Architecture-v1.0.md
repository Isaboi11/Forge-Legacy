# Forge Legacy — Exercise Library & Custom Workout Builder Architecture
## Version 1.1 | June 2026

**Status:** LOCKED
**Authority:** Program-Catalog-Architecture-v1.0.md (LOCKED), Program-Ecosystem-Architecture-v1.0.md (LOCKED), Exercise-Detail-Wireframe-Spec-W22.md (LOCKED), Exercise-Picker-Wireframe-Spec-W23.md (LOCKED), Workout-Builder-Wireframe-Spec-W24.md (LOCKED), Active-Workout-Flow-Spec-W9-W16.md (LOCKED), Architecture-Amendment-001-Import.md (LOCKED), Product DNA (LOCKED)
**Amendment history:** R1-1 (HINGE merged into LEGS_AND_GLUTES), R1-2 (progressionExerciseIds + regressionExerciseIds added), R1-3 (HOME_GYM rejected; Athlete Equipment Profile noted as non-MVP) — all applied before lock.
**Downstream impact:** W-21 (Exercise Library Hub — unspecced, uses category list from this document), W-23 (Exercise Picker — browse category list updated per R1-1), W-25 (Free Workout Builder — new, unspecced), W-26 (Workout Templates Hub — new, unspecced), W-27 (Template Detail — new, unspecced)

---

## Section 1 — Purpose

This document is the authoritative architecture for the Forge Legacy Exercise Library and Custom Workout Builder systems. It defines:

1. The complete `ExerciseDefinition` data model, including all taxonomy fields
2. The `ExerciseCategory`, `MovementPattern`, `MuscleGroup`, `EquipmentTag`, and `EnvironmentTag` taxonomies
3. The exercise library scope at MVP launch
4. The `WorkoutTemplate` entity and its lifecycle
5. The Free Workout data model and session derivation rules
6. The Custom Workout Creation flow and its three entry points
7. All architecture decisions for these systems

This document does not define wireframes or UI. It defines the data model and behavioral rules that wireframes must implement.

All workout, program, and session behavior not covered here continues to be governed by the locked authority documents listed above.

**Product DNA principles honored:**
- Premium, organized, coach-created: every FORGE exercise has complete educational content before shipping; no orphaned exercises
- Beginner-friendly: taxonomy is plain-language, never fitness-industry jargon at the browse layer
- No exercise overload: a curated library, not a database
- History immutability: exercise names snapshot at log time; deleted exercises preserved as "[Deleted Exercise]"
- Copy-semantics: templates carry their own exercise data; no live references

---

## Section 2 — ExerciseDefinition Complete Data Model

### 2.1 ExerciseDefinition Schema

The authoritative exercise entity. Extends the W-22 display fields with source, authorship, taxonomy, progression relationships, environment compatibility, and lifecycle fields.

```
ExerciseDefinition {
  // Identity
  id:                       uuid
  name:                     string              // display name; max 60 chars; unique within source

  // Source and authorship
  source:                   'FORGE' | 'CUSTOM'  // immutable after creation
  authorId:                 uuid | null          // null for FORGE; set to athleteId for CUSTOM

  // Taxonomy
  category:                 ExerciseCategory | null   // required for FORGE; optional for CUSTOM
  movementPattern:          MovementPattern | null    // required for FORGE; null for CUSTOM
  primaryMuscles:           MuscleGroup[]             // min 1 for FORGE; optional for CUSTOM
  secondaryMuscles:         MuscleGroup[]             // always populated for FORGE; may be empty
  difficulty:               'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null  // null for CUSTOM
  equipment:                EquipmentTag[]            // min 1 for FORGE ([BODYWEIGHT] is valid); optional for CUSTOM
  environmentTags:          EnvironmentTag[]          // multi-value; required for FORGE; optional for CUSTOM

  // Educational content
  // FORGE: all fields required before isActive: true
  // CUSTOM: all fields optional; null if not provided at creation
  description:              string | null             // 1–3 sentences; what the exercise is
  whyItMatters:             string | null             // 1–4 sentences; why an athlete would do it
  instructions:             string[]                  // 4–8 ordered steps (FORGE); empty for CUSTOM
  tips:                     string[]                  // 2–5 coaching cues (FORGE); empty for CUSTOM
  commonMistakes:           string[]                  // 2–4 common mistakes (FORGE); empty for CUSTOM

  // Media
  gifUrl:                   string | null
  gifThumbnailUrl:          string | null
  videoUrl:                 string | null
  imageUrl:                 string | null

  // Exercise relationships
  alternativeExerciseIds:   uuid[]   // same-difficulty substitutes; bidirectional (§ 2.3); FORGE only
  progressionExerciseIds:   uuid[]   // harder versions of this exercise (§ 2.4); FORGE only; CUSTOM: always []
  regressionExerciseIds:    uuid[]   // easier versions of this exercise (§ 2.4); FORGE only; CUSTOM: always []

  // Lifecycle
  isActive:                 boolean  // true = visible in catalog; false = soft-deleted (CUSTOM only)
  createdAt:                timestamp
  updatedAt:                timestamp
}
```

`isFavorite` is **NOT** a field on `ExerciseDefinition`. It is computed per-athlete at query time from the `UserFavoriteExercise` join table. See § 2.5.

### 2.2 Source Semantics

**FORGE exercises:**
- Authored by the Forge Legacy product/content team
- All required fields populated before `isActive: true`
- Never hard-deleted; `isActive` never set to false (FORGE exercises are permanent catalog members)
- Content updates (editing description, instructions, tips) do not create new exercise records; exercises do not version the way programs do
- Shared globally: one record serves all athletes

**CUSTOM exercises:**
- Authored by a single athlete (`authorId` = that athlete's uuid)
- Only `name` is required at creation (min 1 non-whitespace character, max 60 characters); all other fields optional/null
- Visible only to their author in W-23 and W-21
- Soft-deletable: athlete may delete, which sets `isActive: false`
- When `isActive: false`: the exercise no longer appears in W-23 or W-21. Any `ExercisePrescription` or `ExerciseLog` records referencing this exercise are preserved; forward-looking surfaces (W-24, W-9) display "[Deleted Exercise]" for live references; historical log records show the snapshotted name (§ 2.7).

**The source field is immutable after creation.** A CUSTOM exercise cannot become a FORGE exercise. If the content team promotes a community-created concept to the catalog, they create a new FORGE exercise record.

### 2.3 Alternative Exercises Model

`alternativeExerciseIds[]` contains same-difficulty exercises that serve a similar training purpose — substitutes, not progressions.

The relationship is **bidirectional**: Exercise B is an alternative of A if `A.alternativeExerciseIds.includes(B.id)` OR `B.alternativeExerciseIds.includes(A.id)`. W-22 resolves the complete bidirectional set at display time (per W-22 §12.6, LOCKED).

Rules:
- Set only on FORGE exercises; CUSTOM exercises have empty arrays
- Not auto-derived: if A lists B as an alternative, B does not automatically list A (but the bidirectional resolution makes this appear symmetric to users)
- No hard maximum; editorial judgment governs count

### 2.4 Progression and Regression Model

`progressionExerciseIds[]` and `regressionExerciseIds[]` encode difficulty-adjacent relationships:

| Array | Meaning | Example |
|-------|---------|---------|
| `progressionExerciseIds` | Harder versions of this exercise; what comes next | Push-Up → Decline Push-Up, Weighted Push-Up |
| `regressionExerciseIds` | Easier/modified versions; modifications when this is too hard | Push-Up → Incline Push-Up, Wall Push-Up |
| `alternativeExerciseIds` | Same-difficulty substitutes; different execution, similar effect | Push-Up → Dumbbell Bench Press |

**Directionality:** These relationships are directional, not bidirectional. If Push-Up.progressionIds = [Decline Push-Up], and Decline Push-Up.regressionIds = [Push-Up], those are two explicitly authored entries. The system does NOT auto-derive: adding B to A.progressionIds does not automatically add A to B.regressionIds. Both directions must be explicitly set by the content team.

**Rules:**
- Set only on FORGE exercises; CUSTOM exercises always have empty arrays for both fields
- Recommended maximum: 1–3 entries per array; more than 3 suggests the taxonomy needs refinement
- The three relationship arrays (`alternativeExerciseIds`, `progressionExerciseIds`, `regressionExerciseIds`) are independent and non-overlapping in intent; an exercise should not appear in more than one of these arrays on the same exercise
- No MVP UI surfaces these fields (see EL-D12)
- MVP content target: populate progressions and regressions for the 40–50 anchor exercises before ship (foundational movements: Push-Up, Squat, Deadlift, Pull-Up, Bench Press, Overhead Press, Plank, Hip Thrust, Lunge, Dumbbell Row, etc.); remaining exercises filled in first post-MVP content cycle

### 2.5 isFavorite as Computed Join

`isFavorite` is NOT stored on `ExerciseDefinition`. It is computed per-athlete at query time from a dedicated join table:

```
UserFavoriteExercise {
  athleteId:    uuid
  exerciseId:   uuid
  createdAt:    timestamp
}
```

When the app queries exercises for W-21 or W-23, it joins this table for the requesting athlete to resolve `isFavorite`. A single `ExerciseDefinition` may be favorited by 0 to N athletes simultaneously with no schema conflict. This model also supports W-23's offline favorite-toggle behavior (changes queued for sync).

### 2.6 Deletion Semantics

| Source | Can `isActive` be set to false? | History behavior |
|--------|--------------------------------|-----------------|
| FORGE  | No — FORGE exercises are permanent catalog members | N/A |
| CUSTOM | Yes — athlete may delete their custom exercise | `ExercisePrescription` and `ExerciseLog` records referencing the deleted exercise are retained. Forward-looking surfaces show "[Deleted Exercise]". Historical log records retain the snapshotted exercise name (§ 2.7). |

"[Deleted Exercise]" is the system-wide tombstone label for live references to `isActive: false` CUSTOM exercises. It appears where the exercise name would appear, in muted secondary text. The prescription data (sets, reps, weight) is retained and displayed read-only. This behavior is already defined in W-24 §6.4 (LOCKED); this architecture formalizes it as the system-wide rule.

### 2.7 History Immutability and Name Snapshotting

When an `ExerciseLog` record is written (a set is logged in W-9), the exercise name is snapshotted onto the log record at write time:

```
ExerciseLog {
  exerciseId:    uuid
  exerciseName:  string   // SNAPSHOTTED at log time; never updated
  // ... sets, reps, weight, etc.
}
```

If an exercise is renamed or deleted after a session is logged, the historical session record (W-18, W-19) shows the name as it was at log time. The "[Deleted Exercise]" tombstone applies only to forward-looking surfaces where the exercise reference is live (W-24 builder, W-9 live session from a pre-built slot) — not to historical log records.

---

## Section 3 — ExerciseCategory Taxonomy

### 3.1 Design Principles

- Exactly **6 categories** at MVP
- Plain-language display names that a beginner understands without prior fitness knowledge
- Every FORGE exercise has exactly one category; CUSTOM exercises have an optional category (may be null)
- Categories describe the exercise's primary mechanical and functional role, not the muscles it targets (muscle targeting is handled by `MuscleGroup`)
- No overlap: category assignment for any exercise is unambiguous
- The browse layer (W-21, W-23 default view) is organized by these categories. The precision of the MovementPattern taxonomy (21 values) serves internal systems — not athlete-facing browse.

**R1-1 note:** HINGE was removed as a top-level ExerciseCategory before lock. All hip-dominant exercises (deadlifts, Romanian deadlifts, hip thrusts, glute bridges, kettlebell swings, good mornings) are assigned to `LEGS_AND_GLUTES`. The HINGE distinction is preserved at the `MovementPattern` level (see § 4) for program design, AI coaching, and W-23 filtering logic. The W-23 wireframe spec (v1.0 §9) shows an illustrative category list that predates R1-1; the actual browse categories are governed by this document. No structural W-23 behavior change is required — only the category list data changes.

### 3.2 ExerciseCategory Enum

```
type ExerciseCategory =
  | 'PUSH'            // Push (Upper Body)
  | 'PULL'            // Pull (Upper Body)
  | 'LEGS_AND_GLUTES' // Legs & Glutes
  | 'CORE'            // Core & Stability
  | 'FULL_BODY'       // Carry & Full Body
  | 'MOBILITY'        // Mobility & Flexibility
```

### 3.3 Category Definitions and Display Names

| Enum | Display Name | What It Covers | Examples |
|------|-------------|----------------|---------|
| `PUSH` | Push (Upper Body) | Horizontal, vertical, and diagonal pressing movements; chest, shoulder, and tricep primary movers | Bench Press, Overhead Press, Push-Up, Incline DB Press, Cable Fly, Pike Push-Up, Dip |
| `PULL` | Pull (Upper Body) | Horizontal and vertical pulling movements; back and bicep primary movers | Pull-Up, Barbell Row, Lat Pulldown, Cable Row, Face Pull, Barbell Curl, Hammer Curl |
| `LEGS_AND_GLUTES` | Legs & Glutes | All lower-body movements — both knee-dominant (squat, lunge) and hip-dominant (deadlift, hip thrust, RDL) patterns | Back Squat, Romanian Deadlift, Hip Thrust, Lunge, Bulgarian Split Squat, Leg Press, Glute Bridge, Kettlebell Swing, Good Morning |
| `CORE` | Core & Stability | Spinal stability, anti-rotation, and core endurance movements | Plank, Dead Bug, Pallof Press, Ab Wheel, Bird Dog, Hollow Body Hold, Hanging Leg Raise, Russian Twist |
| `FULL_BODY` | Carry & Full Body | Multi-joint, explosive, locomotion, and carry movements that do not fit a single upper/lower pattern | Farmer Carry, Sled Push, Burpee, Turkish Get-Up, Clean, Battle Ropes, Rowing Machine, Box Jump |
| `MOBILITY` | Mobility & Flexibility | Stretching, joint mobility, yoga poses, foam rolling, and breathing exercises | Hip Flexor Stretch, Pigeon Pose, Cat-Cow, Thoracic Rotation, Foam Roll Quads, Box Breathing |

### 3.4 Assignment Rules

- LEGS_AND_GLUTES covers all lower-body loading, regardless of whether the primary pattern is knee-dominant (squat, lunge) or hip-dominant (deadlift, hip thrust). The MovementPattern field (SQUAT vs. HINGE) carries this distinction for internal systems.
- A Kettlebell Swing is `LEGS_AND_GLUTES` (primary mover: glutes and hamstrings via hip hinge) despite its full-body character.
- An Olympic lift (Clean & Jerk, Snatch) is `FULL_BODY` — these are genuinely multi-joint with no dominant single-pattern classification.
- A Battle Ropes drill belongs in `FULL_BODY` — the upper body is involved but the exercise is metabolic and full-body, not a pressing or pulling movement.
- Yoga poses and passive stretches always belong in `MOBILITY` regardless of effort.
- When an exercise is borderline between two categories, assign to the category describing the primary mechanical stimulus (the musculature doing the most work during the heaviest portion of the movement).

---

## Section 4 — MovementPattern Taxonomy

### 4.1 Design Principles

- `MovementPattern` is a **sub-taxonomy beneath ExerciseCategory**, providing the mechanical precision that ExerciseCategory trades for readability
- Primary uses: (1) W-23 MOBILITY/YOGA context catalog filtering, (2) future program balance recommendations, (3) exercise alternatives and progression derivation
- **Not displayed to athletes** in W-22 (per W22-D5, LOCKED) or W-23 (per W23 architecture)
- Every FORGE exercise has exactly one `movementPattern`; CUSTOM exercises have `movementPattern: null` unless the athlete sets it (never required)

### 4.2 MovementPattern Enum

```
type MovementPattern =
  // Push patterns
  | 'PUSH_HORIZONTAL'      // Bench Press, Push-Up, Cable Crossover, DB Chest Press
  | 'PUSH_VERTICAL'        // Overhead Press, DB Shoulder Press, Handstand Push-Up
  | 'PUSH_DIAGONAL'        // Incline Press, Landmine Press, Arnold Press

  // Pull patterns
  | 'PULL_HORIZONTAL'      // Barbell Row, Cable Row, DB Row, Face Pull, Seal Row
  | 'PULL_VERTICAL'        // Pull-Up, Lat Pulldown, Chin-Up, Cable Pullover
  | 'PULL_CURL'            // Bicep Curl, Hammer Curl, Reverse Curl, Preacher Curl

  // Lower body patterns
  | 'SQUAT'                // Back Squat, Front Squat, Goblet Squat, Lunge, Split Squat, Leg Press
  | 'HINGE'                // Deadlift, Romanian Deadlift, Good Morning, Hip Thrust, Glute Bridge, KB Swing
  | 'KNEE_ISOLATION'       // Leg Extension, Leg Curl, Calf Raise — machine/isolation movements
  | 'PLYOMETRIC_LOWER'     // Box Jump, Jump Squat, Broad Jump, Sprint Drill, Bounding

  // Core patterns
  | 'CORE_ANTI_EXTENSION'  // Plank, Ab Wheel, Dead Bug — resisting spinal extension under load
  | 'CORE_ANTI_ROTATION'   // Pallof Press, single-arm variations requiring rotation resistance
  | 'CORE_FLEXION'         // Crunch, Hanging Leg Raise, V-Up — spinal flexion under control
  | 'CORE_ROTATION'        // Russian Twist, Wood Chop, Med Ball Rotational Throw

  // Full body / carry patterns
  | 'CARRY'                // Farmer Carry, Suitcase Carry, Overhead Carry
  | 'EXPLOSIVE_FULLBODY'   // Clean, Snatch, Thruster, Burpee, Battle Ropes, Sled Push

  // Mobility patterns — the set used by W-23 for MOBILITY/YOGA context filtering
  | 'STRETCH_STATIC'       // Hip Flexor Stretch, Pigeon Pose, Hamstring Stretch — held positions
  | 'STRETCH_DYNAMIC'      // Leg Swing, Arm Circle, World's Greatest Stretch — moving through range
  | 'JOINT_MOBILITY'       // Cat-Cow, Thoracic Rotation, Ankle Circles, Hip 90/90 — joint articulation
  | 'FOAM_ROLL'            // Foam Roll Quads, Lacrosse Ball Glute — tissue work
  | 'BREATHWORK'           // Box Breathing, Diaphragmatic Breathing — breathing-specific
```

Total: 21 movement patterns.

### 4.3 W-23 Mobility Context Filter

When W-23 is opened with `activityType: MOBILITY` or `activityType: YOGA` (per W-23 §4.3, LOCKED), the catalog is filtered to exercises where `movementPattern` is any of:

```
STRETCH_STATIC | STRETCH_DYNAMIC | JOINT_MOBILITY | FOAM_ROLL | BREATHWORK
```

This set is fixed in the W-23 context filter logic. It excludes all push, pull, lower-body, core, and full-body patterns — even if a coach might occasionally use a hip-hinge drill in a mobility context. If the content team wants a movement to appear in the MOBILITY/YOGA picker, it must be assigned one of the five mobility movement patterns.

**CUSTOM exercises with `movementPattern: null` are included in the mobility-filtered catalog** (per W-23 §4.3, LOCKED: the athlete created them, they decide if they are appropriate).

---

## Section 5 — MuscleGroup Taxonomy

### 5.1 Design Principles

- 14 muscle groups — comprehensive enough to cover all training targets, simple enough for filter chips in W-23 and educational chips in W-22
- Plain anatomical language that a beginner can map to their body; no clinical terminology
- Non-redundant: no two groups cover the same tissue
- Consistent with the display chips in W-22 (§ 6.2–6.3, LOCKED) and the MUSCLE GROUP filter in W-23 (§ 14, LOCKED)

### 5.2 MuscleGroup Enum

```
type MuscleGroup =
  | 'CHEST'        // Pectorals (major + minor)
  | 'BACK'         // Latissimus Dorsi, Rhomboids, Mid/Upper Trapezius
  | 'SHOULDERS'    // Anterior, Lateral, and Posterior Deltoids (all three heads combined)
  | 'BICEPS'       // Biceps Brachii + Brachialis
  | 'TRICEPS'      // Triceps Brachii (all three heads)
  | 'FOREARMS'     // Forearm flexors, extensors, and grip muscles
  | 'CORE'         // Rectus Abdominis, Transversus Abdominis, Obliques
  | 'LOWER_BACK'   // Erector Spinae, Quadratus Lumborum
  | 'GLUTES'       // Gluteus Maximus, Medius, Minimus
  | 'QUADS'        // Quadriceps (all four heads)
  | 'HAMSTRINGS'   // Biceps Femoris, Semimembranosus, Semitendinosus
  | 'CALVES'       // Gastrocnemius + Soleus
  | 'HIP_FLEXORS'  // Iliopsoas, Rectus Femoris (as hip flexor), TFL
  | 'FULL_BODY'    // Used only for exercises with no dominant single-group stimulus
```

### 5.3 Assignment Rules

- FORGE exercises: 1–4 `primaryMuscles`, 0–4 `secondaryMuscles`
- `FULL_BODY` is used only in `primaryMuscles` and only when the exercise genuinely cannot be classified by a dominant group (Burpee, Clean & Jerk, Turkish Get-Up)
- `LOWER_BACK` is distinct from `CORE`: the deadlift has `LOWER_BACK` + `GLUTES` as primary, `CORE` as secondary; the plank has `CORE` as primary, `LOWER_BACK` as secondary
- `SHOULDERS` covers all three deltoid heads as a single group. Front/lateral/rear distinction is available in exercise descriptions and coaching cues, not at the filter-chip level
- `HIP_FLEXORS` is required because Mobility programs extensively target hip flexor length; athletes need to find these exercises by muscle group

### 5.4 Display Name Mapping

| Enum | Display Name |
|------|-------------|
| `CHEST` | Chest |
| `BACK` | Back |
| `SHOULDERS` | Shoulders |
| `BICEPS` | Biceps |
| `TRICEPS` | Triceps |
| `FOREARMS` | Forearms |
| `CORE` | Core |
| `LOWER_BACK` | Lower Back |
| `GLUTES` | Glutes |
| `QUADS` | Quads |
| `HAMSTRINGS` | Hamstrings |
| `CALVES` | Calves |
| `HIP_FLEXORS` | Hip Flexors |
| `FULL_BODY` | Full Body |

---

## Section 6 — EquipmentTag Taxonomy

### 6.1 Design Principles

- Covers all equipment used across 25 Forge Programs and all environments (GYM, HOME, OUTDOOR)
- Lean: no exotic, niche, or brand-specific equipment
- Multi-select: an exercise may require more than one tag (e.g., Bench Press → [BARBELL, SQUAT_RACK, BENCH])
- `BODYWEIGHT` is a valid tag (means no external equipment required)

### 6.2 EquipmentTag Enum

```
type EquipmentTag =
  // Free weights
  | 'BARBELL'          // Standard barbell
  | 'DUMBBELL'         // Dumbbells (one or two)
  | 'KETTLEBELL'       // Kettlebell
  | 'WEIGHT_PLATE'     // Olympic plates used directly (plate pinch, plate press)

  // Support equipment
  | 'SQUAT_RACK'       // Power rack, squat rack, or cage
  | 'BENCH'            // Flat or adjustable bench
  | 'PULL_UP_BAR'      // Wall-mounted or freestanding; includes chin-up bar
  | 'DIP_BAR'          // Parallel dip bars
  | 'RESISTANCE_BAND'  // Resistance band (loop or tube)
  | 'TRX'              // Suspension trainer

  // Conditioning equipment
  | 'ROWING_MACHINE'   // Concept2 or similar
  | 'SLED'             // Push or drag sled
  | 'BATTLE_ROPES'     // Battle ropes

  // Machines
  | 'CABLE_MACHINE'    // Cable stack (lat pulldown, cable row, cable crossover)
  | 'MACHINE'          // Generic selectorized machine (leg press, leg extension, chest fly machine)

  // Recovery and mobility
  | 'FOAM_ROLLER'      // Foam roller
  | 'LACROSSE_BALL'    // Lacrosse ball or therapy ball

  // No equipment
  | 'BODYWEIGHT'       // No external equipment required
```

Total: 18 equipment tags.

### 6.3 Equipment Rules for FORGE Exercises

- Every FORGE exercise has at least 1 equipment tag
- If the exercise requires only the athlete's body, it is tagged `BODYWEIGHT`
- Multi-equipment: Bench Press → `[BARBELL, SQUAT_RACK, BENCH]`; Pull-Up → `[PULL_UP_BAR]`; Push-Up → `[BODYWEIGHT]`

### 6.4 Equipment Tag → Environment Implications

EquipmentTag is the ground truth for what a given exercise requires. `EnvironmentTag` on the exercise (§ 7) is derived from and consistent with this:

- Equipment in `{BODYWEIGHT, PULL_UP_BAR, DIP_BAR, RESISTANCE_BAND, TRX, FOAM_ROLLER, LACROSSE_BALL}` → exercise is HOME-compatible
- Equipment including any of `{BARBELL, SQUAT_RACK, CABLE_MACHINE, MACHINE, SLED, ROWING_MACHINE, BATTLE_ROPES}` → GYM required
- `DUMBBELL` and `KETTLEBELL` are ambiguous: athletes may own these at home, so exercises using only these tags are marked both HOME and GYM
- `BENCH` alone does not require a gym (a home bench exists); combined with BARBELL + SQUAT_RACK, it is GYM-only
- Outdoor-appropriate exercises (running drills, outdoor agility) are tagged OUTDOOR regardless of equipment

---

## Section 7 — EnvironmentTag on Exercises

### 7.1 EnvironmentTag Enum

```
type EnvironmentTag = 'GYM' | 'HOME' | 'OUTDOOR'
```

Three values. `MIXED` is a program-level concept (a program that combines GYM and non-GYM sessions); it is never used as an exercise-level environment tag. Individual exercises are tagged for the specific environments where they can be performed.

**R1-3 note:** `HOME_GYM` was evaluated and rejected before lock. See § 7.3.

### 7.2 Tagging Rules

An exercise may carry multiple environment tags, representing all environments where it can be performed with its required equipment.

| Exercise | Equipment | Environment Tags |
|----------|-----------|-----------------|
| Bench Press | BARBELL, SQUAT_RACK, BENCH | GYM |
| Push-Up | BODYWEIGHT | GYM, HOME, OUTDOOR |
| Lat Pulldown | CABLE_MACHINE | GYM |
| Pull-Up | PULL_UP_BAR | GYM, HOME |
| Dumbbell Row | DUMBBELL, BENCH | GYM, HOME |
| Kettlebell Swing | KETTLEBELL | GYM, HOME |
| Hip Flexor Stretch | BODYWEIGHT | GYM, HOME, OUTDOOR |
| Foam Roll Quads | FOAM_ROLLER | GYM, HOME |
| Sled Push | SLED | GYM |
| Running Drill | BODYWEIGHT | OUTDOOR, GYM |

When uncertain, err toward inclusion rather than exclusion. An athlete without a pull-up bar at home will self-select; the system should not exclude an exercise for an environment where it is plausible.

Not displayed in W-22 (per W22-D15, LOCKED). Used for: (1) program validation (confirming 25 programs have sufficient exercise coverage per environment), (2) future V1.1 environment-based filtering.

### 7.3 Non-MVP: Athlete Equipment Profile

The distinction between a home athlete with minimal equipment and one with a full home gym is real and relevant. However, this distinction is properly modeled at the athlete level — not by adding a fourth environment tag to exercises.

The correct future solution is an **Athlete Equipment Profile**: a screen where athletes declare their available equipment as `EquipmentTag[]`. The system then filters exercises using: "show exercises where all required equipment is in the athlete's declared set." This is more precise than any environment tag because it distinguishes between athletes with different home equipment configurations (pull-up bar only vs. dumbbells + bench vs. full squat rack).

`HOME_GYM` as an environment tag was rejected because:
- It is redundant with `EquipmentTag`, which already captures this at greater precision
- Its boundary is ambiguous (where does HOME end and HOME_GYM begin?)
- It would eventually be superseded by the Athlete Equipment Profile without adding lasting value

When the Athlete Equipment Profile ships post-MVP, the existing `EquipmentTag` on exercises provides the data layer without migration.

---

## Section 8 — Exercise Library Scope

### 8.1 MVP Target: 200–225 Exercises at Launch

The library is not an exercise database. It is a curated, coach-authored catalog. Every exercise in the library must have complete FORGE-required content (description, why it matters, 4–8 instructions, 2–5 coaching cues, 2–4 common mistakes, GIF or video media) before entering the active catalog. This content production constraint naturally governs scope.

The 25 Forge Programs collectively require comprehensive exercise coverage. Hypertrophy programs use 30+ distinct exercises per program. Mobility programs require 50+ mobility exercises. Strength programs require barbell, dumbbell, cable, and machine variants across all movement patterns. A 100-exercise library cannot serve 25 programs without repetition that reduces program quality.

200 complete exercises is preferable to 500 at partial quality. Every athlete who can't find their preferred variant can create a custom exercise.

### 8.2 Distribution by Category

| Category | Target Count | Notes |
|----------|-------------|-------|
| Push (Upper Body) | 30–35 | Covers barbell, dumbbell, cable, bodyweight push patterns (horizontal, vertical, diagonal) across BEGINNER–ADVANCED |
| Pull (Upper Body) | 28–32 | Row family, vertical pull family, curl family, face pull |
| Legs & Glutes | 55–65 | Largest category — all squat-pattern and hinge-pattern exercises; lunges, leg press, machine isolation, deadlift family, hip thrust family, KB swing |
| Core & Stability | 20–25 | Planks, anti-rotation, anti-extension, flexion, rotation; bodyweight and light equipment |
| Carry & Full Body | 15–18 | Carries, sleds, Olympic lifts (basics), HIIT movements, explosive full-body |
| Mobility & Flexibility | 40–50 | Drives Mobility and Yoga program content; all stretch, mobility, foam rolling, breathwork |

**Total target: 188–225 exercises.** Content team target: 200, with latitude to 225.

All exercises at launch are FORGE source. CUSTOM exercises are created by athletes and have no target count.

### 8.3 Expansion Policy

Post-MVP additions require:
- All FORGE-required content fields populated
- GIF or video media produced
- Reviewed by product/content team
- No duplicate of existing exercise at same difficulty + equipment combination
- Fills a genuine gap (athlete requests, program needs, missing movement pattern coverage)

Target: +50–75 exercises per post-MVP content cycle. Each cycle is a content production commitment, not just data entry.

---

## Section 9 — WorkoutTemplate Entity

### 9.1 Purpose

A `WorkoutTemplate` is an athlete-owned, reusable workout structure — the "saved workout" that an athlete can launch repeatedly for free sessions. Templates are distinct from program slots:

- Program slots belong to a `ProgramDefinition`; they follow Copy-Semantics and are governed by program state (Active programs' slots become read-only)
- WorkoutTemplates belong directly to the athlete; they have no program state, no scheduling context, and are always editable

### 9.2 WorkoutTemplate Schema

```
WorkoutTemplate {
  id:            uuid
  athleteId:     uuid                  // owner; always required
  name:          string                // max 60 chars; required
  activityType:  ActivityType | null   // STRENGTH, MOBILITY, YOGA, etc.; null = untyped
  sections:      WorkoutSection[]      // section-first model per WS-A5 (LOCKED); same as ProgramSlot
  createdAt:     timestamp
  updatedAt:     timestamp
  lastUsedAt:    timestamp | null      // null if never launched; updated on each session start
  useCount:      number                // count of sessions launched from this template; starts at 0
}
```

`WorkoutSection` and `ExercisePrescription` are the locked models from WS-A5 and W-24. Section-first (WARM_UP | MAIN | COOL_DOWN) applies identically to templates as to program slots. MAIN is always present; WARM_UP and COOL_DOWN are optional.

### 9.3 Template Creation Paths

**Path 1 — From scratch in W-25 (Free Workout Builder):** The athlete explicitly opens the template builder and creates a new template with a name, optional activity type, and exercises. W-25 is architecturally parallel to W-24 (same section-first building flow, same auto-save behavior) but targets `WorkoutTemplate` instead of `ProgramSlot`.

**Path 2 — From W-17 Workout Summary ("Save as Template"):** After completing a workout, a secondary CTA on W-17 creates a new `WorkoutTemplate` pre-populated from the just-completed session's exercise structure. The template name defaults to the session name and is editable inline. The prescription fields carried forward reflect what was *planned* (the `ExercisePrescription` values), not what was *logged* (the `ExerciseLog` values). Templates are planning tools; actual performance values do not propagate to the template.

**Path 3 — Duplicate from W-27 (Template Detail):** Creates a new `WorkoutTemplate` with a "(Copy)" name suffix, same exercise structure, `useCount: 0`, `lastUsedAt: null`.

### 9.4 Template Mutability

Templates are always mutable — no sealed state. Unlike program slots on Graduated or Ended Early programs (which are sealed legacy records), templates may be edited at any time.

**Template edits do NOT retroactively modify previously completed sessions.** A session launched from Template A in January is a permanent record. If Template A is edited in February, the January session is unchanged. This follows History Cannot Be Rewritten.

### 9.5 Template Deletion

Templates may be deleted by the athlete.
- Requires confirmation: "Delete [Template Name]? This cannot be undone."
- Does NOT delete any `WorkoutSession` records launched from this template
- After deletion, sessions with `templateId` referencing this template retain the `templateId` value; but since the template is gone, the `slotName` (snapshotted at session creation) carries the display name independently. W-19 does not attempt to resolve a "From Template: X" link for deleted templates.

### 9.6 Template–Session Relationship

```
WorkoutSession {
  // ... existing locked fields
  templateId:     uuid | null    // null for program sessions and blank-workout free sessions
  sessionOrigin:  'TEMPLATE' | 'CARRY_FORWARD' | 'BLANK'   // for free workouts only
}
```

`templateId` is set at session creation time (when the athlete launches from a template) and never changes. If the template is later deleted, `templateId` becomes an orphaned foreign key — acceptable because it is informational only and sessions are permanent records.

---

## Section 10 — Free Workout Data Model

### 10.1 What Is a Free Workout

A free workout is a `WorkoutSession` where `programId: null` and `slotIndex: null`. It includes ad-hoc training, template-launched workouts, carry-forward workouts, and blank workout sessions. Free workouts appear in W-18 (Activity History) and W-19 (Activity Detail) identically to program workouts.

### 10.2 Session Name Derivation

`WorkoutSession.slotName` is the display name used in W-17, W-18, and W-19. For free workouts:

| `sessionOrigin` | `slotName` derivation |
|-----------------|----------------------|
| `TEMPLATE` | Template name **snapshotted at session creation time** — not a live reference |
| `CARRY_FORWARD` | ActivityType display label (e.g., "Strength") |
| `BLANK` | ActivityType display label (e.g., "Strength") |

The template name is snapshotted at session creation, not looked up at display time. If the template is renamed or deleted after the session, W-18 and W-19 show the name as it was when the session was started. This follows History Cannot Be Rewritten.

### 10.3 Last Session Carry-Forward Rule

For returning athletes who start a free workout of the same `activityType` as a prior session, the exercise structure from their most recent completed session carries forward as the starting state in W-9 (or W-15 for MOBILITY/YOGA).

**What carries forward:**
- The ordered exercise list (by section: WARM_UP → MAIN → COOL_DOWN) from the athlete's most recent completed session of the same `activityType`
- The prescription defaults: sets, reps/duration, weight — sourced from the **actual logged values** of the prior session (see § 10.4 and EL-D8)

**What does NOT carry forward:**
- Per-exercise notes from the prior session
- Training partner tags
- The prior session's `sessionId` or any session-level metadata

**Carry-forward applies to:** STRENGTH, HIIT, MOBILITY, YOGA (activity types with exercise lists)

**Carry-forward does NOT apply to:** RUN, WALK, BIKE, SWIM (these use timer-based screens W-10 through W-13 with no exercise list to carry forward)

The carry-forward is a starting point, not a constraint. The athlete can add, remove, or reorder exercises in W-9 after loading.

### 10.4 "Last Session" Definition for Carry-Forward

"Last session" means: the most recently completed `WorkoutSession` where `activityType = [current type]` and `isPartial: false`. Partial sessions (ended mid-workout via "Save & Exit") are excluded from carry-forward consideration.

If no prior completed session of the same type exists, the athlete sees a blank exercise list (or blank timer screen), and W-9 presents the "Add Exercise" flow prominently.

---

## Section 11 — Custom Workout Creation Flow

### 11.1 Three Entry Paths

Every free workout starts through one of three paths. All three converge at the same active workout screen (W-9, W-10, etc. depending on activityType). The path determines only the initial state of the exercise list.

| Path | Name | Available To | Initial State |
|------|------|-------------|--------------|
| A | Blank Workout | All athletes | Empty MAIN section; no exercises |
| B | From Template | Athletes with ≥ 1 saved template | Pre-populated from `WorkoutTemplate.sections[]` |
| C | Continue Last | Athletes with ≥ 1 prior completed session of this type | Pre-populated from last-session carry-forward |

### 11.2 Path A — Blank Workout

W-9 opens with a single empty MAIN section and no exercises. The "Add Exercise" CTA is the primary affordance. Available to all athletes at all times as a starting point.

### 11.3 Path B — From Template

W-9 opens with exercises pre-populated from the template's `WorkoutSection[]`. Prescription fields (sets, reps, weight) pre-filled from the template's `ExercisePrescription` values.

- The athlete may add, remove, or reorder exercises in W-9 mid-session; these changes do NOT update the template
- Template and session exercise lists are fully independent (Copy-Semantics applies)
- The Chapter Context Strip in W-9 appears as normal (whatever chapter is active)
- The Program Strip does NOT appear (this is a free workout)

### 11.4 Path C — Continue Last (Carry-Forward)

W-9 opens with exercises from the carry-forward (§ 10.3). Prescription defaults reflect actual logged values from the prior session.

### 11.5 Which Screen Handles Building

**W-24** builds program slots (`ProgramSlot.sections[]`). It is part of the program hierarchy (W-3 Program Detail → W-24). It requires `programId` and `slotIndex` context.

**W-25 (Free Workout Builder — new, unspecced)** builds `WorkoutTemplate.sections[]`. It is architecturally parallel to W-24: same section-first model, same per-exercise prescription steppers, same drag-to-reorder behavior, same auto-save behavior. Key differences:

| Aspect | W-24 (Program Slot Builder) | W-25 (Free Workout Template Builder) |
|--------|---------------------------|-------------------------------------|
| Entity | `ProgramSlot.sections[]` | `WorkoutTemplate.sections[]` |
| Entry point | W-3 Program Detail → Build Workout | W-26 Templates Hub → New Template; W-17 → Save as Template |
| Header | Slot name from program context | Template name (editable inline) |
| Activity type | Fixed from slot type | Athlete-selectable |
| Sealed state | Yes (Graduated/Ended Early programs) | No — always editable |
| Context passed | `{ programId, slotIndex, slotType }` | `{ templateId }` (or null for new template) |

W-24 and W-25 share UI components (exercise card, prescription stepper, section header) but are separate screens targeting separate entities.

**W-9** (and W-10–W-15) is the live execution screen — not a builder. The "Add Exercise" capability in W-9 is additive during an active session, not pre-session planning.

---

## Section 12 — Architecture Decisions

| Decision | Rule | Justification |
|----------|------|--------------|
| **EL-D1** — Source field immutable | `source: 'FORGE' \| 'CUSTOM'` is set at creation and never changed. A CUSTOM exercise cannot become FORGE; promoting a concept requires a new FORGE record. | Preserves the trust relationship: FORGE exercises are coach-authored and meet content standards. CUSTOM exercises must never appear as coach-authored content. |
| **EL-D2** — isFavorite as computed join | `isFavorite` lives in `UserFavoriteExercise` join table, not on `ExerciseDefinition`. | A single exercise record is shared by all athletes. Per-athlete state on a shared record is architecturally broken. The join table enables efficient favorites-first search ranking and clean offline sync behavior. |
| **EL-D3** — ExerciseCategory is the browse taxonomy | The 6-category `ExerciseCategory` enum is what athletes see in W-21 Browse and W-23's ALL EXERCISES list. `MovementPattern` (21 values) is internal only. | Browsing "PUSH_HORIZONTAL vs. PUSH_VERTICAL" requires coaching vocabulary. "Push (Upper Body)" requires none. The browse taxonomy must serve the least-experienced athlete. |
| **EL-D4** — 200–225 exercise MVP library | Every exercise must have complete content + media before entering the active catalog. Content production is the binding constraint. | 200 complete exercises is more valuable than 500 at partial quality. The Product DNA ("Premium, organized, coach-created") requires the library to earn its premium positioning through quality. |
| **EL-D5** — WorkoutTemplate is a first-class entity | `WorkoutTemplate` is its own entity, not a degenerate `ProgramDefinition` (totalWorkouts: 1, durationWeeks: null). | Programs have scheduling context and program state (Active, Future, Graduated). Templates have neither. Using a degenerate program record pollutes the program catalog with single-session artifacts and prevents both systems from evolving independently. |
| **EL-D6** — Template edits do not retroactively modify sessions | Editing a `WorkoutTemplate` after sessions have been completed from it does NOT modify those session records. | Direct application of History Cannot Be Rewritten. Athletes should be able to evolve their template without retroactively rewriting what they did in the past. |
| **EL-D7** — Session name snapshotted at launch | `WorkoutSession.slotName` is set at session creation and never updated, including when the template is renamed or deleted. | Prevents orphaned history records. W-18 and W-19 must always display every historical session with an accurate name. A live template-name lookup returns null for deleted templates. |
| **EL-D8** — Carry-forward uses actual logged values | The carry-forward prescription defaults (sets, reps, weight) come from `ExerciseLog` records (what was actually done), not `ExercisePrescription` records (what was planned). | An athlete who lifted more than planned has established a new baseline. Defaulting the next session to the original plan would be regressive. The carry-forward should serve as progressive overload scaffolding. |
| **EL-D9** — Free workout and template are distinct concepts | A free workout is a `WorkoutSession` event. A template is a `WorkoutTemplate` structure. The `templateId` field on `WorkoutSession` records the association when applicable. | Athletes can train ad-hoc without creating a template. Templates are opt-in. The carry-forward system serves habitual athletes without requiring explicit template management. |
| **EL-D10** — W-25 as a new screen, not W-24 reuse | Template building uses W-25 (new screen), not W-24. W-24 is coupled to program slot persistence and requires `programId` + `slotIndex` context. | Sharing UI components between W-24 and W-25 is correct. Sharing the same screen instance with conditional context handling is a God-Screen pattern — fragile and hard to evolve. |
| **EL-D11** — CUSTOM exercises visible only to their author | When Athlete A opens W-23, they see FORGE exercises + their own CUSTOM exercises. They never see Athlete B's CUSTOM exercises. | Custom exercises are personal tools. They may have non-standard names, incomplete data, or idiosyncratic meaning. Exposing them to other athletes produces catalog noise and unexpected content. |
| **EL-D12** — Progression and regression relationships | `progressionExerciseIds[]` (harder versions) and `regressionExerciseIds[]` (easier versions) are added to `ExerciseDefinition`. They are explicitly authored, never auto-derived. CUSTOM exercises always have empty arrays. Recommended max: 1–3 entries per array. No MVP UI surfaces these fields. Content target: populate for 40–50 anchor exercises before ship. | Future leverage (AI coaching, adaptive programming, beginner onboarding) is high. Schema-level cost is zero. Retrofitting 200 exercises post-MVP is expensive. Adding now costs nothing and creates the data foundation for V1.1 features. Keeping them as null-by-default with no UI ensures they do not complicate MVP. |

---

## Section 13 — Validation Audit Against All 25 Programs

### 13.1 Strength Programs

**4 programs** (Strength Foundation I, II, III, Powerbuilding Foundation) — all GYM environment.

Required exercise coverage:
- `PUSH`: Bench Press, Overhead Press, Incline Press, DB Press, Push-Up
- `PULL`: Barbell Row, DB Row, Pull-Up, Lat Pulldown, Face Pull, Curl variations
- `LEGS_AND_GLUTES`: Back Squat, Front Squat, Romanian Deadlift, Deadlift, Hip Thrust, Lunge, Bulgarian Split Squat, Good Morning (hinge-pattern exercises are here per R1-1)
- `CORE`: Plank, Ab Wheel, Pallof Press

Equipment: BARBELL, SQUAT_RACK, BENCH, DUMBBELL, CABLE_MACHINE. ✓

### 13.2 Hypertrophy Programs

**5 programs** (Hypertrophy Foundation, Intermediate, Advanced, Lower Body Foundation, Lower Body Intermediate) — all GYM.

Same upper/lower movements as Strength plus machine isolation: Leg Extension, Leg Curl, Chest Fly Machine, cable variations for high-volume work. Lower Body Foundation and Lower Body Intermediate additionally require hip-specific machine coverage: Hip Abduction Machine, Hip Adduction Machine, Glute Drive Machine (or equivalent), cable pull-through variations. These are already within the MACHINE equipment tag scope.

Equipment: BARBELL, SQUAT_RACK, BENCH, DUMBBELL, CABLE_MACHINE, MACHINE. ✓

### 13.3 Running Programs

**2 programs** (Running Base I, II) — OUTDOOR.

W-10 is the active screen (timer-based). Exercise library supports warm-up and cool-down sections:
- `MOBILITY`: Hip Flexor Stretch, Calf Stretch, Hamstring Stretch, Quad Stretch
- `LEGS_AND_GLUTES`: Glute activation drills, leg swings

Equipment: BODYWEIGHT. ✓

### 13.4 Cycling Programs

**0 Forge programs at launch.** Cycling Base and Cycling Development were removed from the launch catalog by Catalog Revision Amendment. The `CYCLING` category enum is retained for athlete-created and imported programs. The exercise library should maintain MOBILITY and activation exercises applicable to cycling warm-up and cool-down protocols to support athlete-created cycling programs — these are covered by the existing MOBILITY category exercises (stretches, joint mobility, glute activation drills).

Equipment for athlete-created CYCLING programs: BODYWEIGHT. ✓ (covered by existing MOBILITY and LEGS_AND_GLUTES library)

### 13.5 Conditioning / Hybrid Programs

**6 programs** (Athletic Conditioning Foundation, Body Recomposition, Hybrid Foundation, Hybrid Intermediate, and variants) — GYM (4) + MIXED (2).

Required coverage: full overlap with Strength plus:
- `FULL_BODY`: Burpee, Battle Ropes, Sled Push, Box Jump, KB Swing
- `LEGS_AND_GLUTES`: All squat/hinge patterns included

Equipment: BARBELL, DUMBBELL, KETTLEBELL, CABLE_MACHINE, SLED, BATTLE_ROPES, MACHINE. ✓

### 13.6 Combat Programs

**0 Forge programs at launch.** Combat Foundation and Combat Conditioning were removed from the launch catalog by Catalog Revision Amendment. The `COMBAT_SPORTS` category enum is retained for athlete-created and imported programs. The exercise library's existing FULL_BODY category exercises (Battle Ropes, Sled Push, Burpee, Box Jump, KB Swing) and standard pattern exercises already support athlete-created combat conditioning programs without additional coverage requirements.

Equipment for athlete-created COMBAT_SPORTS programs: BARBELL, DUMBBELL, KETTLEBELL, CABLE_MACHINE, BATTLE_ROPES, SLED, BODYWEIGHT. ✓ (covered by existing library)

### 13.7 Full Body / Home Programs

**5 programs** (Bodyweight Foundation, Bodyweight Strength, Bodyweight Performance, Home Conditioning, Home Strength Foundation) — HOME.

Required bodyweight-only coverage (Bodyweight Foundation, Bodyweight Strength, Bodyweight Performance, Home Conditioning):
- `PUSH`: Push-Up (standard, wide, narrow, incline, decline), Dip, Pike Push-Up, Archer Push-Up, Diamond Push-Up
- `PULL`: Pull-Up, Chin-Up, Resistance Band Row, Archer Pull-Up
- `LEGS_AND_GLUTES`: Bodyweight Squat, Jump Squat, Lunge, Glute Bridge, Single-Leg RDL (bodyweight), Bulgarian Split Squat (bodyweight), Pistol Squat (for Bodyweight Performance), Nordic Curl (for Bodyweight Performance)
- `CORE`: Plank, Mountain Climber, Hollow Body Hold, L-Sit, Dragon Flag (for Bodyweight Performance)
- `FULL_BODY`: Burpee, Bear Crawl

Home Strength Foundation requires dumbbell-based compound exercise coverage (DB Goblet Squat, DB Romanian Deadlift, DB Row, DB Floor Press, DB Shoulder Press, DB Lunges). These exercises are already in the library as variants of GYM barbell/cable exercises — no new exercise category coverage required.

Equipment (Bodyweight programs): BODYWEIGHT, PULL_UP_BAR, DIP_BAR, RESISTANCE_BAND. ✓
Equipment (Home Strength Foundation): BODYWEIGHT, DUMBBELL, RESISTANCE_BAND. ✓

### 13.8 Mobility Programs

**2 programs** (Mobility Foundation, Mobility Intermediate) — HOME.

Drives the 40–50 MOBILITY category exercises:
- `STRETCH_STATIC`: Hip Flexor Stretch, Pigeon Pose, Lizard Pose, Dragon Pose, Pec Stretch, Hamstring Stretch, Quad Stretch
- `STRETCH_DYNAMIC`: World's Greatest Stretch, Leg Swing (front/back, lateral), Arm Circle, Inchworm
- `JOINT_MOBILITY`: Cat-Cow, Thoracic Rotation, Ankle Circles, Hip 90/90, Shoulder CARs, Hip CARs, Wrist Circles
- `FOAM_ROLL`: Foam Roll Quads, IT Band, Upper Back, Thoracic Spine, Glutes, Lats, Calves
- `BREATHWORK`: Box Breathing, Crocodile Breathing, Diaphragmatic Breath

Equipment: BODYWEIGHT, FOAM_ROLLER, LACROSSE_BALL.

W-23 MOBILITY context filter (MovementPattern ∈ {STRETCH_STATIC, STRETCH_DYNAMIC, JOINT_MOBILITY, FOAM_ROLL, BREATHWORK}) correctly scopes the picker for these programs. ✓

### 13.9 Import Rule Compliance

Per WS-A6 (LOCKED): all imported exercises appear in the MAIN section only; no taxonomy is inferred. This architecture does not alter that rule. Imported programs use flat `ExercisePrescription` records; the exercise catalog is not queried at import time. Import architecture remains governed by Architecture-Amendment-001-Import.md. ✓

### 13.10 Custom Exercise Compliance

CUSTOM exercises are created via W-23, visible only to their author, and never appear in the FORGE count. The W-23 context filter for MOBILITY/YOGA includes CUSTOM exercises with null movementPattern (per W-23 §4.3, LOCKED). ✓

---

## Section 14 — Non-Behaviors

This architecture does not and will never include:

| Non-Behavior | Reason |
|-------------|--------|
| Community exercise submissions | FORGE exercises are coach-authored; user-generated content in the shared catalog undermines quality and trust |
| CUSTOM exercises visible to other athletes | Custom exercises are personal tools; cross-athlete exposure produces catalog noise |
| Exercise popularity rankings or "used by X athletes" | Social proof mechanics conflict with a product built around personal identity, not comparison |
| AI-generated exercise descriptions or instructions | AI-generated content cannot be held to the coaching voice, accuracy, and safety standards required for exercise instruction |
| Per-set prescription variation at MVP (pyramid sets, warmup sets) | Uniform sets × reps × weight covers the vast majority of MVP use cases; per-set variation is V1.1 |
| Exercise performance analytics in W-22 | W-22 is an educational surface; performance history belongs in W-18/W-19 |
| Template sharing or publishing | Templates are personal planning tools; sharing creates a content platform dynamic the product explicitly rejects |
| "Recommended templates" or algorithmically suggested workouts | Requires behavioral data that won't exist at MVP; early recommendations erode trust |
| Auto-generated workouts | Auto-generation conflicts with respect for athlete agency and intelligence |
| HOME_GYM as an EnvironmentTag | Redundant with EquipmentTag; ambiguous definition; the correct solution is a future Athlete Equipment Profile |
| Exercise "difficulty auto-adjustment" | Prescriptions are planning tools; the system does not adapt them based on logged performance |
| Session streak tracking or pressure language | Forge Legacy does not reward frequency over quality |
| Editing exercise notes post-session | Session notes are permanent; History Cannot Be Rewritten |
| Progression/regression displayed in MVP UI | These fields are schema infrastructure only; no W-22 sections or athlete-facing surfaces exist at MVP |

---

## Section 15 — Recommended Next Specs

In priority order:

| Priority | Document | Why |
|---------|---------|-----|
| 1 | **W-25: Free Workout Builder** | Blocks the template-creation path; architecturally parallel to W-24 but targets `WorkoutTemplate`; covers creation from scratch and the template-naming flow |
| 2 | **W-26: Workout Templates Hub** | Athlete's saved templates list; entry to W-25 (new template), W-27 (detail), and launching into W-9 |
| 3 | **W-21: Exercise Library Hub** | Browse-and-discovery surface for exercises; referenced in W-22 and W-23 but has no standalone spec; must define Browse tab (using ExerciseCategory from this document), MY EXERCISES (Favorites + Recently Used), search |
| 4 | **W-27: Template Detail** | Single template view with exercise list preview, launch CTA, edit entry, duplicate, and delete |
| 5 | **W-17 Amendment** | Adds "Save as Template" secondary CTA to the Workout Summary screen; defines naming and confirmation flow |
| 6 | **W-1 Amendment** | Defines how the three free workout entry paths (Blank, From Template, Continue Last) are surfaced on the Workouts Hub |

---

## Section 16 — Validation Checklist

### ExerciseDefinition Data Model
- [ ] `source: 'FORGE' | 'CUSTOM'` — immutable after creation
- [ ] `authorId: uuid | null` — null for FORGE; set to athleteId for CUSTOM
- [ ] `isFavorite` NOT stored on `ExerciseDefinition` — computed from `UserFavoriteExercise` join table
- [ ] FORGE: all educational fields required before `isActive: true`
- [ ] CUSTOM: only `name` required at creation; all other fields optional/null
- [ ] FORGE: `isActive` never set to false (permanent catalog members)
- [ ] CUSTOM: `isActive: false` on athlete deletion; history references preserved
- [ ] `exerciseName` snapshotted on `ExerciseLog` at write time; never updated
- [ ] `progressionExerciseIds: uuid[]` — present on all ExerciseDefinition records; CUSTOM: always []; FORGE: optional at MVP
- [ ] `regressionExerciseIds: uuid[]` — present on all ExerciseDefinition records; CUSTOM: always []; FORGE: optional at MVP
- [ ] Progression/regression: not auto-derived; both directions must be explicitly authored
- [ ] Max recommended: 1–3 entries per progression/regression array

### ExerciseCategory Taxonomy
- [ ] 6 values: PUSH, PULL, LEGS_AND_GLUTES, CORE, FULL_BODY, MOBILITY
- [ ] No HINGE value in ExerciseCategory (removed per R1-1)
- [ ] Every FORGE exercise has exactly one category; CUSTOM exercises have optional category
- [ ] All hinge-pattern exercises (deadlifts, hip thrusts, RDL, KB swing, good morning) assigned to LEGS_AND_GLUTES
- [ ] Display names match: Push (Upper Body), Pull (Upper Body), Legs & Glutes, Core & Stability, Carry & Full Body, Mobility & Flexibility

### MovementPattern Taxonomy
- [ ] 21 values; HINGE retained in MovementPattern (not removed — only removed from ExerciseCategory)
- [ ] Every FORGE exercise has exactly one movementPattern; CUSTOM: null unless athlete sets it
- [ ] W-23 mobility filter: exercises where movementPattern ∈ {STRETCH_STATIC, STRETCH_DYNAMIC, JOINT_MOBILITY, FOAM_ROLL, BREATHWORK}
- [ ] CUSTOM exercises with null movementPattern: included in mobility-filtered catalog

### MuscleGroup Taxonomy
- [ ] 14 values; display names match § 5.4
- [ ] FORGE: 1–4 primaryMuscles; 0–4 secondaryMuscles
- [ ] LOWER_BACK distinct from CORE
- [ ] FULL_BODY used only when no dominant group is identifiable

### EquipmentTag Taxonomy
- [ ] 18 values
- [ ] FORGE: minimum 1 tag; BODYWEIGHT is valid
- [ ] Multi-select: Bench Press → [BARBELL, SQUAT_RACK, BENCH]

### EnvironmentTag
- [ ] 3 values: GYM, HOME, OUTDOOR — no HOME_GYM
- [ ] Multi-select per exercise; exercises may carry multiple tags
- [ ] Not displayed in W-22 (per W22-D15, LOCKED)

### Exercise Library Scope
- [ ] 200–225 FORGE exercises at launch
- [ ] All exercises have complete required content fields before `isActive: true`
- [ ] All exercises have GIF, video, or static image media
- [ ] Distribution: ~30–35 PUSH, ~28–32 PULL, ~55–65 LEGS_AND_GLUTES, ~20–25 CORE, ~15–18 FULL_BODY, ~40–50 MOBILITY
- [ ] Anchor exercises (40–50) have progressionExerciseIds and regressionExerciseIds populated at ship

### WorkoutTemplate
- [ ] Distinct entity from `ProgramDefinition`
- [ ] Schema: id, athleteId, name, activityType (nullable), sections[], createdAt, updatedAt, lastUsedAt, useCount
- [ ] Always mutable (no sealed state)
- [ ] Template deletion: confirmation required; does not delete sessions
- [ ] Template edits do NOT modify previously completed sessions

### Free Workout / WorkoutSession Additions
- [ ] `programId: null` and `slotIndex: null` for all free workouts
- [ ] `templateId: uuid | null` added to WorkoutSession
- [ ] `sessionOrigin: 'TEMPLATE' | 'CARRY_FORWARD' | 'BLANK'` added to WorkoutSession (free workouts only)
- [ ] `slotName` snapshotted at session creation time from template name or activityType label
- [ ] Carry-forward uses actual logged values (ExerciseLog), not plan values (ExercisePrescription)
- [ ] Carry-forward excludes partial sessions (`isPartial: true`)
- [ ] Carry-forward applies to STRENGTH, HIIT, MOBILITY, YOGA; not to RUN, WALK, BIKE, SWIM

### Custom Workout Creation Flow
- [ ] Three entry paths defined: Blank, From Template, Continue Last
- [ ] W-25 (new screen) handles template building; W-24 handles program slot building; W-9 is the active session for all paths
- [ ] "From Template" path: exercises pre-loaded from template; session does not modify template
- [ ] "Continue Last" carry-forward: prescription defaults to actual logged values from last session

### Architecture Decisions
- [ ] 12 named decisions: EL-D1 through EL-D12
- [ ] No duplicate decisions; numbering sequential
- [ ] EL-D12 covers progressionExerciseIds + regressionExerciseIds intent, directionality, MVP content target, and future UI deferral

### 25-Program Validation
- [ ] All program types covered: Strength (4), Hypertrophy (3), Running (2), Cycling (2), Conditioning/Hybrid (6), Combat (2), Full Body/Home (3), Mobility (2) = 24 programs (note: Program Ecosystem Architecture v1.0 defines 25 total; confirm final count against that document)
- [ ] Hinge-pattern exercises confirmed present in LEGS_AND_GLUTES for all programs that require them
- [ ] Import rules (WS-A6) unaffected by this architecture

---

## Section 17 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.1 | June 2026 | Catalog Revision Amendment applied. Section 13 validation audit updated: §13.2 Hypertrophy Programs updated from 3 to 5 programs (added Lower Body Foundation, Lower Body Intermediate) with hip-specific machine coverage note; §13.4 Cycling Programs updated to 0 Forge launch programs (category enum retained for athlete-created programs); §13.6 Combat Programs updated to 0 Forge launch programs (category enum retained for athlete-created programs); §13.7 Full Body & Home Programs updated from 3 to 5 programs (added Bodyweight Performance and Home Strength Foundation) with Bodyweight Performance advanced bodyweight coverage and Home Strength Foundation DUMBBELL coverage. Status: LOCKED. |
| v1.0 | June 2026 | Initial specification. Defines ExerciseDefinition complete data model with source semantics, deletion semantics, and isFavorite computed join. Establishes 6-category ExerciseCategory taxonomy (PUSH, PULL, LEGS_AND_GLUTES, CORE, FULL_BODY, MOBILITY); HINGE absorbed into LEGS_AND_GLUTES per R1-1. Establishes 21-value MovementPattern taxonomy (HINGE retained at this level), 14-value MuscleGroup taxonomy, 18-value EquipmentTag taxonomy, and 3-value EnvironmentTag system (HOME_GYM rejected per R1-3; Athlete Equipment Profile noted as non-MVP path). Adds progressionExerciseIds[] and regressionExerciseIds[] to ExerciseDefinition per R1-2; no MVP UI; anchor exercises targeted at ship. Recommends 200–225 FORGE exercises at MVP launch with per-category distribution. Defines WorkoutTemplate entity with creation paths, mutability rules, and deletion semantics. Defines Free Workout data model with session name derivation, carry-forward rules (actual logged values, not plan values), and three entry paths. Establishes W-25 as new template-building screen parallel to W-24. 12 architecture decisions (EL-D1 through EL-D12). 25-program validation audit confirming all Forge Programs supported. R1 amendments applied before lock. |

---

*Forge Legacy — Exercise Library & Custom Workout Builder Architecture*
*Version 1.1 | June 2026*
*Authority for all exercise taxonomy, exercise library scope, WorkoutTemplate, and Free Workout architecture decisions.*
