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
    [tsv([['Week', 'Sets', 'Reps'], ['1', '3', '8']]), /Exercise column/i],
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
