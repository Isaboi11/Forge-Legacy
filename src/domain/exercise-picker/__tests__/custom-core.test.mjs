import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canSave,
  capMessage,
  capState,
  CUSTOM_KEY_PREFIX,
  CUSTOM_LIMIT,
  CUSTOM_WARN_AT,
  customIdOf,
  customKey,
  customToPickerItem,
  draftFrom,
  duplicateOf,
  emptyDraft,
  isCustomKey,
  isDirty,
  mergeForSearch,
} from '../custom-core.ts';
import { matchesSearch } from '../search-core.ts';

/**
 * PO review: *"Should we be able to add our own exercises if it's not on there?"*
 *
 * Yes — and `Exercise-001-Custom-Exercise-Architecture` and `W-28-Create-Edit-Custom-Exercise` had both
 * been LOCKED and unbuilt for months. These guard the decisions those specs make, which are the parts a
 * later change is most likely to quietly reverse.
 */

const ex = (over = {}) => ({
  id: 'a1',
  name: 'Belt Squat Machine',
  category: null,
  equipment: [],
  primaryMuscles: [],
  secondaryMuscles: [],
  environments: [],
  notes: null,
  unit: 'reps',
  createdAt: '2026-08-10T00:00:00Z',
  updatedAt: '2026-08-10T00:00:00Z',
  deletedAt: null,
  ...over,
});

// ── EX-001-D3: name is the only required field ───────────────────────────────

test('a name is all it takes to save', () => {
  // "Fast enough to create in seconds" (W-28 §5.1). Every additional mandatory field is a reason to
  // abandon the form mid-workout and log the set under the wrong exercise.
  assert.equal(canSave({ name: 'Belt Squat' }), true);
  assert.equal(canSave(emptyDraft()), false);
  assert.equal(canSave({ name: '   ' }), false, 'whitespace is not a name');
});

// ── EX-001-D4: a duplicate name warns, never blocks ──────────────────────────

test('a duplicate of your own exercise is found, case and space insensitively', () => {
  const mine = [ex({ id: 'a1', name: 'Belt Squat Machine' })];
  assert.equal(duplicateOf('belt squat machine', mine)?.id, 'a1');
  assert.equal(duplicateOf('  Belt Squat Machine  ', mine)?.id, 'a1');
  assert.equal(duplicateOf('Belt Squat', mine), null, 'a different name is a different exercise');
  assert.equal(duplicateOf('   ', mine), null);
});

test('⚠ EDIT mode never warns that an exercise collides with ITSELF', () => {
  // Without the exclusion, opening an exercise and saving it unchanged warns you about yourself —
  // which trains athletes to ignore the warning entirely.
  const mine = [ex({ id: 'a1', name: 'Belt Squat Machine' })];
  assert.equal(duplicateOf('Belt Squat Machine', mine, 'a1'), null);
  assert.equal(duplicateOf('Belt Squat Machine', mine, 'other')?.id, 'a1');
});

test('a deleted exercise does not warn — it is not in the library any more', () => {
  const mine = [ex({ id: 'a1', name: 'Belt Squat Machine', deletedAt: '2026-08-01T00:00:00Z' })];
  assert.equal(duplicateOf('Belt Squat Machine', mine), null);
});

// ── EX-001-D5: the 500 cap ───────────────────────────────────────────────────

test('the cap warns before it bites', () => {
  assert.equal(capState(0), 'ok');
  assert.equal(capState(CUSTOM_WARN_AT - 1), 'ok');
  assert.equal(capState(CUSTOM_WARN_AT), 'approaching');
  assert.equal(capState(CUSTOM_LIMIT - 1), 'approaching');
  assert.equal(capState(CUSTOM_LIMIT), 'full');
  assert.equal(capState(CUSTOM_LIMIT + 5), 'full', 'over the line is still over the line');
});

test('the cap messages say what to DO, not just what is wrong', () => {
  assert.equal(capMessage(10), null, 'silence until there is something to say');
  assert.match(capMessage(CUSTOM_WARN_AT), /approaching the exercise limit \(480\/500\)/);
  assert.match(capMessage(CUSTOM_LIMIT), /Delete unused exercises/);
});

// ── the namespaced key ───────────────────────────────────────────────────────

test('a custom exercise is recognisable by its key, everywhere downstream', () => {
  // The logger, lift history, PR detection and the exercise-detail route all key off `catalogKey`. A
  // bare uuid would be indistinguishable from a catalogue id at every one of them.
  const k = customKey('11111111-2222-3333-4444-555555555555');
  assert.ok(k.startsWith(CUSTOM_KEY_PREFIX));
  assert.equal(isCustomKey(k), true);
  assert.equal(customIdOf(k), '11111111-2222-3333-4444-555555555555');
});

test('a catalogue key is never mistaken for a custom one', () => {
  for (const k of ['barbell-back-squat', 'cardio:run', 'ez-bar-biceps-curl', '', null, undefined]) {
    assert.equal(isCustomKey(k), false, `${k} is not custom`);
    assert.equal(customIdOf(k), null);
  }
  assert.equal(customIdOf('custom:'), null, 'a prefix with no id is not an id');
});

// ── becoming something the Picker can render ─────────────────────────────────

const lookup = { muscleName: (id) => `M:${id}`, equipName: (id) => `E:${id}` };

