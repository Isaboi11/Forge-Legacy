import { supabase } from '@/lib/supabase';
import { saveAppPrefs } from '@/data/settings-live';
import { APP_PREFS_DEFAULTS } from '@/domain/settings/preferences';
import type { UnitSystem } from '@/domain/settings/units';
import { uploadAvatar } from '@/lib/avatar';
import { chapterNameFrom, DEFAULT_CHAPTER_I_TITLE } from '@/domain/legacy/chapter-name';
import type { Experience } from '@/domain/coach/constraints';
import {
  athleteTypeForGoal,
  environmentForEquipment,
  firstNameOf,
  homeGymForEquipment,
  initialsOf,
  type EquipmentId,
  type GoalId,
} from './derive';

/**
 * Chapter I's title when the athlete does not choose one (ONB-D14; PO-ruled over the design's
 * "Building your Legacy").
 *
 * It is a DEFAULT now, not the canonical name — onboarding asks. Derived from
 * `@/domain/legacy/chapter-name` rather than written out again, because the second hard-coded copy of
 * this string (in `onboarding.tsx`'s transition copy) is exactly how the two got to say different
 * things once already.
 */
export const CHAPTER_I_NAME = chapterNameFrom(DEFAULT_CHAPTER_I_TITLE);

/** Live username uniqueness (profiles.handle is citext → case-insensitive). ≥3 chars, [a-z0-9_]. */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const clean = handle.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  if (clean.length < 3) return false;
  const { data, error } = await supabase.from('profiles').select('id').eq('handle', clean).limit(1);
  if (error) throw error;
  return (data?.length ?? 0) === 0;
}

export interface OnboardingInput {
  name: string;
  handle: string | null; // null when "Skip for now"
  sex: 'male' | 'female';
  photoUri: string | null;
  /**
   * The TITLE half only — `Chapter I — ` is prepended here, never typed. Omitted or blank falls back to
   * the default, which is what "Skip" writes.
   */
  chapterTitle?: string | null;
  /**
   * Lbs or Kgs, as answered on the Account step.
   *
   * ⚠ THIS WAS ASKED AND THROWN AWAY. The step has always shown the choice under the hint *"Weights,
   * distance and pace across the app"*, and `complete_onboarding` never received it — so every athlete
   * who chose Kgs landed on the imperial default and had no reason to suspect the app had not heard
   * them. Reported as weights and distances in the wrong system by somebody certain they had set it.
   */
  units?: UnitSystem | null;

  // ── The three training answers (ONB-D8/D9/D11) ───────────────────────────────────────────────────
  /** Up to 3; `goals[0]` is the primary and is what derives Athlete Type. Empty = not answered. */
  goals?: readonly GoalId[] | null;
  /** `null` = not answered, and `profiles.experience` then stays null so Coach Holt asks. */
  experience?: Experience | null;
  /** The coarse buckets. Empty = not answered, and environment stays null. */
  equipment?: readonly EquipmentId[] | null;
  /** The gear grid, asked only for a home setup. `null` = never asked, `[]` = "I own nothing". */
  gear?: readonly string[] | null;
}

