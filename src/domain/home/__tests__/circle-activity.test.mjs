import test from 'node:test';
import assert from 'node:assert/strict';

import { activityFor, circleActivity, groupDigits } from '../circle-activity.ts';

/** lb stays lb; kg halves-ish, which is enough to prove the caller's converter is the one used. */
const lb = (n) => ({ value: Math.round(n), unit: 'lb' });
const kg = (n) => ({ value: Math.round(n * 0.4536), unit: 'kg' });

const post = (over = {}) => ({
  isMine: false,
  body: null,
  authorName: 'Moses',
  authorAvatarUrl: null,
  prValue: null,
  prExercise: null,
  prLabel: null,
  workoutSummary: null,
  ...over,
});

const recap = (over = {}) => ({ name: 'Push Day', volume: 12400, exercises: [{}, {}, {}, {}], ...over });

// ── the reported case ────────────────────────────────────────────────────────

test('⚠ a shared workout with no note still has something to say', () => {
  // This returned null before: no body, so nothing to quote, so the card showed nothing.
  const a = activityFor(post({ workoutSummary: recap() }), lb);
  assert.deepEqual(a, { name: 'Moses', quote: 'Push Day · 12,400 lb', quoted: false, avatarUrl: null });
});

test('and it is NOT quoted — italic would put words in his mouth', () => {
  assert.equal(activityFor(post({ workoutSummary: recap() }), lb).quoted, false);
  assert.equal(activityFor(post({ body: 'felt strong today' }), lb).quoted, true);
});

// ── which line wins ──────────────────────────────────────────────────────────

test('their own words beat anything derived', () => {
  const a = activityFor(post({ body: '  felt strong today  ', workoutSummary: recap() }), lb);
  assert.equal(a.quote, 'felt strong today', 'trimmed, and the volume line is not preferred over it');
  assert.equal(a.quoted, true);
});

test('a whitespace-only body is not words — it falls through to what else the post has', () => {
  assert.equal(activityFor(post({ body: '   \n ', workoutSummary: recap() }), lb).quote, 'Push Day · 12,400 lb');
  assert.equal(activityFor(post({ body: '   \n ' }), lb), null, 'and to nothing at all when there is nothing else');
});

test('volume is converted by the CALLER, not assumed to be pounds', () => {
  assert.equal(activityFor(post({ workoutSummary: recap() }), kg).quote, 'Push Day · 5,625 kg');
});

test('a session with no volume falls back to its lifts rather than printing 0', () => {
  const a = activityFor(post({ workoutSummary: recap({ volume: 0 }) }), lb);
  assert.equal(a.quote, 'Push Day · 4 lifts', '"Push Day · 0 lb" reads as a session that achieved nothing');
});

test('singular lift, and a nameless session still names itself', () => {
  assert.equal(activityFor(post({ workoutSummary: recap({ volume: 0, exercises: [{}] }) }), lb).quote, 'Push Day · 1 lift');
  assert.equal(activityFor(post({ workoutSummary: recap({ volume: 0, exercises: [], name: null }) }), lb).quote, 'a workout');
});

test('a PR speaks in its own three columns', () => {
  const a = activityFor(post({ prExercise: 'Back Squat', prValue: '315 lb', prLabel: 'Squad PR' }), lb);
  assert.equal(a.quote, 'Back Squat · 315 lb · Squad PR');
  assert.equal(a.quoted, false);
});

test('⚠ nothing is invented for a post with neither words nor stats', () => {
  // A photo with no caption. "Moses posted" is a row that says nothing in the space of one that did.
  assert.equal(activityFor(post(), lb), null);
});

// ── picking one out of the feed ──────────────────────────────────────────────

test('⚠ it walks past your OWN post instead of going blank', () => {
  const feed = [post({ isMine: true, body: 'my note' }), post({ body: 'his note' })];
  assert.equal(circleActivity(feed, lb).quote, 'his note');
});

test('and past a post with nothing to say', () => {
  const feed = [post(), post({ workoutSummary: recap() })];
  assert.equal(circleActivity(feed, lb).quote, 'Push Day · 12,400 lb');
});

test('newest first is the caller’s order and is preserved', () => {
  const feed = [post({ body: 'newest' }), post({ body: 'older' })];
  assert.equal(circleActivity(feed, lb).quote, 'newest');
});

test('an empty feed, or a feed of only your own posts, is null', () => {
  assert.equal(circleActivity([], lb), null);
  assert.equal(circleActivity([post({ isMine: true, body: 'mine' })], lb), null);
});

test('digits are grouped', () => {
  assert.equal(groupDigits(0), '0');
  assert.equal(groupDigits(999), '999');
  assert.equal(groupDigits(12400), '12,400');
  assert.equal(groupDigits(1234567), '1,234,567');
});
