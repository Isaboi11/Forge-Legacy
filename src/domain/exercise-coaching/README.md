# Exercise Coaching Content System

Production-ready infrastructure to **generate, validate, score, organize, review,
version, and serve** coaching content for every exercise in Forge Legacy. It is a
separate, normalized layer that sits beside — and only ever *consumes* — the
canonical exercise catalog, equipment catalog, muscle taxonomy, and relationship
graph.

> **⛔ STATUS: SYSTEM ONLY — NO CONTENT GENERATED.**
> The committed store (`content/coaching_content.json`) is intentionally **empty**.
> The batch production run is **gated on human approval**. Nothing here has written
> or published coaching content. `validate.mjs --dry-run` / `report.mjs --dry-run`
> exercise the full pipeline over all 794 exercises **in memory** without persisting
> anything.

---

## Modularity (what stays separate)

The coaching layer is deliberately decoupled. Each of these remains the single
source of truth for its own concern and is **never modified** by this system:

| Concern | Owner | This system's relationship |
|---|---|---|
| Exercise definition (name, family, equipment, pattern, difficulty) | `../exercise-relationships/source/exercises.json` | read-only input |
| Equipment / muscle taxonomy | `source/equipment.json`, `muscles.json`, `exercise_muscles.json` | read-only input |
| Relationship graph (substitutes / progressions / …) | `../exercise-relationships/exercise_relationships.json` | read-only signal (confidence, `ZERO_RELATIONSHIPS`) |
| Workout prescriptions | (backend) | untouched |
| `whyItMatters` / `description` education fields | `ExerciseDefinition` (Architecture Amendment 001) | **not duplicated here** |

One coaching record exists **per exercise**, keyed by the catalog `exerciseId`.

---

## Files

| File | Purpose |
|------|---------|
| `schema.ts` | `ExerciseCoachingContent` type, enums, workflow states, flag codes, projection type. Typed mirror of the engine constants. |
| `engine.mjs` | Deterministic core: load/index, risk classifier, confidence, flag engine, generator, similarity, workflow, projection. |
| `store.mjs` | Content-store IO (load/write records + manifest) with stable ordering. |
| `generate.mjs` | Resumable/idempotent batch generator CLI. |
| `validate.mjs` | Validator → tiered report (`FAIL`/`VIOLATION`/`WARN`); `--dry-run`. |
| `report.mjs` | Editorial review reports (+ `--dry-run`, `--json`). |
| `query-service.ts` | App-facing `CoachingContentService` (editorial reads + serving). |
| `integration.ts` | The **only** UI bridge — projects a record onto the UI-safe view (W-22). |
| `content/coaching_content.json` | The record store. **Empty until an approved run.** |
| `content/manifest.json` | Resumability manifest (completed ids by batch). |
| `__tests__/coaching.test.mjs` | 40 tests (`node --test`). |

## Commands

```bash
# Validate (committed store, or the full catalog in-memory)
node src/domain/exercise-coaching/validate.mjs
node src/domain/exercise-coaching/validate.mjs --dry-run

# Review reports
node src/domain/exercise-coaching/report.mjs --dry-run
node src/domain/exercise-coaching/report.mjs --json

# Tests
node --test src/domain/exercise-coaching/__tests__/coaching.test.mjs

# GENERATION — gated on approval. Do not run until approved.
node src/domain/exercise-coaching/generate.mjs              # all gaps
node src/domain/exercise-coaching/generate.mjs --batch=Machines
node src/domain/exercise-coaching/generate.mjs --regenerate # refresh auto-generated records
node src/domain/exercise-coaching/generate.mjs --dry-run
```

---

## Schema (`ExerciseCoachingContent`)

