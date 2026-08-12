# Coach Adaptive Learning — Amendment 001

**Status:** LOCKED
**Date:** 2026-08-11
**Owner:** Product
**Amends:** `Coach-Chat-Design-Brief-v1.0.md` (the Holt engine), `Exercise-002-Exercise-Substitution-Architecture.md` §10 (implements it)
**Governed by:** `Product-DNA.md`, `Program-Architecture-Specification` (PAS), `Exercise-003-Exercise-Favorites-Architecture.md`

---

## 1. The request

> *"Is Coach Holt learning? From past sets, workouts, time people are taking? It should learn from the
> individual and be applying what that person likes and doesn't like, what they swap for, how long they
> take, everything about them to be tailored towards them."* — PO, 2026-08-11

## 2. What is true today

**Holt does not learn.** `src/domain/coach/**` reads no database at all. `assemble()` receives
`CoachConstraints` — goal, days per week, session minutes, environment, limitations, experience — every
field of which is something the athlete **declared in the questionnaire**. Ask the same questions twice
and you get the same program, forever, no matter what happened in between.

**One exception, and it is the good half.** `domain/coach/progression.ts` reads real logged sets and
decides the next load — hit 3 × 10 at 135 and it hands you 140. Its own header says it: *"the only part
that reads the athlete's own history rather than a table."* But it runs **only in the live logger**, as a
per-exercise weight prefill. Nothing it learns reaches what Holt builds.

### 2.1 Signals already recorded and entirely unread by the coach

| Signal | Where it already lives |
| --- | --- |
| Every set ever logged | `workout_sets` |
| How long each session took | `workouts.duration_sec` |
| Which prescribed sessions were skipped | `program_sessions.state = 'skipped'` |
| Exercises the athlete favourited | `exercise_favorites` (0020) |
| What they wrote about a lift | `workout_exercises.notes` |

### 2.2 Signals not recorded at all

| Signal | Status |
| --- | --- |
| **What an exercise was swapped FROM** | ⚠ **Required by a LOCKED spec and never built** — see §3 |
| An explicit "stop offering me this" | No negative counterpart to favourites has ever existed |

## 3. ⚠ The swap capture is not a new decision — it is an unimplemented locked one

`Exercise-002-Exercise-Substitution-Architecture` §10.1–10.2 (LOCKED) already requires it:

> Both `exerciseName` (substitute) and `prescribedExerciseName` (original) are snapshotted at the moment
> of write, extending the discipline established in EX-001-D14… Historical integrity is complete and
> permanent for both exercises involved in the substitution.

`save_workout` inserts `workout_exercises (workout_id, catalog_key, name, section, position, group_*)`.
There is no `prescribed_*` column anywhere in 137 migrations. **The app has been discarding the single
most informative thing an athlete does in a session** — telling you, by acting, that the movement you gave
them was the wrong one — since substitution shipped. This amendment implements §10 rather than deciding it.

## 4. Decisions

**CL-D1 — Holt learns from BEHAVIOUR, never from inference about the person.** The permitted signals are
enumerated in §2.1 plus §5. Each is an action the athlete took, recorded as they took it. No affinity
scoring, no clustering, no "athletes like you", no derived personality. If a rule cannot be stated as
*"you did X, so I did Y"*, it does not belong in this engine.

**CL-D2 — Every adaptation must be EXPLICABLE IN ONE SENTENCE, and the sentence must be shown.** Holt
already has `rulebook/rationale.ts`. An adaptation the athlete cannot see the reason for is
indistinguishable from a bug, and it is how a coach loses trust it cannot get back.

**CL-D3 — ⚠ ADAPTATION MUST NEVER SILENTLY NARROW THE ATHLETE'S WORLD.** This is the failure mode that
kills recommendation systems and it is the one worth designing against explicitly. If swapping away from
back squats twice quietly removes squatting forever, the athlete never learns they are missing it, the
coach never learns it was wrong, and the program degrades into whatever was easiest. Therefore:

* **A swap is evidence, not an instruction.** It lowers an exercise's priority within its movement
  pattern. It never removes the PATTERN — a hinge day stays a hinge day.
