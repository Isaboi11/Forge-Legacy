import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dispatchWatchCommand,
  handleWatchPayload,
  isWatchCommand,
  registerWatchCommands,
  watchCommandsMounted,
} from '../watch-commands.ts';

/**
 * Every refusal in this file is a thing that WILL happen on a wrist, not a hypothetical:
 * a double tap, a redelivered message, a watch holding state from before the last set, a phone whose
 * workout screen has been navigated away from. The dispatcher exists so none of them reaches the
 * 5,364-line screen, and so all of them can be proved here.
 */

const set = (o = {}) => ({ setIndex: 0, weight: 185, targetReps: 8, actualReps: null, done: false, ...o });

const port = (session, log = []) => ({
  log,
  session: () => session,
  setDone: (ei, si) => log.push(['setDone', ei, si]),
  restSkip: () => log.push(['restSkip']),
  restAdjust: (d) => log.push(['restAdjust', d]),
  restToggle: () => log.push(['restToggle']),
});

const oneSet = () => ({
  workoutName: 'Push Day A',
  activityType: 'strength',
  startedAt: '2026-09-02T09:14:00.000Z',
  exercises: [{ name: 'Barbell Bench Press', section: 'main', position: 0, sets: [set(), set({ setIndex: 1 })] }],
});

// ─────────────────────────────────────────────────────────────────────────────

test('nothing registered means nothing happens, and the wrist is told why', () => {
  assert.deepEqual(dispatchWatchCommand({ type: 'restSkip' }, null), { ok: false, reason: 'not-mounted' });
  assert.deepEqual(dispatchWatchCommand({ type: 'setDone', exerciseIndex: 0, setIndex: 0 }, null), {
    ok: false,
    reason: 'not-mounted',
  });
});

test('a mounted screen with no session refuses a log rather than inventing one', () => {
  const p = port(null);
  assert.deepEqual(dispatchWatchCommand({ type: 'setDone', exerciseIndex: 0, setIndex: 0 }, p), {
    ok: false,
    reason: 'no-session',
  });
  assert.equal(p.log.length, 0);
});

test('THE DOUBLE TAP: a set already logged is refused, and the screen is never called', () => {
  const s = oneSet();
  s.exercises[0].sets[0].done = true;
  const p = port(s);

  assert.deepEqual(dispatchWatchCommand({ type: 'setDone', exerciseIndex: 0, setIndex: 0 }, p), {
    ok: false,
    reason: 'already-done',
  });
  assert.equal(p.log.length, 0, 'a second log is exactly the failure this guard exists to stop');

  // The set beside it is untouched and still logs.
  assert.deepEqual(dispatchWatchCommand({ type: 'setDone', exerciseIndex: 0, setIndex: 1 }, p), { ok: true });
  assert.deepEqual(p.log, [['setDone', 0, 1]]);
});

test('an index the session does not have is refused, on either axis', () => {
  const p = port(oneSet());
  const bad = (ei, si) => dispatchWatchCommand({ type: 'setDone', exerciseIndex: ei, setIndex: si }, p).reason;

  assert.equal(bad(1, 0), 'unknown-exercise');
  assert.equal(bad(-1, 0), 'unknown-exercise');
  assert.equal(bad(0, 2), 'unknown-set');
  assert.equal(bad(0, -1), 'unknown-set');
  assert.equal(p.log.length, 0);

  // The valid neighbours of every boundary above still work — the guard separates, it does not blanket.
  assert.deepEqual(dispatchWatchCommand({ type: 'setDone', exerciseIndex: 0, setIndex: 0 }, p), { ok: true });
});

test('a cardio block has no set to log from a wrist', () => {
  const s = oneSet();
  s.exercises[0].kind = 'cardio';
  const p = port(s);
  assert.deepEqual(dispatchWatchCommand({ type: 'setDone', exerciseIndex: 0, setIndex: 0 }, p), {
    ok: false,
    reason: 'not-strength',
  });
  assert.equal(p.log.length, 0);
});

