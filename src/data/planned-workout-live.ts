import { supabase } from '@/lib/supabase';
import type { TemplateExercise } from '@/data/templates-live';

/**
 * The one-off workout built in advance and waiting on the Home hero (0136).
 *
 * Deliberately NOT a template. "Save for later" used to write a `workout_templates` row, which made
 * every one-off permanent — plan Thursday's session, train it, and it sat in the library for ever next
 * to the shapes actually meant to be reused. Saving it as a template is still offered, at the end of the
 * session, once the athlete knows whether it was worth keeping.
 *
 * One slot: `athlete_id` is the table's PRIMARY KEY, so `upsert` replaces rather than accumulates. No
 * expiry — a plan that silently vanishes is worse than a stale one.
 */

export interface PlannedWorkout {
  name: string;
  exercises: TemplateExercise[];
  createdAt: string;
}

/**
 * A missing table reads as "nothing planned", which is an ordinary state and the safe direction: the
 * hero falls back to its normal freestyle face instead of taking Home down over an unapplied migration.
 * Every other read in this app that predates its migration does the same.
 */
export async function fetchPlannedWorkout(): Promise<PlannedWorkout | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('planned_workouts')
    .select('name, exercises, created_at')
    .eq('athlete_id', user.id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as { name: string; exercises: unknown; created_at: string };
  const exercises = Array.isArray(row.exercises) ? (row.exercises as TemplateExercise[]) : [];
  // A plan with nothing in it is not a plan. Treat it as absent rather than putting an empty card on the
  // hero that starts an empty session.
  if (exercises.length === 0) return null;
  return { name: row.name, exercises, createdAt: row.created_at };
}

/** Save (or replace) the planned workout. The PK makes this one slot; there is no "which one" to pick. */
export async function savePlannedWorkout(name: string, exercises: TemplateExercise[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase.from('planned_workouts').upsert(
    {
      athlete_id: user.id,
      name: name.trim() || 'Planned Workout',
      exercises,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'athlete_id' },
  );
  if (error) throw error;
}

/**
 * Clear it — because it was started, or because the athlete changed their mind.
 *
 * Fire-and-forget at the call site that STARTS one: a plan that fails to clear leaves a card offering a
 * session already under way, which the resume state covers, while a start blocked on a delete would
 * strand the athlete at the door of their own workout.
 */
export async function clearPlannedWorkout(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('planned_workouts').delete().eq('athlete_id', user.id);
}
