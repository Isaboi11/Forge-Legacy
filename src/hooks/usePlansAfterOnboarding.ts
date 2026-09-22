import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { useEntitlementState } from '@/lib/entitlement';
import { takePlansPending } from '@/lib/onboarding-plans';

/**
 * Open the plans screen once, the first time Home mounts after onboarding (ONB-A7-D2, MA6-D9 ①).
 *
 * ⚠ ONLY A FREE ATHLETE SEES IT, AND ONLY ON A KNOWN TIER. `loading` waits; `unknown` leaves the flag
 *   where it is for the next mount (M-7 §10: no upsell when entitlement can't be verified). A Premium
 *   athlete — every account while `default_tier` is PREMIUM — spends the flag and sees nothing.
 *
 * `from=onboarding` gives the screen its close button and its "Continue with Free" link: this surface was
 * not asked for, so leaving it must be as easy as looking at it (App Store 3.1.2 / 5.6).
 */
export function usePlansAfterOnboarding(): void {
  const router = useRouter();
  const { snapshot, status } = useEntitlementState();
  const tier = status === 'ready' ? (snapshot?.tier ?? null) : null;
  const done = useRef(false);

  useEffect(() => {
    if (done.current || tier == null) return;
    done.current = true;
    void takePlansPending().then((pending) => {
      if (pending && tier === 'FREE') router.push('/subscription?from=onboarding');
    });
  }, [tier, router]);
}
