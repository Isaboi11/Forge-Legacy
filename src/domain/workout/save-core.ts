/**
 * The pure half of committing a workout — what gets written, and what deliberately does not.
 *
 * Split out of `save.ts` for the reason `session-core` was split out of `build-session`: that module
 * imports the Supabase client, so nothing in it can be loaded by `node --test`. The rules below are
 * arithmetic over a session and belong where a test can reach them.
 */

import { toCanonicalLb, type UnitSystem } from '../settings/units.ts';
import { CARDIO_ACTIVITIES, deriveName } from './conditioning.ts';
import { groupLabel } from './session-label.ts';
import type { ActiveSession, SessionExercise } from './types.ts';

/**
 * ⚠ THE ONE LIST. Every function that writes, annotates or appends to a session MUST walk this — never
 * `session.exercises` — and must join between them by `ex.position`, never by array index.
 *
 * ══ WHY THIS EXISTS AS A FUNCTION AND NOT A FILTER SPELLED OUT THREE TIMES ══
 *
 * It used to be spelled out three times, and one of the three drifted. `buildAppendExercises` mapped over
 * the FILTERED rows while indexing `session.exercises[i]` — the UNFILTERED list — so the moment a session
 * contained a cardio block with no logged set, every row after it paired with the wrong exercise. The
 * observable result was silent and total: continue a finished workout, add three sets, tap Finish, and
 * `buildAppendExercises` returned `[]`. `continue_workout` reported `sets_added: 0`, raised nothing, and
 * the athlete was shown the completion screen. The sets were gone.
 *
 * `buildSubstitutions` had already been given a comment warning about exactly this ("POSITION IS THE JOIN,
 * and it must be read off the SAME list"). A comment is a thing to remember. This is a thing that cannot
 * be forgotten — there is now only one list to walk, so the two cannot disagree.
 *
 * ══ A BOUT THAT MEASURED NOTHING DID NOT HAPPEN ══
 *
 * Un-done SETS were already filtered out, but the EXERCISE row was written regardless. So a treadmill
 * walk that was started and never ended — no time, no distance, no completed set — still landed in the
 * record as a thing the athlete did. Reported from real use: the finished workout showed a walk beside
 * the strength work, and the walk had never been stopped.
 *
 * Dropped for CONDITIONING only. A cardio block IS its single bout: with no completed set there is no
 * duration, no distance and nothing that happened, so the row is a claim with nothing behind it.
 *
 * A strength exercise with no completed sets is deliberately still written. That is a different
 * statement — "this was part of the session and I did not get to it" — the athlete's own record of
 * intent, not a measurement the app invented. Changing that is a separate decision.
 *
 * This lived inline inside `saveWorkout`, which reaches Supabase and so could not be unit-tested at all.
 * Extracted rather than mocked: the rule is arithmetic over a session, and belongs somewhere
 * `node --test` can reach it.
 */
export function recordedExercises(session: ActiveSession): SessionExercise[] {
  return session.exercises.filter((ex) => ex.kind !== 'cardio' || ex.sets.some((s) => s.done));
}

