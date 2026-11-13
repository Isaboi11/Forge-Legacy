import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether this account has been shown the testers' Holt AI offer on this device (Monetization
 * Amendment 011). Plain AsyncStorage, no React and no router — same shape as `onboarding-plans.ts`.
 *
 * ⚠ KEYED BY ACCOUNT, NOT BY DEVICE. Two testers can share a phone (11-09: two accounts on one phone), and
 *   each is owed the offer once. Because the key carries the user id, nothing needs clearing on an account
 *   switch (`first-run.ts`).
 *
 * ⚠ MARKED ONLY WHEN THE PAGE IS ACTUALLY OPENED. A tester the server doesn't offer it to yet (P8: the 8 who
 *   were missing `comped_tester`) is not marked, so they see it once the SQL lands.
 */
const PREFIX = 'forge_holt_ai_offer_seen_v1:';

export async function hasSeenHoltAiOffer(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREFIX + userId)) != null;
  } catch {
    // Unreadable storage: say "seen". A missed offer costs nothing; an offer on every launch is a nag.
    return true;
  }
}

export async function markHoltAiOfferSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + userId, new Date().toISOString());
  } catch {
    /* best-effort */
  }
}
