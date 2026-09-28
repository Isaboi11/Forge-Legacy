import test from 'node:test';
import assert from 'node:assert/strict';

import { readWrittenWorkout, roundTrips, writtenToTemplate } from '../written-workout.ts';
import { prescribedSets, hasPrescription } from '../template-prescription.ts';
import { postedLines } from '../posted-workout-lines.ts';
import { LB_RULES } from '../../program/percent-max.ts';
import { D16, D18, D21, D22, D23 } from './fixtures/squatober-2024-week3.mjs';

/*
 * SQUATOBER 2024, DAYS 16–23 — the PO's next five cards (2026-09-28): "Test these ones to make sure."
 * Maxes: squat 315, bench 225, deadlift 405. Every weight worked out by hand — % × max to the nearest 5 lb, a .5
 * rounding up.
 */

const KEYS = { 'Back Squat': 'barbell-back-squat', 'Bench Press': 'barbell-bench-press', Deadlift: 'barbell-deadlift' };
const KEY = (n) => KEYS[n];
const LOAD = { maxes: { 'barbell-back-squat': 315, 'barbell-bench-press': 225, 'barbell-deadlift': 405 }, unit: 'lb', rules: LB_RULES };

const day = (text) => {
  const w = readWrittenWorkout(text);
  const rows = writtenToTemplate(w, KEY);
  return { w, rows, lines: postedLines(rows, LOAD), sets: rows.map((r) => (hasPrescription(r) ? prescribedSets(r, LOAD) : null)) };
};
const col = (sets, k) => sets.map((s) => s[k] ?? null);
const at = (d, re, section = 'main') => {
  const i = d.rows.findIndex((r) => (r.section ?? 'main') === section && re.test(r.name));
  assert.ok(i >= 0, `no ${section} lift ${re}`);
  return { row: d.rows[i], sets: d.sets[i], line: d.lines[i] };
};

test('Day 16 "Stairway to Strongville": three missions, 10 sets, 66 reps — 2:30 rest for missions 1-2, 3:00 for mission 3', () => {
  const d = day(D16);
  assert.equal(d.rows.length, 1);
  const sq = at(d, /back squat/i);
  assert.equal(sq.row.name, 'Back Squat', '"Mission One" is not part of its name');
  assert.deepEqual(col(sq.sets, 'targetReps'), [8, 9, 10, 6, 7, 8, 3, 4, 5, 6]);
  assert.equal(col(sq.sets, 'targetReps').reduce((a, b) => a + b, 0), 66, '66 total reps, as the card says');
  assert.deepEqual(col(sq.sets, 'targetWeight'), [160, 175, 190, 220, 225, 230, 250, 250, 250, 250]);
  assert.deepEqual(col(sq.sets, 'restSec'), [150, 150, 150, 150, 150, 150, 180, 180, 180, 180]);
  assert.match(d.w.after, /Planned day off/);
});

test('Day 18 "Forgotten Reps": 7 reps at 60/65/70/72% = four sets, not one; the bench\'s 9s at 55-70%', () => {
  const d = day(D18);
  const sq = at(d, /back squat/i);
  assert.deepEqual(col(sq.sets, 'targetReps'), [7, 7, 7, 7]);
  assert.deepEqual(col(sq.sets, 'targetWeight'), [190, 205, 220, 225]);
  assert.deepEqual(col(sq.sets, 'restSec'), [150, 150, 150, 150]);
  const bp = at(d, /bench/i);
  assert.equal(bp.line.label, '2a');
  assert.deepEqual(col(bp.sets, 'targetReps'), [9, 9, 9, 9]);
  assert.deepEqual(col(bp.sets, 'targetWeight'), [125, 135, 145, 160]);
  assert.deepEqual(col(bp.sets, 'restSec'), [180, 180, 180, 180], '3 min after each superset round');
  const row = at(d, /bent over row/i);
  assert.deepEqual([row.row.sets, row.row.targetReps, row.line.label], [4, 9, '2b']);
  const lunges = at(d, /lunge/i);
  assert.equal(lunges.line.label, '3b');
  assert.match(lunges.row.coachNote, /Each leg/);
  assert.equal(at(d, /rdl/i).line.label, '3c');
  assert.equal(d.rows.filter((r) => r.section === 'warmup').length, 0, 'jumping jacks and push-ups are words, not % sets');
  assert.match(d.w.how, /13x Jumping Jacks/);
});

