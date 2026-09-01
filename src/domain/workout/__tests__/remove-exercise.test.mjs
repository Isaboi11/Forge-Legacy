import test from 'node:test';
import assert from 'node:assert/strict';
import { blockAt, indexAfterRemoval, nextPosition, removeExerciseAt } from '../session-core.ts';

/**
 * Taking an exercise OUT of a live session — the rules that are arithmetic, tested where
 * `node --test` can reach them.
 *
 * The screen's own guards (a running cardio bout, the last exercise standing, a confirm when work has
 * already been logged) live in `/workout` because they are about what the athlete can SEE. Everything
 * here is about what the list becomes.
 */

const ex = (name, section, position, extra = {}) => ({
  name,
  section,
  position,
  sets: [{ setIndex: 0, targetReps: 8, weight: null, actualReps: null, done: false }],
  ...extra,
});

const plan = () => [
  ex('Jump Rope', 'warmup', 0),
  ex('Barbell Squat', 'main', 1),
  ex('Romanian Deadlift', 'main', 2),
  ex('Hamstring Stretch', 'cooldown', 3),
];

test('the removed exercise is gone and everything else is byte-for-byte what it was', () => {
  const next = removeExerciseAt(plan(), 1);
  assert.deepEqual(next.map((e) => e.name), ['Jump Rope', 'Romanian Deadlift', 'Hamstring Stretch']);
  assert.deepEqual(next.map((e) => e.position), [0, 2, 3], 'positions are NOT renumbered — they are the save join key');
});

test('NOTHING IS PROMOTED INTO A REMOVED WARM-UP SLOT — the PO’s rule, stated as a test', () => {
  const next = removeExerciseAt(plan(), 0);
  assert.equal(next.filter((e) => e.section === 'warmup').length, 0, 'the section is simply not part of this session any more');
  assert.deepEqual(next.map((e) => e.section), ['main', 'main', 'cooldown'], 'no exercise changed section to fill the gap');
});

test('removing the only cool-down leaves the main work untouched', () => {
  const next = removeExerciseAt(plan(), 3);
  assert.deepEqual(next.map((e) => e.section), ['warmup', 'main', 'main']);
});

test('an out-of-range index changes nothing rather than dropping the last exercise', () => {
  assert.deepEqual(removeExerciseAt(plan(), 9).map((e) => e.name), plan().map((e) => e.name));
  assert.deepEqual(removeExerciseAt(plan(), -1).map((e) => e.name), plan().map((e) => e.name));
});

test('a superset left with ONE member is dissolved, not left pairing with itself', () => {
  const paired = [
    ex('Bench Press', 'main', 0, { groupId: 'ss1', groupKind: 'superset', groupName: 'Superset', groupRounds: 3 }),
    ex('Barbell Row', 'main', 1, { groupId: 'ss1', groupKind: 'superset', groupName: 'Superset', groupRounds: 3 }),
    ex('Plank', 'main', 2),
  ];
  const next = removeExerciseAt(paired, 1);
  assert.equal(next.length, 2);
  assert.equal(next[0].name, 'Bench Press');
  assert.equal(next[0].groupId, undefined, 'the survivor is an ordinary exercise again');
  assert.equal(next[0].groupKind, undefined);
  assert.equal(next[0].groupRounds, undefined);
  assert.equal(blockAt(next, 0), null);
});

test('a superset of three keeps being a superset when one member goes', () => {
  const trio = ['A', 'B', 'C'].map((n, i) =>
    ex(n, 'main', i, { groupId: 'ss1', groupKind: 'superset', groupName: 'Superset', groupRounds: 3 }),
  );
  const next = removeExerciseAt(trio, 1);
  const block = blockAt(next, 0);
  assert.equal(block?.count, 2, 'two members is still a pairing');
  assert.equal(block?.groupId, 'ss1');
});

test('logged sets on the survivors are never touched', () => {
  const logged = [
    ex('Bench Press', 'main', 0, { groupId: 'ss1', groupKind: 'superset' }),
    ex('Barbell Row', 'main', 1, { groupId: 'ss1', groupKind: 'superset' }),
  ];
  logged[0].sets = [{ setIndex: 0, targetReps: 8, weight: 135, actualReps: 8, done: true }];
  const next = removeExerciseAt(logged, 1);
  assert.deepEqual(next[0].sets, [{ setIndex: 0, targetReps: 8, weight: 135, actualReps: 8, done: true }]);
});

test('removing the exercise you are ON lands you on the next one', () => {
  assert.equal(indexAfterRemoval(3, 1, 1), 1, 'index 1 is now what used to be index 2');
});

test('removing the LAST exercise while standing on it lands you on the one before', () => {
  assert.equal(indexAfterRemoval(3, 3, 3), 2);
});

test('removing an exercise ABOVE you keeps the screen on the same lift', () => {
  assert.equal(indexAfterRemoval(3, 0, 2), 1, 'you were on the third; it is the second now');
});

test('removing an exercise BELOW you does not move you at all', () => {
  assert.equal(indexAfterRemoval(3, 3, 1), 1);
});

test('an empty session reports index 0 rather than -1', () => {
  assert.equal(indexAfterRemoval(0, 0, 0), 0);
});

test('THE COLLISION REMOVAL WOULD HAVE CAUSED: the next position is one past the highest, not the length', () => {
  const holed = removeExerciseAt(plan(), 1); // positions [0, 2, 3], length 3
  assert.equal(holed.length, 3);
  assert.equal(nextPosition(holed), 4, 'length would have said 3 — a duplicate of Hamstring Stretch');
  assert.ok(!holed.some((e) => e.position === nextPosition(holed)), 'and the new position collides with nothing');
});

test('an untouched session still appends where it always did', () => {
  assert.equal(nextPosition(plan()), 4);
});

test('an empty session starts at position 0', () => {
  assert.equal(nextPosition([]), 0);
});
