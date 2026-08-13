import { supabase } from '@/lib/supabase';

/**
 * The notification feed (migration 0054).
 *
 * Derived, not stored. Every item is read at query time from rows that already exist and are already
 * true — the join-request queue and squad membership — so there's no fanout table to keep in sync and
 * an event can't outlive the fact behind it. Read state is a single timestamp on the profile:
 * everything newer than `notifications_seen_at` is unread.
 *
 * Squad membership and friendships. There is deliberately no declined-friend-request kind: accepting
 * notifies, declining is silent, because a notification whose only content is a small rejection is
 * worse than none (0073). The union in `notification_events()` is where the feed
 * grows as other pillars gain real rows to report.
 */

export type NotificationKind =
  | 'join_request'
  | 'member_joined'
  | 'request_approved'
  | 'request_declined'
  | 'friend_request'
  | 'friend_accepted'
  | 'challenge_invite'
  | 'workout_invite'
  /** Someone asking to join a session already under way (0121) — `workout_invite` with the arrow reversed. */
  | 'workout_join_request'
  | 'program_shared'
  /** The first FAN-OUT kinds (0122): one squad row becomes one event per member, windowed at 14 days. */
  | 'squad_post'
  | 'squad_checkin'
  /**
   * The weekly review (0126) — fan-out like the two above, and the one kind with NO actor.
   *
   * The squad wrote it, not a member: `ensure_weekly_recap` inserts an authorless `squad_posts` row, and
   * for four migrations that null author was silently swallowed by `author_id <> p_user` in the union
   * and `user_id <> author_id` in the push trigger. Both comparisons are null-safe now, and this kind
   * exists so the sentence can name the squad instead of inventing a person who posted it.
   */
  | 'squad_recap'
  /**
   * Somebody answered your post (0135) — the half of a conversation that was missing.
   *
   * NOT fan-out, unlike the three above: SOC-D11 locks these to the post AUTHOR alone. A comment on a
   * thread you also commented on notifies nobody, deliberately — thread participation is its own
   * feature with its own volume problem.
   */
  | 'post_comment'
  | 'post_reaction'
  /**
   * A squad-mate started, or finished, a session (0153) — fan-out, and the first kinds in this union
   * whose subject is a fact about somebody's body rather than a row they wrote.
   *
   * Three switches stand between the fact and this event: the squad leader's `squads.training_alerts`,
   * the recipient's own per-squad `notify_start` / `notify_finish`, and the ACTOR's `visibility.training`
   * audience — the same gate that decides whether they appear on Live Now. All three default to
   * producing nothing, so an existing squad is silent until somebody deliberately turns this on.
   *
   * Windowed tighter than everything above: 4 hours for a start (the presence ceiling — the ask expires
   * with the session it is about) and 24 hours for a finish. A fortnight of every squad-mate's sessions
   * would be the whole inbox.
   */
  | 'squad_training_started'
  | 'squad_training_finished';

export interface ForgeNotification {
  kind: NotificationKind;
  at: string;
  unread: boolean;
  /** Empty for an event that isn't about a squad — a challenge invite has no squad (0088). */
  squadId: string;
  squadName: string;
  squadCrest: string;
  squadPhotoUrl: string | null;
  /** Set only on `challenge_invite`. */
  challengeId: string | null;
  challengeName: string | null;
  /** Set on `workout_invite` and `workout_join_request` — the same table, the arrow reversed (0121). */
  inviteId: string | null;
  inviteName: string | null;
  /** Set only on `program_shared` (0110). */
  shareId: string | null;
  shareName: string | null;
  /** Set on `post_comment` and `post_reaction` (0135) — the post that was answered. */
  postId: string | null;
  /** `'SQUAD' | 'FRIENDS' | 'BOTH'`. Decides which feed holds the post, so it decides where the row goes. */
  postAudience: string | null;
  /** The athlete the event is about — null for the kinds whose subject is the squad itself. */
  actorId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
}

const MISSING_FN = 'PGRST202';
const isMissingFn = (e: unknown): boolean => (e as { code?: string } | null)?.code === MISSING_FN;

const KINDS: NotificationKind[] = [
  'join_request',
  'member_joined',
  'request_approved',
  'request_declined',
  'friend_request',
  'friend_accepted',
  'challenge_invite',
  'workout_invite',
  'workout_join_request',
  'program_shared',
  'squad_post',
  'squad_checkin',
  'squad_recap',
  'post_comment',
  'post_reaction',
];
const asKind = (v: string): NotificationKind | null => (KINDS as string[]).includes(v) ? (v as NotificationKind) : null;

interface FeedRow {
  kind: string;
  at: string;
  unread: boolean;
  // Nullable since 0088: an event that isn't about a squad has no squad.
  squad_id: string | null;
  squad_name: string | null;
  squad_crest: string | null;
  squad_photo_url: string | null;
  challenge_id: string | null;
  challenge_name: string | null;
  invite_id: string | null;
  invite_name: string | null;
  share_id: string | null;
  share_name: string | null;
  post_id: string | null;
  post_audience: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar_url: string | null;
}

/** Everything that has happened to you, newest first. Unknown kinds are dropped, never rendered raw. */
export async function fetchNotifications(limit = 50): Promise<ForgeNotification[]> {
  const { data, error } = await supabase.rpc('notification_feed', { p_limit: limit });
  if (error) {
    if (isMissingFn(error)) throw new Error('Notifications aren’t available yet — migration 0054 hasn’t been applied.');
    throw error;
  }
  const out: ForgeNotification[] = [];
  for (const r of (data ?? []) as FeedRow[]) {
    const kind = asKind(r.kind);
    if (!kind) continue; // a kind this build doesn't know how to word is worse than silence
    out.push({
      kind,
      at: r.at,
      unread: !!r.unread,
      squadId: r.squad_id ?? '',
      squadName: r.squad_name ?? '',
      squadCrest: r.squad_crest ?? '',
      squadPhotoUrl: r.squad_photo_url ?? null,
      actorId: r.actor_id ?? null,
      actorName: r.actor_name ?? null,
      actorAvatarUrl: r.actor_avatar_url ?? null,
      challengeId: r.challenge_id ?? null,
      challengeName: r.challenge_name ?? null,
      inviteId: r.invite_id ?? null,
      inviteName: r.invite_name ?? null,
      shareId: r.share_id ?? null,
      shareName: r.share_name ?? null,
      postId: r.post_id ?? null,
      postAudience: r.post_audience ?? null,
    });
  }
  return out;
}

/**
 * How many are new — what the bell reads. Resolves 0 rather than throwing: an indicator is never worth
 * breaking the screen that hosts it, and a missing migration should read as "nothing new", not an error.
 */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc('notification_unread_count');
  if (error) return 0;
  return Number(data ?? 0);
}

/** Move the read line to now. Called when the feed is opened, after its items have already resolved. */
export async function markNotificationsSeen(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ notifications_seen_at: new Date().toISOString() }).eq('id', user.id);
}
