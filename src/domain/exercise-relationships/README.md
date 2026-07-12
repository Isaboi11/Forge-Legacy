# Exercise Relationship Graph

Deterministic, movement-pattern-first relationship graph for the Forge Legacy
exercise catalog. Regenerated from scratch (July 2026) after the previous
auto-generated dataset was found to link exercises across unrelated movement
patterns (e.g. Press → Clean, Lunge → Crunch) because it scored similarity on
broad `full_body` / `cardiovascular` muscle buckets.

**Every relationship is `editorialStatus: "Auto-Generated"` and must stay that
way until a human editor reviews it.** This is a first-pass production dataset,
not a final one.

## Files

| File | Purpose |
|------|---------|
| `schema.ts` | `ExerciseRelationship` type, the 5 relationship types, projection types |
| `engine.mjs` | Deterministic core: load → index → score → type → generate → project → query |
| `generate.mjs` | CLI that (re)writes `exercise_relationships.json` |
| `validate.mjs` | Validator (FAIL / VIOLATION / WARN tiers) |
| `query-service.ts` | App-facing typed query layer (`ExerciseRelationshipService`) |
| `exercise_relationships.json` | **Generated output** — do not hand-edit |
| `source/` | Committed copy of the canonical catalog (inputs) |
| `__tests__/relationships.test.mjs` | 27 automated tests (`node --test`) |

## Commands

```bash
node src/domain/exercise-relationships/generate.mjs        # regenerate
node src/domain/exercise-relationships/validate.mjs        # validate (exit 1 on FAIL)
node --test src/domain/exercise-relationships/__tests__/   # run tests
```

## The five relationship types (directional)

Relationships are **directional**: `A → B` does not imply `B → A`. The id is
always `sourceExerciseId__targetExerciseId`.

| Type | Meaning | Rule |
|------|---------|------|
| **Variation** | Same family, same tool, different execution | same family, **no** equipment change, similar demand |
| **Equipment Alternative** | Same movement, different equipment | same family, equipment change, similar demand |
| **Substitute** | Same pattern, different exercise, similar intent | different family, similar demand |
| **Progression** | Harder version | demand(target) − demand(source) ≥ 2 |
| **Regression** | Easier version | demand(source) − demand(target) ≥ 2 |

Exactly one type is assigned per directed edge, so a target appears in at most
one of an exercise's relationship arrays (satisfies EL-D12 non-overlap).

## The candidacy gate (why the old bug can't recur)

`B` is a candidate relationship for `A` **only if**:

1. `preservesPattern(A, B)` — same `movementPattern`, and that pattern is **not
   `"Other"`** (a non-discriminating catch-all). *No type ever crosses movement
   patterns.*
2. A real **similarity tie** exists — one of:
   - same `family`, **or**
   - overlapping **real** primary muscle (anatomical), **or**
   - both muscle-less (cardio/carry/power) **and** same `modality`.

The five **System muscle buckets** — `full_body`, `cardiovascular`, `mobility`,
`grip`, `balance` — contribute **zero** similarity. They never participate in
scoring, `samePrimaryMuscle`, or `sharedPrimaryMuscleIds`. This is the direct
fix for the previous dataset's cross-pattern pollution.

## Compatibility score (0–100, deterministic)

Movement pattern carries the largest single weight. Score is the sum, capped at 100:

| Signal | Weight |
|--------|--------|
| Movement pattern preserved | **45** |
| Same exercise family | 15 |
| Primary-muscle overlap (Jaccard, real muscles) | 15 × J |
| Secondary-muscle overlap (Jaccard, real muscles) | 6 × J |
| Difficulty proximity | 7 × (1 − |Δ|/2) |
| Same modality | 4 |
| Equipment (same 5 / same category 2 / else 0) | 5 |
| Compound-vs-isolation role match | 3 |

Candidates are kept if score ≥ **55**, then ranked by score (desc), ties broken
by target id (asc), and capped at **8 per exercise** (target 5–8, quality over
quantity — sparse exercises get fewer, `"Other"`-pattern exercises get none).

### Demand model (drives Progression/Regression)

`demand = 2·difficultyOrdinal + equipmentInstability + unilateral`

