import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutSectionKind } from '@/domain/workout/types';

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
  /**
   * `'time'` when this movement is measured by the clock — a plank, a carry, a hold.
   *
   * ⚠ CARRIED ONLY FOR A CUSTOM EXERCISE, and that asymmetry is deliberate. For a catalogue row the
   * logger reads `unit` from `itemByKey`, because the catalogue is the authority on what a movement is
   * and a copy travelling through AsyncStorage could disagree with it. A CUSTOM exercise is not in
   * `PICKER_DB` — it is per-athlete and fetched async — so `itemByKey` cannot answer for it, and the
   * pick is the only place that already knows.
   *
   * Optional, so an inbox written by an older build still drains.
   */
  unit?: 'reps' | 'time';
}

export type ExerciseInbox =
  /**
   * `group: 'superset'` — the athlete said so AT PICK TIME, ticking the exercises together and
   * declaring the pairing in the same breath.
   *
   * The ⋮ menu's "Superset with next exercise" answers a different question: the exercises are
   * already in the session (a program day) and the athlete decides on the day to alternate them.
   * Building as you go, that path means adding three lifts and then pairing them one at a time
   * afterwards, which is the pairing you already knew about spelled out three more times.
   *
   * OPTIONAL, so an inbox written by an older build still drains as an ordinary add.
   */
  /**
   * `section` — WHAT THIS IS, not where it goes.
   *
   * ══ THE GAP THIS CLOSES ══
   *
   * PO, 2026-09-04: *"When you do a 'build as you go workout', there's no way to do a warm up or add a
   * warm up."* Exactly right, and the reason was here: `SessionExercise.section` has been a real field
   * since W-9, a program day's warm-up round-trips through save, and the ONE door a freestyle athlete
   * has — this inbox — had no key to put it in. So `pickedToExercise` hard-coded `'main'` and every
   * exercise anyone ever added mid-session was recorded as a main lift, warm-ups included.
   *
   * ⚠ IT DOES NOT REORDER ANYTHING, AND THAT IS THE MODEL, NOT A SHORTCUT. `session-core.ts` says it in
   * as many words: *"the section is a PROPERTY of each exercise, not a set of numbered slots."* Adds
   * append, exactly as they always have. Building as you go, the order you add IS the order you train,
   * so a warm-up added first sits first without anyone sorting it — and a warm-up added last is
   * honestly recorded as something you did last. The alternative (splice warm-ups above the main work)
   * would re-point `position`, which is the JOIN KEY between `session.exercises` and the rows
   * `save_workout` already wrote for a continued session.
   *
   * OPTIONAL for the same reason `group` is: an inbox written by an older build still drains, as 'main'.
   */
  | { kind: 'add'; items: PickedExercise[]; group?: 'superset'; section?: WorkoutSectionKind }
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
