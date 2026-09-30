/**
 * Where a signed-out visitor was trying to go (QA 09-26 settings-29).
 *
 * A link opened without a session meets sign-in — `_layout.tsx` declares only `sign-in` in that state —
 * and after signing in the athlete used to land on Home, the link forgotten. `usePendingDestination`
 * remembers the link's path and opens it once they are in. This file decides which links are worth
 * remembering, pure so it can be tested.
 *
 * ⚠ INTERNAL PATHS ONLY. The result is handed to `router.push`, so it is always a path on this app —
 *   never a host, never a protocol-relative `//evil.example`. Anything that is not clearly one of ours
 *   is dropped, and the athlete simply lands on Home as before.
 */

/** Paths that are not a destination: the doors themselves, and the invite link `pending-invite` owns. */
const NOT_A_DESTINATION = /^\/(?:sign-in|onboarding|join-squad|index)?(?:[/?#]|$)/i;

export function restorableDestination(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  let rest = url.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(rest);
  if (scheme) {
    const proto = scheme[1].toLowerCase();
    rest = rest.slice(scheme[0].length);
    if (proto === 'http' || proto === 'https' || proto === 'exp' || proto === 'exps') {
      // `//host[:port]` then the path. The host is dropped: the path is all we will ever navigate to.
      const m = /^\/\/[^/?#]*(.*)$/.exec(rest);
      if (!m) return null;
      rest = m[1];
      // Expo Go / dev-client URLs carry the route after `/--/`.
      const dashes = rest.indexOf('/--/');
      if (dashes >= 0) rest = rest.slice(dashes + 3);
    } else if (proto === 'forgelegacy') {
      // Our own scheme (`forgelegacy://honors`) has no host — its first segment IS the route.
      rest = '/' + rest.replace(/^\/+/, '');
    } else {
      return null; // somebody else's scheme is never a screen of ours
    }
  }
  // Drop any fragment; it is never a route here.
  rest = rest.split('#')[0] ?? '';
  if (!rest.startsWith('/') || rest.startsWith('//') || rest.includes('\\')) return null;
  if (NOT_A_DESTINATION.test(rest)) return null;
  return rest;
}
