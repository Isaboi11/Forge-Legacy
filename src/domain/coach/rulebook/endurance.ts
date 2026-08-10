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
} from '../constraints.ts';

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
    taperWeeks: 3,
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
// REFUSALS — §2.3 of the standard
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface EnduranceRefusal {
  reason: 'not_enough_time' | 'not_enough_base' | 'cannot_run';
  message: string;
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
export function enduranceRefusalFor(
  goal: EnduranceGoal,
  opts: { weeksAvailable: number; currentWeeklyMi: number; canRunContinuously?: boolean },
): EnduranceRefusal | null {
  const spec = RACE_SPEC[goal];

  if (goal !== 'triathlon' && goal !== 'run_5k' && opts.canRunContinuously === false) {
    return {
      reason: 'cannot_run',
      message: `Let's start with the 5K. Running continuously is the thing to build first, and once you can hold twenty minutes the ${spec.label} is a straightforward step up. I'll build the 5K block — the ${spec.label} is still there afterwards.`,
    };
  }

  if (opts.weeksAvailable < spec.minWeeks) {
    const alt = spec.fallback ? RACE_SPEC[spec.fallback] : null;
    return {
      reason: 'not_enough_time',
      message: alt
        ? `A ${spec.label} needs about ${spec.idealWeeks} weeks and you've got ${opts.weeksAvailable}. That's a ${alt.label} build — and it's the right way to get to the ${spec.label} later, not a consolation. Want me to build that instead?`
        : `A ${spec.label} needs about ${spec.idealWeeks} weeks and you've got ${opts.weeksAvailable}. Give me ${spec.minWeeks} and I'll build it properly.`,
    };
  }

  if (opts.currentWeeklyMi < spec.minBaseMi) {
    const alt = spec.fallback ? RACE_SPEC[spec.fallback] : null;
    return {
      reason: 'not_enough_base',
      message: alt
        ? `A ${spec.label} build starts from about ${spec.minBaseMi} miles a week and you're at ${opts.currentWeeklyMi}. I'd be stacking volume on a base that isn't there yet, which is how people get hurt. Let me build the ${alt.label} first — that's how you get the base.`
        : `A ${spec.label} build starts from about ${spec.minBaseMi} miles a week and you're at ${opts.currentWeeklyMi}. Let's build that base first.`,
    };
  }

  return null;
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

  const out: WeekVolume[] = [];

  for (let w = 0; w < opts.weeks; w += 1) {
    const inTaper = w >= buildWeeks;
    // Never week 1 (nothing yet to recover from) and never inside the taper, which is already a cut.
    const isDeload = !inTaper && w > 0 && (w + 1) % 4 === 0;

    let mileage: number;
    let longRunMi: number;
    let phase: WeekVolume['phase'];

    if (inTaper) {
      phase = 'taper';
      const step = (w - buildWeeks + 1) / taperWeeks;
      mileage = peakWeekly * (1 - TAPER_VOLUME_CUT * step);
      // The long run comes down with it but never disappears: race-specific feel is retained while the
      // fatigue is shed, which is the same reason intensity is retained (EPS-D6).
      longRunMi = longSoFar * (1 - 0.5 * step);
      phase = 'taper';
    } else if (isDeload) {
      phase = 'build';
      mileage = ramp * 0.75;
      longRunMi = longSoFar * 0.7;
    } else {
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

/** Sessions for a triathlon week, balanced by EPS-D11 and carrying one brick. */
export function composeTriWeek(daysPerWeek: number): SessionRole[] {
  const days = Math.max(3, daysPerWeek);
  const roles: SessionRole[] = [];
  // Bike-led, because it is the biggest race-day share and the cheapest place to put volume.
  const rotation: SessionRole[] = ['swim', 'bike', 'easy', 'swim', 'bike', 'easy'];
  for (let i = 0; i < days - 1; i += 1) roles.push(rotation[i % rotation.length]);
  roles.push('brick'); // One a week, after the week's biggest ride.
  return roles;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// BUILDING THE DAY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ **THE CUE LIVES IN THE NAME, BECAUSE THERE IS NOWHERE ELSE TO PUT IT.**
 *
 * `ProgramExercise` has **no `notes` field**, and its absence is deliberate — the schema's own comment
 * cites it as the warning against write-only fields, the failure this repo has shipped more than once
 * (a value authored, persisted, and rendered by nothing). `Program-Authoring-Standard-v1.0.md` §11.4
 * nonetheless says running pace guidance "lives in `notes`", which is the PAS describing a field that
 * was never built — see `project_pas_governs_an_unbuilt_product`.
 *
 * So the coaching cue goes in the row's NAME, which every surface already renders. It makes for longer
 * labels than a lifting row, and that is the right trade: "easy means easy" is the single most important
 * instruction in endurance training, and dropping it to keep names tidy would be prescribing the
 * distance while withholding the point of it.
 */
const cardio = (
  activity: ProgramExercise['activity'],
  fields: Partial<ProgramExercise>,
  name: string,
): ProgramExercise =>
  ({
    catalogKey: `cardio:${activity}`,
    name,
    kind: 'cardio',
    activity,
    modality: activity === 'swim' ? 'indoor' : 'outdoor',
    sets: 1,
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
  return [cardio('run', { targetSec: 600 }, 'Easy Jog · leg swings and high knees first')];
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
            'Long Run · conversational the whole way',
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
            `Tempo · ${Math.round(tempoSec / 60)} min comfortably hard, a sentence not a conversation`,
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
            `Intervals · ${intervalReps} × 3 min hard, 3 min jog between`,
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
            `Run ${rwRunSec}s / walk ${RUN_WALK_START.walkSec}s × ${rwReps} · the walk is the session`,
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
        main: [cardio('swim', { targetMi: swimMi }, `Swim · ${swimMi} mi steady, technique before volume`)],
        cooldown: [],
      };

    case 'bike':
      return {
        letter,
        name: 'Ride',
        warmup: [],
        main: [cardio('bike', { targetSec: rideSec }, `Ride · ${Math.round(rideSec / 60)} min steady aerobic`)],
        cooldown: [],
      };

    case 'brick':
      return {
        letter,
        name: 'Brick',
        warmup: [],
        main: [
          cardio('bike', { targetSec: brickRideSec }, `Ride · ${Math.round(brickRideSec / 60)} min steady`),
          cardio('run', { targetSec: brickRunSec }, `Run · ${Math.round(brickRunSec / 60)} min straight off the bike`),
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
            'Shakeout · 15 min easy, just to open the legs',
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
        main: [cardio('run', { targetMi: input.raceMi ?? undefined }, 'Race Day · this is the one')],
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
            'Easy Run · easy means easy, this is where the base is built',
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
}

export const isEndurance = (g: Goal): g is EnduranceGoal => isEnduranceGoal(g);

/**
 * Build the whole block, backwards from the race.
 *
 * `weekPlans` carries every week because an endurance program is week-varying by nature — the volume is
 * the training effect, so weeks are not copies of each other the way a strength block's are. `days` holds
 * week 1 for the surfaces that read a single representative week.
 */
export function assembleEndurance(
  c: CoachConstraints,
  opts: { todayISO: string; stretchKeys: readonly string[]; canRunContinuously?: boolean; recentRaceMi?: number | null; recentRaceSec?: number | null },
): EnduranceAssembly {
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

  const paces = pacesFrom(opts.recentRaceMi, opts.recentRaceSec);

  if (refusal) {
    return { structure: emptyStructure(spec, 0), volume: [], paces, refusal };
  }

  const weeks = Math.min(weeksAvailable, spec.idealWeeks + 8);
  const volume = weeklyVolumePlan({ goal, weeks, startMi: currentWeeklyMi });

  // EPS-D7 — a beginner gets three days whatever they asked for. Fewer cannot carry a base; more, before
  // the tissue is ready, is the commonest way a new runner's first block ends in an injury.
  const daysPerWeek = canRun ? c.daysPerWeek : Math.max(MIN_DAYS_BEGINNER, Math.min(c.daysPerWeek, 4));

  const weekPlans = volume.map((v) => {
    const roles =
      goal === 'triathlon'
        ? composeTriWeek(daysPerWeek)
        : composeRunWeek({
            daysPerWeek,
            experience: c.experience.running,
            phase: v.phase,
            canRunContinuously: canRun,
            isRaceWeek: v.weekIndex === volume.length - 1,
          });

    const hardCount = roles.filter((r) => r !== 'easy').length;
    const longRunMi = longRunAfterTimeCap(v.longRunMi, paces?.easySec ?? null);

    // 0 in week 1, 1 at the peak, and held at 1 through the taper — intensity is RETAINED while volume
    // falls (EPS-D6), so a taper week's tempo is the peak week's tempo, not week one's.
    const buildLast = Math.max(1, volume.filter((x) => x.phase !== 'taper').length - 1);
    const progress = v.phase === 'taper' ? 1 : Math.min(1, v.weekIndex / buildLast);

    return {
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

  const structure: ProgramStructure = {
    name: `${weeks}-Week ${spec.label.replace(/^./, (ch) => ch.toUpperCase())} Plan`,
    weeks,
    daysPerWeek,
    vary: true,
    days: weekPlans[0]?.days ?? [],
    weekPlans,
  };

  return { structure, volume, paces, refusal: null };
}

function emptyStructure(spec: RaceSpec, weeks: number): ProgramStructure {
  return { name: `${spec.label} Plan`, weeks, daysPerWeek: 0, vary: false, days: [], weekPlans: [] };
}
