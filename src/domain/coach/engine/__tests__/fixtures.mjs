/**
 * Real-shaped worlds for engine tests (Holt Listens HL-10/HL-12). Built by the app's own engine (`assemble`), never
 * hand-typed, so a fixture is a program the app could actually have saved.
 *
 * ⭐ `benjaminWorld()` — the tester of 2026-11-18: an 8-week, 5-day muscle block (Push · Pull · Legs · Upper · Lower),
 * home gym (pull-up bar, lat pulldown, barbell, EZ bar, dumbbells, cables, bench, dip bar, Peloton), in week 4 with
 * the first 18 sessions behind him (17 trained, 1 skipped) — his picker started at "Week 4, day 4".
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../../home-gym/equipment.ts';
import { assemble } from '../../assemble.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../../exercise-relationships/source', f), 'utf8'));

let pool = null;
/** The visible catalogue, built once per test process. */
export const catalog = () =>
  (pool ??= buildPickerDb({
    exercises: src('exercises.json'),
    exerciseMuscles: src('exercise_muscles.json'),
    muscles: src('muscles.json'),
    equipment: src('equipment.json'),
  }));

export const BENJAMIN_KIT = ['pullup', 'latpulldown', 'barbell', 'plates', 'ezbar', 'dumbbells', 'cable', 'bench', 'dip', 'bike'];

/** A program as the app saves it. */
export function savedProgram(structure, over = {}) {
  return {
    id: 'prog-benjamin',
    name: structure.name,
    structure,
    state: 'active',
    startedAt: '2026-10-20T12:00:00Z',
    endedAt: null,
    createdAt: '2026-10-20T12:00:00Z',
    sourceDefinitionId: null,
    ...over,
  };
}

export function benjaminWorld() {
  const res = assemble(
    {
      goal: 'muscle',
      experience: { lifting: 'intermediate', running: 'beginner' },
      daysPerWeek: 5,
      sessionMinutes: 60,
      environment: 'home',
      ownedEquipment: BENJAMIN_KIT,
      limitations: [],
      excludeExercises: [],
    },
    catalog(),
    canDoExercise,
  );
  if (!res.ok) throw new Error(`benjaminWorld: the engine refused — ${res.refusal.message}`);
  const structure = { ...res.assembly.structure, name: '8-Week Muscle Block' };
  const marks = [];
  for (let w = 0; w < 4; w += 1) {
    for (let d = 0; d < 5; d += 1) {
      if (w === 3 && d >= 3) continue;
      marks.push({ weekIndex: w, dayIndex: d, state: w === 1 && d === 4 ? 'skipped' : 'completed', workoutId: null });
    }
  }
  return { active: savedProgram(structure), marks };
}