* **Only an explicit avoidance removes something**, and only the exercise, never the pattern.
* **Avoidances are visible and reversible** in one place the athlete can find, and Holt says when one is
  in force ("You've told me to skip barbell squats, so this block hinges and lunges instead").
* **Two occurrences before anything moves.** One swap is a busy rack; two is a preference. This mirrors
  `progression.ts`'s existing asymmetry — *"a single short set is a Tuesday, not a trend."*

**CL-D4 — Duration adapts VOLUME, never the goal.** Sessions consistently running long against the
declared `sessionMinutes` reduce accessory volume before anything else, and never touch the main lift.
Consistently short means the athlete finished, which is not the same as wanting more; it may propose, never
apply.

**CL-D5 — Skips adapt FREQUENCY, and only downward on their own.** A pattern of skipped sessions is a
plan that does not fit a life. Holt may offer a lower `daysPerWeek`; it may not raise it unprompted, and it
may not reshuffle a live program (PE/W-5: structural edits are future-state only).

**CL-D6 — Learned state is SERVER-SIDE and per-athlete.** `coach-memory.ts` is device-local and stays
that way for questionnaire convenience. Anything that changes what gets BUILT is training history and
belongs in Postgres, RLS-scoped, and must survive a new phone.

**CL-D7 — The Firewall and the privacy posture are unchanged.** Learned state is readable only by its
owner. It is never shown to another athlete, never in a squad or challenge surface, never in `/admin`
(AA-D2/AA-D8), and it is not analytics — it is the athlete's own record acting on their own program.

**CL-D8 — ONB-D13 is untouched.** The first-run recommendation stays rule-based, deterministic, and not
presented as AI. Everything here is likewise deterministic — tables and counts, no model — so it satisfies
that on the merits, but the first-run surface itself is not in scope and gains no adaptation.

## 5. The capture layer (this pass)

**CL-D9 — `workout_exercises` records what a substitution replaced.** `prescribed_catalog_key` and
`prescribed_name`, both null in the overwhelming majority of rows, non-null only when the athlete
substituted. Snapshotted at write time and permanent (EX-002 §10.2).

Written **post-commit**, alongside `partners` and the playlist link, for the reason `save.ts` already
gives: `save_workout`'s eleven arguments have been frozen since 0095 and every client path calls it. A
substitution record is a mark ON a session, not a part of one, and it must never be able to fail a save
that otherwise succeeded.

**CL-D10 — `exercise_avoidance` is the negative counterpart to `exercise_favorites`.** Same shape
(`athlete_id`, `catalog_key`, primary key across both), plus an optional free-text reason. Favourites have
carried the positive signal since migration 0020 and nothing has ever carried the negative one, which is
why "what they don't like" was unanswerable.

**CL-D11 — Capture ships before consumption, deliberately.** Nothing can learn from data that was never
written, and the value of this table starts accruing the day it exists rather than the day the engine reads
it. The engine changes in §6 are specified here and NOT built in this pass.

## 6. What this pass does NOT build

Named so the gap is a decision rather than a discovery:

1. `assemble()` still ignores every signal. Holt's output is unchanged by this amendment.
2. No UI surfaces avoidances yet (CL-D3 requires one before the engine reads them — an invisible
   avoidance is exactly the silent narrowing CL-D3 forbids).
3. Duration (CL-D4) and skip (CL-D5) adaptation are unimplemented.
4. `progression.ts` still runs only in the logger and still does not inform what gets built.

**⚠ CL-D3's guardrails are a precondition of consumption, not a nicety.** The avoidance list must be
visible and reversible in the app BEFORE `assemble()` is allowed to read it.

## 7. What did not change

| Document | Status |
| --- | --- |
| `Exercise-002` §10 | Unchanged — finally implemented. |
| `Exercise-003` (Favorites) | Unchanged. `exercise_avoidance` is its counterpart, not its replacement. |
| PAS, `Endurance-Programming-Standard` | Unchanged. Endurance still refuses rather than guesses. |
| `ONB-D13` | Unchanged (CL-D8). |
| Performance Firewall (CS-D22.4, SQ-D13) | Unchanged (CL-D7). |
| `coach-memory.ts` | Unchanged, and stays device-local (CL-D6). |
