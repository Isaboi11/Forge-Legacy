import { supabase } from '@/lib/supabase';
import { userIdFromSession } from '@/lib/require-user-id-core';

/**
 * The signed-in athlete's id, for a WRITE — read from the session on the phone, never from the network.
 *
 * Offline, the old `supabase.auth.getUser()` returned `user: null` and every writer said "Not signed in", so a
 * workout finished in a gym with no signal never reached the offline queue (UX-016, launch QA H42). This reads
 * `getSession()` instead, and a network failure surfaces AS a network failure (the offline queue takes it; the
 * screen says "check your connection"). Genuinely signed out still throws `Not signed in`.
 *
 * See `require-user-id-core.ts` for the rule. ⚠ Not for the launch/boot identity, which deliberately asks the
 * server (`getUser`, commit 5ffccf67).
 */
export async function requireUserId(): Promise<string> {
  return userIdFromSession(await supabase.auth.getSession());
}
