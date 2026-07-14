/**
 * ⚠️ TEMPORARY placeholder identity — NOT authoritative content. Replaced by the
 * real account/auth layer when it lands; do not treat "Ada Ridge" as real data.
 *
 * Canonical self = Ada Ridge (@ada.forged), matching the design handoff's
 * `forge-user.js`. `sex` is seeded `'unspecified'` on purpose: it exercises the
 * resolver's neutral path by default and demonstrates the fixed default (never
 * `'male'`). A real user sets their sex during onboarding/settings later.
 */

import type { UserProfile } from './schema';

const SELF_PROFILE: UserProfile = {
  name: 'Ada Ridge',
  firstName: 'Ada',
  handle: 'ada.forged',
  initials: 'AR',
  sex: 'unspecified',
};

/** The logged-in athlete. Single read point for every screen that renders SELF. */
export function getSelfProfile(): UserProfile {
  return SELF_PROFILE;
}
