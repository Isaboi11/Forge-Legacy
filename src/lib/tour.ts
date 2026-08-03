import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The first-time guided-tour flags — device-local records of the two legs the tour is made of
 * (Onboarding-Amendment-003). Mirrors `home-level.ts`: local only, no Supabase write, cleared on account
 * switch by `first-run.ts`.
 *
 * TWO KEYS, BECAUSE THE TOUR RUNS AT TWO MOMENTS. `forge_tour_v1` is the TABS leg — the four-pillar map,
 * shown while Home is still gated. `forge_home_tour_v1` is the HOME leg — the spotlight walkthrough of the
 * un-gated Home. One flag could not express "saw the map, hasn't been shown the screen yet", which is the
 * ordinary state of every athlete between their sign-up and their first program. (The Home key name is the
 * design's own — `forge-coach.js` lists it under `LEGACY_KEYS`.)
 *
 * Persisted values are terminal decisions: `completed` (walked it) or `skipped`. `pending` = not yet shown
 * (the default when unset) — that leg is still owed. A run in flight is deliberately NOT persisted, so
 * quitting mid-tour leaves the leg owed and it comes back.
 */
const KEY = 'forge_tour_v1';
const HOME_KEY = 'forge_home_tour_v1';
export type TourStatus = 'pending' | 'completed' | 'skipped';

async function readStatus(key: string): Promise<TourStatus> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v === 'completed' || v === 'skipped' ? v : 'pending';
  } catch {
    return 'pending';
  }
}

export async function setTourStatus(status: TourStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, status);
  } catch {
    // best-effort; a missing flag just re-runs that leg
  }
}

/** Re-ask: forget the tabs-leg decision so it runs again. (Used by the account-switch reset + replay.) */
export async function clearTourStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}

export async function getHomeTourStatus(): Promise<TourStatus> {
  return readStatus(HOME_KEY);
}

export async function setHomeTourStatus(status: TourStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(HOME_KEY, status);
  } catch {
    // best-effort
  }
}

export async function clearHomeTourStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HOME_KEY);
  } catch {
    // best-effort
  }
}

/**
 * Whether the one-time "Legacy Unlocked" honor ceremony has already been announced.
 *
 * Deliberately SEPARATE from the tour status. The ceremony used to be gated on `status === 'pending'`
 * alone, and because a mid-flight tour is intentionally not persisted, any interruption (a reload, a
 * redeploy, closing the tab) dropped the status back to `pending` and re-announced an honor the athlete
 * had earned days ago. An honor is announced once, full stop — the tour re-prompting is a separate,
 * intentional behaviour and must not drag the ceremony back with it.
 */
const ANNOUNCED_KEY = 'forge_unlock_announced_v1';

export async function getUnlockAnnounced(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ANNOUNCED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setUnlockAnnounced(): Promise<void> {
  try {
    await AsyncStorage.setItem(ANNOUNCED_KEY, '1');
  } catch {
    // best-effort; worst case the ceremony shows once more
  }
}

export async function clearUnlockAnnounced(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ANNOUNCED_KEY);
  } catch {
    // best-effort
  }
}

export async function getTourStatus(): Promise<TourStatus> {
  return readStatus(KEY);
}
