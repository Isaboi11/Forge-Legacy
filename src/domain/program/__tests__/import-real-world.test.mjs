import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProgramTable } from '../import-parse.ts';
import { distanceIn, durationIn } from '../import-session-text.ts';

/*
 * ══ THE IMPORT STRESS TEST, 2026-09-21 — every case here FAILED before it ══
 *
 * PO: *"Think about how people are going to upload. Text messages that aren't perfect and spelling is
 * off. Screenshots from insta and facebook posts. PDFs that have a lot of fluff in them. Things that say
 * rest days 2 times a week. Things that have a certain amount of miles for running."*
 *
 * Each test is the input as a person would actually paste it, and the assertion is what a person reading
 * it would say it means. `Docs/QA/Import-Stress-Test-2026-09.md` has the before/after for each.
 */

const ok = (r) => {
  assert.equal(r.ok, true, r.ok ? '' : `parse failed: ${r.error}`);
  return r;
};
const days = (r, w = 0) => r.weeks[w].days.map((d) => d.name);
const names = (r, w = 0) => r.weeks[w].days.map((d) => d.items.map((i) => i.name));
const tsv = (rows) => rows.map((r) => r.join('\t')).join('\n');

// ── running ─────────────────────────────────────────────────────────────────

test('a typed running week keeps every run — it used to keep ONE of five', () => {
  const r = ok(parseProgramTable([
    'Week 1',
    'Monday: Easy run 3 miles',
    'Tuesday: Rest',
    'Wednesday: 4 x 800m intervals',
    'Thursday: Easy 3 mi',
    'Friday: Rest',
    'Saturday: Long run 6 miles',
  ].join('\n')));
  assert.deepEqual(days(r), ['Monday', 'Wednesday', 'Thursday', 'Saturday']);
  const runs = r.weeks[0].days.flatMap((d) => d.items).filter((i) => i.kind === 'cardio');
  assert.deepEqual(runs.map((i) => [i.activity, i.targetMi]), [['run', 3], ['run', 3], ['run', 6]]);
});

test('a distance with no activity named is a run ("Mon: 3 mi easy"), and a week\'s mileage is not a run', () => {
  const r = ok(parseProgramTable('Week 1: 15 miles\nMon: 3 mi easy\nWed: 4 mi tempo\nSat: 8 mi long'));
  assert.deepEqual(days(r), ['Mon', 'Wed', 'Sat']);
  assert.deepEqual(r.weeks[0].days.map((d) => d.items[0].targetMi), [3, 4, 8]);
  assert.ok(r.weeks[0].days.every((d) => d.items[0].kind === 'cardio' && d.items[0].activity === 'run'));
});

test('a Week/Day/Workout running table reads all six rows, in two weeks — it used to read ONE', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Workout'],
    ['1', 'Mon', 'Easy run 3 mi'],
    ['1', 'Wed', 'Tempo 4 mi'],
    ['1', 'Sat', 'Long run 6 mi'],
    ['2', 'Mon', 'Easy run 3 mi'],
    ['2', 'Wed', 'Intervals 6x400m'],
    ['2', 'Sat', 'Long run 7 mi'],
  ])));
  assert.equal(r.weeks.length, 2);
  assert.deepEqual(days(r, 0), ['Mon', 'Wed', 'Sat']);
  assert.deepEqual(days(r, 1), ['Mon', 'Wed', 'Sat']);
  assert.equal(r.weeks[0].days[1].items[0].targetMi, 4, '"Tempo 4 mi" is a 4-mile run');
  assert.ok(!r.ignoredColumns.includes('Week'), 'the Week column is read, not ignored');
});

test('cardio lines in a typed day are bouts, not 3×10 lifts', () => {
  const r = ok(parseProgramTable('Day 1\n20 min bike\n5k run\nRow 2000m\nSquat 5x5'));
  const items = r.weeks[0].days[0].items;
  assert.deepEqual(items.map((i) => i.kind ?? 'strength'), ['cardio', 'cardio', 'cardio', 'strength']);
  assert.equal(items[0].targetSec, 1200);
  assert.ok(Math.abs(items[1].targetMi - 3.107) < 0.01, '5k is 3.1 miles');
  assert.equal(items[2].activity, 'row');
  assert.equal(items[2].targetSec, null, '"2000m" is metres, never 2,000 minutes');
});

