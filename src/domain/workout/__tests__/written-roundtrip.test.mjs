import test from 'node:test';
import assert from 'node:assert/strict';

import { readWrittenWorkout, rowsToWrittenText, roundTrips, writtenToTemplate } from '../written-workout.ts';
import { S11_DAY2, S11_DAY3, S11_DAY6, S11_DAY7 } from './fixtures/squatober-2025.mjs';

/*
 * EDITING A POSTED WORKOUT (PO 2026-09-28: "we need to be able to edit posts"). The post is turned back into words,
 * edited in the same box it was written in, and read again. That is only safe if words → workout → words → workout
 * is EXACT — so it is proved here on every real card, and `roundTrips` guards it at run time.
 */

const KEY = (n) =>
  ({
    'Back Squat': 'barbell-back-squat',
    Deadlift: 'barbell-deadlift',
    'Bench Press': 'barbell-bench-press',
    'Front Squat': 'barbell-front-squat',
    'Snatch Grip Deadlift': 'barbell-snatch-grip-deadlift',
    'Close Grip Bench Press': 'barbell-close-grip-bench-press',
    'Chin-Up': 'chin-up',
  })[n];

/* The 2024 cards, as in written-workout.test.mjs. */
const S10 = [
  `"For Those About to SQUAT"\nDay: 1\nWarm Up: 5 Jumping Jacks\n3 Claps\n1. BACK SQUAT 4,6,8,6,4 reps @ 67%\n2 minutes rest between each set\n2. DEADlift 4 sets of 4 reps @ 70%\n3. a. SLOW Strict CHIN UP 4 sets of 2-4 reps\nsuper set b. DB RDL's 4 sets of 5 reps\n2 min rest between each super set\nCardio\na. BB Bicep Curls 4x15 reps\nsuper set b. DB Shrugs 4x15 reps\n90 seconds rest between each super set\nRecovery\n30 min Walk\nSteak & Eggs`,
  `"THE SEESAW"\nDay: 2\n1. BACK SQUAT "Ride the SeeSaw"\n10/50% 5/65% 10/55% 5/70% 10/60%\n5 total sets, 40 total reps, 2 min rest between sets`,
  `"Carry On"\n1. a. BACK SQUAT 5 sets of 3 reps @ 80%\nsuper set b. DB/or KB Farmers Walk 5 sets of 30 yds\nAim to get 30-40% of Bodyweight in each hand\n2½ min rest between each superset`,
  `"THE COUNTDOWN"\nDay: 7\n1. BACK SQUAT 5 total sets 15 total reps 2 min rest\n5 reps @ 65%\n4 reps @ 75%\n3 reps @ 80%\n2 reps @ 87%\n1 rep @ 92%\n2. a. BENCH PRESS "same as above"\nsuper set b. ONE ARM DB Rows 5 sets of 5 reps\n2 to 2½ min rest\nCardio\nClose Grip Bench Press\nGet 100 reps with 33% of your Bench Max.`,
  '1. Back Squat 1@87% rest 20s, 1@87% rest 20s, 1@90% rest 2:30',
];

const cards = [...S10, S11_DAY2, S11_DAY3, S11_DAY6, S11_DAY7];

for (const [i, text] of cards.entries()) {
  test(`card ${i + 1}: words → workout → words → workout is exact`, () => {
    const w = readWrittenWorkout(text);
    const rows = writtenToTemplate(w, KEY);
    const again = rowsToWrittenText({ name: w.name, how: w.how, after: w.after, rows });
    const w2 = readWrittenWorkout(again);
    const rows2 = writtenToTemplate(w2, KEY);
    const g = (r) => ({ ...r, groupId: r.groupId ? 'g' : null });
    assert.deepEqual(rows2.map(g), rows.map(g), `\n--- regenerated text ---\n${again}`);
    assert.equal(w2.name, w.name);
    assert.equal(w2.after, w.after);
    assert.deepEqual(w2.unread, []);
    assert.ok(roundTrips({ name: w.name, how: w.how, after: w.after, rows }, KEY));
  });
}

test('an edit made in the words lands in the workout — 5 × 5 @ 75% becomes 5 × 3 @ 80%, rest stays', () => {
  const w = readWrittenWorkout('"Business Friday"\n1. BACK SQUAT 5 sets of 5 reps @ 75%\n2 to 2½ min rest');
  const text = rowsToWrittenText({ name: w.name, how: w.how, after: w.after, rows: writtenToTemplate(w, KEY) });
  const edited = text.replace('5 sets of 5 reps @ 75%', '5 sets of 3 reps @ 80%');
  const [row] = writtenToTemplate(readWrittenWorkout(edited), KEY);
  assert.deepEqual([row.sets, row.targetReps, row.percentOfMax, row.restSec], [5, 3, 80, 150]);
});

test('a posted workout the words cannot say is refused, never changed by opening and saving it', () => {
  const rows = [{ catalogKey: 'plank', name: 'Plank', sets: 3, targetReps: 0, section: 'main', groupId: null, groupName: null, groupKind: null, groupRounds: null, coachNote: null, targetDurationSec: 45 }];
  assert.equal(roundTrips({ name: 'Core', rows }, () => undefined), false);
});

test('a workout read back out of the database (jsonb re-orders every key) still reopens for editing', () => {
  const w = readWrittenWorkout(S11_DAY3);
  const rows = writtenToTemplate(w, KEY);
  /* What Postgres jsonb hands back: the same values, keys in a different order (shorter keys first). */
  const shuffle = (o) => Object.fromEntries(Object.keys(o).sort((a, b) => a.length - b.length || a.localeCompare(b)).map((k) => [k, o[k]]));
  const stored = JSON.parse(JSON.stringify(rows.map(shuffle)));
  assert.notEqual(JSON.stringify(stored[0]), JSON.stringify(rows[0]), 'the order really is different');
  assert.ok(roundTrips({ name: w.name, how: w.how, after: w.after, rows: stored }, KEY));
});
