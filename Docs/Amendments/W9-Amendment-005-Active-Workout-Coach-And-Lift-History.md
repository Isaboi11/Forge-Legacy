# W9-Amendment-005 — Lift History on the Active Workout, and Coach Holt on the Bar

**Status:** PART A + PART B BUILT (2026-08-10). All four decisions resolved (§5). One tier of Part B
deliberately deferred — see §9.
**Governs:** `Active-Workout-Flow-Spec-W9-W16.md` §5.5, §6.2, §6.3; `Forge Active Workout.dc.html`
**Date:** 2026-08-10

---

## 1. Why this exists

Two asks, and they turn out to be the same wiring job:

1. **"Verify Last / Best / the coach's suggestion / the weight prefill are actually connected."** They are
   not. Details in §2 — the short version is that three of the four are *hard-coded em-dashes on screen
   over data the app already has*, and the fourth is a fully-built engine wired to the wrong screen.
2. **"Plan what a coach looks like on the active workout page."** §3–§4. It needs §2 first: a coach on this
   screen with no lift history is a coach with nothing to say.

---

## 2. VERIFICATION — what is actually wired

### 2.1 "Last" — NOT WIRED. Hard-coded.

`src/app/workout.tsx:1845` renders a literal `—`. Nothing on the screen fetches last-session sets.

The data exists and is already queried elsewhere: `fetchRecentSetsFor` in `src/data/coach-live.ts` pulls
`workouts → workout_exercises → workout_sets (set_index, weight, reps)`, newest first, capped at two
sessions. **Its only caller is the Coach wizard** (`src/app/coach.tsx:357`). The logger never calls it.

### 2.2 "Best" — DATA IS FETCHED, THEN NEVER RENDERED.

`src/app/workout.tsx:1853` renders a literal `—`.

But `priorRecord` **is** loaded — `fetchPriorRecords` at `workout.tsx:572` — and held in state. It is
consumed at exactly one place, `workout.tsx:785`, to decide whether a logged set trips the PR prompt. The
number is in memory, three lines of JSX away from the column that says `—`.

Two defects in `fetchPriorRecords` (`src/domain/workout/save.ts:352`) block rendering it as designed:

- It selects `exercise, load_value` only. The design asks for `215 × 5` plus a date; `load_reps` and
  `achieved_on` **exist on the table** (`0001_spine.sql:111`) and are being discarded.
- It matches **by name only**, while `fetchLastNotes` right above it matches `catalog_key` first with a
  name fallback. Two answers to "which lift is this" on one screen is how surfaces drift — here it would
  show a Best that disagrees with the note beside it.

### 2.3 The coach's suggestion — BUILT, TESTED, WIRED TO THE WRONG SCREEN.

`src/domain/coach/progression.ts` already does precisely what was asked. `progressionFor()` reads the last
two sessions and returns one of `add_weight` / `add_reps` / `hold` / `back_off` / `no_history`, with a
suggested weight, a suggested rep target, a sentence written to be shown verbatim, and the evidence it
read. Increments are per movement pattern and scaled by experience (`incrementFor`). It refuses to deload
off one bad session and refuses to push through a miss.

**Its only caller is `src/app/coach.tsx:370`**, where `p.message` is shown once in the day preview and then
**dropped** — `saveWorkoutDraft` does not carry it, so it never reaches the logger. The Active Workout
screen contains zero references to it.

The design file makes the intent explicit: the Goal column's sub-line in
`Forge Active Workout.dc.html:694` is `goalSub: '+5 lb from last week'`. That string is this engine's
output. Nothing renders it.

### 2.4 Weight auto-prefill — NOT WIRED.

Every construction path seeds `weight: null`:
`build-session.ts:43`, `build-session.ts:108`, `session-core.ts:62`, `workout.tsx:403 / 2787 / 2811 / 2832`.

`openSheet` (`workout.tsx:838`) seeds the input from `set.weight` only — `null` gives an empty box. The
only carry-forward that exists is `addSet` (`workout.tsx:823`), which copies the previous set's weight
**within the current session**.

