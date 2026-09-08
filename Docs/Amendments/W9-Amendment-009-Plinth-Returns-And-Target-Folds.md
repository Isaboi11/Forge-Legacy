# W-9 Amendment 009 — The plinth returns, and `Target` folds into `Reps`

**Amends:** `W9-Amendment-008-Hero-Card-Loses-Last.md` (§2 layout) and `W9-Amendment-007-Per-Set-Prev.md` (§2 placement)
**Touches:** the expanded lifting hero and the set table in `src/app/workout.tsx`; the `w-hero` / `w-sets` tour steps
**Status:** 🔒 LOCKED
**Date:** 2026-09-08 (PO decision — second pass the same day as A8)
**Design authority:** ⚠ **a new handoff supersedes both the `.dc` and A8's override.** See §5.

---

## 1. What the PO handed over

An Option-3A design handoff for the Active Workout exercise screen — README, a static HTML reference,
four screenshots — chosen after four rounds of exploration. With it:

> *"I want to adjust the active workout screen… Keep the animations and the way the card closes after
> the first set the same. We are just rearranging the screen basically. Functionally all the same."*

Two things move:

* The hero's scattered metadata becomes an **aligned three-column plinth** across the card's foot.
* The set row **loses the `Target` column**. The goal rep count becomes a **faded numeral inside the
  Reps field**, and **`Prev` is promoted** from a subline under each row into a real left-aligned
  column. Rows go from ~110pt to ~58pt.

**W9-A9-D0 — "functionally all the same" is the governing constraint, and it is the reason for §3.** A
rearrangement that quietly drops a fact is indistinguishable from one that keeps it until the athlete
under the bar is the one who notices. Every fact the `Target` column carried is accounted for below,
and `workout-plinth-and-row.test.mjs` asserts each landing.

---

## 2. The plinth comes back — and this is not a reversal of A8

A8 was written this morning and deleted a three-column plinth. This restores one. That reads as a
reversal and is not, because **what the PO objected to was a duplicate, not a band**:

> *"With the previous being under each set, as well as in the hero card, it feels repetitive. I would
> want to keep under each set."* — PO, 2026-09-08

The offending column was `Last` — the top set of the last saved session — which W9-A7 had just
re-printed under every row as `Prev`. A8-D1 removed the duplicate; having only two figures left to
align, it removed the band that aligned them too.

**W9-A9-D1 — The third column is the NOTE, so nothing on the band duplicates anything.**

| Column | Source | Also on this screen? |
|---|---|---|
| `Goal` | `goalTextFor(ex.sets)` | echoed in the Reps field's faded numeral and the collapsed strip |
| `Best` | `liftHistory.best` + `achieved_on` | **no** — the only record surface inside a session (A8-D2) |
| `Last Time` | `lastNotes[…]` — **the athlete's note** | **no** |

`Last Time` is prose the athlete wrote to themselves last session. It is the one fact on this card that
exists nowhere else on the screen and the thing most worth reading while setting up. The numbers stay
in the table, where D2 below gives `Prev` a column of its own.

Everything A8 decided about the two surviving figures is kept verbatim: `Goal` keeps its 22–24pt bronze
figure, its pencil, `setGoalOpen` and `SetGoalPanel` (A8-D1a — a control must not be demoted by being
moved); `Best` keeps its em-dash-means-never and its local-midnight date (A8-D2, A8-D5); the sub-lines
take `gray400` and not `gray600`, because Alabaster's `gray600` measures 3.15:1 and fails the 4.5 text
floor (A8-D4, A7-D5).

**W9-A9-D1a — The note column is truncated to two lines, and that is only honest because `Read note`
exists.** A note runs to 280 characters and the column is a third of a card. Two lines plus an ellipsis
plus a tap that opens the full text in the screen's existing sheet chrome. Without the tap this would
be a note the athlete cannot read.

**W9-A9-D1b — With no note, the column is not drawn at all** and the plinth falls back to two columns
at half the card each. A labelled em-dash is a hole; two columns is simply a card that says less.

---

## 3. `Target` folds into `Reps` — and the four things it carried

**W9-A9-D2 — The column is not deleted, it is folded.** On a set nobody has done yet, the ask and the
answer are the same number, so they share one slot. Three inks carry the state:

