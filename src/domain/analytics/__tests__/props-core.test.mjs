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

// ── the activation funnel ────────────────────────────────────────────────────

/**
 * ⚠ THESE ARE THE REAL PAYLOADS, NOT SAMPLES OF THEM.
 *
 * `sanitizeProps` DROPS rather than throws, which is right for the athlete and merciless for us: an
 * event whose props were all filtered out still records, still looks fine in the code, and answers
 * nothing. The funnel was already instrumented once this way — `analytics.ts`'s own header names
 * `sign_in_submitted`, `onboarding_continue` and `workout_saved`, and not one of them was ever emitted.
 * So each payload below is asserted WHOLE: if a key is renamed or dropped from the allowlist, the
 * event that depends on it fails here rather than going quiet in production.
 */
test('every activation-funnel payload survives sanitisation whole', () => {
  /*
   * `[event, props]` pairs, not an object — one event legitimately appears several times, because
   * `workout_saved`'s whole job is the `source` dimension and all four of its values must survive.
   *
   * WIRED (copied from the call sites) then NOT-YET-WIRED. The second group is asserted deliberately:
   * those are the payloads Phase 1 and Phase 5 will emit, and the allowlist keys they need (`theme`,
   * `cap`, `limit`, `days_per_week`) landed in this pass. If a later edit trims one of them as unused, it
   * fails HERE rather than six weeks on in a screen nobody re-reads. Delete a line only when the event it
   * describes is genuinely abandoned.
   */
  const payloads = [
    // ── wired ──
    // src/app/sign-in.tsx
    ['auth_submitted', { method: 'email', source: 'create' }],
    ['auth_result', { method: 'email', source: 'create', success: true }],
    // src/app/onboarding.tsx — `section` is the step NAME, `index` the position. Never both in `step`.
    ['onboarding_step_shown', { section: 'equipment', index: 4, total: 6 }],
    // src/domain/onboarding/service.ts — 'none' is the honest value for "not answered".
    ['onboarding_completed', { goal: 'strength', experience: 'beginner', environment: 'full_gym', count: 2, success: true }],
    ['onboarding_completed', { goal: 'none', experience: 'none', environment: 'none', count: 0, success: false }],
    // src/app/workout.tsx — all four `source` values, because `source` is what this event is FOR.
    ['workout_saved', { source: 'freestyle', activity_type: 'strength', state: 'new', count: 12, duration_ms: 2_640_000 }],
    ['workout_saved', { source: 'program', activity_type: 'strength', state: 'continued', count: 18, duration_ms: 3_000 }],
    ['workout_saved', { source: 'template', activity_type: 'cardio', state: 'new', count: 1, duration_ms: 1 }],
    ['workout_saved', { source: 'starter', activity_type: 'strength', state: 'new', count: 9, duration_ms: 60_000 }],
    ['workout_started', { source: 'freestyle', activity_type: 'strength', count: 0 }],
    ['workout_started', { source: 'program', activity_type: 'strength', count: 5 }],
    // src/hooks/usePremiumGate.ts — `result` keeps an allowed crossing from being summed with a refused
    // one, and `limit: -1` is the honest value when entitlement could not be read at all.
    ['cap_attempt', { cap: 'photos', result: 'allowed', limit: 1000 }],
    ['cap_attempt', { cap: 'squads', result: 'blocked', limit: 1 }],
    ['cap_attempt', { cap: 'programs', result: 'unverified', limit: -1 }],
    ['cap_attempt', { cap: 'templates', result: 'suppressed', limit: 5 }],
    ['paywall_shown', { cap: 'programs', source: 'gate' }],
    // ── not yet wired: Phase 1 ──
    ['program_generated', { source: 'onboarding', goal: 'muscle', days_per_week: 3 }],
    ['theme_chosen', { theme: 'paper', source: 'onboarding' }],
  ];

  for (const [kind, props] of payloads) {
    assert.ok(sanitizeKind(kind), `${kind} is not a valid event name`);
    assert.deepEqual(
      sanitizeProps(props),
      props,
      `${kind} ${JSON.stringify(props)} loses props on the way to the database — it would record, and answer nothing`,
    );
  }
});

test('the funnel keys do not smuggle athlete data in behind a new name', () => {
  // The same guard as the allowlist test, aimed at the keys this pass added. `days_per_week` is what
  // the athlete SAID they can train, not a weight; `limit` is the server's own cap.
  assert.deepEqual(sanitizeProps({ goal: 'Bench 315 by June' }), {}, 'a prose goal is still prose');
  assert.deepEqual(sanitizeProps({ days_per_week: 4 }), { days_per_week: 4 });
  assert.deepEqual(sanitizeProps({ limit: 75, cap: 'photos' }), { limit: 75, cap: 'photos' });
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
