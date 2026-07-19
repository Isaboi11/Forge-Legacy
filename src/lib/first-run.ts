import { clearHomeLevel } from './home-level';
import { clearHomeIntake } from './home-intake';

/**
 * Clear the device-local first-run flags. These live in AsyncStorage (localStorage on web) and are NOT
 * tied to a Supabase account, so without this a new account signing in on the same device/browser would
 * inherit the previous account's local choices (the "fresh account still shows a suggestion" bug).
 *
 * Called from `AuthProvider` whenever the auth user id changes (sign-out, or a different account signing in).
 * Extend this as more local first-run flags land (home-intake, tour, per-screen prompts).
 */
export async function resetFirstRunFlags(): Promise<void> {
  await Promise.all([clearHomeLevel(), clearHomeIntake()]);
}
