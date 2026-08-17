/**
 * cardio-manual-log.test.mjs — the two ways a hand-entered bout used to misreport itself.
 *
 * ══ WHAT THE ATHLETE SAW ══
 *
 * PO: *"Even if you enter an amount for bike or run it logs it for however long you were logging it
 * for. My last bike I logged for 90 min and it said less than one minute."* And, separately: *"It's
 * logging it as an outdoor walk when it's a treadmill."*
 *
 * Two different bugs on one screen, and both only ever bit the MANUAL paths — the two the cardio card
 * offers on purpose ("Skip timer · enter it myself", "Already did it · log manually") so a bout the app
 * never watched can still be recorded:
 *
 *   1. `workouts.duration_sec` was `Date.now() - startedAt`, which for a typed-in bout is the length of
 *      the typing. `fmtDuration` floors anything under a minute to the literal "< 1 min".
 *   2. A cardio-only session is NAMED at the door, from the activity's default modality, and the
 *      Outdoor/Treadmill toggle lives on the card a screen later. Flipping it renamed the block and
 *      left the workout called "Outdoor Walk".
 *
 * Run:  node --test --experimental-strip-types src/domain/workout/__tests__/cardio-manual-log.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { sessionDurationSec } from '../save-core.ts';
import { deriveName } from '../conditioning.ts';
import { fmtDuration } from '../../activity/history-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

const START = '2026-08-17T09:00:00.000Z';
const startedMs = Date.parse(START);
/** `now` as a number of seconds after the session began — the wall clock, made explicit. */
const after = (sec) => startedMs + sec * 1000;

const bout = (timeSec, extra = {}) => ({
  kind: 'cardio',
  activity: 'bike',
  name: 'Outdoor Ride',
  position: 0,
  section: 'main',
  sets: [{ setIndex: 0, weight: null, done: true, durationSec: timeSec, distanceMi: 15, ...extra }],
});

const lift = (sets) => ({
  name: 'Back Squat',
  position: 0,
  section: 'main',
  sets,
});

const session = (exercises, startedAt = START) => ({
  workoutName: 'Outdoor Ride',
  activityType: 'strength',
  startedAt,
  exercises,
});

// ─────────────────────────────────────────────────────────────────────────────
// 1 · THE CLOCK
// ─────────────────────────────────────────────────────────────────────────────

test('a 90-minute bike typed in over forty seconds is ninety minutes', () => {
  const s = session([bout(90 * 60)]);
  assert.equal(sessionDurationSec(s, after(40)), 90 * 60);
  // The exact words the athlete read back, and the reason this was reported at all.
  assert.notEqual(fmtDuration(sessionDurationSec(s, after(40))), '< 1 min');
  assert.equal(fmtDuration(sessionDurationSec(s, after(40))), '1 hr 30 min');
});

test('a tracked bout keeps its wall clock — the two already agree', () => {
  // GPS ran for 30 minutes and the athlete spent 20 seconds confirming the numbers.
  const s = session([bout(30 * 60)]);
  assert.equal(sessionDurationSec(s, after(30 * 60 + 20)), 30 * 60 + 20);
});

test('a strength session with a cool-down walk keeps the wall clock', () => {
  const s = session([
    lift([{ setIndex: 0, weight: 225, targetReps: 5, actualReps: 5, done: true }]),
    { ...bout(10 * 60), activity: 'walk', name: 'Outdoor Walk', position: 1, section: 'cooldown' },
  ]);
  assert.equal(sessionDurationSec(s, after(45 * 60)), 45 * 60, 'the walk is part of the session, not longer than it');
});

test('never shorter — two bouts with rest between them do not shrink the session', () => {
  const s = session([bout(20 * 60), { ...bout(20 * 60), position: 1 }]);
  assert.equal(sessionDurationSec(s, after(70 * 60)), 70 * 60);
});

test('a bout that was never ended does not lengthen anything', () => {
  // Started, walked away from, never logged: no completed set, so nothing was measured. Same rule
  // `recordedExercises` applies when it drops the row entirely.
  const s = session([bout(90 * 60, { done: false })]);
  assert.equal(sessionDurationSec(s, after(40)), 40);
});

test('a timed STRENGTH set is not summed against the session', () => {
  // A 60s plank writes `duration_sec` too. Three of them are not three minutes of training on top of
  // the session that contained them.
  const s = session([
    lift([
      { setIndex: 0, weight: null, targetSec: 60, durationSec: 60, done: true },
      { setIndex: 1, weight: null, targetSec: 60, durationSec: 60, done: true },
      { setIndex: 2, weight: null, targetSec: 60, durationSec: 60, done: true },
    ]),
  ]);
  assert.equal(sessionDurationSec(s, after(120)), 120);
});

test('an unreadable start is zero seconds, never NaN', () => {
  const s = session([], 'not a timestamp');
  const d = sessionDurationSec(s, after(600));
  assert.equal(d, 0);
  assert.ok(Number.isFinite(d), 'NaN would reach save_workout as the session length');
});

test('and an unreadable start still credits the bout that was filed', () => {
  const s = session([bout(45 * 60)], 'not a timestamp');
  assert.equal(sessionDurationSec(s, after(600)), 45 * 60);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 · THE NAME
// ─────────────────────────────────────────────────────────────────────────────

const workoutScreen = () => readFileSync(path.join(here, '../../../app/workout.tsx'), 'utf8');

test('flipping the toggle renames the SESSION, not only the block', () => {
  const src = workoutScreen();
  const fn = src.slice(src.indexOf('const setCardioModality'), src.indexOf('const boutLive'));
  assert.ok(fn.length > 0, 'setCardioModality moved — this test is now pointing at nothing');
  assert.match(fn, /workoutName:/, 'the workout name must move with the modality');
  // The two guards that keep it from overwriting a name the athlete chose.
  assert.match(fn, /cur\.exercises\.length === 1/, 'only when the block IS the session');
  assert.match(fn, /cur\.workoutName === was/, 'only when nobody has renamed it');
});

test('the derived names the guard compares against are the ones the launch paths write', () => {
  // Home writes `deriveName(activity, CARDIO_DEFAULTS[activity].modality)` and the logger falls back to
  // the block's own name, so both sides of `cur.workoutName === was` are this function's output.
  assert.equal(deriveName('walk', 'outdoor'), 'Outdoor Walk');
  assert.equal(deriveName('walk', 'indoor'), 'Treadmill Walk');
  assert.equal(deriveName('bike', 'indoor'), 'Indoor Ride', 'there is no treadmill for a bicycle');
});

test('Track a Run’s hard-coded label still matches what the block derives', () => {
  // `workouts.tsx` passes no `workoutName` on the launch, so the session takes `block.name`. If these
  // two ever diverge the rename guard silently stops firing for that entry point.
  const src = readFileSync(path.join(here, '../../../app/(tabs)/workouts.tsx'), 'utf8');
  assert.match(src, /startWorkout\('Outdoor Run'\)/);
  assert.equal(deriveName('run', 'outdoor'), 'Outdoor Run');
});
