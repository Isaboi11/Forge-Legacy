/**
 * ⚠ PLACEHOLDER post fixture for Post Detail (the shared feed-post viewer). There is NO
 * feed/social backend — `getPost` is a stub keyed to demo posts, each exercising one of the
 * dc's typed content blocks. Swap the body for a real fetch (`GET /posts/:id`) when the feed
 * lands; call sites don't change. Author/commenter names + counts are all fabricated demo data.
 *
 * Source of truth: "Post Detail.dc.html".
 */

import type { ShareKind } from '@/domain/share/content'
// The real Phase-0 program structure enum — program plates carry the real schema shape so the
// backend swap is a data change, not a renderer change. Type-only import (erased at runtime, so
// the zero-dep node --test suites don't need the `@/` alias resolved).
import type { ProgramStructure } from '@/domain/training/schema'
// The real PersonalRecord domain model backing the PR plates (§11 unblocked). Type-only (erased).
import type { PersonalRecord } from '@/domain/records/schema'
// Value import (explicit .ts so the zero-dep node --test suites resolve it); the app bundler
// resolves it via allowImportingTsExtensions, same convention as domain/rank-artwork imports.
import { COMMUNITY_DATA } from './community-placeholder.ts'
import type { CommunityPost } from './community-placeholder.ts'
import { SQUAD_SEED, SQUAD_FEED_IDENTITY } from './squad-feed-placeholder.ts'
import type { SquadComment, SquadPost } from './squad-feed-placeholder.ts'

export type PostRole = 'owner' | 'mod' | 'captain'

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
  // PR / achievement plate — backed by the real PersonalRecord domain model (FORGE_DELTAS §11
  // unblocked). `record` is the structured mark (load/time/distance/reps); `label` is the post's
  // framing ("New Personal Record" / "Squad PR"). The renderer derives the display via
  // `formatRecordValue(record.measure)` — the string migrates onto the model, not the reverse.
  | { type: 'achievement'; record: PersonalRecord; label: string }
  | { type: 'honor'; label: string; title: string; sub?: string }
  // Program share = a snapshot of a real Program, carried as the real Phase-0 schema shape:
  // `programId` (the backend-swap ref), `durationWeeks`, `frequencyPerWeek`, and `structure`
  // (the ProgramStructure enum). The renderer formats the meta line from these via
  // `formatProgramMeta` — so swapping in real programs is a DATA change, not a renderer change.
  // EVERY program plate is structured (no free-text `meta` middle state); a field absent at the
  // source stays `undefined` and the formatter omits it (never fabricated). `kindLabel` /
  // `saveLabel` / `savedNote` / `footNote` / `price` are display/CTA fields, not schema.
  | {
      type: 'program'
      programId?: string
      programName: string
      durationWeeks?: number
      frequencyPerWeek?: number
      structure?: ProgramStructure
      price?: string
      kindLabel?: string
      saveLabel?: string
      savedNote?: string
      footNote?: string
    }
  | { type: 'media'; mediaKind: 'photo' | 'video'; duration?: string }
  | { type: 'event'; month: string; day: string; title: string; when: string; going: number }
  | { type: 'poll'; options: { text: string; pct: number; chosen?: boolean }[]; footer: string }
  // ── Squad-only content (additive; the Firewall is lifted for a squad's own internal feed).
  //    New union variants so the ONE shared card/Post Detail renders them — never a squad-only
  //    renderer. The note text rides on `body`; these carry the structured part.
  // Daily check-in — "I trained today"; optional running streak.
  | { type: 'checkin'; streak?: number }
  // Progress in the squad's active challenge (standings stay inside the challenge; this is a report).
  | { type: 'challengeUpdate'; name: string; place: string; of: string; metric: string }
  // Train-together coordination — the when/where rides on `body`; the block adds a Join affordance.
  | { type: 'traintogether' }

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

/** Display labels for the ProgramStructure enum (the renderer never sees the enum directly). */
const STRUCTURE_LABEL: Record<ProgramStructure, string> = {
  upper_lower: 'Upper / Lower',
  ppl: 'Push/Pull/Legs',
  full_body: 'Full Body',
}

/**
 * Format a program plate's meta line from the real structured fields — the ONE place program meta
 * is rendered, so the feed card and Post Detail agree and a backend swap stays a data change.
 * Omits any field the source didn't supply (never fabricated). Shared by both renderers.
 */
