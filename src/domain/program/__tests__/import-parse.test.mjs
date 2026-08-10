import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseProgramTable, summarize, toProgramStructure, unmatchedNames, weeksAreIdentical } from '../import-parse.ts';

const tsv = (rows) => rows.map((r) => r.join('\t')).join('\n');
const ok = (r) => {
  assert.equal(r.ok, true, r.ok ? '' : `parse failed: ${r.error}`);
  return r;
};

/*
 * The design states the contract in the sheet itself, and these hold it to every clause:
 *
 *   "Include a header row — columns can be in any order. We look for Week, Day, Exercise, Sets, Reps.
 *    One week or the whole program — either works."
 */

test('the design\'s own placeholder parses', () => {
  const r = ok(parseProgramTable(
    'Week, Day, Exercise, Sets, Reps\n1, Push A, Bench Press, 3, 8\n1, Push A, Incline DB Press, 3, 10',
  ));
  assert.equal(r.weeks.length, 1);
  assert.equal(r.weeks[0].days.length, 1);
  assert.equal(r.weeks[0].days[0].name, 'Push A');
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]), [
    ['Bench Press', 3, 8],
    ['Incline DB Press', 3, 10],
  ]);
});

test('columns in ANY order — the header is read, never assumed', () => {
  const r = ok(parseProgramTable(tsv([
    ['Reps', 'Exercise', 'Sets', 'Day', 'Week'],
    ['5', 'Back Squat', '5', 'Lower', '1'],
  ])));
  const it = r.weeks[0].days[0].items[0];
  assert.equal(it.name, 'Back Squat');
  assert.equal(it.sets, 5);
  assert.equal(it.reps, 5);
  assert.equal(r.weeks[0].days[0].name, 'Lower');
});

test('ONE WEEK OR THE WHOLE PROGRAM — no Week column is one week, not an error', () => {
  const r = ok(parseProgramTable(tsv([
    ['Day', 'Exercise', 'Sets', 'Reps'],
    ['Push', 'Bench Press', '3', '8'],
    ['Pull', 'Barbell Row', '3', '8'],
  ])));
  assert.equal(r.weeks.length, 1);
  assert.equal(r.weeks[0].index, 1);
  assert.equal(r.weeks[0].days.length, 2);
});

test('a whole program keeps its weeks in numeric order, not the order they were typed', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise'],
    ['3', 'A', 'Squat'],
    ['1', 'A', 'Squat'],
    ['10', 'A', 'Squat'],
    ['2', 'A', 'Squat'],
  ])));
  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2, 3, 10]);
});

test('days keep the SHEET\'s order and are lettered by it — that order is the training week', () => {
  const r = ok(parseProgramTable(tsv([
    ['Day', 'Exercise'],
    ['Zercher Day', 'Squat'],
    ['Arms', 'Curl'],
    ['Back', 'Row'],
  ])));
  assert.deepEqual(r.weeks[0].days.map((d) => [d.letter, d.name]), [
    ['A', 'Zercher Day'],
    ['B', 'Arms'],
    ['C', 'Back'],
  ]);
});

// ── the columns nobody promised ─────────────────────────────────────────────

test('a real coach\'s sheet imports — extra columns are ignored, not refused', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise', 'Sets', 'Reps', 'Weight', 'RPE', 'Tempo', 'Notes'],
    ['1', 'Lower A', 'Back Squat', '5', '5', '225', '8', '30X1', 'Belt on last two'],
  ])));
  assert.equal(r.weeks[0].days[0].items[0].name, 'Back Squat');
  assert.deepEqual(r.ignoredColumns, ['Weight', 'RPE', 'Tempo', 'Notes']);
});

test('rep ranges and instructions read as their floor rather than failing', () => {
  const r = ok(parseProgramTable(tsv([
    ['Exercise', 'Sets', 'Reps'],
    ['Squat', '3', '8-10'],
    ['Bench', '3', '8–12'], // en dash, straight from a document
    ['Row', '3', '3 x 8'],
    ['Curl', '3', 'AMRAP'],
  ])));
  const reps = r.weeks[0].days[0].items.map((i) => [i.reps, i.repsAssumed]);
  assert.deepEqual(reps, [[8, false], [8, false], [3, false], [10, true]]);
});

test('what the sheet did not say is FLAGGED as assumed, not passed off as authored', () => {
  const r = ok(parseProgramTable(tsv([['Exercise'], ['Farmer Carry']])));
  const it = r.weeks[0].days[0].items[0];
  assert.equal(it.sets, 3);
  assert.equal(it.reps, 10);
  assert.equal(it.setsAssumed, true);
  assert.equal(it.repsAssumed, true);
});

// ── clipboard reality ───────────────────────────────────────────────────────

test('TABS WIN over commas — a cell containing a comma must not shatter the table', () => {
  // Excel and Sheets put tabs on the clipboard. "Squat, paused" is one cell.
  const r = ok(parseProgramTable('Day\tExercise\tSets\nLower\tSquat, paused\t5'));
  assert.equal(r.weeks[0].days[0].items[0].name, 'Squat, paused');
});

test('CSV quoting survives — an uploaded .csv is the secondary path', () => {
  const r = ok(parseProgramTable('Day,Exercise,Notes\nLower,"Squat, paused","hold 2s, then drive"'));
  assert.equal(r.weeks[0].days[0].items[0].name, 'Squat, paused');
});

test('blank and spacer rows are skipped, because every real sheet has them', () => {
  const r = ok(parseProgramTable(tsv([
    ['Day', 'Exercise'],
    ['Push', 'Bench'],
    ['', ''],
    ['Push', 'Fly'],
    ['   ', '   '],
  ])));
  assert.equal(r.rowsRead, 2);
  assert.equal(r.weeks[0].days[0].items.length, 2);
});

test('an exercise name is taken VERBATIM — the parser never decides what you trained', () => {
  // "Bench" is not silently promoted to "Barbell Bench Press". Matching happens later and separately.
  const r = ok(parseProgramTable(tsv([['Exercise'], ['bench'], ['  Rows  ']])));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => i.name), ['bench', 'Rows']);
});

// ── failures say what to do ─────────────────────────────────────────────────

test('every failure names the fix', () => {
  const cases = [
    ['', /paste some rows/i],
    ['Week, Day, Exercise, Sets, Reps', /header row on its own/i],
    // A near-miss table says what to rename; a typed-out workout is NOT rejected at all (see below).
    [tsv([['Week', 'Sets', 'Reps'], ['1', '3', '8']]), /not an Exercise one/i],
    [tsv([['Day', 'Exercise'], ['Push', '']]), /No exercises found/i],
  ];
  for (const [input, pattern] of cases) {
    const r = parseProgramTable(input);
    assert.equal(r.ok, false, `expected a failure for ${JSON.stringify(input.slice(0, 40))}`);
    assert.match(r.error, pattern);
    assert.ok(r.error.length > 20, 'an error that short cannot be actionable');
  }
});

// ── what the preview says ───────────────────────────────────────────────────

