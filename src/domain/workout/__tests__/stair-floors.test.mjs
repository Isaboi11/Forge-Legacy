import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bumpFloors,
  fmtFloors,
  isLogged,
  parseFloors,
  TRACKS_DISTANCE,
  TRACKS_FLOORS,
} from '../conditioning.ts';
import { buildSaveExercises } from '../save-core.ts';
import { setLine } from '../../activity/detail-core.ts';

/**
 * ══ THE STAIR CLIMBER REPORTS FLOORS, AND FLOORS ARE NOT MILES (0151) ══
 *
 * Two defects are covered here and the second is the dangerous one.
 *
 *   1. A stair bout recorded nothing but a clock. `conditioning.ts` said "floors, not miles" and
 *      `Endurance-Programming-Standard` §0.1 said "stair counts floors", and no floor was ever stored.
 *
 *   2. ⚠ THE LOG FORM SEEDED ITS DISTANCE FIELD FROM `targetMi ?? 1` FOR EVERY ACTIVITY ALIKE, and never
 *      consulted `TRACKS_DISTANCE`. So a stair bout logged without touching that field wrote ONE MILE —
 *      into `workout_sets.distance`, which `save_workout` rolls up into `workouts.distance`, which
 *      mileage goals (0035), distance honors (0078), challenge scoring (0061) and squad totals (0107)
 *      every one of them read as miles. A phantom mile per stair session, silently, everywhere.
 *
 * `floorsNeverBecomesDistance` below is the regression that matters: it fails the moment anybody folds
 * floors back into the distance field for convenience.
 */

const stairSet = (o = {}) => ({
  setIndex: 0,
  weight: null,
  targetReps: 0,
  actualReps: null,
  done: true,
  durationSec: 1450,
  distanceMi: null,
  floors: 48,
  inclinePct: null,
  modality: 'indoor',
  ...o,
});

const stairSession = (setOverrides = {}) => ({
  exercises: [
    {
      name: 'Stair Climb',
      kind: 'cardio',
      activity: 'stair',
      modality: 'indoor',
      section: 'main',
      position: 0,
      sets: [stairSet(setOverrides)],
    },
  ],
});

// ── the model ────────────────────────────────────────────────────────────────

test('the stair climber is the one activity that counts floors, and the one that has no distance', () => {
  assert.equal(TRACKS_FLOORS.stair, true);
  assert.equal(TRACKS_DISTANCE.stair, false);
  for (const k of ['run', 'walk', 'bike', 'row', 'elliptical', 'swim']) {
    assert.equal(TRACKS_FLOORS[k], false, k);
    assert.equal(TRACKS_DISTANCE[k], true, k);
  }
  // Every activity measures exactly one of the two, which is what lets the card pick a field from them.
  for (const k of Object.keys(TRACKS_FLOORS)) {
    assert.equal(TRACKS_FLOORS[k] !== TRACKS_DISTANCE[k], true, `${k} must measure one or the other`);
  }
});

test('a floor count is a whole number — a decimal is a misread, not half a floor', () => {
  assert.equal(parseFloors('48'), 48);
  assert.equal(parseFloors(' 120 '), 120);
  assert.equal(parseFloors('12.5'), null);
  assert.equal(parseFloors('12,5'), null);
  assert.equal(parseFloors('0'), null);
  assert.equal(parseFloors('-3'), null);
  assert.equal(parseFloors(''), null);
  assert.equal(parseFloors('forty'), null);
  // Generous cap for a tower climb, and a mistyped readout still gets refused.
  assert.equal(parseFloors('2000'), 2000);
  assert.equal(parseFloors('2001'), null);
});

test('the floors stepper opens at a seed and clears below one, like every other stepper here', () => {
  assert.equal(bumpFloors(null, 1), 20);
  assert.equal(bumpFloors(null, -1), null);
  assert.equal(bumpFloors(20, 1), 25);
  assert.equal(bumpFloors(5, -1), null, 'stepping under one floor CLEARS rather than pinning to a floor');
  assert.equal(bumpFloors(1995, 1), 2000);
  assert.equal(bumpFloors(2000, 1), 2000, 'capped, not wrapped');
});

