import { supabase } from '@/lib/supabase';

/**
 * Grant the one-time "Initiative" honor — the fresh athlete's first-move honor, earned when they commit to a
 * starting program (built OR chose one). Mirrors the DB-side grant path of the workout honors
 * (`evaluate_honors`, migration 0012): the `claim_initiative_honor` RPC (migration 0014) does an idempotent
 * insert into `honor_instances`, guarded by the same `honor_once` unique index, so calling this on every
 * accept / build / re-pick can only ever grant one row. It writes the same live `HONOR_EARNED` timeline
 * event, and the Legacy Honors section reads it live like any other honor — no read-path change.
 *
 * Best-effort by design: callers fire-and-forget so a failed grant never blocks the Home un-gate; the next
 * accept/build re-attempts, and the DB dedupes. (Until migration 0014 is applied to the DB, the RPC 404s and
 * this throws — swallowed by the caller — so the on-ramp is unaffected.)
 */
export async function claimInitiativeHonor(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.rpc('claim_initiative_honor');
  if (error) throw error;
}

export interface EarnedHonor {
  id: string;
  /** DB `honor_type` slug (→ `honorMeta` for category/glyph/trigger). */
  slug: string;
  /** Snapshotted display name. */
  name: string;
  /** ISO date (`date_earned`). */
  date: string;
}

/** Every honor the athlete has earned, newest first — the Honors Hub read (same source Legacy already uses). */
export async function fetchHonors(): Promise<EarnedHonor[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('honor_instances')
    .select('id, honor_type, display_name, date_earned')
    .eq('athlete_id', user.id)
    .order('date_earned', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.honor_type as string,
    name: r.display_name as string,
    date: r.date_earned as string,
  }));
}
