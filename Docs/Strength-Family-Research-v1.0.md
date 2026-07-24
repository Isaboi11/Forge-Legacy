# Forge Legacy — Strength Family Research

## v1.1 | June 2026

**Status:** LOCKED (Updated post-retirement of Powerbuilding Intermediate; see Change Log.)
**Phase:** Stage 0A — Family Research (pre-Blueprint, pre-authoring)

**Authority Chain:**
- `Program-Catalog-Production-Standard-v1.0.md` §7 (defines Stage 0A — Family Research as the deliverable this document fulfills)
- `Program-Ecosystem-Architecture-v1.0.md` §2–3 (family structure, family cap governance, succession architecture)
- `Program-Authoring-Standard-v1.0.md` §7, §8, §10, §11.1, §13–14 (progression models, deload architecture, volume guardrails, STRENGTH category rules, locked catalog table)
- `O-2-Amendment-001-Athlete-Type-Declaration.md` (athlete type definitions — Strength vs. Bodybuilding vs. Hybrid)
- `Strength-Foundation-I-Blueprint-v1.0.md` (the only existing per-program Blueprint in the catalog; the single richest source of Strength-specific coaching philosophy, generalized here to the family)
- `FORGE_LEGACY_PRODUCT_DNA.md` (brand/voice constraints; not directly binding on this internal document but kept consistent with it)

**Scope:** This document establishes the reusable training philosophy that every program in the Strength family inherits. It produces the family-level guidance specified by `Program-Catalog-Production-Standard-v1.0.md` §7's Stage 0A: progression philosophy, volume philosophy, recovery philosophy, exercise pool/selection philosophy, and successor relationships — extended here with family identity, target athlete segmentation, and an explicit distinction test across the family's programs, per this document's brief.

**Not in scope:** No workouts are authored. No per-program Blueprints (Stage 1) are written. No exercises are selected or assigned. No schema, architecture, or catalog changes are made. No resolution of the open catalog-naming/positioning conflict described below.

---

## A Note on an Open Dependency

`Program-Catalog-Production-Standard-v1.0.md` §1 documents an unresolved conflict between the **locked** catalog and a newer, un-locked "current direction" that uses different Strength-family program names and counts and argues for an intermediate/advanced-first audience instead of the locked catalog's beginner-first positioning. This remains open for the family's four surviving programs (Strength Foundation I/II/III, Powerbuilding Foundation) and should be resolved before any further Stage 1 Blueprint work in this family.

**Update (Program Ecosystem Amendment 001):** the Stage 1 Blueprint sequence this document triggered (`Powerbuilding-Foundations-Blueprint-v1.0.md`, `Strength-Foundation-III-Blueprint-v1.0.md`, `Powerbuilding-Intermediate-Blueprint-v1.0.md`) found that Powerbuilding Intermediate did not clear this document's own governing rule against Strength Foundation II. Powerbuilding Intermediate has been retired from the catalog; Powerbuilding Foundation's successor is now Strength Foundation II directly. This roster (below) reflects that amendment.

---

## Inputs — The Locked Strength Family Roster

Per `Program-Ecosystem-Architecture-v1.0.md` §2.1 and §3.3, and `Program-Authoring-Standard-v1.0.md` §13:

| Program | Level | Wks | /Wk | Goal Alignment(s) | Progression Model(s) (PAS §7.1) | Deload (PAS §14) | Successor |
|---|---|---|---|---|---|---|---|
| Strength Foundation I | BEGINNER | 8 | 3 | BUILD_STRENGTH | Linear | 1 (Wk 7) | Strength Foundation II |
| Strength Foundation II | INTERMEDIATE | 10 | 4 | BUILD_STRENGTH, BUILD_MUSCLE | Double Progression | 1 (Wk 9) | Strength Foundation III |
| Strength Foundation III | ADVANCED | 12 | 4 | BUILD_STRENGTH | Double Progression (accessory) + Block Periodization (overall) | 2 (Wks 4, 11) | — (terminal) |
| Powerbuilding Foundation | BEGINNER | 10 | 4 | BUILD_STRENGTH, BUILD_MUSCLE | Linear | 1 (Wk 9) | Strength Foundation II |

