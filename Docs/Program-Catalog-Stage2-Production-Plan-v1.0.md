# Forge Legacy — Program Catalog Stage 2 Production Plan

## v1.0 | June 2026

**Status:** DRAFT — pending product-team review. Not yet LOCKED.

**Phase:** Stage 2 Content Production planning — the execution plan for authoring the launch programs now that Stage 1 governance is LOCKED. Per `Program-Catalog-Production-Standard-v1.0.md` §7.

**Type:** Planning document. It authors **no programs**, creates **no blueprints**, changes **no architecture or catalog**, reopens **no governance decision**, performs **no naming work**, and proposes **no amendment**. It sequences and governs the production of the already-blueprinted programs against the locked standards.

**Authority (all `Status: LOCKED` unless noted):**
- `Program-Catalog-Architecture-v1.0.md` (PCA, v1.4) — schema, catalog table, Forge content rules
- `Program-Ecosystem-Architecture-v1.0.md` (PEA, v1.4) — families, succession, import pipeline, roadmap
- `Program-Authoring-Standard-v1.0.md` (PAS, v1.3) — §12 Sheets template, §13 catalog table, §14 deloads, §15 QC-1–7, §16 validation groups, §17 import/publish gate, §18.4 PAS-R1
- `Program-Catalog-Production-Standard-v1.0.md` §7 — the Stage 0A→6 pipeline this plan operationalizes (DRAFT — process reference)
- `Program-Catalog-Stage1-Final-Lock-Review-v1.0.md` (v1.1, Verdict A) — the authorization to begin Stage 2 and the 22-in / Running-out scope split
- The 22 locked family Research docs + Blueprints + family Stage 1 Reviews (the per-program design inputs)

**Method:** Every program name, metadata value, deload schedule, and import-order claim below is taken verbatim from PAS §13/§14/§17.2. No value is re-derived. Scope decisions (frequency-variant handling, Running) were confirmed with the product owner and are recorded in Section 0.

---

## Section 0 — Scope (fixed inputs)

**In scope — 22 programs**, the blueprint-locked set across the five governed families:

