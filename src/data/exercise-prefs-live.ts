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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('workout_exercises')
    .select('catalog_key, workouts!inner(athlete_id, started_at, state)')
    .eq('workouts.athlete_id', user.id)
    .eq('workouts.state', 'saved')
    .not('catalog_key', 'is', null)
    .order('started_at', { referencedTable: 'workouts', ascending: false })
    .limit(200);
  if (error) return [];

  const seen: string[] = [];
  for (const row of (data ?? []) as { catalog_key: string | null }[]) {
    const key = row.catalog_key;
    if (key && !seen.includes(key)) seen.push(key);
    if (seen.length >= limit) break;
  }
  return seen;
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
