# Forge Legacy — Program Catalog Production Standard

## v1.0 | June 2026

**Status:** Audit + Recommendations — not LOCKED. Contains open decisions pending product-team sign-off (same status as `Exercise-Library-Production-Plan.md`).

**Purpose:** Determine whether a Program Authoring Standard already exists; if so, audit it instead of duplicating it; and supply the one piece genuinely missing — a repeatable, end-to-end production workflow for authoring all 25 launch programs consistently.

**Does not:** redefine the `ProgramDefinition`/`ProgramSlot`/`ExercisePrescription` schema, modify any locked document, resolve the catalog-naming conflict identified in Section 1, or author any workout or program content.

---

## Section 1 — Repository Findings

| Document | Status | Governs |
|---|---|---|
| `Program-Catalog-Architecture-v1.0.md` (v1.2) | LOCKED | `ProgramDefinition`/`ProgramSlot`/`ProgramInstance` schema (§2); 8 categories, 3 levels, 4 environments, 10 goal alignments (§3); Forge content rules incl. description format and gender-neutral language rule (§4); MVP catalog table (§5); W-2 discovery model (§6); athlete-created program field deltas (§7) |
| `Program-Ecosystem-Architecture-v1.0.md` (v1.2) | LOCKED | 6 program families + cap governance (§2); succession architecture, `successorProgramId`, succession chains (§3); launch catalog table + coverage verification (§5); Forge Content Import Architecture / CSV pipeline (§6); long-term roadmap (§7); 11 architecture decisions PE-D1–D11 (§8); validation checklist (§9); Program Sharing Architecture (§11) |
| `Program-Authoring-Standard-v1.0.md` (internally v1.1) | LOCKED | The full authoring rulebook — see Section 2 below |
| `ExercisePrescription-Amendment-001.md` | LOCKED | `ExercisePrescription` field semantics (`restSeconds` reference-only, `distanceValue`/`distanceUnit` co-presence) |
| `Exercise-Library-Architecture-v1.0.md` | LOCKED | `ExerciseDefinition` schema; section-first `WorkoutSection` model (WS-A5) that programs inherit |
| `Strength-Foundation-I-Blueprint-v1.0.md` | LOCKED | The only existing instance of a pre-authoring design stage — see Section 7 |
| `Program-Creation-Wireframe-Spec-W4.md`, `Program-Detail-Wireframe-Spec-W3.md` | LOCKED | Athlete-facing program creation/detail UI; not author-facing |
| `Critical-Decisions-Amendment-001.md`, `Program-Architecture-Amendment-001-Active-Program-Rule.md` | LOCKED | Program/chapter/rank independence; one-Active-program rule — informs Section 3's "programs are not ranks" framing but doesn't affect authoring mechanics |
| `Monetization-Architecture-Amendment-001.md` | LOCKED | 3-program free-tier limit (counts saved/started Forge programs, not authored ones — not authoring-relevant) |

**Open items found, not resolved here:**

