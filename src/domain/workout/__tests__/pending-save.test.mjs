import test from 'node:test';
import assert from 'node:assert/strict';

import { addPending, dropPending, isTransportFailure, ownedBy, readable, MAX_PENDING } from '../pending-save.ts';

/**
 * The offline save queue's guard.
 *
 * ⚠ EVERY FIXTURE BELOW IS A REAL ERROR SHAPE, not a tidy invention. The postgrest ones were read out of
 * `@supabase/postgrest-js/dist/index.cjs` — its fetch `.catch` builds `{ message: `${name}: ${message}`,
 * details, hint, code: "" }` — and the SQLSTATEs are the ones this app can actually provoke: 42501 from an
 * RLS denial, 23505 from a unique violation, PGRST202 from an unapplied migration.
 *
 * The asymmetry being defended: queueing a REJECTION means telling the athlete their workout saved when it
 * never will, which is data loss wearing a success message. Surfacing a TRANSPORT failure is only as bad as
 * today's build. So every ambiguous case must land on `false`.
 */

/* ── Positives: the server never ruled ─────────────────────────────────────── */

test('React Native offline — the shape postgrest builds from a failed fetch', () => {
  assert.equal(
    isTransportFailure({
      message: 'TypeError: Network request failed',
      details: 'TypeError: Network request failed\n    at anonymous',
      hint: '',
      code: '',
    }),
    true,
  );
});

