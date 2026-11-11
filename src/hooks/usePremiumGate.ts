import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { fetchCapConfig } from '@/data/entitlement-live';
import { m7Benefits, m7Content, type CapKey } from '@/domain/entitlement/caps-core';
import { ENTITLEMENT_RETRY_MESSAGE, useCapGates, useEntitlementState } from '@/lib/entitlement';
import { track } from '@/lib/analytics';
import { useCeremony, useToast } from './useCeremony';
import { useWorkoutSession } from './useWorkoutSession';

/**
 * The one way a cap becomes an M-7.
 *
 * ══ WHY EVERY GATE GOES THROUGH ONE HOOK ══
 *
 * There are nine gates across eight screens, and M-7's spec carries four rules that are each easy to
 * honour once and forget eight times:
 *
 *   1. **Pre-action** (§2). Check BEFORE opening the flow. The athlete must never choose a photo, name a
 *      squad, or build half a template and only then be told they cannot finish.
 *   2. **Never during an active workout** (§12). Older than every cap here, locked, and it wins.
 *   3. **Never when entitlement cannot be verified** (§10). Show *"Unable to verify your subscription.
 *      Try again."* — an upsell shown to a Premium athlete whose network dropped is the trust failure
 *      M7-D10 was written about.
 *   4. **Never auto-reopen** (§12). Each trigger event evaluates independently; nothing re-fires on its
 *      own.
 *
 * Nine hand-written checks would honour all four in the first screen and three of them by the ninth.
 *
 * ══ HOW TO USE IT ══
 *
 *   const guard = usePremiumGate();
 *   // at the tap that OPENS the flow, never inside it:
 *   if (!guard('photos')) return;
 *   openPicker();
 *
 * `guard` returns true only when the action may proceed. Everything else — the modal, the toast, the
 * silence during a workout — it has already done.
 */
