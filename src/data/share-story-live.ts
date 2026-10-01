import { supabase } from '@/lib/supabase';
import { fetchCompletion, type Completion } from '@/data/workout-complete-live';
import type { UnitSystem } from '@/domain/settings/units';

/**
 * Everything the share picture draws from, for the athlete's OWN session.
 *
 * The completion is the same read Workout Complete makes, so the picture's volume, sets and records are
 * the numbers the athlete just saw on the seal screen — never a second count that could disagree with it.
 * The route, the climb and the start time are the three things that read leaves out, fetched here in one
 * small, tolerant query: a picture with no route is still a picture, so a failure there costs the map and
 * nothing else.
 *
 * ⚠ The polyline comes down to the athlete's own phone only to be DRAWN, and only after they tick "Show my
 * route" does it reach a picture (D-RS-3). Nothing here sends it anywhere.
 */
export interface ShareStoryData {
  completion: Completion;
  startedAt: string | null;
  route: string | null;
  climbM: number | null;
}

export async function fetchShareStory(workoutId: string, units: UnitSystem): Promise<ShareStoryData> {
  const [completion, extra] = await Promise.all([fetchCompletion(workoutId, units), fetchRouteBits(workoutId)]);
  return { completion, ...extra };
}

async function fetchRouteBits(workoutId: string): Promise<Omit<ShareStoryData, 'completion'>> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('started_at, workout_exercises(workout_sets(route, climb_m))')
      .eq('id', workoutId)
      .maybeSingle();
    if (error || !data) return { startedAt: null, route: null, climbM: null };
    const row = data as unknown as {
      started_at: string | null;
      workout_exercises: { workout_sets: { route: string | null; climb_m: number | null }[] | null }[] | null;
    };
    // One tracked bout per session today; the first set carrying a shape wins, as on Activity Detail.
    const routed = (row.workout_exercises ?? []).flatMap((e) => e.workout_sets ?? []).find((s) => s.route);
    return { startedAt: row.started_at ?? null, route: routed?.route ?? null, climbM: routed?.climb_m ?? null };
  } catch {
    return { startedAt: null, route: null, climbM: null };
  }
}
