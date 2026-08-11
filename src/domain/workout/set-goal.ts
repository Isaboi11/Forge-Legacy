/**
 * THE GOAL ON AN EXERCISE THE ATHLETE ADDED THEMSELVES.
 *
 * Add-as-you-go had no way to say what a lift was for. `pickedToExercise` stamps three sets of eight on
 * everything that comes back from the Picker — which is a reasonable guess for a row and a nonsense one
 * for a plank, a farmer's carry or a dead hang. The athlete could change the number only by opening the
 * Set Input Sheet on each row in turn and typing into "Actual", which records what they DID rather than
 * what they are aiming at. So a freestyle session's targets were unreachable.
 *
 * Pure (no React, no JSON, no Supabase) so every rule below is testable under `node --test`, and so the
 * panel that draws it holds no rules of its own.
 *
 * ══ THE TWO KINDS OF ASK, AND WHY TIME IS NOT REPS ══
 *
 * `targetReps` is arithmetic input — it feeds volume, the e1RM behind personal records, and the `reps`
 * column written at save. `targetSec` is a display target beside it, exactly as `targetWeight` sits beside
 * `weight` (see `types.ts`). So switching an exercise to a clock must NOT leave a rep count standing:
 * "45s" showing in the Target column while `8` goes into the athlete's history is a fabricated number in
 * the record.
 *
 * ══ ⚠ IT USED TO WRITE ONE, AND ONE ANNOUNCED A PERSONAL RECORD FOR A FARMER'S CARRY ══
 *
 * This header used to read: *"It writes ONE — one held effort — which is the truthful count of what a
 * 45-second plank is. NEVER ZERO. Zero is the to-failure marker, it reads as 'you did nothing' in the
 * Actual column, and it would put a zero-rep set into the volume behind a record."*
 *
 * Every clause of that was TRUE WHEN WRITTEN and all three reasons have since been removed:
 *
 *   · the Actual column now renders a timed set's CLOCK, not its rep count, so zero never reads as
 *     "you did nothing" (`actualText`);
 *   · completing a timed set no longer back-fills the actual from `targetReps`, so the zero never
 *     reaches the record (`completeSet`);
 *   · the save writes `reps: null` and `duration_sec` for any set carrying `targetSec` (`save-core`).
 *
 * Meanwhile the ONE became actively harmful, because `bestRecordWeight` skips `reps < 1` — so a set
 * carrying `targetReps: 1` is inside the 1–5 personal-record band. A 70 lb farmer's carry given a 45s
 * goal was measured as **70 lb of rep volume and a 70 lb single**, and the next session at 75 lb would
 * have announced a personal record for a carry. Nobody lifted a one-rep max; they walked.
 *
 * So a time goal writes ZERO, the same marker `sessionSetsFor` stamps on a prescribed hold. The two
 * paths into a timed set — one from a program, one from this panel — now agree, which is the actual
 * point: they were producing sets that behaved differently in the volume and record math.
 *
 * ══ THE SECONDS ARE RECORDED NOW ══
 *
 * This also used to say the athlete's actual seconds "are not recorded anywhere, because a strength set
 * has no field that survives the save". `workout_sets.duration_sec` is that field, `save-core` writes it
 * for any timed set, and `save_workout_as_template` no longer reads duration as evidence of cardio
 * (migration 0127) — which was the specific thing that would have repainted three planks as one run.
 */

import type { SessionExercise, SessionSet } from './types.ts';

/** The ask on a freshly added lift, and the number the panel opens on. */
export const GOAL_REPS_DEFAULT = 8;
export const GOAL_REPS_MIN = 1;
/** Generous rather than tight: a 100-rep chunk of Murph is a real goal, and nothing here is arithmetic. */
export const GOAL_REPS_MAX = 500;

/**
 * A hold, a carry, a dead hang — the clock's own defaults.
 *
 * ⚠ THIRTY, AND IT MUST STAY EQUAL TO `DEFAULT_HOLD_SEC`. This was 45 while the catalogue-driven default
 * (the length an added Plank arrives with) was 30, so the app had two answers to "how long is a hold":
 * add a plank and the card read 30s, switch some other lift to Time and the field opened on 45. Neither
 * was wrong on its own; having both was. PO call, 2026-08-11: thirty.
 */
export const GOAL_SEC_DEFAULT = 30;
export const GOAL_SEC_MIN = 5;
export const GOAL_SEC_MAX = 3600;
/** Fifteen seconds a tap: 30 → 45 → 60 is how work time is actually written down. */
export const GOAL_SEC_STEP = 15;

export type GoalMode = 'reps' | 'time';

const clampReps = (n: number): number => Math.min(GOAL_REPS_MAX, Math.max(GOAL_REPS_MIN, Math.round(n)));
const clampSec = (n: number): number => Math.min(GOAL_SEC_MAX, Math.max(GOAL_SEC_MIN, Math.round(n)));

