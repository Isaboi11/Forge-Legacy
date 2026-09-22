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
import type { SessionRole } from './endurance.ts';
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

/**
 * The lifting goal inside a RACE build — and it is not `health`.
 *
 * ⚠ THE SAME QUESTION, A DIFFERENT ANSWER, DELIBERATELY. A week the athlete dictated ("run twice, lift
 * three days") names no race, so its lifting is general and `HYBRID_LIFT_GOAL` sends it to `health`. A race
 * build that keeps lifting is the athlete saying both halves out loud — *"strong AND run a sub-25 5K"*,
 * *"marathons and bench 3 plates"* — and what they are protecting is strength. `strengthGoal` overrides it
 * whenever they say otherwise.
 */
export const RACE_LIFT_GOAL: Goal = 'strength';

/**
 * Race week's lifting: kept, and kept off the legs.
 *
 * ⚠ NOT DROPPED, AND NOT THE USUAL DAY EITHER. Dropping it makes race week the one week whose length
 * disagrees with every other week (`schedule_mismatch`, and a calendar the athlete has to re-read);
 * keeping the usual day puts a squat four days before the race. So it becomes one short upper session,
 * which is what a hybrid athlete's race week actually holds. DEFAULT PENDING PO REVIEW.
 */
export const RACE_WEEK_LIFT = { focus: 'upper', maxExercises: 3 } as const;

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
// A RACE THAT KEEPS LIFTING — the interference rules as a TABLE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * How hard a lift day is on the legs.
 *
 *   · `lower_heavy` — it LEADS with a squat or a hinge (`isLowerHeavy`): the movement trained hardest,
 *                     and the one that takes the legs out of tomorrow's run.
 *   · `lower`       — it trains the lower body somewhere in the list but does not lead on it.
 *   · `upper`       — it never asks the legs for anything. The day after a long run wants this one.
 */
export type LiftLoad = 'lower_heavy' | 'lower' | 'upper';

/** Every pattern that asks the legs for work — the test for `lower`, as a list rather than a guess. */
export const LOWER_PATTERNS: readonly string[] = [
  'Squat / Knee Dominant',
  'Hinge / Hip Dominant',
  'Hip Isolation',
  'Calf / Ankle',
];

export const liftLoadOf = (day: DaySkeleton): LiftLoad =>
  isLowerHeavy(day) ? 'lower_heavy' : day.slots.some((s) => LOWER_PATTERNS.includes(s)) ? 'lower' : 'upper';

/**
 * What an endurance session asks of the legs. A race day is read as a long run, because the one rule that
 * matters most in the last week is that nothing heavy sits the day before it.
 */
export type RunDemand = 'long' | 'quality' | 'easy';

export const RUN_DEMAND: Record<SessionRole, RunDemand> = {
  long: 'long',
  race: 'long',
  /* A brick is the triathlon week's long session — its ride IS the long ride (EPS-D11's one a week). */
  brick: 'long',
  tempo: 'quality',
  intervals: 'quality',
  easy: 'easy',
  run_walk: 'easy',
  shakeout: 'easy',
  swim: 'easy',
  bike: 'easy',
};

/**
 * ══ THE INTERFERENCE RULES, AS A TABLE ══
 *
 * Three rows, each saying which lift load may not sit on which side of which session, what that costs when
 * Holt is choosing the order, and the sentence he says when the athlete chose it instead (CA-D12 — his own
 * order obeys the rule, theirs is kept and named once).
 *
 * The costs are ordered rather than measured: protecting the long run beats protecting a quality session,
 * which beats keeping the day after the long run off the legs — and all three beat the tidiness of
 * spreading the lift days out (`INTERFERENCE_COST.sameKindBackToBack`). A cost is never a refusal: the
 * cheapest arrangement is built whatever it scores.
 */
export interface InterferenceRule {
  /** Where the lift day sits relative to the endurance session. */
  where: 'day_before' | 'day_after';
  of: RunDemand;
  /** The lift loads this rule will not have there. */
  forbids: readonly LiftLoad[];
  cost: number;
  /** One sentence, when the order is the athlete's and the rule stands. */
  say: (liftDay: string) => string;
}

