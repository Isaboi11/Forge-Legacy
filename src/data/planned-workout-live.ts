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

/**
 * Where the slot's contents came from (0192, SQ-A5-D3.1) — null on everything the athlete built
 * themselves, which is every row written before Posted Workouts existed.
 *
 * The hero reads this to decide whether to draw its "From <squad>" line at all. A workout that appears on
 * your Home screen with no account of who put it there is an unsolicited payload, and it does not stop
 * being one because the sender was a squad-mate.
 */
export interface PlannedWorkoutSource {
  postId: string;
  squadId: string | null;
  squadName: string | null;
  authorName: string | null;
}

export interface PlannedWorkout {
  name: string;
  exercises: TemplateExercise[];
  createdAt: string;
  /** Null when they built it themselves. */
  source: PlannedWorkoutSource | null;
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

  /*
   * ⚠ THE PROVENANCE JOIN IS OPTIONAL, AND THE FALLBACK IS NOT AN ERROR PATH.
   *
   * The three source columns arrive with 0192. On a database that has not applied it, PostgREST rejects
   * the whole select for the unknown columns — so a failure here retries WITHOUT them rather than
   * reporting "nothing planned" to an athlete who has something planned. The one-off built for later has
   * worked since 0136 and must not break on the migration that adds a feature it does not use.
   */
  const FULL =
    'name, exercises, created_at, source_post_id, source_squad_id, squads:source_squad_id (name), author:source_author_id (name)';

  let row: Record<string, unknown> | null = null;
  let sourced = true;

  const full = await supabase.from('planned_workouts').select(FULL).eq('athlete_id', user.id).maybeSingle();
  if (full.error) {
    sourced = false;
    const bare = await supabase
      .from('planned_workouts')
      .select('name, exercises, created_at')
      .eq('athlete_id', user.id)
      .maybeSingle();
    if (bare.error || !bare.data) return null;
    row = bare.data as Record<string, unknown>;
  } else {
    if (!full.data) return null;
    row = full.data as Record<string, unknown>;
  }

  const exercises = Array.isArray(row.exercises) ? (row.exercises as TemplateExercise[]) : [];
  // A plan with nothing in it is not a plan. Treat it as absent rather than putting an empty card on the
  // hero that starts an empty session.
  if (exercises.length === 0) return null;

  const named = (v: unknown): string | null => {
    const n = (Array.isArray(v) ? v[0] : v) as { name?: string } | null;
    return n?.name ?? null;
  };
  const postId = sourced ? ((row.source_post_id as string | null) ?? null) : null;

  return {
    name: row.name as string,
    exercises,
    createdAt: row.created_at as string,
    source: postId
      ? {
          postId,
          squadId: (row.source_squad_id as string | null) ?? null,
          squadName: named(row.squads),
          authorName: named(row.author),
        }
      : null,
  };
}

/**
 * Save (or replace) the planned workout. The PK makes this one slot; there is no "which one" to pick.
 *
 * ⚠ THE UPSERT MUST CLEAR PROVENANCE, and the reason is not obvious from the row it writes. Upsert
 * updates only the columns it names, so a workout the athlete builds themselves over the top of one they
 * took from a squad would inherit that post's `source_*` — and the hero would announce their own session
 * as "From Iron Squad", linking to a post that has nothing to do with it. The nulls are written, not
 * omitted, on a database that has the columns.
 */
export async function savePlannedWorkout(name: string, exercises: TemplateExercise[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const base = {
    athlete_id: user.id,
    name: name.trim() || 'Planned Workout',
    exercises,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('planned_workouts')
    .upsert({ ...base, source_post_id: null, source_squad_id: null, source_author_id: null }, { onConflict: 'athlete_id' });
  if (!error) return;

  // Pre-0192 database: the columns do not exist, so there is no provenance to clear and the plain row is
  // the whole truth. Same fallback shape as the read above, for the same reason.
  const { error: bare } = await supabase.from('planned_workouts').upsert(base, { onConflict: 'athlete_id' });
  if (bare) throw bare;
}

const MISSING = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);
const NOT_MIGRATED = 'Taking a squad workout isn’t available yet — migration 0192 hasn’t been applied.';

/**
 * Take a workout somebody posted to a squad into your own slot (0192, SQ-A5-D3).
 *
 * The RPC is SECURITY INVOKER: RLS decides whether the post is yours to read (squad membership) and
 * whether the slot is yours to write (your own row). A non-member gets "no longer available" from the
 * database rather than from a check here, which is the correct place for it.
 *
 * Returns the workout's name so the caller can say what landed. Whatever was in the slot is gone —
 * SQ-A5-D3.2 puts the confirmation in front of this call, never inside it.
 */
export async function takePostedWorkout(postId: string): Promise<string> {
  const { data, error } = await supabase.rpc('take_posted_workout', { p_post: postId });
  if (error) {
    throw new Error(MISSING.has((error as { code?: string }).code ?? '') ? NOT_MIGRATED : error.message);
  }
  return typeof data === 'string' && data.trim() ? data : 'Workout';
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
