import { supabase } from '@/lib/supabase';
import type { SquadGoalMetric } from '@/data/squad-live';

/**
 * Squad Discovery (Social · Part 1 · Discover) — the read + join paths behind `Discover Squads.dc.html`
 * (migration 0050).
 *
 * The list comes from the `discover_squads()` SECURITY DEFINER RPC rather than a table read: `squads`
 * RLS lets a non-member see a PUBLIC squad's row, but `squad_members` RLS does not, so member counts
 * and trained-today only resolve definer-side (0029 flagged this and deferred the fix to Discover).
 * The RPC returns the whole public set; the screen filters by category/query in memory, matching the
 * design's instant chip switching.
 *
 * Joining a public squad has ONE door: a row in the `squad_join_requests` queue, which the owner
 * approves (0053 retired instant "open" joining — the invite code already covered letting specific
 * people in without ceremony, and a stranger self-admitting contradicts SQ-D2's reason for lifting the
 * Performance Firewall inside a squad). `member_cap` (50) still bounds the squad; approval enforces it.
 */

export const SQUAD_CATEGORIES = ['Powerlifting', 'Running', 'Hybrid', 'Strongman', 'Olympic'] as const;
export type SquadCategory = (typeof SQUAD_CATEGORIES)[number];

/** Where the athlete stands with a squad they're browsing. `null` = no relationship. */
export type SquadMembership = 'joined' | 'requested' | null;

export interface DiscoverSquad {
  id: string;
  name: string;
  motto: string | null;
  description: string | null;
  crest: string;
  photoUrl: string | null;
  category: SquadCategory | null;
  memberCap: number;
  memberCount: number;
  trainedToday: number;
  membership: SquadMembership;
}

interface DiscoverRow {
  id: string;
  name: string;
  motto: string | null;
  description: string | null;
  crest: string;
  photo_url: string | null;
  category: string | null;
  member_cap: number | null;
  member_count: number | null;
  trained_today: number | null;
  my_state: string | null;
}

/** PostgREST's "no such function/column" codes — the shape an unapplied migration takes at the client. */
const MISSING_FN = 'PGRST202';
const MISSING_COL = new Set(['PGRST204', '42703', '42P01']);
const isMissing = (e: unknown, codes: Set<string> | string): boolean => {
  const code = (e as { code?: string } | null)?.code;
  if (!code) return false;
  return typeof codes === 'string' ? code === codes : codes.has(code);
};

const asCategory = (v: string | null): SquadCategory | null =>
  v && (SQUAD_CATEGORIES as readonly string[]).includes(v) ? (v as SquadCategory) : null;

/** Every public squad, with counts a non-member can't read directly (newest-active first). */
export async function fetchDiscoverSquads(): Promise<DiscoverSquad[]> {
  const { data, error } = await supabase.rpc('discover_squads');
  if (error) {
    if (isMissing(error, MISSING_FN)) throw new Error('Discover isn’t available yet — migration 0050 hasn’t been applied.');
    throw error;
  }
  return ((data ?? []) as DiscoverRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    motto: r.motto ?? null,
    description: r.description ?? null,
    crest: r.crest,
    photoUrl: r.photo_url ?? null,
    category: asCategory(r.category),
    memberCap: r.member_cap ?? 50,
    memberCount: r.member_count ?? 0,
    trainedToday: r.trained_today ?? 0,
    membership: r.my_state === 'joined' ? 'joined' : r.my_state === 'requested' ? 'requested' : null,
  }));
}

/**
 * Queue a request to join, with an optional note to the owner (idempotent — re-requesting after a
 * decline resets it to pending). Falls back to 0050's note-less signature if 0052 isn't applied.
 */
export async function requestSquadJoin(squadId: string, note?: string, acceptCommitment = false): Promise<void> {
  const trimmed = note?.trim() || null;
  let res = await supabase.rpc('request_squad_join', { p_squad: squadId, p_note: trimmed, p_accept: acceptCommitment });
  if (res.error && (res.error as { code?: string }).code === MISSING_FN) {
    res = await supabase.rpc('request_squad_join', { p_squad: squadId, p_note: trimmed });
  }
  if (res.error && (res.error as { code?: string }).code === MISSING_FN) {
    res = await supabase.rpc('request_squad_join', { p_squad: squadId });
  }
  if (res.error) throw res.error;
  const r = (res.data ?? {}) as { ok?: boolean; reason?: string };
  if (r.ok) return;
  // SQ-D14 — the server refuses until the squad's stated values have been accepted.
  if (r.reason === 'commitment_required') throw new Error('Accept the squad’s commitment before requesting to join.');
  throw new Error(r.reason === 'already_member' ? 'You’re already in that squad.' : 'That squad isn’t accepting requests.');
}

