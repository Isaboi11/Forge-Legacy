/**
 * THE DEVICE WAS WIPED — a one-line broadcast, and the reason it is its own module.
 *
 * ══ THE BUG THIS EXISTS TO CLOSE ══
 *
 * `resetFirstRunFlags()` empties the previous athlete's AsyncStorage on a handover. That is only half of
 * a handover: a React provider that read those keys ON MOUNT is still holding the old answers, and
 * nothing tells it they are stale.
 *
 * `TourProvider` compensated by working the handover out for itself, comparing the live user id against
 * an in-memory ref of the last REAL one:
 *
 *     if (userId && lastRealId.current && lastRealId.current !== userId) { …reset… }
 *
 * which is the identical shape of bug `device-handover.ts` was written to close in `AuthProvider`, left
 * behind one file away. The provider mounts ABOVE the navigator, so on a device sitting at the sign-in
 * screen it baselines with `userId = null` — and `lastRealId.current && …` then short-circuits on the
 * one transition that matters, somebody signing UP. Storage said pending, memory said completed, memory
 * won, and a brand-new athlete was never shown the four-tab map.
 *
 * ⚠ A RE-READ ON ID CHANGE DOES NOT FIX IT, and that is the whole argument for a signal. The wipe is
 * async and races the provider's read; React runs child effects before parent ones, so the provider
 * tends to read FIRST and win with the previous athlete's values. Emitting AFTER the clears have
 * resolved removes the race instead of betting on the order.
 *
 * ══ WHY IT IS HERE AND NOT IN `lib/first-run.ts` ══
 *
 * It has NO imports, so it is testable under `node --test` with no mocks and no React — and a consumer
 * that only needs to hear the signal no longer drags AsyncStorage, supabase and the autosave module into
 * its graph to get it. `first-run.ts` is reached during auth init, upstream of the router, and its own
 * header is a list of what must not be pulled in there; this keeps that list from growing.
 */

type ResetListener = () => void;

const listeners = new Set<ResetListener>();

/**
 * Subscribe. Returns its own unsubscribe, shaped for an effect cleanup.
 *
 * Registering the same function twice is idempotent (it is a Set), which matters under StrictMode's
 * double-invoked effects: two subscribes and one unsubscribe must not leave a live listener behind.
 */
export function onFirstRunReset(fn: ResetListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Announce that the device has been wiped. Call it AFTER the clears have resolved, never before — a
 * listener's job is to overwrite state it read from those keys, and a half-wiped device would invite it
 * to re-cache the very values being removed.
 *
 * ⚠ ONE LISTENER MUST NOT BE ABLE TO SILENCE THE OTHERS. This runs inside auth init: an unguarded throw
 * would abort the loop, so a single bad subscriber would leave every later one holding the previous
 * athlete's state — the exact leak this signal exists to stop, reintroduced by an unrelated bug
 * somewhere else. A thrower loses only its own reset.
 *
 * Iterated over a COPY, because a listener is allowed to unsubscribe itself while being notified.
 */
export function emitFirstRunReset(): void {
  for (const fn of [...listeners]) {
    try {
      fn();
    } catch {
      // Deliberately swallowed — see above.
    }
  }
}

/** Test seam only: forget every subscriber, so one case cannot leak into the next. */
export function __resetListenersForTest(): void {
  listeners.clear();
}