| Family | Programs (Sort #) |
|---|---|
| Strength | Strength Foundation I (1), II (2), III (3); Powerbuilding Foundation (4) |
| Muscle Building | MB Foundation (5), MB Intermediate (6), MB Advanced (7); Lower Body Foundation (8), Lower Body Intermediate (9) |
| Conditioning | Athletic Conditioning Foundation (12), Body Recomposition Foundation (13), Conditioning Intermediate (14), Body Recomposition Intermediate (15), Hybrid Foundation (16), Hybrid Intermediate (17) |
| Full Body & Home | Bodyweight Foundation (18), Bodyweight Strength (19), Bodyweight Performance (20), Home Conditioning (21), Home Strength Foundation (22) |
| Mobility | Mobility Foundation (23), Mobility Intermediate (24) |

**Out of scope:**
- **Running Base I (10) / Base II (11)** — Stage-0A research only, **no locked Blueprint** (Final Lock Review §3/§9). Documented roadmap gap; blocked on completing their own Stage 1 (research → blueprints → review) before they can enter Stage 2. The catalog launches at **22 of 24** until then. Running is **not** backfilled by shortcutting Stage 1.
- **Frequency variants.** Each program is produced at the **single `workoutsPerWeek` locked in PAS §13**. The 3-Day / 4-Day variant packages present in `Programs/…` are a pre-lock exploration; whether to ship multiple frequency variants per program is a separate product-team catalog-scope decision, **deferred** and explicitly out of this plan (scoping it in would reopen governance).

**Pipeline mapping.** Production Standard §7 numbers the pipeline Stage 0A→6. Stages **0A (Family Research)** and **1 (Blueprint)** are LOCKED for all 22 programs. "Stage 2 Content Production" in this plan = Production-Standard **Stages 2→6**: Sheet Authoring → Pre-Import Validation → Import & Draft Review → PAS-R1 Calibration → Publish.

---

## Section 1 — Recommended Program Production Order

**Principle:** produce **by rung across families, not family-by-family** (Production Standard §7), so cross-category level drift surfaces early; author each succession chain **predecessor→successor** so the Blueprint Successor-Readiness handoff (Deliverable 8) stays continuous.

**Wave 0 — Reconcile existing drafts (immediate; cheapest first wins).**
Re-QC the committed Strength Foundation I and II packages against `Strength-Foundation-I-Blueprint` / `Strength-Foundation-II-Blueprint` and PAS v1.3 (Final Lock Review §10). Output per package: confirm-as-is (write Lock Record) or a list of targeted corrections. Validates the pipeline and the `.docx` precedent before mass production.

**Wave 1 — Entry-tier (Foundation/BEG) rung, one per family, in parallel (5 programs):**
Strength Foundation I\*, Muscle Building Foundation, Athletic Conditioning Foundation, Bodyweight Foundation\*, Mobility Foundation. (\* fold into Wave 0.) Purpose: expose BEGINNER calibration across STRENGTH / HYPERTROPHY / CONDITIONING / FULL_BODY / MOBILITY before higher rungs. Both **featured** programs (SF I, Bodyweight Foundation) live here — the launch front door is drafted first.

**Wave 2 — Remaining BEG + all INT rung, parallel by family, predecessor→successor:**
Remaining BEG — Powerbuilding Foundation, Lower Body Foundation, Body Recomposition Foundation, Hybrid Foundation, Home Conditioning, Home Strength Foundation.
INT — Strength Foundation II, Muscle Building Intermediate, Lower Body Intermediate, Conditioning Intermediate, Body Recomposition Intermediate, Hybrid Intermediate, Bodyweight Strength, Mobility Intermediate.

**Wave 3 — ADV rung (3 programs):**
Strength Foundation III, Muscle Building Advanced, Bodyweight Performance. Authored last — most complex (Block Periodization, two deloads each) and the heaviest calibration load.

**Import order is the inverse and independent of authoring order.** Import **terminal programs first** (PAS §17.2) so `successorProgramName` resolves: Strength Foundation III, Muscle Building Advanced, Lower Body Intermediate, Conditioning Intermediate, Body Recomposition Intermediate, Hybrid Intermediate, Bodyweight Performance, Home Conditioning, Home Strength Foundation, Mobility Intermediate — then their predecessors.

---

## Section 2 — Dependency Map

**Upstream — all SATISFIED (fixed inputs):** PCA/PEA LOCKED · catalog (PAS §13) LOCKED · 22 Blueprints LOCKED · PAS v1.3 LOCKED.

**Exercise Library — split gate (the load-bearing dependency):**
- *Names:* all 200 exercise names authored (Exercise Population Pass #14 closed the catalog) → **authoring + import proceed now** (PAS §16 Group B name-existence passes; §17.3 requires no `[Unknown Exercise]`).
- *Media / `isActive: true`:* still pending content-team review + media production → **gates PUBLISH only**, never authoring. This is the true critical-path constraint on go-live.

**Intra-family succession:** author predecessor→successor (handoff continuity); import successor(terminal)→predecessor (name resolution).

**Cross-family:** independent → fully parallelizable.

**Catalog-wide gate:** PAS-R1 Difficulty Calibration Audit — once, after all 22 drafts exist, before any publish.

**Publish predicate (per program):** `draft imported & Group A/B/C passed & Lock Record written` **AND** `all referenced exercises isActive` **AND** `PAS-R1 passed`.

**Deferred / blocked:** Running Base I/II → blocked on their own Stage 1 → out of scope.

```
Architecture + Catalog + Blueprints + PAS (LOCKED)
        │
        ▼
Stage 2 Authoring (Sheets) ──needs──▶ exercise NAMES (✓ all 200)
        │
        ▼
Group A/B/C Validation ──▶ Import (terminal-first) ──▶ Draft
        │                                                │
        │                                                ▼
        │                                  PAS-R1 (once, all 22 drafts)
        │                                                │
exercise MEDIA → isActive ──────────────┐                │
(parallel track; gates publish) ─────────┴─────▶  PUBLISH (featured first)
```

---

## Section 3 — Review Workflow

Three review touchpoints per program (Production Standard §7 Stages 2–4; PAS §16–17):

1. **Blueprint-fidelity review (author).** Confirm the Sheet (PAS §12 Tabs 1–3) faithfully translates the locked Blueprint's Deliverables 2–7 (Architecture, Session Structure, Coverage, Progression, Volume, Recovery). The Blueprint is the contract; **no new design decisions** at authoring time.
2. **Group B content review (author self-check, PAS §16).** Description rules, exercise-name existence, RPE/rep-range encoding, `[DELOAD]` tagging against the precomputed PAS §14 schedule, WARM_UP/COOL_DOWN presence per PAS-D9, volume guardrails per PAS-D11.
3. **Draft review (product team, PAS §17.3).** Post-import: section rendering, slot structure, prescription values, succession-link resolution, description render, zero `[Unknown Exercise]` placeholders.

**One-time Wave-0 reconciliation review:** existing SF `.docx` packages compared field-by-field against the locked Blueprint + PAS v1.3 → confirm-or-correct finding.

---

## Section 4 — QA Workflow

Layered, using the machinery already locked in PAS (no new QA rules invented):

- **Group A — Automated (import tool, PAS §16):** description length, `totalWorkouts = weeks × /wk` slot count, enum casing, name uniqueness, successor resolution, `distanceValue`/`distanceUnit` co-presence, `isFeatured`/`sortOrder` vs §13.
- **Group B — Author content QA** (see §3.2).
- **Group C — Independent second reviewer (NOT the author), PAS §15:** QC-1 stimulus fit · QC-2 visible progression · QC-3 session balance · QC-4 level accuracy · QC-5 self-containment · QC-6 environment/equipment match · QC-7 narrative arc. Each QC carries a runnable test.
- **Exercise-reference QA:** every Tab 3 name resolves to the library (now) and is `isActive` before that program publishes (later).
- **PAS-R1 — Catalog-wide Difficulty Calibration Audit (PAS §18.4):** one pass after all 22 drafts exist, before any publish; confirms BEGINNER/INTERMEDIATE/ADVANCED are consistent across categories. Owner: product team. Output: confirmation, or targeted level/description corrections to drafts (no athlete impact — nothing published yet).

Group C and PAS-R1 require reviewer independence → dedicate reviewer capacity so QA does not serialize behind authoring.

---

## Section 5 — Lock Workflow

Mirrors the executed Stage 1 lock pattern (a product-team gate) and the existing `.docx` package precedent:

1. **Per-program package** = the 4-artifact set already used in `Programs/…`: Research → Design Record → **Program v1.0** → **Lock Record**. Stage 0B Research + Stage 1 Blueprint already exist for all 22; Stage 2 adds Program v1.0 + Lock Record.
2. **Program LOCK (≠ publish)** is granted when: imported as draft + Group A/B passed + Group C (QC-1…7) passed + Lock Record written. Analogue of the Stage 1 DRAFT→LOCKED flip.
3. **PUBLISH** is a separate, later product-team action: set `publishedAt` only when the program is locked **and** its exercises are `isActive` **and** PAS-R1 has passed. **Featured programs (SF I, Bodyweight Foundation) publish first.**
4. **Post-publish governance (PAS §18.1):** minor fixes edit-in-place + change log; structural changes spawn `v1.1` (v1.0 preserved — History Cannot Be Rewritten).

---

## Section 6 — Risks

1. **Exercise media / `isActive` is the real go-live gate (HIGH).** Authored, locked, calibrated programs cannot publish until referenced exercises are active. *Mitigation:* run media production as a parallel track; prioritize the exercise sets referenced by the featured programs and Wave-1 Foundations so the first publishes are unblocked.
2. **`.docx` precedent divergence (MED).** Existing SF packages predate the locked Blueprints and PAS v1.3; the `.docx` tree also carries 3-Day/4-Day variants that do not match the single-`/wk` locked catalog. *Mitigation:* Wave-0 reconciliation; locked 24-program catalog is the sole production scope; frequency variants stay a deferred product-team decision (no scope expansion, no governance reopen).
3. **Authoring-medium duality (MED).** PAS mandates the Google Sheets→CSV import pipeline (§12/§17); repo production artifacts are `.docx`. Double-keying risks drift. *Mitigation:* the PAS Sheets pipeline is the canonical authoring/import medium; `.docx` are human-readable design-record / lock-record artifacts only.
4. **Cross-category level drift (MED).** Parallel authoring can desync BEG/INT/ADV meaning. *Mitigation:* rung-first order (Wave 1) + mandatory PAS-R1 before any publish.
5. **Reviewer bottleneck (MED).** Group C + PAS-R1 need an independent reviewer; one reviewer serializes 22 programs. *Mitigation:* dedicate/segment reviewer capacity; batch Group C as drafts land.
6. **Running coverage gap (LOW — expectation management).** Catalog launches 22/24; both RUNNING programs absent. *Mitigation:* documented roadmap state; do not backfill by skipping Running's Stage 1.
7. **Succession import errors (LOW).** Fully mitigated by terminal-first import (PAS §17.2) — listed so it is not forgotten.

---

## Section 7 — Fastest Path to Publish-Ready Programs

Optimizes wall-clock to first publishes by parallelizing authoring against the exercise-media gate and front-loading the featured programs:

1. **Decide two unblockers up front (small, gate everything):** canonical authoring medium (recommend PAS Sheets pipeline) + frequency-variant scope (decided: locked single-`/wk` catalog only; variants deferred).
2. **Wave 0 now:** reconcile SF I + SF II drafts → first two programs reach LOCK fastest and prove the pipeline.
3. **Wave 1 in parallel:** author the five Foundation programs (both featured included) → earliest calibration signal + highest-visibility programs drafted first.
4. **Waves 2–3 parallel by family**, predecessor→successor; import terminal-first as drafts complete.
5. **Parallel media track:** drive exercises → `isActive`, sequenced to publish priority (featured + Wave-1 exercise sets first), so the publish gate clears in the same order programs finish authoring.
6. **PAS-R1 once** all 22 drafts exist (overlaps the tail of media production — off the critical path if started promptly).
7. **Publish on predicate:** featured first, then by completed succession chain. Critical path to the *first* publish = `max(featured-program authoring+lock, featured-program exercise media)`, run concurrently so neither stalls behind the other.

**Net:** the only true serialization is Group C / PAS-R1 reviewer capacity and exercise media. Everything else parallelizes across five independent families; quality is preserved entirely by the unchanged PAS gates (QC-1–7 + Group A/B/C + PAS-R1).

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial Stage 2 Program Production Plan. Scopes Stage 2 to the 22 blueprint-locked programs (Running deferred — Stage-0A only; frequency variants deferred — product-team decision). Defines production order (Waves 0–3, rung-first), dependency map (exercise media = publish gate), review workflow (Blueprint-fidelity / Group B / draft review), QA workflow (Group A/B/C + PAS-R1), lock workflow (program LOCK ≠ publish), seven risks, and the fastest path to publish-ready programs. Operationalizes Production Standard §7 Stages 2–6 against PAS §12–18. No architecture, catalog, naming, or amendment change; no program authored; no governance reopened. Status: DRAFT, pending product-team review. |

---

*June 2026 — Planning deliverable. No programs authored, no architecture or catalog changed, no governance reopened. Pending product-team review before LOCK.*
