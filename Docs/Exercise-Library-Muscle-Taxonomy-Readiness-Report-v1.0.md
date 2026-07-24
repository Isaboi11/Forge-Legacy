# Exercise Library — Muscle Taxonomy Readiness Report
## v1.0 — June 2026

**Status:** COMPLETE — Ready for Data-Population Pass
**Type:** Implementation Readiness Assessment (Phase 1 of Exercise Library Metadata Completion)
**Date:** 2026-06-29

**Documents Audited:**
- `Exercise-Library-Architecture-v1.0.md` §5 (MuscleGroup Taxonomy, LOCKED)
- `Exercise-001-Custom-Exercise-Architecture.md`
- `Exercise-002-Exercise-Substitution-Architecture.md`
- `Exercise-003-Exercise-Favorites-Architecture.md`
- `Exercise-Detail-Wireframe-Spec-W22.md` §6.2–6.3
- `Exercise-Picker-Wireframe-Spec-W23.md` §14, §15.2
- `W-28-Create-Edit-Custom-Exercise.md`
- `Program-Authoring-Standard-v1.0.md`
- All 17 population-pass docs: `Anchor-Exercise-Population-Pass-01/02/03-v1.0.md`, `Exercise-Population-Pass-04` through `14-v1.0.md`

**Purpose:**
Determine whether a canonical muscle vocabulary exists and is sufficient to classify all 200 V1 catalog exercises before the per-exercise assignment pass begins. This document does not assign muscles to any exercise and does not redesign the Exercise Library architecture.

---

## 1. Verdict

**The canonical taxonomy already exists, is LOCKED, and is sufficient. No new taxonomy and no architecture amendment were authored.**

`Exercise-Library-Architecture-v1.0.md` §5 defines a 14-value `MuscleGroup` enum — CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS, CORE, LOWER_BACK, GLUTES, QUADS, HAMSTRINGS, CALVES, HIP_FLEXORS, FULL_BODY — used for both `primaryMuscles` and `secondaryMuscles` on `ExerciseDefinition`. It is plain-language, anatomically non-redundant (each enum value carries a parenthetical anatomical definition, e.g. `LOWER_BACK` = Erector Spinae + Quadratus Lumborum, distinct from `CORE` = Rectus Abdominis/Transversus Abdominis/Obliques), and already wired into the W-22 display chips and the W-23 muscle-group filter. This satisfies the task objective to verify and reconcile an existing taxonomy rather than create a new one.

---

## 2. Cardinality Decision Log

The task brief that initiated this pass specified "one required Primary Muscle (singular)" and "zero to five Secondary Muscles." This differs from the existing locked rule in two respects. Both were raised with the project owner and resolved as follows (2026-06-29):

| # | Question | Locked rule (§5.3) | Brief's literal ask | Decision |
|---|---|---|---|---|
| 1 | Primary muscle cardinality | `primaryMuscles: MuscleGroup[]`, 1–4 values, required for FORGE | Single required scalar | **Keep locked rule** — 1–4 primary array, unchanged |
| 2 | Secondary muscle cap | `secondaryMuscles: MuscleGroup[]`, 0–4 values | 0–5 values | **Keep locked rule** — 0–4 secondary array, unchanged |

**Rationale:** the locked rule already guarantees every exercise has at least one required primary muscle — the brief's intent is satisfied without a schema change. Amending to a singular scalar would force rework of W-22 §6.2's "+N more" primary-chip expansion logic (which assumes an array) for no identified product benefit. Raising the secondary cap from 4 to 5 had no supporting use case in any audited document. **No field, type, or cardinality in `ExerciseDefinition` changed as a result of this pass.**

---

## 3. Cross-Reference Audit Results

A full-repository sweep (all `Docs/*.md`, all amendments, all 17 population-pass docs) found:

- **Zero competing or synonym vocabularies.** Casual fitness terms ("lats", "delts", "abs", "pecs", "quads") appear only in free-text coaching prose (ABOUT / WHY IT MATTERS / HOW TO DO IT sections) — never as a formal classification value. The 14-value `MuscleGroup` enum is the sole formal taxonomy referenced anywhere in the corpus.
- **Zero cardinality inconsistencies.** Every document that states a rule agrees with §5.3: FORGE = 1–4 `primaryMuscles`, 0–4 `secondaryMuscles` (both arrays); CUSTOM = both optional, 0–4 each (`Exercise-001-Custom-Exercise-Architecture.md` §5.1, `W-28-Create-Edit-Custom-Exercise.md`).
- **Zero exercises currently have muscle data.** All 17 population-pass docs explicitly exclude `primaryMuscles`/`secondaryMuscles`/`difficulty` assignment from their scope (verbatim exclusion repeated in every pass, confirmed directly in Pass 14). This confirms the gap is purely data-population, not a taxonomy design gap.
- **One cosmetic-only inconsistency found and fixed:** `Exercise-Picker-Wireframe-Spec-W23.md` §14.1 and §15.2 contained illustrative ASCII mockups using informal groupings ("Arms", "Legs") that do not correspond to any of the 14 enum values. The binding rule text immediately following the §14.1 mockup (§14.2: "Muscle Group | All muscle groups in the catalog") was already correct and unaffected. Both mockups were updated to show real enum-backed chip examples. No semantic or schema change — display illustration only.

---

## 4. Assignment Guidelines (for the next phase)

These are editorial guidelines for the upcoming per-exercise assignment pass. They are guidance for content authoring consistency only and do not modify the locked schema in any way:

- Every exercise must have at least one primary muscle.
- Isolation exercises should generally have one primary muscle.
- Compound exercises may use 2–4 primary muscles when genuinely appropriate.
- Secondary muscles should represent meaningful assisting muscles only, not every stabilizer.
- Use the minimum number of muscles necessary to accurately describe the exercise.
- Apply assignments consistently across similar movement patterns.

---

## 5. Go / No-Go

**GO.** The `MuscleGroup` taxonomy is locked, sufficient, non-redundant, and free of synonym or cardinality conflicts. The taxonomy is ready for the per-exercise `primaryMuscles`/`secondaryMuscles` assignment pass across all 200 V1 catalog exercises. That assignment pass — along with `difficulty` assignment and media production, which remain separate open gaps — is explicitly out of scope for this report.