test('summarize reads like the design\'s "Here\'s what we read"', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise'],
    ['1', 'A', 'Squat'], ['1', 'B', 'Bench'],
    ['2', 'A', 'Squat'], ['2', 'B', 'Bench'],
  ])));
  assert.equal(summarize(r.weeks), '2 weeks · 2 days each · 4 exercises');
  assert.equal(summarize([r.weeks[0]]), '1 week · 2 days each · 2 exercises');
});

test('summarize does not claim a uniform shape it does not have', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise'],
    ['1', 'A', 'Squat'],
    ['2', 'A', 'Squat'], ['2', 'B', 'Bench'],
  ])));
  assert.match(summarize(r.weeks), /varying days/);
});

test('identical weeks are recognised, so an import can repeat one week instead of copying it', () => {
  const same = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise', 'Sets', 'Reps'],
    ['1', 'A', 'Squat', '5', '5'],
    ['2', 'A', 'Squat', '5', '5'],
  ])));
  assert.equal(weeksAreIdentical(same.weeks), true);

  const progressed = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise', 'Sets', 'Reps'],
    ['1', 'A', 'Squat', '5', '5'],
    ['2', 'A', 'Squat', '5', '3'], // a real block progresses — this must NOT collapse
  ])));
  assert.equal(weeksAreIdentical(progressed.weeks), false);
});

// ── into a program ──────────────────────────────────────────────────────────

const KNOWN = { 'back squat': 'barbell-back-squat', 'bench press': 'barbell-bench-press' };
const resolve = (n) => KNOWN[n.trim().toLowerCase()];

test('a repeating program repeats one week rather than storing four copies of it', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise', 'Sets', 'Reps'],
    ['1', 'A', 'Back Squat', '5', '5'],
    ['2', 'A', 'Back Squat', '5', '5'],
  ])));
  const s = toProgramStructure(r.weeks, 'Coach Plan', resolve);
  assert.equal(s.vary, false);
  assert.equal(s.weekPlans, null);
  assert.equal(s.weeks, 2);
  assert.equal(s.days.length, 1);
});

test('a progressing program keeps every week, because the progression IS the program', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise', 'Sets', 'Reps'],
    ['1', 'A', 'Back Squat', '5', '5'],
    ['2', 'A', 'Back Squat', '5', '3'],
  ])));
  const s = toProgramStructure(r.weeks, 'Peaking Block', resolve);
  assert.equal(s.vary, true);
  assert.equal(s.weekPlans.length, 2);
  assert.equal(s.weekPlans[1].days[0].main[0].reps, 3);
});

test('daysPerWeek is the WIDEST week, so a week that adds a day still fits', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise'],
    ['1', 'A', 'Back Squat'],
    ['2', 'A', 'Back Squat'], ['2', 'B', 'Bench Press'], ['2', 'C', 'Row'],
  ])));
  assert.equal(toProgramStructure(r.weeks, 'x', resolve).daysPerWeek, 3);
});

test('everything lands in main — a warm-up is never guessed at', () => {
  // Warm-ups are excluded from PR detection, so guessing which rows are warm-ups would quietly change
  // what counts as a personal record.
  const r = ok(parseProgramTable(tsv([
    ['Day', 'Exercise'],
    ['A', 'Foam Roll Quads'],
    ['A', 'Back Squat'],
    ['A', 'Cooldown Walk'],
  ])));
  const day = toProgramStructure(r.weeks, 'x', resolve).days[0];
  assert.equal(day.main.length, 3);
  assert.deepEqual(day.warmup, []);
  assert.deepEqual(day.cooldown, []);
});

test('a known name gains its catalogue key; an unknown one is left ALONE', () => {
  const r = ok(parseProgramTable(tsv([
    ['Day', 'Exercise'],
    ['A', 'Back Squat'],
    ['A', 'Coach Special Complex'],
  ])));
  const main = toProgramStructure(r.weeks, 'x', resolve).days[0].main;
  assert.equal(main[0].catalogKey, 'barbell-back-squat');
  assert.equal(main[1].catalogKey, undefined, 'an unknown name must not be matched to something near it');
  assert.equal(main[1].name, 'Coach Special Complex', 'and it keeps the name the athlete wrote');
});

test('unmatched names are reported, so nothing is silently unmatched', () => {
  const r = ok(parseProgramTable(tsv([['Day', 'Exercise'], ['A', 'Back Squat'], ['A', 'Zercher Carry']])));
  assert.deepEqual(unmatchedNames(r.weeks, resolve), ['Zercher Carry']);
});

test('an empty program name falls back rather than persisting as blank', () => {
  const r = ok(parseProgramTable(tsv([['Exercise'], ['Back Squat']])));
  assert.equal(toProgramStructure(r.weeks, '   ', resolve).name, 'Imported Program');
});

/*
 * ══ FORMATS THAT ACTUALLY BROKE IT ══
 *
 * Every case below was run through the parser and failed. Nine were rejected outright and six more were
 * accepted while quietly reading the wrong thing, which is the worse half — a rejection sends somebody
 * back to their spreadsheet, a silent misread puts a program they did not write into their legacy.
 */

const shapeOf = (r) =>
  r.weeks.map((w) => ({
    week: w.index,
    days: w.days.map((d) => ({ name: d.name, items: d.items.map((i) => `${i.name} ${i.sets}x${i.reps}`) })),
  }));

test('MERGED cells — a sheet fills Week and Day once per block and leaves the rest blank', () => {
  // This is what merging cells looks like on the clipboard, and it is how nearly every real sheet is
  // built. Reading a blank as "no value" invented a "Day 1" and split one training day in two.
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise', 'Sets', 'Reps'],
    ['1', 'Push', 'Bench Press', '3', '8'],
    ['', '', 'Incline Press', '3', '10'],
    ['', '', 'Fly', '3', '12'],
    ['2', 'Push', 'Bench Press', '3', '6'],
  ])));
  assert.deepEqual(shapeOf(r), [
    { week: 1, days: [{ name: 'Push', items: ['Bench Press 3x8', 'Incline Press 3x10', 'Fly 3x12'] }] },
    { week: 2, days: [{ name: 'Push', items: ['Bench Press 3x6'] }] },
  ]);
});

test('a single Sets × Reps column', () => {
  const r = ok(parseProgramTable(tsv([['Day', 'Exercise', 'Sets x Reps'], ['Push', 'Bench Press', '3x8'], ['Push', 'Fly', '3 x 12']])));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => `${i.sets}x${i.reps}`), ['3x8', '3x12']);
});

test('a real multiplication sign — 5×5 is what people actually type', () => {
  const r = ok(parseProgramTable(tsv([['Exercise', 'Scheme'], ['Squat', '5×5']])));
  const it = r.weeks[0].days[0].items[0];
  assert.equal(`${it.sets}x${it.reps}`, '5x5');
});

test('sets and reps typed INTO the exercise cell', () => {
  const r = ok(parseProgramTable(tsv([['Day', 'Exercise'], ['Push', 'Bench Press 3x8'], ['Push', 'Fly 3x12']])));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]), [
    ['Bench Press', 3, 8],
    ['Fly', 3, 12],
  ]);
});

// ── typed-out workouts: no header, no columns, no spreadsheet ───────────────

