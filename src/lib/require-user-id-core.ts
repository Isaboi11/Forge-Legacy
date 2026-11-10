/**
 * ══ WHO IS SIGNED IN, FOR A WRITE — READ ON THE PHONE, NOT ASKED OF THE SERVER (UX-016, launch QA H42) ══
 *
 * The pure half of `requireUserId` (`./require-user-id.ts`). No Supabase import, so `node --test` can load it.
 *
 * ⚠ THE DEFECT. Writers got the athlete's id from `supabase.auth.getUser()`, which is a NETWORK call. Offline it
 * does not throw — it RETURNS `user: null` (auth-js catches its own `AuthRetryableFetchError`) — and every writer
 * read that null as "signed out" and threw a plain `'not signed in'`. `isTransportFailure` rightly refuses a plain
 * error, so Finish never reached the offline save queue (W-9 §13.4): the athlete stood in the gym looking at
 * "Couldn't save — Not signed in.. Try again." The same false sentence blocked offline runs, invites, comments,
 * posts and Holt's Save for later.
 *
 * ══ THE RULE ══
 *
 *   · A session on the phone → its user's id. No network. (`getSession()` reads storage; it only goes to the
 *     server to refresh a token that has expired.)
 *   · No session because that refresh could not REACH the server → the network error itself is re-thrown. It is
 *     a transport failure, so the offline queue takes it and every screen says "check your connection".
 *   · No session and no network excuse → genuinely signed out: `Not signed in`, as before.
 *
 * ⚠ FOR WRITERS ONLY. The launch/boot gate deliberately identifies the athlete by the SERVER's `getUser()` id
 * (commit 5ffccf67 — two accounts on one phone); it does not use this.
 */

/** What `supabase.auth.getSession()` resolves to — only the parts read here. */
export interface SessionRead {
  data: { session: { user?: { id?: string | null } | null } | null } | null;
  error?: unknown;
}

/** The sentence thrown when nobody is signed in. Unchanged from what the writers threw before. */
export const NOT_SIGNED_IN = 'Not signed in';

/**
 * Supabase Auth names its own network failure (`auth-js` errors.js: `AuthRetryableFetchError`) — a fetch that
 * failed, timed out, or met a 502/503/504. It is the only error `getSession()` hands back for "could not refresh
 * because the server could not be reached".
 */
export function isAuthNetworkFailure(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { name?: unknown }).name === 'AuthRetryableFetchError';
}

/** The signed-in athlete's id from a `getSession()` result — or the right error. See the header. */
export function userIdFromSession(read: SessionRead): string {
  const id = read.data?.session?.user?.id;
  if (typeof id === 'string' && id) return id;
  if (isAuthNetworkFailure(read.error)) throw read.error;
  throw new Error(NOT_SIGNED_IN);
}
