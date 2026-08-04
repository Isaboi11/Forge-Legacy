# W-9 Amendment 004 — Supersets, and the Bottom Bar's Second Button

**Amends:** `Active-Workout-Flow-Spec-W9-W16.md` (v1.5) — §4.1, §4.2, §5.1, §6.2, §13.2, §15.4
**Status:** 🔒 LOCKED
**Date:** 2026-08-03
**Origin:** PO feedback from a live training session on the web preview.

---

## Section 1 — The bottom bar's second button is Add Exercise, not End Workout

### W9-A4-D1 — The sticky footer is `[ Add Exercise ] [ Next Exercise / Finish Workout ]`

§4.1's wireframe and §4.2's "End Workout CTA (sticky bottom)" specified a single sticky End Workout.
The build had drifted to two buttons, and on the **last exercise both of them called the same handler**:
the secondary read "End Workout" and the primary read "Finish Workout", side by side, doing the same
thing. Meanwhile the action an athlete mid-session actually reaches for — adding a lift — was three taps
deep in the ⋯ overflow.

The secondary slot now holds **Add Exercise**.

**Ending is not lost.** It has three remaining doors, which is two more than it needs:

1. The primary button **is** "Finish Workout" once you are on the last exercise.
2. **⋯ Options → End workout** — and this one now carries the §13.2 guard the footer button never had
   (see W9-A4-D2).
3. **← Exit** still offers Save & Exit per §12.

### W9-A4-D2 — §13.2's minimum-save gate applies wherever a session can be ended

§13.2 has always said "End Workout is blocked (greyed, with label *Log at least one set to save*) if
zero sets have been logged". The footer button was never disabled — `primaryDisabled` guarded only the
primary — so an empty session could be committed from the secondary. The ⋯ row now disables with that
exact label. The rule is unchanged; it is now enforced everywhere it applies.

---

## Section 2 — Supersets

### W9-A4-D3 — A superset is a BLOCK, extending the existing circuit model

§15.4 previously covered supersets in one line, under "Same Exercise Listed Multiple Times": *"An
athlete may add the same exercise more than once in a free workout (a common pattern for superset and
circuit structures). Each instance is a separate exercise card with independent set records."* That
describes a workaround, not a feature, and it does not survive contact with the way a superset is
actually trained.

The session model has carried **circuit membership** since 0096 — `groupId` / `groupName` /
`groupRounds` / `groupCapSec` on every exercise, resolved by ADJACENCY. A superset is the same grouping
performed differently, so it extends that model rather than inventing a parallel one:

```
groupKind?: 'superset' | 'circuit'      // ABSENT READS AS 'circuit'
```

Absent means circuit because **every block that existed before this was one** — the shipped programs,
the Bridger Logan import and every AMRAP render exactly as they did.

A superset is: **2–4 adjacent exercises · one `groupId` · `groupRounds` = the set count · no
`groupCapSec`.**

### W9-A4-D4 — In the logger it is ONE merged card, alternating, round by round

The superset replaces the hero and the set table for its members — it does not sit above them. Drawn as
separate cards, the athlete would page between exercises between every single set, and §7's rest overlay
would fire in the middle of a round, which is the one thing a superset exists to avoid.

```
┌───────────────────────────────────────┐
│  SUPERSET  ·  Round 2 of 3       [⋯]  │
├───────────────────────────────────────┤
│  A  Barbell Bench Press               │
│     Set 2   135 lb × 8   ✓            │
│  B  Bent-Over Row                     │
│     Set 2 → [      Log Set      ]     │
├───────────────────────────────────────┤
│  ①  ②  ③   + Round                    │
└───────────────────────────────────────┘
   No rest between them — the timer starts once the round is done.
```

Rules:

- **Advance is ROUND-MAJOR** — A1 → B1 → A2 → B2. Not all of A then all of B.
- **§7 rest is suppressed between members and fires after the last member of a round.** This is the
  behavioural definition of a superset and it is the only §7 exception in the spec.
