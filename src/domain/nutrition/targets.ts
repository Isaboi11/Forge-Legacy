/**
 * Nutrition Targets — what Forge will and will not recommend, and the arithmetic behind the number.
 *
 * Built from `Nutrition Targets.dc.html`, whose logic block is the specification: Mifflin–St Jeor for
 * resting burn, an activity multiplier for maintenance, 500 kcal a day per pound a week, protein from
 * bodyweight, fat at 27% of calories, carbohydrate as the remainder.
 *
 * ══ ⛔ THIS IS THE ONE NUTRITION MODULE THAT HAS TO SAY NO ══
 *
 * NUT-D5 and Architecture §10 put three limits in CODE, not in copy, because a recommender without them
 * is precisely what those clauses exist to prevent:
 *
 *   1. **Nothing is recommended to anyone under 18.** Not a lower number — nothing. A body that is
 *      still growing is not a formula's business, and `recommend()` returns a refusal, not a target.
 *   2. **No recommendation below the floor** — 1,500 kcal for men, 1,200 for women. If the arithmetic
 *      lands lower, the target is HELD at the floor and the screen says the pace changed as a result.
 *   3. **No deficit steeper than 1% of bodyweight a week.** A faster pace is accepted as a request and
 *      then held, with the real pace stated.
 *
 * ⚠ **A HELD TARGET IS NEVER SILENT.** Every clamp returns a `held` reason so the screen can say what it
 * did and why. Quietly changing someone's number and letting them believe they chose it is the failure
 * mode; clamping and explaining is the fix.
 *
 * ⚠ **MANUAL IS THE ATHLETE'S OWN.** NUT-D5: *"the athlete always owns their targets."* The floors bind
 * what Forge RECOMMENDS. A manual figure below them is still refused at save — because Forge would be
 * the one storing and measuring against it — but the refusal is a plain line with a one-tap fix, never
 * a warning colour and never a lecture.
 *
 * Pure, relative-imported, tested. NUT-D4: no model, and no screen, computes any of this.
 */

import type { Targets } from './day.ts';

/* ── who we can calculate for ─────────────────────────────────────────────── */

export type AthleteSex = 'male' | 'female' | 'unspecified';

/** NUT-D5, per day, in kcal. Sex-specific because the clinical floors are. */
export const FLOOR: Record<'male' | 'female', number> = { male: 1500, female: 1200 };

/**
 * The floor to apply when sex is unspecified.
 *
 * ⚠ The HIGHER of the two, deliberately. A floor exists to protect somebody; guessing the lower one to
 * be permissive would put exactly the person we know least about below the line we drew for them.
 */
export const FLOOR_UNKNOWN = FLOOR.male;

export const floorFor = (sex: AthleteSex): number => (sex === 'unspecified' ? FLOOR_UNKNOWN : FLOOR[sex]);

/** The fastest loss Forge will build a target for: 1% of bodyweight a week. */
export const MAX_LOSS_FRACTION = 0.01;

/** A pound of bodyweight a week is about 500 kcal a day. The standard planning figure, not an opinion. */
export const KCAL_PER_LB_WEEK = 500;

export const ADULT_AGE = 18;

/* ── activity ─────────────────────────────────────────────────────────────── */

export interface ActivityLevel {
  key: 'sedentary' | 'light' | 'moderate' | 'very';
  label: string;
  detail: string;
  multiplier: number;
}

/**
 * The four the `.dc` offers. `0205` allows a fifth (`extra`) which the design does not use — it is left
 * out rather than invented, and the column still accepts it if a later pass wants it.
 */
export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  { key: 'sedentary', label: 'Mostly seated', detail: 'Desk days, little or no training', multiplier: 1.2 },
  { key: 'light', label: 'Lightly active', detail: 'Training 1–3 days a week', multiplier: 1.375 },
  { key: 'moderate', label: 'Active', detail: 'Training 3–5 days a week', multiplier: 1.55 },
  { key: 'very', label: 'Very active', detail: 'Training 6+ days, or a physical job', multiplier: 1.725 },
] as const;

export const activityByKey = (key: string | null | undefined): ActivityLevel | null =>
  ACTIVITY_LEVELS.find((a) => a.key === key) ?? null;

/* ── the inputs ───────────────────────────────────────────────────────────── */

export interface AthleteFacts {
  sex: AthleteSex;
  /** Pounds, from the most recent weigh-in. Null when they have never logged one. */
  weightLb: number | null;
  birthYear: number | null;
  heightIn: number | null;
  activity: ActivityLevel | null;
}

