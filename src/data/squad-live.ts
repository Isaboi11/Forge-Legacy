import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

/**
 * Squad Core data (Social · Part 1) — real `squads` + `squad_members` (migrations 0029/0030). Create is
 * the atomic `create_squad` RPC (squad + founder membership in one transaction). Owner-scoped RLS keeps
 * every read/write to squads you belong to / own. Identity = name · motto · goal · description · crest glyph
 * · optional photo (public `squad-photos` bucket, overrides the glyph). No check-ins / feed / invites yet.
 */

export type SquadPrivacy = 'private' | 'public';
export type SquadRole = 'owner' | 'member';
/** What a squad goal counts. Cumulative team metrics only (a group goal is a shared total). */
export type SquadGoalMetric = 'workout_count' | 'distance_total' | 'volume_total' | 'time_total' | 'pr_count';

/** Display unit per metric. Shared so Squad Detail and Squad Preview can never label the same goal differently. */
export const GOAL_UNITS: Record<SquadGoalMetric, string> = {
  workout_count: 'workouts',
  distance_total: 'mi',
  volume_total: 'lb',
  time_total: 'hrs',
  pr_count: 'PRs',
};

export interface SquadMemberAvatar {
  name: string;
  avatarUrl: string | null;
}

export interface SquadSummary {
  id: string;
  name: string;
  motto: string | null;
  description: string | null;
  crest: string;
  photoUrl: string | null;
  privacy: SquadPrivacy;
  role: SquadRole;
  memberCount: number;
  avatars: SquadMemberAvatar[]; // up to 4, owner first (real photos / initials)
  trainedToday: number; // members who logged a workout today (you, for now — real check-ins land later)
}

export interface SquadDetail {
  id: string;
  name: string;
  motto: string | null;
  goal: string | null; // the goal TITLE
  goalTarget: number | null; // e.g. 500 workouts / 200 miles
  goalStartedAt: string | null;
  goalMetricKind: SquadGoalMetric;
  goalMetricKey: string | null; // activity modality for distance_total
  goalProgress: number; // computed from the metric since goalStartedAt (your own for now)
  description: string | null;
  crest: string;
  photoUrl: string | null;
  privacy: SquadPrivacy;
  ownerId: string;
  isOwner: boolean;
  trainedToday: number; // members trained today (you, for now)
}

export interface SquadMemberView {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: SquadRole;
  isSelf: boolean;
  joinedAt: string | null;
}

interface SquadRow {
  id: string;
  name: string;
  motto: string | null;
  goal: string | null;
  goal_target: number | null;
  goal_started_at: string | null;
  goal_metric_kind: SquadGoalMetric | null;
  goal_metric_key: string | null;
  description: string | null;
  privacy: SquadPrivacy;
  crest: string;
  photo_url: string | null;
  owner_id: string;
  created_at: string;
}

const SQUAD_COLS = 'id, name, motto, goal, goal_target, goal_started_at, goal_metric_kind, goal_metric_key, description, privacy, crest, photo_url, owner_id, created_at';