- **Rounds = the LONGEST member's set count.** A 3-set press paired with a 4-set row gives four rounds,
  and the fourth simply has one lift in it. Taking the minimum would hide work already logged.
- Tapping a member's name opens that exercise on its own; the nav dots treat the block as one stop.
- **Circuits and AMRAPs are unchanged** — they keep §4.3's banner and their clock.

### W9-A4-D5 — Supersets are created in three places and mean the same thing in all of them

| Where | How |
|---|---|
| **Active workout** (W-9) | ⋯ Options → "Superset with next exercise" · "Break the superset" |
| **Program Builder** (W-24) | A link affordance between adjacent rows within one section |
| **Free Workout Builder** (W-25) | The same affordance, same helpers |

Pairing **extends** an existing superset rather than forking a rival block beside it, and members are
always made adjacent — the resolver walks by adjacency, so a pairing whose members sat apart would
silently read as two separate one-member blocks.

### W9-A4-D6 — A superset survives being saved

`workout_exercises` gains `group_id` / `group_name` / `group_kind` / `group_rounds` (**migration 0106**),
`save_workout` writes them, and `save_workout_as_template` carries them into the template. Without this
a pairing created in-session existed until Finish and then did not: Activity Detail showed two unrelated
exercises, and a template saved from that session kept no memory of it.

`save_workout`'s 11-argument signature is **unchanged** — the fields ride inside the `p_exercises` jsonb.

> **Supersedes** `Program-Authoring-Standard-v1.0.md` §567 ("The schema does not natively support
> superset groupings at MVP … indicate this in `notes`"). See
> `Program-Authoring-Standard-Amendment-001-Superset-Encoding.md`.

---

## Section 3 — Set logging (§6.2, restored)

### W9-A4-D7 — One Set Input Sheet: weight and reps together, one "Log Set"

§6.2 has always specified a single sheet carrying **both** fields under one primary action. The build
had two single-field pickers, so logging one set was three modal trips — weight, then reps, then a
separate tap on a green check the athlete had no reason to expect. This restores the spec.

- **Typing is the default; the wheel is opt-in and persisted per athlete.** The wheel shipped as the
  default and it is the wrong default: typing "135" is three taps on a keypad everyone knows, where the
  wheel is a scroll to a target moving under the thumb. It stays available — it is genuinely better for
  nudging 135 → 140 — as the thing you opt into.
- **"Log Set" writes both values AND completes the set.** Editing an already-logged set writes only: no
  second rest timer, no repeated PR toast.
- The **Actual** column gets the same bordered-input treatment and pencil the Weight column already had.
  It was a bare label beside an emphatic button, so the one number an athlete most often changes read as
  a printed target.

### W9-A4-D8 — `weight: 0` means BODYWEIGHT; `weight: null` means nothing was entered

A **BW** chip in the sheet writes `0`. The two states are distinct and render differently — `BW` versus
`—` — because a warm-up done with an empty bar is **not** a bodyweight set, and the app must not decide
that it was.

Consequences, all of which follow from the distinction rather than being special cases:

- **A set is counted because it was logged, not because it carried a load.** The completion screen
  filtered its per-exercise count on `weight != null`, so three unweighted warm-up sets reported
  **"0 sets"** beside a header that said 3. Volume and top-set still require a load, correctly.
- **A bodyweight set sets no weight record.** A record measured in pounds cannot be 0 of them, and the
  first chin-up anybody logged would otherwise have written "Pull-Up — 0 lb" into their personal records
  and announced it.
- Activity Detail renders `BW × 12`.

### W9-A4-D9 — Rest completion makes a small sound

§7 gains one line: when the rest timer reaches zero and the athlete's **Sound** preference is on, the
app plays a short, quiet ding. Rest expiry was a toast, which requires looking at the phone the athlete
has just put down. It is gated by the existing `sound` preference in P-4b — which is now real rather
than a recorded intent.

*Implementation note, because it decides whether the feature exists at all:* iOS Safari will not let a
`setInterval` make a sound. The audio context is unlocked from the athlete's tap on "Log Set" — the
action that starts the rest buys the permission to end it out loud.
