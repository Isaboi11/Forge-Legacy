import test from 'node:test';
import assert from 'node:assert/strict';

import { firstUnansweredStep, EXPERIENCE_FOR, LEVEL_FOR_EXPERIENCE } from '../../domain/onboarding/intake-seed.ts';

/**
 * The starting-point stepper asked goal, level and equipment a SECOND time — in different words from
 * onboarding ("Get stronger" vs "Get Stronger", "Go further" vs "Improve Endurance") — and wrote its
 * answers only to AsyncStorage. To the athlete that is not a second question; it is the app not having
 * listened the first time.
 *
 * These cover the two halves of the fix: the mapping back to this card's own vocabulary, and where the
 * stepper opens once it knows something.
 */

test('the level mapping round-trips, so a seeded answer selects the tile it came from', () => {
  // If these two ever disagree, an onboarded intermediate opens the card pre-selected as a beginner —
  // which is worse than asking, because a pre-filled answer is one nobody re-reads.
  for (const level of ['new', 'training', 'experienced']) {
    assert.equal(LEVEL_FOR_EXPERIENCE[EXPERIENCE_FOR[level]], level, `${level} did not survive the round trip`);
  }
  for (const exp of ['beginner', 'intermediate', 'advanced']) {
    assert.equal(EXPERIENCE_FOR[LEVEL_FOR_EXPERIENCE[exp]], exp, `${exp} did not survive the round trip`);
  }
});

test('the stepper opens on the first thing it does not already know', () => {
  const seed = (over) => ({ level: null, goals: [], primaryGoal: null, equipment: [], ...over });

  assert.equal(firstUnansweredStep(null), 0, 'knowing nothing starts at the top, as it always did');
  assert.equal(firstUnansweredStep(seed()), 0, 'an empty seed is the same as no seed');
  assert.equal(firstUnansweredStep(seed({ level: 'training' })), 1, 'level known → skip to goals');
  assert.equal(
    firstUnansweredStep(seed({ level: 'training', goals: ['strength'], primaryGoal: 'strength' })),
    2,
    'level and goals known → skip to equipment',
  );
});

test('⚠ a fully seeded athlete still lands on EQUIPMENT rather than a completed form', () => {
  // Equipment is the answer most likely to have gone stale — people move gyms, a garage gains a rack —
  // and finishing on their behalf from stored answers they never revisited is how a recommendation ends
  // up built on last year's setup.
  const full = { level: 'experienced', goals: ['muscle'], primaryGoal: 'muscle', equipment: ['fullgym'] };
  assert.equal(firstUnansweredStep(full), 2);
});

/*
 * ⚠ RETIRED 2026-09-21 — "equipment is never seeded from the profile". It read Home's `intakeSeed` block,
 * and Home no longer carries the intake stepper at all (`Onboarding-Amendment-006` ONB-A6-D1 replaced
 * the starting-point slot with GET STARTED). The rule it guarded still holds for any future caller that
 * seeds this stepper: `equipment: []`, never mapped back from the coach's coarse `environment`.
 */
