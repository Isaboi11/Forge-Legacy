import test from 'node:test';
import assert from 'node:assert/strict';

import { CSV_HEADERS, NOT_INCLUDED, countSets, csvCell, exportBaseName, toCsv } from '../export-core.ts';

/**
 * Export My Data (P-9 §4).
 *
 * The bug this file mostly exists to prevent is silent: one unescaped comma inside an exercise name
 * shifts every column after it, and a spreadsheet opens the result without complaining. The athlete would
 * have no way to know their export was wrong.
 */

const set = (o = {}) => ({
  setIndex: 0,
  weight: 185,
  weightUnit: 'lb',
  reps: 8,
  durationSec: null,
  distance: null,
  distanceUnit: null,
  notes: null,
  ...o,
});

const workout = (o = {}) => ({
  id: 'w1',
  name: 'Push Day',
  activityType: 'strength',
  startedAt: '2026-09-04T10:00:00.000Z',
  durationSec: 3600,
  distance: null,
  distanceUnit: null,
  notes: null,
  exercises: [{ name: 'Barbell Bench Press', position: 0, sets: [set(), set({ setIndex: 1, reps: 6 })] }],
  ...o,
});

/* ── escaping: the silent corruption ───────────────────────────────────────── */

test('⛔ a comma in a name is quoted — unescaped it shifts every column after it', () => {
  assert.equal(csvCell('Farmer’s Walk, heavy'), '"Farmer’s Walk, heavy"');
});

test('⛔ a double quote is doubled, per RFC 4180', () => {
  assert.equal(csvCell('He said "go"'), '"He said ""go"""');
});

test('⛔ a newline inside a note is quoted, not left to break the row', () => {
  assert.equal(csvCell('felt strong\nback tight'), '"felt strong\nback tight"');
  assert.equal(csvCell('a\rb'), '"a\rb"');
});

test('an ordinary value is left alone — no quotes where none are needed', () => {
  assert.equal(csvCell('Bench Press'), 'Bench Press');
  assert.equal(csvCell(185), '185');
});

test('null and undefined are empty cells, never the string "null"', () => {
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  // A zero is a real value and must survive.
  assert.equal(csvCell(0), '0');
});

/* ── the CSV ───────────────────────────────────────────────────────────────── */

test('one row per set, under a header', () => {
  const rows = toCsv([workout()]).trim().split('\r\n');
  assert.equal(rows[0], CSV_HEADERS.join(','));
  assert.equal(rows.length, 3); // header + 2 sets
  assert.match(rows[1], /Barbell Bench Press,1,185,lb,8/);
  assert.match(rows[2], /Barbell Bench Press,2,185,lb,6/);
});

test('set numbers are 1-based in the file — nobody reads a spreadsheet from zero', () => {
  const rows = toCsv([workout()]).trim().split('\r\n');
  assert.match(rows[1], /,1,/);
});

test('⛔ A RUN STILL EXPORTS — a workout with no exercises is not an empty file', () => {
  // A runner whose export came out blank would reasonably conclude we had lost their training.
  const run = workout({ activityType: 'running', exercises: [], distance: 5.2, distanceUnit: 'mi', durationSec: 2700 });
  const rows = toCsv([run]).trim().split('\r\n');
  assert.equal(rows.length, 2);
  assert.match(rows[1], /running/);
  assert.match(rows[1], /5\.2/);
});

test('an exercise that was added but never worked still leaves a trace', () => {
  const rows = toCsv([workout({ exercises: [{ name: 'Cable Fly', position: 1, sets: [] }] })]).trim().split('\r\n');
  assert.equal(rows.length, 2);
  assert.match(rows[1], /Cable Fly/);
});

test('a real name with a comma survives a round trip through the columns', () => {
  const rows = toCsv([workout({ exercises: [{ name: 'Deadlift, conventional', position: 0, sets: [set()] }] })])
    .trim()
    .split('\r\n');
  // The quoted field holds its comma, so the row still has the right number of real columns.
  assert.match(rows[1], /"Deadlift, conventional"/);
});

test('an empty export is a header and nothing else, not a crash', () => {
  assert.equal(toCsv([]), `${CSV_HEADERS.join(',')}\r\n`);
});

test('the file ends with a newline', () => {
  assert.ok(toCsv([workout()]).endsWith('\r\n'));
});

/* ── honesty about what is missing ─────────────────────────────────────────── */

test('the app can state what the export leaves out', () => {
  // An export that quietly omits things is worse than one that admits it.
  assert.ok(NOT_INCLUDED.length > 0);
  assert.ok(NOT_INCLUDED.some((s) => /photo/i.test(s)));
});

/* ── naming and counting ───────────────────────────────────────────────────── */

test('the filename is dated, and zero-padded so it sorts', () => {
  assert.equal(exportBaseName(new Date(2026, 8, 4)), 'forge-legacy-2026-09-04');
  assert.equal(exportBaseName(new Date(2026, 11, 25)), 'forge-legacy-2026-12-25');
});

test('the set count is what the toast promises', () => {
  assert.equal(countSets([workout(), workout()]), 4);
  assert.equal(countSets([]), 0);
});
