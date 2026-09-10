# Program Fork/Edit Amendment 002 — Adjusting the Schedule of a Program You Are Running
## Forge Legacy | Version 1.0 — September 2026

**Status:** Implemented, pending PO sign-off
**Amends:** `Program-Detail-Wireframe-Spec-W3.md` (LOCKED), `Program-Fork-Edit-Wireframe-Spec-W5.md` (LOCKED, already amended by `Program-Fork-Edit-Amendment-001`)
**Depends on:** `Program-Fork-Edit-Amendment-001-Live-Program-Editing.md` (LOCKED 2026-08-20), `Program-Architecture-Amendment-001-Active-Program-Rule.md` (LOCKED), migrations `0119`, `0123`, `0156`, `0175`, `0198`

---

## Section 0 — Why

PO, 2026-09-09, relaying a tester:

> *"He basically has been doing legs one day, then chest on the next, then back, and so on. But he started
> playing soccer on Saturday and doesn't want to do legs on the day he has. So basically he wants to be
> able to go into the program and drag the days into different orders … And then have that be the
> adjustments for the rest of the weeks. I'm sure there are many situations like this."*

The product could already trade two sessions inside one week. It had no way to say *"and keep it that
way"*, which is the actual request.

### ⚠ The answer is not a weekday, and that is not a limitation to lift later

Forge programs are **sequential**. A program is Day 1, Day 2, Day 3 in order; it contains no Saturday to
move anything off. This is stated independently in three locked documents:

> `Program-Authoring-Standard-v1.0` §2.2 — *"**Critical locked rule:** `dayOfWeek` is always `null` for
> Forge programs. Programs are sequential, not calendar-based. **Do not author programs assuming specific
> days of the week.**"*

> `Calendar-System-Architecture-v1.0` CAL-D3/D9 — the Calendar *"stores no schedule of its own"* and
> *"edits no slot … Editing the program is done in the Program system (W-3/W-5), never on the Calendar."*

`Program-Catalog-Architecture-v1.0` carries the same `dayOfWeek: number | null` field and the same rule.

So the tester's problem is real and his mental model is not ours. In the model the product has, "legs is
on my soccer day" means "legs is in the wrong position in my order", and the fix is to move it and keep
the move. **Whether Forge should ever learn real weekdays is a separate product question and is filed in
the Decision Queue rather than answered here.**

---

## Section 1 — The five adjustments, and which are new

| # | Situation | Mechanism | Status |
|---|---|---|---|
| 1 | Change the order and keep it | `reorderWeek(..., 'rest_of_block')` via the Reorder sheet | **NEW** |
| 2 | Rearrange this week only | Same sheet, *Save for this week only* | **NEW** |
| 3 | One-off trade, this week | `swapSessionOrder` — Home's swap sheet, Program Detail's Swap | Shipped 0119 |
| 4 | Train an outstanding session early | Program Detail *Train this* | Shipped 0119 |
| 5 | Pass over a session | Skip | Shipped 0119 — **now confirmed, and reversible** |
| 6 | Undo a skip | `unskip_program_session` | **NEW (0198)** |
| 7 | Injury: rebuild a session around what hurts | Ask Holt → *avoid* → `rebuildDay`, this week or rest of block | Shipped |

### Deliberately not built, because the model already handles them

- **Missed a day. Travel. Illness. Vacation.** Nothing to reschedule: the next session waits. There is no
  Tuesday to miss, and `Program-Architecture-Amendment-001` §4 forbids judging anyone by elapsed time —
  *"an athlete who takes nine months over an eight-week program has graduated it"*.
- **"I can only train fewer days a week now."** A six-session week simply takes longer than seven days.
  Changing the session COUNT of a running program is refused by design (§2), and Duplicate is the path to
  a differently shaped program.

---

## Section 2 — The two invariants, inherited unchanged

Amendment-001's rule stands exactly as written, and everything here is built inside it:

> 1. **Sessions already trained or skipped are frozen.** Their content cannot change.
> 2. **`totalSessions(structure)` cannot change.** The program keeps the length it had when it started.

Migration `0123` states the same thing from the other side, and names the reorder as the legal case:

> ⚠ **A STARTED PROGRAM MAY BE REORDERED. IT MAY NOT CHANGE HOW MANY SESSIONS IT HAS.**

A reorder is only ever a **permutation**, so the second invariant is satisfied by construction. The first
is enforced by pinning (§3). `reorderWeek` also re-checks `totalSessions` before returning and hands back
the untouched structure if it ever failed — a permutation cannot break it, so a failure would mean the
code is not the permutation it claims to be, and that is better caught here than as a `0175` exception
with a stack trace.

---

