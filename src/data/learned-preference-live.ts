import { supabase } from '@/lib/supabase';
import { itemByKey } from '@/domain/exercise-picker/data';
import { learnPreferences, type LearnedPreferences, type SwapRecord } from '@/domain/coach/learned-preference';

/**
 * WHAT THIS ATHLETE KEEPS REACHING FOR (migration 0138).
 *
 * ══ THE READ ══
 *
 * `workout_exercises.prescribed_catalog_key` is non-null only on a row where the athlete SUBSTITUTED —
 * they were offered one movement and did another. That is a stated comparison, and it is a far better
 * signal than "logged this often", which mostly measures what the program prescribed.
 *
 * ⚠ THE PATTERN COMES FROM THE CATALOGUE, NOT THE ROW. `workout_exercises` stores no movement pattern —
 * it is a property of the exercise, and the catalogue is the authority on it. Storing a copy at save
 * time would have created a second answer to "what pattern is this", which is the drift this codebase
 * has been bitten by before (see `saveWorkout`'s note on catalogue keys versus display names).
 *
 * ⚠ AND IT FAILS TO "NO OPINION", NEVER TO AN ERROR. An unapplied 0138, a dropped request, or a brand
 * new athlete all resolve to `{}` — and `{}` means the ranker behaves exactly as it did before any of
 * this existed. Nothing about a coach's exercise choice is worth an error message.
 */

/** How far back to look. A preference from last spring is not one worth acting on today. */
const WINDOW_ROWS = 200;

export async function fetchLearnedPreferences(): Promise<LearnedPreferences> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('workout_exercises')
      .select('catalog_key, prescribed_catalog_key, workouts!inner(athlete_id, saved_at, state)')
      .eq('workouts.athlete_id', user.id)
      .eq('workouts.state', 'saved')
      .not('prescribed_catalog_key', 'is', null)
      .order('saved_at', { referencedTable: 'workouts', ascending: false })
      .limit(WINDOW_ROWS);
    if (error || !data) return {};

    const rows = data as unknown as { catalog_key: string | null; prescribed_catalog_key: string | null }[];
    const swaps: SwapRecord[] = [];
    for (const r of rows) {
      if (!r.catalog_key || !r.prescribed_catalog_key) continue;
      const item = itemByKey(r.catalog_key);
      // A custom exercise has no catalogue pattern, so it cannot re-rank a pattern it does not belong
      // to. It is skipped rather than filed under a guessed one.
      if (!item?.pattern) continue;
      swaps.push({ pattern: item.pattern, chosen: r.catalog_key, replaced: r.prescribed_catalog_key });
    }
    return learnPreferences(swaps);
  } catch {
    return {};
  }
}