/** The athlete's squads (newest first) with live member counts. */
export async function fetchMySquads(): Promise<SquadSummary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const uid = user.id;

  const { data, error } = await supabase.from('squad_members').select(`role, squads(${SQUAD_COLS})`).eq('user_id', uid);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as { role: SquadRole; squads: SquadRow | null }[]).filter((r) => r.squads != null);

  // Members (count + up to 4 real avatars, owner first) for my squads — RLS lets me read the roster of
  // squads I belong to; profiles expose name + avatar_url (public identity).
  const ids = rows.map((r) => r.squads!.id);
  const counts = new Map<string, number>();
  const avatarMap = new Map<string, { name: string; avatarUrl: string | null; owner: boolean }[]>();
  if (ids.length) {
    const { data: mem } = await supabase.from('squad_members').select('squad_id, role, profiles(name, avatar_url)').in('squad_id', ids);
    for (const m of (mem ?? []) as unknown as { squad_id: string; role: SquadRole; profiles: { name: string; avatar_url: string | null } | null }[]) {
      counts.set(m.squad_id, (counts.get(m.squad_id) ?? 0) + 1);
      const list = avatarMap.get(m.squad_id) ?? [];
      list.push({ name: m.profiles?.name ?? 'Athlete', avatarUrl: m.profiles?.avatar_url ?? null, owner: m.role === 'owner' });
      avatarMap.set(m.squad_id, list);
    }
  }

  // "Trained today" — members who checked in as 'trained' today, per squad (0048). Pre-0048 fallback: did I
  // train today (applied to every squad).
  const trainedMap = new Map<string, number>();
  let fellBack = false;
  if (ids.length) {
    const { data: ci, error: ciErr } = await supabase.from('squad_checkins').select('squad_id, user_id').in('squad_id', ids).gte('created_at', checkinCutoff());
    if (!ciErr) {
      const seen = new Map<string, Set<string>>();
      for (const c of (ci ?? []) as { squad_id: string; user_id: string }[]) {
        const set = seen.get(c.squad_id) ?? new Set<string>();
        set.add(c.user_id);
        seen.set(c.squad_id, set);
      }
      for (const [sid, set] of seen) trainedMap.set(sid, set.size);
    } else {
      fellBack = true;
    }
  }
  let iTrainedToday = false;
  if (fellBack && ids.length) {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const { count } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('athlete_id', uid).gte('saved_at', midnight.toISOString());
    iTrainedToday = (count ?? 0) > 0;
  }

  return rows
    .map((r) => {
      const s = r.squads!;
      return {
        id: s.id,
        name: s.name,
        motto: s.motto ?? null,
        description: s.description ?? null,
        crest: s.crest,
        photoUrl: s.photo_url ?? null,
        privacy: s.privacy,
        role: r.role,
        memberCount: counts.get(s.id) ?? 1,
        avatars: (avatarMap.get(s.id) ?? [])
          .sort((a, b) => (a.owner === b.owner ? 0 : a.owner ? -1 : 1))
          .slice(0, 4)
          .map(({ name, avatarUrl }) => ({ name, avatarUrl })),
        trainedToday: fellBack ? (iTrainedToday ? 1 : 0) : trainedMap.get(s.id) ?? 0,
        createdAt: s.created_at,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ createdAt: _c, ...s }) => s);
}

/** One squad's identity + roster (owner first, then you, then name). Null if it doesn't exist / isn't visible. */
export async function fetchSquad(id: string): Promise<{ squad: SquadDetail; members: SquadMemberView[] } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id ?? '';

  const { data: squad, error } = await supabase.from('squads').select(SQUAD_COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!squad) return null;
  const s = squad as SquadRow;

  const { data: mem, error: me } = await supabase.from('squad_members').select('user_id, role, joined_at, profiles(name, avatar_url)').eq('squad_id', id);
  if (me) throw me;
  const members = ((mem ?? []) as unknown as { user_id: string; role: SquadRole; joined_at: string | null; profiles: { name: string; avatar_url: string | null } | null }[])
    .map((m) => ({ id: m.user_id, name: m.profiles?.name ?? 'Athlete', avatarUrl: m.profiles?.avatar_url ?? null, role: m.role, isSelf: m.user_id === uid, joinedAt: m.joined_at }))
    .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.isSelf ? -1 : b.isSelf ? 1 : a.name.localeCompare(b.name)));

  // Goal progress = your own workouts logged since the goal was set (readable under own-row RLS). Extends to
  // an all-member aggregate via a security-definer RPC once invites/check-ins land.
  const goalMetricKind: SquadGoalMetric = s.goal_metric_kind ?? 'workout_count';
  let goalProgress = 0;
  if (s.goal_target != null && s.goal_started_at && uid) {
    // Sum across ALL members via the security-definer RPC (0048). Pre-0048 fallback: the caller's own total.
    const { data: mv, error: mvErr } = await supabase.rpc('squad_metric_total', { p_squad: id, p_kind: goalMetricKind, p_key: s.goal_metric_key ?? null, p_started_at: s.goal_started_at });
    if (!mvErr) {
      goalProgress = Number(mv ?? 0);
    } else {
      const { data: own } = await supabase.rpc('goal_metric_value', { p_metric_kind: goalMetricKind, p_metric_key: s.goal_metric_key ?? null, p_started_at: s.goal_started_at });
      goalProgress = Number(own ?? 0);
    }
  }

  // "Training today" for the hero — distinct members with a live check-in (<24h) (0049). Pre-0049 fallback: did I train today.
  let trainedToday = 0;
  {
    const { data: ci, error: ciErr } = await supabase.from('squad_checkins').select('user_id').eq('squad_id', id).gte('created_at', checkinCutoff());
    if (!ciErr) {
      trainedToday = new Set((ci ?? []).map((c: { user_id: string }) => c.user_id)).size;
    } else if (uid) {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const { count: wc } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('athlete_id', uid).gte('saved_at', midnight.toISOString());
      trainedToday = (wc ?? 0) > 0 ? 1 : 0;
    }
  }

  return {
    squad: {
      id: s.id,
      name: s.name,
      motto: s.motto ?? null,
      goal: s.goal ?? null,
      goalTarget: s.goal_target ?? null,
      goalStartedAt: s.goal_started_at ?? null,
      goalMetricKind,
      goalMetricKey: s.goal_metric_key ?? null,
      goalProgress,
      description: s.description ?? null,
      crest: s.crest,
      photoUrl: s.photo_url ?? null,
      privacy: s.privacy,
      ownerId: s.owner_id,
      isOwner: s.owner_id === uid,
      trainedToday,
    },
    members,
  };
}

