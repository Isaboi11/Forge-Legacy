import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockAt,
  breakBlock,
  endsSupersetRound,
  groupFieldsOf,
  groupKindOf,
  makeSuperset,
  nextInSuperset,
  sessionSetsFor,
  supersetRounds,
} from '../session-core.ts';

const targets = (sets) => sets.map((s) => s.targetReps);

test('a flat prescription builds the same sets it always did', () => {
  const sets = sessionSetsFor({ name: 'Bench Press', sets: 4, reps: 8 });
  assert.equal(sets.length, 4);
  assert.deepEqual(targets(sets), [8, 8, 8, 8]);
  assert.deepEqual(sets.map((s) => s.setIndex), [0, 1, 2, 3]);
  assert.ok(sets.every((s) => s.weight === null && s.actualReps === null && !s.done));
});

test('a ladder arrives as four DIFFERENT sets, not four identical ones', () => {
  const sets = sessionSetsFor({ name: 'Incline Bench Press', repScheme: [6, 6, 4, 4] });
  assert.deepEqual(targets(sets), [6, 6, 4, 4], 'the regression: this used to be [6, 6, 6, 6]');
});

test('a descending wave keeps its shape', () => {
  assert.deepEqual(targets(sessionSetsFor({ name: 'Barbell Squat', repScheme: [10, 8, 6, 4] })), [10, 8, 6, 4]);
});

test('a to-failure set is flagged and carries no invented rep count', () => {
  const sets = sessionSetsFor({ name: 'Dips', repScheme: ['F', 'F', 'F'] });
  assert.equal(sets.length, 3);
  assert.ok(sets.every((s) => s.toFailure === true));
  assert.deepEqual(targets(sets), [0, 0, 0], 'zero, so no fabricated volume and no fabricated PR');
});

test('a mixed ladder flags only the failure set', () => {
  const sets = sessionSetsFor({ name: 'EZ-Bar Upright Row', repScheme: [10, 10, 10, 'F'] });
  assert.deepEqual(sets.map((s) => !!s.toFailure), [false, false, false, true]);
  assert.deepEqual(targets(sets), [10, 10, 10, 0]);
});

test('a timed item carries its work time as a target, separate from what gets recorded', () => {
  const [set] = sessionSetsFor({ name: 'Banded Pull Aparts', durationSec: 30 });
  assert.equal(set.targetSec, 30, 'the ask');
  assert.equal(set.durationSec, undefined, 'the answer is not pre-filled with the question');
});

test('a circuit member gets one set PER ROUND, because a round is what you tick off', () => {
  const sets = sessionSetsFor({ name: 'Burpees', reps: 10, groupId: 'hiit', groupRounds: 4 });
  assert.equal(sets.length, 4, 'four rounds of ten burpees is forty burpees and four rows');
  assert.deepEqual(targets(sets), [10, 10, 10, 10]);
});

test('an AMRAP member gets ONE row — nobody knows how many rounds are coming', () => {
  const sets = sessionSetsFor({ name: 'Wall Balls', reps: 20, groupId: 'a1', groupRounds: 3, groupCapSec: 600 });
  assert.equal(sets.length, 1, 'pre-drawing rows would either cap the athlete or invent ones they never owed');
});

test('a loose exercise is untouched by the round expansion', () => {
  assert.equal(sessionSetsFor({ name: 'Barbell Squat', repScheme: [5, 5, 5, 5, 5] }).length, 5);
});

test('circuit membership carries through so the logger can rebuild the same block', () => {
  const g = groupFieldsOf({ name: 'Wall Balls', groupId: 'a1', groupName: 'AMRAP #1', groupCapSec: 600 });
  assert.deepEqual(g, { groupId: 'a1', groupName: 'AMRAP #1', groupKind: undefined, groupRounds: undefined, groupCapSec: 600 });
});

test('a loose exercise reports no group rather than a falsy one', () => {
  assert.equal(groupFieldsOf({ name: 'Barbell Squat', sets: 5, reps: 5 }).groupId, undefined);
});

// ── BLOCKS: supersets and circuits ──────────────────────────────────────────────────────────────────

const exOf = (name, sets, group) => ({
  name,
  section: 'main',
  position: 0,
  sets: Array.from({ length: sets }, (_, i) => ({ setIndex: i, weight: null, targetReps: 8, actualReps: null, done: false })),
  ...(group ?? {}),
});
/** Mark (exercise, set) done. */
const log = (list, ei, si) =>
  list.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j !== si ? s : { ...s, done: true })) }));

test('a block that never said what it is reads as a circuit', () => {
  // Every grouped block authored before supersets existed was a circuit. Absent must not become
  // "superset" or the shipped programs would silently change how they are performed.
  assert.equal(groupKindOf(undefined), 'circuit');
  assert.equal(groupKindOf({}), 'circuit');
  assert.equal(groupKindOf({ groupKind: 'circuit' }), 'circuit');
  assert.equal(groupKindOf({ groupKind: 'superset' }), 'superset');
});

