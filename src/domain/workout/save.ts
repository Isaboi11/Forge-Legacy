import { supabase } from '@/lib/supabase';
import { detectPRs, doneSetCount, e1rm, sessionVolume } from './metrics';
import type { ActiveSession } from './types';

export interface SaveResult {
  workoutId: string;
  prs: { exercise: string; weight: number; reps: number }[];
  volume: number;
  sets: number;
}

/**
 * The Finish commit (W-9). Reads the athlete's current best e1RM per exercise, detects PRs domain-side,
 * then hands the whole session to the atomic `save_workout` RPC (workout + exercises + done sets + PRs +
 * timeline + chapter bump, all-or-nothing). Only DONE sets persist; skipped/pending sets are no data.
 */
export async function saveWorkout(session: ActiveSession): Promise<SaveResult> {
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
  });
  if (error) throw error;

  return { workoutId: data.workout_id, prs, volume: sessionVolume(session), sets: doneSetCount(session) };
}
