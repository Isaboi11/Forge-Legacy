import { supabase } from '@/lib/supabase';
import { extensionFor, MAX_CHECKIN_BYTES, MAX_IMAGE_BYTES, uploadToBucket, type UploadOpts } from '@/lib/storage-upload';
import { fetchCompletion } from '@/data/workout-complete-live';
// Type only: the snapshot arrives already validated by `fetchCompletion`, and `RecapBlock` re-validates
// it on the way back out of the post's jsonb.
import type { WorkoutPlaylistLink } from '@/domain/workout/playlist';

/**
 * Squad Feed data (Social · Part 1) — training-only threaded posts (`squad_posts`), flat comments
 * (`squad_post_comments`), and a "respect" reaction (`squad_post_reactions`), all member-scoped by RLS
 * (migration 0041). Reads go through the `squad_feed` / `squad_post_one` RPCs so author identity + live
 * counts + my-reaction arrive in one round trip; writes are plain RLS-guarded inserts/deletes.
 *
 * Shipped post types: checkin · recap · pr · discussion · announcement (owner-only). The design's
 * formcheck/challenge/traintogether need subsystems that don't exist yet and are intentionally omitted.
 */

export type SquadPostType = 'checkin' | 'progress' | 'recap' | 'pr' | 'formcheck' | 'transformation' | 'discussion' | 'announcement' | 'weekly';

// ── Weekly Recap (SQ-D8, migration 0057) ──
// Snapshotted at generation time, so a week's summary can't silently change because someone later
// deleted a workout. It is a record of what that week WAS.
export interface WeeklyRecapPr {
  name: string;
  exercise: string;
  value: string;
}
export interface WeeklyRecapHonor {
  name: string;
  honor: string;
}
export interface WeeklyRecapGoal {
  title: string | null;
  kind: string;
  delta: number;
  target: number;
}
export interface WeeklyRecap {
  weekStart: string;
  weekEnd: string;
  workouts: number;
  participation: { active: number; total: number };
  prs: WeeklyRecapPr[];
  prCount: number;
  honors: WeeklyRecapHonor[];
  honorCount: number;
  goal: WeeklyRecapGoal | null;
}

interface WeeklyRecapRow {
  week_start: string;
  week_end: string;
  workouts: number | null;
  participation: { active: number; total: number } | null;
  prs: WeeklyRecapPr[] | null;
  pr_count: number | null;
  honors: WeeklyRecapHonor[] | null;
  honor_count: number | null;
  goal: WeeklyRecapGoal | null;
}

const toRecap = (r: WeeklyRecapRow | null): WeeklyRecap | null =>
  r
    ? {
        weekStart: r.week_start,
        weekEnd: r.week_end,
        workouts: r.workouts ?? 0,
        participation: r.participation ?? { active: 0, total: 0 },
        prs: r.prs ?? [],
        prCount: r.pr_count ?? 0,
        honors: r.honors ?? [],
        honorCount: r.honor_count ?? 0,
        goal: r.goal ?? null,
      }
    : null;

/**
 * One line, the way the design writes it: "27 sessions, 2 PRs, 1 Honor earned across the squad."
 * Parts with nothing to report are dropped rather than shown as zero.
 */
export function recapSummaryLine(r: WeeklyRecap): string {
  const parts = [`${r.workouts} ${r.workouts === 1 ? 'session' : 'sessions'}`];
  if (r.prCount > 0) parts.push(`${r.prCount} ${r.prCount === 1 ? 'PR' : 'PRs'}`);
  if (r.honorCount > 0) parts.push(`${r.honorCount} ${r.honorCount === 1 ? 'Honor' : 'Honors'} earned`);
  return `${parts.join(', ')} across the squad.`;
}

