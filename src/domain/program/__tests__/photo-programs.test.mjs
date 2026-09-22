import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseProgramTable, summarize } from '../import-parse.ts';

/*
 * ══ NINE REAL PROGRAM PHOTOS, AS THE READER ACTUALLY TRANSCRIBED THEM (PO, 2026-09-22) ══
 *
 * The PO sent ten pictures — Instagram programs, a printed six-day plan, a handwritten notebook page, a
 * gym whiteboard — and asked for each to be read correctly. These are the model's own transcripts, byte
 * for byte, with the shape a person reading the PICTURE would say it has. The tenth (the whiteboard) is
 * not a program at all and is refused upstream, before this parser ever sees it.
 *
 * ⚠ THE EXPECTATIONS ARE FROM THE PICTURES, NOT FROM WHAT THE PARSER HAPPENED TO DO. Two of them failed
 * when they were first run, and both fixes are in `import-parse.ts`:
 *   · `photo-7` — the whole scheme sat in the REPS cell ("3x10", Sets empty) and read as 3 reps.
 *   · `photo-6` — a handwritten push day written out muscle by muscle became three days.
 */

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const ok = (r) => {
  assert.equal(r.ok, true, r.ok ? '' : `parse failed: ${r.error}`);
  return r;
};

/** file · what the picture says · days · exercises in total. */
const PHOTOS = [
  ['photo-2.tsv', '3 Day Full Body — scheme written before the name ("3x 6–8 Incline Bench Press")', 3, 30],
  ['photo-3.tsv', '3x5 Strength & Size — days numbered 1, 3, 5', 3, 20],
  ['photo-4.tsv', '5 Days for Advanced — days 1, 2, 3, 5, 6, reps as "4× 6-08"', 5, 32],
  ['photo-5.tsv', '6-Day for Men — numbered lists, "4×6-8", a 60-second plank', 6, 42],
  ['photo-6.tsv', 'a handwritten PUSH DAY — chest, shoulders and triceps are sections of ONE day', 1, 10],
  ['photo-7.tsv', '5 Day Split for Girls — the scheme sits in the Reps column', 5, 33],
  ['photo-8.tsv', '3 Day Beginner table — a Body Part column, ranges, "10–12 each leg"', 3, 24],
  ['photo-9.tsv', 'Arnold Split — six days, "4 x 8-12"', 6, 36],
  ['photo-10.tsv', '40 Minutes Full Body — four days, one entry with no numbers at all', 4, 28],
];

for (const [file, what, days, exercises] of PHOTOS) {
  test(`${file} — ${what}`, () => {
    const r = ok(parseProgramTable(fixture(file)));
    assert.equal(r.weeks.length, 1, 'one week');
    assert.equal(r.weeks[0].days.length, days, summarize(r.weeks));
    const items = r.weeks[0].days.flatMap((d) => d.items);
    assert.equal(items.length, exercises, summarize(r.weeks));
    assert.ok(items.every((i) => i.name.trim().length > 1), 'every exercise has a name');
    assert.ok(items.every((i) => i.sets >= 1 && i.reps >= 1), 'every exercise has usable numbers');
  });
}

test('photo-7: "3x10" in the Reps column is 3 sets of 10 — it read as 3 REPS', () => {
  const r = ok(parseProgramTable(fixture('photo-7.tsv')));
  const mon = r.weeks[0].days[0];
  assert.equal(mon.name, 'Mon');
  assert.deepEqual(
    mon.items.map((i) => [i.name, i.sets, i.reps, i.setsAssumed]),
    [
      ['Hip Thrusts', 3, 10, false],
      ['Romanian Deadlifts', 3, 10, false],
      ['Step-ups', 3, 12, false],
      ['Hamstring Curls', 3, 15, false],
      ['Glute Hyper Extensions', 3, 10, false],
    ],
  );
  // "3x failure" states the sets and leaves the reps open — not 3 reps.
  const curl = r.weeks[0].days[2].items.find((i) => i.name === 'Bicep Curl');
  assert.deepEqual([curl.sets, curl.setsAssumed, curl.repsAssumed], [3, false, true]);
});

test('photo-6: a day written out muscle by muscle is ONE day', () => {
  const r = ok(parseProgramTable(fixture('photo-6.tsv')));
  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['Push Day']);
  assert.equal(r.weeks[0].days[0].items[0].name, 'Incline Dumbbell Press');
  assert.equal(r.weeks[0].days[0].items[0].reps, 6, '"6-10 reps" is read as its floor');
});

test('…but days that only SHARE a shape stay separate days', () => {
  // "Day 1 - Chest + Back" / "Day 2 - Shoulders + Arms" — different prefixes, six real days.
  const r = ok(parseProgramTable(fixture('photo-9.tsv')));
  assert.equal(r.weeks[0].days.length, 6);
  assert.deepEqual(r.weeks[0].days[0].name, 'Day 1 - Chest + Back');
});