test('the rest commands pass straight through — they carry no state to be stale about', () => {
  const p = port(oneSet());
  assert.deepEqual(dispatchWatchCommand({ type: 'restSkip' }, p), { ok: true });
  assert.deepEqual(dispatchWatchCommand({ type: 'restToggle' }, p), { ok: true });
  assert.deepEqual(p.log, [['restSkip'], ['restToggle']]);

  // They do not need a session: skipping a rest that is not running is a no-op, not an error.
  const empty = port(null);
  assert.deepEqual(dispatchWatchCommand({ type: 'restSkip' }, empty), { ok: true });
});

test('the rest delta guard separates the real values from the absurd ones', () => {
  const p = port(oneSet());
  const ok = (d) => dispatchWatchCommand({ type: 'restAdjust', deltaSec: d }, p).ok;

  // What the buttons and the Digital Crown actually send.
  for (const d of [15, -15, 1, -1, 30, 300, -300]) assert.equal(ok(d), true, `${d} should be accepted`);

  // Nothing, and beyond five minutes either way.
  for (const d of [0, 301, -301, 100000, -100000]) assert.equal(ok(d), false, `${d} should be refused`);

  // Not a whole number of seconds.
  for (const d of [1.5, NaN, Infinity, -Infinity]) assert.equal(ok(d), false, `${d} should be refused`);

  assert.deepEqual(
    dispatchWatchCommand({ type: 'restAdjust', deltaSec: 0 }, p),
    { ok: false, reason: 'bad-delta' },
  );
  assert.equal(p.log.filter(([t]) => t === 'restAdjust').length, 7, 'only the seven accepted deltas reached the screen');
});

test('the shape guard admits exactly the four commands and nothing else', () => {
  assert.equal(isWatchCommand({ type: 'setDone', exerciseIndex: 0, setIndex: 1 }), true);
  assert.equal(isWatchCommand({ type: 'restSkip' }), true);
  assert.equal(isWatchCommand({ type: 'restToggle' }), true);
  assert.equal(isWatchCommand({ type: 'restAdjust', deltaSec: -15 }), true);

  // A watch on an older or newer build sending something this phone has never heard of.
  assert.equal(isWatchCommand({ type: 'startWorkout' }), false);
  assert.equal(isWatchCommand({ type: 'setDone' }), false);
  assert.equal(isWatchCommand({ type: 'setDone', exerciseIndex: '0', setIndex: 1 }), false);
  assert.equal(isWatchCommand({ type: 'setDone', exerciseIndex: 1.5, setIndex: 1 }), false);
  assert.equal(isWatchCommand({ type: 'restAdjust', deltaSec: '15' }), false);

  // And the shapes a decode failure actually produces.
  for (const x of [null, undefined, 0, '', 'restSkip', [], {}]) assert.equal(isWatchCommand(x), false);
});

test('a payload that is not a command is refused before the screen is consulted', () => {
  const p = port(oneSet());
  assert.deepEqual(handleWatchPayload({ type: 'startWorkout' }, p), { ok: false, reason: 'malformed' });
  assert.deepEqual(handleWatchPayload(null, p), { ok: false, reason: 'malformed' });
  assert.equal(p.log.length, 0);

  assert.deepEqual(handleWatchPayload({ type: 'setDone', exerciseIndex: 0, setIndex: 0 }, p), { ok: true });
  assert.deepEqual(p.log, [['setDone', 0, 0]]);
});

test('unregistering checks identity, so a StrictMode remount is not silently unhooked', () => {
  const first = port(oneSet());
  const second = port(oneSet());

  const offFirst = registerWatchCommands(first);
  assert.equal(watchCommandsMounted(), true);

  // React 18 mounts, tears down, and mounts again. The second registration lands before the first
  // teardown runs — a blind `mounted = null` here would leave the wrist talking to nothing all session.
  const offSecond = registerWatchCommands(second);
  offFirst();
  assert.equal(watchCommandsMounted(), true, 'the first teardown must not unhook the second registration');

  assert.deepEqual(dispatchWatchCommand({ type: 'restSkip' }), { ok: true });
  assert.deepEqual(second.log, [['restSkip']]);
  assert.equal(first.log.length, 0);

  offSecond();
  assert.equal(watchCommandsMounted(), false);
  assert.deepEqual(dispatchWatchCommand({ type: 'restSkip' }), { ok: false, reason: 'not-mounted' });
});
