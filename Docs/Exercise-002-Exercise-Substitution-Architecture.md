# Forge Legacy — Exercise-002: Exercise Substitution Architecture
## Version 1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise-Library-Architecture-v1.0.md (LOCKED), Exercise-001-Custom-Exercise-Architecture.md (LOCKED), Active-Workout-Flow-Spec-W9-W16.md (LOCKED), Program-Ecosystem-Architecture-v1.0.md (LOCKED), Free-Workout-Builder-Spec-W25.md (LOCKED)
**Downstream impact:** W-9 (substitution execution behavior, ExerciseLog enrichment), W-22 (ALTERNATIVES section authority, post-MVP REGRESSIONS row), W-23 (REPLACEMENT context Suggested Substitutes section), W-25 / template persistence layer (template update on substitution persistence)

---

## Section 1 — Purpose

### 1.1 What Exercise Substitution Is

Exercise substitution is the act of replacing a prescribed exercise with a different exercise during workout execution. The athlete has a planned exercise; for any reason, they choose to perform a different exercise instead.

Substitution is an intentional athlete action. It is always initiated by the athlete. The system never substitutes automatically.

### 1.2 What Exercise Substitution Is Not

Substitution is distinct from three other exercise-change operations in Forge Legacy:

| Operation | Context | Mechanism | Governed By |
|-----------|---------|-----------|-------------|
| **Builder swap** | Editing a template or program slot before execution | Athlete replaces exercise in W-24 or W-25 | Exercise Library Architecture, W-24, W-25 |
| **Tombstone replace** | Replacing a deleted or foreign CUSTOM exercise in a prescription | Athlete taps Replace on a `[Deleted Exercise]` or `[Custom Exercise]` tombstone | EX-001-D15 |
| **Add exercise** | Adding a new exercise not present in the prescription | Athlete taps [+ Add Exercise] in W-9 | Active Workout Flow Spec W-9 |
| **Substitution** | Replacing a prescribed exercise with a different exercise during active execution | Athlete taps "Replace Exercise" on an active exercise card in W-9 | **This document** |

Tombstone replace and exercise substitution use the same picker interface (W-23 with `replacingExerciseId` context) but differ in trigger, intent, and lifecycle. Tombstone replace is a prescription repair action — the original exercise is inaccessible. Substitution is an execution adjustment — the original exercise exists and is accessible, but the athlete chooses not to perform it.

### 1.3 Why Exercise Substitution Exists

A workout plan should not fail because an athlete cannot perform one exercise. Substitution exists to keep athletes moving when:

- Equipment is unavailable (machine occupied, no barbell at this location)
- Training environment changed (at home, outdoors, traveling)
- Injury or mobility limitation requires modification
- An exercise is beyond current capability on a given day
- Personal preference or variety

The governing principle is **preserve training intent whenever possible.** The goal is not to find an identical exercise. The goal is to preserve the purpose of the exercise — the muscles it trains, the movement pattern it develops, the position it holds in the workout structure.

---

## Section 2 — Core Philosophy

### 2.1 Preserve Training Intent

Forge's approach to substitution is intent-preservation, not movement-replication.

When an athlete cannot perform a Barbell Back Squat, the prescription is not failed. The intent — a loaded bilateral knee-dominant lower body stimulus — can be preserved through Goblet Squat, Leg Press, or Bulgarian Split Squat depending on context. All preserve the core intent.

Forge does not penalize athletes for substituting. A workout completed with substitutions is a completed workout, earning full program credit, chapter attribution, and honor eligibility identically to a workout completed without substitutions.

### 2.2 Training Intent Hierarchy

When determining whether an exercise serves as a suitable substitute, Forge evaluates in this priority order:

1. **Movement pattern** — Primary. Same `movementPattern` preserves the most intent. PUSH_HORIZONTAL → PUSH_HORIZONTAL.
2. **Primary muscles** — Secondary. Same primary muscles trained, even if pattern differs slightly.
3. **Environment and equipment compatibility** — Practical constraint. Substitute must be executable in the athlete's current context.
4. **Difficulty proximity** — Refinement. Substitute should be within the athlete's current capability range.

The curated `alternativeExerciseIds` relationship array is the pre-computed expression of this hierarchy. The content team applies these criteria when authoring alternatives. The hierarchy also governs how the system prioritizes alternative suggestions when the relationship graph is traversed.

### 2.3 No Shame, No Friction

Forge does not:

- Warn athletes that they deviated from a program prescription
- Track program purity scores or compliance percentages
- Display messaging that communicates negativity about substituting
- Reduce honor eligibility, chapter progress, or program completion based on substitution choices

An athlete who substitutes in every session is engaging with their program. That engagement is what Forge is built for.

---

## Section 3 — Relationship Types

### 3.1 Overview

`ExerciseDefinition` carries three relationship arrays established in Exercise Library Architecture v1.0. Exercise-002 defines how each is used in substitution context.

| Array | Relationship | Direction | Substitution Role |
|-------|-------------|-----------|-------------------|
| `alternativeExerciseIds` | Same intent, different execution | Bidirectional (app-resolved) | **Primary substitution pool** |
| `regressionExerciseIds` | Easier or modified version | Directional | **Secondary substitution pool** |
| `progressionExerciseIds` | Harder version | Directional | **Not a substitution surface** |

### 3.2 Alternatives — Primary Substitution Pool

An alternative exercise serves the same training purpose with a different execution. Alternatives are typically:

- Equipment swaps: Barbell Bench Press → Dumbbell Bench Press
- Environment swaps: Barbell Back Squat → Goblet Squat for home
- Preference or access variants: Pull-Up → Lat Pulldown
- Biomechanically equivalent movements: Romanian Deadlift → Stiff-Leg Deadlift

**Relationship semantics:**
- Same or similar `movementPattern`
- Same or similar primary muscle groups
- Same approximate difficulty tier
- Different execution, equipment, or environment requirements

