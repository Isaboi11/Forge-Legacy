/**
 * holt-rows-named.test.mjs — QA F13 (2026-09-26): no row Holt builds is nameless.
 *
 * Holt-built running plans saved three cool-down stretches per run day with `name: ''` — the rulebook was
 * handed bare catalogue keys and could not name them. The builder showed "1 sets / 1 reps" cards with no
 * title and the saved program read "30s | 30s | 30s". The rows came through every structural check,
 * because a key resolved and nothing asked what the athlete would SEE.
 *
 * This runs the real `assemble` against the real catalogue, the way the chat sheet does, over every race,
 * both run/walk and continuous runners, compressed and full builds, and a run-and-lift week — and asserts
 * every warm-up, main and cool-down row in every week carries a name.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/holt-rows-named.test.mjs
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

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

/** `assemble` reads the real clock for race weeks, so the race date is set from it too. */
const weeksOut = (n) => new Date(Date.now() + n * 7 * 86400000).toISOString().slice(0, 10);

const namelessIn = (structure) => {
  const out = [];
  (structure.weekPlans ?? [{ days: structure.days }]).forEach((w, wi) => {
    for (const d of w.days) {
      for (const part of ['warmup', 'main', 'cooldown']) {
        for (const row of d[part] ?? []) {
          if (typeof row.name !== 'string' || row.name.trim() === '') out.push(`week ${wi + 1} ${d.name} ${part}: ${row.catalogKey}`);
        }
      }
    }
  });
  return out;
};

const RACES = ['run_5k', 'run_10k', 'run_half', 'run_marathon', 'triathlon'];

test('⚠ QA F13 — every row of every Holt-built race plan has a name', () => {
  let checked = 0;
  for (const goal of RACES) {
    for (const canRunContinuously of [true, false]) {
      for (const weeks of [6, 16]) {
        const c = completeFor(
          {
            goal,
            daysPerWeek: 4,
            raceDate: weeksOut(weeks),
            currentWeeklyMi: canRunContinuously ? 20 : 0,
            canRunContinuously,
            buildAnyway: true,
          },
          'program',
        );
        const r = assemble(c, POOL, canDoExercise);
        assert.ok(r.ok, `${goal}/${weeks}w: ${r.ok ? '' : r.refusal.message}`);
        const bad = namelessIn(r.assembly.structure);
        assert.deepEqual(bad, [], `${goal}, ${weeks} weeks, continuous=${canRunContinuously}`);
        checked += 1;
      }
    }
  }
  assert.equal(checked, RACES.length * 4);
});

test('⚠ QA F13 — the run cool-down actually carries its stretches, named from the catalogue', () => {
  const c = completeFor({ goal: 'run_5k', daysPerWeek: 3, raceDate: weeksOut(8), currentWeeklyMi: 10, canRunContinuously: true }, 'program');
  const r = assemble(c, POOL, canDoExercise);
  assert.ok(r.ok);
  const byKey = new Map(POOL.map((e) => [e.key, e.name]));
  const runDay = r.assembly.structure.weekPlans[0].days.find((d) => d.name === 'Long Run');
  assert.ok(runDay, 'a long run in week one');
  const stretches = runDay.cooldown.filter((row) => !String(row.catalogKey).startsWith('cardio:'));
  assert.ok(stretches.length > 0, 'the cool-down still has its static stretches');
  for (const row of stretches) assert.equal(row.name, byKey.get(row.catalogKey), row.catalogKey);
});

test('⚠ QA F13 — a run-and-lift week has no nameless rows either', () => {
  const days = [{ kind: 'lift' }, { kind: 'run' }, { kind: 'lift' }, { kind: 'run' }, { kind: 'rest' }];
  for (const canRunContinuously of [true, false]) {
    const c = completeFor({ goal: 'strength', days, daysPerWeek: 4, weeks: 4, currentWeeklyMi: 10, canRunContinuously }, 'program');
    const r = assemble(c, POOL, canDoExercise);
    assert.ok(r.ok, r.ok ? '' : r.refusal.message);
    assert.deepEqual(namelessIn(r.assembly.structure), [], `continuous=${canRunContinuously}`);
  }
});
