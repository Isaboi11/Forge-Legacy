/**
 * The pure half of committing a workout — what gets written, and what deliberately does not.
 *
 * Split out of `save.ts` for the reason `session-core` was split out of `build-session`: that module
 * imports the Supabase client, so nothing in it can be loaded by `node --test`. The rules below are
 * arithmetic over a session and belong where a test can reach them.
 */

import type { ActiveSession } from './types.ts';

/**
 * The exercise rows a session commits — pure, so the rules in it can be tested.
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
  return buildSaveExercises(session)
    .map((row, i) => {
      const ex = session.exercises[i];
      const fresh = ex.sets.filter((s) => s.done && !s.saved);
      return { row, fresh };
    })
    .filter(({ fresh }) => fresh.length > 0)
    .map(({ row, fresh }) => ({
      ...row,
      sets: row.sets.filter((s) => fresh.some((f) => f.setIndex === s.set_index)),
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
              // How it was RECORDED, not what the toggle currently says (0097).
              modality: s.modality ?? null,
              incline_pct: s.inclinePct ?? null,
            }
          : { set_index: s.setIndex, weight: s.weight, weight_unit: 'lb', reps: s.actualReps ?? s.targetReps },
      ),
  }));
}