/** A single attachment on a post. `kind` is coarse so the UI can pick image vs. video rendering. */
export type SquadMediaKind = 'image' | 'video';
export interface SquadMedia {
  url: string;
  kind: SquadMediaKind;
  /** Optional alignment (pan/zoom) for before/after transformation posts — fractions of the frame + scale. */
  transform?: { tx: number; ty: number; scale: number };
}

// ── Transformation share layout (templates) ──
/** How a COMPARISON (two captures) is laid out. */
export type ShareTemplate = 'slider' | 'sidebyside' | 'stacked' | 'grid';
/**
 * How a SINGLE capture is laid out. Deliberately disjoint from `ShareTemplate` — one stored `template`
 * value must never mean two things, and a capture posted as a gallery has no then/now to place.
 */
export type EntryTemplate = 'single' | 'gallery' | 'column';
export const ENTRY_TEMPLATES: EntryTemplate[] = ['single', 'gallery', 'column'];
export const isEntryTemplate = (t: string): t is EntryTemplate => (ENTRY_TEMPLATES as string[]).includes(t);

export interface AlignedPhoto {
  url: string;
  transform?: { tx: number; ty: number; scale: number };
}
export interface ComparePair {
  label: string;
  then: AlignedPhoto;
  now: AlignedPhoto;
}
/** One pose from a single capture — the gallery equivalent of a `ComparePair`. */
export interface PoseShot {
  label: string;
  photo: AlignedPhoto;
}
export interface TransformationLayoutData {
  template: ShareTemplate | EntryTemplate;
  thenLabel?: string;
  nowLabel?: string;
  elapsed?: string;
  pairs: ComparePair[];
  /**
   * A single capture's poses. Present INSTEAD of `pairs` — `shots` is what tells every reader this is one
   * capture rather than a comparison, so nothing has to guess from an empty `pairs` array. Absent on every
   * post written before this existed, which reads correctly as "a comparison, or a plain photo".
   */
  shots?: PoseShot[];
}

// ── Progress Photo Post card ──
/**
 * The card a `progress` post carries, exactly as its author composed it.
 *
 * SNAPSHOTTED, like the recap summary beside it. The entry it came from can be edited or deleted; a card
 * squadmates have already seen and commented on must not silently rearrange itself, so the format, the
 * style, the chosen poses IN ORDER, their URLs and the toggled lines are all stored on the post.
 *
 * IT RIDES IN `layout`, NOT A NEW COLUMN. `layout` is untyped jsonb (0045) and both feed RPCs already
 * return it, so a progress card needs no migration and no RPC change. `kind` discriminates it from the
 * transformation layout that shares the column — see `isProgressCard`. Every row written before this
 * existed has no `kind`, which reads correctly as "a transformation layout".
 */
export interface ProgressCardPhoto {
  url: string;
  /** The pose's short name — 'Front', 'Arms Up'. Drawn only when the author left pose labels on. */
  short: string;
  /** The pose key, kept so a reader can say which pose this was without matching URLs. */
  pose: string;
}
export interface ProgressPostCard {
  kind: 'progress-card';
  format: '1x1' | '4x5';
  style: 'grid' | 'hero';
  /** The Transformation entry this was composed from. */
  entryId: string;
  date: string;
  meta: string | null;
  chapter: string | null;
  athlete: string;
  photos: ProgressCardPhoto[];
  incl: { date: boolean; meta: boolean; chapter: boolean; name: boolean; pose: boolean };
}

/** Either shape the `layout` column can hold. */
export type PostLayout = TransformationLayoutData | ProgressPostCard;

export const isProgressCard = (l: PostLayout | null | undefined): l is ProgressPostCard =>
  !!l && (l as ProgressPostCard).kind === 'progress-card' && Array.isArray((l as ProgressPostCard).photos);

/** The transformation half of the column, or null when this post carries the other shape. */
export const asTransformationLayout = (l: PostLayout | null | undefined): TransformationLayoutData | null => (l && !isProgressCard(l) ? l : null);