/** Withdraw your own pending request (own-row delete under RLS). */
export async function withdrawSquadJoinRequest(squadId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('squad_join_requests').delete().eq('squad_id', squadId).eq('user_id', user.id);
  if (error) throw error;
}

// ── Squad Preview — a non-member's read-only view of a public squad (0051) ──

/** One roster-peek member. Raw signals; the screen turns them into its activity line. */
export interface SquadPreviewMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  isOwner: boolean;
  rankFamily: string | null;
  athleteType: string | null;
  checkedIn: boolean; // has a live check-in (<24h)
  lastWorkoutAt: string | null;
}

export interface SquadPreview {
  id: string;
  name: string;
  motto: string | null;
  description: string | null;
  /** SQ-D14 values statement. Null = the squad hasn't written one, and joining has no gate. */
  commitment: string | null;
  crest: string;
  photoUrl: string | null;
  category: SquadCategory | null;
  memberCap: number;
  createdAt: string;
  memberCount: number;
  trainedToday: number;
  goal: string | null;
  goalTarget: number | null;
  goalMetricKind: SquadGoalMetric;
  goalProgress: number;
  membership: SquadMembership;
  roster: SquadPreviewMember[]; // owner first, then most recently active, up to 3
}

interface PreviewRow {
  id: string;
  name: string;
  motto: string | null;
  description: string | null;
  commitment: string | null;
  crest: string;
  photo_url: string | null;
  category: string | null;
  member_cap: number | null;
  created_at: string;
  member_count: number | null;
  trained_today: number | null;
  goal: string | null;
  goal_target: number | null;
  goal_metric_kind: SquadGoalMetric | null;
  goal_progress: number | string | null;
  my_state: string | null;
  roster: {
    id: string;
    name: string;
    avatar_url: string | null;
    is_owner: boolean;
    rank_family: string | null;
    athlete_type: string | null;
    checked_in: boolean;
    last_workout_at: string | null;
  }[];
}

/**
 * One public squad, as a non-member sees it. Null means it isn't visible to you (it doesn't exist, or
 * it's private and you're not in it) — the screen renders its missing state rather than an error.
 */
export async function fetchSquadPreview(squadId: string): Promise<SquadPreview | null> {
  const { data, error } = await supabase.rpc('squad_preview', { p_squad: squadId });
  if (error) {
    if (isMissing(error, MISSING_FN)) throw new Error('Squad Preview isn’t available yet — migration 0051 hasn’t been applied.');
    throw error;
  }
  if (!data) return null;
  const r = data as PreviewRow;
  return {
    id: r.id,
    name: r.name,
    motto: r.motto ?? null,
    description: r.description ?? null,
    commitment: r.commitment ?? null,
    crest: r.crest,
    photoUrl: r.photo_url ?? null,
    category: asCategory(r.category),
    memberCap: r.member_cap ?? 50,
    createdAt: r.created_at,
    memberCount: r.member_count ?? 0,
    trainedToday: r.trained_today ?? 0,
    goal: r.goal ?? null,
    goalTarget: r.goal_target ?? null,
    goalMetricKind: r.goal_metric_kind ?? 'workout_count',
    goalProgress: Number(r.goal_progress ?? 0),
    membership: r.my_state === 'joined' ? 'joined' : r.my_state === 'requested' ? 'requested' : null,
    roster: (r.roster ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      avatarUrl: m.avatar_url ?? null,
      isOwner: !!m.is_owner,
      rankFamily: m.rank_family ?? null,
      athleteType: m.athlete_type ?? null,
      checkedIn: !!m.checked_in,
      lastWorkoutAt: m.last_workout_at ?? null,
    })),
  };
}

/**
 * "Architect · Hybrid" — an athlete's rank family and type, the identity line Squad Preview and the
 * join-request queue both show. One implementation so the same athlete never reads two ways.
 */
export function athleteRoleLine(a: { rankFamily: string | null; athleteType: string | null }): string {
  const family = a.rankFamily ? a.rankFamily.charAt(0).toUpperCase() + a.rankFamily.slice(1) : null;
  return [family, a.athleteType].filter(Boolean).join(' · ') || 'Athlete';
}

// ── The owner's join-request queue (0052) ──

export interface SquadJoinRequest {
  userId: string;
  name: string;
  avatarUrl: string | null;
  rankFamily: string | null;
  athleteType: string | null;
  note: string | null;
  createdAt: string;
  mutualSquads: number; // squads you and this athlete are both already in
}

