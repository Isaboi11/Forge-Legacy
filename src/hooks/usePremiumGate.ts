import { useCallback } from 'react';

import { m7Benefits, m7Content, type CapKey } from '@/domain/entitlement/caps-core';
import { ENTITLEMENT_RETRY_MESSAGE, useCapGates } from '@/lib/entitlement';
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
  const { enqueue } = useCeremony();
  const { showToast } = useToast();
  const { session } = useWorkoutSession();
  const inWorkout = session != null;

  return useCallback(
    (key: CapKey): boolean => {
      const gate = gates(key);
      if (gate.ok) return true;

      if (gate.showRetry) {
        // ⚠ NOT AN UPSELL (M-7 §10). The action stays blocked and the athlete may retry immediately.
        // Firing M-7 here is how a paying athlete on a bad connection gets asked to pay again.
        showToast(ENTITLEMENT_RETRY_MESSAGE);
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
      enqueue({
        // Keyed by the cap so a double tap is the same trigger rather than two stacked modals —
        // `mergeCeremonies` dedupes on id. Distinct trigger events still evaluate independently, which is
        // what §12's "never auto-reopen" actually requires.
        id: `m7-${key}`,
        kind: 'premiumUpsell',
        reason,
        benefits: m7Benefits(key),
      });
      return false;
    },
    [gates, enqueue, showToast, inWorkout],
  );
}