/** Snapshot of a completed workout captured at recap-post time (survives later edits to the workout). */
export interface RecapExercise {
  name: string;
  sets: number;
  topSet: string | null;
  isPR: boolean;
}
export interface WorkoutSummary {
  volume: number;
  durationSec: number;
  prCount: number;
  exercises: RecapExercise[];
  /**
   * What the session was CALLED, and where it sat — the post's title and context line.
   *
   * ⚠ OPTIONAL, AND ABSENT ON EVERY POST WRITTEN BEFORE THIS FIELD EXISTED. A workout post with no title
   * is an anonymous pile of numbers, which is the content half of the feed redesign; but this column is a
   * JSONB snapshot, so the fix costs no migration and needs no backfill. An older recap simply renders
   * with what it has, exactly as a pre-0113 recap renders without stats.
   *
   * `context` is the program the session belonged to. It does NOT carry "Week N · Day N": nothing stores
   * which slot a saved workout satisfied — `program_sessions` is keyed by (week, day) and holds no
   * workout id — so the week and the day would have to be guessed, and a guessed week on somebody's
   * record is worse than a program name on its own.
   */
  name?: string | null;
  context?: string | null;
  /** What they trained to, if they attached one. Optional because every post written before 0105 has no
   *  such key — an old recap reads `undefined` and simply renders no chip. */
  playlist?: WorkoutPlaylistLink | null;
}

export interface SquadPostTypeDef {
  id: SquadPostType;
  label: string;
  ownerOnly: boolean;
  blurb: string;
}

/**
 * The composer's palette, in display order. Announcement is owner-only.
 *
 * `progress` REPLACED `checkin` AS THE FIRST MEMBER TYPE. A check-in was a sentence saying you trained;
 * a progress post is the capture itself, laid out for a feed, and it is now the most common thing a
 * member posts. Picking it does not open a text form — it opens Progress Photo Post, which composes the
 * card. See `LEGACY_SQUAD_POST_TYPES` for what happened to the old one.
 *
 * `transformation` posts a comparison built from the athlete's OWN Transformation entries (L-17) rather than
 * from loose photos — the gallery is where the captures and their pose alignment live, so picking two entries
 * yields the same aligned pair layout the gallery's own Share flow produces. Two entries with at least one
 * pose in common are required, which is why the composer offers the gallery instead when there aren't.
 */
export const SQUAD_POST_TYPES: SquadPostTypeDef[] = [
  { id: 'progress', label: 'Progress Photos', ownerOnly: false, blurb: 'Share your progress photos.' },
  { id: 'recap', label: 'Workout Recap', ownerOnly: false, blurb: 'Share how the session went.' },
  { id: 'pr', label: 'PR / Milestone', ownerOnly: false, blurb: 'Mark a personal record for the squad.' },
  { id: 'formcheck', label: 'Form Check', ownerOnly: false, blurb: 'Post a lift for the squad’s eyes.' },
  { id: 'transformation', label: 'Transformation', ownerOnly: false, blurb: 'Compare two of your progress captures.' },
  { id: 'discussion', label: 'Discussion', ownerOnly: false, blurb: 'A short note to the squad.' },
  { id: 'announcement', label: 'Squad Announcement', ownerOnly: true, blurb: 'Owner note pinned for the squad.' },
];

/**
 * RETIRED TYPES THAT STILL HAVE POSTS.
 *
 * `checkin` can no longer be authored, but squads have years of them in their feeds and every one must
 * keep rendering with its own name and its own glyph. Retiring a type is a change to what the composer
 * OFFERS, never to what the feed can READ — dropping it from the registry would have made every historic
 * check-in fall back to the first entry in the list and describe itself as a progress post.
 */
export const LEGACY_SQUAD_POST_TYPES: SquadPostTypeDef[] = [{ id: 'checkin', label: 'Check-in', ownerOnly: false, blurb: 'Log that you trained today.' }];

