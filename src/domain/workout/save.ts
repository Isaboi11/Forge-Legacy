import { supabase } from '@/lib/supabase';
import { sessionActivityType } from './conditioning';
import { detectPRs, doneSetCount, PR_MAX_REPS, sessionVolume, type DetectedPR } from './metrics';
import { buildAppendExercises, buildSaveExercises } from './save-core';
import { playlistToRow } from './playlist';
import type { ActiveSession } from './types';

export interface SaveResult {
  workoutId: string;
  /** Includes first-ever marks (`isFirst`), which are stored but are not records — see `detectPRs`. */
  prs: { exercise: string; weight: number; reps: number; catalogKey?: string | null; isFirst: boolean }[];
  volume: number;
  sets: number;
}


/**
 * The Finish commit (W-9). Reads the athlete's current best e1RM per exercise, detects PRs domain-side,
 * then hands the whole session to the atomic `save_workout` RPC (workout + exercises + done sets + PRs +
 * timeline + chapter bump, all-or-nothing). Only DONE sets persist; skipped/pending sets are no data.
 *
 * `partners` are the "Trained With" tags (names) — attribution on the athlete's OWN workout row, written
 * best-effort after the commit; a failure never fails the save (the session is already logged). The
 * playlist link the athlete attached from "⋯ Options" rides the same post-commit write, for the same
 * reason.
 */
