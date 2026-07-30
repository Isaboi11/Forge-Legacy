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
/**
 * Grant "Initiative" if it isn't already held. Returns TRUE only when this call actually created it.
 *
 * The RPC already returns the newly-granted honors (an empty array when it was a no-op, thanks to the
 * `honor_once` index); the client used to discard that, which is why an athlete who earned Initiative
 * long ago could still be shown its ceremony again. The caller needs to know "was this a first" to
 * decide whether to celebrate.
 */
export async function claimInitiativeHonor(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('claim_initiative_honor');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
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

// ── The catalog (migration 0077) ─────────────────────────────────────────────

export interface CatalogHonor {
  slug: string;
  name: string;
  category: string;
  metric: string;
  threshold: number;
  /** 'account' = once ever; 'chapter' = once per chapter. */
  scope: 'account' | 'chapter';
}

/**
 * Every honor that CAN be earned, whether or not this athlete has. Reference data, world-readable —
 * the catalog surfaces need to show a locked honor alongside an earned one, which is impossible from
 * `honor_instances` alone (it only ever holds what somebody already has).
 */
export async function fetchHonorCatalog(): Promise<CatalogHonor[]> {
  const { data, error } = await supabase
    .from('honor_catalog')
    .select('honor_type, display_name, category, metric, threshold, scope')
    .order('sort_order', { ascending: true });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST205') return []; // table not migrated yet
    throw error;
  }
  return (data ?? []).map((r) => ({
    slug: r.honor_type as string,
    name: r.display_name as string,
    category: r.category as string,
    metric: r.metric as string,
    threshold: Number(r.threshold),
    scope: (r.scope === 'chapter' ? 'chapter' : 'account') as 'account' | 'chapter',
  }));
}

/**
 * Award anything already earned but never granted.
 *
 * Honors are evaluated when a workout is saved, so every threshold added to the catalog after an athlete
 * passed it would otherwise sit unawarded until they happened to train again — they would have to earn
 * "100 Workouts Logged" by logging their 101st. This closes that gap on demand.
 *
 * Idempotent (grant-once is enforced by the unique indexes) and SILENT: it runs with `source = 'import'`,
 * so no timeline event is written. The moment those honors were earned has already passed, and stamping
 * them with today's date would be a small lie in a permanent record.
 *
 * Returns how many were newly granted, so a caller can decide whether it's worth mentioning.
 */
export async function claimEarnedHonors(): Promise<number> {
  const { data, error } = await supabase.rpc('claim_earned_honors');
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') return 0; // migration 0077 not applied
    throw error;
  }
  return Array.isArray(data) ? data.length : 0;
}
