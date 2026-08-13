import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { inviteCodeFromUrl } from '@/domain/squad/invite-link';

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

const KEY = 'forge.pending.invite.v1';

/** Long enough to survive a sign-up with an email round trip; short enough that a stale code is not honoured weeks later. */
const TTL_MS = 24 * 60 * 60 * 1000;

interface Stashed {
  code: string;
  at: number;
}

export async function stashPendingInvite(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() } satisfies Stashed));
  } catch {
    /* Best-effort: a device that cannot write this still reaches sign-in, just without the code. */
  }
}

export async function takePendingInvite(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    // Read-and-clear in one step. An invite is honoured ONCE — leaving it would re-route the athlete to
    // join-squad on every launch, including after they declined it.
    await AsyncStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Partial<Stashed>;
    if (typeof parsed?.code !== 'string' || typeof parsed?.at !== 'number') return null;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.code;
  } catch {
    return null;
  }
}

export async function clearPendingInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

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
