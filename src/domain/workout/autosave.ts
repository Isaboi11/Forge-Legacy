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

/**
 * What Home needs to DESCRIBE the resumable session, not merely to know one exists.
 *
 * Home used to show "Continue Workout" only inside the program-day card, so the program supplied the name
 * and the exercise count and this was never needed. The card now appears for an athlete who has no program
 * at all — the day-to-day athlete, for whom Continue was previously unreachable entirely — and it has to
 * name the session out of the session itself.
 *
 * Gated on `hasLoggedWork` for the reason given above: a started-but-empty session is not resumable, and a
 * summary of one would be an offer to continue nothing.
 */
export function resumeSummary(
  session: ActiveSession | null | undefined,
): { name: string; exerciseCount: number } | null {
  if (!hasLoggedWork(session)) return null;
  const exercises = session!.exercises ?? [];
  // The count the athlete recognises is the work, not the warm-up. A cardio-only session has no `main`
  // section at all, so an empty main falls back to the whole list rather than claiming zero exercises.
  const main = exercises.filter((e) => e.section === 'main').length;
  return { name: session!.workoutName, exerciseCount: main || exercises.length };
}
