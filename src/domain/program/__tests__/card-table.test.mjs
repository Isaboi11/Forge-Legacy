import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
 * A PROGRAM SHEET THE CARD READER COPIED AS TEXT (AI audit 2026-11-16, V-D2).
 *
 * `workout-card-read` copies a photo line by line, so a photographed sheet comes back as lines of text, its cells
 * between tabs, pipes or spaced columns, and no TSV. `isMultiDaySheet` looked for a Day/Week column only in the table
 * reader's TSV, so the PO's own 3-week sheet (12 days) went down the one-workout path. Amendment 002 ("What stays
 * locked") says a sheet with two different Day/Week values in the table is the table reader's.
 *
 * The sheets below are the REAL table-reader answers for the PO's photos (`fixtures/*.tsv`), cell for cell. There is
 * no live card-reader answer for them yet (capturing one costs credits, audit D8), so each is laid out the ways a
 * transcriber writes a table: tabs, a markdown table, bare pipes, and columns lined up with spaces. Every one must
 * reach the table reader and read to EXACTLY the same program the TSV does.
 */

const { isMultiDaySheet, cardTableTsv } = await import('../written-import.ts');
const { parseProgramTable } = await import('../import-parse.ts');
const S12 = await import('../../workout/__tests__/fixtures/squatober-2026-day1.mjs');

const FIXTURES = path.join(process.cwd(), 'src/domain/program/__tests__/fixtures');
const cellsOf = (tsv) => tsv.replace(/\r/g, '').split('\n').filter((l) => l.trim()).map((l) => l.split('\t'));

const AS_CARD_TEXT = {
  tabs: (rows) => rows.map((r) => r.join('\t')).join('\n'),
  markdown: (rows) => [rows[0], rows[0].map(() => '---'), ...rows.slice(1)].map((r) => `| ${r.join(' | ')} |`).join('\n'),
  pipes: (rows) => rows.map((r) => r.join(' | ')).join('\n'),
  'spaced columns': (rows) => {
    const width = rows[0].map((_, i) => Math.max(...rows.map((r) => (r[i] ?? '').length)));
    return rows.map((r) => r.map((c, i) => (c ?? '').padEnd(width[i] + 2)).join('').trimEnd()).join('\n');
  },
};

/** The program a read makes: every week, day, lift, sets and reps. */
const program = (t) => (t.ok ? t.weeks.map((w) => w.days.map((d) => [d.name, d.items.map((i) => [i.name, i.sets, i.reps])])) : t.error);

/* The three sheets the audit named, and the PO's 3-week sheet's own numbers. */
const NAMED = { 'photo-12.tsv': [1, 4], 'photo-14.tsv': [1, 6], 'po-3-week-photo.tsv': [3, 12] };

for (const [file, [weeks, days]] of Object.entries(NAMED)) {
  const tsv = fs.readFileSync(path.join(FIXTURES, file), 'utf8');
  const native = parseProgramTable(tsv);
  test(`${file}: the TSV is ${weeks} week(s), ${days} days, and a sheet (the baseline)`, () => {
    assert.ok(native.ok);
    assert.deepEqual([native.weeks.length, native.weeks.reduce((n, w) => n + w.days.length, 0)], [weeks, days]);
    assert.equal(isMultiDaySheet('', tsv), true);
  });
  for (const [shape, lay] of Object.entries(AS_CARD_TEXT)) {
    test(`${file} copied as ${shape}: a sheet, read to exactly the TSV's program`, () => {
      const text = lay(cellsOf(tsv));
      assert.equal(isMultiDaySheet(text, null), true);
      const sheet = cardTableTsv(text);
      assert.ok(sheet, 'the table is found in the text');
      assert.deepEqual(program(parseProgramTable(sheet)), program(native));
    });
  }
}

test('every one of the 19 real sheets, in every shape, reads to the same program as its TSV', () => {
  const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.tsv'));
  assert.equal(files.length, 19);
  for (const f of files) {
    const tsv = fs.readFileSync(path.join(FIXTURES, f), 'utf8');
    for (const [shape, lay] of Object.entries(AS_CARD_TEXT)) {
      const text = lay(cellsOf(tsv));
      assert.equal(isMultiDaySheet(text, null), true, `${f} as ${shape}`);
      assert.deepEqual(program(parseProgramTable(cardTableTsv(text))), program(parseProgramTable(tsv)), `${f} as ${shape}`);
    }
  }
});

test('a title above the table and bare pipes (no outer pipes) — the shape parseProgramTable cannot read on its own', () => {
  const tsv = fs.readFileSync(path.join(FIXTURES, 'po-3-week-photo.tsv'), 'utf8');
  const text = `3 WEEK FULL BODY PROGRAM\nBy Coach Dana\n\n${AS_CARD_TEXT.pipes(cellsOf(tsv))}`;
  assert.notDeepEqual(program(parseProgramTable(text)), program(parseProgramTable(tsv)), 'read as it stands it is not the program');
  assert.equal(isMultiDaySheet(text, null), true);
  const t = parseProgramTable(cardTableTsv(text));
  assert.ok(t.ok);
  assert.deepEqual([t.weeks.length, t.weeks.reduce((n, w) => n + w.days.length, 0)], [3, 12]);
  assert.deepEqual(program(t), program(parseProgramTable(tsv)));
});

/* ── stays ONE workout ───────────────────────────────────────────────────── */

test('⚠ the Squatober card stays one workout: no table in it, and no Day/Week column', () => {
  /* `parseProgramTable` reads this card as TWO days, which is why that count is not the test. */
  assert.equal(isMultiDaySheet(S12.S12_DAY1_CARD, null), false);
  assert.equal(cardTableTsv(S12.S12_DAY1_CARD), null);
  for (const answer of [S12.S12_DAY1_CARD_TIDY_1, S12.S12_DAY1_CARD_TIDY_2]) assert.equal(isMultiDaySheet(answer, null), false);
});

test('one day in a table is one workout — a Day column with one value, a merged (blank) Day cell, a repeated header', () => {
  const one = 'Day | Exercise | Sets | Reps\nMonday | Back Squat | 5 | 5\nMonday | Bench Press | 5 | 5';
  const merged = '| Day | Exercise | Sets | Reps |\n|---|---|---|---|\n| Monday | Back Squat | 5 | 5 |\n| | Bench Press | 5 | 5 |\n| | Row | 3 | 10 |';
  const repeated = 'Day\tExercise\tSets\tReps\nA\tSquat\t5\t5\nDay\tExercise\tSets\tReps\nA\tBench\t5\t5';
  const noDay = 'Exercise      Sets   Reps\nBack Squat    5      5\nBench Press   5      5';
  for (const text of [one, merged, repeated, noDay]) assert.equal(isMultiDaySheet(text, null), false, text);
});

test('⚠ it never guesses a cell: ragged spaced columns that lost a blank cell are not cut into a table', () => {
  /* photo-12's Sets column is blank on every row. Written with 2 spaces between cells (not lined up), the blank is
     gone, and which column moved is unknowable: cut by count, "3x6-8" would sit under Sets and "90" under Reps. */
  const rows = cellsOf(fs.readFileSync(path.join(FIXTURES, 'photo-12.tsv'), 'utf8'));
  const ragged = rows.map((r) => r.filter((c) => c.trim()).join('  ')).join('\n');
  assert.equal(cardTableTsv(ragged), null);
  assert.equal(isMultiDaySheet(ragged, null), false, 'no table, and no day headings: the one-workout path, as before');
  /* Lined up, the same blank cell keeps its place. */
  const lined = cardTableTsv(AS_CARD_TEXT['spaced columns'](rows));
  assert.equal(lined.split('\n')[1].split('\t')[2], '', 'the blank Sets cell stays blank');
});

test('a short row in ragged text is not lined up under a header column by chance (photo-18)', () => {
  const rows = cellsOf(fs.readFileSync(path.join(FIXTURES, 'photo-18.tsv'), 'utf8'));
  const ragged = rows.map((r) => r.filter((c) => c.trim()).join('  ')).join('\n');
  const sheet = cardTableTsv(ragged);
  assert.ok(sheet === null || !sheet.includes('\t\t\tCore: Plank Hold'), 'an exercise is never put under Reps');
});