test('a workout typed into Notes, with a day heading', () => {
  const r = ok(parseProgramTable('Monday - Push\nBench Press 3x8\nIncline DB Press 3x10\nCable Fly 3x12'));
  assert.equal(r.weeks[0].days[0].name, 'Push');
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => i.name), ['Bench Press', 'Incline DB Press', 'Cable Fly']);
});

test('bullets, numbers, colons and dashes all read the same', () => {
  for (const [label, text] of [
    ['bullets', '- Bench Press 3x8\n- Barbell Row 3x8'],
    ['numbers', '1. Bench Press 3x8\n2. Barbell Row 3x8'],
    ['colons', 'Bench Press: 3x8\nBarbell Row: 3x8'],
    ['dashes', 'Bench Press - 3 x 8\nBarbell Row - 3 x 8'],
  ]) {
    const r = ok(parseProgramTable(text));
    assert.deepEqual(
      r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]),
      [['Bench Press', 3, 8], ['Barbell Row', 3, 8]],
      `${label} did not read cleanly — no separator may survive in the name`,
    );
  }
});

test('day headings as their own lines split the days', () => {
  const r = ok(parseProgramTable('DAY 1: PUSH\nBench Press 3x8\nFly 3x12\nDAY 2: PULL\nBarbell Row 3x8\nCurl 3x12'));
  assert.deepEqual(r.weeks[0].days.map((d) => [d.name, d.items.length]), [['PUSH', 2], ['PULL', 2]]);
});

test('week headings as their own lines split the weeks', () => {
  const r = ok(parseProgramTable('WEEK 1\nDay A\nBench Press 3x8\nDay B\nSquat 5x5\nWEEK 2\nDay A\nBench Press 3x6'));
  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2]);
  assert.equal(r.weeks[0].days.length, 2);
  assert.equal(r.weeks[1].days[0].items[0].reps, 6);
});

test('a lone exercise with nothing else is an import, not an error', () => {
  const r = ok(parseProgramTable('Deadlift'));
  assert.equal(r.weeks[0].days[0].items[0].name, 'Deadlift');
  assert.equal(r.weeks[0].days[0].items[0].setsAssumed, true);
});

// ── the awkward middles ─────────────────────────────────────────────────────

test('a semicolon export (European locale) is still a table', () => {
  const r = ok(parseProgramTable('Week;Day;Exercise;Sets;Reps\n1;Push;Bench Press;3;8'));
  assert.equal(r.weeks[0].days[0].items[0].name, 'Bench Press');
});

test('superset labels are not part of the lift\'s name', () => {
  // The catalogue matches by exact name, so "A1) Bench Press" would match nothing at all.
  const r = ok(parseProgramTable(tsv([['Day', 'Exercise', 'Sets', 'Reps'], ['Push', 'A1) Bench Press', '3', '8'], ['Push', 'A2) Row', '3', '8']])));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => i.name), ['Bench Press', 'Row']);
});

test('a weight tacked on the end is not part of the name either', () => {
  const r = ok(parseProgramTable(tsv([['Exercise'], ['Bench Press 3x8 @135'], ['Squat 5x5 @ 225 lb']])));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]), [
    ['Bench Press', 3, 8],
    ['Squat', 5, 5],
  ]);
});

test('"4 sets of 12" reads as 4×12', () => {
  const r = ok(parseProgramTable(tsv([['Exercise', 'Sets', 'Reps'], ['Bench', '4 sets', '12 reps']])));
  const it = r.weeks[0].days[0].items[0];
  assert.equal(`${it.sets}x${it.reps}`, '4x12');
});

test('a near-miss table is told what to rename, not silently read as prose', () => {
  const r = parseProgramTable(tsv([['Week', 'Sets', 'Reps'], ['1', '3', '8']]));
  assert.equal(r.ok, false);
  assert.match(r.error, /not an Exercise one/i);
});

test('CRLF, padded headers, quoted headers and trailing empty columns all survive', () => {
  for (const text of [
    'Day\tExercise\tSets\tReps\r\nPush\tBench\t3\t8\r\n',
    '  WEEK  \t Day \t  EXERCISE\t Sets \tREPS\n1\tPush\tBench\t3\t8',
    '"Week","Day","Exercise","Sets","Reps"\n"1","Push","Bench","3","8"',
    'Week\tDay\tExercise\tSets\tReps\t\t\n1\tPush\tBench\t3\t8\t\t',
  ]) {
    const r = ok(parseProgramTable(text));
    assert.equal(r.weeks[0].days[0].items[0].name, 'Bench');
    assert.equal(r.weeks[0].days[0].items[0].sets, 3);
  }
});

/*
 * ══ A WORKOUT SOMEBODY TEXTS YOU ══
 *
 * Verbatim from a real six-day split. Numbered lines, "N sets - M-K reps" phrasing, a stray trailing
 * period, one line where the author typed "reps" when they meant "sets", and a day heading that names
 * the muscles rather than the day. It read every set and lost every rep count, and left "- - 6-8 reps"
 * welded to each exercise name — so seven lifts imported as seven unmatched names at an invented 3×10.
 */
const REAL_SPLIT = `DAY 1 - Chest and Triceps
1.   Bench press - 4 sets - 6-8 reps
2.   Incline Dumbbell press - 3 sets - 6-8 reps
3.   Chest Flys 3 sets - 8-10 reps
4.   Dips - 3 sets - 10-12 reps
DAY 2 - Back and Biceps
1.   Deadlifts - 4 sets - 6-8 reps
7.   Barbell or Dumbbell Shrugs - 3 reps - 10-12 reps
DAY 3 - Legs and Shoulder
5.   Overhead Press - 4 sets - 6-8 reps.
2.   Lunges - 2 sets - 14-16 reps`;

test('the texted split imports exactly, with nothing assumed', () => {
  const r = ok(parseProgramTable(REAL_SPLIT));
  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['Chest and Triceps', 'Back and Biceps', 'Legs and Shoulder']);

  const all = r.weeks[0].days.flatMap((d) => d.items);
  assert.equal(all.some((i) => i.setsAssumed || i.repsAssumed), false, 'every set and rep is stated — none may be assumed');
  assert.equal(all.some((i) => /reps|sets|--|\s-\s*$/.test(i.name)), false, `scheme debris left in a name: ${all.map((i) => i.name).join(' / ')}`);

  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]), [
    ['Bench press', 4, 6],
    ['Incline Dumbbell press', 3, 6],
    ['Chest Flys', 3, 8], // no dash before "3 sets"
    ['Dips', 3, 10],
  ]);
});

test('"3 reps - 10-12 reps" — the author meant sets, and it is not in doubt', () => {
  // Every other line in that day reads "N sets - M-K reps". Two rep phrases and no sets phrase is read
  // as sets-then-reps rather than throwing the first away.
  const r = ok(parseProgramTable(REAL_SPLIT));
  const shrugs = r.weeks[0].days[1].items.find((i) => i.name.includes('Shrugs'));
  assert.equal(shrugs.sets, 3);
  assert.equal(shrugs.reps, 10);
});

test('a trailing full stop is not part of the lift', () => {
  const r = ok(parseProgramTable(REAL_SPLIT));
  assert.equal(r.weeks[0].days[2].items[0].name, 'Overhead Press');
});

