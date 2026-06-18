# Forge Legacy — ExercisePrescription Amendment 001
## Rest and Distance Prescription Fields
### Version 1.0 | June 2026

**Status:** LOCKED
**Amends:** Workout-Builder-Wireframe-Spec-W24.md § 7.6 (ExercisePrescription schema)
**Authority over:** W-24 (ProgramSlot prescriptions), W-25 (WorkoutTemplate prescriptions), Architecture-Amendment-001-Import.md (import behavior), Active-Workout-Flow-Spec-W9-W16.md (W-9 rest overlay), W-19 (Activity Detail display)
**Triggered by:** Free-Workout-Builder-Spec-W25.md specification (June 2026)

---

## Section 1 — Purpose

ExercisePrescription Amendment 001 (EP-A1) adds three fields to the `ExercisePrescription` schema:

- `restSeconds`
- `distanceValue`
- `distanceUnit`

These fields were identified during W-25 (Free Workout Builder) specification as necessary for complete workout prescription. They are not W-25-specific. `ExercisePrescription` is a shared schema consumed by `ProgramSlot` (W-24), `WorkoutTemplate` (W-25), imported programs, active workout execution (W-9 through W-16), and future AI-generated workouts. Schema additions at this level require cross-cutting amendment authority.

This document is the sole authoritative definition of all three fields. All consumers reference EP-A1 for field definitions, display rules, and import behavior.

---

## Section 2 — Updated ExercisePrescription Schema

The full `ExercisePrescription` schema, incorporating EP-A1 additions:

```
ExercisePrescription {
  // Identity and position
  exerciseId:       string              // references ExerciseDefinition.id
  order:            number              // 1-based position within the section; per-section (restarts at 1 per section per WS-A5)

  // Volume prescription
  sets:             number | null       // positive integer; null = not prescribed
  reps:             number | null       // mutually exclusive with durationSeconds; null = not prescribed
  durationSeconds:  number | null       // mutually exclusive with reps; null = not prescribed

  // Load prescription
  weightValue:      number | null       // positive number; null = not prescribed
  weightUnit:       'lbs' | 'kg' | null // null when weightValue is null

  // Distance prescription — EP-A1
  distanceValue:    number | null       // positive number; null = not prescribed
  distanceUnit:     'm' | 'km' | 'mi' | null  // null when distanceValue is null; set when distanceValue is set

  // Rest prescription — EP-A1
  restSeconds:      number | null       // positive integer; null = no rest prescribed

  // Notes
  notes:            string | null       // athlete planning notes; max 200 chars
}
```

**Fields added by EP-A1 are:** `distanceValue`, `distanceUnit`, `restSeconds`.

All other fields are unchanged from the locked W-24 § 7.6 definition.

---

## Section 3 — Field Definitions

### 3.1 restSeconds

```
restSeconds: number | null
```

**Purpose:** Prescribed rest interval between sets of this exercise. Communicates to the athlete how long to rest before the next set of the same exercise.

**Type:** Positive integer (whole seconds). Null when no rest is prescribed.

**Scope:** A reference value. `restSeconds` represents intent, not enforcement. The active workout execution layer (W-9) uses a count-up timer and does not start, stop, or constrain behavior based on `restSeconds`.

**W-9 behavior:** The W-9 rest overlay MAY display `restSeconds` as an informational reference (e.g., "Target: 1:30") in muted secondary text alongside the count-up timer. Displaying this value does not change the count-up timer behavior, introduce color changes at any rest duration, or create visual urgency. The rest overlay principle — "count-up timer records; it does not evaluate" — is not modified by this field.

**Display format:** 
- Values ≥ 60s: mm:ss format (e.g., "1:30")
- Values < 60s: Ns format (e.g., "45s")
- Null: "—" (em-dash)

**Invariants:**
- Value must be positive if set (cannot be 0 or negative)
- No maximum enforced by schema (practical UI may cap at a reasonable maximum)
- Not linked to any timer or automated rest detection system

### 3.2 distanceValue

```
distanceValue: number | null
```

**Purpose:** Distance prescription for exercises where distance is the primary or supplementary load measure. Applies to carries, sled movements, distance repeats, and similar exercises where the athlete completes a prescribed distance rather than or in addition to reps.

**Type:** Positive number. Null when no distance is prescribed.

**Applicable exercise types:** Primarily exercises with `movementPattern ∈ {CARRY, EXPLOSIVE_FULLBODY}` (e.g., Farmer Carry, Sled Push, Battle Ropes), and distance-interval exercises (e.g., 400m tempo repeats). The schema does not enforce this — `distanceValue` is available on any exercise and may be null for exercises where it is not applicable.