export async function saveWorkout(session: ActiveSession, partners: string[] = []): Promise<SaveResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  /*
   * The athlete's existing mark on each lift in this session — the heaviest weight they have logged for
   * 1–5 reps, which is what a record now means.
   *
   * A NAME MISSING FROM THIS MAP MEANS "NEVER DONE IT", and that is load-bearing: `detectPRs` announces
   * a record only when there was already a mark to beat. Defaulting an absent lift to 0 is precisely
   * what made every set a beginner performed into a personal record.
   */
  /*
   * Fetched by athlete rather than by name, because the NAME is no longer the identity — see below. The
   * filtered form could not express "this key, or this name when the row predates keys" without building
   * an `.or()` string out of user-supplied exercise names, which is a quoting bug waiting to happen. A
   * single athlete's record rows are few; correctness is worth the extra ones.
   */
  const { data: prRows, error: pe } = await supabase
    .from('personal_records')
    .select('exercise, catalog_key, load_value, load_reps')
    .eq('athlete_id', user.id)
    .eq('measure_kind', 'load')
    .lte('load_reps', PR_MAX_REPS);
  if (pe) throw pe;

  /*
   * KEYED BY CATALOGUE KEY, NOT BY DISPLAY NAME.
   *
   * One lift can have two names. An imported program keeps the athlete's words on purpose ("Bench
   * press"); the picker writes the catalogue's ("Barbell Bench Press"). Same lift, same `catalog_key`,
   * two strings — so a name-keyed history split in half, and the second name started from nothing and
   * announced a 190 lb record to an athlete who had already benched 225.
   *
   * The `catalog_key is null` arm is for rows written before 0078 added the column: those match on the
   * exact name instead. It mirrors `lift_best_lb` in 0078, deliberately — two different answers to
   * "which lift is this" is how the two surfaces would drift apart.
   */
  const priorBest: Record<string, number | undefined> = {};
  const bump = (id: string, v: number) => {
    const seen = priorBest[id];
    if (seen == null || v > seen) priorBest[id] = v;
  };
  for (const ex of session.exercises) {
    const id = ex.catalogKey ?? ex.name;
    for (const r of prRows ?? []) {
      if (r.load_value == null) continue;
      const sameLift = ex.catalogKey
        ? r.catalog_key === ex.catalogKey || (r.catalog_key == null && r.exercise === ex.name)
        : r.exercise === ex.name;
      if (sameLift) bump(id, r.load_value);
    }
  }

  const prs = detectPRs(session, priorBest);
  const durationSec = Math.max(0, Math.round((Date.now() - Date.parse(session.startedAt)) / 1000));

  const exercises = buildSaveExercises(session);

  const { data, error } = await supabase.rpc('save_workout', {
    p_workout_name: session.workoutName,
    // Derived, not taken on trust: every construction site hard-codes 'strength', which stopped being
    // true when a run could be the whole session.
    p_activity_type: sessionActivityType(session.exercises, session.activityType),
    p_started_at: session.startedAt,
    p_duration_sec: durationSec,
    // ⚠ WAS HARDCODED `null` SINCE 0010. The argument has been there the whole time and every caller
    // passed nothing, so `workouts.notes` has been empty for every session this app has ever saved.
    p_notes: session.note?.trim() || null,
    p_exercises: exercises,
    p_prs: prs,
    p_program_id: session.programId ?? null,
    p_distance: null,
    p_distance_unit: null,
    p_template_id: session.templateId ?? null,
    /*
     * WHICH session of the program this was — sent ONLY when the athlete deliberately chose one (0119).
     *
     * Absent is the normal case and is not a gap: the server then assigns the first session with nothing
     * against it, which is what `workout-launch.ts` protects — "carrying the week/day too would let a
     * stale card (Home rendered minutes ago) train the wrong session". A card cannot go stale about a
     * choice the athlete made two taps ago, so an explicit swap is allowed to travel.
     */
    p_program_week: session.programWeek ?? null,
    p_program_day: session.programDay ?? null,
  });
  if (error) throw error;

  /*
   * ANNOTATIONS, WRITTEN AFTER THE COMMIT — never part of it.
   *
   * `partners` (0016) and the playlist link (0105) are both optional marks ON a session rather than parts
   * OF one, and neither is worth a signature change to `save_workout`, whose 11 arguments have been
   * frozen since 0095 and which every client path calls.
   *
   * BEST-EFFORT, AND THAT IS THE POINT (0018's principle): the session is the thing worth saving. It is
   * already durably committed by the time this line runs, so a failure here costs a tag or a link — never
   * the workout. A throw would surface to W-9's Finish handler as a failed save of a session that in fact
   * saved perfectly.
   *
   * One statement for both, because they are one update to one row.
   */
  const annotations: Record<string, unknown> = {};
  if (partners.length) annotations.partners = partners;
  // Only when there IS one: `playlistToRow(null)` writes three explicit nulls, and sending those on every
  // save would be a pointless write on the overwhelming majority of sessions that have no playlist.
  if (session.playlist) Object.assign(annotations, playlistToRow(session.playlist));

  if (Object.keys(annotations).length) {
    try {
      await supabase.from('workouts').update(annotations).eq('id', data.workout_id);
    } catch {
      // ignore — the workout is already saved
    }
  }

  return { workoutId: data.workout_id, prs, volume: sessionVolume(session), sets: doneSetCount(session) };
}

/** The distance-based activity modalities loggable via the "Log a Run" flow. */
export type DistanceActivity = 'running' | 'walking' | 'cycling' | 'swimming' | 'rowing';

const ACTIVITY_NAME: Record<DistanceActivity, string> = {
  running: 'Run',
  walking: 'Walk',
  cycling: 'Bike Ride',
  swimming: 'Swim',
  rowing: 'Row',
};

export interface ActivityInput {
  activityType: DistanceActivity;
  distanceMi: number;
  durationSec?: number;
  notes?: string | null;
}

/**
 * Log a distance activity (run/walk/bike/row/swim) — a workout carrying `distance` and no strength sets.
 * Reuses the atomic `save_workout` RPC with empty exercises/PRs, so it bumps the chapter and lands in the
 * activity history like any session. Distance is stored as authored in miles (never unit-converted).
 */
