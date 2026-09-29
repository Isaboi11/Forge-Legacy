/**
 * timed-prescription.test.mjs — a plank is held, not counted.
 *
 * ══ THE BUG (PO, 2026-09-28) ══
 *
 * Holt wrote "Plank 3 × 8". The catalogue marks 82 exercises `unit: 'time'` — planks, hollow and L-sit
 * holds, wall sits, hangs, carries, stretches — and every coach path ignored it and handed them the slot's
 * rep count. The only hold branch keyed on the DAY being mobility, and a plank on a strength day is
 * pattern `Core`. The draft card then rendered a hold as "3 sets", so even a correct row read wrong.
 *
 * Every sweep below asserts it found timed rows at all — a sweep that never meets a plank passes on nothing.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/timed-prescription.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { buildDayWorkout, BODY_PARTS, SPLITS } from '../day.ts';
import { dayCardFor } from '../chat-core.ts';
import { AUTHORED_GOALS } from '../rulebook/skeletons.ts';
import { prescribeTimed, reshapeForUnit } from '../prescribe.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const TIMED = new Set(POOL.filter((e) => e.unit === 'time').map((e) => e.key));

const ROOMS = {
  full_gym: { environment: 'full_gym', ownedEquipment: [] },
  home: { environment: 'home', ownedEquipment: ['dumbbells', 'bench', 'pullup', 'bands', 'mat'] },
  bodyweight: { environment: 'bodyweight', ownedEquipment: [] },
};
const EXPERIENCES = ['beginner', 'intermediate', 'advanced'];

/** Every row checked; returns how many were timed so the caller can prove the sweep met some. */
function checkRows(rows, where, wrong, mobilityDay = false) {
  let timed = 0;
  for (const r of rows) {
    if (!r.catalogKey || r.kind === 'cardio') continue;
    if (TIMED.has(r.catalogKey)) {
      timed++;
      if (!(r.durationSec > 0) || r.reps != null) wrong.push(`${where}: ${r.name} = sets ${r.sets}, reps ${r.reps}, sec ${r.durationSec}`);
    } else if (r.durationSec != null && !mobilityDay) {
      // A rep exercise must never ask for seconds — except on a MOBILITY day, which holds everything by
      // design (PAS §10.1, `prescribeHold`), and is not what this fix is about.
      wrong.push(`${where}: ${r.name} is a rep exercise prescribed ${r.durationSec}s`);
    }
  }
  return timed;
}

test('the catalogue still marks the holds this fix depends on', () => {
  for (const k of ['plank', 'side-plank', 'hollow-body-hold', 'wall-sit', 'dead-hang']) {
    if (POOL.some((e) => e.key === k)) assert.ok(TIMED.has(k), `${k} lost its unit: 'time'`);
  }
  assert.ok(TIMED.size > 40, `expected dozens of timed exercises, got ${TIMED.size}`);
});

test('a single day never counts a hold in reps — every split, body part, room and level', () => {
  const wrong = [];
  let timed = 0;
  const focuses = [
    ...SPLITS.map((split) => ({ kind: 'split', split })),
    ...BODY_PARTS.map((part) => ({ kind: 'body_parts', parts: [part] })),
  ];
  for (const focus of focuses)
    for (const [room, r] of Object.entries(ROOMS))
      for (const experience of EXPERIENCES)
        for (const sessionMinutes of [30, 60, 75]) {
          const { day } = buildDayWorkout(
            { focus, sessionMinutes, experience, environment: r.environment, ownedEquipment: r.ownedEquipment, limitations: [] },
            POOL,
            canDoExercise,
          );
          timed += checkRows(day.main, `${JSON.stringify(focus)} ${room} ${experience} ${sessionMinutes}m`, wrong);
        }
  assert.deepEqual(wrong, [], wrong.slice(0, 12).join('\n'));
  assert.ok(timed > 0, 'the day sweep never met a timed exercise, so it proved nothing');
});

test('a whole program never counts a hold in reps — every goal, level, room, deload week included', () => {
  const wrong = [];
  let timed = 0;
  for (const goal of AUTHORED_GOALS)
    for (const experience of EXPERIENCES)
      for (const [room, r] of Object.entries(ROOMS))
        for (const daysPerWeek of [3, 4]) {
          const res = assemble(
            {
              goal,
              experience: { lifting: experience, running: experience },
              daysPerWeek,
              sessionMinutes: 60,
              environment: r.environment,
              ownedEquipment: r.ownedEquipment,
              limitations: [],
              excludeExercises: [],
            },
            POOL,
            canDoExercise,
          );
          if (!res.ok) continue;
          res.assembly.structure.weekPlans.forEach((wp, w) =>
            wp.days.forEach((d) => {
              timed += checkRows(d.main ?? [], `${goal} ${experience} ${room} ${daysPerWeek}d w${w + 1} ${d.name}`, wrong, goal === 'mobility');
            }),
          );
        }
  assert.deepEqual(wrong, [], wrong.slice(0, 12).join('\n'));
  assert.ok(timed > 0, 'the program sweep never met a timed exercise, so it proved nothing');
});

test('Holt\'s draft card reads a hold as "3 × 30s", not "3 sets"', () => {
  const card = dayCardFor({}, { name: 'Core', main: [{ name: 'Plank', sets: 3, durationSec: 30 }, { name: 'Crunch', sets: 3, reps: 12 }] });
  assert.equal(card.rows[0].prescription, '3 × 30s');
  assert.equal(card.rows[1].prescription, '3 × 12');
});

test('a deload cuts a hold\'s sets and keeps its length', () => {
  const ctx = { category: 'STRENGTH', experience: 'intermediate', weekIndex: 3 };
  const normal = prescribeTimed('accessory', { ...ctx, isDeload: false });
  const deload = prescribeTimed('accessory', { ...ctx, isDeload: true });
  assert.ok(deload.sets < normal.sets, `deload ${deload.sets} vs ${normal.sets}`);
  assert.equal(deload.durationSec, normal.durationSec);
  assert.equal(prescribeTimed('accessory', { ...ctx, experience: 'beginner', isDeload: false }).durationSec, 30);
});

test('swapping between a rep exercise and a hold changes the measure and keeps the sets', () => {
  const toPlank = reshapeForUnit({ catalogKey: 'crunch', sets: 3, reps: 12, repsMax: 15 }, true);
  assert.equal(toPlank.sets, 3);
  assert.equal(toPlank.reps, undefined);
  assert.equal(toPlank.repsMax, undefined);
  assert.ok(toPlank.durationSec > 0);

  const toCrunch = reshapeForUnit({ catalogKey: 'plank', sets: 3, durationSec: 45 }, false);
  assert.equal(toCrunch.sets, 3);
  assert.equal(toCrunch.durationSec, undefined);
  assert.ok(toCrunch.reps > 0);

  const same = { catalogKey: 'crunch', sets: 3, reps: 12 };
  assert.equal(reshapeForUnit(same, false), same, 'rep to rep leaves the row alone');
});
