import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockRoundsText,
  deriveBlocks,
  durText,
  isAmrap,
  isTimed,
  plannedSetCount,
  repTargets,
  schemeText,
  setCount,
} from '../prescription.ts';

// ── set counts and ladders ───────────────────────────────────────────────────

test('a flat prescription still reads exactly as it always did', () => {
  const ex = { name: 'Bench Press', sets: 4, reps: 8 };
  assert.equal(setCount(ex), 4);
  assert.deepEqual(repTargets(ex), [8, 8, 8, 8]);
  assert.equal(schemeText(ex), '4 × 8');
});

test('a ladder keeps every rung — its length IS the set count', () => {
  const ex = { name: 'Incline Bench Press', repScheme: [6, 6, 4, 4] };
  assert.equal(setCount(ex), 4);
  assert.deepEqual(repTargets(ex), [6, 6, 4, 4]);
  assert.equal(schemeText(ex), '4 × 6-6-4-4', 'never collapsed to 4 × 6, which is a different session');
});

test('the ladder wins over a disagreeing sets count', () => {
  const ex = { name: 'Barbell Squat', sets: 9, reps: 99, repScheme: [10, 8, 6, 4] };
  assert.equal(setCount(ex), 4, 'the more specific statement is the truthful one');
  assert.equal(schemeText(ex), '4 × 10-8-6-4');
});

test('to failure survives as a prescription rather than becoming a number', () => {
  const dips = { name: 'Dips', repScheme: ['F', 'F', 'F'] };
  assert.deepEqual(repTargets(dips), ['F', 'F', 'F']);
  assert.equal(schemeText(dips), '3 × F');

  const upright = { name: 'EZ-Bar Upright Row', repScheme: [10, 10, 10, 'F'] };
  assert.equal(schemeText(upright), '4 × 10-10-10-F', 'a mixed ladder keeps the F in position');
});

test('an item with nothing written against it falls back rather than reading as zero sets', () => {
  assert.equal(setCount({ name: 'Farmer Carry' }), 3);
  assert.deepEqual(repTargets({ name: 'Farmer Carry' }), [10, 10, 10]);
});

// ── timed work ───────────────────────────────────────────────────────────────

test('timed work reads as a duration, not as reps', () => {
  const hold = { name: 'Banded Pull Aparts', durationSec: 30 };
  assert.equal(isTimed(hold), true);
  assert.equal(schemeText(hold), '30s');
  assert.equal(schemeText({ name: 'Sled Push', durationSec: 30, sets: 3 }), '3 × 30s');
});

test('durations format the way a card writes them', () => {
  assert.equal(durText(45), '45s');
  assert.equal(durText(60), '1m');
  assert.equal(durText(480), '8m', 'whole minutes never render a trailing 0s');
  assert.equal(durText(90), '1m 30s');
  assert.equal(durText(0), '');
  assert.equal(durText(null), '');
});

// ── cardio by duration ───────────────────────────────────────────────────────

test('a cardio bout prescribed by minutes says so', () => {
  const run = { name: 'Treadmill Run', kind: 'cardio', activity: 'run', targetSec: 900 };
  assert.equal(schemeText(run), '15 min');
});

test('cardio with no target at all prescribes nothing rather than inventing a zero', () => {
  assert.equal(schemeText({ name: 'Row', kind: 'cardio', activity: 'row', targetSec: null }), '');
});

// ── circuits ─────────────────────────────────────────────────────────────────

const circuit = (name, gid, rounds, items) =>
  items.map((i) => ({ ...i, groupId: gid, groupName: name, groupRounds: rounds }));

test('adjacent items sharing a group become one block', () => {
  const items = [
    ...circuit('Warm up muscle group', 'w1', 2, [
      { name: 'Straight bar stretch', durationSec: 30 },
      { name: 'Banded Pull Aparts', durationSec: 30 },
    ]),
    { name: 'Incline Bench Press', repScheme: [6, 6, 4, 4] },
  ];
  const blocks = deriveBlocks(items);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].name, 'Warm up muscle group');
  assert.equal(blocks[0].items.length, 2);
  assert.equal(blocks[0].rounds, 2);
  assert.equal(blocks[1].groupId, null, 'a loose exercise is its own block with no round count');
  assert.equal(blocks[1].items.length, 1);
});

