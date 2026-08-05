# W-26 Amendment 001 — Forge Ships Templates, and the Empty State Stops Being the First Thing

**Amends:** `Workout-Templates-Hub-Spec-W26.md` §1 (Screen Purpose) · §4 (Empty State) · §5.1 (Actions) · §10 (Non-Behaviors)
**Status:** 🔒 LOCKED
**Date:** 2026-08-04
**Design authority:** `design_reference/Forge Modal Library Design/forge-templates.js` `seeds()` · `Forge Strength Start.dc.html`
**Not amended:** `Free-Workout-Builder-Spec-W25.md` · `Workout-Template-Detail-Spec-W27.md`

---

## Section 1 — The gap

### W26-A1-D1 — Every door into a template required the athlete to have already made one

Templates come into existence two ways, and both presuppose the athlete:

- **Capture** (0091) — train a session, and The Record offers to keep its shape.
- **Author** (W-25, `/workout-builder`) — plan a session before you train it.

Neither answers *the first time somebody opens this screen.* W-26 §4's empty state — "No templates
yet" — was therefore the first and only thing a new athlete saw under a heading that had promised
them templates. The screen was working exactly as specified and still amounted to a locked door.

Meanwhile `Forge Strength Start.dc.html` has read, since it was drawn and since W25-Amendment-001
quoted it verbatim into the build:

> **From a template** — "Start a workout you've saved — **or one built by Forge**."

The second half of that sentence has never been true. This amendment makes it true.

### W26-A1-D2 — Forge ships six starter templates

**Locked.** Push Day · Pull Day · Leg Day · Full Body Express · Upper Body · Lower Body.

The first four are **the design's own content**, lift for lift and set for set, from
`forge-templates.js` `seeds()`. Upper Body and Lower Body are added to cover the other common split,
built from the same movements. Six is a shelf; twenty would be a catalogue, and the catalogue this
product has is the Program catalogue.

Definitions live in `src/domain/workout/starter-templates/`, shaped as `TemplateExercise[]`
**verbatim** so adopting is a straight jsonb write with no conversion layer — W-27, the Hub, W-25's
editor and `template_detail()` all read an adopted starter without knowing it was one.

---

## Section 2 — Shipped as definitions, adopted as copies

### W26-A1-D3 — A starter is a definition; taking one writes the athlete their own row

**Locked.** The same model the built-in Program catalogue already uses (`adoptCatalogProgram`,
`programs.source_definition_id`). `workout_templates.source_definition_id` records which definition a
row came from. Migration **0115**.

From the moment it is taken it is an ordinary template: editable in W-25, renameable, deletable, and
accruing its own history through `workouts.template_id`.

**The rejected alternative was seed rows with `athlete_id is null` and a read policy.** It fails on
three counts that are structural rather than aesthetic:

1. **`save_workout` would silently drop the attribution.** It re-checks `where id = p_template_id and
   athlete_id = v_uid` and degrades to an unattributed workout otherwise. Every session trained from a
   Forge template would lose its `template_id`, and W-27 would show no history for the one kind of
   template everybody used.
2. **`use_count` would become a global number.** 0095's header is an extended argument that the count
   must be DERIVED from `workouts.template_id` and never stored. On a shared row that derivation
   yields how many times *every athlete on the platform* has trained Push Day, printed on a screen
   that means "how many times you have". That is a worse defect than the stored counter 0095 refused
   to build.
3. **Copy-on-write is required either way.** The athlete must be able to edit their copy, so seeding
   defers the fork rather than removing it — and leaves two representations of one thing.

### W26-A1-D4 — An app update never rewrites what an athlete already took

**Locked.** Editing `push-day` in a future release changes what is *offered*, not what anyone *holds*.
Identical to the contract a live program holds against its catalogue entry.

Adopting the same starter twice **resumes the existing copy** rather than forking it — checked in
`adoptStarterTemplate` and backstopped by a partial unique index on
`(athlete_id, source_definition_id)`.

---

## Section 3 — What changes on screen

### W26-A1-D5 — A "From Forge" shelf above the athlete's own list

