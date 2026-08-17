import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The hand-off from the Custom Exercise form back to the Exercise Picker that sent it there.
 *
 * ══ WHY THERE IS A QUEUE FOR ONE STRING ══
 *
 * W-23 §15.4 requires the exercise an athlete just created to come back ALREADY SELECTED: "the athlete
 * created this exercise specifically because they needed it right now". The picker is still mounted
 * underneath — `router.back()` returns to it with its search, its filters and its other ticks intact —
 * so the only thing missing is which row to tick, and `router.back()` cannot carry a parameter.
 *
 * The alternative was to have the picker diff the custom list before and after, which infers an answer
 * the form already knows. This is the same shape as `exercise-inbox` and `builder-inbox`, kept separate
 * from both for the same reason they are separate from each other: three round-trips must never consume
 * one another's payload.
 *
 * ⚠ READ ONCE. `takeCreatedCustom` clears as it reads, so a picker that is focused twice does not
 * re-select an exercise the athlete has since deliberately un-ticked.
 */

const KEY = 'forge_custom_exercise_created_v1';

/** Called by the form on a successful CREATE (never an edit) when it was opened from the picker. */
export async function writeCreatedCustom(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {
    // Best-effort: a dropped hand-off costs the athlete one tap, never the exercise — it is saved.
  }
}

/** The id of the exercise just created, or null. Clears it. */
export async function takeCreatedCustom(): Promise<string | null> {
  try {
    const id = await AsyncStorage.getItem(KEY);
    if (id) await AsyncStorage.removeItem(KEY);
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}
