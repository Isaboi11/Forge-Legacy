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
  top_lift: { name: string; weight: number | null; reps: number | null; day?: string | null } | null;

  /*
   * ⚠ EVERY FIELD BELOW IS OPTIONAL, AND NOT OUT OF CAUTION — REVIEWS ARE FROZEN.
   *
   * `ensure_weekly_review()` returns a stored row untouched once written, and 0191 does not backfill.
   * So every review generated before 0191 carries the original seven fields and will carry them
   * forever. A reader that assumes `sessions` exists renders an empty section, or crashes, on every
   * week the athlete has already read. `?` here is the type system stating a fact about history.
   */
  sessions?: readonly { name: string; day: string; duration_sec: number | null }[];
  /** Exercises performed for the first time EVER — capped at 6, and empty on an athlete's first week. */
  first_time?: readonly { exercise: string }[];
  longest_session?: { name: string; day: string; duration_sec: number | null } | null;
}

/**
 * How the week reads, before any wording is chosen.
 *
 * ⚠ THE BANDS ARE ABOUT SHAPE, NOT QUALITY. `steady` is not "mediocre" — it is the most common real
 * week and the one most training is actually made of. Nothing here ranks them.
 */
/**
 * ══ THE WEEK'S HEADLINE — the rarest thing that happened, not the biggest number ══
 *
 * PO: *"I want to make weekly and monthly reviews more meaningful and emotionally pulling. Not just
 * numbers."* The diagnosis was that the emotional content lives in the sections that are usually EMPTY
 * — most weeks are three sessions, no PR, no honor — so everything guaranteed to appear is a total, and
 * a total is unfeelable. 38,420 lb is not a memory. "Back Squat — 225 × 5" is.
 *
 * ⚠ AND THE SCREEN ALREADY ARGUED AGAINST PROMOTING THE HEAVIEST LIFT, correctly:
 *
 *   > "HEAVIEST IS A ROW, NOT A HERO. It is the fallback fact — the thing Holt names only when there is
 *   >  no honor and no PR — so it is on almost every week and is the most ordinary line here. Giving it
 *   >  the largest figure on the screen would rank the week's most common event above its rarest."
 *
 * Both are right, and this is what reconciles them: **the hero is whatever is RAREST on that week.** An
 * honor outranks a PR, a PR outranks the heaviest lift. So the heaviest lift never displaces something
 * scarcer — it only leads a week that had nothing scarcer, which is exactly the week that currently
 * opens with four totals and nothing else.
 *
 * ⚠ IT RETURNS NULL RATHER THAN INVENTING ONE. A cardio-only week has no `top_lift`, no PR and no honor.
 * The screen then opens on the stats as it always did; a headline that says "you trained" is a headline
 * that says nothing while occupying the space of something that did.
 */
export type HeroKind = 'honor' | 'pr' | 'lift' | 'session';

export interface WeekHero {
  kind: HeroKind;
  /** The uppercase eyebrow above it — what KIND of thing this is. */
  eyebrow: string;
  /** The thing itself. An exercise name, an honor name, a session name. */
  title: string;
  /** The load, when there is one. Formatted by the caller, which owns units. */
  weight: number | null;
  reps: number | null;
  /** True when this hero is the ONLY member of its section, so the section below can be dropped. */
  solo: boolean;
  /*
   * ⚠ OPTIONAL BECAUSE HISTORY IS. `top_lift.day` arrived with 0191 and reviews are frozen, so a week
   * generated before it has a heaviest lift and no idea which day it happened on. "Wednesday — Back
   * Squat" is the version worth reading; "Back Squat" is what an older week can honestly offer.
   */
  day?: string | null;
  /** Only the session hero carries one. */
  durationSec?: number | null;
}