export type Goal = 'lose' | 'maintain' | 'gain';

const round10 = (n: number): number => Math.round(n / 10) * 10;
const round5 = (n: number): number => Math.round(n / 5) * 5;

/** Whole years, from birth year alone — Forge never asks for a birth DATE, only the year (0205 §5). */
export function ageFrom(birthYear: number | null, todayIso: string): number | null {
  if (!birthYear || birthYear < 1900) return null;
  const year = Number(todayIso.slice(0, 4));
  const age = year - birthYear;
  return age >= 0 && age < 130 ? age : null;
}

export const isUnderAge = (age: number | null): boolean => age != null && age < ADULT_AGE;

/** The year this athlete turns 18 — what the gate card counts down to. */
export const adultYear = (birthYear: number | null): number | null => (birthYear ? birthYear + ADULT_AGE : null);

/* ── why we cannot calculate ──────────────────────────────────────────────── */

export type Blocker =
  | { kind: 'under-age'; age: number; unlockYear: number | null }
  | { kind: 'no-sex' }
  | { kind: 'no-weight' }
  | { kind: 'incomplete' };

/**
 * What stands between these facts and a recommendation, in the order that matters.
 *
 * ⛔ AGE IS CHECKED FIRST AND ANSWERS ALONE. Every other blocker is a missing detail the athlete can
 * supply; this one is a decision, and offering to "complete your profile" underneath it would read as a
 * way around a door that does not open.
 */
export function blockerFor(facts: AthleteFacts, todayIso: string): Blocker | null {
  const age = ageFrom(facts.birthYear, todayIso);
  if (isUnderAge(age)) {
    return { kind: 'under-age', age: age as number, unlockYear: adultYear(facts.birthYear) };
  }
  /* Mifflin–St Jeor carries a sex term (+5 / −161). There is no neutral value for it, and picking one
     would be inventing a number about someone's body. `unspecified` is the schema's DEFAULT, so this is
     an ordinary state and not an edge case. */
  if (facts.sex === 'unspecified') return { kind: 'no-sex' };
  if (facts.weightLb == null || facts.weightLb <= 0) return { kind: 'no-weight' };
  if (age == null || facts.heightIn == null || facts.activity == null) return { kind: 'incomplete' };
  return null;
}

/* ── the arithmetic ───────────────────────────────────────────────────────── */

export interface Burn {
  /** Resting burn — Mifflin–St Jeor. */
  bmr: number;
  /** Maintenance — resting burn times the activity multiplier. */
  tdee: number;
  age: number;
  /** The fastest weekly loss this bodyweight allows, in pounds. */
  lossCap: number;
}

/**
 * Mifflin–St Jeor, then the activity multiplier.
 *
 * The equation is metric, so pounds and inches are converted here rather than at a call site that might
 * forget. Rounded to ten, because a resting burn stated to the calorie claims a precision it has never
 * had — the equation's own error is a few hundred.
 */
export function burnFor(facts: AthleteFacts, todayIso: string): Burn | null {
  const age = ageFrom(facts.birthYear, todayIso);
  if (age == null || facts.heightIn == null || facts.activity == null) return null;
  if (facts.weightLb == null || facts.weightLb <= 0 || facts.sex === 'unspecified') return null;

  const kg = facts.weightLb * 0.45359237;
  const cm = facts.heightIn * 2.54;
  const bmr = round10(10 * kg + 6.25 * cm - 5 * age + (facts.sex === 'male' ? 5 : -161));
  return {
    bmr,
    tdee: round10(bmr * facts.activity.multiplier),
    age,
    lossCap: Math.floor(facts.weightLb * MAX_LOSS_FRACTION * 10) / 10,
  };
}

export type HeldReason = 'cap' | 'floor' | null;

export interface Recommendation extends Targets {
  /** Why the target is not simply "maintenance minus the pace asked for". */
  held: HeldReason;
  /** The pace the target actually delivers, in pounds a week, after any clamp. */
  effectiveRate: number;
  requestedRate: number;
  goal: Goal;
  burn: Burn;
  floor: number;
}

/**
 * Turn maintenance, a goal and a pace into a day's target — clamping where NUT-D5 says to, and always
 * reporting the clamp.
 */