**Directionality:** Bidirectional via application-layer resolution. If Exercise A lists Exercise B in `alternativeExerciseIds`, or Exercise B lists Exercise A, the system treats them as mutual alternatives. The content team authors one direction; the system resolves both at read time. This behavior is established in Exercise Library Architecture §2.3.

**Cardinality:** No hard maximum. Editorial judgment governs count. Practical guidance: 2–6 per exercise is the expected range. Overpopulating alternatives dilutes decision quality for athletes.

### 3.3 Regressions — Secondary Substitution Pool

A regression is an easier or modified version of an exercise. Regressions serve as substitutes when:

- The prescribed exercise is beyond the athlete's current capability on a given day
- Injury or mobility limitation prevents the prescribed movement
- The athlete needs a scaled-down version to train around a constraint

Regressions are a valid substitution pool but carry a different signal: they represent modification, not equivalence. When an athlete selects a regression as a substitute, they are acknowledging the prescribed movement is currently inaccessible to them.

**Relationship semantics:**
- Same movement pattern family or same primary muscles
- Lower difficulty, modified version, or partial range of motion
- Directional: Push-Up's regression is Incline Push-Up; this does not mean Incline Push-Up's regression is Push-Up

**Directionality:** Directional, not bidirectional. The content team must explicitly author both directions. A → B in `regressionExerciseIds` does not imply B → A in `progressionExerciseIds`, though the content team should populate both.

**Cardinality:** 1–3 per exercise. Regressions should be actionable options, not exhaustive lists.

### 3.4 Progressions — Not a Substitution Surface

Progressions (`progressionExerciseIds`) represent harder versions of an exercise — what comes next when the athlete is ready to advance.

Progressions are excluded from all substitution surfaces in MVP. This restriction holds for all future versions unless explicitly reconsidered in a future architecture document.

**Rationale:** An athlete substituting because of missing equipment, a changed environment, an injury, or a difficulty ceiling should never receive a harder exercise as a system-suggested substitute. Presenting a progression as a substitution option when the athlete is already facing a constraint would be counterproductive and potentially harmful.

Progressions belong to coaching and advancement systems — program succession, adaptive difficulty, and AI-driven progression tracking. These are post-MVP concerns governed by future architecture documents.

---

## Section 4 — Data Model

### 4.1 Existing Relationship Fields

The three relationship arrays on `ExerciseDefinition` are established in Exercise Library Architecture v1.0, EL-D12:

```
ExerciseDefinition {
  ...
  alternativeExerciseIds:  uuid[]  // FORGE only; CUSTOM always []
  progressionExerciseIds:  uuid[]  // FORGE only; CUSTOM always []
  regressionExerciseIds:   uuid[]  // FORGE only; CUSTOM always []
  ...
}
```

Exercise-002 does not modify these fields. Exercise-002 defines their behavioral interpretation and the downstream entities that record substitution events.

### 4.2 ExerciseLog Enrichment

Two nullable fields are added to the exercise-level data captured within a `WorkoutSession`:

```
ExerciseSessionData {
  exerciseId:              uuid           // the exercise actually performed
  exerciseName:            string         // snapshotted name of performed exercise (EX-001-D14)
  prescribedExerciseId:    uuid | null    // NEW — originally prescribed exercise; null if no substitution
  prescribedExerciseName:  string | null  // NEW — snapshotted name of original; null if no substitution
  sets:                    SetLog[]
}
```

These fields are:
- `null` in the vast majority of sessions where no substitution occurred
- Non-null only when the athlete explicitly completed a substitution via the substitution workflow
- Snapshotted at substitution time using the same discipline as `exerciseName` (EX-001-D14): both the substitute and the original name are captured at write time and are permanent

**These fields are not populated when:**
- An athlete logs different weight or reps than prescribed (still the same exercise)
- An athlete skips an exercise without logging any sets
- An athlete adds a new exercise via [+ Add Exercise] (no prescribed exercise exists in that case)

### 4.3 SubstitutionRecord Entity

A new `SubstitutionRecord` entity captures each substitution event as an immutable audit record.

```
SubstitutionRecord {
  id:                      uuid
  workoutSessionId:        uuid
  prescribedExerciseId:    uuid
  prescribedExerciseName:  string          // snapshot at substitution time
  substituteExerciseId:    uuid
  substituteExerciseName:  string          // snapshot at substitution time
  scope:                   'SESSION' | 'TEMPLATE' | 'PROGRAM'
  persistedToId:           uuid | null     // templateId or programDefinitionId when scope ≠ SESSION
  reason:                  null            // reserved for post-MVP; always null in MVP
  createdAt:               timestamp
}
```

**SubstitutionRecord rules:**
- Write-once; never updated after creation
- Never deleted
- One record per substitution action per exercise per workout session
- If an athlete substitutes Exercise A → Exercise B and later substitutes Exercise B → Exercise C at the same slot, two `SubstitutionRecord` entries are created: [A → B] and [B → C]
- Created synchronously with the substitution action
- `reason` is schema-reserved for post-MVP use (injury, equipment, preference, environment, other); always `null` in MVP

### 4.4 Directionality Rules

| Array | Direction | System Resolution |
|-------|-----------|-------------------|
| `alternativeExerciseIds` | Author one direction; system resolves both | If A lists B, or B lists A → both are mutual alternatives at display time |
| `progressionExerciseIds` | Author both directions explicitly | A → B in progressions; B → A in regressions must be authored separately |
| `regressionExerciseIds` | Author both directions explicitly | A → B in regressions; B → A in progressions must be authored separately |

### 4.5 Validation Rules

| Rule | Constraint |
|------|------------|
| Self-reference | An exercise must not reference itself in any relationship array |
| Cross-source reference | FORGE exercises may only reference other FORGE exercises in relationship arrays. CUSTOM exercises always have `[]`. |
| Inactive reference | Arrays may reference `isActive: false` exercises. Display behavior omits inactive references from suggestions. |
| Independence rule | An exercise should not appear in more than one of the three arrays on the same exercise record. Appearing as both an alternative and a regression to the same source is a content authoring error. |

