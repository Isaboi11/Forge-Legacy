/**
 * WHAT A PAUSED SESSION HAS TO SAY FOR ITSELF — the two lines under the title on the Workout Entry screen.
 *
 * `Forge Workout Entry.dc.html` §9 specifies the Resume state's body as session STATE rather than
 * instruction: `4 exercises · 11 sets · 38 min` over `Last: Incline Dumbbell Press`. That second line is
 * the whole of the "extremely subtle progress treatment" — there is no bar, no ring and no card.
 *
 * Pure, and here rather than in the screen, because all three numbers are decisions rather than reads:
 *
 * ⚠ **"SETS" MEANS SETS LOGGED, NOT SETS PLANNED.** A program day of 4 exercises × 4 sets with three
 * logged can honestly be called 16 sets or 3, and the two readings send opposite messages — 16 says
 * nothing has been done, 3 says it is a three-set session. The resume prompt exists to answer *how much
 * work is sitting here*, and the shipped screen has said "N sets logged" since it was built, so LOGGED is
 * both the useful number and the established one. `Last: <exercise>` carries the "you are mid-session"
 * half that a raw count cannot.
 *
 * ⚠ **THE MINUTES ARE WALL-CLOCK FROM `startedAt`, AND THAT IS DELIBERATE EVEN WHEN IT LOOKS WRONG.** A
 * session left overnight will say `14h 6m`. That is not a display bug — `save.ts` computes the stored
 * `p_duration_sec` as exactly this subtraction, so the figure here is a preview of what the workout will
 * actually record. Rounding it down to something flattering would make the screen disagree with the
 * history it is about to write.
 */

import type { ActiveSession, SessionExercise } from './types';

/** Sets the athlete has actually completed. */
export function loggedSetCount(exercises: readonly SessionExercise[]): number {
  let n = 0;
  for (const ex of exercises) for (const s of ex.sets) if (s.done) n++;
  return n;
}

/** `38 min` under an hour, `2h 14m` over it — a four-digit minute count is not a duration anyone reads. */
export function formatElapsed(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * The stat line: `4 exercises · 11 sets · 38 min`.
 *
 * Every part is dropped when it has nothing to say rather than printed as a zero — a session with no
 * logged sets says so by omission, and "0 sets" is a claim of failure about work that simply hasn't
 * happened yet. An unparseable `startedAt` drops the duration instead of rendering `NaN min`.
 */
export function sessionStatLine(session: ActiveSession, nowMs: number): string {
  const parts: string[] = [];

  const exCount = session.exercises.length;
  if (exCount > 0) parts.push(`${exCount} exercise${exCount === 1 ? '' : 's'}`);

  const sets = loggedSetCount(session.exercises);
  if (sets > 0) parts.push(`${sets} set${sets === 1 ? '' : 's'}`);

  const started = Date.parse(session.startedAt);
  if (Number.isFinite(started) && nowMs > started) parts.push(formatElapsed(nowMs - started));

  return parts.join(' · ');
}

/**
 * `Last: Incline Dumbbell Press`, or null when nothing has been touched.
 *
 * ⚠ THE LAST LIFT *WORKED*, NOT THE LAST IN THE LIST. It reads backwards for the last exercise carrying a
 * completed set, because that is where the athlete actually stopped. Falling back to `exerciseIndex`
 * covers the session opened and scrolled but not yet logged into; a list-order read would name whatever
 * happens to sit at the bottom of a program day nobody has reached.
 */
export function lastExerciseName(session: ActiveSession): string | null {
  for (let i = session.exercises.length - 1; i >= 0; i--) {
    if (session.exercises[i].sets.some((s) => s.done)) return session.exercises[i].name;
  }
  const at = session.exerciseIndex ?? 0;
  return session.exercises[at]?.name ?? null;
}
