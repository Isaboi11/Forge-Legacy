# Body Recomposition Foundation — Coaching Blueprint v1.0

**Status:** LOCKED
**Phase:** Blueprint (pre-exercise-authoring) — Stage 1 per `Program-Catalog-Production-Standard-v1.0.md` §7

**Authority Chain:**
- `Athletic-Conditioning-Foundation-Blueprint-v1.0.md` (the Foundation baseline + the convergence test this Blueprint must pass)
- `Body-Recomposition-Intermediate-Blueprint-v1.0.md` (this program's own ladder's Intermediate — the resistance-forward/deficit lineage)
- `Conditioning-Family-Research-v1.0.md` (Stage 0A; the family's sub-ladders, athlete types, remediation paths)
- `Conditioning-Intermediate-Blueprint-v1.0.md`, `Hybrid-Intermediate-Blueprint-v1.0.md` (sibling context)
- `Program-Authoring-Standard-v1.0.md` §3.2, §7.2, §9 (PAS-D9), §10.1–10.3 (PAS-D11), §11.3, §13–14
- `Program-Ecosystem-Architecture-v1.0.md` §3, §5, §5.4
- `Program-Catalog-Architecture-v1.0.md` §3.1, §3.4 (goal-alignment definitions)
- `FORGE_LEGACY_PRODUCT_DNA.md`

**Scope:** Validates the coaching structure for Body Recomposition Foundation before detailed exercise programming begins, and evaluates it against the convergence test set by the Athletic Conditioning Foundation Blueprint. No exercises selected, no prescriptions made, no loading assigned, no weeks authored. Pure **Content Production (Stage 1)** — no architecture change proposed or needed.

**Purpose of this pass:** Body Recomposition Foundation is the BEGINNER entry to the Recomposition ladder and the **Foundation analogue of the already-resolved Conditioning Intermediate ↔ Body Recomposition Intermediate pair**. It shares family, level, and environment (CONDITIONING, BEGINNER, GYM) with Athletic Conditioning Foundation. This Blueprint determines whether the goal difference (`LOSE_FAT, BUILD_MUSCLE` vs `IMPROVE_CONDITIONING, GENERAL_FITNESS`) survives in authored structure — i.e., whether Body Recomposition Foundation is a genuine beginner body-composition program or a renamed Athletic Conditioning Foundation. It evaluates the design against the four-part convergence test and issues a governance verdict. It does **not** author Hybrid Foundation and resolves **only** this one pair.

---

## Catalog Metadata (Locked)

| Field | Value |
|---|---|
| Name | Body Recomposition Foundation |
| Category | CONDITIONING |
| Level | BEGINNER |
| Environment | GYM |
| Duration | 8 weeks |
| Sessions/week | 4 |
| Total workouts | 32 |
| Goal alignments | **LOSE_FAT, BUILD_MUSCLE** |
| Predecessor | — (BEGINNER entry into the Recomposition ladder) |
| Successor | Body Recomposition Intermediate (Sort 15) |
| Sort order | 13 |
| Featured | NO |
| Deload | Week 7 (one — PAS-D7/D8); slots 25–28; peak Week 8 (slots 29–32) |
| Progression model | Linear Progression **or** Volume Accumulation (PAS §7.2 — CONDITIONING BEGINNER) |
| Volume standard | 4–8 exercises / 12–24 sets MAIN (PAS-D11); WARM_UP + COOL_DOWN required (PAS-D9); 30–60 min (PAS §10.2) |
| Athlete type | Hybrid (PEA §5.4) |

Source: `Program-Ecosystem-Architecture-v1.0.md` §5 (Sort 13) and `Program-Authoring-Standard-v1.0.md` §13–14, re-checked directly. Versus Athletic Conditioning Foundation: same family/level/environment, but different goal alignment, **frequency (4 vs 3)**, and **total (32 vs 24)**.

---

## Section 1 — Program Overview

### Program Identity / Training Intent

Body Recomposition Foundation is the **beginner, resistance-forward, deficit-oriented body-composition** entry to the Conditioning family. Its goals are `LOSE_FAT` ("caloric output, metabolic conditioning, body composition") and `BUILD_MUSCLE` ("hypertrophic volume, progressive overload") per `Program-Catalog-Architecture-v1.0.md` §3.4. The intent is to **build and retain lean mass while a caloric deficit and conditioning drive fat loss** — at a beginner dose, with simple movements. Beginners respond especially well to recomposition (the "newbie" training response lets them gain muscle and lose fat simultaneously), which makes a dedicated beginner recomp program genuinely useful. Resistance is the program's spine; conditioning supports it by creating caloric output. This is the deliberate **inverse** of Athletic Conditioning Foundation, whose spine is conditioning and whose resistance serves it.

### Target Athlete

- **Hybrid athlete** (`Program-Ecosystem-Architecture-v1.0.md` §5.4), or a General athlete in a recomposition phase, who is new to structured recomp training (PAS §3.2 BEGINNER).
- Goal is fat loss **with** muscle retention/gain — body composition — **not** work capacity / general fitness (Athletic Conditioning Foundation), **not** concurrent strength (Hybrid Foundation).
- Can train 4 days/week.
- May have limited resistance-training background (informs the simple-movement resistance, Section 4).

### Excluded Athlete Profiles

| Profile | Why excluded | Better served by |
|---|---|---|
| Primary goal is work capacity / general fitness | This program is resistance-forward and deficit-oriented, not conditioning-forward | **Athletic Conditioning Foundation** (Sort 12) |
| Primary goal is concurrent strength + conditioning | No dedicated strength development; GYM not MIXED | Hybrid Foundation (Sort 16) |
| Ready for heavier, double-progression recomp | Beginner dose; Linear/Volume Accumulation; simple movements | Body Recomposition Intermediate (Sort 15) |
| Primary goal is maximal hypertrophy (in a surplus) | Deficit-oriented; carries a conditioning component; CONDITIONING volume envelope (12–24, not 18–30) | Muscle Building family |

### Expected Outcomes

A measurable beginner-level body-composition change over the 8-week block — fat loss with retained or increased lean mass — plus competence in basic resistance patterns and deficit-friendly conditioning. Readiness for Body Recomposition Intermediate.

### Success Criteria (for the eventual authored program)

- Resistance is the clear **majority** of session emphasis/volume; conditioning is the caloric-output minority.
- Resistance is prescribed at beginner hypertrophy structure (moderate loads, ~8–15 reps, adequate rest, simple movements) with visible progressive overload (QC-2).
- Conditioning is deficit-friendly (moderate-intensity / steady-state), not work-capacity-building.
- WARM_UP + COOL_DOWN each session (PAS-D9); `restSeconds` populated (PAS §11.3).

---

## Section 2 — Program Architecture

- **Duration:** 8 weeks (PAS-D7 → one deload).
- **Frequency:** 4 sessions/week (vs Athletic Conditioning Foundation's 3 — more frequency to carry the resistance-forward volume plus conditioning).
- **Weekly structure:** four **resistance-led** sessions — e.g., an **Upper / Lower ×2** split — each **leading with beginner hypertrophy resistance** and **finishing with deficit-oriented conditioning** for caloric output. The resistance-lead/conditioning-finish order inverts Athletic Conditioning Foundation's conditioning-led sessions.
- **Deload:** one, Week 7 (slots 25–28), peak Week 8 (slots 29–32), per PAS §14 — reduces resistance volume and conditioning load while maintaining four sessions (PAS-D8).
- **Periodization summary:** a single beginner block in which **resistance progressive overload** (Linear or Volume Accumulation, per PAS §7.2 CONDITIONING BEGINNER) is the primary driver, with conditioning volume managed for caloric output. Deficit-aware but beginner-conservative. **Not** Double Progression (that arrives at Body Recomposition Intermediate) — a model-level distinction from the Intermediate.

---

## Section 3 — Session Structure

Section-first model (PAS §2.2, §9). **CONDITIONING requires both WARM_UP and COOL_DOWN** (PAS-D9). Order/rest per PAS §11.3 (`restSeconds` always populated; circuits/finishers named in slots; avoid complex barbell lifts without instruction).

Each session: WARM_UP (dynamic raise) → MAIN, **resistance first** (beginner hypertrophy work — moderate loads, ~8–15 reps, adequate rest, **simple movements**: machines, dumbbells, bodyweight, basic compounds with instruction) → **conditioning finisher** (moderate-intensity/steady-state for caloric output, beginner dose) → COOL_DOWN. MAIN sits within PAS-D11 (4–8 exercises / 12–24 sets) and 30–60 min (§10.2).

**Beginner simple-movement note (PAS §11.3):** the complex-barbell caution applies (this is a beginner who may lack a strength background), so the hypertrophy resistance is delivered through simple, learnable movements rather than technical barbell work — distinct from how the Muscle Building family (HYPERTROPHY category, assumed resistance base) would program it.

The contrast with Athletic Conditioning Foundation is structural and visible: there, conditioning leads and resistance is a simple conditioning-serving accessory; here, resistance leads at beginner hypertrophy structure and conditioning is a caloric finisher.

---

## Section 4 — Resistance-Training Emphasis

Resistance is the **majority** of session emphasis/volume, prescribed at **beginner hypertrophy** structure (moderate loads, ~8–15 reps, adequate inter-set rest, progressive overload via Linear/Volume Accumulation) to **retain/build lean mass in a deficit** (honoring BUILD_MUSCLE) — delivered through simple movements (§11.3). This differs sharply from Athletic Conditioning Foundation's resistance, which is sub-hypertrophic, conditioning-serving, and aimed at general-fitness movement competency with no BUILD_MUSCLE goal. The resistance majority sits within the CONDITIONING PAS-D11 envelope (12–24 sets) — it cannot run Muscle-Building-family volume (18–30), which keeps it inside its category and distinct from that family.

---

## Section 5 — Conditioning Emphasis

Conditioning is the **minority**, **deficit-oriented** element: moderate-intensity or steady-state work for caloric expenditure, at a beginner dose, sustainable alongside the deficit and the resistance volume. It serves fat loss (LOSE_FAT), **not** work-capacity development — distinct from Athletic Conditioning Foundation's conditioning-forward spine and from the anaerobic-threshold work of the Conditioning ladder.

---

## Section 6 — Progression Strategy

- **Primary driver: progressive overload on resistance** via **Linear Progression or Volume Accumulation** (PAS §7.2 — CONDITIONING BEGINNER): load or volume rises gradually across the 8 weeks to drive muscle retention/gain, reset at the Week 7 deload. **Not** Double Progression (that is Body Recomposition Intermediate's model).
- **Conditioning progresses by volume/duration** for caloric output, kept conservative so it does not compromise recovery in a deficit.
- **No RPE** at BEGINNER (PAS-D3) — effort guided by prescribed targets and the deficit-aware structure.

The progression *headline* is resistance overload, not conditioning density — a clear distinction from Athletic Conditioning Foundation's gradual work-capacity accumulation.

---

## Section 7 — Recovery Strategy

- **Deficit-aware, beginner-conservative recovery.** A caloric deficit impairs recovery, so resistance volume is kept to a beginner-appropriate, recoverable dose (enough to retain/build muscle, not so much it cannot be recovered in a deficit), and conditioning is moderate rather than maximal.
- **4-day cadence** with rest days placed so the same muscle group is not loaded on consecutive days; **deload Week 7** reduces resistance volume + conditioning load while maintaining frequency (PAS-D8).
- Beginner rest periods (PAS §10.3 — 60–90s typical, self-regulated) on resistance; `restSeconds` populated throughout (§11.3).

---

## Section 8 — Expected Outcomes

By the end of the block: a beginner-level body-composition improvement — fat loss with retained or increased lean mass — driven by progressive-overload resistance plus caloric-output conditioning in a deficit, using simple movements. Work-capacity improvement may occur incidentally but is not the aim.

---

## Section 9 — Predecessor / Successor Logic

- **Predecessor — none.** BEGINNER entry into the Recomposition ladder.
- **Successor — Body Recomposition Intermediate (Sort 15).** Hands forward beginner resistance competence (simple-movement hypertrophy), deficit-management experience, one completed deload, and readiness for the model step (Linear/Volume Accumulation → Double Progression) and heavier resistance. The Recomposition ladder has **matched names** (Foundation → Intermediate), unlike the Athletic Conditioning → Conditioning naming asymmetry.

---

## Section 10 — Distinction Rationale

Body Recomposition Foundation is justified by a distinct **athlete + goal + structure**: the beginner pursuing simultaneous fat loss and muscle retention, served by a resistance-forward, deficit-oriented program. It is distinct from:
- **its successor** (Body Recomposition Intermediate) by level, beginner resistance dose/movement simplicity, and progression model (Linear/Vol-Accum vs Double Progression);
- **Athletic Conditioning Foundation** by emphasis inversion, beginner-hypertrophy resistance, and deficit-oriented conditioning (Section 11);
- **the Muscle Building family** by the LOSE_FAT goal, the conditioning component, the deficit orientation, and the CONDITIONING volume envelope (12–24 vs 18–30 sets) — muscle *retention during fat loss*, not muscle building in a surplus.

---

## Section 11 — Convergence Test Evaluation

The Athletic Conditioning Foundation Blueprint set a convergence test answering: *can Body Recomposition Foundation be meaningfully different from Athletic Conditioning Foundation despite both being BEGINNER, GYM, and in the Conditioning family?* Evaluation against the four named parts:

| Part | Verdict | Evidence in this Blueprint |
|---|---|---|
| **A — Emphasis inversion** (resistance-forward vs conditioning-forward) | **PASS** | §2–§4: resistance leads every session and is the majority; conditioning is a caloric finisher — the inverse of Athletic Conditioning Foundation's conditioning-forward spine. |
| **B — Fat-loss orientation** (caloric deficit support vs general fitness) | **PASS** | §1, §5: LOSE_FAT goal; conditioning is deficit-oriented for caloric output. Athletic Conditioning Foundation is GENERAL_FITNESS, not deficit-oriented. |
| **C — Muscle-retention/building structure** (beginner hypertrophy vs conditioning-serving resistance) | **PASS** | §3–§4, §6: beginner hypertrophy resistance (8–15 reps, moderate load, adequate rest, progressive overload) honoring BUILD_MUSCLE. Athletic Conditioning Foundation's resistance is sub-hypertrophic/conditioning-serving/general-fitness with no BUILD_MUSCLE goal. |
| **D — Non-derivability** (distinguishable from authored structure alone) | **PASS** | Resistance-led beginner hypertrophy sessions + caloric finishers (4-day) vs conditioning-led circuits + simple supporting resistance (3-day). Different emphasis, frequency, structure, progression headline, and goal. A reviewer can tell them apart. |

**All four parts PASS.**

**Metadata head-start (noted, not the basis of the verdict):** unlike the Intermediate pair (metadata-twins distinguished only by goal), these two Foundations also differ on **frequency (4 vs 3)** and **total (32 vs 24)** — more metadata separation. Per the Athletic Conditioning Foundation Blueprint's own caution, the resolution rests on the **emphasis inversion** (Parts A/C), not on the frequency/total gap; the gap is corroborating, not load-bearing.

**Honest boundary finding (not a blocker):** like Body Recomposition Intermediate, this program sits at the **CONDITIONING/HYPERTROPHY boundary** — resistance-forward yet categorized CONDITIONING. This is correct: its distinguishing goal is LOSE_FAT, category is a soft display taxonomy (PCA §3.1), and it is distinct from the Muscle Building family on goal, conditioning content, deficit orientation, and volume envelope (Section 10). No new convergence risk.

---

## Section 12 — Governance Verdict

**Verdict: APPROVE.**

**Why it survives despite the same family, level, and environment:** Body Recomposition Foundation and Athletic Conditioning Foundation share CONDITIONING / BEGINNER / GYM, but their goal alignments drive **structurally inverted, mutually non-derivable** beginner designs. Athletic Conditioning Foundation is conditioning-led, sub-hypertrophic, general-fitness, 3-day, work-capacity-accumulating. Body Recomposition Foundation is resistance-led, beginner-hypertrophy, deficit-oriented, 4-day, composition-aimed. The distinction is **demonstrated in authored structure** (it passes all four test parts, including non-derivability), not merely asserted — the Foundation-level echo of the resolved Body Recomposition Intermediate result, and the opposite of a topology-only justification.

**The Athletic Conditioning Foundation ↔ Body Recomposition Foundation pair is RESOLVED.** No remediation (re-differentiate / merge / retire-and-redirect) is triggered.

**Scope guard — only this pair is resolved; the Foundation layer and the family Stage 1 sequence are NOT complete.** Five of the family's six programs are now blueprinted (all three Intermediates + Athletic Conditioning Foundation + this). **Outstanding: Hybrid Foundation (Sort 16)** — which must pass the Athletic Conditioning Foundation Blueprint's *second* forward convergence test (concurrent-strength introduction + the beginner-vs-§11.3-barbell design question) — followed by a Conditioning Family Stage 1 Review. Architecture is locked; Content Production is in progress; no Stage 2 work has begun.

**Confidence:** High. The shared family/level/environment was the only threat to this program's justification, and it is closed with concrete inverted structure against an explicit, pre-registered test.

**Recommended next action:** author **Hybrid Foundation** against Forward Convergence Test #2 (resolving the beginner-strength-without-complex-barbell design question), then run a Conditioning Family Stage 1 Review.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial Body Recomposition Foundation Blueprint (Stage 1). Authored as a beginner resistance-forward, deficit-oriented body-composition program and evaluated against the Athletic Conditioning Foundation convergence test: **all four parts PASS** (emphasis inversion; fat-loss orientation; beginner-hypertrophy resistance; non-derivability). **Verdict: APPROVE — the Athletic Conditioning Foundation ↔ Body Recomposition Foundation pair is RESOLVED**, no remediation; goal alignment is a live content-bearing differentiator even at BEGINNER level. Metadata head-start (4d/32 vs 3d/24) noted as corroborating, not load-bearing. Boundary finding: conditioning/hypertrophy boundary, distinct from both Athletic Conditioning Foundation and the Muscle Building family. Only this pair resolved; Hybrid Foundation NOT authored; family Stage 1 NOT complete. Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Body Recomposition Foundation Coaching Blueprint — v1.0*
*June 2026 — Stage 1 per `Program-Catalog-Production-Standard-v1.0.md` §7. Pending product-team review before LOCK.*
