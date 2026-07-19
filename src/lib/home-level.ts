import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The athlete's Home experience-level LENS — the opt-in personalization on-ramp on Home (ONB-Amendment-002).
 * A local flag only: it swaps the fresh-athlete Home from generic to a suggested starting program for that
 * level. It is NOT a locked setting — reversible + re-askable with no confirmation (`clearHomeLevel` re-asks),
 * and it writes nothing to Supabase (athlete_type stays 'Hybrid', environment stays null). Mirrors the
 * `program-intent.ts` pattern.
 */
const KEY = 'forge_home_level_v1';
export type HomeLevel = 'new' | 'training' | 'experienced';

export async function setHomeLevel(level: HomeLevel): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, level);
  } catch {
    // best-effort; a missing flag just falls back to the generic (unset) Home
  }
}

/** Re-ask: forget the chosen level so the question face returns. No confirmation (a lens, not a setting). */
export async function clearHomeLevel(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}

export async function getHomeLevel(): Promise<HomeLevel | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'new' || v === 'training' || v === 'experienced' ? v : null;
  } catch {
    return null;
  }
}