- `difficultyOrdinal`: Beginner 0, Intermediate 1, Advanced 2
- `equipmentInstability`: machines 0 → cable/plyo/sled/cardio 1 → barbell/band/bodyweight 2 → dumbbell/kettlebell 3 → suspension 4
- `unilateral`: +1 for single-arm/leg, pistol, bulgarian, archer, etc.

`|Δdemand| ≥ 2` → Progression/Regression; otherwise an alternative-family type.

## Integration with the locked architecture (no duplicate systems)

This edge graph is the **normalized source** that backs the three relationship
arrays defined in `Exercise-Library-Architecture-v1.0` (EL-D12) and consumed by
`Exercise-002` (substitution). `query-service.ts → resolveArrays()` projects it:

| EL-D12 array | Fed by | Direction |
|--------------|--------|-----------|
| `alternativeExerciseIds` | Substitute + Equipment Alternative + Variation | bidirectional (resolved at read time, per §2.3) |
| `regressionExerciseIds` | Regression | directional |
| `progressionExerciseIds` | Progression | directional |

Consumers:
- **W-9 Replace Exercise** → `getSubstitutionPool()` (alternatives + regressions;
  progressions excluded per Exercise-002 §3.4)
- **W-22 Exercise Detail** → `getAlternatives()` (+ post-MVP `getRegressions()`)
- **W-23 Picker (REPLACEMENT)** → `getSubstitutionPool()` + `filterByEnvironment()`

The generator keys off the canonical `movementPattern` **strings**
(`Horizontal Push`, `Hinge / Hip Dominant`, …). The locked schema also defines a
21-value `MovementPattern` enum (`PUSH_HORIZONTAL`, `HINGE`, …); mapping the
canonical strings onto that enum is an editorial follow-up, not a code change here.

## Source-catalog correction pass (July 2026)

The canonical catalog under `source/` was corrected before the current graph was
generated. Every change is logged in `SOURCE-CORRECTIONS.csv` (610 field edits
across 298 records). Highlights:

- **Smith Machine** — all 15 `smith-machine-*` now reference `equipmentId:
  smith_machine` (were `selectorized_machine`).
- **`movementPattern: "Other"`**: 225 → 36 (313 records reclassified).
- Categories remapped out of `Other`/system-buckets with anatomical primaries:
  walking lunges → `Squat / Knee Dominant`; crunches/sit-ups/twists → `Core`;
  floor/board/spoto/larsen presses → `Horizontal Push`; Olympic lifts →
  `Power / Plyometric`; carries → real `forearms`/`traps` primary (was `grip`);
  shrugs & delt raises → **new `Shoulder Isolation` pattern**; hip/glute
  isolation → `Hip Isolation`; etc.
- Family whitespace normalized (e.g. `"Smith   Bench Press"` → `"Smith Bench Press"`).

Corrections are applied only to **problematic** records (pattern `"Other"` OR
all-System-bucket primary); records that already had a real pattern + primary
were never touched. Re-running the corrector is idempotent.

### Canonical `MovementPattern` enum (taxonomy amendments)
`schema.ts` `MOVEMENT_PATTERNS` (mirrored in `engine.mjs`, enforced by
`validate.mjs`) is the authoritative data-layer taxonomy — 18 values. Two
isolation patterns were added alongside the existing `Hip Isolation` /
`Calf / Ankle`:
- **`Shoulder Isolation`** — shrugs and lateral/front/rear-delt raises.
- **`Neck Isolation`** — the three neck-machine exercises.

Both are mirrored into Exercise-Library-Architecture-v1.0 § 4.2 as
`SHOULDER_ISOLATION` / `NECK_ISOLATION` (Amendment R1-6). The muscle taxonomy
also gained **`neck`** (Neck / Upper Body) so the neck machines carry a real
anatomical primary rather than a system bucket.

## Remaining editorial residue (~39 exercises, zero-relationship)

Left as-is for human review — no biomechanically defensible same-pattern match,
so they are intentionally **not** force-linked: strongman (sled drags/pushes,
atlas stones, kegs, sandbag loads, tire flips, rope pulls), gymnastics
holds/skills (levers, planche, muscle-ups, handstands, skin-the-cat), kettlebell
flows (halo, figure-eight, around-the-world, Turkish get-ups), and balance/agility
drills (hip-airplane, snap-down, sprawl). Cardio and Mobility items intentionally
keep `cardiovascular`/`mobility` as primary — no anatomical primary applies.

Regenerate + validate after any further source correction; the output is stable.
