/**
 * ⚠ PLACEHOLDER post fixture for Post Detail (the shared feed-post viewer). There is NO
 * feed/social backend — `getPost` is a stub keyed to demo posts, each exercising one of the
 * dc's typed content blocks. Swap the body for a real fetch (`GET /posts/:id`) when the feed
 * lands; call sites don't change. Author/commenter names + counts are all fabricated demo data.
 *
 * Source of truth: "Post Detail.dc.html".
 */

import type { ShareKind } from '@/domain/share/content'

export type PostRole = 'owner' | 'mod'

/** The source-context bar — which surface the post lives in. */
export interface PostSource {
  kind: 'community' | 'squad' | 'friend'
  name: string
  sub: string
  tag: string
}

/** The typed content block a post carries (discriminated union — one per post, per the dc). */
export type PostContent =
  | { type: 'text' }
  | { type: 'achievement'; value: string; exercise: string; label: string }
  | { type: 'honor'; label: string; title: string; sub?: string }
  // Program share = a snapshot of a real Program. Uses the Phase-0 runtime `Program` field
  // names (durationWeeks/frequencyPerWeek) so the backend swap is a data change, not a
  // renderer change; the renderer formats the meta line. `programId` is the ref for the swap.
  | { type: 'program'; programId?: string; programName: string; durationWeeks: number; frequencyPerWeek: number; price?: string }
  | { type: 'media'; mediaKind: 'photo' | 'video'; duration?: string }
  | { type: 'event'; month: string; day: string; title: string; when: string; going: number }
  | { type: 'poll'; options: { text: string; pct: number; chosen?: boolean }[]; footer: string }

export interface PostReply {
  id: string
  author: string
  role?: PostRole
  time: string
  body: string
}

export interface PostComment {
  id: string
  author: string
  role?: PostRole
  time: string
  body: string
  respect: number
  replies?: PostReply[]
}

export interface FeedPost {
  id: string
  author: string
  role?: PostRole
  timestamp: string
  source: PostSource
  /** Small type pill next to the author (e.g. "PR", "Honor"). */
  typeLabel?: string
  /** Optional challenge context line. */
  challenge?: string
  body?: string
  content: PostContent
  respect: number
  commentCount: number
  comments: PostComment[]
  /** Share type for the engagement "Share" → SH-1 (milestone posts only). */
  shareType?: ShareKind
}

const COMMUNITY: PostSource = { kind: 'community', name: 'Iron Collective', sub: 'Community · 2.4k members', tag: 'Community' }
const SQUAD: PostSource = { kind: 'squad', name: 'Iron Vigil', sub: 'Squad · 5 members', tag: 'Squad' }

const POSTS: Record<string, FeedPost> = {
  honor: {
    id: 'honor',
    author: 'Dana Kwon',
    timestamp: '3h',
    source: COMMUNITY,
    typeLabel: 'Honor',
    body: 'Six weeks, no missed sessions. This one meant a lot.',
    content: { type: 'honor', label: 'Honor Earned', title: 'The Unbroken', sub: '30 sessions · no missed week' },
    respect: 48,
    commentCount: 2,
    shareType: 'honor',
    comments: [
      { id: 'c1', author: 'Marcus Vale', role: 'mod', time: '2h', body: 'Consistency is the whole game. Respect.', respect: 6, replies: [{ id: 'r1', author: 'Dana Kwon', time: '1h', body: 'Appreciate it 🙏' }] },
      { id: 'c2', author: 'Priya Sethi', time: '1h', body: 'This is so inspiring, congrats!', respect: 3 },
    ],
  },
  pr: {
    id: 'pr',
    author: 'Theo Brandt',
    timestamp: '5h',
    source: SQUAD,
    typeLabel: 'PR',
    body: 'Finally moved it. Squat has been a two-year grind.',
    content: { type: 'achievement', value: '405', exercise: 'Back Squat', label: 'lb × 3 · new PR' },
    respect: 71,
    commentCount: 1,
    shareType: 'pr',
    comments: [{ id: 'c1', author: 'Lena Cross', time: '4h', body: 'Huge. Depth looked clean too.', respect: 4 }],
  },
  program: {
    id: 'program',
    author: 'Ada Ridge',
    timestamp: '1d',
    source: COMMUNITY,
    body: 'Sharing the block that got me here — 12 weeks, 4 days.',
    content: { type: 'program', programId: 'powerbuilding-ii', programName: 'Powerbuilding II', durationWeeks: 12, frequencyPerWeek: 4, price: 'Free' },
    respect: 23,
    commentCount: 0,
    comments: [],
  },
  event: {
    id: 'event',
    author: 'Iron Collective',
    role: 'owner',
    timestamp: '2d',
    source: COMMUNITY,
    body: 'Monthly lift-together. All levels welcome.',
    content: { type: 'event', month: 'Jul', day: '19', title: 'Community Lift Day', when: 'Sat · 9:00 AM', going: 34 },
    respect: 12,
    commentCount: 0,
    comments: [],
  },
  poll: {
    id: 'poll',
    author: 'Marcus Vale',
    role: 'mod',
    timestamp: '6h',
    source: COMMUNITY,
    body: 'Settle it: best finisher for leg day?',
    content: {
      type: 'poll',
      footer: '128 votes · 2 days left',
      options: [
        { text: 'Walking lunges', pct: 52, chosen: true },
        { text: 'Leg press dropset', pct: 31 },
        { text: 'Sled push', pct: 17 },
      ],
    },
    respect: 9,
    commentCount: 0,
    comments: [],
  },
}

/** Demo fetch. Returns null for an unknown id (the screen shows a graceful not-found state). */
export function getPost(id: string): FeedPost | null {
  return POSTS[id] ?? null
}
