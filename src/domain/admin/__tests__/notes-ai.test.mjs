import test from 'node:test';
import assert from 'node:assert/strict';

import { aiNote } from '../notes/ai.ts';

const base = {
  period: '30 days',
  days: 30,
  calls: 643,
  cost: 17.97,
  athletes: 32,
  premiumAi: 11,
  priceOver: 5,
  byFeature: [
    { label: 'Holt chat', calls: 214, cost: 3.1 },
    { label: 'Holt program', calls: 71, cost: 3.4 },
    { label: 'Meal photo', calls: 72, cost: 2.43 },
  ],
};

test('normal: cost per Premium AI athlete, busiest and dearest feature', () => {
  assert.equal(
    aiNote(base),
    'AI is costing you about $1.63 per Premium AI athlete a month, against the $5.00 extra they pay. Holt chat is the busiest feature; Holt program is the most expensive per call.',
  );
});

test('empty: no calls', () => {
  assert.match(aiNote({ ...base, calls: 0, cost: 0, byFeature: [] }), /^No AI calls yet/);
});

test('edge: no Premium AI athletes, one feature, 7-day window', () => {
  const n = aiNote({ ...base, days: 7, period: '7 days', premiumAi: 0, athletes: 1, cost: 0.5, calls: 3, byFeature: [{ label: 'Form check', calls: 3, cost: 0.5 }] });
  assert.equal(n, 'AI cost $0.50 over the last 7 days, across 1 athlete. Form check is the only feature used.');
});

test('edge: the busiest feature is also the dearest', () => {
  const n = aiNote({ ...base, byFeature: [{ label: 'Holt chat', calls: 10, cost: 5 }, { label: 'Holt day', calls: 2, cost: 0.1 }] });
  assert.match(n, /Holt chat is both the busiest feature and the most expensive per call\.$/);
});