---

## Section 5 — Forge Exercise Relationships

### 5.1 Who Authors Relationships

All relationship array entries are authored exclusively by the Forge content team. Athletes never directly edit `alternativeExerciseIds`, `progressionExerciseIds`, or `regressionExerciseIds` through any athlete-facing MVP surface.

Future post-MVP systems (coach tooling, AI-assisted enrichment) may write to these fields via internal tooling. Nothing in this spec prevents those systems from operating.

### 5.2 Cross-Category Relationships

Cross-category alternatives are permitted when the movement pattern is shared or the training intent is preserved.

**Permitted:** A PUSH exercise may list a FULL_BODY alternative if movement pattern and primary muscles align. Example: Overhead Press (PUSH, PUSH_VERTICAL) may list Landmine Press (FULL_BODY, PUSH_DIAGONAL) as an alternative when the intent is shoulder-dominant pressing.

**Governing test:** Would an experienced coach prescribe these as interchangeable for this athlete in this context? If no, they are not alternatives.

### 5.3 Cross-Environment Relationships

Cross-environment alternatives are the most valuable and most common relationship type. They are the primary practical use case for the substitution system.

```
GYM PRESCRIPTION              HOME / TRAVEL ALTERNATIVES
Barbell Back Squat       ↔   Goblet Squat, Bulgarian Split Squat
Barbell Bench Press      ↔   Dumbbell Bench Press, Push-Up
Seated Cable Row         ↔   Dumbbell Row, Band Row
Leg Press                ↔   Goblet Squat, Step-Up
```

The content team should prioritize authoring cross-environment alternatives for all high-frequency exercises at launch. These serve the majority of real-world substitution scenarios.

### 5.4 Bidirectional Consistency Standard

When the content team authors A → B as an alternative, they should also verify B → A. The system resolves bidirectionality at read time regardless, but authoring both directions ensures consistency in the content model and reduces the risk of orphaned one-way links.

Content team standard: every `alternativeExerciseIds` entry should have a corresponding reverse entry authored on the referenced exercise.

### 5.5 MVP Relationship Population Target

Consistent with EL-D12, progression and regression relationships should be populated for 40–50 anchor exercises before launch. Alternative relationships should be populated for all high-frequency exercises — the 60–80 exercises most likely to appear in Forge programs and templates. Cross-environment coverage is the first priority within that set.

---

## Section 6 — Custom Exercise Compatibility

### 6.1 MVP Behavior

In MVP:
- CUSTOM exercises have `alternativeExerciseIds: []`, `progressionExerciseIds: []`, and `regressionExerciseIds: []` always (EL-D12)
- CUSTOM exercises never appear in the system-generated Suggested Substitutes section in W-23 REPLACEMENT context
- FORGE exercise relationship arrays never reference CUSTOM exercises

Athletes may still manually select any of their own CUSTOM exercises as a substitute via the full W-23 catalog. Ad-hoc substitution is available for all exercises in the athlete's visible catalog (FORGE + the athlete's own active CUSTOM exercises).

### 6.2 Future Compatibility

MVP substitution recommendations only use FORGE-authored relationship networks. CUSTOM exercises are excluded from recommendation generation in MVP, but future recommendation systems may incorporate CUSTOM exercises through AI enrichment, coach tooling, athlete behavior patterns, or future exercise intelligence systems.

An athlete who repeatedly substitutes Barbell Bench Press with a CUSTOM exercise named "Shoulder-Friendly Press" is producing meaningful behavioral signal. A future recommendation system may reasonably surface that CUSTOM exercise as a suggested substitute for that athlete.

The `SubstitutionRecord` entity captures this behavioral data from MVP launch, ensuring the signal is available to future systems when they are built. No MVP behavior changes are required to preserve this compatibility.

**What remains true in MVP:**
- CUSTOM relationship arrays remain `[]` (EL-D12)
- CUSTOM exercises do not appear in Suggested Substitutes in W-23
- Athletes may still select CUSTOM exercises ad-hoc through the full picker

### 6.3 CUSTOM Exercise as Substitution Destination

A CUSTOM exercise may be the destination of a substitution when the athlete is the author. The athlete selects it via the W-23 full picker. The `SubstitutionRecord` captures the CUSTOM exercise's `id` and snapshotted `name`.

A CUSTOM exercise authored by Athlete A may not be used as a substitution destination by Athlete B (EX-001-D2, EL-D11 — CUSTOM exercises are private to their author).

### 6.4 CUSTOM Exercise as Substitution Source

A CUSTOM exercise may be the source of a substitution (the prescribed exercise being replaced). This occurs when:
- A CUSTOM exercise was added to a template or program slot and the athlete wants to perform something different in a given session
- An imported CUSTOM exercise was placed in a program slot (EX-001-D12)

The substitution workflow operates identically regardless of whether the source exercise is FORGE or CUSTOM.

---

## Section 7 — Workout Execution Behavior

### 7.1 Substitution Entry Point

Substitution is initiated from the active exercise card in W-9. The specific affordance — overflow menu, swipe action, or dedicated button — is defined in the W-9 spec. Exercise-002 governs what happens after the athlete initiates the substitution action.

### 7.2 Substitution Flow

1. Athlete initiates substitution on a prescribed exercise card in W-9
2. W-23 opens in REPLACEMENT context with `replacingExerciseId` set to the prescribed exercise's `id`
3. Athlete sees Suggested Substitutes section (§11.3) and full catalog
4. Athlete selects a substitute exercise
5. Persistence choice is presented (§7.3)
6. On confirmation: substitution applied to active session; `SubstitutionRecord` created; `ExerciseSessionData` enriched with `prescribedExerciseId`/`prescribedExerciseName`
7. W-9 resumes with the substitute exercise occupying that slot for the remainder of the session

### 7.3 Persistence Choice

At substitution confirmation, the athlete sees a single choice — one option selected, with "This session only" as the default:

