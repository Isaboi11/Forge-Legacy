import test from 'node:test';
import assert from 'node:assert/strict';
import {
  byGroup,
  canDoExercise,
  EQUIP_UNLOCK,
  EXERCISE_GEAR,
  HOME_GYM_EQUIPMENT,
  HOME_GYM_GROUPS,
  ownedSummary,
  programCoverage,
  QUICK_PICK_IDS,
  quickPickItems,
  programFit,
  requirementFor,
  sanitize,
} from '../equipment.ts';
import { readFileSync } from 'node:fs';

// Read rather than `import ... with { type: 'json' }`: the repo's eslint parser rejects import
// attributes, and this test has to stay lintable alongside everything else.
const catalog = JSON.parse(
  readFileSync(new URL('../../exercise-relationships/source/exercises.json', import.meta.url), 'utf8'),
);
const CATALOG = catalog.exercises ?? catalog;
const ex = (key, equipId) => ({ key, equipId });

// ── inventory ───────────────────────────────────────────────────────────────

test('the inventory is the design’s 32 items across 6 ordered groups, with no bodyweight entry', () => {
  assert.equal(HOME_GYM_EQUIPMENT.length, 32);
  assert.deepEqual(byGroup().map((g) => g.group), HOME_GYM_GROUPS);
  assert.equal(byGroup().reduce((n, g) => n + g.items.length, 0), 32, 'every item lands in a group');
  assert.ok(
    !HOME_GYM_EQUIPMENT.some((e) => /^bodyweight$/i.test(e.label)),
    'bodyweight is implied, never selectable',
  );
});

test('every item has a unique id and a hint to disambiguate it', () => {
  const ids = HOME_GYM_EQUIPMENT.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(HOME_GYM_EQUIPMENT.every((e) => e.hint.length > 0));
});

// ── the onboarding quick-picker ─────────────────────────────────────────────

test('the quick-picker is a real subset of the inventory, and short enough to be one step', () => {
  const items = quickPickItems();
  assert.equal(items.length, QUICK_PICK_IDS.length, 'every quick-pick id resolves to a real item');
  assert.ok(items.length <= 12, 'a quick-picker that needs scrolling is not quick');
  assert.deepEqual(sanitize(QUICK_PICK_IDS), [...QUICK_PICK_IDS], 'all valid, no duplicates');
});

test('the quick-picker spans every group that gates real exercise volume', () => {
  const groups = new Set(quickPickItems().map((e) => e.group));
  for (const g of ['Barbell & rack', 'Free weights', 'Machines & cable', 'Cardio', 'Bodyweight & rigs', 'Bands & accessories']) {
    assert.ok(groups.has(g), `nothing from "${g}" — that whole group would look unsupported`);
  }
});

test('picking everything in the quick-picker is a genuinely useful gym, not a token one', () => {
  const n = CATALOG.filter((e) => canDoExercise({ key: e.id, equipId: e.equipmentId }, [...QUICK_PICK_IDS])).length;
  assert.ok(n > 500, `only ${n} exercises — the seed is too thin to be worth asking for`);
});

// ── sanitize: the guard on both read and write ──────────────────────────────

test('sanitize drops unknown ids, de-duplicates, and survives junk', () => {
  assert.deepEqual(sanitize(['barbell', 'nope', 'barbell', 'rack']), ['barbell', 'rack']);
  assert.deepEqual(sanitize(null), []);
  assert.deepEqual(sanitize(undefined), []);
  assert.deepEqual(sanitize(['Barbell']), [], 'ids are the key — a label is not an id');
  assert.deepEqual(sanitize([1, {}, null]), []);
});

// ── the mapping tables must actually point at real catalog rows ─────────────

test('every exercise id in the gear table exists in the catalog — a typo would silently do nothing', () => {
  const known = new Set(CATALOG.map((e) => e.id));
  const ghosts = Object.keys(EXERCISE_GEAR).filter((k) => !known.has(k));
  assert.deepEqual(ghosts, [], `these ids are not in the catalog: ${ghosts.join(', ')}`);
});