/**
 * How long the session lasted — and it can never be shorter than the training inside it.
 *
 * ══ THE WALL CLOCK IS NOT THE SESSION WHEN THE BOUT WAS TYPED IN ══
 *
 * PO: *"My last bike I logged for 90 min and it said less than one minute."* Exactly right. This was
 * `Date.now() - startedAt` and nothing else, which is honest for a workout you actually performed with
 * the app open — you started it, you lifted, you finished — and is a lie about the two paths a cardio
 * block deliberately offers: *"Skip timer · enter it myself"* and *"Already did it · log manually"*.
 * Both exist so a bout the app never watched can still be recorded. Take those, type 90 minutes, tap
 * Finish, and the wall clock is the forty seconds of typing — which `fmtDuration` then rounds down to
 * the literal words the athlete read back: "< 1 min".
 *
 * It was never only a label. `workouts.duration_sec` is what W-17 divides the distance by to report the
 * session's pace, so a 15-mile ride filed as 45 seconds also announced a personal best at 1200 mph.
 *
 * So the clock is the LONGER of the two: the wall clock, or the bouts the athlete filed. Both readings
 * survive —
 *
 *   · a tracked run keeps its wall clock, which already agrees with the bout to within seconds;
 *   · a strength session with a cool-down walk keeps its wall clock, which is longer than the walk;
 *   · a manually entered bout gets the time it actually took.
 *
 * ⚠ NEVER SHORTER, WHICH IS WHY IT IS A MAX AND NOT A SUM. Two bouts trained back to back with rest
 * between them add up to less than the session; the wall clock is the truth there and wins. This
 * mirrors `continue_workout`'s own rule on the same column — `greatest(duration_sec, p_duration_sec)`,
 * "a continue only adds time" — so the two writers cannot disagree about which way this number moves.
 *
 * ⚠ CARDIO ONLY. A timed STRENGTH set writes `duration_sec` too (a 60s plank), and summing those would
 * be summing pieces of a session against the session — a hundred holds is not a hundred minutes of
 * training. A cardio block carries exactly one bout and that bout IS the exercise, which is what makes
 * it comparable to the whole.
 */
export function sessionDurationSec(session: ActiveSession, now = Date.now()): number {
  const started = Date.parse(session.startedAt);
  // A start we cannot read is not a duration of NaN — which is what `Math.max(0, Math.round(NaN))`
  // quietly produced here before, and what `save_workout` would then have been sent.
  const wall = Number.isFinite(started) ? Math.max(0, Math.round((now - started) / 1000)) : 0;

  let logged = 0;
  for (const ex of session.exercises) {
    if (ex.kind !== 'cardio') continue;
    for (const s of ex.sets) {
      // The same "a bout that measured nothing did not happen" rule `recordedExercises` applies: an
      // un-ended treadmill walk must not lengthen the session it was never part of.
      if (s.done && s.durationSec != null && s.durationSec > 0) logged += s.durationSec;
    }
  }

  /* ⚠ WHEN NOTHING WAS WATCHED, THE WALL CLOCK IS NOT EVIDENCE — IT IS HOW LONG THE APP SAT OPEN.
     See `typedInSession`. A 20-minute walk typed into a session left open for 28 saved as 28. */
  if (typedInSession(session)) return Math.round(logged);

  return Math.max(wall, Math.round(logged));
}

/**
 * Was this session ENTIRELY typed in — every bout in it recorded by hand, nothing measured?
 *
 * ══ THE OTHER HALF OF THE SAME REPORT ══
 *
 * PO: *"She manually inputed her results for a 20 min walk … it saved as 28 minutes."* The `max(wall,
 * logged)` rule above fixed the case where the wall clock was far too SHORT — 90 minutes typed in over
 * forty seconds — by never letting the session be shorter than the training in it. It could not fix the
 * mirror image, because a max only ever moves the number one way: open the app, walk with it in your
 * pocket or your bag or not at all, come back 28 minutes later and type 20, and `max(28, 20)` is 28.
 *
 * Note this was NOT a regression from that fix. Before it the column was the bare wall clock, which is
 * the same 28 — the fix simply never reached this direction.
 *
 * The wall clock earns its authority from the app having WATCHED the session. `source` records exactly
 * that, and it is already stored on every bout: `'tracked'` when GPS measured it, `'manual'` for the two
 * doors the card offers on purpose ("Skip timer · enter it myself", "Already did it · log manually").
 * When every recorded bout says `'manual'`, the app watched nothing, and the only honest number in the
 * session is the one the athlete typed.
 *
 * ⚠ NARROW BY CONSTRUCTION, and each guard is load-bearing:
 *
 *   · ALL of them, never some. One tracked bout means a real session was under way, and the wall clock
 *     is the truth about the whole of it again.
 *   · CARDIO ONLY — via `recordedExercises`, so a lift in the session disqualifies it. Strength work
 *     writes no bout, so summing what was typed would silently discard the time spent lifting.
 *   · `'manual'` EXPLICITLY. A bout with no `source` at all (a resumed session written before the field
 *     existed) is not a claim that nothing was watched, so it keeps the max.
 *
 * ⚠ AND THIS IS THE ONE PLACE A SUM IS RIGHT. The rule above is a max because bouts trained back to back
 * sit INSIDE a session that held them, with rest between. Here there is no such session to sit inside —
 * nothing was measured, and two walks typed in as 20 minutes each are forty minutes of walking.
 */
