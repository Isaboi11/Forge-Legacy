import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage, type PurchasesStoreProduct } from 'react-native-purchases';

import { isPlanSlot, type OfferingId, type PlanSlot, type StorePlan } from '@/domain/billing/plans-core';

import type { BillingAdapter, PurchaseOutcome, RestoreOutcome } from './billing';

/**
 * The RevenueCat adapter — iOS, build 9 onward.
 *
 * ══ ⚠ ONLY WHEN THE NATIVE MODULE IS REALLY IN THIS BINARY ══
 *
 * `react-native-purchases` is linked into build 9 and not into build 8, and build 8 keeps receiving OTAs
 * until build 9 replaces it. Importing the package is safe on a binary without it (its module scope only
 * reads `NativeModules.RNPurchases`, and tolerates undefined), but *configuring* it is not — so this
 * returns null unless `RNPurchases` exists, and P-8 falls back to its honest "plans aren't available"
 * state. Same posture as the mic (`useDictation`) and the watch bridge.
 *
 * Android is not configured: the launch is the US App Store only, and there is no Google Play app in
 * RevenueCat. Returning null there is the truth, not a gap.
 *
 * ══ THE KEY ══
 *
 * The public iOS SDK key (`appl_…`). RevenueCat designs it to ship inside the app — it can read
 * offerings and start purchases, nothing more. ⚠ NEVER put the secret `sk_…` key or the App Store `.p8`
 * anywhere in `src/`; the secret key belongs to the server alone.
 */
const IOS_PUBLIC_KEY = 'appl_SChYPOoqdleIFEbBYmNtGGdwPoL';

/** RevenueCat's own ids for a device nobody has signed in on. A purchase must never be made under one. */
const isAnonymous = (id: string): boolean => id.startsWith('$RCAnonymousID');

/** The store's trial, in days, when the introductory offer is free. Anything else is not a trial. */
function trialDays(product: PurchasesStoreProduct): number | null {
  const intro = product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const per: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
  const unit = per[intro.periodUnit];
  if (!unit || !(intro.periodNumberOfUnits > 0)) return null;
  return unit * intro.periodNumberOfUnits * Math.max(1, intro.cycles || 1);
}

function toPlan(pkg: PurchasesPackage): StorePlan | null {
  if (!isPlanSlot(pkg.identifier)) return null; // e.g. RevenueCat's own `$rc_*` defaults — never ours
  const p = pkg.product;
  return {
    slot: pkg.identifier,
    priceLabel: p.priceString,
    pricePerMonthLabel: pkg.identifier.endsWith('_annual') ? p.pricePerMonthString ?? null : null,
    amount: p.price,
    currency: p.currencyCode,
    trialDays: trialDays(p),
  };
}

export function createStoreBilling(): BillingAdapter | null {
  if (Platform.OS !== 'ios' || !NativeModules.RNPurchases) return null;

  let configured = false;
  /**
   * ⚠ ONE QUEUE FOR IDENTITY. Sign-in, sign-out and a purchase can all arrive inside the same second on
   * launch; RevenueCat's logIn/logOut are not safe to interleave, and a purchase that starts before the
   * logIn lands is bought by an anonymous id the webhook cannot credit. Every call waits its turn.
   */
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T,>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };

  /** Packages from the last read, so a purchase buys exactly the row the athlete was shown. */
  const shown = new Map<string, PurchasesPackage>();

  async function packagesOf(offering: OfferingId): Promise<PurchasesPackage[] | null> {
    const all = await Purchases.getOfferings();
    const o = all.all[offering];
    if (!o) return [];
    for (const pkg of o.availablePackages) shown.set(`${offering}:${pkg.identifier}`, pkg);
    return o.availablePackages;
  }

  return {
    identify: (userId) =>
      serial(async () => {
        try {
          if (!configured) {
            if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
            Purchases.configure({ apiKey: IOS_PUBLIC_KEY, appUserID: userId ?? undefined });
            configured = true;
            return;
          }
          const current = await Purchases.getAppUserID();
          if (userId) {
            if (current !== userId) await Purchases.logIn(userId);
          } else if (!isAnonymous(current)) {
            await Purchases.logOut();
          }
        } catch {
          // A failed identify leaves the previous id in place; `purchase` below refuses an anonymous one.
        }
      }),

    fetchPlans: (offering) =>
      serial(async () => {
        if (!configured) return null;
        try {
          const pkgs = await packagesOf(offering);
          if (pkgs == null) return null;
          return pkgs.map(toPlan).filter((p): p is StorePlan => p != null);
        } catch {
          return null;
        }
      }),

    purchase: (offering, slot: PlanSlot) =>
      serial(async (): Promise<PurchaseOutcome> => {
        if (!configured) return 'unavailable';
        try {
          // ⚠ Never buy as an anonymous id: the webhook could not tell whose Premium it was.
          if (isAnonymous(await Purchases.getAppUserID())) return 'failed';
          const pkg = shown.get(`${offering}:${slot}`) ?? (await packagesOf(offering))?.find((p) => p.identifier === slot);
          if (!pkg) return 'failed';
          await Purchases.purchasePackage(pkg);
          return 'purchased';
        } catch (e) {
          const err = e as { userCancelled?: boolean | null; code?: string };
          if (err.userCancelled || err.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
          if (err.code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
          if (err.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) return 'unavailable';
          return 'failed';
        }
      }),

    restore: () =>
      serial(async (): Promise<RestoreOutcome> => {
        if (!configured) return 'unavailable';
        try {
          const info = await Purchases.restorePurchases();
          return Object.keys(info.entitlements.active).length > 0 ? 'restored' : 'none';
        } catch {
          return 'failed';
        }
      }),
  };
}
