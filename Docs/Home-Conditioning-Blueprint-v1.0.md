# Home Conditioning — Coaching Blueprint v1.0

**Status:** LOCKED
**Phase:** Blueprint (pre-exercise-authoring) — Stage 1 per `Program-Catalog-Production-Standard-v1.0.md` §7

**Authority Chain:**
- `Bodyweight-Foundation-Blueprint-v1.0.md` (the established baseline + the four-part convergence test this Blueprint must pass)
- `Full-Body-Home-Family-Research-v1.0.md` (Stage 0A; the handed-forward pair and remediation paths)
- `Athletic-Conditioning-Foundation-Blueprint-v1.0.md` (the GYM conditioning analogue)
- `Home-Strength-Foundation-Blueprint-v1.0.md`, `Body-Recomposition-Intermediate-Blueprint-v1.0.md` (sibling/cross-family context)
- `Program-Authoring-Standard-v1.0.md` §3.2, §7.1 (Model 4 Volume Accumulation), §9 (PAS-D9), §10.1 (PAS-D11), §11.7 (FULL_BODY/HOME authoring), §13–14
- `Program-Ecosystem-Architecture-v1.0.md` §3, §5, §5.4
- `Program-Catalog-Architecture-v1.0.md` §3.2 (levels), §3.3 (environments), §3.4 (goal alignments)
- `FORGE_LEGACY_PRODUCT_DNA.md`

**Scope:** Validates the coaching structure for Home Conditioning before detailed exercise programming begins, and evaluates it against the four-part convergence test set by the Bodyweight Foundation Blueprint. No exercises selected, no prescriptions made, no loading assigned, no weeks authored. Pure **Content Production (Stage 1)** — no architecture change proposed or needed.

**Purpose of this pass:** Home Conditioning is the second half of the Full Body & Home family's one remaining unresolved pair. It is a **near metadata-twin of Bodyweight Foundation** (both BEGINNER, FULL_BODY, HOME, 6wk, 3/wk, 18 total, no deload), and both draw on the same bodyweight/minimal-equipment toolkit — so the distinction cannot rest on equipment. This Blueprint determines whether the goal difference (`LOSE_FAT, IMPROVE_CONDITIONING` vs `GENERAL_FITNESS`) survives in authored structure: **is Home Conditioning a genuine program, or merely Bodyweight Foundation performed faster?** It evaluates all four test parts and issues a verdict that resolves the pair. It does **not** author Bodyweight Strength or Bodyweight Performance.

---

## Catalog Metadata (Locked)

| Field | Value |
|---|---|
| Name | Home Conditioning |
| Category | FULL_BODY |
| Level | BEGINNER |
| Environment | HOME |
| Duration | 6 weeks |
| Sessions/week | 3 |
| Total workouts | 18 |
| Goal alignments | **LOSE_FAT, IMPROVE_CONDITIONING** |
| Predecessor | — (BEGINNER entry) |
| Successor | — (terminal; complete-by-design — no roadmap successor) |
| Sort order | 21 |
| Featured | NO |
| Deload | **None** (6 weeks < 7; PAS-D7) |
| Progression model | **Volume Accumulation (Model 4)** — PAS §7.1 program list |
| Volume standard | 4–7 exercises / 12–20 sets MAIN (PAS-D11; "HOME may use higher reps, lower weights"); WARM_UP required, COOL_DOWN optional (PAS-D9); 40–70 min (§10.2) |
| Athlete type | General (PEA §5.4) |

Source: `Program-Ecosystem-Architecture-v1.0.md` §5 (Sort 21) and `Program-Authoring-Standard-v1.0.md` §13–14, re-checked directly. Progression model confirmed against §7.1's Model 4 program list (which names Home Conditioning). Identical to Bodyweight Foundation on level/category/environment/duration/frequency/total/deload — differing on goal, progression sub-model, and successor.

---

## Section 1 — Program Overview

### Program Identity / Training Intent

Home Conditioning is **home metabolic conditioning for fat loss and work capacity** — the home/bodyweight analogue of the GYM family's Athletic Conditioning Foundation. Its goals are `LOSE_FAT` ("caloric output, metabolic conditioning, body composition") and `IMPROVE_CONDITIONING` ("work capacity, anaerobic threshold") per `Program-Catalog-Architecture-v1.0.md` §3.4. The intent is to drive caloric expenditure and build work capacity using bodyweight/minimal-equipment **conditioning circuits and intervals** — the sessions are organized around sustained metabolic work, not movement-pattern mastery. This is the deliberate **training-target inverse** of Bodyweight Foundation (whose organizing principle is general-fitness movement competency, with conditioning incidental).

