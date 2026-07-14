/**
 * resolver.test.mjs — the Home Workout Artwork Resolver §16 unit-test matrix
 * (Forge Home Artwork Resolver spec) plus the Phase 1 carry-forward bridge
 * coverage and a real catalog → seed → resolver end-to-end.
 *
 * Run:  node --test src/domain/home-artwork/__tests__/resolver.test.mjs
 * Zero deps (node:test + node:assert). Node 24 strips the imported .ts types.
 *
 * The Phase 0 → Phase 1 gate: this whole suite must be green — especially the
 * DETERMINISM and NEVER-LEGACY/HONORS cases — before Phase 2 (Home re-layout).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolveHomeWorkoutArtwork } from '../resolver.ts';
import { MOVEMENT_PATTERN_TO_FAMILY, MUSCLE_TO_BUCKET, familyOfExercise, splitFromMuscles } from '../bridges.ts';
import { hasKey, isReserved, resolveAsset, validateOverride } from '../manifest.ts';
import { buildCatalogIndex, enrichWithIndex } from '../catalog-core.ts';
import { MOVEMENT_PATTERNS } from '../../exercise-relationships/schema.ts';
import { MUSCLE_IDS } from '../../training/schema.ts';
import { activeProgramFrom } from '../../training/active-program-core.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'exercise-relationships', 'source');
const exercisesData = JSON.parse(readFileSync(join(SRC, 'exercises.json'), 'utf8'));
const muscleRoleData = JSON.parse(readFileSync(join(SRC, 'exercise_muscles.json'), 'utf8'));
const catalogIndex = buildCatalogIndex(exercisesData, muscleRoleData);

// Real converted program data (replaces the former placeholder seed).
const PROGRAMS = join(HERE, '..', '..', 'training', 'programs');
const programDefs = ['strength-foundation-i-3day', 'strength-foundation-ii-4day'].map((id) =>
  JSON.parse(readFileSync(join(PROGRAMS, `${id}.json`), 'utf8')),
);
const getActiveProgram = () => activeProgramFrom(programDefs);
const getNextWorkout = () => getActiveProgram().nextWorkout;

const UNSPEC = { sex: 'unspecified' };

/** Build an enriched main exercise WITHOUT muscle tags, to exercise the dominant-family
 *  rung (4) in isolation — with muscle tags present, composition (rung 3C) resolves first. */
function famEx(movementPattern, equipmentId, workingSets = 3) {
  return { movementPattern, equipmentId, primaryMuscleIds: [], workingSets, section: 'main' };
}

// ─────────────────────────────────────────────────────────────────────────────
// §16 · Unit-test matrix
// ─────────────────────────────────────────────────────────────────────────────

test('Push Day A → training_split:push', () => {
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Push Day A' } });
  assert.equal(a.collection, 'training_split');
  assert.equal(a.key, 'push');
});

test('Pull Day B → training_split:pull', () => {
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Pull Day B' } });
  assert.equal(a.collection, 'training_split');
  assert.equal(a.key, 'pull');
});

test('Upper/Lower program days → upper / lower (not legs)', () => {
  const program = { structure: 'upper_lower', family: 'Strength', schedule: [], state: 'active' };
  const lower = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Lower Body A' }, program });
  const upper = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Upper Body A' }, program });
  assert.deepEqual([lower.collection, lower.key], ['training_split', 'lower']);
  assert.deepEqual([upper.collection, upper.key], ['training_split', 'upper']);
});

test('General Leg Day (no U/L structure) → training_split:legs', () => {
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Leg Day' } });
  assert.deepEqual([a.collection, a.key], ['training_split', 'legs']);
});

test('Full-body workout → training_split:full_body', () => {
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Total Body' } });
  assert.deepEqual([a.collection, a.key], ['training_split', 'full_body']);
});

test('Dedicated core workout → training_split:core', () => {
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Abs & Core' } });
  assert.deepEqual([a.collection, a.key], ['training_split', 'core']);
});

test('Mixed conditioning circuit → training_split:conditioning (asset-corrected; spec §16 listed workout_modality, but conditioning art lives in training_split on disk)', () => {
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Conditioning Circuit' } });
  assert.deepEqual([a.collection, a.key], ['training_split', 'conditioning']);
});