export const INTERFERENCE_RULES: readonly InterferenceRule[] = [
  {
    where: 'day_before',
    of: 'long',
    forbids: ['lower_heavy'],
    cost: INTERFERENCE_COST.heavyLegsBeforeLongRun,
    say: (d) => CONCERN.heavyLegsBeforeLongRun(d),
  },
  {
    where: 'day_before',
    of: 'quality',
    forbids: ['lower_heavy'],
    cost: 60,
    say: (d) => CONCERN.heavyLegsBeforeQualityRun(d),
  },
  {
    /* The day AFTER the long run is upper or rest — not a lighter leg day, which is the compromise that
       looks reasonable and still lands squats on legs that ran two hours yesterday. */
    where: 'day_after',
    of: 'long',
    forbids: ['lower_heavy', 'lower'],
    cost: 40,
    say: (d) => CONCERN.legsAfterLongRun(d),
  },
];

/**
 * The most lifting days a week can hold beside a race build, by the mileage the block PEAKS at.
 *
 * ⚠ DECIDED FOR THE BLOCK, NOT WEEK BY WEEK. Dropping a lift day in week 9 and putting it back in week 10
 * gives the athlete a program whose shape changes under them — and a week that disagrees with every other
 * week about its own length. So the whole block gets the lifting its hardest running week can carry, and
 * Holt says once that it is fewer days than they asked for.
 *
 * The numbers are the mainstream hybrid compromise: four lifting days beside twenty miles a week is a
 * lifter who runs, one beside fifty is a runner who lifts, and the middle is where most people asking this
 * question actually live. DEFAULT PENDING PO REVIEW.
 */
export const LIFT_DAYS_AT_PEAK_MI: readonly { fromMi: number; liftDays: number }[] = [
  { fromMi: 45, liftDays: 1 },
  { fromMi: 35, liftDays: 2 },
  { fromMi: 25, liftDays: 3 },
  { fromMi: 0, liftDays: 4 },
];

export const liftDaysAtPeak = (peakMi: number): number =>
  LIFT_DAYS_AT_PEAK_MI.find((r) => peakMi >= r.fromMi)?.liftDays ?? 1;

/**
 * A triathlon week holds two lifting days at most, whatever the mileage says.
 *
 * Three disciplines already fill the week, and the run leg's mileage — the only thing `LIFT_DAYS_AT_PEAK_MI`
 * can read — is 20% of it (EPS-D11). Reading a triathlon's load off its running would let a swim-and-bike
 * heavy week look empty. DEFAULT PENDING PO REVIEW.
 */
export const TRI_LIFT_DAYS_MAX = 2;

/**
 * The fewest running days a race block can be honest at, whatever the lifting wants.
 *
 * ⚠ THE LONGER THE RACE, THE LESS A TWO-DAY WEEK CAN SAY. A 5K off two runs a week is thin but real; a
 * marathon off two is a long run and one other thing, which is not marathon preparation whatever the
 * mileage adds up to. Capped at one day below the week the athlete asked for, so that asking for lifting
 * always gets at least one lifting day — the alternative is a race plan that silently ignores half the
 * request.
 *
 * `MIN_ENDURANCE_DAYS` is the hard floor underneath all of it: two is what `composeRunWeek` itself will not
 * go below, so a race block asking for one running day would get two and a week that disagreed with its
 * own day count.
 */
export const MIN_ENDURANCE_DAYS = 2;

export const MIN_RACE_RUN_DAYS: Record<string, number> = {
  run_5k: 2,
  run_10k: 3,
  run_half: 3,
  run_marathon: 4,
  triathlon: 3,
};

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
  heavyLegsBeforeQualityRun: (liftDay: string): string =>
    `${liftDay} sits the day before a quality run, so that run will feel heavier than it should — swap them if you can, and if you can't, keep the run to effort rather than pace.`,
  legsAfterLongRun: (liftDay: string): string =>
    `${liftDay} lands the day after your long run, which is the one day your legs have nothing to give — move it if you can, and if you can't, take the first set lighter than you think you need to.`,
  liftDaysTrimmed: (asked: number, built: number, peakMi: number): string =>
    built === 0
      ? "There isn't a day left for lifting once the running has what a race needs — give me one more day in the week and the first lift goes in."
      : `I've kept ${built} lifting day${built === 1 ? '' : 's'} rather than ${asked}: the running peaks near ${Math.round(peakMi)} miles a week and that week still has to be trainable. Say the word and I'll put ${asked} back.`,
  raceNeedsTwoRuns: (): string =>
    "One running day a week won't build to a race, so I've written this as a run-and-lift week rather than a race block — give me a second running day and I'll build it backwards from the date.",
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