1. **Catalog naming/grouping conflict.** The locked catalog (`Program-Ecosystem-Architecture-v1.0.md` §5.2) and the current strategic direction use different family names, counts, and program names for the same 25-program target. Locked: 6 families — Strength (5: Foundation I/II/III + Powerbuilding Foundation/Intermediate), Hypertrophy (5: Foundation/Intermediate/Advanced + Lower Body Foundation/Intermediate), Running (2: Base I/II), Conditioning (6, governance exception per PE-D7: Athletic Conditioning Foundation, Body Recomposition Foundation/Intermediate, Conditioning Intermediate, Hybrid Foundation/Intermediate), Full Body & Home (5: Bodyweight Foundation/Strength/Performance, Home Conditioning, Home Strength Foundation), Mobility (2: Foundation/Intermediate). Current direction: Strength (6), Muscle Building (5), Hybrid (4), Bodyweight (3), Conditioning (2), Running (3), Mobility (2) — different names throughout (e.g., "Muscle Building" vs. "Hypertrophy," "Strength Specialization"/"Home Gym Strength" vs. "Strength Foundation III"/"Home Strength Foundation," "5K Builder"/"10K Builder" with no locked equivalent). Cycling and Combat removal is confirmed consistent on both sides (PE-D7; PE §5.1 — deferred to creator marketplace).
2. **Audience-positioning conflict.** The locked catalog is beginner-first by design — Strength Foundation I is `BEGINNER`, `isFeatured: true`, `sortOrder: 1` (PE §5.3), and the PAS naming standard's lead tier descriptor is "Foundation — entry point to a family, BEGINNER level" (PAS-D1). Current direction states the primary audience is intermediate/advanced/returning lifters, not complete beginners. These pull in different directions for which programs get authored first and how they're positioned.
3. **Unparseable binary files.** `Programs/Forge-Program-Production-Standard.docx`, `Forge-Program-Ecosystem-Map.docx`, and `Program-Catalog-Index.docx` exist but cannot be read by available tooling. The 4 already-authored Strength Foundation packages (`Strength-Foundation-I/II-3-Day/4-Day-v1.0.docx` + paired Design-Record/Lock-Record/Research files) may have followed whatever process that `.docx` standard defines. Recommend a manual open-and-compare against this document and the markdown PAS before treating those 4 packages as fully PAS-v1.1-compliant precedent.

4. **Minor documentation-lag finding (cosmetic, not a blocker).** `Program-Ecosystem-Architecture-v1.0.md` §2.1's header ("8 families at MVP launch") and §5.1's summary ("25 Forge Programs across 8 families") were not updated when the v1.2 Catalog Revision Amendment removed the Cycling and Combat families — the tables beneath both lines correctly list 6 families. Same pattern as prior documentation-lag findings elsewhere in the repo. Not fixed here; a one-line correction in a future amendment pass would resolve it.

None of these four items are resolved in this document, per instruction. Items 1 and 2 are restated as a follow-up work item in Section 7.

---

## Section 2 — Existing Standards Audit

**A comprehensive Program Authoring Standard already exists and is LOCKED:** `Docs/Program-Authoring-Standard-v1.0.md` (internal version 1.1, ~1,100 lines, 21 sections). Writing a second standard would create duplication and drift — the correct move is to audit it and fill the one real gap.

### Strengths (verified directly against the document, not assumed)

- **Metadata is complete and import-ready.** §2.1 lists every author-facing `ProgramDefinition` field with type/required/rule; §12.2's Google Sheets Tab 1 maps column-for-column onto that same field set. No daylight between "what an author fills in" and "what the schema needs."
- **Workout structure is verified against actual rendering behavior, not invented.** The section-first `WARM_UP`/`MAIN`/`COOL_DOWN` model (§2.2, §9) traces to WS-A5 and to how W-9 renders section headers from slot data (PAS-D10) — the standard explicitly explains *why* warm-ups can't be encoded as notes (it would collapse the session into an undifferentiated list in the app).
- **Progression is fully specified per category × level**, not left to author judgment: 5 approved models (Linear, Double Progression, Block Periodization, Volume Accumulation, Time-Based) each with a defined applicability table and a model-selection-by-category-and-level matrix (§7, especially §7.2).
- **Deload math is precomputed for every program**, not left as a rule to re-derive 25 times: §14 gives exact slot ranges per program.
- **Validation is two-layered and testable**: §10–11 give numeric guardrails (exercises/sets per category, estimated session duration); §15 gives 7 falsifiable QC tests (QC-1–7, each with a one-line "Test:" instruction a reviewer can actually run); §16 splits the pre-import checklist into Group A (automated), Group B (author self-check), Group C (independent second reviewer).
- **Import-to-publish is fully specified**, including succession import ordering (§17.2 — import terminal programs before their predecessors reference them) and a named pre-launch governance checkpoint, **PAS-R1 — Difficulty Calibration Audit** (§18.4), run once after all 25 exist as drafts and before any publish, specifically to catch cross-category level drift. This already anticipates the kind of beginner-vs-advanced calibration question raised by the audience-positioning conflict in Section 1 — it doesn't resolve that conflict, but it's the right mechanism to catch its symptoms once programs are authored.

### Gaps

