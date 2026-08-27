/**
 * The run's half of a shared session — what Brady's post should have said.
 *
 * The defect these hold against: a 3-mile run rendered as "0 Volume (lb) · 32:06 Time · 1 Lifts". The
 * card judged a run by a lifting scorecard, the "1" was the run itself, and the completion had held
 * the real numbers all along.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cardioMarkerLabel,
  cardioStats,
  deriveLead,
  liftsLabel,
  recapCardioFrom,
} from '../recap-stats.ts';

const bout = (over = {}) => ({
  cardio: { distanceMi: 3.01, floors: null, paceSecPerMi: 642, durationSec: 1926, ...over },
});
const lift = { cardio: null };

// ── the snapshot's cardio ───────────────────────────────────────────────────

test('a strength session snapshots no cardio at all', () => {
  assert.equal(recapCardioFrom([lift, lift], 'strength'), null);
});

test('one bout passes through untouched — the common case is not re-derived', () => {
  const c = recapCardioFrom([bout()], 'running');
  assert.equal(c.distanceMi, 3.01);
  assert.equal(c.paceSecPerMi, 642);
  assert.equal(c.activityType, 'running');
});

test('two bouts sum distance, and pace comes from the totals rather than an average of paces', () => {
  // 2 mi in 20:00 + 1 mi in 12:00 = 3 mi in 32:00 → 10:40/mi. Averaging the paces (10:00, 12:00)
  // would say 11:00 and weight the short jog equally with the long run.
  const c = recapCardioFrom(
    [bout({ distanceMi: 2, paceSecPerMi: 600, durationSec: 1200 }), bout({ distanceMi: 1, paceSecPerMi: 720, durationSec: 720 })],
    'running',
  );
  assert.equal(c.distanceMi, 3);
  assert.equal(Math.round(c.paceSecPerMi), 640);
});

test('⚠ a missing distance withholds the combined pace rather than inventing one', () => {
  const c = recapCardioFrom(
    [bout({ distanceMi: 2, durationSec: 1200 }), bout({ distanceMi: null, paceSecPerMi: null, durationSec: 600 })],
    'running',
  );
  assert.equal(c.distanceMi, 2, 'the measured distance still counts');
  assert.equal(c.paceSecPerMi, null, 'a pace over a partial distance is a made-up number');
});

// ── which strip leads ───────────────────────────────────────────────────────

test('pure cardio leads cardio; anything with strength leads strength', () => {
  assert.equal(deriveLead(false, recapCardioFrom([bout()], 'running')), 'cardio');
  assert.equal(deriveLead(true, recapCardioFrom([lift, bout()], 'running')), 'strength');
  assert.equal(deriveLead(true, null), 'strength');
});

// ── the strip itself ────────────────────────────────────────────────────────

test('the run strip is Distance · Pace · Time — the tiles the Activity Detail already chose', () => {
  const st = cardioStats({ distanceMi: 3.01, floors: null, paceSecPerMi: 642, activityType: 'running' }, 1926, 'imperial');
  assert.deepEqual(
    st.map((x) => x.label),
    ['Distance (mi)', 'Pace /mi', 'Time'],
  );
  assert.equal(st[0].value, '3.01');
  assert.equal(st[1].value, '10:42');
  assert.equal(st[2].value, '32:06');
});

test('metric athletes read a friend’s run in their own unit, converted at draw time', () => {
  const st = cardioStats({ distanceMi: 3.01, floors: null, paceSecPerMi: 642, activityType: 'running' }, 1926, 'metric');
  assert.equal(st[0].label, 'Distance (km)');
  assert.equal(st[0].value, '4.84');
  assert.equal(st[1].label, 'Pace /km');
});

test('⚠ a stair bout shows Floors, never a blank distance tile', () => {
  const st = cardioStats({ distanceMi: null, floors: 42, paceSecPerMi: null, activityType: 'stair_climber' }, 900, 'imperial');
  assert.deepEqual(
    st.map((x) => x.label),
    ['Floors', 'Time'],
  );
  assert.equal(st[0].value, '42');
});

test('a pace the data cannot support is dropped, not zero-filled', () => {
  const st = cardioStats({ distanceMi: 1.2, floors: null, paceSecPerMi: null, activityType: 'walking' }, 1400, 'imperial');
  assert.ok(!st.some((x) => x.label.startsWith('Pace')));
});

test('an hour-plus session carries its hours', () => {
  const st = cardioStats({ distanceMi: 8, floors: null, paceSecPerMi: 500, activityType: 'running' }, 4000, 'imperial');
  assert.equal(st[2].value, '1:06:40');
});

// ── the words ───────────────────────────────────────────────────────────────

test('⚠ "1 Lift", not "1 Lifts" — the label agrees with its number', () => {
  assert.equal(liftsLabel(1), 'Lift');
  assert.equal(liftsLabel(2), 'Lifts');
  assert.equal(liftsLabel(0), 'Lifts');
});

test('the marker names the activity, and an unknown one degrades to "Cardio" rather than a barbell', () => {
  assert.equal(cardioMarkerLabel('running'), 'Run');
  assert.equal(cardioMarkerLabel('stair_climber'), 'Climb');
  assert.equal(cardioMarkerLabel('something_new'), 'Cardio');
  assert.equal(cardioMarkerLabel(null), 'Cardio');
});
