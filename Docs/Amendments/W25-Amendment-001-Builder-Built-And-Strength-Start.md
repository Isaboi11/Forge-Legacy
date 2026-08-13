# W-25 Amendment 001 — The Free Workout Builder Exists, and Strength Has a Front Door

**Amends:** `Free-Workout-Builder-Spec-W25.md` §2 (Entry Paths) · `Workout-Templates-Hub-Spec-W26.md` ·
`Workout-Template-Detail-Spec-W27.md` §Edit
**Status:** 🔒 LOCKED
**Date:** 2026-08-03 · **Addendum 2026-08-13** (Section 3, W25-A1-D8 — narrows W25-A1-D1: an *authoring*
door opens the builder, not the chooser)
**Design authority:** `Forge Strength Start.dc.html`, `Forge Free Workout Builder.dc.html`

---

## Section 1 — Start Strength: three doors, not one

### W25-A1-D1 — Every path into a lifting session asks how you want to begin

`Forge Strength Start.dc.html` has specified three answers since it was drawn:

| | Copy (verbatim) | Destination |
|---|---|---|
| **From a template** | "Start a workout you've saved — or one built by Forge." | Templates hub (W-26) |
| **Build it first** | "Plan every exercise, then start the session." | Free Workout Builder (W-25) |
| **Build as you go** | "Pick your first move, then add more as you lift." | Exercise Picker, fresh session |

The build applied the **third** as though it were the only one. Home's hero, Home's path card, Home's
"Something else today?", the Workouts `+` sheet, "Build a Workout" and even Templates' own "New" all
called `writeWorkoutLaunch({ freestyle: true })` and dropped the athlete into an empty session. A
template they had saved was reachable from Home only by remembering that Workouts → Templates exists,
and planning a session in advance was not reachable at all.

All six now open the chooser.

### W25-A1-D2 — One-tap into today's program session is preserved

When a program **is** active, Home's Start Workout still goes straight into today's prescribed session.
That one-tap is the reason the hero card exists; putting a three-way question in front of it would tax
the common case to serve the rare one. The chooser stays one tap away on the same card, under "Something
else today?".

The chooser therefore appears exactly where the app would otherwise have **assumed** build-as-you-go.

---

## Section 2 — The builder is built

### W25-A1-D3 — W-25 exists at `/workout-builder`

`templates.tsx` carried a considered explanation of why it did not:

> *"The design's 'New Template' opens a Free Workout Builder … That builder does not exist here, and
> building it would be the second answer to a question already answered: in this app a template is a
> session you ALREADY DID and want again (0091)."*

The first half of that reasoning stands and is worth keeping: capture is the better loop, because a
session you already did is a shape you know you can do, where one you author is a guess at your own
capacity. That is why capture shipped first.

The second half was wrong. It answered only half the question — **"I want to plan Thursday before
Thursday" had no door at all**, and that is precisely what the design's "Build it first" is for. The two
are complementary entries to one table, not rival answers.

### W25-A1-D4 — It is ONE DAY, and it is not the Program Builder

A template has no weeks, no per-week variation, no day letters and no "Save & go to Day B" — all of
which the Program Builder's day view carries because a program day is a day *of something*. Lifting that
view across would drag program semantics into a thing that is not a program.

What **is** shared is everything with a rule in it: the pure draft helpers (`clampSets`, `defaultReps`,
`pairWithNext`, `unpairAt`, `pairingAt`) and the Exercise Picker round-trip. So a superset authored in a
template and one authored in a program mean exactly the same thing.

> *Deviation from `Free-Workout-Builder-Spec-W25.md` §2.1, recorded rather than silent:* the spec's
> stated entry is W-26. Ours adds the Strength Start chooser as a second, and the W-27 Edit path as a
> third.

### W25-A1-D5 — The draft is durable

Adding an exercise **leaves the screen** — the Picker is a route, not a sheet — so the draft autosaves
to device storage on every mutation and is drained back on focus. Same shape and same reason as the
Program Builder's. It is cleared on account switch by `first-run.ts`, alongside the program draft: a
half-authored workout is another athlete's work, and Home would otherwise have offered it to whoever
signed in next.

### W25-A1-D6 — Saving offers both endings

**Save & Start** writes the template and launches it; **Save for later** writes it and lands on its
detail page. A workout you planned is usually a workout you are about to do — but not always, which is
the entire point of planning ahead.

A template with nothing in its **Main** section cannot be saved, matching the rule capture already
applies.

### W25-A1-D7 — W-27's "Edit" becomes a real edit

Template Detail's Edit was **Rename**, and its own header said why: *"a button labelled Edit that only
renames is exactly the kind of small lie this codebase keeps removing."* With the builder in place, Edit
opens the template in it — exercises, order, sets, reps and supersets. **Rename survives** in the ⋯
overflow, because changing only a title should not mean opening a builder and saving a whole shape back.

---

## Section 3 — Addendum, 2026-08-13: one of the six doors was not a training door

### W25-A1-D8 — An *authoring* entry point opens the builder directly, not the chooser

W25-A1-D1 named six doors that dropped the athlete into an empty freestyle session and routed all six to
the Start Strength chooser. For five of them that is right: Home's hero, Home's path card, Home's
"Something else today?", the Workouts `+` sheet and Start Workout with no active program are all asking
**how do you want to train right now**, and the chooser is the honest answer.

The sixth — **"Build a Workout", the create row at the foot of the Workouts tab's "Your Templates"
section** — is not a training door. It sits under a header naming the artifact it authors, and an athlete
who taps it has *already* answered the chooser's question. Sending them to a sheet titled "Start
Strength" answered *"author me a template"* with *"how do you want to begin?"*, and the builder they
asked for sat three taps away behind its middle option.

W25-A1-D1's own list contains the precedent for the fix: the Templates hub's "New" was never wired to the
chooser — it pushes `/workout-builder` directly. **The Workouts-tab row now does the same.** The
distinction the amendment was reaching for is not *which screen* a door leads to but *which question it
answers*: a door that starts training opens the chooser; a door that authors a shape opens the builder.

The **label stays "Build a Workout"** — it is what the builder calls itself and what the Templates hub's
primary button says, so all three doors to one screen agree.

**Reported by the PO, 2026-08-13:** *"I clicked on the build a template button in the workouts tab and it
took me to the same place the start workout would take me to."* Both doors did land in the same sheet;
that was the defect, and it was one this amendment introduced.

**Also corrected:** the guided tour's `wk-templates` step still taught the pre-W-25 world — *"'Build a
Workout' starts a session you log as you go"* and *"authoring a workout you've never done is guessing at
your own capacity"* — which W25-A1-D3 had already overturned by shipping the builder. Capture is still
described as the primary loop, because it is; authoring is now described as the second door, because it
exists.