test('Running workout with mobility warm-up → workout_modality:running (primary modality controls)', () => {
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Tempo Run' },
    exercises: [famEx('Mobility', 'bodyweight'), famEx('Cardio / Locomotion', 'cardio')],
  });
  assert.deepEqual([a.collection, a.key], ['workout_modality', 'running']);
});

test('Lifting workout with treadmill warm-up → strength split (not running)', () => {
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Push Day', modality: 'strength' },
    exercises: [{ ...famEx('Cardio / Locomotion', 'cardio'), section: 'warmup' }],
  });
  assert.equal(a.collection, 'training_split');
  assert.equal(a.key, 'push');
});

test('Machine-only workout → exercise_family:machines', () => {
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Machine Day', modality: 'strength' },
    exercises: [famEx('Squat / Knee Dominant', 'selectorized_machine'), famEx('Horizontal Push', 'selectorized_machine'), famEx('Horizontal Pull', 'cable')],
  });
  assert.deepEqual([a.collection, a.key], ['exercise_family', 'machines']);
});

test('Bodyweight-only workout → exercise_family:bodyweight', () => {
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Calisthenics', modality: 'strength' },
    exercises: [famEx('Vertical Pull', 'bodyweight'), famEx('Horizontal Push', 'bodyweight'), famEx('Core', 'bodyweight')],
  });
  assert.deepEqual([a.collection, a.key], ['exercise_family', 'bodyweight']);
});

test('Arms / isolation workout → exercise_family:isolation', () => {
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Arms', modality: 'strength' },
    exercises: [famEx('Elbow Flexion', 'dumbbell'), famEx('Elbow Extension', 'dumbbell'), famEx('Shoulder Isolation', 'dumbbell')],
  });
  assert.deepEqual([a.collection, a.key], ['exercise_family', 'isolation']);
});

test('Ambiguous custom title → theme fallback', () => {
  const program = { name: 'My Plan', family: 'Strength', difficulty: 'Intermediate', theme: 'powerbuilding', schedule: [], state: 'active' };
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Session' }, program });
  assert.deepEqual([a.collection, a.key], ['program_theme', 'powerbuilding']);
});

test('Missing exercises → theme fallback (inferred)', () => {
  const program = { name: 'My Plan', family: 'Strength', difficulty: 'Intermediate', schedule: [], state: 'active' };
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Session' }, program, exercises: [] });
  assert.deepEqual([a.collection, a.key], ['program_theme', 'strength']);
});

test('Missing program → workout-only → generic strength fallback', () => {
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: { name: 'Session' }, program: null, exercises: [] });
  assert.deepEqual([a.collection, a.key], ['workout_modality', 'strength']);
});

test('Invalid override → ignored, resolution continues', () => {
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Push Day A', artworkOverride: { collection: 'training_split', key: 'not-a-key' } },
  });
  assert.deepEqual([a.collection, a.key], ['training_split', 'push']);
});

test('Valid override → short-circuits at confidence 1.0', () => {
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Leg Day', artworkOverride: { collection: 'program_theme', key: 'cutting' } },
  });
  assert.deepEqual([a.collection, a.key], ['program_theme', 'cutting']);
  assert.equal(a.confidence, 1.0);
  assert.equal(a.source, 'override');
});

