import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fmtLongDate, spanLabel, workoutsLabel } from '../graduation.ts';

/*
 * These formatters are shared by the M-4 ceremony and W-3's sealed record BECAUSE M-4 §3 requires the
 * two to agree. The tests below are therefore also the guarantee that a modal saying "8 weeks" cannot
 * appear in front of a record saying "2 months".
 */

test('fmtLongDate spells the date out, in UTC, with no locale in the way', () => {
  assert.equal(fmtLongDate('2026-01-06T00:00:00Z'), 'January 6, 2026');
  assert.equal(fmtLongDate('2026-12-31T23:59:00Z'), 'December 31, 2026');
  assert.equal(fmtLongDate('2026-08-03'), 'August 3, 2026', 'a bare date works too');
});

test('a missing or unparseable date yields null, so the caller omits the row', () => {
  for (const bad of [null, undefined, '', 'not a date', 'yesterday']) {
    assert.equal(fmtLongDate(bad), null);
  }
});

/**
 * M-4 §8.10 forces a degenerate same-day program to read "1 day" — never "0 days", which describes
 * training that did not happen.
 */
test('spanLabel — days under a week, and never zero', () => {
  const d = (n) => new Date(Date.UTC(2026, 0, 1) + n * 86_400_000).toISOString();
  assert.equal(spanLabel(d(0), d(0)), '1 day');
  assert.equal(spanLabel(d(0), d(1)), '1 day');
  assert.equal(spanLabel(d(0), d(4)), '4 days');
  assert.equal(spanLabel(d(0), d(6)), '6 days');
});

test('spanLabel — weeks to two months, rounding rather than flooring', () => {
  const d = (n) => new Date(Date.UTC(2026, 0, 1) + n * 86_400_000).toISOString();
  assert.equal(spanLabel(d(0), d(7)), '1 week');
  // 13 days is 2 weeks, not 1: a program finished on day 13 did not take one week.
  assert.equal(spanLabel(d(0), d(13)), '2 weeks');
  assert.equal(spanLabel(d(0), d(42)), '6 weeks', 'the length of both shipped programs');
  assert.equal(spanLabel(d(0), d(59)), '8 weeks');
});

test('spanLabel — months past two, because "13 weeks" is a number nobody holds', () => {
  const d = (n) => new Date(Date.UTC(2026, 0, 1) + n * 86_400_000).toISOString();
  assert.equal(spanLabel(d(0), d(60)), '2 months');
  assert.equal(spanLabel(d(0), d(365)), '12 months');
});

test('spanLabel needs both ends — one missing means no Duration row at all', () => {
  assert.equal(spanLabel(null, '2026-01-06T00:00:00Z'), null);
  assert.equal(spanLabel('2026-01-06T00:00:00Z', null), null);
  assert.equal(spanLabel(null, null), null);
  assert.equal(spanLabel('nonsense', '2026-01-06T00:00:00Z'), null);
});

test('a program with no start date still describes itself, minus the span', () => {
  // W-3 and M-4 both omit rather than guess — this is the datum most likely to be missing, because
  // `started_at` is only written when a program is actually started.
  assert.equal(fmtLongDate(null), null);
  assert.equal(spanLabel(null, '2026-03-01T00:00:00Z'), null);
  assert.equal(workoutsLabel(18), '18 workouts completed', 'the rows that CAN be shown still are');
});

test('workoutsLabel pluralises, and refuses a number that is not one', () => {
  assert.equal(workoutsLabel(1), '1 workout completed');
  assert.equal(workoutsLabel(0), '0 workouts completed');
  assert.equal(workoutsLabel(24), '24 workouts completed');
  for (const bad of [null, undefined, -1, NaN]) assert.equal(workoutsLabel(bad), null);
});
