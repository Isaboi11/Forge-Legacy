import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * How many times this device has opened Meal Detail — the counter behind
 * "Swipe to delete · hold for more".
 *
 * `Meal Detail.dc.html` shows that line on the first two opens and never again, which is the right
 * shape for a gesture hint: the two interactions on that screen are invisible until somebody tries
 * them, and a permanent instruction under a list is clutter for the other 300 visits.
 *
 * ⚠ DEVICE-LOCAL, like `podium-seen`. "Has this person been shown how the rows work" is a fact about
 * this screen on this device, not about the athlete, and it does not belong in `profiles`. Cleared on
 * account switch by `first-run.ts` along with the rest of the device-local keys.
 */
const KEY = 'forge_meal_detail_hint_v1';

/** Opens that still carry the hint. Two is the `.dc`'s number. */
export const MEAL_HINT_OPENS = 2;

/**
 * Record this open and answer whether the hint belongs on screen.
 *
 * Read and write in one call on purpose: a screen that read the count, rendered, and bumped it
 * separately would race itself on a fast back-and-forth and burn both opens on one visit.
 */
export async function consumeMealHint(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen = Number.parseInt(raw ?? '0', 10) || 0;
    if (seen < MEAL_HINT_OPENS) await AsyncStorage.setItem(KEY, String(seen + 1));
    return seen < MEAL_HINT_OPENS;
  } catch {
    /* Unreadable storage reads as ALREADY SEEN — `swipe-hint` fails the same way for the same reason:
       a hint that fails closed is quiet, one that fails open reappears forever. Nothing is lost, because
       both gestures are also in the ⋮ menu, which is visible without being taught. */
    return false;
  }
}

export async function clearMealHint(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
