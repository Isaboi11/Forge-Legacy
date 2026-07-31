import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * What the Active Workout was opened FROM — the RN analogue of the design's
 * `forge_workout_launch_context_v1`. Any entry point that starts a program's session writes the program
 * id here; the workout reads it on mount, resolves which session is actually next from the live
 * completed count, and attributes the saved workout back (0018's `workouts.program_id`).
 *
 * Only the id travels, deliberately. Carrying the week/day too would let a stale card (Home rendered
 * minutes ago) train the wrong session — resolving at open time means the schedule position is decided
 * from the same source of truth the progress bar reads.
 *
 * Written immediately before navigating and cleared once the workout consumes it, so a later ad-hoc
 * workout is never silently credited to a program the athlete has moved on from.
 */
export interface WorkoutLaunch {
  /** The program this session belongs to. Absent for a freestyle, one-off session. */
  programId?: string;
  /** A one-off workout: start empty and let the athlete add exercises as they go. */
  freestyle?: boolean;
  /** A saved template to open with (0091). */
  templateId?: string;
  /**
   * An explicit shape to open with (0093) — what an invite carries. Distinct from `templateId` because an
   * invite SNAPSHOTS its workout rather than pointing at one: the guest may not own the source program.
   */
  exercises?: { catalogKey: string | null; name: string; sets: number; targetReps: number }[];
  /** Overrides the session's name — a shared workout is named by whoever invited you (0092). */
  workoutName?: string;
  /**
   * Who invited you (0092). Pre-tags them as a partner so accepting an invite credits both athletes
   * through the mechanism that already exists, rather than inventing a shared-session object that two
   * devices would then have to keep in step.
   */
  partnerId?: string;
}

const KEY = 'forge_workout_launch_context_v1';

export async function writeWorkoutLaunch(ctx: WorkoutLaunch): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ctx));
  } catch {
    // best-effort; a dropped context just means an unattributed workout
  }
}

export async function readWorkoutLaunch(): Promise<WorkoutLaunch | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as WorkoutLaunch;
    if (!v) return null;
    return v.freestyle || (typeof v.programId === 'string' && v.programId) ? v : null;
  } catch {
    return null;
  }
}

export async function clearWorkoutLaunch(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
