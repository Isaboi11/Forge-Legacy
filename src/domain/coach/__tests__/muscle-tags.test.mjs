/**
 * muscle-tags.test.mjs — the catalogue's muscle tags are the data the weekly volume model counts (PB-2).
 *
 * A secondary muscle used to be a line on the exercise page. Under PAS-A4-D1 it is half a set, summed over a
 * week and held against a band, so a wrong tag is a wrong dose. `coherence.ts` states the rules; this holds
 * every VISIBLE row (the pool the builder reads, not `exercises.json`) to them, proves each rule actually
 * fires on a bad row, and checks the corrections are on the record.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/muscle-tags.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { catalogueTagProblems, isCoherent } from '../rulebook/coherence.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(here, '../../exercise-relationships/source');
const src = (f) => JSON.parse(readFileSync(path.join(SOURCE, f), 'utf8'));

const RAW = src('exercises.json');
const FAMILY = new Map(RAW.map((e) => [e.id, e.family]));
const POOL = buildPickerDb({
  exercises: RAW,
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));
const row = (key) => ({ ...BY_KEY.get(key), family: FAMILY.get(key) });

test('every visible row passes the muscle-tag rules', () => {
  const problems = POOL.flatMap((e) => catalogueTagProblems({ ...e, family: FAMILY.get(e.key) }));
  assert.deepEqual(problems, [], `muscle tags the volume model would miscount:\n  ${problems.join('\n  ')}`);
});

test('and every visible row still passes the primary-mover check, except the stretches it exists to stop', () => {
  // `isCoherent` keeps a misfiled PRIMARY out of a slot; the only rows it refuses today are mobility drills
  // filed under a strength pattern (a triceps stretch is not a set of triceps work).
  const refused = POOL.filter((e) => !isCoherent(e));
  assert.ok(refused.every((e) => e.modality === 'Mobility'), refused.map((e) => e.key).join(', '));
});

/* ── each rule fires (the positive half — a rule that never fires is a rule nobody can see is dead) ── */

const strip = (key, muscle) => {
  const r = row(key);
  return { ...r, muscleIds: r.muscleIds.filter((m) => m !== muscle) };
};

test('a deadlift, an RDL or a swing that does not credit the hamstrings is caught', () => {
  for (const key of ['barbell-deadlift', 'barbell-romanian-deadlift', 'dumbbell-romanian-deadlift', 'kettlebell-swing', 'barbell-good-morning']) {
    assert.ok(row(key).muscleIds.includes('hamstrings'), `${key} credits the hamstrings now`);
    assert.match(catalogueTagProblems(strip(key, 'hamstrings')).join(' '), /hamstrings/, key);
  }
  // A leg curl is a hinge-pattern row by catalogue convention, and is NOT owed this rule — it is hamstrings-primary.
  assert.deepEqual(catalogueTagProblems(row('lying-leg-curl-machine')), []);
  assert.deepEqual(catalogueTagProblems(row('barbell-hip-thrust')), [], 'a hip thrust is a glute movement, not a hinge the rule is about');
});

test('a press that does not credit the triceps is caught; a fly that does is caught', () => {
  for (const key of ['barbell-bench-press', 'barbell-spoto-press', 'barbell-larsen-press', 'barbell-overhead-press', 'dumbbell-z-press']) {
    assert.ok(row(key).muscleIds.includes('triceps'), key);
    assert.match(catalogueTagProblems(strip(key, 'triceps')).join(' '), /triceps/, key);
  }
  for (const key of ['dumbbell-chest-fly', 'pec-deck-fly', 'cable-chest-fly']) {
    assert.ok(!row(key).muscleIds.includes('triceps'), `${key} no longer credits the triceps`);
    const tagged = { ...row(key), muscleIds: [...row(key).muscleIds, 'triceps'] };
    assert.match(catalogueTagProblems(tagged).join(' '), /never trains the triceps/, key);
  }
});

test('a push movement tagged with a pull muscle (and the reverse) is caught', () => {
  const bench = row('barbell-bench-press');
  assert.match(catalogueTagProblems({ ...bench, muscleIds: [...bench.muscleIds, 'lats'] }).join(' '), /credits lats/);
  const rowEx = row('barbell-bent-over-row');
  assert.match(catalogueTagProblems({ ...rowEx, muscleIds: [...rowEx.muscleIds, 'chest'] }).join(' '), /credits chest/);
  // The pullover is the deliberate exception (QA F11): a vertical pull that really does use the chest.
  assert.deepEqual(catalogueTagProblems(row('dumbbell-pullover')), []);
});

test('every correction is on the record in SOURCE-CORRECTIONS.csv', () => {
  const csv = readFileSync(path.join(SOURCE, '..', 'SOURCE-CORRECTIONS.csv'), 'utf8');
  for (const key of ['barbell-romanian-deadlift', 'barbell-spoto-press', 'dumbbell-z-press', 'pec-deck-fly']) {
    assert.match(csv, new RegExp(`"${key}","secondaryMuscles"`), key);
  }
});

test('the fixes touched no primary muscle — the list coach-author prints into its SYSTEM prompt', () => {
  // An RDL stays glutes-primary on purpose (see `coherence.ts`): a primary change would change the prompt.
  assert.deepEqual(row('barbell-romanian-deadlift').primaryMuscleIds, ['glutes']);
  assert.deepEqual(row('barbell-spoto-press').primaryMuscleIds, ['chest']);
});