// ── the shapes a split arrives in ───────────────────────────────────────────

test('A BARE HEADING splits the days — "Push" is not an exercise', () => {
  // "Push", "Legs", "Core", "Pull" match no keyword and shout no capitals. Each used to import as an
  // exercise at an invented 3×10 while the day it named was never created. Whether a bare line is a
  // heading is not a property of the line — it is where it SITS: work beneath, a boundary above.
  const r = ok(parseProgramTable('Push\nBench Press 4x8\nFly 3x12\nPull\nRow 4x8'));
  assert.deepEqual(r.weeks[0].days.map((d) => [d.name, d.items.length]), [['Push', 2], ['Pull', 1]]);
});

test('but a list of lifts with no headings stays one day', () => {
  const r = ok(parseProgramTable('Squat 5x5\nBench 5x5\nRow 5x5'));
  assert.equal(r.weeks[0].days.length, 1);
  assert.equal(r.weeks[0].days[0].items.length, 3);
});

test('"4/8" reads as sets over reps, the way a split gets texted', () => {
  const r = ok(parseProgramTable('Push\nBench Press 4/8\nFly 3/12'));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]), [
    ['Bench Press', 4, 8],
    ['Fly', 3, 12],
  ]);
});

test('reps before sets reads the same as sets before reps', () => {
  const r = ok(parseProgramTable('Push\nBench Press - 8 reps - 4 sets'));
  const it = r.weeks[0].days[0].items[0];
  assert.deepEqual([it.name, it.sets, it.reps], ['Bench Press', 4, 8]);
});

test('a parenthesised scheme leaves no empty brackets behind', () => {
  const r = ok(parseProgramTable('Pull\nDeadlift (4 sets of 5)\nRow (3 sets of 10)'));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]), [
    ['Deadlift', 4, 5],
    ['Row', 3, 10],
  ]);
});

test('coaching notes and rest times are not part of the lift\'s name', () => {
  // The catalogue matches on exact name, so "Bench Press (last set AMRAP)" matches nothing at all.
  const r = ok(parseProgramTable(
    'Push\nBench Press - 4 sets - 8 reps (last set AMRAP)\nFly - 3 sets - 12 reps - 90s rest',
  ));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => i.name), ['Bench Press', 'Fly']);
});

test('numbered and emoji-decorated headings still name the day', () => {
  assert.deepEqual(ok(parseProgramTable('1) Push\nBench 4x8\n2) Pull\nRow 4x8')).weeks[0].days.map((d) => d.name), ['Push', 'Pull']);
  assert.equal(ok(parseProgramTable('💪 PUSH DAY\n• Bench Press — 4 sets — 6-8 reps')).weeks[0].days[0].items[0].name, 'Bench Press');
});

test('sets with no reps, and reps with no sets, each keep what was actually said', () => {
  const setsOnly = ok(parseProgramTable('Legs\nSquat - 5 sets'));
  assert.equal(setsOnly.weeks[0].days[0].items[0].sets, 5);
  assert.equal(setsOnly.weeks[0].days[0].items[0].repsAssumed, true);

  const repsOnly = ok(parseProgramTable('Core\nPlank - 60 reps'));
  assert.equal(repsOnly.weeks[0].days[0].items[0].reps, 60);
  assert.equal(repsOnly.weeks[0].days[0].items[0].setsAssumed, true);
});

test('a deload week note does not stop the week being read', () => {
  const r = ok(parseProgramTable('Week 1\nSquat 5x5\nWeek 2 - DELOAD\nSquat 3x5'));
  assert.deepEqual(r.weeks.map((w) => [w.index, w.days[0].items[0].sets]), [[1, 5], [2, 3]]);
});

/*
 * ══ THE SHAPES THAT STILL BROKE IT ══
 *
 * A second adversarial pass. Four of these were silently WRONG rather than rejected, which is the class
 * that reaches an athlete's legacy without anyone noticing.
 */

test('a weight is not a scheme — "135 x 5" must never read as 1 set of 35', () => {
  // The compact matcher took two digits off the front of a three-digit number. Silently, and the result
  // looked entirely plausible.
  const r = ok(parseProgramTable('Bench\n135 x 5\n185 x 3\n225 x 1'));
  const items = r.weeks[0].days[0].items;
  assert.equal(items.length, 1, 'three loaded sets are one exercise, not three');
  assert.equal(items[0].name, 'Bench');
  assert.notEqual(items[0].reps, 35);
});

test('5/3/1 and wave loading — each loaded line is a SET of the lift above it', () => {
  // "Squat / 65% x 5 / 75% x 5 / 85% x 5+" is one exercise for three sets, not three lifts named after
  // percentages. The LOAD is dropped: a program prescribes sets and reps, and the weight is what the
  // athlete puts on the bar on the day.
  const r = ok(parseProgramTable('Squat\n65% x 5\n75% x 5\n85% x 5+'));
  const items = r.weeks[0].days[0].items;
  assert.equal(items.length, 1);
  assert.deepEqual([items[0].name, items[0].sets, items[0].reps], ['Squat', 3, 5]);
  assert.equal(items[0].setsAssumed, false);
});

test('ONE COLUMN PER DAY — how a great many coaches lay a week out', () => {
  // No Exercise column, because every column IS exercises. Read row-wise this produced one absurd lift
  // per line: "Bench Squat 5x5 Row 4x8".
  const r = ok(parseProgramTable(tsv([
    ['Day 1', 'Day 2', 'Day 3'],
    ['Bench 4x8', 'Squat 5x5', 'Row 4x8'],
    ['Fly 3x12', 'Lunge 3x10', 'Curl 3x12'],
  ])));
  assert.deepEqual(r.weeks[0].days.map((d) => [d.name, d.items.map((i) => i.name)]), [
    ['Day 1', ['Bench', 'Fly']],
    ['Day 2', ['Squat', 'Lunge']],
    ['Day 3', ['Row', 'Curl']],
  ]);
});

test('a markdown table — what an answer pasted out of a chat window looks like', () => {
  const r = ok(parseProgramTable('| Day | Exercise | Sets | Reps |\n|---|---|---|---|\n| Push | Bench | 4 | 8 |'));
  assert.equal(r.weeks[0].days[0].name, 'Push');
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]), [['Bench', 4, 8]]);
});

test('"Week 1: Squat 5x5" keeps the exercise on the heading line', () => {
  // Consuming the whole line discarded it — and for a program written one week per line, discarded every
  // exercise in the program and then reported that it found none.
  const r = ok(parseProgramTable('Week 1: Squat 5x5\nWeek 2: Squat 5x5\nWeek 3: Squat 3x5'));
  assert.deepEqual(r.weeks.map((w) => [w.index, w.days[0].items[0].sets]), [[1, 5], [2, 5], [3, 3]]);
});

test('a scheme on the line BELOW its exercise belongs to it', () => {
  const r = ok(parseProgramTable('Bench Press\n4x8\nSquat\n5x5'));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]), [
    ['Bench Press', 4, 8],
    ['Squat', 5, 5],
  ]);
});

