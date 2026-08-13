import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RETIRED_WEEKS_KEPT,
  isWeekRetired,
  parseRetiredWeeks,
  withRetiredWeek,
} from '../weekly-review-seen-model.ts';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE SAFE FAILURE — unreadable storage shows the card, never hides it
// ─────────────────────────────────────────────────────────────────────────────

test('a value this cannot read means NOTHING retired, not everything', () => {
  /* The opposite failure would swallow reviews silently: an athlete whose storage got corrupted would
     simply stop being shown their week, with no error and nothing to notice. A card shown once more than
     it should be is the cheaper wrong answer, so every unreadable shape lands on the empty list. */
  assert.deepEqual(parseRetiredWeeks(null), []);
  assert.deepEqual(parseRetiredWeeks(undefined), []);
  assert.deepEqual(parseRetiredWeeks(''), []);
  assert.deepEqual(parseRetiredWeeks('not json'), []);
  assert.deepEqual(parseRetiredWeeks('{"weeks":["2026-08-03"]}'), []); // an object, not the array
  assert.deepEqual(parseRetiredWeeks('"2026-08-03"'), []); // valid JSON, wrong shape
});

test('junk entries are dropped without taking the readable ones with them', () => {
  assert.deepEqual(parseRetiredWeeks('["2026-08-03", null, 7, "", "2026-08-10"]'), ['2026-08-03', '2026-08-10']);
});

test('a stored list round-trips', () => {
  const weeks = withRetiredWeek(withRetiredWeek([], '2026-08-03'), '2026-08-10');
  assert.deepEqual(parseRetiredWeeks(JSON.stringify(weeks)), ['2026-08-03', '2026-08-10']);
});

// ─────────────────────────────────────────────────────────────────────────────
// RETIRING — this week only, and bounded
// ─────────────────────────────────────────────────────────────────────────────

test('retiring a week is idempotent', () => {
  const once = withRetiredWeek([], '2026-08-03');
  assert.deepEqual(withRetiredWeek(once, '2026-08-03'), ['2026-08-03']);
});

test('⚠ retiring this week says nothing about next week — the review still arrives', () => {
  /* The whole point of keying on `week_start`. A dismissal that quietly became an opt-out would be the
     app deciding something the athlete did not. */
  const weeks = withRetiredWeek([], '2026-08-03');
  assert.equal(isWeekRetired(weeks, '2026-08-03'), true);
  assert.equal(isWeekRetired(weeks, '2026-08-10'), false);
});

test('the list is capped, keeping the most recent', () => {
  let weeks = [];
  for (let i = 0; i < RETIRED_WEEKS_KEPT + 4; i += 1) weeks = withRetiredWeek(weeks, `week-${i}`);
  assert.equal(weeks.length, RETIRED_WEEKS_KEPT);
  assert.equal(weeks.at(-1), `week-${RETIRED_WEEKS_KEPT + 3}`);
  assert.equal(weeks.includes('week-0'), false);
});

test('re-retiring a week refreshes its place rather than letting it age out first', () => {
  /* ⚠ The travel case this cap exists for: an athlete handed a week they already retired must not have it
     fall off the end ahead of weeks nobody has touched since. */
  let weeks = [];
  for (let i = 0; i < RETIRED_WEEKS_KEPT; i += 1) weeks = withRetiredWeek(weeks, `week-${i}`);
  weeks = withRetiredWeek(weeks, 'week-0');
  weeks = withRetiredWeek(weeks, 'week-new');
  assert.equal(isWeekRetired(weeks, 'week-0'), true);
  assert.equal(isWeekRetired(weeks, 'week-1'), false); // the untouched one aged out instead
});

test('an empty week key changes nothing', () => {
  assert.deepEqual(withRetiredWeek(['2026-08-03'], ''), ['2026-08-03']);
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ NO REVIEW IS NOT A RETIRED REVIEW
// ─────────────────────────────────────────────────────────────────────────────

test('a null week is never retired — there is no card to hide', () => {
  /* `fetchWeeklyReview` returns null for a week with no workouts (silence beats zero). Answering `true`
     here would let a caller latch "retired" on the absence of a review and then suppress the real one. */
  assert.equal(isWeekRetired(['2026-08-03'], null), false);
  assert.equal(isWeekRetired(['2026-08-03'], undefined), false);
  assert.equal(isWeekRetired([], null), false);
});