/**
 * The finish transaction. Avatar upload first (storage, not transactional — an orphan is harmless), then
 * the atomic `complete_onboarding` RPC: profile update + Chapter I insert + onboarded_at, all-or-nothing.
 *
 * ══ athlete_type AND environment ARE REAL ANSWERS NOW ══
 *
 * Both were hard-coded — `'Hybrid'` and `null` — because ONB-Amendment-002 deferred Goals and Equipment
 * to opt-in surfaces that were then built on AsyncStorage and never reached this row. Onboarding asks
 * again, so both are DERIVED from the athlete's own answers by the pure functions in `derive.ts`.
 *
 * ⚠ THE DERIVATIONS STILL FALL BACK, and the fallbacks are the old hard-coded values by design: an
 * athlete who somehow reaches the finish without answering gets `'Hybrid'` and `null` exactly as before,
 * so this is strictly additive to the account it creates. `athleteTypeForGoal(null)` already returns
 * `'Hybrid'`, which is why there is no ternary here.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const avatarUrl = input.photoUri ? await uploadAvatar(user.id, input.photoUri) : null;

  const goals = input.goals ?? [];
  const equipment = input.equipment ?? [];

  const { error } = await supabase.rpc('complete_onboarding', {
    p_name: input.name.trim(),
    p_first_name: firstNameOf(input.name),
    p_handle: input.handle,
    p_initials: initialsOf(input.name),
    p_sex: input.sex,
    p_avatar_url: avatarUrl,
    // ONB-D8: the PRIMARY goal derives it. `goals[0]` by the same rule `lib/home-intake.ts` stores.
    p_athlete_type: athleteTypeForGoal(goals[0] ?? null),
    // ONB-D11. Left null when nothing was chosen — `environmentForEquipment([])` would answer
    // 'bodyweight', which is a claim about the athlete rather than an absence of one.
    p_environment: equipment.length > 0 ? environmentForEquipment(equipment) : null,
    // The athlete's own words, prefixed here. `chapterNameFrom` falls back to the default on a blank,
    // so "Skip" and "never asked" produce the same row they always did.
    p_chapter_name: chapterNameFrom(input.chapterTitle ?? ''),
  });
  if (error) throw error;

  /*
   * EXPERIENCE AND THE OWNED-EQUIPMENT LIST, WRITTEN AFTER THE RPC AND FOR THE SAME REASON UNITS ARE.
   *
   * ⚠ NOT THROUGH `complete_onboarding`. Its signature is fixed in SQL and every client calls it;
   * widening it means a migration applied by hand, and until that migration ran the app would be sending
   * arguments the database does not have. `profiles.experience` (0169) and `profiles.home_gym_equipment`
   * (0021) are both plain columns under the same owner-scoped RLS, so this is one update to the right
   * place rather than a new one.
   *
   * ⚠ AND IT MUST NEVER FAIL ONBOARDING. The account, the handle and the first chapter are committed by
   * the call above; throwing here would strand somebody with a real account on a screen that says it did
   * not work. The cost of losing this write is precisely that Coach Holt asks two questions he could
   * have skipped — which is the behaviour every athlete has today, so the failure mode is the status quo
   * rather than a broken one.
   *
   * ⚠ FIELDS ARE OMITTED, NOT NULLED. Building the patch conditionally is what keeps "never asked"
   * distinguishable from "asked and empty": a `home_gym_equipment: null` sent for a full-gym athlete
   * would be correct, but the same null sent because the grid was skipped would erase a real answer on
   * any future re-run of this path.
   */
  const patch: { experience?: Experience; training_goals?: string[]; home_gym_equipment?: string[] } = {};
  if (input.experience) patch.experience = input.experience;
  // Ordered, and element 0 is the primary — the same rule 0169's column comment records.
  if (goals.length > 0) patch.training_goals = [...goals];
  const homeGym = equipment.length > 0 ? homeGymForEquipment(equipment, input.gear) : null;
  if (homeGym != null) patch.home_gym_equipment = homeGym;

  if (Object.keys(patch).length > 0) {
    try {
      const { error: patchError } = await supabase.from('profiles').update(patch).eq('id', user.id);
      // Reported, not thrown — see above. A silent catch here is how "the coach forgot what I told it"
      // becomes unexplainable.
      if (patchError) console.warn('[onboarding] training answers not saved:', patchError.message);
    } catch {
      // Network or client failure. Same reasoning: the athlete is onboarded.
    }
  }

  /*
   * THE UNITS ANSWER, PERSISTED AT LAST.
   *
   * ⚠ WRITTEN AFTER THE RPC RATHER THAN THROUGH IT, deliberately. `complete_onboarding`'s signature is
   * fixed in SQL and every client calls it; widening it means a migration applied by hand, and until
   * that migration ran the app would be sending an argument the database does not have. Units live in
   * `profiles.app_prefs` (0022) — the column the whole settings ecosystem already reads — so this is a
   * write to the right place rather than a new one.
   *
   * ⚠ AND IT MUST NEVER FAIL ONBOARDING. The account, the handle and the first chapter are already
   * committed by the line above; throwing here would strand somebody with a real account on a screen
   * that says it did not work. A dropped preference costs one tap in Settings, which is exactly what
   * the step's own hint promises.
   */
  if (input.units) {
    try {
      await saveAppPrefs({ ...APP_PREFS_DEFAULTS, units: input.units });
    } catch {
      // ignore — the athlete is onboarded; the default stands and Settings can change it.
    }
  }
}
