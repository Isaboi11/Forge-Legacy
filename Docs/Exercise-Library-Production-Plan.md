# Exercise Library Production Plan

## v1.0 | June 2026

**Status:** PLANNING — no architecture, schema, taxonomy, or screen changes performed or proposed. This document governs *how* the launch catalog will be built; it authors zero exercises and creates zero amendments.

**Type:** Production Plan (first of its kind in this series — distinct from an architecture or wireframe spec)

**Predecessors:** `Exercise-Library-Architecture-v1.0.md`, `Exercise-001-Custom-Exercise-Architecture.md`, `Exercise-003-Exercise-Favorites-Architecture.md`, `ExercisePrescription-Amendment-001.md`, `Architecture-Amendment-001-Import.md`, `Exercise-Library-Wireframe-Spec-W21.md` through `W-28`, `Program-Catalog-Architecture-v1.0.md`, `Program-Ecosystem-Architecture-v1.0.md`, `Program-Authoring-Standard-v1.0.md`.

**Premise carried in from the Repository Audit:** the Exercise Library is architecture-complete and population-ready. No blockers, no schema ambiguity, no expansion required. The project is content-constrained, not architecture-constrained. This plan is the execution layer for that conclusion.

---

## Section 1 — Launch Library Strategy

**Recommended launch catalog size:** 200 exercises — the architecture's own stated content-team target, not the 225 ceiling. The architecture is explicit that "200 complete exercises is preferable to 500 at partial quality"; treat 201–225 as overflow capacity for categories whose natural range runs wide (Legs & Glutes, Mobility), not as a second target to hit everywhere.

**Recommended category distribution** (locked ranges, `Exercise-Library-Architecture-v1.0.md` §8.2 — unchanged, not re-derived):

| Category | Target | Share of 200 |
|---|---|---|
| Legs & Glutes | 55–65 | ~30% |
| Mobility & Flexibility | 40–50 | ~22% |
| Push (Upper Body) | 30–35 | ~16% |
| Pull (Upper Body) | 28–32 | ~15% |
| Core & Stability | 20–25 | ~11% |
| Carry & Full Body | 15–18 | ~8% |

**Recommended category priority order:** Legs & Glutes → Push → Pull → Core → Carry & Full Body → Mobility. Driven by two converging signals, not catalog size alone: (1) Legs & Glutes, Push, and Pull together carry the compound movements named by `Program-Authoring-Standard-v1.0.md` §11 as required in *every* MAIN section of the 10 Strength/Hypertrophy/Lower-Body programs (sortOrder 1–10 of 25); (2) Strength Foundation I, II, and III packages already exist in the repository (`Programs/Strength/...`, committed) — these are not hypothetical future demand, they are already-authored content waiting on exercise records to become functional.

**Recommended implementation order:** anchors first (Section 2) across all categories → Strength-tier compounds and their standard accessories → remaining Hypertrophy/Lower-Body compound, isolation, and machine work → Conditioning/Hybrid → Bodyweight/Home → Running (lowest dependency, see Section 5) → Mobility. This is sequencing, not the category-priority ranking above — Mobility ranks last in *implementation order* despite its large target size because it is structurally independent of every other category and carries no risk from being built last.

---

## Section 2 — Anchor Exercise Framework

**What an anchor is, per architecture (not redefined here):** an exercise with populated `progressionExerciseIds` and/or `regressionExerciseIds`. There is no `isAnchor` field — anchor status is implicit in having relationship data. Relationships are directional (A→B does not imply B→A) and capped at a recommended 1–3 entries per array.

**Distribution principle:** spread the 40–50 anchors so that every `MovementPattern` with a plausible difficulty ladder (bodyweight → loaded → advanced) gets coverage, rather than concentrating anchors in a few categories. With 21 patterns and ~45 anchors, that is a floor of roughly 1 anchor per pattern plus extra weight on patterns proven to need multi-rung ladders.

