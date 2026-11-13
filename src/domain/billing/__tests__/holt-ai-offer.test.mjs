import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  HOLT_AI_OFFER_COPY,
  everyoneElseLine,
  holtAiOfferCandidate,
  offLabel,
  offPercent,
  regularRow,
} from '../holt-ai-offer.ts';

/*
 * Rows in the exact shape `billing-store.native.ts#toPlan` builds from RevenueCat (US storefront), with the
 * MA7 prices Apple quoted on 11-06: Tester AI $7.99 / $69.99, regular Premium AI $19.99 / $169.99.
 */
const tester = {
  monthly: { slot: 'ai_addon_monthly', priceLabel: '$7.99', pricePerMonthLabel: null, amount: 7.99, currency: 'USD', trialDays: null },
  annual: { slot: 'ai_addon_annual', priceLabel: '$69.99', pricePerMonthLabel: '$5.83', amount: 69.99, currency: 'USD', trialDays: 7 },
};
const regular = [
  { slot: 'premium_monthly', priceLabel: '$14.99', pricePerMonthLabel: null, amount: 14.99, currency: 'USD', trialDays: null },
  { slot: 'premium_annual', priceLabel: '$119.99', pricePerMonthLabel: '$10.00', amount: 119.99, currency: 'USD', trialDays: 7 },
  { slot: 'premium_ai_monthly', priceLabel: '$19.99', pricePerMonthLabel: null, amount: 19.99, currency: 'USD', trialDays: null },
  { slot: 'premium_ai_annual', priceLabel: '$169.99', pricePerMonthLabel: '$14.17', amount: 169.99, currency: 'USD', trialDays: 7 },
];

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const screen = read('../../../app/holt-ai-offer.tsx');
const hook = read('../../../hooks/useHoltAiOfferOnce.ts');
const store = read('../../../lib/holt-ai-offer.ts');
const home = read('../../../app/(tabs)/index.tsx');
const layout = read('../../../app/_layout.tsx');

test('only a Premium athlete without AI, on a device with the store, is even asked about', () => {
  assert.equal(holtAiOfferCandidate({ storeAvailable: true, tier: 'PREMIUM', coachAi: false }), true);
  assert.equal(holtAiOfferCandidate({ storeAvailable: true, tier: 'PREMIUM', coachAi: true }), false);
  assert.equal(holtAiOfferCandidate({ storeAvailable: true, tier: 'FREE', coachAi: false }), false);
  assert.equal(holtAiOfferCandidate({ storeAvailable: false, tier: 'PREMIUM', coachAi: false }), false, 'web / no store');
  assert.equal(holtAiOfferCandidate({ storeAvailable: true, tier: null, coachAi: false }), false, 'unknown tier');
});

test('the comparison is the regular Premium AI row at the same cadence, in the store’s own words', () => {
  assert.equal(regularRow(regular, 'monthly')?.slot, 'premium_ai_monthly');
  assert.equal(regularRow(regular, 'annual')?.slot, 'premium_ai_annual');
  assert.equal(regularRow(null, 'annual'), null);
  assert.equal(everyoneElseLine(regularRow(regular, 'monthly'), 'monthly'), 'Premium AI is $19.99 / month for everyone else.');
  assert.equal(everyoneElseLine(regularRow(regular, 'annual'), 'annual'), 'Premium AI is $169.99 / year for everyone else.');
  assert.equal(everyoneElseLine(null, 'annual'), null, 'no regular row → no line, never a typed price');
});

test('the discount is computed from the store amounts: 60% monthly, 59% yearly', () => {
  assert.equal(offPercent(tester.monthly, regularRow(regular, 'monthly')), 60);
  assert.equal(offPercent(tester.annual, regularRow(regular, 'annual')), 59);
  assert.equal(offLabel(60), '60% off');
  assert.equal(offLabel(null), null);
});

test('no discount is claimed when it isn’t one', () => {
  const r = regularRow(regular, 'monthly');
  assert.equal(offPercent(null, r), null);
  assert.equal(offPercent(tester.monthly, null), null);
  assert.equal(offPercent({ ...tester.monthly, currency: 'EUR' }, r), null, 'different currencies');
  assert.equal(offPercent({ ...tester.monthly, amount: 19.99 }, r), null, 'same price');
  assert.equal(offPercent({ ...tester.monthly, amount: 24.99 }, r), null, 'dearer');
  assert.equal(offPercent({ ...tester.monthly, amount: 0 }, r), null, 'zero');
});

test('copy: no exclamation marks, no “unlimited”, and it promises Premium stays free', () => {
  const all = Object.values(HOLT_AI_OFFER_COPY).join(' ');
  assert.doesNotMatch(all, /!/);
  assert.doesNotMatch(all, /unlimited/i);
  assert.match(HOLT_AI_OFFER_COPY.body, /Premium stays free for life/);
});

test('the screen never types a price or a product id, and sells only the tester offering', () => {
  assert.doesNotMatch(screen, /\$\d/, 'a typed price');
  assert.doesNotMatch(screen, /testerai_|premium_ai_(monthly|annual)_\d/, 'a product id');
  assert.match(screen, /billing\(\)\.purchase\('tester_ai', selected\.slot\)/);
  assert.equal((screen.match(/billing\(\)\.purchase\(/g) ?? []).length, 1, 'one purchase call');
  assert.match(screen, /const canBuy = offered && selected != null/, 'a preview can never buy');
});

test('Apple 3.1.2 + MA6-D11: renewal terms, trial terms and Terms + Privacy sit beside the button', () => {
  assert.match(screen, /AUTO_RENEWAL_NOTE/);
  assert.match(screen, /TRIAL_NOTE/);
  assert.match(screen, /<LegalLinks \/>/);
  assert.match(screen, /LEGAL\.terms\.host/);
  assert.match(screen, /LEGAL\.privacy\.host/);
});

test('unasked, so it closes like a gate and names its way out', () => {
  assert.match(screen, /announced \? \{ onClose: close \} : \{ onBack: close \}/);
  assert.match(screen, /COPY\.notNow/);
});

test('Home opens it once, only when the server answers tester_ai, marking it seen right before the push', () => {
  assert.match(home, /useHoltAiOfferOnce\(\);/);
  assert.match(layout, /<Stack\.Screen name="holt-ai-offer" \/>/);
  assert.match(hook, /offer\?\.offering !== 'tester_ai'\) return;/);
  const mark = hook.indexOf('await markHoltAiOfferSeen(userId);');
  const push = hook.indexOf("router.push('/holt-ai-offer?from=announce');");
  assert.ok(mark > 0 && push > mark, 'mark, then push');
  assert.match(hook, /status === 'ready'/, 'never on an unknown tier (M-7 §10)');
  assert.match(store, /PREFIX \+ userId/, 'seen is per account, not per device');
});

test('Apple 4.5.4: the offer is never a push notification', () => {
  for (const src of [screen, hook, store]) {
    assert.doesNotMatch(src, /expo-notifications|push_outbox|scheduleNotification/);
  }
});
