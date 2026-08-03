import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Favourited squads — the star on the Squads hub, which floats a squad to the top of the list.
 *
 * Device-local by design (SQ hub): a favourite is "the one I check most from this phone", not a property
 * of the squad or of the membership, so it writes nothing to Supabase. That also makes it an account's
 * leftover — the ids belong to whoever starred them — which is why `first-run.ts` clears it on an account
 * switch. It lives here rather than in the screen so the reset can reach it without `src/lib` importing a
 * route module (a screen import from a lib is how a fixture chain got pulled into the production bundle
 * once already).
 */
const KEY = 'forge.squads.favorites';

export async function getSquadFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function setSquadFavorites(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // best-effort; a failed write just loses the star until it's set again
  }
}

export async function clearSquadFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
