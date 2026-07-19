import type { GoalId, EquipmentId } from './derive';

/**
 * Pure recommendation core — the goal × experience × equipment map ported from the design's
 * `Forge Onboarding.dc.html`, resolved to a REAL catalog id. Deliberately has NO app imports (no catalog,
 * no `@` alias), so it is directly unit-testable (node --test type-strips this .ts).
 *
 * ⚠️ Thin catalog: only Strength Foundation I + II are authored today, so the design's richer ids alias or
 * fall back to one of those two — the *mechanism* is real (goal/experience/equipment all feed it), the
 * *catalog* is small. Adding programs later just extends CATALOG_ALIAS (or the catalog gains the real ids).
 */

export const FALLBACK_ID = 'strength-foundation-i-3day'; // Strength Foundation I — the design's own fallback
export const ADVANCED_ID = 'strength-foundation-ii-4day'; // Strength Foundation II

type Experience = 'beginner' | 'intermediate' | 'advanced';
type Access = 'gym' | 'home' | 'bodyweight';

export interface RecommendInput {
  experience?: string | null;
  primaryGoal?: GoalId | null;
  equipment?: readonly EquipmentId[] | null;
}

function expFor(e: string | null | undefined): Experience {
  return e === 'intermediate' || e === 'advanced' ? e : 'beginner';
}

/** Access tier from equipment — richest wins (matches derive.environmentForEquipment ordering). */
export function accessFor(equipment: readonly EquipmentId[] | null | undefined): Access {
  const eq = equipment ?? [];
  if (eq.includes('fullgym')) return 'gym';
  if (eq.includes('homegym') || eq.includes('dumbbells')) return 'home';
  return 'bodyweight';
}

/** The design's gym-access map. Its ids are the INTENDED catalog (aliased to real ids in resolveRecommendationId). */
const GYM_MAP: Record<GoalId, Record<Experience, string>> = {
  strength: { beginner: 'strength-foundation-1', intermediate: 'strength-powerbuilding-1', advanced: 'strength-531' },
  muscle: { beginner: 'mb-arms-aesthetics', intermediate: 'mb-hypertrophy-block', advanced: 'mb-ppl' },
  endurance: { beginner: 'run-c25k', intermediate: 'run-10k', advanced: 'run-half-base' },
  fatloss: { beginner: 'cond-hiit', intermediate: 'cond-circuit', advanced: 'cond-metcon' },
  athletic: { beginner: 'cond-hiit', intermediate: 'cond-engine', advanced: 'cond-metcon' },
  health: { beginner: 'fbh-full-body-3', intermediate: 'fbh-full-body-3', advanced: 'mb-upper-lower' },
};

/** The design's intended program id for the inputs (may be an id not yet in our catalog). */
export function intendedProgramId(input: RecommendInput): string {
  const primary: GoalId = input.primaryGoal ?? 'health';
  const exp = expFor(input.experience);
  const access = accessFor(input.equipment);
  if (access === 'bodyweight') return primary === 'endurance' ? 'run-c25k' : 'fbh-bodyweight-basics';
  if (access === 'home') {
    if (primary === 'endurance') return 'run-c25k';
    if (primary === 'muscle') return 'fbh-dumbbell-only';
    if (primary === 'strength') return 'fbh-full-body-3';
    if (primary === 'fatloss' || primary === 'athletic') return 'cond-circuit';
    return 'fbh-home-minimalist';
  }
  return (GYM_MAP[primary] ?? GYM_MAP.health)[exp] ?? 'fbh-full-body-3';
}

/** Intended id → a REAL catalog id. Everything unmapped falls back to Strength Foundation I. */
const CATALOG_ALIAS: Record<string, string> = {
  'strength-foundation-1': FALLBACK_ID,
  'strength-powerbuilding-1': ADVANCED_ID,
  'strength-531': ADVANCED_ID,
};

/** Pure: resolve intake → a real catalog program id. Always returns an id that exists in the catalog. */
export function resolveRecommendationId(input: RecommendInput): string {
  return CATALOG_ALIAS[intendedProgramId(input)] ?? FALLBACK_ID;
}
