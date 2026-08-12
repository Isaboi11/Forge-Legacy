import { supabase } from '@/lib/supabase';
import { saveAppPrefs } from '@/data/settings-live';
import { APP_PREFS_DEFAULTS } from '@/domain/settings/preferences';
import type { UnitSystem } from '@/domain/settings/units';
import { uploadAvatar } from '@/lib/avatar';
import { chapterNameFrom, DEFAULT_CHAPTER_I_TITLE } from '@/domain/legacy/chapter-name';
import { firstNameOf, initialsOf } from './derive';

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
}

/**
 * The finish transaction. Avatar upload first (storage, not transactional — an orphan is harmless), then
 * the atomic `complete_onboarding` RPC: profile update + Chapter I insert + onboarded_at, all-or-nothing.
 * athlete_type and environment are BOTH deferred (ONB-Amendment-002): type isn't asked, so it defaults to
 * 'Hybrid' (the locked catch-all); environment is unknown until a program-recommendation flow captures
 * equipment. Both are contextual/opt-in surfaces later, never a wall before the app.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const avatarUrl = input.photoUri ? await uploadAvatar(user.id, input.photoUri) : null;

  const { error } = await supabase.rpc('complete_onboarding', {
    p_name: input.name.trim(),
    p_first_name: firstNameOf(input.name),
    p_handle: input.handle,
    p_initials: initialsOf(input.name),
    p_sex: input.sex,
    p_avatar_url: avatarUrl,
    p_athlete_type: 'Hybrid', // default — athlete type isn't asked in onboarding (ONB-Amendment-002)
    p_environment: null, // unknown until a program-recommendation flow captures equipment (ONB-A2-D3)
    // The athlete's own words, prefixed here. `chapterNameFrom` falls back to the default on a blank,
    // so "Skip" and "never asked" produce the same row they always did.
    p_chapter_name: chapterNameFrom(input.chapterTitle ?? ''),
  });
  if (error) throw error;

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
