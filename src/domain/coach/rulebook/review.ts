/**
 * WHAT HOLT MAKES OF YOUR WEEK — derived from the numbers, never written per athlete.
 *
 * ══ THE ASK ══
 *
 * PO: *"the coach can give a weekly review… How this week was and how we did. Encourage on other things
 * and keep people engaged."*
 *
 * ══ ⚠ THE LINE THIS MUST NOT CROSS ══
 *
 * A review is the easiest surface in the app to turn into a scoreboard, and a scoreboard is what
 * `Active-Workout-Flow-Spec-W9-W16` §6.2 and Product DNA §8/§10 both bar. The rule that keeps it a
 * review:
 *
 *   **It states what happened and, where there is one, what it sets up. It never grades the week and
 *   never compares it to another one.**
 *
 *   ✅ "Four sessions and a PR on the bench. That is a week that moves things."
 *   ❌ "Down two sessions from last week."  (a comparison — the migration deliberately stores none)
 *   ❌ "Only two sessions."  ("only" is a judgement)
 *
 * A week with nothing in it produces no review at all — the row is never written (see 0140, "silence
 * beats zero"), so there is no such thing here as a discouraging one.
 *
 * ══ WHY IT IS A TABLE ══
 *
 * `rulebook/rationale.ts` is the structural precedent: three tables keyed by what is actually true,
 * composed into one sentence. Prose written per honor or per week drifts from the numbers it describes;
 * prose selected BY the numbers cannot.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import { pickFrom, type Chooser } from './voice.ts';

/** The shape 0140 stores in `athlete_weekly_reviews.review`. */
export interface WeeklyReviewData {
  workouts: number;
  days_trained: number;
  volume_lb: number;
  duration_sec: number;
  prs: readonly { exercise: string; value: number | null }[];
  honors: readonly { honor: string }[];
  top_lift: { name: string; weight: number | null; reps: number | null } | null;
}

/**
 * How the week reads, before any wording is chosen.
 *
 * ⚠ THE BANDS ARE ABOUT SHAPE, NOT QUALITY. `steady` is not "mediocre" — it is the most common real
 * week and the one most training is actually made of. Nothing here ranks them.
 */
export type WeekShape = 'single' | 'steady' | 'full' | 'heavy';

/** ⚠ Thresholds describe frequency only. They never move because of volume — a heavy week of two
 *  sessions is still a two-session week, and pretending otherwise is how a number becomes a grade. */
export function shapeOf(d: Pick<WeeklyReviewData, 'workouts'>): WeekShape {
  if (d.workouts <= 1) return 'single';
  if (d.workouts <= 3) return 'steady';
  if (d.workouts <= 5) return 'full';
  return 'heavy';
}

const OPENER: Record<WeekShape, readonly string[]> = {
  single: ['One session in the book.', 'You got one in.', 'A single session this week.'],
  steady: ['{n} sessions this week.', '{n} times in the gym.', 'You trained {n} times.'],
  full: ['{n} sessions — a full week.', '{n} times in, across {d} days.', 'A full week: {n} sessions.'],
  heavy: ['{n} sessions. That is a heavy week.', '{n} times in the gym this week.', '{n} sessions across {d} days.'],
};

/**
 * The second beat — what the week produced, if it produced something nameable.
 *
 * ⚠ ORDERED BY WHAT IS RAREST, not by what is biggest. An honor is rarer than a PR and a PR is rarer
 * than a heavy top set, so the line names the least ordinary true thing rather than the largest number.
 */
const HONOR_LINE: readonly string[] = ['You earned {honor} along the way.', '{honor} came out of it.', 'And {honor} with it.'];
const PR_ONE: readonly string[] = ['A personal record on {lift}.', 'You set a record on {lift}.', '{lift} went to a new best.'];
const PR_MANY: readonly string[] = ['{n} personal records in it.', '{n} new bests this week.', 'You set {n} records.'];
const TOP_LINE: readonly string[] = ['Heaviest was {lift} at {weight}.', 'Your top set was {weight} on {lift}.', '{weight} on {lift} was the heaviest of it.'];