**The row must stay empty, and that is correct.** `session-core.ts:57-62` explains why: a `weight` on an
untouched set records a lift nobody made and can announce a PR for it. `Active-Workout-Flow-Spec-W9-W16.md`
§6.3 agrees and locates the fix in the right place — the **sheet input** pre-populates, the row does not:

> 1. Last logged set in this session for this exercise · 2. Most recently logged weight for this exercise
> across all prior sessions · 3. Program target weight · 4. Empty

Only rule 1 is implemented. Rules 2 and 3 are missing.

### 2.5 Per-set "Prev" — not built (design has it, spec has it)

`Forge Active Workout.dc.html:281,1481` shows `Prev 185 × 10` in the collapsed hero strip, indexed to the
**same set position** in the last session. Spec §5.5 asks for the same on pending rows.

### 2.6 What needs no work

**No migration.** `workout_sets` carries `set_index, weight, weight_unit, reps`; `personal_records` carries
`load_value, load_reps, achieved_on, load_unit`. Everything §2 needs is already stored and already
populated by `save_workout` / `continue_workout`.

### 2.7 One discrepancy to resolve, not to silently pick a side on

Spec §6.2 "What does not appear" bans, mid-workout: **PR indicators**, and **comparison to prior
performance** ("Down 5 lb from last week"). The build already ships a PR prompt (`workout.tsx:784-791`) and
a per-set fuse flash, and this amendment proposes to add exactly the prior-performance comparison §6.2
forbids. The spec predates both the PR ceremony work and the progression engine. See decision **D-3**.

---

## 3. PART A — Wiring the history (prerequisite for everything in Part B)

### A1. One fetch, one shape

New `src/data/lift-history-live.ts`, one call for the whole session:

```ts
export interface LiftHistory {
  sessions: HistorySession[];                                   // last 2, newest first
  best: { weight: number; reps: number; achievedOn: string } | null;
}
fetchLiftHistory(lifts: {catalogKey?: string; name: string}[]): Promise<Map<string, LiftHistory>>
```

- `sessions` is already `fetchRecentSetsFor`'s output shape (`HistorySession` from `progression.ts`) —
  move it here and have `coach.tsx` call the new module, so there is one lift-history read in the app.
- **Match `catalog_key` first, exact name as fallback** — the `fetchLastNotes` rule. This is a change to
  `fetchRecentSetsFor`, which currently matches on name alone. Keep its "an exact match or nothing"
  stance: a near match would confidently suggest adding weight to a movement they never did.
- Keyed by `catalogKey ?? name`, the same identity the rest of the screen uses.
- **Absent means "never done it," never zero.** A missing key must render `—`, not `0`.
- Fails silent, like both reads it replaces. A history we cannot read is not an error toast between sets.

### A2. Render Last and Best

- **Last** = the mode working weight of `sessions[0]` (reuse `workingWeight` from `progression.ts` — the
  mode, so a top single after three back-off sets does not misreport the session), formatted `185 × 10`,
  with the session date as the sub-line.
- **Best** = `personal_records`, heaviest `load_value` at `load_reps ≤ PR_MAX_REPS`, as `215 × 5` +
  `achieved_on`.
- Both through `useUnits` — pounds are canonical in storage, the athlete's unit is what gets drawn.
- `fetchPriorRecords` widens to return `{weight, reps, achievedOn}`. **The PR path at `workout.tsx:785`
  must be updated in the same edit** — it currently indexes a `Record<string, number>`, and widening the
  return type without touching it would break record detection.

### A3. Goal sub-line = the coach's call

Per exercise, once the history lands, run `progressionFor({...})` with:

- `prescription` from the live session (`ex.sets.length`, `targetReps`, `targetRepsMax`) rather than from
  the original program — the athlete may have added or removed sets, and `goalTextFor` already reads off
  the sets for the same reason.
