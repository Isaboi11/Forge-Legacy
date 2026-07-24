# Forge Legacy Anchor Exercise Authoring Framework

## v1.0 | June 2026

**Status:** LOCKED — content-production standards only. No architecture, schema, taxonomy, or screen changes. No amendments. No edits to any existing document. **Zero exercises authored** — all exercise-shaped text in this document (Section 3 templates, Appendix) is either structural (no exercise-specific content) or explicitly fictional/placeholder, never part of the 200-exercise launch catalog.

**Type:** Content Production Framework (governs *how* anchor content is written, not *what* gets written)

**Predecessors:** `Exercise-Library-Architecture-v1.0.md`, `Exercise-Library-Production-Plan.md`, `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md`, `Exercise-Detail-Wireframe-Spec-W22.md`, `Exercise-Picker-Wireframe-Spec-W23.md`, `Exercise-001-Custom-Exercise-Architecture.md`, `Exercise-002-Exercise-Substitution-Architecture.md`, `Program-Authoring-Standard-v1.0.md`.

**Premise:** the launch catalog is locked at 200 exercises with 45 anchors, all category/pattern/equipment quotas satisfied. The Exercise Library is content-constrained, not architecture-constrained, and is ready for population. This framework is the standards layer that must exist before Anchor Population Pass #1 begins, so that 45 anchors — possibly written by more than one author — read as a single coaching voice.

---

## Section 1 — Exercise Content Philosophy

Each of the five required `ExerciseDefinition` content fields has a distinct communicative job. None overlap in purpose; if two fields start saying the same thing for a given exercise, one of them is being misused.

| Field | W-22 Label | Communicates |
|---|---|---|
| `description` | ABOUT | **What the exercise is.** A neutral, factual identification of the movement — what body region/pattern it belongs to, what makes it distinct from similar movements. No persuasion, no instruction. |
| `whyItMatters` | WHY IT MATTERS | **Why an athlete would choose it.** The training rationale — what it builds, what it's good for, why it has a place in a program. This is the only field that argues a case. |
| `instructions` | HOW TO DO IT | **How to execute it, in order.** The literal sequence of physical actions an athlete performs, from setup to completion. Written to be followed in real time, not read for understanding in advance. |
| `tips` | COACHING CUES | **What to remember mid-set.** Short, real-time self-correction reminders — the kind of thing a coach says while watching a rep happen, not before it starts. |
| `commonMistakes` | WATCH OUT FOR | **What tends to go wrong.** Recognizable failure patterns, stated as observations an athlete can self-diagnose against — not corrections, not commands. |

**Rationale.** This division maps one-to-one onto the locked schema (`Exercise-Library-Architecture-v1.0.md` §2.1) and the locked W-22 display order (WHY IT MATTERS → ABOUT → HOW TO DO IT → COACHING CUES → WATCH OUT FOR). The framework does not invent new purposes for these fields — it makes explicit the functional distinction the architecture already implies: identity, then rationale, then execution, then real-time correction, then error-recognition. Keeping these distinct is what prevents 45 anchors from reading like five repeated descriptions of the same thing.

The WATCH OUT FOR / COACHING CUES distinction is the one most authors will blur by default: cues are *forward-looking instructions* ("keep your chest tall"), mistakes are *backward-looking observations* ("the chest tends to collapse forward under load"). This distinction is binding, not stylistic — see Section 2.

---

## Section 2 — Writing Standards

**Reading level.** Plain language, roughly 7th–8th grade. If a word needs a definition, replace it with the plain-language equivalent rather than explaining it inline.

**Sentence length.** Short and declarative. Target 10–18 words per sentence; no compound sentences with more than one subordinate clause. `instructions` steps are typically shorter than `description`/`whyItMatters` sentences — a step is one action, not a paragraph.

**Voice per field:**

| Field | Voice |
|---|---|
| ABOUT | Third-person, descriptive. No "you." |
| WHY IT MATTERS | Third-person, descriptive, but argumentative in content (states a benefit as fact). No "you." |
| HOW TO DO IT | Second-person imperative, subject dropped ("Stand with feet hip-width apart," not "You should stand..."). |
| COACHING CUES | Second-person imperative, short phrase, subject dropped. |
| WATCH OUT FOR | Third-person descriptive observation, **never imperative, never a command.** This is the one rule with zero exceptions — see below. |