export const squadPostTypeDef = (id: SquadPostType): SquadPostTypeDef =>
  SQUAD_POST_TYPES.find((t) => t.id === id) ?? LEGACY_SQUAD_POST_TYPES.find((t) => t.id === id) ?? SQUAD_POST_TYPES[0];

export interface SquadFeedPost {
  id: string;
  type: SquadPostType;
  body: string | null;
  prValue: string | null;
  prExercise: string | null;
  prLabel: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorIsOwner: boolean;
  createdAt: string;
  commentCount: number;
  respectCount: number;
  iReacted: boolean;
  media: SquadMedia[];
  workoutSummary: WorkoutSummary | null;
  /**
   * The session a `recap` post shared — the tap target onto Activity Detail (0117).
   *
   * `squad_feed()` stored this from 0043 and never returned it, so the Squad card had nowhere to send
   * you and fell back to the post page: the same post type reached two different destinations depending
   * on which feed you found it in. Null on a database that hasn't applied 0117, which reads correctly
   * as "no session to open" and leaves the card behaving exactly as it did.
   */
  workoutId: string | null;
  /** A transformation comparison, or a progress card — discriminate with `isProgressCard`. */
  layout: PostLayout | null;
  /** 'weekly' only — the generated summary. Null on every other type. */
  recap: WeeklyRecap | null;
}

export interface SquadPostComment {
  id: string;
  body: string;
  createdAt: string;
  /** When the author last rewrote it; null means never (0178). Drives the "edited" mark. */
  editedAt: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorIsOwner: boolean;
}

/**
 * The four acknowledgement kinds — `Social-Architecture-Amendment-004` SOC-A4-D3, LOCKED.
 *
 * ⚠ ONE PER ATHLETE PER POST, and this is which. Not a set to collect: the PK on
 * `squad_post_reactions` is still `(post_id, user_id)`, so choosing a kind REPLACES the last one.
 */
export const ACK_KINDS = ['respect', 'honor', 'support', 'strength'] as const;
export type AckKind = (typeof ACK_KINDS)[number];

/** Labels for the press-and-hold chooser. Order is SOC-A4-D3's order and should stay that way. */
export const ACK_LABEL: Record<AckKind, string> = {
  respect: 'Respect',
  honor: 'Honor',
  support: 'Support',
  strength: 'Strength',
};

export interface SquadPostThread {
  post: SquadFeedPost;
  squadName: string;
  comments: SquadPostComment[];
  /** Which acknowledgement I left. Meaningless unless `post.iReacted`; defaults to `respect`. */
  myKind: AckKind;
}

interface FeedRow {
  id: string;
  type: SquadPostType;
  body: string | null;
  pr_value: string | null;
  pr_exercise: string | null;
  pr_label: string | null;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_is_owner: boolean;
  created_at: string;
  comment_count: number;
  respect_count: number;
  i_reacted: boolean;
  media: SquadMedia[] | null;
  workout_summary: WorkoutSummary | null;
  /** Added to both squad RPCs in 0117; absent (undefined) on a database without it. */
  workout_id?: string | null;
  layout: PostLayout | null;
  recap: WeeklyRecapRow | null;
}

const toPost = (r: FeedRow): SquadFeedPost => ({
  id: r.id,
  type: r.type,
  body: r.body,
  prValue: r.pr_value,
  prExercise: r.pr_exercise,
  prLabel: r.pr_label,
  authorId: r.author_id,
  authorName: r.author_name ?? 'Athlete',
  authorAvatar: r.author_avatar,
  authorIsOwner: r.author_is_owner,
  createdAt: r.created_at,
  commentCount: Number(r.comment_count ?? 0),
  respectCount: Number(r.respect_count ?? 0),
  iReacted: !!r.i_reacted,
  media: Array.isArray(r.media) ? r.media : [],
  workoutSummary: r.workout_summary ?? null,
  workoutId: r.workout_id ?? null,
  layout: r.layout ?? null,
  recap: toRecap(r.recap ?? null),
});

