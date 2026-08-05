import { supabase } from '@/lib/supabase';

/**
 * The Friend graph (migration 0073) — mutual, private, doubly-consented relationships (FR-001 / SOC-D5).
 *
 * WHAT IS DELIBERATELY MISSING, AND MUST STAY MISSING:
 *
 *   · No follow. Not unimplemented — barred by FR-D2 ("Why this is NOT a follower system"), FR-D3,
 *     `Social-System-Architecture` §143 and Product DNA §10. `Forge Public Profile.dc.html` draws a Follow
 *     button; it is not being built. A follower would receive nothing anyway, since posts carry
 *     Friends/Squad audiences and a public audience would mean public performance data — the actual
 *     prohibition. Communities is the creator/audience surface if one is ever wanted.
 *
 *   · No declined state. Declining deletes the row, so nothing here can answer "who rejected me". Same
 *     erasure as withdrawing from a challenge (CS-D3).
 *
 *   · No decline notification. Accepting notifies; declining is silent. "N declined your request" is a
 *     notification whose only content is a small rejection.
 *
 *   · No friend count as a metric, and no public or squad-visible friend list (FR-D3).
 *
 *   · No suggestions and no People-You-May-Know. `find_athletes` (0114) returns a LIST, which this file
 *     used to say SOC-D15 barred — see `Social-Architecture-Amendment-003-Athlete-Search.md`, which
 *     settles a disagreement between two locked documents in favour of `Identity-Amendment-001` §4.
 *     What SOC-D15 bars is unchanged and is everything the SYSTEM populates: Suggested Friends, PYMK,
 *     mutual-friend recommendations, ranking by engagement or popularity, and any result at all for a
 *     query the athlete did not type. A list you asked for is not a surface that populates itself.
 */

/** Where the viewer stands with an athlete. `outgoing` = I asked; `incoming` = they asked. */
export type FriendState = 'self' | 'friends' | 'outgoing' | 'incoming' | 'none';

const STATES: FriendState[] = ['self', 'friends', 'outgoing', 'incoming', 'none'];
const asState = (v: unknown): FriendState => (STATES.includes(v as FriendState) ? (v as FriendState) : 'none');

export interface AthleteSearchResult {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  athleteType: string | null;
  rankFamily: string | null;
  rankLevel: number | null;
  state: FriendState;
  /** Identity §4.3's tertiary line — one squad you're both in, or null. */
  sharedSquad?: string | null;
}

export interface FriendSummary {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  /** Accepted-at for a friend, requested-at for a pending one. */
  at: string | null;
}

export interface FriendLists {
  friends: FriendSummary[];
  incoming: FriendSummary[];
  outgoing: FriendSummary[];
}

const MISSING = 'Friends aren’t available yet — migration 0073 hasn’t been applied.';

function rethrow(error: unknown): never {
  if ((error as { code?: string })?.code === 'PGRST202') throw new Error(MISSING);
  throw error;
}

/**
 * Look up one athlete by their whole handle. Null when nobody has it.
 *
 * Exact match by design (SOC-D15): you must already know who you are looking for. Handles are `citext`,
 * so case doesn't matter, and a leading `@` is tolerated because people type it.
 */
export async function findAthleteByHandle(handle: string): Promise<AthleteSearchResult | null> {
  const clean = handle.trim().replace(/^@/, '');
  if (clean.length < 3) return null;

  const { data, error } = await supabase.rpc('find_athlete_by_handle', { p_handle: clean });
  if (error) rethrow(error);
  if (!data) return null;

  const d = data as Record<string, unknown>;
  return {
    id: String(d.id),
    name: String(d.name),
    handle: (d.handle as string) ?? null,
    avatarUrl: (d.avatar_url as string) ?? null,
    athleteType: (d.athlete_type as string) ?? null,
    rankFamily: (d.rank_family as string) ?? null,
    rankLevel: d.rank_level == null ? null : Number(d.rank_level),
    state: asState(d.state),
  };
}

/**
 * Search athletes by NAME or handle (migration 0114). A leading `@` forces handle-only mode, per
 * Identity §4.1 — the default queries both fields, which is what makes the experience feel name-based
 * rather than address-based.
 *
 * Returns `[]` under two characters without calling the server: Identity §4.4 shows nothing before a
 * query, and the empty string is the one input that would otherwise mean everybody.
 */
export async function findAthletes(query: string, limit = 20): Promise<AthleteSearchResult[]> {
  const clean = query.trim();
  if (clean.replace(/^@+/, '').length < 2) return [];

  const { data, error } = await supabase.rpc('find_athletes', { p_query: clean, p_limit: limit });
  if (error) {
    if ((error as { code?: string })?.code === 'PGRST202') {
      throw new Error('Athlete search isn’t available yet — migration 0114 hasn’t been applied.');
    }
    throw error;
  }

  return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: String(d.id),
    name: String(d.name),
    handle: (d.handle as string) ?? null,
    avatarUrl: (d.avatar_url as string) ?? null,
    athleteType: (d.athlete_type as string) ?? null,
    rankFamily: (d.rank_family as string) ?? null,
    rankLevel: d.rank_level == null ? null : Number(d.rank_level),
    state: asState(d.state),
    sharedSquad: (d.shared_squad as string) ?? null,
  }));
}

/**
 * Send a request. Returns the resulting state.
 *
 * Returns `friends` rather than `outgoing` when they had already asked you — requesting someone who has
 * requested you IS mutual consent, so it accepts instead of leaving two people each waiting on the other.
 */
export async function requestFriend(athleteId: string): Promise<FriendState> {
  const { data, error } = await supabase.rpc('request_friend', { p_athlete: athleteId });
  if (error) rethrow(error);
  return asState(data);
}

export async function acceptFriendRequest(athleteId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_friend_request', { p_athlete: athleteId });
  if (error) rethrow(error);
}

/**
 * Decline, withdraw, or unfriend — one call, because all three mean "this relationship no longer exists"
 * and none of them may leave a trace. Afterwards a decline is indistinguishable from never having asked.
 */
export async function removeFriendship(athleteId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_friendship', { p_athlete: athleteId });
  if (error) rethrow(error);
}

export async function fetchFriendState(athleteId: string): Promise<FriendState> {
  const { data, error } = await supabase.rpc('friendship_with', { p_athlete: athleteId });
  if (error) rethrow(error);
  return asState(data);
}

/** My friends and both pending directions. Private to me (FR-D3). */
export async function fetchFriendLists(): Promise<FriendLists> {
  const { data, error } = await supabase.rpc('friend_list');
  if (error) rethrow(error);

  const d = (data ?? {}) as Record<string, unknown>;
  const list = (key: string): FriendSummary[] =>
    ((d[key] ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      handle: (r.handle as string) ?? null,
      avatarUrl: (r.avatar_url as string) ?? null,
      at: (r.since as string) ?? (r.at as string) ?? null,
    }));

  return { friends: list('friends'), incoming: list('incoming'), outgoing: list('outgoing') };
}

/** The button an athlete's profile should show, given where you stand. */
export function friendAction(state: FriendState): { label: string; kind: 'add' | 'accept' | 'pending' | 'friends' | 'none' } {
  switch (state) {
    case 'none':
      return { label: 'Add Friend', kind: 'add' };
    case 'incoming':
      return { label: 'Accept Request', kind: 'accept' };
    case 'outgoing':
      return { label: 'Request Sent', kind: 'pending' };
    case 'friends':
      return { label: 'Friends', kind: 'friends' };
    default:
      return { label: '', kind: 'none' };
  }
}