## Section 3 — Pinned positions (SA-D1)

**SA-D1. A session that has been trained or skipped does not move. The reorder flows around it.**

This is correctness, not courtesy. `program_sessions` rows are keyed by `(week_index, day_index)`. A
session that moves out from under its own record leaves that record pointing at a different workout, and
the app then claims a session nobody did.

So a position carrying a mark keeps the day it has. The remaining positions, in ascending order, receive
the remaining days in the order the athlete asked for. With nothing touched this is the plain
permutation; with the first three of a six-day week trained, it reorders the last three.

**The athlete is never shown a refusal.** Pinned rows render with their mark and no controls, the drag
steps over them, and the chevrons skip them — so what the interface lets them express is exactly what
will be saved. Same principle `edit-ops.canEdit` is exposed for: *"a row you can tap and then be told no
is worse than a row that was never there."*

---

## Section 4 — Scope, and the weeks a reorder does not touch (SA-D2)

**SA-D2. A week built to a different shape keeps its own order, and the confirmation says so.**

The two scopes are the two `edit-ops` already uses — `this_week` and `rest_of_block` — chosen by which
Save button is pressed rather than by a separate control.

An `order` is a permutation of one week's session count. Applying it to a week with a different number of
sessions is not a smaller version of the same edit; it is a guess. Real programs are full of these: a
block that drops a conditioning day, a deload week, the short week at the end of a ragged block. Those
weeks are skipped, and the confirmation names the range it will change so nobody finds out later.

---

## Section 5 — Skipping becomes a decision, not a tap (SA-D3)

**SA-D3. Skipping is confirmed. It can be undone while the program is running, and never after.**

Skipping wrote to the schedule on a single unguarded tap, from a row of four text buttons beside
"Train this", with no way back. That would be a small annoyance if a skip were cosmetic. It is not: a
skipped session **counts toward finishing the program** (PO decision, 2026-08-07), so a mis-tap moves the
athlete a session closer to a graduation they did not train for — and on the last outstanding session it
**is** the graduation: `state = 'graduated'`, a `PROGRAM_GRADUATED` timeline event, and five permanent
honors, with `Program-Architecture-Amendment-001` §1 providing no way to reactivate.

Two changes:

1. **A confirmation**, with different copy on the last outstanding session, which says plainly that
   finishing cannot be undone.
2. **`unskip_program_session` (0198)** — ACTIVE programs only, and it deletes only a `skipped` mark.

**The window is the run, and that is the design.** Un-skipping a sealed program would drop it back below
its own finish line with honors already awarded. Refusing is the same rule that makes a graduation
permanent, seen from the other side.

`0198` also closes a hole that predates it: `program_sessions`' policy had been `for all` since `0119`,
so a client could `DELETE` or `UPDATE` any of its own marks — a `completed` one included — straight
through PostgREST. The policy is now select + insert; removal goes through the RPC.

---

## Section 6 — Not while a workout is open (SA-D4)

**SA-D4. Reorder and swap are refused while a workout for that program is open on the device, with a
sentence rather than a silent failure.**

The logger resolves its slot when it **opens**; `save_workout` resolves the first open slot when it
**commits**. Reorder in between and the workout is filed at a position that now holds a different day.

⚠ **Sending the logger's resolved slot along does not fix this, and makes it worse.** A reorder moves no
marks, so the first open *position* is identical either way — and an explicit slot that has been touched
in the meantime hits `on conflict do nothing` and saves the workout with **no mark at all**, silently.
The default path stays; the schedule holds still instead.

**Known limit, named rather than ignored:** detection is device-local. `useWorkoutSession` carries no
program id and the `0181` live snapshot carries no program field, so a session open on another device is
invisible. That window already existed for Home's swap. An airtight fix needs a stable identity on
`ProgramDay` matched server-side, which the model does not have.

---

## Section 7 — Three defects this closed on the way

All three are from `Docs/Launch-Audit-2026-08-12.md`, all three reproduced, and each one would have been
made worse by a reorder feature stacked on top of it.

- **P0-22** — Program Detail fed `workouts.length` into `computeProgress` while holding the marks in
  state. A skip writes no workout, so a program graduated by skipping read 17% forever and the
  current-week dot pointed at a week the athlete had left. Now `progressFromMarks`.
- **P0-23** — `buildLog` filed workouts positionally by date with no marks. After a skip, every later
  session shifted one slot earlier: the skipped day showed the next workout's sets, carrying a completion
  tick and a "Skipped" chip at once. Now filed by `program_sessions.workout_id`.