**Invariants:**
- Must be set together with `distanceUnit` — both null or both non-null
- Value must be positive if set

### 3.3 distanceUnit

```
distanceUnit: 'm' | 'km' | 'mi' | null
```

**Purpose:** Unit for `distanceValue`. Per-exercise (not global across the template or slot) because exercises within the same workout may naturally use different distance scales.

**Values:**
- `'m'` — meters. Default for carries, sled, and short-distance exercises.
- `'km'` — kilometers. For longer running intervals.
- `'mi'` — miles. For US-standard running intervals.
- `null` — when `distanceValue` is null.

**Per-exercise rationale (EPA1-D1):** Farmer Carry distances are sensibly expressed in meters (20m, 40m). Tempo run intervals are sensibly expressed in km or miles (1km, 0.5mi). A global template-level `distanceUnit` would force the athlete into an awkward choice that doesn't fit all exercises. Per-exercise unit selection avoids this at the cost of minor additional configuration for mixed-unit workouts.

**Invariants:**
- Must be set when `distanceValue` is non-null
- Must be null when `distanceValue` is null
- Rule: `(distanceValue === null) === (distanceUnit === null)`

---

## Section 4 — Consumer Rules

### 4.1 W-24 — Program Workout Builder (ProgramSlot)

`ProgramSlot.sections[].exercises[]` contains `ExercisePrescription` records. All three EP-A1 fields are available on program slot prescriptions. Authors building program slots in W-24 may populate `restSeconds` and `distanceValue`/`distanceUnit` for applicable exercises.

Display rules for EP-A1 fields in W-24 follow the same pattern as W-25 (Section 5 of this document).

`restSeconds` in a program slot represents the coach's prescribed rest — the rest the program intends the athlete to take. Same reference-only semantics apply in W-9 when executing a program workout.

### 4.2 W-25 — Free Workout Builder (WorkoutTemplate)

`WorkoutTemplate.sections[].exercises[]` contains `ExercisePrescription` records. All three EP-A1 fields available. Display rules defined in Free-Workout-Builder-Spec-W25.md Section 5.

### 4.3 Import — Architecture-Amendment-001-Import.md

All imported exercises arrive with EP-A1 fields set to null:

```
distanceValue:  null   // import does not infer distance prescription
distanceUnit:   null   // import does not infer distance unit
restSeconds:    null   // import does not infer rest prescription
```

No inference of rest or distance from external source structure. Parallel to WS-A6 (all imported exercises arrive in MAIN section; no inference of section placement).

Athletes may populate EP-A1 fields post-import via W-25 (template edit) or W-24 (slot edit).

### 4.4 W-9 through W-16 — Active Workout Execution

**restSeconds:** W-9 rest overlay may display `restSeconds` as a reference value in muted secondary text when the exercise prescription has a non-null `restSeconds`. The count-up timer is not affected. No visual urgency is introduced at the target rest duration or beyond it. Display is optional — implementations may choose to omit the reference display without violating this spec.

**distanceValue / distanceUnit:** W-9 may display distance prescription alongside the exercise set row when non-null (e.g., "40m" shown as a target alongside the set). Athletes log their actual completed distance in the set log input if supported. The prescription value is reference only.

### 4.5 W-19 — Activity Detail

W-19 displays non-null `distanceValue` and `distanceUnit` as part of the exercise set row when the session log contains distance data. W-19 does not display `restSeconds` (rest is a planning value; the completed session shows logged execution, not prescribed rest).

### 4.6 Future Consumers — AI and Workout Generation

AI-generated workouts may populate `restSeconds`, `distanceValue`, and `distanceUnit` when the generated prescription includes these parameters. Generated prescriptions are `ExercisePrescription` records and must conform to all invariants in Section 3.

---

## Section 5 — Display Rules by Activity Type

EP-A1 fields are subject to the same activity-type display rules as existing prescription fields. The table below extends the existing display matrix:

| Field | STRENGTH / HIIT / OTHER | MOBILITY / YOGA | RUN / WALK / BIKE / SWIM |
|---|---|---|---|
| `restSeconds` | Shown | Shown | Hidden |
| `distanceValue` / `distanceUnit` | Shown (optional per exercise) | Hidden | Shown |

**Rest shown for MOBILITY/YOGA:** Rest between stretches or mobility holds is a valid prescription. A mobility routine may prescribe 30s rest between hip flexor stretches. `restSeconds` is available and visible for MOBILITY/YOGA exercise types.

**Distance hidden for MOBILITY/YOGA:** Distance is not applicable to mobility and flexibility exercises.

**Distance shown for RUN/WALK/BIKE/SWIM:** In a template context for interval training (e.g., "8 × 400m with 90s rest"), distance is the primary prescription alongside duration. Both fields are shown.