test('a custom exercise renders with what the athlete gave it', () => {
  const item = customToPickerItem(
    ex({ category: 'LEGS_AND_GLUTES', equipment: ['legpress'], primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes'], unit: 'time' }),
    lookup,
  );
  assert.equal(item.key, customKey('a1'));
  assert.equal(item.name, 'Belt Squat Machine');
  assert.equal(item.cat, 'LEGS_AND_GLUTES');
  assert.equal(item.equip, 'E:legpress');
  assert.deepEqual(item.muscleIds, ['quadriceps', 'glutes'], 'primary first, then secondary');
  assert.deepEqual(item.primaryMuscleIds, ['quadriceps']);
  assert.equal(item.unit, 'time', 'a custom HOLD gets its countdown like any catalogue hold');
});

test('an exercise created with nothing but a name still renders', () => {
  // The inline path (name only, mid-workout) is the common case, not the exception.
  const item = customToPickerItem(ex(), lookup);
  assert.equal(item.equip, 'Custom');
  assert.equal(item.cat, 'FULL_BODY', 'uncategorised falls where an unknown pattern falls');
  assert.deepEqual(item.muscleIds, []);
  assert.equal(item.unit, 'reps');
});

test('your own exercise wins a name tie against the catalogue', () => {
  // An athlete who created "Leg Press" because that is what their gym calls it should reach their row,
  // not scroll past a catalogue near-match to get to it.
  const catalogue = [
    { key: 'machine-leg-press', name: 'Leg Press' },
    { key: 'barbell-back-squat', name: 'Back Squat' },
  ];
  const mine = [{ key: customKey('a1'), name: 'Leg Press' }];
  const merged = mergeForSearch(catalogue, mine);
  assert.deepEqual(merged.map((x) => x.name), ['Back Squat', 'Leg Press', 'Leg Press']);
  assert.equal(merged[1].key, customKey('a1'), 'theirs first when the names tie');
});

test('the merge is the picker RESULT LIST — it may reorder, never drop', () => {
  // `buildSections` builds its results out of this. A merge that lost a row would delete part of the
  // catalogue from the picker, which is a far worse failure than an ordering one and would look like
  // "that exercise doesn't exist" rather than like a bug.
  const catalogue = Array.from({ length: 12 }, (_, i) => ({ key: `k${i}`, name: `Ex ${i}` }));
  const mine = [{ key: customKey('a1'), name: 'Belt Squat Machine' }];
  const merged = mergeForSearch(catalogue, mine);
  assert.equal(merged.length, 13);
  assert.deepEqual(
    new Set(merged.map((x) => x.key)),
    new Set([...catalogue.map((x) => x.key), customKey('a1')]),
  );
});

// ── found by the SAME matcher the catalogue is found by ──────────────────────
//
// The picker's pool was `PICKER_DB` alone, so an exercise the athlete created was saved and then
// invisible: unsearchable, absent from My Exercises, and impossible to put into a program, a week
// template or a workout template — all three of which add exercises through that one screen. Merging
// them in means they have to survive `searchFields`, which reads `aliases`, `muscles` and `equip`, and a
// custom exercise has nothing to put in the first of those.

test('an athlete finds their own exercise by typing its name', () => {
  const item = customToPickerItem(ex(), lookup);
  assert.equal(matchesSearch(item, 'belt squat'), true);
  assert.equal(matchesSearch(item, 'machine belt'), true, 'token-AND, same as the catalogue');
  assert.equal(matchesSearch(item, ''), true, 'an empty query matches everything, theirs included');
  assert.equal(matchesSearch(item, 'bench press'), false);
});

test('a name-only exercise is searchable — the empty alias list must not throw or match nothing', () => {
  const item = customToPickerItem(ex({ name: 'Reverse Hyper' }), lookup);
  assert.deepEqual(item.aliases, [], 'nothing invents aliases for a movement one person described');
  assert.equal(matchesSearch(item, 'reverse hyper'), true);
});

// ── the discard prompt ───────────────────────────────────────────────────────

test('an untouched form is not dirty, and any real change is', () => {
  const base = draftFrom(ex());
  assert.equal(isDirty(base, base), false);
  assert.equal(isDirty({ ...base, name: 'Other' }, base), true);
  assert.equal(isDirty({ ...base, unit: 'time' }, base), true);
  assert.equal(isDirty({ ...base, primaryMuscles: ['chest'] }, base), true);
  assert.equal(isDirty({ ...base, notes: 'brace first' }, base), true);
  // A list rebuilt with the same contents is not a change — otherwise every render would be dirty.
  assert.equal(isDirty({ ...base, equipment: [...base.equipment] }, base), false);
});

test('a draft made from a stored exercise round-trips its fields', () => {
  const stored = ex({ category: 'PUSH', equipment: ['bench'], primaryMuscles: ['chest'], notes: 'elbows in', unit: 'time' });
  const d = draftFrom(stored);
  assert.equal(d.name, stored.name);
  assert.equal(d.category, 'PUSH');
  assert.deepEqual(d.equipment, ['bench']);
  assert.equal(d.notes, 'elbows in', 'a null note becomes an empty string, a real one survives');
  assert.equal(d.unit, 'time');
  assert.equal(draftFrom(ex()).notes, '', 'null notes read as an empty field, never the string "null"');
});
