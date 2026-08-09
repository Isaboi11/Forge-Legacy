import { supabase } from '@/lib/supabase';
import type { HistorySession } from '@/domain/coach/progression';

/**
 * What the athlete has actually lifted, for the exercises the coach is about to prescribe.
 *
 * ══ KEYED BY NAME, BECAUSE THAT IS WHAT THE LOG RECORDS ══
 *
 * A saved workout stores `workout_exercises.name` and no catalogue id — the logger has always written
 * the display name. So the lookup is by name, and it is exact rather than fuzzy: a near-match would be
 * worse than no match, because it would confidently suggest adding weight to a movement they never did.
 *
 * ⚠ A CATALOGUE RENAME ORPHANS HISTORY. Worth knowing before anyone renames an exercise — the athlete's
 * record survives (it is their workout, unchanged), but the coach stops recognising it and falls back to
 * "first time on this", which is the safe direction to fail in.
 *
 * ══ TWO SESSIONS, NOT TWENTY ══
 *
 * `progressionFor` reads at most the last two: enough to tell a bad Tuesday from a real regression, and
 * few enough that a good month three weeks ago cannot argue with a bad week now. Fetching more would be
 * data nobody looks at, on a screen somebody is standing in a gym waiting for.
 */
export async function fetchRecentSetsFor(
  names: readonly string[],
): Promise<Map<string, HistorySession[]>> {
  const out = new Map<string, HistorySession[]>();
  if (names.length === 0) return out;

  const { data, error } = await supabase
    .from('workouts')
    .select('started_at, workout_exercises!inner(name, workout_sets(set_index, weight, reps))')
    .eq('state', 'saved')
    .in('workout_exercises.name', [...new Set(names)])
    // Newest first, and generously capped: one workout can carry several of the names we asked about, so
    // this is a bound on round-trip size rather than on how far back the answer reaches.
    .order('started_at', { ascending: false })
    .limit(60);

  // A history read failing is not a reason to fail the workout. The coach says "first time on this",
  // which is true enough from where it is standing, and the athlete still gets their session.
  if (error || !data) return out;

  type Row = {
    started_at: string;
    workout_exercises:
      | { name: string; workout_sets: { set_index: number; weight: number | null; reps: number | null }[] | null }[]
      | null;
  };

  for (const w of data as Row[]) {
    for (const ex of w.workout_exercises ?? []) {
      const list = out.get(ex.name) ?? [];
      // Two is what the caller reads; anything past it is weight on the wire for nothing.
      if (list.length >= 2) continue;
      list.push({
        startedAt: w.started_at,
        sets: [...(ex.workout_sets ?? [])]
          .sort((a, b) => a.set_index - b.set_index)
          .map((s) => ({ weight: s.weight, reps: s.reps })),
      });
      out.set(ex.name, list);
    }
  }

  return out;
}