export async function saveActivity(input: ActivityInput): Promise<{ workoutId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const dur = input.durationSec ?? 0;
  const startedAt = new Date(Date.now() - dur * 1000).toISOString();

  const { data, error } = await supabase.rpc('save_workout', {
    p_workout_name: ACTIVITY_NAME[input.activityType],
    p_activity_type: input.activityType,
    p_started_at: startedAt,
    p_duration_sec: dur,
    p_notes: input.notes?.trim() || null,
    p_exercises: [],
    p_prs: [],
    p_program_id: null,
    p_distance: input.distanceMi,
    p_distance_unit: 'mi',
  });
  if (error) throw error;
  return { workoutId: data.workout_id };
}

/**
 * The last thing you said about each of these lifts, and when.
 *
 * ══ THIS IS THE DIFFERENCE BETWEEN A DIARY AND A COACH ══
 *
 * A note you can only find by digging through history is a diary entry. The same note surfaced the moment
 * you are about to deadlift again — "grip failed before legs did" — is coaching. It is the same data; the
 * timing is the entire product.
 *
 * Matched the way every other lift-identity read in this codebase matches (`lift_best_lb` in 0078,
 * `fetchPriorRecords` above): by `catalog_key` when there is one, falling back to the exact name for rows
 * written before 0078 added the column. Two different answers to "which lift is this" is how two surfaces
 * drift apart, and here it would surface somebody else's note under your bar.
 *
 * ⚠ AN ABSENT KEY MEANS "NOTHING SAID", NOT "NOTHING KNOWN". The caller must render nothing for it rather
 * than an empty quote.
 */
export interface LastNote {
  text: string;
  savedAt: string;
}

export async function fetchLastNotes(
  lifts: readonly { catalogKey?: string; name: string }[],
): Promise<Record<string, LastNote>> {
  if (!lifts.length) return {};
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const keys = lifts.map((l) => l.catalogKey).filter((k): k is string => !!k);
  const names = lifts.map((l) => l.name);

  /* `workouts!inner` scopes to this athlete's own sessions — `workout_exercises` has no athlete column,
     so without the join every note in the table would be in scope and RLS would be the only thing
     between them. Ordering by the session's save time, newest first, then taking the first hit per lift. */
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('catalog_key, name, notes, workouts!inner(athlete_id, saved_at)')
    .eq('workouts.athlete_id', user.id)
    .not('notes', 'is', null)
    .or(keys.length ? `catalog_key.in.(${keys.join(',')}),name.in.(${names.map((n) => `"${n.replace(/"/g, '')}"`).join(',')})` : `name.in.(${names.map((n) => `"${n.replace(/"/g, '')}"`).join(',')})`)
    .order('saved_at', { referencedTable: 'workouts', ascending: false })
    .limit(200);
  // A history we cannot read is not an error worth surfacing mid-session — it stays silent, exactly as
  // `fetchPriorRecords` does, because the alternative is an error toast between two sets.
  if (error) return {};

  type Row = { catalog_key: string | null; name: string; notes: string | null; workouts: { saved_at: string | null } | null };
  const rows = (data ?? []) as unknown as Row[];
  // Sort here rather than trusting the embedded order: PostgREST orders the EMBEDDED resource, which is
  // one row per parent, so it does not order the parents themselves.
  rows.sort((a, b) => (b.workouts?.saved_at ?? '').localeCompare(a.workouts?.saved_at ?? ''));

  const out: Record<string, LastNote> = {};
  for (const lift of lifts) {
    const id = lift.catalogKey ?? lift.name;
    if (out[id]) continue;
    const hit = rows.find((r) =>
      lift.catalogKey ? r.catalog_key === lift.catalogKey || (r.catalog_key == null && r.name === lift.name) : r.name === lift.name,
    );
    const text = hit?.notes?.trim();
    if (text && hit?.workouts?.saved_at) out[id] = { text, savedAt: hit.workouts.saved_at };
  }
  return out;
}


// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// CONTINUING A WORKOUT YOU ENDED BY ACCIDENT (0125)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/* The window lives in `save-core` — pure, so `node --test` can reach it. Re-exported here so
   callers have one import site for the whole finish/continue path. */
export { CONTINUE_WINDOW_MIN, withinContinueWindow } from './save-core';