**Locked.**

- Rendered **above** "Mine", from the bundled definitions — no query, no latency, works offline.
- **Filtered against what the athlete has already adopted.** A starter you have taken belongs in your
  list, not on a shelf offering it to you again.
- The card body **previews** (`/starter-template/[id]`); only the action on the preview writes
  anything. This preserves W26-D5's rule that the card body and the action are distinct tap targets —
  a body tap must never mutate.
- Adopted rows carry a small **FORGE** pill. It reads as provenance; the row is genuinely the
  athlete's and Remove still removes it.
- **Sort order is untouched.** W26-D1's `last_used_at desc nulls last, created_at desc` governs
  "Mine". The shelf is a separate section in a fixed authored order, not an entry in the sorted list.

### W26-A1-D6 — §4's empty state now requires BOTH lists to be empty

**Locked.** The condition moves from "the athlete has no templates" to "the athlete has no templates
**and** every starter has been adopted". A brand-new athlete's first Templates screen is six ready
sessions, which is the entire point of this amendment.

The empty panel and its copy are otherwise unchanged, and stay for the case that now produces it:
every starter taken and every copy deleted.

**This is not a violation of §4's bar on placeholder content.** A starter template is real: it names
real catalogue exercises with real prescriptions, and it can be trained. §4 bars a *picture* of
content where there is none.

### W26-A1-D7 — The preview is a new route, not a mode on W-27

**Locked.** `/starter-template/[id]` — read-only, one action ("Add to My Templates"), then
`router.replace` onto the real W-27 for the athlete's own copy.

**W-27 is untouched.** It is a surface over a row the athlete owns — edit, duplicate, rename, delete,
history. A definition has none of those, so a "not yours yet" mode would put four disabled actions and
an empty history on the screen whose whole job is those actions. It would also drag W-27's "not a
sharing or publishing surface" clause into a question nobody asked: **nothing here shares anything
between athletes.** Forge offers; the athlete takes their own copy.

### W26-A1-D8 — `StartStrengthSheet` needs no change

**Locked.** Its "From a template" row already routes to W-26 and already reads "…or one built by
Forge." The copy simply becomes true.

---

## Section 4 — Known limit, recorded rather than worked around

⚠ **Isometric holds cannot be prescribed.** The design's Leg Day cools down with a **Plank at "45
reps"**, which means 45 *seconds*. `TemplateExercise` carries `targetReps`, and `targetDurationSec`
for cardio blocks only — a strength row has no way to express a hold.

**The plank is omitted rather than shipped as a prescription for forty-five planks.** This is a
pre-existing limit of the template model — W-25's builder has exactly the same gap — and is recorded
here rather than papered over. When a hold becomes expressible, the cool-downs come back.

---

## Section 5 — Verification

A typo'd `catalogKey` survives tsc, lint and every other test in this repo — it is a string, and it is
a perfectly good string. It fails at exactly one moment: a brand-new athlete taps the first thing
Forge ever offered them, and gets a lift with no detail page.

`src/domain/workout/starter-templates/__tests__/definitions.test.mjs` is the guard. Ten assertions,
run under `node --test`: every key resolves in the real 794-exercise catalogue, none is hidden from
the picker, **every displayed name matches the catalogue name** (the name is snapshotted on adopt, so
a drifted label becomes permanent on the athlete's row), sets and reps are positive integers, every
row has a real section and none claims to be cardio without cardio targets, every template has main
work, and the ids are unique stable slugs — because an id becomes `source_definition_id`, is written
into athlete rows, and is what the unique index dedupes on.

**End to end, on a fresh account:** Templates shows six Forge cards above the empty panel → Push Day →
preview → Add to My Templates → land on W-27 with six exercises, "Times used 0", no history → back to
the Hub: it is in Mine with a FORGE pill and gone from the shelf. Adopt it twice: one row, not two.
Edit it in W-25 and the shipped definition is unchanged. Train it and finish: "Times used 1" plus a
history row — **which is the proof `save_workout`'s ownership check passed**, and therefore the proof
that W26-A1-D3's whole argument holds.
