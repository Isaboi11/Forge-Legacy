import { supabase } from '@/lib/supabase';
import type { IntensitySignal } from '@/domain/coach/intensity-learning';

/**
 * WHAT HOLT DECIDED, READ BACK (migration 0142).
 *
 * ⚠ FAILS QUIETLY TO "NOTHING KNOWN". Every caller treats an empty list as "no proposal", which is the
 * safe direction: an unapplied migration or a dropped request makes the coach say nothing, never makes
 * him change how hard he pushes. The alternative — an error surfaced between sets — is the interruption
 * this whole feature exists to give people control over.
 */

const WINDOW_ROWS = 40;

export async function fetchIntensitySignals(): Promise<IntensitySignal[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('coach_intensity_signal')
      .select('action, observed_at, workout_id')
      .eq('athlete_id', user.id)
      .order('observed_at', { ascending: false })
      .limit(WINDOW_ROWS);
    if (error || !data) return [];

    return (data as { action: string; observed_at: string; workout_id: string }[]).map((r) => ({
      action: r.action as IntensitySignal['action'],
      observedAt: r.observed_at,
      workoutId: r.workout_id,
    }));
  } catch {
    return [];
  }
}
