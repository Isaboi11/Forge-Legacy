/**
 * active-program.test.mjs — the runtime adapter over REAL converted program data
 * (replaces the former placeholder seed test). Verifies the one-active invariant, that the
 * active program's next workout carries in-range modality/split, and that its exercises link
 * to the authoritative catalog — all against real content, not a fabricated seed.
 *
 * Run:  node --test src/domain/training/__tests__/active-program.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildPrograms, activeProgramFrom, DEMO_ACTIVE_ID } from '../active-program-core.ts';
import { MODALITIES, SPLITS } from '../schema.ts';
import { SEXES } from '../../profile/schema.ts';
import { getSelfProfile } from '../../profile/placeholder-data.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAMS = join(HERE, '..', 'programs');
const CATALOG = join(HERE, '..', '..', 'exercise-relationships', 'source', 'exercises.json');
const catalogIds = new Set(JSON.parse(readFileSync(CATALOG, 'utf8')).map((e) => e.id));

const defs = ['strength-foundation-i-3day', 'strength-foundation-ii-4day'].map((id) =>
  JSON.parse(readFileSync(join(PROGRAMS, `${id}.json`), 'utf8')),
);

test('one-active invariant: exactly one program is active, and it is the demo-active id', () => {
  const programs = buildPrograms(defs);
  const active = programs.filter((p) => p.state === 'active');
  assert.equal(active.length, 1);
  assert.equal(active[0].id, DEMO_ACTIVE_ID);
});

test('active program next workout carries in-range modality + split (real data)', () => {
  const p = activeProgramFrom(defs);
  assert.ok(p, 'expected an active program');
  const w = p.nextWorkout;
  assert.ok(w, 'expected a next workout');
  assert.ok(MODALITIES.includes(w.modality), `modality: ${w.modality}`);
  assert.ok(SPLITS.includes(w.split), `split: ${w.split}`);
  // Foundation I (3-day) Workout A is a full-body day.
  assert.equal(w.split, 'full_body');
  assert.equal(w.modality, 'strength');
});

test('every next-workout exercise catalogKey resolves to the real catalog', () => {
  const w = activeProgramFrom(defs).nextWorkout;
  assert.ok(w.exercises.length > 0);
  for (const ex of w.exercises) {
    assert.ok(catalogIds.has(ex.catalogKey), `dangling catalogKey: ${ex.catalogKey}`);
    assert.ok(ex.workingSets > 0, `non-positive workingSets on ${ex.catalogKey}`);
    assert.equal(ex.section, 'main');
  }
});

test('exerciseCount matches the main-work count', () => {
  const w = activeProgramFrom(defs).nextWorkout;
  assert.equal(w.exerciseCount, w.exercises.length);
});

test('self profile has an in-range sex, defaulting to unspecified', () => {
  const u = getSelfProfile();
  assert.ok(SEXES.includes(u.sex), `sex: ${u.sex}`);
  assert.equal(u.sex, 'unspecified');
});
