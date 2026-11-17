// node --experimental-strip-types --test src/domain/coach/__tests__/typed-block.test.mjs
//
// PB-4 (AI Road to 10 Sprint 3 · audit B-G4): a program typed to Holt was one week repeated — no rep progression,
// no deload. Now the week he wrote runs through the rulebook's wave (PAS double progression) and deload (PAS-D7/D8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rowForWeek, typedBlock, typedBlockLine } from '../typed-block.ts';
import { DELOAD_MARKER, deloadWeeks } from '../rulebook/volume.ts';

const bench = { catalogKey: 'bench', name: 'Bench Press', sets: 4, reps: 8, repsMax: 12 };
const squat = { catalogKey: 'squat', name: 'Back Squat', sets: 5, reps: 5, repsMax: null };
const plank = { catalogKey: 'plank', name: 'Plank', sets: 3, durationSec: 45 };
const row = { kind: 'cardio', name: 'Row', durationSec: 600 };
const dayA = { letter: 'A', name: 'Upper', warmup: [], main: [bench, plank], cooldown: [] };
const dayB = { letter: 'B', name: 'Lower', warmup: [], main: [squat, row], cooldown: [] };

test('a range Holt wrote climbs a rep a week, then wraps — the rulebook’s double progression', () => {
  const reps = Array.from({ length: 6 }, (_, w) => rowForWeek(bench, w, 8, false)).map((e) => `${e.reps}-${e.repsMax}`);
  assert.deepEqual(reps, ['8-12', '9-12', '10-12', '11-12', '12-null', '8-12']);
});

test('⛔ a fixed number the athlete asked for is held — "5×5" stays 5×5; holds and cardio untouched', () => {
  for (let w = 0; w < 8; w += 1) {
    assert.equal(rowForWeek(squat, w, 8, false), squat);
    assert.equal(rowForWeek(plank, w, 8, false), plank);
    assert.equal(rowForWeek(row, w, 8, false), row);
  }
  const scheme = { ...bench, repScheme: [{ reps: 12 }, { reps: 10 }, { reps: 8 }, { reps: 6 }] };
  assert.equal(rowForWeek(scheme, 2, 8, false), scheme);
});

test('a deload cuts sets (PAS-D8) and takes a range to its bottom; cardio untouched', () => {
  assert.deepEqual(rowForWeek(bench, 6, 8, true), { ...bench, sets: 2, repsMax: null });
  assert.deepEqual(rowForWeek(squat, 6, 8, true), { ...squat, sets: 3 });
  assert.equal(rowForWeek(plank, 6, 8, true).sets, 2);
  assert.equal(rowForWeek(row, 6, 8, true), row);
});

test('a short block (≤ 3 weeks) does not ramp — the week stands as written', () => {
  assert.equal(rowForWeek(bench, 2, 3, false), bench);
});

test('the block: every week materialised, deload weeks from PAS-D7 marked and cut', () => {
  const { structure, deloads } = typedBlock('Upper/Lower', [dayA, dayB], 8);
  assert.equal(structure.vary, true);
  assert.equal(structure.weekPlans.length, 8);
  assert.deepEqual(deloads, deloadWeeks(8));
  assert.deepEqual(deloads, [6]);
  for (const [w, plan] of structure.weekPlans.entries()) {
    for (const d of plan.days) assert.equal(d.name.includes(DELOAD_MARKER), deloads.includes(w), `week ${w + 1} ${d.name}`);
  }
  assert.equal(structure.weekPlans[6].days[0].main[0].sets, 2);
  assert.equal(structure.weekPlans[3].days[0].main[0].reps, 11);
  assert.deepEqual(structure.days, structure.weekPlans[0].days);
  // 6 weeks: no deload (PAS-D7), still a wave.
  assert.deepEqual(typedBlock('x', [dayA], 6).deloads, []);
  // One week, or a broken length: the week as written.
  assert.equal(typedBlock('x', [dayA], 1).structure.vary, false);
  assert.equal(typedBlock('x', [dayA], Number.NaN).structure.weeks, 1);
});

test('Holt says the shape once: the wave where he gave a range, the lighter week', () => {
  const eight = typedBlock('x', [dayA, dayB], 8);
  assert.equal(
    typedBlockLine(eight.structure, eight.deloads),
    'Where I gave you a rep range, add a rep each week until you hit the top, then add weight and start over. Week 7 is a lighter week — fewer sets, so you come back fresh.',
  );
  const fixed = typedBlock('x', [dayB], 6);
  assert.equal(typedBlockLine(fixed.structure, fixed.deloads), null);
  const long = typedBlock('x', [dayB], 12);
  assert.equal(typedBlockLine(long.structure, long.deloads), 'Weeks 4 and 11 are lighter weeks — fewer sets, so you come back fresh.');
});

test('the chat builds a typed program through typedBlock (no more one week repeated)', () => {
  const sheet = readFileSync(new URL('../../../components/forge/CoachChatSheet.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(sheet, /typedBlock\(written\.valid\.title, written\.valid\.days, c\.weeks \?\? defaultWeeksFor\(c\.goal\)\)/);
  assert.match(sheet, /typedBlockLine\(structure, deloads\)/);
});