- `pattern` via `itemByKey(ex.catalogKey)?.pattern`, as `coach.tsx:372` does.
- `experience` from `loadExperience()` (`src/lib/coach-memory.ts`, `.lifting`). **Null must not default to
  `beginner`** — beginner carries a 1.5× increment multiplier, so an unknown athlete would be told to add
  the most weight. Default `intermediate` (1.0×) when unremembered.

Render `p.message` beneath the Goal column. `action === 'no_history'` renders **nothing** — the
`coach.tsx:380` precedent. Recompute when the athlete edits sets on that exercise.

### A4. Weight prefill in the sheet

In `openSheet`, when `set.weight == null`, seed `draftW` from the first that resolves:

1. last logged set in this session for this exercise (existing behaviour, unchanged)
2. `progression.suggestedWeight` — **see decision D-1**
3. last session's weight at this set index
4. `set.targetWeight` (percentage prescriptions)
5. empty

`set.weight` itself stays `null`. The row keeps reading `—` until the athlete logs, so no fabricated lift
and no false PR — the invariant `session-core.ts:57` protects.

### A5. Per-set "Prev"

Follow the `.dc`: `Prev` goes in the **collapsed hero strip**, indexed to the current set position. It does
**not** become a fifth column — the table is already `Set · Target · Weight · Actual` at phone width, and
the design does not add one either. Spec §5.5's "on pending rows" reading is superseded by the `.dc` per
**PD-7** (design governs).

---

## 4. PART B — Coach Holt on the Active Workout

### 4.1 Placement — the floating bubble, bottom right (PO ruling, D-2)

**The coach is the same floating Holt bubble it is everywhere else, bottom right, above the
`Add Exercise / Finish Workout` bar.** The ⋮ menu is untouched and keeps every row it has today.

The PO's ruling, and the reasoning behind it: there is real empty space in the bottom-right of this screen
and a bubble there stands in front of nothing. That also makes this the *cheapest* option — nothing moves,
nothing is removed, no existing route to a mid-session action regresses. ⋮ stays the direct path for
someone who knows what they want; the bubble becomes the path for someone who wants to be told.

The old note in `CoachBubble.tsx` — that a live workout "owns the whole screen" — was a guess, and it was
wrong about *this* screen. It is corrected here rather than worked around.

#### ⚠ Mount it inside `workout.tsx`, not by relaxing the root bubble

`CoachBubble` renders **outside the navigator**, at `_layout.tsx:97`. That placement already caused a
launch crash once (`overlay-boundary.tsx:8` — it asked for safe-area insets where no provider existed, and
took the whole app down on device; it never reproduced on web).

The relevant consequence here is narrower and certain: **a root-mounted bubble cannot see this screen's
local overlay state.** The rest overlay, the exercise seal, the PR prompt, the ⋮ sheet and the set-entry
sheet are all `useState` inside `workout.tsx`. A bubble mounted a level above would float on top of the
set-entry sheet — over the number pad, mid-set. That is the one place it genuinely *would* be in the way.

So: a session-scoped bubble mounted inside `workout.tsx`, reusing `HoltMark` / `BUBBLE_SHADOW` and the
sheet, hidden whenever any of those overlays is up. The root `CoachBubble`'s `HOME_SURFACES` allow-list
stays exactly as it is — it was rewritten *into* an allow-list precisely so it could not silently acquire
screens, and `/workout` should not be the exception that starts that over.

**Bottom offset:** clear of the action bar, and clear of `toastWrap` (`bottom: 100`) and `joinBannerWrap`
(`bottom: 108`), which occupy the same band. Toasts fire on every logged set, so this is not an edge case.

**No teaser on this screen.** The teaser rule is "only when there is a real, specific thing to say"; mid-set
the bar for that is a nag, and the answer is the mark alone.

### 4.2 What the coach can do here

**Tier 1 — change the plan.** Every mutation already exists on the screen; the coach becomes a *reasoned*
front door to them instead of a flat menu.

