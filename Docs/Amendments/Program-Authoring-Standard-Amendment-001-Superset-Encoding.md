# Program Authoring Standard — Amendment 001: Superset Encoding

**Amends:** `Program-Authoring-Standard-v1.0.md` §567 (Superset encoding)
**Status:** 🔒 LOCKED
**Date:** 2026-08-03
**Related:** `W9-Amendment-004-Supersets-And-Bottom-Add-Exercise.md`

---

## What §567 said

> **Superset encoding.** The schema does not natively support superset groupings at MVP. If supersets
> are intended, indicate this in `notes` on adjacent exercises: `notes: "Superset with the exercise
> above."` W-9 will present them as individual sequential exercises.

## Why it is now false

Two things changed under it.

**The prescription model grew grouping.** `ProgramExercise` has carried `groupId` / `groupName` /
`groupRounds` / `groupCapSec` since the model was extended for circuits, ladders and AMRAPs — resolved
by adjacency in `deriveBlocks`. The schema *does* support groupings, and has for some time; §567 simply
predates it.

**And the workaround's second clause was the real cost.** "W-9 will present them as individual
sequential exercises" is precisely how a superset gets trained as two ordinary exercises: the athlete
rests after A, because the app told them to. A note in a field is a comment; it changes nothing about
what the app does.

## What replaces it

**PAS-A1-D1 — A superset is encoded as a block, not as prose.**

```
groupId:     shared across the members
groupKind:   'superset'          // absent reads as 'circuit'
groupRounds: the set count       // each member gets this many sets
groupCapSec: null                // a superset has no clock; that is an AMRAP
```

Members must be **adjacent within one section**. `deriveBlocks` walks by adjacency, so members split by
another exercise — or across Warm-up and Main — resolve as two separate one-member blocks rather than
one superset. This is the same rule circuits already follow; it is not new.

**PAS-A1-D2 — `groupKind` absent means `'circuit'`.** Every block authored before this amendment was a
circuit. No authored program changes meaning, and no migration of `programs.structure` is required —
it is `jsonb`, which is the same reason the model could grow rep ladders and AMRAPs without one.

**PAS-A1-D3 — `notes` is no longer the mechanism.** Existing programs that used the §567 convention are
not broken and are not rewritten; they simply keep a note that now describes something the athlete can
also see in the structure. New authoring uses the fields.

**PAS-A1-D4 — Authoring surfaces.** Supersets are authorable in the Program Builder (W-24) and the Free
Workout Builder (W-25), and creatable in-session from W-9's ⋯ menu. All three write the same four fields,
so a superset means one thing everywhere.

## Downstream

- **W-9** renders a superset as one merged card, alternating round by round, with rest suppressed
  between members — `W9-Amendment-004` §W9-A4-D4.
- **Program Detail** labels the block above its first member ("Superset · 2 exercises, alternated").
- **`plannedSetCount`** already counts a block's rounds, so a superset's planned volume is correct
  without further change.
- **Templates** carry the pairing through `save_workout_as_template` (migration 0106).
