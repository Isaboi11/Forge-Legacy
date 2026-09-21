import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProgramTable } from '../../domain/program/import-parse.ts';
import { draftFromImport, importLimitNotes } from '../program-import-draft.ts';
import { newDraft } from '../program-draft-model.ts';

/*
 * A confirmed import → the builder's draft. The draft has hard limits (52 weeks, 6 days, 8 sets, 60
 * reps). The stress test (2026-09-21) found two of them cut SILENTLY: a seventh day in week 2 or later,
 * and any set or rep count over the cap. Nothing may be cut without being named, in the preview and in
 * the toast alike.
 */

const weeksOf = (text) => {
  const r = parseProgramTable(text);
  assert.equal(r.ok, true, r.ok ? '' : r.error);
  return r.weeks;
};
const resolveKey = () => undefined;
const tsv = (rows) => rows.map((r) => r.join('\t')).join('\n');

test('a seventh day in WEEK 2 is named — it was dropped without a word', () => {
  const rows = [['Week', 'Day', 'Exercise', 'Sets', 'Reps']];
  for (const d of 'ABC') rows.push(['1', d, 'Squat', '5', '5']);
  for (const d of 'ABCDEFG') rows.push(['2', d, 'Squat', '5', '5']);
  const weeks = weeksOf(tsv(rows));

  const notes = importLimitNotes(weeks);
  assert.match(notes.join(' '), /week 2 G/);

  const r = draftFromImport(newDraft(), weeks, { isWeek: false, resolveKey });
  assert.match(r.toast, /1 day over the 6-day limit is dropped \(week 2 G\)/);
  assert.equal(r.draft.daysPerWeek, 6, 'the widest week sets the day count, not week 1');
  assert.equal(r.draft.weekPlans[1].days.length, 6);
});

test('100 push-ups and 12 sets import as written — the old 8 × 60 cap is gone (PO: "don\'t limit amount")', () => {
  const weeks = weeksOf('Day 1\nPush-ups 5x100\nBench 12x3\nSquat 5x5');
  assert.deepEqual(importLimitNotes(weeks), []);
  const r = draftFromImport(newDraft(), weeks, { isWeek: false, resolveKey });
  assert.deepEqual(r.draft.days[0].main.map((x) => [x.sets, x.reps]), [[5, 100], [12, 3], [5, 5]]);
});

test('only a number past the logger\'s own ceiling is still named', () => {
  assert.match(importLimitNotes(weeksOf('Day 1\nAir squats 1x600')).join(' '), /capped at 50 × 500 \(Air squats 1×600\)/);
});

test('60 weeks is named in the preview and the plans stop at 52', () => {
  const rows = [['Week', 'Day', 'Exercise', 'Sets', 'Reps']];
  for (let w = 1; w <= 60; w++) rows.push([String(w), 'A', 'Squat', '5', String(1 + (w % 5))]);
  const weeks = weeksOf(tsv(rows));
  assert.match(importLimitNotes(weeks).join(' '), /60 weeks read — a program holds 52/);
  const r = draftFromImport(newDraft(), weeks, { isWeek: false, resolveKey });
  assert.equal(r.draft.weeks, 52);
  assert.equal(r.draft.weekPlans.length, 52);
});

test('a run is not "not in the library", and its 1 × 0 is not clamped into a rep', () => {
  const weeks = weeksOf('Mon: 3 mi easy\nWed: Squat 5x5');
  const r = draftFromImport(newDraft(), weeks, { isWeek: false, resolveKey: (n) => (n === 'Squat' ? 'squat' : undefined) });
  assert.equal(r.toast, 'Imported — review and save');
  const run = r.draft.days[0].main[0];
  assert.equal(run.kind, 'cardio');
  assert.equal(run.reps, 0);
});

test('one unmatched name is "wasn\'t", not "weren\'t"', () => {
  const r = draftFromImport(newDraft(), weeksOf('Day 1\nZercher Thing 3x5'), { isWeek: false, resolveKey });
  assert.match(r.toast, /1 name wasn’t in the library/);
});

test('nothing over any limit says nothing', () => {
  assert.deepEqual(importLimitNotes(weeksOf('Day 1\nSquat 5x5\nDay 2\nBench 3x8')), []);
});