function typedInSession(session: ActiveSession): boolean {
  const recorded = recordedExercises(session);
  if (!recorded.length) return false;
  return recorded.every((ex) => ex.kind === 'cardio' && ex.cardio?.source === 'manual');
}

/**
 * ⚠ THE LITERAL THE LAUNCH PATHS WRITE, and the exact string `sessionWorkoutName` treats as "unnamed".
 * Home, the Workouts tab and `workout.tsx`'s own fallbacks each spell it out; a test pins them together,
 * because a session started under a different placeholder would silently stop being renamed.
 */
export const FREESTYLE_NAME = 'Freestyle Workout';

/**
 * The name the session is SAVED under — which is not always the one it started with.
 *
 * ══ "IT LOGGED IT AS A FREESTYLE WORKOUT" ══
 *
 * PO, on a treadmill walk typed in by hand. Both fixes on the card before this one renamed a session
 * that was named for its bout at the door — Home's cardio chooser writes `deriveName(activity, …)` and
 * Track a Run hard-codes "Outdoor Run" — and `setCardioModality` re-derives that name when the toggle
 * flips. None of it reaches the athlete who came in through the OTHER door: "Start a freestyle workout",
 * then add a walk from the picker. That session is called `Freestyle Workout` before it contains
 * anything, the guard on the toggle is `cur.workoutName === was` — the block's own previous derived
 * name — and `Freestyle Workout` is not that, so the rename never fires and the walk is filed under a
 * name that describes nothing.
 *
 * Deriving it HERE rather than at the toggle is what makes it door-independent: this runs once, at save,
 * over the session's final shape, so it cannot be defeated by which control the athlete happened to
 * touch — or by their never having touched one.
 *
 * ⚠ ONLY EVER REPLACES THE PLACEHOLDER, and only for a session that is one cardio block:
 *
 *   · `Freestyle Workout` is the app's word for a day you have not done yet, never the athlete's — no
 *     control writes it and W-17's rename cannot produce it. Any other name was chosen and is theirs.
 *   · ONE recorded block, so a walk plus squats stays freestyle. "Treadmill Walk" would then be a name
 *     for the smaller half of the session, which is worse than the placeholder it replaced.
 *   · `recordedExercises`, so an un-ended bout — dropped from the save entirely — cannot name a session
 *     it is not even part of.
 *
 * Not retroactive. Rows already saved keep the name they were given; W-17 and the activity detail screen
 * both let the athlete change it.
 *
 * ══ 2026-08-25 — "IT SHOULDN'T BE NAMED OUTDOOR WALK BASED OFF OF WHAT THEY DID FIRST" ══
 *
 * PO: *"When doing a workout, if they do cardio first it shouldn't be named 'outdoor walk' just based
 * off of what they did first. It should generate a name based off of what they did that day fully."*
 *
 * ⚠ THE BUG WAS IN THE FIRST LINE, AND IT READ AS CORRECT. `workoutName !== FREESTYLE_NAME` means "the
 * athlete named this, leave it alone" — but a session begun from Home's cardio chooser is named
 * `deriveName(activity, modality)` at the door, before it contains anything, by nobody. That is a
 * PLACEHOLDER wearing a real name's clothes, so the guard let it through, the session kept it, and an
 * hour of lifting after a ten-minute walk saved as "Outdoor Walk".
 *
 * So the question the guard is really asking is *"did a human choose this?"* — and the honest test is
 * whether the name is one of the app's own. `isDerivedCardioName` enumerates exactly what
 * `deriveName` can produce across every activity and modality (ten strings), which keeps this
 * defensible: an athlete who TYPES "Outdoor Walk" gets it re-derived, and that is the one accepted cost.
 * The alternative — a `namedByAthlete` flag — is a new field on a shape already persisted in every
 * athlete's AsyncStorage, and absent would have to read as "chosen", which is wrong for every session
 * already in flight.
 *
 * ⚠ THE `recorded.length !== 1` RULE IS GONE, AND THAT WAS THE OTHER HALF. It existed so "a walk plus
 * squats stays freestyle", on the reasoning that "Treadmill Walk" would name the smaller half — right
 * about the problem, wrong that the placeholder was the better answer. There is a third option, which
 * is to name the session after what it actually was.
 *
 * ⚠ CARDIO NAMES THE SESSION ONLY WHEN IT *IS* THE SESSION — PO's call, of two offered. A walk with
 * lifting after it is "Chest & Back", not "Chest & Back + Walk": the muscle groups are what the athlete
 * looks for in a list of past workouts, and appending every bout makes the names long in exchange for a
 * fact the session detail already shows.
 */
