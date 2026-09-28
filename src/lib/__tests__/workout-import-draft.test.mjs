import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProgramTable } from '../../domain/program/import-parse.ts';
import { workoutDraftFromImport } from '../workout-import-draft.ts';

/* PO 2026-09-27: a template takes a paste or a picture "just like for a program". */

const weeksOf = (text) => {
  const r = parseProgramTable(text);
  assert.equal(r.ok, true, r.ok ? '' : r.error);
  return r.weeks;
};

test('a pasted day becomes a whole template draft: name, main rows, clamped', () => {
  const r = workoutDraftFromImport(weeksOf('Push A\nBench Press 4x8\nOverhead Press 3x10\nDips 60x999'), () => undefined);
  assert.ok(r);
  assert.equal(r.draft.name, 'Push A');
  assert.deepEqual(r.draft.main.map((x) => x.name), ['Bench Press', 'Overhead Press', 'Dips']);
  assert.equal(r.draft.editId, null);
  const dips = r.draft.main[2];
  assert.deepEqual([dips.sets, dips.reps], [50, 500], 'sets and reps obey the builder clamps');
  assert.ok(r.draft.main.every((x) => typeof x.id === 'string' && x.id.length > 0), 'every row has an id');
  assert.equal(new Set(r.draft.main.map((x) => x.id)).size, 3);
});

test('an unheaded day is not named "Day 1" — that is the parser’s, not the athlete’s', () => {
  const r = workoutDraftFromImport(weeksOf('Squat 5x5\nRDL 3x8'), () => undefined);
  assert.ok(r);
  assert.equal(r.draft.name, '');
});

test('only the first day of a multi-day paste is kept (a workout is one day)', () => {
  const r = workoutDraftFromImport(weeksOf('Day 1 – Upper\nBench Press 4x8\n\nDay 2 – Lower\nBack Squat 4x6'), () => undefined);
  assert.ok(r);
  assert.deepEqual(r.draft.main.map((x) => x.name), ['Bench Press']);
});

test('the toast names library misses, and a matched name gains its catalogue key', () => {
  const resolve = (n) => (n === 'Bench Press' ? 'barbell_bench_press' : undefined);
  const r = workoutDraftFromImport(weeksOf('Bench Press 4x8\nMystery Move 3x10'), resolve);
  assert.ok(r);
  assert.equal(r.draft.main[0].catalogKey, 'barbell_bench_press');
  assert.equal(r.draft.main[1].catalogKey, undefined);
  assert.match(r.toast, /1 name weren’t in the library/);
  const clean = workoutDraftFromImport(weeksOf('Bench Press 4x8'), resolve);
  assert.equal(clean.toast, 'Imported 1 exercise — review and save');
});

test('nothing read → no draft', () => {
  assert.equal(workoutDraftFromImport([], () => undefined), null);
});
