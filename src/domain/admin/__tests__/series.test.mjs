import test from 'node:test';
import assert from 'node:assert/strict';

import {
  column,
  fillMissingDays,
  longDay,
  parseDayLocal,
  rangeToDays,
  shortDay,
  sumColumn,
  toDayKey,
  weekLabel,
} from '../series.ts';

/**
 * Day handling for the operator dashboard.
 *
 * The first test in this file is the one that matters. Everything else is housekeeping.
 */

test('parseDayLocal does NOT shift a day — the UTC-midnight trap', () => {
  // `new Date('2026-08-11')` is parsed as UTC midnight per spec. In any timezone west of Greenwich
  // that renders as Aug 10 — so every bucket on the chart would be silently labelled a day early, on
  // the one screen whose whole job is to be trusted about dates. Postgres hands these back already
  // bucketed in the dashboard timezone; re-parsing as UTC would undo that work.
  const d = parseDayLocal('2026-08-11');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 7, 'August is month 7');
  assert.equal(d.getDate(), 11, 'the day must survive the parse in every timezone');

  // And the label built from it agrees, which is what the reader actually sees.
  assert.equal(shortDay('2026-08-11'), 'Aug 11');
  assert.equal(longDay('2026-08-11'), 'Aug 11, 2026');
  assert.equal(weekLabel('2026-08-10'), 'Aug 10');
});

test('parseDayLocal round-trips through toDayKey', () => {
  for (const iso of ['2026-01-01', '2026-12-31', '2026-08-11', '2024-02-29']) {
    assert.equal(toDayKey(parseDayLocal(iso)), iso, iso);
  }
});

test('parseDayLocal rejects junk instead of returning an Invalid Date', () => {
  // An Invalid Date propagates as the string "NaN" into a chart label rather than failing loudly.
  assert.equal(parseDayLocal(null), null);
  assert.equal(parseDayLocal(undefined), null);
  assert.equal(parseDayLocal(''), null);
  assert.equal(parseDayLocal('not-a-date'), null);
  assert.equal(parseDayLocal('2026-13-01'), null, 'month 13');
  assert.equal(parseDayLocal('2026-02-31'), null, 'Feb 31 must not roll into March');
  assert.equal(parseDayLocal('2025-02-29'), null, 'not a leap year');
  assert.equal(shortDay('nope'), '', 'a bad key labels as empty, never "NaN"');
});

test('parseDayLocal accepts a full timestamp by taking its date part', () => {
  // The RPCs return `date`, but a jsonb round-trip can widen one to a timestamp string.
  assert.equal(toDayKey(parseDayLocal('2026-08-11T00:00:00+00:00')), '2026-08-11');
});

test('rangeToDays maps the segmented control, and falls back rather than throwing', () => {
  assert.equal(rangeToDays('7d'), 7);
  assert.equal(rangeToDays('30d'), 30);
  assert.equal(rangeToDays('90d'), 90);
  assert.equal(rangeToDays('1y'), 365);
  assert.equal(rangeToDays('nonsense'), 30);
});

test('fillMissingDays inserts zeros and keeps the range in oldest-first order', () => {
  // A chart that silently skips empty days does not look broken — it looks like a smooth trend. The
  // days with nothing on them are exactly the ones worth seeing.
  const rows = [
    { d: '2026-08-09', signups: 4 },
    { d: '2026-08-11', signups: 2 },
  ];
  const out = fillMissingDays(rows, 4, { signups: 0 }, '2026-08-11');

  assert.deepEqual(
    out.map((r) => r.d),
    ['2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11'],
  );
  assert.deepEqual(
    out.map((r) => r.signups),
    [0, 4, 0, 2],
  );
});

test('fillMissingDays crosses a month boundary correctly', () => {
  const out = fillMissingDays([{ d: '2026-09-01', n: 5 }], 3, { n: 0 }, '2026-09-01');
  assert.deepEqual(
    out.map((r) => r.d),
    ['2026-08-30', '2026-08-31', '2026-09-01'],
  );
  assert.equal(out[2].n, 5);
});

test('fillMissingDays handles empty and zero-length input', () => {
  assert.deepEqual(fillMissingDays(null, 2, { n: 0 }, '2026-08-11').map((r) => r.n), [0, 0]);
  assert.deepEqual(fillMissingDays([], 0, { n: 0 }, '2026-08-11'), []);
});

test('column reads nulls as 0 so one missing day cannot break a chart', () => {
  const rows = [{ n: 3 }, { n: null }, { n: 5 }, {}];
  assert.deepEqual(column(rows, 'n'), [3, 0, 5, 0]);
  assert.equal(sumColumn(rows, 'n'), 8);
  assert.deepEqual(column(null, 'n'), []);
  assert.equal(sumColumn(null, 'n'), 0);
});
