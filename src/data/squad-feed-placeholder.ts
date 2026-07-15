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

import type { PersonalRecord } from '@/domain/records/schema'

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
  | (SquadPostBase & { type: 'pr'; record: PersonalRecord; label: string })
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

/** One member's daily check-in state for the "Today's Check-ins" strip (a VIEW of SquadMember). */
export interface SquadCheckin {
  id: string
  name: string
  first: string
  status: CheckinStatus
  hasVideo?: boolean
  unread?: boolean
}

/**
 * The SINGLE source of truth for a squad's members. The roster renders all of it; the check-in
 * strip is a derived VIEW (the members with a check-in record today). So the two Squad Detail
 * sections can never disagree on who is in the squad, and "N members" derives from this list —
 * the same single-source discipline as the comment count. Superset model: `checkin` carries what
 * the strip needs; the roster fields (athleteType / rank / since / accolades) exist only where the
 * squad has rich member data (iron, per Squad Detail.dc.html) — absent elsewhere (name + status
 * only), never invented.
 */
export interface SquadMember {
  id: string
  name: string
  first: string
  isSelf?: boolean
  /** Today's check-in — present only for members with a record today; drives the check-in strip. */
  checkin?: { status: CheckinStatus; hasVideo?: boolean; unread?: boolean }
  athleteType?: string
  rank?: string
  since?: string
  accolades?: string[]
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

export const SQUAD_MEMBERS: Record<string, SquadMember[]> = {
  // iron — the one squad with rich member data (Squad Detail.dc.html MEMBERS). Names match the
  // squad's feed authors + check-in strip. All five carry a check-in today (3 trained, 2 pending).
  iron: [
    { id: 'dana', name: 'Dana Cole', first: 'Dana', athleteType: 'Hybrid Athlete', rank: 'Craftsman', since: 'Jun 2023', accolades: ['Sub-20 5K', 'Century Club'], checkin: { status: 'trained', hasVideo: true, unread: true } },
    { id: 'marcus', name: 'Marcus Vale', first: 'Marcus', athleteType: 'Bodybuilder', rank: 'Architect', since: 'Nov 2022', accolades: ['First Iron', 'Iron Will', '12-Week Cut'], checkin: { status: 'trained' } },
    { id: 'ada', name: 'Ada Ridge', first: 'Ada', isSelf: true, athleteType: 'Powerlifter', rank: 'Architect', since: 'Mar 2023', accolades: ['405 lb Squat Club', '100-Day Streak', 'The Unbroken'], checkin: { status: 'trained' } },
    { id: 'theo', name: 'Theo Brandt', first: 'Theo', athleteType: 'Strongman', rank: 'Legend', since: 'Aug 2021', accolades: ['Atlas Stone PR', 'The Unbroken', 'Century Club'], checkin: { status: 'pending' } },
    { id: 'lena', name: 'Lena Cross', first: 'Lena', athleteType: 'Olympic Lifter', rank: 'Builder', since: 'Jan 2024', accolades: ['Bodyweight Snatch'], checkin: { status: 'pending' } },
  ],
  // dawn — 6 members; only the three with a check-in record today carry `checkin` (the strip shows
  // those). No rich member data at source → name + status only (absent fields never invented).
  dawn: [
    { id: 'sana', name: 'Sana Okafor', first: 'Sana', checkin: { status: 'trained', unread: true } },
    { id: 'ravi', name: 'Ravi Menon', first: 'Ravi', checkin: { status: 'trained' } },
    { id: 'mara', name: 'Mara Lindqvist', first: 'Mara', checkin: { status: 'pending' } },
    { id: 'ines', name: 'Ines Duarte', first: 'Ines' },
    { id: 'colt', name: 'Colt Bergman', first: 'Colt' },
    { id: 'priya', name: 'Priya Anand', first: 'Priya' },
  ],
  // proving / home — no feed or check-in data; roster-only, name only.
  proving: [
    { id: 'kira', name: 'Kira Nash', first: 'Kira' },
    { id: 'omar', name: 'Omar Diaz', first: 'Omar' },
    { id: 'wren', name: 'Wren Holt', first: 'Wren' },
    { id: 'cass', name: 'Cass Lem', first: 'Cass' },
  ],
  home: [{ id: 'iris', name: 'Iris Wong', first: 'Iris' }],
}

export const SQUAD_COMPETITION: Record<string, SquadCompetition | null> = {
  iron: { name: 'Forge League', place: '2nd', of: '5', workouts: 18, gap: '2 workouts behind', ends: '4 days left' },
  dawn: { name: 'Dawn Dash', place: '1st', of: '4', workouts: 24, gap: 'Leading', ends: '6 days left' },
  proving: null,
  home: null,
}

/** Squad-scoped single source — a squad's members never leak to another squad (empty for unknown). */
export function getSquadMembers(squadId: string): SquadMember[] {
  return SQUAD_MEMBERS[squadId] ?? []
}

/**
 * The "Today's Check-ins" strip — DERIVED from the single member source (the members with a
 * check-in record today). So the strip and the roster can never disagree on member identity.
 */
export function getSquadCheckins(squadId: string): SquadCheckin[] {
  const withCheckin = getSquadMembers(squadId).filter(
    (m): m is SquadMember & { checkin: NonNullable<SquadMember['checkin']> } => m.checkin != null,
  )
  return withCheckin.map((m) => ({ id: m.id, name: m.name, first: m.first, status: m.checkin.status, hasVideo: m.checkin.hasVideo, unread: m.checkin.unread }))
}

/** Squad-scoped — the squad's active competition, or null when there is none. */
export function getSquadCompetition(squadId: string): SquadCompetition | null {
  return SQUAD_COMPETITION[squadId] ?? null
}

// ── Squad records (the "record book"): a current holder + a descending history of previous
//    holders per mark. Squad-scoped; holders are real roster members (records ↔ roster consistent).
//    Only iron has a record book at source (per Forge Squad Records.dc.html) — others have none.

export interface SquadRecordEntry {
  holder: string
  value: string
  date: string
}

export interface SquadRecord {
  key: string
  label: string
  holder: string
  value: string
  unit: string
  date: string
  isNew?: boolean
  /** Previous holders, most-recent first. */
  history: SquadRecordEntry[]
}

export const SQUAD_RECORDS: Record<string, SquadRecord[]> = {
  iron: [
    {
      key: 'lift',
      label: 'Heaviest Lift',
      unit: 'lb deadlift',
      isNew: true,
      holder: 'Theo Brandt',
      value: '455',
      date: 'Jan 2026',
      history: [
        { holder: 'Marcus Vale', value: '440', date: 'Nov 2025' },
        { holder: 'Dana Cole', value: '425', date: 'Aug 2025' },
        { holder: 'Lena Cross', value: '410', date: 'Mar 2025' },
      ],
    },
    {
      key: 'session',
      label: 'Biggest Single Session',
      unit: 'lb volume',
      isNew: true,
      holder: 'Ada Ridge',
      value: '31,200',
      date: 'Feb 2026',
      history: [
        { holder: 'Marcus Vale', value: '29,800', date: 'Dec 2025' },
        { holder: 'Theo Brandt', value: '27,500', date: 'Sep 2025' },
        { holder: 'Dana Cole', value: '25,000', date: 'May 2025' },
      ],
    },
    {
      key: 'streak',
      label: 'Longest Streak',
      unit: 'days',
      holder: 'Dana Cole',
      value: '61',
      date: 'Dec 2025',
      history: [
        { holder: 'Ada Ridge', value: '52', date: 'Aug 2025' },
        { holder: 'Marcus Vale', value: '44', date: 'Apr 2025' },
        { holder: 'Theo Brandt', value: '30', date: 'Jan 2025' },
      ],
    },
    {
      key: 'month',
      label: 'Most Workouts / Month',
      unit: 'in a month',
      holder: 'Marcus Vale',
      value: '26',
      date: 'Nov 2025',
      history: [
        { holder: 'Ada Ridge', value: '24', date: 'Jul 2025' },
        { holder: 'Lena Cross', value: '22', date: 'Mar 2025' },
        { holder: 'Theo Brandt', value: '19', date: 'Nov 2024' },
      ],
    },
    {
      key: 'run',
      label: 'Longest Run',
      unit: 'miles',
      holder: 'Lena Cross',
      value: '18.2',
      date: 'Oct 2025',
      history: [
        { holder: 'Dana Cole', value: '16.0', date: 'Jun 2025' },
        { holder: 'Ada Ridge', value: '13.5', date: 'Feb 2025' },
        { holder: 'Marcus Vale', value: '11.0', date: 'Oct 2024' },
      ],
    },
    {
      key: 'prs',
      label: 'Most PRs / Month',
      unit: 'in a month',
      holder: 'Ada Ridge',
      value: '11',
      date: 'Feb 2026',
      history: [
        { holder: 'Theo Brandt', value: '9', date: 'Oct 2025' },
        { holder: 'Marcus Vale', value: '7', date: 'May 2025' },
        { holder: 'Dana Cole', value: '5', date: 'Dec 2024' },
      ],
    },
  ],
  // No record book at source for these squads — honest empty state, never invented.
  dawn: [],
  proving: [],
  home: [],
}

/** Squad-scoped — a squad's record book (empty for squads/unknown ids with no records). */
export function getSquadRecords(squadId: string): SquadRecord[] {
  return SQUAD_RECORDS[squadId] ?? []
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
      record: { exercise: 'Bench Press', measure: { kind: 'load', value: 315, unit: 'lb' } },
      label: 'Squad PR',
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
      record: { exercise: '5K', measure: { kind: 'time', seconds: 1188 } }, // 19:48
      label: 'Squad PR',
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
