/**
 * Run-and-lift weeks, and the sentences Holt says once about an athlete's own program (CA §4.1, CA-D12).
 *
 * ══ A WEEK OF DAYS, NOT A GOAL ══
 *
 * "Run twice, lift three days" (38 of 705 real requests) is neither an endurance plan nor a strength
 * block — it is a week the athlete has already shaped. Lift days come from the strength rulebook, run
 * days are easy runs, and the one new piece of coaching is WHERE they sit relative to each other. That is
 * this file: how runs are sized, what counts as a heavy leg day, and what Holt says when the athlete's
 * own order puts one against the other.
 *
 * ══ ADVICE, NOT WALLS (CA-D12) ══
 *
 * When Holt arranges the week, the interference rule decides the order. When the athlete fixed the
 * order ("run Tuesday and Thursday"), it is kept exactly and the rule becomes one sentence in
 * `concerns` — said once, with the fix, then dropped. Nothing in this file refuses anything.
 *
 * ⚠ THE RUNNING IS MAINTENANCE, NOT A BUILD. A hybrid week holds its run sizes flat across the block: the
 * 10%-a-week ramp and the long-run caps belong to a race plan built backwards from a date
 * (`endurance.ts`), and a week the athlete dictated is not one. Flat never breaks a ramp cap.
 */

import type { Experience, Goal, Limitation } from '../constraints.ts';
import { LIMITATION_LABEL } from '../constraints.ts';
import type { DaySkeleton } from './skeletons.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THE LIFT DAYS ARE FOR
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The lifting goal when the block's goal is a race. A runner who also lifts is lifting to stay strong
 * and unbroken — full-body strength at a sustainable dose, which is what `health` already is. A hybrid
 * week is not a race build, so the race's own goal has no lifting rulebook to lend it.
 */
export const HYBRID_LIFT_GOAL: Partial<Record<Goal, Goal>> = {
  run_5k: 'health',
  run_10k: 'health',
  run_half: 'health',
  run_marathon: 'health',
  triathlon: 'health',
};

export const liftGoalFor = (goal: Goal): Goal => HYBRID_LIFT_GOAL[goal] ?? goal;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SIZING THE RUNS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The share of the athlete's weekly miles the week's LONGEST run takes, by how many runs there are; the
 * rest is split evenly. Five or more is `endurance.ts`'s own `LONG_RUN_SHARE.max` (0.3) — at that
 * frequency a hybrid runner's week looks like a runner's. Fewer runs cannot use 0.3: two runs at 30/70
 * makes the "long" run the short one. So the share rises as the count falls, always leaving one run
 * clearly the longest — which is what gives the interference rule a day to protect.
 */
export const LONG_SHARE_BY_RUNS: Record<number, number> = { 1: 1, 2: 0.6, 3: 0.45, 4: 0.35, 5: 0.3, 6: 0.3, 7: 0.3 };

/** Minutes for a run nobody sized — no miles, no minutes, no weekly mileage to divide. */
export const DEFAULT_RUN_MIN: Record<Experience, number> = { beginner: 20, intermediate: 30, advanced: 40 };

/** Minutes for a cardio day nobody sized. Aerobic, conversational, the same dose as a moderate run. */
export const DEFAULT_CARDIO_MIN = 30;

/**
 * Minutes-to-miles, ONLY to compare a timed run with a measured one when deciding which is longest. It
 * is never written onto a run: a run the athlete sized in minutes stays in minutes.
 */
export const COMPARE_MIN_PER_MI = 10;

/**
 * A run the athlete sized is prescribed as they said it, with no warm-up jog in front — "a mile a day"
 * is a mile, not a ten-minute jog and then a mile. A run Holt sized keeps `endurance.ts`'s warm-up.
 */
export const ATHLETE_SIZED_RUN_HAS_WARMUP = false;

/**
 * A deload week's run, when Holt sized it: the same frequency, less distance — PAS-D8 generalised to
 * mileage, the way the endurance rulebook's step-down week does it. A run the athlete sized is theirs and
 * is not cut.
 */
export const DELOAD_RUN_MULTIPLIER = 0.8;

