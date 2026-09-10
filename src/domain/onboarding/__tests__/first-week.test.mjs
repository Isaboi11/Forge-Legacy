import test from 'node:test';
import assert from 'node:assert/strict';

import { constraintsForFirstWeek, dayLines } from '../first-week.ts';
import { isComplete, missingFor, STRENGTH_GOALS, ENDURANCE_GOALS } from '../../coach/constraints.ts';
import { coachGoalForGoalId } from '../derive.ts';

/**
 * The gate between "a new athlete leaves setup holding a real program" and "they leave holding the
 * chooser". Both outcomes are correct for somebody; getting the boundary wrong is what this covers.
 *
 * ⚠ THE ASSERTION THAT MATTERS IS `isComplete()`, NOT A FIELD-BY-FIELD COMPARISON. Hand-checking the
 *   object would pass just as happily against a mapping the ENGINE would still refuse — and `assemble()`
 *   is what actually consumes this. Asking the engine's own predicate is the difference between "the
 *   shape looks right" and "the engine can build from it".
 */

const ANSWERS = {
  goals: ['strength'],
  experience: 'intermediate',
  equipment: ['fullgym'],
  gear: null,
  daysPerWeek: 4,
  sessionMinutes: 60,
};

const withA = (over) => ({ ...ANSWERS, ...over });

// ── the buildable path ───────────────────────────────────────────────────────

test('a fully answered setup produces constraints the ENGINE calls complete', () => {
  const c = constraintsForFirstWeek(ANSWERS);
  assert.ok(c, 'a complete answer set must build');
  assert.deepEqual(missingFor(c), [], 'nothing may still be missing once onboarding has answered');
  assert.ok(isComplete(c), 'assemble() would refuse these constraints');
});

test('every goal the rulebook authors a block for reaches a complete set', () => {
  // Derived from the mapping rather than listed, so a new goal id cannot silently skip this test.
  const buildable = ['strength', 'muscle', 'fatloss', 'health'];
  for (const g of buildable) {
    const c = constraintsForFirstWeek(withA({ goals: [g] }));
    assert.ok(c, `${g} should build`);
    assert.ok(isComplete(c), `${g} produced constraints the engine calls incomplete`);
    assert.ok(
      STRENGTH_GOALS.includes(c.goal),
      `${g} mapped to ${c.goal}, which is not a strength goal — a race plan cannot be built from this flow`,
    );
  }
});

test('the primary goal decides the block, and only the primary', () => {
  // goals[0] is the primary by the same rule the rest of the app uses; the other two are preferences.
  const c = constraintsForFirstWeek(withA({ goals: ['muscle', 'strength', 'health'] }));
  assert.equal(c.goal, 'muscle');
});

test('every experience level and every day count in range stays buildable', () => {
  for (const experience of ['beginner', 'intermediate', 'advanced']) {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      for (const sessionMinutes of [30, 45, 60, 75]) {
        const c = constraintsForFirstWeek(withA({ experience, daysPerWeek, sessionMinutes }));
        assert.ok(c && isComplete(c), `${experience} / ${daysPerWeek}d / ${sessionMinutes}m did not build`);
        assert.equal(c.experience.lifting, experience);
      }
    }
  }
});

// ── the refusals, which are the load-bearing half ────────────────────────────

test('⚠ endurance and athletic REFUSE rather than getting somebody else\'s program', () => {
  // A runner handed a push/pull split is worse than no program, and it is the kind of wrong nobody
  // reports — they just leave. `coachGoalForGoalId` returning null is the whole mechanism.
  for (const g of ['endurance', 'athletic']) {
    assert.equal(coachGoalForGoalId(g), null, `${g} must not map to a strength goal`);
    assert.equal(constraintsForFirstWeek(withA({ goals: [g] })), null, `${g} must refuse`);
  }
});

test('every ENDURANCE goal is unreachable from this flow at all', () => {
  // Not one of the five race goals may be produced here: none of them can be built without a race date,
  // and this flow never asks for one. Guards against a future goal id quietly mapping into that family.
  for (const g of ['strength', 'muscle', 'fatloss', 'health', 'endurance', 'athletic']) {
    const c = constraintsForFirstWeek(withA({ goals: [g] }));
    if (c) assert.ok(!ENDURANCE_GOALS.includes(c.goal), `${g} produced the race goal ${c.goal}`);
  }
});