export function recommend(
  facts: AthleteFacts,
  burn: Burn,
  goal: Goal,
  requestedRate: number,
  todayIso: string,
): Recommendation | null {
  if (blockerFor(facts, todayIso)) return null;
  const floor = floorFor(facts.sex);
  const weight = facts.weightLb as number;

  let kcal = burn.tdee;
  let held: HeldReason = null;
  let effectiveRate = requestedRate;

  if (goal === 'lose') {
    /* Asked for more than 1% of bodyweight a week — accepted as a wish, held to the cap. */
    effectiveRate = Math.min(requestedRate, burn.lossCap);
    if (requestedRate > burn.lossCap) held = 'cap';
    kcal = round10(burn.tdee - effectiveRate * KCAL_PER_LB_WEEK);

    /* ⛔ The floor wins over the pace, always. The pace is then restated as what the floor delivers,
       rather than leaving the athlete believing they are losing faster than they are. */
    if (kcal < floor) {
      kcal = floor;
      effectiveRate = Math.max(0, Math.round(((burn.tdee - floor) / KCAL_PER_LB_WEEK) * 10) / 10);
      held = 'floor';
    }
  } else if (goal === 'gain') {
    kcal = round10(burn.tdee + requestedRate * KCAL_PER_LB_WEEK);
  } else {
    effectiveRate = 0;
  }

  /* Protein from bodyweight, fat as a share of calories, carbohydrate as whatever is left — the split
     the `.dc` specifies. Never below zero: a very low target with high protein can exhaust the budget. */
  const protein = round5(weight * 0.9);
  const fat = round5((kcal * 0.27) / 9);
  const carb = Math.max(0, round5((kcal - protein * 4 - fat * 9) / 4));

  return { kcal, protein, carb, fat, held, effectiveRate, requestedRate, goal, burn, floor };
}

/** The paces offered, per goal. Gaining tops out sooner — a pound a week is already fast to add. */
export function paceOptions(goal: Goal): number[] {
  return goal === 'gain' ? [0.25, 0.5, 0.75, 1] : [0.25, 0.5, 0.75, 1, 1.5, 2];
}

export const maxPace = (goal: Goal): number => (goal === 'gain' ? 1 : 2.5);

/** "1 lb / week" · "0.25 lb / week" — trailing zeros trimmed, as the `.dc` writes them. */
export function paceLabel(rate: number): string {
  const text = rate.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
  return `${text} lb / week`;
}

/* ── what the screen says about it ────────────────────────────────────────── */

const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const md = (iso: string): string => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MON[m - 1]} ${d}`;
};

/** The sentence under the recommended figure. */
export function basisLine(rec: Recommendation): string {
  const parts = [`Maintenance is about ${fmt(rec.burn.tdee)}.`];
  if (rec.goal === 'lose') {
    parts.push(`Minus ${fmt(rec.burn.tdee - rec.kcal)} for ${rec.effectiveRate.toFixed(1)} lb a week.`);
  } else if (rec.goal === 'gain') {
    parts.push(`Plus ${fmt(rec.kcal - rec.burn.tdee)} for ${paceLabel(rec.requestedRate).replace(' / week', '')} a week.`);
  }
  parts.push('Protein set from bodyweight.');
  return parts.join(' ');
}

/** The bronze shield note — said only when something was clamped, and it says which. */
export function heldLine(rec: Recommendation, sex: AthleteSex): string | null {
  if (rec.held === 'cap') {
    return `You asked for ${paceLabel(rec.requestedRate).replace(' / week', '')} a week. Forge keeps loss to 1% of bodyweight, ${rec.burn.lossCap.toFixed(1)} lb for you, so the target is set for that pace.`;
  }
  if (rec.held === 'floor') {
    const who = sex === 'female' ? 'women' : sex === 'male' ? 'men' : 'anyone';
    return `${fmt(rec.floor)} is the lowest target Forge sets for ${who}, so it's held there. At ${fmt(rec.floor)} you can expect about ${rec.effectiveRate.toFixed(1)} lb a week.`;
  }
  return null;
}

export interface MethodRow {
  label: string;
  value: string;
  note: string;
}

/**
 * "How we calculated this", line by line.
 *
 * ⚠ It exists because a number nobody can interrogate is a number nobody should trust. Every figure on
 * the result card is traceable from here to the equation that produced it.
 */
