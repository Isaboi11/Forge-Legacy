import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isRestMode,
  legacyFlagFor,
  resolveRestMode,
  REST_MODE_KEY,
  REST_MODE_LEGACY_KEY,
  type RestMode,
} from './rest-timer-pref-model';

/**
 * The rest-timer preference — device-local, like the tour/home-level flags. Cleared on account switch
 * by `first-run.ts`. Only the *preference* lives here; the live countdown is transient in-screen state.
 *
 * ⚠ THIS FILE IS THE STORAGE HALF ONLY. The three modes, the legacy migration and the reasoning behind
 * both live in `rest-timer-pref-model.ts`, which imports nothing native so the migration can actually be
 * tested. Read that file first — every decision this one makes is made there.
 */

export { nextRestMode, REST_MODES, type RestMode } from './rest-timer-pref-model';

export async function getRestMode(): Promise<RestMode> {
  try {
    const stored = await AsyncStorage.getItem(REST_MODE_KEY);
    /* Short-circuits so the common path stays ONE read — the legacy key is only worth touching when
       the new one has nothing readable to say. Both exits go through `resolveRestMode` regardless, so
       the decision lives in exactly one place. */
    if (isRestMode(stored)) return resolveRestMode(stored, null);
    return resolveRestMode(stored, await AsyncStorage.getItem(REST_MODE_LEGACY_KEY));
  } catch {
    return 'off';
  }
}

export async function setRestMode(m: RestMode): Promise<void> {
  try {
    await AsyncStorage.setItem(REST_MODE_KEY, m);
    await AsyncStorage.setItem(REST_MODE_LEGACY_KEY, legacyFlagFor(m));
  } catch {
    // best-effort; a missing flag just falls back to OFF
  }
}

export async function clearRestTimerPref(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([REST_MODE_KEY, REST_MODE_LEGACY_KEY]);
  } catch {
    // best-effort
  }
}
