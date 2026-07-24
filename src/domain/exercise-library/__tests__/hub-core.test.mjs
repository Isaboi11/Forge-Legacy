import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLibrary,
  categoryCards,
  EMPTY_LIBRARY_FILTERS,
  filterCount,
  isFlatMode,
  liveCount,
  matchesQuery,
  passFilters,
  preview,
} from '../hub-core.ts';

const ex = (over = {}) => ({
  key: 'bench',
  name: 'Barbell Bench Press',
  cat: 'PUSH',
  equipId: 'barbell',
  equip: 'Barbell',
  equipClass: 'Free Weight',
  muscleIds: ['chest'],
  muscles: ['Chest'],
  primaryMuscleIds: ['chest'],
  difficulty: 'Intermediate',
  pattern: 'Horizontal Push',
  modality: 'Strength',
  aliases: [],
  environments: ['Commercial Gym', 'Home Gym'],
  ...over,
});

const DB = [
  ex(),
  ex({ key: 'pushup', name: 'Push-Up', equipId: 'bodyweight', equip: 'Bodyweight', difficulty: 'Beginner', environments: ['Commercial Gym', 'Home Gym', 'Hotel Gym', 'Outdoors'] }),
  ex({ key: 'squat', name: 'Barbell Back Squat', cat: 'LEGS_AND_GLUTES', muscles: ['Quadriceps'], muscleIds: ['quadriceps'] }),
  ex({ key: 'pulldown', name: 'Lat Pulldown', cat: 'PULL', equipId: 'cable', equip: 'Cable Machine', environments: ['Commercial Gym'] }),
];
const CATS = [
  { key: 'PUSH', label: 'Push (Upper Body)' },
  { key: 'PULL', label: 'Pull (Upper Body)' },
  { key: 'LEGS_AND_GLUTES', label: 'Legs & Glutes' },
  { key: 'CORE', label: 'Core & Stability' },
];
const ctx = { favorites: [], recents: [], categoryLabel: (k) => CATS.find((c) => c.key === k)?.label ?? '' };
const state = (over = {}) => ({ query: '', filters: EMPTY_LIBRARY_FILTERS, view: null, ...over });

// ── mode switching ──────────────────────────────────────────────────────────

test('the hub shows until there is something to narrow by', () => {
  assert.equal(isFlatMode(state()), false);
  assert.equal(isFlatMode(state({ query: 'press' })), true);
  assert.equal(isFlatMode(state({ view: { type: 'favorites' } })), true);
  assert.equal(isFlatMode(state({ filters: { ...EMPTY_LIBRARY_FILTERS, diff: ['Beginner'] } })), true);
  assert.equal(isFlatMode(state({ query: '   ' })), false, 'whitespace is not a search');
});

// ── flat list selection ─────────────────────────────────────────────────────

test('drilling a category lists only that category, titled by it', () => {
  const r = buildLibrary(DB, state({ view: { type: 'category', id: 'PUSH' } }), ctx);
  assert.equal(r.title, 'Push (Upper Body)');
  assert.deepEqual(r.rows.map((x) => x.key), ['bench', 'pushup']);
});

test('searching inside a category NARROWS it — it never widens back to the whole catalog', () => {
  const r = buildLibrary(DB, state({ view: { type: 'category', id: 'PUSH' }, query: 'bench' }), ctx);
  assert.deepEqual(r.rows.map((x) => x.key), ['bench'], 'Back Squat must not appear from a Push drill');
});

test('favorites and recents resolve in their stored order, skipping anything unknown', () => {
  const c = { ...ctx, favorites: ['squat', 'not-a-real-id', 'bench'], recents: ['pulldown'] };
  assert.deepEqual(buildLibrary(DB, state({ view: { type: 'favorites' } }), c).rows.map((x) => x.key), ['squat', 'bench']);
  assert.equal(buildLibrary(DB, state({ view: { type: 'recent' } }), c).title, 'Recently Used');
});

test('a search with no drill spans everything and is titled Results', () => {
  const r = buildLibrary(DB, state({ query: 'barbell' }), ctx);
  assert.equal(r.title, 'Results');
  assert.deepEqual(r.rows.map((x) => x.key), ['bench', 'squat']);
});

test('filters alone produce a Filtered list', () => {
  const r = buildLibrary(DB, state({ filters: { ...EMPTY_LIBRARY_FILTERS, diff: ['Beginner'] } }), ctx);
  assert.equal(r.title, 'Filtered');
  assert.deepEqual(r.rows.map((x) => x.key), ['pushup']);
});

test('the hub returns no rows at all — it is not a list', () => {
  const r = buildLibrary(DB, state(), ctx);
  assert.equal(r.flat, false);
  assert.deepEqual(r.rows, []);
});

// ── search ──────────────────────────────────────────────────────────────────

