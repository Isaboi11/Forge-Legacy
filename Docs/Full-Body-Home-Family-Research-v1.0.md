# Forge Legacy — Full Body & Home Family Research

## v1.0 | June 2026

**Status:** LOCKED
**Phase:** Stage 0A — Family Research (pre-Blueprint, pre-authoring). **Findings only** — no Stage 1 Blueprints, no architecture, no amendments, no catalog change.

**Authority Chain:**
- `Program-Catalog-Production-Standard-v1.0.md` §7 (Stage 0A definition), §1 (naming/positioning conflict)
- `Program-Ecosystem-Architecture-v1.0.md` §2.1–2.2 (family/cap), §3 (succession), §5 / §5.4 (catalog, athlete-type coverage), §6 (rename history)
- `Program-Authoring-Standard-v1.0.md` §7.2 (progression by category/level), §9 (PAS-D9), §10.1 (PAS-D11), §11.7 (FULL_BODY authoring), §13–14 (catalog table, deload)
- `Program-Catalog-Architecture-v1.0.md` §3.2 (levels), §3.3 (environments), §3.4 (goal alignments)
- `MVP-Amendment-Environment-Tags-v1.0.md` (LOCKED — the informational environment-tag taxonomy; relevant to the equipment-distinction finding)
- `Program-Catalog-Governance-Review-v1.0.md` (the prioritization that triggered this pass)
- Lesson sources: `Program-Ecosystem-Amendment-001-Powerbuilding-Intermediate-Retirement.md`, `Conditioning-Family-Stage1-Review-v1.0.md`, `Lower-Body-Intermediate-Blueprint-v1.0.md`, `Body-Recomposition-Intermediate-Blueprint-v1.0.md`
- `Strength-Family-Research-v1.0.md`, `Muscle-Building-Family-Research-v1.0.md`, `Running-Family-Research-v1.0.md`, `Conditioning-Family-Research-v1.0.md` (template / reference models); `Strength-Foundation-I-Blueprint-v1.0.md` (cross-family comparator)
- `FORGE_LEGACY_PRODUCT_DNA.md` (voice)

**Scope:** Establishes the Full Body & Home family's reusable training philosophy and reports Stage 0A governance findings, with explicit pressure-testing of whether the programs are genuinely distinct athlete journeys or exist because of catalog topology / environment alone. Answers the three required questions (environment-alone, equipment-access, exercise-substitution).

**Not in scope:** No workouts, no Blueprints, no exercise/session authoring, no schema/architecture/catalog change, no amendment, no resolution of the naming/positioning conflict, **no proposal to restructure the environment/equipment taxonomy** (the under-specification is flagged as a finding only).

---

## Inputs — The Locked Full Body & Home Family Roster

Per `Program-Ecosystem-Architecture-v1.0.md` §5 (Sort 18–22) and `Program-Authoring-Standard-v1.0.md` §13–14, verified directly. Five programs, all category `FULL_BODY`, all environment `HOME`, primary athlete type **General** (PEA §5.4). The family is at the 5-program cap (PEA §2.2). It is **one three-rung Bodyweight ladder plus two standalone BEGINNER terminals**:

| Sort | Program | Level | Wks | /Wk | Total | Goal Alignment(s) | Progression (PAS §7.2) | Deload | Successor |
|---|---|---|---|---|---|---|---|---|---|
| 18 | Bodyweight Foundation | BEGINNER | 6 | 3 | 18 | GENERAL_FITNESS | Linear (rep-progression variant) | **none** (6wk < 7; PAS-D7) | Bodyweight Strength |
| 19 | Bodyweight Strength | INTERMEDIATE | 8 | 4 | 32 | BUILD_STRENGTH, GENERAL_FITNESS | Linear (rep-progression variant) | Wk 7 (25–28) | Bodyweight Performance |
| 20 | Bodyweight Performance | ADVANCED | 10 | 4 | 40 | BUILD_STRENGTH, GENERAL_FITNESS | Linear | Wk 9 (33–36) | — (terminal) |
| 21 | Home Conditioning | BEGINNER | 6 | 3 | 18 | LOSE_FAT, IMPROVE_CONDITIONING | Linear / Volume Accumulation | **none** (6wk) | — (terminal) |
| 22 | Home Strength Foundation | BEGINNER | 8 | 3 | 24 | BUILD_STRENGTH, GENERAL_FITNESS | Linear | Wk 7 (19–21) | — (terminal) |

