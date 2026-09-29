import test from 'node:test';
import assert from 'node:assert/strict';

import { isTestOnly, revenueNote } from '../notes/revenue.ts';

const base = {
  period: '30 days',
  prior: 'prior 30 days',
  includeSandbox: false,
  gross: 1650,
  grossPrev: 897,
  productionEvents: 60,
  sandboxPurchases: 6,
  byProduct: [
    { label: 'Premium · Monthly', gross: 240, events: 16 },
    { label: 'Premium · Annual', gross: 1080, events: 9 },
  ],
};

test('normal: gross, change and the top product, from the numbers given', () => {
  assert.equal(
    revenueNote(base),
    '$1,650 gross over the last 30 days, 84% more than the prior 30 days. Premium · Annual brought in the most: $1,080 of the $1,650, from 9 purchases.',
  );
});

test('empty: no events at all', () => {
  const n = revenueNote({ ...base, productionEvents: 0, sandboxPurchases: 0, gross: 0, grossPrev: 0, byProduct: [] });
  assert.match(n, /^No purchases recorded yet/);
});

test('test data only: sandbox buys but no real events, toggle off', () => {
  const i = { ...base, productionEvents: 0, gross: 0, grossPrev: 0, byProduct: [] };
  assert.equal(isTestOnly(i), true);
  assert.match(revenueNote(i), /^Only TestFlight purchases so far: 6 test buys, none of them real money/);
  assert.equal(isTestOnly({ ...i, includeSandbox: true }), false);
});

test('edge: one product is the whole window, and no prior revenue', () => {
  const n = revenueNote({ ...base, gross: 19.99, grossPrev: 0, byProduct: [{ label: 'Premium AI · Monthly', gross: 19.99, events: 1 }] });
  assert.equal(n, '$20 gross over the last 30 days, up from nothing in the prior 30 days. All of it came from Premium AI · Monthly (1 purchase).');
});

test('edge: nothing this window but something before', () => {
  assert.equal(revenueNote({ ...base, gross: 0, byProduct: [] }), 'No revenue in the last 30 days, down from $897 in the prior 30 days.');
});
