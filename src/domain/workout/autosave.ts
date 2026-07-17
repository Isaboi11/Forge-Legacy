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
