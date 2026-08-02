import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildEquipFilterGroups,
  buildMuscleFilterGroups,
  buildPickerDb,
  categoryFor,
  EXERCISE_CATEGORIES,
  SYSTEM_MUSCLE_IDS,
  HIDDEN_EXERCISE_IDS,
} from '../catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'exercise-relationships', 'source');
const load = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));

const exercises = load('exercises.json');
const exerciseMuscles = load('exercise_muscles.json');
const muscles = load('muscles.json');
const equipment = load('equipment.json');

const DB = buildPickerDb({ exercises, exerciseMuscles, muscles, equipment });
const CAT_KEYS = new Set(EXERCISE_CATEGORIES.map((c) => c.key));

// ── the regression this whole module exists to fix ───────────────────────────

test('the picker offers the whole catalog minus the withheld set — not the 26-movement demo set', () => {
  assert.equal(DB.length, exercises.length - HIDDEN_EXERCISE_IDS.size);
  assert.ok(DB.length > 700, `expected the full catalog, got ${DB.length}`);
});

test('withheld exercises are absent from browse, search and alternatives', () => {
  const offered = new Set(DB.map((x) => x.key));
  for (const id of HIDDEN_EXERCISE_IDS) {
    assert.ok(!offered.has(id), `${id} is hidden but still reachable in the picker`);
  }
});

test('every withheld id still exists in the catalog — hiding is a filter, never a deletion', () => {
  // The source file is authoritative, relationship edges point at these ids, and an athlete who already
  // logged one must not lose the record of what they trained.
  const catalog = new Set(exercises.map((e) => e.id));
  for (const id of HIDDEN_EXERCISE_IDS) {
    assert.ok(catalog.has(id), `${id} was removed from exercises.json rather than hidden`);
  }
});

test('every exercise lands in exactly one of the 6 locked browse categories', () => {
  const orphans = DB.filter((x) => !CAT_KEYS.has(x.cat));
  assert.deepEqual(orphans, [], 'every exercise must be reachable from browse');
});

test('no catalogue category is empty — every locked row has exercises behind it', () => {
  for (const c of EXERCISE_CATEGORIES) {
    // CARDIO is the amended seventh and is sourced from CARDIO_ACTIVITIES, not from `exercises.json`.
    // Counting it against the catalogue would assert the very thing that makes it different.
    if (c.key === 'CARDIO') continue;
    const n = DB.filter((x) => x.cat === c.key).length;
    assert.ok(n > 0, `${c.key} has no exercises — the row would render as a dead end`);
  }
});

test('CARDIO divides nothing in the catalogue — the W-21 §5 invariant still holds', () => {
  // The amendment's whole safety argument: adding a seventh door does not reassign a single exercise.
  assert.equal(DB.filter((x) => x.cat === 'CARDIO').length, 0,
    'no cataloged exercise may be filed under CARDIO — it is a door onto conditioning, not a division of the catalogue');
});

test('every exercise resolves real equipment (no raw ids leaking into the UI)', () => {
  const unresolved = DB.filter((x) => x.equip === x.equipId);
  assert.deepEqual(unresolved.map((x) => x.equipId), [], 'equipmentId must map to a display name');
});

test('muscle names resolve — no raw muscle ids shown to the athlete', () => {
  const raw = DB.flatMap((x) => x.muscles).filter((m) => m.includes('_'));
  assert.deepEqual([...new Set(raw)], []);
});

// ── the category rules, each traceable to the locked spec ────────────────────

test('push / pull split follows the locked primary-mover rule', () => {
  assert.equal(categoryFor('Horizontal Push', ['chest']), 'PUSH');
  assert.equal(categoryFor('Vertical Push', ['front_deltoids']), 'PUSH');
  assert.equal(categoryFor('Elbow Extension', ['triceps']), 'PUSH', 'tricep movers → PUSH (arch §3.3)');
  assert.equal(categoryFor('Horizontal Pull', ['upper_back']), 'PULL');
  assert.equal(categoryFor('Vertical Pull', ['lats']), 'PULL');
  assert.equal(categoryFor('Elbow Flexion', ['biceps']), 'PULL', 'bicep movers → PULL (arch §3.3)');
});

test('R1-1 — every hip- and knee-dominant pattern collapses into Legs & Glutes', () => {
  for (const p of ['Squat / Knee Dominant', 'Hinge / Hip Dominant', 'Hip Isolation', 'Calf / Ankle']) {
    assert.equal(categoryFor(p, ['glutes']), 'LEGS_AND_GLUTES', `${p} must land in LEGS_AND_GLUTES`);
  }
});

test('Shoulder Isolation resolves on the primary mover, not the pattern', () => {
  assert.equal(categoryFor('Shoulder Isolation', ['rear_deltoids']), 'PULL');
  assert.equal(categoryFor('Shoulder Isolation', ['traps']), 'PULL', 'shrugs pull');
  assert.equal(categoryFor('Shoulder Isolation', ['lateral_deltoids']), 'PUSH');
  assert.equal(categoryFor('Shoulder Isolation', ['front_deltoids']), 'PUSH');
});

test('Shoulder Isolation actually splits across both categories in the real data', () => {
  const shoulder = DB.filter((x) => x.pattern === 'Shoulder Isolation');
  const cats = new Set(shoulder.map((x) => x.cat));
  assert.ok(shoulder.length > 0);
  assert.deepEqual([...cats].sort(), ['PULL', 'PUSH'], 'the split rule must be doing real work');
});