| Ink | Means |
|---|---|
| `gray600` | this is what was **asked**. Nobody has answered. |
| `bronze300` | this is what **you said**, and the set is not logged. |
| `cream100` | **logged**. |

⚠ **That colour difference is now load-bearing.** With no Target column beside it, ink weight plus the
check circle is the whole distinction between a pending set and a finished one. It must not be weakened.

The column carried four things and only one was a rep count. Each has a new home:

| Carried | Was | Now |
|---|---|---|
| the rep target, incl. a range `10-12` | `targetRepsText` in the Target cell | the faded numeral in the Reps field |
| `toFailure` | `F Max` | `MAX`, same slot, same faded ink — never `0`, which `targetReps` literally is |
| `targetSec` | a clock in the Target cell | the clock in the same slot (and `HoldTimer` still replaces the field entirely on the live row) |
| `ex.per` — "per leg" | a caption under every row | the **Goal plinth's sub-line**: `Today · per leg` |
| `set.targetWeight` — a % program's bar | a caption under every row | a **faded numeral inside the Weight field** |

**W9-A9-D2a — `per` moves to the card, not to a row, because it describes the EXERCISE.** Saying it once
beats saying it three times down a table. It could not simply go: `per-side-core`'s own header is
explicit that its absence *"does not leave a gap on screen — it leaves a different, complete-looking
prescription, and no way to tell"*, i.e. an athlete does thirty reps where sixty were prescribed.

**W9-A9-D2b — A prescribed bar is shown faded, never pre-filled, and the reason has not changed.**
`prefillWeight`'s header: a weight written onto an untouched set records a lift nobody made and can
announce a personal record for it. Faded ink is an ask; only the athlete's tap makes it an answer.

**W9-A9-D2c — A figure that will not fit is set smaller, never clipped.** `10-12`, `MAX`, `0:45` and
`102.5` all overflow the design's 20pt in a 54–70pt field, and `102.5×5` or a ladder goal `4×6-6-4-4`
overflow 24pt in a third of a card. `plinthFigureStyle` and `fieldNumSm` step the type down.
**Not `adjustsFontSizeToFit`** — that is iOS-only and does nothing on the web preview the PO tests.

**⚠ W9-A9-D2d — THE ACCEPTED COST, stated because the handoff states it.** There is now nowhere to show
a per-set target that differs from the exercise goal *at a glance*: the row shows its OWN target, so a
descending scheme still reads correctly row by row, but the plinth's single `3×8` is the only summary.
`goalTextFor` already renders a ladder as `4×6-6-4-4` for exactly this reason, so the summary stays
honest. If per-set targets ever need to be compared side by side, 3A is the wrong row.

---

## 4. `Prev` becomes a column, and on the live row a control

**W9-A9-D3 — A9 overrules A7-D2's placement and keeps A7-D3's rule.** A7 put `Prev` under the cells
because there was no room for a sixth column beside `Target`. There is now. The rule is untouched: the
same set POSITION from the last SAVED session, so set 3 answers to last week's set 3.

A7's *"no tap, no chevron — should be there always"* is honoured and improved on: it is still always
there, on done rows too now, and the row is ~52pt shorter for it.

**W9-A9-D3a — On the live row it is a button that fills the weight. One tap, one way.**

* It writes the **weight and nothing else**. `buildSaveExercises` filters on `s.done`, so a weight on an
  unlogged row is never persisted and can never announce a PR — the identical guarantee pending rows
  have always had when pre-filled through the sheet.
* It writes through `exactWeight`, the same converter `wxr` uses to display it. `liftHistory` holds
  canonical **pounds**; a live session's `set.weight` holds what the athlete typed. Writing the raw
  history number would hand a metric athlete `225` for the `102.5` they are reading.
* **One-way.** The reference prototype toggles for demo purposes. An athlete who has since typed 155 and
  taps `Prev` again to re-read the number must not have their own figure silently reverted.

**W9-A9-D3b — This is the one BEHAVIOUR added by a change billed as a rearrangement.** It is in the
handoff (README §Interactions, "the one-tap same as last time path") and is called out here rather than
folded in silently.

---

## 5. The design-authority position

**W9-A9-D4 — The Option-3A handoff supersedes `Forge Active Workout.dc.html` for this screen**, and
supersedes A8-D6's recorded divergence with it. A8's divergence note is now history rather than a
standing delta: the build no longer draws `Goal` and `Best` in the meta column, and the `.dc`'s
`Last · Goal · Best` row is no longer what the build is being measured against either.

