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
  return true;
}

export async function unregisterPushToken(token: string): Promise<void> {
  await supabase.rpc('push_unregister_token', { p_token: token });
}
