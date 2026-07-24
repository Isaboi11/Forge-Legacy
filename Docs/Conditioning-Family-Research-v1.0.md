# Forge Legacy — Conditioning Family Research

## v1.0 | June 2026

**Status:** LOCKED
**Phase:** Stage 0A — Family Research (pre-Blueprint, pre-authoring). **Findings only** — no Stage 1 Blueprints, no architecture, no amendments, no catalog change.

**Authority Chain:**
- `Program-Catalog-Production-Standard-v1.0.md` §7 (Stage 0A definition), §1 (open naming/positioning conflict)
- `Program-Ecosystem-Architecture-v1.0.md` §2.1–2.2 (family/cap; the approved 6-program exception), §3.3 (succession), §5 / §5.4 (catalog, athlete-type coverage)
- `Program-Authoring-Standard-v1.0.md` §7.2 (progression by category/level), §11.3 (CONDITIONING authoring), §13–14 (catalog table, deload)
- `Program-Catalog-Architecture-v1.0.md` §3.1 (category), §3.4 (goal-alignment definitions)
- Lesson sources: `Program-Ecosystem-Amendment-001-Powerbuilding-Intermediate-Retirement.md` (the retirement anti-pattern), `Muscle-Building-Intermediate-Blueprint-v1.0.md` / `Lower-Body-Intermediate-Blueprint-v1.0.md` (validation patterns), `Program-Catalog-Governance-Review-v1.0.md` (the prioritization that triggered this pass)
- `Strength-Family-Research-v1.0.md`, `Muscle-Building-Family-Research-v1.0.md`, `Running-Family-Research-v1.0.md` (template / reference models)

**Scope:** Establishes the Conditioning family's reusable training philosophy and reports Stage 0A governance findings, with explicit pressure-testing of the three INTERMEDIATE programs the Cross-Family Governance Review flagged as the catalog's most likely convergence site.

**Not in scope:** No workouts, no Blueprints (Stage 1), no exercise/session authoring, no schema/architecture/catalog change, no amendment, no resolution of the naming/positioning conflict.

---

## Inputs — The Locked Conditioning Family Roster

Per `Program-Ecosystem-Architecture-v1.0.md` §5 (Sort 12–17) and `Program-Authoring-Standard-v1.0.md` §13–14, verified directly. The family is **six programs** — over the 5-program cap, an **approved governance exception** (PEA §2.2: "the 6 programs span 3 distinct sub-goals… with distinct goal alignments, environments, and athlete types"). It is **three independent sub-ladders**, each BEGINNER → INTERMEDIATE and terminal at INTERMEDIATE:

| Sort | Program | Level | Env | Wk/Day/Total | Goal Alignment(s) | Progression (PAS §7.2) | Deload (slots; peak) | Successor |
|---|---|---|---|---|---|---|---|---|
| 12 | Athletic Conditioning Foundation | BEGINNER | GYM | 8/3/24 | IMPROVE_CONDITIONING, GENERAL_FITNESS | Linear / Volume Accumulation | Wk7 (19–21); Wk8 (22–24) | Conditioning Intermediate |
| 14 | Conditioning Intermediate | INTERMEDIATE | GYM | 10/4/40 | IMPROVE_CONDITIONING | Double Progression | Wk9 (33–36); Wk10 (37–40) | — terminal |
| 13 | Body Recomposition Foundation | BEGINNER | GYM | 8/4/32 | LOSE_FAT, BUILD_MUSCLE | Linear / Volume Accumulation | Wk7 (25–28); Wk8 (29–32) | Body Recomposition Intermediate |
| 15 | Body Recomposition Intermediate | INTERMEDIATE | GYM | 10/4/40 | LOSE_FAT, BUILD_MUSCLE | Double Progression | Wk9 (33–36); Wk10 (37–40) | — terminal |
| 16 | Hybrid Foundation | BEGINNER | MIXED | 8/4/32 | BUILD_STRENGTH, IMPROVE_CONDITIONING | Linear / Volume Accumulation | Wk7 (25–28); Wk8 (29–32) | Hybrid Intermediate |
| 17 | Hybrid Intermediate | INTERMEDIATE | MIXED | 10/4/40 | BUILD_STRENGTH, IMPROVE_CONDITIONING | Double Progression | Wk9 (33–36); Wk10 (37–40) | — terminal |

