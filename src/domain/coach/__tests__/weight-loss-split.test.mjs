/**
 * weight-loss-split.test.mjs — ⭐ **lose weight is a lifting goal.**
 *
 * PO, 2026-08-21: *"lose weight it automatically did full body exercises, but we need to remember that
 * weight lifting in general will help lose weight."*
 *
 * `SPLITS.weight_loss` pointed at `CONDITIONING_SPLITS`, so every athlete who said "lose weight" got a
 * full-body day at every frequency — six days a week of Full Body A/B/C. It now points at the
 * hypertrophy weeks with the conditioning finisher kept on top.
 *
 * The two halves are equally load-bearing and pull against each other, which is why both are asserted
 * here rather than in a single "it changed" check:
 *
 *   · the SHAPE must now be a real split, at the frequencies that can carry one;
 *   · the FINISHER must survive, on every day. `skeletonFor`'s own note says the cardio *is* the goal
 *     rather than a feature of the split — the previous time this table was touched, restructuring a
 *     week silently deleted the conditioning, and `assemble.ts` carries the comment about it.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/weight-loss-split.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { skeletonFor } from '../rulebook/skeletons.ts';
import { GOAL_CATEGORY } from '../rulebook/volume.ts';

const namesOf = (week) => week.map((d) => d.name);
const FREQUENCIES = [2, 3, 4, 5, 6];

test('⭐ lose weight gets the hypertrophy split, not a full-body circuit', () => {
  for (const days of [3, 4, 5, 6]) {
    const wl = skeletonFor('weight_loss', days);
    const muscle = skeletonFor('muscle', days);
    assert.ok(wl, `weight_loss has no week at ${days} days`);
    assert.deepEqual(
      namesOf(wl),
      namesOf(muscle),
      `at ${days} days, lose weight must run the same split hypertrophy does`,
    );
  }

  // The regression itself: three days is where the old table was most obviously wrong.
  assert.deepEqual(namesOf(skeletonFor('weight_loss', 3)), ['Push', 'Pull', 'Legs']);
  assert.notDeepEqual(
    namesOf(skeletonFor('weight_loss', 6)),
    namesOf(skeletonFor('conditioning', 6)),
    'six days of lose weight must no longer be six days of conditioning',
  );
});

test('two days stays full body — the one frequency where nothing can be skipped', () => {
  const wl = skeletonFor('weight_loss', 2);
  assert.deepEqual(namesOf(wl), ['Full Body A', 'Full Body B']);
});

test('⚠ the conditioning finisher survives the change, on every day of every week', () => {
  for (const days of FREQUENCIES) {
    const week = skeletonFor('weight_loss', days);
    assert.ok(week, `no week at ${days} days`);
    assert.equal(week.length, days, `a ${days}-day week must have ${days} days`);
    for (const d of week) {
      assert.ok(
        d.cardioFinisher && d.cardioFinisher.minutes > 0,
        `"${d.name}" at ${days} days lost its cardio finisher — the finisher IS the goal`,
      );
    }
    // The last day of the week earns the long one, matching what `skeletonFor` applies to a chosen style.
    const last = week[week.length - 1].cardioFinisher.minutes;
    assert.equal(last, 25, `the last day at ${days} days should carry the long finisher`);
    for (const d of week.slice(0, -1)) assert.equal(d.cardioFinisher.minutes, 15);
  }
});

test('⚠ the SHAPE moved and the DOSE did not — they are separate levers', () => {
  /*
   * Someone eating less recovers from less. Handing a weight-loss athlete the hypertrophy split AND the
   * hypertrophy volume band would be two changes where the report described one, and the second is the
   * one that gets people hurt. `GOAL_CATEGORY` is what feeds `bandFor`.
   */
  assert.equal(GOAL_CATEGORY.weight_loss, 'CONDITIONING');
  assert.equal(GOAL_CATEGORY.muscle, 'HYPERTROPHY');
});

test('a chosen split style still wins, and still keeps its finishers', () => {
  // `skeletonFor`'s stated exception: conditioning and weight loss keep cardio regardless of style.
  const chosen = skeletonFor('weight_loss', 4, 'upper_lower');
  assert.ok(chosen);
  for (const d of chosen) assert.ok(d.cardioFinisher, `"${d.name}" lost its finisher to a style choice`);
});
