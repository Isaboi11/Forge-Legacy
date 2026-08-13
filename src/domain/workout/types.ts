/** The active-workout session model (W-9). Local-first: this lives in memory + AsyncStorage during the
 *  session; nothing reaches the cloud until the atomic Finish commit (save_workout). */
import type { CardioActivity, CardioResult, ExerciseKind, Modality } from './conditioning';
import type { WorkoutPlaylistLink } from './playlist';
import type { PerSide } from './per-side-core';

export type WorkoutSectionKind = 'warmup' | 'main' | 'cooldown';
/** What a grouped block IS. See `SessionExercise.groupKind`; absent reads as 'circuit'. */
export type GroupKind = 'superset' | 'circuit';

export type { CardioActivity, CardioResult, ExerciseKind, Modality };

export interface SessionSet {
  /**
   * Already committed to the database.
   *
   * ⚠ ONLY SET WHEN A FINISHED WORKOUT IS REOPENED (`continue_workout`, 0125). It is what stops a
   * continue from writing the first half of the session a second time — the reopened sets are shown so
   * the athlete can see what they did, and skipped on the way back out. A normal session never sets it.
   */
  saved?: boolean;
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
  /**
   * Stair climber only — the floor count off the machine (0151).
   *
   * ⚠ DELIBERATELY NOT FOLDED INTO `distanceMi`. That field sums into `workouts.distance`, which mileage
   * goals, distance honors and challenge scoring all read as miles. See `TRACKS_FLOORS`.
   */
  floors?: number | null;
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
   * WHAT THIS ROW REPLACED — set only when the athlete substituted, and set ONCE.
   *
   * ⚠ REQUIRED BY A LOCKED SPEC SINCE SUBSTITUTION SHIPPED, AND DISCARDED UNTIL NOW.
   * `Exercise-002-Exercise-Substitution-Architecture` §10.1–10.2: *"both the substitute and the original
   * name are captured at write time and are permanent."* There has never been a `prescribed_*` column —
   * `save_workout` writes `catalog_key, name, section, position, group_*` and nothing else — so the app
   * threw away the most informative thing an athlete does in a session: telling you, by acting, that the
   * movement you gave them was the wrong one. `Coach-Adaptive-Learning-Amendment-001` CL-D9 implements it.
   *
   * ⚠ THE FIRST SUBSTITUTION WINS. Swap A→B→C and what the plan actually prescribed was A; overwriting
   * with B would record a prescription that never existed.
   *
   * ⚠ THE NAME IS THE AUTHORITY, not the key (§10.2) — a custom or since-deleted exercise may have no
   * catalogue key at all, and the snapshot has to survive either being renamed afterwards.
   */
  prescribedName?: string | null;
  prescribedCatalogKey?: string | null;
  /**
   * 'cardio' marks a run, walk or ride sitting anywhere in the session. Absent means 'strength', so
   * every session written before this reads correctly without migration.
   */
  kind?: ExerciseKind;
  /**
   * What the athlete said about this lift, this session — "shoulder felt off", "belt on from set 3".
   *
   * ⚠ THE COLUMN HAS EXISTED SINCE 0001 AND NOTHING EVER WROTE IT. `workout_exercises.notes` was in the
   * very first migration; no client path has ever sent a value and no surface has ever read one back.
   * This is a field being FINISHED, not added — which is why it costs one `create or replace` and no
   * new column.
   *
   * Trimmed to null on save: an empty string is not a note, and storing one puts an empty quote block
   * on every history row that opened the sheet and thought better of it.
   */
  note?: string | null;
  /**
   * What the AUTHOR of the plan wants done with this movement — "4 seconds down, then push up",
   * "calf check, stop if pain climbs", "hold Z2, this is not a workout".
   *
   * ⚠ **NOT `note` ABOVE, AND THE TWO MUST NOT BE MERGED.** `note` is the athlete's, written during the
   * session and read back the next time they meet the lift. This is the prescription, written into the
   * program or template and shown to whoever trains it, every time. Merging them would let a log entry
   * overwrite a coaching cue, and would carry "shoulder felt off" forward as if the plan had said it.
   *
   * Carried from `ProgramExercise.coachNote` / `TemplateExercise.coachNote`. Read-only in the session:
   * the athlete edits their own note, never the author's.
   *
   * Not written to `workout_exercises` at save — the cue belongs to the PLAN, which already stores it,
   * and copying it onto every workout row would duplicate one sentence across a season of history.
   */
  coachNote?: string | null;
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
  /** Which side a rep count refers to. `'arm'` added 2026-08-09 — see `per-side-core.ts`. */
  per?: PerSide;
  section: WorkoutSectionKind;
  position: number;
  sets: SessionSet[];
}