Succession (PEA §3.3): three named ladders — **Conditioning** (Athletic Conditioning Foundation → Conditioning Intermediate), **Recomposition** (Body Recomposition Foundation → Intermediate), **Hybrid** (Hybrid Foundation → Intermediate). No roadmap successors exist for this family (unlike Running/Lower Body); each ladder is terminal at INTERMEDIATE by design.

**The structural fact that defines this family — and inverts the prior three:** goal alignment is the family's **primary, live differentiator**, distinct across every sub-ladder. This is the opposite of Muscle Building (uniform `BUILD_MUSCLE`) and Running (uniform goals) where goal alignment was *inert* and the work fell to body-region/frequency/volume. Here, goal alignment does the heavy lifting; the progression model is the inert axis (uniform by level per §7.2).

---

## Deliverable 1 — Family Identity

A Conditioning program develops **metabolic capacity and work output** by combining strength and cardio elements under controlled work-to-rest ratios (`Program-Catalog-Architecture-v1.0.md` §3.1: "Cardiovascular base, metabolic output, work capacity"; `Program-Authoring-Standard-v1.0.md` §11.3). Unlike the resistance families (whose identity is a single training effect — load, or accumulated volume) and unlike Running (a single modality), the Conditioning family is **deliberately multi-goal**: it is the catalog's home for training effects that blend energy-system work with resistance. Its identity test is therefore not a single success signal but a **shared methodology** (work-to-rest-governed combination training, PAS §11.3) expressed toward three distinct goals.

The §11.3 guards generalize to family design language: work-to-rest ratios are a primary prescription variable (`restSeconds` always populated); circuits are encoded explicitly in slot names; and complex barbell lifts that demand coaching a self-directed athlete lacks are avoided. The family's identity is **methodology-shared, goal-differentiated** — which is exactly why goal alignment, not topology, must carry program distinction here.

---

## Deliverable 2 — Target Athlete Segments

Per `Program-Ecosystem-Architecture-v1.0.md` §5.4, the family serves two athlete types, mapped by sub-ladder:

- **General athlete → the Conditioning ladder** (Athletic Conditioning Foundation → Conditioning Intermediate): the athlete building well-rounded work capacity and general fitness.
- **Hybrid athlete → the Recomposition and Hybrid ladders** (Body Recomposition F→I; Hybrid F→I): the athlete pursuing a blended goal — fat loss with muscle retention (Recomposition) or concurrent strength and conditioning (Hybrid).

Note that Recomposition and Hybrid share an athlete *type* (Hybrid) but are separated by **goal alignment** (`LOSE_FAT, BUILD_MUSCLE` vs `BUILD_STRENGTH, IMPROVE_CONDITIONING`) — so athlete type alone does not distinguish them; goal does (Deliverable 7).

**Shared family constraints:** gym (or, for Hybrid, mixed gym + outdoor/field) access; willingness to train at prescribed work-to-rest ratios; not the right home for an athlete whose single goal is maximal strength (Strength family), pure hypertrophy (Muscle Building family), or running (Running family). Each Conditioning sub-goal is itself the "better served by" destination for athletes mis-fit to those single-goal families.

---

## Deliverable 3 — Progression Philosophy

Progression is **level-driven and uniform across the family** (`Program-Authoring-Standard-v1.0.md` §7.2): CONDITIONING BEGINNER → Linear Progression *or* Volume Accumulation; CONDITIONING INTERMEDIATE → Double Progression. All three Foundations sit at the BEGINNER rule; all three Intermediates use Double Progression.

