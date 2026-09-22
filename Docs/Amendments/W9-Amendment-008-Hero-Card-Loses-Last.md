# W-9 Amendment 008 — The hero card loses `Last`

> ⚠ **§2 IS SUPERSEDED BY `W9-Amendment-009-Plinth-Returns-And-Target-Folds.md`** (same day, later
> decision). A9 restores a three-column plinth. **That is not a reversal of this document**: §1's
> deletion of `Last` — the duplicate of the per-set `Prev` — stands, and A9's third column is the
> athlete's NOTE, which duplicates nothing. Read A9 before moving `Goal` or `Best` again; everything
> A8-D1a, A8-D2, A8-D4 and A8-D5 decide about those two figures is still in force, and A8-D3a's OPEN
> follow-on is closed there. §4's design-authority divergence is replaced by A9-D5's.

**Amends:** `W9-Amendment-007-Per-Set-Prev.md` (which created this duplication and did not clear it)
**Touches:** the expanded lifting hero in `src/app/workout.tsx` — the `Last · Goal · Best` insight row
**Status:** 🔒 LOCKED
**Date:** 2026-09-08 (PO decision)
**Design authority:** ⚠ **diverges from the `.dc` by PO override.** See §4.

---

## 1. What the PO saw

> *"With the previous being under each set, as well as in the hero card, it feels repetitive. I would
> want to keep under each set."* — PO, 2026-09-08

W9-A7 put `Prev` under every not-done set and **left the hero's `Last` column standing**. Both read the
same source — `liftHistory.sessions[0]` — so on the PO's own screenshot the hero said `LAST 185 × 8`
and set 2 said `PREV 185 × 8`, four inches apart. That is the debt A7 created, and this clears it.

**W9-A8-D1 — Only `Last` was repeating, and only `Last` is deleted.** The row held three figures and
they are not the same kind of thing:

| Figure | Also on this screen? | Disposition |
|---|---|---|
| `Last` — top set of the last saved session | **Yes** — it is set 2's `Prev`, verbatim | **Deleted** |
| `Goal` — the athlete's own target | Echoed in `Target` and the collapsed strip | **Moved** into the meta column |
| `Best` — the standing mark | **No** | **Kept**, and given its date |

---

## 2. Where `Goal` and `Best` go — a column, not a plinth

The insight row is removed entirely: its divider, both vertical rules and all three columns. `Goal` and
`Best` move up into `heroMeta`, under the equipment line.

**W9-A8-D1a — `Goal` goes beside the name because it is the only DECISION on the card.** This is the
"cards are for acting inside of" rule applied one level down: the thing you can change belongs where the
eye lands, and the things you cannot are captions. It keeps its 22/24 bronze figure and its pencil —
moving a control must not quietly demote it — and `setGoalOpen` is untouched, so `SetGoalPanel` still
opens from it and still closes on a second tap.

**W9-A8-D2 — `Best` stays, as a line, and carries `achieved_on`.** Two facts decided this:

* **It is the only record surface inside a session.** Progress Hub, Workout Complete, the Legacy
  timeline and the squad recap all read `personal_records`, and every one of them is read *after* the
  session or away from it. Exercise Detail does not carry it at all — the `best` there is
  "best substitute", a different thing.
* **It is a 1–`PR_MAX_REPS` mark, not a working set.** `PR_MAX_REPS = 5`, and `fetchBests` filters
  `load_reps <= 5`. So `185 × 5` beside `185 × 8` was never the weaker lift — it was a different
  measurement printed in an identical format, which is what made the row read as broken. **Deleting
  `Last` removes that collision by itself**; no change to the record's definition is needed or made.

The date is what stops the same confusion re-forming under a `3×8` goal: it says *another day* without
spending a second line. `fetchBests` has always selected it and the hero has always discarded it.

**W9-A8-D3 — The `Strength` pill is deleted, not merged.** `workout.tsx` rendered the literal
`<Pill size="sm">Strength</Pill>` — the same word under a mobility cool-down as under a bench press,
which is precisely the defect fixed one line above it when the literal `Main lift` became
`SECTION_LABEL[ex.section]`. A row that says one word on all 721 visible exercises carries no
information, so it goes by subtraction. This also retires the only `Pill` import on the screen.

**⚠ W9-A8-D3a — A muscle was NOT put in its place, and that is deliberate.** The design's `.dc` wants
`exTags` + `exMuscles` on that line, and the cached catalogue index already carries `primaryMuscleIds`.
It was not built because the ids are not display names: `muscles.json` renders `lats` as *Latissimus
Dorsi*, and `MAIN LIFT · LATISSIMUS DORSI` at 12pt uppercase overflows a meta column that is ≈194pt
wide. Wiring real muscle names in is a layout question of its own. **OPEN follow-on**, not shipped here.

---

## 3. The arithmetic

Computed from the declared styles, single-line exercise name. The card is floored by the media slot
(`minHeight: 172`, `alignSelf: 'stretch'`), which is why trimming text rows alone buys nothing — and why
removing the row *below* the media buys all of it.

