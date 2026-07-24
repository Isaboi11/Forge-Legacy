# Endurance & Multi-Activity Architecture Evaluation

## v1.0 | June 2026

**Status:** STRATEGIC EVALUATION — no schemas authored, no amendments drafted, no honors authored, no Rank redesign performed. This document answers one question: what does the current locked architecture already support for non-strength activity types, and what genuinely remains before Strength, Running, Walking, Hiking, Cycling, Swimming, and Rowing can all be first-class launch activities?

**Type:** Strategic Evaluation Document

**Scope:** Activity Taxonomy, Activity Data Models, Activity History, Programs, Goals, Progress, Rank, Honors, Product Vision Alignment, Final Recommendation — per the ten-section objective given for this pass. Rucking is out of scope (explicitly not under evaluation).

**Read in full for this pass:** `Exercise-Library-Architecture-v1.0.md`, `Active-Workout-Flow-Spec-W9-W16.md`, `Activity-Type-Picker-Spec-W8.md`, `Activity-History-Wireframe-Spec-W18.md`, `Activity-Detail-Wireframe-Spec-W19.md`, `Workout-Summary-Spec-W17.md`, `Legacy-Timeline-Wireframe-Spec-L2.md`, `WSR-001-Workout-Share-Result-Architecture.md`, `Workout-Builder-Wireframe-Spec-W24.md`, `Free-Workout-Builder-Spec-W25.md`, `Program-Catalog-Architecture-v1.0.md`, `Program-Ecosystem-Architecture-v1.0.md`, `Program-Authoring-Standard-v1.0.md`, `Program-Detail-Wireframe-Spec-W3.md`, `Program-Creation-Wireframe-Spec-W4.md`, `Goal-Hub-Wireframe-Spec-G1.md`, `Goal-Detail-Wireframe-Spec-G2.md`, `Goal-Create-Edit-Wireframe-Spec-G3.md`, `Amendments/Critical-Decisions-Amendment-001.md`, `P-2-Progress-Hub-Architecture.md`, `P-2-Progress-Hub-Spec.md`, `Rank-Computation-Model.md`, `Rank-Calibration-Decisions.md`, `Rank-System-Architecture.md`, `O-2-Amendment-001-Athlete-Type-Declaration.md`, `Honor-Catalog-v1.0-LOCKED.md`, `HonorInstance-Architecture-v1.0.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `FORGE_LEGACY_PRODUCT_DNA.md`.

**Headline finding, stated up front because it changes the shape of every section below:** this is not a greenfield evaluation. The architecture has already been built activity-type-generic in most of the places that matter — there is a locked, append-only `ActivityType` enum already containing four of the seven domains under evaluation, dedicated logging screens for them, and Goals/Progress/Rank models that are already deliberately type-agnostic by name. The real gaps are narrower than the framing implies, and are identified precisely in each section.

---

## Section 1 — Activity Taxonomy

### 1.1 What already exists

`Activity-Type-Picker-Spec-W8.md` (Decision 2, locked) defines the canonical taxonomy already in production architecture:

> "The MVP activity types are: Strength, Run, Walk, Bike, Swim, HIIT, Mobility, Yoga, Other" — enum `STRENGTH | RUN | WALK | BIKE | SWIM | HIIT | MOBILITY | YOGA | OTHER`. "This enum is append-only post-launch. Values may be added in future releases. No existing value may be renamed or removed without a data migration."

Of the seven domains under evaluation: **Strength, Running, Walking, Cycling (BIKE), and Swimming already exist as named, locked enum values with dedicated logging screens (W-9 Strength; W-10 Run; W-11 Walk; W-12 Bike; W-13 Swim).** Hiking and Rowing are the only two genuinely absent — not deferred, not excluded by decision, simply never modeled. They sit in the same "not yet named" bucket as Rucking, which the user has already excluded from this evaluation; nothing in the architecture today distinguishes Hiking/Rowing from Rucking in terms of readiness.

### 1.2 A taxonomy already exists at two levels, not one

The architecture already operates a two-tier model, found independently in two separate locked documents:

- **Concrete activity type** (`ActivityType`, 9 values) — drives logging UI, history filters, and detail display.
- **Functional family grouping** — `P-2-Progress-Hub-Architecture.md` §7.2 (PH-D8) defines "Strength family: STRENGTH, HIIT" and "Endurance family: RUN, WALK, BIKE, SWIM" for profiling purposes; `Exercise-Library-Architecture-v1.0.md` §10.3 independently draws the same line for carry-forward behavior ("Carry-forward applies to: STRENGTH, HIIT, MOBILITY, YOGA... does NOT apply to: RUN, WALK, BIKE, SWIM").

Both documents converge on the same split without cross-referencing each other — this is a coherent, already-validated taxonomy, not something this evaluation needs to invent.

### 1.3 Should strength and endurance be modeled differently?

Already are, by explicit locked design rather than oversight. `Active-Workout-Flow-Spec-W9-W16.md` §4.3: "**Why cardio variants are simpler:** Running, walking, cycling, swimming, yoga, and HIIT do not benefit from set/rep structure... The tracking interface scales to what the activity actually requires." Strength-family types log as an exercise list (sets/reps/weight); Endurance-family types log as a single continuous timer-based session (elapsed time + distance, +laps for Swim). This is the correct, already-validated split to preserve — not a question this evaluation needs to reopen.

### 1.4 Is a unified framework possible?

Yes — it already exists in practice. `ActivityType` is the spine that Goal auto-update mapping, Progress profiling, Rank's Meaningful Work definition, Activity History/Detail rendering, and WSR-001 share content all already key off. Extending the taxonomy to Hiking and Rowing is an append to an enum explicitly designed for that purpose, not a new framework.

### 1.5 Where Hiking and Rowing would fall

- **Hiking** is mechanically closest to Walking (timer + manual distance entry) with added terrain/environment texture — the Exercise Library's existing `EnvironmentTag: OUTDOOR` system already has a slot for this distinction. Structurally, Hiking is a W-11 (Walking) variant.
- **Rowing** is mechanically closest to Swimming or Cycling (timer + distance, optionally interval-structured) — structurally a W-12/W-13 variant.

Neither requires a new logging mechanic; both require only enum inclusion and family classification (Section 1.2).

**Verdict:** the taxonomy question is substantially already answered. The only open item is whether to append `HIKING` and `ROWING` to the existing `ActivityType` enum — a decision, not an architecture problem.

---

## Section 2 — Activity Data Models

### 2.1 A shared prescription schema already spans strength and distance-based content

`Program-Authoring-Standard-v1.0.md` §2.3 confirms `ExercisePrescription` already carries: `sets`, `reps`, `durationSeconds`, `weightValue`/`weightUnit`, `distanceValue`/`distanceUnit` (units `m`/`km`/`mi`), `restSeconds`, `notes`. This single schema already spans Strength (`sets`/`reps`/`weightValue`) and Endurance (`durationSeconds`/`distanceValue`) without a fork. §11.4–11.5 already author Running and Cycling programs against this exact schema.

### 2.2 Two already-distinct active-logging shapes, not one generic shape

`Active-Workout-Flow-Spec-W9-W16.md` §4.3 and §13.2 confirm the active-session model is already split cleanly:

| Shape | Activity types | Core fields | Save rule |
|---|---|---|---|
| Exercise-list | STRENGTH, HIIT, MOBILITY, YOGA, OTHER | sets, reps, weight (per exercise) | Blocked if zero sets logged |
| Continuous timer | RUN, WALK, BIKE | elapsed timer, distance (manual entry), notes | Blocked if elapsed time < 60s |
| Continuous timer + laps | SWIM | elapsed timer, laps, distance (optional), notes | Blocked if elapsed time < 60s |

### 2.3 Shared vs. unique fields

- **Shared across all types:** `activityType`, elapsed duration, `notes`, date logged.
- **Strength-unique:** exercise identity, sets, reps, weight.
- **Endurance-unique:** distance, laps (Swim only).

### 2.4 Recommended architecture approach (no schema authored here)

Hiking and Rowing should reuse the existing continuous-timer shape rather than introduce a third logging mechanic — directly consistent with the "tracking interface scales to what the activity actually requires" principle already stated in `Active-Workout-Flow-Spec-W9-W16.md` §4.3. Hiking maps to the Run/Walk pattern (timer + distance); Rowing maps to the Bike/Swim pattern (timer + distance, optionally laps/intervals).

### 2.5 The one concrete data-model gap found in this section

`Activity-Detail-Wireframe-Spec-W19.md` §7.2 already names **"Avg Pace" (Run)** and **"Avg Speed" (Bike)** as expected display fields (W-18 Activity History shows only distance — it has no pace/speed field, a correction from this section's original draft, captured in `Pace-Speed-Definition-Architecture-Note.md` §1.2). Neither field is backed by a defined stored field or computation anywhere in the architecture — it is referenced in this wireframe as an assumed display value, never formally specified. This is small, but it is the single most load-bearing undefined term found anywhere in this evaluation (see Section 6.4 — Progress depends on it too).

**Verdict:** the data model question is substantially solved by reuse of existing fields. The one real gap is a missing formal definition of pace/speed as a derived value (distance ÷ duration), not a missing field family.

---

## Section 3 — Activity History Impact

### 3.1 The user's example timeline is already what W-18/W-19 support

The example given —

> Monday — Upper Body Workout · Tuesday — 5 Mile Run · Wednesday — Leg Day · Thursday — 20 Mile Ride

— maps directly onto already-locked architecture. `Activity-History-Wireframe-Spec-W18.md` §5.4/§7.1/§14.2 already defines filter chips for all 9 types (`[All] [Strength] [Run] [Walk] [Bike] [Swim] [HIIT] [Mobility] [Yoga] [Other]`) and a per-type "Key Stat" format: RUN/WALK/BIKE → `[distance] [unit]`; SWIM → distance or lap count; HIIT → round count; MOBILITY/YOGA → blank. `Activity-Detail-Wireframe-Spec-W19.md` §5.2/§7.2 mirrors this with a generic "Activity Data" stat-row section that already branches by type.

### 3.2 Filtering, detail, and consistency requirements

- **Filtering:** already built — chip-based, all 9 current types plus "All."
- **Detail view:** already type-branching via a single shared shell with type-specific stat substitution, not a fork into separate screens per type.
- **Consistency requirement:** already met structurally — every activity type renders through the same row/detail components, which is precisely the "unified timeline, type-aware rendering" pattern the example implies. This was not designed in response to this evaluation; it predates it.

### 3.3 What the architecture does not yet support

Hiking and Rowing are absent from W-18's filter-chip list and Key Stat table for the same reason given in Section 1: they are not yet in the `ActivityType` enum. Once added there, including them in History/Detail is mechanical — two new rows in already-existing tables, not new architecture.

**Verdict:** Activity History already fully supports the multi-activity vision described in the objective. The only blocker for Hiking/Rowing specifically is the enum gap named in Section 1, not anything in W-18/W-19 themselves.

---

## Section 4 — Program Architecture Impact

### 4.1 Can programs contain endurance activities? Yes — already true for Running

`Program-Catalog-Architecture-v1.0.md` §3.1 defines an 8-value `ProgramCategory` enum: `STRENGTH, HYPERTROPHY, CONDITIONING, RUNNING, CYCLING, COMBAT_SPORTS, FULL_BODY, MOBILITY`. RUNNING already has a full taxonomy row, dedicated `goalAlignment` values (`IMPROVE_RUNNING`, `IMPROVE_ENDURANCE`), and `Program-Authoring-Standard-v1.0.md` §11.4 already authors Running programs end-to-end (duration/distance-based prescriptions, Block Periodization progression). "Running Base I/II" already exist as launched Forge programs per `Program-Ecosystem-Architecture-v1.0.md` §2.1.

**Cycling exists in schema but not in launch content.** `Program-Catalog-Architecture-v1.0.md` PC-D4 (locked decision): "Cycling and Combat Sports are deferred to the creator marketplace... CYCLING category enum retained for athlete-created and imported programs." This is a direct tension worth naming plainly: the user's framing lists Cycling as "approved for evaluation" for launch, but the existing locked Program Catalog decision already defers Forge-authored Cycling programs past launch. These are not necessarily in conflict — Cycling can still be a first-class *logging/tracking* activity at launch (W-12 already exists) without Forge authoring Cycling *programs* at launch — but the two bars ("first-class activity" vs. "first-class authored Program content") are different, and this evaluation found the architecture already resolves them differently for Cycling specifically.

**Walking, Hiking, Swimming, and Rowing have no Program category at all.** They do not appear anywhere in the 8-value enum, deferred or otherwise.

### 4.2 Can programs contain mixed activity types? Yes for athlete-created, no for Forge-authored

This is a genuine, previously unexamined asymmetry surfaced by this evaluation:

- **Forge-authored programs:** No. `Program-Ecosystem-Architecture-v1.0.md` §2.1 confirms each of the 6 launch program families (Strength, Hypertrophy, Running, Conditioning, Full Body & Home, Mobility) is single-category. No Forge-authored program mixes, e.g., a lifting day and a running day.
- **Athlete-created programs:** Yes, already. `Program-Creation-Wireframe-Spec-W4.md` §9.2 already defines a per-workout-slot data model — `{ name, type: ActivityType?, originTemplateId, sections }` — with an "Add Workout" bottom sheet exposing chips for `[Strength] [Run] [Walk] [Bike] [Swim] [Mobility] [Yoga] [Other]` per slot, explicitly mapped to "W-9–W-16 activity types." An athlete building their own program in W-4 can already tag individual days with different activity types within one program.

### 4.3 Can a program include both lifting and running days?

Only via the athlete-created path today (Section 4.2). No Forge-authored program does this, and no locked document proposes one should. This is a real open design question this evaluation is naming, not resolving (per Rule 9/10): does Forge want to author its own mixed-modality programs (e.g., a hybrid strength-and-running block), or leave mixed-activity programs exclusively to athlete authorship?

### 4.4 A documentation-lag finding, noted but not corrected here

`Program-Catalog-Architecture-v1.0.md` PC-D4 and its Validation Checklist (§ "25 Forge Programs... 5 of 7 Athlete Types covered") reference **"7 Athlete Types,"** which predates `O-2-Amendment-001-Athlete-Type-Declaration.md`'s later, locked consolidation to **4 types** (Strength, Bodybuilding, Endurance, Hybrid). This is the same stale-cross-reference pattern flagged in prior repository audits — cosmetic, not a blocker, but worth a future correction pass rather than silent reliance on the "7 types" figure.

**Verdict:** Programs already support endurance content structurally (schema, Running content, athlete-created mixing). The real gaps are content/category decisions — whether Forge authors Cycling/Walking/Hiking/Swimming/Rowing programs, and whether Forge ever authors mixed-modality programs — not missing architecture.

---

## Section 5 — Goals Impact

### 5.1 Goals are already fully generic — this is the cleanest finding in the evaluation

`Goal-Hub-Wireframe-Spec-G1.md` Decision 6 (locked, verbatim): "No mandatory goal types for MVP. Goals are defined by name and target only... The goal name is the category. 'Run my first marathon' is more specific and personal than 'Endurance.'... A type system is Todoist behavior. Forge Legacy is not Todoist."

The canonical Goal Target Model (`Goal-Detail-Wireframe-Spec-G2.md`, inherited by `Goal-Create-Edit-Wireframe-Spec-G3.md`) is: Goal Name (required, freeform) + Target (optional, numeric) + Unit (optional, freeform string — "any string is valid," not a dropdown). There is no goal-type or goal-category enum anywhere in the architecture.

### 5.2 Endurance goals are not hypothetical — already a worked example in locked architecture

`Amendments/Critical-Decisions-Amendment-001.md` Decision 1 (Hybrid goal progress model, locked) already lists, verbatim, alongside a Squat goal and a Bodyweight goal: *"Running mileage goal with Target = 500 miles: may auto-update by accumulating logged run distances."* This confirms the goal model already handles endurance metrics natively, not as a future extension.

### 5.3 What new goal categories are required: none

Because Goals carry no type system, no new category is required for Walking, Hiking, Cycling, Swimming, or Rowing goals — an athlete can already create "Hike the Pacific Crest Trail" or "Row 1,000,000 meters this year" today, by name and target alone. The only dependency is the same one named in Sections 1–2: auto-update mapping for a given goal requires the underlying activity type to exist and carry a distance field. Goals has no independent architectural gap of its own; it inherits whatever Sections 1–2 resolve for Hiking/Rowing specifically.

**Verdict:** no architecture changes required. Goals was already built to scale to every activity type evaluated here, including ones not yet modeled elsewhere.

---

## Section 6 — Progress Architecture Impact

*(Marked high-priority per the user's stated requirement: Progress must support all launch activity types.)*

### 6.1 Progress is already adaptive, not strength-first

`P-2-Progress-Hub-Architecture.md` §7.1 (verbatim): "The system derives the athlete's performance profile automatically from session history. The `athleteType` field set during onboarding... may serve as a secondary signal but session history is the primary input." §7.2 (PH-D8) defines session-count-dominance classification producing `STRENGTH_PROFILE`, `ENDURANCE_PROFILE`, `HYBRID_PROFILE`, or `DEFAULT` — already grouping RUN/WALK/BIKE/SWIM into an "Endurance family" with its own profile.

### 6.2 What Progress already shows for Endurance-profiled athletes

§7.3: "longest session distance, most recent pace, cumulative distance by rolling period." Consistency & Training, Lifetime Workouts, and Hours Forged metrics are explicitly "all activity types" (§12.1) — type-agnostic by design, not strength-specific.

### 6.3 This already satisfies the user's locked requirement, for the types that exist today

Because Run/Walk/Bike/Swim already exist in `ActivityType` and are already classified into the Endurance family for Progress purposes, **the requirement "Progress must support all launch activity types" is already architecturally met for four of the seven evaluated domains.** Extending this to Hiking and Rowing is a one-line addition to PH-D8's Endurance-family list once they exist in the enum (Section 1) — not new Progress architecture.

### 6.4 The one genuine architecture gap in this section — and the most load-bearing one in this whole evaluation

`ENDURANCE_PROFILE` names "most recent pace" as display content (§7.3). `Activity-History-Wireframe-Spec-W18.md` and `Activity-Detail-Wireframe-Spec-W19.md` independently name "Avg Pace" / "Avg Speed" as expected fields (Section 2.5). **No document anywhere defines pace or speed as a computed value, a stored field, or a derivation rule.** Three separately-locked documents already assume this concept exists; none of them define it. This is small in scope (almost certainly `distance ÷ duration`, possibly with a unit-conversion rule for display), but it is currently undefined, and every Endurance-profile-facing surface in the product is already waiting on it.

**Verdict:** Progress requires no redesign and no new system. It requires exactly one missing definition — a formal pace/speed computation — before its already-built Endurance profile can be considered complete, and one taxonomy-list addition (Hiking/Rowing into PH-D8) once Section 1 is resolved.

---

## Section 7 — Rank System Impact

*(Strategic evaluation only, per the objective — no Rank redesign performed.)*

### 7.1 Three of four primary categories are already, deliberately, type-agnostic

`Rank-Computation-Model.md` decision D-RCM-4 (locked, verbatim): "No activity type is excluded. MOBILITY, YOGA, WALK, and OTHER sessions qualify on the same terms as STRENGTH, RUN, BIKE, SWIM, and HIIT sessions... it must not be reversed by future threshold-setting." This governs Training Consistency and Training Volume (categories #1 and #4 of 4). Chapter Progression (a secondary category) is sealed-chapter-based and likewise activity-type-blind.

`Rank-Calibration-Decisions.md` Q1 reinforces this with a specific, named anti-gaming rationale for the universal 10-minute "Meaningful Work" duration floor: a higher floor was rejected explicitly because "the product explicitly declares all nine activity types are equally valid (D-RCM-4). A 20-minute floor creates a de facto hierarchy where high-duration activity types (Run, Strength, Bike) have an easier path to meaningful work than short-duration types (Mobility, HIIT rounds, brief Yoga flows)." This is the architecture already reasoning about cross-activity-type fairness, not a gap this evaluation needs to surface for the first time.

### 7.2 The one category that does differ by activity type — already coherently designed

Personal Improvement (category #2 of 4) is explicitly type-adaptive. `Rank-Computation-Model.md` §9 already defines a Running-specific signal: "fastest pace... and longest distance logged in a single session." `O-2-Amendment-001-Athlete-Type-Declaration.md` §7.1 generalizes this to an umbrella "Endurance" athlete-type signal: "Pace or distance personal best across any endurance activity type" — already covering Walking, Cycling, and Swimming generically, without a distinct formula per activity. Hiking and Rowing would fall under this same umbrella once they exist as `ActivityType` values; no new Personal Improvement model is required.

§7.2 of the same amendment is explicit about how narrow this effect is: athlete type does not "restrict activity logging," does not "affect rank promotion thresholds (other than Personal Improvement)," and does not "restrict honor eligibility." Training Consistency, Volume, Program Progression, Goals, and Chapters are confirmed type-agnostic there directly.

### 7.3 Should contribution differ by activity type?

It already does, in exactly the one place reasoned through above, and deliberately does not elsewhere. This is a coherent, already-justified position — the finding here is that the split is sound and should be preserved, not revisited, when Hiking/Rowing are added.

### 7.4 Risk of exploitation

The architecture is already self-aware about two of the most obvious risks:

- **Consistency/Volume gaming across activity types:** addressed by the universal duration floor (7.1) — explicitly chosen to prevent exactly this.
- **Personal Improvement gaming:** `Rank-Computation-Model.md` §9 calls the model "relatively gaming-resistant. An athlete cannot manufacture 'improvement' without actually logging higher performance values on their primary signal."

**One real, named risk this evaluation surfaces that no existing document addresses:** distance entry for Run/Walk/Bike/Swim (and, by extension, any future Hike/Row type) is manual at MVP, not GPS-verified — `Active-Workout-Flow-Spec-W9-W16.md` §4.3: "Distance is entered manually for MVP — GPS tracking is post-MVP." This means Personal Improvement's Endurance signal inherits an unverified self-report, the same as Strength's weight entry today. This is not a *new* category of risk — strength PRs are equally self-reported and equally unverified — but it does mean the Endurance signal should not be held to a higher trust bar than Strength already is, and any future GPS-verification work should be scoped symmetrically (or not at all) rather than singling out Endurance as more exploitable than Strength by assumption.

### 7.5 Long-term fairness

The existing 3-agnostic / 1-adaptive split already structurally prevents the most obvious unfairness scenario named in the objective — an Endurance-typed athlete being structurally unable to reach Training Consistency/Volume parity with a Strength-typed athlete. This evaluation found no fairness gap beyond what is already resolved by the existing model.

**Verdict:** Rank's existing architecture already generalizes cleanly to every activity type evaluated here. No redesign is implied; the only mechanical step is including Hiking/Rowing in the Endurance signal list once they exist (same dependency pattern as Sections 1 and 6).

---

## Section 8 — Honors Impact

### 8.1 Current state: zero endurance honors

`Honor-Catalog-v1.0-LOCKED.md` (locked, v1.0): 53 honor types across 7 categories — Strength (18), Chapters (8), Training (12), Goals (4), Programs (4), Community (3), Longevity (4). **None of the 53 reference any endurance metric.** The only activity-type-generic honors are Training (workout count, hours forged — counting any of the 9 session types equally) and Longevity (account-anniversary based). There is no Endurance category and no placeholder for one anywhere in the locked catalog.

### 8.2 The evaluator plumbing is already generic and ready

`Honor-Evaluation-Service-Architecture-v1.0.md` §7.2 (verbatim): "When new honor types are introduced in V1.1+: The relevant evaluator family runs a retroactive pass... Adding new honor types to the catalog (catalog expansion in V1.1+) does NOT require incrementing `schemaVersion`." The existing evaluator-family model (Training, Strength, Club, Goal, Program, Community, Chapter, Longevity — each owning "a coherent domain," per `HonorInstance-Architecture-v1.0.md`) is already structured to accept a new family without architectural rework.

### 8.3 This evaluation resolves a dependency a prior evaluation already named

`Honors-Reserved-Categories-Strategic-Evaluation.md` (the document open in the editor at the time of this pass) scoped itself explicitly around this exact gap: "Endurance & Conditioning is excluded from this pass per the user's framing (blocked by missing product capability, not a product-identity question — already settled)." This evaluation is the resolution of that named blocker. Once the pace/distance definition (Section 6.4) and the activity-type taxonomy (Section 1) are settled, an Endurance honor family becomes buildable on the same terms Strength's family already is — milestone ladders keyed to pace/distance personal bests instead of lift weight, following the same Bench/Squat/Deadlift-style family shape already proven in the catalog.

### 8.4 Catalog potential

Large and structurally parallel to Strength's existing shape (18 types across 5 families). An Endurance family could mirror this with per-activity-type milestone ladders once pace/distance are formally defined fields. This is the single largest piece of unbuilt-but-unblocked catalog potential identified across this entire evaluation — bigger in scope than any gap found in Programs, Goals, Progress, or Rank, but a content gap, not an architecture gap.

**Verdict (per Rule 9, no honors authored here):** Honors is the one system in this evaluation where the *content* gap is large even though the *architecture* gap is near-zero. The dependency chain is: pace/distance definition (6.4) → activity-type inclusion (Section 1) → new Endurance evaluator family (mechanically identical in scope to adding any other family).

---

## Section 9 — Product Vision Alignment

### 9.1 Mission and North Star are already activity-agnostic

`FORGE_LEGACY_PRODUCT_DNA.md` Mission: "Forge Legacy exists to help people build a meaningful fitness legacy over years and decades, not chase short-term performance metrics." North Star: "Forge Legacy is helping athletes become someone they are proud of ten years from now." **Neither names "lifting," "strength training," or any specific modality.** Launching with Strength + Running + Walking + Hiking + Cycling + Swimming + Rowing does not strain this language at all — if anything, a strength-only product sits in slightly more tension with "complete fitness journey" framing than a multi-activity one does.

### 9.2 Benefits

Every system this evaluation touched — Goals, Progress, three of four Rank categories — was already built activity-type-generic by deliberate, individually-justified, locked decisions (D-RCM-4, PH-D8, G-1 Decision 6) made well before this evaluation was requested. This means the architecture has been quietly endurance-ready for some time, ahead of content. Approving endurance activities for launch largely surfaces and completes work already paid for, rather than commissioning a new domain from zero.

### 9.3 Risks

The genuine risk is concentrated in exactly two places, both already named precisely in this evaluation:

1. **Honors** (Section 8) — an Endurance-typed athlete's catalog experience is currently empty (0 of 53 honors) against a Strength-typed athlete's 18-type family. Shipping endurance logging/tracking without addressing this risks a visibly two-tier recognition experience.
2. **Forge-authored Programs** (Section 4) — Running is the only endurance category with launch content; Cycling is explicitly deferred to the creator marketplace; Walking/Hiking/Swimming/Rowing have no Program category at all. An Endurance-typed athlete gets full logging, Goal, Progress, and Rank support today, but a comparatively thin authored-content (Program) experience by comparison to Strength.

### 9.4 Complexity costs

Low for Run/Walk/Bike/Swim — already built. Moderate for Hiking/Rowing — one enum addition plus family classification, reusing existing UI patterns (no new logging mechanic required, per Section 2.4). The larger cost driver by far is content authoring (Honors family, Program categories), not foundational architecture.

**Verdict:** strong alignment. The work this evaluation surfaces is concentrated in catalog/content depth (Honors, Programs), not in foundational architecture (Goals, Progress, Rank, History, taxonomy), all of which already generalize.

---

## Section 10 — Final Recommendation

### 10.1 Findings

1. `ActivityType` already includes Run, Walk, Bike (Cycling), and Swim — four of the seven launch-evaluated domains. **Hiking and Rowing are the only two domains requiring a net-new enum addition.**
2. Goals, Progress, and three of four Rank categories are already fully activity-type-agnostic, by deliberate, individually-documented, locked design decisions predating this evaluation — these are not gaps to close.
3. Activity History, Activity Detail, Workout Summary, and WSR-001 Share already render any activity type generically. Adding Hiking/Rowing to these surfaces is mechanical once Finding 1 is resolved.
4. **The single most load-bearing concrete gap found in this evaluation:** a pace/speed computation is assumed by name in three separately-locked documents (`P-2-Progress-Hub-Architecture.md`, `Activity-History-Wireframe-Spec-W18.md`, `Activity-Detail-Wireframe-Spec-W19.md`) but is formally defined in none of them.
5. Honors has zero endurance content (0 of 53 types) but fully generic, ready evaluator plumbing — this is the largest *content* gap found, not an architecture gap.
6. Forge-authored Programs support Running only among endurance categories; Cycling is explicitly deferred to the creator marketplace (a direct, named tension with this evaluation's "approved for evaluation" framing of Cycling); Walking, Hiking, Swimming, and Rowing have no Program category at all. Mixed-activity-type programs (e.g., lifting days plus running days in one program) exist only for athlete-created content (W-4) — no Forge-authored program does this, and no document decides whether one should.
7. A documentation-lag finding, not a blocker: `Program-Catalog-Architecture-v1.0.md` still references "7 Athlete Types," predating `O-2-Amendment-001`'s locked 4-type consolidation. Cosmetic; consistent with prior repository audit findings of the same pattern.

### 10.2 Architecture concerns

None of the above require redesigning Goals, Progress, or Rank — all three already generalize correctly and were validated, not extended, by this pass. The concerns are narrow and additive: two new enum values; one new derived-field definition; a set of Program-category content decisions for the activities that don't have one yet; and an open product decision on whether Forge will ever author mixed-modality programs itself.

### 10.3 Recommended next workstreams, in dependency order

1. **Pace/Speed Definition Note** — smallest, highest-leverage item found. Formally define the computation already assumed by three locked documents (likely `distance ÷ duration`, with a display unit-conversion rule). Nothing downstream of Progress's Endurance profile or History/Detail's "Avg Pace"/"Avg Speed" fields can be considered complete until this exists.
2. **ActivityType Enum Decision (Hiking, Rowing)** — append both to the existing, append-only-by-design enum; classify both into the existing Endurance family (PH-D8) and the existing Personal Improvement Endurance signal (O-2 Amendment 001 §7.1). No new logging mechanic required — both reuse existing continuous-timer screens structurally.
3. **Program Category Decision** — a product decision, not an architecture problem: does Forge author Walking/Hiking/Swimming/Rowing Program content at launch, and does Cycling's existing creator-marketplace deferral still hold given this evaluation's "approved for launch" framing of Cycling?
4. **Honors Endurance Family** — once pace/distance fields are formal (Workstream 1), author a new evaluator family mirroring Strength's milestone-ladder shape (distance PRs, pace PRs) — the largest single piece of unblocked, currently-empty catalog potential identified in this evaluation.

### 10.4 Should endurance become a first-class architecture domain?

**Largely already is.** The recommendation emerging from this evaluation is not "build a new domain" — it is "finish populating a domain whose foundation was already built." Taxonomy, Goals, Progress, and three of four Rank categories were already constructed to be activity-type-generic, by independent, individually-justified decisions made well before this objective was framed. What remains is two enum values, one field definition, and content authoring (Honors, Programs) — not a parallel architecture effort alongside the existing strength-built systems.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial Endurance & Multi-Activity Architecture Evaluation across all ten requested sections. Key finding: the architecture is substantially more endurance-ready than the evaluation's framing assumed — `ActivityType` already contains Run/Walk/Bike/Swim, and Goals/Progress/3-of-4 Rank categories are already activity-type-agnostic by deliberate, pre-existing locked decisions. Identified the four real gaps: Hiking/Rowing absent from the enum, an undefined pace/speed computation assumed by three locked documents, zero endurance Honors content (with ready plumbing), and a Forge-authored-Program content gap (Running only; Cycling deferred to marketplace; Walking/Hiking/Swimming/Rowing have no category). No schemas, amendments, honors, or Rank redesign authored — evaluation only, per Rules 9/10. |

---

*Endurance & Multi-Activity Architecture Evaluation — v1.0*
*Forge Legacy | June 2026*
