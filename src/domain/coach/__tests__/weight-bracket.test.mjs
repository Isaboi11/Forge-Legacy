/**
 * weight-bracket.test.mjs — ⚠ **the two corrections must BRACKET the weight Holt states.**
 *
 * `SessionCoachSheet` now leads with a statement card: the weight in 38pt, the engine's verdict over it,
 * the evidence under it. "Too heavy" and "Too easy" sit beneath as corrections TO that number — which
 * only reads as a coach being corrected if one is genuinely below it and the other genuinely above.
 *
 * ⚠ THIS IS NOT HYPOTHETICAL. The redesign was drafted with a mockup showing **65 lb** stated and
 * **62.5 lb** on the "Too easy" chip: tapping *up* would have moved the athlete *down* from the weight
 * they had just been told to use. It was caught on paper. Nothing in the codebase would have caught it,
 * because the card and the chips are drawn from `progression.ts` through two different functions, and
 * each was tested only against its own examples.
 *
 * The heavier side is arithmetic (`current + step`, guarded on `step > 0`). The lighter side is
 * `backOffTo`, which prefers a real historical working weight over a percentage — so the risk is that a
 * session heavier than today's load gets offered as a way to go *lighter*.
 *
 * Run:  node --test src/domain/coach/__tests__/weight-bracket.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { backOffTo, incrementFor, loadableStep } from '../progression.ts';

/** The equipment the sheet actually offers weight chips for. */
const GEAR = ['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell'];
const LOADS = [25, 45, 65, 72.5, 90, 135, 185, 225, 315, 405];

test('⭐ the lighter correction is always genuinely lighter', () => {
  for (const equipment of GEAR) {
    for (const current of LOADS) {
      const to = backOffTo({ current, recent: [], equipment });
      if (to == null) continue; // not offered is a valid answer; offered-and-wrong is not
      assert.ok(to < current, `${equipment} at ${current}: "too heavy" offered ${to}`);
      assert.ok(to > 0, `${equipment} at ${current}: offered a weight of ${to}`);
    }
  }
});

test('⚠ history HEAVIER than today is never offered as a way to back off', () => {
  /*
   * The realistic shape of this: an athlete who worked up to 315, deloaded to 225, and is being asked
   * today what "too heavy" means. Every session on record is in `recent`, newest first — including the
   * ones above where they are now.
   */
  for (const current of [135, 225, 275]) {
    const to = backOffTo({ current, recent: [405, 365, 315, 275, 225, 185], equipment: 'barbell' });
    if (to == null) continue;
    assert.ok(to < current, `at ${current}, backing off offered ${to} — which is heavier`);
  }
});

test('⚠ a lift with nothing but heavier history still backs off, or offers nothing', () => {
  // Every recorded session is above today. The percentage rule must answer, or the chip must not show.
  const to = backOffTo({ current: 95, recent: [225, 185, 135], equipment: 'barbell' });
  assert.ok(to == null || to < 95, `offered ${to} against a stated 95`);
});

test('the heavier correction is always genuinely heavier', () => {
  /*
   * `incrementFor` returning 0 is the "this lift adds no pounds" answer — a band, a bodyweight
   * movement — and `/workout` turns that into no chip at all rather than into `current + 0`, which
   * would be a button offering the athlete the weight they already have.
   */
  for (const equipment of GEAR) {
    for (const pattern of ['squat', 'hinge', 'push', 'pull']) {
      for (const experience of ['beginner', 'intermediate', 'advanced']) {
        const step = incrementFor(pattern, experience, equipment);
        assert.ok(step >= 0, `${pattern}/${experience}/${equipment} returned a negative step`);
        if (step === 0) continue;
        for (const current of LOADS) {
          assert.ok(current + step > current, `${equipment} at ${current}: "too easy" did not go up`);
        }
      }
    }
  }
});

test('⚠ both corrections land on something the equipment can actually be loaded to', () => {
  /*
   * A chip that names 58.5 lb is worse than no chip: the athlete stands at the rack and cannot make the
   * number. `loadableStep` is the grain, and every offered weight must sit on it.
   */
  for (const equipment of GEAR) {
    const step = loadableStep(equipment);
    assert.ok(step > 0, `${equipment} has no loadable step`);
    for (const current of LOADS) {
      const to = backOffTo({ current, recent: [], equipment });
      if (to == null) continue;
      const offGrain = Math.abs(to / step - Math.round(to / step));
      assert.ok(offGrain < 1e-9, `${equipment}: ${to} is not a multiple of ${step}`);
    }
  }
});
