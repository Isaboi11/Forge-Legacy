import { displayWeight, unitLabel, type UnitSystem } from '../settings/units.ts';
import type { ActiveSession, SessionExercise, SessionSet } from './types.ts';

/**
 * ══ WHAT THE WRIST IS SHOWN OF A SESSION THAT IS HAPPENING ON THE PHONE ══
 *
 * `Docs/Apple-Watch-Companion-Build-Plan.md` §1 and the artboards in
 * `design-drafts/ForgeWatchCompanion.dc.html`. The watch is a REMOTE, not a second logger: the phone
 * owns the session and this function is the only thing that decides what leaves it. Everything here is
 * derived; nothing is stored; the watch never computes anything but the countdown from `restEndsAt`.
 *
 * ══ THE ONE RULE THAT SHAPES THE WHOLE FILE: THE WATCH NEVER CONVERTS ══
 *
 * Weights are canonical POUNDS in the session (`units.ts` header). If the wrist received a number and a
 * unit it would have to convert, and then a units change mid-session would need a second code path in
 * Swift that nobody can run on this machine. So `target` crosses the wire as a **finished display
 * string** — "185 lb × 8" — built here by `displayWeight`/`unitLabel`, the same two calls every phone
 * surface uses. Switch to kg and the next push simply carries a different string.
 *
 * ⚠ NO `@/` IMPORTS. `watch-projection.test.mjs` loads this under `node --test`, where a runtime `@/`
 *   re-export does not resolve. `import type` is erased, so `./types.ts` is free; `../settings/units.ts`
 *   is a real runtime import and has no imports of its own.
 *
 * ⚠ THIS FILE IS ALSO THE PROTOCOL. `WatchState.v` is its version. A field added here is a field Swift
 *   must tolerate the absence of, because a phone on build N+1 will talk to a watch app on build N until
 *   the athlete updates both. Add fields, never repurpose one.
 */

/** Which of the four artboards the wrist is drawing. */
export type WatchPhase = 'idle' | 'active' | 'rest' | 'finished';

export interface WatchState {
  /** Protocol version. Bump only for a change Swift cannot read past. */
  v: 1;
  phase: WatchPhase;

  /** Session name — Finished shows it; the others have no room for it. */
  workoutName?: string;

  // ── active + rest ────────────────────────────────────────────────────────
  /** The catalogue name, whole. "Barbell" is which implement to pick up, not padding. */
  exercise?: string;
  /** "Set 3 of 5". Built here so the watch never does arithmetic on an off-by-one. */
  setLabel?: string;
  /** A finished display string — "185 lb × 8", "8 reps", "45s", "185 lb × F". */
  target?: string;
  /** "per leg" / "per arm" / "per side", or absent. Its own field so the watch can set it smaller. */
  perLabel?: string;
  /** Set bars: how many of this exercise's sets are done, and how many there are. */
  setsDone?: number;
  setsTotal?: number;

  /**
   * WHICH set a `setDone` command would be answering.
   *
   * ⚠ THE WHOLE POINT OF SENDING THESE. The command carries them back and the phone refuses a set that
   * is already `done`, so a double tap, a retried message and a stale watch all collapse to one log.
   */
  exerciseIndex?: number;
  setIndex?: number;

  // ── rest ─────────────────────────────────────────────────────────────────
  /**
   * Epoch ms the rest ends. The watch counts against its OWN clock from this, which is why the ring
   * keeps running out of Bluetooth range — there are no ticking messages to miss.
   *
   * `null` while paused; `restRemainingSec` carries the frozen value instead.
   */
  restEndsAt?: number | null;
  /** Seconds left, PAUSED ONLY. Absent while running — the watch derives it from `restEndsAt`. */
  restRemainingSec?: number | null;
  /** The full rest, for the ring's denominator. */
  restTotalSec?: number;
  /** What you are about to walk back and do. On every rest, not only supersets. */
  nextExercise?: string;
  nextTarget?: string;
  /**
   * The set just completed was the last of its exercise, so Rest wears the "exercise done" header and
   * promotes NEXT to bronze. Beat B in the artboards — a header change, never its own screen.
   */
  exerciseComplete?: boolean;
  /** The exercise that was just finished — the header on that variant. */
  completedExercise?: string;

  // ── finished ─────────────────────────────────────────────────────────────
  elapsedSec?: number;
  totalSets?: number;
}

export interface WatchRestState {
  /** Epoch ms, or null when there is no rest running. */
  endsAt: number | null;
  paused: boolean;
  /** Seconds frozen at the pause. Meaningless unless `paused`. */
  pausedRemaining: number | null;
  totalSec: number;
}

export interface WatchProjectionInput {
  session: ActiveSession | null;
  units: UnitSystem;
  rest: WatchRestState;
  /** Injected rather than read, so every test is deterministic and no clock is consulted twice. */
  now: number;
}

/** A pointer into the session: which exercise, which set, and the objects themselves. */
interface Cursor {
  exerciseIndex: number;
  setIndex: number;
  exercise: SessionExercise;
  set: SessionSet;
}

/** Cardio blocks are not remotable in V1 — the watch has no screen for a run and says so by staying Idle. */
const isStrength = (e: SessionExercise): boolean => e.kind !== 'cardio';

/**
 * The set the athlete is on.
 *
 * ⚠ STARTS AT `session.exerciseIndex`, NOT AT ZERO. That field is where the athlete actually IS —
 * `live-session.ts` calls it "not necessarily the first unfinished" — and an athlete who jumped ahead to
 * finish arms should not have the wrist calling them back to a squat set they skipped on purpose. Only
 * when the exercise they are on is fully done does this walk forward, and only then does it wrap.
 */
