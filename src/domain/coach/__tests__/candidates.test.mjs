/**
 * candidates.test.mjs — which exercise fills a slot, and when nothing can.
 *
 * The engine's whole claim is that ONE set of tables serves a full gym, a garage, and a hotel room. That
 * claim rests entirely on this module: the skeleton names a movement, and this decides what expresses it
 * with the equipment in the room. So the tests that matter most are the ones where the room is nearly
 * empty — an athlete with nothing gets a thin program or a wrong one, and the difference is here.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/candidates.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  candidatesFor,
  contextFrom,
  fillSlot,
  isCompound,
  patternLadder,
  trainablePatterns,
} from '../candidates.ts';
import { limitationPatterns } from '../rulebook/limitations.ts';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES — a hand-written pool, small enough to reason about entirely
// ─────────────────────────────────────────────────────────────────────────────

/* Muscle ids are the catalogue's own vocabulary, not invented names: `rulebook/coherence.ts` checks a
   primary mover against the pattern it is filed under, so a fixture saying "quads" reads as an exercise
   whose primary mover is nothing recognisable — and gets correctly rejected as misfiled. */
const ex = (key, pattern, equipId, difficulty, muscles = ['chest', 'triceps']) => ({
  key,
  name: key,
  equipId,
  pattern,
  difficulty,
  primaryMuscleIds: [muscles[0]],
  muscleIds: muscles,
});

/**
 * ⚠ EVERY KEY IS `fx-` PREFIXED, ON PURPOSE.
 *
 * These fixtures test the selection LOGIC in isolation, and `candidatesFor` consults the rulebook's real
 * preference lists. A fixture named `push-up` is a real preferred key, so it silently inherited a
 * production ranking and this file started asserting against the rulebook instead of against the code —
 * which is how the "advanced athlete" case below began failing for a reason that had nothing to do with
 * difficulty. A fixture that shares a name with real data is not a fixture.
 */
const POOL = [
  ex('fx-barbell-bench', 'Horizontal Push', 'barbell', 'Intermediate', ['chest', 'triceps', 'front_deltoids']),
  ex('fx-dumbbell-press', 'Horizontal Push', 'dumbbell', 'Beginner', ['chest', 'triceps']),
  ex('fx-push-up', 'Horizontal Push', 'bodyweight', 'Beginner', ['chest']),
  ex('fx-ring-fly', 'Horizontal Push', 'rings', 'Advanced', ['chest', 'front_deltoids', 'rectus_abdominis']),
  ex('fx-overhead-press', 'Vertical Push', 'barbell', 'Intermediate', ['front_deltoids', 'triceps']),
  ex('fx-pull-up', 'Vertical Pull', 'pullup', 'Intermediate', ['lats', 'biceps']),
  ex('fx-barbell-row', 'Horizontal Pull', 'barbell', 'Intermediate', ['lats', 'biceps']),
  ex('fx-back-squat', 'Squat / Knee Dominant', 'barbell', 'Intermediate', ['quadriceps', 'glutes']),
  ex('fx-air-squat', 'Squat / Knee Dominant', 'bodyweight', 'Beginner', ['quadriceps']),
  ex('fx-deadlift', 'Hinge / Hip Dominant', 'barbell', 'Intermediate', ['hamstrings', 'glutes', 'upper_back']),
  ex('fx-box-jump', 'Power / Plyometric', 'plyobox', 'Intermediate', ['quadriceps']),
  ex('fx-plank', 'Core', 'bodyweight', 'Beginner', ['rectus_abdominis']),
  ex('fx-curl', 'Elbow Flexion', 'dumbbell', 'Beginner', ['biceps']),
];

/** Bodyweight needs nothing; everything else needs its own equipment id. */
const canDo = (e, owned) => e.equipId === 'bodyweight' || owned.includes(e.equipId);

const ctx = (over = {}) =>
  contextFrom({
    owned: over.owned ?? ['barbell', 'dumbbell', 'pullup', 'plyobox', 'rings'],
    canDo,
    experience: over.experience ?? 'advanced',
    limitations: over.limitations ?? [],
    limitationPatterns,
    excludeExercises: over.excludeExercises ?? [],
    used: over.used ?? new Set(),
  });

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT — the filter the whole design rests on
// ─────────────────────────────────────────────────────────────────────────────

test('an exercise the athlete has no equipment for is never offered', () => {
  const keys = candidatesFor('Horizontal Push', POOL, ctx({ owned: ['dumbbell'] })).map((e) => e.key);
  assert.deepEqual(keys.sort(), ['fx-dumbbell-press', 'fx-push-up'], 'barbell and rings are not in the room');
});

test('a bodyweight-only athlete still gets what needs nothing', () => {
  const c = ctx({ owned: [] });
  assert.deepEqual(candidatesFor('Horizontal Push', POOL, c).map((e) => e.key), ['fx-push-up']);
  assert.deepEqual(candidatesFor('Squat / Knee Dominant', POOL, c).map((e) => e.key), ['fx-air-squat']);
  assert.deepEqual(candidatesFor('Vertical Pull', POOL, c), [], 'no bar, no vertical pull — and that is the honest answer');
});

// ─────────────────────────────────────────────────────────────────────────────
// DIFFICULTY — a ceiling, not a preference
// ─────────────────────────────────────────────────────────────────────────────

