import type { ActiveSession, SessionExercise, SessionSet } from './types';

/**
 * ══ WHAT WAS PLANNED AND NOT YET DONE, KEPT FOR "CONTINUE THIS WORKOUT" (workout-05, QA 09-26) ══
 *
 * A finished workout is reopened from what the SERVER holds, and the server holds only what was logged:
 * `save_workout` writes completed sets and nothing else. So an athlete who ended by accident with set 3 of
 * the squat still to do reopened a squat with two sets and no third — the plan they were in the middle of
 * was gone, and the one thing they came back to do had to be rebuilt by hand ("Add set", retype the
 * weight). A cardio block never started was not even a row, so it vanished entirely.
 *
 * The plan is not the server's to keep — it is this device's session, which `clearSession` deletes at
 * Finish. So the part of it that was NOT done is set aside at Finish (keyed by the saved workout) and laid
 * back over the server's copy on Continue. Pure here; the storage is `continue-workout-live.ts`.
 *
 * ⚠ ONLY WHAT WAS NOT DONE. A logged set comes back from the server, marked saved; laying the device's
 *   copy of it over the top would put the same set in the session twice.
 */
export interface RemainderExercise {
  /** Where the exercise sat — the join, with the name, back to the server's row. */
  position: number;
  name: string;
  /** Planned sets not completed, reset to "not done". */
  sets: SessionSet[];
  /**
   * The whole exercise, for a block the server never received — a cardio block with no logged bout is
   * not written at all (`recordedExercises`), so there is no row to lay the sets over.
   */
  whole?: SessionExercise;
}

export function planRemainder(session: ActiveSession): RemainderExercise[] {
  const out: RemainderExercise[] = [];
  for (const ex of session.exercises) {
    const open = ex.sets.filter((s) => !s.done);
    if (open.length === 0) continue;
    const reset = open.map((s) => ({ ...s, done: false, saved: undefined, actualReps: null }));
    if (ex.kind === 'cardio' && !ex.sets.some((s) => s.done)) {
      const { boutOpen: _open, cardio: _result, savedPosition: _saved, ...rest } = ex;
      out.push({ position: ex.position, name: ex.name, sets: reset, whole: { ...rest, sets: reset } });
    } else {
      out.push({ position: ex.position, name: ex.name, sets: reset });
    }
  }
  return out;
}

/** The reopened session with the unfinished plan laid back over it. Unmatched rows are left alone. */
export function withPlanRemainder(session: ActiveSession, remainder: readonly RemainderExercise[]): ActiveSession {
  if (remainder.length === 0) return session;
  let exercises = session.exercises.map((ex) => {
    const r = remainder.find((x) => !x.whole && x.position === ex.position && x.name === ex.name);
    if (!r) return ex;
    const have = new Set(ex.sets.map((s) => s.setIndex));
    const add = r.sets.filter((s) => !have.has(s.setIndex));
    return add.length ? { ...ex, sets: [...ex.sets, ...add].sort((a, b) => a.setIndex - b.setIndex) } : ex;
  });
  for (const r of remainder) {
    if (!r.whole || exercises.some((ex) => ex.position === r.position)) continue;
    exercises = [...exercises, r.whole].sort((a, b) => a.position - b.position);
  }
  return { ...session, exercises };
}
