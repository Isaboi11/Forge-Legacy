import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockRoundsText,
  deriveBlocks,
  durText,
  estimatedSessionMinutes,
  isAmrap,
  isTimed,
  plannedSetCount,
  repTargets,
  schemeText,
  sessionSize,
  sessionSummary,
  setCount,
} from '../prescription.ts';
import { estimatedMinutes } from '../../workout/template-format.ts';

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

// ── how big is this session ──────────────────────────────────────────────────
//
// The preview sheet summarised a day with `main.length` and `plannedSetCount`, and both lied about a
// day that has a finisher in it. Squat & Sled (Iron and Engine, Day A) is the real one it lied about,
// so it is the fixture: three lifts and a three-round Engine block, drawn as three rows and one card.

const SQUAT_AND_SLED = {
  warmup: [
    { name: 'Bodyweight Squat', sets: 1, reps: 10 },
    { name: 'Glute Bridge', sets: 1, reps: 10 },
  ],
  main: [
    { name: 'Barbell Back Squat', sets: 4, reps: 6 },
    { name: 'Dumbbell Romanian Deadlift', sets: 3, reps: 10 },
    { name: 'Bulgarian Split Squat', sets: 3, reps: 8, per: 'leg' },
    ...['Sled Push', 'Kettlebell Swing', 'Burpee'].map((name, i) => ({
      name,
      sets: 1,
      ...(i === 0 ? { durationSec: 30 } : { reps: i === 1 ? 15 : 10 }),
      groupId: 'w12a-engine',
      groupName: 'Engine — Sled Ladder',
      groupKind: 'circuit',
      groupRounds: 3,
    })),
  ],
};

test('the summary counts what the sheet DRAWS, not what the array holds', () => {
  const { warmup, main } = SQUAT_AND_SLED;
  const size = sessionSize(warmup, main);

  assert.equal(size.exercises, 3, 'the three circuit stations are not peers of the three lifts');
  assert.equal(size.sets, 10, '4 + 3 + 3 — the circuit contributes no sets, it contributes a finisher');
  assert.deepEqual(size.blockLabels, ['3-round finisher']);

  assert.equal(
    sessionSummary(warmup, main),
    '~40 min · 3 exercises · 10 sets · 3-round finisher',
    'the line that replaced "6 exercises · 19 sets" — a count matching neither the rows above nor below',
  );
});

test('the old totals are still the old totals — the summary changed, the arithmetic did not', () => {
  // `plannedSetCount` is right about VOLUME and is still what Program Detail and the builder ask. The
  // defect was using a volume number as a description, so both readings must survive side by side.
  assert.equal(SQUAT_AND_SLED.main.length, 6);
  assert.equal(plannedSetCount(SQUAT_AND_SLED.main), 19, '3 rounds × 3 stations really is nine sets of work');
});

test('duration leads, because that is the question being asked', () => {
  const line = sessionSummary(SQUAT_AND_SLED.warmup, SQUAT_AND_SLED.main);
  assert.match(line, /^~\d+ min ·/, '"can I fit this in right now" is not answered by a set count');
});

test('a block in the MIDDLE of a day is not a finisher', () => {
  const main = [
    { name: 'Trap Bar Deadlift', sets: 3, reps: 5 },
    { name: 'Push-Up', sets: 1, reps: 12, groupId: 'g1', groupKind: 'superset', groupRounds: 3 },
    { name: 'Inverted Row', sets: 1, reps: 12, groupId: 'g1', groupKind: 'superset', groupRounds: 3 },
    { name: 'Farmer Carry', sets: 3, reps: 1 },
  ];
  assert.deepEqual(sessionSize(undefined, main).blockLabels, ['3-round superset'], 'it ends nothing');
});

test('an AMRAP names itself by its clock and claims no rounds', () => {
  const main = [
    { name: 'Front Squat', sets: 5, reps: 3 },
    { name: 'Wall Ball', sets: 1, reps: 20, groupId: 'a', groupKind: 'circuit', groupCapSec: 480 },
    { name: 'Box Jump', sets: 1, reps: 10, groupId: 'a', groupKind: 'circuit', groupCapSec: 480 },
  ];
  const size = sessionSize(undefined, main);
  assert.deepEqual(size.blockLabels, ['8m amrap'], 'never "3-round finisher" — nobody knows how many rounds');
  assert.equal(size.sets, 5, 'only the loose lift prescribes sets');
  assert.equal(size.minutes, 25, '5 × 3 min + the 8m cap + a minute after it');
});

test('nothing is claimed where nothing was authored', () => {
  // A MOBILITY day: names only, no sets, no reps. "0 sets" is a confident claim of emptiness.
  const main = [{ name: '90/90 Hip Switch' }, { name: 'Thoracic Opener' }, { name: "World's Greatest Stretch" }];
  const line = sessionSummary(undefined, main);
  assert.match(line, /3 exercises/);
  assert.doesNotMatch(line, /0 sets/);
});

test('one exercise and one set are singular', () => {
  assert.equal(sessionSummary(undefined, [{ name: 'Deadlift', sets: 1, reps: 5 }]), '~5 min · 1 exercise · 1 set');
});

test('a warm-up costs time but is not charged as working sets', () => {
  const main = [{ name: 'Barbell Back Squat', sets: 4, reps: 6 }];
  const warm = [{ name: 'Bodyweight Squat', sets: 1, reps: 10 }, { name: 'Glute Bridge', sets: 1, reps: 10 }];
  assert.equal(sessionSize(warm, main).sets, 4, 'the warm-up is not in the set count');
  assert.ok(
    estimatedSessionMinutes(warm, main) > estimatedSessionMinutes(undefined, main),
    'but it is in the clock — a warm-up you do takes time you spend',
  );
  // 4 × 3 min = 12, + 2 × 90s = 15 → rounds to 15, not the 20 that charging it two full sets would give.
  assert.equal(estimatedSessionMinutes(warm, main), 15);
});

test('a cardio bout is timed by its own prescription', () => {
  assert.equal(estimatedSessionMinutes(undefined, [{ name: 'Row', kind: 'cardio', targetSec: 1200 }]), 20);
  assert.equal(estimatedSessionMinutes(undefined, [{ name: 'Run', kind: 'cardio', targetMi: 3 }]), 25, '~9 min/mi');
  assert.equal(
    estimatedSessionMinutes(undefined, [{ name: 'Row', kind: 'cardio' }]),
    5,
    'an open bout states no length, and the floor is the honest answer rather than an invented one',
  );
});

test('a program day and a template cannot disagree about how long ten sets take', () => {
  // One `MINUTES_PER_SET`, two estimators. They drifted apart the moment there were two constants.
  const main = [{ name: 'Bench Press', sets: 5, reps: 5 }, { name: 'Barbell Row', sets: 5, reps: 8 }];
  assert.equal(estimatedSessionMinutes(undefined, main), estimatedMinutes([{ sets: 10, targetReps: 8 }]));
});