/**
 * The set the goal is ABOUT — the next one not yet logged, or the last one when they are all done.
 *
 * Not `sets[0]`, which is what the Goal line reads. A logged set keeps the target it was performed
 * against (see `applyRepGoal`), so once set 1 is done, `sets[0]` describes the past: reading the mode off
 * it would flip the panel back to Reps the moment the athlete logged their first timed effort.
 */
function activeSet(ex: Pick<SessionExercise, 'sets'>): SessionSet | undefined {
  return ex.sets.find((s) => !s.done) ?? ex.sets[ex.sets.length - 1];
}

/** Which kind of ask this exercise currently carries. */
export function goalModeOf(ex: Pick<SessionExercise, 'sets'>): GoalMode {
  return activeSet(ex)?.targetSec != null ? 'time' : 'reps';
}

/**
 * The rep goal to show — and the default whenever the standing target is not one.
 *
 * A timed set carries `targetReps: 1` as its "one effort" marker and a to-failure set carries 0. Neither
 * is a rep goal, and returning them would mean tapping "Reps" on a timed exercise prescribed one single
 * repetition of it.
 */
export function goalRepsOf(ex: Pick<SessionExercise, 'sets'>): number {
  const s = activeSet(ex);
  if (!s || s.targetSec != null || s.toFailure || s.targetReps < GOAL_REPS_MIN) return GOAL_REPS_DEFAULT;
  return clampReps(s.targetReps);
}

/** The time goal to show, or the default for an exercise that has never had one. */
export function goalSecOf(ex: Pick<SessionExercise, 'sets'>): number {
  return clampSec(activeSet(ex)?.targetSec ?? GOAL_SEC_DEFAULT);
}

/**
 * Write a rep goal onto every set that has not been logged yet.
 *
 * ⚠ LOGGED SETS ARE LEFT ALONE. A set that is done was performed against the target it carried, and the
 * Target column is what the athlete reads back to see what they were asked for. Rewriting it would edit
 * history to match a decision made afterwards — and on a session being continued (`saved`) it would
 * rewrite rows already committed to the database.
 *
 * `targetSec`, `targetRepsMax` and `toFailure` are all cleared rather than left standing: the athlete has
 * just stated the ask in reps, and a stale clock would still win in every renderer (which checks
 * `targetSec != null` first), leaving a card that ignores what they typed.
 */
export function applyRepGoal(ex: SessionExercise, reps: number): SessionExercise {
  const n = clampReps(reps);
  return {
    ...ex,
    sets: ex.sets.map((s) => (s.done ? s : { ...s, targetReps: n, targetSec: null, targetRepsMax: null, toFailure: false })),
  };
}

/** Write a time goal onto every set that has not been logged yet. See the header on why reps become 0. */
export function applyTimeGoal(ex: SessionExercise, sec: number): SessionExercise {
  const n = clampSec(sec);
  return {
    ...ex,
    sets: ex.sets.map((s) => (s.done ? s : { ...s, targetSec: n, targetReps: 0, targetRepsMax: null, toFailure: false })),
  };
}

/** The next value a stepper tap produces, clamped at both ends so a held thumb cannot run off. */
export const stepReps = (reps: number, dir: 1 | -1): number => clampReps(reps + dir);
export const stepSec = (sec: number, dir: 1 | -1): number => clampSec(sec + dir * GOAL_SEC_STEP);

/** A time goal as the field shows it: `0:45`, `1:30`, `10:00`. */
export function fmtGoalSec(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Typed reps → a goal, or null to reject the keystroke and keep what was there. */
export function parseGoalReps(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  // Zero is a rejection, not a goal: a set asking for no reps is the to-failure marker, not something
  // anybody typed on purpose.
  return n < GOAL_REPS_MIN ? null : clampReps(n);
}

/**
 * Typed time → a goal, or null to reject.
 *
 * ⚠ A BARE NUMBER IS SECONDS HERE, and that is the opposite of `parseClock` in `conditioning.ts`, where
 * "30" means thirty MINUTES. The two are right about different things: that field logs a cardio bout,
 * which is measured in minutes, and this one sets the work time of a set, which is measured in seconds.
 * A shared parser would have to be wrong for one of them — so the field is labelled `MIN:SEC` and this
 * rule stays local.
 */
export function parseGoalSec(raw: string): number | null {
  const t = raw.trim();
  if (/^\d{1,4}$/.test(t)) {
    const n = Number(t);
    return n < 1 ? null : clampSec(n);
  }
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(t);
  if (!m) return null;
  const mins = Number(m[1]);
  const secs = Number(m[2]);
  if (secs > 59) return null; // "1:75" is a typo, not 2:15
  const total = mins * 60 + secs;
  return total < 1 ? null : clampSec(total);
}
