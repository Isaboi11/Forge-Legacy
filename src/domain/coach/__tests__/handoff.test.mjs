/**
 * handoff.test.mjs — the coach's program surviving the trip into the Program Builder.
 *
 * ══ WHY THIS SEAM GETS ITS OWN TESTS ══
 *
 * The Builder is the coach's review screen: the plan lands in its draft, the athlete reads it, edits
 * anything, and saves. That means every generated program passes through `draftFromStructure`, and a
 * loss there is invisible — the athlete sees a plan, it just is not the plan that was built.
 *
 * The loss is not hypothetical. `hydrateDraft`, the existing edit/duplicate path, normalises through
 * `clampDays` and `makeDays`, and `makeDays` TRUNCATES: a program whose weeks are 6, 6, 5 with
 * `daysPerWeek: 5` silently loses the sixth day of every week just by being opened. That is the same
 * mechanism migration 0123 exists to stop, seen from the other end. `draftFromStructure` deliberately
 * does not use it, and these tests are what keep it that way.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/handoff.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { draftFromStructure } from '../../../lib/program-draft-model.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) =>
  JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

const built = (over = {}) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// NOTHING IS LOST
// ─────────────────────────────────────────────────────────────────────────────

test('every week and every day survives the handoff', () => {
  for (const daysPerWeek of [2, 3, 4, 5, 6]) {
    const s = built({ daysPerWeek });
    const d = draftFromStructure(s);

    assert.equal(d.weeks, s.weeks, `${daysPerWeek}d: weeks`);
    assert.equal(d.daysPerWeek, s.daysPerWeek, `${daysPerWeek}d: daysPerWeek`);
    assert.equal(d.weekPlans.length, s.weekPlans.length, `${daysPerWeek}d: week count`);

    for (let w = 0; w < s.weekPlans.length; w++) {
      assert.equal(
        d.weekPlans[w].days.length,
        s.weekPlans[w].days.length,
        `${daysPerWeek}d week ${w + 1}: a day went missing — this is the makeDays truncation`,
      );
      for (let i = 0; i < s.weekPlans[w].days.length; i++) {
        assert.equal(
          d.weekPlans[w].days[i].main.length,
          s.weekPlans[w].days[i].main.length,
          `${daysPerWeek}d week ${w + 1} day ${i + 1}: exercises lost`,
        );
      }
    }
  }
});

test('the prescription arrives intact, not just the exercise names', () => {
  const s = built();
  const d = draftFromStructure(s);
  const from = s.weekPlans[0].days[0].main[0];
  const to = d.weekPlans[0].days[0].main[0];
  assert.equal(to.catalogKey, from.catalogKey);
  assert.equal(to.name, from.name);
  assert.equal(to.sets, from.sets);
  assert.equal(to.reps, from.reps);
  assert.equal(to.repsMax, from.repsMax);
});

test('the deload week keeps its marker through the handoff', () => {
  const s = built();
  const d = draftFromStructure(s);
  // PAS-D8 (1): the marker IS the encoding. Losing it in transit would leave a week that is lighter for
  // no stated reason, which reads as a mistake rather than a deload.
  const marked = d.weekPlans.flatMap((w) => w.days).filter((day) => day.name.includes('[DELOAD]'));
  assert.ok(marked.length > 0, 'an 8-week program deloads at week 7 and must still say so');
});

// ─────────────────────────────────────────────────────────────────────────────
// IT ARRIVES AS A NEW PROGRAM, NOT AN EDIT
// ─────────────────────────────────────────────────────────────────────────────

test('a coach program is new — it can never write back over an existing row', () => {
  const d = draftFromStructure(built());
  assert.equal(d.mode, 'new');
  assert.equal(d.editId, null, 'an editId here would let Save overwrite somebody else’s program');
  assert.equal(d.srcId, null);
  assert.doesNotMatch(d.name, /\(Copy\)/, 'this is not a duplicate of anything');
});

test('every exercise gets a fresh id — these rows have never existed before', () => {
  const d = draftFromStructure(built());
  const ids = d.weekPlans.flatMap((w) => w.days).flatMap((day) => day.main.map((e) => e.id));
  assert.ok(ids.every(Boolean), 'a row with no id breaks the builder’s list operations');
  assert.equal(new Set(ids).size, ids.length, 'ids must be unique or reordering moves the wrong row');
});

test('it opens on a workout, not a settings form', () => {
  const d = draftFromStructure(built());
  assert.equal(d.openDay, 0, 'the athlete arrives to read what was built — that is the point of the review');
});
