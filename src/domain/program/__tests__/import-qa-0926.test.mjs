import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { parseProgramTable, toProgramStructure, unmatchedNames } from '../import-parse.ts';
import { noteLine, saysFailure } from '../import-scheme.ts';
import { resolveAgainstCatalog, resolveWrittenName, writtenVocabulary } from '../../exercise-picker/aliases.ts';
import { HIDDEN_EXERCISE_IDS } from '../../exercise-picker/catalog-core.ts';

/*
 * QA 2026-09-26: programs-07 (the title became a Day 1 exercise), programs-08 (a messy phone note), library-17
 * (matched rows kept the pasted name; "RDLs" and a typo went unmatched).
 */

const raw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/domain/exercise-relationships/source/exercises.json'), 'utf8'),
);
const ROWS = Array.isArray(raw) ? raw : (raw.exercises ?? []);
/** The VISIBLE catalogue — what `resolveImportedName` matches against. */
const CATALOG = ROWS.filter((r) => !HIDDEN_EXERCISE_IDS.has(r.id)).map((r) => ({
  key: r.id,
  name: r.name,
  aliases: r.aliases ?? [],
}));
const VOCAB = writtenVocabulary(CATALOG);
const resolve = (n) => resolveWrittenName(n, CATALOG, VOCAB);

const parsed = (text) => {
  const r = parseProgramTable(text);
  assert.equal(r.ok, true, r.ok ? '' : r.error);
  return r;
};
const names = (r) => r.weeks.flatMap((w) => w.days.map((d) => [d.name, d.items.map((i) => i.name)]));

// ── programs-07: the program's title ─────────────────────────────────────────

test('programs-07: a title line above "Day 1" names the program and is not an exercise', () => {
  const r = parsed(
    ['My 4 Day Upper Lower', 'Day 1', 'Bench Press 4x8', 'Day 2', 'Back Squat 4x6', 'Day 3', 'Overhead Press 4x8', 'Day 4', 'Deadlift 3x5'].join('\n'),
  );
  assert.equal(r.title, 'My 4 Day Upper Lower');
  assert.equal(r.weeks[0].days.length, 4, 'four days, not a made-up fifth');
  assert.ok(!names(r).some(([, items]) => items.includes('My 4 Day Upper Lower')));
  const s = toProgramStructure(r.weeks, r.title, () => undefined);
  assert.equal(s.name, 'My 4 Day Upper Lower');
  assert.equal(s.daysPerWeek, 4);
});

test('programs-07: a shouted title above a week heading is the title too', () => {
  const r = parsed(['Summer Shred', 'Week 1', 'Day 1 - Push', 'Bench Press 4x8', 'Day 2 - Pull', 'Pull ups 3x8'].join('\n'));
  assert.equal(r.title, 'Summer Shred');
  assert.equal(r.weeks[0].days.length, 2);
});

test('programs-07: a first day written without numbers stays exercises — no title is invented', () => {
  const r = parsed(['Squat', 'Bench', 'Day 2', 'Deadlift 3x5'].join('\n'));
  assert.equal(r.title, undefined);
  assert.deepEqual(r.weeks[0].days[0].items.map((i) => i.name), ['Squat', 'Bench']);
});

test('programs-07: a table with a title line above its header carries it', () => {
  const r = parsed(['Hypertrophy Block', 'Day\tExercise\tSets\tReps', 'Day 1\tBench Press\t3\t8', 'Day 2\tSquat\t3\t5'].join('\n'));
  assert.equal(r.title, 'Hypertrophy Block');
});

// ── programs-08: the messy phone note ────────────────────────────────────────

const PHONE = [
  'monday',
  'bench 3x8',
  'lat pull downs 3x10',
  'pushups to failure',
  'plank 3x30 sec',
  'notes: add 5lbs each week',
  'wednesday',
  'squat 5x5',
  'Pull ups 3 sets to failure',
  'wall sit 45s',
].join('\n');

test('programs-08: "notes: add 5lbs each week" is the note of the lift above it, with its 5lbs', () => {
  const r = parsed(PHONE);
  const all = r.weeks[0].days.flatMap((d) => d.items);
  assert.ok(!all.some((i) => /note/i.test(i.name)), 'no exercise called notes');
  const plank = all.find((i) => i.name === 'plank');
  assert.match(plank.note ?? '', /add 5lbs each week/);
});

test('programs-08: timed work keeps its clock and to-failure work is not 3 × 10', () => {
  const r = parsed(PHONE);
  const all = r.weeks[0].days.flatMap((d) => d.items);
  assert.equal(all.find((i) => i.name === 'plank').durationSec, 30);
  assert.equal(all.find((i) => i.name === 'wall sit').durationSec, 45);
  const pushups = all.find((i) => i.name === 'pushups');
  assert.equal(pushups.toFailure, true);
  const pull = all.find((i) => i.name === 'Pull ups');
  assert.equal(pull.toFailure, true);
  assert.equal(pull.sets, 3);
  const s = toProgramStructure(r.weeks, '', () => undefined);
  const pullRow = s.days[1].main.find((e) => e.name === 'Pull ups');
  assert.deepEqual(pullRow.repScheme, ['F', 'F', 'F']);
});

test('programs-08: "lat pull downs" matches the library', () => {
  assert.equal(resolve('lat pull downs')?.key, resolve('Lat Pulldown')?.key);
  assert.ok(resolve('lat pull downs'));
});

test('saysFailure / noteLine read only what they say', () => {
  assert.equal(saysFailure('pushups to failure'), true);
  assert.equal(saysFailure('Curl 3 x AMRAP'), true);
  assert.equal(saysFailure('Bench 4x8'), false);
  assert.equal(noteLine('notes: add 5lbs each week'), 'add 5lbs each week');
  assert.equal(noteLine('Notes:'), '');
  assert.equal(noteLine('Nordic curl 3x5'), null);
});

// ── library-17: matched rows take the library's name ─────────────────────────

test('library-17: "RDLs", "Pull ups" and a typo resolve; an unknown lift stays the athlete\'s own', () => {
  assert.ok(resolve('RDLs'), 'RDLs');
  assert.equal(resolve('Pull ups')?.key, 'pull-up');
  const typo = resolve('Tricep Pushdwon');
  assert.ok(typo, 'Tricep Pushdwon');
  assert.equal(typo.repaired, true);
  assert.equal(resolveAgainstCatalog('Tricep Pushdwon', CATALOG), null, 'the strict resolver never guesses');
  assert.equal(resolve('Jefferson Curl'), null);
});

test('library-17: a matched row is stored under the library name; a repaired one keeps what was written', () => {
  const r = parsed(['Day 1', 'Pull ups 3x8', 'Tricep Pushdwon 3x12', 'Jefferson Curl 3x5'].join('\n'));
  const s = toProgramStructure(r.weeks, 'X', resolve);
  const [pull, push, jeff] = s.days[0].main;
  assert.equal(pull.name, 'Pull-Up');
  assert.equal(pull.catalogKey, 'pull-up');
  assert.equal(push.name, resolve('Tricep Pushdown').name);
  assert.equal(push.coachNote, 'Tricep Pushdwon');
  assert.equal(jeff.name, 'Jefferson Curl');
  assert.equal(jeff.catalogKey, undefined);
  assert.deepEqual(unmatchedNames(r.weeks, resolve), ['Jefferson Curl']);
});