test('Male selection → male variant + male asset', () => {
  const a = resolveHomeWorkoutArtwork({ user: { sex: 'male' }, workout: { name: 'Push Day A' } });
  assert.equal(a.sexVariant, 'male');
  assert.match(a.assetPath, /\/male\//);
});

test('Female selection → female variant + female asset', () => {
  const a = resolveHomeWorkoutArtwork({ user: { sex: 'female' }, workout: { name: 'Push Day A' } });
  assert.equal(a.sexVariant, 'female');
  assert.match(a.assetPath, /\/female\//);
});

test('Missing sex → neutral variant, served from male placeholder (never guessed)', () => {
  const missing = resolveHomeWorkoutArtwork({ user: null, workout: { name: 'Push Day A' } });
  const unspecified = resolveHomeWorkoutArtwork({ user: { sex: 'unspecified' }, workout: { name: 'Push Day A' } });
  assert.equal(missing.sexVariant, 'neutral');
  assert.equal(unspecified.sexVariant, 'neutral');
  assert.match(missing.assetPath, /\/male\//); // documented temporary placeholder
});

test('Missing / unregistered asset → resolver never returns a broken/empty path', () => {
  // manifest returns null for unregistered keys...
  assert.equal(resolveAsset('training_split', 'nonexistent', 'male'), null);
  // ...and the registered terminal default always resolves (never broken).
  assert.ok(resolveAsset('training_split', 'full_body', 'male'));
  // Any resolution — even an empty context — returns a real, non-reserved asset path.
  const a = resolveHomeWorkoutArtwork({ user: UNSPEC, workout: {}, program: null, exercises: [] });
  assert.ok(a.assetPath && a.assetPath.length > 0);
  assert.equal(isReserved(a.collection), false);
  // (An empty *strength* workout terminates at rung 6 generic-strength, before the rung-7 default —
  //  both are registered assets; the point is it is never blank or broken.)
  assert.deepEqual([a.collection, a.key], ['workout_modality', 'strength']);
});

test('Determinism: same inputs always resolve identically', () => {
  const program = getActiveProgram();
  const ctx = {
    user: UNSPEC,
    workout: getNextWorkout(),
    program,
    exercises: enrichWithIndex(catalogIndex, getNextWorkout().exercises),
  };
  const first = resolveHomeWorkoutArtwork(ctx);
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(resolveHomeWorkoutArtwork(ctx), first);
  }
});

test('Workout card NEVER selects Legacy or Honors', () => {
  assert.equal(isReserved('legacy'), true);
  assert.equal(isReserved('honors'), true);
  // Even an explicit override to a reserved collection is rejected.
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Push Day A', artworkOverride: { collection: 'honors', key: 'strength' } },
  });
  assert.notEqual(a.collection, 'honors');
  assert.notEqual(a.collection, 'legacy');
  assert.deepEqual([a.collection, a.key], ['training_split', 'push']);
  // Sweep a spread of scenarios — none may ever land on a reserved collection.
  const scenarios = [
    { workout: { name: 'Leg Day' } },
    { workout: { name: 'Tempo Run' } },
    { workout: { name: 'Conditioning Circuit' } },
    { workout: {}, program: null, exercises: [] },
    { workout: { name: 'Arms', modality: 'strength' }, exercises: [famEx('Elbow Flexion', 'dumbbell')] },
  ];
  for (const s of scenarios) {
    const r = resolveHomeWorkoutArtwork({ user: UNSPEC, ...s });
    assert.ok(!isReserved(r.collection), `reserved leak: ${r.collection}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Carry-forward bridge coverage (explicit, unit-tested lookup tables)
// ─────────────────────────────────────────────────────────────────────────────

test('bridge (a): every one of the 18 MovementPattern values is mapped (family or explicit null)', () => {
  for (const p of MOVEMENT_PATTERNS) {
    assert.ok(p in MOVEMENT_PATTERN_TO_FAMILY, `MovementPattern not covered by bridge: ${p}`);
  }
});

test('bridge (a): every movementPattern present in the real catalog is covered', () => {
  const present = new Set(exercisesData.map((e) => e.movementPattern));
  for (const p of present) {
    assert.ok(p in MOVEMENT_PATTERN_TO_FAMILY, `catalog movementPattern not covered: ${p}`);
  }
});

test('bridge (a): equipment method overrides pattern (machines / bodyweight)', () => {
  assert.equal(familyOfExercise('Squat / Knee Dominant', 'selectorized_machine'), 'machines');
  assert.equal(familyOfExercise('Horizontal Push', 'bodyweight'), 'bodyweight');
  assert.equal(familyOfExercise('Horizontal Push', 'barbell'), 'pressing');
  assert.equal(familyOfExercise('Cardio / Locomotion', 'cardio'), null);
});

test('bridge (b): every canonical MuscleId is mapped (bucket or explicit null) — none silently falls through', () => {
  for (const m of MUSCLE_IDS) {
    assert.ok(m in MUSCLE_TO_BUCKET, `MuscleId not covered by bridge: ${m}`);
  }
});

test('bridge (b): every muscleId used in the real catalog is a known MuscleId', () => {
  const known = new Set(MUSCLE_IDS);
  for (const row of muscleRoleData) {
    assert.ok(known.has(row.muscleId), `catalog muscleId unknown to bridge: ${row.muscleId}`);
  }
});

test('bridge (b): splitFromMuscles picks the broader category', () => {
  assert.equal(splitFromMuscles(['chest', 'triceps'], null), 'push');
  assert.equal(splitFromMuscles(['lats', 'biceps'], null), 'pull');
  assert.equal(splitFromMuscles(['chest', 'lats'], null), 'upper'); // broader than push/pull
  assert.equal(splitFromMuscles(['quadriceps', 'chest'], null), 'full_body'); // broader than legs
  assert.equal(splitFromMuscles(['quadriceps'], 'upper_lower'), 'lower');
  assert.equal(splitFromMuscles(['quadriceps'], null), 'legs');
  assert.equal(splitFromMuscles(['rectus_abdominis'], null), 'core');
  assert.equal(splitFromMuscles(['forearms', 'grip'], null), null); // non-discriminating only
});

// ─────────────────────────────────────────────────────────────────────────────
// Manifest guards
// ─────────────────────────────────────────────────────────────────────────────

test('manifest: reserved collections and unregistered keys are rejected', () => {
  assert.equal(validateOverride('legacy', 'strength'), false);
  assert.equal(validateOverride('honors', 'consistency'), false);
  assert.equal(hasKey('training_split', 'push'), true);
  assert.equal(hasKey('workout_modality', 'conditioning'), false); // conditioning is a training_split key, not modality
  assert.equal(hasKey('training_split', 'conditioning'), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Real catalog enrichment + seed end-to-end
// ─────────────────────────────────────────────────────────────────────────────

test('enrichment: active-program catalogKeys resolve to real pattern/equipment/muscles', () => {
  const enriched = enrichWithIndex(catalogIndex, getNextWorkout().exercises);
  // Foundation I (3-day) Workout A opens with a Goblet Squat → dumbbell-goblet-squat.
  const squat = enriched.find((e) => e.catalogKey === 'dumbbell-goblet-squat');
  assert.ok(squat, 'expected dumbbell-goblet-squat in the active workout');
  assert.equal(squat.movementPattern, 'Squat / Knee Dominant');
  assert.equal(squat.equipmentId, 'dumbbell');
  assert.ok(squat.primaryMuscleIds.length > 0);
});

test('end-to-end: real active program → real catalog → resolver → training_split:full_body, neutral', () => {
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: getNextWorkout(),
    program: getActiveProgram(),
    exercises: enrichWithIndex(catalogIndex, getNextWorkout().exercises),
  });
  // Active = Foundation I (3-day), next = Workout A (full-body).
  assert.deepEqual([a.collection, a.key], ['training_split', 'full_body']);
  assert.equal(a.sexVariant, 'neutral');
  assert.equal(a.source, 'split:structured');
  assert.equal(a.confidence, 0.95);
});

test('composition (rung 3C): muscle-tagged machine leg session resolves to legs before family', () => {
  // With muscle tags present, a leg machine session resolves at split-composition (0.85)
  // as training_split:legs — documents why the machines-family test omits muscle tags.
  const a = resolveHomeWorkoutArtwork({
    user: UNSPEC,
    workout: { name: 'Legs', modality: 'strength' },
    exercises: [
      { movementPattern: 'Squat / Knee Dominant', equipmentId: 'selectorized_machine', primaryMuscleIds: ['quadriceps'], workingSets: 4, section: 'main' },
      { movementPattern: 'Squat / Knee Dominant', equipmentId: 'selectorized_machine', primaryMuscleIds: ['quadriceps', 'glutes'], workingSets: 3, section: 'main' },
    ],
  });
  assert.deepEqual([a.collection, a.key], ['training_split', 'legs']);
  assert.equal(a.source, 'split:composition');
});
