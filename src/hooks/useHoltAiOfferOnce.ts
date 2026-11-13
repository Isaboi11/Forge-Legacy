import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { fetchPaywallOffer } from '@/data/entitlement-live';
import { holtAiOfferCandidate } from '@/domain/billing/holt-ai-offer';
import { useAuth } from '@/lib/auth';
import { billingAvailable } from '@/lib/billing';
import { useEntitlementState } from '@/lib/entitlement';
import { hasSeenHoltAiOffer, markHoltAiOfferSeen } from '@/lib/holt-ai-offer';

/**
 * Open the testers' Holt AI offer once, the next time Home mounts (Monetization Amendment 011).
 *
 * ⚠ THE SERVER DECIDES, NOT THIS HOOK. `holtAiOfferCandidate` only skips the server call for athletes who
 *   could never qualify (no store on this device, Free, already on AI). The page opens only when
 *   `my_paywall_offer()` itself answers `tester_ai`.
 *
 * ⚠ ONLY ON A KNOWN TIER. `loading` waits; `unknown` asks nothing (M-7 §10: no upsell when entitlement
 *   can't be verified) and leaves the offer owed for the next mount.
 *
 * ⚠ NEVER BESIDE THE POST-ONBOARDING PLANS SCREEN. That one opens only for a FREE athlete
 *   (`usePlansAfterOnboarding`); this one only for a PREMIUM one, so the two can't both fire on one mount.
 *
 * `from=announce` gives the page a close button and a "Not now": it was not asked for, so leaving it must
 * be as easy as looking at it (App Store 3.1.2 / 5.6).
 */
export function useHoltAiOfferOnce(): void {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const { snapshot, status } = useEntitlementState();
  const tier = status === 'ready' ? (snapshot?.tier ?? null) : null;
  const coachAi = snapshot?.coachAi === true;
  const done = useRef(false);

  useEffect(() => {
    if (done.current || userId == null || tier == null) return;
    done.current = true;
    if (!holtAiOfferCandidate({ storeAvailable: billingAvailable(), tier, coachAi })) return;
    /*
     * ⚠ NO CANCEL FLAG, ON PURPOSE. An entitlement refetch flips `tier` to null and back, which re-runs this
     *   effect; a cancel between "mark seen" and "push" would burn the offer without ever showing it. The
     *   ref already makes it once per mount, and the mark sits immediately before the push.
     */
    void (async () => {
      if (await hasSeenHoltAiOffer(userId)) return;
      const offer = await fetchPaywallOffer();
      if (offer?.offering !== 'tester_ai') return;
      await markHoltAiOfferSeen(userId);
      router.push('/holt-ai-offer?from=announce');
    })();
  }, [userId, tier, coachAi, router]);
}
