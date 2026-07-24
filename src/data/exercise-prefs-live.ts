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
