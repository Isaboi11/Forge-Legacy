import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

import { restorableDestination } from '@/domain/auth/pending-destination';

type BootRoute = 'splash' | 'auth' | 'onboarding' | 'app';

/**
 * A link opened while signed out is opened again once the athlete is in (QA 09-26 settings-29).
 *
 * The same shape as `usePendingInvite`, and mounted beside it above the boot router's branches: capture
 * the URL the app was opened with (cold) or handed (warm), and once the route reaches `'app'`, push it.
 *
 * ⚠ ONLY WHEN THE FIRST SETTLED ROUTE WAS `'auth'`. An athlete who was already signed in had the link
 *   honoured by expo-router itself; pushing it again on a later sign-out/sign-in would drag them back to
 *   a screen they left an hour ago. So the decision is taken once, at the first non-splash route.
 *
 * In memory, not AsyncStorage: this is a convenience, and a link from last week should not ambush
 * somebody on their next launch. (A squad invite, which must survive sign-UP, has its own stash.)
 */
export function usePendingDestination(route: BootRoute): void {
  const router = useRouter();
  const captured = useRef<string | null>(null);
  const firstSettled = useRef<BootRoute | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    const capture = (url: string | null) => {
      if (!alive) return;
      const dest = restorableDestination(url);
      if (dest) captured.current = dest;
    };
    void Linking.getInitialURL().then(capture, () => {});
    const sub = Linking.addEventListener('url', (e) => capture(e.url));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (route === 'splash' || done.current) return;
    if (firstSettled.current == null) firstSettled.current = route;
    if (firstSettled.current !== 'auth') {
      done.current = true;
      return;
    }
    if (route !== 'app') return;
    done.current = true;
    const dest = captured.current;
    captured.current = null;
    // `push`, like the invite: Home sits underneath, so backing out lands somewhere that exists.
    if (dest) router.push(dest as never);
  }, [route, router]);
}