test('`Other` → Carry & Full Body is data-derived: every such record is primary full_body', () => {
  const other = exercises.filter((e) => e.movementPattern === 'Other').map((e) => e.id);
  const primaries = new Set(
    exerciseMuscles.filter((l) => other.includes(l.exerciseId) && l.role === 'Primary').map((l) => l.muscleId),
  );
  assert.deepEqual([...primaries], ['full_body'], 'the justification for FULL_BODY must still hold');
  assert.ok(DB.filter((x) => x.pattern === 'Other').every((x) => x.cat === 'FULL_BODY'));
});

test('conditioning-flavoured patterns land in Carry & Full Body', () => {
  for (const p of ['Carry', 'Cardio / Locomotion', 'Power / Plyometric']) {
    assert.equal(categoryFor(p, []), 'FULL_BODY');
  }
});

test('an unrecognised pattern degrades to Carry & Full Body rather than vanishing', () => {
  assert.equal(categoryFor('Some Future Pattern', []), 'FULL_BODY');
});

// ── ordering + filter vocabularies ──────────────────────────────────────────

test('the six locked categories keep their W-21 §5 order, and CARDIO comes after them', () => {
  const keys = EXERCISE_CATEGORIES.map((c) => c.key);
  // The lock is about the SIX and their order. Both are untouched — the amendment appends, never reorders.
  assert.deepEqual(keys.slice(0, 6), ['PUSH', 'PULL', 'LEGS_AND_GLUTES', 'CORE', 'FULL_BODY', 'MOBILITY']);
  assert.deepEqual(keys, ['PUSH', 'PULL', 'LEGS_AND_GLUTES', 'CORE', 'FULL_BODY', 'MOBILITY', 'CARDIO']);
});

test('the catalog is name-sorted so the list reads alphabetically', () => {
  const names = DB.map((x) => x.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test('primary muscles come first, so the row subtitle leads with what the lift trains', () => {
  const withBoth = DB.find((x) => x.primaryMuscleIds.length > 0 && x.muscleIds.length > x.primaryMuscleIds.length);
  assert.ok(withBoth, 'expected at least one exercise with primary + secondary muscles');
  assert.deepEqual(withBoth.muscleIds.slice(0, withBoth.primaryMuscleIds.length), withBoth.primaryMuscleIds);
});

test('the muscle filter offers body parts only — System descriptors are excluded', () => {
  const groups = buildMuscleFilterGroups(muscles);
  const ids = groups.flatMap((g) => g.muscles.map((m) => m.id));
  assert.ok(ids.length > 0);
  for (const sys of SYSTEM_MUSCLE_IDS) {
    assert.ok(!ids.includes(sys), `${sys} is a descriptor, not a filterable body part`);
  }
  assert.deepEqual(groups.map((g) => g.region), ['Upper Body', 'Core', 'Lower Body']);
});

test('the equipment filter covers every equipment type the catalog actually uses', () => {
  const offered = new Set(buildEquipFilterGroups(equipment).flatMap((g) => g.equipment.map((e) => e.id)));
  const used = new Set(exercises.map((e) => e.equipmentId));
  const missing = [...used].filter((id) => !offered.has(id));
  assert.deepEqual(missing, [], 'an equipment type in use but not filterable would strand exercises');
});

// ── the gear gate ────────────────────────────────────────────────────────────
// The Exercise Picker searches a POOL, and narrows that pool to what the athlete owns. `buildSections`
// itself can't be exercised here — `data.ts` imports the JSON catalog directly, which is why this suite
// builds its own DB — so these lock the gate, which is the part that was missing.

test('the gear gate genuinely cuts the list — a home athlete sees a fraction of the catalog', () => {
  const pool = DB.filter((x) => canDoExercise({ key: x.key, equipId: x.equipId }, ['dumbbells', 'bench']));
  assert.ok(pool.length > 100, 'a dumbbell athlete still has plenty to train');
  assert.ok(pool.length < DB.length * 0.5, `expected well under half the catalog, got ${pool.length}/${DB.length}`);
});

test('owning nothing still leaves a real bodyweight catalog, not an empty screen', () => {
  const pool = DB.filter((x) => canDoExercise({ key: x.key, equipId: x.equipId }, []));
  assert.ok(pool.length > 100, `owning nothing should still train, got ${pool.length}`);
});

test('more equipment never hides an exercise it previously showed', () => {
  const few = new Set(DB.filter((x) => canDoExercise({ key: x.key, equipId: x.equipId }, ['dumbbells'])).map((x) => x.key));
  const many = new Set(DB.filter((x) => canDoExercise({ key: x.key, equipId: x.equipId }, ['dumbbells', 'bench', 'barbell', 'rack'])).map((x) => x.key));
  for (const k of few) assert.ok(many.has(k), `${k} vanished after buying MORE equipment`);
});

test('the gate never lets through something the athlete cannot do', () => {
  const owned = ['dumbbells', 'bench'];
  for (const x of DB.filter((e) => canDoExercise({ key: e.key, equipId: e.equipId }, owned))) {
    assert.ok(canDoExercise({ key: x.key, equipId: x.equipId }, owned), `${x.key} passed the filter but fails the gate`);
  }
});
