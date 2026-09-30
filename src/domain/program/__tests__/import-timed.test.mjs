import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProgramTable, summarize, toProgramStructure } from '../import-parse.ts';
import { extractScheme, isRestInstruction, timeCell, timeOfCell } from '../import-scheme.ts';

/*
 * PO 2026-09-27, an interval timer's "15 min Chest & Back Strength" (40 s on, 20 s rest): "my picture is in
 * seconds and not reps … that should transfer over." Every row imported as an assumed 3 × 10, and "Plank 3x30s"
 * had always imported as thirty reps.
 */

const itemsOf = (text) => {
  const r = parseProgramTable(text);
  assert.equal(r.ok, true, r.ok ? '' : r.error);
  return r.weeks[0].days[0].items;
};
const shape = (items) => items.map((i) => [i.name, i.durationSec ?? null, i.durationSec != null ? null : i.reps]);

const CIRCUIT = ['Chest Fly', 'Dumbbell Lat Pull Over', 'T Push Up', 'Wide Grip Bent Over Row'];

test('the PO’s circuit, however the reader wrote it: 40 s each, and the rests are not exercises', () => {
  const rows = (fmt) => CIRCUIT.flatMap((n) => [fmt(n, '0:40'), fmt('Rest', '0:20')]);
  const layouts = {
    'a Time column': ['Exercise\tTime', ...rows((n, t) => `${n}\t${t}`)].join('\n'),
    'a Duration column': ['Exercise\tDuration', ...rows((n, t) => `${n}\t${t}`)].join('\n'),
    'the clock in the Reps column': ['Exercise\tReps', ...rows((n, t) => `${n}\t${t}`)].join('\n'),
    'typed out': rows((n, t) => `${n} ${t}`).join('\n'),
  };
  for (const [how, text] of Object.entries(layouts)) {
    const items = itemsOf(text);
    assert.deepEqual(shape(items), CIRCUIT.map((n) => [n, 40, null]), how);
    assert.ok(items.every((i) => !i.repsAssumed), `${how}: a timed set assumes no reps`);
  }
});

test('"3x30s" is three 30-second holds — never thirty reps', () => {
  const items = itemsOf('Plank 3x30s\nWall Sit 3 sets of 45 sec\nSide Plank 2 x 1 min\nHollow Hold 3 sets, 20s each');
  assert.deepEqual(items.map((i) => [i.name, i.sets, i.durationSec]), [
    ['Plank', 3, 30],
    ['Wall Sit', 3, 45],
    ['Side Plank', 2, 60],
    ['Hollow Hold', 3, 20],
  ]);
});

test('reps stay reps, a rest stays a rest, and a bout stays a bout', () => {
  const items = itemsOf('Bench Press 4x8\nSquat 5x5, 90s rest\nRest 0:20\nBike 3 min');
  assert.deepEqual(items.map((i) => [i.name, i.durationSec ?? null, i.kind ?? 'strength']), [
    ['Bench Press', null, 'strength'],
    ['Squat', null, 'strength'],
    ['Outdoor Ride', null, 'cardio'],
  ]);
  assert.equal(isRestInstruction('Rest 0:20'), true);
  assert.equal(isRestInstruction('Rest 90s'), true);
});

test('a long clock is a bout, not a set (over five minutes is left to the cardio reader)', () => {
  assert.equal(extractScheme('Rowing Machine 10 min').scheme.durationSec, undefined);
  assert.equal(extractScheme('Plank 5 min').scheme.durationSec, 300);
  assert.equal(timeCell('10:00'), undefined);
});

test('cell readers: a Time column takes a bare number as seconds; a Reps cell only a real clock', () => {
  assert.equal(timeCell('40'), 40);
  assert.equal(timeCell('0:40'), 40);
  assert.equal(timeCell('45 sec'), 45);
  assert.equal(timeOfCell('0:40'), 40);
  assert.equal(timeOfCell(':30'), 30);
  assert.equal(timeOfCell('10'), undefined, 'a bare number in Reps is ten reps');
  assert.equal(timeOfCell('8-10'), undefined);
});

