/**
 * continue-over-open.test.mjs — "Continue this workout" never overwrites a workout that is still open (UX-005,
 * launch QA B16).
 *
 * ══ THE FAILURE THIS GUARDS ══
 *
 * The "Not finished? Continue this workout" row is offered for an hour after any save — including on the summary
 * reached from Activity History. It wrote the reopened workout straight over the autosave, so a SECOND workout
 * still open (run 11-09: workout A finished, workout B open with sets logged, A continued from history) was
 * replaced with no prompt, and B's logged sets were gone.
 *
 * Now the screen asks `continueOverOpen` first, and a different workout with work in it is parked as a launch so
 * the logger's existing resume prompt asks (Resume / Save this one & start the new one / Discard with the count).
 *
 * Run:  node --test --experimental-strip-types src/domain/workout/__tests__/continue-over-open.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { continueOverOpen } from '../save-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (rel) => readFileSync(path.join(here, '../../../', rel), 'utf8');

const set = (i, o = {}) => ({ setIndex: i, weight: 100, targetReps: 5, actualReps: 5, done: true, ...o });
const session = (o = {}) => ({
  workoutName: 'Workout',
  activityType: 'strength',
  startedAt: '2026-11-09T09:00:00.000Z',
  exerciseIndex: 0,
  exercises: [{ name: 'Hip Thrust', section: 'main', position: 0, sets: [set(0)] }],
  ...o,
});

/** Workout A, finished and reopened from history — what `fetchWorkoutAsSession` returns. */
const reopenedA = session({ workoutName: 'A', startedAt: '2026-11-09T08:00:00.000Z', continuingWorkoutId: 'wA' });

test('THE DEFECT: a different workout still open with sets logged is never overwritten — the athlete is asked', () => {
  const openB = session({ workoutName: 'B', startedAt: '2026-11-09T08:45:00.000Z' });
  assert.equal(continueOverOpen(openB, true, reopenedA), 'ask');
});

test('a different workout that was itself reopened (continuing another id) is asked about too', () => {
  const openC = session({ workoutName: 'C', startedAt: '2026-11-09T07:00:00.000Z', continuingWorkoutId: 'wC' });
  assert.equal(continueOverOpen(openC, true, reopenedA), 'ask');
});

test('nothing open, or nothing logged in it — the reopened workout simply takes its place, as before', () => {
  assert.equal(continueOverOpen(null, false, reopenedA), 'replace');
  assert.equal(continueOverOpen(undefined, false, reopenedA), 'replace');
  const emptyB = session({ workoutName: 'B', startedAt: '2026-11-09T08:45:00.000Z', exercises: [] });
  assert.equal(continueOverOpen(emptyB, false, reopenedA), 'replace');
});

test('the same workout already reopened is returned to, not re-read — a fresh copy would drop the sets added since', () => {
  const alreadyContinuing = session({
    workoutName: 'A',
    startedAt: reopenedA.startedAt,
    continuingWorkoutId: 'wA',
    exercises: [{ name: 'Hip Thrust', section: 'main', position: 0, sets: [set(0, { saved: true }), set(1)] }],
  });
  assert.equal(continueOverOpen(alreadyContinuing, true, reopenedA), 'same');
});

test('this very workout’s own pre-save copy (same start, already committed) is replaced by the server’s copy', () => {
  const staleCopyOfA = session({ workoutName: 'A', startedAt: reopenedA.startedAt });
  assert.equal(continueOverOpen(staleCopyOfA, true, reopenedA), 'replace');
});

test('the screen asks BEFORE it writes, and parks a conflict as a launch instead of overwriting the autosave', () => {
  const screen = src('app/workout-complete.tsx');
  const at = screen.indexOf('fetchWorkoutAsSession(data.workoutId, units)');
  assert.ok(at > 0, 'the Continue handler is where it was');
  const handler = screen.slice(at, at + 2500); // the onPress body — short, and nothing else follows it this closely
  const ask = handler.indexOf('continueOverOpen(open, hasLoggedWork(open), s)');
  const park = handler.indexOf('writeWorkoutLaunch({ continueSession: s })');
  const write = handler.indexOf('persistSession(s)');
  assert.ok(handler.includes('const open = await loadSession()'), 'reads what is open first');
  assert.ok(ask > 0, 'decides with continueOverOpen');
  assert.ok(park > ask, 'a conflict is parked for the resume prompt');
  assert.ok(write > park, 'the autosave is written only after both early returns');
});

test('the launch survives the guard, and the logger raises its resume prompt for it, then starts it', () => {
  const launch = src('lib/workout-launch.ts');
  assert.match(launch, /continueSession\?: ActiveSession;/);
  assert.match(launch, /!!v\.continueSession && Array\.isArray\(v\.continueSession\.exercises\) && !!v\.continueSession\.continuingWorkoutId/);

  const logger = src('app/workout.tsx');
  const wants = logger.slice(logger.indexOf('const wantsSomething ='), logger.indexOf('if (hasWork) {'));
  assert.match(wants, /!!launch\.continueSession/, 'an open workout with work + this launch = the resume prompt');
  const branch = logger.slice(logger.indexOf('if (launch?.continueSession) {'));
  assert.ok(logger.includes('if (launch?.continueSession) {'), 'the parked continue is started once the prompt is answered');
  assert.match(branch.slice(0, 600), /await clearWorkoutLaunch\(\);[\s\S]*unmarkSessionSealed\(reopened\.continuingWorkoutId\)[\s\S]*setSession\(reopened\)/);
});
