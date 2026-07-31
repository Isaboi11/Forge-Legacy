import { supabase } from '@/lib/supabase';

/**
 * Workout templates (migration 0091) — a session you already did and want again.
 *
 * Built from the CAPTURE end. Templates are not authored from nothing: they come from a free workout you
 * shaped as you went, or a program day you changed enough that the program no longer describes it. Those
 * are the sessions with no home — a program day is already reusable BY the program.
 */

export interface TemplateExercise {
  catalogKey: string | null;
  name: string;
  sets: number;
  targetReps: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  lastUsedAt: string | null;
  createdAt: string;
}

const MISSING = 'Templates aren’t available yet — migration 0091 hasn’t been applied.';

const toTemplate = (r: Record<string, unknown>): WorkoutTemplate => ({
  id: String(r.id),
  name: String(r.name),
  exercises: ((r.exercises ?? []) as Record<string, unknown>[]).map((e) => ({
    catalogKey: (e.catalogKey as string) ?? null,
    name: String(e.name ?? 'Exercise'),
    sets: Number(e.sets ?? 0),
    targetReps: Number(e.targetReps ?? 0),
  })),
  lastUsedAt: (r.last_used_at as string) ?? null,
  createdAt: String(r.created_at),
});

export async function fetchTemplates(): Promise<WorkoutTemplate[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('workout_templates')
    .select('id, name, exercises, last_used_at, created_at')
    .eq('athlete_id', user.id)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  // An unapplied migration reads as "no templates", which is the safe direction.
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map(toTemplate);
}

/**
 * Keep this session's shape. The database derives it from the workout — the client has already navigated
 * away from the session by the time this is offered, so describing it from memory would be describing
 * something it no longer holds.
 *
 * Returns null when the workout logged nothing worth repeating.
 */
export async function saveWorkoutAsTemplate(workoutId: string, name?: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('save_workout_as_template', { p_workout: workoutId, p_name: name ?? null });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error(MISSING);
    throw error;
  }
  return (data as string | null) ?? null;
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').update({ name: name.trim() }).eq('id', id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id);
  if (error) throw error;
}

/** "5 lifts · 18 sets" — what the template is, at a glance. */
export function templateSummary(t: WorkoutTemplate): string {
  const lifts = t.exercises.length;
  const sets = t.exercises.reduce((n, e) => n + e.sets, 0);
  return `${lifts} ${lifts === 1 ? 'lift' : 'lifts'} · ${sets} ${sets === 1 ? 'set' : 'sets'}`;
}
