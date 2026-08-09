/**
 * edit-ops.test.mjs — changing a plan you are already running, without rewriting what you have done.
 *
 * ══ WHY THESE ARE THE MOST IMPORTANT TESTS IN THE COACH ══
 *
 * Everything else here can be wrong in a way the athlete can see and undo. These can be wrong in a way
 * they cannot: progress is keyed by `(week_index, day_index)`, so an edit that shifts an index re-points a
 * record at a different workout and the app then claims a session nobody did. And a resize moves the
 * graduation threshold under someone already running at it — which is what migration 0123 exists to stop.
 *
 * So every test below is about damage rather than about features: nothing touches a trained session,
 * nothing changes the session count, and a refusal leaves the structure byte-identical.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/edit-ops.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { totalSessions, scheduleSlots } from '../../program/progress-core.ts';
import { assemble } from '../assemble.ts';
import { contextFrom } from '../candidates.ts';
import { canEdit, rebuildDay, setCardioTarget, setPrescription, swapExercise } from '../edit-ops.ts';
import { limitationPatterns } from '../rulebook/limitations.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

const program = (over = {}) => {
  const res = assemble(
    {
      goal: 'strength',
      experience: { lifting: 'intermediate', running: 'intermediate' },
      daysPerWeek: 4,
      sessionMinutes: 60,
      environment: 'full_gym',
      ownedEquipment: [],
      limitations: [],
      excludeExercises: [],
      ...over,
    },
    POOL,
    canDoExercise,
  );
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);
  return res.assembly.structure;
};

const mark = (weekIndex, dayIndex, state = 'completed') => ({ weekIndex, dayIndex, state });
const at = (w, d, i) => ({ weekIndex: w, dayIndex: d, exerciseIndex: i });

const ctx = (over = {}) =>
  contextFrom({
    owned: over.owned ?? [],
    canDo: canDoExercise,
    experience: 'intermediate',
    limitations: over.limitations ?? [],
    limitationPatterns,
    excludeExercises: over.excludeExercises ?? [],
  });

const PRESCRIBE = { category: 'STRENGTH', experience: 'intermediate' };

/** Every (week, day) that carries a row must still name a real session afterwards. */
const slotKeys = (s) => new Set(scheduleSlots(s).map((x) => `${x.weekIndex}:${x.dayIndex}`));

// ─────────────────────────────────────────────────────────────────────────────
// RULE 1 — NEVER TOUCH A SESSION ALREADY DONE
// ─────────────────────────────────────────────────────────────────────────────

test('a trained session cannot be edited, by any operation', () => {
  const s = program();
  const marks = [mark(0, 0), mark(0, 1, 'skipped')];
  const replacement = POOL.find((e) => e.key === 'dumbbell-bench-press');

  for (const [name, run] of [
    ['swapExercise', () => swapExercise(s, marks, at(0, 0, 0), replacement)],
    ['setPrescription', () => setPrescription(s, marks, at(0, 0, 0), { sets: 5 })],
    ['setCardioTarget', () => setCardioTarget(s, marks, at(0, 0, 0), { targetMi: 3 })],
    ['rebuildDay', () => rebuildDay(s, marks, { weekIndex: 0, dayIndex: 0 }, POOL, ctx(), PRESCRIBE)],
  ]) {
    const r = run();
    assert.equal(r.ok, false, `${name} edited a trained session`);
    assert.equal(r.refusal.reason, 'already_trained');
  }

  // ⚠ A SKIP IS TOUCHED TOO. It carries a row exactly like a completion does.
  const skipped = swapExercise(s, marks, at(0, 1, 0), replacement);
  assert.equal(skipped.ok, false);
});

test('a refused edit changes nothing at all', () => {
  const s = program();
  const before = JSON.stringify(s);
  const r = swapExercise(s, [mark(0, 0)], at(0, 0, 0), POOL.find((e) => e.key === 'push-up'));
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(s), before, 'the input structure must not be mutated in place');
});