export function weekHero(d: WeeklyReviewData): WeekHero | null {
  if (d.honors.length > 0) {
    return { kind: 'honor', eyebrow: 'Honor earned', title: d.honors[0].honor,
             weight: null, reps: null, solo: d.honors.length === 1 };
  }
  if (d.prs.length > 0) {
    return { kind: 'pr', eyebrow: 'Personal record', title: d.prs[0].exercise,
             weight: d.prs[0].value, reps: null, solo: d.prs.length === 1 };
  }
  /* ⚠ A `top_lift` with no weight is not a headline. Bodyweight work records `weight: null` here (0140
     stores what was lifted, and a dip carries nothing), and "Dip — " is not a fact worth the largest
     type on the screen. It stays in its row below. */
  if (d.top_lift && d.top_lift.weight != null) {
    return { kind: 'lift', eyebrow: 'Heaviest', title: d.top_lift.name,
             weight: d.top_lift.weight, reps: d.top_lift.reps, solo: true,
             day: d.top_lift.day ?? null };
  }
  /*
   * ⚠ THE CARDIO-ONLY WEEK, WHICH USED TO GET NOTHING. No honor, no PR, no loaded set — so every branch
   * above declines and the screen opened on four totals, one of which was legitimately `0 lb`. The long
   * session is frequently that week's actual story, and it is a real event with a real day.
   * Still null when 0191 has not run for this athlete's week: an OLD review carries no `longest_session`,
   * and inventing a headline from `workouts: 3` would be a sentence that says nothing.
   */
  if (d.longest_session && (d.longest_session.duration_sec ?? 0) > 0) {
    return { kind: 'session', eyebrow: 'Longest session', title: d.longest_session.name,
             weight: null, reps: null, solo: true, day: d.longest_session.day ?? null,
             durationSec: d.longest_session.duration_sec ?? null };
  }
  return null;
}

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
  /* ⚠ ABSENT ON EVERY REVIEW WRITTEN BEFORE 0191, and they are never rewritten. `?? []` is not defensive
     padding — it is the only correct reading of a frozen snapshot that predates the field. */
  const firsts = d.first_time ?? [];

  parts.push(fill(pickFrom(`wr:open:${shape}`, OPENER[shape], choose ?? rand), { n: d.workouts, d: d.days_trained }));

  // The least ordinary true thing, and only one of them — three facts in a row is a report, not a coach.
  if (d.honors.length > 0) {
    parts.push(fill(pickFrom('wr:honor', HONOR_LINE, choose ?? rand), { honor: d.honors[0].honor }));
  } else if (d.prs.length === 1) {
    parts.push(fill(pickFrom('wr:pr1', PR_ONE, choose ?? rand), { lift: d.prs[0].exercise }));
  } else if (d.prs.length > 1) {
    parts.push(fill(pickFrom('wr:prN', PR_MANY, choose ?? rand), { n: d.prs.length }));
  } else if (firsts.length === 1) {
    parts.push(fill(pickFrom('wr:first1', FIRST_ONE, choose ?? rand), { lift: firsts[0].exercise }));
  } else if (firsts.length > 1) {
    parts.push(fill(pickFrom('wr:firstN', FIRST_MANY, choose ?? rand), { n: firsts.length }));
  } else if (d.top_lift?.weight != null && d.top_lift.weight > 0) {
    parts.push(fill(pickFrom('wr:top', TOP_LINE, choose ?? rand), { lift: d.top_lift.name, weight: `${d.top_lift.weight} lb` }));
  }

  /*
   * ══ WHAT THE WEEK SETS UP — approved by the PO, 2026-09-03 ══
   *
   * §0 bars comparison and permits *"what it sets up"*, and that clause had never been used. The line
   * the PO approved, in one sentence: **he may say what the week makes possible, never how it measured
   * up.** So "that squat is asking for more" is in; "your best week this month" is not.
   *
   * ⚠ IT REPLACES THE CLOSE RATHER THAN JOINING IT. The brief specifies 2–3 sentences; opener + fact +
   * sets-up + close is four, and the forward line lands hardest when it is the last thing read.
   *
   * ⚠ IT IS EARNED, NOT DEFAULT. A week with no first, no PR and no loaded lift gets the ordinary close.
   * "Next week starts from here" is true of every week ever and is therefore worth nothing.
   *
   * ⛔ AND IT NAMES NO NUMBER. The PO's own example was *"that squat is asking for 235"*, and 235 is a
   * PROGRESSION DECISION — it belongs to `progression.ts`, which is what actually prescribes the next
   * session. A copy table inventing its own target would tell an athlete a number the app then does not
   * give them, which is worse than saying no number at all.
   */
  const setsUp = setsUpLine(d, firsts, choose ?? rand);
  parts.push(setsUp ?? pickFrom(`wr:close:${shape}`, CLOSE[shape], choose ?? rand));
  return parts.join(' ');
}

