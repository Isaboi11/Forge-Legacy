# W-9 Amendment 012 — The hero card, built to Option 5a

**Amends:** `W9-Amendment-011-Hero-Becomes-A-Stage.md`, `W9-Amendment-010-Plinth-Hierarchy-And-Compression.md`, `W9-Amendment-009-Plinth-Returns-And-Target-Folds.md`
**Touches:** the expanded lifting hero and its bottom strip in `src/app/workout.tsx`
**Status:** 🔒 LOCKED
**Date:** 2026-09-09
**Design authority:** the PO's Option-5a handoff prompt, which supersedes the `.dc` for this card.

> *"Every number below is literal; do not round, rescale, or 'improve' spacing."*
> *"Don't change any of the functionality of the page. Just layout."*

Those two sentences govern every decision here, including the four places they pull against each other.

---

## 1. What changed

| | Was (A11) | Now (A12) |
|---|---|---|
| Card ground | `charcoal900` | **`charcoal800`** (`--fl-surface-card`) |
| Upper block | row, padding 12, gap 12 | **column**, padding **14**, gap 12 |
| Row 1 | plate + rail, gap 12 | plate + rail, gap **14**, `flex-start` |
| Plate | 112 × 148 **min, stretching**, bronze glow | **150 × 212 fixed**, `border-inset`, recessed ground |
| Plate fit | `contain` | **`contain`** — spec said `cover`, reversed on the PO's call (D2) |
| Fallback glyph | 74, bronze @ 0.14 | **50**, `charcoal500`, stroke 1.25 |
| Rail gap | 7 | **9** |
| Name | 26 / 28 | **25 / 27** |
| Title icons | 19 and 18 | **15 and 15**, `margin-top: 4` |
| Hairline | — | **new: 34 × 1 bronze** |
| Category | 11pt, icon 12 | **10.5pt**, icon **11**, `--fl-text-secondary` |
| Meta | one wrapping `·` run | **two lines** — equipment, then muscles |
| How To | pill, left-aligned in the rail, 2 style faces | **full-width bar**, row 2, one face |
| Strip cells | flex 1 / 1 / 1.25, uniform padding | **0.85 / 0.85 / 1.3**, per-cell padding |
| Strip labels | icon 10 | icon **9** |
| Figures | 17pt, **spaced** `3 × 8` | **19pt, tight `3×8`** |
| Sub-lines | 10.5 | **10 / 14** |
| Note | 13pt + `Read note` link, label `Last Note` | **11.5 / 14**, **no link**, label **`Note`** |

---

## 2. The four places the two governing sentences pull against each other

**W9-A12-D1 — the plate is fixed, and that costs the card ~120pt.**

A11-D1's whole argument was that `minHeight` + stretch made a bigger picture **free**, because the plate
spent height the text rail was already spending. A12 replaces it with a literal `150 × 212`, so the plate
is now the tallest thing in the row and **sets** the row height. The card goes from ~240pt to ~363pt.

⚠ **THIS BREAKS A11 §4's BINDING CONSTRAINT** — *"don't let the larger hero push the sets too far
down… the first set is visible immediately."* It is broken knowingly: the spec is explicit, later, and
numeric. **Mitigated by an existing behaviour, not by a fix**: the hero auto-collapses to its strip the
moment the first set resolves (`autoCollapsed`), so the tall card is what an athlete sees *before* set 1
and never again during the exercise. **Flagged for the PO — if the first set must be visible before it
is logged, the plate is where the height is.**

**W9-A12-D2 — the spec asked for `cover`; it ships `contain`, on the PO's call and a measurement.**

The spec's reasoning was that the plate should *"keep its fixed dimensions regardless of the animation's
aspect ratio"*. It does that under either fit — what `cover` actually costs is the movement. PO, on
review before publishing: *"if we have to slightly make the animation shorter or wider to make it work
with the plates do that. **I want the full animation in there.**"*

**MEASURED, 96 CLIPS SAMPLED ACROSS THE CATALOGUE.** `deliver_forge.py` normalises every loop to
`LOOP_H = 300` and lets the WIDTH fall where it lands, so aspect ratio is **per-clip**:

| min | p10 | p25 | median | p75 | p90 | max |
|---|---|---|---|---|---|---|
| **0.327** `ring-muscle-up` | 0.453 | 0.613 | **0.800** | 1.160 | 2.107 | **3.640** `foam-roll-lats` |

That is an **11× spread**. Against the 0.708 plate, `cover` crops a ring muscle-up to ~46% of its width
and a foam roll to ~19% of its — the athlete is cut in half on exactly the movements they are least
likely to already know. ⚠ **No plate size fixes this**, which is the whole point: no single aspect ratio
contains an 11× spread. `contain` is the only fit that satisfies "the full animation".

⚠ **AND THE PLATE'S SHAPE BARELY MATTERS — SO THE SPEC'S NUMBER WAS KEPT.** Average area filled under
`contain`, same 96 clips: **150 × 212 → 69.1%** · 150 × 181 → 69.6% · 150 × 150 → 64.9% ·
164 × 150 → 62.7%. The spec's 150 × 212 is within half a point of the best of them, so there was nothing
to buy by moving it. **OPEN:** 150 × 181 is the one variant that is equal on fill and **31pt shorter**,
which is the cheapest available answer to D1's height problem — PO's call.

