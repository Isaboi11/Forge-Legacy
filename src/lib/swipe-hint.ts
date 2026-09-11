import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether this athlete has been SHOWN that exercises swipe — the once-only hint on the live session,
 * where the pager slides a little toward the next exercise and springs back.
 *
 * Device-local like the rest-timer and wheel flags, and cleared on account switch by `first-run.ts`:
 * the next person on this phone has not seen it.
 *
 * Marked when the hint PLAYS, not when the athlete swipes. The hint is the teaching; whether they take
 * it up is theirs, and replaying it on every workout until they do would turn a hint into a nag.
 */
const KEY = 'forge_swipe_hint_seen_v1';

export async function getSwipeHintSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    // Unreadable storage reads as SEEN — a hint that fails closed costs nothing; one that fails open
    // replays on every workout.
    return true;
  }
}

export async function markSwipeHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // best-effort
  }
}

export async function clearSwipeHintSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
