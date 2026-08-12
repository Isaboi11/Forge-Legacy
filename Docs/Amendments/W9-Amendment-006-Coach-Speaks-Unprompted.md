# W9 Amendment 006 — The Coach Speaks Unprompted

**Status:** LOCKED
**Date:** 2026-08-12
**Owner:** Product
**Amends:** `Active-Workout-Flow-Spec-W9-W16.md` §6.2, and extends `W9-Amendment-005` D-3
**Implemented by:** `components/forge/CoachSays.tsx`, `domain/coach/coach-says.ts`,
`domain/coach/intra-set.ts`, `app/workout.tsx`

---

## 1. What this changes

Until now every coaching line in the Active Workout was **passive**: it sat in a card and waited to be
read. W9-Amendment-005 D-3 lifted §6.2's ban for coaching *"in a card the athlete pulls into view"* —
*"a scoreboard tells you how you did, and a coach tells you what to do next."*

Two things now happen that did not:

1. **The line follows the athlete.** It moved out of the exercise hero and onto the coin, so it survives
   the rest of the session.
2. **Holt can raise something the athlete did not ask for** — the mid-set weight nudge (CI-D9).

The second is a genuinely new posture and is why this amendment exists rather than a code comment.

## 2. ⚠ The defect this fixes, which is most of the value

`THE PLAN SAYS` (the author's cue) and `HOLT SAYS` (`progressionFor`'s sentence) were both rendered
inside the exercise hero — **and the hero auto-collapses the first time a set resolves.** So the coach
spoke before the first rep and then said nothing for the remainder of the session, while a medallion sat
in the corner volunteering nothing and only opening a sheet.

The spec was being honoured and the athlete was still getting no coaching after set one. That is a
delivery bug, not a policy question, and no decision below was needed to fix it.

## 3. Decisions

**W9-A6-D1 — Everything the coach says comes from the coin.** One bubble, anchored to the mark, its flat
corner pointing back at it, tappable to answer. The exercise's written cue, the progression sentence and
the mid-set nudge share one surface, so *"who said that"* and *"how do I reply"* have one answer
everywhere in the app. PO: *"whatever the coach says, it should come from the coach coin."*

**W9-A6-D2 — One line at a time, most recent first.** `live` → `progression` → `planCue`. The athlete is
in front of a bar and the newest fact is the one that changes what they do next; a timeless technique cue
is still true in thirty seconds. **Null is a real answer** and draws the mark alone.

**W9-A6-D3 — The line is DERIVED, never fired.** It is recomputed on render rather than pushed as an
event, so it survives a set resolving, a sheet opening, or `holtHidden` taking the mark off screen —
nothing ever "showed" it, so nothing can cancel it. A cue the athlete has not read yet is not stale
because a number pad was open.

**W9-A6-D4 — Unprompted is permitted, and bounded.** `IntensityProfile.volunteered` caps unprompted
lines per session (0–3), `reminders` volunteers none, and the nudge fires at most once per exercise and
never on the last set — instructing a set nobody will do is commentary, and commentary mid-workout is
what §6.2 exists to prevent.

**W9-A6-D5 — ⚠ Nothing grades a set, at any intensity.** Every line names the next action; any
assessment is a conditional handed to the athlete, never asserted by Holt. This is the line between
W9-A-005 D-3's coaching and §6.2's scoring, and it is enforced by a test that walks every in-workout
line against a grading regex rather than by an author's restraint.

**W9-A6-D6 — `SessionCoachSheet` still never speaks unprompted.** `SessionCoachSheet.tsx`'s rule —
*"Mid-set, an unprompted line is an interruption of a working set"* — is unchanged. The bubble is not the
sheet: it is one clipped line in a corner the athlete can ignore, and the sheet remains tapped-only.

**W9-A6-D7 — Three lines, then tap.** A progression sentence runs ~90 characters and a cue is allowed
200; unbounded, that is a five-line panel over the set table — the *"it blocks things on screens"*
complaint that shrank the coach's reach originally. The sheet shows the sentence in full.

## 4. What did not change

| | Status |
| --- | --- |
| §6.2's ban on mid-workout **scoring** | Unchanged and reaffirmed (W9-A6-D5). |
| *"no timers that shame… Not motivated. Not competitive. Focused."* | Unchanged. Every line is an instruction. |
| `holtHidden`'s fourteen conditions | Unchanged. The coin still hides behind the number pad, ceremonies and the seal. |
| The ⋮ Options sheet's read-only "The plan says" row | Unchanged — it belongs to the plan, and the athlete edits their own note beneath it. |
| Workout Complete | Still deliberately not tutorialised or coached (ONB-D18). |
