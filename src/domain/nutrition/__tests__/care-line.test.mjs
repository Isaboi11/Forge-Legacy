import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CARE_LINE_COPY,
  CARE_LOW_FRACTION,
  CARE_MIN_LOW_DAYS,
  CARE_WINDOW_DAYS,
  careDismissedUntil,
  careLineActive,
  careWindow,
  lowDayCount,
  lowDayThreshold,
} from '../care-line.ts';

const today = '2026-09-25';
/** The seven completed days before today, oldest first: 09-18 … 09-24. */
const WINDOW = ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'];

const day = (iso, kcal, logged = true) => ({ iso, kcal, logged });
/** `low` days at 600 kcal, the rest at a normal 2,200. */
const week = (low) => WINDOW.map((iso, i) => day(iso, i < low ? 600 : 2200));
const active = (days, sex = 'female', extra = {}) => careLineActive({ days, sex, todayIso: today, dismissedUntil: null, ...extra });

test('the constants are the approved rule', () => {
  assert.equal(CARE_LOW_FRACTION, 0.75);
  assert.equal(CARE_WINDOW_DAYS, 7);
  assert.equal(CARE_MIN_LOW_DAYS, 4);
});

test('the window is the seven days before today; today is not in it', () => {
  const w = careWindow(today);
  assert.deepEqual(w.days, WINDOW);
  assert.equal(w.from, '2026-09-18');
  assert.equal(w.to, '2026-09-24');
});

test('boundary: 3 low days is silent, 4 shows', () => {
  assert.equal(active(week(3)), false);
  assert.equal(active(week(4)), true);
  assert.equal(active(week(7)), true);
  assert.equal(active(week(0)), false);
});

test('an unlogged day is not a zero: absent rows and logged:false never count', () => {
  // Two low logged days, five days with nothing logged at all.
  const sparse = [day(WINDOW[0], 600), day(WINDOW[1], 600)];
  assert.equal(lowDayCount(sparse, 'female', today), 2);
  assert.equal(active(sparse), false);
  // The same five days handed over as explicit unlogged zeros must read the same.
  const zeros = WINDOW.map((iso, i) => (i < 2 ? day(iso, 600) : day(iso, 0, false)));
  assert.equal(lowDayCount(zeros, 'female', today), 2);
  assert.equal(active(zeros), false);
});

test('four low LOGGED days among unlogged ones still shows', () => {
  const days = [day(WINDOW[0], 500), day(WINDOW[2], 700), day(WINDOW[4], 400), day(WINDOW[6], 800)];
  assert.equal(active(days), true);
});

test('today is excluded, and so is anything outside the window', () => {
  const three = week(3);
  assert.equal(active([...three, day(today, 200)]), false, 'a light morning is not a light day');
  assert.equal(active([...three, day('2026-09-17', 200)]), false, 'eight days ago is outside the week');
  assert.equal(active([...three, day('2026-09-26', 200)]), false, 'the future is not a day');
});

test('a day listed twice counts once', () => {
  const three = week(3);
  assert.equal(active([...three, day(WINDOW[0], 600)]), false);
});

test('thresholds by sex: under 900 female, under 1,125 male and unspecified', () => {
  assert.equal(lowDayThreshold('female'), 900);
  assert.equal(lowDayThreshold('male'), 1125);
  assert.equal(lowDayThreshold('unspecified'), 1125);

  const at = (kcal) => WINDOW.map((iso, i) => day(iso, i < 4 ? kcal : 2200));
  // 1,000 kcal: not low for a woman, low for a man and for unspecified.
  assert.equal(active(at(1000), 'female'), false);
  assert.equal(active(at(1000), 'male'), true);
  assert.equal(active(at(1000), 'unspecified'), true);
  // Exactly at the threshold is not under it.
  assert.equal(active(at(900), 'female'), false);
  assert.equal(active(at(899), 'female'), true);
  assert.equal(active(at(1125), 'male'), false);
  assert.equal(active(at(1124), 'male'), true);
});

test('dismissal: silent until the date, back on it', () => {
  const low = week(5);
  const partial = careDismissedUntil(today, 'partialLogging');
  const ack = careDismissedUntil(today, 'acknowledged');
  assert.equal(partial, '2026-10-25');
  assert.equal(ack, '2026-10-02');
  assert.equal(active(low, 'female', { dismissedUntil: ack }), false);
  assert.equal(active(low, 'female', { dismissedUntil: partial }), false);
  // On the day the dismissal ends, the line may return (with the week as it is then).
  assert.equal(careLineActive({ days: low, sex: 'female', todayIso: '2026-09-25', dismissedUntil: '2026-09-25' }), true);
  // A dismissal that already ran out does nothing.
  assert.equal(active(low, 'female', { dismissedUntil: '2026-09-01' }), true);
});

test('the words: no number, no "disorder", the doctor or dietitian named', () => {
  const all = Object.values(CARE_LINE_COPY).join(' ');
  assert.doesNotMatch(all, /\d/);
  assert.doesNotMatch(all, /disorder/i);
  assert.match(CARE_LINE_COPY.body, /doctor or a registered dietitian/);
  assert.equal(CARE_LINE_COPY.title, 'A quick check-in');
  assert.equal(CARE_LINE_COPY.partialLogging, 'I only log some meals');
  assert.equal(CARE_LINE_COPY.acknowledged, 'Got it');
});
