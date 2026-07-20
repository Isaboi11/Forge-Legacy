import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The first-time guided-tour flag — a device-local record of whether the athlete has answered the
 * "Take the tour?" prompt that appears the moment Home un-gates (Onboarding-Amendment-003). Mirrors
 * `home-level.ts`: local only, no Supabase write, cleared on account switch by `first-run.ts`.
 *
 * Persisted values are terminal decisions: `completed` (walked the tour) or `skipped` (chose to explore).
 * `pending` = not yet answered (the default when unset) — the prompt is still owed. The in-memory
 * provider (`useTour`) adds a transient `running` while the tour is mid-flight; that is deliberately NOT
 * persisted, so quitting mid-tour re-prompts on the next launch.
 */
const KEY = 'forge_tour_v1';
export type TourStatus = 'pending' | 'completed' | 'skipped';

export async function setTourStatus(status: TourStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, status);
  } catch {
    // best-effort; a missing flag just re-prompts the tour
  }
}

/** Re-ask: forget the tour decision so the prompt returns. (Used by the account-switch reset.) */
export async function clearTourStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}

export async function getTourStatus(): Promise<TourStatus> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'completed' || v === 'skipped' ? v : 'pending';
  } catch {
    return 'pending';
  }
}
