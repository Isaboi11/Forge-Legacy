/** The active-workout session model (W-9). Local-first: this lives in memory + AsyncStorage during the
 *  session; nothing reaches the cloud until the atomic Finish commit (save_workout). */
import type { ExerciseKind } from './conditioning';

export type WorkoutSectionKind = 'warmup' | 'main' | 'cooldown';

export type { ExerciseKind };

export interface SessionSet {
  setIndex: number;
  /** lb; null = not entered / bodyweight. */
  weight: number | null;
  /**
   * A conditioning bout's measurements (0096). Null on every strength set — the two kinds of exercise
   * share one row shape and each leaves the other's columns alone.
   */
  durationSec?: number | null;
  distanceMi?: number | null;
  /** Prescribed reps (the Target column). */
  targetReps: number;
  /** Entered reps (the Actual column); null until edited — completing back-fills actual = target. */
  actualReps: number | null;
  done: boolean;
}

export interface SessionExercise {
  catalogKey?: string;
  name: string;
  /**
   * 'distance' marks a conditioning leg — a run, row or ride sitting anywhere in the session. Absent
   * means 'strength', so every session written before 0096 reads correctly without migration.
   */
  kind?: ExerciseKind;
  /** What a conditioning leg was prescribed. Absent on a strength exercise and on an unprescribed leg. */
  targetDistanceMi?: number | null;
  targetDurationSec?: number | null;
  section: WorkoutSectionKind;
  position: number;
  sets: SessionSet[];
}

export interface ActiveSession {
  workoutName: string;
  activityType: string; // 'strength' for W-9
  startedAt: string; // ISO
  exercises: SessionExercise[];
  /** Set when the session was launched from a program — attributes the saved workout to it (0018). */
  programId?: string;
  /**
   * Set when the session was launched from a saved template — attributes the saved workout back (0095),
   * which is what makes the template's "Times used" and session history real. Derived from these rows
   * rather than counted, so an abandoned start never inflates the number: a session you didn't save is
   * not a session you trained.
   */
  templateId?: string;
}