test('metres are not minutes: a bare "m" of 100 or more is a distance', () => {
  assert.equal(durationIn('Row 2000m'), null);
  assert.equal(durationIn('bike 45m'), 2700, 'under 100 is still minutes');
  assert.ok(Math.abs(distanceIn('Row 2000m') - 1.2427) < 0.001);
  assert.ok(Math.abs(distanceIn('10 km run') - 6.2137) < 0.001);
});

// ── rest days ───────────────────────────────────────────────────────────────

test('rest days are not training days — "Rest" used to import as an exercise and push Sunday out', () => {
  const r = ok(parseProgramTable('Monday\nSquat 5x5\nTuesday\nBench 5x5\nWednesday\nRest\nThursday\nDeadlift 3x5\nFriday\nOHP 5x5\nSaturday\nRow 4x8\nSunday\nRest'));
  assert.deepEqual(days(r), ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday']);
  assert.ok(!names(r).flat().includes('Rest'));
});

test('a rest row in a table is not an exercise either', () => {
  const r = ok(parseProgramTable(tsv([
    ['Day', 'Exercise', 'Sets', 'Reps'],
    ['Monday', 'Squat', '5', '5'],
    ['Tuesday', 'Rest', '', ''],
    ['Wednesday', 'Bench', '5', '5'],
    ['Thursday', 'Rest day', '', ''],
    ['Friday', 'Deadlift', '3', '5'],
  ])));
  assert.deepEqual(days(r), ['Monday', 'Wednesday', 'Friday']);
});

test('"Day 3: REST", "Day 7: Off" and a rest instruction create nothing, and the instruction is listed', () => {
  const r = ok(parseProgramTable('Day 1: Push\nBench 4x8\nDay 2: REST\nDay 3: Legs\nSquat 5x5\nRest 3 min between sets\nDay 7: Off'));
  assert.deepEqual(days(r), ['Push', 'Legs']);
  assert.deepEqual(r.skipped, ['Rest 3 min between sets']);
});

// ── days and weeks written the way people write them ────────────────────────

test('"Wk2", "W3" and "Week One" are weeks, not exercises', () => {
  const r = ok(parseProgramTable('Week 1\nDay 1\nSquat 5x5\nWk2\nDay 1\nSquat 5x5\nW3\nDay 1\nSquat 5x5\nWeek Four\nDay 1\nSquat 3x5'));
  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2, 3, 4]);
  assert.ok(r.weeks.every((w) => w.days.length === 1 && w.days[0].items.length === 1));
});

test('"Mon: Squat 5x5, Bench 5x5, Row 5x5" is a day of three lifts — it used to be one lift of that name', () => {
  const r = ok(parseProgramTable('Mon: Squat 5x5, Bench 5x5, Row 5x5\nWed: Squat 5x5, OHP 5x5, Deadlift 1x5'));
  assert.deepEqual(days(r), ['Mon', 'Wed']);
  assert.deepEqual(names(r), [['Squat', 'Bench', 'Row'], ['Squat', 'OHP', 'Deadlift']]);
});

test('an abbreviated weekday is a day, but "Sun salutation" is still an exercise', () => {
  const r = ok(parseProgramTable('mon - chest n tris\nbench 4x8\nwed - back n bis\nrow 4x8\nSun salutation 3x5'));
  assert.deepEqual(days(r), ['chest n tris', 'back n bis']);
  assert.deepEqual(names(r)[1], ['row', 'Sun salutation']);
});

test('a chat answer\'s **bold** headings and names come through clean', () => {
  const r = ok(parseProgramTable('**Day 1: Upper Body**\n- **Bench Press:** 4 sets of 8 reps\n\n**Day 2: Lower Body**\n- **Squat:** 4 sets of 6 reps'));
  assert.deepEqual(days(r), ['Upper Body', 'Lower Body']);
  assert.deepEqual(names(r), [['Bench Press'], ['Squat']]);
});

