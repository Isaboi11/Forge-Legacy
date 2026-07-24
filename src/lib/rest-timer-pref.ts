import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The rest-timer on/off preference — device-local, like the tour/home-level flags. Defaults to OFF
 * (unset → false): a fresh athlete starts with no rest timer running, and only once they turn it on
 * does the choice persist, so it stays on for every later workout. Cleared on account switch by
 * `first-run.ts`. Only the on/off *preference* lives here; the live countdown is transient in-screen state.
 */
const KEY = 'forge_rest_timer_on_v1';

export async function getRestTimerEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setRestTimerEnabled(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // best-effort; a missing flag just falls back to OFF
  }
}

export async function clearRestTimerPref(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