export function formatProgramMeta(p: { durationWeeks?: number; frequencyPerWeek?: number; structure?: ProgramStructure }): string {
  const parts: string[] = []
  if (p.durationWeeks != null) parts.push(`${p.durationWeeks} weeks`)
  if (p.structure) parts.push(STRUCTURE_LABEL[p.structure])
  if (p.frequencyPerWeek != null) parts.push(`${p.frequencyPerWeek} days/week`)
  return parts.join(' · ')
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
    content: { type: 'achievement', record: { exercise: 'Back Squat', measure: { kind: 'load', value: 405, unit: 'lb' } }, label: 'New Personal Record' },
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
  // The community seed carries no comment threads (empty is a fine placeholder). `commentCount`
  // DERIVES from the thread — never an independent field that can disagree — so it is 0 here, not
  // the seed's phantom count. (The feed card may show a stored count in the real backend; on
  // seeded data it must equal comments.length, locked by comment-count-consistency.test.mjs.)
  const comments: PostComment[] = []
  const base = {
    id: p.id,
    author: p.author,
    role: p.role,
    timestamp: p.time,
    source: COMMUNITY,
    typeLabel: p.typeLabel,
    body: p.body,
    respect: p.respectCount,
    commentCount: comments.length,
    comments,
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
        content: { type: 'achievement', record: p.record, label: p.label },
      }
    case 'program':
      return {
        ...base,
        content: {
          type: 'program',
          programName: p.programTitle,
          kindLabel: p.programKindLabel,
          durationWeeks: p.durationWeeks,
          frequencyPerWeek: p.frequencyPerWeek,
          structure: p.structure,
          saveLabel: 'Save to Upcoming',
          savedNote: p.savedNote,
        },
      }
    case 'programPaid':
      return {
        ...base,
        content: {
          type: 'program',
          programName: p.programTitle,
          kindLabel: p.programKindLabel,
          durationWeeks: p.durationWeeks,
          frequencyPerWeek: p.frequencyPerWeek,
          structure: p.structure,
          price: p.price,
          saveLabel: 'Get Program',
          footNote: p.footNote,
        },
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

// ─────────────────────────────────────────────────────────────────────────────
// Squad feed (S-2) — a squad's OWN internal training feed. The Firewall is lifted for a squad's
// own surface, so squad content (check-ins / PRs / form checks / challenge progress / train-
// together / announcements) renders through the SAME shared card + Post Detail, via additive
// PostContent variants — never a squad-only renderer. PER-SQUAD ISOLATION is a tested contract:
// getSquadFeed(squadId) returns ONLY that squad's posts. Locked by squad-feed-characterization.
// ─────────────────────────────────────────────────────────────────────────────

const SQUAD_TYPE_LABEL: Record<SquadPost['type'], string> = {
  checkin: 'Check-in',
  pr: 'PR',
  formcheck: 'Form Check',
  challenge: 'Challenge Update',
  announcement: 'Announcement',
  traintogether: 'Train Together',
}

function squadCommentsToPost(comments: SquadComment[]): PostComment[] {
  return comments.map((c) => ({
    id: c.id,
    author: c.author,
    role: c.role ?? undefined,
    time: c.time,
    body: c.body,
    respect: c.respect,
    replies: c.replies.map((r) => ({ id: r.id, author: r.author, role: r.role ?? undefined, time: r.time, body: r.body })),
  }))
}

/** Map one squad post onto the shared FeedPost — additive, no field dropped. */
function squadPostToFeedPost(squadId: string, p: SquadPost): FeedPost {
  const identity = SQUAD_FEED_IDENTITY[squadId]
  const source: PostSource = {
    kind: 'squad',
    name: identity?.name ?? 'Squad',
    sub: `Squad · ${identity?.members ?? 0} members`,
    tag: 'Squad',
  }
  const base = {
    id: p.id,
    author: p.author,
    role: p.role ?? undefined,
    timestamp: p.time,
    source,
    typeLabel: SQUAD_TYPE_LABEL[p.type],
    body: p.body,
    respect: p.respect,
    commentCount: p.comments.length,
    comments: squadCommentsToPost(p.comments),
  }
  switch (p.type) {
    case 'checkin':
      return { ...base, content: { type: 'checkin', streak: p.streak } }
    case 'pr':
      return { ...base, shareType: 'pr', content: { type: 'achievement', record: p.record, label: p.label } }
    case 'formcheck':
      return { ...base, challenge: p.challengeContext, content: { type: 'media', mediaKind: 'video', duration: p.media.dur } }
    case 'challenge':
      return { ...base, content: { type: 'challengeUpdate', name: p.challenge.name, place: p.challenge.place, of: p.challenge.of, metric: p.challenge.metric } }
    case 'announcement':
      return { ...base, content: { type: 'text' } }
    case 'traintogether':
      return { ...base, content: { type: 'traintogether' } }
  }
}

// Per-squad feeds, built once. Keyed by squadId so a read cannot cross squads.
const SQUAD_FEEDS: Record<string, FeedPost[]> = Object.fromEntries(
  Object.entries(SQUAD_SEED).map(([squadId, posts]) => [squadId, posts.map((p) => squadPostToFeedPost(squadId, p))]),
)
const SQUAD_BY_ID: Record<string, FeedPost> = Object.fromEntries(
  Object.values(SQUAD_FEEDS).flat().map((p) => [p.id, p]),
)

/**
 * A single squad's internal feed (demo). Squad-scoped: returns ONLY `squadId`'s posts (empty for
 * an unknown squad or one with no posts) — cross-squad leakage is structurally impossible. Same
 * posts open in Post Detail via `/post/[id]`. Placeholder — no backend (real: GET /squads/:id/feed).
 */
export function getSquadFeed(squadId: string): FeedPost[] {
  return SQUAD_FEEDS[squadId] ?? []
}

/** Demo fetch. Resolves the static demo posts, plus the community + squad feeds, by id. */
export function getPost(id: string): FeedPost | null {
  return POSTS[id] ?? COMMUNITY_BY_ID[id] ?? SQUAD_BY_ID[id] ?? null
}

/**
 * The Friends Feed list (demo). Same posts open in Post Detail via `/post/[id]`, so the feed
 * and detail stay consistent. Placeholder — no feed backend (real: GET /feed/friends).
 */
export function getFriendsFeed(): FeedPost[] {
  return ['pr', 'honor', 'program', 'poll', 'event'].map((id) => POSTS[id]).filter((p): p is FeedPost => p != null)
}
