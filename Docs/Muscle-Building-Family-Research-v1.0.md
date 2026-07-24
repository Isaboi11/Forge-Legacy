# Forge Legacy — Muscle Building (Hypertrophy) Family Research

## v1.2 | June 2026

**Status:** LOCKED (Updated post-rename; see Change Log.)
**Phase:** Stage 0A — Family Research (pre-Blueprint, pre-authoring)

> **A note on this document's name.** This document was authored while the family was still labeled **Hypertrophy** in the locked catalog. **`Muscle-Building-Rename-Amendment-001.md` (LOCKED) has since renamed the family and its three general programs to "Muscle Building"** (display label + program names; the stored `HYPERTROPHY` category enum is retained). This document has been updated to the post-rename names: the family is **Muscle Building**, and the general ladder is **Muscle Building Foundation/Intermediate/Advanced**. The dual name is retained in the title only as a pointer for readers who knew the family by its former name. The companion `Muscle-Building-Rename-Scoping-Note-v1.0.md` records the analysis that drove the amendment.

**Authority Chain:**
- `Program-Catalog-Production-Standard-v1.0.md` §7 (defines Stage 0A — Family Research as the deliverable this document fulfills)
- `Program-Ecosystem-Architecture-v1.0.md` §2–3, §5 (family structure, family cap governance, succession architecture, locked catalog)
- `Program-Authoring-Standard-v1.0.md` §6–8, §10–11.2, §13–14 (category definition, progression models, deload architecture, volume guardrails, HYPERTROPHY category rules, locked catalog table, deload schedule)
- `Program-Catalog-Architecture-v1.0.md` §3.1 (category taxonomy — HYPERTROPHY training focus and primary athlete types)
- `O-2-Amendment-001-Athlete-Type-Declaration.md` (athlete type definitions — Bodybuilding vs. Strength, and their distinct personal-best signals)
- `Strength-Family-Research-v1.0.md` (the template and reference model for this document — the first family to complete the Stage 0A → Stage 1 → governance-test sequence)
- `FORGE_LEGACY_PRODUCT_DNA.md` (brand/voice constraints; not directly binding on this internal document but kept consistent with it)

**Scope:** This document establishes the reusable training philosophy that every program in the Muscle Building family inherits. It produces the family-level guidance specified by `Program-Catalog-Production-Standard-v1.0.md` §7's Stage 0A: progression philosophy, volume philosophy, recovery philosophy, exercise pool/selection philosophy, and successor relationships — extended, as the Strength family research was, with family identity, target athlete segmentation, and an explicit distinction test across the family's programs.

**Not in scope:** No workouts are authored. No per-program Blueprints (Stage 1) are written. No exercises are selected or assigned. No schema, architecture, or catalog changes are made. The catalog-naming/positioning conflict is described, not resolved. The rename is scoped in a companion note, not executed.

---

## A Note on an Open Dependency

