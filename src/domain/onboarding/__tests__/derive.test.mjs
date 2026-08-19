import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  athleteTypeForGoal,
  coachEnvironmentFor,
  coachGoalForGoalId,
  environmentForEquipment,
  firstNameOf,
  homeGymForEquipment,
  initialsOf,
} from '../derive.ts';

test('athleteTypeForGoal — ONB-D8 map over the 6 design goals', () => {
  assert.equal(athleteTypeForGoal('strength'), 'Strength');
  assert.equal(athleteTypeForGoal('muscle'), 'Bodybuilding');
  assert.equal(athleteTypeForGoal('endurance'), 'Endurance');
  assert.equal(athleteTypeForGoal('fatloss'), 'Hybrid');
  assert.equal(athleteTypeForGoal('health'), 'Hybrid');
  assert.equal(athleteTypeForGoal('athletic'), 'Hybrid');
  assert.equal(athleteTypeForGoal(null), 'Hybrid'); // safe catch-all
});

test('environmentForEquipment — richest access wins', () => {
  assert.equal(environmentForEquipment(['fullgym']), 'commercial_gym');
  assert.equal(environmentForEquipment(['bodyweight', 'homegym']), 'home_gym');
  assert.equal(environmentForEquipment(['dumbbells', 'bands']), 'dumbbells_only');
  assert.equal(environmentForEquipment(['bands']), 'bodyweight');
  assert.equal(environmentForEquipment(['bodyweight']), 'bodyweight');
  assert.equal(environmentForEquipment(['fullgym', 'dumbbells', 'bodyweight']), 'commercial_gym');
});

/* ── What onboarding hands Coach Holt ────────────────────────────────────────────────────────────────
   The three functions below are the entire bridge between the onboarding vocabulary and the coach's, and
   every one of them can be wrong in a way that is invisible on screen: a wrong goal builds a confident
   program for the wrong outcome, a wrong equipment list prescribes a barbell to somebody who owns a mat.
   ───────────────────────────────────────────────────────────────────────────────────────────────────── */

test('coachGoalForGoalId — maps the four that determine a coach goal', () => {
  assert.equal(coachGoalForGoalId('strength'), 'strength');
  assert.equal(coachGoalForGoalId('muscle'), 'muscle');
  assert.equal(coachGoalForGoalId('fatloss'), 'weight_loss');
  assert.equal(coachGoalForGoalId('health'), 'health');
});

test('coachGoalForGoalId — REFUSES the two it cannot determine, rather than guessing', () => {
  // Five race goals sit behind this one bucket, and the plan is built backwards from a date the athlete
  // has not given. Guessing run_5k would produce a real, wrong, fully-confident program.
  assert.equal(coachGoalForGoalId('endurance'), null);
  // 'athletic' spans conditioning and strength, and `conditioning` is authored-but-not-offered.
  assert.equal(coachGoalForGoalId('athletic'), null);
  assert.equal(coachGoalForGoalId(null), null);
  assert.equal(coachGoalForGoalId(undefined), null);
});

test('coachGoalForGoalId — a refused goal still derives an Athlete Type', () => {
  // The two are independent by design: the Rank mapping is coarse and correct at its own grain, so
  // refusing to name a coach goal must not also blank the athlete's type.
  assert.equal(coachGoalForGoalId('endurance'), null);
  assert.equal(athleteTypeForGoal('endurance'), 'Endurance');
  assert.equal(coachGoalForGoalId('athletic'), null);
  assert.equal(athleteTypeForGoal('athletic'), 'Hybrid');
});

test('coachEnvironmentFor — the profile buckets collapse to the coach vocabulary', () => {
  assert.equal(coachEnvironmentFor('commercial_gym'), 'full_gym');
  assert.equal(coachEnvironmentFor('home_gym'), 'home');
  // No coach equivalent — expressed as `home` plus an owned list of exactly dumbbells.
  assert.equal(coachEnvironmentFor('dumbbells_only'), 'home');
  assert.equal(coachEnvironmentFor('bodyweight'), 'bodyweight');
});

test('homeGymForEquipment — null where the bucket says nothing about OWNERSHIP', () => {
  // Access, not ownership: `equipmentForEnvironment('full_gym', …)` already grants the gym inventory.
  assert.equal(homeGymForEquipment(['fullgym']), null);
  // A garage holds anything from a band to a rack, so the bucket alone is not an answer.
  assert.equal(homeGymForEquipment(['homegym']), null);
  assert.equal(homeGymForEquipment(['homegym'], null), null);
});

test('homeGymForEquipment — the buckets that DO name their own equipment', () => {
  assert.deepEqual(homeGymForEquipment(['dumbbells']), ['dumbbells']);
  assert.deepEqual(homeGymForEquipment(['bands']), ['bands', 'minibands']);
  assert.deepEqual(homeGymForEquipment(['dumbbells', 'bands']), ['dumbbells', 'bands', 'minibands']);
});

test('homeGymForEquipment — ⚠ bodyweight is [] and NOT null, because they are different answers', () => {
  // 0021 keeps three states apart: null = never set up, [] = "I own nothing", a list = what they own.
  // Collapsing these two would make an athlete who told us they own nothing look like one who never
  // answered, and the Home Gym card would offer to set up a profile they had already filled in.
  const bodyweight = homeGymForEquipment(['bodyweight']);
  assert.deepEqual(bodyweight, []);
  assert.notEqual(bodyweight, null);
});

test('homeGymForEquipment — the gear grid wins for a home setup, and its empty answer is kept', () => {
  assert.deepEqual(homeGymForEquipment(['homegym'], ['barbell', 'rack']), ['barbell', 'rack']);
  // "Nothing but me and the floor" through the grid is a real answer and must survive as [].
  assert.deepEqual(homeGymForEquipment(['homegym'], []), []);
  // Deduped — the grid and the buckets can both name the same id.
  assert.deepEqual(homeGymForEquipment(['homegym'], ['dumbbells', 'dumbbells']), ['dumbbells']);
});

test('homeGymForEquipment — a full gym alongside a home setup still claims no ownership', () => {
  // fullgym is checked first deliberately: somebody with both should not have the gym inventory written
  // into the column that says what they own at home.
  assert.equal(homeGymForEquipment(['fullgym', 'homegym'], ['barbell']), null);
});

test('firstNameOf + initialsOf', () => {
  assert.equal(firstNameOf('Isa Altamirano'), 'Isa');
  assert.equal(firstNameOf('  Marcus  Vale '), 'Marcus');
  assert.equal(firstNameOf('Cher'), 'Cher');
  assert.equal(initialsOf('Isa Altamirano'), 'IA');
  assert.equal(initialsOf('The Forge'), 'TF');
  assert.equal(initialsOf('marcus vale ridge'), 'MV'); // max 2
  assert.equal(initialsOf('cher'), 'C');
});