test('web offline — the same path, a different fetch message', () => {
  assert.equal(
    isTransportFailure({ message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' }),
    true,
  );
});

test('auth cannot reach the server — the FIRST await in saveWorkout, so this is what offline really throws', () => {
  const e = new Error('Failed to fetch');
  e.name = 'AuthRetryableFetchError';
  e.status = 0;
  assert.equal(isTransportFailure(e), true);
});

test('a fetch rejection thrown before postgrest ever wrapped it', () => {
  assert.equal(isTransportFailure(new TypeError('Network request failed')), true);
});

test('an aborted/timed-out request is transport, not judgement', () => {
  assert.equal(
    isTransportFailure({
      message: 'AbortError: The user aborted a request.',
      details: '',
      hint: 'Request was aborted (timeout or manual cancellation)',
      code: '',
    }),
    true,
  );
});

/* ── Negatives: the server ruled, and the answer was no ────────────────────── */

test('⛔ an RLS denial must NEVER queue — it would retry forever and the workout would never exist', () => {
  assert.equal(
    isTransportFailure({
      message: 'new row violates row-level security policy for table "workouts"',
      details: null,
      hint: null,
      code: '42501',
    }),
    false,
  );
});

test('⛔ a unique violation must not queue', () => {
  assert.equal(
    isTransportFailure({
      message: 'duplicate key value violates unique constraint "workouts_pkey"',
      details: null,
      hint: null,
      code: '23505',
    }),
    false,
  );
});

test('⛔ an unapplied migration (PGRST202) must not queue — retrying cannot fix a missing function', () => {
  assert.equal(
    isTransportFailure({
      message: 'Could not find the function public.save_workout',
      details: null,
      hint: null,
      code: 'PGRST202',
    }),
    false,
  );
});

test('⛔ a check-constraint rejection must not queue', () => {
  assert.equal(
    isTransportFailure({ message: 'new row violates check constraint', code: '23514' }),
    false,
  );
});

test("⛔ our own `new Error('not signed in')` has NO code property — undefined is not '' ", () => {
  assert.equal(isTransportFailure(new Error('not signed in')), false);
});

test('⛔ THE MARGIN CASE: a TypeError that is not about the network', () => {
  // A real bug in our own code must surface as a bug, not be swallowed into a queue.
  assert.equal(isTransportFailure(new TypeError('undefined is not a function')), false);
});

test('⛔ nothing at all', () => {
  assert.equal(isTransportFailure(null), false);
  assert.equal(isTransportFailure(undefined), false);
  assert.equal(isTransportFailure('Network request failed'), false);
  assert.equal(isTransportFailure({}), false);
});

/* ── The queue itself ──────────────────────────────────────────────────────── */

const ME = 'athlete-me';
const THEM = 'athlete-them';

const entry = (startedAt, extra = {}) => ({
  v: 1,
  athleteId: ME,
  session: { startedAt, workoutName: 'Push', exercises: [] },
  partners: [],
  signals: [],
  system: 'imperial',
  queuedAt: startedAt,
  ...extra,
});

test('a second Finish on the same session REPLACES its entry — two would both retry', () => {
  const once = addPending([], entry('2026-09-04T10:00:00.000Z'));
  const twice = addPending(once, entry('2026-09-04T10:00:00.000Z', { partners: ['Mo'] }));
  assert.equal(twice.length, 1);
  assert.deepEqual(twice[0].partners, ['Mo']); // the newer attempt wins
});

test('different sessions both queue', () => {
  const list = addPending(addPending([], entry('2026-09-04T10:00:00.000Z')), entry('2026-09-05T10:00:00.000Z'));
  assert.equal(list.length, 2);
});

test('the queue is capped, and the OLDEST goes — the newest workout is the one they remember', () => {
  let list = [];
  for (let i = 0; i < MAX_PENDING + 5; i++) {
    list = addPending(list, entry(`2026-09-04T10:${String(i).padStart(2, '0')}:00.000Z`));
  }
  assert.equal(list.length, MAX_PENDING);
  assert.equal(list[0].session.startedAt, '2026-09-04T10:05:00.000Z');
  assert.equal(list[list.length - 1].session.startedAt, '2026-09-04T10:24:00.000Z');
});

test('dropping is by the same (athlete, startedAt) pair the drain checks', () => {
  const list = addPending(addPending([], entry('a')), entry('b'));
  assert.deepEqual(dropPending(list, ME, 'a').map((p) => p.session.startedAt), ['b']);
  assert.equal(dropPending(list, ME, 'nope').length, 2); // dropping something absent is a no-op
  assert.equal(dropPending(list, THEM, 'a').length, 2); // right session, wrong athlete — untouched
});

/* ── ⚠ Whose workout is this? ──────────────────────────────────────────────── */

test("⛔ THE HANDED-OVER PHONE: a drain never sees another athlete's queued work", () => {
  // Two testers on one device is routine on this project, and a saved workout looks exactly like a
  // saved workout afterwards — nothing downstream would ever flag the mix-up.
  const list = addPending(addPending([], entry('a')), entry('b', { athleteId: THEM }));
  assert.equal(list.length, 2);
  assert.deepEqual(ownedBy(list, ME).map((p) => p.session.startedAt), ['a']);
  assert.deepEqual(ownedBy(list, THEM).map((p) => p.session.startedAt), ['b']);
});

test("the other athlete's entry is LEFT on disk, not discarded — they may sign back in", () => {
  const list = addPending(addPending([], entry('a')), entry('b', { athleteId: THEM }));
  const afterMyDrain = dropPending(list, ME, 'a');
  assert.deepEqual(afterMyDrain.map((p) => p.athleteId), [THEM]);
});

test('two athletes who somehow share a start instant are still two entries', () => {
  const list = addPending(addPending([], entry('same')), entry('same', { athleteId: THEM }));
  assert.equal(list.length, 2);
});

test('an entry with no owner is discarded — it could only be replayed by guessing', () => {
  assert.equal(readable([entry('a', { athleteId: undefined })]).length, 0);
  assert.equal(readable([entry('a', { athleteId: '' })]).length, 0);
});

test('an entry from an older build is discarded rather than replayed against a changed signature', () => {
  const kept = readable([
    entry('good'),
    { v: 0, session: { startedAt: 'old' } }, // a previous shape
    { v: 1 }, // no session at all
    null,
    'nonsense',
  ]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].session.startedAt, 'good');
});

test('a corrupted store reads as an empty queue, never a throw', () => {
  assert.deepEqual(readable(null), []);
  assert.deepEqual(readable({ not: 'an array' }), []);
});
