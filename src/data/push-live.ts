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

export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<boolean> {
  const { error } = await supabase.rpc('push_register_token', { p_token: token, p_platform: platform });
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
