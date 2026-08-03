import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSeenSet, parseSeen } from '../screen-prompts-model.ts';

/**
 * A store whose reads and writes take real time, which is what makes the interleave observable. Every
 * AsyncStorage call is a bridge round-trip on native, so this is the honest model — the zero-delay case
 * hides the bug rather than disproving it.
 */
function fakeStore({ delay = 1 } = {}) {
  const data = new Map();
  const wait = () => new Promise((r) => setTimeout(r, delay));
  return {
    data,
    async getItem(k) {
      await wait();
      return data.has(k) ? data.get(k) : null;
    },
    async setItem(k, v) {
      await wait();
      data.set(k, v);
    },
    async removeItem(k) {
      await wait();
      data.delete(k);
    },
  };
}

const KEYS = ['workouts', 'legacy', 'squads', 'friends', 'honors'];
const isKey = (x) => typeof x === 'string' && KEYS.includes(x);
const make = (store) => createSeenSet({ store, storageKey: 'k', isKey });

// ── the control: the implementation this replaced, to prove the fake store really does race ──
// If this ever stops losing writes, the test above it has stopped proving anything.
test('CONTROL — an unserialized read-modify-write loses concurrent marks', async () => {
  const store = fakeStore();
  const naiveMark = async (key) => {
    const raw = await store.getItem('k');
    const seen = parseSeen(raw, isKey);
    if (seen.includes(key)) return;
    await store.setItem('k', JSON.stringify([...seen, key]));
  };

  await Promise.all(KEYS.map(naiveMark));

  const survived = parseSeen(store.data.get('k') ?? null, isKey);
  assert.ok(
    survived.length < KEYS.length,
    `expected the naive version to lose writes, but all ${KEYS.length} survived — the fake store is no longer racy`,
  );
});

test('concurrent marks all survive — every walkthrough stays recorded', async () => {
  const store = fakeStore();
  const seen = make(store);

  await Promise.all(KEYS.map((k) => seen.mark(k)));

  assert.deepEqual((await seen.read()).sort(), [...KEYS].sort());
});

test('interleaved marks and reads stay consistent', async () => {
  const store = fakeStore();
  const seen = make(store);

  const [, , afterTwo] = await Promise.all([seen.mark('workouts'), seen.mark('legacy'), seen.read()]);

  // The read joins the same queue, so it observes a prefix of the marks — never a torn or empty set once
  // both have landed.
  assert.ok(Array.isArray(afterTwo));
  assert.deepEqual((await seen.read()).sort(), ['legacy', 'workouts']);
});

test('marking is idempotent — a surface is never recorded twice', async () => {
  const seen = make(fakeStore());
  await seen.mark('honors');
  await seen.mark('honors');
  await seen.mark('honors');
  assert.deepEqual(await seen.read(), ['honors']);
});

test('clear lands after queued marks, not before them ("Replay all tips" really replays)', async () => {
  const seen = make(fakeStore());

  // Fire the marks WITHOUT awaiting, then clear — the ordering the provider produces when the athlete hits
  // Replay while a walkthrough it just finished is still being written.
  const marks = [seen.mark('workouts'), seen.mark('legacy')];
  const cleared = seen.clear();
  await Promise.all([...marks, cleared]);

  assert.deepEqual(await seen.read(), []);
});

test('unknown keys are dropped on read, and a mark of a live key still persists', async () => {
  const store = fakeStore();
  store.data.set('k', JSON.stringify(['workouts', 'a-screen-that-no-longer-exists']));
  const seen = make(store);

  assert.deepEqual(await seen.read(), ['workouts']);

  await seen.mark('legacy');
  assert.deepEqual((await seen.read()).sort(), ['legacy', 'workouts']);
});

test('corrupt storage reads as empty rather than throwing', async () => {
  const store = fakeStore();
  store.data.set('k', '{not json');
  const seen = make(store);

  assert.deepEqual(await seen.read(), []);
  await seen.mark('squads');
  assert.deepEqual(await seen.read(), ['squads']);
});

test('a failing store never poisons the queue for later marks', async () => {
  const store = fakeStore();
  let failNext = true;
  const flaky = {
    ...store,
    async setItem(k, v) {
      if (failNext) {
        failNext = false;
        throw new Error('storage full');
      }
      return store.setItem(k, v);
    },
  };
  const seen = make(flaky);

  await seen.mark('workouts'); // swallowed
  await seen.mark('legacy'); // must still record

  assert.deepEqual(await seen.read(), ['legacy']);
});

test('parseSeen tolerates every shape storage can hand back', () => {
  assert.deepEqual(parseSeen(null, isKey), []);
  assert.deepEqual(parseSeen('', isKey), []);
  assert.deepEqual(parseSeen('null', isKey), []);
  assert.deepEqual(parseSeen('{"not":"an array"}', isKey), []);
  assert.deepEqual(parseSeen('["workouts",42,null,"nope"]', isKey), ['workouts']);
});
