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
  /**
   * The athlete's Home Gym profile, when they've built one (`src/domain/home-gym/equipment.ts` ids).
   * `null`/absent = never set up, and the coarse `equipment` answer stands on its own.
   */
  homeGym?: readonly string[] | null;
}

function expFor(e: string | null | undefined): Experience {
  return e === 'intermediate' || e === 'advanced' ? e : 'beginner';
}

/**
 * "Home Gym" is one checkbox covering everything from a pair of bands to a fully-kitted garage, and
 * those two athletes should not get the same program. When a real profile exists we read the tier off
 * the gear itself: a bar with a rack or bench runs barbell programming, so it earns the `gym` tier
 * even though the athlete trains alone in a garage.
 *
 * Deliberately only used to REFINE a `homegym` answer — never to downgrade someone who said they have
 * a full commercial gym, whose access their home profile says nothing about.
 */
function accessFromGear(gym: readonly string[]): Access {
  const has = (...ids: string[]) => ids.some((id) => gym.includes(id));
  const bar = has('barbell', 'plates', 'trapbar', 'ezbar', 'smith');
  if (bar && has('rack', 'bench', 'smith')) return 'gym';
  if (bar || has('dumbbells', 'kettlebells', 'cable', 'latpulldown', 'legpress', 'legmachine')) return 'home';
  return 'bodyweight'; // bands, a mat and a pull-up bar is bodyweight programming with resistance
}

/** Access tier from equipment — richest wins (matches derive.environmentForEquipment ordering). */
export function accessFor(
  equipment: readonly EquipmentId[] | null | undefined,
  homeGym?: readonly string[] | null,
): Access {
  const eq = equipment ?? [];
  if (eq.includes('fullgym')) return 'gym';
  if (eq.includes('homegym')) {
    // A profile is a better answer than the checkbox that prompted it — but an EMPTY one is a real
    // "I own nothing", so it legitimately drops them to bodyweight.
    if (homeGym != null) return accessFromGear(homeGym);
    return 'home';
  }
  if (eq.includes('dumbbells')) return 'home';
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
  const access = accessFor(input.equipment, input.homeGym);
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

/** The 6 goals the intake asks about — every question the catalog has to be able to answer. */
const GOALS: readonly GoalId[] = ['strength', 'muscle', 'fatloss', 'endurance', 'health', 'athletic'];
const EXPERIENCES: readonly Experience[] = ['beginner', 'intermediate', 'advanced'];
/** One equipment answer per access tier — `accessFor` reduces all five checkboxes to these three. */
const ACCESS_ANSWERS: readonly (readonly EquipmentId[])[] = [['fullgym'], ['dumbbells'], []];

/**
 * IS THE GUIDED ON-RAMP WORTH OFFERING YET?
 *
 * `resolveRecommendationId` always returns a real id — that is its invariant, and it is achieved by a
 * fallback. So "we can recommend" is NOT "the answer exists"; it is "the answer corresponds to what was
 * asked". Today it does not: of the 54 goal × experience × access combinations the intake can produce,
 * only gym-access strength lands on a program authored for that goal. An athlete who says *I want to run
 * a 10k, bodyweight only* answers three questions and is handed a 3-day barbell program.
 *
 * That is a promise the catalog cannot keep, so Home does not make it — see the starting-point slot in
 * `(tabs)/index.tsx`. This is a derived condition rather than a flag on purpose: when the Running,
 * Conditioning, Muscle Building and Full Body families land (either authored under the design's own ids
 * or aliased to them), the on-ramp returns without anyone having to remember it was switched off.
 *
 * A combination counts as answered only when its INTENDED program is real — present in the catalog, or
 * deliberately aliased to something in it. Reaching `FALLBACK_ID` is precisely the case this rules out.
 */
export function canRecommend(catalogIds: readonly string[]): boolean {
  const have = new Set(catalogIds);
  const answered = (intended: string) => have.has(intended) || CATALOG_ALIAS[intended] != null;

  return GOALS.every((primaryGoal) =>
    EXPERIENCES.every((experience) =>
      ACCESS_ANSWERS.every((equipment) => answered(intendedProgramId({ primaryGoal, experience, equipment }))),
    ),
  );
}
