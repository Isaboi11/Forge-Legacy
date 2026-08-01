import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether the Exercise Picker narrows to the athlete's own equipment.
 *
 * Persisted because the answer changes with WHERE they are, not with what they're adding: the Home Gym
 * profile records what you own at home, so someone standing in a commercial gym turns it off once and
 * should not have to turn it off again on the next exercise.
 */
const KEY = 'forge_picker_gear_only_v1';

export async function getGearOnly(): Promise<boolean | null> {
  const raw = await AsyncStorage.getItem(KEY);
  // null = never chosen, which the caller reads as "use the default" rather than as "off".
  return raw == null ? null : raw === '1';
}

export async function setGearOnly(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, on ? '1' : '0');
}
