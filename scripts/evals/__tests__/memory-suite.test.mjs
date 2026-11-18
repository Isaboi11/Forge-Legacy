/**
 * The memory suite's grader, offline ($0): what passes, what is invented, what is medical — on synthetic replies.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { EARLIER_CASES, FACT_CHATS, gradeMemory, keptFrom, RECAP_CHATS } from '../suites/memory.mjs';

const factCase = (id) => {
  const c = FACT_CHATS.find((x) => x.id === id);
  return { id, input: { kind: 'fact', turns: c.turns, kept: c.kept ?? [] }, expect: c };
};
const recapCase = (id) => {
  const c = RECAP_CHATS.find((x) => x.id === id);
  return { id, input: { kind: 'recap', turns: c.turns, prior: c.prior }, expect: c };
};
const reply = (summary, facts) => ({ reply: { text: JSON.stringify({ summary, facts }), stop_reason: 'end_turn' } });

test('a fact reply that keeps what was said passes; a missing one fails with its words', () => {
  const ok = gradeMemory(factCase('f-burpees-rowing'), reply('You asked for no burpees.', [{ kind: 'dislike', text: 'Hates burpees' }, { kind: 'like', text: 'Likes rowing for conditioning' }]));
  assert.equal(ok.pass, true, ok.notes);
  const miss = gradeMemory(factCase('f-burpees-rowing'), reply('You asked for no burpees.', [{ kind: 'dislike', text: 'Hates burpees' }]));
  assert.equal(miss.pass, false);
  assert.match(miss.notes, /missing row/);
  assert.equal(miss.score, 0.5);
});

test('⛔ invented: Holt’s suggestion kept as the athlete’s fact, or words nobody said', () => {
  const holt = gradeMemory(factCase('f-holt-suggested'), reply('You asked about conditioning.', [{ kind: 'like', text: 'Likes rowing intervals' }]));
  assert.equal(holt.pass, false);
  assert.deepEqual(holt.invented, ['Likes rowing intervals']);
  const made = gradeMemory(factCase('f-schedule'), reply('x', [{ kind: 'schedule', text: 'Trains mornings' }, { kind: 'goal', text: 'Wants to compete in powerlifting' }]));
  assert.deepEqual(made.invented, ['Wants to compete in powerlifting']);
  const oneOff = gradeMemory(factCase('f-one-off'), reply('x', [{ kind: 'gym', text: 'At a hotel gym with dumbbells' }]));
  assert.deepEqual(oneOff.invented, ['At a hotel gym with dumbbells']);
});

test('⛔ a medical fact the model proposes is dropped by the server filter before it is graded (and never counted kept)', () => {
  const g = gradeMemory(factCase('f-knee-avoid'), reply('x', [{ kind: 'other', text: 'Has a dodgy knee' }, { kind: 'avoid', text: 'Avoid jumping' }, { kind: 'like', text: 'Loves sled pushes' }]));
  assert.equal(g.pass, true, g.notes);
  assert.deepEqual(g.medical, []);
  assert.match(g.notes, /filter dropped 1/);
  assert.deepEqual(keptFrom(reply('x', [{ kind: 'other', text: 'Has a dodgy knee' }]).reply).facts, []);
});

test('not the JSON, or a refusal, fails', () => {
  assert.equal(gradeMemory(factCase('f-schedule'), { reply: { text: 'Sure!', stop_reason: 'end_turn' } }).pass, false);
  assert.equal(gradeMemory(factCase('f-schedule'), { reply: { text: '', stop_reason: 'refusal' } }).pass, false);
});

test('recap: keeps the numbers, drops the medical sentence (the function’s cleaning), NOTHING from nothing', () => {
  const g = gradeMemory(recapCase('r-medical-dropped'), { reply: { text: 'The athlete wants to run a 10k in June. Their lower back aches after deadlifts.' } });
  assert.equal(g.pass, true, g.notes);
  assert.deepEqual(g.medical, []);
  const bad = gradeMemory(recapCase('r-schedule-and-goal'), { reply: { text: 'The athlete trains Monday for 45 minutes and wants a bigger bench. The athlete mentioned their knee.' } });
  assert.equal(bad.pass, false, 'the 225 and March are missing');
  assert.deepEqual(bad.medical, [], 'the knee sentence is dropped by the function’s own cleaning (factIsPersonalHealth), so never kept');
  const none = gradeMemory(recapCase('r-nothing'), { reply: { text: 'NOTHING' } });
  assert.equal(none.pass, true);
});

test('earlier: the answer from the recap passes; "I can’t remember" fails', () => {
  const c = { id: 'e-days', input: { kind: 'earlier' }, expect: EARLIER_CASES[0] };
  assert.equal(gradeMemory(c, { reply: { text: 'You said Monday, Wednesday and Friday mornings.' } }).pass, true);
  assert.equal(gradeMemory(c, { reply: { text: "I don't have that from earlier — which days work?" } }).pass, false);
});
