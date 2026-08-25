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

import { FREESTYLE_NAME, sessionDurationSec, sessionWorkoutName } from '../save-core.ts';
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

// ─────────────────────────────────────────────────────────────────────────────
// 3 · THE SAME REPORT, THROUGH THE FREESTYLE DOOR
//
// PO: *"Kim did a treadmill workout. She manually inputed her results for a 20 min walk. It logged it
// as a freestyle workout and it saved as 28 minutes."* Neither of the two fixes above reaches her,
// because she came in through "Start a freestyle workout" and added the walk from the picker:
//
//   · the session is called `Freestyle Workout` before it holds anything, and the toggle's rename guard
//     compares against the BLOCK's previous derived name — which that is not, so it never fires;
//   · `max(wall, logged)` only ever moves the number UP, and 28 minutes of app-open beats the 20 she
//     typed. Note this is not a regression from the max: the bare wall clock was the same 28.
// ─────────────────────────────────────────────────────────────────────────────

/** A bout recorded by hand — what the card's two manual doors write (`source: 'manual'`). */
const typed = (timeSec, extra = {}) => ({
  kind: 'cardio',
  activity: 'walk',
  name: 'Treadmill Walk',
  modality: 'indoor',
  position: 0,
  section: 'main',
  cardio: { timeSec, distanceMi: 1, source: 'manual', loggedModality: 'indoor' },
  sets: [{ setIndex: 0, weight: null, done: true, durationSec: timeSec, distanceMi: 1, ...extra }],
});

const freestyle = (exercises) => ({
  workoutName: FREESTYLE_NAME,
  activityType: 'strength',
  startedAt: START,
  exercises,
});

test('KIM · a 20-minute walk typed in is twenty minutes, not the 28 the app sat open', () => {
  const s = freestyle([typed(20 * 60)]);
  assert.equal(sessionDurationSec(s, after(28 * 60)), 20 * 60);
  assert.equal(fmtDuration(sessionDurationSec(s, after(28 * 60))), '20 min');
});

test('KIM · and it is not filed under the placeholder the athlete never chose', () => {
  assert.equal(sessionWorkoutName(freestyle([typed(20 * 60)])), 'Treadmill Walk');
});

test('the placeholder the launch paths write is the exact one that gets replaced', () => {
  // Three doors spell this literal out. If any drifts, that door's sessions silently stop being named.
  for (const f of ['../../../app/(tabs)/index.tsx', '../../../app/(tabs)/workouts.tsx', '../../../app/workout.tsx']) {
    const src = readFileSync(path.join(here, f), 'utf8');
    assert.ok(src.includes(`'${FREESTYLE_NAME}'`), `${f} no longer writes ${FREESTYLE_NAME}`);
  }
});

test('a name the athlete chose is never touched', () => {
  const s = { ...freestyle([typed(20 * 60)]), workoutName: 'Morning walk with the dog' };
  assert.equal(sessionWorkoutName(s), 'Morning walk with the dog');
  // …and the clock fix is independent of the name, so it still applies to a renamed session.
  assert.equal(sessionDurationSec(s, after(28 * 60)), 20 * 60);
});

test('a walk PLUS a lift is named for the LIFTING — and keeps the wall clock', () => {
  /*
   * ⚠ THIS TEST ASSERTED THE OPPOSITE UNTIL 2026-08-25, and it was the shipped behaviour rather than an
   * oversight: it read *"a walk PLUS a lift stays freestyle"*, reasoning that "Treadmill Walk" would
   * name the session after the smaller half of it. Right about that, wrong that the placeholder was the
   * better answer — PO: *"It should generate a name based off of what they did that day fully."*
   *
   * The lift still writes no bout, so the wall-clock half of the original test stands unchanged.
   */
  const s = freestyle([
    typed(20 * 60),
    { ...lift([{ setIndex: 0, weight: 95, targetReps: 5, actualReps: 5, done: true }]), catalogKey: 'k-bench', position: 1 },
  ]);
  // One lift, Chest primary — "Chest", not "Chest & Arms". See `session-label`: assistance work does
  // not get to name anything.
  assert.equal(sessionWorkoutName(s, () => ['Chest', 'Triceps']), 'Chest');
  assert.equal(sessionDurationSec(s, after(50 * 60)), 50 * 60);
});

