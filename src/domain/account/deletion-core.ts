/**
 * Account deletion — the timing rules, pure, so `node --test` can hold them.
 *
 * PO decision (2026-08-06): deletion is a **30-day recovery window**, not an immediate erasure.
 * `Account-Auth-Architecture.md` Open Question 1 deliberately left this unresolved and defined only the
 * shape of the contract; this is Branch B.
 *
 * What that means concretely, and why each part is here rather than inferred at a call site:
 *
 *  - Requesting deletion sets ONE timestamp. It does not remove anything. Erasure is a later, separate
 *    act, which is what makes the window recoverable at all.
 *  - The athlete is signed out immediately regardless of branch — that half of the contract is not
 *    conditional, so no rule here governs it.
 *  - Signing back in DURING the window restores the account. That is a cancellation, not a re-signup:
 *    the record was never touched.
 *  - The account is treated as absent by every social surface for the whole window. Someone who has left
 *    should not appear in a friend search on day 12 — from the outside, "pending deletion" and "gone"
 *    must be indistinguishable, or the window leaks the fact that they nearly left.
 *
 * The failure mode this file exists to prevent is an off-by-one at the boundary in the destructive
 * direction: purging on day 29 destroys a record the athlete was still entitled to get back.
 */

/** Days an athlete has to change their mind. Referenced by the privacy policy — keep them in step. */
export const DELETION_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A profile as far as deletion is concerned. `null` means no deletion has been requested. */
export interface DeletionState {
  deletionRequestedAt: string | null;
}

const parse = (iso: string | null | undefined): number | null => {
  if (typeof iso !== 'string' || !iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

/** Is this account inside its recovery window — signed out, hidden, but still restorable? */
export function isPendingDeletion(state: DeletionState | null | undefined, now: Date | number = Date.now()): boolean {
  const at = parse(state?.deletionRequestedAt);
  if (at === null) return false;
  return nowMs(now) < at + DELETION_WINDOW_DAYS * DAY_MS;
}

/**
 * Is this account past its window and due for permanent erasure?
 *
 * Deliberately NOT the negation of `isPendingDeletion` — an account that never requested deletion is
 * neither pending nor due, and conflating the two would purge every active athlete.
 */
export function isDuePurge(state: DeletionState | null | undefined, now: Date | number = Date.now()): boolean {
  const at = parse(state?.deletionRequestedAt);
  if (at === null) return false;
  return nowMs(now) >= at + DELETION_WINDOW_DAYS * DAY_MS;
}

/** The instant erasure becomes permitted. */
export function purgeDueAt(requestedAtIso: string): Date | null {
  const at = parse(requestedAtIso);
  return at === null ? null : new Date(at + DELETION_WINDOW_DAYS * DAY_MS);
}

/**
 * Whole days left, for the copy on the restore screen.
 *
 * Rounded UP, on purpose: with 12 hours to go the honest thing to tell someone is "1 day left", not "0".
 * Never negative — a past-due account has no days, it has a purge.
 */
export function daysRemaining(state: DeletionState | null | undefined, now: Date | number = Date.now()): number {
  const at = parse(state?.deletionRequestedAt);
  if (at === null) return 0;
  const remaining = at + DELETION_WINDOW_DAYS * DAY_MS - nowMs(now);
  return remaining <= 0 ? 0 : Math.ceil(remaining / DAY_MS);
}

/** May signing in restore this account? True for the whole window, false once it is due. */
export function canRestore(state: DeletionState | null | undefined, now: Date | number = Date.now()): boolean {
  return isPendingDeletion(state, now);
}

/**
 * Should other athletes be able to see this account at all?
 *
 * One place, so search, feeds, squads and friend lists cannot each answer it differently — the way a
 * pending-deletion account leaks is by one surface forgetting to ask.
 */
export function isVisibleToOthers(state: DeletionState | null | undefined, now: Date | number = Date.now()): boolean {
  return !isPendingDeletion(state, now) && !isDuePurge(state, now);
}

function nowMs(now: Date | number): number {
  return typeof now === 'number' ? now : now.getTime();
}