test('TWO DAYS THAT SHARE A NAME ARE STILL TWO DAYS', () => {
  /*
   * A six-day split names day 4 "Chest and Triceps" exactly like day 1 — that is what a split IS.
   * Keying days by name merged them, and a real six-day program imported as FOUR days with fourteen
   * exercises crammed into the first. Found by importing one, not by reading the code.
   */
  const r = ok(parseProgramTable([
    'DAY 1 - Chest and Triceps', 'Bench press - 4 sets - 6-8 reps',
    'DAY 2 - Back and Biceps', 'Deadlifts - 4 sets - 6-8 reps',
    'DAY 3 - Legs and Shoulder', 'Front Squat - 4 sets - 10-12 reps',
    'DAY 4 - Chest and Triceps', 'Dumbbell Bench Press - 4 sets - 6-8 reps',
    'DAY 5 - Back and Biceps', 'Pull-ups - 4 sets - 6-8 reps',
    'DAY 6 - Shoulder and Legs', 'Military press - 4 sets - 6-8 reps',
  ].join('\n')));

  assert.equal(r.weeks[0].days.length, 6, 'a six-day split must import as six days');
  assert.deepEqual(r.weeks[0].days.map((d) => d.letter), ['A', 'B', 'C', 'D', 'E', 'F']);
  for (const d of r.weeks[0].days) {
    assert.equal(d.items.length, 1, `${d.letter} (${d.name}) collected another day's work`);
  }
});

test('but a TABLE still merges the rows of one day, because its Day column repeats', () => {
  // The opposite case, and the reason the two readers key days differently: a table labels every row.
  const r = ok(parseProgramTable(tsv([
    ['Day', 'Exercise', 'Sets', 'Reps'],
    ['Push', 'Bench', '4', '8'],
    ['Push', 'Fly', '3', '12'],
    ['Pull', 'Row', '4', '8'],
    ['Push', 'Dips', '3', '10'], // out of order, and still the same day
  ])));
  assert.equal(r.weeks[0].days.length, 2);
  assert.deepEqual(r.weeks[0].days.map((d) => [d.name, d.items.length]), [['Push', 3], ['Pull', 1]]);
});

/*
 * ── A REAL COACH'S SHEET ─────────────────────────────────────────────────────
 *
 * Everything below is the shape of an actual training spreadsheet, and every one of these failed
 * before. The sheet does not open with its header row: it opens with a week title, a phase banner and
 * a running prescription block, and only then names its columns. It lays its days out as banner rows
 * rather than in a Day column, and it interleaves those with SECTION labels that look almost exactly
 * the same.
 */

test('the header row is found even when it is not the first line', () => {
  /*
   * Assuming line one meant the Exercise column was never found, the whole sheet fell through to the
   * freeform reader — which does not split cells — and every tab-joined row became ONE exercise named
   * after the entire row, coaching notes and logged weights included.
   */
  const r = ok(parseProgramTable(tsv([
    ['WEEK 1', '', '', '', '', 'Phase 1 — Hypertrophy & Movement Foundation'],
    ['  Phase 1  •  Weeks 1–3  •  4 training days + 3 run sessions'],
    ['RUNNING PRESCRIPTION'],
    ['Mon — Zone 2', '20–25 min Z2', 'Thu — Intervals', '', '', '15 min @80–85% HRmax'],
    ['Section', 'Exercise', 'Sets × Reps', 'Intensity', 'Coaching Note', '✓ Done', 'Weight Used'],
    ['STRENGTH — BARBELL'],
    ['', 'Barbell bench press', '4×8–10', 'RPE 6–7', '3-1-2 tempo. Control the eccentric', '☐*', 'Last set 160 x 8'],
  ])));

  const items = r.weeks[0].days[0].items;
  assert.equal(items.length, 1, 'the preamble must not import as exercises');
  assert.equal(items[0].name, 'Barbell bench press', 'the name must be the Exercise cell, not the whole row');
  assert.deepEqual([items[0].sets, items[0].reps], [4, 8], 'a rep range reads as its floor');
  assert.ok(r.ignoredColumns.includes('Coaching Note'), 'the columns nobody promised are ignored, not read');
});

test('DAY BANNER ROWS split the days, and SECTION labels do not', () => {
  /*
   * The load-bearing distinction. Both sit alone in the same column with every other cell blank, and
   * both are short and shouted — but "MONDAY — Upper" is a day and "WARM-UP" is a heading INSIDE one.
   * Reading neither welded four training days into one; reading both turned them into twenty-three.
   */
  const r = ok(parseProgramTable(tsv([
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper Strength + Zone 2'],
    ['WARM-UP'],
    ['', 'Band pull-aparts', '2×20'],
    ['STRENGTH — BARBELL'],
    ['', 'Barbell bench press', '4×8–10'],
    ['ACCESSORIES'],
    ['', 'Cable curls', '3×12'],
    ['TUESDAY — Lower Strength — Squat Focus'],
    ['WARM-UP'],
    ['', 'Glute bridges', '2×15'],
    ['STRENGTH — BARBELL'],
    ['', 'Back squat', '4×8–10'],
  ])));

  assert.equal(r.weeks[0].days.length, 2, 'section labels must not become days');
  assert.deepEqual(
    r.weeks[0].days.map((d) => [d.name, d.items.length]),
    [['Upper Strength + Zone 2', 3], ['Lower Strength — Squat Focus', 2]],
  );
});

test('a day that never gets an exercise is not invented', () => {
  // "TUESDAY — see next section ▼" is a pointer, and Wednesday is a rest day written as prose.
  const r = ok(parseProgramTable(tsv([
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper'],
    ['', 'Barbell bench press', '4×8'],
    ['TUESDAY — see next section  ▼'],
    ['TUESDAY — Lower Strength'],
    ['', 'Back squat', '4×8'],
    ['WEDNESDAY — Active Recovery: 20–30 min walk + foam rolling'],
    ['SUNDAY — Full Rest. Sleep. Eat well. Do not train.'],
  ])));

  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['Upper', 'Lower Strength']);
});

test('a number in a lift\'s NAME is not a scheme when the columns already said', () => {
  /*
   * "Hip-90/90 mobility" read as ninety sets of ninety, and the name came back as "Hip- mobility" —
   * the scheme reader cannot tell a prescription from a number that is part of what a lift is CALLED.
   * A sheet that keeps sets and reps in a column does not need a second opinion on either.
   */
  const r = ok(parseProgramTable(tsv([
    ['Exercise', 'Sets × Reps'],
    ['Hip-90/90 mobility', '2×5/side'],
    ['Copenhagen plank', '3×8/side'],
  ])));

  assert.deepEqual(
    r.weeks[0].days[0].items.map((i) => [i.name, i.sets, i.reps]),
    [['Hip-90/90 mobility', 2, 5], ['Copenhagen plank', 3, 8]],
  );
});

test('a WEEK banner row inside the body starts a new week', () => {
  // Weeks are bannered exactly like days in these sheets, not kept in a column.
  const r = ok(parseProgramTable(tsv([
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper'],
    ['', 'Barbell bench press', '4×8'],
    ['WEEK 2'],
    ['MONDAY — Upper'],
    ['', 'Barbell bench press', '4×10'],
  ])));

  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2]);
  assert.equal(r.weeks[1].days[0].items[0].reps, 10);
});