export interface SquadInviteInfo {
  id: string;
  name: string;
  privacy: SquadPrivacy;
  crest: string;
  photoUrl: string | null;
  /** Null when 0040 hasn't run, OR when this squad's permission withholds it from you. */
  inviteCode: string | null;
  memberCount: number;
  isOwner: boolean;
  /** May you hand this code out? Owner always; members only if the owner opened it up (0056). */
  canInvite: boolean;
}

/**
 * The Squad Invite screen's own fetch — kept SEPARATE from `fetchSquad`/`fetchMySquads` so the `invite_code`
 * column (0040) never touches the shared `SQUAD_COLS`: until the migration is applied, only this screen
 * degrades, never the whole Squads tab.
 *
 * Served by `squad_invite_info()` (0056) rather than a table read, because the permission gate has to
 * hold server-side: `squads` RLS lets any member select the row, `invite_code` included, so a member who
 * isn't permitted to invite could otherwise read the code straight out of the table. Null `inviteCode`
 * means either 0040 hasn't run, or this squad withholds it from you. Null result = not visible at all.
 */
export async function fetchSquadInvite(id: string): Promise<SquadInviteInfo | null> {
  const { data, error } = await supabase.rpc('squad_invite_info', { p_squad: id });
  if (!error) {
    if (!data) return null;
    const r = data as {
      id: string; name: string; privacy: SquadPrivacy; crest: string; photo_url: string | null;
      member_count: number | null; is_owner: boolean; can_invite: boolean; invite_code: string | null;
    };
    return {
      id: r.id,
      name: r.name,
      privacy: r.privacy,
      crest: r.crest,
      photoUrl: r.photo_url ?? null,
      inviteCode: r.invite_code ?? null,
      memberCount: r.member_count ?? 1,
      isOwner: !!r.is_owner,
      canInvite: !!r.can_invite,
    };
  }
  if ((error as { code?: string }).code !== 'PGRST202') throw error;

  // Pre-0056: read the row directly. No permission column exists yet, so everyone can invite —
  // which is exactly how the app behaved before this migration.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id ?? '';
  const { data: row, error: rowError } = await supabase.from('squads').select('id, name, privacy, crest, photo_url, invite_code, owner_id').eq('id', id).maybeSingle();
  if (rowError) throw rowError;
  if (!row) return null;
  const sq = row as { id: string; name: string; privacy: SquadPrivacy; crest: string; photo_url: string | null; invite_code: string | null; owner_id: string };
  const { count } = await supabase.from('squad_members').select('*', { count: 'exact', head: true }).eq('squad_id', id);
  return {
    id: sq.id,
    name: sq.name,
    privacy: sq.privacy,
    crest: sq.crest,
    photoUrl: sq.photo_url ?? null,
    inviteCode: sq.invite_code ?? null,
    memberCount: count ?? 1,
    isOwner: sq.owner_id === uid,
    canInvite: true,
  };
}

