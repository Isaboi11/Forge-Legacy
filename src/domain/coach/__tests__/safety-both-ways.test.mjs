/**
 * safety-both-ways.test.mjs — what the athlete TYPES, against the two-way corpus (AI Road to 10 Sprint 2, CH-2).
 *
 * The input guard (`medicalRoute`) is the first line: a typed line it stops never reaches a credit or a model. Sprint 2
 * adds new phrasings that got through — a named condition ("tennis elbow", "shin splints", "bursitis"), an
 * over-the-counter painkiller ("can I take ibuprofen before squats"), a count of pills — and holds the sentences the
 * product is sold with ("my shoulder hurts, swap tomorrow") to `clear`. What Holt SAYS is `output-scan.test.mjs`.
 *
 * Run (from the repo root):  node --experimental-strip-types --test src/domain/coach/__tests__/safety-both-ways.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CONDITION, medicalRoute, stopsForMedical, withoutStoppedTurns } from '../medical-routing.ts';
import { isClinicianStop } from '../chat-core.ts';
import { TYPED_PASS, TYPED_STOP } from './safety-both-ways.mjs';

test('⛔ every typed line that must stop, stops — before a credit or a model', () => {
  const missed = TYPED_STOP.filter((l) => medicalRoute(l.text) === 'clear').map((l) => l.text);
  assert.deepEqual(missed, []);
});

test('⚠ the sentences the product is sold with still go through', () => {
  const stopped = TYPED_PASS.map((l) => [medicalRoute(l.text), l.text]).filter(([r]) => r !== 'clear');
  assert.deepEqual(stopped, []);
});

test('a named condition is acute — it stops even with a swap request beside it', () => {
  for (const t of ['I have tendinitis in my elbow, swap the curls', 'shin splints again, swap the runs for bike', 'bursitis in my hip']) {
    assert.equal(medicalRoute(t), 'acute', t);
  }
  assert.ok(CONDITION.test('IT band syndrome'));
  // Anatomy is not a condition: the IT band itself, a tennis session, a golfer's swing.
  for (const t of ['my IT band is tight, add some mobility', 'I play tennis on Saturdays', 'golfers need rotation work']) {
    assert.equal(CONDITION.test(t), false, t);
  }
});

test('a painkiller question names their doctor, and a count of pills is an amount', () => {
  assert.equal(medicalRoute('can I take ibuprofen before squats'), 'advice');
  assert.ok(isClinicianStop('can I take ibuprofen before squats'), 'the stop says "your doctor", not "a physio"');
  assert.equal(medicalRoute('should I take 2 tablets after leg day'), 'care');
  assert.equal(stopsForMedical('how many advil before a long run'), true);
});

test('a stopped line never rides along in the history — the new phrasings included', () => {
  const turns = [
    { role: 'athlete', text: 'got shin splints from the hill sprints' },
    { role: 'holt', text: 'That one is for a physio.' },
    { role: 'athlete', text: 'ok what is today' },
  ];
  assert.deepEqual(withoutStoppedTurns(turns).map((t) => t.text), ['ok what is today']);
});
