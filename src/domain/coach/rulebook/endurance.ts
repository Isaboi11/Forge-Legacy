/**
 * The endurance rulebook — 5k, 10k, half, marathon, triathlon.
 *
 * ══ THIS FILE IS THE PRODUCT, NOT THE ENGINE ══
 *
 * Every number here is a DECISION, taken by the PO on 2026-08-09 and recorded in
 * `Docs/Endurance-Programming-Standard-v1.0.md` as EPS-D1 … EPS-D13. The sources disagree on almost all
 * of them; where they do, the standard says which way Forge went and why. Change a number here and you
 * have changed a decision — amend the standard in the same pass, or the two stop meaning the same thing.
 *
 * ⚠ **NOTHING BELOW IS TRANSCRIBED FROM A PUBLISHED PLAN.** Methodology is taken and authored; a named
 * plan is never copied week by week. See `project_third_party_program_provenance` — "tweak it a little"
 * is never it. Each constant is a principle plus a Forge number.
 *
 * ══ ONE MACHINE, STILL ══
 *
 * The strength assembler's promise is zero per-GOAL branches, and that survives: all five endurance goals
 * run through the single machine below, differing only by the rows in `RACE_SPEC`. What this adds is one
 * per-FAMILY branch at the top of `assemble()`, because a plan built backwards from a race date and
 * measured in weekly miles is a genuinely different product from a week of slot-filled training days —
 * not a variation on one.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import {
  isEnduranceGoal,
  type CoachConstraints,
  type EnduranceGoal,
  type Experience,
  type Goal,
  type Limitation,
} from '../constraints.ts';
import { forbidsRunning } from './limitations.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE DECISIONS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * EPS-D1 — how much of the week is easy.
 *
 * 80/20 is the best-evidenced distribution in endurance training and holds across running, cycling and
 * rowing. A beginner gets 90/10: their "hard" is unreliable, their tissue tolerance is lowest, and the
 * first block's job is the habit and the base rather than the workout.
 */
export const EASY_SHARE: Record<Experience, number> = {
  beginner: 0.9,
  intermediate: 0.8,
  advanced: 0.8,
};

/**
 * EPS-D2 / EPS-D9 — the long run.
 *
 * A share of the week, bounded at BOTH ends and then capped by time. The time cap is what actually
 * protects a slow runner: 30% of a beginner's week can still be a three-hour effort, and three hours is
 * where the recovery cost stops being repaid. The distance cap binds for the fast runner, the time cap
 * for the slow one, and whichever comes first wins.
 */
export const LONG_RUN_SHARE = { min: 0.25, max: 0.3 } as const;
export const LONG_RUN_TIME_CAP_SEC = 3 * 3600;
export const LONG_RUN_DISTANCE_CAP_MI = 20;

/**
 * EPS-D3 — weekly volume growth.
 *
 * ⚠ 10%/week is LOCKED in `Program-Authoring-Standard-v1.0.md` §11.4, and it is also **not well
 * supported** — trials find similar injury rates at 10% and at 50% weekly increases. It is kept because
 * it is locked and because it errs toward caution, which is the right direction for a rule applied to
 * everyone. What the evidence DOES support is added beside it, not instead of it.
 */
export const WEEKLY_INCREASE_CAP = 0.1;

/**
 * EPS-D3b — the guard that is actually evidenced.
 *
 * Injury risk climbs sharply when a single long run jumps well beyond recent longest. Holt has the
 * athlete's logged history, so unlike the weekly rule this one can be enforced against what they have
 * really done rather than against what a plan assumed.
 */
export const LONG_RUN_SPIKE_CAP = 1.1;

/**
 * EPS-D4 — hard sessions per week, INCLUDING the long run.
 *
 * Counting the long run as one of them is the honest bookkeeping: it is the week's largest single
 * stress, and a plan that calls it "easy volume" and then adds two workouts around it has three hard
 * days while claiming two.
 */
export const HARD_SESSIONS: Record<Experience, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/**
 * EPS-D5 / EPS-D6 — the taper.
 *
 * ≤21 days, volume cut by half, **intensity and frequency retained**. That last part is not a detail:
 * reducing intensity during a taper erases the benefit of reducing volume, which makes "take it easy for
 * three weeks" one of the more expensive pieces of folk advice in the sport.
 */
export const TAPER_VOLUME_CUT = 0.5;

/** EPS-D7 — a brand-new runner trains three days a week, with a rest day between each. */
export const MIN_DAYS_BEGINNER = 3;

/**
 * EPS-D8 — someone who cannot yet run continuously.
 *
 * Run/walk, not a refusal. The established path from nothing to a 5k is 8–12 weeks of intervals, and
 * turning this person away would be the coach failing the athlete who needs him most. Expressible today:
 * `run` and `walk` are both real activities in the app.
 */
export const RUN_WALK_START = { runSec: 60, walkSec: 90, repeats: 8 } as const;

/** EPS-D11 — triathlon time split. Leans to the bike: biggest race-day share, lowest impact cost. */
export const TRI_SPLIT = { swim: 0.3, bike: 0.5, run: 0.2 } as const;

/** EPS-D12 — swim and row carry no pace. Distance or duration only; `RATE_KIND` is not extended. */
export const SWIM_HAS_PACE = false;

/*
 * ══ TRIATHLON VOLUME — MEASURED IN MINUTES, BECAUSE THE RACE IS ══
 *
 * ⚠ THE FIRST VERSION HAD NO TRIATHLON VOLUME AT ALL. `composeTriWeek` ignored the curve, and every
 * session length came off a fixed 45→90 minute progress ramp — so a 16-week plan peaked near three hours
 * a week against `RACE_SPEC.triathlon.peakHours` of eight, with no taper, no down weeks and no race. The
 * numbers below are what replaced it. Each is a mainstream default, NOT a PO decision yet: the endurance
 * rulebook's contested calls are the PO's, and these are marked for review rather than presented as
 * settled.
 */

/**
 * Where a triathlon block starts, in weekly minutes. DEFAULT PENDING PO REVIEW.
 *
 * Holt asks for running miles and nothing about the pool or the bike, so there is no honest reading of
 * the athlete's swim/bike fitness to start from. Instead the start is back-solved from the plan: the
 * weekly figure that, climbing at the locked 10% (EPS-D3) through the ramp weeks the plan actually has,
 * lands on the peak in the last build week. Then it is clamped to what mainstream beginner-to-intermediate
 * triathlon plans open with — 2½ hours a week at the least (a long plan does not start at an hour and
 * crawl), 4 at the most (a short one does not open at a volume nobody has built to).
 */
export const TRI_START_MIN = { floor: 150, ceiling: 240 } as const;

/**
 * The longest any single triathlon session gets, in minutes. DEFAULT PENDING PO REVIEW.
 *
 * ⚠ WITHOUT THESE, EPS-D11 PRESCRIBES NONSENSE ON A FOUR-DAY WEEK. 30% of an eight-hour week is 144
 * minutes of swimming, and with one swim day that is one 2½-hour swim. Mainstream plans at this volume
 * cap a swim near 75 minutes, a standalone run near 90 (the run is the discipline with the injury cost),
 * a midweek ride at two hours, the long ride (the brick's) at three, and a run off the bike at 45. What a
 * cap takes out of the swim or the run goes to the bike — the same reason EPS-D11 leans to it: biggest
 * race share, lowest impact. What the bike cannot hold either is simply not prescribed, and the curve is
 * capped at what the week CAN hold (`triWeekCapacityMin`), so a two-day week peaks under the spec. That
 * is the honest result of fewer days, not a shortfall to paper over with four-hour sessions.
 */
export const TRI_SESSION_CAP_MIN = { swim: 75, run: 90, ride: 120, longRide: 180, brickRun: 45 } as const;

/** The shortest a triathlon session is worth getting changed for. Below these it is a warm-up, not a session. */
export const TRI_SESSION_FLOOR_MIN = { swim: 20, run: 20, ride: 30, brickRun: 10 } as const;

/**
 * The brick's ride against a standalone ride, when the bike minutes are shared out. DEFAULT PENDING PO REVIEW.
 *
 * The brick sits after the week's biggest ride (EPS-D11's one-a-week), so it IS the long ride: twice a
 * standalone ride is the usual long-ride-to-midweek-ride ratio. Its run is half a standalone run — the
 * point of a brick run is running on bike legs, not more run volume.
 */
const TRI_BRICK_RIDE_WEIGHT = 2;
const TRI_BRICK_RUN_WEIGHT = 0.5;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE RACES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface RaceSpec {
  label: string;
  /** Race distance in miles. Null for triathlon, which is measured in hours. */
  raceMi: number | null;
  /** Below this, Holt refuses and offers the shorter race instead. */
  minWeeks: number;
  /** What a full build wants when there is room for it. */
  idealWeeks: number;
  /** Weekly miles the athlete must already be running. 0 means a true beginner is welcome. */
  minBaseMi: number;
  /** EPS-D5 — three weeks for the races that accumulate the most fatigue. */
  taperWeeks: number;
  /** The peak week's long run, before the caps in EPS-D2/D9 are applied. */
  peakLongMi: number | null;
  /** Weekly training hours at peak, for the time-measured goals. */
  peakHours: number | null;
  /** What Holt offers instead when the answer is no. */
  fallback: EnduranceGoal | null;
}

