import test from 'node:test';
import assert from 'node:assert/strict';

import { weekHero } from '../rulebook/review.ts';

/**
 * ⚠ THE HEADLINE IS THE RAREST THING THAT HAPPENED, AND THE ORDER IS THE WHOLE RULE.
 *
 * The screen carried a correct objection to promoting the heaviest lift: it is on almost every week, so
 * giving it the largest type would rank the week's most COMMON event above its rarest. `weekHero` answers
 * that by ordering honor → PR → lift, so the lift only ever leads a week that had nothing scarcer.
 *
 * Every test below fails if that order is changed, which is the point of having them.
 */

const week = (over = {}) => ({
  workouts: 3, days_trained: 3, volume_lb: 20000, duration_sec: 7200,
  prs: [], honors: [], top_lift: null, ...over,
});

const LIFT = { name: 'Back Squat', weight: 225, reps: 5 };
const PR = { exercise: 'Bench Press', value: 185 };
const HONOR = { honor: 'Century Club' };

test('an honor outranks everything', () => {
  const h = weekHero(week({ honors: [HONOR], prs: [PR], top_lift: LIFT }));
  assert.equal(h.kind, 'honor');
  assert.equal(h.title, 'Century Club');
});

test('a PR outranks the heaviest lift', () => {
  const h = weekHero(week({ prs: [PR], top_lift: LIFT }));
  assert.equal(h.kind, 'pr');
  assert.equal(h.title, 'Bench Press');
});

test('the ordinary week — no PR, no honor — finally gets a headline', () => {
  const h = weekHero(week({ top_lift: LIFT }));
  assert.equal(h.kind, 'lift');
  assert.equal(h.title, 'Back Squat');
  assert.equal(h.weight, 225);
  assert.equal(h.reps, 5);
});

/**
 * ⚠ `solo` IS WHAT LETS THE SCREEN DROP A SECTION WITHOUT LOSING A ROW. One PR is stated in the largest
 * type on the page; repeating it four inches below is the same fact twice. Two PRs and the section must
 * come back, because the headline named ONE and the other is still owed.
 */
test('solo is true for one, false for many — the section below depends on it', () => {
  assert.equal(weekHero(week({ prs: [PR] })).solo, true);
  assert.equal(weekHero(week({ prs: [PR, { exercise: 'Deadlift', value: 315 }] })).solo, false);
  assert.equal(weekHero(week({ honors: [HONOR] })).solo, true);
  assert.equal(weekHero(week({ honors: [HONOR, { honor: 'Iron Month' }] })).solo, false);
});

/**
 * ⚠ A CARDIO-ONLY WEEK HAS NO HEADLINE, AND MUST NOT BE GIVEN ONE. Inventing "you trained" here would
 * occupy the space of something that says nothing — the same rule `circle-activity.ts` holds for a post
 * with neither words nor a session.
 */
test('a cardio-only week returns null rather than a manufactured headline', () => {
  assert.equal(weekHero(week()), null);
});

/**
 * ⚠ A BODYWEIGHT top_lift IS NOT A HEADLINE. 0140 records what was lifted and a dip carries nothing, so
 * `weight` is null — and "Dip" alone is not worth the largest type on the screen. It stays in its row.
 */
test('a top_lift with no weight does not become the headline', () => {
  assert.equal(weekHero(week({ top_lift: { name: 'Dip', weight: null, reps: 12 } })), null);
});

test('a PR with a null value still leads — the exercise is the fact, the number is not', () => {
  const h = weekHero(week({ prs: [{ exercise: 'Pull-Up', value: null }], top_lift: LIFT }));
  assert.equal(h.kind, 'pr');
  assert.equal(h.title, 'Pull-Up');
  assert.equal(h.weight, null);
});