/** Check-ins are ephemeral video "stories": only a member's LATEST shows, and only within 24h (0049). */
const CHECKIN_WINDOW_MS = 24 * 60 * 60 * 1000;
const checkinCutoff = (): string => new Date(Date.now() - CHECKIN_WINDOW_MS).toISOString();

export interface SquadCheckin {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  videoUrl: string;
  createdAt: string;
  watched: boolean; // I've seen it (my own always reads watched)
  isSelf: boolean;
}
export interface SquadCheckinsResult {
  members: SquadCheckin[]; // latest per member within 24h; self first, then unwatched, then watched
  iHaveActive: boolean; // do I have a live check-in in the window
}

/** The squad's active video check-ins (latest per member, <24h) + whether I've watched each (0049). */
export async function fetchSquadCheckins(squadId: string): Promise<SquadCheckinsResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id ?? '';

  const { data, error } = await supabase
    .from('squad_checkins')
    .select('id, user_id, video_url, created_at, profiles(name, avatar_url)')
    .eq('squad_id', squadId)
    .gte('created_at', checkinCutoff())
    .order('created_at', { ascending: false });
  if (error) return { members: [], iHaveActive: false };
  const rows = (data ?? []) as unknown as { id: string; user_id: string; video_url: string; created_at: string; profiles: { name: string; avatar_url: string | null } | null }[];

  // Latest per member (rows are newest-first, so the first seen per user is their live check-in).
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.user_id)) latest.set(r.user_id, r);
  const items = [...latest.values()];

  // Which have I watched?
  const ids = items.map((r) => r.id);
  const viewed = new Set<string>();
  if (ids.length && uid) {
    const { data: v } = await supabase.from('squad_checkin_views').select('checkin_id').eq('viewer_id', uid).in('checkin_id', ids);
    for (const row of (v ?? []) as { checkin_id: string }[]) viewed.add(row.checkin_id);
  }

  const members = items
    .map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.profiles?.name ?? 'Athlete',
      avatarUrl: r.profiles?.avatar_url ?? null,
      videoUrl: r.video_url,
      createdAt: r.created_at,
      watched: r.user_id === uid || viewed.has(r.id),
      isSelf: r.user_id === uid,
    }))
    .sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1; // your own first
      if (a.watched !== b.watched) return a.watched ? 1 : -1; // unwatched (new) before watched
      return b.createdAt.localeCompare(a.createdAt); // newest first within a group
    });

  return { members, iHaveActive: latest.has(uid) };
}