test('what can be edited is answerable before anything is offered', () => {
  const marks = [mark(1, 2)];
  assert.equal(canEdit(marks, 1, 2), false);
  assert.equal(canEdit(marks, 1, 3), true);
  assert.equal(canEdit(marks, 2, 2), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// RULE 2 — THE SESSION COUNT NEVER MOVES
// ─────────────────────────────────────────────────────────────────────────────

test('every operation leaves the session count identical', () => {
  const s = program();
  const marks = [];
  const before = totalSessions(s);
  const replacement = POOL.find((e) => e.key === 'dumbbell-bench-press');

  const results = [
    swapExercise(s, marks, at(1, 0, 0), replacement, 'rest_of_block'),
    setPrescription(s, marks, at(1, 0, 0), { sets: 5, reps: 6 }, 'rest_of_block'),
    rebuildDay(s, marks, { weekIndex: 1, dayIndex: 0 }, POOL, ctx({ limitations: ['shoulders'] }), PRESCRIBE, 'rest_of_block'),
  ];

  for (const r of results) {
    assert.ok(r.ok, r.ok ? '' : r.refusal.message);
    assert.equal(totalSessions(r.structure), before, 'the graduation threshold must not move');
  }
});

test('every existing session still resolves after an edit', () => {
  const s = program();
  const before = slotKeys(s);
  const r = rebuildDay(s, [], { weekIndex: 2, dayIndex: 1 }, POOL, ctx({ limitations: ['shoulders'] }), PRESCRIBE, 'rest_of_block');
  assert.ok(r.ok);
  const after = slotKeys(r.structure);
  assert.deepEqual([...before].sort(), [...after].sort(), 'a row keyed by (week, day) would now name a different workout');
});

// ─────────────────────────────────────────────────────────────────────────────
// RULE 3 — SCOPE
// ─────────────────────────────────────────────────────────────────────────────

test('this week means this week', () => {
  const s = program();
  const replacement = POOL.find((e) => e.key === 'dumbbell-bench-press');
  const original = s.weekPlans[1].days[0].main[0].catalogKey;

  const r = swapExercise(s, [], at(1, 0, 0), replacement, 'this_week');
  assert.ok(r.ok);
  assert.equal(r.structure.weekPlans[1].days[0].main[0].catalogKey, 'dumbbell-bench-press');
  assert.equal(r.structure.weekPlans[2].days[0].main[0].catalogKey, original, 'week 3 must be untouched');
  assert.equal(r.structure.weekPlans[0].days[0].main[0].catalogKey, original, 'and so must week 1');
});

test('the rest of the block means the rest of the block', () => {
  const s = program();
  const replacement = POOL.find((e) => e.key === 'dumbbell-bench-press');
  const r = swapExercise(s, [], at(1, 0, 0), replacement, 'rest_of_block');
  assert.ok(r.ok);
  for (let w = 1; w < s.weeks; w++) {
    assert.equal(r.structure.weekPlans[w].days[0].main[0].catalogKey, 'dumbbell-bench-press', `week ${w + 1}`);
  }
  assert.notEqual(r.structure.weekPlans[0].days[0].main[0].catalogKey, 'dumbbell-bench-press', 'never backwards');
});

test('a later session already trained is stepped over, not refused', () => {
  // Sessions can be done out of order, so "change the rest of the block" must stay useful for someone who
  // jumped ahead once — without rewriting the session they jumped to.
  const s = program();
  const replacement = POOL.find((e) => e.key === 'dumbbell-bench-press');
  const original = s.weekPlans[3].days[0].main[0].catalogKey;

  const r = swapExercise(s, [mark(3, 0)], at(1, 0, 0), replacement, 'rest_of_block');
  assert.ok(r.ok, 'the edit still happens');
  assert.equal(r.structure.weekPlans[2].days[0].main[0].catalogKey, 'dumbbell-bench-press');
  assert.equal(r.structure.weekPlans[3].days[0].main[0].catalogKey, original, 'the trained week keeps its record');
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT AN EDIT MAY CHANGE
// ─────────────────────────────────────────────────────────────────────────────

test('swapping a movement keeps the prescription', () => {
  // EX-002-D5: "the athlete is replacing the movement, not the training prescription."
  const s = program();
  const row = s.weekPlans[1].days[0].main[0];
  const r = swapExercise(s, [], at(1, 0, 0), POOL.find((e) => e.key === 'push-up'));
  assert.ok(r.ok);
  const after = r.structure.weekPlans[1].days[0].main[0];
  assert.equal(after.catalogKey, 'push-up');
  assert.equal(after.sets, row.sets, 'sets carried across');
  assert.equal(after.reps, row.reps, 'reps carried across');
  assert.equal(after.repsMax, row.repsMax);
});

test('changing the prescription keeps the movement', () => {
  const s = program();
  const row = s.weekPlans[1].days[0].main[0];
  const r = setPrescription(s, [], at(1, 0, 0), { sets: 5, reps: 3 });
  assert.ok(r.ok);
  const after = r.structure.weekPlans[1].days[0].main[0];
  assert.equal(after.catalogKey, row.catalogKey);
  assert.equal(after.sets, 5);
  assert.equal(after.reps, 3);
});

test('a prescription is clamped to what the Builder can render', () => {
  const s = program();
  const r = setPrescription(s, [], at(1, 0, 0), { sets: 99, reps: 999 });
  assert.ok(r.ok);
  const after = r.structure.weekPlans[1].days[0].main[0];
  assert.equal(after.sets, 8, 'a program the Builder cannot render is one the athlete cannot then edit');
  assert.equal(after.reps, 60);
});

test('a cardio target is only settable on a cardio block', () => {
  const s = program();
  const r = setCardioTarget(s, [], at(1, 0, 0), { targetMi: 4 });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.reason, 'not_cardio');
});

test('a cardio target can be cleared, and clearing is not zeroing', () => {
  // The schema is explicit: a null target prescribes an OPEN bout. Coercing it to 0 prescribes a run of
  // no distance, which is a different and nonsensical instruction.
  const s = program({ goal: 'conditioning' });
  const day = s.weekPlans[1].days[0];
  const i = day.main.findIndex((e) => e.kind === 'cardio');
  assert.ok(i >= 0, 'a conditioning day carries a cardio block');

  const set = setCardioTarget(s, [], at(1, 0, i), { targetSec: 1800 });
  assert.ok(set.ok);
  assert.equal(set.structure.weekPlans[1].days[0].main[i].targetSec, 1800);

  const cleared = setCardioTarget(set.structure, [], at(1, 0, i), { targetSec: null });
  assert.ok(cleared.ok);
  assert.equal(cleared.structure.weekPlans[1].days[0].main[i].targetSec, null, 'null, not 0');
});

// ─────────────────────────────────────────────────────────────────────────────
// REBUILDING A DAY
// ─────────────────────────────────────────────────────────────────────────────

test('rebuilding a day around a sore shoulder removes the overhead work', () => {
  const s = program();
  const r = rebuildDay(s, [], { weekIndex: 1, dayIndex: 0 }, POOL, ctx({ limitations: ['shoulders'] }), PRESCRIBE);
  assert.ok(r.ok, r.ok ? '' : r.refusal.message);

  const patternOf = new Map(POOL.map((e) => [e.key, e.pattern]));
  for (const e of r.structure.weekPlans[1].days[0].main) {
    if (!e.catalogKey) continue;
    assert.notEqual(patternOf.get(e.catalogKey), 'Vertical Push', 'overhead pressing survived the rebuild');
  }
});

test('a rebuilt day is the same length as the day it replaced', () => {
  const s = program();
  const before = s.weekPlans[1].days[0].main.length;
  const r = rebuildDay(s, [], { weekIndex: 1, dayIndex: 0 }, POOL, ctx({ limitations: ['shoulders', 'no_barbell'] }), PRESCRIBE);
  assert.ok(r.ok);
  assert.equal(
    r.structure.weekPlans[1].days[0].main.length,
    before,
    'a shorter day would change the session count and move the finish line',
  );
});

test('rebuilding leaves the other days of that week alone', () => {
  const s = program();
  const before = JSON.stringify(s.weekPlans[1].days[1]);
  const r = rebuildDay(s, [], { weekIndex: 1, dayIndex: 0 }, POOL, ctx({ limitations: ['shoulders'] }), PRESCRIBE);
  assert.ok(r.ok);
  assert.equal(JSON.stringify(r.structure.weekPlans[1].days[1]), before);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE SHAPE THE APP EXPECTS BACK
// ─────────────────────────────────────────────────────────────────────────────

test('an edited program is materialised per week, like a swap', () => {
  // The same "Customize" shape the builder already writes — nothing downstream learns a new structure.
  const s = program();
  const r = setPrescription(s, [], at(1, 0, 0), { sets: 5 });
  assert.ok(r.ok);
  assert.equal(r.structure.vary, true);
  assert.equal(r.structure.weekPlans.length, s.weeks);
  assert.deepEqual(r.structure.days, r.structure.weekPlans[0].days, 'the repeat template mirrors week one');
});