**Note on a metadata discrepancy:** `Strength-Foundation-I-Blueprint-v1.0.md`'s own "Catalog Metadata (Locked)" table lists Strength Foundation I's goal alignments as `BUILD_STRENGTH, GENERAL_FITNESS` (two values), while `Program-Authoring-Standard-v1.0.md` §13 and its own §3.4 worked example both list `BUILD_STRENGTH` only (one value). This is a minor lock-vs-lock inconsistency between two already-locked documents, consistent with the documentation-lag pattern found elsewhere in this project. It is flagged here, not resolved — this document treats PAS §13 (the canonical import-time reference table) as authoritative for the family-level roster above.

All four programs are entirely `GYM` environment and entirely `STRENGTH` category. Powerbuilding Foundation is an alternate BEGINNER entry point into the single Strength Foundation ladder (Program Ecosystem Amendment 001) — an athlete who begins at Powerbuilding Foundation and an athlete who begins at Strength Foundation I converge at Strength Foundation II.

---

## Deliverable 1 — Family Identity

A Strength program trains compound barbell or dumbbell movements at high intensity, in pursuit of progressive overload toward maximal strength (`Program-Authoring-Standard-v1.0.md` §3.1). That single sentence is the family's entire identity test: every program in this family exists to make the athlete able to lift more weight, and every other quality a program has — its volume, its accessory work, its session count — is in service of that test, not a competing priority.

This is what separates Strength from its nearest sibling family, Hypertrophy. `O-2-Amendment-001-Athlete-Type-Declaration.md` draws this line at the athlete level: the Strength athlete's personal-best signal is **intensity** — the heaviest weight moved, at any rep count, on a primary compound lift. The Bodybuilding athlete's personal-best signal is **volume** — the highest total session load (sets × reps × weight). A Strength program can, and in Powerbuilding Foundation's case does, also build volume and muscle — but it never lets volume become the thing the program is *for*. The moment a program's primary measure of success becomes total work done rather than weight moved, it has left the Strength family's identity, regardless of which category it's tagged with.

`Strength-Foundation-I-Blueprint-v1.0.md` operationalizes this identity as two coaching principles that this document elevates from one program's design language to the whole family's design language:

