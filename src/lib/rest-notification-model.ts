/**
 * The "rest complete" notification — the pure half.
 *
 * ══ WHY A NOTIFICATION AT ALL ══
 *
 * PO, 2026-09-30: *"the timer sound isn't working when my phone is off or if I'm on a different app."*
 *
 * The ding in `lib/ding` is played by a `setInterval` inside the app. iOS suspends the app seconds after
 * it leaves the screen, the interval stops, and nothing is left running to ask for a sound. So when a
 * rest starts, the same deadline is ALSO handed to iOS as a scheduled local notification with a sound —
 * the OS rings it on time whether the app is frozen or closed. It is how every lifting app does this.
 *
 * Split from `rest-notification.ts` for the reason `rest-timer-pref-model.ts` is split from its twin:
 * that file imports `expo-notifications`, a native module `node --test` cannot load, and the two rules
 * below are exactly the ones a regex over source text could not tell right from inverted.
 */

/** Tags the notification's `data`, so the foreground handler and the tap handler can recognise it. */
export const REST_DONE_KIND = 'rest_done';

/**
 * ONE FIXED IDENTIFIER. There is only ever one rest running, so scheduling under the same id replaces
 * the last one and cancelling needs no stored handle — nothing to lose across a crash or a reload.
 */
export const REST_DONE_ID = 'forge-rest-done';

export function isRestDone(data: unknown): boolean {
  return !!data && typeof data === 'object' && (data as Record<string, unknown>).kind === REST_DONE_KIND;
}

/**
 * Seconds from `now` until the rest ends, or null when it is already over (or about to be).
 *
 * ⚠ NULL, NOT ZERO. iOS rejects a time-interval trigger that is not strictly positive, and a rest with
 * under a second left is one the in-app ding is about to finish anyway.
 */
export function restDoneDelaySec(endsAt: number, now: number): number | null {
  const sec = Math.ceil((endsAt - now) / 1000);
  return sec >= 1 ? sec : null;
}

/** The interval ticks every 500ms, so on-screen expiry is never this late. Later than this = we were frozen. */
export const LATE_MS = 2000;

/**
 * Whether the in-app ding should play when the countdown is seen to have expired.
 *
 * ⚠ NOT TWICE. Coming back to the app after the rest ended unfreezes the interval, which notices the
 * deadline has passed and would ding — minutes late, for a rest the notification already rang. If the
 * notification was NOT scheduled (notifications off for the app), the late ding is the only sound the
 * athlete gets, so it stays.
 */
export function dingOnExpiry(lateMs: number, notified: boolean): boolean {
  return !(notified && lateMs > LATE_MS);
}
