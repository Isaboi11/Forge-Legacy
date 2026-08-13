/**
 * How much of it to do.
 *
 * ══ WHAT THIS CAN AND CANNOT PRESCRIBE ══
 *
 * `ProgramExercise` carries `sets`, `reps`, `repsMax`, `per`, `repScheme`, `durationSec`, the percent-of-max
 * fields, the grouping fields, and the cardio targets. **It has no rest field**, so the coach does not
 * prescribe rest — the rest timer is a session-time concern the logger already owns. Writing a rest value
 * into a structure nothing reads would be exactly the write-only-field failure the schema's own comments
 * exist to warn about (see `repsMax`, and the absent `notes`).
 *
 * ⚠ IT ALSO DOES NOT PRESCRIBE LOAD. `percentOfMax` needs a tested max, and most athletes arriving at the
 * coach have none — a percentage of a number nobody has measured is a guess wearing a decimal point. Sets
 * and reps are the prescription; the weight is the athlete's, and the logger already records and
 * progresses it. When lift maxes exist, that is the hook to use, and this is where it goes.
 *
 * ══ REP RANGES ARE THE COACHING, SET COUNTS ARE THE DOSE ══
 *
 * Ranges come from the goal (strength trains low reps, hypertrophy moderate, conditioning high) and are
 * standard enough to be uncontroversial. Set counts come from experience and then get checked against
 * PAS-D11's per-session band by the validator — so a table that drifts out of policy fails a test rather
 * than reaching an athlete.
 */

import type { Experience, Goal, SessionMinutes } from './constraints.ts';
import { DELOAD_MARKER, deloadSets, SHORT_BLOCK_WEEKS, type PasCategory } from './rulebook/volume.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What an exercise is doing in the day, which is a different question from what pattern it is.
 *
 * A back squat opening a leg day and a back squat sitting fourth behind a deadlift are the same movement
 * with different jobs, and they should not carry the same prescription. Position decides this, not the
 * exercise.
 */
export type SlotRole = 'primary' | 'secondary' | 'accessory';

