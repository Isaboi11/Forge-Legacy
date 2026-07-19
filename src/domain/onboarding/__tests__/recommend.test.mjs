import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRecommendationId, intendedProgramId, accessFor, FALLBACK_ID, ADVANCED_ID } from '../recommend-core.ts';

const SF_I = FALLBACK_ID; // strength-foundation-i-3day
const SF_II = ADVANCED_ID; // strength-foundation-ii-4day

test('accessFor — richest access wins', () => {
  assert.equal(accessFor(['fullgym']), 'gym');
  assert.equal(accessFor(['fullgym', 'bands']), 'gym');
  assert.equal(accessFor(['homegym']), 'home');
  assert.equal(accessFor(['dumbbells']), 'home');
  assert.equal(accessFor(['bands']), 'bodyweight');
  assert.equal(accessFor(['bodyweight']), 'bodyweight');
  assert.equal(accessFor([]), 'bodyweight');
  assert.equal(accessFor(null), 'bodyweight');
  assert.equal(accessFor(undefined), 'bodyweight');
});

test('intendedProgramId — ports the design gym/home/bodyweight map', () => {
  // gym
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'beginner', equipment: ['fullgym'] }), 'strength-foundation-1');
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'intermediate', equipment: ['fullgym'] }), 'strength-powerbuilding-1');
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'advanced', equipment: ['fullgym'] }), 'strength-531');
  assert.equal(intendedProgramId({ primaryGoal: 'muscle', experience: 'intermediate', equipment: ['fullgym'] }), 'mb-hypertrophy-block');
  // home
  assert.equal(intendedProgramId({ primaryGoal: 'muscle', experience: 'beginner', equipment: ['dumbbells'] }), 'fbh-dumbbell-only');
  assert.equal(intendedProgramId({ primaryGoal: 'endurance', experience: 'beginner', equipment: ['homegym'] }), 'run-c25k');
  // bodyweight
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'beginner', equipment: ['bands'] }), 'fbh-bodyweight-basics');
  assert.equal(intendedProgramId({ primaryGoal: 'endurance', experience: 'beginner', equipment: [] }), 'run-c25k');
  // defaults: no goal → health, no experience → beginner
  assert.equal(intendedProgramId({ equipment: ['fullgym'] }), 'fbh-full-body-3');
});

test('resolveRecommendationId — SF II only for gym strength intermediate/advanced', () => {
  assert.equal(resolveRecommendationId({ primaryGoal: 'strength', experience: 'intermediate', equipment: ['fullgym'] }), SF_II);
  assert.equal(resolveRecommendationId({ primaryGoal: 'strength', experience: 'advanced', equipment: ['fullgym'] }), SF_II);
  // gym strength beginner → SF I
  assert.equal(resolveRecommendationId({ primaryGoal: 'strength', experience: 'beginner', equipment: ['fullgym'] }), SF_I);
  // every other goal/experience/access → SF I (thin catalog)
  assert.equal(resolveRecommendationId({ primaryGoal: 'muscle', experience: 'advanced', equipment: ['fullgym'] }), SF_I);
  assert.equal(resolveRecommendationId({ primaryGoal: 'endurance', experience: 'advanced', equipment: ['fullgym'] }), SF_I);
  assert.equal(resolveRecommendationId({ primaryGoal: 'strength', experience: 'intermediate', equipment: ['dumbbells'] }), SF_I); // home, not gym
  assert.equal(resolveRecommendationId({ primaryGoal: 'strength', experience: 'advanced', equipment: [] }), SF_I); // bodyweight
});

test('resolveRecommendationId — invariant: always a real catalog id (SF I or SF II)', () => {
  const goals = ['strength', 'muscle', 'fatloss', 'endurance', 'health', 'athletic'];
  const exps = ['beginner', 'intermediate', 'advanced', null, undefined, 'bogus'];
  const equips = [['fullgym'], ['homegym'], ['dumbbells'], ['bands'], ['bodyweight'], [], null, undefined];
  for (const g of goals) {
    for (const e of exps) {
      for (const q of equips) {
        const id = resolveRecommendationId({ primaryGoal: g, experience: e, equipment: q });
        assert.ok(id === SF_I || id === SF_II, `expected a real id for ${g}/${e}/${q}, got ${id}`);
      }
    }
  }
  // no inputs at all → still a real id
  assert.ok([SF_I, SF_II].includes(resolveRecommendationId({})));
});
