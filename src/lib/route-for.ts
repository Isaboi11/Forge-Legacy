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
 *
 * ⚠ PASSWORD RECOVERY OUTRANKS HAVING A SESSION, AND WITHOUT THAT THE RESET LINK GOES NOWHERE USEFUL.
 *
 * Opening the emailed link signs the athlete IN — Supabase mints a real recovery session and fires
 * `PASSWORD_RECOVERY`. Every rule below would then read "session, onboarded" and drop them on Home,
 * which is the one place they cannot do the thing they came to do. They arrived unable to sign in and
 * would leave still unable to, having been shown the app once in between.
 *
 * So recovery is checked first: the auth route stays up, holding the set-a-new-password step, and the
 * app is reached the normal way once the password is actually changed.
 */
export type BootRoute = 'splash' | 'auth' | 'onboarding' | 'app';

export function routeFor(state: {
  authLoading: boolean;
  hasSession: boolean;
  profileLoading: boolean;
  onboardedAt: string | null | undefined;
  /** Arrived from a password-reset link and has not yet set a new password. */
  recovering?: boolean;
}): BootRoute {
  if (state.authLoading) return 'splash';
  // Before the session test, deliberately — recovery is a state you reach BY being signed in.
  if (state.recovering) return 'auth';
  if (!state.hasSession) return 'auth';
  if (state.profileLoading) return 'splash'; // signed in, but onboarded status not yet known
  return state.onboardedAt ? 'app' : 'onboarding';
}
