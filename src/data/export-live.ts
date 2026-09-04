import { supabase } from '@/lib/supabase';
import type { ExportWorkout } from '@/domain/settings/export-core';

/**
 * Every workout the athlete has saved, with its exercises and sets — the read behind Export My Data
 * (P-9 §4). The shaping into a file is `domain/settings/export-core.ts`; this only fetches.
 *
 * ══ ⚠ COLUMN CHOICE IS A RELIABILITY DECISION HERE, NOT A PREFERENCE ══
 *
 * `activity-live.ts` records the rule this follows: *"Selecting a column that might not exist fails the
 * WHOLE query."* So this takes the `0001` spine (`set_index, weight, weight_unit, reps, notes`) plus
 * `0096`'s conditioning columns (`duration_sec, distance, distance_unit`) and stops there. `modality`
 * (0097), `floors` (0151) and `route`/`climb_m` (0162) are all real and all applied — and all omitted,
 * because the cost of being wrong is that an athlete's entire export fails rather than that it carries
 * one fewer column. An export is a trust feature; a partial one beats a broken one.
 *
 * ⚠ NO `limit()`. Every other history read in this app caps its rows because a screen renders them. This
 * is the one read where a cap would be a defect: an export that silently stopped at 200 workouts would
 * tell the athlete they had less training than they do, and they would have no way to notice.
 */

type SetRow = {
  set_index: number;
  weight: number | null;
  weight_unit: string | null;
  reps: number | null;
  notes: string | null;
  duration_sec: number | null;
  distance: number | null;
  distance_unit: string | null;
};

type Row = {
  id: string;
  workout_name: string | null;
  activity_type: string | null;
  started_at: string;
  duration_sec: number | null;
  distance: number | null;
  distance_unit: string | null;
  notes: string | null;
  workout_exercises:
    | { name: string; position: number | null; workout_sets: SetRow[] | null }[]
    | null;
};

export async function fetchExportWorkouts(): Promise<ExportWorkout[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, workout_name, activity_type, started_at, duration_sec, distance, distance_unit, notes, ' +
        'workout_exercises(name, position, workout_sets(set_index, weight, weight_unit, reps, notes, duration_sec, distance, distance_unit))',
    )
    .eq('athlete_id', user.id)
    .eq('state', 'saved')
    /* Oldest first. A training log reads forward — and a spreadsheet opened at row 2 should start at the
       beginning of the story, not the end of it. */
    .order('started_at', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as Row[]).map((w) => ({
    id: w.id,
    name: w.workout_name,
    activityType: w.activity_type,
    startedAt: w.started_at,
    durationSec: w.duration_sec,
    distance: w.distance,
    distanceUnit: w.distance_unit,
    notes: w.notes,
    exercises: (w.workout_exercises ?? [])
      /* PostgREST does not order embedded rows; without this the exercises come back in whatever order
         the planner produced, and an export whose exercises shuffle between two runs looks untrustworthy
         even when every number in it is right. */
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((ex) => ({
        name: ex.name,
        position: ex.position,
        sets: (ex.workout_sets ?? []).slice().sort((a, b) => a.set_index - b.set_index).map((s) => ({
          setIndex: s.set_index,
          weight: s.weight,
          weightUnit: s.weight_unit,
          reps: s.reps,
          durationSec: s.duration_sec,
          distance: s.distance,
          distanceUnit: s.distance_unit,
          notes: s.notes,
        })),
      })),
  }));
}
