/**
 * Which weekly reviews this device has finished with — the pure half.
 *
 * ══ WHY THIS EXISTS AT ALL ══
 *
 * The card used to be dismissed into a `useState` on Home, which meant "not now" lasted exactly as long as
 * the Home screen stayed mounted: a browser refresh on the web preview or a cold start on the phone put it
 * straight back. Worse, *reading* the review dismissed nothing — the athlete opened it, came back, and the
 * card was still sitting there asking to be opened.
 *
 * ⚠ IT IS RETIRED PER WEEK, NOT PER FEATURE. The stored value is a `week_start`, so retiring this week's
 * card says nothing about next week's — the review still arrives every Monday. A dismissal that quietly
 * became an opt-out would be the app deciding something the athlete did not, which is the rule
 * `WeeklyReviewCard` has carried since it shipped and the one thing this change must not break.
 *
 * ══ DEVICE-LOCAL, LIKE `podium-seen` ══
 *
 * "Have I read it" is a fact about this screen on this device, not a fact about the week. The row in
 * `athlete_weekly_reviews` is the snapshot and stays untouched; `/weekly-review/[week]` still opens it
 * forever. Nothing here writes to Supabase, and `first-run.ts` clears it on account switch so a second
 * athlete on the same phone is not told they have already read a week they have never seen.
 */

/**
 * How many retired weeks are kept.
 *
 * Only the week that just closed is ever offered, so one entry would do almost always. The slack is for the
 * one case where it would not: `ensure_weekly_review()` buckets by `date_trunc('week', now() at time zone
 * tz)`, so an athlete who flies west across the Monday boundary can be handed a week they already retired.
 * Eight is enough to absorb that and still bounded.
 */
export const RETIRED_WEEKS_KEPT = 8;

/**
 * ⚠ A VALUE THIS CANNOT READ MEANS "NOTHING RETIRED", NEVER "EVERYTHING RETIRED".
 *
 * This is the safe failure and it is the opposite of the one in `reviewWindowOpen`. There, an absent
 * timestamp reads as OPEN so an unapplied migration cannot vanish everyone's review; here, unreadable
 * storage shows the card again. Both err toward the athlete seeing their week — a review shown twice is a
 * mild annoyance, a review silently swallowed is the feature not existing.
 */
export function parseRetiredWeeks(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}

/** Retire a week (idempotent), keeping the most recent {@link RETIRED_WEEKS_KEPT}. */
export function withRetiredWeek(weeks: string[], weekStart: string): string[] {
  if (!weekStart) return weeks;
  /* Move-to-end rather than skip-if-present: re-retiring a week must not let it age out of the cap ahead of
     older entries that have not been touched since. */
  return [...weeks.filter((w) => w !== weekStart), weekStart].slice(-RETIRED_WEEKS_KEPT);
}

/**
 * Is this week's card done with?
 *
 * A null week is NOT retired — there is no card to hide, and answering `true` would make the absence of a
 * review look like a dismissal to any caller that latched on it.
 */
export function isWeekRetired(weeks: string[], weekStart: string | null | undefined): boolean {
  return !!weekStart && weeks.includes(weekStart);
}