**Technical language.** Common anatomical terms (hamstrings, core, shoulder blades, lower back) are fine without explanation. Biomechanics jargon (scapular retraction, anterior pelvic tilt, eccentric loading) is not allowed in any of the five fields — say what it means in plain terms instead ("pull your shoulder blades together," not "retract your scapulae").

**The descriptive-not-corrective rule (WATCH OUT FOR).** This is locked directly by W-22's own display spec, not a stylistic preference of this framework. A WATCH OUT FOR entry describes a failure pattern as something that happens, never as an instruction to avoid it.
- Correct: "The lower back rounds when the weight gets too heavy to control."
- Not correct: "Don't let your lower back round." (This is a cue, and belongs in COACHING CUES if anywhere — but as a corrective imperative it doesn't belong in either field unmodified; rephrase as the observation above.)

**Consistency standard.** Every exercise is referred to by its exact canonical name from the Launch Catalog Blueprint, with no synonym substitution inside its own content fields (e.g., don't call "Barbell Romanian Deadlift" a "stiff-leg deadlift" inside its own ABOUT text). This is required because Program-Authoring-Standard §12.5 resolves exercise names via exact, case-insensitive match with no fuzzy fallback — naming drift inside content fields doesn't break resolution directly, but it erodes the single-name discipline the whole pipeline depends on.

**Formatting standards:**
- `instructions`: numbered, one action per step, each step starts with a verb.
- `tips` / `commonMistakes`: em-dash (—) bulleted, unordered, one idea per bullet.
- No exclamation points, anywhere, in any field.
- No emoji, no all-caps emphasis.
- Field length always sits inside its locked bound (Section 5 enforces this at QC, not at draft time — drafts should aim for the middle of the range, not the maximum).

**Goal check.** If two anchors, read back to back, sound like they were written by two different people, something in this section was skipped — most often voice-per-field or the descriptive-not-corrective rule.

---

## Section 3 — Exercise Content Templates

Structural skeletons only. No exercise-specific content is filled in below — these are the shapes every anchor's content should be poured into.

**ABOUT** (`description`, 1–3 sentences)
> [Exercise Name] is a [category/pattern descriptor] exercise that [what it targets or trains]. [Optional second sentence: how it's typically loaded or set up.] [Optional third sentence: what distinguishes it from a closely related movement.]

**WHY IT MATTERS** (`whyItMatters`, 1–4 sentences)
> [Exercise Name] builds [primary trained quality — strength/stability/control/capacity]. [Sentence connecting that quality to a broader training or real-world outcome.] [Optional: who or what training goal this is especially well-suited for.] [Optional: how it complements or supports other movements in the same pattern family.]

**HOW TO DO IT** (`instructions`, 4–8 ordered steps)
> 1. [Starting position / stance / setup.]
> 2. [Grip, brace, or alignment cue needed before initiating.]
> 3. [Initiate the movement — first phase of motion.]
> 4. [Midpoint or transition point of the movement.]
> 5. [Completion point — where the rep ends.]
> 6. [Return to start, if distinct from completion.]
> [Optional steps 7–8: breathing pattern, repeat instruction, or a setup detail too specific for step 1–2.]

**COACHING CUES** (`tips`, 2–5 bullets)
> — [Body part] + [short imperative action]
> — [Body part] + [short imperative action]
> — [Optional: timing/tempo cue]
> — [Optional: breath cue]
> — [Optional: a cue specific to this exercise's hardest moment]

**WATCH OUT FOR** (`commonMistakes`, 2–4 bullets)
> — [Body part/mechanic] + [what tends to go wrong], stated as an observation
> — [Body part/mechanic] + [what tends to go wrong], stated as an observation
> — [Optional: a third common failure pattern]
> — [Optional: a fourth, only if genuinely distinct from the first two]

---

## Section 4 — Progression, Regression, and Alternative Standards

These standards govern relationship authoring for all 45 anchors and exist to keep the resulting ladder/substitution graph consistent rather than ad hoc.

**When to assign a progression.** Only when a harder variant exists *within the same `MovementPattern`* in the 200-name blueprint, and the difficulty increase is real and specific (more load, worse leverage, higher stability demand, or greater range of motion) — not just "feels harder." Authored on the easier exercise, pointing to the harder one. Cap: 1–3 entries.

**When to assign a regression.** Only when an easier variant exists within the same `MovementPattern`, reducing one of the same dimensions (load, leverage, stability, ROM). Every anchor should have at least one direction populated (progression or regression) — an anchor with neither is not functioning as an anchor regardless of what the blueprint marks it as. Cap: 1–3 entries.

**When to assign an alternative.** When another exercise serves the same training intent through different execution or equipment, at roughly the same difficulty — this is Exercise-002's substitution-pool definition, and it is the only relationship type that feeds W-23's Suggested Substitutes. Alternatives are resolved bidirectionally at display time (W-22 §12.6), so only one side needs to author the link; author it on whichever exercise is more likely to be the "prescribed" exercise in a program.

**How relationships are selected — hard constraints:**
- Never link to an exercise that isn't already one of the 200 names in the Launch Catalog Blueprint. No forward references to unauthored content.
- Never cross `MovementPattern` boundaries for progression/regression — a regression of a SQUAT-pattern anchor must also be SQUAT-pattern.
- Progressions are never part of the substitution pool — do not expect or design around them appearing in W-23.
- Relationships are never assigned to CUSTOM exercises (architecture-locked: all three relationship arrays are always empty on CUSTOM records). This section governs FORGE anchor content only.
- Don't partially link a ladder — if an anchor's natural progression exists in the blueprint but hasn't been authored yet, wait rather than skipping the link silently (consistent with Production Plan §6 step 4).

---

## Section 5 — Quality Control Checklist

An anchor is not content-complete until every line below passes.

**Content completeness**
- [ ] `description` present, 1–3 sentences
- [ ] `whyItMatters` present, 1–4 sentences
- [ ] `instructions` present, 4–8 ordered steps, each starting with a verb
- [ ] `tips` present, 2–5 bullets
- [ ] `commonMistakes` present, 2–4 bullets
- [ ] Media (GIF or video) attached; muscle target image attached (per Exercise-Media-Architecture-v1.0.md)
- [ ] `isActive` not set to `true` until every item above is satisfied

**Taxonomy completeness**
- [ ] `category` matches the Launch Catalog Blueprint row exactly
- [ ] `movementPattern` matches the Launch Catalog Blueprint row exactly
- [ ] At least one equipment tag set, matching the blueprint row

**Relationship completeness**
- [ ] At least one of `progressionExerciseIds` / `regressionExerciseIds` is populated
- [ ] Every relationship target exists in the 200-name blueprint
- [ ] No relationship crosses `MovementPattern`
- [ ] No relationship array exceeds 3 entries
- [ ] Alternatives reflect genuine same-intent/different-execution substitutes, not progressions or regressions misfiled

**Consistency requirements**
- [ ] Exercise name matches its canonical Launch Catalog Blueprint name exactly, including inside its own content fields
- [ ] Voice matches Section 2's per-field voice table
- [ ] Every `commonMistakes` entry is phrased as an observation, never as a command
- [ ] No biomechanics jargon present without a plain-language equivalent

**Readability requirements**
- [ ] Sentence/step/bullet counts fall within their locked bounds (not just under the ceiling — drafts should sit near the middle)
- [ ] Reading level approximates 7th–8th grade
- [ ] No exclamation points, no emoji, no all-caps emphasis

---

## Section 6 — Anchor Production Order

The 45 anchors (verified directly against `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §2/§4, not assumed) sequenced into four leverage tiers — highest dependency-unblocking value first.

**Tier 1 — PAS-named compounds (9 anchors post-naming-reconciliation, originally 10).** Overlaps directly with `Program-Authoring-Standard-v1.0.md` §11's required-compound list, which is load-bearing for the **already-committed** Strength Foundation I/II/III packages:
Back Squat, Deadlift, Barbell Romanian Deadlift, Hip Thrust, Lunge, Barbell Bench Press, Overhead Press, Barbell Row, Pull-Up. (A 10th, originally authored as "Squat," was retired by the 2026-06-30 Exercise Naming Standard reconciliation; its content now lives under "Bodyweight Squat," a non-anchor row.)
*Rationale:* these unblock real, already-authored program content immediately — the only tier with concrete, non-hypothetical downstream dependents today.

**Tier 2 — Remaining PUSH / PULL / CORE anchors (15 anchors).**
Push-Up, Dumbbell Bench Press, Seated Dumbbell Shoulder Press, Landmine Press, Incline Cable Press, Dumbbell Row, Chest-Supported Row, Lat Pulldown, Dumbbell Curl, Hammer Curl, Front Plank, Dead Bug, Pallof Press, Bird Dog, Hanging Leg Raise, Sit-Up, Russian Twist, Cable Woodchop.
*Rationale:* completes the compound-then-isolation backbone PAS §11.2 requires for the still-unauthored Hypertrophy and Lower Body program families — same dependency class as Tier 1, one step further from already-committed content.

**Tier 3 — Remaining LEGS_AND_GLUTES + FULL_BODY anchors (8 anchors).**
Leg Extension, Seated Leg Curl, Box Jump, Jump Squat, Farmer Carry, Suitcase Carry, Turkish Get-Up, Burpee.
*Rationale:* supports Conditioning/Hybrid circuit-style programming, which has no committed content yet and a looser equipment/structure requirement than Strength/Hypertrophy — real but lower-urgency leverage.

**Tier 4 — MOBILITY anchors (9 anchors), last.**
Pigeon Pose, Standing Hamstring Stretch, Cat-Cow, World's Greatest Stretch, 90/90 Hip Switch, Thoracic Rotation, Foam Rolling Quads, Foam Rolling Upper Back, Box Breathing.
*Rationale:* sequenced last by **structural independence, not low priority** — Mobility is its own category with no progression/regression/alternative dependency on any other tier (same logic the Production Plan already applied at the catalog level). This tier can run as a parallel track at any point without resequencing risk if staffing allows.

---

## Section 7 — Population Readiness

**Is Forge Legacy ready to begin Anchor Exercise Population Pass #1 once this framework is approved? Yes.**

**Remaining risks:**
- **Production volume.** 45 anchors × five required fields + media is a genuine authoring-cost risk, not a design one — this framework defines quality bars, not throughput.
- **Canonical-name freeze discipline (resolved 2026-06-30).** The Launch Catalog Blueprint's five naming-duplicate pairs (Box Step-Up/Step-Up, Back Squat/Squat, Front Plank/Plank, Barbell Romanian Deadlift/Romanian Deadlift, Barbell Bench Press/Bench Press) are now each a single canonical row — see `Exercise-Naming-Standard-v1.0.md` for the locked naming principles and `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §3 for the resolution record. Future authoring must check new names against the full catalog and follow the locked naming principles; a published canonical name may only be changed through an equivalent formal reconciliation pass.
- **Multi-author voice consistency.** If more than one person authors content, Section 2's per-field voice rules and Section 5's QC pass are the only safeguard against drift — there is no automated enforcement defined here.

**Remaining dependencies:** none architectural. Media production (GIF/video capture and pipeline) is an adjacent open item this framework deliberately does not address (text standards only, per scope) — worth a one-line confirmation before Pass #1 starts, but not a blocker to beginning text authoring. That confirmation now exists: `Exercise-Media-Architecture-v1.0.md` (June 2026) is the governing production-standards document for all media and anatomy fields, including the newly added `muscleTargetImageUrl`; this framework's scope remains text-only and is unchanged by it.

**Recommended next action:** begin Anchor Exercise Population Pass #1 against Section 6's Tier 1 list (the 10 PAS-named compounds), applying Sections 2–5 directly. This framework authors no content itself — Pass #1 is a separate, future action.

---

## Appendix — Worked Example (Fictional, Demonstration Only)

**This exercise does not exist in the Forge Legacy catalog.** "Obelisk Carry" is an invented placeholder used solely to show this framework applied end-to-end. It is not one of the 200 launch exercises, not an anchor, and must never be added to the catalog under this name.

**Exercise Name:** Obelisk Carry *(fictional)*
**Category:** FULL_BODY | **Movement Pattern:** CARRY | **Equipment:** DUMBBELL, KETTLEBELL

**ABOUT**
> The Obelisk Carry is a loaded carry exercise that trains total-body stability under an offset load. It is performed by holding a single weight at chest height while walking a fixed distance.

**WHY IT MATTERS**
> The Obelisk Carry builds core and shoulder stability under load-bearing fatigue. It carries over directly to everyday lifting and carrying tasks where the load isn't evenly balanced. It complements other carry variations by training the front-loaded position specifically.

**HOW TO DO IT**
> 1. Stand tall holding one dumbbell or kettlebell against your chest with both hands.
> 2. Brace your core and pull your shoulders back before stepping.
> 3. Walk forward in a straight line with short, controlled steps.
> 4. Keep the weight pinned to your chest for the full distance.
> 5. Set the weight down with control at the end of the distance.

**COACHING CUES**
> — Chest tall, weight pinned high
> — Brace your core with every step
> — Short steps, steady pace

**WATCH OUT FOR**
> — The chest collapses forward as the carry distance gets longer
> — The pace speeds up and steps become uneven near the end of the carry

**Relationship assignment (sample):**
- **Regression:** a lighter, shorter-distance carry variant of the same CARRY pattern — assigned because it reduces load while preserving the same mechanic.
- **Alternative:** a different CARRY-pattern exercise with comparable difficulty but a different hold position — assigned because it serves the same training intent through different execution, per Section 4.
- **Progression:** intentionally left unassigned in this example — demonstrates that a relationship type should stay empty rather than be forced when no genuinely harder same-pattern variant is being illustrated.

**QC pass (sample):**
- [x] All five fields present and within bounds
- [x] Category/pattern/equipment consistent with this entry's own header
- [x] At least one relationship direction populated (regression + alternative)
- [x] WATCH OUT FOR entries are observations, not commands
- [x] No biomechanics jargon
- [x] Name used consistently throughout its own fields

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial Forge Legacy Anchor Exercise Authoring Framework. Reviewed Exercise-Library-Architecture-v1.0.md, Exercise-Library-Production-Plan.md, Exercise-Library-Launch-Catalog-Blueprint-v1.0.md, Exercise-Detail-Wireframe-Spec-W22.md, Exercise-Picker-Wireframe-Spec-W23.md, Exercise-001-Custom-Exercise-Architecture.md, Exercise-002-Exercise-Substitution-Architecture.md, Program-Authoring-Standard-v1.0.md. Defined content philosophy (5 fields, identity→rationale→execution→correction→error-recognition), writing standards (reading level, per-field voice, binding descriptive-not-corrective rule for WATCH OUT FOR), structural-only templates, progression/regression/alternative standards (pattern-bound, capped, CUSTOM-excluded), a 5-category QC checklist, a 4-tier production order for all 45 verified anchors (PAS-named compounds first, Mobility last by independence), and a population-readiness assessment (ready for Pass #1; risks are volume/name-freeze/voice-consistency, not architectural). Includes one fictional worked example ("Obelisk Carry," not part of the launch catalog) demonstrating the framework end-to-end. No exercises authored. No existing documents edited. No amendments created. No architecture changes proposed. |
| v1.0 | June 2026 | LOCKED. |
| v1.0 (Media Cross-Reference) | June 2026 | Cross-reference addition only, no content-standards change: §7 Population Readiness's media confirmation note updated to point to the new `Exercise-Media-Architecture-v1.0.md` (the "one-line confirmation" this section explicitly anticipated). §5 QC checklist's media line updated to include the muscle target image. This framework's scope remains text-content standards only — no media production guidance is added here. |
| v1.0 (Naming Duplicate Resolution Cross-Reference) | 2026-06-30 | Cross-reference and example update only, no content-standards change: §6's Tier 1 list updated to 9 anchors (Squat retired, content relocated to non-anchor "Bodyweight Squat"), with Tier 1/2 illustrative names updated to canonical forms (Back Squat, Barbell Romanian Deadlift, Barbell Bench Press, Front Plank). §7's "Canonical-name freeze discipline" risk item updated from "three unresolved pairs" to a resolved-status note pointing at the new `Exercise-Naming-Standard-v1.0.md`. The Consistency Standard's worked example ("Romanian Deadlift") updated to the canonical name. This framework's scope remains text-content standards only. |

---

*Forge Legacy Anchor Exercise Authoring Framework — v1.0*
*Forge Legacy | June 2026*
