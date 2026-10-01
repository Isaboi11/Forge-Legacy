import { supabase } from '@/lib/supabase';

/**
 * What Home's "Welcome back" needs: when the athlete last trained, and what they have built.
 *
 * Three small reads instead of one large one — the newest saved workout's start time, a head-only count
 * of saved workouts, and a head-only count of honors. A count that fails is reported as 0, which the
 * built line simply leaves out; the greeting itself depends only on `lastWorkoutAt`.
 */
export interface WelcomeBackFacts {
  lastWorkoutAt: string | null;
  workouts: number;
  honors: number;
}

export async function fetchWelcomeBackFacts(): Promise<WelcomeBackFacts> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { lastWorkoutAt: null, workouts: 0, honors: 0 };

  const [last, workouts, honors] = await Promise.all([
    supabase
      .from('workouts')
      .select('started_at')
      .eq('athlete_id', user.id)
      .eq('state', 'saved')
      .order('started_at', { ascending: false })
      .limit(1),
    supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('athlete_id', user.id).eq('state', 'saved'),
    supabase.from('honor_instances').select('id', { count: 'exact', head: true }).eq('athlete_id', user.id),
  ]);
  if (last.error) throw last.error;

  const row = (last.data ?? [])[0] as { started_at: string } | undefined;
  return {
    lastWorkoutAt: row?.started_at ?? null,
    workouts: workouts.count ?? 0,
    honors: honors.count ?? 0,
  };
}

/**
 * The saved workout that came before `startedAt` — for Workout Complete's "First session back" line.
 * Null when there is none (a first-ever workout) or the read fails; either way the line stays hidden.
 */
export async function fetchPreviousWorkoutAt(startedAt: string, excludeId?: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  let q = supabase
    .from('workouts')
    .select('started_at')
    .eq('athlete_id', user.id)
    .eq('state', 'saved')
    .lt('started_at', startedAt)
    .order('started_at', { ascending: false })
    .limit(1);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) return null;
  return ((data ?? [])[0] as { started_at: string } | undefined)?.started_at ?? null;
}
