import AsyncStorage from '@react-native-async-storage/async-storage';

import { uuid } from './app-session';

/**
 * A stable id for THIS INSTALLATION, used for one thing: telling the server which physical device a push
 * token belongs to (migration 0187).
 *
 * ══ WHY THE EXPO TOKEN COULD NOT DO THIS JOB ══
 *
 * `push_register_token` treated the token string as the identity of a device, and it is not one. A device
 * is handed a NEW Expo push token whenever the installation changes underneath it — a fresh install, a
 * credentials rotation, a project change — while the row holding the old string stays live under the same
 * athlete forever. `push_drain` sends one message per live token, so one squad-mate starting a workout
 * arrived on one phone two and three times over. Nothing in the notification code was wrong; the schema
 * simply had no way to know two rows were the same phone.
 *
 * ⚠ AND "RETIRE THE ATHLETE'S OTHER TOKENS ON REGISTER" IS NOT THE FIX. An iPhone and an iPad would
 * disable each other on every launch, each going silent until the other opened the app. The missing fact
 * was the device, so this supplies it.
 *
 * ══ ⚠ READ THIS BEFORE ASSUMING IT VIOLATES THE PRIVACY STANCE ══
 *
 * `app-session.ts` says in as many words that nothing in it may ever become stable, because "an id that
 * survives a session is a tracking identifier". That rule governs ANALYTICS — `app_events.session_id`
 * and `client_errors.session_id`, and P-6-Amendment-001 names it. This id is not analytics and never
 * touches those tables. It lives in exactly one column, `push_tokens.device_id`, beside a value that has
 * always been a stable per-device identifier: the Expo push token itself. It grants no capability the row
 * did not already have — it only lets the server notice that two rows are the same phone.
 *
 *   · Random. Not derived from hardware, not readable by any other app, not an advertising id.
 *   · Never sent to analytics, never joined to a workout, a squad or a profile.
 *   · Dies with the app. A reinstall mints a new one, and the token it replaces goes DeviceNotRegistered
 *     on its own, so `push_reconcile` retires it the old way.
 *
 * ⚠ NOT CLEARED ON ACCOUNT SWITCH, deliberately, and `first-run.ts` clears an explicit list so this is
 * safe by omission — do not add it. It is a fact about the hardware, not about who is signed in. Two
 * athletes sharing a phone SHOULD report the same device: that is what makes the second sign-in retire
 * the first athlete's stale token for it rather than leaving both alive.
 */
const KEY = 'forge_device_id_v1';

/** Cached so registration on a warm start does not wait on storage. */
let cached: string | null = null;

/**
 * This installation's id, minting and persisting one on first call.
 *
 * ⚠ RETURNS NULL RATHER THAN THROWING OR INVENTING. A storage failure must not break push registration,
 * and a fresh random id on every launch would be worse than none — the server would retire a live token
 * each time and this device would keep unregistering itself. Null means "I cannot say which device I am",
 * which 0187 answers by retiring nothing and behaving exactly as it did before.
 */
export async function getDeviceId(): Promise<string | null> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
    const minted = uuid();
    await AsyncStorage.setItem(KEY, minted);
    cached = minted;
    return minted;
  } catch {
    return null;
  }
}