test('"Warm-up:", "Main:" and "Cool-down:" are sections of ONE day, not three days', () => {
  const r = ok(parseProgramTable('Day 1 - Upper\nWarm-up:\nArm circles 2x10\nMain:\nBench Press 4x6\nCool-down:\nStretch 5 min'));
  assert.deepEqual(days(r), ['Upper']);
});

test('a headerless paste from Sheets keeps its numbers — "Bench Press⇥4⇥8" used to be 3×10', () => {
  const r = ok(parseProgramTable(tsv([['Bench Press', '4', '8'], ['Overhead Press', '3', '10']])));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps, i.setsAssumed]), [
    ['Bench Press', 4, 8, false],
    ['Overhead Press', 3, 10, false],
  ]);
});

// ── schemes and the debris around a name ────────────────────────────────────

test('what people put around a name is stripped from it and kept as the note', () => {
  const r = ok(parseProgramTable([
    'Day 1',
    'Lateral Raise 3x8-10',
    'Plank 3x30s',
    'RDL 3x8 @RPE8',
    'Lunges 4x8 each side',
    'Bench 100kg 5x5',
    'Pull Ups – 3 x AMRAP',
    'Deadlift 70% 1RM',
    '“Cable Fly” 3x15',
    '▪️ Seated Row – 3 x 12',
    'Squat 10 reps x 3 sets',
    'Row three sets of ten',
  ].join('\n')));
  const items = r.weeks[0].days[0].items;
  assert.equal(r.weeks[0].days.length, 1, 'no line without a clean scheme split the day');
  assert.deepEqual(items.map((i) => i.name), [
    'Lateral Raise', 'Plank', 'RDL', 'Lunges', 'Bench', 'Pull Ups', 'Deadlift', 'Cable Fly', 'Seated Row', 'Squat', 'Row',
  ]);
  assert.deepEqual(items.map((i) => [i.sets, i.reps]).slice(0, 5), [[3, 8], [3, 30], [3, 8], [4, 8], [5, 5]]);
  assert.equal(items[5].sets, 3, '3 x AMRAP is three sets');
  assert.equal(items[5].repsAssumed, true);
  assert.equal(items[1].note, 'Plank 3x30s', 'the seconds survive as the note');
  assert.deepEqual([items[9].sets, items[9].reps], [3, 10]);
  assert.deepEqual([items[10].sets, items[10].reps], [3, 10]);
});

test('"4x8 - 90s rest" is four sets of eight, not a range of eight to ninety', () => {
  const it = ok(parseProgramTable('Day 1\nBench Press 4x8 - 90s rest')).weeks[0].days[0].items[0];
  assert.deepEqual([it.name, it.sets, it.reps], ['Bench Press', 4, 8]);
});

test('a superset line is two lifts', () => {
  const r = ok(parseProgramTable('Day 1\nSS: Curl 3x12 / Pushdown 3x12\nSuperset - Lateral Raise 3x15 + Rear Delt Fly 3x15'));
  assert.deepEqual(names(r)[0], ['Curl', 'Pushdown', 'Lateral Raise', 'Rear Delt Fly']);
});

test('a workout shared out of a logging app — "Set 1: 135 lbs x 10" — is sets of the lift above', () => {
  const r = ok(parseProgramTable('Push Day 🏋️\nSeptember 20, 2026\n\nBench Press (Barbell)\nSet 1: 135 lbs x 10\nSet 2: 185 lbs x 8\nSet 3: 205 lbs x 6\n\n@hevyapp'));
  assert.deepEqual(days(r), ['Push Day 🏋️']);
  const it = r.weeks[0].days[0].items[0];
  assert.deepEqual([it.name, it.sets, it.reps], ['Bench Press', 3, 6]);
  assert.deepEqual(r.skipped, ['September 20, 2026', '@hevyapp']);
});

// ── the fluff around a program ──────────────────────────────────────────────

