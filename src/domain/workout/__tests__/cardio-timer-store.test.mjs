import test from 'node:test';
import assert from 'node:assert/strict';

import { CARDIO_TIMER_PREFIX, cardioTimerKey, staleCardioTimerKeys } from '../cardio-timer-store.ts';

/*
 * ══ THE BUG, WRITTEN AS A TEST ══
 *
 * Reported: the indoor ride never ended. Start it on Tuesday, end the workout any way other than the
 * card's own Save, open a ride on Thursday — and the clock was already at two days, still counting,
 * because `useWallClockTimer` measures `now − startedAt` and the row said Tuesday.
 *
 * Two independent failures had to line up, so both are pinned here: the key had no session in it, and
 * nothing ever deleted the row.
 */

const TUE = '2026-09-01T17:04:22.118Z';
const THU = '2026-09-03T06:31:09.004Z';

test('two sessions never share a clock, however the blocks are positioned', () => {
  // The whole defect in one assertion: same position, different day, must be a different row.
  assert.notEqual(cardioTimerKey(TUE, 2), cardioTimerKey(THU, 2));
  // And it is the SESSION that separates them, not luck with the index.
  for (let i = 0; i < 8; i += 1) {
    assert.notEqual(cardioTimerKey(TUE, i), cardioTimerKey(THU, i), `index ${i} collided`);
  }
});

test('blocks within one session are still told apart', () => {
  // A ride and a row in the same workout are two bouts and two clocks.
  assert.notEqual(cardioTimerKey(TUE, 0), cardioTimerKey(TUE, 1));
});

test('the same block in the same session is the same row — a resume gets its time back', () => {
  // The hook's one real promise: a session killed mid-leg comes back with its clock intact. That only
  // holds if the key rebuilds identically, which is why the scope is `startedAt` and not `Date.now()`.
  assert.equal(cardioTimerKey(TUE, 2), cardioTimerKey(TUE, 2));
});

test('a missing or malformed startedAt still produces a usable key rather than throwing', () => {
  // Degraded, not broken: an unscoped session is back to per-index behaviour, and the sweep still
  // reaches it. Throwing here would take down the card that draws the ride.
  for (const bad of [undefined, null, '', 'not-a-date']) {
    const k = cardioTimerKey(bad, 1);
    assert.ok(k.startsWith(CARDIO_TIMER_PREFIX), `${String(bad)} produced ${k}`);
    assert.ok(k.endsWith(':1'));
  }
});

test('the sweep collects every cardio clock, including the legacy position-only keys', () => {
  // The stranded rows on athletes' phones look like `forge_cardio_timer_v1:2`. They must go too, or the
  // fix does nothing for anyone who already hit the bug.
  const keys = [
    'forge_cardio_timer_v1:2',
    'forge_cardio_timer_v1:0',
    cardioTimerKey(TUE, 0),
    cardioTimerKey(THU, 3),
  ];
  assert.deepEqual(staleCardioTimerKeys(keys).sort(), [...keys].sort());
});

test('the sweep touches nothing else on the device', () => {
  // It runs on every workout ending, so a prefix that over-matched would delete the session draft, the
  // tour state or the offline save queue at the worst possible moment.
  const others = [
    'forge.activeWorkout.v1',
    'forge_tour_v1',
    'forge_coach_thread_v1',
    'forge_pending_saves_v1',
    'forge_cardio_timer_v2:123:0',
    'cardio_timer',
    '',
  ];
  assert.deepEqual(staleCardioTimerKeys(others), []);
});

test('a mixed keyring is partitioned exactly', () => {
  const mine = [cardioTimerKey(TUE, 0), 'forge_cardio_timer_v1:5'];
  const theirs = ['forge.activeWorkout.v1', 'forge_home_level_v1'];
  assert.deepEqual(staleCardioTimerKeys([...theirs, ...mine, ...theirs]).sort(), [...mine].sort());
});
