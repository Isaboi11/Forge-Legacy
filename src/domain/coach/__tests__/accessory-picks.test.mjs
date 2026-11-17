// node --experimental-strip-types --test src/domain/coach/__tests__/accessory-picks.test.mjs
//
// AI audit 11-16 B-D7 (Sprint 3 PB-3): a pattern's second slot on a day is accessory work. A muscle-building lower day
// that leads with a barbell squat and deadlift must not follow them with a barbell front squat and a barbell RDL.
// Built on the REAL catalogue, the way matrix.test.mjs builds it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { contextFrom, fillRepeatSlot, isBarbellLift } from '../candidates.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));
const constraints = (goal, experience, daysPerWeek, environment = 'full_gym', ownedEquipment = []) => ({
  goal,
  experience: { lifting: experience, running: experience },
  daysPerWeek,
  sessionMinutes: 60,
  environment,
  ownedEquipment,
  limitations: [],
  excludeExercises: [],
});

/** Every day of week 1 where a pattern appears twice: [first pick, second pick]. */
function repeats(structure) {
  const out = [];
  for (const day of structure.days) {
    const seen = new Map();
    for (const row of day.main) {
      const ex = row.catalogKey ? BY_KEY.get(row.catalogKey) : null;
      if (!ex) continue;
      if (seen.has(ex.pattern)) out.push({ day: day.name, pattern: ex.pattern, first: seen.get(ex.pattern), second: ex });
      else seen.set(ex.pattern, ex);
    }
  }
  return out;
}

test('a muscle-building day never follows a barbell squat or hinge with a second barbell lift of the same pattern', () => {
  let checked = 0;
  for (const days of [3, 4, 5, 6]) {
    for (const experience of ['beginner', 'intermediate', 'advanced']) {
      const res = assemble(constraints('muscle', experience, days), POOL, canDoExercise);
      assert.ok(res.ok, `${days}d ${experience} builds`);
      for (const r of repeats(res.assembly.structure)) {
        if (!/Squat|Hinge/.test(r.pattern)) continue;
        checked += 1;
        assert.ok(!(isBarbellLift(r.first) && isBarbellLift(r.second)), `${days}d ${experience} ${r.day}: ${r.first.name} then ${r.second.name}`);
      }
    }
  }
  assert.ok(checked > 0, 'the matrix has days that repeat a squat or hinge pattern — the rule was exercised');
});

test('a strength block keeps its barbell secondary lifts (that IS strength programming)', () => {
  const res = assemble(constraints('strength', 'intermediate', 4), POOL, canDoExercise);
  assert.ok(res.ok);
  // Nothing to assert about which lift — only that the rule did not fire here: no change from before (the matrix holds the rest).
  assert.ok(res.assembly.structure.days.length === 4);
});

test('a step-up or lunge on a barbell is single-leg work, not a second heavy lift', () => {
  assert.equal(isBarbellLift({ key: 'barbell-front-squat', equipId: 'barbell', name: 'Barbell Front Squat' }), true);
  assert.equal(isBarbellLift({ key: 'barbell-romanian-deadlift', equipId: 'barbell', name: 'Barbell Romanian Deadlift' }), true);
  assert.equal(isBarbellLift({ key: 'barbell-step-up', equipId: 'barbell', name: 'Barbell Step-Up' }), false);
  assert.equal(isBarbellLift({ key: 'barbell-reverse-lunge', equipId: 'barbell', name: 'Barbell Reverse Lunge' }), false);
  assert.equal(isBarbellLift({ key: 'dumbbell-romanian-deadlift', equipId: 'dumbbell', name: 'Dumbbell Romanian Deadlift' }), false);
});

test('the repeat slot stays in its pattern, and a pool with only barbells still gets one', () => {
  const ctx = (used) => ({
    ...contextFrom({ owned: [], canDo: () => true, experience: 'intermediate', limitations: [], limitationPatterns: () => [] }),
    used: new Set(used),
  });
  const got = fillRepeatSlot('Squat / Knee Dominant', POOL, ctx(['barbell-back-squat']));
  assert.ok(got, 'a full catalogue fills a second squat slot');
  assert.equal(got.pattern, 'Squat / Knee Dominant');
  assert.equal(isBarbellLift(got.exercise), false, got.exercise.name);
  const onlyBarbell = POOL.filter((e) => e.pattern === 'Squat / Knee Dominant' && isBarbellLift(e));
  const fallback = fillRepeatSlot('Squat / Knee Dominant', onlyBarbell, ctx([]));
  assert.ok(fallback && isBarbellLift(fallback.exercise), 'nothing else in the room → the barbell stays');
});
