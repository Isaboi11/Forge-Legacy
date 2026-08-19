import { supabase } from '@/lib/supabase';
import { sanitize } from '@/domain/home-gym/equipment';
import { coachEnvironmentFor, coachGoalForGoalId, type Environment as ProfileEnvironment, type GoalId } from '@/domain/onboarding/derive';
import type { Environment, Experience, Goal } from '@/domain/coach/constraints';

/**
 * WHAT THE COACH ALREADY KNOWS ABOUT THIS ATHLETE — the one read behind `missingFor()`.
 *
 * `domain/coach/constraints.ts` has said since it was written that *"goal and experience come from
 * onboarding, equipment from the Home Gym profile, units from Settings"*, and that an athlete who has
 * filled their profile in "answers three questions and not eight". The engine was ready; nothing ever
 * handed it the profile. This is that hand-off.
 *
 * ⚠ ONE ROUND TRIP, NOT FOUR. Every field lives on `profiles`, so this replaces `fetchHomeGym()` inside
 * the coach flow rather than sitting beside it — a second read of the same row for the same screen is
 * how two callers start disagreeing about what the athlete owns.
 *
 * ⚠ EVERY FIELD IS INDEPENDENTLY NULLABLE AND NULL ALWAYS MEANS "ASK". There is no partial-profile
 * special case and no all-or-nothing gate: an athlete who answered experience but predates the goal
 * column is asked about their goal alone. That is also what makes this safe for the ~every existing
 * athlete, who has none of it and is asked exactly what they are asked today.
 */
export interface CoachProfile {
  /**
   * The primary goal in the COACH's vocabulary, or null when onboarding's answer does not determine one.
   *
   * ⚠ `null` HERE IS NOT THE SAME AS "never onboarded" — `coachGoalForGoalId` deliberately returns null
   * for `endurance` (five race goals, and the athlete owes a date and a mileage regardless) and for
   * `athletic`. `primaryGoalId` carries the raw answer so a caller can tell the two apart.
   */
  goal: Goal | null;
  /** The raw onboarding answer, ordered, `[0]` primary. Empty when never asked. */
  goalIds: GoalId[];
  experience: Experience | null;
  /** The coach's own environment vocabulary, mapped from the profile's four buckets. */
  environment: Environment | null;
  /** `null` = never set up, `[]` = "I own nothing". Both are meaningful; see 0021. */
  ownedEquipment: string[] | null;
}

export const EMPTY_COACH_PROFILE: CoachProfile = {
  goal: null,
  goalIds: [],
  experience: null,
  environment: null,
  ownedEquipment: null,
};

const EXPERIENCES: readonly string[] = ['beginner', 'intermediate', 'advanced'];
const GOAL_IDS: readonly string[] = ['strength', 'muscle', 'fatloss', 'endurance', 'health', 'athletic'];
const PROFILE_ENVIRONMENTS: readonly string[] = ['commercial_gym', 'home_gym', 'dumbbells_only', 'bodyweight'];

interface Row {
  experience: string | null;
  training_goals: string[] | null;
  environment: string | null;
  home_gym_equipment: string[] | null;
}

/**
 * ⚠ FAILS TO "ASK EVERYTHING", NEVER TO A DEFAULT.
 *
 * A missing column (an app running ahead of 0169), a network failure and a signed-out user all resolve
 * to the same empty profile, and an empty profile makes the wizard behave exactly as it did before any
 * of this existed. The alternative — guessing `beginner` on a failed read — hands a ten-year lifter
 * beginner progressions with total confidence, which is this repo's own standing lesson about defaults.
 */
export async function fetchCoachProfile(): Promise<CoachProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_COACH_PROFILE;

  const { data, error } = await supabase
    .from('profiles')
    .select('experience, training_goals, environment, home_gym_equipment')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return EMPTY_COACH_PROFILE;
  const row = data as unknown as Row;

  // Validated against the current vocabularies rather than cast, so a value retired from the app simply
  // stops counting instead of reaching the engine as an unmatchable key.
  const goalIds = (row.training_goals ?? []).filter((g): g is GoalId => GOAL_IDS.includes(g)).slice(0, 3);
  const experience = EXPERIENCES.includes(row.experience ?? '') ? (row.experience as Experience) : null;
  const environment = PROFILE_ENVIRONMENTS.includes(row.environment ?? '')
    ? coachEnvironmentFor(row.environment as ProfileEnvironment)
    : null;

  return {
    goal: coachGoalForGoalId(goalIds[0] ?? null),
    goalIds,
    experience,
    environment,
    ownedEquipment: row.home_gym_equipment == null ? null : sanitize(row.home_gym_equipment),
  };
}
