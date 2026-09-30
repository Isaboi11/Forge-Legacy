/**
 * The rules of the sign-in route, pure so they can be tested without a screen (QA 09-26: auth-03,
 * auth-04, auth-05, auth-13).
 *
 * ⚠ THE BUTTON WAS THE ONLY GUARD. Continue / Email Me a Link sat disabled until the form was valid, but
 *   pressing Enter in a field called the same submit function directly — so a 6-character password
 *   reached Supabase (which accepted it, below our 8-character rule) and "bad" as an email address got a
 *   cheerful "On its way". `canSubmitAuth` is now asked by the button AND by Enter.
 */

export type AuthStep = 'welcome' | 'create' | 'signin' | 'forgot' | 'sent' | 'reset';

export const PASSWORD_MIN = 8;

export const emailValid = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/**
 * The step named in the URL (`/sign-in?step=signin`), so browser Back and a refresh keep the athlete
 * where they were. `reset` is never read from a URL — it is reached only by a live recovery session, and
 * a typed `?step=reset` without one would show a set-password form that cannot save.
 */
export function parseAuthStep(raw: unknown): AuthStep {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === 'create' || v === 'signin' || v === 'forgot' || v === 'sent' ? v : 'welcome';
}

/** Whether this step may be submitted with these fields. Asked by the button and by Enter alike. */
export function canSubmitAuth(step: AuthStep, email: string, password: string): boolean {
  switch (step) {
    case 'create':
      return emailValid(email) && password.length >= PASSWORD_MIN;
    case 'reset':
      return password.length >= PASSWORD_MIN;
    case 'forgot':
      return emailValid(email);
    case 'signin':
      // Sign-in does NOT enforce the 8-character rule: an account made before the rule existed must
      // still be able to get in. It only needs something in both fields.
      return email.trim().length > 0 && password.length > 0;
    default:
      return false;
  }
}

/** What to tell somebody who pressed Sign In with a field empty — instead of Supabase's "missing email or phone". */
export function signInBlocker(email: string, password: string): string | null {
  if (!email.trim() && !password) return 'Enter your email and password.';
  if (!email.trim()) return 'Enter your email address.';
  if (!password) return 'Enter your password.';
  return null;
}

/**
 * Supabase's auth errors, in the athlete's words.
 *
 * The raw strings ("Invalid login credentials", "missing email or phone") are written for developers.
 * Anything not recognised falls back to a sentence that is still true — never the raw text, which can
 * be an HTTP status or a stack-shaped message.
 */
export function friendlyAuthError(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return 'That email and password don’t match. Check both, or reset your password.';
  if (m.includes('missing email') || m.includes('missing phone')) return 'Enter your email and password.';
  if (m.includes('email not confirmed')) return 'Confirm your email first — the link is in your inbox.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists'))
    return 'There’s already an account with that email. Sign in instead.';
  if (m.includes('password should be at least') || m.includes('weak password') || m.includes('password is too weak'))
    return `Passwords are at least ${PASSWORD_MIN} characters.`;
  if (m.includes('should be different from the old password')) return 'Choose a password you haven’t used here before.';
  if (m.includes('invalid format') || m.includes('unable to validate email')) return 'That email address doesn’t look right.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('for security purposes'))
    return 'Too many tries in a short time. Wait a minute, then try again.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('fetch failed'))
    return 'Couldn’t reach Forge Legacy. Check your connection and try again.';
  if (m.includes('session missing') || m.includes('expired')) return 'That link has expired. Ask for a new one from Sign In.';
  return 'Something went wrong. Try again in a moment.';
}