**Consequently, progression model is NOT a program differentiator in this family** — it is the inert axis (the role goal alignment played in Muscle Building/Running). The three Intermediates run the *same* progression model; what differs is the *target* that model is applied toward and the *content* it progresses (conditioning intervals vs recomposition resistance+metabolic work vs concurrent strength+conditioning). The two coaching principles carry over: movement quality gates progression, and a two-stage failure response is the default — but in this family the progressed variable is often work density / work-to-rest compression, not load alone (§11.3).

---

## Deliverable 4 — Volume Philosophy

Conditioning volume is governed by **work-to-rest structure, not set-count bands** (`Program-Authoring-Standard-v1.0.md` §11.3: work-to-rest ratios are a primary prescription variable; `restSeconds` always populated; circuits encoded in slot names). PAS-D11's CONDITIONING guardrail (4–8 exercises / 12–24 sets in MAIN) bounds the resistance side, but the defining volume lever is **session density** — how much work per unit rest.

The three sub-goals load this lever differently, which is the volume-side expression of their goal distinction:
- **Conditioning** (work capacity): volume is weighted toward energy-system work — intervals/circuits with progressively compressed rest.
- **Recomposition** (fat loss + muscle retention): volume is resistance-forward (to retain/build muscle) *plus* metabolic conditioning for caloric output — a heavier resistance share than pure conditioning.
- **Hybrid** (strength + conditioning): volume splits between genuine strength work and conditioning, in a MIXED environment.

This per-goal volume composition is what a Stage 1 Blueprint must make concrete (Deliverable 7).

---

## Deliverable 5 — Recovery Philosophy

Deload cadence is **duration-driven** (PAS-D7), consistent with every family: the 8-week Foundations take one deload at Week 7; the 10-week Intermediates take one at Week 9. The three Intermediates share an identical Wk9 (slots 33–36) deload — a metadata convergence that the goal/environment differences must overcome (Deliverable 7).

The family-specific recovery lever is **work-to-rest management**: `restSeconds` is always populated (PAS §11.3), and recovery within and across sessions is managed by the prescribed work:rest ratio rather than (as in resistance families) by inter-set rest alone. Deloads reduce work density (longer rest / lower volume) while maintaining frequency (PAS-D8 generalized). Athletic Conditioning Foundation's 3-day frequency (the family's only 3-day program) is itself a recovery-aware choice for the general beginner.

---

## Deliverable 6 — Modality / Session Selection Philosophy

Selection follows `Program-Authoring-Standard-v1.0.md` §11.3: sessions **alternate or combine strength and cardio elements**; circuits are indicated in the slot name (e.g., "Week 3 — AMRAP 20 Min Circuit"); circuit intent and between-round rest are encoded in `notes` / `restSeconds`. Complex barbell lifts requiring un-availabe coaching are avoided (CONDITIONING athletes may lack a strength background).

Selection emphasis is what separates the sub-ladders:
- **Conditioning:** energy-system-forward selection (intervals, metcons, machine/bodyweight circuits), GYM.
- **Recomposition:** resistance-forward selection with metabolic finishers, GYM.
- **Hybrid:** genuine strength lifts + conditioning blocks, MIXED environment (gym strength + outdoor/field conditioning).

The shared §11.3 template is the family's coherence; the selection *emphasis* is its differentiation.

---

## Deliverable 7 — Distinction Between Programs (the A-vs-B Pressure Test)

**Governing principle (carried from prior families):** each program must justify existence by a distinct athlete, progression profile, volume profile, or goal alignment — not by topology. The Cross-Family Review flagged this family as the most likely site of a Powerbuilding-Intermediate-style convergence. The three INTERMEDIATE programs are the test:

| INT program | Goal alignment | Env | Athlete | Training intent (PCA §3.4) |
|---|---|---|---|---|
| Conditioning Intermediate | IMPROVE_CONDITIONING | GYM | General | work capacity / anaerobic threshold |
| Body Recomposition Intermediate | LOSE_FAT, BUILD_MUSCLE | GYM | Hybrid | fat loss + muscle retention |
| Hybrid Intermediate | BUILD_STRENGTH, IMPROVE_CONDITIONING | MIXED | Hybrid | concurrent strength + conditioning |

They are metadata-twins (INT, 10wk, 4/wk, 40 total, identical Wk9 deload, same Double Progression model) on **everything except goal alignment and environment.**

**Verdict: (A) GENUINE training-content distinctions, not (B) catalog topology.** Each Intermediate carries a **distinct goal-alignment signature**, and per the §3.4 definitions those map to materially different training intents — pure work-capacity vs fat-loss-with-muscle-retention vs concurrent strength-and-conditioning. Hybrid Intermediate is further separated by a MIXED environment.

**The Powerbuilding-condition is ABSENT here — this is the key finding.** Powerbuilding Intermediate was retired because it *shared* goal alignment with Strength Foundation II (BUILD_STRENGTH+BUILD_MUSCLE on both), leaving only topology to distinguish them. In the Conditioning family, goal alignment is **distinct across all three Intermediates** — the exact lever that was missing in the retirement case is the family's primary differentiator. **The cross-family hypothesis (that this family mirrors the Powerbuilding conditions) is therefore largely falsified on inspection.** Prioritizing the investigation was correct (largest ungoverned family, 3 INT programs); the investigation's conclusion is that convergence risk is **lower than feared**, not higher.

**One residual convergence risk to hand Stage 1 — Conditioning Intermediate vs Body Recomposition Intermediate.** This is the closest pair: both GYM, metadata-identical, differing only in goal alignment. The goal difference is real *on paper*, but PAS §11.3 gives both the same structural template ("alternate or combine strength and cardio"). So the distinction is **load-bearing on goal alignment alone**, and the Stage 1 Blueprints must **demonstrate the authored content actually diverges**:
- Conditioning Intermediate → **work-capacity-forward** (intervals, metcons, threshold work; resistance serving conditioning).
- Body Recomposition Intermediate → **resistance-forward** (hypertrophy-style volume to retain muscle; conditioning serving caloric output / fat loss).

