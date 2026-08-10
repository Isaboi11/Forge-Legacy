/**
 * per-side-core.test.mjs — which lifts are counted one side at a time, and what that does to volume.
 *
 * ══ THE TWO FAILURES THIS SITS BETWEEN ══
 *
 * MISSING IT understates the work: eight curls per arm at 30 lb is 480 lb moved and the app counted 240,
 * and the athlete reading "3 × 10" on a split squat does thirty reps where sixty were prescribed. That is
 * the reported bug (PO, 2026-08-09).
 *
 * CLAIMING IT FALSELY is worse. Labelling a barbell back squat "per leg" doubles a number that should not
 * move, on a screen the athlete has no reason to doubt. A miss is a gap; a false positive is a confident
 * lie. So the matcher is deliberately conservative and the largest block of tests below is the things it
 * must NOT match.
 *
 * Run:  node --test --experimental-strip-types src/domain/workout/__tests__/per-side-core.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { perSideFor, sidesFor } from '../per-side-core.ts';
import { sessionVolume } from '../metrics.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IT MUST CATCH
// ─────────────────────────────────────────────────────────────────────────────

test('single-arm work is per arm', () => {
  for (const name of [
    'Single-Arm Dumbbell Row',
    'Single Arm Overhead Press',
    'One-Arm Dumbbell Snatch',
    'Suitcase Carry',
    'Renegade Row',
  ]) {
    assert.equal(perSideFor(name), 'arm', name);
  }
});

test('single-leg work is per leg, including the names that never say "single"', () => {
  // A lunge, a split squat and a step-up put one leg under the load per rep and are counted per leg by
  // every coach who has written one down — and not one of them contains the word.
  for (const name of [
    'Bulgarian Split Squat',
    'Walking Lunge',
    'Reverse Lunge',
    'Dumbbell Step-Up',
    'Assisted Pistol Squat',
    'Single-Leg Romanian Deadlift',
    'Cossack Squat',
    'Skater Squat',
  ]) {
    assert.equal(perSideFor(name), 'leg', name);
  }
});

test('alternating work is per side', () => {
  assert.equal(perSideFor('Alternating Dumbbell Curl'), 'side');
  assert.equal(perSideFor('Alternate Dumbbell Bench Press'), 'side');
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IT MUST NOT CATCH — the expensive direction
// ─────────────────────────────────────────────────────────────────────────────

test('an ordinary two-sided lift is never labelled', () => {
  for (const name of [
    'Barbell Back Squat',
    'Barbell Bench Press',
    'Barbell Deadlift',
    'Dumbbell Bench Press',
    'Dumbbell Curl',
    'Overhead Press',
    'Pull-Up',
    'Push-Up',
    'Leg Press',
    'Lat Pulldown',
    'Romanian Deadlift',
    'Front Squat',
    'Barbell Row',
    'Farmer Carry',
    'Plank',
  ]) {
    assert.equal(perSideFor(name), null, `${name} must not be called single-sided`);
  }
});

test('an empty or unknown name says nothing rather than guessing', () => {
  assert.equal(perSideFor(''), null);
  assert.equal(perSideFor('Some Movement Nobody Has Named Yet'), null);
});

test('every unilateral-looking row in the real catalogue is caught, and no bilateral one is', () => {
  // The whole catalogue, so a naming pass that adds a movement cannot quietly slip past the matcher.
  const db = JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source/exercises.json'), 'utf8'));
  const rows = Array.isArray(db) ? db : (db.exercises ?? Object.values(db)[0]);

  // Names that unambiguously state one side. If any of these comes back null the matcher has a hole.
  const obviouslyUnilateral = rows.filter((e) => /\b(single[- ](arm|leg)|one[- ](arm|leg)|bulgarian|pistol|suitcase|renegade)\b/i.test(e.name));
  assert.ok(obviouslyUnilateral.length > 10, 'expected the catalogue to contain unilateral work');
  const missed = obviouslyUnilateral.filter((e) => perSideFor(e.name) == null).map((e) => e.name);
  assert.deepEqual(missed, [], 'unilateral movements the matcher does not recognise');

  // And the reverse: a barbell lift is never single-sided, whatever else its name contains.
  const barbellBilateral = rows.filter(
    (e) => /^Barbell /i.test(e.name) && !/single|one[- ]|alternating|lunge|split squat|step[- ]up|suitcase/i.test(e.name),
  );
  const wrong = barbellBilateral.filter((e) => perSideFor(e.name) != null).map((e) => `${e.name} → ${perSideFor(e.name)}`);
  assert.deepEqual(wrong, [], 'bilateral barbell lifts labelled as single-sided');
});

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME — and the number that must NOT move
// ─────────────────────────────────────────────────────────────────────────────

const set = (weight, reps) => ({ setIndex: 0, weight, targetReps: reps, actualReps: reps, done: true });

test('a per-side lift counts both sides in volume', () => {
  // The PO's example, exactly: 30 lb, 8 reps per arm.
  const v = sessionVolume({
    workoutName: 'x',
    activityType: 'strength',
    startedAt: '2026-08-09T09:00:00.000Z',
    exercises: [{ name: 'Single-Arm Dumbbell Curl', section: 'main', position: 0, per: 'arm', sets: [set(30, 8)] }],
  });
  assert.equal(v, 480, '30 lb × 8 reps × 2 arms');
});

test('a two-sided lift is unchanged — the fix must not inflate everything', () => {
  const v = sessionVolume({
    workoutName: 'x',
    activityType: 'strength',
    startedAt: '2026-08-09T09:00:00.000Z',
    exercises: [{ name: 'Barbell Back Squat', section: 'main', position: 0, sets: [set(225, 5)] }],
  });
  assert.equal(v, 1125, '225 × 5, and not a pound more');
});

test('sides multiply volume and nothing else', () => {
  assert.equal(sidesFor('arm'), 2);
  assert.equal(sidesFor('leg'), 2);
  assert.equal(sidesFor('side'), 2);
  assert.equal(sidesFor(null), 1);
  assert.equal(sidesFor(undefined), 1);
});

test('⚠ the rep count itself is never doubled', () => {
  /*
   * The schema is explicit and correct: doubling `reps` for a per-side item would put twenty in the reps
   * column for a set of ten-a-side and corrupt every e1RM, personal record and history row downstream.
   * Volume is a separate question with a separate answer. This asserts the boundary in the source,
   * because it is a rule about where a multiplier may be applied and there is no value to observe.
   */
  const src = readFileSync(path.join(here, '../metrics.ts'), 'utf8');
  assert.match(src, /v \+= s\.weight \* effectiveReps\(s\) \* sides/, 'volume must account for sides');

  const effective = readFileSync(path.join(here, '../per-side-core.ts'), 'utf8');
  assert.doesNotMatch(effective, /export function effectiveReps/, 'sides must not leak into the rep count');

  // `effectiveReps` returns what was logged, full stop. Sliced to the function BODY — taking everything
  // up to the next `export` swept in `sessionVolume`'s doc comment, which legitimately says "sides", so
  // the test failed on the explanation rather than on the code.
  const start = src.indexOf('export function effectiveReps');
  const body = src.slice(start, src.indexOf('}', start) + 1);
  assert.match(body, /return s\.actualReps \?\? s\.targetReps;/, 'effectiveReps must return the logged reps');
  assert.doesNotMatch(body, /sides|\* 2\b/, 'and must return them unmultiplied');
});
