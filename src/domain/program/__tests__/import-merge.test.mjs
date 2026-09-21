import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgramTable } from '../import-parse.ts';
import { mergeParsedWeeks } from '../import-merge.ts';

/* Real parser output, the shape the photo reader hands back: a header row, then rows. One photo each. */
const read = (tsv) => {
  const r = parseProgramTable(tsv);
  assert.ok(r.ok, `fixture did not parse: ${r.ok ? '' : r.error}`);
  return r.weeks;
};
const push = read('Day\tExercise\tSets\tReps\nPush Day\tBench Press\t4\t8\nPush Day\tIncline DB Press\t3\t10');
const pull = read('Day\tExercise\tSets\tReps\nPull Day\tDeadlift\t4\t5\nPull Day\tPull Ups\t4\t8');
const legs = read('Day\tExercise\tSets\tReps\nLeg Day\tBack Squat\t4\t6\nLeg Day\tRDL\t3\t8');

test('three day photos become one week, in photo order', () => {
  const merged = mergeParsedWeeks([push, pull, legs]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].days.map((d) => d.name), ['Push Day', 'Pull Day', 'Leg Day']);
});

test('letters run across the joined week — never two Day A’s', () => {
  const merged = mergeParsedWeeks([push, pull, legs]);
  assert.deepEqual(merged[0].days.map((d) => d.letter), ['A', 'B', 'C']);
});

test('reordering the photos reorders the days', () => {
  const merged = mergeParsedWeeks([legs, push]);
  assert.deepEqual(merged[0].days.map((d) => d.name), ['Leg Day', 'Push Day']);
});

test('a photo that names Week 2 lands in week 2, not appended to week 1', () => {
  const wk2 = read('Week\tDay\tExercise\tSets\tReps\n2\tPush Day\tBench Press\t5\t5');
  const merged = mergeParsedWeeks([push, wk2]);
  assert.deepEqual(merged.map((w) => w.index), [1, 2]);
  assert.equal(merged[1].days[0].items[0].sets, 5);
});

test('one photo passes through with its exercises untouched', () => {
  const merged = mergeParsedWeeks([push]);
  assert.deepEqual(merged[0].days[0].items, push[0].days[0].items);
});

test('nothing read is nothing merged', () => {
  assert.deepEqual(mergeParsedWeeks([]), []);
});
