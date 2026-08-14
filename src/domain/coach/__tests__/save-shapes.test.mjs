/**
 * save-shapes.test.mjs — what "Save for later" actually saves.
 *
 * ══ THE TWO WAYS THIS BUTTON COULD LIE ══
 *
 * `Save for later` is the first button on this surface that WRITES something the athlete keeps, so it
 * is the first one that can quietly disagree with what Holt showed them.
 *
 *   1. **A warm-up that does not exist.** `buildDayWorkout` fills `main` and returns `warmup` and
 *      `cooldown` EMPTY, every time. A mapping that padded them would produce a template promising a
 *      warm-up nobody wrote — on a surface whose whole claim is that every figure came out of the engine.
 *   2. **A rep target that was never prescribed.** A prescription can be `'F'` — to failure — and
 *      `targetReps` is a number. Writing a plausible eight turns "go until you can't" into a specific
 *      target the athlete never chose.
 *
 * Neither shows up as an error. Both show up as a workout.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/save-shapes.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { buildDayWorkout } from '../day.ts';
import { launchRowsFor, templateRowsFor } from '../save-shapes.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

const aDay = (over = {}) =>
  buildDayWorkout(
    {
      focus: { kind: 'body_parts', parts: ['back', 'biceps'] },
      goal: 'muscle',
      sessionMinutes: 60,
      experience: 'intermediate',
      environment: 'full_gym',
      ownedEquipment: [],
      limitations: [],
      ...over,
    },
    POOL,
    canDoExercise,
  ).day;

// ─────────────────────────────────────────────────────────────────────────────
// THE PRECONDITION THE WHOLE MAPPING RESTS ON
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a day Holt builds has NO warm-up and NO cool-down', () => {
  /*
   * Asserted rather than assumed. If `buildDayWorkout` ever starts filling these, `templateRowsFor` is
   * silently dropping them — this test fails and says which end changed, instead of the athlete finding
   * out that their saved template is missing two blocks.
   */
  const day = aDay();
  assert.deepEqual(day.warmup, [], 'buildDayWorkout now fills warmup — templateRowsFor must carry it');
  assert.deepEqual(day.cooldown, [], 'buildDayWorkout now fills cooldown — templateRowsFor must carry it');
  assert.ok(day.main.length > 0, 'and there must be something to save in the first place');
});

test('every main row survives the trip into a template, in order', () => {
  const day = aDay();
  const rows = templateRowsFor(day);
  assert.equal(rows.length, day.main.length, 'a movement was dropped between the card and the template');
  assert.deepEqual(rows.map((r) => r.name), day.main.map((e) => e.name));
  for (const r of rows) {
    assert.equal(r.section, 'main', 'a Holt day is all main work — nothing may claim another section');
    assert.ok(r.sets > 0, `${r.name} saved with no sets`);
    assert.ok(typeof r.targetReps === 'number', `${r.name} saved a rep target that is not a number`);
  }
});

test("the coach's cue travels with the template", () => {
  // A single day got no cue at all until `day.ts` was fixed to attach one. Losing it again at the save
  // would undo that quietly — the template would be the right movements with none of the coaching.
  const rows = templateRowsFor(aDay());
  assert.ok(rows.some((r) => r.coachNote), 'not one row carried a cue');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE PRESCRIPTION IS NOT REWRITTEN TO FIT THE COLUMN
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ "to failure" is not turned into a number somebody made up', () => {
  const day = { name: 'Test', main: [{ catalogKey: 'push-up', name: 'Push-Up', sets: 3, reps: 'F' }] };
  assert.equal(templateRowsFor(day)[0].targetReps, 0, "'F' must not become a target the athlete never chose");
  assert.equal(launchRowsFor(day)[0].targetReps, 0);
});

test('a missing rep count is 0, not undefined — a template row must be drawable', () => {
  const day = { name: 'Test', main: [{ name: 'Plank', sets: 3, reps: null }, { name: 'Carry' }] };
  const rows = templateRowsFor(day);
  assert.equal(rows[0].targetReps, 0);
  assert.equal(rows[1].targetReps, 0);
  assert.ok(rows[1].sets > 0, 'a row with no sets must still be drawable');
  assert.equal(rows[1].catalogKey, null, 'and an unmatched movement saves as a name with no key, not undefined');
});

test('the launch shape is exactly four fields — nothing extra reaches the workout screen', () => {
  /*
   * `WorkoutLaunch.exercises` is written by three other callers (an invite, a shared session, Home).
   * Growing a fifth field here to carry the cue would put it into a payload none of them writes and all
   * of them read. The cue is lost on Start and kept on Save; that is the honest trade, stated.
   */
  const rows = launchRowsFor(aDay());
  for (const r of rows) {
    assert.deepEqual(Object.keys(r).sort(), ['catalogKey', 'name', 'sets', 'targetReps']);
  }
});
