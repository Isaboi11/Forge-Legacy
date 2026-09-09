# W-9 Amendment 011 — The hero becomes a stage, and the plinth steps back again

**Amends:** `W9-Amendment-010-Plinth-Hierarchy-And-Compression.md` (sizes and one label — no structure moves)
**Touches:** the expanded lifting hero, the collapsed strip, the set table heading and the rest overlay's anchor, all in `src/app/workout.tsx`
**Status:** 🔒 LOCKED
**Date:** 2026-09-09 (PO critique of the A10 build on device)
**Design authority:** `Forge Active Workout.dc.html` (Design `b029488a`), as amended here by PO review.

---

## 1. What the PO saw, and the reversal in it

A10 shipped on 2026-09-08 and the PO looked at it on the phone the next day. The verdict revises A10's
own compression note:

> *"I would actually revise my previous recommendation: I would make the hero/exercise card larger, but
> use that additional space primarily for the exercise animation/image — not for more information. Then
> I would substantially reduce the Goal/Best area. That would make the screen feel more like a hero
> exercise experience rather than a large information card."*

⚠ **THIS PARTLY UNDOES W9-A10-D3, AND THAT IS DELIBERATE.** A10's table records `art | 104 × 145 |
104 × 130` — the art was cut on the PO's *"compress the exercise information area ~10%"* note. A11 puts
it back and past it. **Both calls are the PO's and the later one governs.** Recorded here so nobody
reading A10's table "restores" the 130.

The hierarchy the PO states, which everything below serves:

| | | Weight |
|---|---|---|
| 1 | Exercise animation | large visual anchor |
| 2 | Exercise name | largest typography |
| 3 | Classification (`MAIN LIFT`) | — |
| 4 | Equipment / muscles | quiet metadata |
| 5 | `How To` | secondary action |
| 6 | Goal / Best / Note | **compact reference strip** |
| 7 | **Set logging** | **the interaction centre** |

---

## 2. The art becomes a stage

**W9-A11-D1 — 104 × 130 fixed → 112 × 148 minimum, stretching.**

> *"The exercise deserves a more substantial visual stage. I'd increase the image/animation area by
> roughly 20–25%… I wouldn't turn it into a huge square. I'd lean toward a slightly taller
> portrait-oriented exercise stage."*

112 × 148 is **+22.6% of area** — which is the reading *"20–25%"* is about; it is +7.7% and +13.8% on the
two edges. More portrait than what it replaces (0.757 vs 0.800).

⚠ **`minHeight` + STRETCH, NOT A TALLER FIXED BOX. This is what makes the change free**, and it is the
answer to the PO's own binding constraint (§4). `alignSelf: 'flex-start'` pinned a 130pt box beside a
meta column measuring ~141–165pt, so the slot sat in a well of its own dead space. Inheriting
`heroUpper`'s `stretch` spends height the text column was **already** spending. The card grows only in
the one case the meta stack is shorter than 148 — a one-line name with no coach cue.

⚠ **WIDTH HAD TO MOVE TOO, OR THE CHANGE RENDERS AND DOES NOTHING.** `ExerciseLoop` is
`contentFit: 'contain'`, so growing one axis enlarges the figure only until the *other* axis becomes the
limiter. A taller box around a squarish clip is a no-op with a diff. Both edges moved.

**OPEN — the design asks for more.** `Forge Active Workout.dc.html` specifies `width:132px;
align-self:stretch; min-height:172px`. A11 adopts the design's *mechanism* at the PO's *size*; the
remaining **20pt of width** is a knowing delta. Taking it would cost the meta column 20pt (≈187 → 167 on
a 375pt screen) and wrap long names like *Dumbbell Bulgarian Split Squat* onto a third line — which is
why it was not taken unilaterally. **PO's call.**

---

## 3. The plinth comes down a second time

**W9-A11-D2 — the figure goes 21 → 17 (−19%), measured off 21.**

> *"Looking at this screenshot, I'd go further than my previous 10–15% suggestion. I'd reduce the
> numeric value approximately 15–20%."*

The percentage is off **21**, the size actually on the phone when the critique was written — not off the
original 24. At 21 the plinth was still a peer of the set row's 20pt `fieldNum`; at 17 it is subordinate,
which is what *"Goal: medium · Best: medium · Sets: very prominent"* asks for in so many words.

⚠ **THE LABEL AND SUB-LINE DO NOT MOVE, BY INSTRUCTION.**

> *"Don't shrink the entire cell. Shrink the value and vertical space around it. That preserves the
> premium feeling."*

`plinthLabel` stays 9.5, `plinthSub` stays 10.5. The height comes out of padding instead.

**W9-A11-D3 — plinth column padding 10 → 8 top and bottom (−20%).** Horizontal padding is untouched: it
is what holds the figures off the column rules, and it is the ~84pt of text width the size thresholds are
measured against.

**W9-A11-D2a — the fallback steps and their thresholds move with the base.** 21 / 16 / 13 at `>7` / `>10`
becomes **17 / 14 / 11 at `>8` / `>10`**. The thresholds are a *width* calculation, and narrower type
changes the answer: a spaced `3 × 1:00` (8 characters) measures ~75pt at 17pt against the ~84pt a `1fr`
column has in the three-column plinth, so it is **promoted off the fallback** rather than shrunk for a
reason that stopped being true. `102.5 × 5` (9) still does not fit — 14. `4 × 6-6-4-4` (11) — 11.

---

## 4. What was NOT built, and why

**⚠ THE THREE-COLUMN NOTE STRIP ALREADY SHIPPED IN A9/A10.** The critique proposes `GOAL | BEST | NOTE`,
2-column fallback when there is no note, a 1–2 line clamp and a `Read note →` tap. **All four are
already built** — `plinthNote`, `plinthColWide`, `numberOfLines={2}`, `setReadNote`, and the whole column
is `{plinthNote ? … : null}` so it disappears rather than standing as a labelled em-dash. A10-D2b already
settled the label as `Last Note` over the PO's own *"Note From Last Time"* on a width measurement. **No
code changed for items 4, 5, 9 and 10 of the critique.**

**⚠ THE "ANIMATED EXERCISE PLATE" IS NOT IN THIS PASS.** *"Subtle movement · rep demonstration ·
restrained lighting · perhaps a bronze motion trail · tiny muscle emphasis · idle movement while you're
resting."* The slot already carries a bronze inner glow and plays the catalogue loop (703 clips). The
rest is new motion design against 703 existing assets, not a sizing pass. **DEFERRED — needs its own
brief.**

**⚠ THE CONSTRAINT THAT BOUND THE WHOLE PASS**, in the PO's words:

> *"Don't let the larger hero push the sets too far down… your current screenshot has a very nice
> property: the first set is visible immediately. That's extremely important."*

Held, with room to spare. The plinth loses ~7.5pt (padding −4, figure line-height −4) and the art costs
**nothing** in the common case because it stretches into space the meta column already held. **In a
typical exercise the card is net shorter and the first set moves UP.**

---

## 5. Two label changes

**W9-A11-D4 — `Prev` → `Previous`, and the column went 66 → 76 to hold it.**

PO: *"instead of just 'prev' let's have it be 'previous' and make the adjustment for lining it up with
how long it is now."*

An abbreviation in a five-column header is only free while it fits. At 9pt with 1.1px tracking
`PREVIOUS` measures **~56pt** against `PREV`'s ~28, and 66pt left no margin for a larger text scale — the
heading would have wrapped to a second line and dropped the header row out of line with the cells under
it. The 10pt comes out of `rowCells`' `space-between` slack (the six cells total 268pt in ~308pt), **not
out of another column**, so every heading still sits over its own cell.

The value wanted the width independently: `prevVal` is 14.5pt display, so a metric athlete's
`102.5 × 8` measured ~72pt and **was already overflowing the 66pt column**.

⚠ **RENAMED IN BOTH FACES.** The collapsed strip said `Prev` too, and the same fact must not be
`Previous` in the table and `Prev` in the strip that stands in for the table's card once the hero
auto-collapses. There is room: the longest run, `Previous 102.5 × 12   Goal 4 × 6-6-4-4`, measures ~209pt
at 11pt against the ~270pt that line has beside the thumb.

**W9-A11-D5 — the rest panel drops 118 → 200, and is deliberately NOT centred.**

PO: *"the timer pops up automatically when I finish a set. It appears closer to the top, but I'm
wondering if we should have it closer to the middle. Would that be better? To have it centered?"*

**Declined, with the reason it was asked granted.** Three arguments against centring, all of which
outlast the ~3 seconds the panel is normally up:

1. It drops in **under the band chip it demotes into**. From mid-screen the collapse reads as the count
   vanishing rather than moving, and the athlete hunts for it.
2. The card is **~265pt tall**. Centred it covers set rows 3–8 instead of the first two — and a rest is
   spent reading the table.
3. **`restPinned` ("Stay") makes it permanent for the session.** A card parked across the middle of the
   set table for forty minutes is a worse default than one parked at the top.

But the question pointed at something real: the tap that *starts* the rest is `Log Set` at the foot of
the screen, and the panel's controls (`−15s` / `+15s` / `Stay` / `Skip Rest`) were at the top, out of
one-handed reach. **200 buys ~82pt of that back** and clears the collapsed hero strip, so the exercise
name stays readable *behind* the panel rather than under it — Level 1 of §1's hierarchy kept intact while
resting.

⚠ **THE DESIGN SAYS `top:130px`.** This is a knowing delta. Do not "correct" it back without solving the
reach problem another way.

---

## 6. As built — 2026-09-09

| File | Change |
|---|---|
| `src/app/workout.tsx` | `mediaSlot` 104×130 fixed → 112×148 min, `alignSelf: 'flex-start'` dropped so it stretches; `plinthFigureStyle` 21/16/13 → 17/14/11 with thresholds re-cut for the narrower type; `plinthCol` vertical padding 10 → 8; header `Prev` → `Previous` and `cPrev` 66 → 76; the collapsed strip's `Prev` → `Previous`; `restOverlayWrap` `top` 118 → 200 |
| `src/app/__tests__/workout-plinth-and-row.test.mjs` | The `Prev` heading/width guard re-pinned to `Previous`/76 and extended to the strip; **+4 guards** — the art stretches (no fixed `height`, no `flex-start`), the art grew in *both* axes and by ≥20% of area, the figure came down while label and sub-line did *not*, and the rest panel moved down without reaching the centre |

⚠ **THE A10 HIERARCHY GUARD STILL BINDS AND STILL PASSES**: `plinth − field <= 1` reads 17 − 20 = −3.

## Change Log

| Date | Change |
|---|---|
| 2026-09-09 | Created and locked. Amends W9-A10-D1 and W9-A10-D3. W9-A11-D1's remaining 20pt of design width left OPEN; the animated plate DEFERRED. |
