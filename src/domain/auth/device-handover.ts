/**
 * IS THIS A DIFFERENT PERSON THAN THE ONE THIS DEVICE LAST BELONGED TO?
 *
 * ══ THE BUG THIS EXISTS TO CLOSE ══
 *
 * `resetFirstRunFlags()` wipes a dozen device-local facts when the account changes — the tour, the
 * draft, the pending invite, the coach's memory of your training level. It was triggered off an
 * IN-MEMORY ref of the previously-seen user id, guarded by `prevUserId.current !== undefined` so that an
 * ordinary boot restoring your own session did not wipe your own flags.
 *
 * That guard is necessary and it has a hole the width of a page reload. The ref starts `undefined` on
 * every mount, so **the first auth event a mount observes can never trigger a reset** — and signing up is
 * very often exactly that event:
 *
 *     sign out  →  page reloads  →  fresh mount, ref = undefined
 *                                →  sign up as somebody new
 *                                →  FIRST event on this mount, so the guard skips the reset
 *                                →  the new athlete inherits the previous one's device state
 *
 * Reported as *"it never asked me what level I am"* on a brand-new account, which is precisely what it
 * would do: the questionnaire skips a question it believes it already has the answer to, and it believed
 * the last person's answer.
 *
 * ══ SO THE ANSWER IS PERSISTED, NOT REMEMBERED ══
 *
 * A ref cannot outlive a mount, and the fact being asked about — *whose device is this* — outlives many.
 * Storing the last athlete id makes the question answerable at any point in a session rather than only
 * in the middle of one.
 *
 * Pure and node-testable: no storage, no React. The caller supplies what was stored.
 */

/**
 * Whether the device should be wiped of the previous athlete's state.
 *
 * ⚠ THE `null` STORED CASE IS A DELIBERATE NO, AND IT IS NOT THE SAME AS A MISMATCH.
 *
 * `null` means this device has never recorded an athlete — a fresh install, or the first launch after
 * this rule shipped. Every existing athlete on the app today is in exactly that position, and treating
 * it as a handover would wipe the flags of every one of them on their next launch, for nothing. There is
 * also nothing to protect: state belonging to nobody cannot leak to somebody.
 *
 * Signing OUT is likewise not a handover. It ends a session; it does not hand the phone over, and the
 * athlete signing back in a minute later is the same person who left. The wipe belongs at the moment a
 * DIFFERENT id appears — which is the moment their state would otherwise be inherited.
 */
export function isDeviceHandover(storedAthleteId: string | null | undefined, nextAthleteId: string | null): boolean {
  if (!storedAthleteId) return false; // never recorded — nothing of anyone else's is here
  if (!nextAthleteId) return false; // signing out is not handing the device to somebody
  return storedAthleteId !== nextAthleteId;
}

/**
 * Whether the stored owner should be updated to this id.
 *
 * Only ever records a REAL athlete. Writing `null` on sign-out would erase the very fact the check above
 * depends on, and the next person to sign in would look like a first install.
 */
export function shouldRecordAthlete(storedAthleteId: string | null | undefined, nextAthleteId: string | null): boolean {
  return !!nextAthleteId && storedAthleteId !== nextAthleteId;
}