- **Movement mastery before load.** Athletes who rush past technique in pursuit of numbers plateau early and lose confidence. Every program in this family — not just Foundation I — must protect technical competency on its core compounds before treating load advancement as the primary signal of progress, even at ADVANCED level where the athlete is assumed competent on arrival (`Program-Authoring-Standard-v1.0.md` §3.2's level definitions).
- **Consistency before optimization.** A session completed at modest volume every time is worth more than an ambitious session completed irregularly. This is why every program in the family, regardless of level, sits within or near the lower-to-middle range of its PAS-D11 volume guardrail rather than its ceiling (see Deliverable 4) — the family does not chase maximum theoretical stimulus at the cost of adherence.

The family's identity is not "barbell training" as a generic descriptor. It is **the deliberate, structured pursuit of more weight moved**, executed in a way that never asks the athlete to sacrifice movement quality or session adherence to get there.

---

## Deliverable 2 — Target Athlete Segments

Per `Program-Ecosystem-Architecture-v1.0.md` §2.1, the Strength family's primary athlete types are **Strength** and **Hybrid**. Bodybuilding athletes are not excluded from browsing or running these programs (Forge does not gate program access by declared athlete type), but the family is not designed around their personal-best signal.

The family offers two BEGINNER entry points into one ladder, segmenting this primary audience by initial goal pairing:

**Strength Foundation I** serves the athlete whose primary and singular goal is strength at entry — `BUILD_STRENGTH` only. This athlete is not asking the program to also build a physique, at least not yet (Strength Foundation II picks up a `BUILD_MUSCLE` co-alignment at the INTERMEDIATE rung regardless of entry point).

**Powerbuilding Foundation** serves the athlete who wants strength **and** muscle simultaneously, from day one — `BUILD_STRENGTH, BUILD_MUSCLE` at entry, with no single-goal on-ramp required. This is the athlete who would otherwise have to choose between the Strength family and the Hypertrophy family and wants both training effects from their very first program. Per Program Ecosystem Amendment 001, this athlete converges with the Strength Foundation I athlete at Strength Foundation II — the dual-goal preference shapes only which BEGINNER door they walk through, not a separate ladder they stay on.

**Shared constraints across the whole family**, generalized from `Strength-Foundation-I-Blueprint-v1.0.md`'s Excluded Athlete Profiles table:

| Constraint | Why it applies family-wide |
|---|---|
| Requires gym access: barbell, squat rack, bench, pulling apparatus | All four programs are `GYM` environment; the barbell squat or equivalent compound is structurally non-negotiable in every one |
| Not suitable for an injury preventing a bilateral barbell squat or hinge pattern | Every program's MAIN section requires a Squat or Hip Hinge pattern (`Program-Authoring-Standard-v1.0.md` §11.1) |
| Not designed for an athlete whose primary goal is metabolic conditioning or fat loss | That athlete is better served by the Conditioning family; a Strength program will not deliver the work-capacity stimulus they're seeking |

**Excluded-to-included handoff:** an athlete excluded from one program in this family because they're over- or under-qualified is, in almost every case, a fit for a sibling program in the same family rather than a different family entirely. An athlete excluded from Strength Foundation I for having 6+ months of consistent barbell history is a fit for Strength Foundation II. An athlete who specifically wants a dual-goal program from their very first session, rather than picking it up at the INTERMEDIATE rung, is a fit for Powerbuilding Foundation. This internal hand-off — two BEGINNER doors into one ladder — is the practical purpose of Powerbuilding Foundation's separate existence.

---

## Deliverable 3 — Progression Philosophy

The family's progression model is not uniform — it is **level-driven**, per `Program-Authoring-Standard-v1.0.md` §7.2's model-selection matrix, and the same level-to-model mapping applies regardless of which BEGINNER program an athlete entered through:

| Level | Model | Applies to (this family) |
|---|---|---|
| BEGINNER | Linear Progression (Model 1) | Strength Foundation I, Powerbuilding Foundation |
| INTERMEDIATE | Double Progression (Model 2) | Strength Foundation II |
| ADVANCED | Double Progression (accessory work) + Block Periodization (overall structure, Model 3) | Strength Foundation III |

A precise distinction worth stating explicitly: **Block Periodization appears exactly once in this family**, at Strength Foundation III — the family's only ADVANCED-level program. Because Powerbuilding Foundation now converges into Strength Foundation II (Program Ecosystem Amendment 001), an athlete who entered via Powerbuilding Foundation has the same eventual path to Block Periodization that an athlete entering via Strength Foundation I does. This was not true while Powerbuilding Intermediate existed as a separate terminal program — its progression ceiling was Double Progression with no route to Block Periodization at all. That dead end was one of the findings that led to its retirement.

Two coaching principles from `Strength-Foundation-I-Blueprint-v1.0.md`'s Progression Blueprint generalize cleanly to every rung in the family, regardless of model:

**Movement mastery gates load advancement, never the reverse.** At BEGINNER level (Linear Progression), this is explicit: load advancement may be withheld during the adaptation phase when movement quality is compromised, per the Blueprint's "judgment applied during exercise authoring" framing. At INTERMEDIATE and ADVANCED level (Double Progression / Block Periodization), the same principle holds in a different shape — an athlete does not advance within a rep range, or into the next periodized block, on technically compromised reps, even if the rep count was technically completed.

**Two-stage failure handling is the family default**, generalized from the Blueprint's specific increments: a single failed session at a given working load/rep target is repeated, not deloaded — one bad session does not indicate a true ceiling. A second consecutive failure at the same load triggers a defined reduction (10% per the Blueprint's BEGINNER-level precedent) and progression restarts from there. This protocol should carry into INTERMEDIATE and ADVANCED programming as the default failure-response philosophy, adapted to whatever the program's specific model requires (e.g., for Double Progression, "failure" is failing to reach the top of the prescribed rep range, not failing to complete a fixed rep target).

