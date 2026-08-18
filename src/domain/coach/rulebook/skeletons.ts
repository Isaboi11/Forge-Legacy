/**
 * The shape of a week, by goal and by how many days there are to fill it.
 *
 * ══ THIS FILE IS THE COACHING ══
 *
 * Everything else in `domain/coach` is machinery: filters, sorts, clamps. This is the part that holds an
 * opinion — that a 4-day strength week is upper/lower twice rather than a bro split, that a leg day opens
 * with a squat pattern and not a calf raise, that a conditioning day earns its cardio at the end and not
 * the start. Change a table here and every program the coach builds changes. That is the intent: the
 * knowledge is data, so it can be read, argued with, and corrected by someone who is not reading TypeScript.
 *
 * ══ WHERE THE OPINIONS COME FROM ══
 *
 * The repo's own thirteen authored programs and five family-research docs, transcribed rather than
 * invented — `strength-foundation-i-3day` is full-body three times a week, `strength-foundation-ii-4day`
 * is upper/lower twice, `full-frame-5day` and `close-quarters-6day` are push/pull/legs.
 *
 * ══ ⚠ SLOT LISTS MUST OUTRUN THE LONGEST SESSION ══
 *
 * A day lists more patterns than it will use and the assembler takes as many as the session length and
 * the PAS-D11 band allow. That only works if the list is LONGER than the biggest budget — and originally
 * it was not. Every list held five or six slots, so a 45-minute session, a 60-minute one and a 75-minute
 * one all produced five exercises: the athlete paid for half an hour more and got the same workout,
 * because the plan had run out of things to say. Lists now run to eight.
 *
 * A pattern may appear twice in a list. That is not a mistake — `used` blocks the same EXERCISE, not the
 * same pattern, so a second `Horizontal Push` is a second, different pressing movement, which is exactly
 * what a longer chest day is.
 */

import { ENDURANCE_GOALS, type Goal } from '../constraints.ts';

