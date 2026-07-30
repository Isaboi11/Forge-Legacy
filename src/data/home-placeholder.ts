import type { HomeData } from '@/types/home'

/**
 * Static placeholder data for H-1 Home v2 prototype's Mission Card.
 * Scenario: athlete mid-chapter, on an active program — the "standard" H-1
 * state. Content matches `Forge Home.dc.html` exactly for visual parity;
 * wire to the real Chapter/Program data source when the backend integration
 * lands. Squad/friend live-presence data lives separately in
 * `presence-live.ts` (0086) — it's a dynamic feed, not static content.
 */
export const HOME_DATA: HomeData = {
  mission: {
    weekLabel: 'Week 6',
    chapterName: 'Chapter III · The Rebuild',
    forgingSinceLabel: 'Forging since March 2026',
    tags: ['Powerbuilding'],
    goal: { label: 'Squat 180 kg' },
    program: {
      name: 'Powerbuilding · Intermediate',
      workoutsComplete: 12,
      workoutsTotal: 32,
    },
    todaySession: {
      title: 'Push Day A',
      meta: '6 exercises · Chest & Shoulders',
    },
  },
}

/**
 * Forge Principles — original, unattributed; rotates at most once per day
 * (deterministic by calendar day, no repeats within the 8-entry cycle).
 * Ported verbatim from Forge Home.dc.html. Distinct from — and a smaller,
 * design-authored set than — the full Homepage-Principles-Library-v1.0.md;
 * reconciling the two is a follow-up (see implementation summary).
 */
export const HOMEPAGE_PRINCIPLES: readonly string[] = [
  'You are not counting workouts. You are becoming someone.',
  'History is permanent. Memories can be added. Outcomes cannot change.',
  'Train for the person you intend to become.',
  'The number fades. The discipline remains.',
  'A legacy is built in the sessions no one applauds.',
  'You are the protagonist. This is only the record.',
  'Strength is the habit that outlives the motivation.',
  'What you forge today, you carry for years.',
]

export function todaysPrinciple(date: Date = new Date()): string {
  const dayIndex = Math.floor(date.getTime() / 86_400_000)
  return HOMEPAGE_PRINCIPLES[dayIndex % HOMEPAGE_PRINCIPLES.length]
}

/**
 * Chapter identity for the Home title block. PLACEHOLDER — no Chapter/Legacy
 * backend exists yet (L-series). `number`/`name` mirror the split of
 * `HOME_DATA.mission.chapterName`; `weekDay` is placeholder (day isn't tracked).
 */
export const HOME_CHAPTER = {
  number: 'Chapter III',
  name: 'The Rebuild',
  weekDay: 'Week 6 · Day 2',
} as const

/**
 * A friend's latest update for the "Your Circle" card. PLACEHOLDER — no Social
 * feed backend exists yet; swap for the real Friends feed once one lands.
 */
export const FRIEND_ACTIVITY = {
  name: 'Diego',
  quote: 'Squat finally moved — 100 kg for a clean triple.',
} as const