test('every catalog equipmentId is accounted for — none silently defaults to "needs nothing"', () => {
  const equipIds = [...new Set(CATALOG.map((e) => e.equipmentId))];
  const unaccounted = equipIds.filter(
    (id) => id !== 'bodyweight' && id !== 'cardio' && !EQUIP_UNLOCK[id],
  );
  assert.deepEqual(unaccounted, [], `unmapped equipment: ${unaccounted.join(', ')}`);
});

test('every cardio exercise is classified individually — the lumped id never leaks through', () => {
  const unclassified = CATALOG.filter((e) => e.equipmentId === 'cardio' && !(e.id in EXERCISE_GEAR));
  assert.deepEqual(unclassified.map((e) => e.id), [], 'an unclassified cardio row would be treated as free');
});

// ── the two failures that motivated the per-exercise layer ──────────────────

test('a treadmill owner is not offered the pool or the rower', () => {
  const owned = ['treadmill'];
  assert.equal(canDoExercise(ex('treadmill-run', 'cardio'), owned), true);
  assert.equal(canDoExercise(ex('open-water-swim', 'cardio'), owned), false, 'a treadmill is not a pool');
  assert.equal(canDoExercise(ex('row-erg', 'cardio'), owned), false, 'a treadmill is not an erg');
  assert.equal(canDoExercise(ex('easy-run', 'cardio'), owned), true, 'running outside needs nothing');
});

test('an empty gym still gets bodyweight, but not anything that hangs from a bar', () => {
  assert.equal(canDoExercise(ex('push-up', 'bodyweight'), []), true);
  assert.equal(canDoExercise(ex('one-arm-pull-up', 'bodyweight'), []), false);
  assert.equal(canDoExercise(ex('parallel-bar-dip', 'bodyweight'), []), false);
  assert.equal(canDoExercise(ex('inverted-row', 'bodyweight'), []), false);
  assert.equal(canDoExercise(ex('pull-up', 'bodyweight'), ['pullup']), true, 'a bar unlocks it');
});

test('an inverted row has several honest ways in', () => {
  for (const gear of ['rack', 'pullup', 'trx', 'rings']) {
    assert.equal(canDoExercise(ex('inverted-row', 'bodyweight'), [gear]), true, `${gear} should work`);
  }
  assert.equal(canDoExercise(ex('inverted-row', 'bodyweight'), ['dumbbells']), false);
});

// ── equipment-level unlocks, including the design's deliberate stand-ins ────

test('the design’s stand-ins survive: a functional trainer covers cable + machine, a Smith covers barbell', () => {
  assert.equal(canDoExercise(ex('cable-fly', 'cable'), ['cable']), true);
  assert.equal(canDoExercise(ex('leg-extension', 'selectorized_machine'), ['cable']), true, 'functional trainer stands in');
  assert.equal(canDoExercise(ex('back-squat', 'barbell'), ['smith']), true, 'a Smith is a guided barbell');
  assert.equal(canDoExercise(ex('back-squat', 'barbell'), ['dumbbells']), false);
});

test('plates or a rack alone unlock barbell work — the bar is not a separate gate', () => {
  assert.equal(canDoExercise(ex('deadlift', 'barbell'), ['plates']), true);
  assert.equal(canDoExercise(ex('deadlift', 'barbell'), ['trapbar']), true);
});

test('gear the editor does not offer is never claimed as trainable', () => {
  const everything = HOME_GYM_EQUIPMENT.map((e) => e.id);
  assert.equal(canDoExercise(ex('sled-push', 'sled'), everything), false, 'no home item is a sled');
  assert.equal(canDoExercise(ex('battle-rope-wave', 'battle_rope'), everything), false);
  assert.equal(canDoExercise(ex('ski-erg', 'cardio'), everything), false);
  assert.equal(canDoExercise(ex('pool-intervals', 'cardio'), everything), false);
});

test('owning everything unlocks the overwhelming majority of the catalog', () => {
  const everything = HOME_GYM_EQUIPMENT.map((e) => e.id);
  const doable = CATALOG.filter((e) => canDoExercise({ key: e.id, equipId: e.equipmentId }, everything));
  assert.ok(doable.length / CATALOG.length > 0.85, `only ${doable.length}/${CATALOG.length} — a mapping is missing`);
});

