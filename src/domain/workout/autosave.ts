import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSession } from './types';

/**
 * Local-first session persistence (W-9, §13.3). The active session is written to AsyncStorage on every
 * set change — the source of truth DURING a workout — so a crash/force-quit can be resumed. Cleared on
 * a committed Finish or a Discard. Cloud only ever sees the final committed workout (save_workout).
 */
const KEY = 'forge.activeWorkout.v1';

export async function persistSession(session: ActiveSession): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* best-effort local cache */
  }
}

export async function loadSession(): Promise<ActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

/**
 * Is there real work in this session — something an athlete would be upset to lose?
 *
 * ══ WHY THIS IS ONE FUNCTION AND NOT TWO PREDICATES ══
 *
 * The logger already used this exact rule to decide whether to offer "Resume", and Home now uses it to
 * decide whether to say "Continue workout". Written twice, they would eventually disagree — and the way
 * that fails is specific and bad: Home offers to continue, the athlete taps it, and the logger sees no
 * work worth resuming and starts them fresh. The offer would have destroyed the thing it advertised.
 *
 * STARTED IS NOT THE SAME AS LOGGED. A session opened and abandoned without a single completed set has
 * nothing in it; resuming that is indistinguishable from starting, so neither surface mentions it.
 */
export function hasLoggedWork(session: ActiveSession | null | undefined): boolean {
  return !!session?.exercises?.some((e) => e.sets?.some((s) => s.done));
}