| Ask | Wires to | New work |
|---|---|---|
| "Bench is taken" / "swap this" | `openSwap` + `exercise-relationships` query-service | Rank substitutes by movement pattern and by gear the athlete owns (`EXERCISE_GEAR`), and **say why**: "same push pattern, and you've got dumbbells." Exercise-002 already scopes substitution to session/log time. |
| "Pair these two" | `supersetWithNext` / `breakSuperset` | Offer it only where it makes sense — antagonist or unrelated patterns. Supersetting two heavy squat patterns is not a suggestion a coach makes. |
| "Add something for arms" | `openAdd` | Pre-filter the picker to what is missing from today's session. |
| "Skip this" | `skipExercise` | Say what that costs — "that was the only pull today." |

**Tier 2 — change the load.** This is the actual coaching, and it is the part that does not exist yet.

- **"That felt heavy"** → drop the remaining sets by one `incrementFor(pattern, experience)` step, and
  say so. **"That was easy"** → add one. Writes `targetWeight` on the remaining undone sets only.
- **"I only have 20 minutes left"** → recompute which of the remaining exercises matter and drop the rest,
  **naming what was dropped**. This is the one genuinely new domain piece; `day.ts`'s pattern rotation
  already knows what a session cannot afford to lose.

**Tier 3 — answer about the lift.** `domain/exercise-coaching` already holds cues, mistake corrections and
regression/progression edges per exercise. Wire "what am I doing wrong / how should this feel" to it —
**gated on published content only** (794 covered, 732 published; the committed store is empty), and silent
where there is none. A coach that invents form advice is worse than one that says "not my area."

### 4.3 Shape

Extend `chat-core.ts`'s existing `mode: 'program' | 'day'` with a third, `'session'`, rather than building
a parallel router. The sheet opens on **chips, not a text box** — the athlete is holding a phone with one
hand between sets, and the PO's standing note is that Holt should stop asking people to type. Chips are
generated from the live session: the current lift's name, the remaining exercises, the clock.

### 4.4 What it must never do

- **Never speak unless tapped.** The one teaser exception (`Coach-Chat-Design-Brief` §3.4–3.5) — only when
  there is a real, specific thing to say — is even tighter here: mid-session, a nag is an interruption of
  a set.
- **Never interrupt a ceremony or a rest overlay.**
- **Never deload off one session, never push through a miss.** `progression.ts` already enforces both;
  nothing in Part B may route around it.
- **Never frame as AI** (ONB-D13). It is a rulebook, and it should read like one.
- **Endurance refuses rather than guesses** — the existing rule holds; cardio blocks get no load advice.

---

## 5. DECISIONS — all resolved, PO, 2026-08-10

