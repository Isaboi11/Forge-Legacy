import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which podium ceremonies this device has already played.
 *
 * The reveal is a once-per-season event, and "have I watched it" is the only state it needs. That state
 * is DEVICE-LOCAL on purpose: it isn't a fact about the competition, it's a fact about this screen on
 * this device, and CS-D3 already establishes the precedent — a squad member who ignores an open
 * challenge is dismissed client-side rather than recorded as having declined. Nothing about a ceremony
 * belongs in `challenges`.
 *
 * Cleared on account switch by `first-run.ts`, so a second athlete signing in on the same device is
 * shown their own coronations rather than inheriting someone else's watched list.
 */
const KEY = 'forge_podium_seen_v1';

/** Ceremonies older than this are never auto-played — a season that closed last month isn't news. */
export const PODIUM_FRESH_DAYS = 7;

/** True while a closed season is still recent enough to be worth a ceremony. */
export function podiumIsFresh(endAt: string): boolean {
  const ms = Date.now() - new Date(endAt).getTime();
  return Number.isFinite(ms) && ms >= 0 && ms < PODIUM_FRESH_DAYS * 24 * 60 * 60 * 1000;
}

export async function getSeenPodiums(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Mark a ceremony played (idempotent). Capped so the list can't grow without bound. */
export async function markPodiumSeen(challengeId: string): Promise<void> {
  try {
    const seen = await getSeenPodiums();
    if (seen.includes(challengeId)) return;
    await AsyncStorage.setItem(KEY, JSON.stringify([...seen, challengeId].slice(-100)));
  } catch {
    // best-effort; a failed write replays the ceremony once, which is harmless
  }
}

export async function clearSeenPodiums(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