for (const [name, text, warm, main, benchWarm, bench, reps] of [
  ['Day 21', D21, [175, 210], 235, [125, 150], 170, 3],
  ['Day 23', D23, [205, 235], 250, [145, 170], 180, 2],
]) {
  test(`${name} "Pressure Cooker": build-up sets, then ONE set of ${reps} to repeat for 10 minutes — the bench does the same, off the BENCH max`, () => {
    const d = day(text);
    const wsq = at(d, /back squat/i, 'warmup');
    assert.deepEqual(col(wsq.sets, 'targetWeight'), warm);
    assert.deepEqual(col(wsq.sets, 'targetReps'), [3, 3]);
    assert.equal(wsq.line.label, 'Warm-up');

    const sq = at(d, /back squat/i);
    assert.deepEqual(col(sq.sets, 'targetReps'), [reps]);
    assert.deepEqual(col(sq.sets, 'targetWeight'), [main]);
    assert.match(sq.row.coachNote, /as many SETS of \d ?reps as possible in a 10 minute window/);
    assert.match(sq.row.coachNote, /Record how many sets you got/);
    assert.doesNotMatch(sq.row.coachNote, /LBS|10\.66|\b9 335/, "the author's own score is not the squad's instruction");

    const wbp = at(d, /bench/i, 'warmup');
    assert.deepEqual(col(wbp.sets, 'targetWeight'), benchWarm, 'the same build-up percentages, of the bench max');
    const bp = at(d, /bench/i);
    assert.equal(bp.row.name, 'Bench Press');
    assert.deepEqual(col(bp.sets, 'targetReps'), [reps]);
    assert.deepEqual(col(bp.sets, 'targetWeight'), [bench]);
    assert.match(bp.row.coachNote, /10 minute window/);
    assert.equal(bp.line.label, '2', 'the bench stays lift 2 — its warm-up is not a lift');
  });
}

test('Day 21: slow strict chin-ups 5×3-6, 2 min, the rest of the line kept; a three-way superset rests after the round', () => {
  const d = day(D21);
  const chin = at(d, /chin/i);
  assert.deepEqual([chin.row.sets, chin.row.targetReps, chin.row.repsMax, chin.row.restSec], [5, 3, 6, 120]);
  assert.match(chin.row.coachNote, /^Full range of motion/);
  const labels = d.lines.filter((l) => /pushdown|shrug|pushup/i.test(l.name)).map((l) => l.label);
  assert.deepEqual(labels, ['4a', '4b', '4c']);
  assert.equal(d.lines.find((l) => /pushup/i.test(l.name)).rest, 'Rest 2:00 after each round');
});

test('Day 22 "Hard Hat": deadlift "(70-75%)" → 70% = 285; the carry is 6 sets of 30 yds, 1:30 rest', () => {
  const d = day(D22);
  const sq = at(d, /back squat/i);
  assert.deepEqual(col(sq.sets, 'targetWeight'), [220, 220, 220, 220, 220, 220, 220]);
  assert.deepEqual(col(sq.sets, 'restSec'), Array(7).fill(120));
  const dl = at(d, /deadlift/i);
  assert.deepEqual(col(dl.sets, 'targetWeight'), [285, 285, 285, 285, 285]);
  assert.deepEqual(col(dl.sets, 'targetReps'), [3, 3, 3, 3, 3]);
  assert.match(dl.row.coachNote, /70-75%/);
  const bss = at(d, /bulgarian/i);
  assert.equal(bss.row.coachNote, 'Keep these light to med');
  const carry = at(d, /carry/i);
  assert.deepEqual([carry.row.sets, carry.row.targetReps, carry.row.restSec], [6, 0, 90]);
  assert.match(carry.row.coachNote, /30 yds each set/);
  assert.match(carry.row.coachNote, /3 each way/);
  assert.match(d.w.after, /^Pot Roast · extra Meaty/);
});

test('Day 23: bent-over rows 5×5, 2 min; laterals · skullcrushers · rear laterals as one superset', () => {
  const d = day(D23);
  const rows = at(d, /bent over row/i);
  assert.deepEqual([rows.row.sets, rows.row.targetReps, rows.row.restSec, rows.line.label], [5, 5, 120, '3']);
  const trio = d.lines.filter((l) => /lateral|skull/i.test(l.name));
  assert.deepEqual(trio.map((l) => l.label), ['4a', '4b', '4c']);
  assert.equal(trio[0].superset, 'Superset: do 4a, then 4b, then 4c back to back, then rest.');
});

test('all five read clean, and every one reopens for editing exactly', () => {
  for (const text of [D16, D18, D21, D22, D23]) {
    const w = readWrittenWorkout(text);
    assert.deepEqual(w.unread, [], w.name);
    assert.ok(roundTrips({ name: w.name, how: w.how, after: w.after, rows: writtenToTemplate(w, KEY) }, KEY), `${w.name} round-trips`);
  }
});
