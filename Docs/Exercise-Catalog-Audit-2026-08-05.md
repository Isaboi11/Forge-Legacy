# Exercise Catalogue Audit — 2026-08-05

**Asked for:** "See if we need to work on the exercise list" — gaps and duplicates (PO, batch 3).

**Measured against:** `src/domain/exercise-relationships/source/exercises.json` (797 rows),
`exercise_muscles.json`, `coaching_content.json`, and `HIDDEN_EXERCISE_IDS` in
`src/domain/exercise-picker/catalog-core.ts`.

**Headline: the data is sound. What is broken is findability, and that is what the PO actually hit.**

---

## 1. Counts

| | |
|---|---:|
| Rows in `exercises.json` | 797 |
| Hidden from the app (presentation filter, nothing deleted) | 75 |
| **Visible in browse, search and the picker** | **722** |

The 75 hidden are 49 cardio activities the conditioning system already owns properly, 14 advanced
gymnastics skills, 11 strongman/competition movements this app cannot coach, and — new in this
pass — one duplicate (§3).

## 2. Duplicates

- **Exact duplicate names: 0.** No two rows share a name.
- **Same words in a different order: 3 pairs.** Two are legitimate and must stay:
  `High-to-Low` / `Low-to-High Cable Fly` and the same pair of Wood Chops — direction is the
  exercise. One needs a PO ruling:

  > **`Jump Squat` (`jump-squat`) vs `Squat Jump` (`squat-jump`)** — both bodyweight, both
  > Squat / Knee Dominant, same primary muscles. These look like one exercise entered twice under
  > two orderings of the same two words. **Recommend: keep `Jump Squat`, hide `squat-jump`, alias
  > "squat jump" onto it** — the same treatment §3 got. Not done, because it is a judgement about
  > content and the last one was yours to make.

- **Resolved this pass:** `Cable Reverse Fly` and `Cable Rear Delt Fly` were one lift filed twice —
  same equipment, pattern, difficulty and primary muscle, differing in one authored `family` string.
  `cable-reverse-fly` is now hidden and aliased onto `cable-rear-delt-fly`.

### A note on how hard this was to search for

A broader sweep — cluster every row by *(equipment, movement pattern, primary muscle set)* and read
the groups — produced **103 clusters covering 642 of 722 rows** and was useless. Those three fields
do not distinguish a Crunch from a Dead Bug, or a Front Squat from a Box Squat. It is recorded here
so nobody runs it again expecting a duplicate report. **The only signal that has actually found a
duplicate in this catalogue is the name itself.**

## 3. Coverage gaps

| Check | Result |
|---|---|
| Visible exercises with no coaching content | **0** |
| Visible exercises with no primary muscle | **0** |
| Aliases pointing at a non-existent id | **0** (test-enforced) |
| Aliases pointing at a *hidden* id | **0** (test added this pass) |

Media is not audited here — it is tracked separately and is the known outstanding gap.

## 4. The real finding: the catalogue is fine, the search is not

The PO could not find a barbell shoulder press. The catalogue has one. Search is token-AND — every
word typed must appear somewhere in the row — and the word "shoulder" appears in **none** of that
row's fields: not the name ("Barbell Overhead Press"), not its aliases (military · strict ·
standing), not its equipment, and not its muscles, because the muscle is called "Front Deltoids" and
nothing in the muscle vocabulary is named "Shoulders".

The catalogue is split down a vocabulary line nobody chose:

| Named "… Shoulder Press" (searchable) | Named "… Overhead Press" (was not) |
|---|---|
| Machine · Plate-Loaded · Seated Dumbbell · Smith Machine | Barbell · Barbell Seated · Band · Dumbbell · both Single-Arm |

Five aliases were added and the misses verified before and after: `barbell shoulder press` returned
**0 of 722** and now returns 2.

**This is a class, not an instance.** Any lift whose common name uses a word the catalogue does not,
in the name or the muscle vocabulary, is invisible to the athlete who types it. Two more worth
checking against real use:

- **No muscle is named "Shoulders", "Abs", "Traps" or "Lats"** in `muscles.json` — they are
  "Front Deltoids", "Rectus Abdominis", "Upper Trapezius", "Latissimus Dorsi". A search for
  "lat pulldown" works only because "Lat" is in the exercise's *name*.
- **Substring matching produces false hits on short tokens.** `bb` matches "Dum**bb**ell", so
  "bb shoulder press" returns dumbbell rows. Harmless today; it would not be if a token got shorter.

## 5. Recommended next steps

1. **PO ruling on `Jump Squat` vs `Squat Jump`** — the one open duplicate.
2. **Add the muscle vernacular to the search index** — "shoulders", "abs", "lats", "traps", "quads",
   "hams", "glutes" mapped to the formal muscle ids. This is one table, and it closes the class in
   §4 rather than the two instances of it found by accident.
3. Leave `exercises.json` alone. It is append/annotate-only, nothing in it is wrong, and every
   problem found in this audit was fixable in the overlay.

---

*No row was added, renamed or deleted in this pass. Two aliases and one hidden id were added, and
the alias invariant tests were tightened to cover hidden targets.*
