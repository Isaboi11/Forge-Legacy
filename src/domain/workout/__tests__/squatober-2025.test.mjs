import test from 'node:test';
import assert from 'node:assert/strict';

import { readWrittenWorkout, writtenToTemplate } from '../written-workout.ts';
import { prescribedSets, maxKeyOf, hasPrescription, maxKeysNeeded } from '../template-prescription.ts';
import { postedLines } from '../posted-workout-lines.ts';
import { LB_RULES } from '../../program/percent-max.ts';
import { S11_DAY2, S11_DAY3, S11_DAY45, S11_DAY6, S11_DAY7 } from './fixtures/squatober-2025.mjs';

/*
 * SQUATOBER SEASON ELEVEN — the PO's five cards (2026-09-28): "Test these out and double check the rest time, the
 * percentages, and everything work correctly."
 *
 * Each card goes the whole road: written text → rows → the sets the logger starts with (reps, GRAY weight, rest per
 * set) → the preview a member reads. Maxes: squat 315, bench 225, deadlift 405. Every weight below was worked out
 * by hand — percentage × max, to the nearest 5 lb (a .5 rounds up) — never copied from the code's output.
 */

const KEYS = {
  'DB Bulgarian Split Squats': 'dumbbell-bulgarian-split-squat',
  Deadlift: 'barbell-deadlift',
  'Back Squat': 'barbell-back-squat',
  'Seated BB Overhead Press': 'barbell-seated-overhead-press',
  'Bench Press': 'barbell-bench-press',
  'Cable Triceps Pushdowns': 'cable-triceps-pushdown',
  'BB Bicep Curls': 'barbell-biceps-curl',
  'Bulgarian Split Squat': 'bulgarian-split-squat',
  'Front Squat': 'barbell-front-squat',
  'Dumbbell Romanian Deadlift': 'dumbbell-romanian-deadlift',
  'Seated DB Shoulder Press': 'seated-dumbbell-shoulder-press',
  'Single-Arm Dumbbell Rows': 'single-arm-dumbbell-row',
  'KB Swings': 'kettlebell-swing',
  'Snatch Grip Deadlift': 'barbell-snatch-grip-deadlift',
  'Kettlebell Suitcase Carry': 'kettlebell-suitcase-carry',
};
const KEY = (n) => KEYS[n];
const LOAD = { maxes: { 'barbell-back-squat': 315, 'barbell-bench-press': 225, 'barbell-deadlift': 405 }, unit: 'lb', rules: LB_RULES };

const day = (text) => {
  const w = readWrittenWorkout(text);
  const rows = writtenToTemplate(w, KEY);
  const sets = rows.map((r) => (hasPrescription(r) ? prescribedSets(r, LOAD) : null));
  return { w, rows, sets, lines: postedLines(rows, LOAD, { 'barbell-back-squat': 'Back Squat', 'barbell-deadlift': 'Deadlift' }) };
};
const find = (d, re) => {
  const i = d.rows.findIndex((r) => re.test(r.name));
  assert.ok(i >= 0, `no lift matching ${re}`);
  return { row: d.rows[i], sets: d.sets[i], line: d.lines[i] };
};
const col = (sets, k) => sets.map((s) => s[k] ?? null);

test('Day 2 "Get Thick Thursday": deadlift 5×3 @ 70% = 285, 1:30 rest; the 20-rep squat at 40% of max = 125', () => {
  const d = day(S11_DAY2);
  assert.equal(d.w.name, 'Day 2: Get Thick Thursday');
  const bss = find(d, /bulgarian/i);
  assert.equal(bss.row.catalogKey, 'dumbbell-bulgarian-split-squat');
  assert.deepEqual([bss.row.sets, bss.row.targetReps, bss.row.restSec], [3, 5, 120]);
  assert.match(bss.row.coachNote, /Each leg/);
  assert.match(bss.row.coachNote, /nothing too heavy/);

  const dl = find(d, /^deadlift$/i);
  assert.deepEqual(col(dl.sets, 'targetReps'), [3, 3, 3, 3, 3]);
  assert.deepEqual(col(dl.sets, 'targetWeight'), [285, 285, 285, 285, 285], '70% of 405 = 283.5 → 285');
  assert.deepEqual(col(dl.sets, 'restSec'), [90, 90, 90, 90, 90]);
  assert.match(dl.row.coachNote, /No Bouncing/);

  const sq = find(d, /back squat/i);
  assert.deepEqual(col(sq.sets, 'targetReps'), [20]);
  assert.deepEqual(col(sq.sets, 'targetWeight'), [125], '40% of 315 = 126 → 125 (the low end of "40-45% of max")');
  assert.match(sq.row.coachNote, /40-45% of max/, "the author's range stays in the note");
  assert.match(sq.row.coachNote, /unbroken/);
  assert.equal(sq.row.restSec, undefined, '"No rest or pauses at the top" is not a rest time');

  const ohp = find(d, /overhead press/i);
  assert.equal(ohp.row.name, 'Seated BB Overhead Press', 'the name wrapped onto two lines on the card');
  assert.equal(ohp.row.catalogKey, 'barbell-seated-overhead-press');
  assert.deepEqual([ohp.row.sets, ohp.row.targetReps, ohp.row.restSec], [5, 10, 90]);
  assert.match(ohp.row.coachNote, /Or Standing/);
  assert.match(d.w.after, /^Meatloaf/, 'bullets off');
});