test('a lone "Name" line does not hijack a typed-out workout as a header', () => {
  /*
   * The guard on the header search. Matching ONE column is not enough to call a line a header — doing
   * so would discard everything above it, which for a typed-out workout is most of the workout.
   */
  const r = ok(parseProgramTable(['Bench Press 3x8', 'Name', 'Squat 5x5'].join('\n')));
  const names = r.weeks[0].days.flatMap((d) => d.items.map((i) => i.name));
  assert.ok(names.includes('Bench Press'), 'the lines above must survive');
  assert.ok(names.includes('Squat'));
});

/*
 * ── THE SAME SHEET, THREE WEEKS AT A TIME ────────────────────────────────────
 *
 * A multi-week sheet is not three sheets glued together. Only week ONE's preamble sits above the header
 * row; every later week's lands in the middle of the body, header row and all.
 */

test('a week banner INDENTED into the Exercise column still starts a new week', () => {
  /*
   * These sheets are laid out by eye. Week 1's banner sat in column A and week 2's one cell further in —
   * so "WEEK 2" arrived AS the exercise name, the week never advanced, and three weeks imported as two
   * with week 2's work folded silently into week 1.
   */
  const r = ok(parseProgramTable(tsv([
    ['WEEK 1', '', 'Phase 1'],
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper'],
    ['', 'Barbell bench press', '4×8'],
    ['', 'WEEK 2', ''], // indented one column — lands under Exercise
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper'],
    ['', 'Barbell bench press', '4×10'],
    ['', '', 'WEEK 3'], // and further still
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper'],
    ['', 'Barbell bench press', '4×12'],
  ])));

  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2, 3]);
  assert.deepEqual(r.weeks.map((w) => w.days[0].items[0].reps), [8, 10, 12]);
  for (const w of r.weeks) assert.equal(w.days.length, 1, `week ${w.index} grew days it does not have`);
});

test('a header row repeated for each week is not a lift called "Exercise"', () => {
  const r = ok(parseProgramTable(tsv([
    ['Section', 'Exercise', 'Sets × Reps'],
    ['', 'Barbell bench press', '4×8'],
    ['WEEK 2'],
    ['Section', 'Exercise', 'Sets × Reps'],
    ['', 'Back squat', '4×8'],
  ])));

  const names = r.weeks.flatMap((w) => w.days.flatMap((d) => d.items.map((i) => i.name)));
  assert.deepEqual(names, ['Barbell bench press', 'Back squat']);
});

test('a repeated preamble is furniture, but an unprescribed item is still work', () => {
  /*
   * Both sides of the same rule. The running block's second cell falls under Exercise and prescribes
   * nothing — furniture. A Zone 2 run inside a day is the identical SHAPE, and is real: the sheet simply
   * gave it minutes instead of sets. What separates them is whether a week banner has opened a preamble
   * that no header row or day banner has closed yet.
   */
  const r = ok(parseProgramTable(tsv([
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper'],
    ['', 'Barbell bench press', '4×8'],
    ['CONDITIONING'],
    ['', 'Zone 2 run — conversational pace', '20–25 min'],
    ['WEEK 2'],
    ['RUNNING PRESCRIPTION'],
    ['Mon — Zone 2', '20–25 min Z2', 'Thu — Intervals'], // furniture: no prescription, inside a preamble
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper'],
    ['', 'Back squat', '4×8'],
  ])));

  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2]);
  assert.deepEqual(
    r.weeks[0].days[0].items.map((i) => i.name),
    ['Barbell bench press', 'Zone 2 run — conversational pace'],
    'a run with minutes instead of sets is still work',
  );
  assert.deepEqual(r.weeks[1].days[0].items.map((i) => i.name), ['Back squat'], 'the running block is not a lift');
});

test('a header repeated per BLOCK, with no week banner, is still not a lift', () => {
  /*
   * The case the preamble rule cannot reach: nothing has opened a preamble here, so the repeated header
   * is judged on its own. Its Exercise cell literally reads "Exercise", and it imported as a lift called
   * that, once per block.
   */
  const r = ok(parseProgramTable(tsv([
    ['Section', 'Exercise', 'Sets × Reps'],
    ['MONDAY — Upper'],
    ['', 'Barbell bench press', '4×8'],
    ['Section', 'Exercise', 'Sets × Reps'],
    ['TUESDAY — Lower'],
    ['', 'Back squat', '4×8'],
  ])));

  const names = r.weeks.flatMap((w) => w.days.flatMap((d) => d.items.map((i) => i.name)));
  assert.deepEqual(names, ['Barbell bench press', 'Back squat']);
});

/*
 * ── A PROGRAM LIFTED OUT OF A PDF ────────────────────────────────────────────
 *
 * No columns, no sets, no reps, and no "Week 2" anywhere. Two weeks printed one after the other, told
 * apart only by the weekdays starting over.
 */

test('THE WEEKDAYS COMING ROUND AGAIN START A NEW WEEK', () => {
  const r = ok(parseProgramTable([
    'MONDAY', 'Kneeling Push-Ups', 'Reverse Lunges',
    'TUESDAY', 'Glute Bridges',
    'WEDNESDAY — REST DAY',
    'SATURDAY', 'Chair Dips',
    'SUNDAY — REST DAY',
    'MONDAY', 'Deficit Push-Ups', // ← the boundary, and the only thing marking it
    'TUESDAY', 'Goblet Squats',
    'SATURDAY', 'Bench Press',
  ].join('\n')));

  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2], 'two weeks, not one week of eight days');
  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['MONDAY', 'TUESDAY', 'SATURDAY']);
  assert.deepEqual(r.weeks[1].days.map((d) => d.name), ['MONDAY', 'TUESDAY', 'SATURDAY']);
  assert.deepEqual(r.weeks[1].days[0].items.map((i) => i.name), ['Deficit Push-Ups']);
});

test('a week whose days are printed OUT OF ORDER is not cut in half', () => {
  /*
   * Why repetition is the signal and order is not. A PDF's columns interleave, and this week really does
   * list Sunday between Tuesday and Wednesday — a rule watching for the days going backwards would open
   * a third week at Wednesday.
   */
  const r = ok(parseProgramTable([
    'MONDAY', 'Push-Ups',
    'TUESDAY', 'Goblet Squats',
    'SUNDAY — REST DAY',
    'WEDNESDAY — REST DAY',
    'THURSDAY', 'Pull-Ups',
    'FRIDAY', 'Front Rack Squats',
  ].join('\n')));

  assert.equal(r.weeks.length, 1, 'one week, however its days were laid out');
  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['MONDAY', 'TUESDAY', 'THURSDAY', 'FRIDAY']);
});

