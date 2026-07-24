# Forge Legacy — Running Family Research

## v1.0 | June 2026

**Status:** DRAFT — pending product-team review. Not yet LOCKED.
**Phase:** Stage 0A — Family Research (pre-Blueprint, pre-authoring). **Findings only** — no Stage 1 Blueprints are authored and no architecture is created.

**Authority Chain:**
- `Program-Catalog-Production-Standard-v1.0.md` §7 (defines Stage 0A — Family Research) and §1 (the open catalog naming/positioning conflict)
- `Program-Ecosystem-Architecture-v1.0.md` §2–3, §5 (family structure, family cap/floor governance, succession, locked catalog, roadmap)
- `Program-Authoring-Standard-v1.0.md` §7 (progression models), §9 / PAS-D9 (section requirements), §11.4 (RUNNING authoring), §13–14 (catalog table, deload schedule)
- `Program-Catalog-Architecture-v1.0.md` §3 (category + goal-alignment taxonomy)
- `Strength-Family-Research-v1.0.md` and `Muscle-Building-Family-Research-v1.0.md` (template and reference models — the two families already taken through this process)
- `FORGE_LEGACY_PRODUCT_DNA.md` (voice)
- Adjacent context, **not** a Stage 0A input: `Endurance-Multi-Activity-Architecture-Evaluation.md` (a strategic evaluation of the activity-*tracking* subsystem — logging/goals/rank/honors across endurance activities — a different layer from the program catalog)

**Scope:** Establishes the reusable family-level training philosophy for the Running family and reports Stage 0A governance findings: whether each program justifies its existence, whether the successor chain is meaningful, whether any convergence or retirement risk exists, and whether the family passes Stage 0A. Endurance is treated as a **fresh validation problem** — the distinctions that governed the Strength and Muscle Building families are not assumed to apply.

**Not in scope:** No workouts, no per-program Blueprints (Stage 1), no exercise/session authoring, no schema/architecture/catalog changes, no resolution of the catalog naming/positioning conflict.

---

## Inputs — The Locked Running Family Roster

Per `Program-Ecosystem-Architecture-v1.0.md` §5 (Sort 10–11) and `Program-Authoring-Standard-v1.0.md` §13–14, verified directly against both files:

| Sort | Program | Category | Level | Env | Wks | /Wk | Total | Goal Alignment(s) | Progression (PAS §7.2) | Deload (slots; peak) | Successor |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | Running Base I | RUNNING | BEGINNER | OUTDOOR | 8 | 4 | 32 | IMPROVE_RUNNING, IMPROVE_ENDURANCE | Block Periodization | Wk 7 (25–28); peak Wk 8 (29–32) | Running Base II |
| 11 | Running Base II | RUNNING | INTERMEDIATE | OUTDOOR | 10 | 5 | 50 | IMPROVE_RUNNING, IMPROVE_ENDURANCE | Block Periodization | Wk 9 (41–45); peak Wk 10 (46–50) | — (terminal) |

Both programs are category `RUNNING`, environment `OUTDOOR`, and carry **both** goal alignments (`IMPROVE_RUNNING, IMPROVE_ENDURANCE`). The family is at the **2-program minimum** (`Program-Ecosystem-Architecture-v1.0.md` §2.1: "A minimum of 2 programs; maximum of 5 before governance review") — the structural inverse of the Strength family's over-cap state. The succession chain (PEA §3.3) is a single linear ladder, Base I → Base II, with no branch.

**Roadmap (not in the launch catalog):** `Program-Ecosystem-Architecture-v1.0.md` §5 lists **Running Advanced** (ADVANCED, OUTDOOR — "athletes graduating Running Base II ready for structured threshold, tempo, and race-pace training") as a future candidate. It is **not** a launch program. This fact is load-bearing for Deliverable 8 and the governance findings below.

**Two structural facts that shape every deliverable (and distinguish this family from the resistance families):**

