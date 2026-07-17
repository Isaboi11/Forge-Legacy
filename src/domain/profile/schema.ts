/**
 * UserProfile — the canonical "self" athlete identity for Forge Legacy.
 *
 * Phase 0 of the design handoff (see the Home Workout Artwork Resolver spec):
 * the resolver reads `user.sex` to choose the artwork variant, and the handoff
 * calls out a model-level bug to fix — a missing sex must NOT default to `male`.
 * This model makes the correct default explicit: an unset selection is
 * `'unspecified'`, which the resolver maps to the neutral variant (never guessed
 * from name, photo, behaviour, or body data). See FORGE_DELTAS.md §7 and the
 * resolver spec §03 (Sex Variant).
 *
 * This is the first real user model in the app — screens currently hard-code
 * identity (e.g. Home's AppBar `Avatar name="Ada Ridge"`). Phase 2 migrates
 * those to read from here.
 */

/**
 * Saved sex selection — the ONLY input to sex-variant artwork resolution.
 * `'unspecified'` is the explicit, correct default for a user who has not chosen;
 * it is never silently coerced to `'male'` or `'female'`.
 */
export type Sex = 'male' | 'female' | 'unspecified';

export const SEXES: readonly Sex[] = ['male', 'female', 'unspecified'];

export interface UserProfile {
  /** Full display name, e.g. "Ada Ridge". */
  name: string;
  /** First name, for greetings/possessives. */
  firstName: string;
  /** Handle without the leading "@", e.g. "ada.forged". */
  handle: string;
  /** Avatar fallback initials, e.g. "AR". */
  initials: string;
  /** Public URL of the avatar image in the `avatars` storage bucket; null → render initials. */
  avatarUrl?: string | null;
  /** Saved sex selection; drives artwork variant. Defaults to `'unspecified'`. */
  sex: Sex;
  /** When the first-time journey completed; null → the boot router sends the athlete to onboarding. */
  onboardedAt?: string | null;
}