/** The close — forward-looking, never a verdict on what just happened. */
const CLOSE: Record<WeekShape, readonly string[]> = {
  single: ['Same again this week and it starts to be a habit.', 'Put another beside it.', 'One more like it and it is a pattern.'],
  steady: ['Keep it there.', 'That is the rhythm — hold it.', 'Same again this week.'],
  full: ['That is a week that moves things.', 'Hold that and the numbers follow.', 'Keep that up.'],
  heavy: ['Make sure the rest matches the work.', 'That is plenty — let it settle in.', 'Recovery earns that back.'],
};

const fill = (line: string, tokens: Record<string, string | number>): string =>
  line.replace(/\{(\w+)\}/g, (_m, k: string) => String(tokens[k] ?? ''));

/**
 * Holt's read on the week — two or three sentences, composed once and then stored.
 *
 * ⚠ COMPOSED ONCE. 0140 keeps the numbers frozen and `set_weekly_review_note` accepts a note only while
 * one is absent, so the sentence cannot re-word itself on a later read. A summary whose prose changed
 * under the athlete would not be the record the table promises.
 */
export function reviewNote(d: WeeklyReviewData, choose?: Chooser): string {
  const shape = shapeOf(d);
  const parts: string[] = [];

  parts.push(fill(pickFrom(`wr:open:${shape}`, OPENER[shape], choose ?? rand), { n: d.workouts, d: d.days_trained }));

  // The least ordinary true thing, and only one of them — three facts in a row is a report, not a coach.
  if (d.honors.length > 0) {
    parts.push(fill(pickFrom('wr:honor', HONOR_LINE, choose ?? rand), { honor: d.honors[0].honor }));
  } else if (d.prs.length === 1) {
    parts.push(fill(pickFrom('wr:pr1', PR_ONE, choose ?? rand), { lift: d.prs[0].exercise }));
  } else if (d.prs.length > 1) {
    parts.push(fill(pickFrom('wr:prN', PR_MANY, choose ?? rand), { n: d.prs.length }));
  } else if (d.top_lift?.weight != null && d.top_lift.weight > 0) {
    parts.push(fill(pickFrom('wr:top', TOP_LINE, choose ?? rand), { lift: d.top_lift.name, weight: `${d.top_lift.weight} lb` }));
  }

  parts.push(pickFrom(`wr:close:${shape}`, CLOSE[shape], choose ?? rand));
  return parts.join(' ');
}

const rand: Chooser = (n) => Math.floor(Math.random() * n);

/** Every table, for the tests that walk them. */
export const REVIEW_LINES = { OPENER, CLOSE, HONOR_LINE, PR_ONE, PR_MANY, TOP_LINE };

// ─────────────────────────────────────────────────────────────────────────────
// WHICH WEEK IT WAS
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * ⚠ PARSED BY HAND, NEVER `new Date(iso)`.
 *
 * `new Date('2026-08-03')` is specified to parse as UTC midnight, so west of Greenwich every
 * `getDate()` off it returns the day BEFORE. 0140 buckets these dates in the athlete's own timezone
 * precisely so the week is theirs — running them back through a UTC parse would undo that at the last
 * step and label the review with the wrong days.
 */
function parts(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { y: Number(m[1]), m: month, d: Number(m[3]) };
}

/**
 * "3 – 9 August 2026" · "27 July – 2 August 2026" · "29 December 2025 – 4 January 2026".
 *
 * The month is named once when both ends share it, which is the common case — a week that reads as one
 * span rather than two dates. Pass `year: false` where the surface is already anchored in time (the Home
 * card is about last week by definition; the screen it opens is not).
 *
 * Falls back to the raw ISO pair rather than throwing: a malformed date should look wrong, not crash a
 * screen the athlete opened to read about their training.
 */
export function formatWeekRange(startISO: string, endISO: string, opts?: { year?: boolean }): string {
  const a = parts(startISO);
  const b = parts(endISO);
  if (!a || !b) return `${startISO} — ${endISO}`;

  const year = opts?.year !== false;
  if (a.y !== b.y) return `${a.d} ${MONTHS[a.m]} ${a.y} – ${b.d} ${MONTHS[b.m]} ${b.y}`;

  const tail = year ? ` ${b.y}` : '';
  if (a.m !== b.m) return `${a.d} ${MONTHS[a.m]} – ${b.d} ${MONTHS[b.m]}${tail}`;
  return `${a.d} – ${b.d} ${MONTHS[b.m]}${tail}`;
}
