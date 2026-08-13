import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

import { inviteCodeFromUrl } from '@/domain/squad/invite-link';
import { stashPendingInvite, takePendingInvite } from './pending-invite-store';

/*
 * ⚠ THE STORAGE HELPERS LIVE IN `pending-invite-store.ts`, WHICH IMPORTS NEITHER REACT NOR THE ROUTER.
 *
 * They were here, and `first-run.ts` importing `clearPendingInvite` from this file dragged `expo-router`
 * into the auth-initialisation chain — upstream of the router itself. The app booted to a white screen.
 * The full account is in that file's header. Do not move them back.
 */
export { clearPendingInvite, stashPendingInvite, takePendingInvite } from './pending-invite-store';

/**
 * An invite that arrives before there is an account to accept it.
 *
 * ══ THE PROBLEM, IN ONE SENTENCE ══
 *
 * A stranger taps a squad invite, has no session, gets routed to sign-in — and the `?code=` is gone,
 * because `_layout.tsx` declares only `sign-in` in that state and expo-router strips every route it did
 * not declare. See `domain/squad/invite-link.ts` for the full account.
 *
 * ══ WHY A DEVICE-LOCAL STASH AND NOT A ROUTE PARAM ══
 *
 * The code has to survive sign-up AND onboarding — two screens, several minutes, an email round trip on
 * some paths, and possibly a cold start in the middle if the athlete backgrounds the app to fetch a
 * verification code. A param cannot cross that; it does not even survive the first navigation. AsyncStorage
 * does, and this is exactly the kind of pre-account intent it is for — the same reasoning `first-run.ts`
 * uses for its flags.
 *
 * ⚠ DEVICE-LOCAL AND DELIBERATELY SO. It is written before anybody is signed in, so there is no athlete
 *   to attach it to. `resetFirstRunFlags` clears it on an account switch for the same reason it clears
 *   the rest: the next person to use this phone did not tap that invite.
 */

/**
 * Catches an invite URL whatever the app was doing when it arrived, and redeems it once there is an
 * account to redeem it with.
 *
 * Mounted at the root, ABOVE the boot router's branches, so it runs in all four states — including
 * `'auth'`, which is the whole point: that is the state in which the code would otherwise be lost.
 *
 * ⚠ BOTH ARRIVAL PATHS. `getInitialURL()` is the cold start (the app was not running when the link was
 *   tapped); the listener is the warm one (it was). Handling only the first is the classic half-fix, and
 *   on web the cold path is the ONLY one, because a pasted URL is a fresh document.
 */
export function usePendingInvite(route: 'splash' | 'auth' | 'onboarding' | 'app'): void {
  const router = useRouter();
  const redeemed = useRef(false);

  // ── capture ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    const capture = (url: string | null) => {
      const code = inviteCodeFromUrl(url);
      if (alive && code) void stashPendingInvite(code);
    };

    void Linking.getInitialURL().then(capture, () => {});
    const sub = Linking.addEventListener('url', (e) => capture(e.url));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // ── redeem ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Only once there is a signed-in, onboarded athlete: `join-squad` is not in the route tree before
    // that, so navigating earlier would be the same silent no-op this hook exists to fix.
    if (route !== 'app' || redeemed.current) return;
    let alive = true;
    void takePendingInvite().then((code) => {
      if (!alive || !code) return;
      redeemed.current = true;
      /*
       * `push`, not `replace`. The athlete lands on Home first and is then taken to the invite, so
       * backing out of it leaves them somewhere that exists — and a squad they chose not to join does not
       * cost them the app they just signed up for.
       */
      router.push({ pathname: '/join-squad', params: { code } });
    });
    return () => {
      alive = false;
    };
  }, [route, router]);
}
