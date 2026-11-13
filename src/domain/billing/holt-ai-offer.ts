/**
 * The testers' Holt AI offer — Monetization Amendment 011.
 *
 * The comped testers keep Premium free for life (MA7-D6) and may add Holt AI for a tester-only price
 * (MA7-D7, the "Tester AI" subscription group). Until now that add-on was only findable inside P-8. MA11
 * tells them once: the next time Home opens, a page shows what Holt AI adds and what it costs them.
 *
 * ⚠ `@/` IS TYPE-ONLY IN DOMAIN CODE. A runtime `@/` import here breaks `node --test`. Relative `.ts`.
 *
 * ══ ⚠ THE SERVER DECIDES WHO IS OFFERED IT ══
 *
 * `my_paywall_offer()` (0214) returns `tester_ai` for a comped tester who does not hold AI, and nothing for
 * anyone else (MA3-D26: if it cannot be restricted mechanically, it is not offered). `holtAiOfferCandidate`
 * below is only a cheap local pre-filter so Home doesn't call the server for every Free athlete; it never
 * says yes on its own.
 *
 * ══ ⚠ NO PRICE IS WRITTEN HERE ══
 *
 * Every price on the page is the store's own localized string (P8W-D3). The "everyone else" comparison is
 * the regular Premium AI row from the store too, and disappears when the store doesn't return one.
 *
 * ══ ⚠ NEVER A PUSH ══
 *
 * App Store Review Guideline 4.5.4: push notifications may not be used for promotions without the
 * athlete's explicit opt-in to marketing pushes, which Forge does not ask for. The offer is in-app only.
 */

import { CADENCE_COPY, rowForCadence, type Cadence, type StorePlan } from './plans-core.ts';

export const HOLT_AI_OFFER_COPY = {
  eyebrow: 'For our testers',
  title: 'Add Holt AI\nfor less.',
  body: 'You helped build Forge, so your Premium stays free for life. As a thank-you, you can add Holt AI at a price only testers get.',
  benefitsLabel: 'What Holt AI adds',
  cta: 'Add Holt AI',
  notNow: 'Not now',
  noStore: 'Holt AI is added in the Forge Legacy app on iPhone.',
  notOffered: 'This offer isn’t on your account.',
  previewNote: 'Preview. Only comped testers can buy this.',
  onTitle: 'Holt AI is on.',
  onBody: 'Ask Holt anything from the coach button on Home.',
  done: 'Done',
} as const;

/**
 * Should Home ask the server whether to show the offer? Only on a device that can buy (the iOS app with
 * the store), only for a Premium athlete (a comped tester is Premium), and never for one who holds AI.
 */
export function holtAiOfferCandidate(i: { storeAvailable: boolean; tier: string | null; coachAi: boolean }): boolean {
  return i.storeAvailable && i.tier === 'PREMIUM' && !i.coachAi;
}

/** The regular Premium AI row at this cadence, from the store's `default` offering. */
export function regularRow(regular: readonly StorePlan[] | null, cadence: Cadence): StorePlan | null {
  return regular ? rowForCadence(regular, 'premium_ai', cadence) : null;
}

/** "Premium AI is $169.99 / year for everyone else." Null when the store gave no regular row. */
export function everyoneElseLine(regular: StorePlan | null, cadence: Cadence): string | null {
  return regular ? `Premium AI is ${regular.priceLabel} / ${CADENCE_COPY[cadence].per} for everyone else.` : null;
}

/**
 * How much less than the regular Premium AI price, as a whole percent — from the store's own amounts, same
 * currency only. Null unless both are real and the tester price is actually lower.
 */
export function offPercent(tester: StorePlan | null, regular: StorePlan | null): number | null {
  if (!tester || !regular) return null;
  if (tester.currency !== regular.currency) return null;
  const t = tester.amount;
  const r = regular.amount;
  if (!(Number.isFinite(t) && Number.isFinite(r)) || t <= 0 || r <= 0 || t >= r) return null;
  const pct = Math.round((1 - t / r) * 100);
  return pct > 0 ? pct : null;
}

export function offLabel(pct: number | null): string | null {
  return pct == null ? null : `${pct}% off`;
}
