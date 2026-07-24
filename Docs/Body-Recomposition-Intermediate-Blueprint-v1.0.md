# Body Recomposition Intermediate — Coaching Blueprint v1.0

**Status:** LOCKED
**Phase:** Blueprint (pre-exercise-authoring) — Stage 1 per `Program-Catalog-Production-Standard-v1.0.md` §7

**Authority Chain:**
- `Conditioning-Intermediate-Blueprint-v1.0.md` (the established baseline + the four-part convergence test this Blueprint must pass)
- `Conditioning-Family-Research-v1.0.md` (Stage 0A; the handed-forward pair and its remediation paths)
- `Program-Authoring-Standard-v1.0.md` §7.2, §9 (PAS-D9), §10.1–10.3 (PAS-D11), §11.3, §13–14
- `Program-Ecosystem-Architecture-v1.0.md` §3, §5, §5.4
- `Program-Catalog-Architecture-v1.0.md` §3.1 (category as soft taxonomy), §3.4 (goal-alignment definitions)
- `FORGE_LEGACY_PRODUCT_DNA.md`

**Scope:** Validates the coaching structure for Body Recomposition Intermediate before detailed exercise programming begins, and evaluates it against the four-part convergence test set by the Conditioning Intermediate Blueprint. No exercises selected, no prescriptions made, no loading assigned, no weeks authored. Pure **Content Production (Stage 1)** — no architecture change proposed or needed.

**Purpose of this pass:** Body Recomposition Intermediate is the second half of the Conditioning family's one unresolved pair. It is **metadata-identical** to Conditioning Intermediate (INTERMEDIATE, 10wk, 4/wk, 40 total, GYM, Double Progression, identical Wk9 deload) and shares the PAS §11.3 "combine strength and cardio" template; the two differ only on goal alignment (`LOSE_FAT, BUILD_MUSCLE` vs `IMPROVE_CONDITIONING`). This Blueprint determines whether that goal difference **survives in authored structure** — i.e., whether Body Recomposition Intermediate is a genuine program or a renamed Conditioning Intermediate. It evaluates the design against all four test parts and issues a governance verdict.

---

## Catalog Metadata (Locked)

| Field | Value |
|---|---|
| Name | Body Recomposition Intermediate |
| Category | CONDITIONING |
| Level | INTERMEDIATE |
| Environment | GYM |
| Duration | 10 weeks |
| Sessions/week | 4 |
| Total workouts | 40 |
| Goal alignments | **LOSE_FAT, BUILD_MUSCLE** |
| Predecessor | Body Recomposition Foundation (Sort 13; BEG / GYM / 8wk / 4 per wk) |
| Successor | — (terminal; complete-by-design — no roadmap successor) |
| Sort order | 15 |
| Featured | NO |
| Deload | Week 9 (one — PAS-D7/D8); slots 33–36; peak Week 10 (slots 37–40) |
| Progression model | Double Progression (PAS §7.2 — CONDITIONING INTERMEDIATE) |
| Volume standard | 4–8 exercises / 12–24 sets MAIN (PAS-D11); WARM_UP + COOL_DOWN required (PAS-D9); 30–60 min (PAS §10.2) |
| Athlete type | Hybrid (PEA §5.4) |

Source: `Program-Ecosystem-Architecture-v1.0.md` §5 (Sort 15) and `Program-Authoring-Standard-v1.0.md` §13–14, re-checked directly. Identical to Conditioning Intermediate on every axis except goal alignment and athlete type.

---

## Section 1 — Program Overview

### Program Identity / Training Intent

Body Recomposition Intermediate is a **resistance-forward, deficit-oriented body-composition** program. Its goals are `LOSE_FAT` ("caloric output, metabolic conditioning, body composition") and `BUILD_MUSCLE` ("hypertrophic volume, progressive overload") per `Program-Catalog-Architecture-v1.0.md` §3.4. The training intent is **retain — and where possible build — lean mass while in a caloric deficit, using conditioning to drive caloric expenditure.** Resistance training is the spine of the program (it is what protects muscle in a deficit); conditioning is the supporting element that creates the energy output for fat loss. This is the deliberate **inverse** of Conditioning Intermediate, where conditioning is the spine and resistance serves it.

### Target Athlete

