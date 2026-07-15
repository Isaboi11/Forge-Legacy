/**
 * ⚠ PLACEHOLDER post fixture for the Post Detail shell. There is NO feed/social backend —
 * `getPost` is a stub keyed to the 7 ShareKinds, mirroring the ceremony/share demo defaults.
 * Swap the body for a real fetch (`GET /posts/:id`) when the feed lands; call sites don't change.
 */

import type { ShareKind } from '@/domain/share/content'

export interface Post {
  id: string
  shareType: ShareKind
  /** Pre-formatted display timestamp (demo). */
  timestamp: string
}

const POSTS: Record<string, Post> = {
  honor: { id: 'honor', shareType: 'honor', timestamp: 'Apr 2, 2026' },
  pr: { id: 'pr', shareType: 'pr', timestamp: 'May 3, 2026' },
  rank: { id: 'rank', shareType: 'rank', timestamp: 'Jun 14, 2026' },
  goal: { id: 'goal', shareType: 'goal', timestamp: 'May 3, 2026' },
  program: { id: 'program', shareType: 'program', timestamp: 'Jun 12, 2026' },
  chapter: { id: 'chapter', shareType: 'chapter', timestamp: 'Mar 1, 2026' },
  accomplishment: { id: 'accomplishment', shareType: 'accomplishment', timestamp: 'May 3, 2026' },
}

/** Demo fetch. Returns null for an unknown id (the screen shows a graceful not-found state). */
export function getPost(id: string): Post | null {
  return POSTS[id] ?? null
}
