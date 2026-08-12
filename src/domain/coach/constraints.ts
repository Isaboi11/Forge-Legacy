/**
 * What the coach has to know before it can build anything.
 *
 * ══ ONE SHAPE, READ BY EVERYTHING DOWNSTREAM ══
 *
 * `skeletons` picks a plan from it, `candidates` filters exercises with it, `prescribe` sets loads from
 * it, and the AI layer will eventually produce one instead of writing a program directly. That last point
 * is why this type is worth being careful about: it is the entire surface the model will be trusted with,
 * and everything it cannot express is something the model cannot get wrong.
 *
 * ══ MOST OF IT IS ALREADY KNOWN ══
 *
 * Goal and experience come from onboarding, equipment from the Home Gym profile, units from Settings.
 * The wizard asks about the rest — days, session length, limitations, and for a race the date and the
 * mileage they are starting from. `missingFor()` is what decides which questions get asked, so an athlete
 * who has filled their profile in answers three questions and not eight.
 *
 * No app imports: pure data and pure functions, so the whole matrix runs under `node --test`.
 */

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Goals served by a strength/conditioning skeleton — no race, no mileage, no date. */
import type { LearnedPreferences } from './learned-preference.ts';

export type StrengthGoal = 'strength' | 'muscle' | 'weight_loss' | 'conditioning' | 'mobility';

/**
 * Goals built backwards from a date. Kept apart from `StrengthGoal` because they need two fields nothing
 * else does — when the race is, and what the athlete is running NOW — and because a plan that ignores
 * either is not a training plan, it is a wish. `10%/week` needs a starting point to be 10% *of*.
 */
export type EnduranceGoal = 'run_5k' | 'run_10k' | 'run_half' | 'run_marathon' | 'triathlon';

export type Goal = StrengthGoal | EnduranceGoal;

export const STRENGTH_GOALS: readonly StrengthGoal[] = [
  'strength',
  'muscle',
  'weight_loss',
  'conditioning',
  'mobility',
];

export const ENDURANCE_GOALS: readonly EnduranceGoal[] = [
  'run_5k',
  'run_10k',
  'run_half',
  'run_marathon',
  'triathlon',
];

export const GOALS: readonly Goal[] = [...STRENGTH_GOALS, ...ENDURANCE_GOALS];

export const isEnduranceGoal = (g: Goal): g is EnduranceGoal =>
  (ENDURANCE_GOALS as readonly string[]).includes(g);

