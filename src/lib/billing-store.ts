import type { BillingAdapter } from './billing';

/**
 * Web (and any platform without a native twin): there is no store to ask.
 *
 * Purchases happen in the iOS app only (United States, App Store, launch plan). The web preview renders
 * P-8's Free state with the picker replaced by the "plans aren't available" line — the same path a store
 * outage takes. Kept as its own file so the web bundle never pulls in `react-native-purchases`.
 */
export function createStoreBilling(): BillingAdapter | null {
  return null;
}