If both collapse into generic "GYM circuit training," they converge in practice despite distinct goals. This is the falsifiable test handed forward — the Muscle Building Intermediate pattern (prove distinction in structure, don't assert it). Hybrid Intermediate carries no comparable risk (MIXED environment + a strength goal make it structurally distinct from both).

**Foundation-level distinction** is cleaner: the three Foundations differ on goal alignment, environment (Hybrid = MIXED), and frequency (Athletic Conditioning Foundation is the only 3-day program — a recorded load-bearing axis, the Lower Body Foundation lesson). No Foundation convergence risk.

---

## Deliverable 8 — Successor Relationships

Per `Program-Ecosystem-Architecture-v1.0.md` §3.1 and §3.3, three independent linear ladders, each terminal at INTERMEDIATE with no roadmap successor:

```
Athletic Conditioning Foundation → Conditioning Intermediate        (terminal)
Body Recomposition Foundation    → Body Recomposition Intermediate  (terminal)
Hybrid Foundation                → Hybrid Intermediate              (terminal)
```

Each Foundation owes its Intermediate the standard handoff (movement competency, work-capacity tolerance at a beginner dose, one completed deload, readiness for the Linear/Volume-Accumulation → Double Progression model step). Unlike Running and Lower Body, **none of these terminals is "terminal-by-unbuilt-successor"** — there are no Conditioning-family programs on the §7.1 roadmap. These are **complete-by-design terminals** for their goals (the catalog does not assert that conditioning/recomposition/hybrid training requires an ADVANCED rung). This places the family in the "complete-by-design" bucket of the Cross-Family Review, not the "incomplete/journey-gap" bucket.

**Minor naming finding (flag, not fix):** the Conditioning ladder's rungs have **mismatched name prefixes** — *Athletic Conditioning* Foundation → *Conditioning* Intermediate — unlike the matched Body Recomposition F→I and Hybrid F→I. A minor athlete-clarity risk, plausibly part of the open naming/positioning conflict (Production Standard §1). Not a governance blocker.

---

## Governance Findings & Stage 0A Verdict

**Verdict: the Conditioning family PASSES Stage 0A.**

- **All six programs are justified.** Three sub-ladders, each anchored by a distinct goal-alignment signature and athlete-type fit; progression model uniform-by-level (inert) with goal alignment, environment, and (at Foundation) frequency carrying the distinction.
- **The convergence hypothesis is largely falsified.** Goal alignment — the lever absent in the Powerbuilding Intermediate retirement — is this family's *primary live differentiator*, distinct across all three Intermediates. The family is the catalog's **strongest goal-differentiated family**, the inverse of the retirement case. The Cross-Family Review was right to investigate first, wrong (on inspection) to suspect a mirror of the Powerbuilding conditions.
- **One residual convergence risk handed to Stage 1:** Conditioning Intermediate vs Body Recomposition Intermediate (both GYM, distinguished by goal alignment alone) must demonstrate divergent authored content (work-capacity-forward vs resistance-forward), via a falsifiable Stage-1 test — not a Stage 0A failure.
- **No retirement candidates.** No program rests on topology; the family is at an approved over-cap exception (PEA §2.2) precisely because its three sub-goals are distinct.
- **Minor findings:** the Athletic Conditioning → Conditioning naming asymmetry; the cross-family note that Body Recomposition shares BUILD_MUSCLE with the Muscle Building family but is distinguished by LOSE_FAT + CONDITIONING category (muscle *retention during fat loss*, not muscle building).

**Lessons applied:** the Powerbuilding-retirement anti-pattern (topology-only justification) is absent; the Muscle Building validation pattern (hand convergence forward as a falsifiable structural test) is applied to the one residual pair; the Lower Body Foundation lesson (record load-bearing single-axis distinctions) is applied to both the Conditioning-Int/Body-Recomp-Int goal-only distinction and the Athletic Conditioning Foundation 3-day frequency.

---

## Status Layers

- **Architecture:** LOCKED and unchanged by this research (PEA v1.4, PAS v1.3, PCA v1.4). The 6-program over-cap exception is reported as the already-approved state (PEA §2.2), not modified.
- **Content Production:** Stage 0A (this document) complete for the Conditioning family — the **fourth family** through Stage 0A. No Stage 1 Blueprints authored.
- **Implementation Readiness:** Not begun. Stage 2 remains gated (cross-family) on Exercise Library population and the pre-publish PAS-R1 audit.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial Conditioning Family Stage 0A Research (findings only). Verified the 6-program / 3-sub-ladder roster (PEA §5, PAS §13–14). Established methodology-shared, goal-differentiated family philosophy. **Verdict: PASS.** Pressure-tested the three INTERMEDIATE programs: distinctions are **(A) genuine training-content** (distinct goal-alignment signatures + environment), not (B) topology — the **Powerbuilding-retirement condition is absent** (goal alignment is the live differentiator here, not inert), so the cross-family convergence hypothesis is largely falsified. One residual risk handed to Stage 1: Conditioning Intermediate vs Body Recomposition Intermediate (both GYM, distinguished by goal alone) must demonstrate divergent authored content. Minor findings: Athletic Conditioning → Conditioning naming asymmetry; Body Recomposition's BUILD_MUSCLE overlap with the Muscle Building family (distinguished by LOSE_FAT + category). Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Conditioning Family Research — v1.0*
*June 2026 — Stage 0A deliverable per `Program-Catalog-Production-Standard-v1.0.md` §7. Findings only. Pending product-team review before LOCK. Fourth family through Stage 0A.*