function currentCursor(s: ActiveSession): Cursor | null {
  const n = s.exercises.length;
  if (n === 0) return null;
  const start = Math.max(0, Math.min(s.exerciseIndex ?? 0, n - 1));

  for (let step = 0; step < n; step += 1) {
    const ei = (start + step) % n;
    const exercise = s.exercises[ei];
    if (!isStrength(exercise)) continue;
    const setIndex = exercise.sets.findIndex((st) => !st.done);
    if (setIndex >= 0) return { exerciseIndex: ei, setIndex, exercise, set: exercise.sets[setIndex] };
  }
  return null;
}

/**
 * The set most recently completed, in list order.
 *
 * Used only to answer "did that finish an exercise?", which is what turns Rest into the exercise-complete
 * variant. Derived rather than remembered: the phone does not tell us which set started this rest, and a
 * flag we carried ourselves would be one more thing to get wrong on a resume.
 */
function lastDoneCursor(s: ActiveSession): Cursor | null {
  for (let ei = s.exercises.length - 1; ei >= 0; ei -= 1) {
    const exercise = s.exercises[ei];
    if (!isStrength(exercise)) continue;
    for (let si = exercise.sets.length - 1; si >= 0; si -= 1) {
      if (exercise.sets[si].done) return { exerciseIndex: ei, setIndex: si, exercise, set: exercise.sets[si] };
    }
  }
  return null;
}

/** The reps half of a target: a range, a failure set, a timed set, or a plain count. */
function repsPart(set: SessionSet): string {
  if (set.toFailure) return 'F';
  if (set.targetSec != null && set.targetSec > 0) return `${set.targetSec}s`;
  if (set.targetRepsMax != null && set.targetRepsMax > set.targetReps) return `${set.targetReps}–${set.targetRepsMax}`;
  return String(set.targetReps);
}

/**
 * The whole target line, finished and ready to draw.
 *
 * ⚠ `weight` BEFORE `targetWeight`. `weight` is what the athlete has actually got loaded — it carries
 * forward from the previous set and is what they are about to lift. `targetWeight` only exists inside a
 * percentage-of-max program, and is the fallback for a set they have not touched yet. A null or zero
 * weight is bodyweight, and gets no unit at all rather than "0 lb".
 */
export function targetLine(set: SessionSet, units: UnitSystem): string {
  const reps = repsPart(set);
  const lb = set.weight ?? set.targetWeight ?? null;

  if (lb == null || lb <= 0) {
    if (set.toFailure) return 'to failure';
    if (set.targetSec != null && set.targetSec > 0) return reps;
    return `${reps} reps`;
  }

  const { value } = displayWeight(lb, units);
  return `${value} ${unitLabel(units)} × ${reps}`;
}

const perLabelFor = (e: SessionExercise): string | undefined => (e.per ? `per ${e.per}` : undefined);

/** How many of an exercise's sets are done. */
const doneCount = (e: SessionExercise): number => e.sets.filter((st) => st.done).length;

function idle(s: ActiveSession | null): WatchState {
  return s ? { v: 1, phase: 'idle', workoutName: s.workoutName } : { v: 1, phase: 'idle' };
}

/**
 * THE projection. One pure function, one output shape, no clock of its own.
 *
 * Order matters and is deliberate:
 *   1. No session, or no strength work in it → Idle. A cardio-only session is not a broken Active screen.
 *   2. Every strength set done → Finished, EVEN IF A REST IS RUNNING. Completing the last set ends the
 *      session; a ring counting down to nothing would be the watch disagreeing with the phone.
 *   3. A rest running or paused → Rest.
 *   4. Otherwise → Active.
 */
export function projectWatchState(input: WatchProjectionInput): WatchState {
  const { session, units, rest, now } = input;
  if (!session) return idle(null);

  const hasStrength = session.exercises.some((e) => isStrength(e) && e.sets.length > 0);
  if (!hasStrength) return idle(session);

  const cursor = currentCursor(session);

  // ── 2. Finished ──────────────────────────────────────────────────────────
  if (!cursor) {
    let totalSets = 0;
    for (const e of session.exercises) if (isStrength(e)) totalSets += doneCount(e);
    const started = Date.parse(session.startedAt);
    const elapsedSec = Number.isFinite(started) ? Math.max(0, Math.round((now - started) / 1000)) : 0;
    return { v: 1, phase: 'finished', workoutName: session.workoutName, elapsedSec, totalSets };
  }

  const common = {
    v: 1 as const,
    workoutName: session.workoutName,
    exercise: cursor.exercise.name,
    setLabel: `Set ${cursor.setIndex + 1} of ${cursor.exercise.sets.length}`,
    target: targetLine(cursor.set, units),
    perLabel: perLabelFor(cursor.exercise),
    setsDone: doneCount(cursor.exercise),
    setsTotal: cursor.exercise.sets.length,
    exerciseIndex: cursor.exerciseIndex,
    setIndex: cursor.setIndex,
  };

  // ── 3. Rest ──────────────────────────────────────────────────────────────
  const restRunning = rest.paused ? rest.pausedRemaining != null : rest.endsAt != null && rest.endsAt > now;
  if (restRunning) {
    const last = lastDoneCursor(session);
    const exerciseComplete = !!last && last.exerciseIndex !== cursor.exerciseIndex;
    return {
      ...common,
      phase: 'rest',
      restEndsAt: rest.paused ? null : rest.endsAt,
      restRemainingSec: rest.paused ? rest.pausedRemaining : null,
      restTotalSec: rest.totalSec,
      nextExercise: cursor.exercise.name,
      nextTarget: common.target,
      exerciseComplete,
      completedExercise: exerciseComplete ? last.exercise.name : undefined,
    };
  }

  // ── 4. Active ────────────────────────────────────────────────────────────
  return { ...common, phase: 'active' };
}
