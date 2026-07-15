/**
 * ⚠️ PLACEHOLDER squad feed data (S-2 Squad Detail) — ported from the design handoff
 * `forge-squad-posts.js`. NOT real and NOT backed by any social backend.
 *
 * Squads are a narrow, TRAINING-CENTERED surface. The Performance Firewall is LIFTED for a
 * squad's own internal feed (per the LOCKED Squad System Architecture), so squad content is
 * internal training activity — check-ins, PRs, form checks, challenge progress, coordination,
 * announcements. The full Community taxonomy (public events, polls, program/paid-program promo)
 * is INTENTIONALLY ABSENT here, not merely hidden.
 *
 * PER-SQUAD ISOLATION: each squad's feed is keyed by squadId and posts NEVER leak between squads.
 * `getSquadFeed(squadId)` (in post-placeholder.ts) is the only reader and it is squad-scoped — a
 * caller physically cannot read another squad's feed. `proving` / `home` seed no posts (a valid
 * empty feed), which also keeps the isolation test's squads disjoint.
 *
 * ids match the Squads Hub (iron · dawn · proving · home). Author/member names carry display
 * `name` only (Avatar renders initials — no fabricated photos). Streaks/respect/counts are
 * fabricated demo values.
 */

export type SquadRole = 'owner' | 'captain' | null

export interface SquadReply {
  id: string
  author: string
  role: SquadRole
  time: string
  body: string
}

export interface SquadComment {
  id: string
  author: string
  role: SquadRole
  time: string
  body: string
  respect: number
  replies: SquadReply[]
}

interface SquadPostBase {
  id: string
  author: string
  role: SquadRole
  time: string
  respect: number
  body?: string
  comments: SquadComment[]
}

/** Squad-appropriate post kinds only (mirrors forge-squad-posts.js TYPES that appear in the feed). */
export type SquadPost =
  | (SquadPostBase & { type: 'checkin'; streak?: number })
  | (SquadPostBase & { type: 'pr'; achievement: { value: string; exercise: string; label: string } })
  | (SquadPostBase & { type: 'formcheck'; media: { dur: string }; challengeContext?: string })
  | (SquadPostBase & { type: 'challenge'; challenge: { name: string; place: string; of: string; metric: string } })
  | (SquadPostBase & { type: 'announcement' })
  | (SquadPostBase & { type: 'traintogether' })

/** Minimal identity used to build each post's source line (Squad Detail header reads the Hub). */
export interface SquadFeedIdentity {
  name: string
  members: number
}

export const SQUAD_FEED_IDENTITY: Record<string, SquadFeedIdentity> = {
  iron: { name: 'Iron Vigil', members: 5 },
  dawn: { name: 'Dawn Patrol', members: 6 },
  proving: { name: 'The Proving', members: 4 },
  home: { name: 'Home Forge', members: 1 },
}

// ── Squad Detail chrome (S-2 sections above the feed): the daily check-in strip + the active-
//    competition standing banner. Squad-scoped like the feed — a squad's check-ins/competition
//    never leak to another squad. Placeholder; internally consistent with each squad's feed authors.

export type CheckinStatus = 'trained' | 'pending'

/** One member's daily check-in state for the "Today's Check-ins" strip. */
export interface SquadCheckin {
  id: string
  name: string
  first: string
  status: CheckinStatus
  hasVideo?: boolean
  unread?: boolean
}

/** The squad's standing in its active competition (the banner above the feed). */
export interface SquadCompetition {
  name: string
  place: string // '2nd'
  of: string // '5'
  workouts: number
  gap: string // '2 workouts behind' / 'Leading'
  ends: string // '4 days left'
}

export const SQUAD_CHECKINS: Record<string, SquadCheckin[]> = {
  iron: [
    { id: 'dana', name: 'Dana Cole', first: 'Dana', status: 'trained', hasVideo: true, unread: true },
    { id: 'marcus', name: 'Marcus Vale', first: 'Marcus', status: 'trained' },
    { id: 'ada', name: 'Ada Ridge', first: 'Ada', status: 'trained' },
    { id: 'theo', name: 'Theo Brandt', first: 'Theo', status: 'pending' },
    { id: 'lena', name: 'Lena Cross', first: 'Lena', status: 'pending' },
  ],
  dawn: [
    { id: 'sana', name: 'Sana Okafor', first: 'Sana', status: 'trained', unread: true },
    { id: 'ravi', name: 'Ravi Menon', first: 'Ravi', status: 'trained' },
    { id: 'mara', name: 'Mara Lindqvist', first: 'Mara', status: 'pending' },
  ],
  proving: [],
  home: [],
}

