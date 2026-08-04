import test from 'node:test';
import assert from 'node:assert/strict';

import { matchesTokens, rankFor, searchTokens } from '../search-core.ts';

/**
 * Exercise search — token-AND.
 *
 * The rule these guard replaced one contiguous substring, which failed on the way people actually type:
 * "press incline" (wrong order), "bench incline" (right words, not adjacent), and "db curl" (two words
 * living in two different fields) all found nothing in a catalogue of 794 exercises.
 *
 * `matchItem` itself cannot be exercised here — it reaches for the catalogue JSON through an import
 * `node --test` cannot load — which is exactly why the RULE lives in `search-core` and the DATA stays in
 * `data.ts`. These run the real rule over the same field lists `searchFields` assembles.
 */

// A row's searchable fields, in the order `matchItem` assembles them.
const INCLINE_BENCH = ['Incline Barbell Bench Press', 'incline bench', 'Upper Chest', 'Triceps', 'Barbell'];
const DB_CURL = ['Dumbbell Biceps Curl', 'db curl', 'Biceps', 'Dumbbell'];
const BACK_SQUAT = ['Back Squat', 'squat', 'Quads', 'Glutes', 'Barbell'];

test('tokens may arrive in any order', () => {
  assert.ok(matchesTokens(searchTokens('press incline'), INCLINE_BENCH));
  assert.ok(matchesTokens(searchTokens('incline press'), INCLINE_BENCH));
});

test('tokens need not be adjacent in the name', () => {
  // "Incline Barbell Bench Press" — "incline" and "bench" are three words apart.
  assert.ok(matchesTokens(searchTokens('bench incline'), INCLINE_BENCH));
});

test('tokens may be spread across DIFFERENT fields', () => {
  // "db" is a vernacular alias, "curl" is in the name. Neither field contains both, and the old rule
  // asked one field to contain the whole phrase — so this was the query that found nothing.
  assert.ok(matchesTokens(searchTokens('db curl'), DB_CURL));
});

test('EVERY token must land — this is AND, not OR', () => {
  assert.equal(matchesTokens(searchTokens('incline squat'), INCLINE_BENCH), false);
  assert.equal(matchesTokens(searchTokens('squat cable'), BACK_SQUAT), false, 'cable is not in any field');
});

test('a single-word query behaves exactly as it did before', () => {
  // The widening must be a strict superset: nothing that matched can stop matching.
  assert.ok(matchesTokens(searchTokens('incline'), INCLINE_BENCH));
  assert.ok(matchesTokens(searchTokens('barbell'), INCLINE_BENCH), 'equipment still matches');
  assert.ok(matchesTokens(searchTokens('triceps'), INCLINE_BENCH), 'a muscle still matches');
  assert.equal(matchesTokens(searchTokens('kettlebell'), INCLINE_BENCH), false);
});

test('partial tokens still match — this is contains, per token', () => {
  assert.ok(matchesTokens(searchTokens('inc bench'), INCLINE_BENCH), 'typing is expensive mid-workout');
});

test('an empty or whitespace-only query matches everything', () => {
  assert.deepEqual(searchTokens('   '), []);
  assert.ok(matchesTokens(searchTokens(''), BACK_SQUAT));
  assert.ok(matchesTokens(searchTokens('   '), BACK_SQUAT));
});

test('case and extra whitespace are irrelevant', () => {
  assert.ok(matchesTokens(searchTokens('  INCLINE   Bench '), INCLINE_BENCH));
  assert.deepEqual(searchTokens('  Back   Squat '), ['back', 'squat']);
});

// ── ranking: widening what is ELIGIBLE must not reorder what was already best ────────────────────────

test('the whole phrase still outranks scattered tokens', () => {
  // "bench press" is IN "Barbell Bench Press" as one phrase, and is not in "Bench Dip" — but a query of
  // "bench dip" would be scattered in "Bench Dip"… so check the tiers directly.
  assert.equal(rankFor('Barbell Bench Press', 'barbell bench press'), 0, 'exact');
  assert.equal(rankFor('Barbell Bench Press', 'barbell'), 1, 'prefix');
  assert.equal(rankFor('Barbell Bench Press', 'bench press'), 2, 'contiguous, mid-name');
  assert.equal(rankFor('Barbell Bench Press', 'press barbell'), 2.5, 'scattered — eligible, but below');
  assert.ok(rankFor('Barbell Bench Press', 'press barbell') > rankFor('Barbell Bench Press', 'bench press'));
});

test('a row that only matched on a muscle or equipment ranks last', () => {
  // Nothing in the NAME matches, so it lands in the metadata tier — behind everything above.
  assert.equal(rankFor('Barbell Bench Press', 'triceps'), 3);
  assert.ok(rankFor('Barbell Bench Press', 'triceps') > rankFor('Barbell Bench Press', 'press barbell'));
});

test('an empty query ranks everything the same, so alphabetical order survives', () => {
  assert.equal(rankFor('Back Squat', ''), 3);
  assert.equal(rankFor('Barbell Bench Press', ''), 3);
});