| Option | Availability | Data Outcome |
|--------|-------------|--------------|
| **This session only** | Always available | Prescription unchanged in template/program; `SubstitutionRecord scope: 'SESSION'`, `persistedToId: null` |
| **Update my template** | Available when session is from a personal template | `ExercisePrescription.exerciseId` updated in the template; `SubstitutionRecord scope: 'TEMPLATE'`, `persistedToId: templateId` |
| **Update my program** | Available when session is from an ATHLETE_CREATED or IMPORTED program | `ExercisePrescription.exerciseId` updated in the program; `SubstitutionRecord scope: 'PROGRAM'`, `persistedToId: programDefinitionId` |

**Availability by workout source:**

| Workout Source | Session Only | Update Template | Update Program |
|----------------|-------------|-----------------|----------------|
| Free workout (no template) | ✓ | — | — |
| Free workout (from template) | ✓ | ✓ | — |
| FORGE program | ✓ | — | — |
| ATHLETE_CREATED program | ✓ | — | ✓ |
| IMPORTED program | ✓ | — | ✓ |

FORGE programs are always session-only. Athletes do not own FORGE `ProgramDefinition` records (PE-D1, PE-D8, EX-002-D4).

### 7.4 Applying the Substitution

When substitution is applied:
1. The substitute exercise replaces the prescribed exercise on the active exercise card for this session
2. The prescription quantities (sets, reps, weight, duration, distance, rest, notes) carry forward to the substitute unchanged
3. Sets already logged for the original exercise before the substitution remain in the session history under the original exercise
4. The session may contain both exercises: the original (partially logged before substitution) and the substitute (logged from that point forward)

**Carry-forward example:** If the athlete logs 2 sets of the prescribed exercise and then substitutes for the remaining 3 sets, the WorkoutSession contains set logs under both exercises. Both appear in the session summary and W-19 Activity Detail.

### 7.5 Session-Only Lifecycle

When scope is SESSION:
- Only the active `WorkoutSession` is affected
- The `WorkoutTemplate` or `ProgramDefinition` is not modified
- The next session from the same template or program shows the original prescribed exercise
- `SubstitutionRecord`: `scope: 'SESSION'`, `persistedToId: null`

### 7.6 Persistence Lifecycle

When scope is TEMPLATE or PROGRAM:
- `ExercisePrescription.exerciseId` on the relevant template or program slot is updated to `substituteExerciseId`
- All prescription quantities (sets, reps, weight, duration, distance, rest, notes) are preserved — only `exerciseId` changes
- All prior completed sessions from this template/program are unaffected (EL-D6)
- All future sessions from this template/program show the substitute as the prescribed exercise
- `SubstitutionRecord`: `scope: 'TEMPLATE'` or `'PROGRAM'`, `persistedToId` set to the relevant id

### 7.7 No Automatic Substitution

The system never substitutes automatically. No exercise is replaced without an explicit athlete-initiated action. Even if the athlete's current environment makes a prescribed exercise impossible, the system presents the exercise as prescribed and the athlete decides whether to substitute.

---

## Section 8 — Program Behavior

### 8.1 FORGE Programs — Session-Only Only

Substitutions in FORGE program workouts are always session-only. The `ProgramDefinition` is never modified.

FORGE content is authored by the Forge team and is read-only to athletes (PE-D1, PE-D8, PE-D10, EL-D1). Substitutions are execution-layer adjustments; they do not grant write access to content the athlete does not own.

### 8.2 ATHLETE_CREATED and IMPORTED Programs — Athlete-Controlled

Athletes may choose to persist substitutions to their ATHLETE_CREATED or IMPORTED programs. When persisted:
- The relevant `ExercisePrescription.exerciseId` in the `ProgramDefinition` is updated
- The change is not versioned; there is no "undo" mechanism in MVP
- Future sessions from that program reflect the substitute as the prescribed exercise

### 8.3 Program Progression Continuity

Substitution does not affect program progression mechanics. A session completed with substitutions advances program state identically to a session completed as-prescribed. No program-level distinction is made between substituted and as-prescribed sessions.

### 8.4 Successor Program Compatibility

`successorProgramId` references (PE-D3) are unaffected by substitutions. Graduating an ATHLETE_CREATED or IMPORTED program with substituted exercises presents the same successor as graduating without substitutions.

---

## Section 9 — Template Behavior

### 9.1 Template Substitution Persistence

When an athlete substitutes during a template-based session and chooses "Update my template":
- `WorkoutTemplate.updatedAt` is updated
- The `ExercisePrescription.exerciseId` in the relevant section and slot is updated to `substituteExerciseId`
- All prescription quantities (sets, reps, weight, duration, distance, rest, notes) are preserved

### 9.2 Prior Session Integrity

Sessions previously completed from this template are not retroactively modified (EL-D6). Activity History (W-18) and Activity Detail (W-19) display the exercises that were actually performed in each prior session, independent of subsequent template changes. The snapshotted `exerciseName` is the display authority.

### 9.3 Draft and Backgrounding Behavior

If an athlete initiates substitution in a template-based session and the app is backgrounded before the persistence choice is confirmed, the substitution is not applied. The session resumes with the original prescription. No draft state is persisted for a pending substitution choice.

---

## Section 10 — Logging Behavior

### 10.1 What Gets Recorded

Every exercise performed in a `WorkoutSession` is captured in the exercise-level session data. When a substitution occurs, the session data for that slot records both exercises:

| Field | Value |
|-------|-------|
| `exerciseId` | The substitute exercise actually performed |
| `exerciseName` | Snapshotted name of substitute at write time |
| `prescribedExerciseId` | The original prescribed exercise |
| `prescribedExerciseName` | Snapshotted name of original at substitution time |
| `sets` | All logged sets for the substitute exercise |

If the athlete logged sets for the original exercise before substituting, those sets are captured under the original exercise's `exerciseId` and `exerciseName` as a separate entry in the session.