test('Day 3 "Polo Strong": each cluster runs twice — 6 sets, rest 0:30 · 0:30 · 2:30 · 0:30 · 0:30 · 2:30', () => {
  const d = day(S11_DAY3);
  const sq = find(d, /back squat/i);
  assert.deepEqual(col(sq.sets, 'targetReps'), [5, 5, 5, 5, 5, 5]);
  assert.deepEqual(col(sq.sets, 'targetWeight'), [210, 210, 210, 210, 210, 210], '67% of 315 = 211.05 → 210');
  assert.deepEqual(col(sq.sets, 'restSec'), [30, 30, 150, 30, 30, 150]);

  const bp = find(d, /bench press/i);
  assert.deepEqual(col(bp.sets, 'targetReps'), [2, 2, 2, 2, 2, 2]);
  assert.deepEqual(col(bp.sets, 'targetWeight'), [185, 185, 185, 185, 185, 185], '82% of 225 = 184.5 → 185');
  assert.deepEqual(col(bp.sets, 'restSec'), [20, 20, 150, 20, 20, 150]);
  assert.deepEqual(bp.line.sets.map((s) => s.text), [
    '2 reps · 82% · 185 lb · rest 0:20',
    '2 reps · 82% · 185 lb · rest 0:20',
    '2 reps · 82% · 185 lb · rest 2:30',
    '2 reps · 82% · 185 lb · rest 0:20',
    '2 reps · 82% · 185 lb · rest 0:20',
    '2 reps · 82% · 185 lb · rest 2:30',
  ]);

  const push = find(d, /pushdown/i);
  const curl = find(d, /bicep curl/i);
  assert.equal(push.line.label, '3a', '"3. \\"Pumped in the Polo\\"" names the block; its lifts are 3a and 3b');
  assert.equal(curl.line.label, '3b');
  assert.equal(push.row.groupId, curl.row.groupId);
  assert.deepEqual([push.row.sets, push.row.targetReps, curl.row.sets, curl.row.targetReps], [6, 20, 6, 20]);
  assert.equal(push.row.restSec, 90);
  assert.equal(curl.line.rest, 'Rest 1:30 after each round');
  assert.match(push.row.coachNote, /Pumped in the Polo/);
  assert.equal(push.row.catalogKey, 'cable-triceps-pushdown');

  const bul = find(d, /bulgarian/i);
  assert.equal(bul.line.label, '4');
  assert.equal(bul.row.catalogKey, 'bulgarian-split-squat');
  assert.deepEqual([bul.row.sets, bul.row.targetReps, bul.row.restSec], [5, 5, 90]);
  assert.match(bul.row.coachNote, /Each leg/);
  assert.match(bul.row.coachNote, /5 seconds down/, 'the tempo is in the note');
  assert.equal(d.rows.length, 5);
});

test('Days 4 & 5 are rest days: no lifts to run — the card is words, and nothing is invented to fill it', () => {
  const d = day(S11_DAY45);
  assert.equal(d.rows.length, 0);
  assert.match(d.w.how, /30-40 minute walk/);
});