test('an unanswered step refuses instead of guessing', () => {
  assert.equal(constraintsForFirstWeek(withA({ goals: [] })), null, 'no goal');
  assert.equal(constraintsForFirstWeek(withA({ daysPerWeek: null })), null, 'no day count');
  assert.equal(constraintsForFirstWeek(withA({ sessionMinutes: null })), null, 'no session length');
  /*
   * ⚠ EXPERIENCE ESPECIALLY. Defaulting an advanced lifter to `beginner` would halve their first block's
   * intensity silently — `intensity.test.mjs` asserts a diagonal invariant precisely because that gap is
   * large. Refusing sends them to the chooser, where they pick knowingly.
   */
  assert.equal(constraintsForFirstWeek(withA({ experience: null })), null, 'no experience');
});

// ── the two Environment enums, which are a real trap ─────────────────────────

test('the PROFILE environment is translated to the COACH one, never passed through', () => {
  // `derive.ts` keeps two four-value enums apart on purpose. `dumbbells_only` has no coach member at
  // all — the coach expresses it as `home` plus an owned list — so a pass-through would be silently
  // wrong for exactly one bucket rather than obviously wrong for all of them.
  const COACH_ENVS = ['full_gym', 'home', 'bodyweight', 'outdoor'];
  const cases = [
    [['fullgym'], 'full_gym'],
    [['homegym'], 'home'],
    [['dumbbells'], 'home'],
    [['bands'], 'bodyweight'],
    [['bodyweight'], 'bodyweight'],
  ];
  for (const [equipment, expected] of cases) {
    const c = constraintsForFirstWeek(withA({ equipment }));
    assert.ok(COACH_ENVS.includes(c.environment), `${equipment} produced ${c.environment}, not a coach environment`);
    assert.equal(c.environment, expected, `${equipment} should train in ${expected}`);
  }
});

test('what they own travels with them, and a full gym owns nothing', () => {
  // Access is not ownership: `homeGymForEquipment` returns null for a commercial gym on purpose, and
  // claiming the athlete OWNS a leg press would be a lie that outlives the answer that caused it.
  assert.deepEqual(constraintsForFirstWeek(withA({ equipment: ['fullgym'] })).ownedEquipment, []);
  assert.deepEqual(constraintsForFirstWeek(withA({ equipment: ['dumbbells'] })).ownedEquipment, ['dumbbells']);
  // The gear grid's own answer wins for a home setup, including the deliberate empty one.
  assert.deepEqual(
    constraintsForFirstWeek(withA({ equipment: ['homegym'], gear: ['squat_rack', 'barbell'] })).ownedEquipment,
    ['squat_rack', 'barbell'],
  );
  assert.deepEqual(constraintsForFirstWeek(withA({ equipment: ['homegym'], gear: [] })).ownedEquipment, []);
});

// ── the reveal's lines, where two shapes share one array ─────────────────────

test('⚠ a cardio finisher gets a real line, not a blank one', () => {
  /*
   * The exact row `assemble()` pushes at the end of every fat-loss day — a different shape from a lift,
   * carrying no `name`, cast into the same array. Rendering `.name` directly puts an empty line under
   * the last exercise on the first screen a new athlete ever sees.
   */
  const finisher = { kind: 'cardio', activity: 'run', modality: 'outdoor', targetSec: 900 };
  assert.deepEqual(dayLines([{ name: 'Back Squat' }, finisher]), ['Back Squat', 'Run · 15 min']);
});

test('every cardio activity resolves to its own name, never a generic one', () => {
  const expected = { run: 'Run', walk: 'Walk', bike: 'Ride', row: 'Row', elliptical: 'Elliptical', stair: 'Stair Climber', swim: 'Swim' };
  for (const [key, name] of Object.entries(expected)) {
    assert.deepEqual(dayLines([{ kind: 'cardio', activity: key, targetSec: 1200 }]), [`${name} · 20 min`]);
  }
  // An activity the table does not know still says something true rather than rendering empty.
  assert.deepEqual(dayLines([{ kind: 'cardio', activity: 'zumba', targetSec: 600 }]), ['Cardio · 10 min']);
  // A finisher with no dose names the activity and claims no duration it was not given.
  assert.deepEqual(dayLines([{ kind: 'cardio', activity: 'row', targetSec: null }]), ['Row']);
});

test('a nameless lift is dropped rather than rendered blank or invented', () => {
  assert.deepEqual(dayLines([{ name: 'Bench Press' }, {}, { name: '   ' }, { name: 'Row' }]), ['Bench Press', 'Row']);
  assert.deepEqual(dayLines([]), []);
});

test('the defaults this flow deliberately does not ask for are left for the goal to decide', () => {
  const c = constraintsForFirstWeek(ANSWERS);
  assert.equal(c.splitStyle, null, 'a split style asked here would spend the step budget this change protects');
  assert.deepEqual(c.limitations, []);
  assert.deepEqual(c.excludeExercises, []);
});
