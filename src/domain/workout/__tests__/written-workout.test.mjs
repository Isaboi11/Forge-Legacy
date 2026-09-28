import test from 'node:test';
import assert from 'node:assert/strict';

import { readWrittenWorkout, restOf, writtenToTemplate } from '../written-workout.ts';

/*
 * The REAL input: the five Squatober cards the PO sent on 2026-09-27 (penandpaperstrengthapp ×
 * sorinex_squatober), transcribed line for line as they are handwritten — shouting, "DEADlift", "super set b.",
 * the rest line under the lift, the two columns at the bottom. A tidy fixture would pass where these fail
 * (`feedback_test_fixtures_must_be_real_input`).
 */

const DAY1 = `"For Those About to SQUAT"
Day: 1 Tuesday 10-01-24
Warm Up: 5 Jumping Jacks
3 Claps
1 Big Ric Flair "Woooo!"
1. BACK SQUAT 4,6,8,6,4 reps @ 67%
5 total sets, 28 total reps
2 minutes rest between each set
2. DEADlift 4 sets of 4 reps @ 70%
2 minutes rest between each set
3. a. SLOW Strict CHIN UP 4 sets of 2-4 reps
super set b. DB RDL's 4 sets of 5 reps
2 min rest between each super set
4. ONE Arm DB Rows 4 sets of 5 reps
90 seconds rest between each set
Cardio
a. BB Bicep Curls 4x15 reps
super set b. DB Shrugs 4x15 reps
90 seconds rest between each super set
Recovery
30 min Walk
Steak & Eggs
8-9 hrs sleep`;

const DAY2 = `"THE SEESAW"
Day: 2 Wednesday 10-02-24
Warm Up: Caffeinate and crack the Knuckles
1. BACK SQUAT "Ride the SeeSaw"
10/50% 5/65% 10/55% 5/70% 10/60%
5 total sets, 40 total reps, 2 min rest between sets
2. a. BENCH PRESS 5 sets of 8 reps @ 67%
super set b. DB REAR LATERALS 5 sets of 15 reps
2½ min rest between each super set
3. EZ Bar/or BB Skullcrushers 5 sets of 15 reps
90 seconds rest between each set
Cardio
KB Swings 10 sets of 10 reps
60 seconds rest between each set
Recovery
30 min Walk
Chicken & Dumpling extra chicken
8-9 hrs Sleep`;

const DAY3 = `"Carry On My Wayward Son" -Kansas
Day: 3 Thursday 10-03-24
Warm Up: Get awake and Loosen Up!
1. a. BACK SQUAT 5 sets of 3 reps @ 80%
super set b. DB/or KB Farmers Walk 5 sets of 30 yds
Aim to get 30-40% of Bodyweight in each hand
2½ min rest between each superset
2. a. BB BENT OVER Rows 5 sets of 5 reps
super set b. DB/or KB Farmers Walk 5 sets of 30 yds
30-40% of BW in each hand
2 min rest between each super set
3. a. Heavy Alternating DB Curls 5 sets of 5 reps
super set b. DB/or KB Farmers Walk 5 sets of 30 yds
30-40% in each hand. 2 min rest
Cardio
Planned Day off
Recovery
Salisbury Steak
Mashed Tators
30 min Walk
8-9 Hrs Sleep`;

const DAY4 = `"BUSINESS FRIDAY, never casual"
Day: 4 Friday 10-04-24
Warm Up: Iron your favorite Polo shirt.
Yes, It's Business Friday! We dress Up.
1. BACK SQUAT 5 sets of 5 reps @ 75%
2 to 2½ min rest
2. BENCH PRESS 5 sets of 5 reps @ 75%
2 to 2½ min rest
3. DEADlift 5 sets of 5 reps @ 75%
2 to 2½ min rest. * No Bouncing
Cardio
125 reps of Triceps
125 reps of Biceps
100% at your discretion
Recovery
Pot Roast extra Meaty
30 min Walk
8-9 hrs Sleep`;

const DAY7 = `"THE COUNTDOWN"
Day: 7 Monday 10-07-24
Warm Up: Get Loose and hit some light KB Swings 3 sets of 10 reps.
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
Get 100 reps with 33% of your Bench Max.
Goal is to get the 100 reps in the fewest sets possible.
*rest at your discretion
Recovery
Steak & mashed potatoes
Big Sleep 8+ hrs
30 min Walk`;

