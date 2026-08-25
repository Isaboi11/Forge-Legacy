import { supabase } from '@/lib/supabase';
import type { NudgeHistory, NudgeId, NudgeSignals } from '@/domain/coach/nudges';

/**
 * Coach Holt's exploration nudges — reading what the athlete has done, and recording how they answered.
 *
 * The decision itself is pure and lives in `domain/coach/nudges.ts`, where `node --test` can hold the
 * cadence. This file is only the two round trips.
 */

/** Counts only — one RPC rather than eight client queries per Home focus (0179). */
export async function fetchNudgeSignals(): Promise<NudgeSignals | null> {
  const { data, error } = await supabase.rpc('coach_nudge_signals');
  /*
   * ⚠ SILENT ON FAILURE, AND NULL MEANS "SAY NOTHING". Before 0179 is applied this RPC does not exist
   * and the call 404s — which must leave the coin exactly as it was, not throw into a screen the athlete
   * is using for something else. The same rule `squad-settings` applies to its own un-applied migration.
   */
  if (error || !data) return null;
  const d = data as Record<string, number>;
  return {
    sessions: Number(d.sessions ?? 0),
    photos: Number(d.photos ?? 0),
    goals: Number(d.goals ?? 0),
    templates: Number(d.templates ?? 0),
    squads: Number(d.squads ?? 0),
    honors: Number(d.honors ?? 0),
    weighIns: Number(d.weighIns ?? 0),
    programs: Number(d.programs ?? 0),
  };
}

/** Everything this athlete has been offered and how they answered. Empty on any failure. */
export async function fetchNudgeHistory(): Promise<NudgeHistory> {
  const { data, error } = await supabase
    .from('coach_nudge_state')
    .select('nudge_id, shown_at, dismissed_count, dismissed_at, used_at');
  if (error || !data) return {};
  const out: NudgeHistory = {};
  for (const r of data as { nudge_id: string; shown_at: string | null; dismissed_count: number | null; dismissed_at: string | null; used_at: string | null }[]) {
    out[r.nudge_id as NudgeId] = {
      shownAt: r.shown_at,
      dismissedCount: r.dismissed_count ?? 0,
      dismissedAt: r.dismissed_at,
      usedAt: r.used_at,
    };
  }
  return out;
}

/**
 * Record what happened to a nudge.
 *
 * ⚠ `dismissed` INCREMENTS SERVER-SIDE VIA A READ-THEN-WRITE, not a blind `dismissed_count: 1`. Two
 * refusals is the rule that ends a nudge forever, and overwriting the count would mean an athlete could
 * refuse the same invitation every three weeks for the rest of their life.
 *
 * ⚠ BEST-EFFORT, ALWAYS. A failed write costs at most one extra nudge later; throwing here would put an
 * error in front of somebody who just closed a suggestion.
 */
export async function markNudge(id: NudgeId, event: 'shown' | 'dismissed' | 'used'): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();

    if (event === 'dismissed') {
      const { data } = await supabase
        .from('coach_nudge_state')
        .select('dismissed_count')
        .eq('athlete_id', user.id)
        .eq('nudge_id', id)
        .maybeSingle();
      const next = ((data as { dismissed_count?: number } | null)?.dismissed_count ?? 0) + 1;
      await supabase
        .from('coach_nudge_state')
        .upsert({ athlete_id: user.id, nudge_id: id, dismissed_at: now, dismissed_count: next }, { onConflict: 'athlete_id,nudge_id' });
      return;
    }

    await supabase
      .from('coach_nudge_state')
      .upsert(
        { athlete_id: user.id, nudge_id: id, ...(event === 'shown' ? { shown_at: now } : { used_at: now }) },
        { onConflict: 'athlete_id,nudge_id' },
      );
  } catch {
    // best-effort by design — see the header.
  }
}
