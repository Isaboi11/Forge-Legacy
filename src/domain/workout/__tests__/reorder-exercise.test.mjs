import test from 'node:test';
import assert from 'node:assert/strict';

import { blockAt } from '../session-core.ts';
import { indexAfterMove, moveExercise, stepExercise } from '../reorder-exercise.ts';

/**
 * Drag to reorder in All Exercises — PO 2026-09-28: "we should make it where you can drag around the
 * exercises to rearrange if you're wanting."
 */

const sets = (n, done = 0) => Array.from({ length: n }, (_, i) => ({ setIndex: i, targetReps: 8, weight: null, actualReps: null, done: i < done }));
let pos = 0;
const lift = (name, extra = {}) => ({ name, section: 'main', position: pos++, sets: sets(3), ...extra });
const ss = (gid) => ({ groupId: gid, groupKind: 'superset', groupRounds: 3 });
const names = (list) => list.map((e) => e.name);

test('⭐ a plain move is a splice — down and up', () => {
  const ex = [lift('Squat'), lift('Bench'), lift('Row'), lift('Curl')];
  assert.deepEqual(names(moveExercise(ex, 0, 2)), ['Bench', 'Row', 'Squat', 'Curl']);
  assert.deepEqual(names(moveExercise(ex, 3, 0)), ['Curl', 'Squat', 'Bench', 'Row']);
});

test('out-of-range or no-op moves return the list unchanged (a copy)', () => {
  const ex = [lift('Squat'), lift('Bench')];
  assert.deepEqual(names(moveExercise(ex, 0, 0)), ['Squat', 'Bench']);
  assert.deepEqual(names(moveExercise(ex, 0, 5)), ['Squat', 'Bench']);
  assert.notEqual(moveExercise(ex, 0, 0), ex);
});

test('⭐ logged sets and the save join key travel with the row', () => {
  const ex = [lift('Squat', { sets: sets(3, 2) }), lift('Bench'), lift('Row')];
  const out = moveExercise(ex, 0, 2);
  assert.equal(out[2].name, 'Squat');
  assert.equal(out[2].position, ex[0].position);
  assert.equal(out[2].sets.filter((s) => s.done).length, 2);
});

test('⭐ reordering members INSIDE a superset keeps it one superset', () => {
  const ex = [lift('Squat'), lift('Bench', ss('s1')), lift('Row', ss('s1')), lift('Curl')];
  const out = moveExercise(ex, 2, 1);
  assert.deepEqual(names(out), ['Squat', 'Row', 'Bench', 'Curl']);
  const b = blockAt(out, 1);
  assert.equal(b.count, 2);
  assert.equal(b.groupId, 's1');
});

test('⭐ dragging a lift away from its partner takes it out of the superset — and the partner goes solo', () => {
  const ex = [lift('Bench', ss('s1')), lift('Row', ss('s1')), lift('Squat'), lift('Curl')];
  const out = moveExercise(ex, 0, 3);
  assert.deepEqual(names(out), ['Row', 'Squat', 'Curl', 'Bench']);
  assert.equal(out[3].groupId, undefined);
  assert.equal(out[3].groupKind, undefined);
  assert.equal(out[0].groupId, undefined, 'a one-member superset is not a superset');
  assert.equal(blockAt(out, 0), null);
});

test('a three-lift superset losing one keeps the other two paired', () => {
  const ex = [lift('A', ss('s1')), lift('B', ss('s1')), lift('C', ss('s1')), lift('D')];
  const out = moveExercise(ex, 0, 3);
  assert.deepEqual(names(out), ['B', 'C', 'D', 'A']);
  assert.equal(blockAt(out, 0).count, 2);
  assert.equal(out[3].groupId, undefined);
});

test('⛔ a lift never lands BETWEEN two partners — it steps past the superset in the direction of the drag', () => {
  const down = [lift('Squat'), lift('Bench', ss('s1')), lift('Row', ss('s1')), lift('Curl')];
  // dragging Squat down to index 1 would sit between Bench and Row → lands after the pair
  const outDown = moveExercise(down, 0, 1);
  assert.deepEqual(names(outDown), ['Bench', 'Row', 'Squat', 'Curl']);
  assert.equal(blockAt(outDown, 0).count, 2);

  const up = [lift('Bench', ss('s2')), lift('Row', ss('s2')), lift('Curl')];
  // dragging Curl up to index 1 would sit between Bench and Row → lands before the pair
  const outUp = moveExercise(up, 2, 1);
  assert.deepEqual(names(outUp), ['Curl', 'Bench', 'Row']);
  assert.equal(blockAt(outUp, 1).count, 2);
});

test('a member of one superset cannot split another superset either', () => {
  const ex = [lift('A', ss('s1')), lift('B', ss('s1')), lift('C', ss('s2')), lift('D', ss('s2'))];
  const out = moveExercise(ex, 0, 2);
  assert.deepEqual(names(out), ['B', 'C', 'D', 'A']);
  assert.equal(blockAt(out, 1).count, 2, 'C+D intact');
  assert.equal(out[3].groupId, undefined, 'A left its own pair');
  assert.equal(out[0].groupId, undefined, 'B alone is no longer a superset');
});

test('landing right next to a superset (not inside it) leaves both alone', () => {
  const ex = [lift('Curl'), lift('Bench', ss('s1')), lift('Row', ss('s1'))];
  const out = moveExercise(ex, 0, 2);
  assert.deepEqual(names(out), ['Bench', 'Row', 'Curl']);
  assert.equal(blockAt(out, 0).count, 2);
  assert.equal(out[2].groupId, undefined);
});

