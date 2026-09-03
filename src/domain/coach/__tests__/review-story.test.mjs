import test from 'node:test';
import assert from 'node:assert/strict';

import { reviewNote, weekHero, REVIEW_LINES } from '../rulebook/review.ts';

/**
 * The 0191 additions: firsts, the approved "what it sets up" line, and the session hero.
 *
 * ⚠ THE LOAD-BEARING CASE IS THE OLD REVIEW. Snapshots are FROZEN — `ensure_weekly_review()` hands back
 * a stored row untouched and 0191 does not backfill — so every week generated before it carries the
 * original seven fields and always will. Anything here that assumes the new fields exist would break on
 * every review the athlete has already read. Those tests are first.
 */

const OLD = {                     // exactly what a pre-0191 snapshot contains
  workouts: 3, days_trained: 3, volume_lb: 20000, duration_sec: 7200,
  prs: [], honors: [], top_lift: { name: 'Back Squat', weight: 225, reps: 5 },
};
const week = (over = {}) => ({ ...OLD, ...over });

// `pickFrom` takes a chooser; always taking the first variant makes the assertions exact.
const first = () => 0;

test('a pre-0191 review still produces a note — no first_time field at all', () => {
  const note = reviewNote(OLD, first);
  assert.ok(note.length > 0);
  assert.ok(!note.includes('undefined'));
});

test('a pre-0191 review still produces a headline, and no session hero is invented', () => {
  const h = weekHero(OLD);
  assert.equal(h.kind, 'lift');
  assert.equal(h.day, null, 'an old review has no day and must not fabricate one');
  assert.equal(weekHero(week({ top_lift: null })), null, 'no longest_session means no headline');
});

test('the session hero rescues the cardio-only week, which used to get nothing', () => {
  const h = weekHero(week({
    top_lift: null, volume_lb: 0,
    longest_session: { name: 'Long Run', day: 'Sunday', duration_sec: 3600 },
  }));
  assert.equal(h.kind, 'session');
  assert.equal(h.title, 'Long Run');
  assert.equal(h.day, 'Sunday');
  assert.equal(h.durationSec, 3600);
});

test('a zero-length session is not a headline', () => {
  assert.equal(weekHero(week({ top_lift: null, longest_session: { name: 'X', day: 'Monday', duration_sec: 0 } })), null);
});

/**
 * ⚠ A FIRST OUTRANKS THE HEAVIEST LIFT IN HOLT'S MOUTH. Doing something you have never done is a bigger
 * event than lifting the most you lifted that week — and it is the line an ORDINARY week can earn, which
 * is the entire problem this pass exists to solve.
 */
test('Holt names a first instead of the heaviest lift', () => {
  const note = reviewNote(week({ first_time: [{ exercise: 'Bulgarian Split Squat' }] }), first);
  assert.match(note, /Bulgarian Split Squat/);
  assert.doesNotMatch(note, /Back Squat/, 'the heaviest lift must yield to the first');
});

test('a PR still outranks a first', () => {
  const note = reviewNote(week({ prs: [{ exercise: 'Bench Press', value: 185 }], first_time: [{ exercise: 'Dip' }] }), first);
  assert.match(note, /Bench Press/);
});

test('several firsts are counted, not listed', () => {
  const note = reviewNote(week({ first_time: [{ exercise: 'A' }, { exercise: 'B' }, { exercise: 'C' }] }), first);
  assert.match(note, /3/);
});

/**
 * ⚠ "WHAT IT SETS UP" REPLACES THE CLOSE, IT DOES NOT JOIN IT. The brief specifies 2–3 sentences;
 * opener + fact + sets-up + close is four, and the forward line lands hardest read last.
 */
test('the sets-up line replaces the ordinary close', () => {
  const note = reviewNote(week(), first);
  const close = REVIEW_LINES.CLOSE.steady[0];
  assert.doesNotMatch(note, new RegExp(close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  /* Which VARIANT is chosen is `pickFrom`'s business — it rotates by key so the same athlete does not
     read the same sentence every week. The assertion is that the note ENDS in a sets-up line at all,
     not which one; pinning a variant would make this test fail on a copy edit that changed nothing. */
  const ended = REVIEW_LINES.SETS_UP_LIFT.some((l) => note.endsWith(l.replace('{lift}', 'Back Squat')));
  assert.ok(ended, `note did not end in a sets-up line: ${note}`);
});

/**
 * ⚠ IT IS EARNED. A week with no first, no PR and no loaded lift gets the ordinary close — "next week
 * starts from here" is true of every week ever and is therefore worth nothing.
 */
test('a week with nothing to build on keeps the ordinary close', () => {
  const note = reviewNote(week({ top_lift: null }), first);
  assert.match(note, new RegExp(REVIEW_LINES.CLOSE.steady[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

/**
 * ⛔ AND IT NAMES NO NUMBER. The PO's example was "that squat is asking for 235", but 235 is a
 * PROGRESSION decision owned by `progression.ts`. A copy table inventing a target would promise an
 * athlete a number the app then does not prescribe.
 */
test('no sets-up line invents a weight', () => {
  for (const table of [REVIEW_LINES.SETS_UP_FIRST, REVIEW_LINES.SETS_UP_PR, REVIEW_LINES.SETS_UP_LIFT]) {
    for (const line of table) {
      assert.doesNotMatch(line, /\d/, `"${line}" names a number the progression engine did not choose`);
      assert.doesNotMatch(line, /\{weight\}/, `"${line}" interpolates a weight`);
    }
  }
});

/** The same bar every other table answers to — forward, never backward. */
test('every new line clears the scoreboard ban list', () => {
  const BAN = /\b(only|just|barely|down from|up from|last week|better|worse|worst|best week|behind|fell off|missed)\b/i;
  for (const key of ['FIRST_ONE', 'FIRST_MANY', 'SETS_UP_FIRST', 'SETS_UP_PR', 'SETS_UP_LIFT']) {
    for (const line of REVIEW_LINES[key]) assert.doesNotMatch(line, BAN, `${key}: "${line}"`);
  }
});
