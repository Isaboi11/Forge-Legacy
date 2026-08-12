import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOME_PHASE_1_STEPS,
  HOME_STEPS,
  PHASE_1_STEPS,
  PHASE_2_STEPS,
  PHASE_UNLOCK,
  SCREEN_TOURS,
  TAB_STEPS,
  phaseFor,
  phaseOfStep,
  planTour,
  stepsFor,
} from '../tour-plan.ts';

const SURFACES = Object.keys(SCREEN_TOURS).filter((k) => SCREEN_TOURS[k].length > 0);

// ─────────────────────────────────────────────────────────────────────────────
// THE PHASE AN ATHLETE IS IN
// ─────────────────────────────────────────────────────────────────────────────

test('phases open at 0, 3 and 10 workouts', () => {
  assert.deepEqual(PHASE_UNLOCK, { 1: 0, 2: 3, 3: 10 });
  assert.equal(phaseFor(0), 1);
  assert.equal(phaseFor(2), 1);
  assert.equal(phaseFor(3), 2);
  assert.equal(phaseFor(9), 2);
  assert.equal(phaseFor(10), 3);
  assert.equal(phaseFor(500), 3);
});

test('phaseFor never goes backwards', () => {
  let last = 0;
  for (let n = 0; n <= 30; n += 1) {
    const p = phaseFor(n);
    assert.ok(p >= last, `phase dropped at ${n}`);
    last = p;
  }
});

test('junk resolves to phase 1 rather than throwing at somebody mid-launch', () => {
  assert.equal(phaseFor(-5), 1);
  assert.equal(phaseFor(NaN), 1);
  assert.equal(phaseFor(undefined), 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE INVARIANT THAT MAKES THINNING SAFE
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ EVERY surface teaches something on the very first visit', () => {
  /* This is the decisive advantage of thinning over gating whole screens. If a surface could resolve to
     zero steps at phase 1, an athlete who opened it on day one would be taught NOTHING — taught silence,
     which is worse than the density being fixed. */
  for (const key of SURFACES) {
    assert.ok(stepsFor(key, 0).length > 0, `${key} teaches nothing at phase 1`);
  }
});

test('the first visit is thin — no surface opens with more than two steps', () => {
  for (const key of SURFACES) {
    assert.ok(stepsFor(key, 0).length <= PHASE_1_STEPS, `${key} shows ${stepsFor(key, 0).length} on day one`);
  }
});

test('a phase only ever ADDS — nothing an athlete was shown is taken away', () => {
  for (const key of SURFACES) {
    const p1 = stepsFor(key, 0);
    const p2 = stepsFor(key, 3);
    const p3 = stepsFor(key, 10);
    assert.deepEqual(p2.slice(0, p1.length), p1, `${key} phase 2 dropped a phase 1 step`);
    assert.deepEqual(p3.slice(0, p2.length), p2, `${key} phase 3 dropped a phase 2 step`);
  }
});

test('by phase 3 every authored step is reachable — nothing is orphaned', () => {
  for (const key of SURFACES) {
    assert.deepEqual(stepsFor(key, 10), SCREEN_TOURS[key], key);
  }
});

test('steps are assigned by position, two then two then the rest', () => {
  assert.equal(phaseOfStep(0), 1);
  assert.equal(phaseOfStep(PHASE_1_STEPS - 1), 1);
  assert.equal(phaseOfStep(PHASE_1_STEPS), 2);
  assert.equal(phaseOfStep(PHASE_1_STEPS + PHASE_2_STEPS - 1), 2);
  assert.equal(phaseOfStep(PHASE_1_STEPS + PHASE_2_STEPS), 3);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE GUIDED RUN
// ─────────────────────────────────────────────────────────────────────────────

const plan = (over = {}) =>
  planTour({ tabsDone: true, homeDone: false, homeHasCards: true, anchors: HOME_STEPS.map((s) => s.anchor).filter(Boolean), ...over });

test('the Home leg is thinned on the first run', () => {
  assert.equal(plan({ workoutsLogged: 0 }).length, HOME_PHASE_1_STEPS);
});

test('…and is whole once the athlete has trained', () => {
  assert.equal(plan({ workoutsLogged: 3 }).length, HOME_STEPS.length);
});

test('⚠ an unknown count teaches EVERYTHING rather than the least', () => {
  // Under-teaching on a missing number is the failure that looks like the feature working.
  assert.equal(plan({}).length, HOME_STEPS.length);
  assert.equal(plan({ workoutsLogged: undefined }).length, HOME_STEPS.length);
});

test('the tabs leg is never thinned — it is the orientation everything else assumes', () => {
  const tabs = planTour({ tabsDone: false, homeDone: false, homeHasCards: false, anchors: [], workoutsLogged: 0 });
  assert.equal(tabs.length, TAB_STEPS.length);
});

test('⚠ phasing never makes a run span two legs', () => {
  // `planTour`'s one-leg-per-run rule is a bug fix, not an aesthetic — a run is planned against a
  // snapshot of mounted anchors and the tabs leg unmounts Home on its way through.
  for (const n of [0, 1, 3, 10, 99]) {
    for (const tabsDone of [true, false]) {
      const steps = planTour({ tabsDone, homeDone: false, homeHasCards: true, anchors: [], workoutsLogged: n });
      const legs = [...new Set(steps.map((s) => s.leg))];
      assert.ok(legs.length <= 1, `mixed legs at ${n}/${tabsDone}`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE POINT OF THE EXERCISE
// ─────────────────────────────────────────────────────────────────────────────

test('day one drops from ~23 steps to under a dozen', () => {
  /* The PO's complaint, measured: tabs leg + Home leg + the two surfaces a new athlete actually reaches
     before training once. Before phasing this was 4 + 7 + 7 + 5 = 23. */
  const dayOne =
    TAB_STEPS.length + HOME_PHASE_1_STEPS + stepsFor('workouts', 0).length + stepsFor('workout', 0).length;
  assert.ok(dayOne < 12, `day one is still ${dayOne} steps`);
});
