/**
 * Homepage Principles — the rotating inscription on Home (`Homepage-Principles-Architecture-v1.0`).
 *
 * This is authored CONTENT, not stand-in data: the lines are the product's own, they are the same for
 * every athlete by design, and there is nothing behind them to read. That is why it is the only thing
 * left in a file that used to be called a placeholder and behaved like one.
 *
 * THREE THINGS WERE DELETED FROM HERE, all of them claims about the athlete:
 *
 *   · `HOME_DATA` — a mission block carrying "Chapter III · The Rebuild", "Week 6", "Forging since March
 *     2026" and a goal. By the end it had no code consumers at all, only stale comments pointing at it,
 *     and it was still shipping in the bundle.
 *   · `HOME_CHAPTER` — the same invented chapter, ordinal and week, rendered on Home's title block for
 *     every athlete past their first workout. `fetchHomeChapter()` (home-live.ts) reads their own.
 *   · `FRIEND_ACTIVITY` — a hardcoded quote from an invented friend, shown in Your Circle as though
 *     someone in your circle had said it. Home reads the real friends feed (0074).
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

/** Same line all day, a new one tomorrow — the day index, not the clock. */
export function todaysPrinciple(date: Date = new Date()): string {
  const dayIndex = Math.floor(date.getTime() / 86_400_000)
  return HOMEPAGE_PRINCIPLES[dayIndex % HOMEPAGE_PRINCIPLES.length]
}
