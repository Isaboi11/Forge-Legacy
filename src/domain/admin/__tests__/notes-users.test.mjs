import test from 'node:test';
import assert from 'node:assert/strict';

import { planStatus, planWithoutProduct, usersNote } from '../notes/users.ts';

test('note: normal', () => {
  assert.equal(usersNote({ athletes: 144, new30: 22, paying: 35, trials: 4, lapsed: 4 }), '144 athletes, 22 new in the last 30 days. 35 paying, 4 on a trial, 4 lapsed.');
});

test('note: empty', () => {
  assert.match(usersNote({ athletes: 0, new30: 0, paying: 0, trials: 0, lapsed: 0 }), /^No athletes yet/);
});

test('note: edge — athletes but no purchases, singular', () => {
  assert.equal(usersNote({ athletes: 1, new30: 1, paying: 0, trials: 0, lapsed: 0 }), '1 athlete, 1 new in the last 30 days. Nobody has bought a subscription yet.');
});

const row = { tier: 'FREE', premium_kind: null, premium_ai: false, founder_seat: null, comped: false, product: null, period_type: null, last_paid_until: null };

test('status: store subscription decides first, then entitlement', () => {
  assert.equal(planStatus({ ...row, tier: 'PREMIUM', product: 'premium_monthly', period_type: 'NORMAL' }), 'Paying');
  assert.equal(planStatus({ ...row, tier: 'PREMIUM', product: 'premium_monthly', period_type: 'TRIAL' }), 'Trial');
  assert.equal(planStatus({ ...row, last_paid_until: '2026-09-21T00:00:00Z' }), 'Lapsed');
  assert.equal(planStatus({ ...row, tier: 'PREMIUM', premium_kind: 'GRANT', comped: true }), 'Comped');
  assert.equal(planStatus({ ...row, tier: 'PREMIUM', premium_kind: 'FOUNDER', founder_seat: 4 }), 'Founder');
  assert.equal(planStatus(row), 'Free');
});

test('plan without a product names where Premium came from', () => {
  assert.equal(planWithoutProduct({ ...row, tier: 'PREMIUM', premium_kind: 'GRANT' }), 'Premium · granted');
  assert.equal(planWithoutProduct({ ...row, tier: 'PREMIUM', premium_kind: 'FOUNDER', founder_seat: 12, premium_ai: true }), 'Premium AI · founder seat 12');
  assert.equal(planWithoutProduct({ ...row, tier: 'PREMIUM' }), 'Premium · default for everyone');
  assert.equal(planWithoutProduct(row), 'Free');
});