---

## Deliverable 4 — Volume Philosophy

`Program-Authoring-Standard-v1.0.md` §10.1 (PAS-D11) sets the family's volume envelope: 4–6 exercises and 15–25 sets in the MAIN section, with a minimum of 3 compound movements per session, at every level. Separately, §11.1's core-compound rule requires at least two of eight named lifts (Back Squat, Front Squat, Deadlift, Barbell Romanian Deadlift, Barbell Bench Press, Overhead Press, Barbell Row, Pull-Up) to appear in every MAIN section — a narrower, identity-anchoring rule distinct from the broader "3 compound movements" volume guardrail.

`Strength-Foundation-I-Blueprint-v1.0.md`'s Volume Blueprint establishes **minimum effective volume** as the family's governing principle, not just Foundation I's: the training stress required to produce adaptation in a beginner is far lower than the stress required in an intermediate or advanced athlete, so chasing the top of the PAS-D11 range is not the goal at any level — sitting at the *right* point in the range for the athlete's recoverable capacity is.

This produces a clear, level-driven volume curve across the family:

| Rung | Where it should sit in PAS-D11's 15–25 set range, and why |
|---|---|
| BEGINNER (Foundation I, Powerbuilding Foundation) | Lower end (≈14–18 working sets/session, per the SFI Blueprint precedent). Novel stimulus produces adaptation cheaply; low volume protects linear progression's recovery budget and protects session-length adherence. |
| INTERMEDIATE (Foundation II) | Middle of the range. Recoverable capacity has increased; the athlete is no longer purely novel-stimulus-responsive, so more volume is required to keep producing adaptation, but Double Progression's self-paced rep-range structure already absorbs some of that increased demand without requiring the program to max out sets. |
| ADVANCED (Foundation III only) | Upper-middle to upper end, concentrated in accessory work per the Double-Progression-for-accessories pairing — primary lift volume stays controlled by Block Periodization's phase structure rather than by raw set-count escalation. |

**Powerbuilding Foundation's volume profile is distinguished from Strength Foundation I's by composition, not just by total set count.** Both operate inside the same PAS-D11 envelope at BEGINNER level — but because Powerbuilding Foundation carries `BUILD_MUSCLE` as a co-primary goal from entry, a materially higher proportion of its MAIN-section sets should be accessory/isolation work rather than additional compound work, compared to Strength Foundation I. **This composition argument is scoped specifically to the BEGINNER-level comparison** (Powerbuilding Foundation vs. Strength Foundation I, where only one of the two carries `BUILD_MUSCLE`). It does not extend to an INTERMEDIATE-level comparison where both programs already share the `BUILD_MUSCLE` alignment — `Powerbuilding-Intermediate-Blueprint-v1.0.md` found this exact extension does not hold (Strength Foundation II already has the same license to run accessory-weighted volume that this paragraph grants Powerbuilding Foundation over Strength Foundation I), which is part of why Powerbuilding Intermediate was retired rather than retained on this reasoning.

---

## Deliverable 5 — Recovery Philosophy

Deload cadence in this family is **duration-driven, not level-driven** — `Program-Authoring-Standard-v1.0.md` §8.1 (PAS-D7) sets deload frequency purely off `durationWeeks`, and the family's own roster proves the point cleanly: Strength Foundation II (10 wks, INTERMEDIATE) and Powerbuilding Foundation (10 wks, BEGINNER) share an identical single-deload-at-Week-9 schedule despite differing by a full level. Recovery architecture in this family tracks program length, not athlete experience. (The retired Powerbuilding Intermediate shared an identical two-deload schedule with Strength Foundation III for the same duration-driven reason — that observation no longer applies to a live program, but it was one of the data points that first made this duration-driven pattern, and the eventual convergence-risk finding, visible.)

What *does* track level is how the athlete is expected to manage fatigue within that fixed deload cadence, generalizing `Strength-Foundation-I-Blueprint-v1.0.md`'s Recovery Blueprint:

- **BEGINNER:** recovery is structural and prescribed, not self-regulated. Rest periods are optional-but-typical (60–90s, per PAS §10.3), starting loads are deliberately sub-maximal to delay heavy-load fatigue, and the deload is the athlete's first exposure to the concept — coached, not assumed.
- **INTERMEDIATE/ADVANCED:** recovery becomes partly self-regulated. RPE notes become permitted in programming (PAS-D3 — STRENGTH at INTERMEDIATE/ADVANCED only), rest periods become recommended-to-required and longer (90–240s, per PAS §10.3), and the athlete is expected to read their own fatigue rather than rely solely on a fixed protocol.

The Blueprint's two structural-recovery findings generalize without modification across the family: minimum 1 full rest day between sessions at every level (`workoutsPerWeek` never implies consecutive training days), and deload weeks maintain training frequency while cutting primary-compound set volume 40–50% (PAS-D8) — the athlete keeps showing up during a deload, they just do meaningfully less work each time. This is true identically at Foundation I and at Foundation III; the deload mechanism does not get more aggressive as athletes advance, even though the surrounding load and self-regulation does.

---

## Deliverable 6 — Exercise Selection Philosophy

The family's exercise selection rules are set by `Program-Authoring-Standard-v1.0.md` §11.1 and apply identically to every program, since all are category `STRENGTH`:

- **Core compound list:** Back Squat, Front Squat, Deadlift, Barbell Romanian Deadlift, Barbell Bench Press, Overhead Press, Barbell Row, Pull-Up. At least two must appear in every MAIN section.
- **Exercise order:** primary compound first (highest neurological demand), secondary compound second, accessory work last. A session never opens with isolation or machine work.
- **Level-gated exclusions:** Olympic lifts (Clean & Jerk, Snatch) are excluded at BEGINNER in every program in this family — they require technical coaching a self-directed program cannot provide. No more than one machine isolation exercise per session at BEGINNER or INTERMEDIATE.
- **Pattern balance:** a Hip Hinge pattern cannot be absent for multiple consecutive sessions; identical prescription values week-over-week (no progression) fail QC-2 regardless of which program is being authored.

**Where Strength Foundation I and Powerbuilding Foundation diverge** is in accessory selection, following directly from Deliverable 4's volume-composition finding — and this divergence is scoped to the BEGINNER tier specifically, for the same reason Deliverable 4 now states explicitly. Strength Foundation I's accessory slots should be selected to directly support the primary compounds — assistance movements chosen because they improve the squat, hinge, press, or pull, not because they build the muscle in isolation. Powerbuilding Foundation's accessory slots have a second, equally valid justification available: an accessory exercise may be selected because it accumulates hypertrophy stimulus for a muscle group the compounds under-serve, even if it does no direct work to improve the primary lifts. Both still have to pass `Program-Authoring-Standard-v1.0.md` §15's QC-1 test ("for each exercise in the MAIN section, the reviewer should be able to state in one sentence why this exercise belongs here"), but the *sentence* that justifies a given accessory differs between these two BEGINNER programs specifically. **This divergence does not extend past the BEGINNER tier:** Strength Foundation II already carries the same `BUILD_MUSCLE` alignment, so it already has the same independent accessory-justification license — there is no equivalent divergence to draw between Strength Foundation II and what Powerbuilding Intermediate would have offered, which is part of why that program was retired rather than retained on this reasoning.

---

## Deliverable 7 — Distinction Between Programs

**Governing principle:** a program must not exist solely because it occupies a rung in a ladder. Each program must have a distinct athlete, progression profile, volume profile, or goal alignment that justifies its existence. This is the same test `Program-Ecosystem-Architecture-v1.0.md` §2.2 applies as a gate before a family is allowed to grow past 5 programs — this deliverable applies it retroactively and continuously, not only as a future-addition gate. **The table below already reflects the outcome of that continuous application**: Powerbuilding Intermediate was tested against this exact principle in `Powerbuilding-Intermediate-Blueprint-v1.0.md`, found wanting, and retired by Program Ecosystem Amendment 001 — it is omitted from the table rather than shown failing it, since it is no longer part of the catalog.

