import { supabase } from '@/lib/supabase';
import { recentWorkFrom, NO_RECENT_WORK, RECENT_WINDOW, type RecentWork } from '@/domain/coach/recent-work';

/**
 * WHAT THIS ATHLETE HAS TRAINED LATELY — the variety signal Holt never had.
 *
 * ══ THE READ ══
 *
 * The last `RECENT_WINDOW` saved sessions, and the catalogue key of every exercise in each. That is all
 * the engine needs: `recentWorkFrom` turns it into "how many sessions ago did I last see this key", and
 * `pickWithVariety` uses it to reorder a shortlist the rulebook already approved.
 *
 * ⚠ SESSIONS, NOT ROWS, AND THE DISTINCTION IS THE FEATURE. `learned-preference-live.ts` reads a flat
 * window of 200 exercise rows because it is counting swaps, where only the total matters. Here the unit
 * is the SESSION — "you did this last time" — so the workouts are fetched first and their exercises
 * second. A flat row window would have made a 12-exercise day and a 4-exercise day count differently
 * toward the same question.
 *
 * ⚠ `state = 'saved'` ONLY. A workout in progress is not something that was done; counting it would make
 * the session an athlete is standing in the middle of push its own exercises out of its own plan.
 *
 * ⚠ AND IT FAILS TO "NO HISTORY", NEVER TO AN ERROR — the same contract `fetchLearnedPreferences` has. A
 * dropped request, a brand new athlete, or a signed-out caller all resolve to `NO_RECENT_WORK`, and that
 * makes the ranker behave exactly as it did before variety existed: every staleness is `Infinity`, ties
 * go to the ranking, and the rulebook's first choice is returned. Nothing about varying an exercise
 * choice is worth failing a program build over.
 */
export async function fetchRecentWork(): Promise<RecentWork> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NO_RECENT_WORK;

    const { data: sessions, error } = await supabase
      .from('workouts')
      .select('id, started_at')
      .eq('athlete_id', user.id)
      .eq('state', 'saved')
      .order('started_at', { ascending: false })
      .limit(RECENT_WINDOW);
    if (error || !sessions?.length) return NO_RECENT_WORK;

    const rows = sessions as unknown as { id: string; started_at: string }[];
    const { data: exRows, error: exError } = await supabase
      .from('workout_exercises')
      .select('workout_id, catalog_key')
      .in(
        'workout_id',
        rows.map((r) => r.id),
      );
    if (exError || !exRows) return NO_RECENT_WORK;

    /*
     * Grouped back onto the session order the first query established. The second query does not carry
     * an order of its own that means anything here — `in` returns rows however the planner likes — so the
     * newest-first sequence `recentWorkFrom` depends on comes from `rows`, never from `exRows`.
     */
    const byWorkout = new Map<string, string[]>(rows.map((r) => [r.id, []]));
    for (const r of exRows as unknown as { workout_id: string; catalog_key: string | null }[]) {
      // A custom exercise has no catalogue key and cannot collide with a catalogue candidate, so there is
      // nothing for it to make stale. Skipped rather than filed under a guessed key.
      if (!r.catalog_key) continue;
      byWorkout.get(r.workout_id)?.push(r.catalog_key);
    }

    return recentWorkFrom(rows.map((r) => byWorkout.get(r.id) ?? []));
  } catch {
    return NO_RECENT_WORK;
  }
}

/**
 * Has this athlete saved a workout in the last `days` days? The Workouts tab's arrival view steps aside
 * for anyone who has (PO, 2026-09-23): a tester who trains every week but has never built a program or
 * saved a template was still being greeted as brand new.
 *
 * ⚠ UNLIKE `fetchRecentWork`, A FAILURE THROWS. "Could not tell" must not read as "has not trained";
 * the caller treats an error as unknown, not as no.
 */
export async function fetchTrainedWithin(days = 14): Promise<boolean> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return false;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', user.id)
    .eq('state', 'saved')
    .gte('started_at', since);
  if (error) throw error;
  return (count ?? 0) > 0;
}
