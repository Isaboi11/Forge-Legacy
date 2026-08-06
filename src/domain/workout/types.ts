/** The active-workout session model (W-9). Local-first: this lives in memory + AsyncStorage during the
 *  session; nothing reaches the cloud until the atomic Finish commit (save_workout). */
import type { CardioActivity, CardioResult, ExerciseKind, Modality } from './conditioning';
import type { WorkoutPlaylistLink } from './playlist';

export type WorkoutSectionKind = 'warmup' | 'main' | 'cooldown';
/** What a grouped block IS. See `SessionExercise.groupKind`; absent reads as 'circuit'. */
export type GroupKind = 'superset' | 'circuit';

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
  /** Prescribed reps (the Target column). The FLOOR when a range was prescribed — see `targetRepsMax`. */
  targetReps: number;
  /**
   * The TOP of a prescribed rep range — "10–12" is `targetReps: 10, targetRepsMax: 12`.
   *
   * DISPLAY ONLY, and deliberately not a widening of `targetReps`. That number is arithmetic input for
   * volume, the e1RM behind PR detection, and the reps column written at save; a range flowing into any
   * of those would be a silent corruption. Same separation as `targetWeight` beside `weight` and
   * `targetSec` beside `durationSec` — this is the ask, and the athlete's entry is the answer.
   *
   * Absent on every set outside a range-prescribed program, which is most of them.
   */
  targetRepsMax?: number | null;
  /**
   * Prescribed WEIGHT, in the athlete's display unit — the bar a percentage-of-max program is asking
   * for. Absent on every set that was not prescribed one, which is all of them outside such a program.
   *
   * ══ WHY THIS IS NOT `weight` PRE-FILLED ══
   *
   * `weight` is what the athlete ACTUALLY lifted, and it feeds volume, e1RM and the personal-record
   * check. Seeding it with a target would write a claim they never made: finish a session without
   * touching a set and the app would report a lift that did not happen, and could announce a PR for it.
   * This is the ask; `weight` is the answer. Same separation as `targetSec` beside `durationSec`.
   */
  targetWeight?: number | null;
  /**
   * Prescribed TO FAILURE — "Dips: F-F-F".
   *
   * Deliberately a flag beside `targetReps` rather than a widening of it to `number | 'F'`: that number
   * is arithmetic input for volume, e1RM and the reps column written at save, and a string flowing into
   * any of those is a silent corruption rather than a type error. A failure set carries `targetReps: 0`,
   * which contributes no invented volume, and completing one does NOT back-fill the actual from the
   * target — the athlete has to say what they got, because that count is the entire point of the set.
   */
  toFailure?: boolean;
  /**
   * Prescribed WORK TIME — "30s Banded Pull Aparts", "45s Assault Bike".
   *
   * Not to be confused with `durationSec` above, which is what was actually recorded. This is the ask;
   * that is the answer. Keeping them apart is what lets a card show "45s" as a target while the athlete
   * logs the 38 they managed.
   */
  targetSec?: number | null;
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
  /** A cardio bout prescribed by the clock — "Treadmill Run, 15 min". */
  targetSec?: number | null;
  /** What was actually covered, once it was. Written at log time; see `CardioResult`. */
  cardio?: CardioResult;
  /**
   * ══ CIRCUIT MEMBERSHIP ══
   *
   * Carried through from the program so the logger can draw a warm-up circuit, a finisher or an AMRAP as
   * the single block the athlete actually performs, instead of loose exercises that happen to sit next to
   * each other. Adjacent exercises sharing `groupId` are one block — the same adjacency rule the program
   * layer uses, so a session and the program it came from can never disagree about where a circuit ends.
   *
   * The exercise list stays FLAT. Every existing reader — volume, PR detection, the save commit, the
   * section grouping — walks `session.exercises` and is untouched by a block it does not know about.
   */
  groupId?: string;
  groupName?: string;
  /**
   * 'superset' — alternated set for set, rest only after the last member, drawn as ONE merged card.
   * 'circuit' — rounds, its own banner, and an optional clock. Absent reads as 'circuit', which is what
   * every block that existed before supersets was.
   */
  groupKind?: GroupKind;
  groupRounds?: number;
  /** An AMRAP's cap in seconds; rounds are then uncounted by design. */
  groupCapSec?: number | null;
  /**
   * "10 reps PER LEG" — carried from the program so the Target column states the whole ask.
   *
   * It sits on the EXERCISE and not on the set, because a side is a property of the movement: every set
   * of a split squat is per leg, and repeating it per set would be the same fact written five times.
   * Nothing counts it — `targetReps` stays what the athlete logs, exactly as with a rep range.
   */
  per?: 'leg' | 'side';
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
  /**
   * What they're training to — Workout-Playlist-Amendment-001 §4, attached from the "⋯ Options" menu.
   *
   * It lives on the SESSION rather than being written straight to the cloud because that is the only
   * place it can live before Finish: nothing about this workout exists server-side until the atomic
   * commit. Riding here means it survives a crash and a resume for free (the whole session is
   * JSON-serialised by `persistSession`), and `saveWorkout` writes it onto the row afterwards — the same
   * post-commit path `partners` already takes, for the same reason.
   *
   * At most one (§3). Attaching a new one replaces it; there is no list and no history.
   */
  playlist?: WorkoutPlaylistLink | null;
}
