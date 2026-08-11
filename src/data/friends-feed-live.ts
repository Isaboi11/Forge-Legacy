import { supabase } from '@/lib/supabase';
import type { WorkoutSummary } from './squad-feed-live';

/**
 * The Friends Feed (migration 0074) — SOC-D9's intentional-sharing feed.
 *
 * ONE POST TABLE, TWO AUDIENCES. `squad_posts` gained an `audience` column rather than a parallel
 * `friend_posts` table being created beside it. SOC-D8 makes the audience Friends · Squad · Both, and with
 * two tables "Both" would be two rows that drift, with media, reactions, comments and deletion built twice.
 * `audience` defaults to 'SQUAD', so every existing squad post already meant what the default says and
 * nothing was migrated.
 *
 * NOTHING IS PUBLIC. The audience check constraint admits exactly three values, so there is no public
 * option to add by accident — public performance data is barred (DNA §10 / CC-D2).
 *
 * FOUR ACKNOWLEDGEMENTS, NOT A LIKE. Respect · Honor · Support · Strength (SOC-D11: "lightweight
 * acknowledgements", never a popularity count). Nothing in this file exposes a reaction total as a score,
 * ranks posts by engagement, or orders the feed by anything but time — SOC-D10 permits reverse-chronological
 * with temporary milestone surfacing and nothing else.
 */

export type PostAudience = 'SQUAD' | 'FRIENDS' | 'BOTH';
export type PostType = 'discussion' | 'progress' | 'milestone' | 'pr' | 'checkin' | 'recap' | 'weekly' | 'announcement';
export type Reaction = 'respect' | 'honor' | 'support' | 'strength';

export const REACTIONS: { key: Reaction; label: string }[] = [
  { key: 'respect', label: 'Respect' },
  { key: 'honor', label: 'Honor' },
  { key: 'support', label: 'Support' },
  { key: 'strength', label: 'Strength' },
];

const REACTION_KEYS = REACTIONS.map((r) => r.key);
const asReaction = (v: unknown): Reaction | null => (REACTION_KEYS.includes(v as Reaction) ? (v as Reaction) : null);

export interface PostMedia {
  url: string;
  kind: 'image' | 'video';
  /** Progress posts carry two images; `slot` says which side of the divider each belongs on. */
  slot?: 'before' | 'after';
}

export interface Reactor {
  id: string;
  name: string;
  avatarUrl: string | null;
  isSelf: boolean;
}

export interface FeedPost {
  id: string;
  type: PostType;
  audience: PostAudience;
  body: string | null;
  media: PostMedia[];
  createdAt: string;
  authorId: string;
  authorName: string;
  authorHandle: string | null;
  authorAvatarUrl: string | null;
  isMine: boolean;
  prValue: string | null;
  prExercise: string | null;
  prLabel: string | null;
  /** The workout a `recap` post was shared from — a tap target onto Activity Detail. */
  workoutId: string | null;
  /** Stats snapshotted at share time. Null on every post that isn't a recap (and on every recap
   *  written before 0113 taught `friends_feed` to return the column it was already storing). */
  workoutSummary: WorkoutSummary | null;
  commentCount: number;
  reactionCount: number;
  myReaction: Reaction | null;
  reactors: Reactor[];
}

/** What the card renders, derived from the media rather than stored as a type — see 0074. */
export type PostShape = 'note' | 'photo' | 'gallery' | 'video' | 'progress' | 'milestone' | 'recap';