---

## Section 6 — Architecture Decisions

| Decision | Value |
|---|---|
| EPA1-D1 — distanceUnit is per-exercise | Distance unit cannot be sensibly globalized at the template or slot level because exercises within the same workout naturally use different distance scales (meters for carries, km or miles for run intervals). Per-exercise unit control avoids forcing an awkward global choice. This differs from `weightUnit`, which is consistent across exercises in a workout because all barbell work is expressed in the same unit the athlete trains in. |
| EPA1-D2 — restSeconds is reference-only | Rest prescription communicates intent; it does not enforce a minimum or maximum rest. The W-9 count-up timer is not constrained, stopped, or modified by this value. Prescribing rest does not change the athlete's autonomy. Displaying a target rest time is informational, not evaluative. |
| EPA1-D3 — All EP-A1 fields are optional | Null is valid for all three fields. No exercise requires a distance or rest prescription to be a valid ExercisePrescription. Mandatory prescription fields would create false completeness requirements and add friction to the builder. |
| EPA1-D4 — distanceValue and distanceUnit are always null/non-null together | A distance value without a unit is meaningless. A unit without a value is meaningless. The pair is enforced as always co-present or co-absent. |
| EPA1-D5 — Import sets all EP-A1 fields to null | Inference of rest periods and distances from imported external training files is unreliable and would create false prescriptions. Athletes who want rest and distance on imported programs set them manually post-import. |

---

## Section 7 — Validation Checklist

### Schema
- [ ] `restSeconds: number | null` added to ExercisePrescription
- [ ] `distanceValue: number | null` added to ExercisePrescription
- [ ] `distanceUnit: 'm' | 'km' | 'mi' | null` added to ExercisePrescription
- [ ] All three fields default to null on exercise creation
- [ ] Invariant: `distanceValue` and `distanceUnit` are co-present or co-absent

### restSeconds Rules
- [ ] Positive integer or null
- [ ] Reference value only — no timer enforcement
- [ ] W-9 rest overlay may display as muted reference; count-up behavior unchanged
- [ ] Display format: mm:ss (≥60s), Ns (<60s), "—" (null)
- [ ] Visible for STRENGTH/HIIT/OTHER/MOBILITY/YOGA; hidden for RUN/WALK/BIKE/SWIM

### distanceValue / distanceUnit Rules
- [ ] Positive number or null (distanceValue)
- [ ] 'm' | 'km' | 'mi' | null (distanceUnit)
- [ ] Co-present or co-absent (EPA1-D4)
- [ ] Per-exercise unit (not global)
- [ ] Visible for STRENGTH/HIIT/OTHER/RUN/WALK/BIKE/SWIM; hidden for MOBILITY/YOGA

### Consumer Compliance
- [ ] W-24 program slot prescriptions support all three fields
- [ ] W-25 template prescriptions support all three fields (per Free-Workout-Builder-Spec-W25.md)
- [ ] Import: all three fields null on arrival (per EP-A1 import rule)
- [ ] W-9 rest overlay: restSeconds displayed as reference if non-null; count-up unchanged
- [ ] W-19: distanceValue/distanceUnit shown if non-null; restSeconds not shown
- [ ] Future AI systems: must conform to all EP-A1 invariants

---

## Section 8 — Downstream Document Impact

| Document | Required Update |
|---|---|
| `Workout-Builder-Wireframe-Spec-W24.md` | § 7.6 ExercisePrescription schema: add three EP-A1 fields. Add note: "EP-A1 governs restSeconds, distanceValue, distanceUnit." |
| `Free-Workout-Builder-Spec-W25.md` | § 5.1 schema block: reference EP-A1 rather than defining fields inline. Remove W25-D3, W25-D4, W25-D5. |
| `Active-Workout-Flow-Spec-W9-W16.md` | W-9 rest overlay section: add note that restSeconds may be displayed as reference context when non-null. |
| `Architecture-Amendment-001-Import.md` | Add import rule for EP-A1 fields: all three arrive null; no inference. |
| `Activity-Detail-Wireframe-Spec-W19.md` | Display rule: show distanceValue/distanceUnit if non-null; do not show restSeconds. |

---

## Section 9 — Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial amendment. Adds restSeconds, distanceValue, distanceUnit to ExercisePrescription. Triggered by W-25 specification. Establishes cross-cutting authority over all ExercisePrescription consumers. |

---

*Forge Legacy ExercisePrescription Amendment 001 — v1.0*
*June 2026*
*Authority for restSeconds, distanceValue, and distanceUnit field definitions across all ExercisePrescription consumers.*
