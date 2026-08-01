/** The active-workout session model (W-9). Local-first: this lives in memory + AsyncStorage during the
 *  session; nothing reaches the cloud until the atomic Finish commit (save_workout). */
import type { CardioActivity, CardioResult, ExerciseKind, Modality } from './conditioning';

export type WorkoutSectionKind = 'warmup' | 'main' | 'cooldown';

export type { CardioActivity, CardioResult, ExerciseKind, Modality };

export interface SessionSet {
  setIndex: number;
  /** lb; null = not entered / bodyweight. */
  weight: number | null;
  /**
   * A cardio bout's measurements (0096/0097). Null on every strength set — the two kinds of exercise
   * share one row shape and each leaves the other's columns alone.
   *
   * `modality` is `loggedModality`: how the bout was ACTUALLY recorded, written once at log time. The
   * card's live toggle must never rewrite it, or a treadmill run flipped to Outdoor would draw a GPS
   * route it never traced.
   */
  durationSec?: number | null;
  distanceMi?: number | null;
  inclinePct?: number | null;
  modality?: Modality | null;
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
   * 'cardio' marks a run, walk or ride sitting anywhere in the session. Absent means 'strength', so
   * every session written before this reads correctly without migration.
   */
  kind?: ExerciseKind;
  /** Cardio only. `activity` is authored; `modality` is the athlete's live choice on the day. */
  activity?: CardioActivity;
  modality?: Modality;
  /**
   * What the program prescribed. `null` means it prescribed NOTHING — an open session — and must never
   * be coerced to 0, which would read as a target that is permanently complete.
   */
  targetMi?: number | null;
  targetPaceSec?: number | null;
  targetSpdMph?: number | null;
  /** What was actually covered, once it was. Written at log time; see `CardioResult`. */
  cardio?: CardioResult;
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
