import test from 'node:test';
import assert from 'node:assert/strict';

import { summariseExerciseHistory, topSet } from '../history.ts';

/**
 * Exercise Detail "Your history" (W22-Amendment-001, B8). The rules that decide what the athlete is told
 * about their own lift: heaviest set vs the 1–5 rep record, bodyweight, unentered loads, the cap.
 *
 * Run: node --test src/domain/exercise-detail/__tests__/history.test.mjs
 */

const s = (startedAt, sets) => ({ startedAt, sets: sets.map(([weight, reps]) => ({ weight, reps })) });
const OPTS = { shown: 5, limit: 60 };

test('never logged and no record → empty (one plain line on screen)', () => {
  const r = summariseExerciseHistory([], null, OPTS);
  assert.equal(r.empty, true);
  assert.equal(r.heaviest, null);
  assert.deepEqual(r.recent, []);
});

test('a record on file with no sessions read is NOT empty', () => {
  const r = summariseExerciseHistory([], { weight: 225, reps: 3, achievedOn: '2026-01-02' }, OPTS);
  assert.equal(r.empty, false);
  assert.equal(r.pr.weight, 225);
});

test('heaviest set is the heaviest load at ANY reps, across sessions — not the 1–5 rep record', () => {
  const r = summariseExerciseHistory(
    [s('2026-09-20', [[185, 5], [205, 8]]), s('2026-09-10', [[195, 5]])],
    { weight: 195, reps: 5, achievedOn: '2026-09-10' },
    OPTS,
  );
  assert.deepEqual(r.heaviest.set, { weight: 205, reps: 8 });
  assert.equal(r.heaviest.startedAt, '2026-09-20');
  assert.equal(r.pr.weight, 195, 'the record is passed through untouched');
});

test('equal load → more reps wins; a null (unentered) load never ranks', () => {
  assert.deepEqual(topSet([{ weight: 100, reps: 5 }, { weight: 100, reps: 8 }, { weight: null, reps: 20 }]), { weight: 100, reps: 8 });
  assert.equal(topSet([{ weight: null, reps: 10 }]), null);
});

test('bodyweight (0) is flagged — "most reps", not "heaviest"', () => {
  const r = summariseExerciseHistory([s('2026-09-20', [[0, 12], [0, 15]])], null, OPTS);
  assert.equal(r.heaviest.bodyweight, true);
  assert.equal(r.heaviest.set.reps, 15);
});

test('recent is newest-first, capped at `shown`, each with its top set and set count', () => {
  const sessions = Array.from({ length: 7 }, (_, i) => s(`2026-09-${String(20 - i).padStart(2, '0')}`, [[100 + i, 5], [90, 5]]));
  const r = summariseExerciseHistory(sessions, null, OPTS);
  assert.equal(r.recent.length, 5);
  assert.equal(r.recent[0].startedAt, '2026-09-20');
  assert.deepEqual(r.recent[0].top, { weight: 100, reps: 5 });
  assert.equal(r.recent[0].setCount, 2);
  assert.equal(r.capped, false);
});

test('hitting the read limit marks heaviest as covering only the latest sessions', () => {
  const r = summariseExerciseHistory([s('a', [[1, 1]]), s('b', [[2, 1]])], null, { shown: 5, limit: 2 });
  assert.equal(r.capped, true);
});