- **Hybrid athlete** (`Program-Ecosystem-Architecture-v1.0.md` §5.4), or a General athlete in a recomposition phase, who has graduated **Body Recomposition Foundation** or has equivalent experience.
- Goal is fat loss **with** muscle retention/gain — body-composition change — **not** maximizing work capacity (Conditioning Intermediate), **not** pure hypertrophy in a surplus (Muscle Building family), **not** maximal strength.
- Willing to train resistance-forward and to run conditioning for caloric output rather than performance.

### Excluded Athlete Profiles

| Profile | Why excluded | Better served by |
|---|---|---|
| Primary goal is work capacity / conditioning performance | This program subordinates conditioning to caloric output; resistance leads | **Conditioning Intermediate** (the goal-distinct sibling) |
| Primary goal is maximal hypertrophy (in a surplus) | Runs within the CONDITIONING volume envelope (12–24 sets), not hypertrophy-family volume (18–30); carries a conditioning component and a deficit orientation | Muscle Building family |
| Primary goal is concurrent strength + conditioning | No dedicated strength-development block; GYM not MIXED | Hybrid Intermediate (Sort 17) |
| New to structured recomposition training | Intermediate resistance + deficit demands a base | Body Recomposition Foundation (Sort 13) |

### Expected Outcomes

