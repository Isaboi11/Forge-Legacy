/**
 * Launch QA 11-08, B2 — "Continue this workout" at minute 40, train 30 more, Finish: the server refuses the
 * append ("closed more than an hour ago") and every Finish failed. The sets done since the reopen are saved as a
 * workout of their own instead.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { continuationAsOwnSession, isContinueWindowClosed } from '../save-core.ts';

const set = (i, extra = {}) => ({ setIndex: i, targetReps: 8, weight: 185, actualReps: 8, done: true, ...extra });
const continued = {
  continuingWorkoutId: 'w1',
  continuedAt: '2026-11-08T18:40:00.000Z',
  startedAt: '2026-11-08T18:00:00.000Z',
  workoutName: 'Push',
  activityType: 'strength',
  programId: 'p1',
  programWeek: 1,
  programDay: 2,
  templateId: 't1',
  exerciseIndex: 1,
  exercises: [
    { name: 'Bench', catalogKey: 'bench', section: 'main', position: 0, savedPosition: 0, sets: [set(0, { saved: true }), set(1, { saved: true }), set(2)] },
    { name: 'Row', catalogKey: 'row', section: 'main', position: 1, savedPosition: 1, sets: [set(0, { saved: true })] },
    { name: 'Curl', catalogKey: 'curl', section: 'main', position: 2, sets: [set(0), set(1, { done: false })] },
  ],
};

test('the refusal is recognised by the server\'s own sentence, and nothing else', () => {
  assert.equal(isContinueWindowClosed({ code: 'P0001', message: 'that workout closed more than an hour ago — start a new one and it stays its own session' }), true);
  assert.equal(isContinueWindowClosed({ message: 'Failed to fetch' }), false);
  assert.equal(isContinueWindowClosed(null), false);
});

test('only the sets done since the reopen are kept, as a session of their own', () => {
  const apart = continuationAsOwnSession(continued, '2026-11-08T19:20:00.000Z');
  assert.deepEqual(apart.exercises.map((e) => [e.name, e.sets.length, e.position]), [['Bench', 1, 0], ['Curl', 1, 1]]);
  assert.equal(apart.exercises.some((e) => e.savedPosition != null), false, 'no row to append to any more');
  assert.equal(apart.startedAt, '2026-11-08T18:40:00.000Z', 'it started when the reopen did');
  for (const k of ['continuingWorkoutId', 'programId', 'programWeek', 'programDay', 'templateId']) assert.equal(k in apart, false, `${k} dropped — the first save claimed it`);
});

test('nothing new done → nothing to save apart (the refusal surfaces as before)', () => {
  const none = { ...continued, exercises: continued.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.saved) })) };
  assert.equal(continuationAsOwnSession(none, '2026-11-08T19:20:00.000Z'), null);
});

test('the logger takes that path only on that refusal', () => {
  const src = readFileSync(new URL('../../../app/workout.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /const apart = isContinueWindowClosed\(e\) \? continuationAsOwnSession\(session, new Date\(\)\.toISOString\(\)\) : null;\n\s+if \(!apart\) throw e;/);
});