| Program | Athlete | Progression | Volume | Goal Alignment | What justifies it |
|---|---|---|---|---|---|
| Strength Foundation I | No barbell history, or 6+ month break | Linear | Low end of PAS-D11 | BUILD_STRENGTH | **Athlete + Progression.** Only program in the family for someone with zero recent barbell history; only program using pure Linear Progression at a 3-day/week frequency. |
| Strength Foundation II | Graduated SFI; competent on all 5 primary patterns | Double Progression | Mid-range | BUILD_STRENGTH, BUILD_MUSCLE | **Progression + Goal Alignment.** First program in the ladder to ask the athlete to self-manage a rep range rather than follow a fixed weight ladder; the only Foundation-ladder rung carrying a co-equal muscle alignment. |
| Strength Foundation III | Graduated SFII; understands periodization | Double Progression (accessory) + Block Periodization (overall) | Upper-middle, accessory-concentrated | BUILD_STRENGTH | **Progression.** The only program in the entire family using Block Periodization — a structurally distinct programming model, not a scaled-up version of SFII's. |
| Powerbuilding Foundation | Wants strength and muscle from day one; not served by a single-goal entry point | Linear | Low-to-mid, accessory-weighted | BUILD_STRENGTH, BUILD_MUSCLE | **Athlete + Goal Alignment.** Only BEGINNER-level program in the family carrying a dual goal alignment from entry, and the only BEGINNER program running 4 days/week instead of the family's usual 3. |

Two findings from this table are worth surfacing on their own:

**Powerbuilding Foundation is the family's one exception to "Foundation tier = 3 days/week."** `Program-Authoring-Standard-v1.0.md` §11.1's general STRENGTH guidance states Foundation-tier programs run 3 days/week, but the locked catalog runs Powerbuilding Foundation at 4 days even at BEGINNER level. This is justified, not an oversight: the dual goal alignment requires more weekly volume than a 3-day frequency can absorb without either compromising the compound work or under-serving the muscle-building goal. This is exactly the kind of fact this governing-principle test is meant to surface.

