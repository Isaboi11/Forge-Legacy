import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The referral code held between "a link opened the app" and "a session exists".
 *
 * ══ ⚠ THIS IS A HANDOFF, NOT A STORE OF RECORD ══
 *
 * `0170`'s header explains at length why the pending referral lives in Postgres rather than on the device:
 * `0169` had just finished paying for two AsyncStorage stores that survived neither a reinstall nor a second
 * device, and a referral is a worse candidate still, because weeks pass between capture and use and the loss
 * is somebody's money.
 *
 * This file is the unavoidable remainder of that argument. `record_referral_attribution()` keys off
 * `auth.uid()`, and a brand-new athlete tapping a squad invite has no session yet — they have to sign up
 * first. So the code sits here for that one signup, and `flushPendingReferral()` moves it to the server at
 * the first authenticated moment. **Minutes, not weeks, and it is read exactly once.**
 *
 * If you find yourself reading this value anywhere other than the flush, stop: the answer you want is
 * `my_referral_attribution()`, which is true on every device.
 *
 * ══ ⚠ NO REACT AND NO EXPO-ROUTER IMPORTS IN THIS FILE ══
 *
 * Same rule, and the same reason, as `pending-invite-store.ts` — read its header, it shipped a white screen
 * once. This module is reached from `auth.tsx` during auth initialisation, which is upstream of the router.
 */

const KEY = 'forge.pending.referral.v1';

/**
 * Matches `pending-invite-store`'s window deliberately.
 *
 * The two codes ride on the same link and are stashed in the same breath, so a referral outliving the invite
 * it arrived with would attribute a signup to an invite the app had already decided was too old to honour.
 */
const TTL_MS = 24 * 60 * 60 * 1000;

interface Stashed {
  code: string;
  source: string;
  at: number;
}

export interface PendingReferral {
  code: string;
  source: string;
}

/**
 * Hold a code until there is somebody to attribute it to.
 *
 * ⚠ FIRST WRITE WINS, matching `0170`'s server-side rule. Two invites tapped before signing up must resolve
 * the same way here as they would there — otherwise the device would quietly overwrite to the *last* inviter
 * and the server, seeing only one code, would faithfully record the wrong person with no way to notice.
 */
export async function stashPendingReferral(code: string, source: string): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as Partial<Stashed>;
      // Only an expired stash may be replaced; a live one is the first inviter and stands.
      if (typeof parsed?.at === 'number' && Date.now() - parsed.at <= TTL_MS) return;
    }
    await AsyncStorage.setItem(KEY, JSON.stringify({ code, source, at: Date.now() } satisfies Stashed));
  } catch {
    /* Best-effort. A device that cannot write this still signs up fine, just unattributed. */
  }
}

/**
 * Read AND clear, in one step.
 *
 * Cleared even when the server call that follows fails. The alternative — retrying on every launch — means
 * an athlete who declined an invite carries the attribution attempt around indefinitely, and the failure it
 * is retrying against is almost always 'unknown' or 'already', neither of which a retry can change.
 */
export async function takePendingReferral(): Promise<PendingReferral | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Partial<Stashed>;
    if (typeof parsed?.code !== 'string' || typeof parsed?.at !== 'number') return null;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return { code: parsed.code, source: typeof parsed.source === 'string' ? parsed.source : 'code' };
  } catch {
    return null;
  }
}

export async function clearPendingReferral(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
