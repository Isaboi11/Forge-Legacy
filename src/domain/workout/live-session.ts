import type { ActiveSession } from './types.ts';

/**
 * ══ WHAT A FRIEND SEES OF A SESSION WHILE IT IS HAPPENING ══
 *
 * PO (2026-08-27): *"I see a friend working out rn I should be able to see what they've logged and have
 * planned."* Until now the only thing that left the phone during a session was two columns on
 * `profiles` — a label and a start time (0086). The session itself lived in AsyncStorage and the cloud
 * saw the finished workout, once.
 *
 * This is the shape that crosses the wire now: the plan, and how far through it the athlete is. It is
 * published by the athlete's own device (`publishLiveSession`, throttled), read by a friend or squad-mate
 * through `live_session_of`, and gated on a visibility key that defaults to PRIVATE — an intentional
 * publication, the same door 0117 opens for a posted workout, which is what lets it carry numbers the
 * always-on surfaces are forbidden (CC-D2, WSR-D6). Nothing here is derived on the reader's side; the
 * snapshot is the whole story, so the two screens cannot disagree about it.
 *
 * ⚠ SMALL ON PURPOSE. A set is five numbers and a flag; an exercise is a name and its sets. No notes, no
 * coaching cues, no PR flags, no history — those are the athlete's, not the audience's, and every field
 * added here is a field a stranger could one day be shown by mistake. `publish_live_session` refuses a
 * payload over 64 KB, which a session cannot reach through this shape.
 *
 * ⚠ NO `@/` IMPORTS — `live-session.test.mjs` loads this under `node --test`.
 */

export interface LiveSet {
  done: boolean;
  /** Pounds, the canonical unit (stored weights are not unit-normalised anywhere else either). */
  weight: number | null;
  reps: number | null;
  targetReps: number;
  targetSec: number | null;
  durationSec: number | null;
}

export interface LiveExercise {
  name: string;
  kind: 'strength' | 'cardio';
  section: string;
  activity: string | null;
  targetMi: number | null;
  targetSec: number | null;
  sets: LiveSet[];
}

export interface LiveSessionSnapshot {
  v: 1;
  workoutName: string;
  startedAt: string;
  /** Where the athlete is in the list — the exercise they are on, not necessarily the first unfinished. */
  exerciseIndex: number;
  exercises: LiveExercise[];
}

export function liveSessionSnapshot(s: ActiveSession): LiveSessionSnapshot {
  return {
    v: 1,
    workoutName: s.workoutName,
    startedAt: s.startedAt,
    exerciseIndex: Math.max(0, Math.min(s.exerciseIndex ?? 0, Math.max(0, s.exercises.length - 1))),
    exercises: s.exercises.map((e) => ({
      name: e.name,
      kind: e.kind === 'cardio' ? 'cardio' : 'strength',
      section: e.section,
      activity: e.activity ?? null,
      targetMi: e.targetMi ?? null,
      targetSec: e.targetSec ?? null,
      sets: e.sets.map((st) => ({
        done: !!st.done,
        weight: st.weight ?? null,
        reps: st.actualReps ?? null,
        targetReps: st.targetReps,
        targetSec: st.targetSec ?? null,
        durationSec: st.durationSec ?? null,
      })),
    })),
  };
}

export interface LiveProgress {
  setsDone: number;
  setsTotal: number;
  exercisesDone: number;
  exercisesTotal: number;
}

/** An exercise is done when every set is; a session with no sets is 0 of 0, never NaN. */
export function liveProgress(snap: Pick<LiveSessionSnapshot, 'exercises'>): LiveProgress {
  let setsDone = 0;
  let setsTotal = 0;
  let exercisesDone = 0;
  for (const e of snap.exercises) {
    const done = e.sets.filter((s) => s.done).length;
    setsDone += done;
    setsTotal += e.sets.length;
    if (e.sets.length > 0 && done === e.sets.length) exercisesDone += 1;
  }
  return { setsDone, setsTotal, exercisesDone, exercisesTotal: snap.exercises.length };
}

/**
 * The reader's guard. A payload is athlete-published JSON that crossed a network: it is checked before
 * a screen trusts a single field of it, and anything that is not this shape reads as "nothing shared".
 */
export function isLiveSnapshot(x: unknown): x is LiveSessionSnapshot {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || typeof o.workoutName !== 'string' || typeof o.startedAt !== 'string') return false;
  if (typeof o.exerciseIndex !== 'number' || !Array.isArray(o.exercises)) return false;
  return o.exercises.every(
    (e) =>
      e &&
      typeof e === 'object' &&
      typeof (e as { name?: unknown }).name === 'string' &&
      Array.isArray((e as { sets?: unknown }).sets) &&
      ((e as { sets: unknown[] }).sets as unknown[]).every((s) => s && typeof s === 'object' && typeof (s as { done?: unknown }).done === 'boolean'),
  );
}
