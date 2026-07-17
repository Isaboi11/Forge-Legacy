import { test } from 'node:test';
import assert from 'node:assert/strict';
import { athleteTypeForGoal, environmentForEquipment, firstNameOf, initialsOf } from '../derive.ts';

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

test('firstNameOf + initialsOf', () => {
  assert.equal(firstNameOf('Isa Altamirano'), 'Isa');
  assert.equal(firstNameOf('  Marcus  Vale '), 'Marcus');
  assert.equal(firstNameOf('Cher'), 'Cher');
  assert.equal(initialsOf('Isa Altamirano'), 'IA');
  assert.equal(initialsOf('The Forge'), 'TF');
  assert.equal(initialsOf('marcus vale ridge'), 'MV'); // max 2
  assert.equal(initialsOf('cher'), 'C');
});
