/**
 * The boot router (Gate A) — a pure function so the session × onboarded routing is deterministic and
 * unit-tested, not tangled in the navigator. Given auth + profile state, it decides which of the four
 * top-level destinations the app shows. `onboardedAt` is `profiles.onboarded_at` (null until the
 * first-time journey completes).
 *
 *   no session                → 'auth'        (Welcome / sign-in — Gate B builds the screens)
 *   session, not onboarded     → 'onboarding'  (the first-time journey — Gate B)
 *   session, onboarded         → 'app'         (the tabs)
 *   still resolving either read → 'splash'      (hold, don't flash a wrong destination)
 */
export type BootRoute = 'splash' | 'auth' | 'onboarding' | 'app';

export function routeFor(state: {
  authLoading: boolean;
  hasSession: boolean;
  profileLoading: boolean;
  onboardedAt: string | null | undefined;
}): BootRoute {
  if (state.authLoading) return 'splash';
  if (!state.hasSession) return 'auth';
  if (state.profileLoading) return 'splash'; // signed in, but onboarded status not yet known
  return state.onboardedAt ? 'app' : 'onboarding';
}
