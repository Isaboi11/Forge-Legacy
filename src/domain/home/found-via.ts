/**
 * "How did you find Forge Legacy?" — the one-tap Home card (PO 2026-11-17, migration 0273).
 *
 * Asked ONCE, on Home, the first time it is owed — not in onboarding, where it would be one more step
 * between a new athlete and their first workout. One tap or Skip; Skip is saved too ('skipped'), so the
 * card never comes back either way.
 *
 * ⚠ THE KEYS ARE THE DATABASE'S. `athlete_found_via_source_check` and `set_found_via` in 0273 accept
 * exactly these plus 'skipped'; `__tests__/found-via.test.mjs` reads the migration and fails if the two
 * lists drift. A key added here alone would be refused by the server and the tap would do nothing.
 */

export type FoundViaSource = 'instagram' | 'tiktok' | 'friend' | 'app_store' | 'web' | 'other';
export type FoundViaAnswer = FoundViaSource | 'skipped';

export interface FoundViaOption {
  source: FoundViaSource;
  label: string;
}

/** In the order they are drawn — two columns, three rows. "Other" last. */
export const FOUND_VIA_OPTIONS: readonly FoundViaOption[] = [
  { source: 'instagram', label: 'Instagram' },
  { source: 'tiktok', label: 'TikTok' },
  { source: 'friend', label: 'A friend' },
  { source: 'app_store', label: 'App Store search' },
  { source: 'web', label: 'Google or the web' },
  { source: 'other', label: 'Other' },
];

export const FOUND_VIA_COPY = {
  eyebrow: 'One quick question',
  title: 'How did you find Forge Legacy?',
  body: 'One tap. It shows us where to find more people like you.',
  skip: 'Skip',
  thanksTitle: 'Thanks, that helps.',
  thanksBody: (label: string) => `${label} · you won’t see this again.`,
} as const;

/** The card's three moments. `gone` is also where an athlete who was never asked sits. */
export type FoundViaPhase = 'ask' | 'thanks' | 'gone';

export function labelFor(source: FoundViaSource): string {
  return FOUND_VIA_OPTIONS.find((o) => o.source === source)?.label ?? 'Other';
}
