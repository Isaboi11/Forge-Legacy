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

/**
 * Whether the athlete has waved off the "set up my gym" prompt.
 *
 * Someone who trains at a commercial gym has no home gym to describe and never will — asking them again
 * on every exercise they add is a nag for something that does not apply. Dismissing writes NOTHING to
 * the profile: leaving it null keeps the picker unfiltered, which is the right answer for a person
 * standing in a room with one of everything. Setting it to "owns the lot" would look equivalent and
 * isn't — it would start hiding the ergs, sleds and pool work their gym may genuinely have.
 */
const PROMPT_KEY = 'forge_gear_prompt_dismissed_v1';

export async function getGearPromptDismissed(): Promise<boolean> {
  return (await AsyncStorage.getItem(PROMPT_KEY)) === '1';
}

export async function dismissGearPrompt(): Promise<void> {
  await AsyncStorage.setItem(PROMPT_KEY, '1');
}