/**
 * Commit the work added since a finished workout was reopened.
 *
 * ══ WHY THIS IS NOT `saveWorkout` ══
 *
 * Finishing writes a workout, its sets, records, a timeline event each, the chapter counter, the program
 * session and an honor pass. Running that again for the same session would double every one of them —
 * two entries in history and a chapter count that overstates how often the athlete actually showed up.
 * `continue_workout` appends instead, and deliberately leaves the counter and the program slot alone.
 *
 * ⚠ ONLY THE UNSAVED SETS TRAVEL. `buildAppendExercises` drops everything already committed, so the half
 * of the session that was saved an hour ago is not written a second time.
 *
 * ⚠ AND PRs ARE DETECTED AGAINST THE SAME PRIOR BESTS the first save used. A lift that set a record
 * before the accidental finish must not announce it again on the way back out.
 */
export async function continueWorkout(
  workoutId: string,
  session: ActiveSession,
): Promise<{ setsAdded: number; prs: DetectedPR[] }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const exercises = buildAppendExercises(session);
  if (exercises.length === 0) return { setsAdded: 0, prs: [] };

  /* The same identity rule every other lift-history read uses: catalogue key when there is one, the
     exact name for rows written before 0078 added the column. Two answers to "which lift is this" is how
     a record gets announced twice. */
  const names = session.exercises.map((e) => e.name);
  const { data: prRows } = await supabase
    .from('personal_records')
    .select('exercise, catalog_key, load_value')
    .eq('athlete_id', user.id)
    .eq('measure_kind', 'load')
    .lte('load_reps', PR_MAX_REPS)
    .in('exercise', names);

  const priorBest: Record<string, number | undefined> = {};
  for (const ex of session.exercises) {
    const id = ex.catalogKey ?? ex.name;
    for (const r of prRows ?? []) {
      const row = r as { exercise: string; catalog_key: string | null; load_value: number | null };
      if (row.load_value == null) continue;
      const sameLift = ex.catalogKey
        ? row.catalog_key === ex.catalogKey || (row.catalog_key == null && row.exercise === ex.name)
        : row.exercise === ex.name;
      if (sameLift && (priorBest[id] == null || row.load_value > priorBest[id]!)) priorBest[id] = row.load_value;
    }
  }

  /* Detected over a session whose already-saved sets are marked done — so a record set BEFORE the
     accidental finish is already in `priorBest` above and cannot be claimed twice. */
  const prs = detectPRs(session, priorBest);
  const durationSec = Math.max(0, Math.round((Date.now() - Date.parse(session.startedAt)) / 1000));

  const { data, error } = await supabase.rpc('continue_workout', {
    p_workout_id: workoutId,
    p_exercises: exercises,
    p_prs: prs,
    p_duration_sec: durationSec,
  });
  if (error) throw error;

  return { setsAdded: (data as { sets_added?: number } | null)?.sets_added ?? 0, prs };
}

/**
 * ⚠ RETIRED — `fetchPriorRecords` lived here. Use `fetchLiftHistory` in `@/data/lift-history-live`.
 *
 * It answered "what is the most they have ever lifted on this", which the live logger needs to tell a
 * record from a warm-up ramp. Two things were wrong with it, and both were invisible because the only
 * consumer was a boolean:
 *
 *   · It selected `load_value` alone, discarding `load_reps` and `achieved_on` — so the Best column on
 *     the Active Workout could not be drawn from it, and rendered a hard-coded em-dash instead while the
 *     number sat in state three lines away.
 *   · It matched by NAME ONLY, while `continueWorkout` directly above matches by `catalog_key` first.
 *     Two answers to "which lift is this" inside one file, and the PR path was reading the weaker one.
 *
 * `fetchLiftHistory` returns the mark WITH its reps and date, matched key-first, alongside the last two
 * sessions — one read where there were three. The "absent means never done it, never zero" rule moved
 * with it: default a missing mark to zero and every athlete's first set becomes a personal record.
 */
