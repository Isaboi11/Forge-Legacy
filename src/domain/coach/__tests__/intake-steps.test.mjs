import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intakeSteps } from '../intake-steps.ts';

/**
 * The wizard's question list, now that onboarding answers three of them.
 *
 * ⚠ THE FAILURE THIS FILE EXISTS TO CATCH IS A FLOW THAT STILL WORKS. Skipping a step the profile has
 * NOT answered does not crash and does not fail `tsc` — the athlete is simply never asked, and the
 * engine builds on whatever the screen defaulted to. The only defence is asserting the list itself.
 */

/** Nobody has answered anything — the pre-onboarding-change behaviour, which must be unchanged. */
const FRESH = {
  mode: 'program',
  endurance: false,
  focusKind: null,
  namingGear: false,
  weeklyMi: null,
  askGoal: true,
  askWhere: true,
  askExperience: true,
};

/** Everything onboarding can supply has been supplied. */
const KNOWN = { ...FRESH, askGoal: false, askWhere: false, askExperience: false };

test('an athlete with no profile answers gets exactly the flow that always shipped', () => {
  assert.deepEqual(intakeSteps(FRESH), ['goal', 'days', 'style', 'where', 'time', 'experience', 'limits']);
  assert.deepEqual(intakeSteps({ ...FRESH, mode: 'day', focusKind: 'split' }), [
    'focus',
    'where',
    'time',
    'experience',
    'limits',
  ]);
});

test('a fully-answered profile removes three questions from the program flow, in place', () => {
  assert.deepEqual(intakeSteps(KNOWN), ['days', 'style', 'time', 'limits']);
});

test('a fully-answered profile takes the single-session flow from five questions to three', () => {
  // This is the number the whole change is for: "just today's workout" for somebody who has onboarded.
  assert.deepEqual(intakeSteps({ ...KNOWN, mode: 'day', focusKind: 'split' }), ['focus', 'time', 'limits']);
});

test('⚠ the surviving questions keep their original ORDER, not just their count', () => {
  // A `.filter()` over a fixed list would pass a count assertion while permitting a future reorder.
  const full = intakeSteps(FRESH);
  const trimmed = intakeSteps(KNOWN);
  assert.deepEqual(trimmed, full.filter((s) => !['goal', 'where', 'experience'].includes(s)));
});

test('each skip is independent — a partial profile is asked only for what it is missing', () => {
  assert.deepEqual(intakeSteps({ ...FRESH, askGoal: false }), ['days', 'style', 'where', 'time', 'experience', 'limits']);
  assert.deepEqual(intakeSteps({ ...FRESH, askExperience: false }), ['goal', 'days', 'style', 'where', 'time', 'limits']);
  assert.deepEqual(intakeSteps({ ...FRESH, askWhere: false }), ['goal', 'days', 'style', 'time', 'experience', 'limits']);
});

test('the gear grid rides with `where` and disappears with it', () => {
  assert.deepEqual(intakeSteps({ ...FRESH, namingGear: true }), [
    'goal',
    'days',
    'style',
    'where',
    'gear',
    'time',
    'experience',
    'limits',
  ]);
  // ⚠ A profile-supplied environment must take the grid with it. Leaving `gear` behind would strand a
  // card that only makes sense as a follow-up to the question that no longer gets asked.
  assert.deepEqual(intakeSteps({ ...KNOWN, namingGear: true }), ['days', 'style', 'time', 'limits']);
});

test('⚠ a race plan NEVER skips the goal, however complete the profile is', () => {
  // `coachGoalForGoalId` resolves the coarse `endurance` bucket to null on purpose — five race goals sit
  // behind it. Skipping here would build a 5K plan for somebody training for a marathon.
  const race = intakeSteps({ ...KNOWN, endurance: true, weeklyMi: 15 });
  assert.equal(race[0], 'goal');
  assert.deepEqual(race, ['goal', 'race_when', 'race_base', 'race_result', 'days', 'limits']);
});

test('a race plan still skips experience when the profile has it, and never asks where', () => {
  const fresh = intakeSteps({ ...FRESH, endurance: true, weeklyMi: 15 });
  assert.ok(fresh.includes('experience'));
  // The room is wherever they run — `where` is not part of this flow at all, answered or not.
  assert.ok(!fresh.includes('where'));
  assert.ok(!intakeSteps({ ...KNOWN, endurance: true, weeklyMi: 15 }).includes('experience'));
});

test('the run/walk question appears only for someone whose mileage has not answered it', () => {
  assert.ok(intakeSteps({ ...FRESH, endurance: true, weeklyMi: 0 }).includes('race_can_run'));
  assert.ok(intakeSteps({ ...FRESH, endurance: true, weeklyMi: 3 }).includes('race_can_run'));
  assert.ok(!intakeSteps({ ...FRESH, endurance: true, weeklyMi: 8 }).includes('race_can_run'));
  // ⚠ Unanswered must not read as zero — zero is the one value that WOULD make the question necessary.
  assert.ok(!intakeSteps({ ...FRESH, endurance: true, weeklyMi: null }).includes('race_can_run'));
});

test('picking muscles adds its own card, and does not disturb the skips', () => {
  assert.deepEqual(intakeSteps({ ...KNOWN, mode: 'day', focusKind: 'body_parts' }), [
    'focus',
    'muscles',
    'time',
    'limits',
  ]);
});

test('the chooser draws no steps at all', () => {
  assert.deepEqual(intakeSteps({ ...FRESH, mode: null }), []);
});

test('every returned step is one the screen can draw', () => {
  // Guards against a typo'd literal reaching the screen, where an unknown id renders nothing and the
  // wizard silently stalls on a blank card.
  const DRAWABLE = new Set([
    'goal', 'race_when', 'race_base', 'race_can_run', 'race_result', 'days',
    'style', 'focus', 'muscles', 'where', 'gear', 'time', 'experience', 'limits',
  ]);
  for (const mode of ['program', 'day']) {
    for (const endurance of [true, false]) {
      for (const focusKind of [null, 'split', 'body_parts']) {
        for (const namingGear of [true, false]) {
          for (const askGoal of [true, false]) {
            for (const askWhere of [true, false]) {
              for (const askExperience of [true, false]) {
                const steps = intakeSteps({
                  mode, endurance, focusKind, namingGear, weeklyMi: 5, askGoal, askWhere, askExperience,
                });
                assert.ok(steps.length > 0, 'a chosen mode always asks something');
                assert.equal(new Set(steps).size, steps.length, `duplicate step in ${steps.join(',')}`);
                for (const s of steps) assert.ok(DRAWABLE.has(s), `undrawable step ${s}`);
              }
            }
          }
        }
      }
    }
  }
});