test('the clock reaches the program as `durationSec`', () => {
  const r = parseProgramTable('Exercise\tSets\tTime\nPlank\t3\t0:45\nBench Press\t4\t');
  assert.equal(r.ok, true);
  const day = toProgramStructure(r.weeks, 'x', () => undefined).days[0];
  assert.equal(day.main[0].durationSec, 45);
  assert.equal(day.main[0].sets, 3);
  assert.equal(day.main[1].durationSec, undefined);
});

test('one workout reads as one workout (PO: "this is just one day, nothing more")', () => {
  const r = parseProgramTable('Chest Fly 0:40\nT Push Up 0:40');
  assert.equal(summarize(r.weeks, 'workout'), '1 workout · 2 exercises');
  assert.equal(summarize(r.weeks), '1 week · 1 day · 2 exercises', 'a program still reads as one');
});

test('a clock is found wherever the photo reader put it (PO’s second try, 2026-09-27)', async () => {
  const layouts = {
    'Time (sec)': 'Exercise\tTime (sec)\nChest Fly\t40\nT Push Up\t40',
    'Work Time': 'Exercise\tWork Time\nChest Fly\t0:40\nT Push Up\t0:40',
    Timer: 'Exercise\tTimer\nChest Fly\t0:40\nT Push Up\t0:40',
    'the Sets column': 'Exercise\tSets\nChest Fly\t0:40\nT Push Up\t0:40',
    'an unnamed column': 'Exercise\t\nChest Fly\t0:40\nT Push Up\t0:40',
    'a unit after the clock': 'Exercise\tReps\nChest Fly\t0:40 min\nT Push Up\t0:40 min',
  };
  for (const [how, text] of Object.entries(layouts)) {
    assert.deepEqual(itemsOf(text).map((i) => [i.name, i.sets, i.durationSec]), [['Chest Fly', 1, 40], ['T Push Up', 1, 40]], how);
  }
  // "1:30" in the Sets cell is ninety seconds, not a set count — and with no count stated, one bout
  const r = itemsOf('Exercise\tSets\tReps\nPlank\t1:30\t');
  assert.deepEqual([r[0].sets, r[0].setsAssumed, r[0].durationSec], [1, true, 90]);
  // a rest column is never the work; a time of day is never a set
  assert.equal(itemsOf('Exercise\tSets\tReps\tRest Time\nChest Fly\t3\t10\t0:20')[0].durationSec, undefined);
  assert.equal(itemsOf('Exercise\tSets\tReps\tTime\nSquat\t5\t5\t7:00 AM')[0].durationSec, undefined);

  const { sanitizeTranscript } = await import('../photo-transcript.ts');
  assert.equal(sanitizeTranscript('Exercise\tTime\nChest Fly\t0:40\nRest\t0:20').ok, true, 'an interval list is a program');
});

test('"Rest 0:20" after a timed move is that move’s rest — kept, not dropped (PO 2026-09-27)', () => {
  const table = itemsOf('Exercise\tTime\nChest Fly\t0:40\nRest\t0:20\nT Push Up\t0:40\nRest\t0:20');
  assert.deepEqual(table.map((i) => [i.name, i.durationSec, i.restSec ?? null]), [['Chest Fly', 40, 20], ['T Push Up', 40, 20]]);
  const typed = itemsOf('Chest Fly 0:40\nRest 0:20\nRow 0:40');
  assert.deepEqual(typed.map((i) => [i.name, i.restSec ?? null]), [['Chest Fly', 20], ['Row', null]]);
  // after a LIFT a rest line is an instruction, as before — not attached
  const r = parseProgramTable('Squat 5x5\nRest 90s\nPlank 30s');
  assert.equal(r.weeks[0].days[0].items[0].restSec, undefined);
  assert.deepEqual(r.skipped, ['Rest 90s']);
  const day = toProgramStructure(parseProgramTable('Chest Fly 0:40\nRest 0:20\nRow 0:40').weeks, 'x', () => undefined).days[0];
  assert.equal(day.main[0].restAfterSec, 20);
});