export function sessionWorkoutName(session: ActiveSession, musclesOf?: MusclesOf): string {
  if (session.workoutName !== FREESTYLE_NAME && !isDerivedCardioName(session.workoutName)) {
    return session.workoutName;
  }
  const recorded = recordedExercises(session);
  if (recorded.length === 0) return session.workoutName;

  /* One block and nothing else: the bout IS the session, so its own name is the best one there is —
     "Treadmill Walk" beats "Full Body" for a session that contains one walk. */
  const strength = recorded.filter((ex) => ex.kind !== 'cardio');
  if (strength.length === 0) {
    const only = recorded[0];
    return only.kind === 'cardio' && only.name ? only.name : session.workoutName;
  }

  /* Anything with lifting in it is named for the lifting. `musclesOf` is injected rather than imported
     because the catalogue lives behind the picker's data module, which this file must not pull in — it
     is loaded by `node --test`. No resolver, or a catalogue that knows nothing about these movements,
     leaves the name exactly as it was rather than inventing one. */
  const label = musclesOf ? groupLabel(strength.map(musclesOf)) : '';
  return label || session.workoutName;
}

/** Muscle display names for one exercise — `PickerItem.muscles`, primary first. */
export type MusclesOf = (ex: SessionExercise) => readonly string[] | undefined;

/**
 * Every string `deriveName` can return — the app's own words for a bout, never an athlete's choice.
 *
 * ⚠ BUILT FROM `deriveName` ITSELF rather than typed out, so a new activity or a renamed one cannot
 * leave this list behind still claiming to be exhaustive.
 */
const DERIVED_CARDIO_NAMES: ReadonlySet<string> = new Set(
  CARDIO_ACTIVITIES.flatMap((a) => [deriveName(a.key, 'outdoor'), deriveName(a.key, 'indoor')]),
);

const isDerivedCardioName = (name: string): boolean => DERIVED_CARDIO_NAMES.has(name.trim());

/**
 * A session whose weights are canonical POUNDS, whatever the athlete typed them in.
 *
 * ══ ONE NORMALISATION, AT ONE POINT, BEFORE ANYTHING READS A WEIGHT ══
 *
 * Session state holds what the athlete TYPED — on metric, kilograms. That is right for the logger: the
 * number on screen must be the number they entered. It is wrong for everything downstream, and it was
 * wrong in two places at once:
 *
 *   · `buildSaveExercises` stamped `weight_unit: 'lb'` on it and stored it unconverted, so the database
 *     held kilos labelled pounds;
 *   · `detectPRs` compared those typed figures against `priorBest`, which comes FROM the database — so a
 *     metric athlete's 100 (kg) was measured against a stored 225 (lb) and their genuine PR was missed,
 *     or a lighter lift announced as one.
 *
 * Threading a unit system through every consumer would mean remembering it at each one. Normalising the
 * whole session ONCE, here, means no consumer has to know: everything after this call is in pounds, which
 * is what every other layer already believes.
 *
 * ⚠ CALL THIS BEFORE `detectPRs` AND BEFORE `buildSaveExercises`, and pass the result to both. Passing
 *   the raw session to one and the canonical one to the other is the bug this function exists to remove.
 *
 * ⚠ IDENTITY ON IMPERIAL — `toCanonicalLb(x, 'imperial') === x`, so for every athlete today this returns
 *   an equivalent session and nothing changes. Only `weight` moves; reps, durations, distances and every
 *   flag are carried through untouched. Distance is already stored canonically in miles (`0096:37`).
 */
