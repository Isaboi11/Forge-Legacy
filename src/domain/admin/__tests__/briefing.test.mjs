import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBriefing, deltaNote, rollWeekly } from '../briefing.ts';

const base = {
  now: new Date(2026, 8, 28, 9, 0),
  range: '30D',
  gross: 1650,
  grossPrev: 897,
  paying: 35,
  newPaid: 28,
  churned: 4,
  productionEvents: 60,
  sandboxPurchases: 6,
  lastPurchaseDaysAgo: 0,
  aiCost: 17.97,
  aiCostPrev: 14.15,
  aiRevenueMonthly: 179.91,
  criticalOpen: 3,
  oldestCriticalDays: 2,
  newUserReports: 4,
  newCrashGroups: 1,
  reportsWaiting: 0,
  oldestReportDays: null,
  overdue: [{ id: 'k1', name: 'Iron Temple Gym', daysOver: 2 }],
  downloads: 242,
  downloadsPrev: 240,
  rating: 4.7,
  ascConfigured: true,
  ascLastOk: true,
  ascMessage: null,
};

test('a good month reads as the design does, from the numbers', () => {
  const b = buildBriefing(base);
  assert.equal(b.greeting, 'Morning. It was a good month.');
  assert.equal(b.summary, 'You brought in $1,650 over the last 30 days, 84% more than the prior 30 days. 35 people are paying now, 28 of them new in this window.');
  assert.equal(b.watching, 'Two things I’m watching for you. AI spend went up 27% to $17.97, still under the $180 a month Premium AI brings in. 4 people cancelled, which puts churn at 10.3%.');
  assert.deepEqual(b.attention.map((a) => a.title), ['Start with the 3 critical bugs', 'Follow up with Iron Temple Gym', 'Sort the 4 new user reports and 1 new crash']);
  assert.equal(b.attention[1].arg, 'k1');
  assert.equal(b.signoff, 'After that you’re clear. Downloads, ratings and revenue all look healthy.');
});

test('before the first real purchase it says so, and never invents revenue', () => {
  const b = buildBriefing({ ...base, productionEvents: 0, gross: 0, grossPrev: 0, paying: 0, newPaid: 0, churned: 0 });
  assert.equal(b.greeting, 'Morning. It’s early days.');
  assert.match(b.summary, /^No real purchases yet\. There have been 6 TestFlight test buys, which aren’t real money\./);
  assert.ok(!/cancelled/.test(b.watching ?? ''), 'no churn sentence without real subscribers');
});

test('no sandbox buys either: the plain empty sentence', () => {
  const b = buildBriefing({ ...base, productionEvents: 0, sandboxPurchases: 0, gross: 0, grossPrev: 0, paying: 0, newPaid: 0, churned: 0 });
  assert.equal(b.summary, 'No purchases yet. Your first one will show here the moment it happens.');
});

test('nothing to do → no attention, no sign-off', () => {
  const b = buildBriefing({ ...base, criticalOpen: 0, overdue: [], newUserReports: 0, newCrashGroups: 0 });
  assert.equal(b.attention.length, 0);
  assert.equal(b.signoff, null);
});

test('missing figures drop their sentences instead of guessing', () => {
  const b = buildBriefing({ ...base, aiCost: null, aiCostPrev: null, churned: 0, downloads: null, downloadsPrev: null, rating: null });
  assert.equal(b.watching, null);
  assert.equal(b.signoff, 'After that you’re clear. Revenue looks healthy.');
});

test('a stale webhook and a failed App Store sync surface as tasks', () => {
  const b = buildBriefing({ ...base, lastPurchaseDaysAgo: 9, ascLastOk: false, ascMessage: '403 key role lacks access (reviews)' });
  const titles = b.attention.map((a) => a.title);
  assert.ok(titles.includes('Check the RevenueCat webhook'));
  assert.ok(titles.includes('The last App Store sync failed'));
});

test('an unconnected App Store is a setup item, not an alarm', () => {
  const b = buildBriefing({ ...base, ascConfigured: false, ascLastOk: null });
  assert.equal(b.attention.at(-1).tag, 'Set up');
});

test('deltaNote: glyph, sign and prior window; costs flip the tone', () => {
  assert.deepEqual(deltaNote(1650, 897, '30D'), { text: '▲ +84% vs prior 30 days', tone: 'good' });
  assert.deepEqual(deltaNote(17.97, 14.15, '30D', { costUp: true }), { text: '▲ +27% vs prior 30 days · cost up', tone: 'bad' });
  assert.deepEqual(deltaNote(5, 10, '7D'), { text: '▼ −50% vs prior 7 days', tone: 'bad' });
  assert.equal(deltaNote(0, 0, '30D'), null);
  assert.deepEqual(deltaNote(3, 0, '1Y'), { text: 'New vs prior year', tone: null });
});

test('rollWeekly sums days into weeks counted back from today, so the newest week is always whole', () => {
  const days = Array.from({ length: 10 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
  const r = rollWeekly([1, 1, 1, 1, 1, 1, 1, 2, 2, 2], days);
  assert.deepEqual(r.values, [3, 10]);
  assert.deepEqual(r.days, ['2026-09-01', '2026-09-04']);
});