const byName = (w, re) => w.exercises.find((e) => re.test(e.name));
const KEY = (n) =>
  /back squat/i.test(n) ? 'barbell-back-squat' : /^deadlift/i.test(n) ? 'barbell-deadlift' : /^bench press/i.test(n) ? 'barbell-bench-press' : /close grip/i.test(n) ? 'barbell-close-grip-bench-press' : undefined;

test('Day 1 — a 4-6-8-6-4 wave at 67%, supersets with their shared rest, warm-up and recovery kept as words', () => {
  const w = readWrittenWorkout(DAY1);
  assert.equal(w.name, 'Day 1: For Those About To Squat');
  assert.match(w.how, /Warm-up: 5 Jumping Jacks/);
  assert.match(w.how, /Ric Flair/);
  assert.equal(w.after, '30 min Walk · Steak & Eggs · 8-9 hrs sleep');

  const squat = byName(w, /back squat/i);
  assert.deepEqual(squat.repScheme, [4, 6, 8, 6, 4]);
  assert.equal(squat.sets, 5);
  assert.equal(squat.percent, 67);
  assert.equal(squat.restSec, 120);
  assert.equal(squat.group, null);

  const dl = byName(w, /deadlift/i);
  assert.equal(dl.name, 'Deadlift');
  assert.deepEqual([dl.sets, dl.reps, dl.percent, dl.restSec], [4, 4, 70, 120]);

  const chin = byName(w, /chin up/i);
  const rdl = byName(w, /rdl/i);
  assert.deepEqual([chin.sets, chin.reps, chin.repsMax], [4, 2, 4]);
  assert.ok(chin.group && chin.group === rdl.group, 'chin-up and RDL are one superset');
  assert.equal(chin.restSec, 120, 'the superset rest is on both');
  assert.equal(rdl.restSec, 120);
  assert.equal(chin.label, '3a');
  assert.equal(rdl.label, '3b');

  const row = byName(w, /one arm db row/i);
  assert.deepEqual([row.sets, row.reps, row.restSec, row.group], [4, 5, 90, null]);

  const curls = byName(w, /curl/i);
  const shrugs = byName(w, /shrug/i);
  assert.ok(curls.group && curls.group === shrugs.group, 'the cardio curls + shrugs are a superset');
  assert.notEqual(curls.group, chin.group, 'and not the same one as 3a/3b');
  assert.deepEqual(w.exercises.map((e) => e.label), ['1', '2', '3a', '3b', '4', '5a', '5b'], 'the cardio block carries the numbering on');
  assert.deepEqual([curls.sets, curls.reps, curls.restSec], [4, 15, 90]);
  assert.equal(w.exercises.length, 7);
  assert.deepEqual(w.unread, []);
});

test('Day 2 — the SeeSaw reads left to right as five sets with their own reps and percentages', () => {
  const w = readWrittenWorkout(DAY2);
  const squat = byName(w, /back squat/i);
  assert.equal(squat.name, 'Back Squat', 'the quoted "Ride the SeeSaw" is not part of the name');
  assert.match(squat.note, /Ride the SeeSaw/);
  assert.doesNotMatch(squat.note, /total/, 'the tally is not a note');
  assert.deepEqual(squat.repScheme, [10, 5, 10, 5, 10]);
  assert.deepEqual(squat.percentScheme, [50, 65, 55, 70, 60]);
  assert.equal(squat.sets, 5);
  assert.equal(squat.restSec, 120);
  const bench = byName(w, /bench press/i);
  const rear = byName(w, /rear lateral/i);
  assert.deepEqual([bench.sets, bench.reps, bench.percent], [5, 8, 67]);
  assert.equal(bench.group, rear.group);
  assert.equal(bench.restSec, 150, '2½ minutes');
  const skull = byName(w, /skull/i);
  assert.equal(skull.name, 'EZ Bar Skullcrushers', '"EZ Bar/or BB" takes the first; the "or" is a note');
  assert.match(skull.note, /Or BB/);
  assert.deepEqual([skull.sets, skull.reps, skull.restSec], [5, 15, 90]);
  const kb = byName(w, /kb swing/i);
  assert.deepEqual([kb.sets, kb.reps, kb.restSec], [10, 10, 60]);
});