test('search matches name, muscle and equipment', () => {
  assert.equal(matchesQuery(ex(), 'bench'), true);
  assert.equal(matchesQuery(ex(), 'chest'), true, 'by muscle');
  assert.equal(matchesQuery(ex(), 'barbell'), true, 'by equipment');
  assert.equal(matchesQuery(ex(), 'kettlebell'), false);
  assert.equal(matchesQuery(ex(), '  '), true, 'an empty search excludes nothing');
});

// ── filters ─────────────────────────────────────────────────────────────────

test('environment filters on where the equipment actually is', () => {
  const home = { ...EMPTY_LIBRARY_FILTERS, env: ['Home Gym'] };
  assert.equal(passFilters(DB[0], home), true, 'a barbell fits a home gym');
  assert.equal(passFilters(DB[3], home), false, 'a cable machine does not');

  const outdoors = { ...EMPTY_LIBRARY_FILTERS, env: ['Outdoors'] };
  assert.equal(passFilters(DB[1], outdoors), true, 'bodyweight travels');
  assert.equal(passFilters(DB[0], outdoors), false);
});

/**
 * Once a Home Gym profile exists, "Home Gym" stops meaning "gear that fits in a garage" and starts
 * meaning THIS athlete's garage. Until then it must keep working generically.
 */
test('"Home Gym" resolves against the athlete’s own equipment once they have set one up', () => {
  const home = { ...EMPTY_LIBRARY_FILTERS, env: ['Home Gym'] };

  assert.equal(passFilters(DB[0], home, null), true, 'no profile — a barbell generically fits a home gym');
  assert.equal(passFilters(DB[0], home, []), false, 'an empty gym owns no barbell');
  assert.equal(passFilters(DB[0], home, ['barbell']), true, 'owning a bar unlocks it');
  assert.equal(passFilters(DB[1], home, []), true, 'push-ups need nothing, ever');
});

test('an empty profile is a real answer, not an unset one', () => {
  const home = { ...EMPTY_LIBRARY_FILTERS, env: ['Home Gym'] };
  assert.notEqual(
    passFilters(DB[0], home, []),
    passFilters(DB[0], home, null),
    '[] means "I own nothing" and must not behave like null',
  );
});

test('other environments keep their generic meaning and OR alongside a real Home Gym', () => {
  const both = { ...EMPTY_LIBRARY_FILTERS, env: ['Home Gym', 'Outdoors'] };
  assert.equal(passFilters(DB[1], both, []), true, 'bodyweight passes either way');
  assert.equal(passFilters(DB[0], both, []), false, 'a barbell is neither owned nor outdoors');

  const gymOrHome = { ...EMPTY_LIBRARY_FILTERS, env: ['Home Gym', 'Commercial Gym'] };
  assert.equal(passFilters(DB[3], gymOrHome, []), true, 'a cable machine still passes on Commercial Gym');
});

test('the live count and the list agree about the home gym', () => {
  const f = { ...EMPTY_LIBRARY_FILTERS, env: ['Home Gym'] };
  const owned = ['barbell'];
  const shown = buildLibrary(DB, state({ filters: f }), { ...ctx, homeGym: owned }).rows.length;
  assert.equal(liveCount(DB, f, owned), shown, 'the promise must match the result');
  assert.notEqual(liveCount(DB, f, []), liveCount(DB, f, owned), 'the count has to move with the profile');
});

test('groups AND together, values within a group OR', () => {
  const f = { ...EMPTY_LIBRARY_FILTERS, cat: ['PUSH'], diff: ['Beginner'] };
  assert.equal(passFilters(DB[1], f), true, 'Push AND Beginner');
  assert.equal(passFilters(DB[0], f), false, 'Push but Intermediate — fails the AND');

  const either = { ...EMPTY_LIBRARY_FILTERS, cat: ['PUSH', 'PULL'] };
  assert.equal(passFilters(DB[3], either), true, 'either category passes');
});

test('an empty filter set excludes nothing', () => {
  for (const x of DB) assert.equal(passFilters(x, EMPTY_LIBRARY_FILTERS), true);
  assert.equal(filterCount(EMPTY_LIBRARY_FILTERS), 0);
});

test('the live count previews exactly what applying would show', () => {
  const f = { ...EMPTY_LIBRARY_FILTERS, env: ['Outdoors'] };
  assert.equal(liveCount(DB, f), 1);
  assert.equal(liveCount(DB, f), buildLibrary(DB, state({ filters: f }), ctx).rows.length, 'the promise must match the result');
});

// ── hub sections ────────────────────────────────────────────────────────────

test('category cards carry live counts and drop empty categories', () => {
  const cards = categoryCards(DB, CATS);
  assert.deepEqual(cards.map((c) => [c.key, c.count]), [['PUSH', 2], ['PULL', 1], ['LEGS_AND_GLUTES', 1]]);
  assert.ok(!cards.some((c) => c.key === 'CORE'), 'an empty category would be a dead end');
});

test('hub previews cap at three and skip unknown keys', () => {
  const p = preview(DB, ['squat', 'ghost', 'bench', 'pushup', 'pulldown']);
  assert.deepEqual(p.map((x) => x.key), ['squat', 'bench', 'pushup']);
});
