import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalizeWeights, buildSaveExercises } from '../save-core.ts';
import { detectPRs } from '../metrics.ts';
import { displayWeight, toCanonicalLb, weightInExact } from '../../settings/units.ts';

/**
 * ⚠ STORAGE IS POUNDS. THE ATHLETE TYPES IN THEIR OWN SYSTEM. THOSE ARE TWO DIFFERENT NUMBERS.
 *
 * The logger holds what was typed — on metric, kilograms — and used to hand that straight to
 * `buildSaveExercises`, which stamped `weight_unit: 'lb'` on it. So 100 kg went into the database as the
 * number 100 labelled pounds, and every layer downstream believed it.
 *
 * That produced two opposite symptoms, which is why it survived so long:
 *   · a screen that CONVERTED the stored figure showed 45% of the truth (the Weekly Review);
 *   · a screen that showed it RAW was accidentally right, so most of the app looked fine.
 *
 * And it broke records silently: `detectPRs` compares session weights against `priorBest`, which is read
 * FROM `personal_records` in pounds — so a metric athlete's 100 was measured against a stored 225.
 */

const set = (i, weight, o = {}) => ({
  setIndex: i, weight, targetReps: 5, actualReps: 5, done: true, saved: false, ...o,
});
const ex = (name, position, sets, kind = 'strength') => ({
  name, kind, position, sets,
  catalogKey: `k-${name}`, note: null, section: 'main',
  groupId: null, groupName: null, groupKind: null, groupRounds: null,
  prescribedName: null, prescribedCatalogKey: null,
});

test('imperial is the exact identity — nothing moves for anyone today', () => {
  const session = { exercises: [ex('Back Squat', 0, [set(0, 225), set(1, 245)])] };
  assert.equal(canonicalizeWeights(session, 'imperial'), session, 'same object, no churn');
  assert.equal(toCanonicalLb(225, 'imperial'), 225);
  assert.equal(toCanonicalLb(0, 'imperial'), 0);
});

test('a metric athlete’s typed kilos are stored as pounds', () => {
  const session = { exercises: [ex('Back Squat', 0, [set(0, 100)])] };
  const rows = buildSaveExercises(canonicalizeWeights(session, 'metric'));
  const stored = rows[0].sets[0];

  assert.equal(stored.weight_unit, 'lb', 'the label was always lb — now the number matches it');
  assert.ok(Math.abs(stored.weight - 220.462) < 0.01, `100 kg must store as ~220.46 lb, got ${stored.weight}`);
  // The defect, stated as the thing that must never happen again:
  assert.notEqual(stored.weight, 100, 'storing the typed number under an lb label is the bug');
});

test('the round trip returns the athlete their own number', () => {
  // This is the property that matters: type 100 kg, read it back, see 100 kg.
  for (const typed of [60, 82.5, 100, 142.5]) {
    const lb = toCanonicalLb(typed, 'metric');
    assert.ok(Math.abs(weightInExact(lb, 'metric') - typed) < 1e-9, `${typed} kg must round-trip exactly`);
    assert.equal(displayWeight(lb, 'metric').value, Math.round(typed), `${typed} kg displays as itself`);
    assert.equal(displayWeight(lb, 'metric').unit, 'kg');
  }
});

test('an imperial athlete reads pounds back unchanged', () => {
  const lb = toCanonicalLb(225, 'imperial');
  assert.equal(lb, 225);
  assert.deepEqual(displayWeight(lb, 'imperial'), { value: 225, unit: 'lb' });
});

test('⚠ a metric athlete’s REAL record was being missed, because kilos read small beside pounds', () => {
  /*
   * This is the shape of the harm, and it is the quiet direction: a metric athlete lifts 100 kg — 220 lb,
   * comfortably past their 150 lb best — and the old comparison put the number 100 against the number
   * 150, decided it was lighter, and said nothing. The athlete set a personal record and the app did not
   * notice. No error, no wrong figure on screen; just a milestone that never happened.
   */
  const priorBest = { 'k-Back Squat': 150 }; // pounds, read from `personal_records`
  const session = { exercises: [ex('Back Squat', 0, [set(0, 100)])] }; // 100 kg ≈ 220.5 lb

  const asTyped = detectPRs(session, priorBest); // the old shape: typed kilos vs stored pounds
  const canonical = detectPRs(canonicalizeWeights(session, 'metric'), priorBest);

  assert.equal(asTyped.length, 0, 'the defect: 100 < 150, so a genuine 220 lb record was missed');
  assert.equal(canonical.length, 1, '220.5 lb beats 150 lb and must be announced');
  assert.ok(canonical[0].weight > 150, 'the recorded figure is in pounds, like the table it is compared against');
});

test('and the loud direction too — a lift that only LOOKS like a record is not announced', () => {
  // The mirror image: on imperial nothing changes, so this guards the comparison itself rather than the
  // conversion. 100 kg (≈220 lb) against a 225 lb best is not a record, and must not be sold as one.
  const priorBest = { 'k-Back Squat': 225 };
  const session = { exercises: [ex('Back Squat', 0, [set(0, 100)])] };
  assert.equal(detectPRs(canonicalizeWeights(session, 'metric'), priorBest).length, 0);
});

test('a genuine metric PR is still caught', () => {
  const priorBest = { 'k-Back Squat': 225 };
  const session = { exercises: [ex('Back Squat', 0, [set(0, 110)])] }; // 110 kg ≈ 242.5 lb
  const prs = detectPRs(canonicalizeWeights(session, 'metric'), priorBest);
  assert.equal(prs.length, 1, '110 kg beats 225 lb and must be announced');
  assert.ok(prs[0].weight > 225, 'the recorded figure is in pounds, like the table it is compared against');
});

test('only weight moves — reps, duration, distance and flags are carried through', () => {
  const session = {
    exercises: [
      ex('Plank', 0, [set(0, null, { targetSec: 60, durationSec: 60, actualReps: null })]),
      ex('Treadmill', 1, [set(0, null, { durationSec: 900, distanceMi: 1.5, modality: 'indoor' })], 'cardio'),
      ex('Back Squat', 2, [set(0, 100, { saved: true })]),
    ],
  };
  const out = canonicalizeWeights(session, 'metric');

  assert.equal(out.exercises[0].sets[0].weight, null, 'a null weight stays null, never 0');
  assert.equal(out.exercises[0].sets[0].durationSec, 60);
  assert.equal(out.exercises[1].sets[0].distanceMi, 1.5, 'distance is already canonical miles (0096)');
  assert.equal(out.exercises[1].sets[0].modality, 'indoor');
  assert.equal(out.exercises[2].sets[0].saved, true, 'the already-committed flag survives');
  assert.equal(out.exercises.length, 3);
  assert.equal(session.exercises[2].sets[0].weight, 100, 'the input session is not mutated');
});

test('bodyweight 0 is preserved, not turned into a fraction', () => {
  const session = { exercises: [ex('Pull-up', 0, [set(0, 0)])] };
  const out = canonicalizeWeights(session, 'metric');
  assert.equal(out.exercises[0].sets[0].weight, 0, '0 is "bodyweight", a real value, and must stay exactly 0');
});
