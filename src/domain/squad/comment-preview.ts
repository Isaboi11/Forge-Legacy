/**
 * Inline comment previews on the Squad feed (PO 2026-11-18).
 *
 * PO: the feed said someone commented, and you had to open the post to find out what they said. The
 * fix is to show what was said right under the post — at most two comments, in time order, and
 * "View all N comments" when there are more.
 *
 * ⚠ THE NEWEST TWO, NOT THE FIRST TWO. Showing the first two looks the same until a third comment
 * lands, after which the newest one never shows on the feed and the preview stops answering "what did
 * they just say?". They are drawn OLDEST FIRST so the pair reads like a conversation, top to bottom.
 *
 * ⚠ TIME ORDER, NO RANKING. A squad is at most 50 people who know each other. Nothing here decides
 * which comment matters more than another.
 */

export const PREVIEW_MAX = 2;

export interface PreviewCommentRow {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export interface CommentPreview {
  /** The newest `PREVIEW_MAX`, oldest first. */
  shown: PreviewCommentRow[];
  /** Every comment the read found on the post. */
  total: number;
}

/**
 * Group comment rows (any order) into each post's preview. A post with no comments is absent from the
 * result — the feed draws nothing extra for it.
 */
export function buildCommentPreviews(rows: readonly PreviewCommentRow[], max = PREVIEW_MAX): Record<string, CommentPreview> {
  const byPost = new Map<string, PreviewCommentRow[]>();
  for (const r of rows) {
    if (!r.body.trim()) continue;
    const list = byPost.get(r.postId);
    if (list) list.push(r);
    else byPost.set(r.postId, [r]);
  }
  const out: Record<string, CommentPreview> = {};
  for (const [postId, list] of byPost) {
    /* id breaks a tie so two comments written in the same millisecond never swap places between reads. */
    const sorted = [...list].sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1));
    out[postId] = { shown: sorted.slice(Math.max(0, sorted.length - max)), total: sorted.length };
  }
  return out;
}

/**
 * The "View all" line, or null when every comment is already on screen.
 *
 * ⚠ `count` IS THE POST'S OWN COMMENT COUNT when the caller has it — the number the comment icon beside
 * it shows. The two must never disagree on the same post (the comment-count consistency test exists
 * because they once did).
 */
export function viewAllLabel(count: number, shown: number): string | null {
  if (count <= shown) return null;
  return count === 2 ? 'View both comments' : `View all ${count} comments`;
}

/** Collapse a comment to one paragraph for the feed — line breaks would defeat the two-line cut. */
export function previewBody(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}