export const RACE_SPEC: Record<EnduranceGoal, RaceSpec> = {
  run_5k: {
    label: '5K',
    raceMi: 3.1,
    minWeeks: 6,
    idealWeeks: 8,
    minBaseMi: 0,
    taperWeeks: 2,
    peakLongMi: 6,
    peakHours: null,
    fallback: null,
  },
  run_10k: {
    label: '10K',
    raceMi: 6.2,
    minWeeks: 6,
    idealWeeks: 8,
    minBaseMi: 5,
    taperWeeks: 2,
    peakLongMi: 9,
    peakHours: null,
    fallback: 'run_5k',
  },
  run_half: {
    label: 'half marathon',
    raceMi: 13.1,
    minWeeks: 10,
    idealWeeks: 12,
    minBaseMi: 8,
    taperWeeks: 2,
    peakLongMi: 12,
    peakHours: null,
    fallback: 'run_10k',
  },
  run_marathon: {
    label: 'marathon',
    raceMi: 26.2,
    minWeeks: 12,
    idealWeeks: 16,
    /* ⚠ RAISED FROM 10 AFTER READING THE PLANS IT PRODUCED. A 12 mi/week athlete passed the gate and got
       a block whose longest run reached 12.4 miles — because the spike cap (correctly) will not take a
       4.8 mile long run to 20 in sixteen weeks. The plan was safe and it was not marathon preparation.
       The cap was right; the door was too wide. 15 matches what the research assumes a 12–16 week
       marathon block starts from, and someone below it is offered the half, which is their real race. */
    minBaseMi: 15,
    taperWeeks: 3,
    peakLongMi: 20,
    peakHours: null,
    fallback: 'run_half',
  },
  triathlon: {
    label: 'triathlon',
    raceMi: null,
    minWeeks: 12,
    idealWeeks: 16,
    minBaseMi: 0,
    /* ⚠ WAS 3, AND THE 3 WAS NEVER READ — `composeTriWeek` ignored the whole volume curve, so no triathlon
       plan ever tapered at all. Now that it is read, 2 is EPS-D5's own option (b) applied honestly: the
       three-week window is for the races that accumulate the most fatigue (marathon, Ironman), and an
       8-hour peak is an Olympic / 70.3-class build, whose mainstream taper is 10–14 days. Two weeks here
       is the week before plus race week itself. DEFAULT PENDING PO REVIEW — amend EPS-D5's row with it. */
    taperWeeks: 2,
    peakLongMi: null,
    peakHours: 8,
    fallback: null,
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// PACES — EPS-D10
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Training paces from a recent all-out result.
 *
 * ⚠ **THIS DEPARTS FROM A LOCKED RULE, KNOWINGLY.** `Program-Authoring-Standard-v1.0.md` §11.4 says pace
 * lives in `notes` because "absolute pace doesn't account for individual fitness" — which is correct when
 * the author knows nothing about the runner, and every catalogue program is written that way. Holt can
 * *ask*. Given a real result inside six weeks, derived paces are the single most useful thing a coach
 * hands a runner; without one, effort is described and **no number is ever invented**. EPS-D10.
 *
 * The model: a race is run at a known fraction of the athlete's aerobic ceiling, so the result gives that
 * ceiling, and every training pace is a fraction of it. Percentages are the long-established training
 * zones — easy well below, threshold sustainable for the best part of an hour, intervals at about the
 * ceiling itself. Pace is the reciprocal of velocity, which is why the arithmetic divides.
 */
const RACE_FRACTION: Record<string, number> = {
  '3.1': 0.97,
  '6.2': 0.92,
  '13.1': 0.86,
  '26.2': 0.81,
};

const ZONE_FRACTION = { easy: 0.72, marathon: 0.81, threshold: 0.89, interval: 0.975 } as const;

export interface TrainingPaces {
  easySec: number;
  marathonSec: number;
  thresholdSec: number;
  intervalSec: number;
}

/** Nearest known race distance, so a 5-mile result is read as roughly a 10k effort rather than rejected. */
function fractionFor(mi: number): number {
  let best = '3.1';
  let gap = Infinity;
  for (const key of Object.keys(RACE_FRACTION)) {
    const d = Math.abs(Number(key) - mi);
    if (d < gap) {
      gap = d;
      best = key;
    }
  }
  return RACE_FRACTION[best];
}

/**
 * @returns paces in seconds per mile, or `null` when there is no usable result — and `null` must stay
 * null all the way to the athlete. A guessed pace looks exactly like a derived one on the screen.
 */
export function pacesFrom(raceMi: number | null | undefined, raceSec: number | null | undefined): TrainingPaces | null {
  if (raceMi == null || raceSec == null) return null;
  if (raceMi <= 0 || raceSec <= 0) return null;

  const racePace = raceSec / raceMi;
  const ceilingPace = racePace * fractionFor(raceMi);
  const at = (f: number) => Math.round(ceilingPace / f);

  return {
    easySec: at(ZONE_FRACTION.easy),
    marathonSec: at(ZONE_FRACTION.marathon),
    thresholdSec: at(ZONE_FRACTION.threshold),
    intervalSec: at(ZONE_FRACTION.interval),
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// TARGET TIMES — EPS-D10, extended
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ A TARGET IS NOT A MEASUREMENT — AND IT IS NOT AN INVENTED NUMBER EITHER.
 *
 * EPS-D10 gave the rulebook two states: a real result inside six weeks, or effort described and no number
 * written. "Sub-25 5K", "3:30 marathon", "BQ" is a third one — the athlete saying the pace they intend to
 * hold. Deriving zones from it is arithmetic on a number THEY supplied, not a pace guessed on their
 * behalf, so the rule against inventing paces is untouched.
 *
 * A result still wins wherever there is one: it is what they have actually done, and the zones off it are
 * the ones they can hold today. And no result plus no target is still `null` all the way to the athlete.
 */
export function pacesFor(opts: {
  goal: Goal;
  recentRaceMi?: number | null;
  recentRaceSec?: number | null;
  goalTimeSec?: number | null;
}): { paces: TrainingPaces | null; from: 'recent' | 'target' | null } {
  const recent = pacesFrom(opts.recentRaceMi, opts.recentRaceSec);
  if (recent) return { paces: recent, from: 'recent' };
  const raceMi = isEnduranceGoal(opts.goal) ? RACE_SPEC[opts.goal].raceMi : null;
  const target = pacesFrom(raceMi, opts.goalTimeSec);
  return target ? { paces: target, from: 'target' } : { paces: null, from: null };
}

/**
 * Riegel's endurance formula — a time at one distance read as a time at another.
 *
 * The exponent is the long-established 1.06: doubling the distance costs rather more than doubling the
 * time, because pace falls away as the effort lengthens. It is used for ONE thing here — reading what the
 * athlete has already run as an equivalent at the race they are training for, so the gap between that and
 * their target can be stated in real numbers instead of implied.
 */
export const RIEGEL_EXPONENT = 1.06;

export const equivalentTime = (sec: number, fromMi: number, toMi: number): number =>
  sec * (toMi / fromMi) ** RIEGEL_EXPONENT;

/**
 * How much faster than today's fitness a block can honestly aim. DEFAULT PENDING PO REVIEW.
 *
 * A well-run block improves a race time by a few percent, and by more the longer it runs — but not
 * without limit, which is why the cap is here. It is used only to decide whether Holt SAYS something; it
 * never changes a single number in the plan, because CA-D12 is that the athlete's race is the athlete's.
 */
export const TARGET_GAIN = { perWeek: 0.004, cap: 0.1 } as const;

/**
 * What a target time is usually raced off, in weekly miles. DEFAULT PENDING PO REVIEW.
 *
 * ⚠ THIS IS A LOOSE RELATIONSHIP AND IT IS STILL WORTH STATING. Weekly volume does not determine race
 * pace — training quality, years in the sport and the body doing it all move it — so this is not used to
 * refuse anything, to scale anything, or to predict a finish time. It answers one question: is the target
 * far enough beyond where the athlete is that Holt would be misleading them by saying nothing?
 *
 * Read as: at or faster than this pace, a race of this distance is usually raced off at least this many
 * miles a week. The fastest row the target meets wins. A target slower than every row asks nothing of the
 * volume, and then there is nothing to say.
 */
export const TARGET_BASE_MI: Partial<Record<EnduranceGoal, readonly { pacePerMiSec: number; weeklyMi: number }[]>> = {
  run_5k: [
    { pacePerMiSec: 600, weeklyMi: 12 },
    { pacePerMiSec: 510, weeklyMi: 25 },
    { pacePerMiSec: 450, weeklyMi: 35 },
  ],
  run_10k: [
    { pacePerMiSec: 630, weeklyMi: 15 },
    { pacePerMiSec: 540, weeklyMi: 30 },
    { pacePerMiSec: 480, weeklyMi: 40 },
  ],
  run_half: [
    { pacePerMiSec: 660, weeklyMi: 20 },
    { pacePerMiSec: 570, weeklyMi: 35 },
    { pacePerMiSec: 510, weeklyMi: 45 },
  ],
  run_marathon: [
    { pacePerMiSec: 720, weeklyMi: 30 },
    { pacePerMiSec: 600, weeklyMi: 45 },
    { pacePerMiSec: 540, weeklyMi: 55 },
  ],
};

/** The weekly mileage this target is usually raced off, or null when it asks nothing unusual. */
export function baseForTarget(goal: EnduranceGoal, pacePerMiSec: number): number | null {
  const rows = (TARGET_BASE_MI[goal] ?? []).filter((r) => pacePerMiSec <= r.pacePerMiSec);
  return rows.length ? Math.max(...rows.map((r) => r.weeklyMi)) : null;
}

/** A time as Holt says it — "25-minute" under the hour, "3:30" above it. */
export const saidTime = (sec: number): string => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec - h * 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}-minute`;
};

/** A pace as a watch shows it. Truncated, never rounded up: 8:03.9 per mile is 8:03 on the screen. */
export const saidPace = (secPerMi: number): string => {
  const s = Math.floor(secPerMi);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * The target, read: the pace it asks for, where the plan's paces came from, and the one sentence to say
 * when the target is beyond what this block can honestly reach.
 */
export interface GoalTimePlan {
  /** Seconds per mile the target asks for. */
  paceSec: number;
  /** Where the training paces were derived from — `pacesFor`. */
  from: 'recent' | 'target' | null;
  /** Said ONCE, and it never changes a number in the plan (CA-D12). Null when the target is in reach. */
  concern: string | null;
}

/**
 * The gap, in the numbers an athlete can picture.
 *
 * ⚠ **IT NEVER REFUSES.** PO, 2026-09-21: *"Holt shouldn't really say no to a race."* A target beyond
 * today's fitness is the commonest reason somebody starts training at all, and the useful answer is the
 * plan plus one honest sentence — never a smaller goal handed back instead.
 *
 * Two readings, and a result beats volume for the same reason it does for paces: a recent race says where
 * they are, weekly mileage only says what they have been doing.
 */
export const GOAL_TIME_SAY = {
  fromResult: (time: string, label: string, pace: string, nowPace: string): string =>
    `A ${time} ${label} is ${pace} per mile, and what you've already run puts you around ${nowPace} — that's a stretch by the date, but here's the plan that gets you closest.`,
  fromVolume: (time: string, label: string, pace: string, where: string): string =>
    `A ${time} ${label} is ${pace} per mile; ${where} that is a stretch by the date — here is the plan that gets you closest.`,
} as const;

export function goalTimePlanFor(opts: {
  goal: EnduranceGoal;
  goalTimeSec?: number | null;
  weeks: number;
  currentWeeklyMi: number;
  recentRaceMi?: number | null;
  recentRaceSec?: number | null;
  from: 'recent' | 'target' | null;
}): GoalTimePlan | null {
  const spec = RACE_SPEC[opts.goal];
  const target = opts.goalTimeSec;
  // A triathlon carries no distance in miles (`RaceSpec.raceMi`), so a target time has no pace to become.
  if (target == null || !(target > 0) || spec.raceMi == null) return null;

  const paceSec = target / spec.raceMi;
  const said = { time: saidTime(target), label: spec.label, pace: saidPace(paceSec) };
  const plan = (concern: string | null): GoalTimePlan => ({ paceSec: Math.floor(paceSec), from: opts.from, concern });

  const { recentRaceMi: mi, recentRaceSec: sec } = opts;
  if (mi != null && sec != null && mi > 0 && sec > 0) {
    const now = equivalentTime(sec, mi, spec.raceMi);
    const reachable = now * (1 - Math.min(TARGET_GAIN.cap, Math.max(0, opts.weeks) * TARGET_GAIN.perWeek));
    if (target >= reachable) return plan(null);
    return plan(GOAL_TIME_SAY.fromResult(said.time, said.label, said.pace, saidPace(reachable / spec.raceMi)));
  }

  const base = baseForTarget(opts.goal, paceSec);
  if (base == null || opts.currentWeeklyMi >= base) return plan(null);
  const where = opts.currentWeeklyMi <= 0 ? 'from a standing start' : `off ${saidMi(opts.currentWeeklyMi)} miles a week`;
  return plan(GOAL_TIME_SAY.fromVolume(said.time, said.label, said.pace, where));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// REFUSALS — §2.3 of the standard
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface EnduranceRefusal {
  reason: 'not_enough_time' | 'not_enough_base' | 'cannot_run';
  message: string;
  /**
   * The race the message offers instead — and ONLY a race that would itself build for this athlete.
   * `null` when nothing smaller fits, and then the message offers nothing either.
   */
  altGoal: EnduranceGoal | null;
}

/**
 * The sentence in each refusal that makes the offer — one place, so the message and the card read it
 * from the same words (`counterOfferIn`).
 */
const OFFER_PHRASE: Record<EnduranceRefusal['reason'], (altLabel: string) => string> = {
  cannot_run: (l) => `I'll build the ${l} block`,
  not_enough_time: (l) => `That's a ${l} build`,
  not_enough_base: (l) => `Let me build the ${l} first`,
};

/**
 * The sentence in a CONCERN that makes the suggestion — read back by `counterOfferIn` the same way, so a
 * chat that lifts a concern onto a card gets the race the words named and no other.
 */
const SUGGEST_PHRASE = (altLabel: string) => `If you'd rather, the ${altLabel}`;

type RefusalOpts = { weeksAvailable: number; currentWeeklyMi: number; canRunContinuously?: boolean };

/**
 * The first race down the fallback chain that would actually BUILD for this athlete, or null.
 *
 * ⚠ ONE STEP DOWN IS NOT ENOUGH, and taking one step is what the counter-offer used to do. A 10K with
 * five weeks to go offered the 5K — which needs six and refused in turn; a half for someone who cannot
 * yet run continuously offered the 10K, which refuses for exactly the same reason the half did. An
 * alternative that says no when accepted is not an alternative, it is a second refusal with a button.
 */
function buildableFrom(first: EnduranceGoal | null, opts: RefusalOpts): EnduranceGoal | null {
  for (let g = first; g; g = RACE_SPEC[g].fallback) if (!enduranceRefusalFor(g, opts)) return g;
  return null;
}

/**
 * Which race a refusal message offers, read back off the words the athlete is shown.
 *
 * ⚠ READ OFF THE TEXT ON PURPOSE. The chat sheet hands the card the message and nothing else, and the
 * card used to pick its race from `RACE_SPEC.fallback` on its own — so the text said "Let's start with
 * the 5K" while the button under it said "Build the 10K" (every one of 14,976 swept cannot-run
 * refusals), and the 10K refused too. Taking the race FROM the sentence is what makes it impossible for
 * the two to disagree: no offer phrase in the text, no card.
 */
export function counterOfferIn(message: string): EnduranceGoal | null {
  for (const g of Object.keys(RACE_SPEC) as EnduranceGoal[]) {
    const label = RACE_SPEC[g].label;
    if (Object.values(OFFER_PHRASE).some((phrase) => message.includes(phrase(label)))) return g;
    if (message.includes(SUGGEST_PHRASE(label))) return g;
  }
  return null;
}

const weeksBetween = (fromISO: string, toISO: string): number => {
  const a = Date.parse(fromISO);
  const b = Date.parse(toISO);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / (7 * 24 * 3600 * 1000));
};

export const weeksUntilRace = (raceDateISO: string, todayISO: string): number =>
  Math.max(0, weeksBetween(todayISO, raceDateISO));

/**
 * Whether this plan can honestly be built — and if not, what to offer instead.
 *
 * ⚠ **A REFUSAL ALWAYS CARRIES THE ALTERNATIVE.** "No" on its own is the anti-shame principle being
 * broken rather than upheld (Product DNA): the athlete asked for the right thing at the wrong time, and
 * the useful answer names the race that fits and says the bigger one is still there afterwards.
 */
export function enduranceRefusalFor(goal: EnduranceGoal, opts: RefusalOpts): EnduranceRefusal | null {
  const spec = RACE_SPEC[goal];

  if (goal !== 'triathlon' && goal !== 'run_5k' && opts.canRunContinuously === false) {
    /* The 5K is the answer for a non-continuous runner whatever the goal — it is the only race built as
       run/walk — but only if the 5K itself fits the calendar. When it does not, the sentence stops
       promising it and says what it needs instead, and no card follows. */
    const altGoal = buildableFrom('run_5k', opts);
    const five = RACE_SPEC.run_5k;
    return {
      reason: 'cannot_run',
      altGoal,
      message: altGoal
        ? `Let's start with the 5K. Running continuously is the thing to build first, and once you can hold twenty minutes the ${spec.label} is a straightforward step up. ${OFFER_PHRASE.cannot_run(five.label)} — the ${spec.label} is still there afterwards.`
        : `Running continuously is the thing to build first, and once you can hold twenty minutes the ${spec.label} is a straightforward step up. The place to start is a 5K, and even that needs about ${five.idealWeeks} weeks — you've got ${opts.weeksAvailable}. Give me ${five.minWeeks} and I'll build it properly.`,
    };
  }

  if (opts.weeksAvailable < spec.minWeeks) {
    const altGoal = buildableFrom(spec.fallback, opts);
    const alt = altGoal ? RACE_SPEC[altGoal] : null;
    return {
      reason: 'not_enough_time',
      altGoal,
      message: alt
        ? `A ${spec.label} needs about ${spec.idealWeeks} weeks and you've got ${opts.weeksAvailable}. ${OFFER_PHRASE.not_enough_time(alt.label)} — and it's the right way to get to the ${spec.label} later, not a consolation. Want me to build that instead?`
        : `A ${spec.label} needs about ${spec.idealWeeks} weeks and you've got ${opts.weeksAvailable}. Give me ${spec.minWeeks} and I'll build it properly.`,
    };
  }

  if (opts.currentWeeklyMi < spec.minBaseMi) {
    const altGoal = buildableFrom(spec.fallback, opts);
    const alt = altGoal ? RACE_SPEC[altGoal] : null;
    return {
      reason: 'not_enough_base',
      altGoal,
      message: alt
        ? `A ${spec.label} build starts from about ${spec.minBaseMi} miles a week and you're at ${opts.currentWeeklyMi}. I'd be stacking volume on a base that isn't there yet, which is how people get hurt. ${OFFER_PHRASE.not_enough_base(alt.label)} — that's how you get the base.`
        : `A ${spec.label} build starts from about ${spec.minBaseMi} miles a week and you're at ${opts.currentWeeklyMi}. Let's build that base first.`,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// CONCERNS — the refusal, said once, when the athlete wants the race anyway (CA-D12)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What Holt would have refused, carried beside a plan he built anyway.
 *
 * ⚠ SAME REASONS, SAME ALTERNATIVE, DIFFERENT SENTENCE. The refusal said "no, build this instead"; the
 * concern says "here is what you asked for, here is what it costs, and here is the other road if you
 * want it". `altGoal` is still a race that builds PROPERLY for this athlete — the suggestion is worthless
 * if it would itself need overriding — and it is still read off the words by `counterOfferIn`.
 *
 * `no_running` is the one reason the rulebook never refused itself: `assemble()` did, off the athlete's
 * limitations. It lives here so the chat has one field to read, whatever the concern was.
 */
export interface EnduranceConcern {
  reason: EnduranceRefusal['reason'] | 'no_running';
  message: string;
  altGoal: EnduranceGoal | null;
}

/** Miles as Holt says them: tenths under ten, whole miles above — "around 12 miles", not "12.4". */
const saidMi = (mi: number): string => String(mi >= 10 ? Math.round(mi) : Math.round(mi * 10) / 10);

const weeksYouHave = (w: number): string =>
  w <= 0 ? 'the race is this week' : `you've got ${w} week${w === 1 ? '' : 's'}`;

/**
 * The limitation that ruled running out, in the athlete's own terms. First match wins, most explicit
 * first — someone who said "no running" said it more plainly than someone who said "knees".
 */
const STILL_STANDS = "If that still stands, say so and I'll build you something without it.";
const NO_RUNNING_LEAD: readonly [Limitation, string, string][] = [
  ['no_running', 'You told me to keep running out', STILL_STANDS],
  [
    'knees',
    'You told me to look after your knees, and running is the hardest thing in this plan on them',
    "Keep the easy days easy, and if they complain, tell me and I'll change it.",
  ],
  ['no_jumping', 'You told me no jumping, and running lands on every stride', STILL_STANDS],
];

/**
 * The concern sentence for a plan built anyway.
 *
 * `topLongMi` is read off the BUILT structure, not predicted: the concern names the long run the athlete
 * will actually meet, and a prediction that drifted from the plan would be Holt misdescribing his own
 * work. Null means the plan holds no continuous long run at all (run/walk, triathlon, a one-week block).
 */
export function enduranceConcernFor(
  goal: EnduranceGoal,
  refusal: EnduranceRefusal | null,
  opts: RefusalOpts & { topLongMi: number | null; limitations?: readonly Limitation[] },
): EnduranceConcern | null {
  const spec = RACE_SPEC[goal];
  const limits = opts.limitations ?? [];
  const lead = forbidsRunning(limits)
    ? (NO_RUNNING_LEAD.find(([l]) => limits.includes(l)) ?? NO_RUNNING_LEAD[0])
    : null;

  // What the short or thin build costs, in the one number an athlete can picture.
  const runsLong = goal !== 'triathlon' && opts.canRunContinuously !== false;
  const shortfall =
    goal === 'triathlon'
      ? ", but it's a compressed build, with less swim, bike and brick work than a full one gives you"
      : !runsLong
        ? ''
        : opts.topLongMi == null
          ? ", but there's no room for a long run before race day"
          : spec.raceMi != null && opts.topLongMi < spec.raceMi
            ? `, but the long run tops out around ${saidMi(opts.topLongMi)} miles`
            : '';

  let body: string | null = null;
  if (refusal) {
    const alt = refusal.altGoal ? RACE_SPEC[refusal.altGoal] : null;
    const five = RACE_SPEC.run_5k;
    switch (refusal.reason) {
      case 'cannot_run':
        body = alt
          ? `Running continuously is usually the thing to build first, and the 5K is the race built for that. I've built the ${spec.label} as run/walk all the way to race day, so expect to walk parts of it. ${SUGGEST_PHRASE(alt.label)} fits where you are now.`
          : `Running continuously is usually the thing to build first. I've built the ${spec.label} as run/walk all the way to race day, so expect to walk parts of it. If the date can move, give me ${five.minWeeks} weeks and a 5K builds properly first.`;
        break;
      case 'not_enough_time':
        body = alt
          ? `A ${spec.label} usually takes about ${spec.idealWeeks} weeks and ${weeksYouHave(opts.weeksAvailable)} — I've built it${shortfall}. ${SUGGEST_PHRASE(alt.label)} fits your calendar properly.`
          : `A ${spec.label} usually takes about ${spec.idealWeeks} weeks and ${weeksYouHave(opts.weeksAvailable)} — I've built it${shortfall}. If the date can move, give me ${spec.minWeeks} weeks and I'll build it properly.`;
        break;
      case 'not_enough_base': {
        const where = opts.currentWeeklyMi <= 0 ? "you're not running yet" : `you're at ${opts.currentWeeklyMi}`;
        body = alt
          ? `A ${spec.label} build usually starts from about ${spec.minBaseMi} miles a week and ${where}. I've built it from where you are, with the weekly increases kept inside the usual limits${shortfall}. ${SUGGEST_PHRASE(alt.label)} builds that base first.`
          : `A ${spec.label} build usually starts from about ${spec.minBaseMi} miles a week and ${where}. I've built it from where you are, with the weekly increases kept inside the usual limits${shortfall}. If the date can move, a base block first is the better road.`;
        break;
      }
    }
  }

  if (lead) {
    return {
      reason: 'no_running',
      altGoal: refusal?.altGoal ?? null,
      message: `${lead[1]} — I've built it with running because you asked for a race. ${lead[2]}${body ? ` ${body}` : ''}`,
    };
  }
  return refusal && body ? { reason: refusal.reason, altGoal: refusal.altGoal, message: body } : null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE VOLUME CURVE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface WeekVolume {
  weekIndex: number;
  mileage: number;
  longRunMi: number;
  phase: 'base' | 'build' | 'peak' | 'taper';
  isDeload: boolean;
  /**
   * Triathlon only: the week's training minutes, on the same phases and down weeks as the mileage. A
   * triathlon is measured in hours (`RaceSpec.peakHours`), so this — not `mileage` — is what sizes its
   * sessions. `mileage` is kept for triathlon as the run leg's curve the card already shows.
   */
  minutes?: number;
}

/**
 * Weekly mileage, week by week, from where they are now to the race.
 *
 * Three rules run at once and the SMALLEST always wins: the locked 10%/week ceiling, the target curve,
 * and — for the long run — the spike cap. A plan is allowed to ramp slower than the cap. It is never
 * allowed to ramp faster, and `validate` re-checks the built structure independently so a table that
 * ignores this fails rather than ships.
 *
 * Every fourth week steps DOWN rather than up. Block periodization "alternates easy and intensity weeks"
 * (PAS §7.1) and a curve that only ever climbs is not a block, it is a ramp — the athlete arrives at the
 * taper already emptied.
 */
export function weeklyVolumePlan(opts: {
  goal: EnduranceGoal;
  weeks: number;
  startMi: number;
  startLongMi?: number | null;
  /** Triathlon only: the most the athlete's week can hold (`triWeekCapacityMin`); the peak is capped at it. */
  capacityMin?: number;
}): WeekVolume[] {
  const spec = RACE_SPEC[opts.goal];
  const taperWeeks = Math.min(spec.taperWeeks, Math.max(1, opts.weeks - 2));
  const buildWeeks = opts.weeks - taperWeeks;

  // A true beginner starts at a real number rather than at zero, or a percentage ceiling compounds from
  // nothing and never arrives anywhere. Three miles a week is a walk/jog habit, which is where they are.
  const start = Math.max(opts.startMi, 3);

  /*
   * ══ THE LONG RUN DRIVES, AND WEEKLY VOLUME FOLLOWS ══
   *
   * The first version of this had it the other way round — the long run was a share of the week — and it
   * produced a MARATHON plan whose longest run was 7.3 miles. The share guideline (EPS-D2) describes what
   * a well-built week looks like at high mileage; used as a ceiling it caps the long run at whatever the
   * athlete already runs, and a marathon plan that never goes long is not a marathon plan.
   *
   * So the long run climbs toward what the race actually needs, bounded by the spike cap and the time cap
   * (EPS-D3b/D9), and the weekly target is pulled UP behind it to keep the week sanely proportioned.
   */
  const peakLong = spec.peakLongMi ?? 6;
  const targetPeakWeekly = Math.max(start * 1.8, peakLong / LONG_RUN_SHARE.max * 0.75);

  /*
   * Where their long run is TODAY, when they have not told us.
   *
   * ⚠ NOT `LONG_RUN_SHARE` — that is what a well-built week looks like, and using it here reads an
   * unstructured runner as more even than they are. Someone running 6 miles a week over three runs is
   * doing two miles at a time, not 1.8; someone on 40 is doing a 14-or-so at the weekend. 40% is the
   * honest read, and it matters because the spike cap compounds from this number: start it too low and
   * an eight-week 5K block peaks BELOW the race distance, which is what the first version did.
   */
  let longSoFar = Math.max(opts.startLongMi ?? start * 0.4, 1.5);
  // The ramp the build is climbing. ⚠ A DELOAD DIPS BELOW IT WITHOUT MOVING IT — the down week is
  // recovery, not a reset. Letting the deload become the new base is what made the first version
  // sawtooth between 20 and 24 miles for seventeen weeks and call the last one a peak.
  let ramp = start;
  let peakWeekly = start;

  /*
   * ══ TRIATHLON MINUTES — THE SAME CURVE, IN THE UNIT THE RACE IS MEASURED IN ══
   *
   * Same down weeks, same taper, same locked 10% ceiling on the ramp — only the target is the spec's peak
   * hours rather than a long run. The start is back-solved so the ramp arrives (see `TRI_START_MIN`): the
   * ramp weeks are counted first, and week 1 is the start ITSELF rather than 10% above it — the start is
   * an assumed training level, not a number the athlete has logged, so there is nothing to add to yet.
   */
  const tri = opts.goal === 'triathlon' && spec.peakHours != null;
  const peakMin = Math.min((spec.peakHours ?? 0) * 60, opts.capacityMin ?? Infinity);
  let rampWeeks = 0;
  for (let w = 0; w < buildWeeks; w += 1) if (!(w > 0 && (w + 1) % 4 === 0)) rampWeeks += 1;
  const startMin = Math.min(
    TRI_START_MIN.ceiling,
    Math.max(TRI_START_MIN.floor, peakMin / (1 + WEEKLY_INCREASE_CAP) ** Math.max(0, rampWeeks - 1)),
  );
  let rampMin = startMin;
  let peakMinSoFar = startMin;
  let rampedYet = false;

  const out: WeekVolume[] = [];

  for (let w = 0; w < opts.weeks; w += 1) {
    const inTaper = w >= buildWeeks;
    // Never week 1 (nothing yet to recover from) and never inside the taper, which is already a cut.
    const isDeload = !inTaper && w > 0 && (w + 1) % 4 === 0;

    let mileage: number;
    let longRunMi: number;
    let phase: WeekVolume['phase'];
    let minutes = rampMin;

    if (inTaper) {
      phase = 'taper';
      const step = (w - buildWeeks + 1) / taperWeeks;
      mileage = peakWeekly * (1 - TAPER_VOLUME_CUT * step);
      // The long run comes down with it but never disappears: race-specific feel is retained while the
      // fatigue is shed, which is the same reason intensity is retained (EPS-D6).
      longRunMi = longSoFar * (1 - 0.5 * step);
      phase = 'taper';
      minutes = peakMinSoFar * (1 - TAPER_VOLUME_CUT * step);
    } else if (isDeload) {
      phase = 'build';
      mileage = ramp * 0.75;
      longRunMi = longSoFar * 0.7;
      minutes = rampMin * 0.75;
    } else {
      rampMin = rampedYet ? Math.min(rampMin * (1 + WEEKLY_INCREASE_CAP), peakMin) : startMin;
      rampedYet = true;
      minutes = rampMin;
      peakMinSoFar = Math.max(peakMinSoFar, rampMin);

      // ⚠ THE LOCKED 10%/WEEK CEILING (EPS-D3), applied to the ramp rather than to last week's number.
      ramp = Math.min(ramp * (1 + WEEKLY_INCREASE_CAP), targetPeakWeekly);
      mileage = ramp;
      // EPS-D3b — the guard the evidence actually supports, against the longest run so far.
      longSoFar = Math.min(longSoFar * LONG_RUN_SPIKE_CAP, peakLong, LONG_RUN_DISTANCE_CAP_MI);
      longRunMi = longSoFar;
      peakWeekly = Math.max(peakWeekly, mileage);

      const progress = buildWeeks <= 1 ? 1 : w / (buildWeeks - 1);
      phase = w === buildWeeks - 1 ? 'peak' : progress < 0.4 ? 'base' : 'build';
    }

    out.push({
      weekIndex: w,
      mileage: Math.round(mileage * 10) / 10,
      longRunMi: Math.round(Math.max(1, longRunMi) * 10) / 10,
      phase,
      isDeload,
      ...(tri ? { minutes: Math.round(minutes) } : {}),
    });
  }

  return out;
}

/**
 * The long run's time cap, applied where it can be: with a known easy pace, a distance that would take
 * more than three hours is cut back to what three hours buys. EPS-D9 — both caps, whichever binds first.
 */
export function longRunAfterTimeCap(mi: number, easyPaceSec: number | null): number {
  if (easyPaceSec == null || easyPaceSec <= 0) return mi;
  const capMi = LONG_RUN_TIME_CAP_SEC / easyPaceSec;
  return Math.round(Math.min(mi, capMi) * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE WEEK
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type SessionRole =
  | 'easy'
  | 'long'
  | 'tempo'
  | 'intervals'
  | 'run_walk'
  | 'swim'
  | 'bike'
  | 'brick'
  | 'shakeout'
  | 'race';

/** Hard days are never consecutive (PAS §11.4), which bounds how many a week can hold at all. */
export const maxHardFor = (daysPerWeek: number): number => Math.ceil(daysPerWeek / 2);

/**
 * Which sessions the week holds and in what order.
 *
 * The long run goes last — it is the week's largest stress and everything else is arranged around it —
 * and the remaining hard days are spread from the front so that no two ever land side by side. The count
 * is bounded twice: by experience (EPS-D4) and by whether the week is long enough to separate them.
 */
export function composeRunWeek(opts: {
  daysPerWeek: number;
  experience: Experience;
  phase: WeekVolume['phase'];
  canRunContinuously: boolean;
  isRaceWeek?: boolean;
}): SessionRole[] {
  const days = Math.max(2, opts.daysPerWeek);

  if (!opts.canRunContinuously && !opts.isRaceWeek) {
    /* ⚠ EVERY session is run/walk — INCLUDING the longest one. The first version made the last day a
       'long' role, which is a continuous run at easy pace, handed to someone whose defining constraint is
       that they cannot yet run continuously. It read as a plan that quietly stopped believing its own
       premise on day four. The longer session is a longer run/walk; `buildRunDay` gives it more repeats. */
    return Array.from({ length: days }, () => 'run_walk');
  }

  /*
   * ══ RACE WEEK IS NOT A TRAINING WEEK ══
   *
   * The taper cuts volume and keeps intensity (EPS-D6), and applied blindly to the FINAL week that gave
   * a marathon plan a forty-minute tempo and a long run in the same week as the marathon. Volume-cut
   * arithmetic has no concept of the race being in it. The last week is a couple of easy runs, a short
   * shakeout, and the thing they have been training for.
   */
  if (opts.isRaceWeek) {
    const roles: SessionRole[] = Array.from({ length: Math.min(days, 4) }, () => 'easy');
    if (roles.length >= 2) roles[roles.length - 2] = 'shakeout';
    roles[roles.length - 1] = 'race';
    return roles;
  }

  const wanted = HARD_SESSIONS[opts.experience];
  // The taper keeps intensity and cuts volume (EPS-D6), so the hard sessions stay in the week.
  const hard = Math.min(wanted, maxHardFor(days));

  const roles: SessionRole[] = Array.from({ length: days }, () => 'easy');
  roles[days - 1] = 'long';

  // Fill backwards from the day before the long run, every other day, so the gaps fall out of the
  // placement rather than needing a repair pass afterwards.
  const extras = hard - 1;
  let placed = 0;
  for (let i = days - 3; i >= 0 && placed < extras; i -= 2) {
    // Base is aerobic by definition: its one quality session is a tempo, never intervals.
    roles[i] = placed === 0 || opts.phase === 'base' ? 'tempo' : 'intervals';
    placed += 1;
  }

  return roles;
}

/**
 * Sessions for a triathlon week, balanced by EPS-D11 and carrying one brick.
 *
 * ⚠ THE WEEK IS THE DAYS THEY GAVE. The first version floored this at three, so a two-day athlete got a
 * three-session week — a plan whose weeks disagreed with its own `daysPerWeek`. Two days is a swim and a
 * brick: the brick carries the bike and the run, and the swim is the discipline that least survives
 * being left out.
 */
export function composeTriWeek(daysPerWeek: number, opts: { isRaceWeek?: boolean } = {}): SessionRole[] {
  const days = Math.max(1, daysPerWeek);

  /*
   * ══ RACE WEEK — THE SAME RULE AS THE RUN PLANS' ══
   *
   * A few short sharpening sessions and the race: one of each discipline with a handful of race-effort
   * openers, and nothing that builds. At most four sessions whatever the usual week is, as for the runs
   * (`composeRunWeek`). With fewer days the brick stands in for the bike and the run, because a short
   * brick is the classic race-week opener — it rehearses the transition as well as the legs. DEFAULT
   * PENDING PO REVIEW.
   */
  if (opts.isRaceWeek) {
    const n = Math.min(days, 4);
    if (n <= 1) return ['race'];
    if (n === 2) return ['brick', 'race'];
    if (n === 3) return ['swim', 'brick', 'race'];
    return ['swim', 'bike', 'shakeout', 'race'];
  }

  if (days <= 2) return days === 1 ? ['brick'] : ['swim', 'brick'];
  const roles: SessionRole[] = [];
  // Bike-led, because it is the biggest race-day share and the cheapest place to put volume.
  const rotation: SessionRole[] = ['swim', 'bike', 'easy', 'swim', 'bike', 'easy'];
  for (let i = 0; i < days - 1; i += 1) roles.push(rotation[i % rotation.length]);
  roles.push('brick'); // One a week, after the week's biggest ride.
  return roles;
}

/**
 * Which of a triathlon week's sessions carry quality work, by index.
 *
 * EPS-D4 applied to three sports: the brick is the week's long session and counts as one of the hard
 * days, the way the long run does. The rest go to the BIKE first (cheapest place for intensity, as in
 * EPS-D11), then the swim, and to a run last — the run is where intensity costs the most tissue. None may
 * sit beside another hard day (PAS §11.4), which is why a three-day week's second quality session lands
 * on the swim rather than the ride next to the brick. A down week carries none: it is recovery.
 * DEFAULT PENDING PO REVIEW.
 */
export function triQualityIndexes(roles: readonly SessionRole[], experience: Experience, isDeload: boolean): Set<number> {
  const out = new Set<number>();
  const brick = roles.lastIndexOf('brick');
  if (brick < 0 || isDeload) return out;
  const hard = new Set<number>([brick]);
  let wanted = Math.min(HARD_SESSIONS[experience], maxHardFor(roles.length)) - 1;
  for (const pref of ['bike', 'swim', 'easy'] as const) {
    for (let i = 0; i < roles.length && wanted > 0; i += 1) {
      if (roles[i] !== pref || hard.has(i - 1) || hard.has(i + 1)) continue;
      hard.add(i);
      out.add(i);
      wanted -= 1;
    }
  }
  return out;
}

/** One triathlon session's main-block length: seconds, or a brick's ride and run. */
export type TriSessionSec = number | { rideSec: number; runSec: number };

const toFive = (min: number) => Math.round(min / 5) * 5 * 60;

/**
 * Share a week's minutes over its sessions — EPS-D11's split, inside the session caps.
 *
 * Swim and run are shared first and capped; what they cannot hold goes to the bike, and the bike's
 * minutes are split with the brick's ride weighted as the long ride (`TRI_BRICK_RIDE_WEIGHT`). Every
 * session is rounded to five minutes — a 67-minute ride is a number nobody sets a watch to.
 */
export function triSessionMinutes(roles: readonly SessionRole[], weekMin: number): TriSessionSec[] {
  const count = (r: SessionRole) => roles.filter((x) => x === r).length;
  const nSwim = count('swim');
  const nRide = count('bike');
  const nRun = count('easy');
  const hasBrick = roles.includes('brick');
  const cap = TRI_SESSION_CAP_MIN;
  const floor = TRI_SESSION_FLOOR_MIN;

  let bikePool = weekMin * TRI_SPLIT.bike;

  const swimPool = weekMin * TRI_SPLIT.swim;
  const swim = nSwim ? Math.min(cap.swim, swimPool / nSwim) : 0;
  bikePool += swimPool - swim * nSwim;

  const runPool = weekMin * TRI_SPLIT.run;
  const runShares = nRun + (hasBrick ? TRI_BRICK_RUN_WEIGHT : 0);
  const runUnit = runShares > 0 ? runPool / runShares : 0;
  const run = Math.min(cap.run, runUnit);
  const brickRun = hasBrick ? Math.min(cap.brickRun, runUnit * TRI_BRICK_RUN_WEIGHT) : 0;
  bikePool += runPool - run * nRun - brickRun;

  // The long ride is shared first; what its cap will not hold goes to the midweek rides, not the floor.
  const rideShares = nRide + (hasBrick ? TRI_BRICK_RIDE_WEIGHT : 0);
  const rideUnit = rideShares > 0 ? bikePool / rideShares : 0;
  const brickRide = hasBrick ? Math.min(cap.longRide, rideUnit * TRI_BRICK_RIDE_WEIGHT) : 0;
  const ride = nRide ? Math.min(cap.ride, (bikePool - brickRide) / nRide) : 0;

  return roles.map((r): TriSessionSec => {
    switch (r) {
      case 'swim':
        return toFive(Math.max(floor.swim, swim));
      case 'bike':
        return toFive(Math.max(floor.ride, ride));
      case 'easy':
        return toFive(Math.max(floor.run, run));
      case 'brick':
        return { rideSec: toFive(Math.max(floor.ride, brickRide)), runSec: toFive(Math.max(floor.brickRun, brickRun)) };
      default:
        return 0;
    }
  });
}

/** Total minutes a set of triathlon sessions holds, as built. */
export const triMinutesOf = (secs: readonly TriSessionSec[]): number =>
  secs.reduce<number>((n, s) => n + (typeof s === 'number' ? s : s.rideSec + s.runSec), 0) / 60;

/**
 * The most a triathlon week of this many days can hold with every session at its cap.
 *
 * ⚠ THE CURVE IS CAPPED AT THIS, NOT JUST THE SESSIONS. Capping only the sessions let a two-day plan's
 * target climb to eight hours while the week it built sat flat at five — so its down weeks and its taper,
 * cuts taken from a target the week never reached, built exactly the same five hours as the peak. A cut
 * nobody can see is not a cut.
 */
export const triWeekCapacityMin = (daysPerWeek: number): number =>
  triMinutesOf(triSessionMinutes(composeTriWeek(daysPerWeek), 1e6));

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// BUILDING THE DAY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ **THE CUE GOES IN `coachNote`, AND I HAD IT IN THE NAME.**
 *
 * The first version folded every coaching cue into the exercise's NAME — "Easy Run · easy means easy,
 * this is where the base is built" — on the belief that the model had nowhere else to put it. That was
 * true of `ProgramExercise` once and is not true now: **`coachNote` exists**, it is the author's
 * instruction on a prescription, and the active workout already renders it under **THE PLAN SAYS**.
 *
 * The distinction matters beyond tidiness. A name is an identity — it is what the lift IS, what history
 * groups by, what a picker matches. A cue is an instruction about how to perform it: "4 second
 * negatives", "hold Z2, this is not a workout". Putting the second inside the first makes every session
 * of the same movement look like a different exercise, and makes the instruction impossible to change
 * without renaming the thing it describes.
 *
 * So: names are names, and `cue` lands in `coachNote`.
 */
const cardio = (
  activity: ProgramExercise['activity'],
  fields: Partial<ProgramExercise>,
  name: string,
  cue?: string,
): ProgramExercise =>
  ({
    catalogKey: `cardio:${activity}`,
    name,
    kind: 'cardio',
    activity,
    modality: activity === 'swim' ? 'indoor' : 'outdoor',
    sets: 1,
    ...(cue ? { coachNote: cue } : {}),
    ...fields,
  }) as ProgramExercise;

/**
 * Warm-up and cool-down for a running day.
 *
 * ⚠ **NOT WHAT PAS §11.4 SPECIFIES, AND THAT IS A CONTENT GAP RATHER THAN A CHOICE.** The locked rule
 * asks for a DYNAMIC warm-up — leg swings, hip circles, high knees — and the catalogue contains none of
 * them: it has the static stretches for the cool-down (which §11.4 also requires, and correctly puts
 * after rather than before) but not one dynamic drill. So the warm-up here is a progressive easy jog,
 * which is legitimate and universal, and the drills are named in the note instead of prescribed as rows
 * nobody can tap. Closing this properly means appending to the catalogue, which pulls in coaching
 * content, media and relationships for each new movement — reported, not done quietly.
 */
function runWarmup(): ProgramExercise[] {
  return [cardio('run', { targetSec: 600 }, 'Easy Warm-Up', 'Ten minutes easy to open up. Leg swings and a few high knees before you go.')];
}

function runCooldown(stretchKeys: readonly string[]): ProgramExercise[] {
  const out: ProgramExercise[] = [cardio('walk', { targetSec: 300 }, 'Cool-Down Walk')];
  // Static stretching AFTER, never before — the one part of §11.4 the catalogue can actually satisfy.
  for (const key of stretchKeys.slice(0, 3)) {
    out.push({ catalogKey: key, name: '', sets: 1, durationSec: 30 } as unknown as ProgramExercise);
  }
  return out;
}

export interface RunDayInput {
  role: SessionRole;
  weeklyMi: number;
  longRunMi: number;
  paces: TrainingPaces | null;
  stretchKeys: readonly string[];
  hardCount: number;
  /**
   * 0 → 1 across the build, 1 through the taper.
   *
   * ⚠ WITHOUT THIS THE QUALITY SESSIONS NEVER CHANGE. The first version prescribed a 20-minute tempo in
   * week 1 and the same 20-minute tempo in week 14 of a marathon block — the mileage climbed around them
   * while the workouts stood still, which is a volume ramp wearing a plan's clothes. Progression is the
   * product; a session that never advances is not a session, it is a placeholder.
   */
  progress: number;
  /** The longest run/walk of the week gets more repeats — how a beginner's block advances at all. */
  isLongest?: boolean;
  /** The race distance, for the one day that is the race. */
  raceMi?: number | null;
}

/** One day, as rows the app can render and the athlete can tap. */
export function buildRunDay(input: RunDayInput, letter: string): ProgramDay {
  const { role, weeklyMi, longRunMi, paces } = input;

  // Easy mileage is what is left after the week's prescribed sessions, divided over the easy days.
  const easyPool = Math.max(1, weeklyMi - longRunMi);
  const easyDays = Math.max(1, 7 - input.hardCount);
  const easyMi = Math.round((easyPool / easyDays) * 10) / 10;

  const pace = (sec: number | undefined) => (sec == null ? {} : { targetPaceSec: sec });

  // Everything that advances across the block, in one place. `progress` is 0 in week 1 and 1 at the peak,
  // so each of these is "where it starts" plus "how far it has come".
  const t = Math.max(0, Math.min(1, input.progress));
  const step = (from: number, to: number) => Math.round(from + (to - from) * t);
  const tempoSec = step(20, 40) * 60;
  const intervalReps = step(4, 6);
  const rideSec = step(45, 90) * 60;
  const brickRideSec = step(40, 75) * 60;
  const brickRunSec = step(10, 25) * 60;
  const swimMi = Math.round(step(30, 70)) / 100;
  // A beginner advances by running MORE of each interval and repeating it more often — the walk shrinks
  // as a consequence rather than as a separate instruction.
  const rwRunSec = step(RUN_WALK_START.runSec, 300);
  const rwReps = input.isLongest ? step(8, 10) : step(6, 8);

  switch (role) {
    case 'long':
      return {
        letter,
        name: 'Long Run',
        warmup: runWarmup(),
        main: [
          cardio(
            'run',
            { targetMi: longRunMi, ...pace(paces?.easySec) },
            'Long Run',
            'Conversational the whole way. If you cannot talk, you are running it too fast.',
          ),
        ],
        cooldown: runCooldown(input.stretchKeys),
      };

    case 'tempo':
      return {
        letter,
        name: 'Tempo Run',
        warmup: runWarmup(),
        main: [
          cardio(
            'run',
            { targetSec: tempoSec, ...pace(paces?.thresholdSec) },
            'Tempo',
            'Comfortably hard — you could speak a sentence, not hold a conversation.',
          ),
        ],
        cooldown: runCooldown(input.stretchKeys),
      };

    case 'intervals':
      return {
        letter,
        name: 'Intervals',
        warmup: runWarmup(),
        main: [
          cardio(
            'run',
            { sets: intervalReps, targetSec: 3 * 60, ...pace(paces?.intervalSec) },
            'Intervals',
            `${intervalReps} × 3 minutes hard, 3 minutes easy jog between. The jog is part of the session.`,
          ),
        ],
        cooldown: runCooldown(input.stretchKeys),
      };

    case 'run_walk':
      return {
        letter,
        name: 'Run / Walk',
        warmup: [cardio('walk', { targetSec: 300 }, 'Warm-Up Walk')],
        main: [
          cardio(
            'run',
            { sets: rwReps, targetSec: rwRunSec },
            'Run / Walk',
            `Run ${rwRunSec}s, walk ${RUN_WALK_START.walkSec}s, ${rwReps} times through. The walk is part of the session, not a failure of it.`,
          ),
        ],
        cooldown: [cardio('walk', { targetSec: 300 }, 'Cool-Down Walk')],
      };

    case 'swim':
      return {
        letter,
        name: 'Swim',
        warmup: [],
        // EPS-D12 — distance only. A swimmer's honest metric is a per-100 split and the app computes none,
        // so prescribing a pace here would be inventing a number nobody can read back.
        main: [cardio('swim', { targetMi: swimMi }, 'Swim', `${swimMi} mi steady. Technique before volume — this is the discipline I cannot coach for you.`)],
        cooldown: [],
      };

    case 'bike':
      return {
        letter,
        name: 'Ride',
        warmup: [],
        main: [cardio('bike', { targetSec: rideSec }, 'Ride', 'Steady aerobic effort. You should be able to hold this all day.')],
        cooldown: [],
      };

    case 'brick':
      return {
        letter,
        name: 'Brick',
        warmup: [],
        main: [
          cardio('bike', { targetSec: brickRideSec }, 'Ride', 'Steady. Save something for what follows it.'),
          cardio('run', { targetSec: brickRunSec }, 'Run', 'Straight off the bike, no sitting down. Your legs will feel odd for the first mile — that is the session.'),
        ],
        cooldown: [cardio('walk', { targetSec: 300 }, 'Cool-Down Walk')],
      };

    case 'shakeout':
      return {
        letter,
        name: 'Shakeout',
        warmup: [],
        main: [
          cardio(
            'run',
            { targetSec: 15 * 60, ...pace(paces?.easySec) },
            'Shakeout',
            'Fifteen minutes easy, just to open the legs. Nothing to prove today.',
          ),
        ],
        cooldown: [],
      };

    case 'race':
      return {
        letter,
        name: 'Race Day',
        warmup: runWarmup(),
        // The race is prescribed as the distance it is, with no pace: the plan has no business telling
        // someone how fast to run the thing it spent seventeen weeks preparing them for.
        main: [cardio('run', { targetMi: input.raceMi ?? undefined }, 'Race Day', 'This is the one. Everything before it was for this.')],
        cooldown: [cardio('walk', { targetSec: 600 }, 'Cool-Down Walk')],
      };

    case 'easy':
    default:
      return {
        letter,
        name: 'Easy Run',
        warmup: runWarmup(),
        main: [
          cardio(
            'run',
            { targetMi: easyMi, ...pace(paces?.easySec) },
            'Easy Run',
            'Easy means easy. This is where the base is built, and running it hard costs you the session that matters.',
          ),
        ],
        cooldown: runCooldown(input.stretchKeys),
      };
  }
}

export interface TriDayInput {
  role: SessionRole;
  /** This session's length from `triSessionMinutes`; ignored in race week, whose openers are fixed. */
  sec: TriSessionSec;
  phase: WeekVolume['phase'];
  /** Carries the week's quality work (`triQualityIndexes`). */
  quality: boolean;
  isDeload: boolean;
  isRaceWeek: boolean;
  /** The last session before the race — where "take tomorrow off" is said. */
  lastBeforeRace: boolean;
  /** 0 → 1 across the build, 1 through the taper — as for the run plans. */
  progress: number;
  stretchKeys: readonly string[];
}

/**
 * Race-week openers, in minutes. DEFAULT PENDING PO REVIEW: the mainstream race-week shape — short, with
 * a few race-effort pieces so the legs remember the pace, and nothing that leaves fatigue behind.
 */
export const TRI_OPENER_MIN = { swim: 20, ride: 30, run: 15, brickRide: 25, brickRun: 10 } as const;

/**
 * One triathlon day.
 *
 * Separate from `buildRunDay` because every triathlon session is sized in MINUTES off the week's budget,
 * where a run plan's are sized in miles off its mileage — sharing that switch is how the triathlon's
 * sessions came to ignore the week entirely. EPS-D12 still holds: the swim carries a duration, never a
 * pace and never a distance derived from one.
 *
 * ⚠ "REST THE DAY BEFORE" IS SAID, NOT SCHEDULED. A week here is an ordered list of sessions with no
 * calendar under it, so the rest day cannot be a row; it is the last opener's instruction instead.
 */
export function buildTriDay(input: TriDayInput, letter: string): ProgramDay {
  const { role, quality, phase } = input;
  const t = Math.max(0, Math.min(1, input.progress));
  const step = (from: number, to: number) => Math.round(from + (to - from) * t);
  const one = typeof input.sec === 'number' ? input.sec : 0;
  const brick = typeof input.sec === 'number' ? { rideSec: 0, runSec: 0 } : input.sec;
  const restTomorrow = input.lastBeforeRace ? ' Take tomorrow off completely — the day before the race is rest.' : '';
  const recovery = input.isDeload ? ' Recovery week: all of it easy, nothing hard.' : '';

  if (input.isRaceWeek) {
    switch (role) {
      case 'swim':
        return {
          letter,
          name: 'Swim',
          warmup: [],
          main: [cardio('swim', { targetSec: TRI_OPENER_MIN.swim * 60 }, 'Swim', `Easy, with 4 × 50 at race effort. Sharpening, not training.${restTomorrow}`)],
          cooldown: [],
        };
      case 'bike':
        return {
          letter,
          name: 'Ride',
          warmup: [],
          main: [cardio('bike', { targetSec: TRI_OPENER_MIN.ride * 60 }, 'Ride', `Easy, with 3 × 2 minutes at race effort. Check the bike while you are on it.${restTomorrow}`)],
          cooldown: [],
        };
      case 'brick':
        return {
          letter,
          name: 'Brick',
          warmup: [],
          main: [
            cardio('bike', { targetSec: TRI_OPENER_MIN.brickRide * 60 }, 'Ride', 'Easy, with 3 × 1 minute at race effort.'),
            cardio('run', { targetSec: TRI_OPENER_MIN.brickRun * 60 }, 'Run', `Straight off the bike, easy, a few strides to finish.${restTomorrow}`),
          ],
          cooldown: [],
        };
      case 'shakeout':
        return {
          letter,
          name: 'Shakeout',
          warmup: [],
          main: [cardio('run', { targetSec: TRI_OPENER_MIN.run * 60 }, 'Shakeout', `Fifteen minutes easy with four short strides. Nothing to prove today.${restTomorrow}`)],
          cooldown: [],
        };
      case 'race':
      default:
        return {
          letter,
          name: 'Race Day',
          warmup: [],
          // No distances and no paces: the rulebook does not know whether this is a sprint or an Olympic,
          // and it has no business telling someone how fast to race the thing it prepared them for.
          main: [
            cardio('swim', {}, 'Swim', 'Start wide and easy. Find your rhythm before you find anyone else’s feet.'),
            cardio('bike', {}, 'Ride', 'Ride your effort, not theirs. You still have to run.'),
            cardio('run', {}, 'Run', 'This is the one. Everything before it was for this.'),
          ],
          cooldown: [],
        };
    }
  }

  switch (role) {
    case 'swim':
      return {
        letter,
        name: 'Swim',
        warmup: [],
        main: [
          cardio(
            'swim',
            { targetSec: one },
            'Swim',
            quality
              ? `Main set: ${step(6, 10)} × 100 at a strong, even effort, 20 seconds' rest between. Easy either side.`
              : `Steady. Technique before volume — this is the discipline I cannot coach for you.${recovery}`,
          ),
        ],
        cooldown: [],
      };

    case 'bike':
      return {
        letter,
        name: 'Ride',
        warmup: [],
        main: [
          cardio(
            'bike',
            { targetSec: one },
            'Ride',
            // Base is aerobic by definition: its quality is tempo; the build, peak and taper sharpen to
            // threshold — and the taper keeps it (EPS-D6), because `progress` holds at 1 through it.
            quality
              ? phase === 'base'
                ? `Include ${step(2, 3)} × 8 minutes at tempo — comfortably hard — with 4 minutes easy between.`
                : `Include ${step(3, 5)} × 5 minutes at threshold with 3 minutes easy between.`
              : `Steady aerobic effort. You should be able to hold this all day.${recovery}`,
          ),
        ],
        cooldown: [],
      };

    case 'brick':
      return {
        letter,
        name: 'Brick',
        warmup: [],
        main: [
          cardio('bike', { targetSec: brick.rideSec }, 'Ride', `The week's long ride. Steady — save something for what follows it.${recovery}`),
          cardio(
            'run',
            { targetSec: brick.runSec },
            'Run',
            !input.isDeload && (phase === 'peak' || phase === 'taper')
              ? 'Straight off the bike, no sitting down. Settle into race effort for the middle of it.'
              : 'Straight off the bike, no sitting down. Your legs will feel odd for the first mile — that is the session.',
          ),
        ],
        cooldown: [cardio('walk', { targetSec: 300 }, 'Cool-Down Walk')],
      };

    case 'easy':
    default:
      return {
        letter,
        name: quality ? 'Tempo Run' : 'Easy Run',
        warmup: runWarmup(),
        main: [
          cardio(
            'run',
            { targetSec: one },
            quality ? 'Tempo' : 'Easy Run',
            quality
              ? `Include ${step(2, 3)} × 8 minutes comfortably hard, easy running between and around them.`
              : `Easy means easy — you have a swim and a ride to recover from as well.${recovery}`,
          ),
        ],
        cooldown: runCooldown(input.stretchKeys),
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE PROGRAM
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface EnduranceAssembly {
  structure: ProgramStructure;
  volume: WeekVolume[];
  paces: TrainingPaces | null;
  refusal: EnduranceRefusal | null;
  /**
   * What Holt would have refused, when the athlete asked to build anyway (`buildAnyway`) — said once,
   * with the suggestion. Always null without `buildAnyway`: then a concern is a refusal, as before.
   */
  concern: EnduranceConcern | null;
  /** The target time, read (`goalTimePlanFor`). Null when the athlete named none. */
  goalTime: GoalTimePlan | null;
  /** The sessions each week holds, in order — what a race-and-lift week arranges its lifting around. */
  roles: SessionRole[][];
}

export const isEndurance = (g: Goal): g is EnduranceGoal => isEnduranceGoal(g);

/** What the rulebook needs from outside itself: the clock, and catalogue keys for the cool-down. */
export interface EnduranceOpts {
  todayISO: string;
  stretchKeys: readonly string[];
  canRunContinuously?: boolean;
  recentRaceMi?: number | null;
  recentRaceSec?: number | null;
  /**
   * How many of the week's days are RUNNING days. Absent means the whole week, which is a pure race plan.
   *
   * ⚠ THE CURVE DOES NOT MOVE WITH IT. `weeklyVolumePlan` is a function of the race, the weeks and where
   * the athlete is starting from — never of how the week is carved up — so a race-and-lift block climbs
   * the same mileage the pure plan does, over fewer days. That is the whole point of the field existing.
   */
  enduranceDays?: number;
  /**
   * Race week keeps the week's day COUNT, padding with more of its easiest session.
   *
   * ⚠ ONLY A RACE-AND-LIFT BLOCK ASKS FOR THIS, and it asks because its weeks have lifting in them: a week
   * that quietly loses two sessions is a week whose shape the athlete's calendar no longer recognises, and
   * a program whose weeks disagree about their own length is one the validator will not walk
   * (`schedule_mismatch`). `composeRunWeek`'s cap of four stands for a pure plan, where a short race week
   * is simply a short week. A six-day runner still runs six days in race week; the extra ones are easy.
   */
  keepDaysInRaceWeek?: boolean;
}

/**
 * The block itself — the curve, the paces, the target and the week-by-week sessions, with no program
 * structure around it.
 *
 * ══ SPLIT OUT SO A RACE-AND-LIFT WEEK IS THE SAME BLOCK ══
 *
 * "Strong AND run a sub-25 5K" is not a second product: its running days are these running days, off this
 * curve, with these phases, this taper and this race week. `assembleEndurance` wraps this into a program
 * of nothing but running; `assembleRaceAndLift` (in `assemble.ts`) interleaves the strength rulebook's
 * days between them. Neither owns a second copy of the coaching.
 */
export interface EnduranceBlock {
  goal: EnduranceGoal;
  spec: RaceSpec;
  weeks: number;
  weeksAvailable: number;
  currentWeeklyMi: number;
  canRun: boolean;
  /** Running days a week, after EPS-D7's beginner floor. */
  daysPerWeek: number;
  volume: WeekVolume[];
  paces: TrainingPaces | null;
  goalTime: GoalTimePlan | null;
  refusal: EnduranceRefusal | null;
  /** One entry per week, in order. Empty when the block was refused and not built. */
  weekPlans: { roles: SessionRole[]; days: ProgramDay[] }[];
}

export function enduranceBlock(c: CoachConstraints, opts: EnduranceOpts): EnduranceBlock {
  const goal = c.goal as EnduranceGoal;
  const spec = RACE_SPEC[goal];

  const weeksAvailable = c.raceDate ? weeksUntilRace(c.raceDate, opts.todayISO) : (c.weeks ?? spec.idealWeeks);
  const currentWeeklyMi = c.currentWeeklyMi ?? 0;
  const canRun = opts.canRunContinuously ?? currentWeeklyMi > 0;

  const refusal = enduranceRefusalFor(goal, {
    weeksAvailable,
    currentWeeklyMi,
    canRunContinuously: canRun,
  });

  const { paces, from } = pacesFor({
    goal,
    recentRaceMi: opts.recentRaceMi,
    recentRaceSec: opts.recentRaceSec,
    goalTimeSec: c.goalTimeSec,
  });

  /*
   * ══ CA-D12 — THE ATHLETE'S RACE IS THE ATHLETE'S ══
   *
   * PO, 2026-09-21: *"Holt shouldn't really say no to a race. Maybe suggest, but then just have him do
   * what they say."* With `buildAnyway` nothing below refuses. It does not lift a single cap: the 10%
   * ramp, the long-run spike cap and the distance cap bind exactly as they do for a full build, because
   * they are what keeps a compressed block from hurting the person who asked for it. What gives instead
   * is how far the block gets — a six-week marathon's long run stops well short of 26.2, and the concern
   * says so in miles rather than pretending otherwise.
   *
   *   too few weeks  → the block is the weeks there are, ≥1; `weeklyVolumePlan` already shrinks the taper
   *                    to fit and the final week is always race week.
   *   too little base → the curve starts from where they are (its own 3 mi floor for a true zero).
   *   can't run yet  → run/walk to the start line, the 5K's machinery, whatever the distance.
   */
  const buildAnyway = c.buildAnyway === true;

  // ⚠ The upper clamp is the old one, untouched — a race further out than the plan cap keeps today's
  // placement (a separate open decision). `max(1, …)` only matters under `buildAnyway`: without it a
  // plan this short was refused above.
  const weeks = Math.max(1, Math.min(weeksAvailable, spec.idealWeeks + 8));
  const goalTime = goalTimePlanFor({
    goal,
    goalTimeSec: c.goalTimeSec,
    weeks,
    currentWeeklyMi,
    recentRaceMi: opts.recentRaceMi,
    recentRaceSec: opts.recentRaceSec,
    from,
  });
  const asked = opts.enduranceDays ?? c.daysPerWeek;
  // EPS-D7 — a beginner gets three days whatever they asked for. Fewer cannot carry a base; more, before
  // the tissue is ready, is the commonest way a new runner's first block ends in an injury.
  const daysPerWeek = canRun ? asked : Math.max(MIN_DAYS_BEGINNER, Math.min(asked, 4));

  const bare = {
    goal,
    spec,
    weeks,
    weeksAvailable,
    currentWeeklyMi,
    canRun,
    daysPerWeek,
    paces,
    goalTime,
    refusal,
  };
  if (refusal && !buildAnyway) return { ...bare, volume: [], weekPlans: [] };

  const volume = weeklyVolumePlan({
    goal,
    weeks,
    startMi: currentWeeklyMi,
    ...(goal === 'triathlon' ? { capacityMin: triWeekCapacityMin(daysPerWeek) } : {}),
  });

  const weekPlans = volume.map((v) => {
    // 0 in week 1, 1 at the peak, and held at 1 through the taper — intensity is RETAINED while volume
    // falls (EPS-D6), so a taper week's tempo is the peak week's tempo, not week one's.
    const buildLast = Math.max(1, volume.filter((x) => x.phase !== 'taper').length - 1);
    const progress = v.phase === 'taper' ? 1 : Math.min(1, v.weekIndex / buildLast);
    const isRaceWeek = v.weekIndex === volume.length - 1;

    /*
     * ══ TRIATHLON — THE SAME CURVE THE RUNS GET ══
     *
     * Sized from `v.minutes`, so the down weeks, the taper and the race week the curve always carried
     * finally reach the sessions. Before this the triathlon branch read nothing of `v`: every week was the
     * same sessions growing on a fixed ramp, straight through the taper and past a race that never came.
     */
    if (goal === 'triathlon') {
      const roles = keepDays(composeTriWeek(daysPerWeek, { isRaceWeek }), isRaceWeek ? daysPerWeek : 0, opts);
      const secs = triSessionMinutes(roles, v.minutes ?? 0);
      const quality = isRaceWeek ? new Set<number>() : triQualityIndexes(roles, c.experience.running, v.isDeload);
      return {
        roles,
        days: roles.map((role, i) =>
          buildTriDay(
            {
              role,
              sec: secs[i],
              phase: v.phase,
              quality: quality.has(i),
              isDeload: v.isDeload,
              isRaceWeek,
              lastBeforeRace: isRaceWeek && i === roles.length - 2,
              progress,
              stretchKeys: opts.stretchKeys,
            },
            String.fromCharCode(65 + i),
          ),
        ),
      };
    }

    const roles = keepDays(
      composeRunWeek({
        daysPerWeek,
        experience: c.experience.running,
        phase: v.phase,
        canRunContinuously: canRun,
        isRaceWeek,
      }),
      isRaceWeek ? daysPerWeek : 0,
      opts,
    );

    const hardCount = roles.filter((r) => r !== 'easy').length;
    const longRunMi = longRunAfterTimeCap(v.longRunMi, paces?.easySec ?? null);

    return {
      roles,
      days: roles.map((role, i) =>
        buildRunDay(
          {
            role,
            weeklyMi: v.mileage,
            longRunMi,
            paces,
            stretchKeys: opts.stretchKeys,
            hardCount,
            progress,
            isLongest: i === roles.length - 1,
            raceMi: spec.raceMi,
          },
          String.fromCharCode(65 + i),
        ),
      ),
    };
  });

  return { ...bare, volume, weekPlans };
}

/**
 * Race week at the week's own day count — see `EnduranceOpts.keepDaysInRaceWeek`.
 *
 * `want` is 0 for every week but the last, where it is the day count the rest of the block runs. The extra
 * sessions are copies of the week's FIRST one, which is its easiest by construction: `composeRunWeek`'s
 * race week opens on easy runs and `composeTriWeek`'s on a swim. Nothing is added to a week that already
 * holds its days, so the pure race plan is untouched.
 */
function keepDays(roles: SessionRole[], want: number, opts: EnduranceOpts): SessionRole[] {
  if (!opts.keepDaysInRaceWeek || roles.length === 0) return roles;
  const out = [...roles];
  while (out.length < want) out.unshift(roles[0]);
  return out;
}

/**
 * Build the whole block, backwards from the race.
 *
 * `weekPlans` carries every week because an endurance program is week-varying by nature — the volume is
 * the training effect, so weeks are not copies of each other the way a strength block's are. `days` holds
 * week 1 for the surfaces that read a single representative week.
 */
export function assembleEndurance(c: CoachConstraints, opts: EnduranceOpts): EnduranceAssembly {
  const block = enduranceBlock(c, opts);
  const { spec, weeks, weekPlans } = block;

  if (block.refusal && c.buildAnyway !== true) {
    return {
      structure: emptyStructure(spec, 0),
      volume: [],
      paces: block.paces,
      refusal: block.refusal,
      concern: null,
      goalTime: block.goalTime,
      roles: [],
    };
  }

  const structure: ProgramStructure = {
    name: `${weeks}-Week ${spec.label.replace(/^./, (ch) => ch.toUpperCase())} Plan`,
    weeks,
    daysPerWeek: block.daysPerWeek,
    vary: true,
    days: weekPlans[0]?.days ?? [],
    weekPlans: weekPlans.map((w) => ({ days: w.days })),
  };

  return {
    structure,
    volume: block.volume,
    paces: block.paces,
    refusal: null,
    concern: enduranceConcernOf(block, c),
    goalTime: block.goalTime,
    roles: weekPlans.map((w) => w.roles),
  };
}

/**
 * The concern beside a block built anyway — read off the BUILT days, so the sentence can never describe a
 * plan other than this one. Shared with the race-and-lift path, whose running days are these days.
 */
export function enduranceConcernOf(block: EnduranceBlock, c: CoachConstraints): EnduranceConcern | null {
  if (c.buildAnyway !== true) return null;
  const longRuns = block.weekPlans
    .flatMap((w) => w.days)
    .filter((d) => d.name === 'Long Run')
    .map((d) => d.main[0]?.targetMi ?? 0);
  return enduranceConcernFor(block.goal, block.refusal, {
    weeksAvailable: block.weeksAvailable,
    currentWeeklyMi: block.currentWeeklyMi,
    canRunContinuously: block.canRun,
    topLongMi: longRuns.length ? Math.max(...longRuns) : null,
    limitations: c.limitations,
  });
}

function emptyStructure(spec: RaceSpec, weeks: number): ProgramStructure {
  return { name: `${spec.label} Plan`, weeks, daysPerWeek: 0, vary: false, days: [], weekPlans: [] };
}