1. **No formalized pre-authoring design stage (the one genuine, repo-confirmed gap).** PAS §17.1's workflow goes straight from nothing to "Author completes the Google Sheets template" — there is no step between "a program is approved for the catalog" and "fill in three spreadsheet tabs." In practice, the one family that's actually been authored required exactly such a stage: `Strength-Foundation-I-Blueprint-v1.0.md` is a 10-deliverable design document (Overview, Architecture, Session Structure, Weekly Coverage, Progression Blueprint, Volume Blueprint, Recovery Blueprint, Successor Readiness, Stress Test, Recommendation) produced and locked *before* any exercise or set/rep value was written. The PAS never requires this, references it, or gives the other 24 programs a template for producing one. This is the gap Section 7 closes.
2. Catalog naming/grouping conflict (Section 1, item 1) — out of scope to resolve here, flagged as a prerequisite in Section 7.
3. Audience-positioning conflict (Section 1, item 2) — same treatment.
4. Unparseable `.docx` production files (Section 1, item 3) — flagged for manual reconciliation, not resolved here.

---

## Section 3 — Metadata Standards

**Fully satisfied by the locked PAS.** No new standard needed. Reference:

- Required fields, types, and rules (`name`, `version`, `category`, `level`, `environment`, `goalAlignment`, `durationWeeks`, `workoutsPerWeek`, `totalWorkouts`, `description`, `isFeatured`, `sortOrder`, `successorProgramName`) — PAS §2.1
- Environment handling (`GYM`/`HOME`/`OUTDOOR`/`MIXED`, including the `MIXED` tie-breaker rule) — PAS §3.3
- Experience/level handling (`BEGINNER`/`INTERMEDIATE`/`ADVANCED`, including the "level is relative to this training style, not overall fitness history" rule) — PAS §3.2
- Description format, sentence structure template, compliant/non-compliant examples, prohibited-terms list — PAS §5
- Successor handling (`successorProgramName` → `successorProgramId` resolution at import; must already exist for terminal-program-first import ordering) — PAS §2.1, §17.2; schema rationale in `Program-Ecosystem-Architecture-v1.0.md` §3.1 (PE-D3, PE-D8)
- Duration / days-per-week standards — no fixed rule beyond `totalWorkouts = durationWeeks × workoutsPerWeek` (PAS §2.1); per-category typical ranges are implicit in the locked catalog table (PAS §13) rather than independently specified

**Recommendation (narrow, additive only):** add an optional `blueprintDocRef` column to PAS §12.2's Tab 1 template, pointing to the program's Blueprint document (Section 7). Purely for traceability once the Blueprint stage is adopted; not a schema change, not enforced by the import tool.

---

## Section 4 — Workout Structure Standards

**Fully satisfied by the locked PAS — already verified against repository rendering behavior, not assumed.** Reference:

- Section-first model: `WARM_UP` → `MAIN` (always present) → `COOL_DOWN`, per-section `order` numbering — PAS §2.2, §9.2 (PAS-D10)
- Required-vs-optional by category table (e.g., `MOBILITY` is `MAIN`-only; `CONDITIONING`/`RUNNING`/`CYCLING`/`COMBAT_SPORTS` require both `WARM_UP` and `COOL_DOWN`) — PAS §9.1 (PAS-D9)
- Warm-up/cooldown content guidance (exercise count, prescription type, exercise-selection alignment to the session's primary muscle groups) — PAS §9.3–9.4
- Volume guardrails per category (exercise count and set count ranges for `MAIN`) — PAS §10.1 (PAS-D11)
- Category-specific authoring guidance (session structure, exercise ordering, equipment constraints) for all 8 categories — PAS §11.1–11.8

No new workout-structure rules are needed. The PAS's structure already matches the W-9/W-24 section-rendering contract — recommending a different shape (e.g., reintroducing "Primary/Secondary/Accessory" as separate sections, as the original task brief speculated) would require a schema change with no repository basis and is explicitly rejected.

---

## Section 5 — Progression Standards

**Fully satisfied by the locked PAS.** Five approved models, each scoped to specific category/level combinations — PAS §7.1 (PAS-D6), with a model-selection matrix by category and level at §7.2:

| Model | Where it belongs |
|---|---|
| Linear Progression | STRENGTH BEGINNER, FULL_BODY (all levels), CONDITIONING BEGINNER |
| Double Progression | HYPERTROPHY (all levels), STRENGTH INTERMEDIATE/ADVANCED, CONDITIONING INTERMEDIATE |
| Block Periodization | STRENGTH ADVANCED, HYPERTROPHY ADVANCED, RUNNING (all levels), CYCLING (all levels) |
| Volume Accumulation | HYPERTROPHY BEGINNER/INTERMEDIATE (layered with Double Progression), COMBAT_SPORTS |
| Time-Based Progression | MOBILITY (all levels), cardio interval segments |

RPE handling is a deliberate, temporary schema accommodation, not a 6th progression model: encoded in `notes` only, permitted only in STRENGTH/HYPERTROPHY at INTERMEDIATE/ADVANCED — PAS §6.2–6.3 (PAS-D3, PAS-D5). Tempo is excluded from MVP entirely (PAS-D4). Both have a forward-referenced post-MVP schema amendment already documented (PAS-D12) — no action needed now.

Additional models require a PAS amendment before use (PAS §7.1) — not a recommendation to add one preemptively here; no gap was found that an existing model doesn't already cover.

---

## Section 6 — Validation Standards

**Fully satisfied by the locked PAS.** Reference:

- Weekly/session volume — PAS §10.1 (guardrails), §10.2 (estimated session duration, quality-guideline tier)
- Recovery balance — PAS §8 (deload requirements by program length, PAS-D7; deload encoding, PAS-D8); rest-period guidance by level, §10.3
- Movement balance — QC-3 (§15): "No single movement pattern dominates to the exclusion of its opposing pattern across the week's sessions," with a stated test method
- Equipment/environment consistency — QC-6 (§15): every exercise must be performable in the program's stated `environment`, with a stated test method
- Progression consistency — QC-2 (§15): Week 1 vs. Week 4 vs. penultimate-week comparison must show measurable change
- Full validation gate — the 3-group Pre-Import Validation Checklist (§16: Group A automated / Group B author / Group C independent second reviewer) plus the 7 QC criteria (§15) plus the catalog-wide PAS-R1 Difficulty Calibration Audit (§18.4)

No new validation rules are needed. The existing checklist is more granular than the brief's original examples (it includes testable pass/fail instructions, not just topic headings).

---

## Section 7 — Program Production Workflow

This is the genuinely new contribution. It generalizes the one real precedent in the repository — the Strength Foundation I Blueprint — into a repeatable pipeline for all 25 programs, with research split into a once-per-family pass and a once-per-program pass so the same ground isn't re-covered 25 times.

### Stage 0A — Family Research *(once per family)*

**Purpose:** produce reusable, family-level guidance so individual programs don't each re-derive it.

**Produces:**
- Progression philosophy for the family (which of the 5 PAS-D6 models applies at which level, consistent with PAS §7.2)
- Volume philosophy (where in the PAS-D11 guardrail range this family's programs should sit, and why — c.f. Strength Foundation I Blueprint's explicit "minimum effective volume" rationale, Deliverable 6)
- Recovery philosophy (deload cadence already fixed by PAS-D7's length-based rule; this stage covers rest-period and fatigue-management philosophy specific to the family)
- Exercise pool (which `ExerciseDefinition` records the family draws from, consistent with the family's `category`/`environment` constraints)
- Environment considerations (equipment ceiling/floor for the family's environments)
- Successor relationships (the family's succession chain shape, per `Program-Ecosystem-Architecture-v1.0.md` §3.3)

**Output is reused** across every program in that family regardless of how many programs the family ends up containing or what they're named — this stage is deliberately decoupled from the catalog-naming question in Section 1.

### Stage 0B — Program Research *(once per individual program)*

**Purpose:** define what makes this specific program distinct within its family's research base.

**Produces:** target athlete, training goal, duration recommendation, weekly structure, position in the successor chain, distinguishing characteristics — i.e., the "Target Athlete," "Excluded Athlete Profiles," and "Expected Outcomes" content seen in the Blueprint's Deliverable 1, scoped down to research findings rather than the full structural design (that's Stage 1).

### Stage 1 — Blueprint *(once per program)*

The pre-authoring design stage, formalized from `Strength-Foundation-I-Blueprint-v1.0.md`'s 10 deliverables:

1. Program Overview (purpose, target athlete, excluded profiles, expected outcomes, success criteria)
2. Program Architecture (duration, sessions/week, total workouts, deload placement, periodization summary)
3. Session Structure (the slot template every session in the program follows)
4. Weekly Movement/Modality Coverage (which patterns/modalities appear on which days, at what emphasis)
5. Progression Blueprint (which Stage 0A model, applied with this program's specific increments/rep ranges)
6. Volume Blueprint (weekly and per-session set/duration targets, checked against PAS-D11)
7. Recovery Blueprint (rest-day placement, intra-session rest, fatigue-management notes)
8. Successor Readiness (what this program hands off to its named successor, if any)
9. Blueprint Stress Test (named risks — e.g., recovery, adherence, complexity, volume, progression — each rated and either mitigated or left open)
10. Final Blueprint Recommendation (strengths, weaknesses, remaining risks, confidence score, approve/reject)

A Blueprint is reviewed and locked *before* any exercise name or set/rep value is chosen — same gate the Strength Foundation I Blueprint passed through.

### Stage 2 — Google Sheets Authoring

Per PAS §12: Tab 1 (Program Header), Tab 2 (Program Slots), Tab 3 (Exercises). The Blueprint's deliverables 2–7 translate directly into Tab 1 metadata and the slot/exercise structure of Tabs 2–3; no re-deriving from scratch.

### Stage 3 — Pre-Import Validation

PAS §16, Groups A (automated), B (author self-check), C (independent second reviewer) — unchanged from the locked standard.

### Stage 4 — Import & Draft Review

PAS §17 — unchanged, including the terminal-programs-first succession import order (§17.2).

### Stage 5 — Catalog-Wide Difficulty Calibration Audit

PAS-R1 (§18.4) — run once, after all 25 programs exist as drafts, before any program is published. This is also the natural checkpoint to re-examine the audience-positioning conflict (Section 1) in light of actual authored content, since by this point every program's real difficulty curve is visible rather than theoretical.

### Stage 6 — Publish

PAS §17.1 step 10 — product team sets `publishedAt`.

### Recommended Production Order

1. Complete Stage 0A (Family Research) for every family first — cheap relative to per-program work, and it unblocks every program in that family at once.
2. Author the entry-tier program in each family, across all families, before moving to any family's second-tier program — i.e., produce by rung, not family-by-family. This surfaces cross-category calibration issues (PAS-R1's concern) early, while a family's later rungs still benefit from their predecessor's Blueprint already being complete (Successor Readiness, Deliverable 8, depends on this).
3. Run PAS-R1 once all 25 are drafted, before any publish.

### Recommended Next Work Item (not performed in this document)

**Program Catalog Naming & Positioning Reconciliation.** Goal: determine whether the launch catalog continues on the currently locked structure (`Program-Ecosystem-Architecture-v1.0.md` §5.2 — Strength Foundation I/II/III, Hypertrophy ladder, etc.) or adopts the newer goal-based direction (Strength Foundations/Development/Performance/Specialization/Powerbuilding/Home Gym Strength, Muscle Building, etc.), and reconcile the beginner-first vs. intermediate/advanced-first positioning question alongside it. **Do not begin large-scale program authoring until this reconciliation is complete** — Stages 0A–6 above are name-and-structure-agnostic and ready to use under either outcome, but authoring real content against an unresolved catalog identity risks producing programs that need renaming, re-leveling, or re-positioning before launch.

---

## Verification

This document is a standards/process deliverable, not code. Every section-number citation above was checked directly against the current text of `Program-Authoring-Standard-v1.0.md`, `Program-Catalog-Architecture-v1.0.md`, `Program-Ecosystem-Architecture-v1.0.md`, and `Strength-Foundation-I-Blueprint-v1.0.md` while writing this document — not taken from a prior summary. No locked document was modified.
