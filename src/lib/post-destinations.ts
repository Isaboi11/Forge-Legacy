import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Where this phone last posted a finished workout BY HAND — Friends, and which squads.
 *
 * Workout Complete starts its Friends / Squads rows here when auto-post is off (PO 2026-10-02: "remember
 * the user's most recent sharing destinations"). Device-local on purpose: it is a convenience for the
 * next session on this phone, not a preference, and it never posts anything by itself — the button does.
 *
 * Stored raw; `parseDestinations` (domain/share/auto-post) validates it. Plain AsyncStorage with no `@/`
 * import, because `first-run.ts` clears it on account switch during auth init, upstream of the router.
 */
const KEY = 'forge_post_destinations_v1';

export async function readLastDestinations(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function saveLastDestinations(d: { friends: boolean; squadIds: string[] }): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ friends: d.friends, squadIds: d.squadIds }));
  } catch {
    // best-effort — without it, the next session simply starts with nothing selected
  }
}

export async function clearLastDestinations(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