export interface ActiveSession {
  /**
   * Set when a FINISHED workout was reopened to be continued (0125).
   *
   * Its presence is what makes Finish append to that workout instead of creating a second one — without
   * it, continuing a session would leave two entries in history, count the chapter twice, and claim a
   * second program slot.
   */
  continuingWorkoutId?: string;
  workoutName: string;
  /**
   * How the session went, in the athlete's words. Lands in `workouts.notes` — a column that has taken a
   * value through `save_workout`'s `p_notes` since 0010, which every client path has passed as `null`.
   */
  note?: string | null;
  activityType: string; // 'strength' for W-9
  startedAt: string; // ISO
  exercises: SessionExercise[];
  /** Set when the session was launched from a program — attributes the saved workout to it (0018). */
  programId?: string;
  /**
   * WHICH session of that program the athlete chose to train (0119) — 0-based, both or neither.
   *
   * Absent means "whichever is next", resolved server-side at commit. Present only when they picked a
   * specific one, which is what swapping is. Carrying it any further than that would reintroduce the
   * stale-card risk `workout-launch.ts` exists to describe.
   */
  programWeek?: number;
  programDay?: number;
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
  /**
   * WHICH exercise the athlete is on.
   *
   * Screen-local `useState` in `workout.tsx` until now, which cost two things. Nothing outside the
   * logger could know where a live session had reached — including the logger's own resume, which
   * always dropped you back at exercise one however far in you were. And it is the fact a training
   * partner needs in order to join you where you are, which is what this pass is for.
   *
   * OPTIONAL, AND IT MUST STAY OPTIONAL. Every session already sitting in an athlete's AsyncStorage was
   * written without it and `loadSession` JSON-parses blind; absent reads as 0, which is the value those
   * sessions effectively had. (The same reason the autosave key is NOT bumped: a version bump would
   * discard every in-flight session the moment the update landed.)
   *
   * ⚠ CLAMP ON READ. Exercises can be added, swapped and removed after this was written, so a restored
   * index can point past the end of the list — and the active render indexes `exercises[exIdx]`
   * directly.
   */
  exerciseIndex?: number;
  /**
   * Who is being credited for this session — `training_partners()` ids, resolved to names at save.
   *
   * Also screen state until now, and that cost two things as well: a crash mid-session silently dropped
   * every tag, and the host of a shared workout could not tag the person joining them, because the
   * accept happens on a different screen and the session lives in AsyncStorage.
   */
  partnerIds?: string[];
  /**
   * Anyone the athlete took OFF this session's tags — a record of a "no", not of a person.
   *
   * ⚠ WITHOUT IT THE AUTOMATIC CREDIT CANNOT BE UNDONE. An accepted invite now credits a partner at
   * session start AND again at Finish (see `partner-credit.ts`), because an accept can land while you
   * are mid-workout. Both passes read the same invite, so un-tagging someone would silently put them
   * back on the way out — the app writing a name the athlete had explicitly removed. Re-tagging them
   * clears the entry, so this only ever holds a refusal that is still current.
   */
  partnerIdsDeclined?: string[];
}
