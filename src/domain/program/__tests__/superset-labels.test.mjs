import test from 'node:test';
import assert from 'node:assert/strict';

import { blockLetter, supersetLabels, supersetLabelAt, supersetLetterAt } from '../prescription.ts';

const loose = () => ({});
const ss = (gid) => ({ groupId: gid, groupKind: 'superset' });
const circuit = (gid) => ({ groupId: gid, groupKind: 'circuit' });

// ─────────────────────────────────────────────────────────────────────────────
// THE ASK — A1/A2, then B1/B2
// ─────────────────────────────────────────────────────────────────────────────

test('a superset is A1 and A2, not A and B', () => {
  assert.deepEqual(supersetLabels([ss('g1'), ss('g1')]), ['A1', 'A2']);
});

test('the second superset in a day is B1 and B2', () => {
  const day = [ss('g1'), ss('g1'), loose(), ss('g2'), ss('g2')];
  assert.deepEqual(supersetLabels(day), ['A1', 'A2', null, 'B1', 'B2']);
});

test('…and a third is C, and so on', () => {
  const day = [ss('a'), ss('a'), ss('b'), ss('b'), ss('c'), ss('c')];
  assert.deepEqual(supersetLabels(day), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
});

test('a superset of three numbers all the way through', () => {
  assert.deepEqual(supersetLabels([ss('g1'), ss('g1'), ss('g1')]), ['A1', 'A2', 'A3']);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS NOT LETTERED
// ─────────────────────────────────────────────────────────────────────────────

test('a loose exercise carries no label', () => {
  assert.deepEqual(supersetLabels([loose(), loose()]), [null, null]);
});

test('a circuit is not a superset and takes no letter', () => {
  assert.deepEqual(supersetLabels([circuit('c1'), circuit('c1')]), [null, null]);
});

test('a block that never declared a kind is a circuit (0106), so it is not lettered', () => {
  assert.deepEqual(supersetLabels([{ groupId: 'g' }, { groupId: 'g' }]), [null, null]);
});

test('⚠ a circuit does not consume a letter — the second SUPERSET is still B', () => {
  // "if there is a second superset it would go B1 and B2" — counted among supersets, not among blocks.
  const day = [ss('a'), ss('a'), circuit('c'), circuit('c'), ss('b'), ss('b')];
  assert.deepEqual(supersetLabels(day), ['A1', 'A2', null, null, 'B1', 'B2']);
});

test('a run of one is not a superset, exactly as pairingAt has it', () => {
  assert.deepEqual(supersetLabels([ss('g1'), loose()]), [null, null]);
});

test('an empty list is an empty list', () => {
  assert.deepEqual(supersetLabels([]), []);
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKS ARE ADJACENT RUNS — the same rule deriveBlocks uses
// ─────────────────────────────────────────────────────────────────────────────

test('the same groupId split by a loose lift is TWO blocks, so A then B', () => {
  const day = [ss('g1'), ss('g1'), loose(), ss('g1'), ss('g1')];
  assert.deepEqual(supersetLabels(day), ['A1', 'A2', null, 'B1', 'B2']);
});

test('adjacent blocks with different ids do not merge', () => {
  assert.deepEqual(supersetLabels([ss('a'), ss('a'), ss('b'), ss('b')]), ['A1', 'A2', 'B1', 'B2']);
});

test('whitespace-only group ids read as no group at all', () => {
  assert.deepEqual(supersetLabels([{ groupId: '  ', groupKind: 'superset' }, loose()]), [null, null]);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

test('supersetLabelAt agrees with the array form', () => {
  const day = [ss('a'), ss('a'), loose(), ss('b'), ss('b')];
  assert.equal(supersetLabelAt(day, 1), 'A2');
  assert.equal(supersetLabelAt(day, 2), null);
  assert.equal(supersetLabelAt(day, 4), 'B2');
  assert.equal(supersetLabelAt(day, 99), null);
});

test('the letter alone is what a block heading shows', () => {
  const day = [ss('a'), ss('a'), ss('b'), ss('b')];
  assert.equal(supersetLetterAt(day, 0), 'A');
  assert.equal(supersetLetterAt(day, 3), 'B');
  assert.equal(supersetLetterAt([loose()], 0), null);
});

test('letters keep going past Z rather than wrapping onto each other', () => {
  assert.equal(blockLetter(0), 'A');
  assert.equal(blockLetter(25), 'Z');
  assert.equal(blockLetter(26), 'AA');
  assert.equal(blockLetter(27), 'AB');
});