/** A day's plan: what to call it, and which movement patterns it wants, in priority order. */
export interface DaySkeleton {
  name: string;
  /** Catalogue `movementPattern` values. `candidates.fillSlot` turns each into an exercise. */
  slots: readonly string[];
  /** Cardio to finish on, when the goal wants it. Activity is chosen against what the athlete can use. */
  cardioFinisher?: { minutes: number };
  /**
   * What this day is FOR — an AND of ORs, each group needing at least one trainable pattern.
   *
   * ⚠ WITHOUT THIS, A SPLIT LIES ABOUT ITSELF. A bodyweight athlete with no bar has no vertical or
   * horizontal pull, so a "Back & Biceps" day filled whatever it could reach and shipped a hamstring
   * curl and a plank under that name. The day was not thin — it was *not a back day*, while still being
   * called one, which is worse than any gap.
   *
   * A day whose requirements cannot be met means the whole SPLIT is wrong for this room, and the honest
   * response is to restructure rather than to fill the hole. `viabilityOf` decides that; `assemble`
   * falls back to full body and says so in Holt's own words.
   *
   * Full-body days declare nothing — they are the fallback precisely because they are always viable.
   */
  requires?: readonly (readonly string[])[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// REUSABLE DAYS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const PUSH: DaySkeleton = {
  name: 'Push',
  slots: [
    'Horizontal Push',
    'Vertical Push',
    'Horizontal Push',
    'Shoulder Isolation',
    'Elbow Extension',
    'Elbow Extension',
    'Shoulder Isolation',
    'Core',
  ],
  requires: [['Horizontal Push', 'Vertical Push'], ['Elbow Extension', 'Shoulder Isolation']],
};

const PULL: DaySkeleton = {
  name: 'Pull',
  slots: [
    'Vertical Pull',
    'Horizontal Pull',
    'Vertical Pull',
    'Shoulder Isolation',
    'Elbow Flexion',
    'Elbow Flexion',
    'Horizontal Pull',
    'Core',
  ],
  requires: [['Vertical Pull', 'Horizontal Pull'], ['Elbow Flexion']],
};

const LEGS: DaySkeleton = {
  name: 'Legs',
  slots: [
    'Squat / Knee Dominant',
    'Hinge / Hip Dominant',
    'Squat / Knee Dominant',
    'Hip Isolation',
    'Hinge / Hip Dominant',
    'Calf / Ankle',
    'Core',
    'Hip Isolation',
  ],
  requires: [['Squat / Knee Dominant', 'Hinge / Hip Dominant']],
};

const UPPER: DaySkeleton = {
  name: 'Upper',
  slots: [
    'Horizontal Push',
    'Vertical Pull',
    'Vertical Push',
    'Horizontal Pull',
    'Elbow Flexion',
    'Elbow Extension',
    'Shoulder Isolation',
    'Core',
  ],
  requires: [['Horizontal Push', 'Vertical Push'], ['Vertical Pull', 'Horizontal Pull']],
};

const LOWER: DaySkeleton = {
  name: 'Lower',
  slots: [
    'Squat / Knee Dominant',
    'Hinge / Hip Dominant',
    'Hip Isolation',
    'Squat / Knee Dominant',
    'Calf / Ankle',
    'Hinge / Hip Dominant',
    'Core',
    'Hip Isolation',
  ],
  requires: [['Squat / Knee Dominant', 'Hinge / Hip Dominant']],
};

/**
 * Full-body days alternate which pattern leads, rather than repeating one list.
 *
 * A/B exists so a two- or three-day week still trains a squat pattern AND a hinge pattern hard, instead
 * of squatting three times and never deadlifting. The lead slot is the one that gets the athlete fresh,
 * so rotating it is the whole difference between a balanced week and a lopsided one.
 */
const FULL_A: DaySkeleton = {
  name: 'Full Body A',
  slots: [
    'Squat / Knee Dominant',
    'Horizontal Push',
    'Horizontal Pull',
    'Core',
    'Calf / Ankle',
    'Elbow Flexion',
    'Elbow Extension',
    'Hip Isolation',
  ],
};

const FULL_B: DaySkeleton = {
  name: 'Full Body B',
  slots: [
    'Hinge / Hip Dominant',
    'Vertical Push',
    'Vertical Pull',
    'Core',
    'Hip Isolation',
    'Elbow Extension',
    'Elbow Flexion',
    'Calf / Ankle',
  ],
};

const FULL_C: DaySkeleton = {
  name: 'Full Body C',
  slots: [
    'Squat / Knee Dominant',
    'Horizontal Pull',
    'Vertical Push',
    'Hip Isolation',
    'Core',
    'Horizontal Push',
    'Elbow Flexion',
    'Calf / Ankle',
  ],
};

/**
 * The body-part split — "chest and tris, back and bis, legs, shoulders, arms".
 *
 * Added because athletes ask for it by name and it is the split a lot of people genuinely enjoy, which is
 * most of why a program gets finished. It trains each muscle harder and less often than the alternatives:
 * that is a real tradeoff, not a worse one, and it is the athlete's to make rather than the coach's.
 */
const CHEST_TRIS: DaySkeleton = {
  name: 'Chest & Triceps',
  slots: [
    'Horizontal Push',
    'Horizontal Push',
    'Vertical Push',
    'Elbow Extension',
    'Elbow Extension',
    'Horizontal Push',
    'Elbow Extension',
    'Core',
  ],
  requires: [['Horizontal Push'], ['Elbow Extension']],
};

const BACK_BIS: DaySkeleton = {
  name: 'Back & Biceps',
  slots: [
    'Vertical Pull',
    'Horizontal Pull',
    'Horizontal Pull',
    'Elbow Flexion',
    'Elbow Flexion',
    'Vertical Pull',
    'Elbow Flexion',
    'Core',
  ],
  requires: [['Vertical Pull', 'Horizontal Pull'], ['Elbow Flexion']],
};

const SHOULDERS: DaySkeleton = {
  name: 'Shoulders',
  slots: [
    'Vertical Push',
    'Shoulder Isolation',
    'Shoulder Isolation',
    'Vertical Push',
    'Shoulder Isolation',
    'Horizontal Pull',
    'Core',
    'Carry',
  ],
  requires: [['Vertical Push', 'Shoulder Isolation']],
};

const ARMS: DaySkeleton = {
  name: 'Arms',
  slots: [
    'Elbow Flexion',
    'Elbow Extension',
    'Elbow Flexion',
    'Elbow Extension',
    'Elbow Flexion',
    'Elbow Extension',
    'Core',
    'Shoulder Isolation',
  ],
  requires: [['Elbow Flexion'], ['Elbow Extension']],
};

/** Conditioning days are the same movements with a cardio bout earned at the end. */
const cond = (d: DaySkeleton, minutes: number): DaySkeleton => ({ ...d, cardioFinisher: { minutes } });

const MOBILITY_A: DaySkeleton = {
  name: 'Mobility A',
  slots: ['Mobility', 'Mobility', 'Mobility', 'Mobility', 'Mobility', 'Core', 'Mobility', 'Mobility'],
};

const MOBILITY_B: DaySkeleton = {
  name: 'Mobility B',
  slots: ['Mobility', 'Mobility', 'Mobility', 'Core', 'Mobility', 'Mobility', 'Mobility', 'Core'],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SPLIT STYLES — the athlete's choice, not the coach's
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * How to carve the week up.
 *
 * The coach has a default per goal (below) and it is a good one, but which split someone LIKES is a real
 * variable and it predicts whether they finish the block. Offering the choice costs one question and
 * removes the commonest reason a generated program gets abandoned: it was not the kind of training the
 * person wanted to do.
 */
export type SplitStyle = 'full_body' | 'upper_lower' | 'ppl' | 'body_part';

export const SPLIT_STYLES: readonly SplitStyle[] = ['full_body', 'upper_lower', 'ppl', 'body_part'];

export const SPLIT_STYLE_LABEL: Record<SplitStyle, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
  body_part: 'Body part split',
};

export const SPLIT_STYLE_BLURB: Record<SplitStyle, string> = {
  full_body: 'Everything, every session. Best when you train two or three days.',
  upper_lower: 'Upper body one day, lower the next. Hits everything twice a week.',
  ppl: 'Push, pull, legs. The classic when you train four or more days.',
  body_part: 'Chest and tris, back and bis, legs, shoulders, arms.',
};

const rotate = (days: DaySkeleton[], n: number): DaySkeleton[] =>
  Array.from({ length: n }, (_, i) => days[i % days.length]);

/**
 * Each style, at every day count it can honestly support.
 *
 * ⚠ SOME COMBINATIONS DO NOT EXIST, and returning nothing is the right answer. Push/pull/legs across two
 * days leaves a third of the body untrained, and a body-part split at two days is four muscle groups
 * that never get trained at all. Those return `null` and the wizard offers only what works for the days
 * they picked, rather than building something misshapen and calling it their choice.
 */
const STYLE_SPLITS: Record<SplitStyle, Record<number, DaySkeleton[]>> = {
  full_body: {
    2: [FULL_A, FULL_B],
    3: [FULL_A, FULL_B, FULL_C],
    4: [FULL_A, FULL_B, FULL_C, FULL_A],
    5: [FULL_A, FULL_B, FULL_C, FULL_A, FULL_B],
    6: [FULL_A, FULL_B, FULL_C, FULL_A, FULL_B, FULL_C],
  },
  upper_lower: {
    2: [UPPER, LOWER],
    4: [UPPER, LOWER, UPPER, LOWER],
    6: [UPPER, LOWER, UPPER, LOWER, UPPER, LOWER],
  },
  ppl: {
    3: [PUSH, PULL, LEGS],
    5: [PUSH, PULL, LEGS, UPPER, LOWER],
    6: [PUSH, PULL, LEGS, PUSH, PULL, LEGS],
  },
  body_part: {
    3: [CHEST_TRIS, BACK_BIS, LEGS],
    4: [CHEST_TRIS, BACK_BIS, LEGS, SHOULDERS],
    5: [CHEST_TRIS, BACK_BIS, LEGS, SHOULDERS, ARMS],
    6: [CHEST_TRIS, BACK_BIS, LEGS, SHOULDERS, ARMS, LEGS],
  },
};

/** Which styles can actually be built at this many days a week. */
export const stylesForDays = (daysPerWeek: number): SplitStyle[] =>
  SPLIT_STYLES.filter((s) => STYLE_SPLITS[s][daysPerWeek] != null);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GOAL DEFAULTS — used when the athlete expresses no preference
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Strength: full body at low frequency, upper/lower as it rises. Compound frequency buys strength. */
const STRENGTH_SPLITS: Record<number, DaySkeleton[]> = {
  2: [FULL_A, FULL_B],
  3: [FULL_A, FULL_B, FULL_C],
  4: [UPPER, LOWER, UPPER, LOWER],
  5: [UPPER, LOWER, UPPER, LOWER, FULL_A],
  6: [UPPER, LOWER, UPPER, LOWER, UPPER, LOWER],
};

/** Hypertrophy: push/pull/legs wherever it fits — the split the muscle-building catalogue uses. */
const MUSCLE_SPLITS: Record<number, DaySkeleton[]> = {
  2: [FULL_A, FULL_B],
  3: [PUSH, PULL, LEGS],
  4: [UPPER, LOWER, UPPER, LOWER],
  5: [PUSH, PULL, LEGS, UPPER, LOWER],
  6: [PUSH, PULL, LEGS, PUSH, PULL, LEGS],
};

/** Conditioning and weight loss: full body, high frequency, cardio on most days. */
const CONDITIONING_SPLITS: Record<number, DaySkeleton[]> = {
  2: [cond(FULL_A, 20), cond(FULL_B, 20)],
  3: [cond(FULL_A, 20), cond(FULL_B, 20), cond(FULL_C, 25)],
  4: [cond(FULL_A, 15), cond(FULL_B, 20), cond(FULL_C, 15), cond(FULL_A, 25)],
  5: [cond(FULL_A, 15), cond(FULL_B, 15), cond(FULL_C, 20), cond(FULL_A, 15), cond(FULL_B, 25)],
  6: [
    cond(FULL_A, 15),
    cond(FULL_B, 15),
    cond(FULL_C, 15),
    cond(FULL_A, 15),
    cond(FULL_B, 15),
    cond(FULL_C, 25),
  ],
};

/** Mobility: the same two days rotated. Short, frequent, and not trying to be a strength program. */
const MOBILITY_SPLITS: Record<number, DaySkeleton[]> = {
  2: [MOBILITY_A, MOBILITY_B],
  3: rotate([MOBILITY_A, MOBILITY_B], 3),
  4: rotate([MOBILITY_A, MOBILITY_B], 4),
  5: rotate([MOBILITY_A, MOBILITY_B], 5),
  6: rotate([MOBILITY_A, MOBILITY_B], 6),
};

/**
 * ⚠ THE ENDURANCE GOALS ARE ABSENT, AND THAT IS DELIBERATE.
 *
 * `run_5k` through `triathlon` have no entry here. The running family's own research doc is DRAFT and
 * says of itself *"Family coverage: INCOMPLETE … Implementation Readiness: Not begun"*, there is no
 * marathon or race-prep standard anywhere in `Docs/`, and a plausible-looking 16-week marathon table
 * written from memory is exactly the thing that would ship a bad plan consistently, to everyone who asked,
 * with the engine's full confidence behind it.
 */
const SPLITS: Partial<Record<Goal, Record<number, DaySkeleton[]>>> = {
  strength: STRENGTH_SPLITS,
  muscle: MUSCLE_SPLITS,
  conditioning: CONDITIONING_SPLITS,
  weight_loss: CONDITIONING_SPLITS,
  mobility: MOBILITY_SPLITS,
  /* Reuses the strength skeletons deliberately, exactly as `weight_loss` reuses conditioning's. A
     general-health block IS full-body strength work — the difference between it and `strength` is the
     volume band it is prescribed at (see GOAL_CATEGORY), not the shape of the week. */
  health: STRENGTH_SPLITS,
};

/**
 * The week's plan, or null when this goal has no authored rulebook yet.
 *
 * A `style` the athlete chose wins over the goal's default — with one exception that is worth stating:
 * conditioning and weight loss keep their cardio finishers regardless, because the finisher is the goal
 * rather than a feature of the split, and a "conditioning block" with no conditioning in it would be the
 * coach agreeing to something it knows is wrong.
 */
export function skeletonFor(goal: Goal, daysPerWeek: number, style?: SplitStyle | null): DaySkeleton[] | null {
  if (style) {
    const chosen = STYLE_SPLITS[style]?.[daysPerWeek];
    if (chosen) {
      const wantsCardio = goal === 'conditioning' || goal === 'weight_loss';
      return wantsCardio ? chosen.map((d, i) => cond(d, i === chosen.length - 1 ? 25 : 15)) : chosen;
    }
  }
  return SPLITS[goal]?.[daysPerWeek] ?? null;
}

/**
 * Can this week actually be trained in this room?
 *
 * A day is viable when every one of its `requires` groups has at least one trainable pattern in it. A
 * week is viable when all its days are. Anything else means the split is wrong for the equipment, not
 * that a slot needs filling — see the note on `DaySkeleton.requires`.
 */
export function weekIsViable(week: readonly DaySkeleton[], trainable: ReadonlySet<string>): boolean {
  return week.every((d) => (d.requires ?? []).every((group) => group.some((p) => trainable.has(p))));
}

/** The first day that cannot be honestly built, for the sentence Holt says about it. */
export function firstUnviableDay(
  week: readonly DaySkeleton[],
  trainable: ReadonlySet<string>,
): DaySkeleton | null {
  return week.find((d) => (d.requires ?? []).some((group) => !group.some((p) => trainable.has(p)))) ?? null;
}

/**
 * Full body at this day count — the fallback, and the reason full-body days declare no requirements.
 *
 * It is always buildable: a full-body day wants one of everything and is content with whatever it can
 * reach, so a room with only a floor still produces a real session rather than a mislabelled one.
 */
export const fullBodyFallback = (daysPerWeek: number): DaySkeleton[] | null =>
  STYLE_SPLITS.full_body[daysPerWeek] ?? null;

/**
 * Which goals the coach can currently build. Used by the wizard so it never offers a dead end.
 *
 * ⚠ TWO SOURCES, DELIBERATELY. The strength goals are the keys of `SPLITS`, because a goal with no split
 * table genuinely cannot be built. The endurance goals are NOT in `SPLITS` and never will be — they have
 * no weekly split at all, they have a volume curve — so they are authored by having a row in `RACE_SPEC`
 * instead. Reading only `SPLITS` here is what made the assembler refuse every race goal.
 */
export const AUTHORED_GOALS: readonly Goal[] = [...(Object.keys(SPLITS) as Goal[]), ...ENDURANCE_GOALS];

export const isAuthored = (goal: Goal): boolean => AUTHORED_GOALS.includes(goal);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// PROGRAM LENGTH
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * How long a block runs when the athlete has not said.
 *
 * Eight weeks across the board, which is not a shrug: it is long enough for a real progression and for
 * PAS-D7's mandatory deload to land at week 7, and short enough that finishing it is a realistic thing
 * that happens rather than an aspiration. The repo's own foundation programs sit at 8 for the same reason.
 *
 * Mobility runs shorter — four weeks — because it is a habit block rather than a periodised one, and
 * because PAS-D7 asks for no deload below seven weeks, which is right for it.
 */
export const DEFAULT_WEEKS: Partial<Record<Goal, number>> = {
  strength: 8,
  muscle: 8,
  conditioning: 8,
  weight_loss: 8,
  mobility: 4,
  /* Eight, like the other strength-shaped goals. Long enough for the habit to be the point. */
  health: 8,
};

export const defaultWeeksFor = (goal: Goal): number => DEFAULT_WEEKS[goal] ?? 8;