1. **Goal alignment is uniform** (`IMPROVE_RUNNING, IMPROVE_ENDURANCE` on both programs) — like Muscle Building's uniform `BUILD_MUSCLE`, it is **inert as a differentiator**. So is the progression *model*: both programs use Block Periodization (PAS §7.2 — RUNNING all levels). Distinction must therefore be carried by **level, frequency, volume/mileage, and duration**.
2. **Volume is not measured in sets.** `Program-Authoring-Standard-v1.0.md` §10.1 (PAS-D11) classifies RUNNING as "1–3 duration-based" — the set/exercise guardrails that governed the resistance families **do not apply**. Endurance volume is mileage/duration, governed by the **10%-per-week progression cap** (PAS §11.4). This is the single biggest "fresh validation" departure.

---

## Deliverable 1 — Family Identity

A Running program develops **aerobic base** — the capacity to run farther and more economically — through structured, progressive mileage (`Program-Authoring-Standard-v1.0.md` §11.4; `Program-Catalog-Architecture-v1.0.md` §3.1, category `RUNNING`: "Structured mileage, aerobic development, running economy"). The family's identity test is endurance-specific and the mirror of neither resistance family: success is measured by **sustained distance and duration at a controllable pace**, not by load moved (Strength) or by accumulated work-volume per muscle (Muscle Building).

This identity is operationalized by two `Program-Authoring-Standard-v1.0.md` §11.4 guards, elevated here to family design language:

- **Easy aerobic volume is the foundation, not filler.** §11.4 explicitly forbids "all sessions at high intensity — easy aerobic volume is essential." The bulk of every Running program is low-intensity running; intensity (tempo, eventually threshold) is the minority. A program that inverts that ratio has left the family's identity.
- **Progress is rate-limited by tissue adaptation, not by will.** The 10%-per-week mileage cap (§11.4) is the family's central design constraint — connective tissue and aerobic adaptation lag cardiovascular willingness, so the program's job is to *withhold* volume escalation as much as to prescribe it. This is the endurance analogue of the resistance families' "movement quality gates load," but enforced by a hard numeric rule rather than coaching judgment.

The family's identity is **the deliberate, injury-aware accumulation of aerobic base** — not racing, and not speed. (Race-specific preparation is explicitly absent from the launch family; see Deliverable 8 and Governance Findings.)

---

## Deliverable 2 — Target Athlete Segments

Per `Program-Ecosystem-Architecture-v1.0.md` §2.1, the family's athlete type is **Running**. Access is not gated by declared type (`Program-Catalog-Architecture-v1.0.md` §3.1), but the family is designed around the runner.