Succession (PEA §3.3): **Bodyweight Foundation → Bodyweight Strength → Bodyweight Performance** (the only FULL_BODY ladder reaching ADVANCED); **Home Conditioning** and **Home Strength Foundation** are standalone BEGINNER terminals.

**Repository-truth correction:** the task references both "Full Body Foundation" and "Bodyweight Foundation." These are **the same program** — "Full Body Foundation" was renamed to "Bodyweight Foundation" (PEA §6 succession-rename note; PCA Change Log v1.1). There is no separate "Full Body Foundation" in the locked catalog.

**Three structural facts that define this family and shape every deliverable:**

1. **Environment is a single enum (`HOME`) for all five programs** (PCA §3.3: "No equipment or minimal equipment (dumbbells, bands, pull-up bar)"). The bodyweight-only vs home-equipment distinction is **not** a structured catalog field — it is carried by program **name** ("Bodyweight" vs "Home Strength") and by PAS §11.7's "limited dumbbells (if specified)" authoring convention. The finer taxonomy that *would* structure it — `MVP-Amendment-Environment-Tags-v1.0.md`'s commercial_gym / home_gym / bodyweight values — is **explicitly informational/display only** ("does not evaluate equipment compatibility… does not define equipment at the exercise level"), with the full architecture deferred to V1.1. This under-specification is a first-class finding (Deliverable 6, Governance Findings).
2. **Progression model is uniform: Linear (or linear rep-progression for bodyweight)** across the whole family (PAS §7.2) → the **inert axis** (as in Muscle Building / Running / Conditioning). Distinction must come from goal, level, and equipment-driven training content.
3. **The family is goal-AND-equipment-heterogeneous**: a bodyweight-calisthenics ladder (GENERAL_FITNESS → BUILD_STRENGTH), a home fat-loss/conditioning standalone, and a home-equipment strength standalone — unified only by HOME + full-body framing.

---

## Deliverable 1 — Family Identity

A Full Body & Home program trains the **whole body each session using bodyweight or minimal home equipment**, developing general fitness and movement quality (`Program-Catalog-Architecture-v1.0.md` §3.1: "Multi-modal, general physical preparedness, beginner-friendly"; PAS §11.7). The family's identity is defined by its **environment and equipment ceiling** (no barbell, rack, cables, or machines — PAS §11.7) far more than by a single training effect: it is the catalog's home for athletes who train without a commercial gym. That environment ceiling is the family's unifying constraint; within it, the family pursues several goals (general fitness, bodyweight strength, fat loss/conditioning, home-equipment strength).

This makes Full Body & Home the catalog's **environment-defined family** — and therefore the one where the governance question "does environment alone justify a program?" is sharpest (Deliverable 7).

---

## Deliverable 2 — Target Athlete Segments

Primary athlete type: **General** (PEA §5.4). The family segments this audience on **two axes simultaneously** — equipment access and goal:

- **Bodyweight-only athletes** (no/minimal equipment) → the **Bodyweight ladder**: Bodyweight Foundation (general fitness intro) → Bodyweight Strength (bodyweight strength) → Bodyweight Performance (advanced calisthenics). The athlete who trains with their bodyweight (travel, no equipment, calisthenics interest).
- **Home athletes with a fat-loss/conditioning goal** → **Home Conditioning** (metabolic work at home).
- **Home athletes with some equipment and a strength goal** → **Home Strength Foundation** (dumbbell/band strength at home — between bodyweight-only and a full gym).

**Shared family constraints:** trains at home / minimal equipment (no barbell/rack/cables/machines — PAS §11.7); General-athlete framing; not the right home for an athlete with full gym access pursuing a single specialized goal (the Strength/Muscle Building/Conditioning families serve those in `GYM`).

**Note on segmentation honesty:** because all five share the `HOME` enum and the General type, the segmentation rests on **equipment sub-tier (bodyweight vs home-equipment) + goal + level** — none of which except goal/level is a structured catalog field. The equipment sub-tier is the load-bearing, under-specified axis (Deliverable 6).

---

## Deliverable 3 — Progression Philosophy

