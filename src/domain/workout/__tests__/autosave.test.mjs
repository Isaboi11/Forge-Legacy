import test from 'node:test';
import assert from 'node:assert/strict';

import { hasLoggedWork, resumeSummary } from '../autosave.ts';

/*
 * ══ ONE ANSWER TO "IS THERE A SESSION" ══
 *
 * Home decides whether to say "Continue Workout" and the logger decides whether to offer "Resume", and
 * both ask this. Written twice they would eventually disagree, and the failure is specific: Home offers
 * to continue, the athlete taps it, the logger sees nothing worth resuming and starts them fresh — the
 * offer destroying the thing it advertised.
 */

const set = (done) => ({ setIndex: 0, weight: 100, targetReps: 5, actualReps: 5, done });
const session = (exercises) => ({ startedAt: new Date(0).toISOString(), workoutName: 'W', exercises });

test('no session at all is not work', () => {
  assert.equal(hasLoggedWork(null), false);
  assert.equal(hasLoggedWork(undefined), false);
});

test('STARTED is not LOGGED — an opened session with nothing done offers nothing', () => {
  // Resuming this is indistinguishable from starting, so neither surface should mention it.
  assert.equal(hasLoggedWork(session([])), false, 'no exercises');
  assert.equal(hasLoggedWork(session([{ name: 'Bench', sets: [] }])), false, 'exercises but no sets');
  assert.equal(hasLoggedWork(session([{ name: 'Bench', sets: [set(false), set(false)] }])), false,
    'sets planned but none completed');
});

test('one completed set anywhere is work worth keeping', () => {
  assert.equal(hasLoggedWork(session([{ name: 'Bench', sets: [set(true)] }])), true);
  assert.equal(
    hasLoggedWork(session([
      { name: 'Bench', sets: [set(false)] },
      { name: 'Row', sets: [set(false), set(true)] },
    ])),
    true,
    'the completed set is in the second exercise, and it still counts',
  );
});

test('a malformed session never throws — it just is not work', () => {
  // This is read straight out of storage, which may hold anything an older build wrote.
  assert.equal(hasLoggedWork({}), false);
  assert.equal(hasLoggedWork({ exercises: null }), false);
  assert.equal(hasLoggedWork({ exercises: [{ name: 'X' }] }), false, 'an exercise with no sets array');
});

/*
 * ══ resumeSummary — DESCRIBING the session, not just detecting it ══
 *
 * Home's Continue card used to sit inside the program-day card, which supplied the name and the count. It
 * now appears for an athlete with no program at all, so the description has to come out of the session.
 */

const main = (name, sets) => ({ name, section: 'main', sets });
const warmup = (name, sets) => ({ name, section: 'warmup', sets });

test('resumeSummary is null wherever hasLoggedWork is false — one gate, not two', () => {
  for (const s of [null, undefined, session([]), session([main('Bench', [set(false)])]), {}]) {
    assert.equal(resumeSummary(s), null);
    assert.equal(hasLoggedWork(s), false, 'and the two agree, which is the whole point');
  }
});

test('resumeSummary names the session and counts the WORK, not the warm-up', () => {
  const s = { ...session([warmup('Bike', [set(true)]), main('Bench', [set(true)]), main('Row', [set(true)])]),
    workoutName: 'Push Day' };
  assert.deepEqual(resumeSummary(s), { name: 'Push Day', exerciseCount: 2 });
});

test('a cardio-only session has no main section, and still reports its block', () => {
  // Falling through to 0 here would put "0 Exercises" on the card over a real, resumable run.
  const s = session([{ name: 'Run', section: 'conditioning', sets: [set(true)] }]);
  assert.deepEqual(resumeSummary(s), { name: 'W', exerciseCount: 1 });
});

test('an exercise with no section at all still counts rather than vanishing', () => {
  const s = session([{ name: 'Bench', sets: [set(true)] }]);
  assert.equal(resumeSummary(s).exerciseCount, 1);
});
