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
import type { RecentWork } from './recent-work.ts';

export type StrengthGoal = 'strength' | 'muscle' | 'weight_loss' | 'conditioning' | 'mobility' | 'health';

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
  /* ⚠ THE ORDER HERE IS THE ORDER ON SCREEN, and General health is deliberately LAST of the offered
     goals. It is the broadest answer on the list — put it first and somebody takes it before reading the
     four specific ones underneath, which is how a general goal quietly swallows every specific one.
     (`conditioning` sits above it and is never drawn: it is authored but not offered — see NOT_OFFERED.) */
  'health',
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
  health: 'General health',
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

/**
 * The range Holt builds to ON HIS OWN — every split in `rulebook/skeletons.ts` is authored at 2 through 6.
 *
 * ⚠ NO LONGER THE BUILDER'S RANGE. These were "the Program Builder's own clamps" and the Builder now
 * takes 1–7 (`ATHLETE_MIN/MAX_DAYS_PER_WEEK`, CA §4.5). They stay 2–6 because CA-D12 keeps them as the
 * shape of what Holt writes unprompted: a week with no rest day, or a single session, is the athlete's
 * call to make, never his default.
 */
export const MIN_DAYS_PER_WEEK = 2;
export const MAX_DAYS_PER_WEEK = 6;
/**
 * What an athlete may dictate — the Program Builder's own range (`DAYS_MIN`/`DAYS_MAX` in
 * `lib/program-draft-model.ts`, which must agree). CA-D12, the PO's own example: *"run 1 mile a day and
 * lift on Wednesday"* is seven days, and it gets built. The validator holds programs to THIS range,
 * because it is the range the screen that opens them can render.
 */
export const ATHLETE_MIN_DAYS_PER_WEEK = 1;
export const ATHLETE_MAX_DAYS_PER_WEEK = 7;
/** What a program is built on when the day count is absent — or arrived as something that is not one. */
export const DEFAULT_DAYS_PER_WEEK = 4;
/**
 * 1, not 4 — PA2-D1. Holt may author a single week, and the rulebook makes one coherent rather than
 * shipping the opening week of a mesocycle that does not exist (PAS-A7-D2, `rulebook/volume.ts`).
 *
 * ⚠ Endurance keeps its OWN, higher floors — 6 weeks for a 5K up to 12 for a marathon — and they are not
 * this constant. `rulebook/endurance.ts` refuses below them in terms rather than compressing a plan that
 * cannot honestly be compressed (PAS-A7-D3). Lowering this must never be read as overturning that.
 * (`buildAnyway` is the one door past those floors, and it is the athlete's to open, not this constant's.)
 */
export const MIN_WEEKS = 1;
export const MAX_WEEKS = 52;

export interface CoachConstraints {
  goal: Goal;
  experience: ExperienceProfile;
  /**
   * 2–6 for a week Holt shapes himself, 1–7 when the athlete set it (`athleteSetDays`, or a `days` week).
   * Clamped by `normalise`; a clamp is said out loud as a concern, never done silently (CA-D12).
   */
  daysPerWeek: number;
  /**
   * The athlete said this day count themselves — "seven days", "just Mondays" — rather than Holt
   * proposing it. Widens the clamp to the Builder's 1–7, and a count outside Holt's own 2–6 comes back
   * with a one-sentence concern instead of being rewritten. Absent or false is the behaviour before this
   * existed, exactly.
   */
  athleteSetDays?: boolean;
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
   * The athlete has heard the concern and wants their race anyway — CA-D12, PO 2026-09-21: *"Holt
   * shouldn't really say no to a race. Maybe suggest, but then just have him do what they say."*
   *
   * With it, `assembleEndurance` never refuses: too few weeks compresses, too little base starts from
   * where they are, a non-continuous runner gets run/walk to the race, and a limitation that rules out
   * running is overridden for this build only. What would have been the refusal comes back as
   * `concern` — said once, with the suggestion, and then dropped. The caps (10%/week, the long-run spike
   * and distance caps) still bind: they protect the athlete, and the honest consequence of a short or
   * thin build is a long run that stops short of race distance, which the concern names in miles.
   *
   * Absent or false is the behaviour before this existed, exactly — every refusal unchanged.
   */
  buildAnyway?: boolean;

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
  /**
   * What this athlete trained in the last few sessions, so two identical wizard answers stop producing
   * two identical programs (`recent-work.ts`). Resolved by the caller; absent means "no history".
   */
  recent?: RecentWork;

