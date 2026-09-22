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
  // ── the second batch (PO, 2026-09-22) ──
  ['photo-12.tsv', '4x/week Upper/Lower — Upper, Lower, Upper, Lower is FOUR days in one week, not two weeks', 4, 28],
  ['photo-13.tsv', 'Strength & Power / Hypertrophy / Conditioning — "4 sets of 5 reps", tips ignored', 3, 18],
  ['photo-14.tsv', 'Beginners — paired days (Monday & Thursday) with arms and abs in their own boxes', 6, 25],
  ['photo-15.tsv', '5 Day to build muscle — ramping "4 sets of 12, 10, 8, 6 reps" and "3 sets till failure"', 5, 31],
  ['photo-16.tsv', 'a bodyweight challenge — counts with no sets ("20 SQUATS"), and the weekend is rest', 5, 43],
  ['photo-17.tsv', 'Blaster — days 1, 2, 3, 5, 6, with a cool-down and a stretch as entries', 5, 30],
  ['photo-18.tsv', '5-Day Dumbbell — emoji bullets, "3×AMRAP", a combined core line', 5, 28],
  ['photo-19.tsv', 'Dumbbell-Only Full Week — two columns per day', 5, 30],
  ['photo-20.tsv', "Women's Elite 6 days — \"Day 7 - Rest\" is not a training day", 6, 37],
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

test('photo-12: the second "Upper" is a different session, not week 2', () => {
  // Upper / Lower / Upper / Lower, 4×/week. The two Uppers share a NAME and nothing else, so they are
  // two days of one week — where the PO's three-week photo repeats the same lifts and IS three weeks.
  const r = ok(parseProgramTable(fixture('photo-12.tsv')));
  assert.equal(r.weeks.length, 1);
  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['Upper', 'Lower', 'Upper', 'Lower']);
  assert.deepEqual(r.weeks[0].days.map((d) => d.letter), ['A', 'B', 'C', 'D']);
  assert.notDeepEqual(
    r.weeks[0].days[0].items.map((i) => i.name),
    r.weeks[0].days[2].items.map((i) => i.name),
  );
});

test('photo-20 and photo-16: a day whose name says REST is not a training day', () => {
  const women = ok(parseProgramTable(fixture('photo-20.tsv')));
  assert.equal(women.weeks[0].days.length, 6, '"Day 7 - Rest" is dropped');
  assert.ok(!women.weeks[0].days.some((d) => /rest/i.test(d.name)));

  const challenge = ok(parseProgramTable(fixture('photo-16.tsv')));
  assert.deepEqual(challenge.weeks[0].days.map((d) => d.name), ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
});