### 10.2 Snapshot Discipline

Both `exerciseName` (substitute) and `prescribedExerciseName` (original) are snapshotted at the moment of write, extending the discipline established in EX-001-D14.

- If the substitute is later renamed, the session history shows the name it had when performed
- If the original prescribed exercise is later deleted or renamed, the session history shows its name at the time of the session
- Historical integrity is complete and permanent for both exercises involved in the substitution

### 10.3 SubstitutionRecord Immutability

`SubstitutionRecord` entries are write-once. They are never updated after creation. They are never deleted. They constitute a permanent audit trail of the athlete's substitution history, available to future analytics and coaching systems.

### 10.4 Cases That Do Not Create a SubstitutionRecord

| Action | SubstitutionRecord Created? |
|--------|-----------------------------|
| Logging different weight or reps than prescribed | No — same exercise; not a substitution |
| Skipping an exercise without logging sets | No — no substitution action taken |
| Adding a new exercise via [+ Add Exercise] | No — no prescribed exercise being replaced |
| Tombstone replace (EX-001-D15) | No in MVP — prescription repair, not execution substitution |

Tombstone replace is a prescription repair action distinct from exercise substitution. A future refinement may determine whether tombstone replaces should produce a `SubstitutionRecord`; that decision is deferred.

### 10.5 W-18 and W-19 Display

Activity History (W-18) and Activity Detail (W-19) display exercises as logged, using `exerciseName` (the substitute). The `prescribedExerciseName` is captured and available for future display (e.g., "Substituted for [original]" annotation). No MVP UI surfaces this annotation. The data is complete; the display is post-MVP.

---

## Section 11 — Search and Discovery

### 11.1 W-22 ALTERNATIVES Section (Existing)

The ALTERNATIVES section in W-22 surfaces the bidirectionally resolved `alternativeExerciseIds` set. This behavior is specified in the W-22 spec (§12). Exercise-002 affirms: the ALTERNATIVES section is the browse surface for substitution discovery before a session begins.

The ALTERNATIVES section is informational. It does not directly trigger a substitution. Actual substitution occurs in W-9 via the Replace Exercise action → W-23 REPLACEMENT context.

### 11.2 W-22 REGRESSIONS Section (Post-MVP)

In a future version, W-22 should add a REGRESSIONS section below ALTERNATIVES, surfacing `regressionExerciseIds` of the current exercise.

This section is absent from MVP W-22 (EL-D12: no MVP UI surfaces progression or regression fields). When added, the section follows the same display rules as ALTERNATIVES: horizontal scroll row, tapping navigates to W-22 for the regression exercise, section hidden when array is empty after inactive-exercise filtering.

### 11.3 W-23 REPLACEMENT Context — Suggested Substitutes Section

When W-23 receives `replacingExerciseId` in its context, it surfaces a **Suggested Substitutes** section as the first content block in the scrollable area, above MY EXERCISES.

**Source of suggestions:** Bidirectionally resolved `alternativeExerciseIds` plus `regressionExerciseIds` of the `replacingExerciseId` exercise. `progressionExerciseIds` are never included (EX-002-D1).

**Ordering within the section:**
1. Alternatives that share at least one `environmentTag` with the session context — first
2. Alternatives that share `movementPattern` with the original exercise — second
3. Remaining alternatives — third
4. Regressions — always after alternatives

**Session environment inference for ordering:**
- Program workout: inferred from the program's `environmentTags`
- Template workout: inferred from the template's `environmentTags` if that field exists
- Free workout without a template: no environment inference; all alternatives weighted equally in ordering

**Maximum display:** 6 entries in the Suggested Substitutes section. If the resolved set exceeds 6, the highest-priority entries per the ordering rules above are shown.

**Fallback:** If both `alternativeExerciseIds` and `regressionExerciseIds` resolve to empty (no suggestions available), the Suggested Substitutes section is absent. W-23 shows its standard default view.

**CUSTOM exclusion in MVP:** CUSTOM exercises never appear in Suggested Substitutes (EX-002-D2). Athletes may find and select CUSTOM exercises through the full MY EXERCISES section and search below the suggested section.

**Full picker always available:** The complete W-23 catalog is accessible beneath the Suggested Substitutes section. Athletes are never limited to only suggested exercises.

---

## Section 12 — Environment and Equipment Logic

### 12.1 Why Environment Is the Critical Practical Dimension

The most common real-world substitution scenario is environmental: an athlete's program is built for a gym, but today they are at home, traveling, or at a gym without a specific piece of equipment.

Environment compatibility is the primary practical filter for substitute suggestions. The content team should treat cross-environment alternative authoring as the highest-priority population task for the relationship graph.

### 12.2 Environment-Aware Ordering

When W-23 is opened in REPLACEMENT context and session environment can be inferred (§11.3), the Suggested Substitutes section reorders results:

- An alternative with `environmentTags` containing the inferred session environment is preferred
- Within the same environment tier, `movementPattern` alignment is the secondary sort
- Within the same movement pattern tier, difficulty proximity is the tertiary sort

This is a display ordering optimization. Athletes can select any exercise in the full catalog regardless of ordering.

### 12.3 Equipment: Inform, Not Filter

Equipment filtering is not applied as a hard filter in MVP. An alternative that requires equipment the athlete may not have is still shown — the athlete has better knowledge of their available equipment than the system does. An untagged exercise may not actually require special equipment.

The alternative's `equipment` array is visible in W-23 exercise row display per the W-23 spec, allowing athletes to verify equipment requirements before selecting.

**Post-MVP:** An athlete-declared "session equipment" model could enable hard equipment filtering. `SubstitutionRecord` behavioral patterns may inform which exercises most benefit from equipment-aware filtering. See EX-R5 in §18.

### 12.4 Environment Mismatch Behavior

When an athlete performs a GYM program workout at home, the system infers GYM environment from the program. This may surface some home-incompatible alternatives in the Suggested Substitutes section. The athlete navigates around this by using the full picker.