### Target Athlete

- **General athlete** (PEA §5.4), beginner (PAS §3.2), training at home (bodyweight/minimal equipment), whose **primary goal is fat loss + improved conditioning**.
- Not the general-fitness-movement athlete (Bodyweight Foundation), not the home-equipment-strength athlete (Home Strength Foundation), and without gym access (the GYM conditioning programs are unavailable to them).

### Excluded Athlete Profiles

| Profile | Why excluded | Better served by |
|---|---|---|
| Wants general-fitness / movement competency foundation | This program is metabolic-forward, organized around conditioning density, not movement mastery | **Bodyweight Foundation** (Sort 18) — the pair under test |
| Wants equipment-based strength at home | No strength-development focus | Home Strength Foundation (Sort 22) |
| Has gym access and wants structured conditioning | The GYM family has a fuller conditioning ladder | Athletic Conditioning Foundation → Conditioning Intermediate |
| Wants fat loss *with* muscle building (recomp) | Conditioning-forward, not resistance-forward | Body Recomposition Foundation (GYM) |

### Expected Outcomes

Measurable fat loss (caloric output) and improved work capacity over the 6-week block, using home conditioning circuits/intervals — **not** primarily movement competency or strength.

### Success Criteria (for the eventual authored program)

- Sessions are organized around **work-to-rest conditioning** (circuit/interval density) as the primary variable — not movement-pattern mastery with full rest.
- Progression is visible (QC-2) via **Volume Accumulation** (rising rounds/sets/work density across the 6 weeks).
- A reviewer with goal tags hidden can identify it as a conditioning/fat-loss program, distinct from a general-fitness bodyweight program.
- WARM_UP each session (PAS-D9); `restSeconds`/work:rest explicit (the conditioning prescription variable).

---

## Section 2 — Program Architecture

- **Duration:** 6 weeks; **no mandatory deload** (PAS-D7, under 7 weeks).
- **Frequency:** 3 sessions/week.
- **Weekly structure:** 3 conditioning-organized sessions — **work:rest circuits and intervals** using bodyweight/minimal equipment, with rotated modalities to broaden work capacity. WARM_UP required; COOL_DOWN optional (PAS-D9).
- **Periodization summary:** a single short block on **Volume Accumulation (Model 4)** — rounds/sets/work density rise across the 6 weeks (PAS §7.1), accumulating work capacity. This is a different progression mechanic from Bodyweight Foundation's linear rep/variation movement progression, and it is the structural signature of a conditioning program.

---

## Section 3 — Session Structure

Section-first model (PAS §2.2, §9). FULL_BODY requires **WARM_UP**; COOL_DOWN optional (PAS-D9). Equipment ceiling per §11.7 (bodyweight, pull-up bar, bands, limited dumbbells; no barbell/rack/cables/machines). Each session: WARM_UP (dynamic raise) → MAIN: a conditioning circuit or interval block (e.g., timed rounds / AMRAP-style / work:rest intervals of bodyweight movements) organized for sustained output → (COOL_DOWN optional). MAIN sits within PAS-D11 (4–7 exercises / 12–20 sets), 40–70 min (§10.2). The organizing variable is **work:rest density**, made explicit in `notes`/`restSeconds` — the conditioning-prescription discipline (the §11.7 toolkit, organized the way Athletic Conditioning Foundation organizes GYM conditioning).

The contrast with Bodyweight Foundation is structural: there, sessions are organized around movement-pattern quality with adequate rest; here, around sustained metabolic work with controlled work:rest.

---

## Section 4 — Conditioning Emphasis