/** Pending requests for a squad you own, newest first. Empty for anyone else — the RPC gates on owner. */
export async function fetchSquadJoinRequests(squadId: string): Promise<SquadJoinRequest[]> {
  const { data, error } = await supabase.rpc('squad_pending_requests', { p_squad: squadId });
  if (error) {
    if (isMissing(error, MISSING_FN)) throw new Error('Join requests aren’t available yet — migration 0052 hasn’t been applied.');
    throw error;
  }
  type Row = {
    user_id: string;
    name: string;
    avatar_url: string | null;
    rank_family: string | null;
    athlete_type: string | null;
    note: string | null;
    created_at: string;
    mutual_squads: number | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    userId: r.user_id,
    name: r.name,
    avatarUrl: r.avatar_url ?? null,
    rankFamily: r.rank_family ?? null,
    athleteType: r.athlete_type ?? null,
    note: r.note ?? null,
    createdAt: r.created_at,
    mutualSquads: r.mutual_squads ?? 0,
  }));
}

/**
 * How many requests are waiting — for the Settings row's badge. Reads the table directly (0050's SELECT
 * policy already scopes it to the owner), so a squad you don't own simply counts zero. Resolves 0 rather
 * than throwing when 0050 hasn't been applied: a badge is never worth breaking a screen over.
 */
export async function fetchPendingRequestCount(squadId: string): Promise<number> {
  const { count, error } = await supabase
    .from('squad_join_requests')
    .select('*', { count: 'exact', head: true })
    .eq('squad_id', squadId)
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

/**
 * Pending request counts across every squad you own, keyed by squad id — what the Squads tab badge and
 * the Hub cards read. One trip: 0050's SELECT policy already scopes the table to your own requests plus
 * the squads you own, so the only thing to filter out is your OWN outgoing requests (you're not waiting
 * on yourself). Resolves `{}` on any failure — a badge is never worth breaking a screen over.
 */
export async function fetchOwnedPendingCounts(): Promise<Record<string, number>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const { data, error } = await supabase.from('squad_join_requests').select('squad_id').eq('status', 'pending').neq('user_id', user.id);
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { squad_id: string }[]) counts[r.squad_id] = (counts[r.squad_id] ?? 0) + 1;
  return counts;
}

/** Owner approves — creates the membership. Resolves `'full'` when the squad hit its cap first. */
export async function approveSquadJoinRequest(squadId: string, userId: string): Promise<'approved' | 'full'> {
  const { data, error } = await supabase.rpc('approve_squad_join_request', { p_squad: squadId, p_user: userId });
  if (error) throw error;
  const r = (data ?? {}) as { ok?: boolean; reason?: string };
  if (r.ok) return 'approved';
  if (r.reason === 'full') return 'full';
  throw new Error('Couldn’t approve that request.');
}

/** Owner declines. The row is kept as `declined` so a re-request updates it rather than duplicating. */
export async function declineSquadJoinRequest(squadId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('decline_squad_join_request', { p_squad: squadId, p_user: userId });
  if (error) throw error;
}

export interface SquadDiscoverySettings {
  category: SquadCategory | null;
  memberCap: number;
  /** SQ-D14 values statement (0055). Null = not written, or the migration isn't applied. */
  commitment: string | null;
  /** Who may hand out the invite code (0056). Design default is owner-only. */
  invitePermission: 'owner' | 'members';
}

/**
 * One squad's discovery settings, read SEPARATELY from `fetchSquad` so the 0050 columns never enter the
 * shared `SQUAD_COLS` — until the migration is applied only the Discovery controls degrade, never the
 * whole Squads tab (the same containment `fetchSquadInvite` uses for 0040's `invite_code`). `null` means
 * 0050 hasn't been run.
 */
export async function fetchSquadDiscovery(squadId: string): Promise<SquadDiscoverySettings | null> {
  const { data, error } = await supabase.from('squads').select('category, member_cap, commitment, invite_permission').eq('id', squadId).maybeSingle();
  if (error) {
    if (isMissing(error, MISSING_COL)) return null;
    throw error;
  }
  if (!data) return null;
  const s = data as { category: string | null; member_cap: number | null; commitment: string | null; invite_permission: string | null };
  return {
    category: asCategory(s.category),
    memberCap: s.member_cap ?? 50,
    commitment: s.commitment?.trim() || null,
    invitePermission: s.invite_permission === 'members' ? 'members' : 'owner',
  };
}

/** Owner edit of the discovery settings (category / join mode). */
export async function updateSquadDiscovery(squadId: string, patch: { category?: SquadCategory | null; commitment?: string | null; invitePermission?: 'owner' | 'members' }): Promise<void> {
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.category !== undefined) upd.category = patch.category;
  if (patch.commitment !== undefined) upd.commitment = patch.commitment?.trim() || null;
  if (patch.invitePermission !== undefined) upd.invite_permission = patch.invitePermission;
  const { error } = await supabase.from('squads').update(upd).eq('id', squadId);
  if (error) throw error;
}
