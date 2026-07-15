/**
 * ⚠ PLACEHOLDER post fixture for Post Detail (the shared feed-post viewer). There is NO
 * feed/social backend — `getPost` is a stub keyed to demo posts, each exercising one of the
 * dc's typed content blocks. Swap the body for a real fetch (`GET /posts/:id`) when the feed
 * lands; call sites don't change. Author/commenter names + counts are all fabricated demo data.
 *
 * Source of truth: "Post Detail.dc.html".
 */

import type { ShareKind } from '@/domain/share/content'
// Value import (explicit .ts so the zero-dep node --test suites resolve it); the app bundler
// resolves it via allowImportingTsExtensions, same convention as domain/rank-artwork imports.
import { COMMUNITY_DATA } from './community-placeholder.ts'
import type { CommunityPost } from './community-placeholder.ts'

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
  //
  // ADDITIVE superset (Community convergence): structured duration/frequency are now optional,
  // and a Community program may instead carry a free-form `meta` line + `kindLabel` (e.g. "Forge
  // Program" / "Paid Program"), a `saveLabel` CTA ("Save to Upcoming" / "Get Program"), a
  // `savedNote` ("214 saved") and a `footNote`. Renderers prefer `meta` when present, else format
  // the numbers. Nothing existing loses meaning — the two committed structured posts still supply
  // durationWeeks/frequencyPerWeek.
  | {
      type: 'program'
      programId?: string
      programName: string
      durationWeeks?: number
      frequencyPerWeek?: number
      price?: string
      kindLabel?: string
      meta?: string
      saveLabel?: string
      savedNote?: string
      footNote?: string
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// Community feed — the committed Community tab renders COMMUNITY_DATA.posts (a richer
// `CommunityPost[]`). The convergence maps each onto the shared `FeedPost` so the ONE
// FeedPostCard renders it and it taps through to this same Post Detail. Semantic contract is
// locked by community-feed-characterization.test.mjs. Community-only affordances (save / RSVP /
// program CTA / author presence) are the CARD's origin-config, not extra data.
// ─────────────────────────────────────────────────────────────────────────────

/** Map one committed CommunityPost onto the shared FeedPost — additive, no field dropped. */
function communityPostToFeedPost(p: CommunityPost): FeedPost {
  const base = {
    id: p.id,
    author: p.author,
    role: p.role,
    timestamp: p.time,
    source: COMMUNITY,
    typeLabel: p.typeLabel,
    body: p.body,
    respect: p.respectCount,
    commentCount: p.commentCount,
    comments: [] as PostComment[], // no authored comment threads in the community seed
  }
  switch (p.kind) {
    case 'discussion':
      return { ...base, content: { type: 'text' } }
    case 'event':
      return {
        ...base,
        content: { type: 'event', month: p.eventMonth, day: p.eventDay, title: p.eventTitle, when: p.eventWhen, going: p.eventGoing },
      }
    case 'formcheck':
      return { ...base, content: { type: 'media', mediaKind: 'video', duration: p.videoDuration } }
    case 'achievement':
      return {
        ...base,
        shareType: 'pr', // a PR keepsake is genuinely shareable via SH-1
        content: { type: 'achievement', value: p.plateValue, exercise: p.plateExercise, label: p.plateLabel },
      }
    case 'program':
      return {
        ...base,
        content: { type: 'program', programName: p.programTitle, kindLabel: p.programKindLabel, meta: p.programMeta, saveLabel: 'Save to Upcoming', savedNote: p.savedNote },
      }
    case 'programPaid':
      return {
        ...base,
        content: { type: 'program', programName: p.programTitle, kindLabel: p.programKindLabel, meta: p.programMeta, price: p.price, saveLabel: 'Get Program', footNote: p.footNote },
      }
  }
}

const COMMUNITY_FEED: FeedPost[] = COMMUNITY_DATA.posts.map(communityPostToFeedPost)
const COMMUNITY_BY_ID: Record<string, FeedPost> = Object.fromEntries(COMMUNITY_FEED.map((p) => [p.id, p]))

/**
 * The Community Home feed (demo). Same posts open in Post Detail via `/post/[id]`. Derived from
 * the committed COMMUNITY_DATA seed — placeholder, no feed backend (real: GET /communities/:id/feed).
 */
export function getCommunityFeed(): FeedPost[] {
  return COMMUNITY_FEED
}

/** Demo fetch. Resolves the static demo posts, the friends feed, and the community feed by id. */
export function getPost(id: string): FeedPost | null {
  return POSTS[id] ?? COMMUNITY_BY_ID[id] ?? null
}

/**
 * The Friends Feed list (demo). Same posts open in Post Detail via `/post/[id]`, so the feed
 * and detail stay consistent. Placeholder — no feed backend (real: GET /feed/friends).
 */
export function getFriendsFeed(): FeedPost[] {
  return ['pr', 'honor', 'program', 'poll', 'event'].map((id) => POSTS[id]).filter((p): p is FeedPost => p != null)
}