/**
 * Generate this week's recap if it doesn't exist yet (SQ-D8, migration 0057). Lazy rather than
 * scheduled — there is no cron, so the first athlete to open the feed in a new week triggers it and it
 * is a no-op afterwards. Silent on failure: a missing summary must never stop the feed from loading,
 * and pre-0057 there simply isn't one.
 */
export async function ensureWeeklyRecap(squadId: string): Promise<void> {
  try {
    await supabase.rpc('ensure_weekly_recap', { p_squad: squadId });
  } catch {
    // nothing to summarise, or the migration hasn't been applied
  }
}

/** One squad's feed page (newest first). */
export async function fetchSquadFeed(squadId: string, limit = 5, offset = 0): Promise<SquadFeedPost[]> {
  const { data, error } = await supabase.rpc('squad_feed', { p_squad: squadId, p_limit: limit, p_offset: offset });
  if (error) throw error;
  return ((data ?? []) as FeedRow[]).map(toPost);
}

/** One post + its (flat) comment thread. Null if the post is gone / not visible. */
export async function fetchSquadPost(postId: string): Promise<SquadPostThread | null> {
  const { data, error } = await supabase.rpc('squad_post_one', { p_post: postId });
  if (error) throw error;
  const rows = (data ?? []) as (FeedRow & { squad_name: string | null; squad_owner_id: string })[];
  const row = rows[0];
  if (!row) return null;

  const { data: cData, error: cErr } = await supabase
    .from('squad_post_comments')
    .select('id, body, created_at, edited_at, author_id, profiles(name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (cErr) throw cErr;

  const comments = ((cData ?? []) as unknown as { id: string; body: string; created_at: string; edited_at: string | null; author_id: string; profiles: { name: string | null; avatar_url: string | null } | null }[]).map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    editedAt: c.edited_at ?? null,
    authorId: c.author_id,
    authorName: c.profiles?.name ?? 'Athlete',
    authorAvatar: c.profiles?.avatar_url ?? null,
    authorIsOwner: c.author_id === row.squad_owner_id,
  }));

  /*
   * WHICH kind I left, for the detail screen's control.
   *
   * ⚠ READ HERE RATHER THAN ADDED TO `squad_post_one`. That RPC returns `i_reacted` and is shared with
   * the feed; widening its OUT columns forces a drop-and-recreate, and rebuilding a function body from
   * an older copy is the documented way this schema has silently lost features three times (0088, 0092,
   * 0106). One extra RLS-scoped row read is the cheaper correctness.
   *
   * Absent reads as `respect`, which is what every acknowledgement written before 0178 was.
   */
  const { data: mine } = await supabase
    .from('squad_post_reactions')
    .select('kind')
    .eq('post_id', postId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .maybeSingle();
  const myKind = ((mine as { kind?: string } | null)?.kind ?? 'respect') as AckKind;

  return { post: toPost(row), squadName: row.squad_name ?? 'Squad', comments, myKind };
}

export interface NewSquadPost {
  squadId: string;
  type: SquadPostType;
  body: string;
  prValue?: string;
  prExercise?: string;
  prLabel?: string;
  media?: SquadMedia[];
  workoutId?: string | null;
  workoutSummary?: WorkoutSummary | null;
  layout?: PostLayout | null;
}

/**
 * What a post says when its author wrote nothing. Only the two types whose SUBJECT is not the text —
 * a check-in is the act of training, a progress post is the card — get a line put in their mouth; every
 * other type either requires a body or is allowed to have none.
 *
 * `detailFor` knows these strings and suppresses them, so a card never prints the same sentence twice.
 */
const AUTO_BODY: Partial<Record<SquadPostType, string>> = {
  checkin: 'Checked in — trained today.',
  progress: 'Progress photos.',
};

