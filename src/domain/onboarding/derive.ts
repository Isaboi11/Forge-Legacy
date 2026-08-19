/**
 * Pure onboarding derivations (Gate B). Onboarding collects goal/equipment/name as journey-state, then
 * DERIVES the canonical profile fields the finish transaction persists — athlete type (ONB-D8) and
 * environment (ONB-D11). Pure + unit-tested so the mapping is provable, not buried in the finish call.
 */

/**
 * ⚠ TYPE-ONLY, AND RELATIVE WITH THE EXTENSION. `domain/**` runs under `node --test`, which type-strips
 * but does not resolve the `@/` alias — a runtime import through it breaks the suite. This one is erased
 * entirely at runtime; the maps below are string literals that need nothing imported to evaluate.
 */
import type { Goal } from '../coach/constraints.ts';

/** The 6 goal ids from the design `.dc` Goals screen. */
export type GoalId = 'strength' | 'muscle' | 'fatloss' | 'endurance' | 'health' | 'athletic';
/** The 5 equipment ids from the design `.dc` Equipment screen. */
export type EquipmentId = 'fullgym' | 'homegym' | 'dumbbells' | 'bands' | 'bodyweight';
/** The locked Rank athlete types (0001 enum). */
export type AthleteType = 'Strength' | 'Bodybuilding' | 'Endurance' | 'Hybrid';
/** The profile environment buckets (ONB-D11 canonical; `dumbbells_only` is the additive value). */
export type Environment = 'commercial_gym' | 'home_gym' | 'dumbbells_only' | 'bodyweight';

/** ONB-D8 map (the 8-goal architecture map applied to the design's 6 goals). Hybrid = catch-all. */
const ATHLETE_TYPE_BY_GOAL: Record<GoalId, AthleteType> = {
  strength: 'Strength',
  muscle: 'Bodybuilding',
  endurance: 'Endurance',
  fatloss: 'Hybrid',
  health: 'Hybrid',
  athletic: 'Hybrid',
};

/** Derive the default Athlete Type from the primary goal (ONB-D8). Default, editable later in P-1.1. */
export function athleteTypeForGoal(primaryGoal: GoalId | null | undefined): AthleteType {
  return primaryGoal ? ATHLETE_TYPE_BY_GOAL[primaryGoal] : 'Hybrid';
}

/** Environment from the selected equipment — the richest access wins (gym > home > dumbbells > bodyweight). */
export function environmentForEquipment(equipment: readonly EquipmentId[]): Environment {
  if (equipment.includes('fullgym')) return 'commercial_gym';
  if (equipment.includes('homegym')) return 'home_gym';
  if (equipment.includes('dumbbells')) return 'dumbbells_only';
  return 'bodyweight'; // bands / bodyweight (no canonical bands bucket)
}

/**
 * The profile `environment` value in the coach's own vocabulary.
 *
 * Two enumerations exist and both are load-bearing: `Environment` here is the LOCKED profile field
 * (ONB-D11, four buckets including `dumbbells_only`), while `domain/coach/constraints.ts` has its own
 * four-value `Environment` that decides what equipment a build may reach for. They are not the same list
 * and must not be merged — `dumbbells_only` has no coach equivalent because the coach expresses it as
 * `home` plus an owned list of exactly dumbbells, which is what `homeGymForEquipment` writes.
 */
export function coachEnvironmentFor(env: Environment): 'full_gym' | 'home' | 'bodyweight' {
  switch (env) {
    case 'commercial_gym':
      return 'full_gym';
    case 'home_gym':
    case 'dumbbells_only':
      return 'home';
    case 'bodyweight':
    default:
      return 'bodyweight';
  }
}

/**
 * What the equipment answer is worth writing to `profiles.home_gym_equipment` — or `null` when it is
 * worth nothing.
 *
 * ⚠ `null` IS THE COMMON, CORRECT ANSWER AND MUST NOT BE FLATTENED TO `[]`. 0021 keeps three states
 * apart on purpose: null = never set up, `[]` = "I own nothing", a list = what they own. A coarse
 * onboarding bucket can only honestly produce a list in two of the five cases.
 *
 *   fullgym    → null. Access, not ownership. `equipmentForEnvironment('full_gym', …)` already grants the
 *                commercial-gym inventory, and claiming the athlete OWNS a leg press would be a lie that
 *                outlives the answer that caused it.
 *   homegym    → null from the bucket alone. A garage holds anything from a band to a full rack, so the
 *                step asks the gear grid when this is chosen and passes the real list through `gear`.
 *   dumbbells  → the one bucket that names its own equipment.
 *   bands      → likewise. `minibands` rides along: nobody who owns loop bands means to exclude them.
 *   bodyweight → `[]`, the deliberate "I own nothing" — a real answer, not an absence.
 */
export function homeGymForEquipment(
  equipment: readonly EquipmentId[],
  gear?: readonly string[] | null,
): string[] | null {
  if (equipment.includes('fullgym')) return null;
  // The gear grid, when the athlete filled it in. `[]` from the grid is a real "nothing but me and the
  // floor" and is kept; only a genuinely absent grid falls through to the bucket mapping.
  if (equipment.includes('homegym')) return gear ? [...new Set(gear)] : null;
  const ids = new Set<string>();
  if (equipment.includes('dumbbells')) ids.add('dumbbells');
  if (equipment.includes('bands')) {
    ids.add('bands');
    ids.add('minibands');
  }
  // Only `bodyweight` remains, and its honest list is the empty one.
  return [...ids];
}

/**
 * The primary goal in the coach's vocabulary, or `null` when the onboarding answer does not determine
 * one and Coach Holt must ask.
 *
 * ⚠ TWO OF THE SIX DELIBERATELY RETURN `null`, AND THAT IS THE WHOLE POINT OF THIS FUNCTION.
 *
 *   endurance — the coach has five race goals, not one. Which race decides the entire volume curve, and
 *               the athlete has to give a date and a current weekly mileage regardless (EPS-D8/D10), so
 *               there is no question saved by guessing `run_5k` and a wrong plan if it guesses wrong.
 *   athletic  — "athletic performance" spans `conditioning` and `strength`, and `conditioning` is
 *               authored-but-not-offered in the wizard by an existing decision (see `STRENGTH_GOALS`).
 *               Silently routing an athlete into a goal the wizard itself declines to draw would be this
 *               function inventing a choice nobody made.
 *
 * Both still derive an Athlete Type through `athleteTypeForGoal` — `Endurance` and `Hybrid` respectively
 * — because that mapping is coarse by design and correct at that grain.
 */
export function coachGoalForGoalId(primaryGoal: GoalId | null | undefined): Goal | null {
  switch (primaryGoal) {
    case 'strength':
      return 'strength';
    case 'muscle':
      return 'muscle';
    case 'fatloss':
      return 'weight_loss';
    case 'health':
      return 'health';
    case 'endurance':
    case 'athletic':
    default:
      return null;
  }
}

/** First name for greetings/possessives — the first whitespace-delimited token. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Up to two initials, uppercased — the avatar fallback. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