test('KIM · a session NAMED at the door by its first bout is renamed for the whole day', () => {
  /*
   * PO: *"if they do cardio first it shouldn't be named 'outdoor walk' just based off of what they did
   * first."* Home's cardio chooser stamps `deriveName(activity, modality)` before the session contains
   * anything, so the old `!== FREESTYLE_NAME` guard read it as a name the athlete had chosen and left
   * an hour of lifting filed under a ten-minute walk.
   */
  const s = {
    ...freestyle([
      typed(10 * 60),
      { ...lift([{ setIndex: 0, weight: 185, targetReps: 5, actualReps: 5, done: true }]), catalogKey: 'k-row', position: 1 },
    ]),
    workoutName: 'Outdoor Walk',
  };
  assert.equal(sessionWorkoutName(s, () => ['Lats']), 'Back');
});

test('…but a bout that IS the whole session still keeps its own name', () => {
  const s = { ...freestyle([typed(20 * 60)]), workoutName: 'Outdoor Walk' };
  assert.equal(sessionWorkoutName(s, () => []), 'Treadmill Walk', 'the toggle-derived name, not the door one');
});

test('a name the athlete TYPED survives, even beside lifting', () => {
  const s = {
    ...freestyle([
      typed(10 * 60),
      { ...lift([{ setIndex: 0, weight: 185, targetReps: 5, actualReps: 5, done: true }]), catalogKey: 'k-row', position: 1 },
    ]),
    workoutName: 'Leg day with Kim',
  };
  assert.equal(sessionWorkoutName(s, () => ['Lats']), 'Leg day with Kim');
});

test('a catalogue that knows nothing about the movements leaves the name alone', () => {
  // ⚠ THE SAFE DIRECTION. A custom exercise has no catalogue key and therefore no muscles; inventing
  // "Full Body" from nothing would be worse than the placeholder it replaced.
  const s = {
    ...freestyle([{ ...lift([{ setIndex: 0, weight: 95, targetReps: 5, actualReps: 5, done: true }]), position: 0 }]),
    workoutName: 'Outdoor Walk',
  };
  assert.equal(sessionWorkoutName(s, () => undefined), 'Outdoor Walk');
  assert.equal(sessionWorkoutName(s), 'Outdoor Walk', 'and with no resolver at all');
});

test('one TRACKED bout puts the wall clock back in charge of the whole session', () => {
  const s = freestyle([
    { ...typed(20 * 60), cardio: { timeSec: 20 * 60, source: 'tracked' } },
    { ...typed(10 * 60), position: 1 },
  ]);
  assert.equal(sessionDurationSec(s, after(45 * 60)), 45 * 60, 'the app watched part of this session');
});

test('two bouts typed in are summed — there is no measured session for them to sit inside', () => {
  // The wall clock is deliberately LONGER than the sum here, so this fails if the max ever comes back:
  // an hour of app-open around two walks that took 35 minutes between them.
  const s = freestyle([typed(20 * 60), { ...typed(15 * 60), position: 1 }]);
  assert.equal(sessionDurationSec(s, after(60 * 60)), 35 * 60);
});

test('a bout with no source at all keeps the max — absence is not a claim', () => {
  // A session resumed from before the field existed. `max` is the safe direction: never shorter.
  const s = freestyle([{ ...typed(20 * 60), cardio: { timeSec: 20 * 60 } }]);
  assert.equal(sessionDurationSec(s, after(28 * 60)), 28 * 60);
});

test('an un-ended bout names nothing and times nothing', () => {
  // Dropped from the save entirely by `recordedExercises`, so it cannot name the session either.
  const s = freestyle([typed(20 * 60, { done: false })]);
  assert.equal(sessionWorkoutName(s), FREESTYLE_NAME);
  assert.equal(sessionDurationSec(s, after(28 * 60)), 28 * 60);
});

test('saveWorkout sends the derived name, not the raw one', () => {
  const src = readFileSync(path.join(here, '../save.ts'), 'utf8');
  /* ⚠ THE SECOND ARGUMENT IS THE POINT, NOT AN ACCESSORY. `sessionWorkoutName` cannot import the
     catalogue — this module is loaded by `node --test`, which cannot resolve `@/` — so the muscle
     resolver has to be injected HERE. Called with one argument it still works and silently stops being
     able to name anything that contains lifting, which is the failure this guards. */
  assert.match(src, /p_workout_name:\s*sessionWorkoutName\(\s*session\s*,/);
  assert.match(src, /itemByKey\(ex\.catalogKey\)\?\.muscles/);
  // continueWorkout must NOT: it appends to a row that already has a name.
  assert.doesNotMatch(src, /p_workout_name:\s*session\.workoutName/);
});
