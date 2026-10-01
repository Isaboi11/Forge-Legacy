/**
 * WELCOME BACK — the line Home shows the first time an athlete opens the app after a break.
 *
 * ══ WHY THIS EXISTS ══
 *
 * The moment someone comes back after a missed week is the moment most fitness apps lose them: a broken
 * streak, a "you've been gone 12 days", a dashboard of everything they didn't do. Forge Legacy's answer
 * is the opposite and it is the product's own rule (Product DNA, "Accountability Without Shame"): greet
 * them, and show them what they BUILT, not what they missed.
 *
 * ══ THE RULES (PO 2026-10-01) ══
 *
 *   · A break is 7 or more days since the last saved workout. One missed week is exactly the case.
 *   · Only for someone who has trained before. A brand-new account has nothing to come back to.
 *   · Once per break. Closing it, or logging a workout, ends that break for good; the next break is a
 *     different break (keyed by the workout it started after) and greets them again.
 *   · ⚠ NEVER COUNT THE DAYS. No "12 days", no "since", no streak. The copy below is the whole of it.
 *   · Never a notification. It waits for them to open the app on their own.
 *
 * The squad's weekly recap has its own "Welcome back" chip at 14 days (`domain/squad/week-story.ts`).
 * That one is seen by OTHER people, so it waits longer; this one is private and only for the athlete.
 */

export const WELCOME_BACK_GAP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WelcomeBackInput {
  /** ISO start time of the athlete's newest saved workout, or null if they have never saved one. */
  lastWorkoutAt: string | null;
  /** Now — injected by tests; defaults to the real clock. */
  now?: Date;
  /** The break this device last closed the greeting for (see `breakKey`), or null. */
  dismissedBreak: string | null;
  /** A workout is in progress on this device — they are already back. */
  inProgress?: boolean;
}

/**
 * Which break this is. A break is identified by the workout it started after: the same last workout
 * means the same break, however many times the app is opened during it.
 */
export function breakKey(lastWorkoutAt: string): string {
  return lastWorkoutAt;
}

/** True when the gap between two moments is a break (7+ days). Unparseable input is never a break. */
export function isBreak(fromIso: string, to: Date): boolean {
  const from = Date.parse(fromIso);
  if (Number.isNaN(from)) return false;
  return to.getTime() - from >= WELCOME_BACK_GAP_DAYS * DAY_MS;
}

export function shouldWelcomeBack({ lastWorkoutAt, now, dismissedBreak, inProgress }: WelcomeBackInput): boolean {
  if (!lastWorkoutAt || inProgress) return false;
  if (!isBreak(lastWorkoutAt, now ?? new Date())) return false;
  return dismissedBreak !== breakKey(lastWorkoutAt);
}

/**
 * Workout Complete's one extra line, for the first workout after a break: the gap between the workout
 * before this one and this one. No previous workout means a first-ever session, which is not a comeback.
 */
export function isFirstSessionBack(previousWorkoutAt: string | null, thisWorkoutAt: string): boolean {
  if (!previousWorkoutAt) return false;
  const now = Date.parse(thisWorkoutAt);
  if (Number.isNaN(now)) return false;
  return isBreak(previousWorkoutAt, new Date(now));
}

export const WELCOME_BACK_COPY = {
  eyebrow: 'Welcome back',
  title: (firstName: string | null) => (firstName ? `Good to see you, ${firstName}.` : 'Good to see you.'),
  body: 'Everything you built is right where you left it.',
  firstSessionBack: "First session back. That's the hardest one.",
} as const;

/** "Builder II · 31 workouts · 4 honors" — what they built. Parts with nothing to say are left out. */
export function builtLine(rank: string | null, workouts: number, honors: number): string {
  const parts: string[] = [];
  if (rank) parts.push(rank);
  if (workouts > 0) parts.push(`${workouts} workout${workouts === 1 ? '' : 's'}`);
  if (honors > 0) parts.push(`${honors} honor${honors === 1 ? '' : 's'}`);
  return parts.join(' · ');
}