export function methodRows(rec: Recommendation, facts: AthleteFacts, sex: AthleteSex): MethodRow[] {
  const heightIn = facts.heightIn as number;
  const adjustment = rec.kcal - rec.burn.tdee;
  const who = sex === 'female' ? 'women' : 'men';
  const goalNote =
    rec.goal === 'lose'
      ? `About ${KCAL_PER_LB_WEEK} cal a day per lb a week. Loss is capped at 1% of bodyweight (${rec.burn.lossCap.toFixed(1)} lb), and targets never go below ${fmt(rec.floor)} for ${who}.`
      : rec.goal === 'gain'
        ? `About ${KCAL_PER_LB_WEEK} cal a day per lb a week.`
        : 'No adjustment at maintenance.';

  return [
    {
      label: 'Resting burn',
      value: fmt(rec.burn.bmr),
      note: `Mifflin–St Jeor equation, from age ${rec.burn.age}, ${Math.floor(heightIn / 12)}′${Math.round(heightIn % 12)}″, ${facts.weightLb} lb, ${sex}.`,
    },
    {
      label: 'Activity',
      value: `× ${facts.activity?.multiplier ?? 1}`,
      note: `${facts.activity?.label ?? ''}: ${(facts.activity?.detail ?? '').toLowerCase()}.`,
    },
    { label: 'Maintenance', value: fmt(rec.burn.tdee), note: 'Roughly what you burn in a normal day.' },
    {
      label: rec.goal === 'lose' ? 'Deficit' : rec.goal === 'gain' ? 'Surplus' : 'Goal',
      value: adjustment === 0 ? '0' : `${adjustment > 0 ? '+' : '−'}${fmt(Math.abs(adjustment))}`,
      note: goalNote,
    },
    { label: 'Protein', value: `${rec.protein} g`, note: '0.9 g per lb of bodyweight.' },
    { label: 'Fat', value: `${rec.fat} g`, note: '27% of calories.' },
    { label: 'Carbs', value: `${rec.carb} g`, note: 'The calories left after protein and fat.' },
  ];
}

/* ── the manual side ──────────────────────────────────────────────────────── */

export interface ManualCheck {
  /** The lowest figure Forge will store, and why that is the number. */
  minimum: number;
  /** True when the floor is what binds, rather than the 1%-a-week cap. */
  floorBinds: boolean;
  tooLow: boolean;
  message: string | null;
  /** "Use 1,800" — the one-tap fix beside the message. */
  useLabel: string;
}

/**
 * Whether a typed calorie figure may be saved.
 *
 * ⚠ The minimum is the HIGHER of the clinical floor and what a 1%-a-week loss would need, because both
 * limits are real and the binding one is whichever is stricter for this body. The message names the one
 * that actually bound, so the athlete is told the true reason rather than a generic one.
 */
export function checkManual(kcal: number | null, facts: AthleteFacts, burn: Burn | null): ManualCheck {
  const floor = floorFor(facts.sex);
  const capMinimum = burn ? Math.ceil((burn.tdee - burn.lossCap * KCAL_PER_LB_WEEK) / 10) * 10 : 0;
  const minimum = Math.max(floor, capMinimum);
  const floorBinds = floor >= capMinimum;
  const tooLow = kcal != null && kcal > 0 && kcal < minimum;
  const who = facts.sex === 'female' ? 'women' : facts.sex === 'male' ? 'men' : 'anyone';

  return {
    minimum,
    floorBinds,
    tooLow,
    useLabel: `Use ${fmt(minimum)}`,
    message: !tooLow
      ? null
      : floorBinds
        ? `${fmt(floor)} is the lowest daily target Forge sets for ${who}. Below that, it's hard to cover what your body needs.`
        : `Below ${fmt(minimum)} you'd be losing more than 1% of your bodyweight a week (${(burn as Burn).lossCap.toFixed(1)} lb). Forge doesn't set targets past that pace.`,
  };
}

/** "Macros account for ~2,480 cal of your 2,500 target." — and says so when they disagree. */
export function macroSumLine(kcal: number | null, protein: number, carb: number, fat: number): { text: string; off: boolean } {
  const sum = protein * 4 + carb * 4 + fat * 9;
  if (!kcal || !sum) return { text: `Macros account for ~${fmt(sum)} cal.`, off: false };
  const diff = sum - kcal;
  let text = `Macros account for ~${fmt(sum)} cal of your ${fmt(kcal)} target.`;
  /* 5% absorbs honest rounding; beyond it, one of the four numbers is wrong. */
  const off = Math.abs(diff) / kcal > 0.05;
  if (off) text += ` That's ${fmt(Math.abs(diff))} ${diff > 0 ? 'over' : 'under'}, so one of these may need adjusting.`;
  return { text, off };
}

/* ── has the body moved since ─────────────────────────────────────────────── */