test('floors read as floors, and one floor is not one floors', () => {
  assert.equal(fmtFloors(48), '48 floors');
  assert.equal(fmtFloors(1), '1 floor');
  assert.equal(fmtFloors(0), '');
  assert.equal(fmtFloors(null), '');
  assert.equal(fmtFloors(undefined), '');
});

// ── a bout with no distance is still a bout ─────────────────────────────────

test('isLogged accepts a stair bout, which has a clock and no distance at all', () => {
  // The old rule was `distanceMi != null && timeSec != null`. It held only because the form was seeding
  // a mile onto the one activity that has none — the phantom mile was propping up the definition.
  assert.equal(isLogged({ distanceMi: null, floors: 48, timeSec: 1450 }), true);
  assert.equal(
    isLogged({ distanceMi: null, floors: null, timeSec: 1450, loggedModality: 'indoor' }),
    true,
    'a stair bout saved without a floor count is still a session that happened',
  );
});

test('isLogged is widened, never narrowed — every old truth is still true', () => {
  assert.equal(isLogged(null), false);
  assert.equal(isLogged({ distanceMi: 3, timeSec: null }), false, 'no clock, no session');
  assert.equal(isLogged({ distanceMi: 3, timeSec: 1485 }), true);
  assert.equal(
    isLogged({ distanceMi: null, timeSec: 1485 }),
    false,
    'a clock with no evidence of anything else is an unlogged bout, exactly as before',
  );
});

// ── ⚠ THE REGRESSION THAT MATTERS ───────────────────────────────────────────

test('floors never becomes a distance: the save payload carries floors and a NULL distance', () => {
  const [ex] = buildSaveExercises(stairSession());
  const [s] = ex.sets;

  assert.equal(s.floors, 48, 'floors ride in their own key');
  assert.equal(s.distance, null, '⚠ a floor in `distance` is a fabricated mile in every distance total');
  assert.equal(s.distance_unit, null, 'no unit, because floors are not measured in one');
  assert.equal(s.duration_sec, 1450);
  assert.equal(s.reps, null, 'a stair bout is not repetitions');
  assert.equal(s.weight, null);
});

test('a stair bout logged without a floor count still saves, and still writes no distance', () => {
  const [ex] = buildSaveExercises(stairSession({ floors: null }));
  const [s] = ex.sets;
  assert.equal(s.floors, null);
  assert.equal(s.distance, null);
  assert.equal(s.duration_sec, 1450);
});

test('a run is untouched by any of this — distance still travels, floors stay null', () => {
  const run = {
    exercises: [
      {
        name: 'Outdoor Run',
        kind: 'cardio',
        activity: 'run',
        modality: 'outdoor',
        section: 'main',
        position: 0,
        sets: [stairSet({ distanceMi: 3.1, floors: null, modality: 'outdoor' })],
      },
    ],
  };
  const [ex] = buildSaveExercises(run);
  const [s] = ex.sets;
  assert.equal(s.distance, 3.1);
  assert.equal(s.distance_unit, 'mi');
  assert.equal(s.floors, null);
});

// ── history ─────────────────────────────────────────────────────────────────

test('a stair bout reads back in history as floors and a clock, not as a bare duration', () => {
  assert.equal(setLine({ setIndex: 0, weight: null, weightUnit: null, reps: null, durationSec: 1450, floors: 48 }), '48 floors · 24m 10s');
  assert.equal(setLine({ setIndex: 0, weight: null, weightUnit: null, reps: null, durationSec: null, floors: 48 }), '48 floors');
  assert.equal(setLine({ setIndex: 0, weight: null, weightUnit: null, reps: null, durationSec: 1450, floors: 1 }), '1 floor · 24m 10s');
});

test('setLine is unchanged for everything that is not a stair bout', () => {
  assert.equal(setLine({ setIndex: 0, weight: 225, weightUnit: 'lbs', reps: 5 }), '225 lbs × 5');
  assert.equal(setLine({ setIndex: 0, weight: 0, weightUnit: 'lbs', reps: 12 }), 'BW × 12');
  assert.equal(setLine({ setIndex: 0, weight: null, weightUnit: null, reps: null, durationSec: 45 }), '45s');
  assert.equal(
    setLine({ setIndex: 0, weight: null, weightUnit: null, reps: null, durationSec: 45, floors: 0 }),
    '45s',
    'zero floors is not a stair bout — a hold must not be relabelled by an empty column',
  );
});