**D-1 — Does the coach's suggested weight outrank last session's actual weight in the prefill? → YES.**
The sheet opens on the coach's number, not on last session's. Spec §6.3 rule 2 ("most recently logged
weight") is amended: the engine's answer *is* that number plus a decision, and the athlete overrides it by
typing, same as always. §6.3 predates the engine.

**D-2 — Where does the coach live? → THE FLOATING BUBBLE, BOTTOM RIGHT.**
PO ruling: there is real empty space there and it stands in front of nothing. ⋮ is untouched and keeps
every row. See §4.1, including the requirement to mount it inside `workout.tsx` so it can hide behind this
screen's own overlays.

**D-3 — Reconcile spec §6.2. → AMENDED. The ban is lifted for the coach's line.**

*What the question was.* §6.2 of the W-9 spec lists things the app must **not** show while you are
mid-workout, and two entries on that list are "personal record indicators" and "comparison to prior
performance — e.g. *Down 5 lb from last week*." The original reasoning was that a running scoreboard turns
a training session into a performance you can fail at. But the feature asked for here — *"you hit 3 × 10 at
185, go to 190"* — is a comparison to prior performance in exactly the banned shape. The spec says no, and
the build was about to say yes. Rather than quietly override a written rule, it gets changed on the record.

*The ruling.* The ban was written against **scoring**, not against **coaching**, and the two are opposite:
a scoreboard tells you how you did, a coach tells you what to do next. §6.2 is amended to permit
forward-looking instruction and the evidence behind it (Last, Best, and the progression line). It continues
to ban the scoring forms — no "down 5 lb," no percentage-of-last-week, no pass/fail on a set.

*Second half, unchanged and separate:* §6.2 also bans mid-workout PR indicators, and the app has shipped
one for some time (`workout.tsx:784`, plus the fuse flash). That is a pre-existing spec-vs-build gap, it is
not created by this amendment, and this amendment does not resolve it — logged as an open item.

**D-4 — Scope of the first pass. → PART A FIRST.**
Ship the history wiring on its own. Part B follows.

---

## 6. Files touched (Part A)

| File | Change |
|---|---|
| `src/data/lift-history-live.ts` | **new** — one lift-history read |
| `src/data/coach-live.ts` | `fetchRecentSetsFor` moves in; gains catalog-key matching |
| `src/domain/workout/save.ts` | `fetchPriorRecords` returns reps + date; catalog-key matching |
| `src/app/workout.tsx` | Last/Best rendered · progression run + message · `openSheet` prefill · `Prev` in the collapsed strip · PR path updated for the widened record type |
| `src/app/coach.tsx` | points at the moved fetch |
| `src/domain/coach/progression.ts` | unchanged |
| migrations | **none** |

Part B adds a session-scoped bubble + sheet inside `src/app/workout.tsx`, a `'session'` mode in
`src/domain/coach/chat-core.ts`, and leaves `src/components/forge/CoachBubble.tsx` and its
`HOME_SURFACES` allow-list alone (§4.1).

## 7. Open items, not resolved here

- **⚠ LOGGED WEIGHTS ARE NOT UNIT-NORMALISED, and this was found while building Part A.**
  `save-core.ts:109` writes whatever number the athlete typed and stamps `weight_unit: 'lb'` on it
  unconditionally — there is no conversion anywhere on the save path. `save_workout` does the same for
  `personal_records.load_unit`. So for an athlete on metric, the stored figure is **kilos wearing a
  pounds label**, and every downstream consumer that trusts the label is wrong about them.

  Part A does **not** compensate for it. Last, Best, Prev and the prefill all render the figure exactly as
  stored, which is what the rest of this screen already does (`targetWeight` renders its raw number beside
  `unitLabel(units)`). Converting on read would have halved a metric athlete's own logged lift in front of
  them to fix a bug that lives on the write path. The honest fix is a migration that normalises stored
  weights and a conversion at save — a separate piece of work, and it should not be bundled into a
  read-side amendment.

- **Mid-workout PR indicators vs spec §6.2.** The app ships them; the spec bans them. Pre-existing, and
  untouched by this amendment (D-3). Needs its own ruling.

- **A catalogue rename orphans lift history.** History matches on `catalog_key` with a name fallback, and
  rows written before 0078 carry no key — so renaming an exercise makes the coach fall back to "first time
  on this." That is the safe direction to fail in, and it is worth knowing before anyone renames anything.

---

## 8. Part A — what was actually built

| Change | Where |
|---|---|
| `fetchLiftHistory` — one lift-history read, catalog-key-first identity, explicit `athlete_id` filter, main-section preference when a lift appears twice in one session | `src/data/lift-history-live.ts` **(new)** |
| `fetchRecentSetsFor` retired; the Coach wizard now reads the same history the logger does, by key rather than by name | `src/data/coach-live.ts` **(deleted)**, `src/app/coach.tsx` |
| `fetchPriorRecords` retired — it discarded `load_reps`/`achieved_on` and matched by name while `continueWorkout` two functions above matched by key | `src/domain/workout/save.ts` |
| `sessionPerformance()` — one past session as `{weight, reps}`, mode weight + best reps at it | `src/domain/coach/progression.ts` |
| **Bodyweight lifts progress in reps, never in load.** `weight: 0` is a logged answer in this app, and unguarded the engine told athletes to add 2.5 lb to a push-up | `src/domain/coach/progression.ts` |
| Last / Best rendered · `HOLT SAYS` line from `progressionFor` · sheet weight prefill (§6.3 order, coach at 2) · `Prev` in the collapsed hero strip · PR detection moved onto the key-first mark | `src/app/workout.tsx` |
| 6 new tests (bodyweight rule ×3, `sessionPerformance` ×3) | `src/domain/coach/__tests__/progression.test.mjs` |

**Verification:** `tsc --noEmit` clean · `expo lint` at baseline (1 pre-existing error in
`use-color-scheme.web.ts`, 13 pre-existing warnings — no new findings) · full suite **1644 pass / 0 fail**.
**No migration** — every column was already there and already populated.

---

## 9. Part B — what was actually built

| Change | Where |
|---|---|
| `SessionCoachSheet` — Holt's read on the current lift (his sentence + the evidence under it), then the situations: felt heavy · was easy · can't do this one · short on time · want to do more · move past this | `src/components/forge/SessionCoachSheet.tsx` **(new)** |
| The bubble, bottom right, **mounted inside the screen** so it can hide behind the screen's own overlays (`holtHidden`) | `src/app/workout.tsx` |
| `adjustRemainingLoad` — moves the bar on the UNDONE sets by `incrementFor(pattern, experience)`, so a lateral raise moves 2.5 and a deadlift 10 | `src/app/workout.tsx` |

**Not a second ⋮.** ⋮ is a list of *operations* and stays exactly as it was; this is a list of
*situations*, each carrying the reason it is being offered. An athlete who already knows they want to swap
an exercise has ⋮; this is for the one who knows something is wrong and not what to do about it. Nothing
was moved out of ⋮ and nothing here is reachable only from here.

**The three rules the load change obeys, each of which would be a defect if broken:**

1. **Only undone sets move.** A completed set is a record of something that happened; rewriting its weight
   would falsify the log — and it is the very set the athlete is reacting to.
2. **It writes `weight`, not `targetWeight`.** `targetWeight` is what the *program* asked for. A plan that
   prescribed 80% of a max did not stop asking because today felt heavy, and overwriting it would erase
   the prescription the athlete is knowingly deviating from. What moves is the number waiting in the box —
   a proposal, still confirmed set by set, the same status the prefill has.
3. **It reports what happened, not what was asked for.** With no number anywhere to move — first session,
   no history, nothing typed — it says so rather than confirming work it did not do.

**Placement note.** `holtHidden` is a BLOCK-list, the opposite of `CoachBubble`'s allow-list, and
deliberately so: there the question is "which of ~40 routes should this appear on" and enumerating
exceptions was proven to miss some; here it is one screen whose overlays are all declared within forty
lines of each other, and a new overlay that forgets the bubble is a visible bug on the next run rather
than a silent policy breach on a route nobody re-tested. `HOME_SURFACES` is untouched.

**Verification:** `tsc --noEmit` clean · `expo lint` at baseline (1 pre-existing error, 13 pre-existing
warnings) · **1651 tests pass / 0 fail**.

### Deferred from Part B, and why

- **"I've only got 20 minutes" → recompute the rest of the session.** The sheet offers the honest small
  version today (pair this exercise with the next, which genuinely saves a rest). Dropping exercises by
  priority needs a rule for which movements a session cannot afford to lose. `day.ts` has a pattern
  rotation that knows this, but applying it to a live half-finished session is new domain work with its
  own failure mode — silently dropping the one exercise the athlete came in for. Not worth guessing at.
- **"What am I doing wrong" → form cues from `exercise-coaching`.** The content model exists and the
  validator passes 794/794, but the **committed store is empty** (732 published of 794 covered, and
  publish is the last step of a pass). A door onto nothing reads as a broken feature rather than a missing
  one. Wire it when the store ships.
- **A `'session'` mode in `chat-core`.** Not needed for a chip sheet. It becomes worth doing if Holt here
  ever has to hold a conversation rather than answer a situation.
