import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * WHERE A CARDIO BOUT'S CLOCK LIVES, and — the point of this file — WHEN IT DIES.
 *
 * ══ THE DEFECT THIS EXISTS TO CLOSE ══
 *
 * Reported: *"the indoor ride is just one continuous ride even when you end the workout, it just picks
 * up on the next."* It did, and it was two mistakes compounding.
 *
 *  1. THE KEY WAS THE BLOCK'S POSITION AND NOTHING ELSE — `forge_cardio_timer_v1:2`. Position is not an
 *     identity. Tuesday's ride and Thursday's ride are both the third exercise, so they were the same
 *     stored clock, and Thursday inherited Tuesday's.
 *
 *  2. NOTHING EVER DELETED IT. `timer.reset()` runs on the card's own Save, so a bout logged the
 *     intended way cleaned up after itself. Every other ending did not: Finish after a reload, Discard,
 *     "End workout" from the resume prompt, a force-quit, a save held for the offline queue. The row
 *     stayed on disk with `startedAt` set to an epoch from days ago — and `useWallClockTimer` measures
 *     `now − startedAt` deliberately, so it does not *resume* stale state, it keeps COUNTING it. Open
 *     the next ride and the clock is already at 41 hours.
 *
 * The outdoor run never showed this because it is not this mechanism at all: GPS runs through
 * `useRunTracker`'s phase machine, which holds nothing on disk. An indoor RUN had the same bug as the
 * ride; nobody had trained one.
 *
 * ⚠ THE SWEEP IS DELIBERATELY BLIND TO WHICH SESSION IT IS CLEARING. `clearSession` is called at the
 * moment "there is no workout in progress" becomes true, and at that moment no cardio clock on this
 * device can belong to anything. Matching keys against the ending session's scope would leave the rows
 * from every session that ended some other way — which is the bug, kept.
 */

/** Owned here so the card that writes these keys and the sweep that removes them cannot drift apart. */
export const CARDIO_TIMER_PREFIX = 'forge_cardio_timer_v1:';

/**
 * The storage key for one cardio block's clock.
 *
 * Scoped by the session's `startedAt`, which is the only thing on `ActiveSession` that is unique per
 * session and stable across a resume — the two properties the key needs and the block index has
 * neither of. A resumed session rebuilds the same key and its clock comes back; a NEW session cannot
 * build an old one's key, whatever happened to the old one's rows.
 *
 * ⚠ Reduced to digits, not passed through whole. An ISO timestamp carries `:` and `.`, which read as
 * structure to anyone later tempted to split this key apart. There is nothing to parse here.
 */
export function cardioTimerKey(sessionStartedAt: string, index: number): string {
  const scope = String(sessionStartedAt ?? '').replace(/[^0-9]/g, '') || 'unscoped';
  return `${CARDIO_TIMER_PREFIX}${scope}:${index}`;
}

/**
 * Which of the device's storage keys are cardio clocks — pure, so the sweep can be proved without a
 * store. Legacy position-only keys (`…v1:2`) match the same prefix and are collected by the same pass,
 * so the rows already stranded on athletes' phones go with the first workout they end after this ships.
 */
export function staleCardioTimerKeys(allKeys: readonly string[]): string[] {
  return allKeys.filter((k) => typeof k === 'string' && k.startsWith(CARDIO_TIMER_PREFIX));
}

/** Best-effort: a clock that outlives its workout is a wrong number, but it is not worth an error. */
export async function clearCardioTimers(): Promise<void> {
  try {
    const stale = staleCardioTimerKeys(await AsyncStorage.getAllKeys());
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {
    /* best-effort */
  }
}