Conditioning is the **organizing principle**, not a byproduct. Sessions target sustained/elevated heart rate and work capacity through circuit/interval density. Intensity is beginner-sustainable (moderate, repeatable) rather than maximal — the goal is caloric output and a work-capacity base, not anaerobic-threshold ceiling work (that intensity tier belongs to the GYM Conditioning ladder's intermediate rung). This metabolic-forward emphasis is the program's identity and the baseline-inversion the convergence test turns on (Section 11).

---

## Section 5 — Movement / Equipment Role

Home Conditioning uses the **same bodyweight/minimal-equipment toolkit** as Bodyweight Foundation (§11.7) — but organized for conditioning rather than movement development. Movements are chosen for their suitability in metabolic circuits (repeatable, low-skill, sustainable under fatigue) rather than for a movement-mastery progression ladder. Equipment is not the differentiator here (both programs are bodyweight/minimal) — the **organizing principle and progression target are** (Section 11). Avoid movements requiring advanced technique that degrade under conditioning fatigue (§11.7's caution applies with extra force in a fatigued, high-density context).

---

## Section 6 — Progression Strategy

- **Volume Accumulation (Model 4)** (PAS §7.1): rounds/sets/work density rise across the 6 weeks, accumulating work capacity while movement complexity stays stable. This is the conditioning progression mechanic — you get *more conditioned* by doing *more work*, not by mastering harder movements.
- This is the concrete, repository-grounded differentiator from Bodyweight Foundation, which progresses by **reps then harder variations** (movement difficulty). Same toolkit, different progression target.
- No RPE at BEGINNER (PAS-D3); effort guided by the prescribed work:rest structure.

---

## Section 7 — Recovery Strategy

- **6-week, no-deload, 3-day** structure; conditioning intensity is beginner-sustainable (moderate, not maximal), so a deload is not mandated (PAS-D7) and the accumulating volume stays recoverable.
- Work:rest ratios are the in-session recovery lever; `restSeconds` populated to make the conditioning prescription explicit.
- Rest days between the three weekly sessions.

---

## Section 8 — Expected Outcomes

By the end of the 6-week block: fat loss (sustained caloric output) and an improved work-capacity base, built with home conditioning circuits/intervals — not a movement-competency or strength outcome.

---

## Section 9 — Predecessor / Successor Logic

- **Predecessor — none.** BEGINNER entry.
- **Successor — terminal, complete-by-design.** Unlike Home Strength Foundation (terminal-by-unbuilt-successor, with Home Strength Intermediate roadmapped), Home Conditioning has **no roadmap successor** (PEA §7.1) — it is a genuinely complete standalone home fat-loss/conditioning program for its goal, not a journey gap.

---

## Section 10 — Distinction Rationale

Home Conditioning is justified by a distinct **athlete + goal + training target**: the at-home beginner pursuing fat loss and conditioning, served by metabolic circuits/intervals with Volume-Accumulation progression. It is distinct from:
- **Bodyweight Foundation** by training target (metabolic conditioning vs movement competency), goal (LOSE_FAT+IMPROVE_CONDITIONING vs GENERAL_FITNESS), progression model (Volume Accumulation vs rep/variation), and successor status (Section 11);
- **Home Strength Foundation** by goal/target (conditioning/fat-loss vs strength) and progression;
- **the GYM Conditioning family** (Athletic Conditioning Foundation, Body Recomposition) by environment + equipment (home/bodyweight vs gym) and goal mix — it is the home/bodyweight fat-loss-conditioning option (cross-family note in Section 11).

---

## Section 11 — Convergence Test Evaluation

The Bodyweight Foundation Blueprint set a four-part test answering: *can Home Conditioning be meaningfully different from Bodyweight Foundation despite both existing in the HOME family and relying on the same limited-equipment toolkit?* Evaluation:

| # | Test | Verdict | Evidence in this Blueprint |
|---|---|---|---|
| 1 | **Metabolic-forward emphasis** | **PASS** | §2–§4: sessions are organized around work:rest conditioning circuits/intervals as the primary variable — the inverse of Bodyweight Foundation's movement-competency-forward, adequately-rested structure. |
| 2 | **Fat-loss / caloric-output orientation (LOSE_FAT)** | **PASS** | §1, §4: structure deliberately serves caloric expenditure (circuit density, sustained HR). Bodyweight Foundation's conditioning is incidental, not a target. |
| 3 | **Deliberate work-capacity development (IMPROVE_CONDITIONING)** | **PASS** | §6: Volume Accumulation literally accumulates work across the block; intervals/circuits at conditioning intensity. Bodyweight Foundation's HR is a byproduct of movement work, not a developed target. |
| 4 | **Non-derivability** | **PASS** | Different organizing principle (work:rest density vs movement quality), different progression *model* (Volume Accumulation vs rep/variation), different goal/intent. It is built around conditioning from the ground up — **not** "Bodyweight Foundation done faster." |

**All four parts PASS.**

**Why it survives despite the shared bodyweight toolkit (the family's subtlest resolution):** Home Conditioning and Bodyweight Foundation share level, category, environment, duration, frequency, total, no-deload, AND the same equipment toolkit — so the distinction cannot lean on equipment or load (the levers the Home Strength Foundation and resistance pairs used). It rests instead on a **training-target inversion** demonstrated by three concrete, repository-grounded differences: (a) goal alignment (LOSE_FAT+IMPROVE_CONDITIONING vs GENERAL_FITNESS); (b) **progression model** (Volume Accumulation, PAS §7.1, vs linear rep/variation) — the single hardest-to-fake differentiator, because "doing it faster" does not produce a Volume-Accumulation work-capacity program; and (c) session organizing principle (work:rest conditioning density vs movement-pattern mastery). This is the same kind of in-structure resolution used for the GYM Conditioning pairs, adapted to a shared-toolkit home context.

**Stage 2 caveat (load-bearing, like Home Strength Foundation's):** because the distinction is training-target rather than equipment, **Stage 2 authoring must organize Home Conditioning around conditioning** — work:rest as the primary prescription variable, Volume-Accumulation progression. If it is authored as fast bodyweight circuits indistinguishable from a sped-up Bodyweight Foundation, it collapses into (B) topology and must be re-examined for merge/retirement. This is the program's single most important Stage 2 instruction.

**Cross-family note (not a convergence problem):** Home Conditioning shares LOSE_FAT with Body Recomposition (CONDITIONING/GYM) and IMPROVE_CONDITIONING with Athletic Conditioning Foundation (CONDITIONING/GYM), but differs from both by environment + equipment (home/bodyweight vs gym) and goal mix. It is the home/bodyweight fat-loss-conditioning option — distinct, not duplicative.

---

## Section 12 — Governance Verdict

**Verdict: APPROVE.**

Home Conditioning is a genuine program — home metabolic conditioning for fat loss and work capacity — not Bodyweight Foundation performed faster. It passes all four parts of the convergence test on the strength of a **training-target inversion** carried by goal alignment, the Volume-Accumulation progression model, and the work:rest organizing principle — a distinction demonstrated in authored structure, not asserted. **The Bodyweight Foundation ↔ Home Conditioning pair is RESOLVED**; no remediation (re-differentiate / merge / retire) is triggered.

**Why it survives despite metadata near-identical to Bodyweight Foundation:** the two share everything except goal, progression model, and successor — but goal alignment drives a genuinely different training target (metabolic conditioning vs movement competency), and the Volume-Accumulation-vs-rep/variation progression difference is a structural, hard-to-fake differentiator. Environment/equipment is shared and therefore irrelevant to the distinction; training content carries it.

**Scope guard — the Full Body & Home family's Stage 1 sequence is NOT complete.** Three of five programs are now blueprinted and APPROVED (Home Strength Foundation, Bodyweight Foundation, Home Conditioning), and both of the family's convergence questions (the equipment-tier question via Home Strength Foundation; the Bodyweight Foundation ↔ Home Conditioning pair) are resolved. **Outstanding Stage 1 Blueprints: Bodyweight Strength (Sort 19) and Bodyweight Performance (Sort 20)** — the Bodyweight ladder's INTERMEDIATE and ADVANCED rungs — followed by a Full Body & Home Stage 1 Review. Architecture is locked; Content Production is in progress; no Stage 2 work has begun.

**Confidence:** High. The shared toolkit was the only real threat to this program's justification, and it is closed with a concrete progression-model + organizing-principle inversion against an explicit, pre-registered test — with the Stage 2 caveat recorded so the resolution is preserved in authoring.

**Recommended next action:** author **Bodyweight Strength** and **Bodyweight Performance** (the Bodyweight ladder's upper rungs; both share BUILD_STRENGTH+GENERAL_FITNESS, so verify the BEG→INT→ADV progression is genuine), then run a Full Body & Home Stage 1 Review.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial Home Conditioning Blueprint (Stage 1). Authored as home metabolic conditioning for fat loss + work capacity (the home/bodyweight analogue of Athletic Conditioning Foundation), and evaluated against the Bodyweight Foundation four-part convergence test: **all four PASS** (metabolic-forward emphasis; fat-loss orientation; deliberate work-capacity via Volume Accumulation; non-derivability). **Verdict: APPROVE — the Bodyweight Foundation ↔ Home Conditioning pair is RESOLVED**, no remediation. Survives despite the shared bodyweight toolkit via a training-target inversion (goal + Volume-Accumulation progression model + work:rest organizing principle), not equipment. Stage 2 caveat recorded (must be organized around conditioning or it collapses into "Bodyweight Foundation done faster"). Terminal complete-by-design. Family Stage 1 NOT complete (Bodyweight Strength + Bodyweight Performance outstanding). Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Home Conditioning Coaching Blueprint — v1.0*
*June 2026 — Stage 1 per `Program-Catalog-Production-Standard-v1.0.md` §7. Pending product-team review before LOCK.*