**Resolved finding (originally flagged here, now actioned):** this document's v1.0 had named Strength Foundation II and Powerbuilding Intermediate as the pair most at risk of failing this test, on the strength of two claimed differentiators — volume composition and ladder terminus. `Powerbuilding-Intermediate-Blueprint-v1.0.md`'s rigorous re-examination found both differentiators did not survive scrutiny (the volume-composition claim was already in tension with this document's own Deliverable 4 grouping the two programs at the same volume position; ladder terminus describes catalog topology, not training content) and recommended retirement as one of three remediation paths. Product Ecosystem Amendment 001 selected that path. The convergence risk this document originally flagged as a risk to monitor is the same risk that ultimately justified removing the at-risk program — the governing principle worked as intended.

---

## Deliverable 8 — Successor Relationships

Per `Program-Ecosystem-Architecture-v1.0.md` §3.1 and §3.3, every Forge program has at most one successor, successor links are directional, and the Strength family is now a single ladder with two BEGINNER entry points (Program Ecosystem Amendment 001):

```
Strength Foundation I       →  Strength Foundation II  →  Strength Foundation III  (terminal)
Powerbuilding Foundation    ↗
```

This is the literal resolution of the branching example `Program-Ecosystem-Architecture-v1.0.md` §3.1 originally cited as a hypothetical ("Powerbuilding Foundation could go to either Powerbuilding Intermediate or Strength Foundation II") — the schema still permits only one successor per program, so Powerbuilding Foundation does not branch; it simply points to Strength Foundation II directly, and the formerly-separate terminal rung it used to feed (Powerbuilding Intermediate) no longer exists.

Generalizing `Strength-Foundation-I-Blueprint-v1.0.md`'s Successor Readiness deliverable, every non-terminal program in this family owes its successor four things, regardless of which ladder it's in:

1. **Movement competency** sufficient that the successor does not need to teach a primary pattern from zero. The successor inherits an athlete who can self-execute setup and working sets without coaching intervention.
2. **Weight-selection independence.** The successor does not need to guide the athlete through starting-load selection; the predecessor's progression model (whichever one it used) already taught the athlete how to read their own working capacity.
3. **At least one completed structural deload**, so the successor's own deload(s) are not the athlete's first exposure to the concept.
4. **Readiness for the successor's specific progression-model jump** — this is the one item that is *not* generic, and differs by which rung is handing off:
   - Foundation I → II: readiness to move from a fixed weight ladder to self-managed rep ranges (Linear → Double Progression).
   - Foundation II → III: readiness to absorb periodized phase structure on top of an already-familiar Double Progression model for accessories (Double Progression → Double Progression + Block Periodization).
   - Powerbuilding Foundation → Strength Foundation II: identical to Foundation I → II's jump (Linear → Double Progression), since the model jump is a function of level, not of which BEGINNER program preceded it.

Strength Foundation III, as the family's only remaining terminal program, owes no successor handoff under this architecture. Per `Program-Ecosystem-Architecture-v1.0.md` §3.2, an athlete graduating it sees no "What's Next" section on W-3 — the family's offering to that athlete ends there until a future catalog expansion adds a rung above it, which would itself require family cap governance review under §2.2.

---

## Status: Strength Family Complete

All Stage 1 Blueprint work for this family is now complete: `Powerbuilding-Foundations-Blueprint-v1.0.md` (APPROVE), `Strength-Foundation-III-Blueprint-v1.0.md` (APPROVE, on a narrower basis), and `Powerbuilding-Intermediate-Blueprint-v1.0.md` (REVISE, leading to retirement via Program Ecosystem Amendment 001). The family's governing principle was tested against every internal pairing, including its hardest case, and the catalog now reflects the result: four programs, each independently justified, with no remaining unresolved convergence risk.

The open catalog-naming/positioning conflict (`Program-Catalog-Production-Standard-v1.0.md` §1) remains unresolved and still applies to the family's four surviving programs — it was never a blocker for the Blueprint sequence itself, per this document's original framing, but should be addressed before any further content production (Stage 2 Authoring) begins.

**Recommended next action:** apply this same Stage 0A → Stage 1 → governance-test sequence to the next program family (per the product owner's direction: Muscle Building/Hypertrophy family research next). The amended Strength family — its roster, its governing principle, and the fact that the principle was actually used to remove a program rather than rubber-stamp one — is the reference model for how that and future family research passes should be conducted.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.1 | June 2026 | Updated for Program Ecosystem Amendment 001 (Powerbuilding Intermediate Retirement). Removed Powerbuilding Intermediate from the roster (Inputs), the progression table (Deliverable 3), the volume table and composition argument — now correctly scoped to BEGINNER-only (Deliverable 4), the exercise-selection divergence — now correctly scoped to BEGINNER-only (Deliverable 6), the distinction table (Deliverable 7), and the succession chains (Deliverable 8). Resolved, rather than merely flagged, the Strength-Foundation-II/Powerbuilding-Intermediate convergence risk this document originally raised in v1.0 — the Blueprint sequence this document triggered found the risk was real and not resolvable on the original differentiating claims, leading to retirement. Marked the Strength family complete; redirected "Recommended Next Action" toward the next family. Status: DRAFT, pending product-team review. |
| v1.0 | June 2026 | Initial Strength Family Research document. Fulfills `Program-Catalog-Production-Standard-v1.0.md` §7 Stage 0A for the Strength family (both sub-ladders: Foundation I/II/III and Powerbuilding Foundation/Intermediate). Generalizes `Strength-Foundation-I-Blueprint-v1.0.md`'s per-program coaching philosophy to the family level. Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Strength Family Research — v1.1*
*June 2026*
*Stage 0A deliverable per `Program-Catalog-Production-Standard-v1.0.md` §7. Pending product-team review before LOCK. Strength family Stage 1 sequence complete; reference model for future family research passes.*