The family is a **single linear ladder** with two rungs — there is **no specialization branch** (unlike Muscle Building's general-vs-lower-body split). The segmentation is purely by experience:

- **Running Base I (BEGINNER):** the novice or returning runner — building the habit and the aerobic base, at 4 sessions/week, learning to hold an easy conversational pace and distinguish it from tempo effort.
- **Running Base II (INTERMEDIATE):** the runner who has a base and is ready for more frequency (5/week) and more weekly mileage, continuing aerobic development with a larger volume ceiling.

**Shared family constraints**, generalized in the spirit of the prior families' constraint tables:

| Constraint | Why it applies family-wide |
|---|---|
| Requires the ability to run outdoors (or equivalent) | Both programs are `OUTDOOR`; the modality is running, not a gym substitute |
| Not for an athlete whose goal is muscle or maximal strength | Goal alignment is `IMPROVE_RUNNING, IMPROVE_ENDURANCE`; the Strength and Muscle Building families serve those goals |
| Assumes no acute injury contraindicating progressive running volume | The 10%/week build and 4–5 weekly sessions presuppose a body that can absorb running impact |

**Excluded-to-included handoff:** a runner who has outgrown Base I is served by Base II. A runner who has outgrown Base II, however, has **no in-family destination at launch** — the natural next step (Running Advanced) is roadmap-only. This handoff gap is the family's defining coverage limitation (Deliverable 8, Governance Findings).

---

## Deliverable 3 — Progression Philosophy

The family's progression model is **uniform: Block Periodization (Model 3) at every level** (`Program-Authoring-Standard-v1.0.md` §7.1–7.2 — "RUNNING / CYCLING → Block Periodization"). Unlike the Strength family (where the model itself changed by level), the model is **not** a differentiator here; it is a constant the whole family shares.

What Block Periodization means for running (PAS §7.1): "structured mileage or duration increases with alternating easy and intensity weeks." Concretely, across both programs:

- Weekly mileage builds in blocks, with the **10%/week cap** (§11.4) bounding each increase.
- Easy and intensity weeks alternate so adaptation can consolidate — the program does not climb monotonically.
- A duration-driven deload (Deliverable 5) discharges accumulated load before the final block.

The level-driven differences sit **on top of** this shared model, not in the model itself: Base II starts from a higher mileage base, runs a fifth weekly session, and sustains its build over 10 weeks rather than 8. The progression *philosophy* is identical; the progression *magnitude* is what advances.

---

## Deliverable 4 — Volume Philosophy

This is the family's sharpest departure from the resistance families. `Program-Authoring-Standard-v1.0.md` §10.1 (PAS-D11) classifies RUNNING as **"1–3 duration-based"** — there is no set/exercise count to sit within a band. Volume is **weekly running distance/duration**, and the governing rule is the **10%-per-week cap** (§11.4): weekly total distance must not rise more than 10% week-over-week.

The family's volume curve is therefore expressed in mileage, not sets:

| Rung | Volume character |
|---|---|
| Base I (BEGINNER) | Lower starting weekly mileage; conservative 10%-bounded build over 8 weeks; the priority is consistency and tissue adaptation over reaching any particular distance. |
| Base II (INTERMEDIATE) | Higher starting mileage and a higher ceiling; a fifth weekly session adds volume; the 10%-bounded build runs over 10 weeks, reaching meaningfully more weekly distance than Base I. |

Two volume principles hold family-wide:

- **Most volume is easy.** Per §11.4, easy aerobic running dominates; tempo/long-run distance is the minority of weekly mileage at both levels.
- **Prescription is duration- or distance-typed, never set-typed.** `durationSeconds` for easy/recovery runs; `distanceValue`/`distanceUnit` for tempo and long runs (§11.4). This is a schema-level consequence of the volume model and must carry into any Stage 1 Blueprint.

---

## Deliverable 5 — Recovery Philosophy

Deload cadence is **duration-driven** (PAS-D7), consistent with every family: Base I (8 wks) takes one deload at Week 7; Base II (10 wks) takes one at Week 9. Recovery architecture tracks program length, not running experience.

What is endurance-specific is the **intra-week** recovery structure (PAS §11.4):

- **At least one easy or rest day between intensity sessions** — hard running is never run on consecutive days; the schedule is built around recovery between quality efforts.
- **The 10%/week cap is itself a recovery guardrail** — it exists to keep adaptation ahead of injury, making volume restraint a recovery mechanism unique to endurance (resistance families have no equivalent hard numeric ceiling).
- **Easy days are recovery, not junk** — easy aerobic volume both builds base and serves as active recovery between intensity.

Deloads maintain training frequency while cutting volume (PAS-D8 generalized to mileage): the runner keeps running through a deload week, at reduced distance, rather than stopping.

---

## Deliverable 6 — Modality / Session Selection Philosophy

The family's "exercise selection" is really **run-type selection**, governed by `Program-Authoring-Standard-v1.0.md` §11.4. Sessions are types, not exercise lists:

- **Easy / recovery runs** — duration-based (`durationSeconds`), conversational pace, the volume backbone.
- **Tempo runs** — distance-based (`distanceValue`/`distanceUnit`), "comfortably hard."
- **Long runs** — distance-based, the weekly endurance anchor.

Family-wide selection rules:

- **Pace is described, never schema-encoded as min/mile** (§11.4) — pace guidance lives in `notes` ("easy conversational pace…", "tempo pace…") because absolute pace doesn't account for individual fitness.
- **Both WARM_UP and COOL_DOWN are required** (PAS-D9) — a departure from the resistance families, where cooldown is optional. §11.4 specifies a **dynamic** warm-up (leg swings, hip circles, high knees) and **static stretching only in the cool-down**, never pre-run.
- **Selection emphasis advances by level, not by run type:** both programs use the same three run types; Base II simply carries more total mileage and a fifth session. There is no run type available to Base II that is withheld from Base I — the differentiation is volume/frequency, not modality.

---

## Deliverable 7 — Distinction Between Programs

**Governing principle (carried from the prior families):** a program must justify its existence by a distinct athlete, progression profile, volume profile, or goal alignment — not by occupying a rung. Applied here under the constraint that goal alignment *and* progression model are both uniform (inert), so the work falls to athlete level, frequency, volume, and duration.

| Program | Athlete | Frequency | Volume / Duration | What justifies it |
|---|---|---|---|---|
| Running Base I | Novice / returning runner | 4/wk | Lower mileage; 8 wks | **Athlete + Frequency + Volume.** The only beginner entry; the only 4-day program; the conservative base build. |
| Running Base II | Intermediate runner with an existing base | 5/wk | Higher mileage; 10 wks | **Athlete + Frequency + Volume + Duration.** Higher experience floor, an added weekly session, a higher mileage ceiling, and a longer build. |

**Explicit answers to the four convergence probes posed for this pass:**

1. **Separated only by race distance?** **No such pair exists.** Neither program is race-distance-specific — both are aerobic **base** programs. There is no "5K vs 10K" pair in the locked catalog; those names belong to the un-locked "current direction" (`Program-Catalog-Production-Standard-v1.0.md` §1), not the launch family. The headline endurance convergence worry is **moot for the locked family.**
2. **Separated only by duration?** **No.** Base I and Base II differ on level, frequency (4 vs 5), and volume (32 vs 50 total) as well as duration (8 vs 10 wks) — duration is one of several independent separators, not the only one.
3. **Separated only by weekly volume?** **No.** Same multi-axis answer.
4. **Weak or redundant successor links?** **No.** The single Base I → Base II link is a meaningful BEGINNER → INTERMEDIATE aerobic-base progression. Base II's terminal/null link is *correct catalog state* (you cannot point at a program that does not exist) — but "terminal" must not be read as "journey complete" (Deliverable 8).

The distinctions here are **training content (level, frequency, mileage, duration), not catalog topology.** No convergence risk exists between the only two programs in the family.

---

## Deliverable 8 — Successor Relationships

Per `Program-Ecosystem-Architecture-v1.0.md` §3.1 and §3.3, the family is a single linear ladder:

```
Running Base I  →  Running Base II  →  (no launch successor)
```

Generalizing the prior families' successor-readiness framing, Running Base I owes Running Base II: the established habit and aerobic base to sustain 5 weekly sessions; the ability to distinguish easy from tempo effort; tolerance for a higher 10%-bounded mileage build; and one completed deload. That handoff is sound.

**Running Base II is terminal by roadmap artifact, NOT by journey-completeness.** This distinction is a first-class finding, not a footnote:

- Base II's `successorProgramId` is correctly null **only because Running Advanced does not exist in the launch catalog** (PEA §5 lists it as a future candidate). The null link is correct catalog hygiene — there is nothing valid to point at.
- It does **not** mean the running athlete journey is complete. Base II is an **INTERMEDIATE aerobic-base** program. It is **not** a "race-prep endpoint," and it should never be cited as evidence that the family fully serves the runner. The runner who graduates Base II has **no in-family destination at launch**, and there is **no advanced rung and no race-preparation program anywhere in the locked catalog** — threshold, tempo-focused, and race-pace training (the content of the roadmapped Running Advanced) is entirely absent.

Per `Program-Ecosystem-Architecture-v1.0.md` §3.2, the graduating runner correctly sees no "What's Next" on W-3 — but that UI silence reflects an **unbuilt rung**, not a satisfied journey.

---

## Governance Findings & Stage 0A Verdict

**Two findings, deliberately kept separate, because they answer different questions:**

### Finding A — Per-program governance: **PASS**

Both programs that exist are individually justified and cleanly distinct (Deliverable 7). The single successor link is meaningful. There are **no convergence risks** (the only pair is multi-axis-differentiated and shares no race-distance/duration-only weakness) and **no retirement candidates** — structurally, there cannot be: the family sits at the 2-program *minimum* (PEA §2.1), so retiring either program would drop it below the family floor. This is the cleanest of the three families taken through Stage 0A: smallest, most clearly differentiated, with no specialization branch to stress-test and no topology-dependent distinctions.

This is a stronger-looking result than it is comprehensive — which is why Finding B is held separate.

### Finding B — Family coverage: **INCOMPLETE** (elevated finding)

The running athlete journey **ends at intermediate aerobic base.** There is no advanced rung and no race-preparation program in the locked catalog; the content that would serve an experienced runner (threshold, tempo emphasis, race-pace) lives only in the roadmapped, unbuilt Running Advanced. The Running family is the **least complete athlete journey of the three families studied** (Strength runs to ADVANCED + a powerbuilding entry; Muscle Building runs to ADVANCED across two ladders; Running stops at INTERMEDIATE base).

**This does not fail Stage 0A.** Stage 0A judges whether the *existing* programs are justified and distinct — they are. Coverage completeness is a **catalog-scope** question, not a per-program governance question, and the two are not the same test. But the product owner must see Finding B before any Stage 1 work, and **Running Base II's terminal flag must never be cited as evidence that the running journey is covered** — it is terminal by absence, not by sufficiency.

### Stage 0A Verdict

**The Running family PASSES Stage 0A.** Both programs are justified, the successor chain is meaningful, there is no convergence or retirement risk, and the family-level philosophy above is ready to anchor Stage 1 Blueprints for Running Base I and Running Base II. The endurance-specific governance process held: the distinctions are real, expressed in mileage/frequency/level rather than the resistance families' axes, and no resistance-family assumption was imported.

The **single most important thing to carry into any Stage 1 / catalog-planning decision** is Finding B: the family is governance-clean but journey-incomplete, and closing that gap (building Running Advanced) is a catalog-expansion decision for the product owner, separate from and subsequent to this Stage 0A pass.

---

## Status Layers

- **Architecture:** LOCKED and unchanged — PEA v1.4, PAS v1.3, PCA v1.4. This research creates and changes none of it. (Running Advanced would, if built, require a catalog-expansion amendment — flagged, not performed.)
- **Content Production:** Stage 0A (this document) complete for the Running family. No Stage 1 Blueprints authored.
- **Implementation Readiness:** Not begun. As with the other families, Stage 2 authoring of these two programs would depend on the relevant content being available; the broader multi-activity endurance vision (`Endurance-Multi-Activity-Architecture-Evaluation.md`) is a separate, more forward-looking layer and is not part of this family's Stage 0A.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial Running Family Stage 0A Research (findings only). Verified the 2-program locked roster (Running Base I/II) against PEA §5 and PAS §13–14. Established endurance-specific family philosophy (aerobic base; mileage/10%-cap volume; uniform Block Periodization; OUTDOOR run-type selection; both warm-up and cool-down required). Verdict: **PASS** — both programs justified, successor meaningful, no convergence risk, no retirement candidates (family at the 2-program minimum). Elevated **Finding B**: family coverage is INCOMPLETE — Base II is terminal by roadmap artifact (Running Advanced unbuilt), not journey-completeness; no advanced/race-prep rung exists in the locked catalog. The four convergence probes (race-distance / duration-only / volume-only / weak-successor) all return negative for the locked family. Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Running Family Research — v1.0*
*June 2026 — Stage 0A deliverable per `Program-Catalog-Production-Standard-v1.0.md` §7. Findings only. Pending product-team review before LOCK. Third family taken through Stage 0A, following Strength and Muscle Building.*
