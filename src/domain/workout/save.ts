import { supabase } from '@/lib/supabase';
import { sessionActivityType } from './conditioning';
import { detectPRs, doneSetCount, PR_MAX_REPS, sessionVolume } from './metrics';
import { buildSaveExercises } from './save-core';
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
    p_notes: null,
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
 * The athlete's existing record on each of these lifts — heaviest weight logged for 1–5 reps.
 *
 * The live logger needs this to tell a record from a warm-up ramp. It used to compare a set against
 * earlier sets in the SAME session, so working up 135 → 185 → 225 announced a personal record on the
 * third set, every session, forever.
 *
 * A NAME ABSENT FROM THE RESULT MEANS "NEVER DONE IT" — the caller must not default it to zero, or the
 * first session on any lift becomes a record again.
 */
export async function fetchPriorRecords(names: readonly string[]): Promise<Record<string, number>> {
  if (!names.length) return {};
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise, load_value')
    .eq('athlete_id', user.id)
    .eq('measure_kind', 'load')
    .lte('load_reps', PR_MAX_REPS)
    .in('exercise', [...names]);
  if (error) return {}; // no history readable = nothing to beat, which stays silent rather than claiming

  const best: Record<string, number> = {};
  for (const r of data ?? []) {
    const v = Number((r as { load_value: number | null }).load_value);
    const k = (r as { exercise: string }).exercise;
    if (!Number.isFinite(v)) continue;
    if (best[k] == null || v > best[k]) best[k] = v;
  }
  return best;
}