The system should not refuse to surface alternatives for environment mismatch. It should prioritize environment-compatible options while making all alternatives visible.

---

## Section 13 — Future Intelligence Systems

Exercise-002 establishes the foundation layer for more sophisticated substitution intelligence. The following post-MVP systems are architecturally compatible with the data model defined here.

### 13.1 AI-Assisted Substitution Recommendations

The combination of `SubstitutionRecord` history, `movementPattern` taxonomy, `primaryMuscles` data, `environmentTags`, and `EquipmentTag[]` provides the training signal set for a recommendation model. A system could learn: given [original exercise] + [session context] + [athlete profile], which substitutes have this athlete or similar athletes chosen successfully? `SubstitutionRecord` is the primary training data source.

### 13.2 Athlete Behavior Pattern Recommendations

Repeated `SubstitutionRecord` entries showing the same athlete consistently substituting Exercise A → Exercise B constitute a strong preference signal. A future system may:
- Proactively offer Exercise B when Exercise A appears in the prescription
- Allow the athlete to set a standing "always substitute A with B" preference
- Incorporate CUSTOM exercises into recommendations when behavioral evidence is strong (EX-002-D2)

### 13.3 Coach Systems

A future coach tooling system could review an athlete's `SubstitutionRecord` history to understand constraints and preferences, author custom alternative relationships for specific athletes, or override FORGE relationship networks with athlete-specific recommendations. `SubstitutionRecord` is the diagnostic view into actual workout execution.

### 13.4 Travel and Context-Specific Workout Modes

A future Travel Mode or Home Mode could accept a session-level environment declaration, pre-filter all prescriptions for environment compatibility, and surface substitution suggestions for every environment-incompatible exercise at session start. The environment filtering architecture in §12 provides the model for this system.

### 13.5 Injury Modification

A future injury modification system could accept an athlete-declared injury or limitation, filter `regressionExerciseIds` to exclude movements that stress the injury site, and surface modifications that preserve training intent around the constraint. The `reason` field on `SubstitutionRecord` (currently null/reserved) would populate with injury context in this system.

### 13.6 Schema Compatibility

No schema changes are required to support any of the future systems described in this section. The `SubstitutionRecord` entity, `prescribedExerciseId`/`prescribedExerciseName` enrichment, the `reason` reservation, and the existing relationship arrays provide all necessary hooks.

---

## Section 14 — Non-Behaviors

Exercise substitution does not and will not (unless explicitly reconsidered in a future architecture document):

| Non-Behavior | Reason |
|-------------|--------|
| Automatically substitute any exercise | Substitution is always athlete-initiated. The system never substitutes without an explicit action. |
| Suggest progressions as substitutes | Harder exercises are not appropriate default substitutions for athletes facing constraints (EX-002-D1). |
| Reduce Honor eligibility for substituting | Honors measure athlete engagement, not program compliance. Substitution is healthy engagement (EX-002-D9). |
| Reduce program completion credit for substituting | A completed session is a completed session regardless of substitutions (EX-002-D9). |
| Display "you deviated from program" messaging | Forge does not penalize athletes for adapting their training (W-9 §9.3). |
| Track or display a program purity or compliance score | No such metric exists in Forge Legacy. |
| Modify FORGE ProgramDefinition records | Athletes never own or modify FORGE content (PE-D1, PE-D8, EX-002-D4). |
| Retroactively modify completed session logs | Historical integrity is inviolable (EL-D6, EL-D7, EX-001-D14). |
| Surface CUSTOM exercises in Suggested Substitutes | MVP recommendation generation uses FORGE relationship networks only (EX-002-D2). |
| Allow athletes to author alternative, progression, or regression relationships | Relationship authorship is the content team's domain in MVP. |
| Hard-filter alternatives by equipment availability | Athlete has better knowledge of available equipment than the system. |
| Auto-apply a previous substitution preference to future sessions | Preferences are explicit and session-by-session. No global override rules in MVP. |
| Create a standing substitution rule | Athlete makes the persistence choice at each substitution event (EX-R4). |
| Display substitution history annotations in W-18 or W-19 | `SubstitutionRecord` is captured; UI surface for annotations is post-MVP. |
| Delete SubstitutionRecord entries | Records are a permanent audit trail. No deletion mechanism exists. |
| Hard-delete exercises that have SubstitutionRecord history | Hard deletion is not available anywhere in the system (EX-001-D7). |
| Suggest alternatives for exercises with no relationship data | When relationship arrays are empty, the Suggested Substitutes section is absent; the full picker is always available. |
| Cross-athlete CUSTOM exercise substitution | CUSTOM exercises are private to their author (EX-001-D2). |

---

## Section 15 — Architecture Decisions

