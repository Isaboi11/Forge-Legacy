import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The hand-off between the Exercise Picker and the Active Workout — the RN analogue of the design's
 * `forge_active_add_inbox_v1` localStorage inbox. The Picker writes its result here and navigates back;
 * the workout drains it on focus (append the added exercises, or apply the swap), then clears it. Kept as
 * a tiny device-local queue so it survives the navigation round-trip.
 */

export interface PickedExercise {
  /** Catalog id (`exercises.json`). Carried end-to-end so a logged exercise can be matched back to the
   *  catalog — without it, everything added via the Picker saved with a null key and history could only
   *  ever be matched on free text. */
  catalogKey?: string;
  name: string;
  equip: string;
  muscles: string[];
  type: string;
}

export type ExerciseInbox =
  | { kind: 'add'; items: PickedExercise[] }
  | { kind: 'replace'; targetIdx: number; item: PickedExercise };

const KEY = 'forge_active_exercise_inbox_v1';

export async function writeExerciseInbox(inbox: ExerciseInbox): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(inbox));
  } catch {
    // best-effort; a dropped inbox just means the pick didn't land
  }
}

export async function readExerciseInbox(): Promise<ExerciseInbox | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ExerciseInbox;
    if (v && (v.kind === 'add' || v.kind === 'replace')) return v;
    return null;
  } catch {
    return null;
  }
}

export async function clearExerciseInbox(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
