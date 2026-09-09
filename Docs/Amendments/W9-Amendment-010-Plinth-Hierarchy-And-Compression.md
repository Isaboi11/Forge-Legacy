# W-9 Amendment 010 — The plinth stops shouting, and the card gives back 10%

**Amends:** `W9-Amendment-009-Plinth-Returns-And-Target-Folds.md` (type sizes and spacing only — no structure moves)
**Touches:** the expanded lifting hero, the set row's empty weight cell, the table hint and the bottom bar in `src/app/workout.tsx`
**Status:** 🔒 LOCKED
**Date:** 2026-09-08 (PO critique, same day as A9)
**Design authority:** the Option-3A handoff, as amended here by PO review of the built screen.

---

## 1. What the PO saw

A numbered critique of A9 as built, with a hierarchy attached:

> **LEVEL 1** — What am I doing? · **LEVEL 2** — What do I need to accomplish? · **LEVEL 3** — What have
> I done before? · **LEVEL 4** — What am I doing right now? · **LEVEL 5** — Secondary actions ·
> **LEVEL 6** — Global actions
>
> *"Your current design is already very close to this hierarchy. The main adjustment is making Level 4 —
> the actual set logging — feel slightly more dominant than Levels 2 and 3."*

Everything below serves that one sentence. **No element moves; this is a weight-and-spacing pass.**

---

## 2. The figures come down, and that is a hierarchy change not a taste one

**W9-A10-D1 — 24pt → 21pt (−12.5%), and the two fallback steps come with it.**

> *"Reduce Goal / Best numbers ~10–15%. Not dramatically. They currently feel slightly too much like
> headline statistics."*

The set row's own numerals are **20pt** (`fieldNum`). At 24 the plinth was the largest type on the
screen below the exercise name — so Level 2 was outranking Level 4 by four points. At 21 the two are
near peers and the active row wins on chrome (bronze border, tint, recessed fill) rather than on size.

⚠ **The guard is on the RELATIONSHIP, not the number.** `workout-plinth-and-row.test.mjs` reads both
sizes out of the source and fails if the plinth figure exceeds the row numeral by more than 1pt. A
future bump that re-inverts the hierarchy fails; a considered change to both does not.

**W9-A10-D1a — The figures are spaced: `3×8` → `3 × 8`, `185×5` → `185 × 5`.** The `×` is an operator
between two facts, and set tight against them the whole thing reads as one token. `spacedFigure` does
it at the render, so `goalTextFor` is untouched — the **collapsed strip keeps the compact form**, having
11pt and no room for the spaces.