const fallbackBody = (type: SquadPostType, body: string): string | null => body || AUTO_BODY[type] || null;

/** Compose a post. Returns the new post id. RLS rejects an announcement from a non-owner. */
export async function addSquadPost(input: NewSquadPost): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const body = input.body.trim();
  const row = {
    squad_id: input.squadId,
    author_id: user.id,
    type: input.type,
    body: fallbackBody(input.type, body),
    pr_value: input.type === 'pr' ? (input.prValue ?? '').trim() || null : null,
    pr_exercise: input.type === 'pr' ? (input.prExercise ?? '').trim() || null : null,
    pr_label: input.type === 'pr' ? (input.prLabel ?? '').trim() || 'Squad PR' : null,
    media: input.media ?? [],
    workout_id: input.type === 'recap' ? input.workoutId ?? null : null,
    workout_summary: input.type === 'recap' ? input.workoutSummary ?? null : null,
    // Two shapes, one column (0045) — a comparison layout or a progress card, never both.
    layout: input.type === 'transformation' || input.type === 'progress' ? input.layout ?? null : null,
  };
  const { data, error } = await supabase.from('squad_posts').insert(row).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
}

// ── Workout-backed posts (Recap snapshots real workout stats; composer picks from recent activity) ──

interface CompletionLike {
  volume: number;
  durationSec: number;
  exercises: { name: string; sets: number; topSet: string | null; isPR: boolean }[];
  playlist?: WorkoutPlaylistLink | null;
  workoutName?: string | null;
  programName?: string | null;
}

/** Snapshot a Completion's stats into the recap `WorkoutSummary` stored on the post. */
export function recapSummaryFrom(c: CompletionLike): WorkoutSummary {
  const name = c.workoutName?.trim() || null;
  return {
    volume: c.volume,
    durationSec: c.durationSec,
    prCount: c.exercises.filter((e) => e.isPR).length,
    exercises: c.exercises.map((e) => ({ name: e.name, sets: e.sets, topSet: e.topSet, isPR: e.isPR })),
    /*
     * ⚠ "Freestyle Workout" IS NOT A TITLE, it is the app's word for a session nobody named — and the
     * feed's whole content rule is that a workout post must be a legible entry in someone's record
     * rather than a generic label over a pile of numbers. Dropped to null so the post falls back to
     * naming the type, instead of a feed of identical headings.
     */
    name: name && name.toLowerCase() !== 'freestyle workout' ? name : null,
    context: c.programName?.trim() || null,
    /*
     * WSR-001 §6.3 / Workout-Playlist-Amendment-001 §2 put the playlist on squad check-in cards.
     *
     * SNAPSHOTTED, like every other field here — the post keeps what the session looked like when it was
     * shared, so removing the link from the workout later does not rewrite a card squadmates have already
     * seen and commented on. That is the same rule the volume and the exercise list follow.
     *
     * This is also the reason migration 0105 checks the URL's host in the database rather than trusting
     * the client: this value is about to become a tap target for somebody other than its author.
     */
    playlist: c.playlist ?? null,
  };
}

/** Build a recap snapshot for a completed workout (reuses the W-17 completion read). Null if it's gone. */
export async function buildWorkoutRecap(workoutId: string): Promise<{ workoutName: string; summary: WorkoutSummary } | null> {
  try {
    const c = await fetchCompletion(workoutId);
    return { workoutName: c.workoutName, summary: recapSummaryFrom(c) };
  } catch {
    return null;
  }
}

export interface RecentWorkout {
  id: string;
  name: string;
  savedAt: string;
}