/** Upload a check-in clip to the public `squad-media` bucket, returning its URL. */
export async function uploadCheckinVideo(squadId: string, uri: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = blob.type.includes('quicktime') ? 'mov' : 'mp4';
  const path = `${squadId}/checkin-${user.id}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('squad-media').upload(path, blob, { contentType: blob.type || 'video/mp4', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('squad-media').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** Post a video check-in (supersedes your previous one once it's the latest). */
export async function postCheckin(squadId: string, videoUrl: string, note?: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('squad_checkins').insert({ squad_id: squadId, user_id: user.id, video_url: videoUrl, note: note?.trim() || null });
  if (error) throw error;
}

/** Mark a check-in watched by me (idempotent). */
export async function markCheckinViewed(checkinId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('squad_checkin_views').upsert({ checkin_id: checkinId, viewer_id: user.id }, { onConflict: 'checkin_id,viewer_id' });
}

/** Set / update the squad's measurable goal (owner). Resets the start clock so progress counts forward. */
export async function setSquadGoal(id: string, input: { title: string; target: number; metricKind: SquadGoalMetric; metricKey: string | null }): Promise<void> {
  const { error } = await supabase
    .from('squads')
    .update({
      goal: input.title.trim() || null,
      goal_target: input.target,
      goal_metric_kind: input.metricKind,
      goal_metric_key: input.metricKind === 'distance_total' ? input.metricKey : null,
      goal_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

/** Clear the squad's goal (owner). */
export async function clearSquadGoal(id: string): Promise<void> {
  const { error } = await supabase.from('squads').update({ goal: null, goal_target: null, goal_started_at: null, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

/** Create a squad (+ your owner membership) atomically. Returns the new squad id. The goal is set later
 *  from the squad page (measurable target), so it's not part of creation.
 *
 *  `category` is the discovery field (0050, narrowed by 0053). If those migrations haven't been applied
 *  the 7-arg RPC doesn't exist (PGRST202) — creation then falls back to the 6-arg 0030 signature so
 *  Create Squad keeps working, minus discoverability. */
export async function createSquad(input: {
  name: string;
  description: string;
  motto: string;
  privacy: SquadPrivacy;
  crest: string;
  category?: string | null;
}): Promise<string> {
  const base = {
    p_name: input.name.trim(),
    p_description: input.description.trim() || null,
    p_privacy: input.privacy,
    p_crest: input.crest,
    p_motto: input.motto.trim() || null,
    p_goal: null,
  };
  const { data, error } = await supabase.rpc('create_squad', { ...base, p_category: input.category ?? null });
  if (error) {
    if ((error as { code?: string }).code !== 'PGRST202') throw error;
    const { data: legacy, error: legacyError } = await supabase.rpc('create_squad', base);
    if (legacyError) throw legacyError;
    return (legacy as { squad_id: string }).squad_id;
  }
  return (data as { squad_id: string }).squad_id;
}

/** Owner edit — any subset of the identity fields. */
export async function updateSquad(
  id: string,
  patch: { name?: string; motto?: string | null; goal?: string | null; description?: string | null; privacy?: SquadPrivacy; crest?: string; photoUrl?: string | null },
): Promise<void> {
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) upd.name = patch.name.trim();
  if (patch.motto !== undefined) upd.motto = (patch.motto ?? '').trim() || null;
  if (patch.goal !== undefined) upd.goal = (patch.goal ?? '').trim() || null;
  if (patch.description !== undefined) upd.description = (patch.description ?? '').trim() || null;
  if (patch.privacy !== undefined) upd.privacy = patch.privacy;
  if (patch.crest !== undefined) upd.crest = patch.crest;
  if (patch.photoUrl !== undefined) upd.photo_url = patch.photoUrl;
  const { error } = await supabase.from('squads').update(upd).eq('id', id);
  if (error) throw error;
}

/** Owner delete — cascades memberships. */
export async function deleteSquad(id: string): Promise<void> {
  const { error } = await supabase.from('squads').delete().eq('id', id);
  if (error) throw error;
}

/** Leave a squad — deletes your own (non-owner) membership row (0046). The owner can't leave (transfer or delete). */
export async function leaveSquad(squadId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('squad_members').delete().eq('squad_id', squadId).eq('user_id', user.id);
  if (error) throw error;
}

/** Owner removes a member (0046 delete policy allows the owner to delete a non-owner row). */
export async function removeSquadMember(squadId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('squad_members').delete().eq('squad_id', squadId).eq('user_id', userId);
  if (error) throw error;
}

/** Owner hands the squad to another member — atomic role swap + `owner_id` move (0047 RPC). */
export async function transferSquadOwnership(squadId: string, newOwnerId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_squad_ownership', { p_squad: squadId, p_new_owner: newOwnerId });
  if (error) throw error;
}

// ── Per-squad notification prefs (device-local; push isn't wired yet, so these persist intent only) ──
export interface SquadNotifPrefs {
  muted: boolean;
  checkins: boolean;
  competition: boolean;
  milestones: boolean;
}
export const DEFAULT_SQUAD_NOTIF: SquadNotifPrefs = { muted: false, checkins: true, competition: true, milestones: true };

export async function getSquadNotifPrefs(squadId: string): Promise<SquadNotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(`forge.squad.notif.${squadId}`);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') return { ...DEFAULT_SQUAD_NOTIF, ...p };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_SQUAD_NOTIF };
}
export async function setSquadNotifPrefs(squadId: string, prefs: SquadNotifPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(`forge.squad.notif.${squadId}`, JSON.stringify(prefs));
  } catch {
    // best-effort device pref
  }
}

/**
 * Upload a squad photo to the public `squad-photos` bucket and return its public URL. The object lives under
 * `<squadId>/…` so the owner-scoped storage policy resolves; the squad must already exist (create → upload →
 * update). `uri` is a local file/blob/data URI (from expo-image-picker).
 */
export async function uploadSquadPhoto(squadId: string, uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${squadId}/photo.${ext}`;
  const { error } = await supabase.storage.from('squad-photos').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  // Cache-bust so a re-upload to the same path shows immediately.
  const { data } = supabase.storage.from('squad-photos').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export type JoinResult = { ok: true; squadId: string; already: boolean } | { ok: false; reason: 'invalid' | 'commitment_required' };

/**
 * Join a squad by its invite code (0040). Runs a SECURITY DEFINER RPC so a PRIVATE squad — hidden from
 * non-members by RLS — can still be joined by anyone holding its code. Idempotent: re-entering a code you're
 * already in resolves `already: true`. A bad/blank code resolves `{ ok: false }` (never throws for that).
 */
export async function joinSquadByCode(code: string, acceptCommitment = false): Promise<JoinResult> {
  let res = await supabase.rpc('join_squad_by_code', { p_code: code, p_accept: acceptCommitment });
  // Pre-0055 databases only have the 1-arg form; joining there simply has no commitment gate.
  if (res.error && (res.error as { code?: string }).code === 'PGRST202') {
    res = await supabase.rpc('join_squad_by_code', { p_code: code });
  }
  if (res.error) throw res.error;
  const r = (res.data ?? {}) as { ok?: boolean; squad_id?: string; already?: boolean; reason?: string };
  if (r.ok && r.squad_id) return { ok: true, squadId: r.squad_id, already: !!r.already };
  if (r.reason === 'commitment_required') return { ok: false, reason: 'commitment_required' };
  return { ok: false, reason: 'invalid' };
}

export interface SquadByCode {
  id: string;
  name: string;
  motto: string | null;
  crest: string;
  photoUrl: string | null;
  /** SQ-D14 values statement. Non-null means joining is gated on accepting it. */
  commitment: string | null;
  memberCount: number;
  already: boolean;
}

/**
 * Resolve an invite code to its squad WITHOUT joining (0055) — so the athlete can be shown the squad's
 * Commitment before they commit. 0040's join RPC resolved and joined in one step, which left nowhere to
 * put SQ-D14's acceptance gate. Null = the code doesn't match a squad. Resolves null (not an error) on
 * a pre-0055 database, so the caller falls through to the ungated join it already had.
 */
export async function fetchSquadByCode(code: string): Promise<SquadByCode | null> {
  const { data, error } = await supabase.rpc('squad_by_code', { p_code: code });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') return null;
    throw error;
  }
  if (!data) return null;
  const r = data as {
    id: string; name: string; motto: string | null; crest: string; photo_url: string | null;
    commitment: string | null; member_count: number | null; already: boolean;
  };
  return {
    id: r.id,
    name: r.name,
    motto: r.motto ?? null,
    crest: r.crest,
    photoUrl: r.photo_url ?? null,
    commitment: r.commitment?.trim() || null,
    memberCount: r.member_count ?? 1,
    already: !!r.already,
  };
}

/** Roll the squad's invite code to a fresh one (owner only), invalidating the old one. Returns the new code. */
export async function regenerateSquadCode(squadId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_squad_code', { p_squad: squadId });
  if (error) throw error;
  return String(data ?? '');
}