/** What the athlete sees. The wizard never shows a goal key. */
export const GOAL_LABEL: Record<Goal, string> = {
  strength: 'Get stronger',
  muscle: 'Build muscle',
  weight_loss: 'Lose weight',
  conditioning: 'Get fitter',
  mobility: 'Move better',
  run_5k: 'Run a 5K',
  run_10k: 'Run a 10K',
  run_half: 'Run a half marathon',
  run_marathon: 'Run a marathon',
  triathlon: 'Triathlon',
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// EXPERIENCE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Matches the catalogue's own `Difficulty` vocabulary, lowercased — never a second scale to reconcile. */
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export const EXPERIENCE_LEVELS: readonly Experience[] = ['beginner', 'intermediate', 'advanced'];

/**
 * ⚠ EXPERIENCE IS PER DISCIPLINE, not per athlete.
 *
 * Someone who has squatted for a decade and never run 5K is advanced at one and a beginner at the other,
 * and a plan that averages those two is wrong in both directions — it hands them beginner squats and a
 * tempo run that hurts them. `lifting` gates exercise difficulty and set counts; `running` gates mileage,
 * quality days, and whether a long run is a thing yet.
 */
export interface ExperienceProfile {
  lifting: Experience;
  running: Experience;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT AND EQUIPMENT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type Environment = 'full_gym' | 'home' | 'bodyweight' | 'outdoor';

export const ENVIRONMENTS: readonly Environment[] = ['full_gym', 'home', 'bodyweight', 'outdoor'];

/**
 * The equipment a full gym is assumed to have, in `home-gym/equipment.ts` ids.
 *
 * Deliberately NOT "everything in the vocabulary": a commercial gym reliably has barbells, racks, benches,
 * dumbbells, cables and the common leg machines. It does not reliably have rings, sandbags, or a weight
 * vest, and prescribing those to someone who ticked "full gym" is how a plan becomes untrainable on day
 * one. Anything unusual has to be owned explicitly, same as at home.
 */
export const FULL_GYM_EQUIPMENT: readonly string[] = [
  'barbell', 'plates', 'rack', 'bench', 'ezbar', 'trapbar', 'smith',
  'dumbbells', 'kettlebells', 'medball',
  'cable', 'latpulldown', 'legpress', 'legmachine',
  'treadmill', 'rower', 'bike', 'elliptical',
  'pullup', 'dip', 'plyobox',
  'bands', 'minibands', 'abwheel', 'mat',
];

/** Outdoors: your body, the ground, and whatever the road gives you. */
export const OUTDOOR_EQUIPMENT: readonly string[] = [];

/**
 * What an environment implies before the athlete's own list is considered.
 *
 * `home` resolves to nothing on purpose — a home gym is defined by what is actually in it, which is what
 * the Home Gym profile records. Guessing a "typical" home setup would prescribe a bench to someone who
 * owns a pair of dumbbells and a floor.
 */
export function equipmentForEnvironment(env: Environment, owned: readonly string[]): readonly string[] {
  switch (env) {
    case 'full_gym':
      // Union, not replacement: someone at a full gym who also owns rings should be offered them.
      return [...new Set([...FULL_GYM_EQUIPMENT, ...owned])];
    case 'bodyweight':
      // ⚠ EMPTY, and it overrides what they own. "Bodyweight only" is a statement about THIS block —
      // travelling, a hotel room, an injury — not a claim that the barbell in their garage vanished.
      return [];
    case 'outdoor':
      return OUTDOOR_EQUIPMENT;
    case 'home':
    default:
      return owned;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// LIMITATIONS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What to work around. Coarse on purpose.
 *
 * These are the things an athlete can state accurately about themselves without a diagnosis, and each one
 * maps to a rule the rulebook can actually apply — a set of movement patterns or exercises to leave out.
 * A free-text box would collect better information and the engine could do nothing with it; that is the
 * AI tier's job, and it will express its answer as these same flags plus explicit exercise exclusions.
 *
 * ⚠ NOT MEDICAL. The coach avoids movements, it does not treat anybody. Nothing here is a diagnosis and
 * no copy anywhere should imply otherwise.
 */
export type Limitation =
  | 'shoulders'
  | 'knees'
  | 'lower_back'
  | 'no_jumping'
  | 'no_overhead'
  | 'no_barbell'
  | 'no_running';

export const LIMITATIONS: readonly Limitation[] = [
  'shoulders',
  'knees',
  'lower_back',
  'no_jumping',
  'no_overhead',
  'no_barbell',
  'no_running',
];

export const LIMITATION_LABEL: Record<Limitation, string> = {
  shoulders: 'Shoulders',
  knees: 'Knees',
  lower_back: 'Lower back',
  no_jumping: 'No jumping',
  no_overhead: 'Nothing overhead',
  no_barbell: 'No barbell',
  no_running: 'No running',
};

/**
 * ⚠ NO `wrists`, DELIBERATELY.
 *
 * It belongs on this list clinically — loading an extended wrist is a real and common complaint — but it
 * does not map to a movement pattern. Front-rack work, push-ups and a barbell curl all load the wrist and
 * live under three different patterns, while most of `Horizontal Push` does not load it at all. Honouring
 * it needs a hand-authored list of catalogue keys that nobody has written yet.
 *
 * A checkbox that changes nothing is worse than an absent one: the athlete ticks it, believes they have
 * been heard, and gets the same program. It goes back on the list the day the key list exists.
 */

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE CONSTRAINT SET
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** 75 means "75 or more" — the top of the scale, not a cap on anyone's afternoon. */
export type SessionMinutes = 30 | 45 | 60 | 75;

export const SESSION_LENGTHS: readonly SessionMinutes[] = [30, 45, 60, 75];

/** The Program Builder's own clamps, so nothing the coach builds is un-editable in the screen that opens it. */
export const MIN_DAYS_PER_WEEK = 2;
export const MAX_DAYS_PER_WEEK = 6;
export const MIN_WEEKS = 4;
export const MAX_WEEKS = 52;

export interface CoachConstraints {
  goal: Goal;
  experience: ExperienceProfile;
  /** 2–6. Clamped by `normalise`, because the Builder cannot render anything outside that. */
  daysPerWeek: number;
  sessionMinutes: SessionMinutes;
  environment: Environment;
  /** `home-gym/equipment.ts` ids. Resolved against `environment` by `effectiveEquipment`. */
  ownedEquipment: readonly string[];
  limitations: readonly Limitation[];
  /** Exercise catalogue keys to leave out — how the AI tier says "not that one" without a new flag. */
  excludeExercises: readonly string[];

  // ── Endurance only ────────────────────────────────────────────────────────────────────────────────
  /** ISO date. Required for an endurance goal: the plan is built backwards from it. */
  raceDate?: string | null;
  /**
   * What they run in a normal week right now, in miles. Required for an endurance goal.
   *
   * ⚠ 0 IS A REAL ANSWER and must not be coerced to a default. "I don't run at all" and "I haven't told
   * you yet" produce completely different first weeks, and the second one is `null`.
   */
  currentWeeklyMi?: number | null;
  /** Explicit weeks, when there is no race to count back from. Ignored when `raceDate` is set. */
  weeks?: number | null;
  /**
   * A recent all-out result — distance in miles and time in seconds — used to derive training paces.
   *
   * ⚠ **OPTIONAL, AND ITS ABSENCE MUST STAY VISIBLE.** With a result, Holt writes real paces (EPS-D10).
   * Without one he describes effort and writes NO number, because a guessed pace is indistinguishable
   * from a derived one on the screen and the athlete would train to it either way.
   */
  recentRaceMi?: number | null;
  recentRaceSec?: number | null;
  /**
   * Whether they can currently run for twenty minutes without stopping.
   *
   * The one question that decides whether a beginner gets a running plan or a run/walk plan (EPS-D8), and
   * it cannot be inferred from mileage: 0 miles a week is both "I have never run" and "I used to race and
   * I have taken three months off", and those two people need completely different first weeks.
   */
  canRunContinuously?: boolean | null;

  /**
   * How the athlete wants the week carved up. `null` takes the goal's default.
   *
   * A preference, not a correction — the defaults are good. But which split someone LIKES predicts
   * whether they finish the block, and a program abandoned in week 2 trains nobody.
   */
  splitStyle?: import('./rulebook/skeletons.ts').SplitStyle | null;
  /**
   * What this athlete keeps choosing instead of what was prescribed — `learnPreferences()` output.
   *
   * ⚠ AN INPUT, NOT A LOOKUP. `domain/coach/**` reads no database, and this does not change that: the
   * caller resolves it and hands it down, so `assemble()` stays a pure function of its arguments.
   *
   * ⚠ AND IT ONLY RE-RANKS WITHIN A MOVEMENT PATTERN — it can never remove one. That is why preference
   * needs no visible-and-reversible surface before it is safe to act on, where an avoidance list would
   * (CL-D3). See `learned-preference.ts`.
   *
   * Absent means "no opinion", and the engine then behaves exactly as it did before this existed.
   */
  learned?: LearnedPreferences;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// NORMALISING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/** Equipment actually available for this block: what the environment gives, minus nothing. */
export function effectiveEquipment(c: CoachConstraints): readonly string[] {
  return equipmentForEnvironment(c.environment, c.ownedEquipment);
}

/**
 * Bring a constraint set inside the bounds every downstream step assumes.
 *
 * Clamping rather than rejecting is deliberate for the numeric fields: a wizard cannot offer 7 days, so a
 * 7 can only arrive from a caller that made it up, and the useful response to that is a 6-day program
 * rather than an error nobody can act on. The fields that CANNOT be guessed — a race with no date — are
 * left alone here and reported by `missingFor`, because inventing a race date is worse than asking.
 */
export function normalise(c: CoachConstraints): CoachConstraints {
  const out: CoachConstraints = {
    ...c,
    daysPerWeek: clamp(c.daysPerWeek, MIN_DAYS_PER_WEEK, MAX_DAYS_PER_WEEK),
    limitations: [...new Set(c.limitations)],
    excludeExercises: [...new Set(c.excludeExercises)],
    ownedEquipment: [...new Set(c.ownedEquipment)],
  };
  if (out.weeks != null) out.weeks = clamp(out.weeks, MIN_WEEKS, MAX_WEEKS);
  if (out.currentWeeklyMi != null) out.currentWeeklyMi = Math.max(0, out.currentWeeklyMi);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT STILL NEEDS ASKING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A field the coach cannot proceed without and cannot honestly guess. */
export type MissingField = 'daysPerWeek' | 'sessionMinutes' | 'raceDate' | 'currentWeeklyMi';

/**
 * Which questions the wizard still has to ask.
 *
 * This is the function that keeps the intake short. Goal, experience, environment and equipment are read
 * from the profile, so a set-up athlete is asked about days, session length, and — for a race — the date
 * and their current mileage. Anything already known is never asked again, and the wizard says what it
 * already knows rather than making them confirm it.
 */
export function missingFor(c: Partial<CoachConstraints>): MissingField[] {
  const out: MissingField[] = [];
  if (c.daysPerWeek == null) out.push('daysPerWeek');
  if (c.sessionMinutes == null) out.push('sessionMinutes');
  if (c.goal != null && isEnduranceGoal(c.goal)) {
    if (!c.raceDate) out.push('raceDate');
    // `!= null` and not a truthiness test: 0 weekly miles is a legitimate, common starting point.
    if (c.currentWeeklyMi == null) out.push('currentWeeklyMi');
  }
  return out;
}

/** Everything needed is present — the assembler may run. */
export const isComplete = (c: Partial<CoachConstraints>): c is CoachConstraints =>
  c.goal != null && c.experience != null && c.environment != null && missingFor(c).length === 0;