test('Day 3 — farmers walks for distance keep the yards and the bodyweight note, never a fake rep count', () => {
  const w = readWrittenWorkout(DAY3);
  const walks = w.exercises.filter((e) => /farmers walk/i.test(e.name));
  assert.equal(walks.length, 3);
  assert.equal(w.exercises.length, 6, '"Planned Day off" under Cardio is not an exercise');
  assert.match(w.after, /Cardio: Planned day off/);
  assert.equal(byName(w, /alternating db curl/i).restSec, 120, "a rest under a superset member is the whole superset's");
  assert.equal(walks[0].name, 'DB Farmers Walk');
  for (const f of walks) {
    assert.equal(f.sets, 5);
    assert.equal(f.reps, null, 'yards are not reps');
    assert.match(f.note, /30 yds each set/);
    assert.match(f.note, /30-40%/);
  }
  const squat = byName(w, /back squat/i);
  assert.deepEqual([squat.sets, squat.reps, squat.percent, squat.restSec], [5, 3, 80, 150]);
  assert.equal(squat.group, walks[0].group);
  const rows = writtenToTemplate(w, KEY);
  const walkRow = rows.find((r) => /farmers/i.test(r.name));
  assert.equal(walkRow.targetReps, 0);
  assert.match(w.after, /Salisbury Steak/);
});

test('Day 4 — "2 to 2½ min rest" takes the longer end; "No Bouncing" becomes the note; totals become a note', () => {
  const w = readWrittenWorkout(DAY4);
  for (const re of [/back squat/i, /bench/i, /deadlift/i]) {
    const e = byName(w, re);
    assert.deepEqual([e.sets, e.reps, e.percent, e.restSec], [5, 5, 75, 150], e.name);
  }
  assert.match(byName(w, /deadlift/i).note, /No Bouncing/i);
  const tri = byName(w, /tricep/i);
  assert.equal(tri.sets, 1);
  assert.match(tri.note, /125 reps total/);
  const bi = byName(w, /bicep/i);
  assert.ok(bi && bi !== tri, '"125 reps of Biceps" is its own lift, not a note on Triceps');
  assert.match(bi.note, /at your discretion/);
  assert.doesNotMatch(tri.note, /Biceps/);
  assert.match(w.how, /Polo shirt/);
});

test('Day 7 — a five-line ramp under the squat, and the bench "same as above" takes the same ramp', () => {
  const w = readWrittenWorkout(DAY7);
  const squat = byName(w, /back squat/i);
  assert.deepEqual(squat.repScheme, [5, 4, 3, 2, 1]);
  assert.deepEqual(squat.percentScheme, [65, 75, 80, 87, 92]);
  assert.equal(squat.restSec, 120);
  const bench = w.exercises.find((e) => /^bench press$/i.test(e.name));
  assert.ok(bench, 'the bench is its own lift');
  assert.deepEqual(bench.repScheme, [5, 4, 3, 2, 1]);
  assert.deepEqual(bench.percentScheme, [65, 75, 80, 87, 92]);
  const row = byName(w, /one arm db row/i);
  assert.equal(bench.group, row.group);
  assert.equal(row.restSec, 150);
  const cg = byName(w, /close grip/i);
  assert.equal(cg.percent, 33);
  assert.equal(cg.percentOf, 'bench');
  assert.match(cg.note, /Get 100 reps with 33% of your Bench Max/, "the author's own sentence, whole");
  assert.match(cg.note, /fewest sets possible/);
  assert.doesNotMatch(cg.note, /Get with|the in the/, 'never the fragments left after the numbers are read out');
  assert.equal(squat.note, null, 'a tally on the lift line is not a note');
  const rows = writtenToTemplate(w, KEY);
  const cgRow = rows.find((r) => /close grip/i.test(r.name));
  assert.equal(cgRow.percentOf, 'barbell-bench-press', 'the % is of the BENCH max, not a close-grip max');
  assert.equal(cgRow.percentOfMax, 33);
  assert.match(w.how, /KB Swings 3 sets of 10/);
});

test('per-set rest written inline — 87% rest 20s, 87% rest 20s, 90% rest 2:30', () => {
  const w = readWrittenWorkout('1. Back Squat 1@87% rest 20s, 1@87% rest 20s, 1@90% rest 2:30');
  const e = w.exercises[0];
  assert.deepEqual(e.repScheme, [1, 1, 1]);
  assert.deepEqual(e.percentScheme, [87, 87, 90]);
  assert.deepEqual(e.restScheme, [20, 20, 150]);
  const rows = writtenToTemplate(w, KEY);
  assert.deepEqual(rows[0].restScheme, [20, 20, 150]);
});

