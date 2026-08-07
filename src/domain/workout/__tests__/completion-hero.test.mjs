/**
 * completion-hero.test.mjs — the first session is not congratulated on consistency it has not had.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * A tester finished his **first ever workout** and the seal screen led with:
 *
 *     CONSISTENCY
 *     Another one down
 *     Your 1st session this chapter
 *
 * Another one down, from one. It was reported as a wrongly-awarded honor, and it is not an honor at all
 * — honors were deliberately removed from this screen (migration 0112). It is the completion HEADLINE.
 *
 * ══ WHY THE FIRST SESSION IS THE ONE THAT BREAKS ══
 *
 * Every other branch is unreachable on session one:
 *   · `pr`        — the first time you lift something is a BASELINE, not a record. Deliberate, correct,
 *                   and it means a first session can never produce a PR headline.
 *   · `milestone` — every 10th session. 1 is not a multiple of 10.
 *   · `consistency` — the catch-all, written for a repeat, inherited by the one session that is not one.
 *
 * So the copy written for "you came back" was shown to someone who had not yet left. And it landed on
 * the one screen forbidden to say it: the first-run face is gated on `isFirstWorkout` and its own
 * comment cites **ONB-D18 — "Arrival, not achievement — no reward/rank/honor/streak language."**
 *
 * Run:  node --test --experimental-strip-types src/domain/workout/__tests__/completion-hero.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { completionHeroKind } from '../metrics.ts';

test('the first session gets NO headline — arrival, not achievement', () => {
  assert.equal(
    completionHeroKind({ hasPR: false, chapterOrdinal: 1, isFirstWorkout: true }),
    null,
    'this is the exact input that told a tester "Another one down" after his first workout',
  );
});

test('a first session cannot be rescued into a headline by its ordinal', () => {
  // A chapter's first session is ordinal 1; the suppression must not depend on the number being 1,
  // because `isFirstWorkout` is identity-scoped (re-opening workout #1 later still reads true).
  for (const n of [1, 2, 10, 37]) {
    assert.equal(
      completionHeroKind({ hasPR: false, chapterOrdinal: n, isFirstWorkout: true }),
      null,
      `ordinal ${n} produced a headline on a first workout`,
    );
  }
});

test('the second session is where consistency legitimately starts', () => {
  assert.equal(completionHeroKind({ hasPR: false, chapterOrdinal: 2, isFirstWorkout: false }), 'consistency');
  assert.equal(completionHeroKind({ hasPR: false, chapterOrdinal: 7, isFirstWorkout: false }), 'consistency');
});

test('every tenth session is a milestone, and it outranks consistency', () => {
  assert.equal(completionHeroKind({ hasPR: false, chapterOrdinal: 10, isFirstWorkout: false }), 'milestone');
  assert.equal(completionHeroKind({ hasPR: false, chapterOrdinal: 100, isFirstWorkout: false }), 'milestone');
  assert.equal(completionHeroKind({ hasPR: false, chapterOrdinal: 11, isFirstWorkout: false }), 'consistency');
});

test('a real record outranks everything', () => {
  assert.equal(completionHeroKind({ hasPR: true, chapterOrdinal: 10, isFirstWorkout: false }), 'pr');
  assert.equal(completionHeroKind({ hasPR: true, chapterOrdinal: 3, isFirstWorkout: false }), 'pr');
});

/**
 * ⚠ THE ONE CASE THE PRODUCT RULES SAY CANNOT HAPPEN, ASSERTED ANYWAY.
 *
 * `hasPR` cannot be true on a first workout, because the data layer only counts a mark as a record when
 * the lift already has history. If that rule ever changes, a PR is a real achievement and outranking
 * the ONB-D18 suppression with it is a product decision — not something that should happen silently
 * because of branch order. This pins the current behaviour so the change has to be deliberate.
 */
test('a PR still wins on a first workout — pinned, because the rules say it cannot occur', () => {
  assert.equal(completionHeroKind({ hasPR: true, chapterOrdinal: 1, isFirstWorkout: true }), 'pr');
});

test('a session with no chapter claims nothing', () => {
  assert.equal(completionHeroKind({ hasPR: false, chapterOrdinal: null, isFirstWorkout: false }), null);
  assert.equal(completionHeroKind({ hasPR: false, chapterOrdinal: 0, isFirstWorkout: false }), null);
});
