# W-9 Amendment 013 — Active Workout, option 6a

**Amends:** `W9-Amendment-012-Hero-Card-Option-5a.md`, `W9-Amendment-011-Hero-Becomes-A-Stage.md` (D4 only)
**Touches:** the expanded lifting hero, the set-table header, the reps field and the scroll container in `src/app/workout.tsx`
**Status:** 🔒 LOCKED
**Date:** 2026-09-09
**Design authority:** the PO's Option-6a prompt plus the reference screenshot supplied with it.

> *"Layout-only changes… Do not change any color, token, font family, font size, font weight,
> letter-spacing, border, radius, shadow, or background anywhere in this screen."*
> *"Look at the picture as a reference if you have any questions."*

**Verified against that instruction, not merely intended.** Every colour token, `fontSize`, `fontWeight`,
`letterSpacing`, `fontFamily` and `backgroundColor` in the diff was enumerated: **no net change in any
category.** The one radius change — `flRadius.md` → `flRadius.pill` — is the one the brief itself asks
for in §1.4.

---

## 1. W9-A13-D1 — How To returns to the rail as a bottom-anchored pill

A12 made it a full-width bar below the plate-and-rail row. That left the rail as tall as its own text
beside a 212pt plate, so the card carried a block of empty space under the meta stack — visible in the
PO's screenshot.

| | |
|---|---|
| `heroUpper` | column + `gap: 12` → **row**, `gap: 14`, `padding: 14` unchanged |
| `heroRow1` | **deleted** — the block holds one row again, so the wrapper was redundant, not merely unused |
| `heroMeta` | **+ `alignSelf: 'stretch'`** |
| `howTo` | **+ `marginTop: 'auto'`, + `alignSelf: 'flex-start'`**, `padding: 10` → `10 / 16`, radius `md` → `pill`, `justifyContent: 'center'` dropped |

⚠ **THREE PROPERTIES, THREE DIFFERENT BUGS IF ANY ONE IS REMOVED.** `heroMeta`'s `stretch` makes the
rail as tall as the plate; `marginTop: 'auto'` eats that slack so the pill lands at the rail's foot;
`alignSelf: 'flex-start'` stops the pill spanning the rail's width. Remove the first two and the gap
returns at any title length. Remove the third and it is a bar again.

**Net ≈ 56pt off the card**, which also repays part of A12-D1's height debt.

⚠ **BOTH COLOUR FACES AND THE COPY VARIANT ARE UNTOUCHED** — `howToFirst` still fills the pill on a lift
with no history, and the label still reads *"First time — here's how"* there.

---

## 2. W9-A13-D2 — the goal pencil

12 → **11pt**, plus `flexGrow/Shrink: 0` so a long goal figure can never squeeze it. The value and the
pencil were already in a `flexDirection: 'row'`, `gap: 6` container (`plinthValueRow`), so §2.1 needed
no change.

⚠ **§2.3's "44 × 44 hit area" WAS ALREADY SATISFIED, AND GIVING THE PENCIL ITS OWN WOULD BE A
REGRESSION.** The entire Goal cell is the `Pressable` that opens `setGoalOpen` — **~102 × 70pt**, well
past 44 × 44. The pencil is a *mark* saying the value is editable, not a separate control. Wrapping it
in its own touchable would nest a `Pressable` inside a `Pressable`, where a tap near the pencil can
swallow the cell's own press — a functional change, in a brief that says layout only.

---

## 3. W9-A13-D3 — the set-table header

| | |
|---|---|
| `PREVIOUS` | → **`Prev`** |
| `WEIGHT · LB` | → **`Weight`** (the unit already prints in every field — W9-A10-D4) |
| `Set` | now **centred**, matching the ring it labels |
| `headRow` padding | bottom 7 → **9** |

⚠ **THE COLUMN STAYS 76, THOUGH THE WORD SHRANK.** A11-D4 widened `cPrev` 66 → 76 for **two** reasons
and only one was the heading: `prevVal` is 14.5pt display, so a metric athlete's `102.5 × 8` measures
~72pt and **was already overflowing 66**. A13 removes the first reason, not the second. Re-narrowing to
66 clips that figure again.

**⚠ TWO NUMBERS IN §3 WERE NOT TAKEN, BECAUSE TAKING THEM CAUSES THE DEFECT §3 EXISTS TO FIX.**