test('⭐ the athlete stays on the exercise they were on, wherever it went', () => {
  const ex = [lift('Squat'), lift('Bench'), lift('Row')];
  const out = moveExercise(ex, 1, 0); // Bench to the top; they were on Row
  assert.equal(indexAfterMove(out, ex[2].position, 2), 2);
  assert.equal(indexAfterMove(out, ex[1].position, 1), 0, 'moving the one you are on follows it');
  assert.equal(indexAfterMove(out, undefined, 9), 2, 'unknown → clamped fallback');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE BUILDERS' UP / DOWN ARROWS (library-01, QA 09-26)
// ─────────────────────────────────────────────────────────────────────────────

/** Every group id sits in ONE contiguous run — the thing a plain swap used to break. */
const legal = (list) => {
  const seen = new Set();
  let prev;
  for (const e of list) {
    if (e.groupId && e.groupId !== prev && seen.has(e.groupId)) return false;
    if (e.groupId) seen.add(e.groupId);
    prev = e.groupId;
  }
  return true;
};

test('⭐ an arrow on a lone row next to a lone row is a plain swap', () => {
  const ex = [lift('Squat'), lift('Bench'), lift('Row')];
  assert.deepEqual(names(stepExercise(ex, 0, 1)), ['Bench', 'Squat', 'Row']);
  assert.deepEqual(names(stepExercise(ex, 2, -1)), ['Squat', 'Row', 'Bench']);
});

test('an arrow past either end changes nothing (a copy)', () => {
  const ex = [lift('Squat'), lift('Bench')];
  assert.deepEqual(names(stepExercise(ex, 0, -1)), ['Squat', 'Bench']);
  assert.deepEqual(names(stepExercise(ex, 1, 1)), ['Squat', 'Bench']);
  assert.notEqual(stepExercise(ex, 1, 1), ex);
});

test('⭐ inside a superset the two members trade places and stay one superset', () => {
  const ex = [lift('Squat'), lift('Bench', ss('s1')), lift('Row', ss('s1')), lift('Curl')];
  const out = stepExercise(ex, 1, 1);
  assert.deepEqual(names(out), ['Squat', 'Row', 'Bench', 'Curl']);
  assert.equal(blockAt(out, 1).count, 2);
});

test('⭐ the old bug: the last member stepping DOWN takes the whole superset with it, unbroken', () => {
  const ex = [lift('Bench', ss('s1')), lift('Row', ss('s1')), lift('Curl')];
  const out = stepExercise(ex, 1, 1);
  assert.deepEqual(names(out), ['Curl', 'Bench', 'Row']);
  assert.equal(blockAt(out, 1).count, 2);
  assert.ok(legal(out));
});

test('the first member stepping UP takes the whole superset with it', () => {
  const ex = [lift('Curl'), lift('Bench', ss('s1')), lift('Row', ss('s1'))];
  const out = stepExercise(ex, 1, -1);
  assert.deepEqual(names(out), ['Bench', 'Row', 'Curl']);
  assert.equal(blockAt(out, 0).count, 2);
});

test('⭐ the other old bug: a lone row steps PAST a superset, never into the middle of it', () => {
  const ex = [lift('Curl'), lift('Bench', ss('s1')), lift('Row', ss('s1')), lift('Dip')];
  const down = stepExercise(ex, 0, 1);
  assert.deepEqual(names(down), ['Bench', 'Row', 'Curl', 'Dip']);
  assert.equal(blockAt(down, 0).count, 2);
  const up = stepExercise(ex, 3, -1);
  assert.deepEqual(names(up), ['Curl', 'Dip', 'Bench', 'Row']);
  assert.equal(blockAt(up, 2).count, 2);
  assert.equal(up[1].groupId, undefined, 'the lone row did not join the superset');
});

test('two supersets side by side trade places whole', () => {
  const ex = [lift('A', ss('s1')), lift('B', ss('s1')), lift('C', ss('s2')), lift('D', ss('s2')), lift('E', ss('s2'))];
  const out = stepExercise(ex, 1, 1);
  assert.deepEqual(names(out), ['C', 'D', 'E', 'A', 'B']);
  assert.equal(blockAt(out, 0).count, 3);
  assert.equal(blockAt(out, 3).count, 2);
});

test('⭐ no sequence of arrows can ever split a group — every row, both directions, three deep', () => {
  const start = [lift('W'), lift('A', ss('s1')), lift('B', ss('s1')), lift('X'), lift('C', ss('s2')), lift('D', ss('s2')), lift('E', ss('s2')), lift('Y')];
  let frontier = [start];
  for (let depth = 0; depth < 3; depth += 1) {
    const next = [];
    for (const list of frontier) {
      for (let i = 0; i < list.length; i += 1) {
        for (const dir of [-1, 1]) {
          const out = stepExercise(list, i, dir);
          assert.ok(legal(out), `split after ${names(list).join(',')} @${i} ${dir}`);
          assert.equal(out.length, list.length);
          assert.deepEqual([...names(out)].sort(), [...names(list)].sort(), 'nothing lost, nothing duplicated');
          assert.equal(out.filter((e) => e.groupId === 's1').length, 2);
          assert.equal(out.filter((e) => e.groupId === 's2').length, 3);
          next.push(out);
        }
      }
    }
    frontier = next.slice(0, 400);
  }
});

test('a program-builder row (no sets, no position) moves the same way — only groupId is read', () => {
  const rows = [{ id: 'x1', name: 'Press', groupId: 'g', groupKind: 'superset' }, { id: 'x2', name: 'Row', groupId: 'g', groupKind: 'superset' }, { id: 'x3', name: 'Curl' }];
  assert.deepEqual(stepExercise(rows, 2, -1).map((r) => r.id), ['x3', 'x1', 'x2']);
});