test('an exercise above the athlete is barred, not merely ranked down', () => {
  const keys = candidatesFor('Horizontal Push', POOL, ctx({ experience: 'beginner' })).map((e) => e.key);
  assert.ok(!keys.includes('fx-barbell-bench'), 'Intermediate is above a beginner');
  assert.ok(!keys.includes('fx-ring-fly'), 'Advanced certainly is');
  assert.deepEqual(keys.sort(), ['fx-dumbbell-press', 'fx-push-up']);
});

test('an advanced athlete is still offered easy movements', () => {
  // The inverse failure would be absurd: an advanced lifter who can no longer be prescribed a push-up.
  const keys = candidatesFor('Horizontal Push', POOL, ctx({ experience: 'advanced' })).map((e) => e.key);
  assert.ok(keys.includes('fx-push-up'));
  assert.equal(keys[0], 'fx-ring-fly', 'but the hardest, broadest movement leads');
});

// ─────────────────────────────────────────────────────────────────────────────
// EXCLUSIONS
// ─────────────────────────────────────────────────────────────────────────────

test('a limitation removes its patterns', () => {
  const c = ctx({ limitations: ['shoulders'] });
  assert.deepEqual(candidatesFor('Vertical Push', POOL, c), [], 'shoulders takes overhead pressing');
  assert.ok(candidatesFor('Horizontal Push', POOL, c).length > 0, 'and leaves flat pressing, deliberately');
});

test('knees takes the landing, not the squat', () => {
  const c = ctx({ limitations: ['knees'] });
  assert.deepEqual(candidatesFor('Power / Plyometric', POOL, c), []);
  assert.ok(
    candidatesFor('Squat / Knee Dominant', POOL, c).length > 0,
    'excluding squats to protect knees would delete leg training to solve a problem it usually is not',
  );
});

test('a named exercise is left out without touching its pattern', () => {
  const c = ctx({ excludeExercises: ['fx-barbell-bench'] });
  const keys = candidatesFor('Horizontal Push', POOL, c).map((e) => e.key);
  assert.ok(!keys.includes('fx-barbell-bench'));
  assert.ok(keys.length > 0);
});

test('a movement already used in the day does not come round again', () => {
  const c = ctx({ owned: ['dumbbell'], used: new Set(['fx-dumbbell-press']) });
  assert.deepEqual(candidatesFor('Horizontal Push', POOL, c).map((e) => e.key), ['fx-push-up']);
});

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISM — same answers, same program, every time
// ─────────────────────────────────────────────────────────────────────────────

test('the same constraints produce the same order every time', () => {
  const a = candidatesFor('Horizontal Push', POOL, ctx()).map((e) => e.key);
  const b = candidatesFor('Horizontal Push', [...POOL].reverse(), ctx()).map((e) => e.key);
  assert.deepEqual(a, b, 'pool order must not leak into the result — a reproducible plan or none');
});

// ─────────────────────────────────────────────────────────────────────────────
// RELAXATION — the smallest available lie, or nothing
// ─────────────────────────────────────────────────────────────────────────────

test('a slot falls back to its nearest neighbour before giving up', () => {
  // No bar and no rings: vertical pull is impossible, horizontal pull is not.
  const got = fillSlot('Vertical Pull', POOL, ctx({ owned: ['barbell'] }));
  assert.equal(got.exercise.key, 'fx-barbell-row');
  assert.equal(got.pattern, 'Horizontal Pull');
  assert.equal(got.relaxed, true, 'the assembler needs to know this was a substitution, not a match');
});

test('a slot that can be filled properly is not relaxed', () => {
  const got = fillSlot('Horizontal Push', POOL, ctx({ owned: ['dumbbell'] }));
  assert.equal(got.relaxed, false);
  assert.equal(got.pattern, 'Horizontal Push');
});

test('a slot with no honest neighbour returns nothing rather than something wrong', () => {
  const got = fillSlot('Vertical Pull', POOL, ctx({ owned: [] }));
  assert.equal(got, null, 'a thinner day beats a day that trains a different thing and claims it did not');
});

test('patterns with an empty ladder never substitute', () => {
  assert.deepEqual(patternLadder('Core'), ['Core']);
  assert.deepEqual(patternLadder('Mobility'), ['Mobility']);
  assert.equal(patternLadder('Vertical Push')[1], 'Horizontal Push');
});

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE
// ─────────────────────────────────────────────────────────────────────────────

test('compound and isolation are told apart from the catalogue vocabulary', () => {
  assert.ok(isCompound('Squat / Knee Dominant'));
  assert.ok(isCompound('Horizontal Push'));
  assert.ok(!isCompound('Elbow Flexion'));
  assert.ok(!isCompound('Core'));
});

test('what the athlete can train at all is answerable before anything is built', () => {
  const bare = trainablePatterns(POOL, ctx({ owned: [] }));
  assert.ok(bare.has('Horizontal Push'));
  assert.ok(bare.has('Squat / Knee Dominant'));
  assert.ok(bare.has('Core'));
  assert.ok(!bare.has('Vertical Pull'), 'the wizard can say what is missing up front, not in week 3');

  const gym = trainablePatterns(POOL, ctx());
  assert.ok(gym.size > bare.size);
});
