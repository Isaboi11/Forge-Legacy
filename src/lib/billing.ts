import { Linking, Platform } from 'react-native';

import type { PlanSlot, StorePlan } from '@/domain/billing/plans-core';

/**
 * THE STORE SEAM — the one place P-8 talks to a billing platform.
 *
 * ══ WHY THIS IS A PORT AND NOT A REVENUECAT IMPORT ══
 *
 * P8W-D10 chose RevenueCat, and `react-native-purchases` is a **native** module: adding it changes the
 * fingerprint, and the moment it lands every OTA to the build in testers' hands stops being deliverable
 * until a new native binary ships. Stage 1 of the launch plan puts the app in 20 testers' hands with no
 * paywall at all, so the screen has to be able to exist and ship over the air before the SDK does.
 *
 * So P-8 is written against this interface. `registerBilling()` swaps the real adapter in from
 * `_layout.tsx` when the SDK arrives — Phase E 4.2, in the same pass as the next native build — and the
 * screen does not change.
 *
 * ══ ⚠ THIS IS NOT WHERE ENTITLEMENT LIVES ══
 *
 * `src/lib/entitlement.tsx` is still the ONE answer to "is this athlete entitled?", and it reads the
 * server. A purchase here does not make anybody Premium; it makes the *store* believe they paid, and
 * the server-side entitlement is what the app then re-reads. Two files answering the same question is
 * the failure that file's header warns about — this one answers a different question: *what may they
 * buy, and did the purchase go through?*
 *
 * ══ ⚠ NO PRICE IS FORMATTED ANYWHERE BELOW THIS LINE ══
 *
 * An adapter returns the store's own localized strings. It never builds one (P-8 §80, P8W-D3).
 */

/**
 * Four outcomes, and the fourth is the one that matters.
 *
 * `unavailable` is not `failed`. Failed means the store was asked and said no — worth an error and a
 * retry. Unavailable means there is no store integration to ask, which is the honest state of this
 * build today and a real production state on a device where purchases are restricted. Collapsing them
 * would show "Something went wrong" for a condition where nothing went wrong at all.
 */
export type PurchaseOutcome = 'purchased' | 'cancelled' | 'failed' | 'unavailable';
export type RestoreOutcome = 'restored' | 'none' | 'failed' | 'unavailable';

export interface BillingAdapter {
  /**
   * The plans on offer, mapped onto P-8's four slots.
   *
   * ⚠ `null` MEANS "COULD NOT BE READ", AND IS NOT AN EMPTY LIST. An empty list is a configured offering
   * with nothing in it; null is an offline device or an SDK that never initialised. P-8 draws neither a
   * picker nor a buy button in either case, but only one of them is worth a retry.
   */
  fetchPlans(): Promise<StorePlan[] | null>;
  /** Hands the selected slot to the native purchase sheet. The platform owns the transaction (P8W-D7). */
  purchase(slot: PlanSlot): Promise<PurchaseOutcome>;
  /** ⚠ Must return BOTH entitlements when both are held — Premium and Coach AI are concurrent (MA3-D3). */
  restore(): Promise<RestoreOutcome>;
}

/**
 * The adapter in force before the SDK exists.
 *
 * Deliberately honest rather than convenient: it does not fake plans, and it does not pretend a purchase
 * succeeded. P-8 renders its Free state complete — comparison, usage, the disclosure — with the picker
 * replaced by a line saying plans cannot be reached. That is the same code path a real store outage
 * takes, so it is a state worth having built either way.
 */
export const UNAVAILABLE_BILLING: BillingAdapter = {
  fetchPlans: async () => null,
  purchase: async () => 'unavailable',
  restore: async () => 'unavailable',
};

let adapter: BillingAdapter = UNAVAILABLE_BILLING;

/** Called once at app start when a real billing SDK is present. */
export function registerBilling(next: BillingAdapter): void {
  adapter = next;
}

export function billing(): BillingAdapter {
  return adapter;
}

/** Whether a real store is wired up. Drives copy, never a gate. */
export function billingAvailable(): boolean {
  return adapter !== UNAVAILABLE_BILLING;
}

/**
 * Manage Subscription — the native OS subscription settings (P-8 §5.2).
 *
 * ⚠ NEEDS NO SDK, AND SO IT WORKS TODAY. This is a deep link, not a transaction: the platform owns
 * cancellation and plan changes, and Forge deliberately builds no substitute for either. It exits the
 * app; P-8 re-checks entitlement when the athlete comes back, in case they cancelled while they were
 * gone.
 *
 * There is no confirmation alert — it is navigation, not a destructive action.
 */
export async function openManageSubscriptions(): Promise<boolean> {
  const url =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
