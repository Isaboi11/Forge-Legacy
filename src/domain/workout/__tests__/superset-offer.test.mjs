import test from 'node:test';
import assert from 'node:assert/strict';

import { blockAt, nextInSuperset } from '../session-core.ts';
import { joinAsSuperset, supersetOffer } from '../superset-offer.ts';

/**
 * Holt's superset offer — PO 2026-09-21: adding a lift before finishing the one you are on is someone
 * building a superset, and Holt should ask.
 */

const sets = (n, done = 0) => Array.from({ length: n }, (_, i) => ({ setIndex: i, targetReps: 8, weight: null, actualReps: null, done: i < done }));
const lift = (name, n = 3, done = 0, extra = {}) => ({ name, section: 'main', position: 0, sets: sets(n, done), ...extra });

const offer = (exercises, currentIdx, over = {}) =>
  supersetOffer({ exercises, currentIdx, added: [{}], addedSection: 'main', declaredSuperset: false, ...over });

/* ── when Holt asks ────────────────────────────────────────────────────────── */

test('⭐ mid-lift, one lift added → Holt offers to superset it with the lift they are on', () => {
  assert.deepEqual(offer([lift('Bench Press', 3, 1)], 0), { prevIdx: 0 });
});

test('nothing logged yet is planning ahead, not a superset — no offer', () => {
  assert.equal(offer([lift('Bench Press', 3, 0)], 0), null);
});

test('every set logged is moving on — no offer', () => {
  assert.equal(offer([lift('Bench Press', 3, 3)], 0), null);
});

test('several lifts added at once — which would pair? no offer', () => {
  assert.equal(offer([lift('Bench Press', 3, 1)], 0, { added: [{}, {}] }), null);
});

test('already declared a superset in the Picker — the question is answered', () => {
  assert.equal(offer([lift('Bench Press', 3, 1)], 0, { declaredSuperset: true }), null);
});

test('a warm-up or cool-down on either side is never offered', () => {
  assert.equal(offer([lift('Bench Press', 3, 1)], 0, { addedSection: 'warmup' }), null);
  assert.equal(offer([lift('Arm Circles', 3, 1, { section: 'warmup' })], 0), null);
});

test('cardio on either side is never offered', () => {
  assert.equal(offer([lift('Bench Press', 3, 1)], 0, { added: [{ kind: 'cardio' }] }), null);
  assert.equal(offer([lift('Run', 1, 0, { kind: 'cardio' })], 0), null);
});

test('a lift inside a CIRCUIT is not offered — that is a different structure', () => {
  const circuit = [lift('Burpee', 3, 1, { groupId: 'c1', groupKind: 'circuit' }), lift('Squat', 3, 0, { groupId: 'c1', groupKind: 'circuit' })];
  assert.equal(offer(circuit, 0), null);
});

test('a lift already in a superset IS offered — the new lift joins it', () => {
  const ss = [lift('Bench', 3, 1, { groupId: 's1', groupKind: 'superset' }), lift('Row', 3, 1, { groupId: 's1', groupKind: 'superset' })];
  assert.deepEqual(offer(ss, 1), { prevIdx: 1 });
});

/* ── what "yes" does ───────────────────────────────────────────────────────── */

test('⭐ yes pulls the added lift in beside the one it pairs with, as one superset', () => {
  const ex = [lift('Squat', 3, 3), lift('Bench', 3, 1), lift('Deadlift', 3, 0), lift('Row', 3, 0)];
  const { exercises, start } = joinAsSuperset(ex, 1, 3, 'ssX');
  assert.deepEqual(exercises.map((e) => e.name), ['Squat', 'Bench', 'Row', 'Deadlift']);
  assert.equal(start, 1);
  const b = blockAt(exercises, 1);
  assert.equal(b.kind, 'superset');
  assert.equal(b.count, 2);
  assert.equal(blockAt(exercises, 3), null, 'the lift that was in the way is untouched');
  // round-major: Bench set 2 is logged next only after Row set 1
  assert.deepEqual(nextInSuperset(exercises, b), { exIdx: 2, setIdx: 0, round: 0 });
});

test('⛔ an adjacent pairing is not reordered at all', () => {
  const ex = [lift('Bench', 3, 1), lift('Row', 3, 0)];
  const { exercises } = joinAsSuperset(ex, 0, 1, 'ssX');
  assert.deepEqual(exercises.map((e) => e.name), ['Bench', 'Row']);
  assert.equal(blockAt(exercises, 0).count, 2);
});

test('joining an existing superset extends it and keeps its id', () => {
  const ex = [
    lift('Bench', 3, 1, { groupId: 's1', groupKind: 'superset' }),
    lift('Row', 3, 1, { groupId: 's1', groupKind: 'superset' }),
    lift('Curl', 3, 0),
    lift('Fly', 3, 0),
  ];
  const { exercises, start } = joinAsSuperset(ex, 1, 3, 'ssNEW');
  assert.deepEqual(exercises.map((e) => e.name), ['Bench', 'Row', 'Fly', 'Curl']);
  assert.equal(start, 0);
  const b = blockAt(exercises, 0);
  assert.equal(b.count, 3);
  assert.equal(b.groupId, 's1');
});

test('logged sets and the save join key travel with the rows', () => {
  const ex = [lift('Bench', 3, 2, { position: 0 }), lift('Squat', 3, 0, { position: 1 }), lift('Row', 4, 0, { position: 2 })];
  const { exercises } = joinAsSuperset(ex, 0, 2, 'ssX');
  assert.deepEqual(exercises.map((e) => e.position), [0, 2, 1]);
  assert.equal(exercises[0].sets.filter((s) => s.done).length, 2);
  assert.equal(exercises[0].groupRounds, 4, 'rounds are the longest member');
});
