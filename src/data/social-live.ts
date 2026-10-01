import { supabase } from '@/lib/supabase';
import { callRpc, dashboardTz } from '@/data/admin-live';
import type { Platform, SocialData, SocialVideo, SocialPosting, TagKind } from '@/domain/admin/social-core';

/**
 * The CRM's Social section — read and write path (migration 0247, Admin-Analytics-Amendment-003).
 *
 * Same boundary rules as `crm-live.ts`: authorization is NOT here (every `admin_social_*` function opens
 * with `admin_guard()`), and the payload keeps the SQL's snake_case. One read, `admin_social_media`,
 * feeds all three pages; every figure is derived from it in `domain/admin/social-core.ts`.
 *
 * ══ THE SYNC IS AN EDGE FUNCTION, AND IT MAY NOT BE THERE YET ══
 *
 * `social-sync` is pasted into the Supabase dashboard by hand, and it needs four secrets from two
 * developer apps only the owner can create (Docs/Social-Accounts-Setup.md). "Not deployed" and "keys not
 * set" are therefore real, lasting states, and each gets its own sentence rather than a generic failure.
 */

export const fetchSocial = () => callRpc<SocialData>('admin_social_media', { p_tz: dashboardTz() });

export type VideoPatch = Partial<
  Pick<SocialVideo, 'title' | 'topic' | 'hook' | 'format' | 'length_s' | 'stage' | 'first_line' | 'notes' | 'lesson_tried' | 'lesson_result' | 'verdict' | 'planned'>
>;

export const saveVideo = (id: string | null, patch: VideoPatch) => callRpc<string>('admin_social_video_save', { p_id: id, p_patch: patch });
export const deleteVideo = (id: string) => callRpc<void>('admin_social_video_delete', { p_id: id });

export type PostingPatch = Partial<Pick<SocialPosting, 'scheduled_for' | 'posted_at' | 'url' | 'views' | 'likes' | 'comments' | 'shares' | 'saves' | 'watch_pct_typed'>> & {
  video_id?: string;
  platform?: Platform;
};

export const savePosting = (id: string | null, patch: PostingPatch) => callRpc<string>('admin_social_posting_save', { p_id: id, p_patch: patch });
export const deletePosting = (id: string) => callRpc<void>('admin_social_posting_delete', { p_id: id });
/** "This post is one of my planned videos" — moves a synced posting onto the video it belongs to. */
export const attachPosting = (id: string, videoId: string) => callRpc<void>('admin_social_posting_attach', { p_id: id, p_video: videoId });
/** The sync matched a post to the wrong plan: it becomes its own video again. Returns the new video's id. */
export const unlinkPosting = (id: string) => callRpc<string>('admin_social_posting_unlink', { p_id: id });

/** `old` null = add a label; otherwise rename it, and every video wearing it follows. */
export const saveTag = (kind: TagKind, old: string | null, label: string) => callRpc<void>('admin_social_tag_save', { p_kind: kind, p_old: old, p_new: label });
export const deleteTag = (kind: TagKind, label: string) => callRpc<void>('admin_social_tag_delete', { p_kind: kind, p_label: label });

export const saveGoal = (platform: Platform, postsPerWeek: number, followerTarget: number | null, targetDate: string | null) =>
  callRpc<void>('admin_social_goal_save', { p_platform: platform, p_posts_per_week: postsPerWeek, p_follower_target: followerTarget, p_target_date: targetDate });

/** Followers typed by hand for a day — for the time before an account is connected. */
export const saveFollowers = (platform: Platform, day: string, followers: number) =>
  callRpc<void>('admin_social_followers_save', { p_platform: platform, p_day: day, p_followers: followers });

export type ItemKind = 'income' | 'question' | 'rival' | 'rule';
export const saveItem = (kind: ItemKind, id: string | null, patch: Record<string, unknown>) =>
  callRpc<string>('admin_social_item_save', { p_kind: kind, p_id: id, p_patch: patch });
export const deleteItem = (kind: ItemKind, id: string) => callRpc<void>('admin_social_item_delete', { p_kind: kind, p_id: id });
/** One tap from a question people keep asking to an idea in the pipeline. Returns the video's id. */
export const questionToVideo = (id: string) => callRpc<string>('admin_social_question_to_video', { p_id: id });

export const disconnectAccount = (platform: Platform) => callRpc<void>('admin_social_disconnect', { p_platform: platform });

// ── The social-sync Edge Function ───────────────────────────────────────────

export const SOCIAL_SETUP_DOC = 'Docs/Social-Accounts-Setup.md';

export interface SyncResult {
  ok: boolean;
  results: { platform: Platform; ok: boolean; message: string | null; posts: number; new_videos: number; followers: number | null }[];
}

export interface SyncStatus {
  ok: boolean;
  configured: Record<Platform, boolean>;
  missing: Record<Platform, string[]>;
  redirect_uri: string;
}

export type ConnectResult = { ok: true; url: string } | { ok: false; configured: false; missing: string[] };

async function invoke<T>(body: Record<string, unknown>, failed: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke('social-sync', { body });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 404) throw new Error(`The social-sync function is not deployed yet. The steps are in ${SOCIAL_SETUP_DOC}.`);
    if (status === 401 || status === 403) throw new Error('Not authorized.');
    // No status at all = the request never got an answer: the function is missing, or the connection dropped.
    if (status == null) throw new Error(`Couldn’t reach the sync. If this is the first time, it is not deployed yet: the steps are in ${SOCIAL_SETUP_DOC}.`);
    throw new Error(error.message || failed);
  }
  return data as T;
}

/** Which platforms have their app keys set on the server. Tells the page what "Connect" will do. */
export const fetchSyncStatus = () => invoke<SyncStatus>({ action: 'status' }, 'Couldn’t reach the sync.');

/** Pull numbers now, for one platform or every connected one. */
export const runSocialSync = (platform?: Platform) => invoke<SyncResult>({ action: 'sync', ...(platform ? { platform } : {}) }, 'The sync failed.');

/**
 * Starts a platform's own sign-in. Returns the address to send the browser to; the platform sends it
 * back to the function, which returns here with `?p=social&a=connected-<platform>` (or `failed-`).
 */
export const startConnect = (platform: Platform, returnTo: string) =>
  invoke<ConnectResult>({ action: 'connect', platform, return_to: returnTo }, 'Couldn’t start the sign-in.');
