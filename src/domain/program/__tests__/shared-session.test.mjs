import test from 'node:test';
import assert from 'node:assert/strict';

import { matchSharedShapeToSlot } from '../shared-session.ts';

const ex = (name, catalogKey) => ({ name, catalogKey, sets: 3, reps: 8 });
const day = (letter, name, main) => ({ letter, name, warmup: [], main, cooldown: [] });

/** Push / Pull / Legs, three built days a week, four weeks. */
const structure = {
  name: 'Building Your Foundation',
  weeks: 4,
  daysPerWeek: 3,
  days: [
    day('A', 'Push', [ex('Bench press', 'barbell-bench-press'), ex('Overhead Press', 'barbell-overhead-press')]),
    day('B', 'Pull', [ex('Barbell Row', 'barbell-row'), ex('Lat Pulldown', 'lat-pulldown')]),
    day('C', 'Legs', [ex('Back Squat', 'barbell-back-squat'), ex('Romanian Deadlift', 'romanian-deadlift')]),
  ],
};

const shape = (...pairs) => pairs.map(([name, catalogKey]) => ({ name, catalogKey }));

/** Every slot before (week, day) trained — i.e. the athlete is standing on it. */
const doneUpTo = (weekIndex, dayIndex) => {
  const marks = [];
  for (let w = 0; w <= weekIndex; w += 1) {
    for (let d = 0; d < 3; d += 1) {
      if (w === weekIndex && d >= dayIndex) break;
      marks.push({ weekIndex: w, dayIndex: d, state: 'completed' });
    }
  }
  return marks;
};

// ─────────────────────────────────────────────────────────────────────────────
// THE FIELD REPORT — two athletes finish Week 2 · Day 1 together
// ─────────────────────────────────────────────────────────────────────────────

test('the shared session the athlete was next owed is credited to that exact slot', () => {
  // Week 1 done, week 2 not started: the next open slot is week index 1, day index 0 — "Push".
  const marks = doneUpTo(1, 0);
  const got = matchSharedShapeToSlot(
    structure,
    marks,
    shape(['Barbell Bench Press', 'barbell-bench-press'], ['Barbell Overhead Press', 'barbell-overhead-press']),
  );
  assert.deepEqual(got, { weekIndex: 1, dayIndex: 0 });
});

test('the invite renames every lift and it still matches — the catalogue key is the identity', () => {
  /* `fetchPlannedSession` builds the snapshot through `exerciseNameFor(catalogKey)`, so the guest
     receives the catalogue's words while their own program keeps its author's. A name-only comparison
     would credit nothing at all — which is exactly the class of bug `saveWorkout` documents. */
  const got = matchSharedShapeToSlot(
    structure,
    [],
    shape(['Barbell Bench Press', 'barbell-bench-press'], ['Standing Military Press', 'barbell-overhead-press']),
  );
  assert.deepEqual(got, { weekIndex: 0, dayIndex: 0 });
});

test('a shape with no keys falls back to the exact name', () => {
  const got = matchSharedShapeToSlot(structure, doneUpTo(0, 2), shape(['back squat', null], ['Romanian Deadlift', null]));
  assert.deepEqual(got, { weekIndex: 0, dayIndex: 2 });
});

test('a live session carrying MORE than the day still covers it', () => {
  // Joining someone mid-workout snapshots everything they had on screen, warm-ups included.
  const got = matchSharedShapeToSlot(
    structure,
    [],
    shape(['Band Pull-Apart', 'band-pull-apart'], ['Barbell Bench Press', 'barbell-bench-press'], ['Barbell Overhead Press', 'barbell-overhead-press'], ['Cable Fly', 'cable-fly']),
  );
  assert.deepEqual(got, { weekIndex: 0, dayIndex: 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT MUST NOT BE CREDITED
// ─────────────────────────────────────────────────────────────────────────────

test('a partial session credits nothing — one prescribed lift missing is not that day', () => {
  const got = matchSharedShapeToSlot(structure, [], shape(['Barbell Bench Press', 'barbell-bench-press']));
  assert.equal(got, null);
});

test('a workout that matches no day at all credits nothing', () => {
  const got = matchSharedShapeToSlot(structure, [], shape(['Bicep Curl', 'dumbbell-curl'], ['Tricep Pushdown', 'cable-pushdown']));
  assert.equal(got, null);
});

test('an empty shape credits nothing — a freestyle shared session is not a program day', () => {
  assert.equal(matchSharedShapeToSlot(structure, [], []), null);
});

test('a slot already trained is never credited twice', () => {
  const legs = shape(['Barbell Back Squat', 'barbell-back-squat'], ['Romanian Deadlift', 'romanian-deadlift']);
  // Week 1 Legs done. The same shape must land on WEEK 2's legs day, not week 1's.
  const marks = [...doneUpTo(0, 2), { weekIndex: 0, dayIndex: 2, state: 'completed' }];
  assert.deepEqual(matchSharedShapeToSlot(structure, marks, legs), { weekIndex: 1, dayIndex: 2 });
});

test('a SKIPPED slot is touched, not open — 0119’s rule holds here too', () => {
  const push = shape(['Barbell Bench Press', 'barbell-bench-press'], ['Barbell Overhead Press', 'barbell-overhead-press']);
  assert.deepEqual(matchSharedShapeToSlot(structure, [{ weekIndex: 0, dayIndex: 0, state: 'skipped' }], push), {
    weekIndex: 1,
    dayIndex: 0,
  });
});

test('a rest day is never credited — an empty prescription is covered by nothing', () => {
  const withRest = {
    ...structure,
    weeks: 1,
    daysPerWeek: 2,
    days: [day('A', 'Rest', []), day('B', 'Push', [ex('Bench press', 'barbell-bench-press')])],
  };
  /* `trainingDays` drops the empty day before the schedule is built, so "Push" is day index 0 — and the
     point of the test is that nothing lands on a slot with no main work. */
  assert.deepEqual(matchSharedShapeToSlot(withRest, [], shape(['Barbell Bench Press', 'barbell-bench-press'])), {
    weekIndex: 0,
    dayIndex: 0,
  });
});

test('a finished program has no open slot left to credit', () => {
  const oneWeek = { ...structure, weeks: 1 };
  const marks = [0, 1, 2].map((dayIndex) => ({ weekIndex: 0, dayIndex, state: 'completed' }));
  assert.equal(
    matchSharedShapeToSlot(oneWeek, marks, shape(['Barbell Back Squat', 'barbell-back-squat'], ['Romanian Deadlift', 'romanian-deadlift'])),
    null,
  );
});

test('open slots are walked in schedule order, so the earliest covered one wins', () => {
  // Nothing done at all: week 1 Legs is reachable before week 2 Legs, and must be the answer.
  const legs = shape(['Barbell Back Squat', 'barbell-back-squat'], ['Romanian Deadlift', 'romanian-deadlift']);
  assert.deepEqual(matchSharedShapeToSlot(structure, [], legs), { weekIndex: 0, dayIndex: 2 });
});
