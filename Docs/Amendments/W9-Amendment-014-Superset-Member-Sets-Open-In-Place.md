# W-9 Amendment 014 — A superset member's sets open in place

**Amends:** `W9-Amendment-004-Supersets-And-Bottom-Add-Exercise.md` — W9-A4-D4 (the "tapping a member's name opens that exercise on its own" rule, and "the superset replaces … the set table for its members")
**Touches:** the fused superset card, the set table, `addSet` / `removeSet` in `src/app/workout.tsx`; `syncSupersetRounds` in `src/domain/workout/session-core.ts`
**Status:** 🔒 LOCKED
**Date:** 2026-09-12
**Origin:** PO, mid-superset on the phone (screenshot: Superset A, Crucifix Cable Fly + Hanging Knee Raise, round 1 of 3).

> *"While doing a superset I would like to be able to touch one of the workouts and it expands into the
> full card like it shows on just a regular exercise screen. That way I can see and adjust all sets if
> I'm wanting."*

Asked whether it should expand on the same screen or open the member as its own card, the PO chose
**expand in place**.

---

## What was there, and why it did not answer the ask

W9-A4-D4 said a tap on a member's name opens that exercise on its own. 260e7f3 (Aug 9) built it, and it
was unusable in two ways:

1. **Only the name text was a target**, with nothing drawn to say so. The PO asked for the feature while
   holding a phone that had had it for a month.
2. **The member's own card had no set table.** The table's guard was `isSuperset` (4fb0ae4, Aug 3); when
   260e7f3 introduced `ssFused` it moved the hero's guard and not the table's. The card showed the
   demonstration and none of the sets — the thing the PO wanted it for.

Even working, it was the wrong shape for this job: it swaps the pairing for one lift, so the other half
of the superset leaves the screen and "Back to the superset" is a second trip.

## W9-A14-D1 — A tap on a member row opens its set table inside the superset card

- The **whole row** — letter tag, name, goal line — is the target. **Log Set stays its own tap.**
- A chevron beside the name marks the row as openable; it turns down while open.
- The table is the **same component** the exercise card draws (`SetTable`): Prev, the faded goal,
  holds, the done tick, the per-row trash, Add Set. Nothing is a lighter copy.
- **One member open at a time.** Two tables stacked in one card is a scroll between the athlete and
  Log Set.
- Leaving the pairing closes it, the same as it closes the full card.

## W9-A14-D2 — The full card stays, one link further in

Inside the opened section, **Open full card** does what the name tap used to: the member on its own, with
its demonstration, goal panel and note row, and "Back to the superset" above it. That card now shows its
set table (the `ssFused` guard, see above).

## W9-A14-D3 — Adding or removing one member's set keeps the saved round count true

Rounds on screen were already the longest member's set count (`supersetRounds`, per W9-A4-D4). The
stored `groupRounds` — written as `group_rounds`, carried into templates — was only updated by
**+ Round**. With Add Set and the trash now inside the pairing card, `addSet` and `removeSet` re-state it
on every member through `syncSupersetRounds`. Circuits and AMRAPs are untouched: their round is not a
set count.

## Layout note

The table's six fixed cells need ~308pt. Inside the superset card's padding a 375pt phone has ~309pt and a
360pt Android ~294pt, so the inline table has **no card of its own** (no second ground or border — a card
in a card) and its section borrows 10pt of the card's padding each side. A test does this arithmetic
against the live style values so a widened column fails loudly.

## Not changed

- Round-major advance, rest held until the round ends, "+ Round", the round chips — as W9-A4-D4.
- No colour, font, radius or token changes. The one new text element (**Open full card**) reuses
  the `bronze400` small-caps treatment of the card's existing **+ Round**.