export const SQUAD_COMPETITION: Record<string, SquadCompetition | null> = {
  iron: { name: 'Forge League', place: '2nd', of: '5', workouts: 18, gap: '2 workouts behind', ends: '4 days left' },
  dawn: { name: 'Dawn Dash', place: '1st', of: '4', workouts: 24, gap: 'Leading', ends: '6 days left' },
  proving: null,
  home: null,
}

/** Squad-scoped — a squad's check-ins never leak to another squad (empty for unknown/none). */
export function getSquadCheckins(squadId: string): SquadCheckin[] {
  return SQUAD_CHECKINS[squadId] ?? []
}

/** Squad-scoped — the squad's active competition, or null when there is none. */
export function getSquadCompetition(squadId: string): SquadCompetition | null {
  return SQUAD_COMPETITION[squadId] ?? null
}

/** Each squad's OWN feed — distinct content proves there is no cross-squad leak. */
export const SQUAD_SEED: Record<string, SquadPost[]> = {
  iron: [
    {
      id: 'iv_fc',
      type: 'formcheck',
      author: 'Dana Cole',
      role: null,
      time: '3h ago',
      respect: 14,
      body: 'Leg day A — third set at 180kg. Squad eyes only: does my hip rise look early on the last rep?',
      media: { dur: '0:31' },
      challengeContext: 'Forge League · Week 3',
      comments: [
        {
          id: 'c1',
          author: 'Marcus Vale',
          role: 'captain',
          time: '2h ago',
          respect: 5,
          body: 'Hips beat the bar a hair on rep 3. Cue chest-up out of the hole and it cleans up.',
          replies: [{ id: 'c1r1', author: 'Dana Cole', role: null, time: '2h ago', body: 'On it for tomorrow. Filming again.' }],
        },
        { id: 'c2', author: 'Ada Ridge', role: 'owner', time: '1h ago', respect: 3, body: 'Looks strong. That’s two clean check-ins this week — keep it rolling.', replies: [] },
      ],
    },
    {
      id: 'iv_pr',
      type: 'pr',
      author: 'Marcus Vale',
      role: 'captain',
      time: '5h ago',
      respect: 22,
      body: 'New squad best for the month. Bar speed felt easy, which is the scary part.',
      achievement: { value: '315 lb', exercise: 'Bench Press', label: 'Squad PR' },
      comments: [{ id: 'c1', author: 'Theo Brandt', role: null, time: '4h ago', respect: 2, body: 'Monster. That’s the one to beat now.', replies: [] }],
    },
    {
      id: 'iv_ch',
      type: 'challenge',
      author: 'Ada Ridge',
      role: 'owner',
      time: '1d ago',
      respect: 18,
      body: 'Week 3 of the Forge League is in the books — we’re holding 2nd, two workouts behind Marcus. Two more sessions each closes it.',
      challenge: { name: 'Forge League', place: '2nd', of: '5', metric: '5 workouts' },
      comments: [{ id: 'c1', author: 'Lena Cross', role: null, time: '22h ago', respect: 1, body: 'Logging a double tomorrow. Let’s take it.', replies: [] }],
    },
    {
      id: 'iv_ann',
      type: 'announcement',
      author: 'Ada Ridge',
      role: 'owner',
      time: '2d ago',
      respect: 9,
      body: 'Saturday is a squad session at the main floor, 9am. Warm-up starts sharp — bring your logbooks, we’re maxing the mission this week.',
      comments: [],
    },
  ],
  dawn: [
    {
      id: 'dp_ci',
      type: 'checkin',
      author: 'Sana Okafor',
      role: null,
      time: '1h ago',
      respect: 7,
      streak: 11,
      body: 'Checked in — 5:40am tempo run before work. The quiet hour is the whole point.',
      comments: [{ id: 'c1', author: 'Ravi Menon', role: 'captain', time: '48m ago', respect: 2, body: 'That’s eleven straight for you. The streak is unreal.', replies: [] }],
    },
    {
      id: 'dp_pr',
      type: 'pr',
      author: 'Ravi Menon',
      role: 'captain',
      time: '6h ago',
      respect: 19,
      body: 'Finally cracked it on a cold morning. Negative split the whole way.',
      achievement: { value: '19:48', exercise: '5K', label: 'Squad PR' },
      comments: [{ id: 'c1', author: 'Sana Okafor', role: null, time: '5h ago', respect: 3, body: 'Sub-20 before sunrise. Absurd. Congrats.', replies: [] }],
    },
    {
      id: 'dp_tt',
      type: 'traintogether',
      author: 'Mara Lindqvist',
      role: null,
      time: '1d ago',
      respect: 5,
      body: 'Train together — Sun · 6:00 AM · Riverside loop\nEasy 10k, coffee after. All paces welcome.',
      comments: [],
    },
  ],
  proving: [],
  home: [],
}
