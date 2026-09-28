import test from 'node:test';
import assert from 'node:assert/strict';

import { readWrittenWorkout, writtenToTemplate } from '../written-workout.ts';
import { prescribedSets } from '../template-prescription.ts';
import { postedLines } from '../posted-workout-lines.ts';
import { LB_RULES } from '../../program/percent-max.ts';
import { D9, D10, D11, D1213 } from './fixtures/squatober-2024-week2.mjs';

/* Squatober 2024 days 9–13 (PO 2026-09-28, "Now test these"). Squat 315, bench 225 — weights worked out by hand. */

const KEY = (n) => ({ 'Back Squat': 'barbell-back-squat', 'Bench Press': 'barbell-bench-press' })[n];
const LOAD = { maxes: { 'barbell-back-squat': 315, 'barbell-bench-press': 225 }, unit: 'lb', rules: LB_RULES };
const rowsOf = (t) => writtenToTemplate(readWrittenWorkout(t), KEY);
const col = (sets, k) => sets.map((s) => s[k] ?? null);

test('Day 9: squat 5×5 @ 70% = 220, supersetted with strict pull-ups 2-5, 2:30 after each round', () => {
  const rows = rowsOf(D9);
  const sets = prescribedSets(rows[0], LOAD);
  assert.deepEqual(col(sets, 'targetWeight'), [220, 220, 220, 220, 220]);
  assert.deepEqual(col(sets, 'restSec'), [150, 150, 150, 150, 150]);
  assert.deepEqual([rows[1].name, rows[1].targetReps, rows[1].repsMax], ['Strict Pull Ups', 2, 5]);
  const walk = rows.find((r) => /farmers/i.test(r.name));
  assert.deepEqual([walk.sets, walk.targetReps, walk.restSec], [3, 0, 90]);
  assert.match(walk.coachNote, /40 yds each set/);
});

test('Day 10 "Unbroken": squat 6×6 @ 65% = 205, bench 5×8 @ 65% = 145, 2 min; skullcrushers 50 reps unbroken', () => {
  const rows = rowsOf(D10);
  assert.deepEqual(col(prescribedSets(rows[0], LOAD), 'targetWeight'), Array(6).fill(205));
  assert.deepEqual(col(prescribedSets(rows[1], LOAD), 'targetWeight'), Array(5).fill(145));
  assert.equal(rows[0].restSec, 120);
  assert.equal(rows[1].restSec, 120);
  assert.equal(rows[0].coachNote, 'UNBROKEN', 'the prescription is not repeated in the note');
  assert.equal(rows[2].name, 'EZ Bar Skullcrushers', 'one name, written across two lines');
  assert.match(rows[2].coachNote, /50 reps total/);
  assert.match(rows[2].coachNote, /UNBROKEN/);
});

test('Day 11 "At Your Discretion": five options, none forced — each shown with YOUR weight', () => {
  const rows = rowsOf(D11);
  const sq = rows[0];
  assert.equal(sq.name, 'Back Squat');
  assert.equal(sq.targetReps, 0, 'no option is picked for them');
  const [line] = postedLines(rows, LOAD);
  for (const want of ['33 reps @ 70% (220 lb)', '26 reps @ 75% (235 lb)', '21 reps @ 80% (250 lb)', '15 reps @ 85% (270 lb)', '10 reps @ 90% (285 lb)']) {
    assert.ok(line.note.includes(want), `${want} in "${line.note}"`);
  }
  assert.match(line.note, /at your discretion/);
  assert.deepEqual([rows[1].sets, rows[1].targetReps, rows[1].repsMax, rows[1].restSec], [5, 2, 6, 120]);
});

test('Days 12 & 13 are rest days — no lifts', () => {
  assert.equal(rowsOf(D1213).length, 0);
});
