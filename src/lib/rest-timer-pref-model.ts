/**
 * The rest-timer preference — the pure half.
 *
 * ══ THREE MODES, NOT A SWITCH ══
 *
 * PO: *"can we make an option for manual start for the timer on active workouts."*
 *
 * `off` shows no timer. `auto` starts the countdown the instant a set is logged — the behaviour that
 * shipped. `manual` keeps the timer, its duration and its controls, and simply waits to be told to
 * start: the athlete taps ▶ on the chip when they actually stop moving, which is the point. An
 * auto-started clock is wrong for anyone who racks the bar and then strips plates, talks to someone, or
 * walks to a fountain — it has already spent thirty seconds of a ninety-second rest on housekeeping.
 *
 * Defaults to `off`: a fresh athlete starts with no rest timer, and only once they turn it on does the
 * choice persist for later workouts.
 *
 * ══ ⚠ WHY THIS IS SPLIT OUT OF `rest-timer-pref.ts` ══
 *
 * The migration in `resolveRestMode` is the most dangerous line in the feature and was the only one
 * nothing could reach. `rest-timer-pref.ts` imports AsyncStorage — a native module `node --test` cannot
 * load — so a test sitting beside it could only have read the source as TEXT, and a regex cannot tell a
 * correct condition from an inverted one. Getting it backwards silently switches every athlete who ever
 * enabled the rest timer back to OFF, which is a preference erased by the feature meant to extend it.
 *
 * Same split, for the same reason, as `weekly-review-seen-model.ts`.
 */

export type RestMode = 'off' | 'auto' | 'manual';

export const REST_MODES: readonly RestMode[] = ['off', 'auto', 'manual'];

/** Off → Auto → Manual → Off. What the chip's toggle steps through. */
export function nextRestMode(m: RestMode): RestMode {
  return m === 'off' ? 'auto' : m === 'auto' ? 'manual' : 'off';
}

export const REST_MODE_KEY = 'forge_rest_timer_mode_v1';

/**
 * ⚠ THE BOOLEAN THIS REPLACED, STILL READ — and deleting the read is the mistake to avoid.
 *
 * Every athlete who has ever turned the rest timer on has `'1'` under the old key and nothing under the
 * new one. Reading only the new key would silently switch all of them back to OFF on the update that
 * shipped the third mode. The old value maps to `auto`, which is exactly the behaviour they had.
 */
export const REST_MODE_LEGACY_KEY = 'forge_rest_timer_on_v1';

export const isRestMode = (v: string | null): v is RestMode =>
  v === 'off' || v === 'auto' || v === 'manual';

/**
 * What mode this device is in, given whatever sits under each key.
 *
 * ⚠ THE NEW KEY WINS WHENEVER IT IS READABLE, including when it says `off` — an athlete who has chosen
 * off on this build must not be pulled back to `auto` by the stale `'1'` that `setRestMode` keeps
 * writing for roll-back safety. Only an ABSENT or UNREADABLE new key defers to the legacy flag.
 */
export function resolveRestMode(stored: string | null, legacy: string | null): RestMode {
  if (isRestMode(stored)) return stored;
  return legacy === '1' ? 'auto' : 'off';
}

/**
 * What to mirror into the legacy key, so a build rolled BACK to the two-state version does not lose the
 * athlete's choice either — an OTA can go backwards, and `manual` is much closer to on than to off.
 */
export function legacyFlagFor(m: RestMode): '0' | '1' {
  return m === 'off' ? '0' : '1';
}
