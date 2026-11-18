// node --experimental-strip-types --test src/domain/coach/__tests__/validate-program-weekly.test.mjs
//
// PB-4, the validator bullet (AI Road to 10 Plan §4 · Sprint 3b lane A): "The validator checks typed builds against the
// same volume bands." validateProgram's weekly gate counts every working week's sets per muscle (PAS-A4-D1) against
// WEEKLY_SET_BANDS — the table the builder balances to. A program typed to Holt gets it as DEVIATIONS (not
// rebalanced: Amendment 003), the rulebook's own builds as FAILURES (matrix.test.mjs holds all of them).
import test from 'node:test';
import assert from 'node:assert/strict';

import { validateProgram } from '../validate-program.ts';
import { typedBlock, typedOverCeiling } from '../typed-block.ts';
import { DELOAD_MARKER, deloadWeeks } from '../rulebook/volume.ts';

const MUSCLES = {
  curl: { primaryMuscleIds: ['biceps'], muscleIds: ['forearms'] },
  hammer: { primaryMuscleIds: ['biceps'], muscleIds: ['forearms'] },
  row: { primaryMuscleIds: ['upper_back', 'lats'], muscleIds: ['biceps', 'rear_deltoids'] },
  bench: { primaryMuscleIds: ['chest'], muscleIds: ['triceps', 'front_deltoids'] },
  squat: { primaryMuscleIds: ['quadriceps', 'glutes'], muscleIds: ['hamstrings'] },
};
const PATTERN = { curl: 'elbow_flexion', hammer: 'elbow_flexion', row: 'horizontal_pull', bench: 'horizontal_push', squat: 'squat' };
const ex = (key, sets) => ({ catalogKey: key, name: key, sets, reps: 10, repsMax: null });
const day = (letter, main) => ({ letter, name: `Day ${letter}`, warmup: [], main, cooldown: [] });

const opts = (weekly) => ({
  knownKeys: new Set(Object.keys(MUSCLES)),
  patternOf: (k) => PATTERN[k],
  category: 'HYPERTROPHY',
  ...(weekly ? { weekly } : {}),
});
const lookup = (k) => MUSCLES[k];

// An arms week the athlete asked for: 4 days, 3 × (curl 4 + hammer 4 + row 3) = biceps 24 + 4.5 = 28.5 a week.
const armsWeek = [day('A', [ex('curl', 4), ex('hammer', 4), ex('row', 3)]), day('B', [ex('curl', 4), ex('hammer', 4), ex('row', 3)]), day('C', [ex('curl', 4), ex('hammer', 4), ex('row', 3)]), day('D', [ex('bench', 4), ex('squat', 4)])];

test('a typed week past a ceiling is a DEVIATION in every working week — the same groups typedOverCeiling names', () => {
  const { structure } = typedBlock('Arms', armsWeek, 8);
  const v = validateProgram(structure, opts({ experience: 'intermediate', muscles: lookup, enforce: false }));
  const weekly = v.deviations.filter((d) => d.code === 'weekly_volume_ceiling');
  const groups = [...new Set(weekly.map((d) => d.group))];
  assert.deepEqual(groups, typedOverCeiling(armsWeek, 'muscle', 'intermediate', lookup).map((o) => o.group));
  assert.deepEqual(groups, ['biceps']);
  // Week 7 (the PAS-D7 deload of an 8-week block) cuts the sets: 3 × (2 + 2) + 1.5 = 13.5, inside 20.
  assert.deepEqual(deloadWeeks(8), [6]);
  assert.deepEqual(weekly.map((d) => d.weekIndex), [0, 1, 2, 3, 4, 5, 7]);
  assert.ok(weekly.every((d) => d.dayIndex === undefined), 'a weekly note is about the week, not a day');
  assert.equal(v.failures.filter((f) => f.code.startsWith('weekly_')).length, 0, 'typed: never a failure');
});

test('no trainable set → no floor is checked (a typed arms block owes no legs); with one, a working week owes it', () => {
  const { structure } = typedBlock('Arms', armsWeek, 8);
  const none = validateProgram(structure, opts({ experience: 'intermediate', muscles: lookup, enforce: false }));
  assert.equal(none.deviations.filter((d) => d.code === 'weekly_volume_floor').length, 0);

  const owed = validateProgram(structure, opts({ experience: 'intermediate', muscles: lookup, enforce: false, trainable: new Set(['hamstrings']) }));
  const floors = owed.deviations.filter((d) => d.code === 'weekly_volume_floor');
  assert.ok(floors.length > 0 && floors.every((d) => d.group === 'hamstrings'));
  // ⛔ PAS-A4-D3: the deload week owes no floor.
  assert.ok(!floors.some((d) => d.weekIndex === 6));
  assert.ok(structure.weekPlans[6].days.every((d) => d.name.includes(DELOAD_MARKER)));
});

test('the rulebook build (enforce) gets the same findings as FAILURES — a drifted table never ships', () => {
  const { structure } = typedBlock('Arms', armsWeek, 8);
  const v = validateProgram(structure, opts({ experience: 'intermediate', muscles: lookup, enforce: true }));
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f) => f.code === 'weekly_volume_ceiling' && f.weekIndex === 0));
  assert.equal(v.deviations.filter((d) => d.code.startsWith('weekly_')).length, 0);
});

test('a week inside the bands, and a call without `weekly`, add nothing (the old behaviour)', () => {
  const easy = [day('A', [ex('bench', 3), ex('row', 3)]), day('B', [ex('squat', 3), ex('curl', 3)])];
  const { structure } = typedBlock('Easy', easy, 4);
  const v = validateProgram(structure, opts({ experience: 'intermediate', muscles: lookup, enforce: true }));
  assert.equal(v.failures.filter((f) => f.code.startsWith('weekly_')).length, 0);
  const old = validateProgram(typedBlock('Arms', armsWeek, 8).structure, opts(null));
  assert.equal([...old.failures, ...old.deviations].filter((x) => x.code.startsWith('weekly_')).length, 0);
});

test('a category with no weekly row (mobility, running) is not counted', () => {
  const { structure } = typedBlock('Arms', armsWeek, 8);
  const v = validateProgram(structure, { ...opts({ experience: 'intermediate', muscles: lookup, enforce: true }), category: 'MOBILITY' });
  assert.equal(v.failures.filter((f) => f.code.startsWith('weekly_')).length, 0);
});