export function shapeOf(p: FeedPost): PostShape {
  /*
   * ⚠ `progress` MEANS TWO THINGS IN ONE TABLE, and only the audience keeps them apart. Here it is a
   * before/after pair whose media carry `slot`, rendered with a draggable divider. On the SQUAD side it
   * is a Progress Photo Post card, described by a `kind: 'progress-card'` payload in `layout`. A squad
   * post has audience 'SQUAD' and never reaches `friends_feed`, so the two cannot meet today — but
   * anything that later posts a card with audience 'FRIENDS' or 'BOTH' must teach this function to look
   * at `layout` first, or a laid-out card will render as a comparison with no "before".
   */
  if (p.type === 'progress') return 'progress';
  /* A recap with its stats renders the Vol/Time/Lifts/PRs strip the Squad feed has always shown.
     A recap WITHOUT them still falls through to the bronze milestone card below — which is every
     recap written before 0113, and every row read from a database that hasn't applied it yet. No
     backfill, no regression, no version check. */
  if (p.type === 'recap' && p.workoutSummary) return 'recap';
  if (p.type === 'milestone' || p.type === 'pr' || p.type === 'weekly' || p.type === 'recap') return 'milestone';
  if (p.media.some((m) => m.kind === 'video')) return 'video';
  /* Several photos are a SET, not a lead photo with spares. A transformation capture shared from the
     archive arrives as every pose the athlete chose; showing the first and dropping the rest would post
     something other than what they composed. `progress` is already gone by here, so slotted before/after
     pairs never reach this. */
  if (p.media.length > 1) return 'gallery';
  if (p.media.length > 0) return 'photo';
  return 'note';
}

const MISSING = 'The friends feed isn’t available yet — migration 0074 hasn’t been applied.';

function rethrow(error: unknown): never {
  if ((error as { code?: string })?.code === 'PGRST202') throw new Error(MISSING);
  throw error;
}

function asMedia(raw: unknown): PostMedia[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      const url = typeof o.url === 'string' ? o.url : null;
      if (!url) return null;
      const kind = o.kind === 'video' ? 'video' : 'image';
      const slot = o.slot === 'before' || o.slot === 'after' ? (o.slot as 'before' | 'after') : undefined;
      return { url, kind, slot } as PostMedia;
    })
    .filter((m): m is PostMedia => m !== null);
}

/** Reverse-chronological. `before` paginates by timestamp rather than offset, so a new post can't shift a page. */
export async function fetchFriendsFeed(limit = 40, before?: string): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('friends_feed', { p_limit: limit, p_before: before ?? null });
  if (error) rethrow(error);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    type: String(r.type) as PostType,
    audience: (r.audience === 'FRIENDS' || r.audience === 'BOTH' ? r.audience : 'SQUAD') as PostAudience,
    body: (r.body as string) ?? null,
    media: asMedia(r.media),
    createdAt: String(r.created_at),
    authorId: String(r.author_id),
    authorName: String(r.author_name ?? 'Athlete'),
    authorHandle: (r.author_handle as string) ?? null,
    authorAvatarUrl: (r.author_avatar_url as string) ?? null,
    isMine: !!r.is_mine,
    prValue: (r.pr_value as string) ?? null,
    prExercise: (r.pr_exercise as string) ?? null,
    prLabel: (r.pr_label as string) ?? null,
    workoutId: (r.workout_id as string) ?? null,
    workoutSummary: (r.workout_summary as WorkoutSummary) ?? null,
    commentCount: Number(r.comment_count ?? 0),
    reactionCount: Number(r.reaction_count ?? 0),
    myReaction: asReaction(r.my_reaction),
    reactors: ((r.reactors ?? []) as Record<string, unknown>[]).map((x) => ({
      id: String(x.id),
      name: String(x.name),
      avatarUrl: (x.avatar_url as string) ?? null,
      isSelf: !!x.is_self,
    })),
  }));
}

/**
 * "Acknowledged by A, B and 4 others" — the design's summary line.
 *
 * Names carry it, and the residual is a count of *unnamed people*, never a total presented as a score.
 * "You" comes first when you're among them, which is what the design does.
 */
