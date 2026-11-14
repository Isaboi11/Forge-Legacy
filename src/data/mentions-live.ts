import { supabase } from '@/lib/supabase';
import type { Mentionable, PickedMention } from '@/domain/squad/mentions';

/**
 * Tagging squad-mates in posts and comments (0265) — the reads and the one write.
 *
 * ⚠ NOTHING HERE THROWS. Tagging rides on a post or comment that has already gone out; a failed tag must
 * never turn a sent post into an error toast, and before 0265 is pasted every call answers PGRST202. Each
 * function resolves to its empty value instead.
 */

/** Everyone in the squad you could tag — its current members, minus you, by name. [] on any failure. */
export async function fetchSquadMentionables(squadId: string): Promise<Mentionable[]> {
  if (!squadId) return [];
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id ?? '';
    const { data, error } = await supabase.from('squad_members').select('user_id, profiles(name, avatar_url)').eq('squad_id', squadId);
    if (error || !data) return [];
    return ((data as unknown as { user_id: string; profiles: { name: string | null; avatar_url: string | null } | null }[]) ?? [])
      .filter((m) => m.user_id !== uid && (m.profiles?.name ?? '').trim())
      .map((m) => ({ id: m.user_id, name: (m.profiles?.name ?? '').trim(), avatarUrl: m.profiles?.avatar_url ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** The squad a post sits in, for the comment box's list. Null for a friends-only post, or on any failure. */
export async function fetchPostSquadId(postId: string): Promise<string | null> {
  if (!postId) return null;
  try {
    const { data, error } = await supabase.from('squad_posts').select('squad_id').eq('id', postId).maybeSingle();
    if (error || !data) return null;
    return (data as { squad_id: string | null }).squad_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Tell the people tagged. Called AFTER the post or comment is saved, with the ids `pickedIn` kept.
 * The server re-checks everything (author, membership, blocks, the cap) and returns how many it told.
 */
export async function tagMentions(postId: string, commentId: string | null, userIds: readonly string[]): Promise<number> {
  if (!postId || !userIds.length) return 0;
  try {
    const { data, error } = await supabase.rpc('tag_squad_mentions', { p_post: postId, p_comment: commentId, p_users: [...new Set(userIds)] });
    if (error) return 0;
    return Number(data ?? 0);
  } catch {
    return 0;
  }
}

export interface PostMentions {
  /** Tagged in the post's own words. */
  post: PickedMention[];
  /** Tagged in each comment, by comment id. */
  byComment: Record<string, PickedMention[]>;
}

const NO_MENTIONS: PostMentions = { post: [], byComment: {} };

/** Who a post and its comments tagged, so the thread can draw them. Empty on any failure (and before 0265). */
export async function fetchPostMentions(postId: string): Promise<PostMentions> {
  if (!postId) return NO_MENTIONS;
  try {
    const { data, error } = await supabase.from('squad_mentions').select('comment_id, user_id, profiles!squad_mentions_user_id_fkey(name)').eq('post_id', postId);
    if (error || !data) return NO_MENTIONS;
    const out: PostMentions = { post: [], byComment: {} };
    for (const r of data as unknown as { comment_id: string | null; user_id: string; profiles: { name: string | null } | null }[]) {
      const name = (r.profiles?.name ?? '').trim();
      if (!name) continue;
      const m = { id: r.user_id, name };
      if (r.comment_id) (out.byComment[r.comment_id] ??= []).push(m);
      else out.post.push(m);
    }
    return out;
  } catch {
    return NO_MENTIONS;
  }
}
