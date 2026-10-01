import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The break whose "Welcome back" this device has closed — one string, the `breakKey` from
 * `domain/home/welcome-back.ts`. Only the latest matters: a new break has a new key and greets again.
 *
 * Best-effort like `weekly-review-seen.ts`: a failed write costs one re-appearance, never a blocked tap.
 * Cleared on account switch by `first-run.ts`, so the next person on this phone is greeted for their own breaks.
 */
const KEY = 'forge_welcome_back_closed_v1';

export async function getClosedBreak(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function closeBreak(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, key);
  } catch {
    // best-effort; the greeting returns once, which is harmless
  }
}

export async function clearClosedBreak(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
