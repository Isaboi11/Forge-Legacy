/**
 * The guided builder's step list and its small rules.
 *
 * ══ WHAT THIS SUITE IS ACTUALLY GUARDING ══
 *
 * Not "does the array have seven entries". The failure this exists to catch is the one the screen
 * cannot show you: a step list that SKIPS a question the engine then assumes an answer for. That
 * builds a plausible program for the wrong athlete, renders perfectly, and passes `tsc`.
 *
 * The other half is the day-count/split contract. `stylesForDays` refuses the misshapen combinations,
 * so every day count this file offers must have at least one legal split — otherwise the style screen
 * renders empty and the flow dead-ends on a question with no answers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GUIDED_MAX_WEEKS,
  GUIDED_MIN_WEEKS,
  clampWeeks,
  dayCountOptions,
  daysBlurb,
  remindDefault,
  stepsFor,
  weekPresets,
} from '../guided-steps.ts';
import { stylesForDays } from '../../coach/rulebook/skeletons.ts';

test('the goal is asked only when the profile has not answered it', () => {
  assert.deepEqual(stepsFor({ askGoal: true })[0], 'goal');
  assert.ok(!stepsFor({ askGoal: false }).includes('goal'));
});

test('a shorter flow, never a rearranged one', () => {
  const withGoal = stepsFor({ askGoal: true });
  const without = stepsFor({ askGoal: false });
  // Dropping the optional card must leave the remaining questions in exactly their original order.
  assert.deepEqual(withGoal.filter((s) => s !== 'goal'), without);
  assert.equal(withGoal.length, without.length + 1);
});

test('review is always last, and is the only screen that can save', () => {
  for (const askGoal of [true, false]) {
    const steps = stepsFor({ askGoal });
    assert.equal(steps.at(-1), 'review');
    assert.equal(steps.filter((s) => s === 'review').length, 1);
  }
});

test('every question the engine needs is asked or known', () => {
  // `assemble` cannot proceed without a goal, a day count and a split. Weeks and the name have
  // defaults; reminders are not the engine's business at all.
  const steps = stepsFor({ askGoal: true });
  for (const required of ['goal', 'days', 'style']) {
    assert.ok(steps.includes(required), `the flow never asks for ${required}`);
  }
});

test('every offered day count has at least one legal split', () => {
  // A day count with no buildable style would render an empty question and dead-end the flow.
  for (const n of dayCountOptions()) {
    const styles = stylesForDays(n);
    assert.ok(styles.length > 0, `${n} days a week offers no split at all`);
  }
});

test('every offered day count says what it gets you', () => {
  for (const n of dayCountOptions()) {
    assert.ok(daysBlurb(n).length > 0, `${n} days has no blurb, so the choice is bare arithmetic`);
  }
});

test('the week presets are inside the range, and are a shortcut rather than the range itself', () => {
  for (const w of weekPresets()) {
    assert.ok(w >= GUIDED_MIN_WEEKS && w <= GUIDED_MAX_WEEKS);
  }
  // The point of the stepper: the presets must NOT be the only reachable answers.
  assert.ok(GUIDED_MAX_WEEKS > Math.max(...weekPresets()));
  assert.ok(GUIDED_MIN_WEEKS < Math.min(...weekPresets()));
});

test('weeks clamp to the same 1–52 the dense builder offers', () => {
  assert.equal(clampWeeks(0), 1);
  assert.equal(clampWeeks(-9), 1);
  assert.equal(clampWeeks(999), 52);
  assert.equal(clampWeeks(6), 6);
  assert.equal(clampWeeks(7.4), 7);
});

test('reminder days are spread, not the first N in a row', () => {
  // Three consecutive days is the arrangement most likely to be abandoned; pre-ticking it would be
  // recommending it. Anything below six days must leave a gap somewhere.
  for (const n of [2, 3, 4, 5]) {
    const days = remindDefault(n);
    assert.equal(days.length, n, `${n} days a week pre-ticked ${days.length} reminders`);
    const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
    assert.ok(!consecutive, `${n} days pre-ticked a solid run: ${days.join(',')}`);
  }
});

test('reminder days are valid ISO weekdays, ascending and unique', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const days = remindDefault(n);
    assert.deepEqual([...days].sort((a, b) => a - b), days, 'not ascending');
    assert.equal(new Set(days).size, days.length, 'a day was pre-ticked twice');
    for (const d of days) assert.ok(d >= 1 && d <= 7, `${d} is not an ISO weekday`);
  }
});

test('an out-of-range day count still returns something usable', () => {
  // The screen clamps to 2–6, but a stale draft or a future edit must not produce an empty schedule.
  assert.ok(remindDefault(0).length > 0);
  assert.ok(remindDefault(99).length > 0);
});

test('the recommended day count follows experience, and unknown stays at the easiest to keep', async () => {
  const { recommendedDays, dayCountOptions } = await import('../guided-steps.ts');
  assert.equal(recommendedDays('beginner'), 3);
  assert.equal(recommendedDays('intermediate'), 4);
  assert.equal(recommendedDays('advanced'), 5);
  assert.equal(recommendedDays(null), 3);
  assert.equal(recommendedDays(undefined), 3);
  // Every recommendation must be a tile that exists, or the badge silently draws nowhere.
  for (const e of ['beginner', 'intermediate', 'advanced', null]) {
    assert.ok(dayCountOptions().includes(recommendedDays(e)), `${e} recommends a day count with no tile`);
  }
});