export function acknowledgedLine(post: FeedPost): string | null {
  if (post.reactionCount === 0) return null;
  const named = post.reactors.slice(0, 2).map((r) => (r.isSelf ? 'You' : r.name.split(' ')[0]));
  const rest = post.reactionCount - named.length;
  if (named.length === 0) return null;
  const people = named.length === 2 ? `${named[0]} and ${named[1]}` : named[0];
  if (rest <= 0) return `Acknowledged by ${people}`;
  return `Acknowledged by ${people} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
}

export interface NewPost {
  body: string;
  audience: PostAudience;
  /** Present for a squad or Both post; null for friends-only. */
  squadId: string | null;
  media: PostMedia[];
  /** `progress` when two before/after images are attached; `recap` when a workout is attached. */
  type?: PostType;
  /** Recap only — the workout being shared and the stats snapshotted from it. */
  workoutId?: string | null;
  workoutSummary?: WorkoutSummary | null;
  /**
   * PR only. `friends_feed()` has returned these three since 0074 and the milestone card has always
   * rendered them; nothing could WRITE them to this audience until the composer merge, because the only
   * caller was a sheet that offered text and photos.
   */
  prValue?: string | null;
  prExercise?: string | null;
  prLabel?: string | null;
}

export async function createFriendPost(input: NewPost): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const isRecap = input.type === 'recap';
  const isPr = input.type === 'pr';
  const { data, error } = await supabase
    .from('squad_posts')
    .insert({
      author_id: user.id,
      audience: input.audience,
      // The constraint is an equivalence: FRIENDS must have no squad, SQUAD/BOTH must have one.
      squad_id: input.audience === 'FRIENDS' ? null : input.squadId,
      type: input.type ?? 'discussion',
      body: input.body.trim() || null,
      media: input.media,
      /* Gated on the TYPE, the same way `addSquadPost` gates it, so a discussion post can never carry
         a workout snapshot a caller left on the input by accident. */
      workout_id: isRecap ? (input.workoutId ?? null) : null,
      workout_summary: isRecap ? (input.workoutSummary ?? null) : null,
      // Same gate, same reason: a discussion never carries a stray PR left on the input.
      pr_value: isPr ? (input.prValue?.trim() || null) : null,
      pr_exercise: isPr ? (input.prExercise?.trim() || null) : null,
      pr_label: isPr ? (input.prLabel?.trim() || null) : null,
    })
    .select('id')
    .single();
  if (error) rethrow(error);
  return (data as { id: string }).id;
}

/** Set, change, or clear. Passing what you already left removes it — the design's toggle. */
export async function setPostReaction(postId: string, reaction: Reaction | null): Promise<Reaction | null> {
  const { data, error } = await supabase.rpc('set_post_reaction', { p_post: postId, p_reaction: reaction });
  if (error) rethrow(error);
  return asReaction(data);
}

export interface PostComment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  isMine: boolean;
}

export async function fetchPostComments(postId: string): Promise<PostComment[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('squad_post_comments')
    .select('id, body, created_at, author_id, profiles(name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) rethrow(error);

  return ((data ?? []) as unknown as {
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    profiles: { name: string; avatar_url: string | null } | null;
  }[]).map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    authorId: c.author_id,
    authorName: c.profiles?.name ?? 'Athlete',
    authorAvatarUrl: c.profiles?.avatar_url ?? null,
    isMine: c.author_id === user?.id,
  }));
}

/**
 * Post a comment. Real, unlike the design — its comment field is a static div and Send only toasts
 * "Comment sent", writing nothing. Its own store has `addComment()` that the screen never calls.
 */
export async function addPostComment(postId: string, body: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const text = body.trim();
  if (!text) return;
  const { error } = await supabase.from('squad_post_comments').insert({ post_id: postId, author_id: user.id, body: text });
  if (error) rethrow(error);
}

/**
 * Upload composed media for a friends post. Reuses the `squad-media` bucket — it is the app's public media
 * store, not a squad-owned one, and the alternative was a second bucket with a second set of policies to
 * keep in step. Pathed under `friends/` so the two audiences are separable later if that ever matters.
 *
 * Uploaded at compose time, before a post row exists, so the path is keyed by uploader + timestamp.
 */
export async function uploadFeedMedia(uri: string, kind: 'image' | 'video'): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const res = await fetch(uri);
  const blob = await res.blob();
  const ext =
    kind === 'video'
      ? blob.type.includes('quicktime')
        ? 'mov'
        : 'mp4'
      : blob.type === 'image/png'
        ? 'png'
        : blob.type === 'image/webp'
          ? 'webp'
          : 'jpg';
  const path = `friends/${user.id}-${Date.now()}-${Math.round(performance.now())}.${ext}`;
  const { error } = await supabase.storage
    .from('squad-media')
    .upload(path, blob, { contentType: blob.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'), upsert: true });
  if (error) throw error;
  return supabase.storage.from('squad-media').getPublicUrl(path).data.publicUrl;
}

export async function deleteFriendPost(postId: string): Promise<void> {
  const { error } = await supabase.from('squad_posts').delete().eq('id', postId);
  if (error) rethrow(error);
}