export interface RepPrescription {
  sets: number;
  reps: number;
  /** Top of the range. `4 × 8–12` is `reps: 8, repsMax: 12` — the floor stays in `reps` by convention. */
  repsMax: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE TABLES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Rep ranges by category and role.
 *
 * Conventional and deliberately so — these are the ranges every serious programme in the repo already
 * uses, and the coach earns nothing by being novel about them. STRENGTH keeps its primaries genuinely
 * low; HYPERTROPHY sits in the moderate range that most of the muscle-building catalogue occupies;
 * CONDITIONING runs high with short movements.
 */
const REP_RANGES: Record<PasCategory, Record<SlotRole, [number, number]>> = {
  STRENGTH: { primary: [3, 5], secondary: [5, 8], accessory: [8, 12] },
  HYPERTROPHY: { primary: [6, 10], secondary: [8, 12], accessory: [12, 15] },
  CONDITIONING: { primary: [10, 15], secondary: [12, 15], accessory: [15, 20] },
  FULL_BODY: { primary: [6, 10], secondary: [8, 12], accessory: [12, 15] },
  // Duration-based; ranges are unused but present so the table is total.
  RUNNING: { primary: [1, 1], secondary: [1, 1], accessory: [1, 1] },
  MOBILITY: { primary: [1, 1], secondary: [1, 1], accessory: [1, 1] },
};

/**
 * Sets by category, role and experience.
 *
 * A beginner does less of everything — not because they are fragile but because recoverable volume is
 * trained, and a first program that leaves them wrecked is a first program they do not finish. The
 * validator holds the resulting session totals against PAS-D11.
 */
const SET_COUNTS: Record<PasCategory, Record<SlotRole, Record<Experience, number>>> = {
  STRENGTH: {
    primary: { beginner: 3, intermediate: 4, advanced: 5 },
    secondary: { beginner: 3, intermediate: 4, advanced: 4 },
    accessory: { beginner: 2, intermediate: 3, advanced: 3 },
  },
  HYPERTROPHY: {
    primary: { beginner: 3, intermediate: 4, advanced: 4 },
    secondary: { beginner: 3, intermediate: 3, advanced: 4 },
    accessory: { beginner: 3, intermediate: 3, advanced: 4 },
  },
  CONDITIONING: {
    primary: { beginner: 3, intermediate: 3, advanced: 4 },
    secondary: { beginner: 2, intermediate: 3, advanced: 3 },
    accessory: { beginner: 2, intermediate: 3, advanced: 3 },
  },
  FULL_BODY: {
    primary: { beginner: 3, intermediate: 3, advanced: 4 },
    secondary: { beginner: 2, intermediate: 3, advanced: 3 },
    accessory: { beginner: 2, intermediate: 3, advanced: 3 },
  },
  RUNNING: {
    primary: { beginner: 1, intermediate: 1, advanced: 1 },
    secondary: { beginner: 1, intermediate: 1, advanced: 1 },
    accessory: { beginner: 1, intermediate: 1, advanced: 1 },
  },
  MOBILITY: {
    primary: { beginner: 2, intermediate: 2, advanced: 3 },
    secondary: { beginner: 2, intermediate: 2, advanced: 2 },
    accessory: { beginner: 1, intermediate: 2, advanced: 2 },
  },
};

/** Mobility holds, in seconds, by experience. Duration-based per PAS §10.1. */
const MOBILITY_HOLD_SEC: Record<Experience, number> = { beginner: 30, intermediate: 45, advanced: 60 };

/**
 * How many MAIN exercises fit in the time available.
 *
 * A 30-minute session is not a 60-minute session with the same list read faster — it is fewer movements.
 * PAS §10.2's duration guidance runs the other way (it estimates duration from volume), so this is the
 * inverse and it is the coach's own rule: roughly one exercise per eight minutes of the session, floored
 * so a short session still trains something and capped so a long one does not sprawl.
 *
 * The result is then clamped into the category's PAS-D11 exercise band by the caller, which is what
 * actually decides — this only ever narrows.
 */
export function exerciseBudget(minutes: SessionMinutes): number {
  switch (minutes) {
    case 30:
      return 4;
    case 45:
      return 5;
    case 60:
      return 6;
    case 75:
    default:
      return 8;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// PRESCRIBING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PrescribeContext {
  category: PasCategory;
  experience: Experience;
  /** Zero-based. Drives the within-block rep progression. */
  weekIndex: number;
  /**
   * How many weeks the whole block runs — needed to know whether `weekIndex` is a step on a staircase or
   * the entire program (PAS-A7-D2). Optional so existing callers and tests keep their meaning: absent
   * reads as "long enough to ramp", which is what every caller meant before short blocks existed.
   */
  totalWeeks?: number;
  /** PAS-D7 says this week is a deload; PAS-D8 says what that means. */
  isDeload: boolean;
}

/**
 * Sets and reps for one slot.
 *
 * ══ PROGRESSION IS IN REPS, NOT SETS OR LOAD ══
 *
 * Week to week the target climbs through the range and then resets — 3×5, 3×6, 3×7, back to 3×5 with
 * more weight on the bar. That is double progression, it is what the rep range is FOR, and it is the only
 * kind this model can express honestly: sets are held because the session total is what PAS-D11 governs,
 * and load is held because the coach does not know what the athlete lifts.
 *
 * A deload cuts sets per PAS-D8 and takes the reps back to the bottom of the range — the week is meant to
 * be easy in both dimensions, and a deload that keeps top-of-range reps is a deload in name only.
 *
 * ══ AND A BLOCK TOO SHORT TO RAMP DOES NOT START AT THE BOTTOM ══
 *
 * The climb only makes sense when there are later weeks to climb into. At `SHORT_BLOCK_WEEKS` or under,
 * week 0's bottom-of-range reps would be the WHOLE program — the easiest week of a staircase with no
 * second step. Such a block anchors mid-range instead and does not ramp (PAS-A7-D2).
 */
export function prescribeReps(role: SlotRole, ctx: PrescribeContext): RepPrescription {
  const [lo, hi] = REP_RANGES[ctx.category][role];
  const base = SET_COUNTS[ctx.category][role][ctx.experience];

  if (ctx.isDeload) {
    return { sets: deloadSets(base), reps: lo, repsMax: null };
  }

  // Climb the range a rep a week, then wrap. `hi - lo` of 0 (RUNNING/MOBILITY) leaves it at `lo`.
  const span = hi - lo;
  const short = ctx.totalWeeks != null && ctx.totalWeeks <= SHORT_BLOCK_WEEKS;
  const reps = span === 0 ? lo : short ? lo + Math.round(span / 2) : lo + (ctx.weekIndex % (span + 1));

  return {
    sets: base,
    // The range is shown only while there is one left to climb into; at the top of it, a single number is
    // the honest prescription rather than "12–12".
    repsMax: reps < hi ? hi : null,
    reps,
  };
}

/** A mobility hold, which PAS says is duration-based rather than counted in reps. */
export function prescribeHold(ctx: PrescribeContext): { sets: number; durationSec: number } {
  const sets = SET_COUNTS.MOBILITY.secondary[ctx.experience];
  return {
    sets: ctx.isDeload ? deloadSets(sets) : sets,
    durationSec: MOBILITY_HOLD_SEC[ctx.experience],
  };
}

/**
 * Which role a slot plays, from its position in the day and whether it is a compound.
 *
 * The first compound is the primary — the movement the session is actually about, and the one that gets
 * the athlete's freshest effort. A second compound is secondary. Everything else is accessory, including
 * a compound that turns up fourth, because by then it is no longer what the day is for.
 */
export function roleFor(indexInDay: number, isCompoundPattern: boolean): SlotRole {
  if (!isCompoundPattern) return 'accessory';
  if (indexInDay === 0) return 'primary';
  if (indexInDay === 1) return 'secondary';
  return 'accessory';
}

/** PAS-D8 (1): every slot name in a deload week carries the marker. */
export const nameForWeek = (base: string, isDeload: boolean): string =>
  isDeload ? `${base} ${DELOAD_MARKER}` : base;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// CARDIO
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What a cardio bout prescribes, in `ProgramExercise`'s own fields.
 *
 * ⚠ `null` IS MEANINGFUL AND MUST NOT BECOME 0. The schema is explicit: a null target prescribes an OPEN
 * bout — "go for a run" — and coercing it to zero prescribes a run of no distance. Every field here is
 * either a real number or absent.
 */
export interface CardioPrescription {
  kind: 'cardio';
  activity: string;
  modality: 'outdoor' | 'indoor';
  targetMi?: number | null;
  targetSec?: number | null;
  targetPaceSec?: number | null;
  targetSpdMph?: number | null;
}

/**
 * Build a cardio bout, honouring what the activity can actually express.
 *
 * ⚠ RATE IS NOT UNIVERSAL, and this is a real product constraint rather than an oversight.
 * `conditioning.ts` gives `run`/`walk` a pace, `bike` a speed, and **row, elliptical, swim and stair
 * nothing** — because a rower's honest metric is a 500 m split and a swimmer's is per-100, and the app
 * computes neither. So a swim can be prescribed by distance or by time and never by pace. Passing a pace
 * for one of those would write a field nothing renders.
 */
export function prescribeCardio(opts: {
  activity: string;
  modality: 'outdoor' | 'indoor';
  targetMi?: number | null;
  targetSec?: number | null;
  /** Seconds per mile. Applied only where the activity is pace-rated. */
  paceSec?: number | null;
  /** Miles per hour. Applied only where the activity is speed-rated. */
  speedMph?: number | null;
  rateKind: 'pace' | 'speed' | 'none';
  tracksDistance: boolean;
}): CardioPrescription {
  const out: CardioPrescription = {
    kind: 'cardio',
    activity: opts.activity,
    modality: opts.modality,
  };

  // A stair climber tracks no distance at all; asking it for miles prescribes something unmeasurable.
  if (opts.tracksDistance && opts.targetMi != null) out.targetMi = opts.targetMi;
  if (opts.targetSec != null) out.targetSec = opts.targetSec;

  if (opts.rateKind === 'pace' && opts.paceSec != null) out.targetPaceSec = opts.paceSec;
  if (opts.rateKind === 'speed' && opts.speedMph != null) out.targetSpdMph = opts.speedMph;

  return out;
}

/**
 * The one endurance rule already written down in this repo, and the only one the engine needs before the
 * running rulebook lands: `Running-Family-Research-v1.0.md` governs progression with a **10%-per-week
 * mileage cap**.
 *
 * Applied as a ceiling rather than a target — a plan may ramp slower, never faster. The validator checks
 * the built plan against this independently, so a table that ignores it fails rather than ships.
 */
export const MAX_WEEKLY_MILEAGE_INCREASE = 0.1;

export const cappedWeeklyMileage = (previousMi: number, wantedMi: number): number =>
  Math.min(wantedMi, previousMi * (1 + MAX_WEEKLY_MILEAGE_INCREASE));

/** Goal → PAS category, re-exported so callers need one import for "what am I authoring". */
export type { PasCategory };
export type { Goal };
