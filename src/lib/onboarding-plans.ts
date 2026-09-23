import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The plans screen, shown ONCE after onboarding (Monetization Amendment 006 MA6-D9 ①, Onboarding
 * Amendment 007 ONB-A7-D2).
 *
 * Onboarding cannot push `/subscription` itself: finishing flips `onboarded_at`, and `routeFor` swaps the
 * whole route to the app in the same moment, so a push would race the guard. Instead onboarding leaves
 * this flag and Home spends it on its first mount.
 *
 * ⚠ TAKING THE FLAG CLEARS IT WHETHER OR NOT THE SCREEN IS SHOWN. While `default_tier` is PREMIUM (every
 *   account entitled, pre-Phase F) there is nothing to sell, so the flag is spent silently — a tester
 *   must never see the plans screen weeks later because the flip happened after they signed up.
 */
const KEY = 'forge_onboarding_plans_pending_v1';

export async function markPlansPending(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // best-effort; a lost flag means one fewer upsell, never a broken app
  }
}

/** True once, then false forever — the read and the clear are one step. */
export async function takePlansPending(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) return false;
    await AsyncStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

/** Cleared on account switch (`first-run.ts`), so one account's pending offer never greets another. */
export async function clearPlansPending(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
