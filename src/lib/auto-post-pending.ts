import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The session whose auto-post has not happened yet.
 *
 * Auto-post fires when the athlete LEAVES the completion screen, so they can add a note and a playlist
 * first. Closing the app from that screen is a way of leaving that runs no code — so the screen writes
 * this marker when it opens, and the next launch posts whatever it still finds here.
 *
 * Stored raw; `parsePendingAutoPost` (domain/share/auto-post) validates it and enforces the window.
 * Plain AsyncStorage with no `@/` import, because `first-run.ts` clears it on account switch and that
 * file is reached during auth init, upstream of the router.
 */
const KEY = 'forge_auto_post_pending_v1';

export async function markAutoPostPending(workoutId: string, savedAt: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ workoutId, savedAt }));
  } catch {
    // best-effort — without it, closing the app from the completion screen simply does not post
  }
}

export async function readAutoPostPending(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function clearAutoPostPending(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