/** My recent completed (saved) workouts, newest first — the composer's Recap picker. */
export async function fetchRecentWorkouts(limit = 15): Promise<RecentWorkout[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('workouts')
    .select('id, workout_name, saved_at')
    .eq('athlete_id', user.id)
    .eq('state', 'saved')
    .order('saved_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return ((data ?? []) as { id: string; workout_name: string | null; saved_at: string }[]).map((w) => ({ id: w.id, name: w.workout_name ?? 'Workout', savedAt: w.saved_at }));
}

export interface RecentPR {
  exercise: string;
  value: string;
  achievedOn: string;
}

/** My recent load PRs, newest first — the composer's PR picker (prefills the fields; still editable). */
export async function fetchRecentPRs(limit = 15): Promise<RecentPR[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise, load_value, load_reps, achieved_on')
    .eq('athlete_id', user.id)
    .eq('measure_kind', 'load')
    .order('achieved_on', { ascending: false })
    .limit(limit);
  if (error) return [];
  return ((data ?? []) as { exercise: string; load_value: number | null; load_reps: number | null; achieved_on: string }[])
    .filter((p) => p.load_value != null)
    .map((p) => ({ exercise: p.exercise, value: `${p.load_value} lb`, achievedOn: p.achieved_on }));
}

/** "18,140" — thousands separators without Intl (Hermes-safe). */
export function fmtVolume(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "52:18" (h:mm:ss past an hour) — the completion screen's Under-Iron clock. */
export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Upload a photo/video for a squad post to the public `squad-media` bucket and return its public URL.
 * Media is uploaded at compose time (before the post row exists), so the object path is keyed by uploader +
 * timestamp, not post id. `uri` is a local file/blob/data URI from expo-image-picker.
 */
export async function uploadPostMedia(squadId: string, uri: string, kind: SquadMediaKind, opts?: UploadOpts): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const fallbackType = kind === 'video' ? 'video/mp4' : 'image/jpeg';
  const contentType = opts?.contentType ?? fallbackType;
  const ext = extensionFor(contentType, kind === 'video' ? 'mp4' : 'jpg');
  const path = `${squadId}/${user.id}-${Date.now()}.${ext}`;
  /*
   * Same streamed path the check-in takes — this was the second copy of the heap-blob upload, and two
   * copies of one decision is how the first one went unfixed. A photo gets the smaller ceiling because
   * `useMediaPicker` has already downscaled it; anything over 10 MB here is an original that escaped.
   */
  return uploadToBucket('squad-media', path, uri, {
    maxBytes: kind === 'video' ? MAX_CHECKIN_BYTES : MAX_IMAGE_BYTES,
    ...opts,
    contentType,
  });
}

/** Add a comment to a post. */
export async function addSquadComment(postId: string, body: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('squad_post_comments').insert({ post_id: postId, author_id: user.id, body: body.trim() });
  if (error) throw error;
}

/**
 * Toggle my acknowledgement on a post. Pass the current state; returns the new state.
 *
 * A plain tap still means `respect` — SOC-A4-D3: *"a tap acknowledges rather than opening a chooser"*.
 * Press-and-hold picks a kind, which goes through `setSquadReactionKind` below.
 */
export async function toggleSquadReaction(postId: string, reacted: boolean): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  if (reacted) {
    const { error } = await supabase.from('squad_post_reactions').delete().eq('post_id', postId).eq('user_id', user.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('squad_post_reactions').insert({ post_id: postId, user_id: user.id, kind: 'respect' });
  if (error) throw error;
  return true;
}

/**
 * Which acknowledgement I left on each of these posts.
 *
 * ⚠ ONE QUERY FOR THE WHOLE FEED, and read here rather than added to `squad_feed`. That RPC returns
 * `i_reacted` and is shared with other surfaces; widening its OUT columns forces a drop-and-recreate,
 * and rebuilding a function body from an older copy is the documented way this schema has silently lost
 * features three times (0088, 0092, 0106). One extra RLS-scoped read is the cheaper correctness.
 *
 * Absent from the map reads as `respect` — what every acknowledgement written before 0178 was.
 */
export async function fetchMyReactionKinds(postIds: readonly string[]): Promise<Record<string, AckKind>> {
  if (!postIds.length) return {};
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const { data, error } = await supabase
    .from('squad_post_reactions')
    .select('post_id, kind')
    .eq('user_id', user.id)
    .in('post_id', postIds as string[]);
  if (error || !data) return {};
  const out: Record<string, AckKind> = {};
  for (const r of data as { post_id: string; kind: string | null }[]) {
    out[r.post_id] = ((r.kind ?? 'respect') as AckKind);
  }
  return out;
}

/**
 * Acknowledge with a specific kind — the press-and-hold path (SOC-A4-D3, 0178).
 *
 * ⚠ UPSERT, NOT INSERT. The primary key is `(post_id, user_id)`, so an athlete who has already
 * acknowledged and then picks a different kind is CHANGING their answer, not adding a second one. An
 * insert would fail on the conflict and read as "the button is broken"; a delete-then-insert would drop
 * the acknowledgement for anyone reading the post in between.
 */
export async function setSquadReactionKind(postId: string, kind: AckKind): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('squad_post_reactions')
    .upsert({ post_id: postId, user_id: user.id, kind }, { onConflict: 'post_id,user_id' });
  if (error) throw error;
}

/**
 * Edit my own comment (0178).
 *
 * ⚠ THE AUTHOR CHECK IS RLS, NOT THIS FUNCTION. `squad_post_comments_update` is
 * `author_id = auth.uid()` on both USING and WITH CHECK, so an edit of somebody else's comment matches
 * zero rows rather than being refused — which is why the caller must not read "no error" as "it saved".
 * The screen refetches and shows the row it got back.
 *
 * ⚠ `edited_at` IS SET HERE, BY THE CLIENT. There is no trigger: a comment that changed after people
 * read it has to say so, and the column is the only thing that can tell them.
 */
export async function editSquadComment(commentId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('A comment cannot be empty — delete it instead.');
  const { error } = await supabase
    .from('squad_post_comments')
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) throw error;
}