**Movement patterns requiring anchor coverage — highest priority (named directly in the architecture's own anchor examples and load-bearing for the already-locked Strength tier):**

| Pattern | Anchor example already named |
|---|---|
| SQUAT | Back Squat |
| HINGE | Deadlift, Hip Thrust |
| PUSH_HORIZONTAL | Barbell Bench Press, Push-Up |
| PUSH_VERTICAL | Overhead Press |
| PULL_VERTICAL | Pull-Up |
| PULL_HORIZONTAL | Dumbbell Row |
| CORE_ANTI_EXTENSION | Front Plank |
| (unnamed but structurally implied) | Lunge → SQUAT family variant |

All remaining 13 patterns still require at least minimal anchor coverage (1 anchor each) to avoid a pattern having zero progression/regression data at launch, but are second priority relative to the eight above.

**Exercise families requiring anchor coverage:** no formal "family" taxonomy exists in the architecture — `MovementPattern` is the only mechanical grouping that is actually schema-backed. This plan does not invent a family field; it uses `MovementPattern` as the operative anchor-grouping unit (e.g., "squat family" = all `SQUAT`-pattern entries) and recommends that any future content-authoring sheet do the same, to avoid introducing an ungoverned classification.

**Highest-priority categories for anchors:** Legs & Glutes, Push, Pull, Core — same drivers as Section 1. Carry & Full Body and Mobility should still receive anchors (the architecture's own example list does not exclude them) but are not blocking any locked program content today.

---

## Section 3 — Content Standards

The schema already locks five content fields with exact bounds and exact on-screen labels (`Exercise-Library-Architecture-v1.0.md` §2.1; W-22 §§7–11). The content standard is to author directly against these bounds — no new fields, no new structure:

| Schema field | W-22 display label | Bounds |
|---|---|---|
| `description` | ABOUT | 1–3 sentences — what the exercise is |
| `whyItMatters` | WHY IT MATTERS | 1–4 sentences — training rationale |
| `instructions` | HOW TO DO IT | 4–8 ordered steps |
| `tips` | COACHING CUES | 2–5 cues |
| `commonMistakes` | WATCH OUT FOR | 2–4 errors |

**Repeatable authoring template (one block per exercise, in this fixed order):** ABOUT → WHY IT MATTERS → HOW TO DO IT → COACHING CUES → WATCH OUT FOR, each field authored to its min/max bound before the exercise can be marked content-complete. Because `isActive: true` already requires all five fields plus media (existing schema gate, not a new rule), an authoring checklist that mirrors this table is sufficient to guarantee every exercise is schema-valid on first pass — the standardization is procedural, not architectural.

---

## Section 4 — Population Sequencing

Recommended build order and rationale:

1. **Anchors (all categories)** — unblocks the most downstream work per exercise produced (progression/regression ladders, substitution pool) and is small enough (40–50) to front-load.
2. **Strength-tier compounds (barbell)** — Back Squat, Front Squat, Deadlift, Barbell Romanian Deadlift, Barbell Bench Press, Overhead Press, Barbell Row, Pull-Up plus standard accessories. Unblocks 5 already-locked/already-built programs immediately (Section 5).
3. **Bodyweight movements** — cheapest to produce (often single equipment tag `BODYWEIGHT`, no rack/bench dependency), and doubles as the natural regression rung for many of the compounds just authored in step 2.
4. **Dumbbell movements** — the most versatile equipment tag across Strength, Hypertrophy, and Home programs; benefits from compounds already existing as progression/alternative references.
5. **Cable and machine isolation** — has no dependents of its own; only useful once the compound/anchor backbone it complements already exists.
6. **Mobility/Yoga** — fully independent of every other category (separate `ExerciseCategory`, separate patterns); can run as a parallel track at any point without resequencing risk.
7. **Remaining Carry & Full Body / explosive movements** — smallest category, lowest program-blocking value; fills out the last ~8% of the catalog.

**Rationale for this order over alternatives:** compounds and anchors have outsized leverage because every program-authoring dependency (Section 5) and every substitution/progression link (Section 2) routes through them first; isolation and machine work has zero dependents and should never be sequenced ahead of something it could be linked to. Mobility is sequenced by independence, not priority — it can move earlier if staffing allows without breaking anything else in this order.

---

## Section 5 — Program Coverage Analysis

**Required immediately:** Strength-tier barbell compounds and standard accessories. `Program-Authoring-Standard-v1.0.md` §11 requires at least two named compounds (Back Squat, Front Squat, Deadlift, Barbell Romanian Deadlift, Barbell Bench Press, Overhead Press, Barbell Row, Pull-Up) in every MAIN section of sortOrder 1–5 (Strength Foundation I/II/III, Powerbuilding Foundation/Intermediate). **Strength Foundation I, II, and III packages already exist in the repository** — this is not a forecast, it is already-authored content with no functional exercise data behind it yet.

**Required next, same dependency set:** sortOrder 6–10 (Hypertrophy Foundation/Intermediate/Advanced, Lower Body Foundation/Intermediate) — same compounds plus cable/machine isolation work, per §11's "compound movements first, isolation last" guidance.

**Can be deferred:** Running Base I/II (sortOrder 11–12) — `Program-Authoring-Standard-v1.0.md` §11 states these carry "no prescribed equipment, pace guidance in notes only," making them the lowest exercise-library dependency in the entire 25-program catalog. Bodyweight/Home (sortOrder 19–23) and Mobility (24–25) can also follow Strength/Hypertrophy — their equipment needs (bodyweight, bands, limited dumbbells, or none) are cheaper to produce but block nothing currently locked.

**Does the proposed 200-exercise library support launch program production?** Yes, structurally. The Legs & Glutes (55–65) and Push/Pull (30–35 / 28–32) targets comfortably exceed what the Strength/Hypertrophy/Lower-Body programs require (the standard sets a "at least two compounds per section" floor, not a large unique-exercise count), and the Mobility target (40–50) directly matches the two dedicated Mobility programs.

**One coverage question worth confirming before population begins (not a blocker):** Running programs (sortOrder 11–12) carry no prescribed equipment and running itself is not one of the 6 `ExerciseCategory` values — worth a one-line confirmation of whether Running programs draw from the exercise library at all, or are pace/notes-only by design. This is a question about an already-locked program's content shape, not an exercise library architecture gap.

---

## Section 6 — Production Workflow

Recommended pipeline, in order:

1. **Pattern assignment** — one author owns one `MovementPattern` end-to-end (taxonomy fields, all 5 content fields, media) rather than splitting fields across authors, to keep voice and completeness consistent per exercise.
2. **Batch authoring** — author in category/pattern batches per Section 4's sequencing, not alphabetically or ad hoc.
3. **QC pass against the Section 3 template** — a second reviewer checks each field against its locked min/max bound before the exercise is marked content-complete.
4. **Anchor relationship pass** — `progressionExerciseIds` / `regressionExerciseIds` authored only after every exercise in that pattern's ladder already exists; never partially link a ladder that has unauthored rungs.
5. **Substitution pool pass** — `alternativeExerciseIds` authored bidirectionally only after both sides of a pairing exist, per the existing bidirectional-link rule (W-22 §12.6).
6. **Canonical-name freeze** — lock final name strings before any program authoring begins against them. This is the single highest-leverage step for minimizing rework: both import deduplication (`Exercise-001` §13.3) and Program-Authoring-Standard's import-time name resolution (§12.5) match on exact, case-insensitive `ExerciseDefinition.name` with no fuzzy fallback — a rename after program sheets reference a name breaks resolution and forces re-import.
7. **`isActive: true` flip** — only after all five content fields and required media are present; this is the schema's own existing gate, not a new checkpoint.

**Consistency/QC/metadata-completeness/anchor-management are addressed by steps 1–5 above; minimizing rework is addressed specifically by step 6.**

---

## Section 7 — Readiness Assessment

**Is Forge Legacy ready to begin large-scale exercise population once this plan is adopted?** Yes. Architecture, schema, taxonomy, and the W-21–W-28 screen chain are already confirmed aligned by the prior Repository Audit; this plan supplies the missing execution layer (sequencing, standards, workflow) without touching architecture.

**Remaining risks:**
- Content production itself (200 exercises × 5 required text fields + media) is a genuine authoring-cost risk, not a technical one — volume and quality control, not design.
- Name-freeze discipline (Section 6, step 6) must hold across both content authoring and program authoring; there is no fuzzy-match fallback anywhere in the pipeline if it doesn't.
- The Strength Foundation I/II/III packages already committed to the repository likely already reference specific exercise names chosen independently of this plan — these should be reconciled against the canonical naming convention before population starts, to avoid a rename-after-the-fact rework cycle exactly like the one Section 6 is designed to prevent.

**Remaining dependencies:** none architectural. The only open item outside this plan's scope is the content-authoring resourcing/timeline decision (how many authors, what cadence) — a staffing question, not a readiness gate.

**Recommended next action:** reconcile the exact exercise names already used in the locked Strength Foundation I/II/III program packages against this plan's canonical naming convention, then begin anchor-exercise authoring per Section 2.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial Exercise Library Production Plan. Re-read all 16 governing documents (Exercise Library Architecture, Custom Exercise, Favorites, EP-A1, Import Amendment, W-21–W-28, Program Catalog/Ecosystem Architecture, Program Authoring Standard). Defined launch strategy (200-exercise target, category priority Legs & Glutes → Push → Pull → Core → Full Body → Mobility), anchor framework (pattern-based distribution, no new "family" field), content standards (mapped directly to W-22's five locked display fields), population sequencing (anchors → compounds → bodyweight → dumbbell → cable/machine → mobility → carry/full-body), program coverage analysis (Strength Foundation I/II/III already committed to the repo are the immediate, concrete driver — not a hypothetical priority — with Running identified as lowest-dependency), production workflow (7-step pipeline; canonical-name freeze identified as highest-leverage rework-prevention step), and readiness assessment (no architectural blockers; one reconciliation action recommended before population begins). No architecture, schema, or screen changes proposed. No exercises authored. |

---

*Exercise Library Production Plan — v1.0*
*Forge Legacy | June 2026*