**Content fields:** `setupInstructions[]`, `executionSteps[]`, `coachingTips[]`,
`commonMistakes[]`, `mistakeCorrections[]` (1:1 with mistakes), `breathingGuidance`,
`tempoGuidance`, `rangeOfMotionNotes`, `cueHierarchy[]` (most-important-first),
`advancedCoachingNotes[]`, `beginnerNotes[]`, `equipmentSetup`, `spottingNotes`
(only when relevant), `safetyNotes[]` (only when relevant), `difficultyConsiderations`.

**Editorial metadata (never user-visible):** `coachNotes`, `reviewFlags[]`,
`riskTier`, `confidenceScore`, `contentStatus`, `source`, `contentVersion`,
`schemaVersion`, `generatorVersion`, `contentHash`, `generatedAt`, `updatedAt`,
`reviewedBy`, `approvedBy`, `approvedAt`, `history[]`, `locale` (translation-ready).

---

## Editorial workflow

```
Draft → Auto-Validated → Needs Review → Approved → Published
```

- Automation may only ever assign **Draft / Auto-Validated / Needs Review**.
- **`Approved` and `Published` are human-only** — `transition()` throws if asked to
  make those moves without a human actor. Claude never auto-publishes.
- Only **Published** content is served to end users (`integration.ts`).

**Routing** (`routeStatus`) — a fresh record rests at **Needs Review** if it is
Specialist, has any blocking flag, is Technical, is below confidence 75, or has any
`warn` flag; otherwise **Auto-Validated** (still awaiting a human `Approve`).

## Risk classification (`classifyRisk`)

Deterministic, priority-ordered:

- **Specialist** — Olympic lifts, advanced gymnastics, strongman implements, loaded
  get-ups (token-matched). *(snatch, clean & jerk, planche, front lever, muscle-up,
  atlas stone, tire flip, Turkish get-up, …)*
- **Technical** — free-weight compounds at Intermediate+, overhead free-weight
  presses, bodyweight vertical-pull skills (pull-up/dip), plyometrics. *(back squat,
  deadlift, pull-up, power movements)*
- **Standard** — machines, cables, isolation, beginner bodyweight. *(machine chest
  press, leg extension, cable curl)*

## Confidence engine (`confidence`, 0–100)

Editorial-only signal (**users never see it**). Starts at 100 and subtracts for:
movement complexity (Specialist −30, Technical −8, Advanced −8), metadata quality
(`Other` pattern −30, missing real primary muscle −15), equipment ambiguity
(unusual equipment −6), exercise rarity (lone family −6, rare pattern −4), and
relationship quality (0 edges −10, ≤2 edges −4).

## Review flags (`computeFlags`)

`LOW_CONFIDENCE`, `OLYMPIC_LIFT`, `ADVANCED_GYMNASTICS`, `STRONGMAN`,
`SPECIALIST_TIER`, `TECHNICAL_TIER`, `SPOTTING_REQUIRED`, `METADATA_INCONSISTENCY`,
`AMBIGUOUS_SETUP`, `UNUSUAL_EQUIPMENT`, `DUPLICATE_WORDING`, `POSSIBLE_CONTRADICTION`,
`MOVEMENT_PATTERN_MISMATCH`, `STANDING_SEATED_CONTRADICTION`,
`MACHINE_FREEWEIGHT_MISMATCH`, `ZERO_RELATIONSHIPS`, `SPARSE_CONTENT`. Each carries a
severity (`info` / `warn` / `block`). Any `block` flag keeps a record out of
Auto-Validated.

## Similarity detection (`detectDuplicates`)

Flags **near-identical coaching across genuinely different exercises**. Grouped by
movement pattern; a pair is flagged only when similarity ≥ 0.95 **and** the two
exercises are a different `family` **and** share no real primary muscle. **Shared
family / shared-muscle language is acceptable and never flagged** — only copy-paste
across unrelated movements is.

---

## Generation strategy

