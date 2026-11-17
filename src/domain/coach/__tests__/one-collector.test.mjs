/**
 * one-collector.test.mjs — both ways Holt fills a day now collect through `collectRanked` (PB-2).
 *
 * A split day walks a pattern list (`fillSlot`); a body-part day takes the primary movers for the muscles
 * named and spreads across their patterns. They used to gate and rank separately, and the body-part path
 * fell behind: on the base build it prescribed a Triceps Stretch as a bodyweight triceps workout and a calf
 * wall stretch on a leg day (no coherence gate), and it ignored the athlete's own swaps when ranking. These
 * pin the two halves of "a fix lands once": the gates agree, and the order agrees.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/one-collector.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { candidatesFor, collectRanked, contextFrom } from '../candidates.ts';
import { buildDayWorkout, whyThin } from '../day.ts';
import { limitationExcludeKeys, limitationKeepKeys, limitationPatterns } from '../rulebook/limitations.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));

const day = (parts, over = {}) =>
  buildDayWorkout(
    {
      focus: { kind: 'body_parts', parts },
      sessionMinutes: 60,
      experience: 'intermediate',
      environment: 'bodyweight',
      ownedEquipment: [],
      limitations: [],
      ...over,
    },
    POOL,
    canDoExercise,
  );

test('a body-part day never prescribes a stretch as strength work — the coherence gate reaches it now', () => {
  for (const [parts, over] of [
    [['triceps'], {}],
    [['legs'], { environment: 'home', ownedEquipment: ['mat'] }],
    [['glutes'], {}],
    [['core'], {}],
    [['chest', 'triceps'], { experience: 'beginner' }],
  ]) {
    const r = day(parts, over);
    const stretches = r.day.main.filter((e) => BY_KEY.get(e.catalogKey)?.modality === 'Mobility');
    assert.deepEqual(stretches.map((e) => e.catalogKey), [], `${parts.join('+')}: a mobility drill in a strength day`);
  }
});

test('a bodyweight triceps day is refused honestly instead of shipping "Triceps Stretch 3 × 12"', () => {
  const req = { focus: { kind: 'body_parts', parts: ['triceps'] }, sessionMinutes: 60, experience: 'intermediate', environment: 'bodyweight', ownedEquipment: [], limitations: [] };
  const r = buildDayWorkout(req, POOL, canDoExercise);
  assert.ok(!r.day.main.some((e) => e.catalogKey === 'triceps-stretch'));
  // Too thin to be a session, and the reason is the room — a cable or a band fixes it.
  assert.equal(whyThin(req, r.day.main.length, POOL, canDoExercise), 'gear');
});

test('the athlete’s own swaps rank a body-part day exactly as they rank a split day', () => {
  const learned = { 'Horizontal Push': ['dumbbell-bench-press'] };
  const gym = { environment: 'full_gym', learned };
  assert.equal(day(['chest'], gym).day.main[0].catalogKey, 'dumbbell-bench-press', 'body-part day');
  const split = buildDayWorkout(
    { focus: { kind: 'split', split: 'push' }, sessionMinutes: 60, experience: 'intermediate', environment: 'full_gym', ownedEquipment: [], limitations: [], learned },
    POOL,
    canDoExercise,
  );
  assert.equal(split.day.main[0].catalogKey, 'dumbbell-bench-press', 'split day');
  // No swaps on record: the rulebook's canonical press, both ways.
  assert.equal(day(['chest'], { environment: 'full_gym' }).day.main[0].catalogKey, 'barbell-bench-press');
});

test('candidatesFor is the collector asked about one pattern — same gates, same order', () => {
  const ctx = contextFrom({
    owned: ['dumbbells', 'bench', 'bands', 'mat'],
    canDo: canDoExercise,
    experience: 'beginner',
    limitations: ['lower_back'],
    limitationPatterns,
    limitationKeys: limitationExcludeKeys,
    limitationKeepKeys,
  });
  for (const stretch of [false, true]) {
    const all = collectRanked(() => true, POOL, ctx, stretch);
    for (const pattern of ['Horizontal Push', 'Hinge / Hip Dominant', 'Elbow Extension', 'Shoulder Isolation', 'Core']) {
      assert.deepEqual(
        candidatesFor(pattern, POOL, ctx, stretch).map((e) => e.key),
        (all.get(pattern) ?? []).map((e) => e.key),
        `${pattern} (stretch ${stretch})`,
      );
    }
  }
});