test('a FOCUS label does not split the day it describes', () => {
  /*
   * The label sits AMONG the exercises, not above them. Read as a day it took four of the day's five
   * lifts with it — and where the PDF wrapped "TARGET: ARMS, CHEST, AND" onto a second line, the day
   * that stole them was called "BACK".
   */
  const r = ok(parseProgramTable([
    'MONDAY',
    'Arms/Chest: Kneeling Push-Ups (reduce load, build form)',
    'FOCUS: ARMS/CHEST',
    'Legs: Reverse Lunges (bodyweight)',
    'THURSDAY',
    'TARGET: ARMS, CHEST, AND',
    'BACK',
    'Deficit Push-Ups',
    'Pull-Ups',
  ].join('\n')));

  assert.equal(r.weeks[0].days.length, 2, 'a label is not a day');
  assert.deepEqual(r.weeks[0].days.map((d) => [d.name, d.items.length]), [['MONDAY', 2], ['THURSDAY', 2]]);
  const names = r.weeks[0].days.flatMap((d) => d.items.map((i) => i.name));
  assert.ok(!names.some((n) => /^(focus|target)/i.test(n)), 'and it is not an exercise either');
});

test('"Focus set:" is an exercise — naming a SET is not naming the day', () => {
  const r = ok(parseProgramTable(['MONDAY', 'Focus set: Chair Dips', 'Reverse Lunges'].join('\n')));
  assert.equal(r.weeks[0].days[0].items.length, 2, 'the focus set must survive as work');
});

test('a weekday with the first exercise on the same line keeps both', () => {
  const r = ok(parseProgramTable([
    'SATURDAY Arms/Chest: Chair Dips (use sturdy chair, feet closer = easier)',
    'Legs: Reverse Lunges (bodyweight)',
  ].join('\n')));

  assert.equal(r.weeks[0].days[0].name, 'SATURDAY');
  assert.equal(r.weeks[0].days[0].items.length, 2, "the day name swallowed the day's first exercise");
});

test('but "WEDNESDAY — REST DAY" is a day called Rest Day, not a rest-day exercise', () => {
  // The guard on the split above: a dash introduces the rest of the NAME, not the day's first lift.
  const r = ok(parseProgramTable(['WEDNESDAY — REST DAY', 'MONDAY', 'Push-Ups'].join('\n')));
  const names = r.weeks[0].days.flatMap((d) => d.items.map((i) => i.name));
  assert.deepEqual(names, ['Push-Ups'], 'REST DAY must not import as work');
});

test('a PDF page footer is not an exercise', () => {
  const r = ok(parseProgramTable([
    'MONDAY', 'Push-Ups', 'DailyRepsGuy — 20 min. Workout PDF Page 10', 'Pull-Ups',
  ].join('\n')));
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => i.name), ['Push-Ups', 'Pull-Ups']);
});

// ══ ONE ROW PER DAY, WITH THE SESSION AS PROSE ═══════════════════════════════
//
// ⚠ THE SHEET BELOW IS REAL — a 15-week Brineman 70.3 plan a PO was handed, columns and all. Before the
// session reader it fell all the way through to the freeform reader and produced one "exercise" per ROW,
// named with the entire tab-joined line, at a fabricated 3 × 10.

const TRI_SHEET = tsv([
  ['Week / Phase', 'Date', 'Day', 'Workout (swim / bike / run)', 'Strength & Mobility', 'Est. Hrs'],
  ['Week 1 — Base + Calf Rehab', '', '', '', '', '10.8 h'],
  ['FALSE', 'Mon, Jun 1', 'Monday', '75min bike Z2 w/ 3x8min Z3 + 30min upper-body strength', 'UPPER: push-ups 3x10 • 1-arm DB row 3x10/side • plank 3x45s', '1.8'],
  ['FALSE', 'Tue, Jun 2', 'Tuesday', '60min easy bike Z2 + 45min brisk incline walk', '', '1.8'],
  ['FALSE', 'Fri, Jun 5', 'Friday', 'SWIM 1200yd: technique focus, 8x100 Z2 + 4x50 drills + 20min easy row', '', '1.3'],
  ['FALSE', 'Sat, Jun 6', 'Saturday', 'LONG RIDE 2.5h Z2 endurance (~38-42mi), rolling terrain', '', '2.5'],
  ['', 'Sun, Jun 7', 'Sunday', 'Full Rest Day', '', ''],
  ['Week 2 — Base + Calf Rehab', '', '', '', '', '9.4 h'],
  ['FALSE', 'Mon, Jun 8', 'Monday', '90min bike w/ 6x4min big-gear low-cadence strength + 15min walk', 'Bike-based strength today — no gym work needed', '1.9'],
  ['', 'Sun, Jun 14', 'Sunday', 'Full Rest Day', '', ''],
]);

test('a one-row-per-day endurance sheet is read as sessions, not as one lift per row', () => {
  const r = ok(parseProgramTable(TRI_SHEET));
  assert.equal(r.weeks.length, 2, 'the week banners split it, though there is no Week column to read');
  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2]);
  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['Monday', 'Tuesday', 'Friday', 'Saturday']);
});

test('a rest day is no session at all, so it never occupies a day', () => {
  const r = ok(parseProgramTable(TRI_SHEET));
  for (const w of r.weeks) {
    assert.equal(w.days.some((d) => /sunday/i.test(d.name)), false, 'Sunday is rest and must not be a day');
  }
  // Which is also what keeps a Mon–Sun plan inside the builder's six-day ceiling.
  assert.ok(Math.max(...r.weeks.map((w) => w.days.length)) <= 6);
});

test('the ride, the swim and the row come through with real targets', () => {
  const r = ok(parseProgramTable(TRI_SHEET));
  const [mon, , fri, sat] = r.weeks[0].days;

  const ride = mon.items[0];
  assert.equal(ride.kind, 'cardio');
  assert.equal(ride.activity, 'bike');
  assert.equal(ride.targetSec, 75 * 60, 'the 75 is the ride; the 3x8min inside it is not');

  const swim = fri.items[0];
  assert.equal(swim.activity, 'swim');
  assert.equal(Math.round(swim.targetMi * 1760), 1200, '1200 yd, in canonical miles');

  const row = fri.items[1];
  assert.equal(row.activity, 'row');
  assert.equal(row.targetSec, 20 * 60);

  const long = sat.items[0];
  assert.equal(long.targetSec, 150 * 60, '2.5h');
  assert.equal(long.targetMi, 38, 'the floor of the ~38-42mi range');
});

test('the strength column keeps its written sets and reps and is never read as cardio', () => {
  const r = ok(parseProgramTable(TRI_SHEET));
  const mon = r.weeks[0].days[0];
  const lifts = mon.items.filter((i) => i.kind === 'strength');
  const dbRow = lifts.find((i) => i.name === '1-arm DB row');
  assert.ok(dbRow, 'the DB row survived');
  assert.equal(dbRow.sets, 3);
  assert.equal(dbRow.reps, 10);
  assert.equal(dbRow.kind, 'strength', 'a DB row is a lift, not an erg');

  const wk2 = r.weeks[1].days[0].items;
  assert.ok(
    wk2.some((i) => i.kind === 'strength' && /Bike-based strength/.test(i.note)),
    '"Bike-based strength today" is a strength cell and is not a ride',
  );
});

test('⚠ every item keeps the sentence it came from — the parser is a heuristic and must show its work', () => {
  const r = ok(parseProgramTable(TRI_SHEET));
  for (const w of r.weeks) for (const d of w.days) for (const i of d.items) {
    assert.ok(i.note && i.note.trim().length, `${i.name} lost its source sentence`);
  }
  const ride = r.weeks[0].days[0].items[0];
  assert.equal(ride.note, '75min bike Z2 w/ 3x8min Z3', 'the interval the model cannot hold is still readable');
});