**Metadata-driven templates.** `composeContent(node)` builds every field from the
exercise's own metadata — movement pattern (18 banks) × equipment modifier ×
body position × unilateral status × difficulty. Coaching is **specific and
observable** ("Drive your elbows down toward your hips", "Point your elbows toward
your hips as you lower") — never the banned generics ("use good form", "engage your
core", "keep your posture"), which `validate.mjs` enforces. A machine press is not
coached like a barbell bench; a seated cable row is not coached like a dumbbell row;
a unilateral movement gets single-side language.

**Batches** (generation order): `Machines → Cable → Dumbbells → Bodyweight →
Barbell → Bands → Kettlebells → Cardio → Mobility → Specialist`. Each exercise maps
to exactly one batch (`assignBatch`).

**Resumable & idempotent.** By default the generator only fills gaps — existing
records are left alone, so re-running never duplicates work. `--regenerate` refreshes
auto-generated records, bumping `contentVersion` **only on a real content-hash
change** and **never** overwriting `Editor-Edited`/`Approved`/`Published` records.
With a fixed clock, output is byte-identical (`contentHash` = FNV-1a of the body).

**Versioning.** `contentVersion` + append-only `history[]` + `reviewedBy`/`approvedBy`
give a full audit trail. `locale` and the generator/schema version tags make the
record shape translation- and regeneration-safe.

## Validation (`validate.mjs`)

Three tiers (exit 1 only on `FAIL`):

- **FAIL** (integrity): unknown/duplicate ids, missing fields, invalid enums,
  out-of-range confidence, malformed corrections, self-approved automation, etc.
- **VIOLATION** (content quality): missing setup/execution, missing corrections,
  duplicate tips/mistakes, banned generic phrasing, definite equipment/position/
  pattern contradictions.
- **WARN** (editorial): coverage gap, cross-record duplicate wording, heuristic
  position suspicions, status/risk breakdowns.

Dry-run over the full catalog currently reports **0 FAIL, 0 VIOLATION** (the three
seated-in-standing-pattern edge cases are correctly surfaced as WARN + routed to
review).

## Reports (`report.mjs`)

Summary statistics, coverage by batch, status/risk breakdown, confidence
distribution, flag frequency, lowest confidence, specialist list, needs-review
queue, most-edited, duplicate wording, and missing content. `--json` for tooling.

---

## Integration plan (W-22 Exercise Detail)

`integration.ts` is the **only** path from coaching content to the UI. It projects a
record onto `ExerciseCoachingView`, dropping **every** editorial field, and serves
**Published only**. The view maps onto the LOCKED W-22 content order:

| W-22 section | View field | Source |
|---|---|---|
| HOW TO DO IT | `instructions` | `setupInstructions` + `executionSteps` |
| COACHING CUES | `tips` | `cueHierarchy` (fallback `coachingTips`) |
| WATCH OUT FOR | `commonMistakes` | `commonMistakes` |
| *(additive, optional)* Safety Notes | `safetyNotes` | `safetyNotes` |
| *(additive, optional)* Advanced Notes | `advancedNotes` | `advancedCoachingNotes` |

`WHY IT MATTERS` and `ABOUT` are **not** produced here — they are
`ExerciseDefinition.whyItMatters` / `.description` (Architecture Amendment 001),
kept separate by design. The two optional sections are additive projections the
screen *may* adopt via a future minor W-22 amendment; they do not reorder the locked
six sections. Non-published exercises return `null`, and W-22's existing
section-visibility rules (§4.2) hide the empty sections. The UI **never** reads a raw
record and **never** sees confidence scores or review flags.

---

## First-pass caveat

Everything the generator produces is a reviewed-by-humans **first pass** — every
record starts `Auto-Generated` and no record ever auto-advances past review. The
generated corpus intentionally leaves the ~34 unclassifiable (`Other`-pattern)
residue exercises sparse and flagged, and surfaces heavy shared wording for the
generic patterns (mobility/core/cardio) as `DUPLICATE_WORDING` so editors can
differentiate them. This is the system working as designed.