**W9-A9-D5 — The `.dc` is not edited here**, for the reason A7-D6 and A8-D6 both give: recording an
override in an amendment is how this project overrules a design file, and editing the file to match the
code destroys the record of which way the decision went. The divergence is now:

> `Forge Active Workout.dc.html` draws a `Last · Goal · Best` insight row and a five-column set table
> with a `Target` column. The build draws a `Goal · Best · Last Time (note)` plinth and a six-column
> row with `Prev` promoted and `Target` folded into `Reps`, per the Option-3A handoff of 2026-09-08.

A `design-gate` run on W-9 reports this as a delta. **Expected, DEFERRED-HONEST, not a regression.**

**W9-A9-D6 — This closes W9-A8-D3a, which was left OPEN.** A8 wanted the design's `exTags` + `exMuscles`
on the section line and could not build it: `muscles.json` renders `lats` as *Latissimus Dorsi*, and
`MAIN LIFT · LATISSIMUS DORSI` at 12pt uppercase overflowed a ≈194pt meta column. A8 called that *"a
layout question of its own"*. 3A answers the layout question — its own line, sentence case, 12.5pt,
wrapping allowed — so the data lands unchanged: equipment, then the two muscles the catalogue lists
first. Omitted entirely for a lift the catalogue does not cover.

---

## 6. What did NOT change

Explicitly, because the PO asked for it:

* **The auto-collapse.** `autoCollapsed` in `completeSet` still closes the hero on the first resolved
  set; the collapsed strip is byte-for-byte what it was, section kicker and all.
* **Every animation.** `FuseFlash` on a logged row, `Pop` on an edited cell (and now on a `Prev` fill),
  the `scale: 0.96` press depth on every control.
* **The set-entry sheet**, wheel mode, the keyboard primer, `HoldTimer`, `SetGoalPanel`, the rest timer,
  the coach coin, supersets, cardio blocks, the exercise note row, Add Set / remove-set.
* **The green DONE language.** The handoff does not prototype a completed row; the app's green ring,
  green check and tap-to-uncomplete are kept rather than replaced with the design's cream-on-pending.
* **The trash is still absent — not greyed — on a single-set exercise**, per `removeSet`.

Two deliberate deltas from the handoff, both to keep an existing decision intact: **Add Set keeps its
dashed *bronze* border** (the handoff draws it charcoal; the treatment is what distinguishes it from the
exercise-note row directly below), and the **cards keep `charcoal900`** rather than moving to the
design's `surface-card` gradient, which would be a two-theme colour change outside this rearrangement.

---

## 7. As built — 2026-09-08

| File | Change |
|---|---|
| `src/app/workout.tsx` | `heroRow` → `heroUpper` (104×145 art, stretch, `marginTop: 'auto'` How To pill); new `heroAttrs` run; new `plinth*` styles + the three-column band; `readNote` state + full-note sheet; `prevWeightAt` / `fillFromPrev` / `bestFigure` / `plinthNote` / `catalogItem` / `heroAttrs`; module `plinthFigureStyle`; six-cell `rowCells` with `space-between`; `cPrev`/`cReps`/`cCheck` added, `cTarget`/`cActual` retired; `fieldBox*` / `fieldNum*` / `emDash` / `prevCell*` / `holdCell` added; `heroGoal*`, `heroBest*`, `lastNote*`, `target*`, `actual*`, `weightBtn`, `weightText`, `repsLabel`, `setCell`, `prevLine`, `prevTag` retired; `exactWeight` imported |
| `src/domain/onboarding/tour-plan.ts` | `w-hero` no longer teaches a `Last` column deleted in A8; `w-sets` no longer teaches `Target` vs `Actual` |
| `src/domain/onboarding/__tests__/tour-plan.test.mjs` | the `/Actual/` assertion becomes the claim it stood for — the printed number is the plan, you overwrite it with the truth, and `Prev` is a control |
| `src/app/__tests__/workout-plinth-and-row.test.mjs` | **new** — 17 source guards: every landing in §3, the fill's write scope, that `Last` does not return with the band, and the layout rules the row depends on |

## Change Log

| Date | Change |
|---|---|
| 2026-09-08 | Created and locked. Supersedes W9-A8 §2 and W9-A7 §2; closes W9-A8-D3a. |
