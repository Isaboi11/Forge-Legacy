import { supabase } from '@/lib/supabase';
import { detectPRs, doneSetCount, e1rm, sessionVolume } from './metrics';
import type { ActiveSession } from './types';

export interface SaveResult {
  workoutId: string;
  prs: { exercise: string; weight: number; reps: number; catalogKey?: string | null }[];
  volume: number;
  sets: number;
}

/**
 * The Finish commit (W-9). Reads the athlete's current best e1RM per exercise, detects PRs domain-side,
 * then hands the whole session to the atomic `save_workout` RPC (workout + exercises + done sets + PRs +
 * timeline + chapter bump, all-or-nothing). Only DONE sets persist; skipped/pending sets are no data.
 *
 * `partners` are the "Trained With" tags (names) — attribution on the athlete's OWN workout row, written
 * best-effort after the commit; a failure never fails the save (the session is already logged).
 */
export async function saveWorkout(session: ActiveSession, partners: string[] = []): Promise<SaveResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const names = [...new Set(session.exercises.map((e) => e.name))];
  const { data: prRows, error: pe } = await supabase
    .from('personal_records')
    .select('exercise, load_value, load_reps')
    .eq('athlete_id', user.id)
    .eq('measure_kind', 'load')
    .in('exercise', names);
  if (pe) throw pe;

  const bestE1rm: Record<string, number> = {};
  for (const r of prRows ?? []) {
    if (r.load_value == null) continue;
    bestE1rm[r.exercise] = Math.max(bestE1rm[r.exercise] ?? 0, e1rm(r.load_value, r.load_reps ?? 1));
  }

  const prs = detectPRs(session, bestE1rm);
  const durationSec = Math.max(0, Math.round((Date.now() - Date.parse(session.startedAt)) / 1000));

  const exercises = session.exercises.map((ex) => ({
    name: ex.name,
    catalog_key: ex.catalogKey ?? null,
    section: ex.section,
    position: ex.position,
    sets: ex.sets
      .filter((s) => s.done)
      .map((s) => ({ set_index: s.setIndex, weight: s.weight, weight_unit: 'lb', reps: s.actualReps ?? s.targetReps })),
  }));

  const { data, error } = await supabase.rpc('save_workout', {
    p_workout_name: session.workoutName,
    p_activity_type: session.activityType,
    p_started_at: session.startedAt,
    p_duration_sec: durationSec,
    p_notes: null,
    p_exercises: exercises,
    p_prs: prs,
    p_program_id: session.programId ?? null,
    p_distance: null,
    p_distance_unit: null,
    p_template_id: session.templateId ?? null,
  });
  if (error) throw error;

  // attribution (best-effort) — never fail the save over a partner tag
  if (partners.length) {
    try {
      await supabase.from('workouts').update({ partners }).eq('id', data.workout_id);
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