**W9-A12-D3 — `--fl-text-tertiary` was NOT taken on the two meta lines or the strip sub-lines.**
**This is the one deviation in the pass.** W9-A7-D5 and W9-A8-D4 already measured that token for exactly
this text: **Alabaster's `gray600` is 3.15:1**, which clears the 3.0 floor for non-text UI and **fails the
4.5:1 that 12.5pt and 10pt running text need**. Forge would have been fine; Paper would have shipped
unreadable lines under every exercise name. `gray400` (`--fl-text-secondary`) is the nearest token that
passes in **both** themes. ⚠ Reaching tertiary here is a **ramp change, not a token change** — in
`foundation.paper.ts` `gray600` and `gray400` sit 0.08 apart and neither moves alone. **PO's call.**

**W9-A12-D4 — the How To *style* variant went; the *copy* variant stayed.** `howToFirst` made the
control loud for a lift with no history. The bar is now bronze-tinted and bronze-bordered for everybody,
so a second "louder" face had nothing left to say — that is layout, and it went. The **words** still
change (`"First time — here's how"`), because that is behaviour and the brief said not to touch it.

---

## 3. What this reverses, and why that is not drift

**W9-A12-D5 — the figures go 17 → 19 and lose their spaces.** A10-D1a *added* the spaces at 24pt, where
the cell had room. A12 sets the figure and the **cell** together: at `0.85fr` with its own padding the
Goal cell has ~78pt of text, narrower than the `1fr` A11 sized against — so 19 on an unspaced string
occupies **less** width than 21 on a spaced one did. `spacedFigure` is **deleted, not left uncalled**: a
helper with no consumer is how a retired format gets rebuilt by somebody who assumes it is wanted.

⚠ **THE THRESHOLDS NOW COUNT THE UNSPACED STRING.** Left at the spaced counts they would step every
figure down a size for characters that are no longer there. Re-measured: `3×8` (3) ≈ 31pt, `185×5` (5) ≈
52, `102.5×5` (7) ≈ 73 all hold **19** — the metric bench, which has needed a fallback since A9, finally
fits at full size. `4×6-6-4-4` (9) ≈ 94 does not: **14**.

⚠ **A10's HIERARCHY CLAIM SURVIVES ALL OF IT.** 24 → 21 → 17 → 19, and at every step the guard is the
same relationship: the plinth figure must not exceed the set row's 20pt `fieldNum` by more than 1. 19
passes at −1.

**W9-A12-D6 — `Last Note` → `Note`, and `Read note` is deleted.** A10-D2b chose `Last Note` on a width
measurement and told the next person not to re-lengthen it *without re-measuring*. Re-measured: the cell
is `1.3fr` rather than `1.25` flex and the sub-line is gone, so the label has room it no longer shares.
⚠ **THE TAP IS NOT DELETED WITH THE LINK.** The whole cell was already the `Pressable`; the affordance
moved from printed text to the cell. Deleting the `Pressable` instead of the label is the version of this
change that loses the note, and it is guarded against.

**⚠ A10-D2's "all three, no exceptions" is narrowed, not abandoned.** The two FIGURE cells still carry
label + value + sub-line. Only the note trades its third line for the tap.

---

## 4. Translating a CSS spec into React Native

- `grid-template-columns: 0.85fr 0.85fr 1.3fr` → proportional `flex` on the three cells. RN has no grid;
  on fixed-content children this is the same division. **With no note the strip is two cells at 0.85 and
  0.85 — still 1:1**, which is the spec's two-cell fallback.
- `-webkit-line-clamp: 2` → `numberOfLines={2}` (already there).
- `object-fit: cover` → **`contentFit="contain"`** on `ExerciseLoop` — see D2 for why the spec's fit was not taken.
- `line-height: 1.08` / `1` / `1.4` / `1.2` → resolved to points (27 / 19 / 14 / 14); RN takes points.
- **44px hit targets "with padding, not size"** → `hitSlop={15}` around a 15pt glyph = 45pt. ⚠ The
  `heroIconBtn` box must NOT be grown to buy the target — that scales the icon with it.

---

## 5. As built — 2026-09-09

| File | Change |
|---|---|
| `src/app/workout.tsx` | `hero` ground → `charcoal800`; `heroUpper` row → column w/ new `heroRow1`; `mediaSlot` → fixed 150 × 212, `cover`, recessed, `borderInset`, glow removed; new `heroRule`; `heroMetaStack` + `heroEquipText`/`heroMuscleText` split at the derivation; `heroName` 25/27; title icons 15 w/ `hitSlop` 15; `howTo` → full-width bar, `howToFirst`/`howToTextFirst` deleted; `spacedFigure` deleted and `bestFigure` set tight; `plinthFigureStyle` → 19/14/11 on unspaced counts; per-cell `plinthCol*` padding + 0.85/0.85/1.3; `plinthRead` deleted; `Last Note` → `Note` |
| `src/app/__tests__/workout-plinth-and-row.test.mjs` | 5 A10/A11 guards rewritten to the A12 truths, **+2 new** (the How To bar's rail-era properties cannot return; the strip's proportions and its two-cell collapse). **28 pass.** |

⚠ **THE GUARDS THAT DID NOT MOVE ARE THE POINT**: `Prev`→`Previous` at 76pt, the note clamp and its tap,
`per leg` on the Goal sub-line, the prescribed load never written onto a set, the auto-collapse, and the
plinth-under-row hierarchy all still assert exactly what they did before.

## Change Log

| Date | Change |
|---|---|
| 2026-09-09 | Created and locked. Reverses A11-D1's stretch and A10-D1a's spacing; narrows A10-D2. D3 (tertiary text) **declined on a contrast measurement**; D2 **reversed to `contain` on the PO's call before publishing**, backed by a 96-clip aspect-ratio sample. D1 (card height) flagged, with 150 × 181 offered as a free 31pt. |
