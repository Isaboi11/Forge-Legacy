import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONDITIONING,
  activityFromKey,
  clock,
  conditioningKey,
  isConditioningKey,
  legComplete,
  legPaceSec,
  legProgress,
  parseDistance,
  presetFor,
  targetLabel,
} from '../conditioning.ts';

const mi = (n) => n; // imperial identity, so the target-label tests read plainly

// ── the catalog key round-trip ───────────────────────────────────────────────
test('conditioningKey round-trips through activityFromKey', () => {
  for (const c of CONDITIONING) {
    const k = conditioningKey(c.key);
    assert.equal(isConditioningKey(k), true);
    assert.equal(activityFromKey(k), c.key);
  }
});

test('a strength catalog key is not mistaken for conditioning', () => {
  assert.equal(isConditioningKey('barbell-back-squat'), false);
  assert.equal(activityFromKey('barbell-back-squat'), null);
  assert.equal(activityFromKey(null), null);
  assert.equal(activityFromKey(undefined), null);
});

test('an unknown conditioning key resolves to null rather than a bad activity type', () => {
  assert.equal(activityFromKey('conditioning:skiing'), null);
});

test('only what GPS can actually measure is marked trackable', () => {
  assert.equal(presetFor('running').gps, true);
  // A rowing machine and a pool go nowhere; offering to track them outdoors would be a lie.
  assert.equal(presetFor('rowing').gps, false);
  assert.equal(presetFor('swimming').gps, false);
});

// ── targets ──────────────────────────────────────────────────────────────────
test('targetLabel: distance, time, both, or nothing', () => {
  assert.equal(targetLabel({ distanceMi: 3 }, 'mi', mi), '3.0 mi');
  assert.equal(targetLabel({ durationSec: 1200 }, 'mi', mi), '20:00');
  assert.equal(targetLabel({ distanceMi: 3, durationSec: 1200 }, 'mi', mi), '3.0 mi · 20:00');
  assert.equal(targetLabel({}, 'mi', mi), null, 'an unprescribed leg has no target line');
  assert.equal(targetLabel({ distanceMi: 0, durationSec: 0 }, 'mi', mi), null);
});

test('targetLabel converts through the caller, so metric athletes see kilometres', () => {
  assert.equal(targetLabel({ distanceMi: 1 }, 'km', (m) => m * 1.609344), '1.6 km');
});

// ── completion ───────────────────────────────────────────────────────────────
test('legComplete: an unprescribed leg is done once anything is recorded', () => {
  assert.equal(legComplete({ distanceMi: 0, durationSec: 0 }, {}), false);
  assert.equal(legComplete({ distanceMi: 1.2, durationSec: 0 }, {}), true);
  assert.equal(legComplete({ distanceMi: 0, durationSec: 300 }, {}), true);
});

test('legComplete: a distance target is met by distance, not by time spent', () => {
  assert.equal(legComplete({ distanceMi: 2.9, durationSec: 3600 }, { distanceMi: 3 }), false);
  assert.equal(legComplete({ distanceMi: 3.2, durationSec: 60 }, { distanceMi: 3 }), true, 'overshooting still finishes it');
});

test('legComplete: "3 miles in 20 minutes" is ONE prescription — both halves must be met', () => {
  const target = { distanceMi: 3, durationSec: 1200 };
  assert.equal(legComplete({ distanceMi: 3, durationSec: 900 }, target), false, 'the distance alone is not the whole ask');
  assert.equal(legComplete({ distanceMi: 2, durationSec: 1200 }, target), false);
  assert.equal(legComplete({ distanceMi: 3, durationSec: 1200 }, target), true);
});

// ── progress ─────────────────────────────────────────────────────────────────
test('legProgress: fills against whichever target exists and clamps at one', () => {
  assert.equal(legProgress({ distanceMi: 1.5 }, { distanceMi: 3 }), 0.5);
  assert.equal(legProgress({ durationSec: 600 }, { durationSec: 1200 }), 0.5);
  assert.equal(legProgress({ distanceMi: 9 }, { distanceMi: 3 }), 1);
});

test('legProgress: with two targets it shows the further along, so the bar never goes backwards', () => {
  const p = legProgress({ distanceMi: 2.4, durationSec: 300 }, { distanceMi: 3, durationSec: 1200 });
  assert.ok(Math.abs(p - 0.8) < 1e-9, `got ${p}`);
});

test('legProgress: an unprescribed leg has no bar to fill', () => {
  assert.equal(legProgress({ distanceMi: 5, durationSec: 1800 }, {}), 0);
});

// ── pace ─────────────────────────────────────────────────────────────────────
test('legPaceSec: seconds per mile, or null when a half is missing', () => {
  assert.equal(legPaceSec(3, 1440), 480);
  assert.equal(legPaceSec(0, 1440), null);
  assert.equal(legPaceSec(3, 0), null);
  assert.equal(legPaceSec(null, 600), null);
  assert.equal(legPaceSec(undefined, undefined), null);
});

test('legPaceSec: a short typed treadmill interval still has a real pace', () => {
  // Unlike the live tracker's readout, this runs on a finished leg with a number the athlete entered.
  assert.equal(legPaceSec(0.25, 120), 480);
});

// ── the clock ────────────────────────────────────────────────────────────────
test('clock: minutes under an hour, hours over it', () => {
  assert.equal(clock(0), '0:00');
  assert.equal(clock(64), '1:04');
  assert.equal(clock(1200), '20:00');
  assert.equal(clock(3725), '1:02:05');
});

// ── parsing what someone typed ───────────────────────────────────────────────
test('parseDistance: accepts plain and decimal input', () => {
  assert.equal(parseDistance('3'), 3);
  assert.equal(parseDistance('3.1'), 3.1);
  assert.equal(parseDistance(' 3.1 '), 3.1);
  assert.equal(parseDistance('.5'), 0.5);
});

test('parseDistance: accepts a comma decimal, which many phone keypads produce', () => {
  assert.equal(parseDistance('3,1'), 3.1);
});

test('parseDistance: rejects anything that would store a distance nobody ran', () => {
  assert.equal(parseDistance(''), null);
  assert.equal(parseDistance('abc'), null);
  assert.equal(parseDistance('-3'), null);
  assert.equal(parseDistance('0'), null);
  assert.equal(parseDistance('3.1.4'), null);
  assert.equal(parseDistance('1e3'), null, 'exponent notation is a typo, not an ultramarathon');
  assert.equal(parseDistance('9999'), null, 'beyond any single session');
});
