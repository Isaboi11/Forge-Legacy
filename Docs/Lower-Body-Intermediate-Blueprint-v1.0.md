# Lower Body Intermediate — Coaching Blueprint v1.0

**Status:** LOCKED
**Phase:** Blueprint (pre-exercise-authoring) — Stage 1 per `Program-Catalog-Production-Standard-v1.0.md` §7

**Authority Chain:**
- `Muscle-Building-Family-Research-v1.0.md` (Stage 0A family authority; the source of the convergence risk this Blueprint must close)
- `Muscle-Building-Intermediate-Blueprint-v1.0.md` (the program this is tested against; the source of the three-part falsifiable test)
- `Program-Authoring-Standard-v1.0.md` §3.2, §6–8, §10, §11.2, §13–14
- `Program-Ecosystem-Architecture-v1.0.md` §2–3, §5
- `Program-Catalog-Production-Standard-v1.0.md` §7 (Stage 1 definition)
- `Muscle-Building-Rename-Amendment-001.md` (LOCKED — athlete-facing naming; this family's category displays as "Muscle Building", enum retained as `HYPERTROPHY`)
- `O-2-Amendment-001-Athlete-Type-Declaration.md` (Bodybuilding volume signal)
- `FORGE_LEGACY_PRODUCT_DNA.md`

**Scope:** This document validates the coaching structure for Lower Body Intermediate before detailed exercise programming begins. No exercises are selected. No workout prescriptions are made. No loading is assigned. No weeks are authored. No Google Sheet content is created. This Blueprint does not move the program into Stage 2 Authoring. This is **Content Production (Stage 1)** — no architecture change is proposed and none is needed.

**Purpose of this pass:** Lower Body Intermediate and Muscle Building Intermediate are **identical on every locked metadata axis** (level, category, environment, duration, frequency, total workouts, goal alignment, progression model, deload schedule). The Muscle Building family research named this the family's hardest distinction case — the direct analogue of the Strength family's Strength Foundation II ≈ Powerbuilding Intermediate convergence risk, which ended in a program retirement. The Muscle Building Intermediate Blueprint deliberately did not close that risk; it established the whole-physique baseline and handed forward a **three-part falsifiable test** this Blueprint must pass. This pass settles the risk: it either demonstrates Lower Body Intermediate's distinct structure in authored detail (APPROVE) or triggers a remediation path (REVISE / reposition / merge / RETIRE). A non-APPROVE verdict is a legitimate outcome.

---

## Catalog Metadata (Locked)

| Field | Value |
|---|---|
| Name | Lower Body Intermediate |
| Category | HYPERTROPHY *(displays as "Muscle Building" per `Muscle-Building-Rename-Amendment-001.md`)* |
| Level | INTERMEDIATE |
| Environment | GYM |
| Duration | 10 weeks |
| Sessions/week | 4 |
| Total workouts | 40 |
| Goal alignments | BUILD_MUSCLE |
| Predecessor | Lower Body Foundation (Sort 8; 8 wk / 3 per wk) |
| Successor | — (terminal). The roadmapped continuation "Lower Body Advanced" (`Program-Ecosystem-Architecture-v1.0.md` §5) is not in the launch catalog, so `successorProgramId` is null and W-3 shows no "What's Next" |
| Sort order | 9 |
| Featured | NO |
| Deload | Week 9 (one — PAS-D7/D8); slots 33–36; peak Week 10 (slots 37–40) |
| Progression model | Double Progression + Volume Accumulation — PAS §7.1, §7.2 |
| Volume standard | 5–8 exercises, 18–30 sets/session (PAS-D11); 10–20 sets/muscle/week (PAS §11.2) |

Source: `Program-Ecosystem-Architecture-v1.0.md` §5 (Sort 9, terminal) and `Program-Authoring-Standard-v1.0.md` §13–14, re-checked directly against both files during this Blueprint (post-rename text). Note the deload schedule (Week 9, slots 33–36, peak Week 10) is **byte-for-byte identical** to Muscle Building Intermediate's — confirming the metadata convergence the three-part test exists to overcome.

---

## Section 1 — Program Overview

### Program Identity

Lower Body Intermediate is the **lower-body specialization** rung of the Muscle Building family. Where Muscle Building Intermediate distributes its weekly volume evenly across the whole physique, Lower Body Intermediate concentrates the large majority of its working volume on the quads, hamstrings, glutes, and calves, and runs upper-body work only at a maintenance dose. It is not a general program with extra leg work bolted on; it is a program whose entire weekly structure — four lower-dominant sessions with rotating muscle-group emphasis — is engineered around lower-body and glute development. That concentration is its identity and the sole reason it exists as a separate program from Muscle Building Intermediate.

### Target Athlete

- 1–3 years of structured resistance training with this style, per `Program-Authoring-Standard-v1.0.md` §3.2's INTERMEDIATE definition.
- Has graduated **Lower Body Foundation**, or has equivalent experience self-managing a rep-range (double-progression) model on lower-body lifts.
- **Primary training goal is lower-body and glute development specifically** — not a balanced whole-body physique. Per `Program-Ecosystem-Architecture-v1.0.md` §5, this is goal-differentiated, not a distinct athlete type: it serves Bodybuilding, Strength, and General athletes whose focus is the lower body.
- Willing to accept upper-body maintenance (not growth) for the program's duration in exchange for concentrated lower-body progress.
- Has 4 days/week available and can recover from a lower-body-dominant weekly load.

### Excluded Athlete Profiles

| Profile | Why excluded | Better served by |
|---|---|---|
| Wants balanced whole-body development | This program runs upper body at maintenance only; balanced trainees will feel their upper body under-served | **Muscle Building Intermediate** (the same-level program in the family's general ladder) |
| Beginner to lower-body specialization | Starts mid-range and concentrates high lower-body volume; assumes self-managed rep ranges | Lower Body Foundation (Sort 8) |
| Primary goal is maximal lower-body strength (1RM) | Volume-driven, no 1RM-style primary stimulus (Family Research Deliverable 1; PAS §11.2) | Strength family |
| Cannot recover from frequent lower-body loading (e.g., contraindicated knee/hip/back issue) | Four lower-dominant sessions/week is a deliberately high regional load | A balanced split (Muscle Building Intermediate) or a medical-clearance path |

### Expected Outcomes

Concentrated, measurable hypertrophy stimulus across the lower body over a 10-week block: rising lower-body working volume, demonstrable double-progression load increases on each session's squat/hinge anchors, and visible quad/hamstring/glute/calf development — with upper-body capacity retained, not grown.

### Success Criteria (for the eventual authored program)

- Lower-body muscle groups sit near the **top** of the 10–20 sets/week band (PAS §11.2); upper-body work sits **below** the band (maintenance).
- Total weekly working sets are **≥65–70% lower body** (the convergence-test threshold).
- Week-over-week progression is visible (QC-2) via rising lower-body set counts (Volume Accumulation) and/or advancing rep-range targets (Double Progression).
- Emphasis rotation is legible in the slot names (a reviewer can see which day is quad-, hinge-, or glute-dominant).

---

## Section 2 — Program Architecture

- **Duration:** 10 weeks (PAS-D7 → exactly one deload).
- **Frequency:** 4 sessions/week.
- **Split:** four **lower-body-dominant** sessions with **rotating muscle-group emphasis** — not a repeated identical leg day. The week reads:
  1. **Lower — Quad emphasis** (squat-pattern anchor)
  2. **Lower — Posterior chain emphasis** (hinge-pattern anchor; hamstrings + glutes)
  3. **Lower — Glute emphasis** (hip-thrust / bridge-pattern anchor)
  4. **Lower — Mixed / volume** (balanced squat+hinge accumulation day)

  Upper-body **maintenance** work (one horizontal push pattern, one pull pattern) is folded into two of the four sessions as a short trailing block — never as a session of its own.
- **Deload:** one, Week 9 (slots 33–36), per PAS §14; peak in Week 10 (slots 37–40). The deload maintains all four sessions and cuts primary (lower-body) set volume 40–50% (PAS-D8).
- **Periodization summary:** a single accumulation mesocycle — Volume Accumulation (Model 4) raises lower-body working sets across Weeks 1–8, Week 9 discharges fatigue, Week 10 is the peak. Double Progression (Model 2) governs load within every exercise. This is **not** Block Periodization (introduced one rung up at Muscle Building Advanced, and not present in the Lower Body ladder at all).

---

## Section 3 — Session Structure

Section-first model (PAS §2.2, §9; WS-A5). WARM_UP required for HYPERTROPHY (PAS-D9); COOL_DOWN optional, unspecified at Blueprint stage. Exercise order per PAS §11.2: compounds first, isolation last; cables/machines appropriate; no core-compound minimum (HYPERTROPHY, not STRENGTH).

**Day 1 — Lower, Quad emphasis**
1. WARM_UP — general raise + dynamic prep for the squat pattern.
2. MAIN — squat-pattern compound first; quad-biased secondary (e.g., split-squat/leg-press pattern); quad isolation (leg extension); a hamstring counter-set for balance; calf isolation.

**Day 2 — Lower, Posterior-chain emphasis**
1. WARM_UP — hinge-pattern prep.
2. MAIN — hinge-pattern compound first (RDL/deadlift-pattern); hamstring isolation (leg curl); glute-biased accessory; calf isolation. **Upper maintenance block:** one pull pattern, ~4–6 sets.

**Day 3 — Lower, Glute emphasis**
1. WARM_UP — hip-extension prep.
2. MAIN — hip-thrust / bridge-pattern compound first; glute-biased accessory (abduction, lunge pattern); hamstring accessory; calf isolation. **Upper maintenance block:** one horizontal push pattern, ~4–6 sets.

**Day 4 — Lower, Mixed / volume**
1. WARM_UP — general lower prep.
2. MAIN — a squat- *or* hinge-pattern compound (rotated to balance the week); a mix of quad, hamstring, and glute isolation to top up weekly volume; calf isolation.

The **upper-maintenance blocks appear on only two of four days and are deliberately short** — they exist to retain upper-body capacity, not to grow it.

---

## Section 4 — Weekly Muscle-Group Coverage & Volume Distribution

The architecture's defining test is that the four sessions sum to a **lower-dominant** weekly distribution. Indicative working-set targets (the authored program tunes within these):

| Muscle group | Region | Trained on | Target weekly sets | Band position |
|---|---|---|---|---|
| Quads | Lower | D1, D4 (+ D3 lunge) | 16–18 | top of 10–20 band |
| Hamstrings | Lower | D2, D4 (+ counters) | 12–16 | upper band |
| Glutes | Lower | D2, D3, D4 | 14–16 | upper band |
| Calves | Lower | D1–D4 | 10–12 | mid–upper band |
| Back / pull | Upper | D2 (maintenance) | 4–6 | **below band (maintenance)** |
| Chest / push | Upper | D3 (maintenance) | 4–6 | **below band (maintenance)** |

**Distribution result:** lower-body working sets ≈ **52–62**; upper-body ≈ **8–12**; lower-body share ≈ **70–75%** of total weekly volume. Every lower-body group sits inside or near the top of its 10–20 band; both upper-body regions sit deliberately **below** the band. This ~70/30 split *is* the program — and it is the concrete evidence for the convergence test in Section 9.

(Total weekly set count is higher than Muscle Building Intermediate's because the volume is concentrated on four lower-body groups rather than spread across eight; it remains recoverable precisely because the load is regionally focused and rotated across days — see Section 7. Per-session counts stay inside PAS-D11's 18–30.)

---

## Section 5 — Progression Blueprint

- **Double Progression (Model 2)** on every exercise: a rep range is prescribed (compounds ~6–10, isolation ~10–15); load increases once the athlete hits the top of the range on all sets (PAS §7.1). "Failure" = failing to reach the range top, handled with the family's two-stage rule (Family Research Deliverable 3): one short session repeated; a second consecutive short session triggers a load reduction and restart.
- **Volume Accumulation (Model 4)** layered across the mesocycle: lower-body working sets per exercise rise across Weeks 1–8 (e.g., 3 → 4 → 5 on lower-body anchors), reset at the Week 9 deload, peak in Week 10. **Upper-maintenance sets do not accumulate** — they hold flat at ~4–6 all program, which is what keeps them in the maintenance zone while lower-body volume climbs.
- **RPE** permitted (PAS-D3, INTERMEDIATE) in `notes` to manage the rising lower-body fatigue.

Starting position: **mid-range** of PAS-D11 (Family Research Deliverable 4's INTERMEDIATE curve), accumulating toward the upper-middle by Week 8 — concentrated on the lower body.

---

## Section 6 — Volume Blueprint

- **Per session:** 5–8 exercises, 18–30 sets (PAS-D11). Lower-emphasis days carry the bulk; the two days with an upper-maintenance block still sit inside the per-session range because the upper block is short (~4–6 sets) and isolation-weighted.
- **Per week:** the Section 4 distribution — lower-body groups near the top of 10–20, upper-body below it, ~70–75% lower-body share.
- **Session duration:** within HYPERTROPHY's 50–80 min guideline (PAS §10.2); peak-week lower-emphasis days sit toward the upper end (expected; no deviation note required).
- **Guardrail check:** per-session counts sit inside PAS-D11 at both the opening and peak of the accumulation curve; per-muscle weekly counts honor §11.2 (lower-body inside the band, upper-body intentionally below it as maintenance). No written deviation justification required.

---

## Section 7 — Recovery Blueprint

- **Recovery comes from emphasis rotation, not split alternation.** Muscle Building Intermediate recovers lower-body tissue by alternating Upper/Lower days. Lower Body Intermediate has no upper days to alternate with, so recovery is engineered into the **sequencing of emphasis**: the quad-dominant day (D1) and the posterior-chain day (D2) load largely different tissue, the glute day (D3) shifts the primary stress to the hip extensors, and the mixed day (D4) is positioned to avoid stacking a second maximal quad or hinge exposure on a fatigued one. This rotation is a substantive content-design feature — it is the mechanism that makes four lower-dominant sessions/week recoverable, and it is impossible to obtain by deleting Muscle Building Intermediate's upper days.
- **Rest-day placement:** minimum one full rest day across four sessions (e.g., D1 / D2 / rest / D3 / D4 / rest / rest), with the rotation arranged so the two highest-axial-load days (squat-pattern, hinge-pattern) are not consecutive.
- **Intra-session rest:** INTERMEDIATE guidance (PAS §10.3) — 90–180s for compounds (recommended), 60–90s for isolation (optional); reference-only (EPA1-D2).
- **Deload:** Week 9 maintains all four sessions, cuts primary lower-body set volume 40–50% (PAS-D8). For the Lower Body Foundation graduate, this is their second coached deload — reinforcing, not introducing, the concept.

---

## Section 8 — Successor / Predecessor Logic

- **Predecessor — Lower Body Foundation (Sort 8).** Lower Body Intermediate inherits an athlete who can self-execute the squat/hinge/hip-thrust patterns and lower-body isolation pool, has completed one structural deload, and can tolerate concentrated lower-body volume at a beginner dose. The Intermediate jump is higher lower-body volume + RPE-regulated fatigue management, within the same Double Progression + Volume Accumulation models (Family Research Deliverable 8). The predecessor's 3-day frequency steps up to 4.
- **Successor — terminal.** Per `Program-Ecosystem-Architecture-v1.0.md` §3.2, an athlete graduating Lower Body Intermediate sees no "What's Next" section on W-3 (`successorProgramId` null). The roadmapped continuation **Lower Body Advanced** (§5) — "athletes graduating Lower Body Intermediate who want continued dedicated lower-body progression" — is not in the launch catalog; until it is added (a change that would require family-cap governance review under §2.2, the family already being at the 5-program cap), the athlete who wants to continue browses W-2 for an adjacent program. The link is left null rather than mis-pointed at a whole-physique program — the same discipline `Program-Ecosystem-Architecture-v1.0.md` §3.1 applies to one-successor-per-program.

This terminal status is itself part of the distinction from Muscle Building Intermediate, which is **non-terminal** (it feeds Muscle Building Advanced). The two Intermediates differ not only in body-region focus but in their place in the succession graph.

---

## Section 9 — Distinction from Muscle Building Intermediate (Convergence Test)

### The risk, stated honestly

Lower Body Intermediate and Muscle Building Intermediate share level (INTERMEDIATE), category (HYPERTROPHY), environment (GYM), duration (10 wk), frequency (4/wk), total workouts (40), goal alignment (BUILD_MUSCLE), progression model (Double Progression + Volume Accumulation), and an identical deload schedule (Week 9, slots 33–36, peak Week 10). On a metadata table they are indistinguishable — the exact profile that retired Powerbuilding Intermediate in the Strength family. The Muscle Building Intermediate Blueprint therefore refused to assert the distinction and instead set a three-part falsifiable test, reproduced and answered below.

### Explicit pass/fail against the three-part test

| # | Test | Verdict | Evidence (this Blueprint) |
|---|---|---|---|
| 1 | **≥65–70% of weekly working sets are lower body** | **PASS** | Section 4 distribution yields ≈70–75% lower-body share (lower ≈52–62 sets vs upper ≈8–12). Four lower-dominant sessions vs Muscle Building Intermediate's two general Lower days. |
| 2 | **Upper body reduced to maintenance only — below the 10–20 growth band** | **PASS** | Upper work is capped at ~4–6 sets/pattern/week (Section 4), held flat all program (Section 5, upper sets do not accumulate) — deliberately below the growth band. Muscle Building Intermediate runs two full Upper sessions inside the band. |
| 3 | **Not derivable by deleting Muscle Building Intermediate's two Upper days** | **PASS** | Deleting Muscle Building Intermediate's two Upper days yields **two undifferentiated** Lower sessions. Lower Body Intermediate is **four** sessions with **quad / posterior-chain / glute / mixed emphasis rotation** (Section 3) and a **rotation-based recovery model** (Section 7) that the two-day remainder cannot reproduce. The structure is engineered, not subtractive. |

### Why this resolves more cleanly than the retired Strength pair

Powerbuilding Intermediate's claimed differentiators reduced to catalog topology (ladder terminus) and a volume-composition argument that collapsed because its comparator already shared the trait. Lower Body Intermediate's differentiator is **demonstrated training content** — a ~70/30 body-region volume distribution and an emphasis-rotation structure, the very axis `Program-Ecosystem-Architecture-v1.0.md` §2.2 endorsed when it approved the Lower Body sub-ladder as "a distinct athlete goal … with different structural emphasis." The distinction is shown in authored structure, not asserted. The pair survives.

---

## Section 10 — Governance Verdict

**Verdict: APPROVE.**

**Strengths:** Lower Body Intermediate has a clear, self-standing identity — the lower-body specialization rung of the Muscle Building family — proven distinct from Muscle Building Intermediate on all three parts of the carry-forward convergence test. Its architecture (four lower-dominant sessions, emphasis rotation), volume distribution (~70/30 lower-dominant), progression (Double Progression + Volume Accumulation), and recovery model (rotation-based) all sit inside the locked standards (PAS-D7/D8/D11, §11.2) and inherit directly from the family research.

**Convergence risk: RESOLVED.** The family's named Muscle Building Intermediate ≈ Lower Body Intermediate risk is closed. Both Intermediates are now validated as genuinely distinct. **No remediation path (revise / reposition / merge / retire) is triggered** — unlike the Strength family's equivalent test, this one passes, because the differentiator is real training content rather than catalog topology.

**Scope guard — the Muscle Building family is NOT yet declared complete.** This verdict clears the two Intermediates and resolves the convergence risk. The family's Stage 1 sequence still has three outstanding Blueprints: **Muscle Building Foundation** (Sort 5), **Muscle Building Advanced** (Sort 7), and **Lower Body Foundation** (Sort 8). Architecture for the family is locked; Content Production (Stage 1) is partial; Implementation Readiness (Stage 2+) has not begun for any program in the family.

**Confidence:** High. The metadata convergence was the only serious threat to this program's justification, and it is closed with concrete structural evidence against an explicit, pre-registered test.

**Recommended next action:** author the remaining Muscle Building family Stage 1 Blueprints (Muscle Building Foundation, Muscle Building Advanced, Lower Body Foundation) before declaring the family's Stage 1 sequence complete and before any program proceeds to Stage 2 Authoring.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial Lower Body Intermediate Blueprint (Stage 1). Validates the program's lower-body-specialization structure and answers the three-part convergence test handed forward by `Muscle-Building-Intermediate-Blueprint-v1.0.md`. Verdict: APPROVE — all three test parts PASS (≈70/75% lower-body volume; upper at maintenance below the growth band; non-derivable four-day emphasis-rotation structure). Convergence risk RESOLVED; no remediation triggered. Family Stage 1 explicitly **not** declared complete (Foundation, Advanced, Lower Body Foundation Blueprints outstanding). Uses post-rename athlete-facing names per `Muscle-Building-Rename-Amendment-001.md`. Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Lower Body Intermediate Coaching Blueprint — v1.0*
*June 2026 — Stage 1 per `Program-Catalog-Production-Standard-v1.0.md` §7. Pending product-team review before LOCK.*
