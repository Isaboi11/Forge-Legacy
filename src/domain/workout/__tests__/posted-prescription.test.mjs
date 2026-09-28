import test from 'node:test';
import assert from 'node:assert/strict';

import { readWrittenWorkout, writtenToTemplate, nameCandidates } from '../written-workout.ts';
import { hasPrescription, maxKeyOf, maxKeysNeeded, prescribedSets, prescriptionOf, withMaxes } from '../template-prescription.ts';
import { clock, postedLines, postedTally } from '../posted-workout-lines.ts';
import { LB_RULES, KG_RULES } from '../../program/percent-max.ts';

/*
 * The whole road a Squatober day travels (PO 2026-09-27): the card as written → template rows → the preview a
 * member reads → the sets the logger starts with → a max changed mid-workout. Every weight below was worked out
 * by hand from the athlete's max, not copied from the code's output.
 */

const KEY = (n) =>
  ({
    'Back Squat': 'barbell-back-squat',
    Deadlift: 'barbell-deadlift',
    'Bench Press': 'barbell-bench-press',
    'Close Grip Bench Press': 'barbell-close-grip-bench-press',
    'Chin-Up': 'chin-up',
    'Dumbbell Romanian Deadlift': 'dumbbell-romanian-deadlift',
  })[n];

const LOAD = { maxes: { 'barbell-back-squat': 315, 'barbell-bench-press': 225, 'barbell-deadlift': 405 }, unit: 'lb', rules: LB_RULES };

const DAY1 = `"For Those About to SQUAT"
Day: 1
1. BACK SQUAT 4,6,8,6,4 reps @ 67%
2 minutes rest between each set
2. DEADlift 4 sets of 4 reps @ 70%
2 minutes rest between each set
3. a. SLOW Strict CHIN UP 4 sets of 2-4 reps
super set b. DB RDL's 4 sets of 5 reps
2 min rest between each super set`;

const DAY7 = `"THE COUNTDOWN"
Day: 7
1. BACK SQUAT 5 total sets 15 total reps 2 min rest
5 reps @ 65%
4 reps @ 75%
3 reps @ 80%
2 reps @ 87%
1 rep @ 92%
2. a. BENCH PRESS "same as above"
super set b. ONE ARM DB Rows 5 sets of 5 reps
2 to 2½ min rest
Cardio
Close Grip Bench Press
Get 100 reps with 33% of your Bench Max.`;

const rowsOf = (text) => writtenToTemplate(readWrittenWorkout(text), KEY);

test('the chin-up matches through its how-words, and "Slow strict" becomes its note', () => {
  const rows = rowsOf(DAY1);
  const chin = rows.find((r) => /chin/i.test(r.name));
  assert.equal(chin.catalogKey, 'chin-up');
  assert.match(chin.coachNote, /^Slow strict/);
  const rdl = rows.find((r) => /rdl/i.test(r.name));
  assert.equal(rdl.catalogKey, 'dumbbell-romanian-deadlift');
  assert.ok(nameCandidates("DB RDL's").includes('Dumbbell Romanian Deadlift'));
});

test('the logger starts Day 1 with gray weights from a 315 squat: 67% → 210 on every set, 4-6-8-6-4, 2:00 rest after each', () => {
  const squat = rowsOf(DAY1)[0];
  assert.ok(hasPrescription(squat));
  assert.equal(maxKeyOf(squat), 'barbell-back-squat');
  const sets = prescribedSets(squat, LOAD);
  assert.deepEqual(sets.map((s) => s.targetReps), [4, 6, 8, 6, 4]);
  assert.deepEqual(sets.map((s) => s.targetWeight), [210, 210, 210, 210, 210]);
  assert.deepEqual(sets.map((s) => s.targetPct), [67, 67, 67, 67, 67]);
  assert.deepEqual(sets.map((s) => s.restSec), [120, 120, 120, 120, 120]);
  for (const s of sets) {
    assert.equal(s.weight, null, 'the gray weight is a TARGET — nothing is logged until they tick it');
    assert.equal(s.done, false);
  }
});

test('Day 7: the squat ramp and the bench "same as above" each get their OWN max', () => {
  const rows = rowsOf(DAY7);
  const squat = prescribedSets(rows[0], LOAD);
  assert.deepEqual(squat.map((s) => s.targetWeight), [205, 235, 250, 275, 290]);
  assert.deepEqual(squat.map((s) => s.targetReps), [5, 4, 3, 2, 1]);
  const bench = prescribedSets(rows[1], LOAD);
  assert.equal(rows[1].catalogKey, 'barbell-bench-press');
  assert.deepEqual(bench.map((s) => s.targetWeight), [145, 170, 180, 195, 205]);
  const cg = rows.find((r) => /close grip/i.test(r.name));
  assert.equal(maxKeyOf(cg), 'barbell-bench-press', '33% of the BENCH max');
  const cgSets = prescribedSets(cg, LOAD);
  assert.equal(cgSets[0].targetWeight, 75, '33% of 225 = 74.25 → 75');
  assert.equal(cgSets[0].targetReps, 0, '"100 reps total" is not a 100-rep set target');
  assert.equal(cgSets.length, 1);
});

test('no max yet: the percentage stays a percentage, never a made-up weight', () => {
  const sets = prescribedSets(rowsOf(DAY1)[0], undefined);
  for (const s of sets) {
    assert.equal(s.targetWeight ?? null, null);
    assert.equal(s.targetPct, 67);
  }
});

test('kg athletes get kg plates: a 140 kg squat at 67% → 93.8 → 95 (2.5 kg steps)', () => {
  const sets = prescribedSets(rowsOf(DAY1)[0], { maxes: { 'barbell-back-squat': 140 }, unit: 'kg', rules: KG_RULES });
  assert.equal(sets[0].targetWeight, 95);
});