test('an Instagram caption: the title, the call to action and the hashtags are not exercises', () => {
  const r = ok(parseProgramTable('🔥 MY 4 DAY SPLIT 🔥\n\nDay 1: Chest & Triceps\n▪️ Bench Press – 4 x 8\n▪️ Cable Flys – 3 x 12\n\nDay 2: Back & Biceps\n▪️ Deadlifts – 4 x 5\n\nSave this for later 📌 Follow @fitguy for more!\n#gym #workout #fitness #gains'));
  assert.deepEqual(days(r), ['Chest & Triceps', 'Back & Biceps']);
  assert.deepEqual(names(r), [['Bench Press', 'Cable Flys'], ['Deadlifts']]);
  assert.equal(r.skipped.length, 3);
});

test('an email: the greeting and the whole signature are not exercises', () => {
  const r = ok(parseProgramTable('Hi Jordan,\n\nHere is your plan for next week:\n\nMonday - Upper\nBench Press 4x8\nRow 4x10\n\nThursday - Lower\nSquat 4x6\nRDL 3x10\n\nThanks,\nCoach Mike\nMike Smith, CSCS\nIron Barn Fitness\n(555) 123-4567\nSent from my iPhone'));
  assert.deepEqual(names(r), [['Bench Press', 'Row'], ['Squat', 'RDL']]);
  assert.ok(r.skipped.includes('Sent from my iPhone') && r.skipped.includes('Coach Mike'));
});

test('a PDF\'s title page, disclaimer, intro and FAQ are not training days', () => {
  const r = ok(parseProgramTable([
    'ULTIMATE SHRED PROGRAM', 'By Coach Alex', '© 2025 All rights reserved. Do not distribute.',
    'Disclaimer: Consult a physician before beginning any exercise program.', 'INTRODUCTION',
    'Welcome to the program! This 8-week plan is designed to help you build muscle and lose fat.',
    'NUTRITION', 'Eat 1g of protein per pound of bodyweight.',
    'Day 1 - Chest', 'Bench Press 4x8', 'Incline Press 3x10', 'Page 3', 'Day 2 - Back', 'Deadlift 4x5', 'Row 3x10',
    'FAQ', 'Q: Can I swap exercises? A: Yes.', 'www.coachalex.com | @coachalex',
  ].join('\n')));
  assert.deepEqual(days(r), ['Chest', 'Back']);
  assert.deepEqual(names(r), [['Bench Press', 'Incline Press'], ['Deadlift', 'Row']]);
});

test('a text message with typos keeps its lifts and drops the small talk', () => {
  const r = ok(parseProgramTable('ok heres ur workout for this week\nmon - chest n tris\nbench 4x8\ndips 3 sets till failure\n\nfri legs\nsquats 5x5\nlmk if u have questions 💪'));
  assert.deepEqual(days(r), ['chest n tris', 'fri legs']);
  assert.deepEqual(names(r), [['bench', 'dips'], ['squats']]);
  assert.deepEqual(r.skipped, ['ok heres ur workout for this week', 'lmk if u have questions 💪']);
});

test('prose and a bare link are refused, not imported as one giant exercise', () => {
  assert.equal(parseProgramTable('Hey! So this week I want you to focus on getting your sleep in and eating enough protein. Try to hit the gym a few times.').ok, false);
  assert.equal(parseProgramTable('https://www.instagram.com/p/C9xYzAbCdEf/?igsh=MWx0d3l5').ok, false);
});

test('a line that is only a scheme, or a day that came to nothing, is listed — never an exercise called "3x8"', () => {
  const r = ok(parseProgramTable('Squat\nWeek 1: 3x8\nWeek 2: 3x6'));
  assert.ok(!names(r).flat().includes('3x8'));
  assert.deepEqual(r.skipped, ['Week 1: 3x8', 'Week 2: 3x6']);

  const c25k = ok(parseProgramTable('Week 1\nDay 1: Walk 20 minutes\nDay 2: Same as Day 1'));
  assert.deepEqual(c25k.skipped, ['Day 2: Same as Day 1'], 'a day we could not copy is said, not silently lost');
});
