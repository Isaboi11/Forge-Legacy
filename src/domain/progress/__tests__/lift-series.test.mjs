import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLiftSeries,
  changeLabel,
  currentLabel,
  monthYear,
  pointLabel,
  prDayKey,
  tickIndices,
} from '../lift-series.ts';

/**
 * The lift chart's series.
 *
 * These exist because the thing they replaced looked right and was wrong: a chart built from
 * `personal_records` plotted only the days a record fell, so a lift trained hard for months drew a flat
 * line or none at all, and nothing could ever go down. Each test below pins one rule that, if it
 * regressed, would put a confident and false claim about the athlete's training on their Progress page.
 */

const s = (date, exercise, weightLb, reps) => ({ date, exercise, weightLb, reps });

test('one point per day trained — not one per record', () => {
  const [m] = buildLiftSeries([
    s('2026-01-05', 'Bench Press', 185, 5),
    s('2026-01-05', 'Bench Press', 195, 3),
    s('2026-01-12', 'Bench Press', 185, 5),
    s('2026-01-19', 'Bench Press', 185, 5),
  ]);
  assert.equal(m.points.length, 3, 'three sessions, three points — two of them PR-free');
  assert.equal(m.sessions, 3);
});

test('the value is the heaviest weight moved, never an estimated 1RM', () => {
  const [m] = buildLiftSeries([s('2026-01-05', 'Bench Press', 225, 5)]);
  assert.equal(m.current, 225, 'Epley would have said 262 — a weight this athlete never lifted');
});

test('the top set carries the reps it was moved for', () => {
  const [m] = buildLiftSeries([s('2026-01-05', 'Bench Press', 225, 3), s('2026-01-05', 'Bench Press', 185, 10)]);
  assert.equal(m.points[0].value, 225);
  assert.equal(m.points[0].reps, 3);
});

test('at equal weight the longer set is the top set', () => {
  const [m] = buildLiftSeries([s('2026-01-05', 'Squat', 225, 3), s('2026-01-05', 'Squat', 225, 10)]);
  assert.equal(m.points[0].reps, 10, '"225 × 10" must not be reported as "225 × 3"');
});

test('a lift can go DOWN — the old chart could not express a deload', () => {
  const [m] = buildLiftSeries([
    s('2026-01-05', 'Squat', 315, 3),
    s('2026-01-12', 'Squat', 275, 5),
    s('2026-01-19', 'Squat', 225, 5),
  ]);
  assert.deepEqual(m.points.map((p) => p.value), [315, 275, 225]);
  assert.equal(m.improving, false);
});

test('points are ascending by date whatever order the sets arrive in', () => {
  const [m] = buildLiftSeries([
    s('2026-03-01', 'Row', 100, 8),
    s('2026-01-01', 'Row', 90, 8),
    s('2026-02-01', 'Row', 95, 8),
  ]);
  assert.deepEqual(m.points.map((p) => p.date), ['2026-01-01', '2026-02-01', '2026-03-01']);
});

test('a single session is not "improving" — it has nothing to beat', () => {
  const [m] = buildLiftSeries([s('2026-01-05', 'Bench Press', 185, 5)]);
  assert.equal(m.improving, false);
  assert.equal(changeLabel(m), null, 'and it reports no change rather than "+0"');
});

test('a bodyweight-only lift is charted in reps, not as a flat line at zero', () => {
  const [m] = buildLiftSeries([
    s('2026-01-05', 'Pull-Up', 0, 8),
    s('2026-01-12', 'Pull-Up', null, 10),
    s('2026-01-19', 'Pull-Up', 0, 12),
  ]);
  assert.equal(m.unit, 'reps');
  assert.equal(m.category, 'Bodyweight');
  assert.deepEqual(m.points.map((p) => p.value), [8, 10, 12]);
  assert.equal(m.improving, true);
});

test('a lift that has EVER been loaded stays a weight metric, and its bodyweight days are not points', () => {
  const [m] = buildLiftSeries([
    s('2026-01-05', 'Dip', 0, 12),
    s('2026-01-12', 'Dip', 45, 8),
    s('2026-01-19', 'Dip', 0, 15),
  ]);
  assert.equal(m.unit, 'weight');
  assert.equal(m.points.length, 1, 'plotting 15 (reps) next to 45 (lb) would draw a rise that is not one');
  assert.equal(m.points[0].value, 45);
});

test('a set with no reps recorded is not a data point', () => {
  assert.deepEqual(buildLiftSeries([s('2026-01-05', 'Bench Press', 185, null)]), []);
  assert.deepEqual(buildLiftSeries([s('2026-01-05', 'Bench Press', 185, 0)]), []);
});

test('record days are marked, so the one thing the PR chart said is not lost', () => {
  const prs = new Set([prDayKey('Bench Press', '2026-01-12')]);
  const [m] = buildLiftSeries([s('2026-01-05', 'Bench Press', 185, 5), s('2026-01-12', 'Bench Press', 195, 5)], prs);
  assert.equal(m.points[0].isPR, false);
  assert.equal(m.points[1].isPR, true);
});

test('series are ordered by most recently trained — the default four are the lifts you are on', () => {
  const out = buildLiftSeries([
    s('2026-01-01', 'Old Lift', 100, 5),
    s('2026-06-01', 'Current Lift', 100, 5),
  ]);
  assert.deepEqual(out.map((m) => m.name), ['Current Lift', 'Old Lift']);
});

test('pointLabel and currentLabel say the unit the metric is actually in', () => {
  assert.equal(pointLabel({ unit: 'weight' }, { value: 245, reps: 3 }), '245 lb × 3');
  assert.equal(pointLabel({ unit: 'reps' }, { value: 12, reps: null }), '12 reps');
  assert.equal(pointLabel({ unit: 'reps' }, { value: 1, reps: null }), '1 rep');
  assert.equal(currentLabel({ unit: 'weight', current: 315 }), '315 lb');
  assert.equal(currentLabel({ unit: 'reps', current: 12 }), '12 reps');
});

test('changeLabel states a fall as a fall, and a plateau as holding', () => {
  const down = buildLiftSeries([s('2026-01-05', 'Squat', 315, 3), s('2026-02-05', 'Squat', 275, 3)])[0];
  assert.match(changeLabel(down), /^−40 lb since/);
  const flat = buildLiftSeries([s('2026-01-05', 'Squat', 315, 3), s('2026-02-05', 'Squat', 315, 3)])[0];
  assert.equal(changeLabel(flat), 'Holding at 315 lb');
});

test('monthYear carries the year only outside the current one', () => {
  const today = new Date('2026-08-05T00:00:00Z');
  assert.equal(monthYear('2026-07-14', today), 'Jul');
  assert.equal(monthYear('2025-07-14', today), 'Jul ’25', 'a log spanning years must not show two identical ticks');
});

test('tickIndices gives one tick per point up to four, then the design’s four', () => {
  assert.deepEqual(tickIndices(0), []);
  assert.deepEqual(tickIndices(3), [0, 1, 2]);
  assert.deepEqual(tickIndices(4), [0, 1, 2, 3]);
  const t = tickIndices(10);
  assert.equal(t.length, 4);
  assert.equal(t[0], 0);
  assert.equal(t[3], 9, 'the last point is always labelled');
});
