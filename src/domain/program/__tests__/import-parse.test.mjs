import test from 'node:test';
import assert from 'node:assert/strict';

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