/** Compact relative time: "Just now" · "12m" · "3h" · "2d" · "5w" · then a short date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 45) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  // Pinned to en-US like every other date in the app — the device locale would print "6 Aug" on a phone
  // set to anything but the US, in a feed where every neighbouring date reads "Aug 6".
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** The one-line "who + verb" lead for a feed card (discussion has none — the body IS the line). */
export function leadFor(p: Pick<SquadFeedPost, 'type' | 'prExercise'>): string {
  switch (p.type) {
    case 'progress':
      return 'posted progress photos.';
    // Retired from the composer, never from the feed — see LEGACY_SQUAD_POST_TYPES.
    case 'checkin':
      return 'checked in — trained today.';
    case 'recap':
      return 'logged a workout recap.';
    case 'pr':
      return `set a ${p.prExercise?.trim() || 'new'} PR.`;
    case 'formcheck':
      return 'posted a form check for the squad.';
    case 'transformation':
      return 'shared a transformation.';
    case 'announcement':
      return 'posted a squad announcement.';
    case 'weekly':
      return 'Weekly Summary';
    default:
      return '';
  }
}

/**
 * The secondary line under the lead. PR → "315 lb · Squad PR"; else a trimmed body excerpt.
 *
 * A body this file WROTE is not an excerpt of anything — printing it here put "Checked in — trained
 * today." directly beneath a lead reading "checked in — trained today.", and a progress post would have
 * done the same. The author's own words always survive; only the stand-in is dropped.
 */
export function detailFor(p: Pick<SquadFeedPost, 'type' | 'body' | 'prValue' | 'prLabel'>): string {
  if (p.type === 'pr' && p.prValue) return `${p.prValue} · ${p.prLabel || 'Squad PR'}`;
  const b = (p.body ?? '').replace(/\s+/g, ' ').trim();
  if (b === AUTO_BODY[p.type]) return '';
  return b.length > 90 ? `${b.slice(0, 90)}…` : b;
}
