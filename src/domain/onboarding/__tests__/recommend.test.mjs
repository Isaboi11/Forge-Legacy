import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRecommendationId, intendedProgramId, accessFor, canRecommend, FALLBACK_ID, ADVANCED_ID } from '../recommend-core.ts';

const SF_I = FALLBACK_ID; // strength-foundation-i-3day
const SF_II = ADVANCED_ID; // strength-foundation-ii-4day

/**
 * "Home Gym" is one checkbox spanning a pair of bands and a fully-kitted garage. Once a real profile
 * exists, the gear decides the tier — otherwise both athletes get the same program.
 */
test('a real Home Gym profile refines the "homegym" answer instead of guessing', () => {
  assert.equal(accessFor(['homegym'], null), 'home', 'no profile — the checkbox stands alone');
  assert.equal(accessFor(['homegym'], ['barbell', 'rack']), 'gym', 'a bar and a rack runs barbell programming');
  assert.equal(accessFor(['homegym'], ['barbell', 'bench']), 'gym');
  assert.equal(accessFor(['homegym'], ['dumbbells']), 'home');
  assert.equal(accessFor(['homegym'], ['barbell']), 'home', 'a loose bar with nothing to rack it on is not a gym');
  assert.equal(accessFor(['homegym'], ['bands', 'mat', 'pullup']), 'bodyweight');
  assert.equal(accessFor(['homegym'], []), 'bodyweight', 'an empty profile is a real answer');
});

test('a home profile never downgrades someone who said they have a full gym', () => {
  assert.equal(accessFor(['fullgym'], []), 'gym', 'their commercial gym is not described by their garage');
  assert.equal(accessFor(['fullgym', 'homegym'], []), 'gym');
});

/**
 * The tier reaches a different INTENDED program — but with only SF I + SF II authored, the alias table
 * collapses both onto Strength Foundation I today. Asserting the delivered program differs would be
 * asserting a thin catalog's accident; asserting the intent differs is the real, durable claim.
 */
test('the refined tier reaches a different intended program (catalog willing)', () => {
  const base = { experience: 'beginner', primaryGoal: 'strength' };
  const bare = intendedProgramId({ ...base, equipment: ['homegym'], homeGym: ['bands'] });
  const kitted = intendedProgramId({ ...base, equipment: ['homegym'], homeGym: ['barbell', 'rack', 'bench'] });
  assert.notEqual(bare, kitted, 'otherwise the profile would be decorative');
  assert.equal(kitted, 'strength-foundation-1');
  assert.equal(bare, 'fbh-bodyweight-basics');

  assert.equal(
    resolveRecommendationId({ ...base, equipment: ['homegym'], homeGym: ['bands'] }),
    resolveRecommendationId({ ...base, equipment: ['homegym'], homeGym: ['barbell', 'rack', 'bench'] }),
    'both still resolve to SF I — a 2-program catalog, not a broken tier. Revisit when the catalog grows.',
  );
});

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

/**
 * The invariant above is exactly why `canRecommend` cannot be written in terms of it: a fallback makes
 * "an answer exists" true for every input, including the endurance athlete handed a barbell program.
 */
test('canRecommend — false on the real 2-program catalog', () => {
  assert.equal(canRecommend([SF_I, SF_II]), false, 'strength is answered; the other five goals are not');
  assert.equal(canRecommend([]), false);
});

test('canRecommend — a goal is unanswered until its own programs exist', () => {
  // Everything the intake can intend across all 6 goals × 3 experiences × 3 access tiers.
  const goals = ['strength', 'muscle', 'fatloss', 'endurance', 'health', 'athletic'];
  const equips = [['fullgym'], ['dumbbells'], []];
  const whole = [
    ...new Set(
      goals.flatMap((primaryGoal) =>
        ['beginner', 'intermediate', 'advanced'].flatMap((experience) =>
          equips.map((equipment) => intendedProgramId({ primaryGoal, experience, equipment })),
        ),
      ),
    ),
  ];
  assert.equal(canRecommend(whole), true, 'the whole intended catalog answers every question asked');

  // Drop any single one and the on-ramp closes again — no goal is optional. The three strength ids are
  // excluded because CATALOG_ALIAS answers them without the catalog holding them (next test).
  const aliased = ['strength-foundation-1', 'strength-powerbuilding-1', 'strength-531'];
  for (const missing of whole.filter((id) => !aliased.includes(id))) {
    assert.equal(
      canRecommend(whole.filter((id) => id !== missing)),
      false,
      `${missing} missing should close the on-ramp`,
    );
  }
});

/**
 * The strength ids are ALIASED rather than authored (SF I/II stand in for the design's three), and an
 * alias is a deliberate answer — unlike the fallback, which is what happens when there is none.
 */
test('canRecommend — a deliberate alias counts as answered, the fallback does not', () => {
  const nonStrength = [
    'mb-arms-aesthetics', 'mb-hypertrophy-block', 'mb-ppl', 'mb-upper-lower',
    'run-c25k', 'run-10k', 'run-half-base',
    'cond-hiit', 'cond-circuit', 'cond-metcon', 'cond-engine',
    'fbh-full-body-3', 'fbh-bodyweight-basics', 'fbh-dumbbell-only', 'fbh-home-minimalist',
  ];
  // The three strength ids are never in the catalog — only CATALOG_ALIAS reaches them — so this passing
  // proves the alias is what carries strength.
  assert.equal(canRecommend(nonStrength), true);
});
