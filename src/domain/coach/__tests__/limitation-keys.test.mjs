/**
 * limitation-keys.test.mjs — the per-exercise halves of a limitation, and the one thing that can silently
 * break them.
 *
 * ══ WHY A TYPO HERE IS THE WORST KIND ══
 *
 * `LIMITATION_EXCLUDE_KEYS` is the only place in the app where a misspelling produces a SAFEGUARD THAT
 * DOES NOTHING. The athlete ticks "shoulders", believes they have been heard, and is prescribed the
 * upright row anyway — with no error, no empty screen, and nothing to notice. The pattern bans cannot fail
 * this way because a wrong pattern name empties a whole day and gets seen immediately.
 *
 * So every key on both tables is asserted to exist in the catalogue AND to sit under the pattern the
 * reasoning assumed it sits under, which is the assumption that actually does the work.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/limitation-keys.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import {
  LIMITATION_EXCLUDE_KEYS,
  LIMITATION_KEEP_KEYS,
  LIMITATION_PATTERNS,
} from '../rulebook/limitations.ts';
import { buildDayWorkout } from '../day.ts';
import { assemble } from '../assemble.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ THE KEYS ARE REAL
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ every excluded key exists — a typo is a safeguard that does nothing', () => {
  const missing = [];
  for (const [limitation, keys] of Object.entries(LIMITATION_EXCLUDE_KEYS))
    for (const k of keys) if (!BY_KEY.has(k)) missing.push(`${limitation}: ${k}`);
  assert.deepEqual(missing, []);
});

test('every kept key exists too', () => {
  const missing = [];
  for (const [limitation, keys] of Object.entries(LIMITATION_KEEP_KEYS))
    for (const k of keys) if (!BY_KEY.has(k)) missing.push(`${limitation}: ${k}`);
  assert.deepEqual(missing, []);
});

test('⚠ a kept key sits under a pattern its own limitation actually bans', () => {
  // Otherwise the carve-out is decorative: re-admitting something that was never excluded reads as a
  // safeguard being loosened when nothing has changed at all.
  for (const [limitation, keys] of Object.entries(LIMITATION_KEEP_KEYS)) {
    const banned = LIMITATION_PATTERNS[limitation] ?? [];
    for (const k of keys) {
      assert.ok(
        banned.includes(BY_KEY.get(k).pattern),
        `${limitation} keeps ${k} (${BY_KEY.get(k).pattern}) but never banned that pattern`,
      );
    }
  }
});

test('⚠ an excluded key is NOT already caught by its limitation\'s pattern ban', () => {
  // The inverse check, and the reason these tables exist: an upright row is filed as a pull, so banning
  // Vertical Push could never have reached it. A key that its own pattern ban already removes is dead
  // weight and hides the fact that the list is doing nothing.
  const redundant = [];
  for (const [limitation, keys] of Object.entries(LIMITATION_EXCLUDE_KEYS)) {
    const banned = LIMITATION_PATTERNS[limitation] ?? [];
    for (const k of keys) if (banned.includes(BY_KEY.get(k).pattern)) redundant.push(`${limitation}: ${k}`);
  }
  assert.deepEqual(redundant, []);
});

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ AND THEY CHANGE WHAT GETS PRESCRIBED
// ─────────────────────────────────────────────────────────────────────────────

const day = (over) =>
  buildDayWorkout(
    { focus: { kind: 'split', split: 'full_body' }, goal: 'muscle', sessionMinutes: 75,
      experience: 'intermediate', environment: 'full_gym', ownedEquipment: [], limitations: [], ...over },
    POOL,
    canDoExercise,
  ).day.main.map((m) => m.catalogKey);

test('⚠ no upright row survives a shoulder complaint, on any surface', () => {
  const focus = { kind: 'body_parts', parts: ['shoulders'] };
  for (const over of [
    { focus, limitations: ['shoulders'] },
    { focus, limitations: ['shoulders'], environment: 'home', ownedEquipment: ['dumbbells', 'bench'] },
    { limitations: ['shoulders'] },
  ]) {
    const got = day(over);
    for (const k of LIMITATION_EXCLUDE_KEYS.shoulders) {
      assert.ok(!got.includes(k), `${k} was prescribed to someone working around their shoulders`);
    }
  }
});

test('⚠ nothing finishes overhead when the athlete said nothing overhead', () => {
  const got = day({ limitations: ['no_overhead'], focus: { kind: 'body_parts', parts: ['shoulders'] } });
  for (const k of LIMITATION_EXCLUDE_KEYS.no_overhead) assert.ok(!got.includes(k), `${k} goes overhead`);
});

test('⭐ a bad back gets its glute bridge back, and still no deadlift', () => {
  const res = assemble(
    {
      goal: 'muscle',
      experience: { lifting: 'beginner', running: 'beginner' },
      daysPerWeek: 4,
      sessionMinutes: 75,
      environment: 'home',
      ownedEquipment: ['dumbbells', 'mat', 'bench'],
      limitations: ['lower_back'],
      excludeExercises: [],
    },
    POOL,
    canDoExercise,
  );
  assert.ok(res.ok, res.ok ? '' : res.refusal?.message);
  const keys = res.assembly.structure.days.flatMap((d) => d.main.map((m) => m.catalogKey));

  const bridges = keys.filter((k) => LIMITATION_KEEP_KEYS.lower_back.includes(k));
  assert.ok(bridges.length > 0, 'eight weeks for a bad back with no posterior-chain hip extension at all');

  // The ban is still doing its job — this is the half that must not regress.
  for (const k of keys) {
    assert.doesNotMatch(k, /deadlift|good-morning|back-extension|superman|swing|carry/, `${k} loads the complaint`);
  }
});

test('⚠ the athlete naming a movement beats any carve-out', () => {
  // `excludeExercises` is the athlete speaking for themselves. A limitation quietly handing it back
  // would be the worst possible version of this feature.
  const res = assemble(
    {
      goal: 'muscle',
      experience: { lifting: 'beginner', running: 'beginner' },
      daysPerWeek: 4,
      sessionMinutes: 75,
      environment: 'home',
      ownedEquipment: ['dumbbells', 'mat', 'bench'],
      limitations: ['lower_back'],
      excludeExercises: [...LIMITATION_KEEP_KEYS.lower_back],
    },
    POOL,
    canDoExercise,
  );
  assert.ok(res.ok, res.ok ? '' : res.refusal?.message);
  const keys = res.assembly.structure.days.flatMap((d) => d.main.map((m) => m.catalogKey));
  for (const k of LIMITATION_KEEP_KEYS.lower_back) assert.ok(!keys.includes(k), `${k} came back anyway`);
});