`Program-Catalog-Production-Standard-v1.0.md` §1 documents an unresolved conflict between the **locked** catalog and a newer, un-locked "current direction" that uses different family names, counts, and program names for the same launch target. **This family was the conflict's sharpest case** — locked term "Hypertrophy" vs. current-direction term "Muscle Building" for the same five programs — and it has now been **resolved for this family** by `Muscle-Building-Rename-Amendment-001.md` (LOCKED), which adopted "Muscle Building" (layers 1–3; stored enum `HYPERTROPHY` retained). The broader conflict remains open for *other* families' names (e.g., the Strength family's four surviving programs), but no longer blocks Stage 1 Blueprint work in this family.

As with the Strength family, this research is deliberately decoupled from that question. Every philosophy below holds regardless of which name the family ultimately ships under, because the training content — not the label — is what Stage 0A defines.

---

## Inputs — The Locked Muscle Building Family Roster

Per `Program-Ecosystem-Architecture-v1.0.md` §5 (Sort 5–9), `Program-Authoring-Standard-v1.0.md` §13 (catalog table) and §14 (deload schedule):

| Program | Level | Wks | /Wk | Total | Goal Alignment(s) | Progression Model(s) (PAS §7.2) | Deload (PAS §14) | Successor |
|---|---|---|---|---|---|---|---|---|
| Muscle Building Foundation | BEGINNER | 8 | 4 | 32 | BUILD_MUSCLE | Double Progression + Volume Accumulation | 1 (Wk 7, slots 25–28) | Muscle Building Intermediate |
| Muscle Building Intermediate | INTERMEDIATE | 10 | 4 | 40 | BUILD_MUSCLE | Double Progression + Volume Accumulation | 1 (Wk 9, slots 33–36) | Muscle Building Advanced |
| Muscle Building Advanced | ADVANCED | 12 | 5 | 60 | BUILD_MUSCLE | Double Progression (within phases) + Block Periodization (overall) | 2 (Wks 4 & 10, slots 16–20 and 46–50) | — (terminal) |
| Lower Body Foundation | BEGINNER | 8 | 3 | 24 | BUILD_MUSCLE | Double Progression + Volume Accumulation | 1 (Wk 7, slots 19–21) | Lower Body Intermediate |
| Lower Body Intermediate | INTERMEDIATE | 10 | 4 | 40 | BUILD_MUSCLE | Double Progression + Volume Accumulation | 1 (Wk 9, slots 33–36) | — (terminal) |

All five programs are entirely `GYM` environment and entirely `HYPERTROPHY` category. The family is at the 5-program governance cap (`Program-Ecosystem-Architecture-v1.0.md` §2.2); the addition of the Lower Body sub-ladder alongside the general Muscle Building ladder was explicitly approved on the grounds that it "serve[s] a distinct athlete goal (lower body / glute development) with different structural emphasis and distinct naming." Any further addition requires governance review.

**Two structural facts about this roster shape every deliverable below, and distinguish this family sharply from the Strength family:**

1. **Goal alignment is `BUILD_MUSCLE` for all five programs — it is not a differentiator anywhere in this family.** The Strength family used goal alignment as a primary distinguishing lever (`BUILD_STRENGTH` alone vs. `BUILD_STRENGTH, BUILD_MUSCLE`). That lever does not exist here. Every distinction in this family must be carried by **athlete sub-segment, progression model, volume profile, or level** — never by goal alignment.

2. **The family is two parallel ladders, not one**, segmented by **body-region focus** — a *training-content* axis the Strength family did not have. The general Muscle Building ladder (Foundation → Intermediate → Advanced) trains the whole physique; the Lower Body ladder (Foundation → Intermediate) concentrates on lower-body and glute development. This axis is what does the distinguishing work that goal alignment did in Strength.

---

## Deliverable 1 — Family Identity

A Muscle Building program accumulates training volume at moderate-to-high intensity to build muscle through repeated stimulus (`Program-Authoring-Standard-v1.0.md` §6's category definition; `Program-Catalog-Architecture-v1.0.md` §3.1 — "Volume-driven, muscle growth, hypertrophic adaptation"). That is the family's entire identity test: every program in this family exists to **make muscle grow through accumulated work**, and every other quality a program has — its load, its intensity, its session count — is in service of producing recoverable training volume, not in service of moving a maximal weight.

This is the precise mirror image of the Strength family's identity, and `O-2-Amendment-001-Athlete-Type-Declaration.md` draws the line at the athlete level. The Strength athlete's personal-best signal is **intensity** — the heaviest weight moved on a primary compound lift. The Bodybuilding athlete's personal-best signal is **volume** — the highest total session load (sets × reps × weight). The Muscle Building family is designed around that volume signal. A Muscle Building program can, and does, use heavy compound work — but the moment its primary measure of success becomes the single heaviest weight moved rather than the total productive work accumulated, it has left this family's identity, regardless of which category it's tagged with.

`Program-Authoring-Standard-v1.0.md` §11.2 operationalizes this identity as guards that this document elevates from category-authoring rules to the family's design language:

- **Accumulation, never a peak.** §11.2 explicitly flags "insufficient volume in early weeks (BEGINNER needs accumulation, not a peak)" as a thing to avoid. Every program in this family is built to accumulate stimulus over its duration — this is why Volume Accumulation (Model 4) is layered into the progression of four of the five programs (Deliverable 3). The family does not front-load intensity; it builds work capacity.
- **Volume is the stimulus; load is one of its inputs.** §11.2 forbids "1RM-style heavy singles as the primary training stimulus (that is STRENGTH, not HYPERTROPHY)." Heavy compounds belong in this family — but as a way to load the target muscles through a full range under control, not as a test of maximal force. This is the single clearest behavioral line between this family and Strength.
- **Balanced stimulus.** §11.2 forbids "symmetric push/pull neglect (4 pushing exercises and 1 pulling exercise is unbalanced)." Because the goal is whole-muscle development (or, in the Lower Body ladder, whole-lower-body development), the family will not let one half of a movement pair starve.

The family's identity is not "bodybuilding" as a lifestyle descriptor. It is **the deliberate accumulation of training volume to grow muscle**, executed so that the stimulus is balanced across the targeted musculature and built up over time rather than peaked.

> **Methodology reconciliation note (v1.2):** The current Muscle Building family design language reflects the launch-catalog methodology. Future approved Blueprints may use other evidence-supported hypertrophy methodologies, including body-part splits, when justified through PAS deviation-note and Group C review.

---

## Deliverable 2 — Target Athlete Segments

Per `Program-Ecosystem-Architecture-v1.0.md` §2.1 and `Program-Catalog-Architecture-v1.0.md` §3.1, the Muscle Building family's primary athlete types are **Bodybuilding** and **Strength**. (Strength athletes appear as a secondary audience here for the same reason Bodybuilding athletes appear as secondary in the Strength family — the families are adjacent, and an athlete in a muscle-gaining phase of a strength-focused journey is well served by this family.) As everywhere in Forge, program access is not gated by declared athlete type (`Program-Catalog-Architecture-v1.0.md` §3.1 — "category is metadata for comprehension, not an access gate"); the family is simply *designed around* the Bodybuilding volume signal.

The family offers two BEGINNER entry points, but — unlike the Strength family's two BEGINNER doors, which converge into one ladder — these open onto **two separate ladders**, segmented by body-region goal:

**Muscle Building Foundation** serves the athlete whose goal is **whole-physique muscle development** — a balanced split (Push/Pull/Legs or Upper/Lower) training the entire body across the week. This is the default entry point into the family.

**Lower Body Foundation** serves the athlete whose primary training goal is **lower-body and glute development** specifically (`Program-Ecosystem-Architecture-v1.0.md` §2.2; §5 notes this is "goal-differentiated, not a distinct athlete type" — it serves Bodybuilding, Strength, and General athletes whose focus is the lower body). This athlete wants their weekly volume concentrated on the legs and glutes rather than distributed across the whole physique, from their very first program.

**Shared constraints across the whole family**, generalized in the spirit of the Strength family research's family-wide constraint table:

| Constraint | Why it applies family-wide |
|---|---|
| Requires gym access: barbells, dumbbells, cables, and machines | All five programs are `GYM` environment; cable and machine work is not optional flavor here — `Program-Authoring-Standard-v1.0.md` §11.2 explicitly treats it as appropriate and expected for hypertrophy, so the family assumes its availability |
| Not designed for an athlete whose primary goal is maximal strength | That athlete's personal-best signal is intensity, not volume — they are better served by the Strength family. A Muscle Building program will deliberately under-emphasize 1RM-style work (Deliverable 1) |
| Not designed for an athlete whose primary goal is fat loss or conditioning | That athlete is better served by the Conditioning family (including Body Recomposition, which carries `LOSE_FAT, BUILD_MUSCLE`); a Muscle Building program is not built around the metabolic/work-capacity stimulus they're seeking |

**Excluded-to-included handoff:** an athlete who is over- or under-qualified for one program in this family is, in almost every case, a fit for a sibling program *within the same family* — but, because this family is two ladders, the handoff respects body-region intent. An athlete who has outgrown Muscle Building Foundation is a fit for Muscle Building Intermediate; one who has outgrown Lower Body Foundation is a fit for Lower Body Intermediate. The choice between the two ladders is a goal choice (whole-physique vs. lower-body focus), not an experience-level choice — and it is the practical purpose of the Lower Body sub-ladder's separate existence.

---

## Deliverable 3 — Progression Philosophy

The family's progression model has a **constant** and a **level-driven layer**, per `Program-Authoring-Standard-v1.0.md` §7.2's model-selection matrix ("HYPERTROPHY all levels → Double Progression + Volume Accumulation"):

| Level | Model | Applies to (this family) |
|---|---|---|
| BEGINNER | Double Progression (Model 2) + Volume Accumulation (Model 4) | Muscle Building Foundation, Lower Body Foundation |
| INTERMEDIATE | Double Progression (Model 2) + Volume Accumulation (Model 4) | Muscle Building Intermediate, Lower Body Intermediate |
| ADVANCED | Double Progression (Model 2, within phases) + Block Periodization (Model 3, overall structure) | Muscle Building Advanced |

**Double Progression is the family constant.** Unlike the Strength family — where the progression model itself changed by level (Linear → Double → Block) and was a primary distinguishing lever — every program in *this* family runs Double Progression as its within-session load mechanism (`Program-Authoring-Standard-v1.0.md` §7.1 Model 2: prescribe a rep range and starting weight; the athlete adds weight once they reach the top of the range on all sets). This is appropriate for a volume-driven goal: it lets the athlete accumulate reps at a given load before advancing, which is exactly the stimulus muscle growth responds to.

**What changes by level is the second, layered model:**

- **BEGINNER and INTERMEDIATE** layer **Volume Accumulation** (Model 4) on top of Double Progression. Set counts per exercise rise across the program's mesocycle (e.g., 3 → 4 → 5 sets) before the deload, then reset. This is the family's primary expression of "accumulation, not a peak" (Deliverable 1) — the program literally adds work over time.
- **ADVANCED (Muscle Building Advanced only)** replaces the Volume Accumulation layer with **Block Periodization** (Model 3) as the overall structure — distinct accumulation / intensification / (re)alization-style phases with different rep schemes and volume targets per block — while still using Double Progression *within* each phase. **Block Periodization appears exactly once in this family**, at the family's only ADVANCED program. This is the direct analogue of the Strength family, where Block Periodization also appeared exactly once, at Strength Foundation III — and in both families it is the single clearest progression-level differentiator of the terminal advanced program.

Two coaching principles generalize from the Strength family research to every rung here, adapted to a volume goal:

**Movement quality gates volume advancement, never the reverse.** In Double Progression terms, an athlete does not advance to the top of a rep range — and does not earn the load increase that follows — on technically degraded reps. Adding a rep or a set that was only completed by abandoning form is not progress in a family whose entire stimulus is *quality* accumulated volume; it is just fatigue.

**Two-stage failure handling, adapted to Double Progression.** In this family, "failure" is failing to reach the top of the prescribed rep range, not failing a fixed rep target. A single session short of the range top is repeated at the same load — one bad session is not a true ceiling. A second consecutive session short of it triggers the defined load reduction and the range restarts. This is the same two-stage philosophy the Strength family used, reshaped for the rep-range structure this family runs at every level.

---

## Deliverable 4 — Volume Philosophy

`Program-Authoring-Standard-v1.0.md` §10.1 (PAS-D11) sets the family's volume envelope at **5–8 exercises and 18–30 sets in the MAIN section** — a higher ceiling than the Strength family's 15–25, reflecting that volume *is* the stimulus here rather than a supporting input. Separately, §11.2 sets the governing weekly target: **10–20 sets per muscle group per week, distributed across sessions** — never concentrating all of one muscle group's volume into a single session.

This produces a volume philosophy that is structurally different from the Strength family's in one key respect: **in this family, volume is not just a question of "where to sit in the PAS-D11 range" — it is a variable the program actively manipulates over time.** Volume Accumulation (Model 4) is the mechanism (Deliverable 3); the family's programs are *designed* to start lower in the range and build toward the top of it across each mesocycle. "Minimum effective volume" still governs the *starting* point — but the trajectory is deliberately upward, which is the opposite of the Strength family's "sit at the right point and hold it."

This produces a level-driven volume curve, expressed as both a starting position and a within-program trajectory:

| Rung | Where it sits in PAS-D11 (18–30 sets) and how it moves |
|---|---|
| BEGINNER (Muscle Building Foundation, Lower Body Foundation) | Starts at the low end; accumulates upward across the 8 weeks via Volume Accumulation. A beginner's recoverable volume is lower and a novel stimulus produces growth cheaply, so the program does not open near the ceiling — it earns its way up. |
| INTERMEDIATE (Muscle Building Intermediate, Lower Body Intermediate) | Starts mid-range; accumulates toward the upper-middle. Recoverable capacity has risen and more total volume is now required to keep producing growth, so both the starting point and the peak shift up relative to the BEGINNER rung. |
| ADVANCED (Muscle Building Advanced only) | Operates upper-middle to upper end, with volume *concentrated and varied by Block Periodization phase* rather than monotonically accumulated — the accumulation block runs high volume, the intensification block trades some volume for load. This is the family's only program where the upper end of PAS-D11 is routinely in play, consistent with §10.2's note that ADVANCED programs may approach or slightly exceed the duration upper bound due to higher set volumes. |

**The Lower Body programs are distinguished from the general Muscle Building programs by volume *distribution*, not volume *total*.** Both ladders operate inside the same PAS-D11 envelope and the same 10–20 sets/muscle/week rule. The difference is where that weekly volume lands: a general Muscle Building program distributes its weekly sets across the whole physique via a Push/Pull/Legs or Upper/Lower split, so each muscle group sits within the 10–20 band; a Lower Body program concentrates a far larger share of its total weekly sets onto the lower-body muscle groups (quads, hamstrings, glutes, calves), pushing those groups toward the top of the per-muscle band while the upper body is trained at a maintenance level or as a deliberate accessory. **This distribution difference is the family's central training-content distinction**, and it is the volume-side expression of the body-region axis introduced in the Inputs section.

---

## Deliverable 5 — Recovery Philosophy

Deload cadence in this family is **duration-driven, not level-driven** — `Program-Authoring-Standard-v1.0.md` §8.1 (PAS-D7) sets deload frequency purely off `durationWeeks`, and this family's roster proves the point as cleanly as the Strength family's did: **Muscle Building Intermediate (10 wks) and Lower Body Intermediate (10 wks) share an identical single-deload-at-Week-9 schedule (slots 33–36), and they are at the same level** — but so do the two 10-week programs that differ; the determinant is length. The 8-week Foundations take one deload at Week 7; the 12-week Muscle Building Advanced takes two (Weeks 4 and 10) per PAS-D7's 11–14-week rule. Recovery *architecture* tracks program length, full stop.

What *does* track level is how the athlete manages fatigue within that fixed cadence, generalizing the Strength family's recovery philosophy onto a volume-driven family:

- **BEGINNER:** recovery is structural and prescribed. Rest periods are optional-but-typical and athlete-self-regulated (`Program-Authoring-Standard-v1.0.md` §10.3 — 60–90s typical for compounds at BEGINNER, accessory rest omitted), starting volume is deliberately sub-maximal (Deliverable 4), and the single deload is the athlete's first coached exposure to the concept.
- **INTERMEDIATE / ADVANCED:** recovery becomes partly self-regulated. RPE notes become permitted in programming (PAS-D3 — HYPERTROPHY at INTERMEDIATE/ADVANCED only, never BEGINNER), rest periods become recommended-to-required and longer (§10.3 — 90–180s for compounds at INTERMEDIATE, 120–240s required for primary compounds at ADVANCED), and the athlete is expected to read accumulated fatigue rather than rely solely on the fixed protocol. This matters more in a volume-driven family than in a strength one: the deliberately rising set counts of Volume Accumulation mean fatigue management *is* the program's central recovery challenge, not an afterthought.

Two structural-recovery findings generalize without modification across the family: a minimum of one full rest day between sessions at every level (`workoutsPerWeek` never implies consecutive training days — notable here because Muscle Building Advanced runs 5 days/week, the family's and one of the catalog's highest frequencies, making rest-day placement a real authoring constraint at Stage 1), and deload weeks maintain training frequency while cutting primary set volume 40–50% (PAS-D8) — the athlete keeps showing up during a deload and does meaningfully less work. The deload mechanism does not get more aggressive as athletes advance; the surrounding volume and self-regulation does.

---

## Deliverable 6 — Exercise Selection Philosophy

The family's exercise selection rules are set by `Program-Authoring-Standard-v1.0.md` §11.2 and apply to every program, since all are category `HYPERTROPHY`:

- **Exercise order:** compound movements first (Barbell Bench Press, Barbell Row, Squat variations, Barbell Romanian Deadlift), isolation work last (dumbbell fly, leg curl, lateral raise). A session never opens with isolation work.
- **Cables and machines are appropriate and expected** — §11.2 states plainly "do not avoid them." **This is a genuine, statable difference from the Strength family**, whose §11.1 selection rules are anchored to a named list of eight barbell core compounds and cap machine isolation work. This family has **no core-compound minimum** — there is no "at least two of eight named lifts per session" rule here. The selection logic is driven by *which muscles get stimulated and how much*, not by the presence of specific barbell lifts. An author justifying a hypertrophy exercise answers "what does this grow, and does the week's plan need more of that stimulus?" — not "which of the core compounds is this?"
- **Split structure:** Push/Pull/Legs or Upper/Lower (§11.2), distributing the week's volume so no muscle group's sets concentrate into a single session (the §11.2 distribution rule, restated from Deliverable 4).
- **Balance:** symmetric push/pull neglect fails the category guidance (§11.2); identical prescription values week-over-week (no progression) fail QC-2 (`Program-Authoring-Standard-v1.0.md` §15) regardless of which program is being authored — and in this family "progression" most often means a rising set count (Volume Accumulation) or an advanced rep-range target (Double Progression), not a heavier absolute load every week.

**Where the two ladders diverge is in selection emphasis, following directly from Deliverable 4's volume-distribution finding.** A general Muscle Building program selects across the whole physique — its leg day, push day, and pull day each draw from their region's compound-and-isolation pool to keep every muscle group inside the 10–20 sets/week band. A Lower Body program's selection skews heavily to the squat, hinge, lunge, and glute-bridge/hip-thrust patterns plus lower-body isolation (leg extension, leg curl, calf work, hip abduction), with upper-body selection reduced to a maintenance allotment. Both still pass §15's QC-1 test ("for each exercise in the MAIN section, the reviewer should be able to state in one sentence why this exercise belongs here") — but the *sentence* differs: in a general program it cites whole-physique balance; in a Lower Body program it cites lower-body/glute development specifically. This selection divergence is the exercise-side expression of the body-region axis, and it runs through **both rungs of the Lower Body ladder**, not just its BEGINNER tier — unlike the Strength family's accessory-justification divergence, which was scoped to BEGINNER only because its upper rungs shared a goal alignment. Here, because the body-region axis is independent of goal alignment (all five share `BUILD_MUSCLE`), the divergence does not collapse at the INTERMEDIATE rung.

---

## Deliverable 7 — Distinction Between Programs

**Governing principle (carried verbatim from the Strength family research, where the user established it as a durable, continuous test):** a program must not exist solely because it occupies a rung in a ladder. Each program must have a distinct athlete, progression profile, volume profile, or goal alignment that justifies its existence. This is the same test `Program-Ecosystem-Architecture-v1.0.md` §2.2 applies as a gate before a family grows past 5 programs — applied here continuously, not only as a future-addition gate.

**This family applies the test under a harder constraint than the Strength family did:** goal alignment is `BUILD_MUSCLE` for all five programs, so it can never be the justifying axis. Three of the four available axes — athlete, progression, volume — plus level must carry every distinction.

| Program | Athlete | Progression | Volume | What justifies it |
|---|---|---|---|---|
| Muscle Building Foundation | Whole-physique focus; no recent structured hypertrophy training | Double Progression + Volume Accumulation, BEGINNER increments | Low-end start, accumulating; distributed whole-body | **Athlete + Volume.** The family's default entry point; the only whole-physique program built for a beginner's recoverable volume. |
| Muscle Building Intermediate | Graduated Muscle Building Foundation; whole-physique focus | Double Progression + Volume Accumulation, INTERMEDIATE increments | Mid-range start, accumulating higher; distributed whole-body | **Volume + Level.** Higher recoverable volume and RPE-regulated fatigue management distinguish it from Foundation; whole-physique distribution distinguishes it from Lower Body Intermediate (see finding below). |
| Muscle Building Advanced | Graduated Muscle Building Intermediate; understands periodization | Double Progression **+ Block Periodization** | Upper-middle to upper end, phase-varied; 5 days/week | **Progression + Volume.** The only program in the family using Block Periodization and the only one at 5 days/week — a structurally distinct model, the clean analogue of Strength Foundation III. |
| Lower Body Foundation | Lower-body / glute development focus; beginner | Double Progression + Volume Accumulation, BEGINNER increments | Concentrated on lower body; 3 days/week | **Athlete + Volume distribution.** The only BEGINNER program concentrating volume on the lower body, and the family's only 3-day/week program. |
| Lower Body Intermediate | Graduated Lower Body Foundation; lower-body / glute focus | Double Progression + Volume Accumulation, INTERMEDIATE increments | Concentrated on lower body, accumulating higher; 4 days/week | **Athlete + Volume distribution.** The continuation of the lower-body ladder; distinguished from Muscle Building Intermediate by body-region focus (see finding below). |

Three findings from this table are worth surfacing on their own:

**Lower Body Foundation is the family's one exception to "Foundation tier = 4 days/week."** Every other program runs 4 days (or 5, at Advanced); Lower Body Foundation runs 3. This is justified, not an oversight: a concentrated lower-body program does not need — and a beginner's lower body cannot recover from — four lower-body-heavy sessions a week. The reduced frequency is itself part of what the program *is*. This is exactly the kind of fact the governing-principle test is meant to surface (and it mirrors the Strength family's finding that Powerbuilding Foundation was its one 4-day BEGINNER exception, in the opposite direction).

**Named convergence risk for the Stage 1 sequence — Muscle Building Intermediate vs. Lower Body Intermediate.** These two programs are the family's hardest distinction case, and the direct analogue of the Strength family's Strength Foundation II ≈ Powerbuilding Intermediate risk. They are **identical on every locked metadata axis**: both INTERMEDIATE, 10 weeks, 4 days/week, 40 total workouts, `BUILD_MUSCLE`, Double Progression + Volume Accumulation, one deload at Week 9 (slots 33–36), peak Week 10. The *only* locked differences are **body-region focus** and **successor status** (Muscle Building Intermediate → Muscle Building Advanced; Lower Body Intermediate is terminal).

**Preliminary view — likely survives, but must be proven in Stage 1, not assumed here.** The Strength family taught a hard lesson: do not assume a distinguishing argument holds just because a similar one worked elsewhere; the Stage 1 Blueprint is where the claim gets pressure-tested, and Powerbuilding Intermediate's apparent distinction did not survive that test. Applying that discipline: this pair *appears* to clear the governing principle where Powerbuilding Intermediate did not, because its differentiator is a genuine **training-content axis** — body-region muscle-group volume distribution (Deliverable 4) and exercise-selection emphasis (Deliverable 6) — that is already explicitly endorsed by `Program-Ecosystem-Architecture-v1.0.md` §2.2 as a "distinct athlete goal … with different structural emphasis." That is materially stronger than Powerbuilding Intermediate's differentiators, which reduced to catalog topology (ladder terminus) and a volume-composition claim that collapsed under scrutiny. **But the body-region distinction is asserted at the family level here; it must be demonstrated in actual authored structure at Stage 1** — specifically, the Lower Body Intermediate Blueprint must show a session structure, weekly volume distribution, and exercise pool that a reviewer can see are not simply Muscle Building Intermediate with the upper-body days deleted. If the Stage 1 Blueprint cannot demonstrate that, this pair should be re-examined under the same three remediation paths the Strength family used (add a real differentiator; formally document the body-region split as the accepted rationale; or retire and redirect). This is flagged, not resolved — exactly as the Strength research flagged its convergence risk in v1.0 before the Blueprint sequence resolved it.

**Muscle Building Foundation vs. Lower Body Foundation is the easy case, and a useful contrast to the Strength family's two BEGINNER doors.** Both are BEGINNER, 8 weeks, `BUILD_MUSCLE`, same progression models — but they differ on frequency (4 vs. 3 days/week), total volume (32 vs. 24 workouts), and body-region focus, and critically they **feed separate ladders** (Muscle Building Foundation → Muscle Building Intermediate; Lower Body Foundation → Lower Body Intermediate). This is the opposite of the Strength family's Strength Foundation I and Powerbuilding Foundation, which were two doors that *converged* into one ladder. Here the two BEGINNER doors stay separate all the way up, because the body-region goal that separates them is a durable preference, not a starting-condition that resolves at the next rung.

---

## Deliverable 8 — Successor Relationships

Per `Program-Ecosystem-Architecture-v1.0.md` §3.1 and §3.3, every Forge program has at most one successor, successor links are directional, and the Muscle Building family is **two parallel ladders** with no cross-links between them:

```
Muscle Building Foundation  →  Muscle Building Intermediate  →  Muscle Building Advanced   (terminal)
Lower Body Foundation    →  Lower Body Intermediate    (terminal)
```

This two-ladder shape is itself a product decision worth stating: an athlete graduating Lower Body Intermediate is *not* auto-routed into the general Muscle Building ladder, even though Muscle Building Advanced sits above it in experience terms. `Program-Ecosystem-Architecture-v1.0.md` §5's roadmap names a future "Lower Body Advanced" as the natural continuation for that athlete — until it exists, Lower Body Intermediate is terminal, and the athlete who wants to continue browses W-2 (the architecture permits exactly one locked successor, and the most logical one for a lower-body-focused athlete is a lower-body-focused continuation that is not yet in the catalog, so the link is left null rather than mis-pointed at a whole-physique program).

Generalizing the Strength family's Successor Readiness framework, every non-terminal program in this family owes its successor four things:

1. **Movement competency** sufficient that the successor does not teach a pattern from zero — the successor inherits an athlete who can self-execute its compound and isolation work without coaching intervention.
2. **Volume tolerance.** The successor starts higher in the PAS-D11 range and accumulates further (Deliverable 4); the predecessor must have built the recoverable work capacity the successor assumes. This is the volume-family analogue of the Strength family's "weight-selection independence" — here the inherited competency is *managing accumulated volume*, not selecting load.
3. **At least one completed structural deload**, so the successor's own deload(s) are not the athlete's first exposure to the concept.
4. **Readiness for the successor's specific progression jump** — the one non-generic item, which differs by which rung is handing off:
   - Muscle Building Foundation → Intermediate: readiness for higher accumulated volume and the introduction of RPE-regulated fatigue management (PAS-D3), within the same Double Progression + Volume Accumulation model.
   - Muscle Building Intermediate → Advanced: readiness to absorb **Block Periodization** phase structure on top of the already-familiar Double Progression model, and to step up from 4 to 5 training days/week. This is the family's only genuine *model* jump, and the analogue of Strength Foundation II → III.
   - Lower Body Foundation → Intermediate: readiness for higher accumulated lower-body volume and a step from 3 to 4 days/week, within the same models.

Muscle Building Advanced and Lower Body Intermediate are the family's two terminal programs. Per `Program-Ecosystem-Architecture-v1.0.md` §3.2, an athlete graduating either sees no "What's Next" section on W-3 — the family's offering to that athlete ends there until a future catalog expansion (e.g., the roadmapped Lower Body Advanced) adds a rung above them, which would itself require family-cap governance review under §2.2 since the family is already at the cap.

---

## Status: Muscle Building Family Research Complete (Stage 0A)

This document fulfills `Program-Catalog-Production-Standard-v1.0.md` §7's Stage 0A for the Muscle Building (Hypertrophy) family, across both ladders. It is the second family to complete Stage 0A, following the Strength family, and was authored using `Strength-Family-Research-v1.0.md` as its template and reference model.

**The family's distinguishing structure, stated once for the Stage 1 sequence to build on:** goal alignment is uniform (`BUILD_MUSCLE`) and therefore inert as a differentiator; the family's distinctions are carried by progression model (Block Periodization at Advanced only), volume (level-driven accumulation), frequency (the 3-day Lower Body Foundation and 5-day Muscle Building Advanced exceptions), and above all **body-region focus** (whole-physique vs. lower-body), which is the training-content axis that replaces the goal-alignment lever the Strength family relied on.

**Recommended next action:** run the Stage 1 Blueprint sequence for this family. Per the Strength family's process lesson, author the Blueprints in an order that pressure-tests the family's named convergence risk first — i.e., author **Muscle Building Intermediate and Lower Body Intermediate** early enough that the Muscle Building Intermediate vs. Lower Body Intermediate distinction (Deliverable 7) is proven in real authored structure, not assumed, before the family is declared complete. If that pair cannot demonstrate a real body-region distinction in its Blueprints, apply the §2.2 / governing-principle remediation paths.

**Open dependencies carried forward:**
- The catalog naming/positioning conflict (`Program-Catalog-Production-Standard-v1.0.md` §1) — in this family, the literal "Hypertrophy" vs. "Muscle Building" question — has been **resolved for this family** by `Muscle-Building-Rename-Amendment-001.md` (LOCKED, "Muscle Building" adopted). The broader cross-family naming/positioning conflict (other families, and the beginner-vs-intermediate-first audience question) remains open but does not block this family's Stage 1 Blueprints.
- The Strength family's still-open same conflict for its four surviving programs — unchanged by this document.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.2 | June 2026 | PAS-Amendment-002 (Methodology Pluralism) reconciliation. Added a reconciliation note beneath Deliverable 1 clarifying that the family's stated design language reflects the launch-catalog methodology specifically, and that future Blueprints may use other evidence-supported hypertrophy methodologies (including body-part splits) via the PAS's deviation-note/Group C review path. No deliverable analysis, roster, or distinction argument changed. Status: LOCKED. |
| v1.1 | June 2026 | Updated for `Muscle-Building-Rename-Amendment-001.md` (LOCKED). Renamed the three general programs to Muscle Building Foundation/Intermediate/Advanced and the family to "Muscle Building" throughout; updated the title note, the Open Dependency section, and the Status section to record that the naming conflict is now resolved for this family. Stored enum `HYPERTROPHY` retained. No deliverable analysis changed. Status: DRAFT. |
| v1.0 | June 2026 | Initial Muscle Building (Hypertrophy) Family Research. Fulfills `Program-Catalog-Production-Standard-v1.0.md` §7 Stage 0A for the Hypertrophy family, across both the general Muscle Building ladder (Foundation/Intermediate/Advanced) and the Lower Body ladder (Foundation/Intermediate). Authored using `Strength-Family-Research-v1.0.md` as template. Surfaces (does not resolve) the Muscle Building Intermediate vs. Lower Body Intermediate convergence risk as the named risk for the Stage 1 sequence. Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Muscle Building (Hypertrophy) Family Research — v1.2*
*June 2026*
*Stage 0A deliverable per `Program-Catalog-Production-Standard-v1.0.md` §7. Pending product-team review before LOCK. Second family to complete Stage 0A, following Strength.*
