import { supabase } from '@/lib/supabase';
import type { ReportReason, ReportTargetKind } from '@/domain/moderation/moderation-core';

/**
 * BLOCKING AND REPORTING — the client's whole share of migration `0171`.
 *
 * ══ ⚠ THE BLOCK IS NOT ENFORCED HERE, AND MUST NEVER BE ══
 *
 * Nothing in this file filters anything. `block_athlete()` writes one row; every hiding decision is made in
 * the database — four `AS RESTRICTIVE` policies (§2) covering `squad_feed` and every direct read, and four
 * explicit predicates inside `friends_feed` (§2b), which is SECURITY DEFINER and therefore out of RLS's
 * reach.
 *
 * That split is deliberate and is the difference between a block and a mute. **Client-side filtering only
 * hides content from the person doing the filtering**; the blocked athlete's own app would carry on
 * fetching and rendering everything. Guideline 1.2 asks for the ability to block an abusive user, and a
 * filter that leaves the abusive user able to read you is not that.
 *
 * ⛔ If a future pass adds a `.filter()` over a feed here to "make blocking feel faster", the symmetry is
 *    gone and nothing will fail — the screen will look right to the person who blocked, which is exactly
 *    the half of the pair that cannot detect the problem.
 */

/** Block. Idempotent; also severs the friendship, server-side, in the same transaction. */
export async function blockAthlete(athleteId: string): Promise<void> {
  const { error } = await supabase.rpc('block_athlete', { p_athlete: athleteId });
  if (error) throw new Error(error.message);
}

/** Unblock. Deliberately does NOT restore the friendship — see `UNBLOCK_CONFIRM_BODY`. */
export async function unblockAthlete(athleteId: string): Promise<void> {
  const { error } = await supabase.rpc('unblock_athlete', { p_athlete: athleteId });
  if (error) throw new Error(error.message);
}

export interface BlockedAthlete {
  athleteId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export async function fetchBlockedAthletes(): Promise<BlockedAthlete[]> {
  const { data, error } = await supabase.rpc('my_blocked_athletes');
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      athleteId: String(row.athlete_id ?? ''),
      name: typeof row.name === 'string' && row.name ? row.name : 'Athlete',
      handle: typeof row.handle === 'string' ? row.handle : '',
      avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
      blockedAt: typeof row.created_at === 'string' ? row.created_at : '',
    };
  });
}

/**
 * Whether the caller and this athlete are blocked in either direction.
 *
 * Used to decide which control the profile shows — Block or Unblock — never to decide what to render.
 * Rendering is the database's answer.
 */
export async function isBlockedWith(athleteId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_blocked', {
    p_a: (await supabase.auth.getUser()).data.user?.id ?? null,
    p_b: athleteId,
  });
  if (error) return false;
  return data === true;
}

export interface ReportInput {
  targetKind: ReportTargetKind;
  /** The row's id. `text` server-side, because an `athlete` target has a uuid and a `squad` target has one too, but a future kind may not. */
  targetId: string;
  reason: ReportReason;
  note?: string;
  /** Who authored the reported thing, resolved at report time so the report still names a person after the content is deleted. */
  targetAthleteId?: string | null;
}

/**
 * File a report.
 *
 * ⚠ THROWS RATHER THAN RETURNING FALSE. Every other read in this file degrades quietly, because a failed
 * read costs a screen some content. A report that silently fails costs someone the belief that they
 * reported it — they will not try again, and nothing will ever reach the queue. The caller must show the
 * failure.
 */
export async function reportContent(input: ReportInput): Promise<string> {
  const { data, error } = await supabase.rpc('report_content', {
    p_target_kind: input.targetKind,
    p_target_id: input.targetId,
    p_reason: input.reason,
    p_note: input.note?.trim() || null,
    p_target_athlete: input.targetAthleteId ?? null,
  });
  if (error) throw new Error(error.message);
  return typeof data === 'string' ? data : '';
}

/*
 * ⚠ NO `removeSquadMember` HERE — IT ALREADY EXISTS, in `data/squad-live.ts:626`.
 *
 * The Guideline 1.2 audit found no report control and no block, and assumed the owner-side control was
 * missing too. It was not: `0046` shipped an RLS DELETE policy letting an owner delete a non-owner
 * `squad_members` row, and `squad/[id].tsx:275` has been calling it from an owner action sheet the whole
 * time. Adding a second function of the same name in a second module would have been two answers to one
 * question — and the new one would have been the copy nothing called.
 */

// ── OPERATOR ────────────────────────────────────────────────────────────────────────────────────────

export interface AdminReport {
  id: string;
  targetKind: string;
  targetId: string;
  reason: string;
  note: string | null;
  status: 'open' | 'actioned' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  reporterHandle: string | null;
  targetHandle: string | null;
}

export interface AdminReportsBundle {
  rows: AdminReport[];
  counts: {
    open: number;
    actioned: number;
    dismissed: number;
    /**
     * ⚠ NULL IS NOT ZERO. Null means nothing has ever been filed; a date means the oldest thing still
     * waiting. The pair is the only way `/admin` can show whether "timely response" is actually being met —
     * a queue of 0 open and a queue whose oldest open item is three weeks old are the same `open` count
     * away from each other only by luck.
     */
    oldestOpenAt: string | null;
  };
}

export async function fetchAdminReports(
  limit = 50,
  status: 'open' | 'actioned' | 'dismissed' | null = null,
): Promise<AdminReportsBundle | null> {
  const { data, error } = await supabase.rpc('admin_reports', { p_limit: limit, p_status: status });
  if (error || !data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const rawRows = Array.isArray(d.rows) ? d.rows : [];
  const counts = (d.counts ?? {}) as Record<string, unknown>;
  return {
    rows: rawRows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id ?? ''),
        targetKind: String(row.target_kind ?? ''),
        targetId: String(row.target_id ?? ''),
        reason: String(row.reason ?? ''),
        note: typeof row.note === 'string' ? row.note : null,
        status: (row.status === 'actioned' || row.status === 'dismissed' ? row.status : 'open') as AdminReport['status'],
        createdAt: typeof row.created_at === 'string' ? row.created_at : '',
        resolvedAt: typeof row.resolved_at === 'string' ? row.resolved_at : null,
        resolution: typeof row.resolution === 'string' ? row.resolution : null,
        reporterHandle: typeof row.reporter_handle === 'string' ? row.reporter_handle : null,
        targetHandle: typeof row.target_handle === 'string' ? row.target_handle : null,
      };
    }),
    counts: {
      open: Number(counts.open ?? 0),
      actioned: Number(counts.actioned ?? 0),
      dismissed: Number(counts.dismissed ?? 0),
      oldestOpenAt: typeof counts.oldest_open_at === 'string' ? counts.oldest_open_at : null,
    },
  };
}

export async function resolveReport(
  reportId: string,
  status: 'actioned' | 'dismissed',
  resolution?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_resolve_report', {
    p_report: reportId,
    p_status: status,
    p_resolution: resolution?.trim() || null,
  });
  if (error) throw new Error(error.message);
}