| Decision | Rule |
|----------|------|
| **EX-002-D1 — Progressions excluded from all substitution surfaces** | `progressionExerciseIds` are not surfaced in any substitution context in MVP or future versions unless explicitly reconsidered. Progressions represent advancement, not modification. Presenting a harder exercise to an athlete facing a constraint is counterproductive and potentially harmful. Progression systems are governed by future coaching and advancement architecture. |
| **EX-002-D2 — CUSTOM exercise recommendations scoped to MVP** | MVP substitution recommendations only use FORGE-authored relationship networks. CUSTOM exercises are excluded from recommendation generation in MVP, but future recommendation systems may incorporate CUSTOM exercises through AI enrichment, coach tooling, athlete behavior patterns, or future exercise intelligence systems. `SubstitutionRecord` captures behavioral data from launch to support this future compatibility. Athletes may still select CUSTOM exercises ad-hoc via the full W-23 picker; the restriction applies only to system-generated suggestions. |
| **EX-002-D3 — Session-only default persistence** | The default persistence choice is "This session only." This is the safest default — it does not permanently alter templates or programs based on what may be a situational decision. Athletes with intentional permanent substitutions explicitly select the persistence option. Defaulting to persistence would cause unexpected template and program changes for athletes substituting situationally. |
| **EX-002-D4 — FORGE ProgramDefinitions are immutable to athlete substitution** | Athletes do not own FORGE content. Substitutions in FORGE program workouts are always session-only. Consistent with PE-D1, PE-D8, PE-D10, and EL-D1 source immutability. |
| **EX-002-D5 — Prescription quantities preserved on persistence** | When a substitution is persisted to a template or program, only `exerciseId` changes on the `ExercisePrescription`. Sets, reps, weight, duration, distance, rest, and notes are preserved. The athlete is replacing the movement, not the training prescription. Consistent with EX-001-D11 tombstone replace behavior. |
| **EX-002-D6 — SubstitutionRecord is write-once and immutable** | Substitution records are a permanent audit trail supporting future analytics, AI training, and coach review. Mutability would undermine the integrity of the behavioral dataset. No update or delete mechanism exists. |
| **EX-002-D7 — prescribedExerciseId/Name added to exercise-level session data** | Historical logs must show both what was prescribed and what was performed. This enables future substitution annotations in W-18/W-19, coach review, and AI system training. The data cost is two nullable fields that are null in the vast majority of sessions. |
| **EX-002-D8 — W-23 REPLACEMENT context surfaces Suggested Substitutes** | When opened with `replacingExerciseId`, W-23 surfaces a curated suggestions section from the relationship graph. Without this, athletes must navigate to W-22 before substituting — an extra step that breaks workout momentum. The Suggested Substitutes section puts curated alternatives directly in the selection flow at the moment of need. |
| **EX-002-D9 — Honor, program, and chapter neutrality** | Substitution has zero effect on Honor eligibility, chapter attribution, program completion, or any legacy-level metric. Forge's philosophy is to affirm athlete engagement, not police execution compliance. |
| **EX-002-D10 — reason field reserved, not surfaced in MVP** | A `reason` field on `SubstitutionRecord` would enable fine-grained analytics and AI training signal. However, prompting athletes to classify their reason mid-workout adds friction at exactly the wrong moment. The field is schema-reserved for future collection at a low-friction touchpoint (e.g., session reflection). Always `null` in MVP. |
| **EX-002-D11 — No hard equipment filter on Suggested Substitutes** | Athletes have better knowledge of their available equipment than the system does. An untagged equipment requirement does not mean the equipment is unavailable. Hard filtering may remove valid options. Environment-aware ordering surfaces compatible options first; the athlete decides. |
| **EX-002-D12 — Partially logged sets before substitution remain under the original exercise** | If an athlete logs 2 sets of the prescribed exercise then substitutes, those 2 sets are logged under the original exercise. Retroactively reassigning logged sets to the substitute would misrepresent what the athlete actually did. Historical accuracy governs. |

---

## Section 16 — Validation Checklist

### Relationship Data Model
- [ ] `alternativeExerciseIds`: bidirectional resolution at read time; symmetric authoring not required by the system
- [ ] `regressionExerciseIds`: directional; content team authors both directions independently
- [ ] `progressionExerciseIds`: directional; never surfaced in any substitution context (EX-002-D1)
- [ ] All three arrays: FORGE only; CUSTOM always `[]` (EL-D12)
- [ ] Self-reference prohibited; cross-source reference (FORGE ↔ CUSTOM) prohibited
- [ ] Inactive exercise references in arrays: omitted from Suggested Substitutes at display time

### SubstitutionRecord
- [ ] Created synchronously on substitution confirmation
- [ ] Write-once; never updated or deleted
- [ ] `prescribedExerciseName` and `substituteExerciseName` snapshotted at creation time
- [ ] `reason: null` in MVP; field exists in schema as reserved
- [ ] `scope`: SESSION / TEMPLATE / PROGRAM
- [ ] `persistedToId: null` when scope = SESSION; set to template/program id otherwise
- [ ] One record per substitution action per exercise per session; sequential substitutions at same slot produce separate records

### ExerciseLog Enrichment
- [ ] `prescribedExerciseId: uuid | null` — null when no substitution occurred
- [ ] `prescribedExerciseName: string | null` — snapshotted; null when no substitution occurred
- [ ] Populated only when substitution workflow was completed by the athlete
- [ ] Not populated for set-count or weight deviations from prescription
- [ ] Not populated for [+ Add Exercise] additions (no prescribed exercise in that context)

### Persistence Choice
- [ ] Default selection: "This session only"
- [ ] "Update my template" available only when session is from a personal template
- [ ] "Update my program" available only when session is from ATHLETE_CREATED or IMPORTED program
- [ ] FORGE programs: session-only only; no persistence option shown to athlete
- [ ] On persistence: only `exerciseId` changes; all prescription quantities preserved (EX-002-D5)
- [ ] Template persistence triggers `WorkoutTemplate.updatedAt` update

### Substitution Execution
- [ ] Prescription quantities (sets, reps, weight, duration, distance, rest, notes) carry forward to substitute exercise
- [ ] Sets logged before substitution remain under the original exercise in the session log (EX-002-D12)
- [ ] No deviation messaging; no program purity indicators (W-9 §9.3, EX-002-D9)
- [ ] No Honor reduction; no program completion reduction (EX-002-D9)
- [ ] No automatic substitution without explicit athlete action (§7.7)

### W-23 REPLACEMENT Context
- [ ] Suggested Substitutes section appears when `replacingExerciseId` is set and relationship arrays are non-empty
- [ ] Source: bidirectional `alternativeExerciseIds` + `regressionExerciseIds` of original exercise
- [ ] `progressionExerciseIds` never included (EX-002-D1)
- [ ] CUSTOM exercises never included in Suggested Substitutes (EX-002-D2)
- [ ] Ordering: environment-compatible first → same movement pattern → remaining alternatives → regressions
- [ ] Maximum 6 entries in Suggested Substitutes section
- [ ] Section absent when no alternatives or regressions exist; standard W-23 view shown
- [ ] Full W-23 catalog accessible beneath suggested section; athlete not limited to suggestions
- [ ] Inactive exercises excluded from suggestions

