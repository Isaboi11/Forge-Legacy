import { supabase } from '@/lib/supabase';
import type { ActivityKind, PriorSession } from '@/domain/run/run-core';
import type { DistanceActivity } from '@/domain/workout/save';

/**
 * What the athlete has already done on foot or a bike — the field a new session's personal bests are
 * measured against.
 *
 * The design asserted its bests: "11 sec faster than best" was a hardcoded string shown on any finish,
 * including a 0.02-mile one, because a preview flag forced the section on. A claim about the athlete's
 * own record is the one thing this app must never invent, so the comparison reads the record.
 */

export const ACTIVITY_TYPE: Record<ActivityKind, DistanceActivity> = {
  run: 'running',
  walk: 'walking',
  bike: 'cycling',
};

/**
 * Every prior session of this kind that carries a distance and a duration.
 *
 * Only LIKE activities count — a ride is not a fast run. Rows without both numbers are dropped rather
 * than defaulted, because a session with no duration would compute as infinitely fast and silently
 * become a record nothing could ever beat.
 */
export async function fetchPriorSessions(kind: ActivityKind): Promise<PriorSession[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('workouts')
    .select('distance, duration_sec')
    .eq('athlete_id', user.id)
    .eq('activity_type', ACTIVITY_TYPE[kind])
    .eq('state', 'saved')
    .not('distance', 'is', null)
    .gt('duration_sec', 0);

  // No history reads as "no bests to beat", which is the safe direction — it withholds a claim rather
  // than making one.
  if (error) return [];

  return ((data ?? []) as { distance: number | null; duration_sec: number | null }[])
    .filter((w) => w.distance != null && w.duration_sec != null && w.distance > 0 && w.duration_sec > 0)
    .map((w) => ({ distanceMi: Number(w.distance), durationSec: Number(w.duration_sec) }));
}
