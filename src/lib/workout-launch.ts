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
  /**
   * A session the athlete explicitly PICKED out of the program's schedule (0119) — 0-based.
   *
   * ⚠ The header above says only the id travels, and that reasoning still holds for the DEFAULT path:
   * Home's Continue sends no slot, and the schedule position is resolved at open time from the same
   * source of truth the progress bar reads, so a card rendered minutes ago cannot train the wrong
   * session. This field is the exception it names — a deliberate choice, made two taps earlier, which
   * cannot go stale in the way a passively-rendered card can.
   */
  programWeek?: number;
  programDay?: number;
  /** A one-off workout: start empty and let the athlete add exercises as they go. */
  freestyle?: boolean;
  /** A saved template to open with (0091). */
  templateId?: string;
  /**
   * A Forge starter template to open with, by definition id — trained WITHOUT being adopted.
   *
   * Its own field rather than `templateId`, because a shipped definition has no row in
   * `workout_templates` and therefore no id to attribute the saved workout back to. And not `exercises`
   * either: that field carries the four fields an invite snapshots (`catalogKey`/`name`/`sets`/reps),
   * which would silently drop the warm-up and cool-down sections and turn the 29 definitions that end
   * in a conditioning block into sets of a run. The definition is read whole at open time instead.
   */
  starterId?: string;
  /**
   * An explicit shape to open with (0093) — what an invite carries. Distinct from `templateId` because an
   * invite SNAPSHOTS its workout rather than pointing at one: the guest may not own the source program.
   */
  exercises?: { catalogKey: string | null; name: string; sets: number; targetReps: number }[];
  /** Overrides the session's name — a shared workout is named by whoever invited you (0092). */
  workoutName?: string;
  /**
   * Start straight into a conditioning session — a treadmill run, a row, a ride (0096). Its own field
   * rather than a shape in `exercises`, because a leg is not a list of sets and squeezing it into one
   * would mean inventing a rep count for a distance.
   */
  conditioning?: {
    /** 'run' | 'walk' | 'bike'. */
    activity: string;
    /** Where, chosen by whoever launched it — Home's treadmill entry starts indoors. */
    modality?: 'outdoor' | 'indoor';
  };
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
    /**
     * ══ THE GUARD USED TO NAME TWO FIELDS AND SILENTLY DROP THE REST ══
     *
     * It read `v.freestyle || v.programId ? v : null`, written when those were the only two ways to
     * start a session. Every field added since — `templateId`, `exercises` (a training invite),
     * `conditioning` (a run) — was therefore accepted by the writer, stored, and then thrown away here
     * on the way out. The logger saw no launch at all and fell back to its default session, so tapping
     * "Treadmill run" opened somebody's idea of a strength workout instead.
     *
     * Nothing errored. A guard that returns null is indistinguishable from "they just opened the
     * logger", which is exactly why it survived three features being added around it.
     *
     * Now: any intent at all counts, so a field added tomorrow cannot be dropped by omission.
     */
    const carriesIntent =
      !!v.freestyle ||
      (typeof v.programId === 'string' && !!v.programId) ||
      (typeof v.templateId === 'string' && !!v.templateId) ||
      (typeof v.starterId === 'string' && !!v.starterId) ||
      !!v.conditioning ||
      (Array.isArray(v.exercises) && v.exercises.length > 0) ||
      (typeof v.partnerId === 'string' && !!v.partnerId);
    return carriesIntent ? v : null;
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
