/**
 * Pure onboarding derivations (Gate B). Onboarding collects goal/equipment/name as journey-state, then
 * DERIVES the canonical profile fields the finish transaction persists — athlete type (ONB-D8) and
 * environment (ONB-D11). Pure + unit-tested so the mapping is provable, not buried in the finish call.
 */

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