export function usePremiumGate(): (key: CapKey) => boolean {
  const gates = useCapGates();
  const { snapshot, status, refetch } = useEntitlementState();
  const premium = status === 'ready' && snapshot?.tier === 'PREMIUM';
  const { enqueue } = useCeremony();
  const { showToast } = useToast();
  const { session } = useWorkoutSession();
  const inWorkout = session != null;

  return useCallback(
    (key: CapKey): boolean => {
      const gate = gates(key);
      /*
       * ⭐ EVERY GATE CROSSING, ALLOWED OR NOT — because the interesting rows are the allowed ones.
       *
       * ⚠ THIS IS NOT THE CAP-METERING THE PLAN ASKED FOR, AND IT CANNOT BE. `entitlement_config
       *   .default_tier` is `PREMIUM`, so `gate.ok` is always true and `gate.cap` is the PAID ceiling —
       *   a client event fired here can never say what a FREE athlete would have hit. Setting the free
       *   caps from evidence (Decision Queue #22) needs `athlete_live_counts()` read across all
       *   athletes in SQL, which is a `/admin` query, not app code, and does not depend on this line.
       *
       * What this DOES answer, and nothing else can: which gates athletes actually reach, how often, and
       * — once tiers go live — the exact ratio of blocked to allowed at each one. `result` carries the
       * outcome so an allowed crossing and a refused one are never summed by accident.
       */
      track('cap_attempt', {
        cap: key,
        result: gate.ok ? 'allowed' : gate.showRetry ? 'unverified' : inWorkout ? 'suppressed' : 'blocked',
        limit: gate.cap ?? -1,
      });
      if (gate.ok) return true;

      if (gate.showRetry) {
        // ⚠ NOT AN UPSELL (M-7 §10). The action stays blocked and the athlete may retry immediately.
        // Firing M-7 here is how a paying athlete on a bad connection gets asked to pay again.
        showToast(ENTITLEMENT_RETRY_MESSAGE);
        /* And make "Try again" true: read again now, so the next tap has an answer. Only after a read
           has FAILED — while the first one is still in flight (`loading`), a refetch would throw its
           answer away, and a slow network tapped twice would never get one (QA F6, Eva 2026-10-15). */
        if (status === 'unknown') refetch();
        return false;
      }

      if (inWorkout) {
        /*
         * ⚠ BLOCKED SILENTLY, AND THIS IS THE CORRECT READING OF TWO LOCKED RULES (M7-D13).
         *
         * §12 forbids M-7 during W-9–W-16. That rule predates every cap in Amendment 003 and it is not
         * softened by them: an upsell interrupting a working set is the single worst place in the product
         * to ask for money, and it breaks the concentration the whole active-workout surface exists to
         * protect.
         *
         * In practice this branch should be nearly unreachable — the in-workout Holt control is not
         * RENDERED on Free, so there is no tap to guard. It is here for the paths that can be reached
         * mid-session anyway (saving a template from the live session, a check-in photo) where blocking
         * quietly is better than either interrupting or letting the server refuse afterwards.
         */
        return false;
      }

      const { reason } = m7Content(key, gate.cap ?? 0);

      if (premium) {
        /*
         * ⚠ A PREMIUM ATHLETE AT A PAID CEILING IS NOT SOLD ANYTHING (pricing sweep P4; MA3 §4.2, M7-D16).
         * Premium's ceilings (the 5th squad, say) are the top of the ladder for that thing — Premium AI does
         * not raise them. M-7's "Build more. Keep everything." → Upgrade → P-8 offered AI as the answer to
         * a squad limit, which is selling them something that does not do what the pop-up implied. They
         * get the plain fact instead.
         */
        showToast(reason);
        return false;
      }

      /* The upsell is about to be SHOWN. Separate from `cap_attempt` above because a blocked crossing and
         a displayed modal are not the same event — the in-workout branch above blocks without showing
         one, and conflating them would report an upsell the athlete never saw. */
      track('paywall_shown', { cap: key, source: 'gate' });
      /* Premium's rows state the CONFIGURED paid ceilings (pricing sweep C2), so they are read first; an
         unreadable config renders the same rows without numbers rather than holding the modal back. */
      void fetchCapConfig()
        .catch(() => null)
        .then((config) =>
          enqueue({
            // Keyed by the cap so a double tap is the same trigger rather than two stacked modals —
            // `mergeCeremonies` dedupes on id. Distinct trigger events still evaluate independently, which
            // is what §12's "never auto-reopen" actually requires.
            id: `m7-${key}`,
            kind: 'premiumUpsell',
            reason,
            benefits: m7Benefits(key, config?.paid ?? null),
          }),
        );
      return false;
    },
    [gates, status, premium, refetch, enqueue, showToast, inWorkout],
  );
}

/**
 * The one way a tap opens the plan screen (P-8) directly — a PREMIUM tag, a locked screen's "See Premium", form
 * check's plans link: the doors that are not a cap, so never pass through `usePremiumGate` (pricing sweep G5).
 *
 * The same two rules, because a push skipped both:
 *   2. **Never during an active workout** (M7-D13). Said rather than silent — the athlete pressed a button, and a
 *      button that does nothing reads as a frozen app. The line sells nothing.
 *   3. **Never while the plan can't be verified** (M-7 §10). Loading or unknown is not "doesn't have it": the
 *      retry line and a re-read, exactly as the gate does, never the offer.
 *
 * Returns true when it opened.
 */
export function usePlansDoor(): (href?: string) => boolean {
  const router = useRouter();
  const { status, refetch } = useEntitlementState();
  const { showToast } = useToast();
  const { session } = useWorkoutSession();
  const inWorkout = session != null;

  return useCallback(
    (href = '/subscription'): boolean => {
      if (inWorkout) {
        showToast('Finish your workout first');
        return false;
      }
      if (status !== 'ready') {
        showToast(ENTITLEMENT_RETRY_MESSAGE);
        // Only after a read has FAILED — a refetch while the first is in flight throws its answer away (QA F6).
        if (status === 'unknown') refetch();
        return false;
      }
      router.push(href as Parameters<typeof router.push>[0]);
      return true;
    },
    [router, status, refetch, showToast, inWorkout],
  );
}