export function canonicalizeWeights(session: ActiveSession, system: UnitSystem): ActiveSession {
  if (system !== 'metric') return session; // exact identity — no object churn on the common path
  return {
    ...session,
    exercises: session.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => (s.weight == null ? s : { ...s, weight: toCanonicalLb(s.weight, system) })),
    })),
  };
}

/**
 * How long a finished workout stays reopenable, and whether this one still is.
 *
 * ⚠ LIVES IN THE PURE LAYER ON PURPOSE. `save.ts` imports the Supabase client, so nothing in it can be
 * reached by `node --test` — and this is exactly the kind of boundary arithmetic that wants unit tests
 * (an hour ago, an hour and a minute ago, a timestamp from the future because a clock drifted).
 *
 * The server enforces the same window in `continue_workout` and is the one that decides. This only
 * governs whether the button is drawn: a device clock is an input, not a fact.
 */
export const CONTINUE_WINDOW_MIN = 60;

export function withinContinueWindow(savedAtISO: string | null | undefined, now = Date.now()): boolean {
  if (!savedAtISO) return false;
  const t = Date.parse(savedAtISO);
  if (Number.isNaN(t)) return false;
  const mins = (now - t) / 60000;
  // `>= 0` refuses a future timestamp rather than reading clock skew as "zero minutes ago".
  return mins >= 0 && mins < CONTINUE_WINDOW_MIN;
}

/**
 * The work added since a finished workout was reopened — everything `saved` leaves out.
 *
 * An exercise whose every logged set is already committed contributes nothing and is dropped entirely,
 * or continuing a session and doing nothing would append a row of empty exercises to it.
 */
export function buildAppendExercises(session: ActiveSession) {
  // ⚠ `recordedExercises(session)`, NOT `session.exercises`. These two rows must describe the SAME
  //   exercise, and `buildSaveExercises` walks the filtered list — see the note on `recordedExercises`
  //   for what indexing the unfiltered one silently cost.
  const recorded = recordedExercises(session);
  return buildSaveExercises(session)
    .map((row, i) => {
      const ex = recorded[i];
      const fresh = ex.sets.filter((s) => s.done && !s.saved);
      return { row, fresh };
    })
    .filter(({ fresh }) => fresh.length > 0)
    .map(({ row, fresh }) => ({
      ...row,
      sets: row.sets.filter((s) => fresh.some((f) => f.setIndex === s.set_index)),
    }));
}

/**
 * The substitutions in this session, as `record_substitutions` wants them — one entry per exercise the
 * athlete swapped away from, and nothing at all for the ordinary session that swapped nothing.
 *
 * ══ WHY IT IS SEPARATE FROM `buildSaveExercises` ══
 *
 * `save_workout`'s eleven arguments have been frozen since 0095 and every client path in the app calls
 * it. Widening the signature — or rebuilding its 200-line body to read two more jsonb keys — would put
 * every save at risk to record an annotation. So this rides the post-commit path `partners` (0016) and
 * the playlist link (0105) already take, for the reason `save.ts` states: a substitution is a mark ON a
 * session rather than a part OF one, and it must never be able to fail a save that otherwise worked.
 *
 * ⚠ POSITION IS THE JOIN, and it must be read off the SAME list `buildSaveExercises` sends — a cardio
 * block with no logged sets is dropped there, so walking `session.exercises` instead would key the
 * update to a row that was never inserted.
 *
 * Governed by `Coach-Adaptive-Learning-Amendment-001` CL-D9 / `Exercise-002` §10.
 */
