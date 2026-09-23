import test from 'node:test';
import assert from 'node:assert/strict';

import { enqueue, MAX_OUTBOX, opsFor, overlayDay, readableOutbox } from '../outbox.ts';

const food = (id, meal = 'breakfast', kcal = 100) => ({
  id,
  meal,
  name: `Food ${id}`,
  quantity: 1,
  kcal,
  protein: 10,
  carb: 10,
  fat: 2,
  source: 'usda',
  sourceKey: `usda:${id}`,
  grams: 100,
  micros: null,
});

const item = (athleteId, op, key = Math.random().toString(36)) => ({
  v: 1,
  key,
  athleteId,
  queuedAt: '2026-09-23T12:00:00.000Z',
  op,
});

test('a held add shows on its own day, and only there', () => {
  const ops = [{ kind: 'add', iso: '2026-09-23', entries: [food('a')] }];
  assert.deepEqual(overlayDay('2026-09-23', [], ops).map((e) => e.id), ['a']);
  assert.deepEqual(overlayDay('2026-09-22', [], ops), []);
});

test('replaying an add the server already has does not double it', () => {
  const ops = [{ kind: 'add', iso: '2026-09-23', entries: [food('a')] }];
  const out = overlayDay('2026-09-23', [food('a')], ops);
  assert.equal(out.length, 1);
});

test('held adds land after what the server had, in the order they were logged', () => {
  const ops = [
    { kind: 'add', iso: '2026-09-23', entries: [food('b')] },
    { kind: 'add', iso: '2026-09-23', entries: [food('c')] },
  ];
  assert.deepEqual(overlayDay('2026-09-23', [food('a')], ops).map((e) => e.id), ['a', 'b', 'c']);
});

test('add then remove offline leaves nothing', () => {
  const ops = [
    { kind: 'add', iso: '2026-09-23', entries: [food('a')] },
    { kind: 'remove', id: 'a' },
  ];
  assert.deepEqual(overlayDay('2026-09-23', [], ops), []);
});

test('an update changes the portion and keeps everything else', () => {
  const patch = { quantity: 2, servingLabel: '2 cups', grams: 200, kcal: 200, protein: 20, carb: 20, fat: 4 };
  const [row] = overlayDay('2026-09-23', [food('a')], [{ kind: 'update', id: 'a', patch }]);
  assert.equal(row.kcal, 200);
  assert.equal(row.servingLabel, '2 cups');
  assert.equal(row.name, 'Food a');
  assert.equal(row.meal, 'breakfast');
});

test('an update to a row not on this day is ignored, never invented', () => {
  const patch = { quantity: 2, servingLabel: null, grams: null, kcal: 200, protein: 20, carb: 20, fat: 4 };
  assert.deepEqual(overlayDay('2026-09-23', [], [{ kind: 'update', id: 'zzz', patch }]), []);
});

test('a move leaves the old day and arrives on the new one, even if that day was never fetched', () => {
  const moved = food('a');
  const ops = [{ kind: 'move', id: 'a', iso: '2026-09-24', meal: 'lunch', entry: moved }];
  assert.deepEqual(overlayDay('2026-09-23', [moved], ops), []);
  const [there] = overlayDay('2026-09-24', [], ops);
  assert.equal(there.id, 'a');
  assert.equal(there.meal, 'lunch');
});

test('a move within the same day changes only the meal', () => {
  const ops = [{ kind: 'move', id: 'a', iso: '2026-09-23', meal: 'dinner', entry: food('a') }];
  const out = overlayDay('2026-09-23', [food('a'), food('b')], ops);
  assert.deepEqual(out.map((e) => [e.id, e.meal]), [['a', 'dinner'], ['b', 'breakfast']]);
});

test('an edit made BEFORE a move travels with it', () => {
  const patch = { quantity: 3, servingLabel: null, grams: 300, kcal: 300, protein: 30, carb: 30, fat: 6 };
  const ops = [
    { kind: 'update', id: 'a', patch },
    { kind: 'move', id: 'a', iso: '2026-09-23', meal: 'lunch', entry: food('a') },
  ];
  const [row] = overlayDay('2026-09-23', [food('a')], ops);
  assert.equal(row.kcal, 300);
  assert.equal(row.meal, 'lunch');
});

test('another athlete’s held writes are never drawn — shared test phones', () => {
  const list = [
    item('me', { kind: 'add', iso: '2026-09-23', entries: [food('mine')] }),
    item('them', { kind: 'add', iso: '2026-09-23', entries: [food('theirs')] }),
  ];
  assert.deepEqual(overlayDay('2026-09-23', [], opsFor(list, 'me')).map((e) => e.id), ['mine']);
  assert.deepEqual(opsFor(list, null), []);
});

test('the queue drops the OLDEST past its ceiling', () => {
  let list = [];
  for (let i = 0; i < MAX_OUTBOX + 3; i++) list = enqueue(list, item('me', { kind: 'remove', id: String(i) }, `k${i}`));
  assert.equal(list.length, MAX_OUTBOX);
  assert.equal(list[0].key, 'k3');
  assert.equal(list.at(-1).key, `k${MAX_OUTBOX + 2}`);
});

test('a corrupt or foreign store reads as an empty queue, never a throw', () => {
  assert.deepEqual(readableOutbox(null), []);
  assert.deepEqual(readableOutbox({}), []);
  const good = item('me', { kind: 'remove', id: 'a' }, 'k');
  const noOwner = { ...good, athleteId: '' };
  const oldShape = { ...good, v: 0 };
  const noKey = { ...good, key: undefined };
  assert.deepEqual(readableOutbox([good, noOwner, oldShape, noKey, 'junk']), [good]);
});
