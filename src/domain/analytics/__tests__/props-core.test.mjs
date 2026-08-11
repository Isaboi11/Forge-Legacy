import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_PROP_KEYS,
  MAX_KEYS,
  MAX_STRING,
  sanitizeKind,
  sanitizeProps,
  sanitizeScreen,
} from '../props-core.ts';

/**
 * The allowlist is a published promise.
 *
 * `Docs/Legal/Privacy-Policy.md` § 2 tells athletes a usage record never contains anything they wrote or
 * anything they lifted. These tests are what make that sentence checkable. A failure here is not a bug in
 * a chart — it is the app doing something the policy says it does not do.
 */

// ── the promise ──────────────────────────────────────────────────────────────

test('nothing the athlete WROTE can reach the database', () => {
  const leaked = sanitizeProps({
    name: 'Push Day A',
    workout_name: 'Leg Destroyer',
    exercise_name: 'Barbell Bench Press',
    title: 'My Chapter',
    note: 'felt strong today',
    notes: 'shoulder twinge',
    reflection: 'this was the year',
    query: 'bench press',
    search: 'squat',
    message: 'nice work mate',
    comment: 'PR!',
    handle: 'ada_ridge',
    email: 'a@b.com',
    goal_name: 'Bench 315',
  });
  assert.deepEqual(leaked, {}, `athlete-authored text leaked: ${JSON.stringify(leaked)}`);
});

test('nothing the athlete LIFTED can reach the database', () => {
  const leaked = sanitizeProps({
    weight: 315,
    reps: 5,
    volume: 12500,
    distance: 5.2,
    pace: 8.5,
    one_rm: 405,
    body_weight: 180,
    heart_rate: 148,
  });
  assert.deepEqual(leaked, {}, `training data leaked: ${JSON.stringify(leaked)}`);
});

test('no photo, url, or location can reach the database', () => {
  const leaked = sanitizeProps({
    photo_url: 'https://…/x.jpg',
    url: 'https://…',
    avatar_url: 'https://…',
    lat: 39.7,
    lng: -104.9,
    latitude: 39.7,
    coordinates: '39.7,-104.9',
    city: 'Denver',
  });
  assert.deepEqual(leaked, {}, `media or location leaked: ${JSON.stringify(leaked)}`);
});

test('the allowlist itself contains no field that describes the athlete', () => {
  // Guards the allowlist against a future well-meaning addition. If a key here is genuinely needed,
  // the amendment (P6-A1-D3) has to change first — not this assertion.
  const banned = /name|title|note|reflect|query|search|message|comment|handle|email|weight|reps|volume|distance|pace|url|photo|lat|lng|location|city/i;
  const offenders = [...ALLOWED_PROP_KEYS].filter((k) => banned.test(k));
  assert.deepEqual(offenders, [], `allowlist contains athlete-describing keys: ${offenders.join(', ')}`);
});

// ── the second line of defence ───────────────────────────────────────────────

test('an ALLOWLISTED key handed prose is still dropped', () => {
  // The key check cannot see `{ category: workout.name }`. Whitespace mid-value is prose, not an enum.
  assert.deepEqual(sanitizeProps({ category: 'Push Day A' }), {});
  assert.deepEqual(sanitizeProps({ source: 'felt strong today' }), {});
  assert.deepEqual(sanitizeProps({ reason: 'my shoulder hurt' }), {});
});

test('real ids and enums pass untouched', () => {
  assert.deepEqual(
    sanitizeProps({
      category: 'LEGS_AND_GLUTES',
      catalog_key: 'barbell_bench_press',
      activity_type: 'strength',
      state: 'saved',
      is_custom: false,
      count: 3,
      duration_ms: 1420,
    }),
    {
      category: 'LEGS_AND_GLUTES',
      catalog_key: 'barbell_bench_press',
      activity_type: 'strength',
      state: 'saved',
      is_custom: false,
      count: 3,
      duration_ms: 1420,
    },
  );
});

// ── shape and safety ─────────────────────────────────────────────────────────

test('sanitizeProps never throws, whatever it is handed', () => {
  for (const junk of [null, undefined, 42, 'string', [], [1, 2], true, new Date(0), () => {}]) {
    assert.deepEqual(sanitizeProps(junk), {}, `threw or leaked on ${String(junk)}`);
  }
});

test('nested objects and arrays are dropped — that is how a whole workout gets in', () => {
  assert.deepEqual(sanitizeProps({ category: { nested: 'PUSH' } }), {});
  assert.deepEqual(sanitizeProps({ count: [1, 2, 3] }), {});
  assert.deepEqual(sanitizeProps({ source: null, kind: undefined }), {});
});

test('non-finite numbers are dropped rather than stored as null', () => {
  assert.deepEqual(sanitizeProps({ count: Number.NaN }), {});
  assert.deepEqual(sanitizeProps({ count: Infinity }), {});
  assert.deepEqual(sanitizeProps({ count: 0 }), { count: 0 }, 'zero is a real value');
});

test('strings are truncated and the key count is capped', () => {
  const long = 'a'.repeat(200);
  assert.equal(sanitizeProps({ category: long }).category.length, MAX_STRING);

  const many = {};
  for (const k of ALLOWED_PROP_KEYS) many[k] = 'x';
  assert.ok(ALLOWED_PROP_KEYS.size > MAX_KEYS, 'the cap should actually bite');
  assert.equal(Object.keys(sanitizeProps(many)).length, MAX_KEYS);
});

// ── event names ──────────────────────────────────────────────────────────────

test('sanitizeKind accepts lower_snake_case and refuses prose', () => {
  assert.equal(sanitizeKind('screen_view'), 'screen_view');
  assert.equal(sanitizeKind('  Workout_Started  '), 'workout_started');
  assert.equal(sanitizeKind('opened the workout screen'), null);
  assert.equal(sanitizeKind('9lives'), null, 'must start with a letter');
  assert.equal(sanitizeKind('a'.repeat(61)), null);
  assert.equal(sanitizeKind(''), null);
  assert.equal(sanitizeKind(null), null);
  assert.equal(sanitizeKind(42), null);
});

// ── routes ───────────────────────────────────────────────────────────────────

test('sanitizeScreen keeps the SHAPE and drops the instance', () => {
  // "how often is the squad screen opened" is the question. "which squad" is not, and storing it would
  // put ids of things the athlete looked at into the log for no analytical gain.
  assert.equal(sanitizeScreen('/squad/9f3c1a2b-4d5e-6f70-8192-a3b4c5d6e7f8'), '/squad/[id]');
  assert.equal(sanitizeScreen('/challenge/12345'), '/challenge/[id]');
  assert.equal(sanitizeScreen('/exercise/a1b2c3d4e5f60718'), '/exercise/[id]');
  assert.equal(sanitizeScreen('/workouts'), '/workouts');
  assert.equal(sanitizeScreen('/'), '/');
});

test('sanitizeScreen drops the query string — a search term would ride in on it', () => {
  assert.equal(sanitizeScreen('/exercise-picker?q=bench%20press'), '/exercise-picker');
  assert.equal(sanitizeScreen('/home-gym?return=%2Faccount-settings'), '/home-gym');
  assert.equal(sanitizeScreen('/x#fragment'), '/x');
});

test('sanitizeScreen survives junk', () => {
  assert.equal(sanitizeScreen(null), null);
  assert.equal(sanitizeScreen(''), null);
  assert.equal(sanitizeScreen(42), null);
  assert.equal(sanitizeScreen('   '), null);
});