/** How a swapped-in activity reads in a sentence — "the run days are rides instead". */
export const ACTIVITY_PLURAL: Record<string, string> = {
  bike: 'rides',
  row: 'rows',
  walk: 'walks',
  elliptical: 'elliptical sessions',
  run: 'treadmill runs',
  swim: 'swims',
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// INTERFERENCE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A lift day is a heavy lower-body day when it LEADS with one of these — the first movement is the one
 * trained hardest, and a squat or a deadlift the day before the long run is what takes the legs out of
 * it. A full-body day that opens on a squat counts; an upper day with a calf raise in its tail does not.
 */
export const LOWER_HEAVY_LEADS: readonly string[] = ['Squat / Knee Dominant', 'Hinge / Hip Dominant'];

export const isLowerHeavy = (day: DaySkeleton): boolean => LOWER_HEAVY_LEADS.includes(day.slots[0] ?? '');

/**
 * How Holt scores an arrangement he is free to choose — lower is better. A table so the priorities can be
 * read and argued with: protecting the long run beats everything, back-to-back heavy leg days come next,
 * and spreading the kinds out is a tiebreak.
 */
export const INTERFERENCE_COST = {
  /** A heavy lower-body lift the day before the week's longest run. The rule CA §4.1 names. */
  heavyLegsBeforeLongRun: 100,
  /** Two heavy lower-body days back to back. */
  heavyLegsBackToBack: 10,
  /** Two sessions of the same kind back to back, rest days aside. */
  sameKindBackToBack: 2,
} as const;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT HOLT SAYS — ONCE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Every concern an athlete-authored build can carry, in Holt's voice: one sentence, the fix inside it,
 * and never a refusal. The chat says each once and does not repeat it (CA-D12); the card never shows it.
 */
export const CONCERN = {
  noRestDay: (): string =>
    "Seven days with no rest day is yours to run — if anything starts talking, give me a day off and I'll move things around.",
  oneDay: (): string =>
    "One day a week will hold what you've got more than it builds on it — when you can find a second day, tell me and I'll add it.",
  clampedDays: (asked: number, built: number): string =>
    `I've written ${built} days rather than ${asked} — if ${asked} is what you want, say so and it's yours.`,
  heavyLegsBeforeLongRun: (liftDay: string): string =>
    `${liftDay} the day before your long run will cost you some of that run — swap them if you can, and if you can't, it stays as you wrote it.`,
  heavyLegsUnavoidable: (): string =>
    "However I lay this week out, your long run lands the day after a leg day — keep that run easy and don't chase pace on it.",
  runsSwapped: (activity: string): string =>
    `You told me no running, so the run days are ${activity} instead — say the word and I'll put the runs back.`,
  runsKept: (): string =>
    "You told me no running and asked for the runs anyway, so they're in — if it flares up, stop and tell me.",
  pinHeldLimitation: (name: string, limitation: Limitation | null): string =>
    `${name} works against ${limitation ? `the ${LIMITATION_LABEL[limitation].toLowerCase()} you told me about` : 'what you told me to work around'}, so I've left it out — tell me it's fine and I'll put it back.`,
  pinHeldEquipment: (name: string): string =>
    `${name} needs kit you haven't told me you have — if you've got it, say so and it goes in.`,
  pinHeldExcluded: (name: string): string => `You asked me to leave ${name} out, so it's not in — say if that's changed.`,
  pinNoLiftDay: (name: string): string =>
    `There's no lifting day in that week for ${name} — give me one and it goes there.`,
  pinOverCeiling: (day: string): string =>
    `${day} carries more than I'd put in one session — it's yours as written, but cut a set if it starts dragging.`,
  pinDeload: (week: number): string =>
    `Week ${week} is a lighter week, so your own sets drop there too — they're back to what you wrote the week after.`,
  focusIgnored: (): string => "A mobility block doesn't carry a muscle focus, so I've kept this one about moving well.",
  hybridNotRace: (): string =>
    "This is a run-and-lift week, not a race build — if there's a race, give me the date and I'll build to it.",
} as const;