test('two blocks with the same name stay separate because grouping is by ADJACENCY', () => {
  const items = [
    ...circuit('AMRAP #1', 'a1', 3, [{ name: 'Wall Balls', reps: 20 }]),
    ...circuit('AMRAP #2', 'a2', 3, [{ name: 'Box Jumps', reps: 20 }]),
  ];
  assert.equal(deriveBlocks(items).length, 2);
});

test('a loose exercise between two circuits ends the first instead of fusing them', () => {
  const items = [
    { name: 'Sled Push', groupId: 'g', groupName: 'Sled', groupRounds: 3, durationSec: 30 },
    { name: 'Barbell Squat', repScheme: [5, 5, 5] },
    { name: 'Sled Pull', groupId: 'g', groupName: 'Sled', groupRounds: 3, durationSec: 30 },
  ];
  const blocks = deriveBlocks(items);
  assert.equal(blocks.length, 3, 'the same id reappearing later is a NEW block, not the old one resumed');
  assert.deepEqual(blocks.map((b) => b.items.length), [1, 1, 1]);
});

test('an AMRAP is bounded by its clock and prescribes no round count', () => {
  const items = [
    { name: 'Pulse Squats', reps: 20, groupId: 'a', groupName: 'AMRAP #1', groupRounds: 3, groupCapSec: 480 },
    { name: 'Burpees', reps: 10, groupId: 'a', groupName: 'AMRAP #1', groupRounds: 3, groupCapSec: 480 },
  ];
  const [block] = deriveBlocks(items);
  assert.equal(isAmrap(block), true);
  assert.equal(block.capSec, 480);
  assert.equal(block.rounds, null, 'a cap replaces the round count rather than sitting beside it');
  assert.equal(blockRoundsText(block), '8m');
});

test('a rounds block shows its round count', () => {
  const [block] = deriveBlocks(circuit('HIIT Finisher', 'h', 4, [{ name: 'Burpees', reps: 10 }]));
  assert.equal(blockRoundsText(block), '4');
});

// ── planned volume ───────────────────────────────────────────────────────────

test('a circuit counts its rounds toward planned sets', () => {
  const items = [
    { name: 'Barbell Squat', repScheme: [5, 5, 5, 5, 5] },
    ...circuit('Core', 'c', 3, [{ name: 'Sit Ups', reps: 12 }, { name: 'Twists', reps: 16 }]),
  ];
  assert.equal(plannedSetCount(items), 5 + 3 * 2, 'a 2-exercise circuit run 3 times is 6 sets, not 2');
});

test('an AMRAP contributes no planned sets, because nobody knows how many there will be', () => {
  const items = [
    { name: 'Wall Balls', reps: 20, groupId: 'a', groupName: 'AMRAP', groupRounds: 3, groupCapSec: 600 },
  ];
  assert.equal(plannedSetCount(items), 0);
});

// ── silence is not a prescription ────────────────────────────────────────────

test('an item the author left blank displays nothing, rather than the authoring default', () => {
  assert.equal(schemeText({ name: 'Reverse Lunge, Hammer Curl, Press (Left)' }), '');
  assert.deepEqual(repTargets({ name: 'Reverse Lunge, Hammer Curl, Press (Left)' }), [10, 10, 10],
    'the builder still gets a starting point — it is only the DISPLAY that must not claim one');
});

test('a circuit member states its reps alone, without a contradictory "1 ×"', () => {
  assert.equal(schemeText({ name: 'Box Jumps', reps: 12, groupId: 'h', groupRounds: 4 }), '12');
  assert.equal(schemeText({ name: 'Box Jumps', reps: 12 }), '3 × 12', 'a loose exercise is unaffected');
});

test('a timed circuit member still shows its clock', () => {
  assert.equal(schemeText({ name: 'Assault Bike', durationSec: 45, groupId: 'h', groupRounds: 4 }), '45s');
});