test('per-set rest on the ramp lines', () => {
  const w = readWrittenWorkout(`1. Back Squat
3 reps @ 87% rest 20 sec
3 reps @ 87% rest 20 sec
2 reps @ 90% rest 2½ min`);
  const e = w.exercises[0];
  assert.deepEqual(e.percentScheme, [87, 87, 90]);
  assert.deepEqual(e.restScheme, [20, 20, 150]);
});

test('the handwritten @ read as "e" still reads as a percentage', () => {
  const w = readWrittenWorkout('2. BENCH PRESS 5 sets of 5 reps e 75%');
  assert.equal(w.exercises[0].percent, 75);
});

test('rest lines, every way they are written', () => {
  assert.equal(restOf('2 minutes rest between each set'), 120);
  assert.equal(restOf('90 seconds rest between each super set'), 90);
  assert.equal(restOf('2½ min rest between each superset'), 150);
  assert.equal(restOf('2 1/2 min rest'), 150);
  assert.equal(restOf('2 to 2½ min rest'), 150);
  assert.equal(restOf('Rest 0:20'), 20);
  assert.equal(restOf('rest 2:30'), 150);
  assert.equal(restOf('60 seconds rest between each set'), 60);
  assert.equal(restOf('Warm up with some rest'), null);
  assert.equal(restOf('5 sets of 5 reps'), null);
});

test('rows for the app: a wave keeps its scheme, a flat % stays flat, supersets share a group id', () => {
  const rows = writtenToTemplate(readWrittenWorkout(DAY1), KEY);
  const squat = rows[0];
  assert.equal(squat.catalogKey, 'barbell-back-squat');
  assert.deepEqual(squat.repScheme, [4, 6, 8, 6, 4]);
  assert.equal(squat.percentOfMax, 67);
  assert.equal(squat.targetReps, 4);
  assert.equal(squat.restSec, 120);
  const chin = rows.find((r) => /chin/i.test(r.name));
  const rdl = rows.find((r) => /rdl/i.test(r.name));
  assert.equal(chin.groupKind, 'superset');
  assert.equal(chin.groupId, rdl.groupId);
  assert.equal(chin.catalogKey, null, 'an unknown name keeps its words and no key');
});

test('nothing in, nothing out — and never a throw', () => {
  assert.deepEqual(readWrittenWorkout('').exercises, []);
  assert.equal(readWrittenWorkout('').name, 'Workout');
  assert.doesNotThrow(() => readWrittenWorkout('💀🎃 @@@ %%% 1. 2. a. b. super set'));
});

test('a photo transcription (TSV) becomes lines this reader understands — the percentage cell included', async () => {
  const { tsvToWrittenText } = await import('../written-workout.ts');
  const tsv = ['Exercise\tSets\tReps\tLoad', 'Back Squat\t5\t4,6,8,6,4\t67%', '\t\t\t2 min rest between each set', 'DB RDL\t4\t5\t'].join('\n');
  const text = tsvToWrittenText(tsv);
  assert.equal(text, ['1. Back Squat 5 sets of 4,6,8,6,4 reps 67%', '2 min rest between each set', '2. DB RDL 4 sets of 5 reps'].join('\n'));
  const w = readWrittenWorkout(text);
  assert.deepEqual(w.exercises[0].repScheme, [4, 6, 8, 6, 4]);
  assert.equal(w.exercises[0].percent, 67, 'a bare % on the lift line is its percentage');
  assert.equal(w.exercises[0].restSec, 120);
  assert.deepEqual([w.exercises[1].sets, w.exercises[1].reps], [4, 5]);
});

test('a bare % is never read from a range or a "% of bodyweight" line', () => {
  const w = readWrittenWorkout('1. DB Farmers Walk 5 sets of 30 yds 30-40% of bodyweight');
  assert.equal(w.exercises[0].percent, null);
  const w2 = readWrittenWorkout('1. Farmers Walk 5 sets of 30 yds\nAim to get 30-40% of Bodyweight in each hand');
  assert.equal(w2.exercises[0].percent, null);
  assert.match(w2.exercises[0].note, /30-40% of Bodyweight/);
});
