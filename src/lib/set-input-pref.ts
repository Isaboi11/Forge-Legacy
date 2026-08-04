import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * How the athlete enters a set — device-local, like the rest-timer flag.
 *
 * DEFAULT IS TYPING (unset → false). The wheel shipped as the default and it is the wrong default for
 * the common case: typing "135" is three taps on a keypad the athlete already knows, where the wheel is
 * a scroll to a target that moves under the thumb. The wheel stays available — it is genuinely better
 * for nudging 135 → 140 without looking — but it is now the thing you opt INTO.
 *
 * Sticky on purpose. Somebody who prefers the wheel should choose it once, not once per set.
 * Cleared on account switch by `first-run.ts`.
 */
const KEY = 'forge_set_input_wheel_v1';

export async function getWheelInput(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setWheelInput(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // best-effort; a missing flag just falls back to typing
  }
}

export async function clearWheelInputPref(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