**(a) `grid-template-columns: 34px 66px 1fr 1fr 34px 18px`, `gap: 10`.** That is not what the rows are.
The real definition — already shared by the header, and guarded since A9 — is `cSet 30 · cPrev 76 ·
cWeight 70 · cReps 54 · cCheck 30 · cTrash 18`, `gap: 4`, `justifyContent: 'space-between'`. §3.1's
*rule* ("the header and the rows must share one column definition") is honoured against the real
values; its *numbers* would have broken the alignment they were written to create.

**(b) horizontal padding `14`.** `row` is `paddingHorizontal: 4`. A header at 14 sits **10pt inboard**
of the cells it labels. Both stay at 4, and a guard now asserts the two are equal rather than asserting
either number — so the pair cannot drift apart in future.

**(c) top padding `11`.** `table` already contributes `paddingTop: 14`; adding 11 would **stack to 25**,
not set the gap to 11. The reference screenshot shows ~14 above the headings, which the table alone
already gives. Only the bottom moved.

---

## 4. W9-A13-D4 — an un-entered rep count reads as a suggestion

The reps field prints the goal before anything is entered, and rendered it at full strength — so an
untouched `8` looked typed. `opacity: 0.35` on that state, and nothing else.

⚠ **OPACITY ONLY, WHICH IS WHY THE THREE-INK LADDER IS UNTOUCHED.** W9-A9's `repsColor` ladder — faded
`gray600` asked / `bronze300` answered / `cream100` logged — still decides the colour; `fieldNumSuggested`
rides on top of whichever ink it chose.

⚠ **§4.3 SAYS THE DIGIT "STAYS `--fl-text-primary`". IT NEVER WAS.** The pending digit is `gray600` by
that ladder, and moving it to primary would be exactly the colour change the same brief forbids twice.
The ladder wins.

**It lands where the weight column already is**, which is §4.4's own argument: `emDashUnit` draws its
placeholder at `charcoal500` (~1.45:1 on `charcoal900`), and `gray600` at 0.35 measures **~1.60:1** — a
shade *more* visible than the placeholder beside it. Faint means waiting, full means logged, in both
columns.

---

## 5. W9-A13-D5 — the coach coin stops covering the last delete icon

`scroll.paddingBottom` **24 → 88**, derived:

```
coin bottom (holtWrap)   82 + barBottom      ← measured from the SCREEN bottom
coin height (BUBBLE_SIZE)     52
action bar               14 + 48 + barBottom ← bottomRow padding + the primary Button
──────────────────────────────────────────
intrusion into the scroll = 82 + 52 − 62 = 72   (barBottom cancels)
+ the brief's 16pt clearance              = 88
```

⚠ **`barBottom` CANCELS AND MUST NOT BE ADDED BACK.** The coin and the bar both ride it, so the coin's
overlap with the scroll is identical on a phone with a home indicator and one without. Taking §5.1's
"bottom offset" literally as `82 + barBottom` would reserve **~150pt** of dead space at the foot of
every exercise instead of the 72 the coin actually covers.

---

## 6. As built — 2026-09-09

| File | Change |
|---|---|
| `src/app/workout.tsx` | `heroUpper` back to a row and `heroRow1` deleted; `heroMeta` + `alignSelf: 'stretch'`; How To moved into the rail with `marginTop: 'auto'` / `alignSelf: 'flex-start'` / pill radius / `10 × 16` padding; goal pencil 12 → 11 + `goalPencil`; header `Prev`, `Weight`, centred `Set`, `paddingBottom` 9; new `repsSuggested` + `fieldNumSuggested`; `scroll.paddingBottom` 24 → 88 |
| `src/app/__tests__/workout-plinth-and-row.test.mjs` | 2 A12 guards rewritten, **+2 new**. **30 pass.** The header guard now asserts the header and row insets are **equal to each other** rather than pinning a number, so the pair cannot drift; the How To guard names all three anchor properties and what breaks without each |

⚠ **THE COLOUR AUDIT IS PART OF THE DELIVERABLE**: colour tokens, `fontSize`, `fontWeight`,
`letterSpacing`, `fontFamily` and `backgroundColor` all show **no net change** across the diff.

## Change Log

| Date | Change |
|---|---|
| 2026-09-09 | Created and locked. Reverses A12's How To bar and A11-D4's spelling (not its width). Three numbers in §3 and one in §5 declined **because taking them would cause the defect being fixed**; §2.3's hit target already satisfied by the cell. |
