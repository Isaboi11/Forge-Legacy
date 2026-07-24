import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PickedExercise } from '@/lib/exercise-inbox';

/**
 * The hand-off between the Exercise Picker and the Program Builder — the RN analogue of the design's
 * `forge_builder_inbox_v1` localStorage inbox (see `Forge Program Builder.dc` `_INBOX()` / `addExercise`).
 * The Builder saves its draft and routes to the Picker in `builder` mode carrying the target coordinates;
 * the Picker writes the chosen exercises here and navigates back; the Builder drains it on focus and
 * appends them to that exact week/day/section, then clears it.
 *
 * Separate from `exercise-inbox` (Active Workout) on purpose: the two round-trips must never consume each
 * other's payload, and this one carries a destination address the workout inbox has no concept of.
 */

export type BuilderSection = 'warmup' | 'main' | 'cooldown';

export interface BuilderInbox {
  vary: boolean; // targeting a per-week plan (true) or the repeating template (false)
  week: number; // index into weekPlans; 0 when !vary
  day: number; // index into that plan's days
  section: BuilderSection;
  items: PickedExercise[];
}

const KEY = 'forge_builder_inbox_v1';

const SECTIONS: BuilderSection[] = ['warmup', 'main', 'cooldown'];

export async function writeBuilderInbox(inbox: BuilderInbox): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(inbox));
  } catch {
    // best-effort; a dropped inbox just means the pick didn't land
  }
}

export async function readBuilderInbox(): Promise<BuilderInbox | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as BuilderInbox;
    if (!v || !SECTIONS.includes(v.section) || !Array.isArray(v.items)) return null;
    if (typeof v.day !== 'number' || v.day < 0) return null;
    return v;
  } catch {
    return null;
  }
}

export async function clearBuilderInbox(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