test('the metadata columns are reported as ignored rather than read as work', () => {
  const r = ok(parseProgramTable(TRI_SHEET));
  assert.deepEqual(r.ignoredColumns, ['Week / Phase', 'Date', 'Est. Hrs']);
});

test('it becomes a program whose bouts are cardio blocks with coaching notes', () => {
  const r = ok(parseProgramTable(TRI_SHEET));
  const s = toProgramStructure(r.weeks, 'Brineman 70.3', () => undefined);
  assert.equal(s.weeks, 2);
  assert.equal(s.vary, true, 'no two weeks of a real plan are the same');

  const ride = s.weekPlans[0].days[0].main[0];
  assert.equal(ride.catalogKey, 'cardio:bike');
  assert.equal(ride.kind, 'cardio');
  assert.equal(ride.targetSec, 75 * 60);
  assert.equal(ride.coachNote, '75min bike Z2 w/ 3x8min Z3');
  // Named the way the LOGGER will name it — `build-session` derives a cardio block's name, so a prose
  // name here would have the builder and the session disagreeing about one block.
  assert.equal(ride.name, 'Outdoor Ride');
});

test('an ordinary exercise table is untouched by any of this', () => {
  const r = ok(parseProgramTable(tsv([
    ['Week', 'Day', 'Exercise', 'Sets', 'Reps'],
    ['1', 'Push A', 'Bench Press', '3', '8'],
    ['1', 'Push A', 'Incline DB Press', '3', '10'],
  ])));
  const items = r.weeks[0].days[0].items;
  assert.equal(items.length, 2);
  assert.equal(items[0].name, 'Bench Press');
  assert.equal(items[0].kind, undefined, 'no cardio fields on an ordinary import');
  assert.equal(items[0].note, undefined);
});

test('a nearly-right exercise table still gets the error that helps it, not a session reading', () => {
  const r = parseProgramTable(tsv([
    ['Week', 'Day', 'Movements', 'Sets', 'Reps'],
    ['1', 'Push A', 'Bench Press', '3', '8'],
  ]));
  assert.equal(r.ok, false);
  assert.match(r.error, /Exercise/, 'it should say to name the column, not silently read it another way');
});

// ══ THE SAME PLAN, AS AN iPHONE ACTUALLY PASTES IT ═══════════════════════════
//
// ⚠ THE FIXTURE IS A REAL CLIPBOARD, not a tidied one. The synthetic sheet above imported perfectly and
// the same plan copied out of Google Sheets on a phone still produced ninety junk rows, because a real
// paste is deformed in three ways at once and the tests did not know:
//
//   1. A CELL CONTAINING A NEWLINE breaks its row across several physical lines. The strength cell nearly
//      always contains one, so one row arrives as three or four.
//   2. THE CHECKBOX COLUMN DOES NOT COME ACROSS — boxes are a control, not a value — so every data row
//      sits one cell to the LEFT of the header that names it.
//   3. Some rows carry a seventh, unheaded column of loose notes.
//
// Read `fixtures/tri-sheet-ios-paste.txt` before changing any of this.
const IOS_PASTE = readFileSync(new URL('./fixtures/tri-sheet-ios-paste.txt', import.meta.url), 'utf8');

test('a real phone paste of the plan is read as sessions, not as junk rows', () => {
  const r = ok(parseProgramTable(IOS_PASTE));
  assert.deepEqual(r.weeks.map((w) => w.index), [1, 2, 4, 15]);
  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
});

test('⚠ a row torn apart by a newline inside a cell is put back together', () => {
  const r = ok(parseProgramTable(IOS_PASTE));
  const monday = r.weeks[0].days[0];

  // The ride, the strength phrase, and every bullet of the strength cell — all ONE day.
  assert.equal(monday.items[0].activity, 'bike');
  assert.equal(monday.items[0].targetSec, 75 * 60);
  assert.ok(monday.items.some((i) => i.name === 'overhead press' && i.sets === 3 && i.reps === 8));
  assert.ok(monday.items.some((i) => i.name === 'plank'));

  // And the Est. Hrs cell, which arrived on its own line, is NOT an exercise called "1.8".
  for (const w of r.weeks) for (const d of w.days) for (const i of d.items) {
    assert.equal(/^\d+(\.\d+)?( h)?$/.test(i.name.trim()), false, `"${i.name}" is a duration, not a movement`);
  }
});

test('⚠ the body is realigned when the checkbox column fails to copy', () => {
  // Header: Week/Phase, Date, Day, Workout, Strength, Est.Hrs. Data starts at Date — shifted by one.
  // Read at the header's own indices, every Workout cell came back as the Day cell instead.
  const r = ok(parseProgramTable(IOS_PASTE));
  const tuesday = r.weeks[0].days[1];
  assert.equal(tuesday.name, 'Tuesday', 'the day is still the day');
  assert.equal(tuesday.items[0].activity, 'bike', 'and the workout column really is the workout');
  assert.equal(tuesday.items[0].targetSec, 60 * 60);
});

test('a week banner that wraps onto a second line is still one banner', () => {
  const r = ok(parseProgramTable(IOS_PASTE));
  const wk4 = r.weeks.find((w) => w.index === 4);
  assert.ok(wk4, 'Week 4 — Recovery / Last No-Run Week');
  assert.equal(wk4.days[0].name, 'Monday');
  // Its phase note is a description of the week, not work, and must not become an exercise.
  for (const d of wk4.days) for (const i of d.items) {
    assert.equal(/intensity down, prep calf/.test(i.name), false);
  }
});

test('rest days and the loose notes column produce nothing', () => {
  const r = ok(parseProgramTable(IOS_PASTE));
  for (const w of r.weeks) {
    assert.equal(w.days.some((d) => /sunday/i.test(d.name)), false, 'Sunday is rest');
    for (const d of w.days) for (const i of d.items) {
      assert.equal(/Foot strain/.test(i.name), false, 'the unheaded notes column is not training');
    }
  }
});

test('the swim, the row and the long ride survive the deformed paste with real targets', () => {
  const r = ok(parseProgramTable(IOS_PASTE));
  const [, , , , friday, saturday] = r.weeks[0].days;

  assert.equal(friday.items[0].activity, 'swim');
  assert.equal(Math.round(friday.items[0].targetMi * 1760), 1200);
  assert.equal(friday.items[1].activity, 'row');
  assert.equal(friday.items[1].targetSec, 20 * 60);

  assert.equal(saturday.items[0].activity, 'bike');
  assert.equal(saturday.items[0].targetSec, 150 * 60);
  assert.equal(saturday.items[0].targetMi, 38);
});

test('it becomes a runnable program with cardio blocks and the coach’s own words', () => {
  const r = ok(parseProgramTable(IOS_PASTE));
  const s = toProgramStructure(r.weeks, 'Brineman 70.3', () => undefined);
  const ride = s.weekPlans[0].days[0].main[0];
  assert.equal(ride.catalogKey, 'cardio:bike');
  assert.equal(ride.targetSec, 75 * 60);
  assert.equal(ride.coachNote, '75min bike Z2 w/ 3x8min Z3');
});
