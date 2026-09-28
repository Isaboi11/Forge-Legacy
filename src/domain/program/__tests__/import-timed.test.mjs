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
  assert.equal(summarize(r.weeks), '1 week · 1 day each · 2 exercises', 'a program still reads as one');
});