/**
 * How far bodyweight must move before a target is worth revisiting: **2% of what it was**.
 *
 * ⚠ Not an invented threshold — it is twice `MAX_LOSS_FRACTION`, the 1%-a-week cap this module already
 * enforces, so it means "about two weeks of the fastest progress Forge will plan for". Below that the
 * target barely moves (bodyweight enters the calorie figure at roughly 7 kcal a pound), and a banner
 * that fires on a hydration swing is a banner people learn to ignore.
 */
export const WEIGHT_DRIFT_FRACTION = MAX_LOSS_FRACTION * 2;

/** And never on less than this, so a small body does not trip on scale noise. */
export const WEIGHT_DRIFT_MIN_LB = 2;

export interface WeightDrift {
  /** What they weighed when the target was written. */
  then: number;
  now: number;
  /** Signed, in pounds. */
  change: number;
  /** "201.8 lb on Aug 4 · 196.4 lb now" — the banner's second line. */
  detail: string;
}

/**
 * Whether to offer a review of the target in force, and the sentence that says why.
 *
 * Null in every case where the comparison cannot honestly be drawn:
 *   · no weigh-in now, or none recorded with the target (`0209` unpasted, or set before any weigh-in);
 *   · the target was set TODAY — it already reflects this body, and the `.dc` suppresses it too;
 *   · the change is inside the band above.
 *
 * ⚠ It NEVER compares the latest weigh-in to anything but the snapshot. The oldest weigh-in on file
 * answers a different question, and the latest compared to itself answers none — both would put a
 * change that did not happen on the screen whose job is saying true things about someone's body.
 */
export function weightDrift(opts: {
  now: number | null;
  atTarget: number | null;
  targetFrom: string | null;
  todayIso: string;
}): WeightDrift | null {
  const { now, atTarget, targetFrom, todayIso } = opts;
  if (now == null || now <= 0 || atTarget == null || atTarget <= 0) return null;
  if (!targetFrom || targetFrom === todayIso) return null;

  const change = now - atTarget;
  const threshold = Math.max(WEIGHT_DRIFT_MIN_LB, atTarget * WEIGHT_DRIFT_FRACTION);
  if (Math.abs(change) < threshold) return null;

  const lb = (n: number): string => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return {
    then: atTarget,
    now,
    change,
    detail: `${lb(atTarget)} lb on ${md(targetFrom)} · ${lb(now)} lb now`,
  };
}

/* ── the history ──────────────────────────────────────────────────────────── */

export interface HistoryRow {
  from: string;
  range: string;
  macros: string;
  kcal: string;
  current: boolean;
}

const dayBefore = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 86_400_000).toISOString().slice(0, 10);
};

/**
 * Every target this athlete has had, newest first, each with the span it governed.
 *
 * ⚠ This list IS the reason `saveTargets` never edits a row: NUT-D5's "an old day stays readable
 * against what was true then" is invisible unless the athlete can see the old targets still standing.
 */
export function historyRows(
  history: readonly { from: string; targets: Targets }[],
  todayIso: string,
): HistoryRow[] {
  const sorted = [...history].sort((a, b) => (a.from < b.from ? 1 : -1));
  return sorted.map((row, i) => {
    const next = sorted[i - 1];
    const current = i === 0;
    const range = current
      ? row.from === todayIso
        ? 'From today'
        : `Since ${md(row.from)}`
      : `${md(row.from)} – ${md(dayBefore(next.from))}`;
    return {
      from: row.from,
      range,
      macros: `P ${row.targets.protein} · C ${row.targets.carb} · F ${row.targets.fat}`,
      kcal: fmt(row.targets.kcal),
      current,
    };
  });
}

/** Same numbers as what is already in force — saving would write a row that changes nothing. */
export function sameAsCurrent(proposed: Targets | null, current: Targets | null): boolean {
  if (!proposed || !current) return false;
  return (
    proposed.kcal === current.kcal &&
    proposed.protein === current.protein &&
    proposed.carb === current.carb &&
    proposed.fat === current.fat
  );
}

/** The line under the save button — what pressing it will actually do. */
export function saveNote(opts: {
  blocked: string | null;
  same: boolean;
  replacesToday: boolean;
}): string {
  if (opts.blocked) return opts.blocked;
  if (opts.same) return 'This is the target already in effect.';
  if (opts.replacesToday) return 'Replaces the change you made earlier today.';
  return 'Effective today · Previous days remain unchanged.';
}