test('changing the max mid-workout redraws every gray weight not yet lifted — and never a set already done or a typed weight', () => {
  const exercises = [{ name: 'Back Squat', maxKey: 'barbell-back-squat', sets: prescribedSets(rowsOf(DAY7)[0], LOAD) }];
  exercises[0].sets[0] = { ...exercises[0].sets[0], done: true, weight: 205 };
  exercises[0].sets[1] = { ...exercises[0].sets[1], weight: 245 }; // they typed over the gray 235
  const [after] = withMaxes(exercises, { ...LOAD, maxes: { ...LOAD.maxes, 'barbell-back-squat': 335 } });
  assert.equal(after.sets[0].targetWeight, 205, 'a logged set is history');
  assert.equal(after.sets[0].weight, 205);
  assert.equal(after.sets[1].weight, 245, 'what they typed stays theirs');
  assert.equal(after.sets[1].targetWeight, 250, '75% of 335 = 251.25 → 250');
  assert.deepEqual(after.sets.slice(2).map((s) => s.targetWeight), [270, 290, 310], '80/87/92% of 335');
  const [cleared] = withMaxes(exercises, { ...LOAD, maxes: {} });
  assert.equal(cleared.sets[2].targetWeight, null, 'a cleared max goes back to the bare percentage');
});

test('the maxes a session needs, in the order it meets them', () => {
  const rows = rowsOf(DAY7);
  const ex = rows.map((r) => ({ maxKey: hasPrescription(r) ? maxKeyOf(r) : null }));
  assert.deepEqual(maxKeysNeeded(ex), ['barbell-back-squat', 'barbell-bench-press']);
});

test('per-set rest reaches the sets: 87% rest 20s, 87% rest 20s, 90% rest 2:30', () => {
  const [row] = rowsOf('1. Back Squat 1@87% rest 20s, 1@87% rest 20s, 1@90% rest 2:30');
  const sets = prescribedSets(row, LOAD);
  assert.deepEqual(sets.map((s) => s.restSec), [20, 20, 150]);
  assert.deepEqual(sets.map((s) => s.targetWeight), [275, 275, 285], '87% of 315 = 274 → 275; 90% = 283.5 → 285');
});

test('the preview: what a member reads before taking it', () => {
  const lines = postedLines(rowsOf(DAY1), LOAD);
  assert.deepEqual(lines.map((l) => l.label), ['1', '2', '3a', '3b']);
  assert.equal(lines[0].summary, '5 sets · 4-6-8-6-4 reps · 67% · 210 lb');
  assert.equal(lines[0].rest, 'Rest 2:00 between sets');
  assert.deepEqual(lines[0].sets.map((s) => s.text), ['4 reps · 67% · 210 lb', '6 reps · 67% · 210 lb', '8 reps · 67% · 210 lb', '6 reps · 67% · 210 lb', '4 reps · 67% · 210 lb']);
  assert.equal(lines[1].summary, '4 × 4 · 70% · 285 lb', '70% of 405 = 283.5 → 285');
  assert.equal(lines[1].sets.length, 0, 'identical sets need no per-set list');
  assert.equal(lines[2].superset, 'Superset: do 3a, then 3b back to back, then rest.');
  assert.equal(lines[2].rest, null, 'a superset rests after the round, not after 3a');
  assert.equal(lines[3].rest, 'Rest 2:00 after each round');
  assert.equal(lines[2].summary, '4 × 2-4');
});

test('the preview of a ramp lists each rung with its own weight; without a max it shows the percentages alone', () => {
  const [squat] = postedLines(rowsOf(DAY7), LOAD);
  assert.equal(squat.summary, '5 sets · 5-4-3-2-1 reps · 65-92%');
  assert.deepEqual(squat.sets.map((s) => s.text), ['5 reps · 65% · 205 lb', '4 reps · 75% · 235 lb', '3 reps · 80% · 250 lb', '2 reps · 87% · 275 lb', '1 rep · 92% · 290 lb']);
  const [bare] = postedLines(rowsOf(DAY7));
  assert.deepEqual(bare.sets.map((s) => s.text), ['5 reps · 65%', '4 reps · 75%', '3 reps · 80%', '2 reps · 87%', '1 rep · 92%']);
  const cg = postedLines(rowsOf(DAY7), LOAD, { 'barbell-bench-press': 'Bench Press' }).find((l) => /close grip/i.test(l.name));
  assert.equal(cg.summary, '1 set · 33% of Bench Press · 75 lb');
});

test('the feed card tally counts a ramp as its sets', () => {
  assert.equal(postedTally(rowsOf(DAY7)), '4 lifts · 16 sets');
  assert.equal(clock(150), '2:30');
  assert.equal(clock(20), '0:20');
});

test('stored rows read back through the whitelist unchanged — and junk is dropped, not resolved into a bar', () => {
  const [row] = rowsOf(DAY7);
  const stored = JSON.parse(JSON.stringify(row));
  assert.deepEqual(prescriptionOf(stored), {
    repScheme: [5, 4, 3, 2, 1],
    percentScheme: [65, 75, 80, 87, 92],
    restSec: 120,
  });
  assert.deepEqual(prescriptionOf({ percentOfMax: 0, repScheme: ['x'], restSec: 'soon', percentOf: '  ' }), {});
  assert.deepEqual(prescriptionOf({ name: 'Old template', sets: 3, targetReps: 10 }), {}, 'a template from before reads exactly as it did');
  assert.equal(hasPrescription({}), false);
});
