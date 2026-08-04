/**
 * How a finished program is DESCRIBED — the dates and the span, shared by the M-4 ceremony and W-3's
 * sealed record.
 *
 * One module because M-4 §3 requires it: the ceremony's context rows "source from the same data as the
 * W-3 Graduated state for consistency between the ceremony and the permanent record". Two formatters
 * would eventually disagree, and the failure is that the modal congratulating you on eight weeks sits in
 * front of a record that says two months.
 *
 * Pure and node-testable: no React, no RN, no `@` imports, no `Intl`. A hand-rolled month list rather
 * than `toLocaleDateString` so a test can assert the exact string and it cannot move with a locale or a
 * platform — the same reason `workout-complete-live.ts` carries its own.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const DAY_MS = 86_400_000;

/** Parse an ISO date/timestamp to epoch ms, or null if it is missing or not a date. */
function at(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * `"2026-01-06T…"` → `"January 6, 2026"` (W-3 §7, M-4 §4). Null in, null out — a row whose date is
 * missing is omitted by the caller rather than rendered as a guess.
 */
export function fmtLongDate(iso: string | null | undefined): string | null {
  const t = at(iso);
  if (t == null) return null;
  const d = new Date(t);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * How long the program took, in the unit that reads honestly at that length.
 *
 * ══ THE THRESHOLDS ARE INFERRED, NOT SPECIFIED ══
 *
 * M-4 §4 says only "N weeks or N months"; §8.10 forces a degenerate same-day program to read "1 day".
 * 7 and 60 are this file's judgement — under a week, days are the only honest unit; past two months,
 * "9 weeks" is a number nobody holds in their head. Flagged for sign-off rather than presented as spec.
 *
 * Rounds rather than floors, so 13 days is "2 weeks" and not "1 week" — a program finished on day 13
 * did not take one week.
 */
export function spanLabel(startISO: string | null | undefined, endISO: string | null | undefined): string | null {
  const a = at(startISO);
  const b = at(endISO);
  if (a == null || b == null) return null;

  const days = Math.max(0, Math.round((b - a) / DAY_MS));
  // Zero elapsed days is still a day of training, not "0 days" (M-4 §8.10).
  if (days < 7) return `${Math.max(1, days)} day${Math.max(1, days) === 1 ? '' : 's'}`;
  if (days < 60) {
    const weeks = Math.max(1, Math.round(days / 7));
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  const months = Math.max(1, Math.round(days / 30.4375));
  return `${months} month${months === 1 ? '' : 's'}`;
}

/** `24` → `"24 workouts completed"` — W-3 §7's second line and M-4's third row share the phrasing. */
export function workoutsLabel(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n < 0) return null;
  return `${n} workout${n === 1 ? '' : 's'} completed`;
}
