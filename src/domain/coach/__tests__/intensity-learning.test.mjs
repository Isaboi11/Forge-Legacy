import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHECK_IN_DAYS,
  CHECK_IN_MIN_SIGNALS,
  MIN_SESSIONS,
  dueForCheckIn,
  proposeIntensity,
} from '../intensity-learning.ts';

const T0 = Date.parse('2026-08-12T12:00:00.000Z');
const at = (daysAgo) => new Date(T0 - daysAgo * 86400000).toISOString();

/** n decisions of one action, spread across `sessions` workouts. */
const runs = (action, n, sessions = 3) =>
  Array.from({ length: n }, (_, i) => ({ action, observedAt: at(i), workoutId: `w${i % sessions}` }));

// ─────────────────────────────────────────────────────────────────────────────
// UP — offered, never applied
// ─────────────────────────────────────────────────────────────────────────────

test('taking the jumps repeatedly earns an offer to push harder', () => {
  const p = proposeIntensity(runs('add_weight', 10), 'steady');
  assert.equal(p.direction, 'up');
  assert.equal(p.to, 'push');
  assert.match(p.sentence, /10 of your last 10/);
});

test('⚠ an UP proposal is never auto-applied — a coach that quietly gets louder is CL-D3’s failure', () => {
  assert.equal(proposeIntensity(runs('add_weight', 10), 'steady').autoApply, false);
});

test('⚠ there is no level above drive — the request routes to programming instead (CI-D7)', () => {
  assert.equal(proposeIntensity(runs('add_weight', 10), 'drive'), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// DOWN — applied, with the sentence and an undo
// ─────────────────────────────────────────────────────────────────────────────

test('holding and backing off eases him off, and says so', () => {
  const p = proposeIntensity(runs('back_off', 6), 'push');
  assert.equal(p.direction, 'down');
  assert.equal(p.to, 'steady');
  assert.equal(p.autoApply, true, 'easing off does not ask permission');
  assert.match(p.sentence, /say the word and I won/i, 'the undo is named in the sentence');
});

test('a `hold` counts toward easing off, not toward pushing', () => {
  assert.equal(proposeIntensity(runs('hold', 8), 'push').direction, 'down');
});

test('he never eases below the quietest setting', () => {
  assert.equal(proposeIntensity(runs('back_off', 8), 'reminders'), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ WHEN HE SAYS NOTHING — which must be most of the time
// ─────────────────────────────────────────────────────────────────────────────

test('one session is never enough, however lopsided', () => {
  const oneSession = runs('add_weight', 10, 1);
  assert.equal(proposeIntensity(oneSession, 'steady'), null, 'a single hard week is a hard week');
  assert.ok(MIN_SESSIONS >= 2);
});

test('a mixed record proposes nothing', () => {
  const mixed = [...runs('add_weight', 4), ...runs('add_reps', 4).map((s) => ({ ...s, workoutId: 'wx' }))];
  assert.equal(proposeIntensity(mixed, 'steady'), null);
});

test('no history at all proposes nothing', () => {
  assert.equal(proposeIntensity([], 'steady'), null);
});

test('⚠ a first-ever lift says nothing about how hard to push', () => {
  /* Counting `no_history` as a hold would make a week of new exercises read as stagnation and quietly
     turn the coach down on somebody who was simply trying things. */
  assert.equal(proposeIntensity(runs('no_history', 10), 'push'), null);
});

test('only the most recent window is read', () => {
  // Ten fresh add_weights ahead of a hundred ancient back_offs: the recent record is what counts.
  const old = runs('back_off', 100).map((s, i) => ({ ...s, observedAt: at(60 + i), workoutId: `old${i}` }));
  const fresh = runs('add_weight', 10);
  assert.equal(proposeIntensity([...old, ...fresh], 'steady').direction, 'up');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE CHECK-IN
// ─────────────────────────────────────────────────────────────────────────────

test('he does not ask before there is anything to ask about', () => {
  assert.equal(dueForCheckIn({ signalCount: CHECK_IN_MIN_SIGNALS - 1, lastAskedAt: null, nowMs: T0 }), false);
});

test('the first check-in comes once there is a record', () => {
  assert.equal(dueForCheckIn({ signalCount: CHECK_IN_MIN_SIGNALS, lastAskedAt: null, nowMs: T0 }), true);
});

test('and then not again for a month', () => {
  const yesterday = new Date(T0 - 86400000).toISOString();
  assert.equal(dueForCheckIn({ signalCount: 50, lastAskedAt: yesterday, nowMs: T0 }), false);
  const longAgo = new Date(T0 - (CHECK_IN_DAYS + 1) * 86400000).toISOString();
  assert.equal(dueForCheckIn({ signalCount: 50, lastAskedAt: longAgo, nowMs: T0 }), true);
});

test('an unreadable timestamp asks rather than never asking again', () => {
  assert.equal(dueForCheckIn({ signalCount: 50, lastAskedAt: 'not a date', nowMs: T0 }), true);
});
