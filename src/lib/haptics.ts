import * as Haptics from 'expo-haptics';

/**
 * The haptics layer — native.
 *
 * The web build resolves `haptics.web.ts` instead, which falls back to `navigator.vibrate`. Both
 * expose exactly these three calls, so a screen never asks which platform it is on. This is the
 * sibling of `lib/ding` and is deliberately shaped the same way.
 *
 * ⚠ THE SETTINGS TOGGLE PREDATES THIS FILE BY A LONG WAY. `AppPrefs.haptics` has defaulted to `true`
 *   since P-4b shipped, and until now nothing read it on native — the toggle was listed `live: false`
 *   and the only vibration in the app was the web-only one in `workout-complete`. Every call below is
 *   therefore gated by the caller passing the pref through (see `useHaptics`), not by this module
 *   reading it, because `lib/` has no access to the settings context.
 *
 * NOTHING HERE AWAITS. A haptic that blocked a state update would put a Taptic Engine call on the
 * path between the athlete's thumb and the set being logged. Fire and forget, and swallow failures —
 * a device with no haptics engine (every Android without one, every simulator) still runs a workout.
 */

/** A set was logged, a rep was counted — the everyday confirmation. */
export function tapLight(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // best-effort
  }
}

/** A heavier confirmation: finishing an exercise, committing a sheet. */
export function tapMedium(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // best-effort
  }
}

/**
 * Something landed that the athlete earned — a PR, a completed workout, an honor.
 *
 * `Success` rather than a plain impact because iOS gives it a distinct two-beat pattern, and that is
 * the point: a PR should not feel like logging set three.
 */
export function tapSuccess(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // best-effort
  }
}