function setsUpLine(d: WeeklyReviewData, firsts: readonly { exercise: string }[], choose: Chooser): string | null {
  if (firsts.length > 0) return fill(pickFrom('wr:up:first', SETS_UP_FIRST, choose), { lift: firsts[0].exercise });
  if (d.prs.length > 0) return fill(pickFrom('wr:up:pr', SETS_UP_PR, choose), { lift: d.prs[0].exercise });
  if (d.top_lift?.weight != null && d.top_lift.weight > 0) {
    return fill(pickFrom('wr:up:top', SETS_UP_LIFT, choose), { lift: d.top_lift.name });
  }
  return null;
}

/*
 * A FIRST IS THE LINE AN ORDINARY WEEK CAN ACTUALLY EARN. PRs are rare; firsts are common, because
 * people try new movements constantly — which is exactly why they belong in a coach's mouth on the week
 * that has nothing else in it. Ranked below a PR and above the heaviest lift: doing something you have
 * never done is a bigger event than lifting the most you lifted that week.
 */
const FIRST_ONE: readonly string[] = [
  'You did your first {lift}.',
  'First {lift} in the book.',
  'New movement this week — {lift}.',
];

const FIRST_MANY: readonly string[] = [
  '{n} movements you had never done before.',
  'You tried {n} new things this week.',
  '{n} firsts in there.',
];

/* ⚠ FORWARD, NEVER BACKWARD. Each of these says what is now possible. None of them ranks the week,
   compares it to another, or names a number the progression engine has not chosen. */
const SETS_UP_FIRST: readonly string[] = [
  'That is a movement you have now — see what it does with a few weeks on it.',
  '{lift} is in your training now. Give it room to develop.',
  'Something new went into the training this week. Keep it there.',
];

const SETS_UP_PR: readonly string[] = [
  'That is the floor now. Build on it.',
  'The {lift} has more in it. You found where it starts.',
  'You know what that lift can do now. Take it from there.',
];

const SETS_UP_LIFT: readonly string[] = [
  'There is more in that {lift} when you come back to it.',
  'The {lift} is ready for more next time.',
  'That is a solid place to start the {lift} next time.',
];

const rand: Chooser = (n) => Math.floor(Math.random() * n);

/** Every table, for the tests that walk them. */
export const REVIEW_LINES = { OPENER, CLOSE, HONOR_LINE, PR_ONE, PR_MANY, TOP_LINE,
  FIRST_ONE, FIRST_MANY, SETS_UP_FIRST, SETS_UP_PR, SETS_UP_LIFT };

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
 * ══ THE CARD STANDS DOWN AFTER A DAY ══
 *
 * PO: *"Weekly review should disappear after 24 hours."* 0140 is lazy — the row is written on the first
 * app open of a new week and handed back on every call until the next one — so without this the card sat
 * on Home for up to seven days. A review of last week is read once; after a day it is furniture.
 *
 * ⚠ MEASURED FROM WHEN IT APPEARED, NOT FROM MONDAY. The two are the same thing only for an athlete who
 * opens the app on Monday. Someone who first opens it on Wednesday first SEES the review on Wednesday,
 * and a window anchored to the week's end would have expired before they ever laid eyes on it — the card
 * would exist for nobody, which is a worse bug than the one being fixed and a silent one. `created_at`
 * (0152) is the moment it became visible, so it is the only honest start.
 *
 * Expiry belongs to the CARD, not to the week: `/weekly-review/[week]` still opens the review, and the
 * row is never deleted. This decides one thing — whether Home is still offering it.
 *
 * A missing or unparseable timestamp reads as OPEN. That is the safe failure: an unapplied 0152 returns
 * no `created_at`, and the wrong answer there is to make every athlete's review vanish.
 */
export const REVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export function reviewWindowOpen(createdAtISO: string | null | undefined, now: number = Date.now()): boolean {
  if (!createdAtISO) return true;
  const t = Date.parse(createdAtISO);
  if (!Number.isFinite(t)) return true;
  return now - t < REVIEW_WINDOW_MS;
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
