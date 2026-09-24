import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import type { OfferingId, PlanSlot, StorePlan } from '@/domain/billing/plans-core';

import { createStoreBilling } from './billing-store';

/**
 * THE STORE SEAM — the one place P-8 talks to a billing platform.
 *
 * ══ WHY THIS IS A PORT AND NOT A REVENUECAT IMPORT ══
 *
 * P8W-D10 chose RevenueCat, and `react-native-purchases` is a **native** module. It exists only in a
 * build made after it was added (build 9), and every OTA to an older binary must keep working. So P-8 is
 * written against this interface, `billing-store.native.ts` builds the real adapter only when the native
 * module is actually present, and every other case — web, Android, build 8 — keeps the honest
 * `UNAVAILABLE_BILLING` below. Same posture as the mic (`useDictation`) and the watch bridge.
 *
 * ══ ⚠ THIS IS NOT WHERE ENTITLEMENT LIVES ══
 *
 * `src/lib/entitlement.tsx` is still the ONE answer to "is this athlete entitled?", and it reads the
 * server. A purchase here does not make anybody Premium; it makes the *store* believe they paid, the
 * RevenueCat webhook (`supabase/functions/revenuecat-webhook`) writes that to our database, and the app
 * then re-reads it. Two files answering the same question is the failure that file's header warns
 * about — this one answers a different question: *what may they buy, and did the purchase go through?*
 *
 * ══ ⚠ WHICH OFFERING IS NOT DECIDED HERE ══
 *
 * The server says which offering an athlete sees (`my_paywall_offer()`, Amendment 007): regular, Early
 * Bird, or the testers' AI add-on. The adapter fetches the one it is told to and never picks for itself —
 * RevenueCat's "current" offering is regular prices for everyone, and reading it would sell a comped
 * tester the full price or skip the Early Bird seats entirely.
 *
 * ══ ⚠ NO PRICE IS FORMATTED ANYWHERE BELOW THIS LINE ══
 *
 * An adapter returns the store's own localized strings. It never builds one (P-8 §80, P8W-D3).
 */

/**
 * Five outcomes, and `unavailable` is the one that matters.
 *
 * `unavailable` is not `failed`. Failed means the store was asked and said no — worth an error and a
 * retry. Unavailable means there is no store integration to ask, which is the honest state of web and of
 * build 8, and a real production state on a device where purchases are restricted. `pending` is Ask to
 * Buy: a parent has to approve, nothing was charged, and nothing is wrong.
 */
export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending' | 'failed' | 'unavailable';
export type RestoreOutcome = 'restored' | 'none' | 'failed' | 'unavailable';

export interface BillingAdapter {
  /**
   * Tell the store who is signed in. RevenueCat's app user id IS the Supabase user id, which is how the
   * webhook knows whose row to write. `null` on sign-out.
   *
   * ⚠ MUST RUN BEFORE ANY PURCHASE. A purchase made under an anonymous id reaches the webhook with no
   * athlete to credit — the athlete paid and the app still says Free.
   */
  identify(userId: string | null): Promise<void>;
  /**
   * The plans in one offering, by package.
   *
   * ⚠ `null` MEANS "COULD NOT BE READ", AND IS NOT AN EMPTY LIST. An empty list is a configured offering
   * with nothing in it; null is an offline device or an SDK that never initialised. P-8 draws neither a
   * picker nor a buy button in either case, but only one of them is worth a retry.
   */
  fetchPlans(offering: OfferingId): Promise<StorePlan[] | null>;
  /** Hands the selected package to the native purchase sheet. The platform owns the transaction (P8W-D7). */
  purchase(offering: OfferingId, slot: PlanSlot): Promise<PurchaseOutcome>;
  /** ⚠ Must restore BOTH entitlements when both are held — Premium AI grants `premium` and `coach_ai`. */
  restore(): Promise<RestoreOutcome>;
}

/**
 * The adapter in force wherever the SDK is not.
 *
 * Deliberately honest rather than convenient: it does not fake plans, and it does not pretend a purchase
 * succeeded. P-8 renders its Free state complete — comparison, usage, the disclosure — with the picker
 * replaced by a line saying plans cannot be reached. That is the same code path a real store outage
 * takes, so it is a state worth having built either way.
 */
export const UNAVAILABLE_BILLING: BillingAdapter = {
  identify: async () => {},
  fetchPlans: async () => null,
  purchase: async () => 'unavailable',
  restore: async () => 'unavailable',
};

/** Built at import: the native module is either linked into this binary or it is not, for its lifetime. */
let adapter: BillingAdapter = createStoreBilling() ?? UNAVAILABLE_BILLING;

/** Swaps the adapter — for tests and previews. The app itself never calls it. */
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
 * Keeps the store's user id equal to the signed-in athlete. Mounted once, in the boot router.
 *
 * An effect with no state: it tells the store and returns. Signing out logs the store out too, so the
 * next athlete on a shared phone does not inherit the last one's purchases.
 */
export function useStoreIdentity(userId: string | null): void {
  useEffect(() => {
    void adapter.identify(userId);
  }, [userId]);
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
