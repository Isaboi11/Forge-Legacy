import test from 'node:test';
import assert from 'node:assert/strict';

import { formatElapsed, lastExerciseName, loggedSetCount, sessionStatLine } from '../entry-summary.ts';

const set = (done) => ({ setIndex: 0, weight: null, targetReps: 8, actualReps: done ? 8 : null, done });
const exercise = (name, doneCount, total) => ({
  name,
  sets: Array.from({ length: total }, (_, i) => set(i < doneCount)),
});

const START = Date.parse('2026-08-14T06:00:00.000Z');
const at = (mins) => START + mins * 60000;

const session = (exercises, startedAt = '2026-08-14T06:00:00.000Z', over = {}) => ({
  workoutName: 'Push Day',
  activityType: 'strength',
  startedAt,
  exercises,
  ...over,
});

test('sets means sets LOGGED, not sets planned', () => {
  // 4 exercises × 4 planned = 16; three done. The screen must say 3, not 16.
  const s = session([exercise('Bench', 3, 4), exercise('Incline', 0, 4), exercise('Fly', 0, 4), exercise('Dip', 0, 4)]);
  assert.equal(loggedSetCount(s.exercises), 3);
  assert.equal(sessionStatLine(s, at(38)), '4 exercises · 3 sets · 38 min');
});

test('the shape from the design: exercises · sets · minutes', () => {
  const s = session([exercise('A', 3, 3), exercise('B', 3, 3), exercise('C', 3, 3), exercise('D', 2, 3)]);
  assert.equal(sessionStatLine(s, at(38)), '4 exercises · 11 sets · 38 min');
});

test('a part with nothing to say is dropped, never printed as a zero', () => {
  const untouched = session([exercise('Bench', 0, 4)]);
  assert.equal(sessionStatLine(untouched, at(2)), '1 exercise · 2 min', '"0 sets" claims failure about work that has not happened');
  assert.equal(sessionStatLine(session([]), at(0)), '', 'no exercises, no sets, no elapsed time — nothing to state');
});

test('singulars are decided, not assumed', () => {
  assert.equal(sessionStatLine(session([exercise('Bench', 1, 1)]), at(1)), '1 exercise · 1 set · 1 min');
});

test('a broken startedAt drops the duration rather than rendering NaN', () => {
  const s = session([exercise('Bench', 1, 1)], 'not-a-date');
  assert.equal(sessionStatLine(s, at(38)), '1 exercise · 1 set');
});

test('a clock that has not moved yet does not print a negative or a zero-width gap', () => {
  const s = session([exercise('Bench', 1, 1)]);
  assert.equal(sessionStatLine(s, START), '1 exercise · 1 set');
  assert.equal(sessionStatLine(s, START - 60000), '1 exercise · 1 set', 'a device clock that went backwards is not -1 min');
});

test('⚠ an overnight session reports the hours it will actually SAVE', () => {
  // save.ts stores exactly this subtraction, so hiding it would make the screen disagree with history.
  assert.equal(formatElapsed(38 * 60000), '38 min');
  assert.equal(formatElapsed(59 * 60000), '59 min');
  assert.equal(formatElapsed(60 * 60000), '1h');
  assert.equal(formatElapsed(134 * 60000), '2h 14m');
  assert.equal(formatElapsed(14 * 60 * 60000 + 6 * 60000), '14h 6m');
});

test('the last exercise is the last one WORKED, not the last in the list', () => {
  const s = session([exercise('Bench', 3, 3), exercise('Incline Dumbbell Press', 2, 3), exercise('Cable Fly', 0, 3)]);
  assert.equal(lastExerciseName(s), 'Incline Dumbbell Press');
});

test('nothing logged falls back to where they are standing, not to the bottom of the list', () => {
  const s = session([exercise('Bench', 0, 3), exercise('Incline', 0, 3), exercise('Fly', 0, 3)], undefined, { exerciseIndex: 1 });
  assert.equal(lastExerciseName(s), 'Incline');
});

test('an empty session has no last exercise to name', () => {
  assert.equal(lastExerciseName(session([])), null);
});

test('an exerciseIndex past the end does not crash the line', () => {
  const s = session([exercise('Bench', 0, 3)], undefined, { exerciseIndex: 9 });
  assert.equal(lastExerciseName(s), null);
});
