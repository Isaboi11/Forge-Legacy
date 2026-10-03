import { supabase } from '@/lib/supabase';

/**
 * The two athlete-owned signals that decide which exercises surface first in the Picker: what they have
 * **bookmarked** (`exercise_favorites`, 0020) and what they have **actually logged** (`workout_exercises`).
 *
 * Deliberately NOT a popularity ranking. The catalog carries no usage or popularity data of any kind, so
 * a global "most common" ordering would be invented. These two are real, personal, and get better the
 * more the athlete trains.
 */

/** Catalog keys the athlete has bookmarked, newest first. */
export async function fetchFavoriteKeys(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('exercise_favorites')
    .select('catalog_key')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return []; // a missing table (pre-0020) must not break the Picker
  return (data ?? []).map((r) => r.catalog_key as string);
}

export async function addFavorite(catalogKey: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('exercise_favorites').insert({ athlete_id: user.id, catalog_key: catalogKey });
}

export async function removeFavorite(catalogKey: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('exercise_favorites').delete().eq('athlete_id', user.id).eq('catalog_key', catalogKey);
}

/**
 * Catalog keys the athlete has logged, most-recently-trained first and de-duplicated.
 *
 * Reads a window of recent rows and dedupes here rather than asking Postgres for a DISTINCT ON, which
 * PostgREST can't express. `limit` caps what's returned — W-23 §8.2 puts Recently Used at 8.
 */
export async function fetchRecentExerciseKeys(limit = 8): Promise<string[]> {
  const seen: string[] = [];
  for (const w of await recentSavedWorkouts('catalog_key, position', false)) {
    for (const ex of w.workout_exercises ?? []) {
      const key = ex.catalog_key;
      if (key && !seen.includes(key)) seen.push(key);
      if (seen.length >= limit) return seen;
    }
  }
  return seen;
}

type RecentWorkout = {
  workout_exercises: { catalog_key: string | null; position: number | null; workout_sets?: { modality: string | null }[] | null }[] | null;
};

/**
 * The athlete's last saved workouts, NEWEST FIRST, each with its exercises (only its cardio, when
 * `cardioOnly` — Home reads this before its first paint, and the sets of every lift are not needed).
 *
 * ⚠ READ FROM `workouts`, NOT FROM `workout_exercises`. This used to select exercise rows and pass
 * `order('started_at', { referencedTable: 'workouts' })` — which orders the EMBEDDED workout, one row
 * per exercise, and so orders nothing: the 200 rows came back in table order, i.e. the athlete's OLDEST
 * work, and "recently trained" was whatever they did first. Ordering the parent is the only order that
 * means "most recent".
 */
async function recentSavedWorkouts(exerciseCols: string, cardioOnly: boolean): Promise<RecentWorkout[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  let q = supabase
    .from('workouts')
    .select(`started_at, workout_exercises${cardioOnly ? '!inner' : ''}(${exerciseCols})`)
    .eq('athlete_id', user.id)
    .eq('state', 'saved');
  // `!inner` above makes this filter the WORKOUTS too, so 40 lifting days in a row cannot hide the last run.
  if (cardioOnly) q = q.like('workout_exercises.catalog_key', 'cardio:%');
  const { data, error } = await q
    .order('started_at', { ascending: false })
    .order('position', { referencedTable: 'workout_exercises', ascending: true })
    .limit(40);
  if (error) return [];
  return (data ?? []) as unknown as RecentWorkout[];
}

/**
 * The cardio the athlete has logged, most recent first, with the SIDE it was done on (a treadmill run
 * is `run` + `indoor`) — what orders the cardio pills, so Kim's Treadmill leads and nobody's Outdoor Run
 * is buried under a machine they never use. Not de-duplicated: `cardioPillsByRecency` does that.
 */
export async function fetchRecentCardio(): Promise<{ activity: string; modality: string | null }[]> {
  const out: { activity: string; modality: string | null }[] = [];
  for (const w of await recentSavedWorkouts('catalog_key, position, workout_sets(modality)', true)) {
    for (const ex of w.workout_exercises ?? []) {
      if (!ex.catalog_key?.startsWith('cardio:')) continue;
      out.push({ activity: ex.catalog_key.slice('cardio:'.length), modality: ex.workout_sets?.[0]?.modality ?? null });
    }
  }
  return out;
}

// ── The signal favourites never had (0138) ───────────────────────────────────

/**
 * "STOP GIVING ME THIS" — the negative counterpart to `exercise_favorites`.
 *
 * ══ WHY IT DID NOT EXIST ══
 *
 * Favourites have carried "I like this" since migration 0020. Nothing has ever carried the opposite, so
 * when the PO asked whether Holt learns "what that person likes and doesn't like", half the question had
 * no data behind it at all. `Coach-Adaptive-Learning-Amendment-001` CL-D10.
 *
 * ⚠ NOT READ BY THE COACH ENGINE YET, AND THAT IS A DECISION (CL-D11). Capture ships first — nothing can
 * learn from data that was never written — but CL-D3 makes a VISIBLE, REVERSIBLE list in the app a
 * precondition of `assemble()` ever reading this. An avoidance the athlete cannot see silently narrows
 * their training and neither of you ever finds out why, which is the failure mode the whole design is
 * aimed at. Wire the surface before wiring the engine.
 *
 * ⚠ AND IT REMOVES AN EXERCISE, NEVER A MOVEMENT PATTERN (CL-D3). Avoiding back squats must leave a leg
 * day that squats some other way, not a program that stopped training legs.
 */
export interface AvoidedExercise {
  catalogKey: string;
  reason: string | null;
  createdAt: string;
}

export async function fetchAvoidedExercises(): Promise<AvoidedExercise[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('exercise_avoidance')
    .select('catalog_key, reason, created_at')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });
  // A missing table (pre-0138) reads as "nothing avoided", exactly as `fetchFavoriteKeys` treats pre-0020.
  if (error) return [];
  return ((data ?? []) as { catalog_key: string; reason: string | null; created_at: string }[]).map((r) => ({
    catalogKey: r.catalog_key,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

/** Idempotent — asking twice is the same "no", not two of them. */
export async function avoidExercise(catalogKey: string, reason?: string | null): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('exercise_avoidance')
    .upsert(
      { athlete_id: user.id, catalog_key: catalogKey, reason: reason?.trim() || null },
      { onConflict: 'athlete_id,catalog_key' },
    );
}

/** Taking it back. CL-D3 requires this to be reachable wherever an avoidance is shown. */
export async function unavoidExercise(catalogKey: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('exercise_avoidance').delete().eq('athlete_id', user.id).eq('catalog_key', catalogKey);
}
