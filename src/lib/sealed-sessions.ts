import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which finished workouts this device has watched being SEALED — so the completion page, opened again,
 * does not ask for the hold a second time (workout-18, QA 09-26).
 *
 * ══ WHY IT IS HELD HERE AND NOT ON THE WORKOUT ══
 *
 * The hold writes nothing: the session was committed by `save_workout` before the screen drew, and the
 * seal is the ceremony over that fact. So the server has no "sealed" column to read back, and the screen
 * decided from its route alone — `review=1` from Activity Detail meant sealed, anything else meant a
 * session just finished. A reload of the page on the web, or any other way back to the same id, arrived
 * without the param and offered Hold to Seal over a workout that had already been sealed.
 *
 * Device-local is the honest scope: the ceremony is something that happened on a screen. A capped list —
 * nobody re-opens their four-hundredth workout's first page, and an unbounded list is a slow leak.
 *
 * ⚠ FAILS TOWARD "NOT SEALED". An unreadable store means the seal is offered again, which is the old
 * behaviour and harmless — the hold writes nothing. Failing the other way would skip a first ceremony.
 */
const KEY = 'forge_sealed_sessions_v1';
const CAP = 100;

async function read(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function wasSessionSealed(workoutId: string): Promise<boolean> {
  if (!workoutId) return false;
  return (await read()).includes(workoutId);
}

export async function markSessionSealed(workoutId: string): Promise<void> {
  if (!workoutId) return;
  try {
    const list = (await read()).filter((x) => x !== workoutId);
    await AsyncStorage.setItem(KEY, JSON.stringify([workoutId, ...list].slice(0, CAP)));
  } catch {
    /* best-effort */
  }
}

/**
 * A continued workout is finished AGAIN, with more in it — that finish is its own ceremony, so the mark
 * comes off when "Continue this workout" reopens it.
 */
export async function unmarkSessionSealed(workoutId: string): Promise<void> {
  try {
    const list = await read();
    if (list.includes(workoutId)) await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((x) => x !== workoutId)));
  } catch {
    /* best-effort */
  }
}