| | Before | After |
|---|---|---|
| card padding | 32 | 32 |
| `heroRow` (media floor vs meta stack) | max(172, 145) = **172** | max(172, 160) = **172** |
| insight row (margin 14 + padding 14 + 38) | **66** | — |
| **card height** | **270pt** | **204pt** |

**−66pt, −24%.** `Goal` and `Best` both land inside height the card was already spending, so the whole
plinth is returned to the set table. A two-line name (`Barbell Incline Bench Press`) gives 218pt.

**W9-A8-D4 — `gray400` for the date, not `gray600`, for the reason W9-A7-D5 gives.** Alabaster's
`gray600` measures 3.15:1 — clearing the non-text floor and **failing** the 4.5 this needs as text.

**W9-A8-D5 — The date parses at LOCAL midnight.** `new Date('2026-04-28')` is UTC, which renders as the
day *before* anywhere west of Greenwich — an athlete in Denver would be shown the wrong date for their
own PR. `T00:00:00` is appended, the same fix `add-photo.tsx` and `legacy-timeline-live.ts` already use.
The year is shown only when it is not the current one.

---

## 4. The design-authority debt

**PD-7 makes the `.dc` the authority, and `Forge Active Workout.dc.html` has the three-column plinth.**
It also has `insightLast`, `insightLastSub`, `insightGoalSub` and an `insightExpanded` toggle, none of
which the build has ever had.

**W9-A8-D6 — The `.dc` is not edited here**, for the reason W9-A7-D6 gives: recording an override in an
amendment is how this project overrules a design file, and editing the file to match the code would
destroy the record of which way the decision went. The divergence is now:

> `Forge Active Workout.dc.html` draws a `Last · Goal · Best` insight row under the hero. The build
> draws `Goal` and `Best` inside the meta column and no `Last` at all, by PO decision of 2026-09-08 —
> `Last` having become a duplicate of the per-set `Prev` that W9-A7 added by PO override of 2026-09-04.

A `design-gate` run on W-9 reports this as a delta. **Expected, DEFERRED-HONEST, not a regression.**

---

## 5. As built — 2026-09-08

| File | Change |
|---|---|
| `src/app/workout.tsx` | `lastPerf` / `lastText` retired; new `bestWhen`; `heroTags` + `Pill` import removed; `Goal` and `Best` rendered in `heroMeta`; insight row deleted; `insight*` styles retired, goal styles renamed `heroGoal*`, new `heroBest*` |
| `src/domain/coach/__tests__/progression.test.mjs` | comment corrected — it pointed `sessionPerformance` at a `Last` column that no longer exists (its live caller is the coach's `recent` list) |

**Gates:** `tsc --noEmit` clean · `expo lint` on `workout.tsx` reports **1 warning, 0 errors** — the
pre-existing unused `displayWeight` import, present on `HEAD` and left alone as out of scope ·
**3256 tests pass, 0 fail**.

⚠ **Not yet seen rendered, on a device or in Alabaster.** This is a layout change, so it lands in **both**
themes and the compiler only catches colour. It needs eyes on both faces before it is called done.

**Delivery — 2026-09-08.** ✅ **OTA published to build 8**, iOS `01a080dd-5d96-77e9-aa8e-6fdea3ad19e0` on
runtime `47944f2eea0b6bc314118d59fe087bcd5a652aca`. `fingerprint:compare --build-id 3f67281b…` returned an
**exact match before publishing**, and the manifest endpoint was then queried as a build-8 iOS client and
returned this update's id — deliverable, not merely published. eas-cli pinned **22.3.0**. Commit `c78af25`
on `feat/route-map`, cherry-picked as `8aa3712` on `ota/build8-js`. ⛔ **Web not deployed.**

⚠ **`eas update` now also requires `--environment` in non-interactive mode** — without it the command exits
"update command failed", which reads like a publish failure rather than a missing flag. New since W9-A7.

⛔ **W9-A8-D7 — The cherry-pick found `ota/build8-js` already failing `tsc`, and it is NOT this pass's
doing.** Three errors in `src/app/squad/[id].tsx`: `takePostedWorkout` imported from `planned-workout-live`,
which does not export it on that branch, and `PlannedWorkout.source`, which does not exist there. `7ad824b`
cherry-picked the posted-workouts **client** half onto a branch that never received its **data** half — that
work is still uncommitted on `feat/route-map` beside an unapplied `0192_posted_workouts.sql`. It was
published in that state on 2026-09-07. Left alone here rather than repaired with somebody else's
in-progress code: `doTake` wraps the call in a try/catch so the symptom is a toast, not a crash, and the
posted-workout UI needs `0192` to be reachable at all. **Third half-shipped pair to reach this branch.**

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-08 | Cleared the duplication W9-A7 created. Established that only `Last` repeated — `Goal` moved up as the card's one decision, `Best` kept as the only in-session record surface and given the `achieved_on` date `fetchBests` already returned. Deleted the hardcoded `Strength` pill as furniture; declined to replace it with a muscle name pending a layout answer for long names. Recorded the `.dc` divergence rather than editing the design file. |