  // ── Athlete-authored (CA-D3 / CA-D12) ───────────────────────────────────────────────────────────────
  /**
   * "Glute focus", "bigger arms", "calves" — 69 of 705 real requests. The block keeps its goal and its
   * split; volume leans toward these groups inside the caps the validator enforces. `rulebook/focus.ts`
   * says what each one means. Absent or empty is the behaviour before this existed, exactly.
   */
  focusMuscles?: readonly FocusMuscle[] | null;
  /**
   * Exercises the athlete named — "bench, rows, pull-ups, curls", "bench 5×5, rows 4×8". Placed FIRST,
   * before the rulebook fills the rest. See `PinnedExercise`.
   */
  pinned?: readonly PinnedExercise[] | null;
  /**
   * The week, one entry per day — "run twice, lift three days", "run a mile a day and lift Wednesday".
   * When present it IS the week: `daysPerWeek` becomes the count of non-rest entries and the day count
   * is the athlete's (1–7). `rest` entries are not sessions — a program has no rest rows — but they keep
   * their place for the interference rules, so a rest day between a leg day and a long run counts.
   */
  days?: readonly DayIntent[] | null;
  /**
   * The athlete fixed which day is which ("run Tuesday and Thursday, lift Monday, Wednesday, Friday").
   * Then `days` is kept in that order and a conflict comes back as a concern. False or absent lets Holt
   * arrange the entries — "run twice, lift three days" names no weekdays, so the order is his to choose.
   */
  daysAsGiven?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ATHLETE-AUTHORED PARTS — CA-D3's four states, per part of a day
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The muscle groups an athlete can ask to bring up, in the words they use.
 *
 * Deliberately coarse and overlapping — `arms` is `biceps` + `triceps`, `legs` is `quads` + `hamstrings`
 * + `glutes` + `calves` — because the athlete says "arms" far more often than "brachii". Each maps to
 * catalogue movement patterns and `primaryMuscleIds` in `rulebook/focus.ts`, never to a hand-kept list
 * of exercises.
 */
export type FocusMuscle =
  | 'glutes'
  | 'arms'
  | 'biceps'
  | 'triceps'
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'legs'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'core';

export const FOCUS_MUSCLES: readonly FocusMuscle[] = [
  'glutes', 'arms', 'biceps', 'triceps', 'shoulders', 'chest', 'back', 'legs', 'quads', 'hamstrings', 'calves', 'core',
];

/**
 * One exercise the athlete named.
 *
 *   · `name`      — their words. Resolved through the catalogue's own resolver (`resolveAgainstCatalog`,
 *                   the Program Builder import's path), then the rulebook's family words ("rows",
 *                   "curls"). A name neither answers comes back in `Assembly.unresolved` — asked back,
 *                   never silently dropped, which is the Exercise Picker's known failure.
 *   · `catalogKey`— when the caller already knows the row. Checked against the pool; an unknown key
 *                   falls back to the name.
 *   · `day`       — 0-based. Indexes `days` when a `days` week is given, otherwise the training days of
 *                   the built week. Absent, or pointing at a day that cannot take it, and it goes on the
 *                   day whose pattern fits.
 *   · `sets`/`reps` — verbatim when given ("5×5"); otherwise the rulebook's.
 *   · `confirmed` — the athlete heard that this conflicts with a limitation or their kit and wants it
 *                   anyway (CA-D12: a limitation is never SILENTLY violated — named, then confirmed).
 */
export interface PinnedExercise {
  day?: number | null;
  name: string;
  catalogKey?: string | null;
  sets?: number | null;
  reps?: number | null;
  confirmed?: boolean;
}

/**
 * One day of an athlete-shaped week (CA §4.1).
 *
 *   · `lift`   — from the strength rulebook: goal, focus, pinned, limitations, equipment all honoured.
 *                `focus` names the day ("upper", "legs", "push", "glutes") — `DAY_FOR_FOCUS`.
 *   · `run`    — an easy run, sized from `runMi` / `runMin` verbatim, else from `currentWeeklyMi`,
 *                else the rulebook's default minutes.
 *   · `cardio` — a bout on whatever the athlete can use; `focus` may name the activity ("bike", "row").
 *   · `rest`   — no session. Keeps its place in the week.
 */
export interface DayIntent {
  kind: 'run' | 'lift' | 'rest' | 'cardio';
  focus?: string | null;
  runMi?: number | null;
  runMin?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// NORMALISING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/**
 * A number that can actually be counted with.
 *
 * ⚠ `NaN` IS NOT ABSENT TO `??`, AND `clamp` PASSES IT STRAIGHT THROUGH — `Math.max(2, NaN)` is `NaN`.
 * So a `daysPerWeek: NaN` (a parsed-empty field, a bad restore) sailed past every default and every
 * bound: a race goal came back `ok` with ZERO sessions in the whole plan and "NaN days" in Holt's
 * preamble, a strength goal was refused as "no plan for that goal", and `weeks: NaN` built an array of
 * length NaN and crashed on `weekPlans[0].days`. A value that is not a finite number is treated as not
 * given, which lands it on the same default or question an absent one gets.
 */
export const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Equipment actually available for this block: what the environment gives, minus nothing. */
export function effectiveEquipment(c: CoachConstraints): readonly string[] {
  return equipmentForEnvironment(c.environment, c.ownedEquipment);
}

/**
 * Bring a constraint set inside the bounds every downstream step assumes.
 *
 * Clamping rather than rejecting is deliberate for the numeric fields: a wizard cannot offer 7 days, so a
 * 7 can only arrive from a caller that made it up, and the useful response to that is a 6-day program
 * rather than an error nobody can act on. (⚠ Unless the athlete said it — `athleteSetDays` or a `days`
 * week widens the clamp to the Builder's 1–7, CA-D12, and `assemble` names any clamp that still bites.)
 * The fields that CANNOT be guessed — a race with no date — are
 * left alone here and reported by `missingFor`, because inventing a race date is worse than asking.
 */
export function normalise(c: CoachConstraints): CoachConstraints {
  /* A `days` week sets the count itself — the athlete wrote every day of it, so it is theirs by
     construction (CA-D12). Only the non-rest entries are sessions. A week of all rest is left at 0 for
     `assemble` to refuse in words; it is not quietly turned into four days of something. */
  const week = (c.days ?? []).slice(0, ATHLETE_MAX_DAYS_PER_WEEK);
  const hasWeek = week.length > 0;
  const athlete = hasWeek || c.athleteSetDays === true;
  const [lo, hi] = athlete
    ? [ATHLETE_MIN_DAYS_PER_WEEK, ATHLETE_MAX_DAYS_PER_WEEK]
    : [MIN_DAYS_PER_WEEK, MAX_DAYS_PER_WEEK];
  const out: CoachConstraints = {
    ...c,
    daysPerWeek: hasWeek
      ? week.filter((d) => d.kind !== 'rest').length
      : clamp(isCount(c.daysPerWeek) ? c.daysPerWeek : DEFAULT_DAYS_PER_WEEK, lo, hi),
    ...(hasWeek ? { days: week } : {}),
    limitations: [...new Set(c.limitations)],
    excludeExercises: [...new Set(c.excludeExercises)],
    ownedEquipment: [...new Set(c.ownedEquipment)],
  };
  // Non-finite reads as absent — `undefined`, so `weeks ?? defaultWeeksFor(goal)` supplies the length.
  if (out.weeks != null) out.weeks = isCount(out.weeks) ? clamp(out.weeks, MIN_WEEKS, MAX_WEEKS) : undefined;
  if (out.currentWeeklyMi != null) out.currentWeeklyMi = isCount(out.currentWeeklyMi) ? Math.max(0, out.currentWeeklyMi) : null;
  if (out.focusMuscles) out.focusMuscles = [...new Set(out.focusMuscles.filter((m) => FOCUS_MUSCLES.includes(m)))];
  // A pin with no name and no key is nothing anybody said — it cannot be asked back, so it is not kept.
  if (out.pinned) out.pinned = out.pinned.filter((p) => (p.name ?? '').trim() !== '' || !!p.catalogKey);
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
  /*
   * ══ A `days` WEEK ANSWERS ITS OWN QUESTIONS (CA §4.3) ══
   *
   * The athlete who says "run Tuesday and Thursday, lift the other three" has told Holt the day count.
   * What is still worth asking depends on what the days ARE: a lift day needs a session length (it sets
   * how many movements fit), a cardio bout with no minutes needs one too, and a run day needs nothing —
   * it is sized from their miles or minutes, their weekly mileage, or the rulebook's default. And a
   * run-and-lift week is not a race build, so an endurance goal stops asking for a race date.
   */
  const week = c.days ?? [];
  if (week.length > 0) {
    const needsLength = week.some((d) => d.kind === 'lift' || (d.kind === 'cardio' && !isCount(d.runMin)));
    if (needsLength && c.sessionMinutes == null) out.push('sessionMinutes');
    return out;
  }
  // `isCount`, not `== null` — a NaN day count is a question still to ask, not an answer (see `isCount`).
  if (!isCount(c.daysPerWeek)) out.push('daysPerWeek');
  if (c.sessionMinutes == null) out.push('sessionMinutes');
  if (c.goal != null && isEnduranceGoal(c.goal)) {
    if (!c.raceDate) out.push('raceDate');
    // `!= null` and not a truthiness test: 0 weekly miles is a legitimate, common starting point.
    if (!isCount(c.currentWeeklyMi)) out.push('currentWeeklyMi');
  }
  return out;
}

/** Everything needed is present — the assembler may run. */
export const isComplete = (c: Partial<CoachConstraints>): c is CoachConstraints =>
  c.goal != null && c.experience != null && c.environment != null && missingFor(c).length === 0;