test('a block is found by ADJACENCY, not by scanning the whole session for an id', () => {
  // Two blocks sharing an id sit apart. Filtering by id would report one six-exercise block.
  const list = [
    exOf('A', 3, { groupId: 'g1', groupKind: 'superset', groupRounds: 3 }),
    exOf('B', 3, { groupId: 'g1', groupKind: 'superset', groupRounds: 3 }),
    exOf('Loose', 3),
    exOf('C', 3, { groupId: 'g1', groupKind: 'superset', groupRounds: 3 }),
  ];
  const first = blockAt(list, 0);
  assert.equal(first.start, 0);
  assert.equal(first.count, 2, 'the run stops at the loose exercise');
  assert.equal(blockAt(list, 2), null, 'an ungrouped exercise is in no block');
  assert.equal(blockAt(list, 3).count, 1, 'the later run is its own block');
});

test('superset rounds come from the LONGEST member, so logged work is never hidden', () => {
  const list = makeSuperset([exOf('Press', 3), exOf('Row', 4)], 0, 2, 'g1');
  const b = blockAt(list, 0);
  assert.equal(supersetRounds(list, b), 4, 'four rounds — the fourth just has one lift in it');
  assert.equal(b.rounds, 4);
  assert.equal(b.kind, 'superset');
  assert.equal(b.name, 'Superset');
});

test('a superset advances ROUND-MAJOR — A1, B1, A2, B2 — which is what makes it a superset', () => {
  let list = makeSuperset([exOf('Press', 2), exOf('Row', 2)], 0, 2, 'g1');
  const b = () => blockAt(list, 0);

  assert.deepEqual(nextInSuperset(list, b()), { exIdx: 0, setIdx: 0, round: 0 }, 'A, round 1');
  list = log(list, 0, 0);
  assert.deepEqual(nextInSuperset(list, b()), { exIdx: 1, setIdx: 0, round: 0 }, 'then B, still round 1');
  list = log(list, 1, 0);
  assert.deepEqual(nextInSuperset(list, b()), { exIdx: 0, setIdx: 1, round: 1 }, 'back to A for round 2');
  list = log(list, 0, 1);
  assert.deepEqual(nextInSuperset(list, b()), { exIdx: 1, setIdx: 1, round: 1 });
  list = log(list, 1, 1);
  assert.equal(nextInSuperset(list, b()), null, 'block complete');
});

test('rest is owed after the LAST member of a round, never between A and B', () => {
  // This is the whole reason a superset is not two cards in a row: resting after A defeats it.
  let list = makeSuperset([exOf('Press', 2), exOf('Row', 2)], 0, 2, 'g1');
  const b = blockAt(list, 0);

  assert.equal(endsSupersetRound(list, b, 0, 0), false, 'B still owes round 1 — no rest yet');
  list = log(list, 0, 0);
  assert.equal(endsSupersetRound(list, b, 1, 0), true, 'B closes round 1 — rest now');
});

test('a member already logged out of order does not hold the round open', () => {
  // Somebody logged B's round-1 set first. Finishing A must still close the round.
  const list = log(makeSuperset([exOf('Press', 2), exOf('Row', 2)], 0, 2, 'g1'), 1, 0);
  assert.equal(endsSupersetRound(list, blockAt(list, 0), 0, 0), true);
});

test('breaking a superset leaves ordinary exercises and every logged set intact', () => {
  const grouped = log(makeSuperset([exOf('Press', 2), exOf('Row', 2), exOf('Curl', 2)], 0, 2, 'g1'), 0, 0);
  const flat = breakBlock(grouped, 0);

  assert.equal(blockAt(flat, 0), null);
  assert.ok(!('groupId' in flat[0]) && !('groupKind' in flat[0]), 'the group fields are gone, not nulled');
  assert.equal(flat[0].sets[0].done, true, 'the work survives the ungrouping');
  assert.equal(flat.length, 3);
  assert.deepEqual(flat[2], grouped[2], 'an exercise outside the block is untouched');
});

test('a superset needs at least two members', () => {
  const one = makeSuperset([exOf('Press', 3)], 0, 1, 'g1');
  assert.equal(blockAt(one, 0), null, 'one exercise is not a superset');
});

test('makeSuperset never touches exercises outside the run', () => {
  const list = makeSuperset([exOf('A', 3), exOf('B', 3), exOf('C', 3)], 0, 2, 'g1');
  assert.equal(list[2].groupId, undefined);
  assert.equal(blockAt(list, 0).count, 2);
});

test('a circuit keeps its own identity and its clock', () => {
  const list = [
    exOf('Burpee', 1, { groupId: 'c1', groupName: 'HIIT Finisher', groupRounds: 4, groupCapSec: 480 }),
    exOf('Wall Ball', 1, { groupId: 'c1', groupName: 'HIIT Finisher', groupRounds: 4, groupCapSec: 480 }),
  ];
  const b = blockAt(list, 1);
  assert.equal(b.kind, 'circuit', 'no groupKind means circuit');
  assert.equal(b.name, 'HIIT Finisher');
  assert.equal(b.capSec, 480, 'the AMRAP cap survives');
});

test('groupFieldsOf carries the kind through from the program', () => {
  assert.equal(groupFieldsOf({ name: 'x', groupId: 'g', groupKind: 'superset' }).groupKind, 'superset');
  assert.equal(groupFieldsOf({ name: 'x', groupId: 'g' }).groupKind, undefined, 'absent stays absent');
});
