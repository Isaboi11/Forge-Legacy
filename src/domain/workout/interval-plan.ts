/**
 * ══ THE TIMED WORKOUT, RUN FOR YOU ══
 *
 * PO 2026-09-27, an interval timer's "15 min Chest & Back Strength" (40 s on, 20 s rest): *"On the active workout
 * screen how would this work? Make it user friendly and easy to use. Simple and straightforward."* — then "Yes"
 * to: one Start timer button, a full-screen countdown that moves itself (work → rest → next move), a Rounds
 * picker, and each move checked off as it finishes.
 *
 * This file is the order of play and nothing else — which moves, which sets, how long each lasts — so it can be
 * tested without a clock. `IntervalRunner` owns the clock; the workout screen owns the session.
 *
 * ⚠ A MOVE IS TIMED WHEN ITS SETS CARRY `targetSec`, and it is never a cardio bout (a 20-minute ride has its own
 * card and its own clock). Moves with reps are left out of the run entirely — they stay on the list, untouched.
 */
import type { SessionExercise } from './types.ts';

export type IntervalStep = {
  kind: 'work' | 'rest';
  sec: number;
  /** The exercise and set a WORK step completes. A rest step carries the move it comes after. */
  ei: number;
  si: number;
  round: number;
  name: string;
  /** What comes after this step — "Rest", the next move's name, or null at the very end. */
  next: string | null;
};

type Ex = Pick<SessionExercise, 'name' | 'kind' | 'sets'> & { restAfterSec?: number | null };

/** The timed moves, in workout order. */
export function timedMoves(exercises: readonly Ex[]): number[] {
  const out: number[] = [];
  exercises.forEach((e, ei) => {
    if (e.kind === 'cardio') return;
    if (e.sets.length && e.sets.every((s) => s.targetSec != null && s.targetSec > 0)) out.push(ei);
  });
  return out;
}

/** Two or more timed moves is a timed workout — one plank at the end of a lifting day is not. */
export const canRunIntervals = (exercises: readonly Ex[]): boolean => timedMoves(exercises).length >= 2;

/** The rounds the workout already has: the most sets any timed move carries (1 for an imported list). */
export function defaultRounds(exercises: readonly Ex[]): number {
  return Math.max(1, ...timedMoves(exercises).map((ei) => exercises[ei].sets.length));
}

export const MAX_ROUNDS = 10;

/**
 * Every step, in order. Round r of a move is its set r — a set that is already done is skipped (a resumed
 * workout picks up where it stopped), and a round past the sets the move has uses its first set's clock (the
 * screen adds those sets before running). A move's rest follows it, except after the very last work step.
 */
export function intervalPlan(exercises: readonly Ex[], rounds: number): IntervalStep[] {
  const moves = timedMoves(exercises);
  const work: IntervalStep[] = [];
  for (let r = 0; r < Math.max(1, Math.min(MAX_ROUNDS, rounds)); r++) {
    for (const ei of moves) {
      const e = exercises[ei];
      if (e.sets[r]?.done) continue;
      const sec = e.sets[r]?.targetSec ?? e.sets[0].targetSec ?? 0;
      work.push({ kind: 'work', sec, ei, si: r, round: r + 1, name: e.name, next: null });
    }
  }
  const steps: IntervalStep[] = [];
  work.forEach((w, i) => {
    const after = work[i + 1];
    const rest = exercises[w.ei].restAfterSec ?? 0;
    if (after && rest > 0) {
      steps.push({ ...w, next: 'Rest' });
      steps.push({ kind: 'rest', sec: rest, ei: w.ei, si: w.si, round: w.round, name: 'Rest', next: after.name });
    } else {
      steps.push({ ...w, next: after ? after.name : null });
    }
  });
  return steps;
}

/** The whole run in seconds — "About 15 min" before it starts. */
export const planSeconds = (steps: readonly IntervalStep[]): number => steps.reduce((t, s) => t + s.sec, 0);

/** "0:40", "12:05". */
export function clock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "About 15 min" / "About 1 min". */
export function aboutMinutes(sec: number): string {
  return `About ${Math.max(1, Math.round(sec / 60))} min`;
}