Progression is **uniform: Linear Progression, with a bodyweight rep-progression variant** (PAS §7.2; §11.7). For bodyweight work the progressed variable is **reps then variation** — increase reps across the slot sequence, then introduce a harder variation ("Master 3 × 15 before progressing to Pike Push-Ups," §11.7) — not external load. For home-equipment work (Home Strength Foundation), linear load progression on dumbbells/bands applies within the home equipment ceiling.

Because the model is uniform, **progression model is not a program differentiator** here. What differs is *what is progressed*: bodyweight reps/variations (calisthenics) vs limited-dumbbell load (home strength) vs conditioning work density (Home Conditioning). The two coaching principles carry over — movement quality gates progression; harder variations are earned, not rushed (§11.7's caution against advanced bodyweight technique without progressions).

---

## Deliverable 4 — Volume Philosophy

`Program-Authoring-Standard-v1.0.md` §10.1 (PAS-D11) sets the FULL_BODY envelope at **4–7 exercises / 12–20 sets in MAIN**, with the explicit note that **"HOME environment may use higher reps with lower weights"** — the volume signature of equipment-limited training (you accumulate stimulus through reps/variations rather than load). Sessions run 40–70 min (§10.2). Volume sits at a beginner-appropriate level for the three BEGINNER programs and rises modestly up the Bodyweight ladder; the bodyweight ladder's "volume" is as much about *progressing to harder variations* as about set/rep counts.

---

## Deliverable 5 — Recovery Philosophy

Deload cadence is **duration-driven** (PAS-D7) and produces a clean spread: the **6-week programs (Bodyweight Foundation, Home Conditioning) take no mandatory deload** (under the 7-week threshold — "All weeks training," PAS §14); the **8-week programs (Bodyweight Strength, Home Strength Foundation) deload at Week 7**; the **10-week Bodyweight Performance deloads at Week 9**. Recovery within the family is lighter to manage than the resistance families' — bodyweight/minimal-equipment training imposes lower absolute load — and the rep/variation progression model self-limits intensity. Minimum one rest day between sessions at every level (3–4 day frequencies leave ample rest).

---

## Deliverable 6 — Modality / Equipment Selection Philosophy & the Under-Specification Finding

Selection follows PAS §11.7: **available** — bodyweight, pull-up bar, resistance bands, limited dumbbells (if specified); **not available** — barbell, squat rack, cables, machines. The family's three training styles draw on this pool differently:
- **Bodyweight ladder:** pure calisthenics — rep + variation progression toward harder movements (pike → handstand push-up trajectory, etc.).
- **Home Strength Foundation:** limited-dumbbell/band strength training (the "if specified" equipment tier).
- **Home Conditioning:** bodyweight/minimal-equipment metabolic circuits.

**The under-specification finding (first-class):** the distinction between *bodyweight-only* and *home-with-equipment* — which is the load-bearing differentiator for several programs (Deliverable 7) — is **not encoded in any structured catalog field.** The `environment` enum is `HOME` for all five (PCA §3.3). The finer taxonomy exists (`MVP-Amendment-Environment-Tags-v1.0.md`: commercial_gym / home_gym / bodyweight) but is **informational/display only and deferred** ("does not evaluate equipment compatibility… does not define equipment at the exercise level"). So the equipment sub-tier currently lives only in **program names + the §11.7 "if specified" convention**. This is reported as a finding for product-owner awareness; **no architecture change is proposed** (per scope and the standing rules) — but it is the reason the Deliverable 7 pressure-tests matter: the distinctions are real in *intended content* but not *structurally enforced*, so Stage 1 authoring is where they must be made concrete and a future V1.1 architecture may formalize them.

---

## Deliverable 7 — Distinction Between Programs (the A-vs-B Pressure Test)

**Governing principle (carried from prior families):** a program must justify existence by a distinct athlete, progression profile, volume profile, or goal — not by topology (the Powerbuilding Intermediate retirement anti-pattern). Because this family is environment-defined and progression-uniform, the burden falls on **goal + level + equipment-driven training content.**

### The three required answers

**1. Does environment alone justify a separate program? — NO.** All five programs share the `HOME` enum, so environment-alone distinguishes nothing *within* the family. Environment frames the family but cannot justify any individual program against its siblings. (Environment *does* legitimately distinguish the family from the GYM families — but that is family-level, not program-level.)

**2. Does equipment access create a genuine athlete distinction? — YES.** Bodyweight-only vs home-minimal-equipment is a real athlete distinction that changes **progression mechanics and exercise pool**: calisthenics progresses by reps/leverage/variation (you cannot micro-load a push-up the way you load a dumbbell), while home-equipment strength progresses by adding dumbbell/band load. These are different training disciplines, not relabeled equivalents. **Caveat:** this genuine distinction is currently carried by naming + convention, not a structured field (Deliverable 6) — so it is real in intent but must be *demonstrated* in Stage 1 authored content.

**3. Are any programs interchangeable with simple exercise substitutions? — Not if authored to their distinct progression models, but one program carries real risk.** Genuine calisthenics, home-equipment strength, and home conditioning are distinct disciplines, not substitution-equivalents. The risk concentrates on **Home Strength Foundation**, which could degenerate into "Strength Foundation I with dumbbells swapped for barbells." It is **not** interchangeable *if* authored to the home-equipment progression model (rep/variation/unilateral progression, no maximal barbell loading) — but Stage 1 must prove that, not assume it.

### Convergence pressure-tests (hand forward to Stage 1)

| Pair | Shared | Differs by | Verdict (Stage 0A) |
|---|---|---|---|
| **Bodyweight Foundation ↔ Home Conditioning** | BEG, HOME, 6wk, 3d, 18, no deload | Goal (GENERAL_FITNESS vs LOSE_FAT+IMPROVE_CONDITIONING) | Near metadata-twins; **(A) genuine** on goal — but prove divergent content (general full-body intro vs metabolic circuits), the Conditioning-family pattern. |
| **Home Strength Foundation ↔ Bodyweight Strength** | **Same goal** (BUILD_STRENGTH+GENERAL_FITNESS), HOME, FULL_BODY | Level (BEG vs INT), frequency (3 vs 4), **equipment-style** (home-equipment vs bodyweight-only), chain position (terminal vs mid-ladder) | The closest same-goal pair; distinction is **load-bearing on the equipment-style axis** (the under-specified one). Likely **(A) genuine** but the most fragile — Stage 1 must show home-equipment strength ≠ bodyweight strength in content. |
| **Home Strength Foundation ↔ Strength Foundation I** *(cross-family)* | BEG, ~8wk, 3d, strength | Category (FULL_BODY vs STRENGTH), environment (HOME vs GYM), goal (+GENERAL_FITNESS) | The deepest "does environment justify a program" test. **(A) genuine IF** the equipment ceiling drives different progression mechanics (no-barbell rep/variation/dumbbell vs barbell load progression) — **(B) topology if** it is merely SF I with substitutions. Must be demonstrated in Stage 1. |

**Bodyweight ladder internal coherence:** Foundation (GENERAL_FITNESS, BEG) → Strength (+BUILD_STRENGTH, INT) → Performance (BUILD_STRENGTH+GENERAL_FITNESS, ADV) is a coherent BEG→INT→ADV calisthenics progression — the only FULL_BODY ladder reaching ADVANCED, with genuinely escalating training content (general fitness → bodyweight strength → advanced calisthenics skill). No internal-ladder convergence risk.

**Watch program:** **Home Strength Foundation** is the elevated watch item — it shares its goal with Bodyweight Strength and is near-metadata-identical to Strength Foundation I, so its entire justification rests on the equipment-style axis, the family's under-specified differentiator. It is **not** a Stage 0A retirement candidate (its home-equipment-strength athlete is genuine), but it carries the highest Stage 1 burden of proof.

---

## Deliverable 8 — Successor Relationships

Per `Program-Ecosystem-Architecture-v1.0.md` §3.1 and §3.3:

```
Bodyweight Foundation → Bodyweight Strength → Bodyweight Performance   (terminal)
Home Conditioning      (standalone, terminal)
Home Strength Foundation (standalone, terminal)
```

The Bodyweight ladder owes the standard handoffs (movement competency, volume/variation tolerance, readiness for the next rung's harder variations). The two standalone BEGINNER terminals are **complete-by-design** for their goals — but note the contrast: **Home Strength Foundation is a BEGINNER terminal with no Intermediate successor**, while the roadmap (PEA §7.1) lists "Home Strength Intermediate" as a Year-1 candidate. So Home Strength Foundation is, like Running Base II / Lower Body Intermediate, **terminal-by-unbuilt-successor** rather than complete-by-design — a journey gap, not a satisfied endpoint (the Running Finding B / "terminal overloading" pattern from the Cross-Family Governance Review applies here too). Home Conditioning is genuinely complete-by-design (no roadmap successor).

---

## Governance Findings & Stage 0A Verdict

**Verdict: the Full Body & Home family PASSES Stage 0A** — but with the most scrutiny of any family on the environment/equipment-distinction question, and the most pressure-tests handed forward.

- **Genuine distinct athlete journeys exist:** a bodyweight-calisthenics ladder (BEG→INT→ADV), a home fat-loss/conditioning program, and a home-equipment strength program. The bodyweight ladder is unambiguously distinct (advanced calisthenics is its own discipline).
- **Environment alone justifies nothing at the program level** (all five are `HOME`); **equipment access is a genuine distinction** but is **structurally under-specified** (carried by name + §11.7 convention, not a field; the structured taxonomy is informational/deferred). This is the family's defining governance finding.
- **No Stage 0A retirement candidate**, but **Home Strength Foundation is the elevated watch program** — its justification rests entirely on the equipment-style axis (shared goal with Bodyweight Strength; near-metadata with Strength Foundation I), so it carries the highest Stage 1 burden of proof.
- **Three convergence pressure-tests handed to Stage 1** (Bodyweight Foundation ↔ Home Conditioning; Home Strength Foundation ↔ Bodyweight Strength; Home Strength Foundation ↔ Strength Foundation I cross-family). Each must demonstrate distinct authored content, not topology/substitution.
- **A journey-gap finding:** Home Strength Foundation is terminal-by-unbuilt-successor (Home Strength Intermediate is roadmapped, PEA §7.1) — the "terminal ≠ complete" pattern from the Running family and the Cross-Family Review recurs here.

**Lessons applied:** Powerbuilding-retirement anti-pattern (topology/environment-alone must not be the sole justification) is the central risk; Conditioning-family lesson (goal-driven distinctions are genuine but must be demonstrated) applies to the first pair; Lower Body Foundation lesson (record load-bearing single-axis distinctions) applies to the equipment-style axis; Body Recomposition lesson (boundary programs are fine if distinct in content) applies to Home Strength Foundation.

---

## Status Layers

- **Architecture:** LOCKED and unchanged by this research (PEA v1.4, PAS v1.3, PCA v1.4; MVP-Amendment-Environment-Tags v1.0). The equipment-distinction under-specification is **flagged, not fixed** — no architecture proposed (the V1.1 Training Environment Architecture, already deferred, is the natural home for it, but that is a product-owner decision, not this pass's).
- **Content Production:** Stage 0A (this document) complete — the **fifth family** through Stage 0A. No Stage 1 Blueprints authored.
- **Implementation Readiness:** Not begun. Stage 2 gated cross-family on Exercise Library population and the pre-publish PAS-R1 audit.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial Full Body & Home Family Stage 0A Research (findings only). Verified the 5-program roster (Bodyweight ladder Foundation/Strength/Performance + Home Conditioning + Home Strength Foundation), all FULL_BODY/HOME/General. Corrected the "Full Body Foundation = Bodyweight Foundation" rename. **Verdict: PASS.** Answered the three required questions: environment alone justifies nothing at program level; equipment access is a genuine distinction but structurally under-specified (single HOME enum; finer taxonomy informational/deferred per MVP-Amendment-Environment-Tags); programs not interchangeable IF authored to distinct progression models, with Home Strength Foundation the elevated watch program. Three convergence pressure-tests handed to Stage 1 (Bodyweight Foundation↔Home Conditioning; Home Strength Foundation↔Bodyweight Strength; Home Strength Foundation↔Strength Foundation I). Journey-gap finding: Home Strength Foundation terminal-by-unbuilt-successor (Home Strength Intermediate roadmapped). Equipment under-specification flagged, no architecture proposed. Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Full Body & Home Family Research — v1.0*
*June 2026 — Stage 0A deliverable per `Program-Catalog-Production-Standard-v1.0.md` §7. Findings only. Pending product-team review before LOCK. Fifth family through Stage 0A.*