export function buildSubstitutions(session: ActiveSession): {
  position: number;
  prescribed_catalog_key: string | null;
  prescribed_name: string;
}[] {
  return recordedExercises(session)
    .filter((ex) => {
      const was = ex.prescribedName?.trim();
      // Null means nothing was replaced. A swap back to the same movement replaced nothing either —
      // recording it would tell the coach an athlete rejected a lift they in fact chose to keep.
      return !!was && was.toLowerCase() !== ex.name.trim().toLowerCase();
    })
    .map((ex) => ({
      position: ex.position,
      prescribed_catalog_key: ex.prescribedCatalogKey ?? null,
      // Non-null by the filter above; §10.2 makes the NAME the display authority, not the key.
      prescribed_name: ex.prescribedName!.trim(),
    }));
}

export function buildSaveExercises(session: ActiveSession) {
  const recorded = session.exercises.filter((ex) => ex.kind !== 'cardio' || ex.sets.some((s) => s.done));

  return recorded.map((ex) => ({
    name: ex.name,
    catalog_key: ex.catalogKey ?? null,
    // Trimmed to null: an empty string is not a note, and it renders as an empty quote in history.
    notes: ex.note?.trim() || null,
    section: ex.section,
    position: ex.position,
    /* The block, if this lift is in one (0106). A superset is created IN the session — pairing two
       lifts mid-workout is an athlete's decision on the day, not something a program handed down — so
       unless it rides along here it exists until Finish and then does not. */
    group_id: ex.groupId ?? null,
    group_name: ex.groupName ?? null,
    group_kind: ex.groupKind ?? null,
    group_rounds: ex.groupRounds ?? null,
    sets: ex.sets
      .filter((s) => s.done)
      .map((s) =>
        // A conditioning bout carries time and ground covered; a strength set carries load and reps.
        // Sending a leg's `reps` as its target would record 8 repetitions of a three-mile run (0096).
        ex.kind === 'cardio'
          ? {
              set_index: s.setIndex,
              weight: null,
              weight_unit: null,
              reps: null,
              duration_sec: s.durationSec ?? null,
              distance: s.distanceMi ?? null,
              distance_unit: s.distanceMi != null ? 'mi' : null,
              /*
               * ⚠ ITS OWN KEY, NEVER `distance` (0151). A stair climber's floors are the only cardio
               * measurement that is not a distance, and `save_workout` rolls every set's `distance` up
               * into `workouts.distance` — the column mileage goals, distance honors and challenge
               * scoring all read as miles. Sixty floors sent as sixty miles would win a distance
               * challenge from a stair machine.
               */
              floors: s.floors ?? null,
              // How it was RECORDED, not what the toggle currently says (0097).
              modality: s.modality ?? null,
              incline_pct: s.inclinePct ?? null,
              /*
               * The shape of the bout, and the hill in it (0162).
               *
               * ⚠ THE WHOLE TRACK, since `Route-Sharing-Amendment-001` D-RS-1 rescinded the endpoint
               * trim — and `routeForStorage` is still the only writer, so whatever the storage rule is,
               * this layer is never the place that decides it. Null for an indoor bout and an untracked
               * one.
               *
               * ⚠ AND IT IS NEVER A SOURCE OF DISTANCE. `distance` above is the measured mileage;
               * routes saved under the old trim are 400 m short of it forever.
               */
              route: s.route ?? null,
              climb_m: s.climbM ?? null,
            }
          : /*
             * A HOLD IS MEASURED BY THE CLOCK, and until now it was written down as ten repetitions.
             *
             * `targetSec` marks a set the program prescribed in seconds — a 60s Plank, a 45s Dead Hang,
             * a loaded carry. It has no rep count: `session-core` gives it `targetReps: 0`, and
             * `reps: 0` in the history is a claim the athlete did nothing. So a timed set writes its
             * seconds into `duration_sec` — the same column a cardio bout uses, already on the table —
             * and sends `reps: null`, which is what "this set was never about reps" looks like in the
             * record. Load still travels: a weighted carry has a real weight on it.
             */
            s.targetSec != null
            ? {
                set_index: s.setIndex,
                weight: s.weight,
                weight_unit: s.weight != null ? 'lb' : null,
                reps: null,
                duration_sec: s.durationSec ?? s.targetSec,
              }
            : { set_index: s.setIndex, weight: s.weight, weight_unit: 'lb', reps: s.actualReps ?? s.targetReps },
      ),
  }));
}