- **P0-24** — `nextSession(structure, count)` is `slots[count]`, which names the (count+1)-th session
  rather than the first outstanding one. Four screens used it, and `templates-live` snapshots the result
  into a Train-Together invite — sending **both** athletes to a session one had already logged. All four
  now use `nextOpenSlot`; `nextSession` and `computeProgress` are retired.

### And one latent bug found while building

`swapSessionOrder` took **schedule-space** indices from its callers (both compute them over
`trainingDays(...)`) and applied them to the **raw** `days` array. Those are the same number only on a
week with no empty day in it — which is every week Holt and the catalog author, which is why it had never
surfaced. On a week with a gap it swapped the wrong pair and could move the gap itself, changing which
schedule position each later session occupies **without** changing the count, so neither `0123` nor
`0175` would have noticed. Swap is now a two-element `reorderWeek`, which converts explicitly.

This is the same filtered-vs-unfiltered divergence the Decision Queue names for `edit-ops.ts`. **That one
is still open** — this fixes the swap path only.

---

## Section 8 — What did not change

- **`dayOfWeek` is still null, and programs are still sequential.** Nothing here introduces a weekday.
- **Content editing on a Forge-authored program is still Duplicate-only.** ORDER is the athlete's; the
  exercises are the catalogue's. That provenance rule (Amendment-001 §5, PO-confirmed 2026-08-20) is
  untouched, and reorder is offered on catalog programs exactly as Swap already was.
- **The Calendar still owns no schedule.** It projects; W-3 edits.
- **Holt still does not reshuffle a live program on its own.** `Coach-Adaptive-Learning-Amendment-001`
  CL-D5 stands: skips may lower `daysPerWeek` and may never raise it unprompted. ⚠ CL-D5's *reasoning*
  cites "PE/W-5: structural edits are future-state only", which `Program-Fork-Edit-Amendment-001`
  overruled nine days later. **The citation is stale; the rule is not.** Holt does not reorder because
  reordering is the athlete's call, not because it is forbidden.
- **Skip is still not offered from Home.** That was a product decision and it stands; Program Detail is
  where the schedule is edited.

---

## Section 9 — Not built, and not forbidden

**Cross-week moves.** Moving a session from week 3 to week 5 breaks neither invariant and would be the
same pinned projection. Nobody has asked for it, and the week is the unit an athlete reorders within.
Recorded so a later reader knows it was considered rather than overlooked.

---

## Section 10 — Verification

- `npx tsc --noEmit` → 0
- `node --test --experimental-strip-types "src/**/__tests__/*.test.mjs"` → 3,377 pass / 0 fail
  (+101 this pass: `schedule-edit` 29, `program-schedule-wiring` 27, the rest ported into `progress-core`)
- `npx expo lint` → at baseline (1 pre-existing error)
- ✅ **`0198` APPLIED AND VERIFIED 2026-09-09** — all 8 assertions PASS (function present · `security
  invoker` · executable by `authenticated` · `program_sessions` policies exactly `a,r` · **no update or
  delete door remains** · the old `for all` policy gone · `skip_program_session` and `save_workout` both
  untouched).
- ⚠ **The same verify returned `55 completed / 0 skipped`** — no athlete has ever skipped a session. This
  reframes §7 rather than softening it: **P0-22 and P0-23 were latent**, since both need a skip to fire,
  and the "graduated by skipping reads 17% forever" case had never reached a real athlete. **P0-24 was
  not latent** — `slots[completedCount]` breaks after a *swap* as well, and swapping has shipped since
  0119, so the invite naming an already-logged session was reachable with the data on hand.
  ⚠ **`unskip_program_session` therefore has no existing rows to act on and has not been exercised against
  real data.** Its refusal and delete paths are proven by the migration's self-check and by unit tests,
  not by a round trip. The first real skip is the first real proof.
- Manual, on an active program with sessions trained: progress and log agree after a skip; the log shows
  no row both ticked and skipped; skip confirms, and the last session says finishing is permanent; undo
  restores; a reorder saved for the rest of the program holds in every later week of the same shape and
  changes no earlier one; Home re-resolves to the new first open slot; reorder and swap are refused with
  a sentence while a workout is open.

### Decisions
| Id | Decision |
|---|---|
| SA-D1 | A trained or skipped session is pinned; the reorder flows around it, and the interface never offers what would be refused. |
| SA-D2 | A week with a different session count keeps its own order, and the confirmation names the range that will change. |
| SA-D3 | Skipping is confirmed, with distinct copy on the last outstanding session; it is reversible while ACTIVE and never after. |
| SA-D4 | Reorder and swap are refused while a workout for that program is open on the device; the logger's default save path is unchanged. |

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-09 | Initial amendment. Adds week reorder with scope, skip confirmation, and un-skip; records the swap index-space fix and the closure of P0-22/23/24. |
