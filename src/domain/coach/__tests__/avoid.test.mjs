/**
 * avoid.test.mjs — "I hate lunges" is removed by the engine, not promised by the model.
 * Live 2026-09-22: Holt said "no lunges anywhere in it" and nothing reached assemble().
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { completeFor } from '../chat-core.ts';
import { resolveAvoid } from '../avoid.ts';
import { narrowPatch } from '../interpret-narrow.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({ exercises: src('exercises.json'), exerciseMuscles: src('exercise_muscles.json'), muscles: src('muscles.json'), equipment: src('equipment.json') });

test('a plural name resolves to every variant, as a whole word', () => {
  const lunge = resolveAvoid(['lunges'], POOL).map((k) => POOL.find((e) => e.key === k).name);
  assert.ok(lunge.length >= 10 && lunge.every((n) => /lunge/i.test(n)));
  assert.ok(resolveAvoid(['skull crushers'], POOL).length >= 3);
  assert.deepEqual(resolveAvoid(['xy'], POOL), [], 'too short to mean anything');
});

test('⚠ a program built with "I hate lunges" contains no lunge', () => {
  const exclude = resolveAvoid(['lunges'], POOL);
  for (const goal of ['muscle', 'strength', 'weight_loss']) {
    const c = completeFor({ goal, daysPerWeek: 4, environment: 'full_gym', experience: { lifting: 'intermediate', running: 'intermediate' }, sessionMinutes: 60, limitations: [], excludeExercises: exclude, weeks: 4 }, 'program');
    const r = assemble(c, POOL, canDoExercise);
    assert.ok(r.ok);
    const names = r.assembly.structure.weekPlans.flatMap((w) => w.days.flatMap((d) => d.main.map((m) => m.name ?? '')));
    assert.deepEqual(names.filter((n) => /lunge/i.test(n)), [], goal);
  }
});

test('the parser carries avoid as names, trimmed and capped', () => {
  assert.deepEqual(narrowPatch({ avoid: [' lunges ', 'burpees', 3, 'x', 'lunges'] }, '2026-09-22').avoid, ['lunges', 'burpees']);
});