Measurable **body-composition change** over the block — fat loss with retained or increased lean mass — driven by progressive-overload resistance plus caloric-output conditioning in a deficit. **Not** a primary work-capacity or anaerobic-threshold improvement (that is Conditioning Intermediate's outcome).

### Success Criteria (for the eventual authored program)

- Resistance is the clear **majority** of session emphasis/volume; conditioning is the caloric-output minority.
- Resistance is prescribed at hypertrophy-supportive structure (moderate loads, ~8–15 reps, adequate rest) with visible progressive overload (QC-2).
- Conditioning is deficit-sustainable (moderate intensity / steady-state), not anaerobic-threshold ceiling work.
- WARM_UP + COOL_DOWN each session (PAS-D9); `restSeconds` populated (PAS §11.3).

---

## Section 2 — Program Architecture

- **Duration:** 10 weeks (PAS-D7 → one deload).
- **Frequency:** 4 sessions/week (matching the predecessor's 4-day cadence).
- **Weekly structure:** four **resistance-led** sessions — e.g., an **Upper / Lower ×2** resistance split, each session **leading with hypertrophy-style resistance** and **finishing with deficit-oriented conditioning** (a moderate-intensity metabolic finisher or steady-state block for caloric expenditure). The resistance-lead/conditioning-finish order is the structural inverse of Conditioning Intermediate's conditioning-led sessions. (Exact slot pattern fixed at Stage 2.)
- **Deload:** one, Week 9 (slots 33–36), peak Week 10 (slots 37–40), per PAS §14 — reduces resistance volume and conditioning load while maintaining four sessions (PAS-D8).
- **Periodization summary:** a single block in which **resistance progressive overload** (Double Progression) is the primary driver, with conditioning volume managed for caloric output. Periodization is **deficit-aware**: because a caloric deficit impairs recovery, volume is deliberately conservative to protect muscle retention (a recomposition-specific consideration Conditioning Intermediate does not carry).

---

## Section 3 — Session Structure

Section-first model (PAS §2.2, §9). **CONDITIONING requires both WARM_UP and COOL_DOWN** (PAS-D9). Order and rest per PAS §11.3 (combine strength + cardio; `restSeconds` always populated; circuits/finishers named in slots; avoid complex barbell lifts requiring unavailable coaching).

Each session: WARM_UP (dynamic raise) → MAIN, **resistance first** (the hypertrophy-style compound and accessory work that protects lean mass — moderate loads, ~8–15 reps, 60–120s rest per §10.3 INTERMEDIATE) → **conditioning finisher** (moderate-intensity/steady-state metabolic work for caloric output, sustainable in a deficit) → COOL_DOWN. MAIN sits within PAS-D11 (4–8 exercises / 12–24 sets) and 30–60 min (§10.2).

The contrast with Conditioning Intermediate is structural and visible: there, conditioning leads and resistance is a sub-hypertrophic accessory; here, resistance leads at hypertrophy structure and conditioning is a caloric finisher.

---

## Section 4 — Volume Distribution & Resistance/Conditioning Emphasis

| Element | Emphasis | Role |
|---|---|---|
| Resistance (compounds + accessories, ~8–15 reps, moderate load, adequate rest) | **Majority** of session emphasis/volume | Retain/build lean mass in a deficit (BUILD_MUSCLE) |
| Conditioning (moderate-intensity / steady-state finisher) | **Minority**, caloric-output-oriented | Create the energy deficit for fat loss (LOSE_FAT) |

Resistance is the majority **within the CONDITIONING PAS-D11 envelope (4–8 exercises / 12–24 sets)** — notably the program **cannot** run hypertrophy-family volume (18–30 sets), which both keeps it inside its category and keeps it distinct from the Muscle Building family. This resistance-forward majority is the exact **inversion** of Conditioning Intermediate's conditioning-forward majority.

---

## Section 5 — Progression Strategy

- **Primary driver: Double Progression on resistance** (PAS §7.2, Model 2) — a rep range (~8–15) is prescribed; load advances when the top of the range is reached on all sets. Progressive overload is what retains/builds muscle in a deficit; the family two-stage failure response applies.
- **Conditioning progresses by volume/duration** for caloric output — **not** by work-density-to-threshold (the inverse of Conditioning Intermediate's density headline). As the deficit accumulates, conditioning volume is managed conservatively to avoid compromising recovery and muscle retention.
- **RPE** permitted (PAS-D3, INTERMEDIATE) in `notes`, used to autoregulate resistance effort as deficit-related fatigue rises.

The progression *headline* is resistance load/overload, not conditioning density — a clear distinction marker from Conditioning Intermediate.

---

## Section 6 — Recovery Strategy

- **Deficit-aware recovery is the program's signature recovery consideration.** A caloric deficit impairs recovery capacity, so resistance volume is kept conservative (enough to retain muscle, not so much that it cannot be recovered in a deficit), and conditioning is moderate-intensity rather than maximal. This is a recomposition-specific recovery logic Conditioning Intermediate does not have.
- **Adequate inter-set rest on the resistance portion** (60–120s, §10.3) — necessary for the hypertrophy stimulus, and longer than Conditioning Intermediate's compressed conditioning-density rest.
- **Deload Week 9** reduces resistance volume + conditioning load, maintains frequency (PAS-D8). `restSeconds` populated throughout (§11.3).

---

## Section 7 — Expected Outcomes

By the end of the block: a measurable **body-composition improvement** — fat loss with retained or increased lean mass — produced by progressive-overload resistance plus caloric-output conditioning in a deficit. Work-capacity improvement may occur incidentally but is not the program's aim or success measure.

---

## Section 8 — Distinction Rationale

Body Recomposition Intermediate is justified by a distinct **athlete + goal + structure**: the Hybrid (or recomp-phase) athlete pursuing simultaneous fat loss and muscle retention, served by a resistance-forward, deficit-oriented program. It is distinct from:
- **its predecessor** (Body Recomposition Foundation) by level, intermediate resistance load/volume, and deficit-management sophistication;
- **Conditioning Intermediate** by the emphasis inversion (resistance-led vs conditioning-led), hypertrophy-structured resistance, and deficit-oriented conditioning (Section 9);
- **the Muscle Building family** by the LOSE_FAT goal, the conditioning component, the deficit orientation, and the CONDITIONING volume envelope (12–24 vs 18–30 sets) — it is muscle *retention during fat loss*, not muscle building in a surplus.

---

## Section 9 — Convergence Test Evaluation

The Conditioning Intermediate Blueprint set a four-part falsifiable test answering: *can Body Recomposition Intermediate be meaningfully different from Conditioning Intermediate despite identical metadata?* Evaluation:

| # | Test | Verdict | Evidence in this Blueprint |
|---|---|---|---|
| 1 | **Emphasis inversion** — resistance-forward majority, not conditioning-forward | **PASS** | §2–§4: resistance leads every session and is the majority of volume/emphasis; conditioning is a caloric finisher — the exact inverse of Conditioning Intermediate. |
| 2 | **Genuine hypertrophy-style resistance** (~8–15 reps, moderate load, adequate rest, honors BUILD_MUSCLE) | **PASS** | §3, §5: resistance prescribed at hypertrophy structure with 60–120s rest and Double Progression overload for muscle retention. Conditioning Intermediate's resistance is sub-hypertrophic conditioning-density work. |
| 3 | **Deficit-oriented conditioning** (caloric expenditure, not work-capacity max) | **PASS** | §3–§6: conditioning is moderate-intensity/steady-state for caloric output, deficit-sustainable, progressed by volume — explicitly not the anaerobic-threshold ceiling work that defines Conditioning Intermediate. |
| 4 | **Non-derivability** (distinguishable with goal tags hidden) | **PASS** | A reviewer sees resistance-led hypertrophy sessions with caloric finishers here vs conditioning-led circuits/intervals with resistance accessories there — different session order, rep ranges, rest, conditioning intensity, and progression headline. They are not interconvertible by a relabel. |

**All four parts PASS.**

**Honest boundary finding (not a blocker):** Body Recomposition Intermediate sits at the **CONDITIONING/HYPERTROPHY boundary** — it is resistance-forward yet categorized CONDITIONING. This is correct: its *distinguishing* goal is LOSE_FAT (body composition via deficit + metabolic conditioning), category is a soft display taxonomy (PCA §3.1), and the program is distinct from the Muscle Building family on goal, conditioning content, deficit orientation, and volume envelope (Section 8). No new convergence risk is created — it is distinct from both neighbors.

---

## Section 10 — Governance Verdict

**Verdict: APPROVE.**

**Why it survives despite identical metadata:** Body Recomposition Intermediate and Conditioning Intermediate share every locked metadata field except goal alignment — but their goal alignments drive **structurally inverted, mutually non-derivable** training designs. Conditioning Intermediate is conditioning-led, sub-hypertrophic, density-progressed, and work-capacity-aimed. Body Recomposition Intermediate is resistance-led, hypertrophy-structured, load-progressed, deficit-oriented, and composition-aimed. The distinction is **demonstrated in authored structure**, not asserted — it passes all four parts of the convergence test, including the decisive non-derivability check. This is the same outcome Lower Body Intermediate reached against Muscle Building Intermediate, and the **opposite** of the Powerbuilding Intermediate case (whose goal alignment was shared/inert, leaving only topology). Here goal alignment is the live, content-bearing differentiator.

**The Conditioning family's open convergence pair (Conditioning Intermediate ↔ Body Recomposition Intermediate) is RESOLVED.** No remediation (re-differentiate / merge / retire-and-redirect) is triggered.

**Scope guard — the Conditioning family's Stage 1 sequence is NOT complete.** This pass resolves the highest-risk pair and validates two of the family's six programs. **Outstanding Stage 1 Blueprints:** Hybrid Intermediate (Sort 17), and the three Foundations — Athletic Conditioning Foundation (12), Body Recomposition Foundation (13), Hybrid Foundation (16). Architecture is locked; Content Production is in progress; no Stage 2 work has begun.

**Confidence:** High. The metadata convergence was the only serious threat to this program's justification, and it is closed with concrete, inverted structural evidence against an explicit, pre-registered test.

**Recommended next action:** author the remaining Conditioning Stage 1 Blueprints (Hybrid Intermediate is the next-highest interest — MIXED environment + the only concurrent strength/conditioning goal — then the three Foundations) before a Conditioning family Stage 1 Review.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial Body Recomposition Intermediate Blueprint (Stage 1). Authored as a resistance-forward, deficit-oriented body-composition program and evaluated against the Conditioning Intermediate Blueprint's four-part convergence test: **all four PASS** (emphasis inversion; genuine hypertrophy-style resistance; deficit-oriented conditioning; non-derivability). **Verdict: APPROVE — the Conditioning Intermediate ↔ Body Recomposition Intermediate pair is RESOLVED**, no remediation triggered; goal alignment is a live content-bearing differentiator (the opposite of the Powerbuilding Intermediate case). Honest boundary finding: the program sits at the conditioning/hypertrophy boundary but is distinct from both Conditioning Intermediate and the Muscle Building family. Conditioning family Stage 1 explicitly NOT complete (Hybrid Intermediate + 3 Foundations outstanding). Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Body Recomposition Intermediate Coaching Blueprint — v1.0*
*June 2026 — Stage 1 per `Program-Catalog-Production-Standard-v1.0.md` §7. Pending product-team review before LOCK.*