test('Day 6 "Tree Trunk Thighs": front squat at 45% of the BACK SQUAT max = 140; supersets rest after the round', () => {
  const d = day(S11_DAY6);
  const bs = find(d, /back squat/i);
  assert.deepEqual(col(bs.sets, 'targetWeight'), [160], '50% of 315 = 157.5 → 160');
  assert.deepEqual(col(bs.sets, 'targetReps'), [10]);

  const fs = find(d, /front squat/i);
  assert.equal(maxKeyOf(fs.row), 'barbell-back-squat', '"% of Back Squat max" — not a front-squat max nobody has');
  assert.deepEqual(col(fs.sets, 'targetWeight'), [140, 140, 140, 140, 140], '45% of 315 = 141.75 → 140');
  assert.deepEqual(col(fs.sets, 'restSec'), [120, 120, 120, 120, 120]);
  assert.equal(fs.line.summary, '5 × 5 · 45% of Back Squat · 140 lb');

  const bp = find(d, /bench press/i);
  const rdl = find(d, /rdl/i);
  assert.deepEqual(col(bp.sets, 'targetWeight'), [135, 135, 135], '60% of 225 = 135');
  assert.deepEqual([bp.line.label, rdl.line.label], ['3a', '3b']);
  assert.deepEqual(col(bp.sets, 'restSec'), [150, 150, 150], 'the 2½ min is the superset\'s');
  assert.deepEqual(col(rdl.sets ?? prescribedSets(rdl.row, LOAD), 'restSec'), [150, 150, 150]);

  const sp = find(d, /shoulder press/i);
  const row = find(d, /row/i);
  assert.deepEqual([sp.line.label, row.line.label], ['4a', '4b']);
  assert.deepEqual([row.row.sets, row.row.targetReps], [2, 5]);
  assert.match(row.row.coachNote, /Each arm/);
  assert.equal(row.row.restSec, 90);
  const kb = find(d, /kb swing/i);
  assert.deepEqual([kb.row.sets, kb.row.targetReps, kb.row.restSec], [10, 10, 60]);
  assert.equal(kb.line.label, '5');
});

test('Day 7 "The Pressure Cooker": warm-up sets get gray weights too; 2 @ 80% = 250; snatch-grip at 50% of the DEAD max = 205', () => {
  const d = day(S11_DAY7);
  const warm = d.rows.findIndex((r) => r.section === 'warmup');
  assert.equal(warm, 0);
  assert.equal(d.rows[0].catalogKey, 'barbell-back-squat');
  assert.deepEqual(col(d.sets[0], 'targetReps'), [5, 3, 2]);
  assert.deepEqual(col(d.sets[0], 'targetWeight'), [190, 220, 235], '60/70/75% of 315 = 189 · 220.5 · 236.25');
  assert.equal(d.lines[0].label, 'Warm-up', 'warm-up sets are not lift 1');
  assert.equal(d.lines[1].label, '1');

  const main = d.rows[1];
  assert.equal(main.section, 'main');
  const sets = d.sets[1];
  assert.deepEqual(col(sets, 'targetReps'), [2]);
  assert.deepEqual(col(sets, 'targetWeight'), [250], '80% of 315 = 252 → 250');
  assert.match(main.coachNote, /as many SETS of 2 reps as possible in a 10 minute window/);

  const sg = find(d, /snatch grip/i);
  assert.equal(maxKeyOf(sg.row), 'barbell-deadlift');
  assert.deepEqual(col(sg.sets, 'targetWeight'), [205, 205, 205, 205, 205], '50% of 405 = 202.5 → 205');
  assert.deepEqual(col(sg.sets, 'restSec'), [120, 120, 120, 120, 120]);
  assert.match(sg.row.coachNote, /around 50-60% of your DEAD max/);
  assert.match(sg.row.coachNote, /NO Bouncing/);

  const carry = find(d, /carry/i);
  assert.equal(carry.row.catalogKey, 'kettlebell-suitcase-carry');
  assert.deepEqual([carry.row.sets, carry.row.targetReps, carry.row.restSec], [6, 0, 90], 'yards are not reps');
  assert.match(carry.row.coachNote, /30 yds each set/);
  assert.match(carry.row.coachNote, /switch arm position/);

  assert.deepEqual(
    maxKeysNeeded(d.rows.map((r) => ({ maxKey: hasPrescription(r) ? maxKeyOf(r) : null }))),
    ['barbell-back-squat', 'barbell-deadlift'],
    'the maxes sheet asks for the squat and the deadlift — nothing else on this card is a percentage',
  );
});

test('every Season 11 card reads with nothing left over and no lift nameless', () => {
  for (const text of [S11_DAY2, S11_DAY3, S11_DAY6, S11_DAY7]) {
    const w = readWrittenWorkout(text);
    assert.deepEqual(w.unread, [], w.name);
    for (const e of w.exercises) assert.ok(e.name && e.sets > 0, `${w.name}: ${e.name}`);
    for (const r of writtenToTemplate(w, KEY)) assert.ok(r.catalogKey, `${w.name}: "${r.name}" matched the library`);
  }
});