⚠ **`plinthFigureStyle`'s thresholds count the SPACED string**, because `spacedFigure` adds two
characters and measuring the compact form would hold `185 × 5` at a size it no longer fits. The steps
are 21 / 16 / 13 at >7 and >10 characters: `3 × 8` (5) and `185 × 5` (7) hold 21; `3 × 1:00` (8, a timed
goal) and `102.5 × 5` (9, a metric athlete's own bench) take 16; `4 × 6-6-4-4` (11) takes 13.

---

## 3. One structure across the three columns

**W9-A10-D2 — Label, value, sub-line. All three, no exceptions.**

> *"Make Goal / Best / Last Time structurally consistent… That is substantially easier to scan."*

| | Label | Value | Sub-line |
|---|---|---|---|
| 1 | `GOAL` (bronze — the live instruction) | `3 × 8` + pencil | `Today` / `Today · per leg` |
| 2 | `BEST` | `185 × 5` | `Aug 31` / `No record yet` |
| 3 | `LAST NOTE` | `“Switched to underhand…”` | `Read note` |

**W9-A10-D2a — The note is quoted.** Quotation marks say *a person wrote this* without spending a word,
which is what stops a sentence sitting in a row of figures from being read as data.

**⚠ W9-A10-D2b — `LAST NOTE`, and the PO's own wording did not fit.** The critique asks for
*"Note From Last Time"*. At 9.5pt with 1.3px tracking that measures **≈142pt** against the **≈100pt**
this column has for label text after its padding and icon — it wraps to two lines and breaks the single
baseline the whole change exists to create. `Last Note` carries the same claim (the label names what the
value *is*, which is what `Last Time` failed to do) at a width that fits. **Do not re-lengthen it
without re-measuring**; the room can be bought by dropping the label to 8.5pt and removing the icon, and
that trade was not taken unilaterally.

---

## 4. Targeted compression — and what was deliberately left alone

**W9-A10-D3 — ~10% out of the exercise information area only.**

> *"Compress the exercise information area ~10% — especially muscle/equipment line, How To, vertical
> gaps."* · *"Exercise card internal spacing: slightly too generous."* · *"Goal/Best/Last Time: too much
> vertical allocation."* · *"So I would not globally tighten the screen. I'd do targeted compression."*

| | Was | Now |
|---|---|---|
| hero padding | 14 | 12 |
| meta stack gap | 10 | 7 |
| art | 104 × 145 | 104 × 130 |
| attribute run line-height | 18 | 16 |
| How To pill padding | 8 / 12 | 6 / 11 |
| plinth column padding · gap | 12–13 · 5 | 10–10 · 4 |

**⚠ THE EXERCISE NAME IS UNTOUCHED at 26/28.** It is Level 1. Shrinking it to save a few points would
flatten the exercise into a caption and invert the top of the hierarchy to fix the middle of it.

**⚠ THE SET ROWS ARE UNTOUCHED.** The critique rates them *"very good"*; a global tighten would have
taken from the one region that was working.

**⚠ W9-A10-D3a — `Add Set` KEEPS ITS HEIGHT, and this is the one item declined.** The critique calls it
*"slightly tall"*. It is `minHeight: 44` — the platform touch-target floor — and it is tapped mid-set,
one-handed, often with chalk on. Dropping a frequently-used control below the floor is not a call to
make silently on a spacing note. **OPEN**: 40pt on the PO's explicit say-so, one line.

---

## 5. Two smaller ones

**W9-A10-D4 — The empty weight cell says `— lb`, not `—`.**

> *"I'd question whether a user immediately understands that this is tappable."*

The unit is the cheapest affordance available: it says the box expects a number *from you*, which a rule
on its own does not, and it costs no height. Set in `charcoal500` at 10.5pt — **quieter than the faded
ask in the Reps field beside it**, because a unit must never read as a value somebody entered.
⚠ It repeats the `Weight · lb` column header. Accepted knowingly: the header is read once, the row is
read every set.

**W9-A10-D5 — The bottom bar reads as a bar the screen ends at.**

> *"The bottom region feels slightly detached… just enough separation that the user understands: these
> actions remain available regardless of where I am in the workout."*

No layout move — three changes to the surface. `charcoal900` → **`charcoal800`**, which is the CARD role
in both palettes (Alabaster: `#F9F6EF` on a `#F6F2E8` page — exactly the "raised" reading). The rule
hardens `charcoal700` → **`charcoal600`** so it is an edge rather than a seam. And a literal **upward**
`boxShadow` puts the scrolling content behind it — every `flShadow` token throws downward, and it is
held at 0.30 so it is an elevation cue on cream rather than a smudge.

**W9-A10-D6 — The hint is one clause.** *"Tap a weight or a rep count to change it — then Log Set marks
it done."* → **"Tap weight or reps to edit."** It still retires itself the moment the first set resolves.

---

## 6. As built — 2026-09-08

| File | Change |
|---|---|
| `src/app/workout.tsx` | new `spacedFigure`; `plinthFigureStyle` 24→21 with thresholds re-cut for the spaced string; `bestFigure` spaced; plinth label `Last Time`→`Last Note` and the note quoted; `heroUpper`/`heroMeta`/`mediaSlot`/`heroAttrs`/`howTo`/`plinthCol` compressed; new `emDashRow` + `emDashUnit`; `tableHint` copy; `bottom` re-treated |
| `src/app/__tests__/workout-plinth-and-row.test.mjs` | +6 guards (hierarchy relationship, three-column structure, spacing + threshold source, the unit affordance, the bar treatment, the hint). The A9 note-clamp guard was relaxed off the exact child expression — it broke on the quotation marks, which is a test failing on a change it does not care about |

## Change Log

| Date | Change |
|---|---|
| 2026-09-08 | Created and locked. Amends W9-A9 type/spacing; W9-A10-D3a left OPEN. |
