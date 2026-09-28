import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Coach Holt's welcome, owed ONCE to an athlete who has just signed up.
 *
 * PO, 2026-09-28: *"When someone signs up there needs to be some kind of welcome from coach holt with their
 * name. And coach holt offering to be there for help and support if they have questions."*
 *
 * Onboarding cannot show it itself — finishing flips `onboarded_at` and `routeFor` swaps the whole route in
 * the same moment (see `onboarding-plans.ts`, the same hand-off). So onboarding leaves this flag and Home
 * spends it once the screen is actually visible.
 *
 * ⚠ OWED BY SIGNING UP, NOT BY "NEVER SEEN". An athlete who was already in the app when this shipped never
 * finished onboarding again, so they are never greeted as new — which they are not.
 *
 * ⚠ CLEARED ON DISMISS, NOT ON READ. A flag spent on read is lost if the app is killed before the sheet is
 * seen; a welcome is only ever given by being looked at.
 */
const KEY = 'forge_holt_welcome_owed_v1';

export async function markHoltWelcomeOwed(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // best-effort; a lost flag means no welcome, never a broken signup
  }
}

export async function isHoltWelcomeOwed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    // Unreadable reads as NOT owed — a welcome that fails closed costs nothing; one that fails open greets
    // the same athlete on every launch.
    return false;
  }
}

/** Spent by the sheet's dismissal, and on account switch (`first-run.ts`). */
export async function clearHoltWelcome(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
