import { supabase } from '@/lib/supabase';

/**
 * Device registration for push (migration 0120).
 *
 * `push_register_token` is the only thing that stamps `profiles.push_baseline_at`, and it stamps it once.
 * That timestamp is the floor under every future send: without it, registering a device would enqueue
 * every pending friend request, squad invite and shared program the account has ever accumulated and
 * deliver them as one burst.
 *
 * Both calls swallow their errors deliberately. Push is an accessory to the app, never a precondition for
 * it — an unapplied migration or a network blip must not break sign-in, which is the moment registration
 * happens.
 */

const MISSING_FN = 'PGRST202';

/**
 * `deviceId` is what stops one phone getting the same notification several times (0187). The server
 * retires this athlete's OTHER live tokens carrying the same device id, because a device is handed a new
 * Expo token whenever its installation changes and the old row stayed live under them forever.
 *
 * ⚠ OMITTED RATHER THAN GUESSED WHEN IT IS UNKNOWN. `p_device_id` is optional on purpose and null retires
 * nothing: "I cannot say which device I am" must never be read as "retire the ones that can".
 */
/** The token this device last registered for the signed-in athlete — released at sign-out (launch QA, H12). */
let registeredToken: string | null = null;

export async function registerPushToken(
  token: string,
  platform: 'ios' | 'android',
  deviceId?: string | null,
): Promise<boolean> {
  const { error } = await supabase.rpc('push_register_token', {
    p_token: token,
    p_platform: platform,
    p_device_id: deviceId ?? null,
  });
  if (error) {
    if ((error as { code?: string }).code !== MISSING_FN) {
      console.warn('[push] token registration failed', error.message);
    }
    return false;
  }
  registeredToken = token;
  return true;
}

/**
 * ══ SIGNING OUT STOPS THIS PHONE GETTING THAT ACCOUNT'S PUSHES (PO 11-08 launch QA, H12) ══
 *
 * The token was registered at sign-in and never released, so a phone kept receiving the last account's
 * notifications — names, comment and cheer text — until somebody else signed in on it. `unregisterPushToken`
 * existed and nothing called it. This runs BEFORE the session ends (the row is deleted as `auth.uid()`), and
 * it is capped at three seconds and swallows failure: a slow network must never hold anyone in an account
 * they are leaving.
 */
export async function releaseThisDevicesPushToken(): Promise<void> {
  const token = registeredToken;
  if (!token) return;
  registeredToken = null;
  await Promise.race([unregisterPushToken(token).catch(() => undefined), new Promise<void>((r) => setTimeout(r, 3000))]);
}

export async function unregisterPushToken(token: string): Promise<void> {
  await supabase.rpc('push_unregister_token', { p_token: token });
}
