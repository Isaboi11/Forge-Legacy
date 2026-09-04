# W-9 Amendment 007 — `Prev` on every set that has not been done

**Amends:** `W9-Amendment-005-Active-Workout-Coach-And-Lift-History.md` §A5 (per-set `Prev` declined)
**Restores:** `Active-Workout-Flow-Spec-W9-W16.md` §5.5, which asked for this and was overruled
**Status:** 🔒 LOCKED
**Date:** 2026-09-04 (PO override, same day)
**Design authority:** ⚠ **no `.dc` for this.** See §4.

---

## 1. What the PO decided, and what it overrules

> *"We want to add it, so I'm sure we can put it in there without making it look too crowded or busy.
> Scope it out and figure out what's going to look and flow the best. We do not want to have to tap to
> see it. Should be there always."* — PO, 2026-09-04

**W9-A5 §A5 declined exactly this**, and its reasoning was sound:

> *"Follow the `.dc`: `Prev` goes in the collapsed hero strip, indexed to the current set position. It does
> **not** become a fifth column — the table is already `Set · Target · Weight · Actual` at phone width, and
> the design does not add one either. Spec §5.5's 'on pending rows' reading is superseded by the `.dc` per
> **PD-7**."*

**W9-A7-D1 — A5's conclusion is overruled; its arithmetic is not.** The PO has asked for the feature. The
width constraint A5 was protecting is real and is honoured — this adds **no column**.

### The arithmetic, re-checked, and worse than A5 thought

| Cell | Width |
|---|---|
| `cSet` | 56pt fixed |
| `cTarget` | `flex: 1` |
| `cWeight` | `flex: 1` |
| `cActual` | `flex: 1.05` |
| `cTrash` | **22pt fixed** |

A5 described the table as four columns. **It is five** — `cTrash` was added afterwards and A5's own
sentence is now out of date. At iPhone width the row is ≈330pt; minus 56, minus 22, minus four 6pt gaps
leaves ≈228pt across three flex columns, **≈75pt each**. A sixth column would cut them to ≈57pt. A5 was
not merely right, it was under-stating.

---

## 2. Where it goes — a subline, not a column

**W9-A7-D2 — `Prev` renders as a line UNDER the cells, inside the same row.** `styles.row` becomes a
column; the five cells move into a `rowCells` child. The border, background and done/current highlight
still wrap the whole row, so nothing about the row's existing states changes.

Format: `PREV 185 × 10`, indented 62pt so it starts under the data rather than under the set number —
the one part of the row it says nothing about. Weight is rendered through the same `wxr` the hero strip
uses, so it follows the athlete's unit setting.

**W9-A7-D3 — Indexed to the same set position, from the last SAVED session.** Set 3 answers to last
week's set 3, not to the best set of that day — that is the comparison an athlete is making when they
load the bar. `sessions[0]` is the most recent saved workout, so today's work in progress can never
appear and a set cannot be compared against itself.

**⚠ W9-A7-D4 — NOT on a done row, and this is the reading of "always" that keeps the table calm.** Once a
set is finished the athlete's own number is in the Actual cell, and last week's beside it is noise on the
busiest row in the table. Every set they have **not** done carries it — which is when the number is any
use — so the list gets *quieter* as the session goes on rather than denser. That is the direct answer to
"without making it look too crowded or busy."

The PO's "always" was stated in contrast to *tapping*, and no tap is required anywhere. If it reads
better on every row, `!isDone` in `workout.tsx` is the single condition to remove.

**⚠ W9-A7-D5 — `gray400`, not `gray600`, and that is a contrast decision.** `foundation.paper.ts` puts
`gray600` at `#8B8377`, which its own header measures at **3.15:1** — clearing the 3.0 non-text floor and
**failing** the 4.5 needed for text. This line is text and must be readable in Alabaster as well as Forge,
so it takes the role that clears the bar in both. ⚠ This is a **layout** change, so it lands in both
themes and both need looking at.

---

## 3. What this does NOT change

- **The collapsed hero strip keeps its `Prev`.** A5 put it there and it is still right there: it answers
  "what am I about to do" while the card is collapsed and no rows are visible.
- **No new query.** `liftHistory` is already fetched per lift for the hero strip, Last/Best and the
  progression engine. This reads the map that is already in memory — `workout.tsx:1790` already used
  exactly this accessor shape.
- **No migration.** W9-A5 §2.6 established that everything needed is already stored and populated.

---

## 4. ⚠ The design-authority debt this creates

**PD-7 makes the `.dc` the authority, and the `.dc` does not have this.** `Forge Active Workout.dc.html`
shows `Prev` in the collapsed hero strip only. A5 deferred to that file; this amendment overrides it on
the PO's instruction.

**W9-A7-D6 — The `.dc` is not edited here.** Recording an override in an amendment is how this project
overrules a design file; editing the design file to match the code would destroy the record of which way
the decision went. The divergence is now:

> `Forge Active Workout.dc.html` has no per-set `Prev`. The build does, by PO override of 2026-09-04.

A `design-gate` run on W-9 will report this line as a delta. **It is expected, and it is DEFERRED-HONEST,
not a regression.**

---

## 5. As built — 2026-09-04

| File | Change |
|---|---|
| `src/app/workout.tsx` | `prevAtIndex()` beside `wxr`; `rowPrev` per row; `styles.row` → column + new `rowCells`; new `prevLine` / `prevTag` |

**Gates:** `tsc --noEmit` clean · `expo lint` at baseline (1 pre-existing error, 14 pre-existing warnings)
· **3224 tests pass, 0 fail**.

⚠ **Not yet seen on a device or in Alabaster.** This is a layout change to the densest table in the app,
and the one thing it was asked not to be is crowded. It needs eyes on a real phone in both themes before
it is called done.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-04 | PO overrode W9-A5 §A5's refusal of a per-set `Prev`. Honoured A5's width constraint by adding a subline rather than a column — and corrected A5's own arithmetic, which described a four-column table that has had five columns since `cTrash` was added. Restricted to not-done rows as the reading of "always" that answers the PO's own crowding concern. Chose `gray400` over `gray600` on measured Alabaster contrast. Recorded the `.dc` divergence rather than editing the design file. |
