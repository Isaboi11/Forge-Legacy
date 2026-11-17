/**
 * volume-balance.test.mjs — the weekly volume balancer's guards, each proven in both directions (PB-2).
 *
 * `matrix.test.mjs` proves the outcome (every build inside its bands). These prove the limits it must never
 * cross on the way there: the athlete's own exercise, the day's lead, two sets, the session ceiling, and a
 * week that is already inside its bands is left exactly alone.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/volume-balance.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { balanceWeek, ROW_MIN_SETS } from '../volume-balance.ts';
import { VOLUME_GROUPS, weeklyMuscleSets } from '../rulebook/volume.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const EX = new Map(POOL.map((e) => [e.key, e]));
const ex = (k) => {
  const e = EX.get(k);
  assert.ok(e, k);
  return e;
};

const ALL = new Set(VOLUME_GROUPS);
const bandsOf = (over = {}) => new Map(VOLUME_GROUPS.map((g) => [g, { min: 0, max: 20, ...over[g] }]));
const dayOf = (rows, over = {}) => ({ rows, maxExercises: 6, maxSets: 30, minSets: null, ...over });
const row = (k, sets, locked = false) => ({ ex: ex(k), sets, locked });
const opts = (over = {}) => ({
  bands: bandsOf(),
  trainable: ALL,
  daysPerWeek: 4,
  experience: 'intermediate',
  pick: () => null,
  newRowSets: 3,
  ...over,
});

test('a week already inside every band is left exactly as it is', () => {
  const days = [dayOf([row('barbell-bench-press', 4), row('barbell-bent-over-row', 4)])];
  const r = balanceWeek(days, opts());
  assert.equal(r.moves, 0);
  assert.deepEqual(r.days[0], { sets: new Map(), replace: new Map(), add: [], drop: new Set() });
});

test('a group over its ceiling loses sets — never below two, never off the athlete’s own row', () => {
  const days = [
    dayOf([row('barbell-bench-press', 5, true), row('dumbbell-bench-press', 5), row('machine-chest-press', 5)]),
  ];
  const r = balanceWeek(days, opts({ bands: bandsOf({ chest: { min: 0, max: 9 } }) }));
  assert.ok(!r.days[0].sets.has(0), 'the pinned bench press keeps its five sets');
  for (const [, n] of r.days[0].sets) assert.ok(n >= ROW_MIN_SETS);
  // 5 (pinned) + 2 + 2 = 9: inside, and only reachable by cutting the two unpinned presses to the floor.
  assert.equal(r.totals.chest, 9);
  assert.deepEqual(r.unmet, []);
  // And the negative: a ceiling the pinned row alone breaks is reported, not "fixed" by touching it.
  const stuck = balanceWeek([dayOf([row('barbell-bench-press', 8, true), row('dumbbell-chest-fly', 2)])], opts({ bands: bandsOf({ chest: { min: 0, max: 6 } }) }));
  assert.deepEqual(stuck.unmet.map((u) => u.group), ['chest']);
  assert.ok(!stuck.days[0].sets.has(0));
});

test('a group under its floor gains a set on a row that trains it — never past the session ceiling', () => {
  const days = [dayOf([row('barbell-back-squat', 4), row('dumbbell-lateral-raise', 2)], { maxSets: 7 })];
  const r = balanceWeek(days, opts({ bands: bandsOf({ lateral_deltoids: { min: 4, max: 20 } }) }));
  // 4 + 2 = 6 sets, ceiling 7: room for exactly one more set, so the floor of 4 cannot be reached by sets.
  assert.equal(r.days[0].sets.get(1), 3);
  assert.deepEqual(r.unmet.map((u) => u.group), ['lateral_deltoids']);
});

test('the day’s lead is never swapped out, and an untrainable group is owed nothing', () => {
  const days = [dayOf([row('barbell-back-squat', 4), row('barbell-deadlift', 4)], { maxExercises: 2 })];
  const pickRaise = (g) => (g === 'lateral_deltoids' ? ex('dumbbell-lateral-raise') : null);
  const r = balanceWeek(days, opts({ bands: bandsOf({ lateral_deltoids: { min: 3, max: 20 } }), pick: pickRaise }));
  assert.ok(!r.days[0].replace.has(0), 'the squat leads the day and stays');
  // Without the group being trainable the same week is already fine — nothing moves.
  const waived = balanceWeek(days, opts({ bands: bandsOf({ lateral_deltoids: { min: 3, max: 20 } }), pick: pickRaise, trainable: new Set(VOLUME_GROUPS.filter((g) => g !== 'lateral_deltoids')) }));
  assert.equal(waived.moves, 0);
});

test('an athlete’s pinned exercise survives a built block untouched, whatever the bands want', () => {
  const c = {
    goal: 'muscle',
    experience: { lifting: 'intermediate', running: 'intermediate' },
    daysPerWeek: 4,
    sessionMinutes: 60,
    environment: 'full_gym',
    ownedEquipment: [],
    limitations: [],
    excludeExercises: [],
    pinned: [{ name: 'Barbell Biceps Curl', sets: 6, reps: 10 }],
  };
  const res = assemble(c, POOL, canDoExercise);
  assert.ok(res.ok);
  const curls = res.assembly.structure.weekPlans[0].days.flatMap((d) => d.main).filter((e) => e.catalogKey === 'barbell-biceps-curl');
  assert.ok(curls.length >= 1);
  assert.ok(curls.some((e) => e.sets === 6 && e.reps === 10), 'the athlete’s 6 × 10 is verbatim');
  // The rest of the week still lands inside its bands around it.
  const v = weeklyMuscleSets(
    res.assembly.structure.weekPlans[0].days.flatMap((d) => d.main).filter((e) => EX.has(e.catalogKey)).map((e) => ({ sets: e.sets ?? 0, ...EX.get(e.catalogKey) })),
  );
  assert.ok(v.chest >= 10 && v.chest <= 20, `chest ${v.chest}`);
});