### Program Behavior
- [ ] FORGE ProgramDefinition never modified by athlete substitution (EX-002-D4)
- [ ] ATHLETE_CREATED / IMPORTED program: athlete may persist; program slot `exerciseId` updated
- [ ] Prior completed sessions unaffected by program updates (EL-D6)

### Template Behavior
- [ ] Template update on persistence: only `exerciseId` changes; prescription quantities preserved
- [ ] Prior sessions from this template unaffected (EL-D6)
- [ ] `WorkoutTemplate.updatedAt` updated on persistence

### CUSTOM Exercise Rules
- [ ] CUSTOM exercises are ad-hoc substitution eligible (athlete selects via W-23 full picker)
- [ ] CUSTOM exercises not in Suggested Substitutes in MVP (EX-002-D2)
- [ ] CUSTOM relationship arrays remain `[]` (EL-D12)
- [ ] CUSTOM exercise authored by Athlete A cannot substitute for Athlete B (EX-001-D2)
- [ ] SubstitutionRecord correctly captures CUSTOM `id` and snapshotted `name` when selected ad-hoc

### Historical Integrity
- [ ] SubstitutionRecord immutable; no deletion mechanism
- [ ] `prescribedExerciseName` snapshot permanent
- [ ] `substituteExerciseName` snapshot permanent
- [ ] W-18 / W-19 display uses `exerciseName` (substitute); `prescribedExerciseName` not displayed in MVP but is captured

---

## Section 17 — Downstream Impact

| Document | Impact |
|----------|--------|
| `Exercise-Library-Architecture-v1.0.md` | Exercise-002 is additive. No changes required. Relationship field behavioral rules are now fully defined. EL-D12 (no MVP UI for progression/regression fields) is extended and upheld. |
| `Exercise-001-Custom-Exercise-Architecture.md` | No changes required. EX-002-D2 confirms CUSTOM exercises' `[]` relationship arrays. EX-001-D15 tombstone replace is explicitly distinguished from exercise substitution (§1.2). |
| `Active-Workout-Flow-Spec-W9-W16.md` | W-9 must implement: "Replace Exercise" action trigger on exercise cards; persistence choice UI (session / template / program); prescription quantity carry-forward to substitute; `ExerciseSessionData` enrichment with `prescribedExerciseId`/`prescribedExerciseName`; `SubstitutionRecord` creation on confirmation. |
| `Exercise-Picker-Wireframe-Spec-W23.md` | W-23 requires a new Suggested Substitutes section when `replacingExerciseId` is set. Source, ordering, maximum display, CUSTOM exclusion, and fallback rules are defined in §11.3 and §12.2. A W-23 amendment or inline update is required. |
| `Exercise-Detail-Wireframe-Spec-W22.md` | No MVP changes required. W-22 ALTERNATIVES section authority is affirmed. Post-MVP: add REGRESSIONS section per §11.2. |
| `Free-Workout-Builder-Spec-W25.md` | Template persistence on substitution (§9.1) requires implementation in the template data layer. No W-25 screen changes; this is a backend persistence concern. |
| `Program-Ecosystem-Architecture-v1.0.md` | Program update on substitution persistence for ATHLETE_CREATED/IMPORTED programs (§8.2) requires implementation. No Program Ecosystem Architecture document changes needed — rules are additive. |

---

## Section 18 — Future Backlog

### EX-R3 — SubstitutionRecord UI Surface in W-19

Future evaluation: a small annotation beside each substituted exercise in W-19 Activity Detail — "Substituted for [original name]." Data is captured from MVP launch. UI annotation is low priority in MVP; implement when activity detail surfaces are revisited.

### EX-R4 — Standing Substitution Preferences

Future evaluation: allowing athletes to declare a standing preference (always substitute Exercise A with Exercise B). Would require a new entity such as `AthleteExercisePreference`. Architecture of the preference model should align with whatever exercise intelligence system is developed first.

### EX-R5 — Equipment-Aware Session Context

Future evaluation: an athlete-declared "session equipment" model enabling hard equipment filtering in substitution suggestions. Most valuable for athletes with variable training environments (home/gym alternation). `SubstitutionRecord` patterns may identify which exercises most benefit from equipment-aware filtering.

### EX-R6 — reason Field Collection for SubstitutionRecord

Future evaluation: collecting `reason` at a low-friction touchpoint such as a post-session reflection screen. Would populate the reserved `reason` field on `SubstitutionRecord` (injury, equipment, preference, environment, other) and enable fine-grained analytics and AI training signal.

### EX-R7 — Coach-Authored Alternative Relationships

Future evaluation: allowing coach systems to author custom `alternativeExerciseIds` entries for specific athletes, overriding or extending the FORGE relationship network with athlete-specific recommendations.

---

## Section 19 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Defines the complete Exercise Substitution Architecture for Forge Legacy. Covers: substitution purpose and distinction from builder swap and tombstone replace; training intent hierarchy and core philosophy; relationship type semantics (alternatives as primary pool, regressions as secondary, progressions excluded); data model including SubstitutionRecord entity and ExerciseLog enrichment; FORGE relationship authoring rules; CUSTOM exercise compatibility with future intelligence system compatibility preserved; workout execution behavior and persistence choice model; program and template behavior; logging and snapshot discipline; W-23 REPLACEMENT context Suggested Substitutes behavioral rules; environment-aware substitute ordering; future system compatibility. 12 architecture decisions (EX-002-D1 through EX-002-D12). EX-002-D2 scoped to MVP recommendation generation — CUSTOM exercises excluded from recommendations in MVP but future systems (AI, coach tooling, behavior patterns) may incorporate them. |

---

*Forge Legacy — Exercise-002: Exercise Substitution Architecture — v1.0*
*June 2026*
*Defines behavioral rules for the substitution infrastructure established in Exercise-Library-Architecture-v1.0.md.*
*Authority for all exercise substitution decisions in Forge Legacy.*
