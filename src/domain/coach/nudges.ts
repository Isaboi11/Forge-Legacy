/**
 * Coach Holt's exploration nudges — WHICH invitation, if any, and when.
 *
 * Planned and signed off in `Docs/Coach-Holt-Exploration-Nudges-Plan.md`. PO: *"Coach holt should invite
 * people to do things they haven't in the app once in a while… Subtly help them explore the app to get
 * more buy in… Plan this out appropriately so it's not annoying."*
 *
 * ══ THE CADENCE IS THE DESIGN ══
 *
 * Everything else here is a lookup table. The numbers below are the whole difference between a coach who
 * helps you find the app and one you learn to ignore — and ignoring the coin is expensive, because it is
 * the SAME object that carries the live coaching mid-workout. A nag here costs us the progression call
 * at the rack.
 *
 * ⚠ PURE, AND RELATIVE `.ts` IMPORTS ONLY — `node --test` cannot resolve `@/`.
 */

export type NudgeId = 'photos' | 'progress' | 'honors' | 'goals' | 'squads' | 'templates' | 'program' | 'metrics';

/** What the athlete has and has not done — `coach_nudge_signals()` (0179), counts only. */
export interface NudgeSignals {
  sessions: number;
  photos: number;
  goals: number;
  templates: number;
  squads: number;
  honors: number;
  weighIns: number;
  programs: number;
}

/** How this athlete has answered one nudge so far. Absent means never offered. */
export interface NudgeRecord {
  shownAt?: string | null;
  dismissedCount?: number;
  dismissedAt?: string | null;
  usedAt?: string | null;
}

export type NudgeHistory = Partial<Record<NudgeId, NudgeRecord>>;

export interface NudgeDef {
  id: NudgeId;
  /** The invitation. Written as a question, because it is one. */
  line: (s: NudgeSignals) => string;
  /** Where "Show me" goes. */
  route: string;
  /** Is there something real here for THIS athlete? */
  eligible: (s: NudgeSignals) => boolean;
}

/* ── THE CADENCE ─────────────────────────────────────────────────────────────────────────────────── */

/** Nothing at all until the main loop is learned. Onboarding is already a tour. */
export const MIN_SESSIONS = 3;
/** One a week is a suggestion; one a session is nagging. */
export const GAP_DAYS = 7;
/** A no today is not a no forever, but it is a no. */
export const DISMISS_COOLDOWN_DAYS = 21;
/** Two refusals is an answer. */
export const MAX_DISMISSALS = 2;

const DAY_MS = 86_400_000;
const daysSince = (iso: string | null | undefined, now: number): number =>
  iso ? (now - new Date(iso).getTime()) / DAY_MS : Infinity;

/* ── THE CATALOGUE ───────────────────────────────────────────────────────────────────────────────── */

/**
 * Order IS priority — the first eligible one wins.
 *
 * ⚠ EVERY ROW FIRES ONLY WHEN THERE IS SOMETHING REAL TO SEE. `honors` is the model: it waits until the
 * athlete has actually earned some. A nudge that says "you've earned honors" to somebody with none is
 * the app manufacturing enthusiasm, and it teaches them the coin lies.
 *
 * ⚠ NOTHING BEHIND THE PAYWALL AND NOTHING SOCIALLY EXPOSING. An invitation to spend money is not an
 * invitation to explore, and it would poison a channel whose only asset is that it has never sold
 * anything. Challenges and friend requests are left out for the same reason in the other direction —
 * they put the athlete in front of other people, which is their call to make unprompted.
 */
export const NUDGES: readonly NudgeDef[] = [
  {
    id: 'photos',
    eligible: (s) => s.photos === 0,
    line: () => 'Most people can’t see their own progress week to week. A photo can. Want to start?',
    route: '/transformation-add',
  },
  {
    id: 'goals',
    eligible: (s) => s.goals === 0,
    line: () => 'Training without a target works. Training with one works better. Want to set one?',
    route: '/goals',
  },
  {
    id: 'honors',
    /* ⚠ "HAS SOME" RATHER THAN "HAS NOT LOOKED". Whether a screen was opened is not something the
       database knows, and inventing that tracking for one nudge is not worth a table. The shown-once
       rule below does the rest of the job: he mentions it a single time, ever. */
    eligible: (s) => s.honors > 0,
    line: (s) => `You’ve earned ${s.honors} ${s.honors === 1 ? 'honor' : 'honors'}. Want to see them?`,
    route: '/honors',
  },
  {
    id: 'program',
    eligible: (s) => s.programs === 0,
    line: () => 'You’ve been going session to session. Want me to build you a program?',
    route: '/coach',
  },
  {
    id: 'templates',
    /* Five sessions in: they have a shape they repeat, and rebuilding it by hand is the cost. */
    eligible: (s) => s.templates === 0 && s.sessions >= 5,
    line: (s) => `You’ve trained ${s.sessions} sessions. Want to save one as a template so you’re not rebuilding it?`,
    route: '/templates',
  },
  {
    id: 'progress',
    eligible: () => true,
    line: () => 'You’ve got a rank building whether you look at it or not. Want to see where you are?',
    route: '/progress-hub',
  },
  {
    id: 'squads',
    eligible: (s) => s.squads === 0,
    line: () => 'Training alone is harder than it needs to be. Want to find a squad?',
    route: '/discover-squads',
  },
  {
    id: 'metrics',
    eligible: (s) => s.weighIns === 0,
    line: () => 'Want to track your weight alongside the lifting?',
    route: '/progress-hub',
  },
];

/* ── THE DECISION ────────────────────────────────────────────────────────────────────────────────── */

/**
 * The nudge to show right now, or null — which is the answer most of the time, and is meant to be.
 *
 * ⚠ THE GAP IS GLOBAL, NOT PER NUDGE. It is measured across every nudge ever shown, so eight of them
 * cannot take turns delivering one a day. That was the whole point of the number.
 *
 * ⚠ `usedAt` RETIRES A NUDGE FOREVER, and the caller must write it the moment the feature is used —
 * taking a photo has to silence the photo nudge instantly, not at the next weekly slot.
 */
export function chooseNudge(signals: NudgeSignals, history: NudgeHistory, now: number): NudgeDef | null {
  if (signals.sessions < MIN_SESSIONS) return null;

  const lastShown = Object.values(history).reduce<number>((min, r) => {
    const d = daysSince(r?.shownAt, now);
    return d < min ? d : min;
  }, Infinity);
  if (lastShown < GAP_DAYS) return null;

  return (
    NUDGES.find((n) => {
      const r = history[n.id];
      if (r?.usedAt) return false;                                      // done — never again
      if ((r?.dismissedCount ?? 0) >= MAX_DISMISSALS) return false;     // asked and answered, twice
      if (daysSince(r?.dismissedAt, now) < DISMISS_COOLDOWN_DAYS) return false;
      /* ⚠ ALREADY SHOWN AND NOT ACTED ON IS NOT A REFUSAL, but it is not a reason to repeat either. A
         nudge shown once and never dismissed simply waits its turn behind the ones never shown. */
      if (r?.shownAt && !r?.dismissedAt) return false;
      return n.eligible(signals);
    }) ?? null
  );
}