test('owning nothing leaves bodyweight and outdoor work, and not much else', () => {
  const doable = CATALOG.filter((e) => canDoExercise({ key: e.id, equipId: e.equipmentId }, []));
  assert.ok(doable.length > 100, 'an empty gym must not be an empty app');
  assert.ok(doable.every((e) => e.equipmentId === 'bodyweight' || e.equipmentId === 'cardio'));
});

test('requirementFor prefers the per-exercise override over the equipment default', () => {
  assert.deepEqual(requirementFor(ex('pull-up', 'bodyweight')), ['pullup']);
  assert.deepEqual(requirementFor(ex('push-up', 'bodyweight')), [], 'no override, and bodyweight needs nothing');
  assert.deepEqual(requirementFor(ex('dumbbell-curl', 'dumbbell')), ['dumbbells']);
});

// ── program coverage — derived from the real prescriptions ──────────────────

const p = (key, equipId, name) => ({ key, equipId, name });

test('coverage counts distinct movements, not prescriptions', () => {
  const c = programCoverage(
    [p('back-squat', 'barbell', 'Back Squat'), p('back-squat', 'barbell', 'Back Squat'), p('push-up', 'bodyweight', 'Push-Up')],
    ['barbell'],
  );
  assert.deepEqual([c.total, c.doable], [2, 2], 'a squat on three days is one movement');
});

test('coverage names what the athlete cannot train, and nothing else', () => {
  const c = programCoverage(
    [p('back-squat', 'barbell', 'Back Squat'), p('push-up', 'bodyweight', 'Push-Up'), p('pull-up', 'bodyweight', 'Pull-Up')],
    [],
  );
  assert.deepEqual([c.total, c.doable], [3, 1]);
  assert.deepEqual(c.missing, ['Back Squat', 'Pull-Up'], 'push-ups need nothing and must not be listed');
});

test('an unresolvable exercise is skipped, never counted as missing gear', () => {
  const c = programCoverage([p('', 'barbell', 'Something Unmatched'), p('push-up', 'bodyweight', 'Push-Up')], []);
  assert.deepEqual([c.total, c.doable, c.missing], [1, 1, []]);
});

test('a full gym covers a barbell program completely', () => {
  const c = programCoverage([p('back-squat', 'barbell', 'Back Squat'), p('bench-press', 'barbell', 'Bench Press')], ['barbell', 'rack', 'bench']);
  assert.equal(c.doable, c.total);
  assert.deepEqual(c.missing, []);
});

// ── program fit — lenient on purpose ────────────────────────────────────────

test('a program fits when nothing is missing', () => {
  const f = programFit(['Barbell', 'Rack', 'Bodyweight'], ['barbell', 'rack']);
  assert.deepEqual([f.fits, f.missing], [true, []]);
});

test('one missing piece is a minor swap and still fits — but only if something is owned', () => {
  const swap = programFit(['Barbell', 'Dumbbells'], ['barbell']);
  assert.equal(swap.fits, true, 'own the bar, missing dumbbells — a swap away');
  assert.deepEqual(swap.missing, ['Dumbbells']);

  const nothing = programFit(['Barbell', 'Dumbbells'], ['bands']);
  assert.equal(nothing.fits, false, 'owning none of what it needs is not a minor swap');
});

test('two missing pieces never fit, and no-gear tags never block', () => {
  assert.equal(programFit(['Barbell', 'Dumbbells', 'Cables'], ['barbell']).fits, false);
  assert.equal(programFit(['Mat', 'Bodyweight', 'Running shoes'], []).fits, true);
  assert.equal(programFit([], []).fits, true);
  assert.equal(programFit(['Something Unrecognised'], []).fits, true, 'unknown tags are non-blocking');
});

// ── copy ────────────────────────────────────────────────────────────────────

test('the commit bar counts honestly and pluralises', () => {
  assert.equal(ownedSummary(0), 'Nothing added yet — bodyweight only');
  assert.equal(ownedSummary(1), '1 item in your gym');
  assert.equal(ownedSummary(7), '7 items in your gym');
});
