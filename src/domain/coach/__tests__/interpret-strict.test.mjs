/**
 * interpret-strict.test.mjs — the local matcher places only what it cannot misread.
 *
 * It runs BEFORE the model (`coach-interpret-live.ts`), so anything it places the model never hears. The
 * 2026-09-21 stress test fed it 756 short probes and 1,158 realistic answers: it placed 163 probes and 119
 * answers wrongly, and a typed date crashed it. Each case below is one of those, read back from the log.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/interpret-strict.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { interpret, nextQuestion, sizeQuestion } from '../chat-core.ts';

const who = { goal: 'strength', experience: { lifting: 'beginner', running: 'beginner' } };
const Q = {
  goal: nextQuestion({}, 'program'),
  experience: nextQuestion({ goal: 'strength' }, 'program'),
  days: nextQuestion(who, 'program'),
  where: nextQuestion({ ...who, daysPerWeek: 3 }, 'program'),
  time: nextQuestion({ ...who, daysPerWeek: 3, environment: 'full_gym' }, 'program'),
  limits: nextQuestion({ ...who, daysPerWeek: 3, environment: 'full_gym', sessionMinutes: 60 }, 'program'),
  race_when: nextQuestion({ goal: 'run_marathon', experience: who.experience }, 'program'),
  race_base: nextQuestion({ goal: 'run_marathon', experience: who.experience, raceDate: '2027-03-01' }, 'program'),
  day_focus: nextQuestion({}, 'day'),
  size: sizeQuestion(),
};

test('the questions are the ones this file thinks they are', () => {
  for (const [id, q] of Object.entries(Q)) assert.equal(q?.id, id);
});

test('⚠ a letter, a filler word or a shrug is never an answer', () => {
  for (const [id, q] of Object.entries(Q))
    for (const t of ['a', 'i', 'e', 'o', 'u', 'k', 'um', 'what', 'idk', 'not sure', 'no idea', 'day', 'gym', 'run'])
      assert.equal(interpret(t, q), null, `${id}: "${t}"`);
});

test('⚠ zero weekly miles is zero, not "5 to 10 miles"', () => {
  assert.deepEqual(interpret('0', Q.race_base), { currentWeeklyMi: 0 });
  assert.deepEqual(interpret('3', Q.race_base), { currentWeeklyMi: 3 });
  assert.equal(interpret('20-25', Q.race_base), null, 'a range is a question back, not 2,025 miles');
});

test('⚠ an hour is sixty minutes', () => {
  assert.deepEqual(interpret('1 hour', Q.time), { sessionMinutes: 60 });
  assert.deepEqual(interpret('1hr', Q.time), { sessionMinutes: 60 });
  assert.deepEqual(interpret('1', Q.time), { sessionMinutes: 60 });
  assert.equal(interpret('45-60', Q.time), null);
});

test('⚠ a typed date on the race question does not crash, and is not a week count', () => {
  for (const t of ['2027-03-01', '2026-11-01', '11/15', 'in 3 months', 'May 2'])
    assert.doesNotThrow(() => assert.equal(interpret(t, Q.race_when), null, t));
});

test('⚠ "no running" is a limitation, not "nothing to avoid"', () => {
  assert.equal(interpret('no running', Q.limits), null);
  assert.equal(interpret('no box jumps please', Q.limits), null);
  assert.deepEqual(interpret('nothing', Q.limits), { limitations: [] });
  assert.deepEqual(interpret('no', Q.limits), { limitations: [] });
});

test('⚠ several answers in one sentence go to the model whole, not one-kept-two-dropped', () => {
  assert.equal(interpret('4 days, about an hour, at the Y', Q.days), null);
  assert.equal(interpret('shoulders and knees', Q.limits), null);
  assert.equal(interpret('not 12, thats too long. 8', Q.size), null);
});

test('typed day focus is never a silent no-op', () => {
  for (const t of ['legs', 'push', 'back and biceps']) assert.equal(interpret(t, Q.day_focus), null, t);
});

test('what people type off the buttons still lands', () => {
  assert.deepEqual(interpret('4 days', Q.days), { daysPerWeek: 4 });
  assert.deepEqual(interpret('4', Q.days), { daysPerWeek: 4 });
  assert.deepEqual(interpret('45 minutes', Q.time), { sessionMinutes: 45 });
  assert.deepEqual(interpret('full gym', Q.where), { environment: 'full_gym' });
  assert.deepEqual(interpret('build muscle', Q.goal), { goal: 'muscle' });
  assert.deepEqual(interpret('8 weeks', Q.size), { weeks: 8 });
  assert.deepEqual(interpret('10 weeks', Q.race_when)?.raceDate?.length, 10);
});
