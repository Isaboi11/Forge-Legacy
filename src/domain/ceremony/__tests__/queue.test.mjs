/**
 * queue.test.mjs — locks the ceremony presentation order against the M-1 spec's LOCKED
 * priority table (Rank Up → Goal Achieved → Program Graduation → Honor Earned), the
 * ascending-rank tie-break, band stability, and input immutability.
 *
 * Run:  node --test src/domain/ceremony/__tests__/queue.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeCeremonies, orderCeremonies, CEREMONY_PRIORITY } from '../queue.ts';

let n = 0;
const ev = (kind, extra = {}) => ({ id: `${kind}-${n++}`, kind, ...extra });

test('LOCKED priority order: rankUp → goalAchieved → programGraduated → honorEarned', () => {
  const input = [
    ev('honorEarned', { honorName: 'h' }),
    ev('programGraduated', { programName: 'p' }),
    ev('goalAchieved', { goalName: 'g' }),
    ev('rankUp', { rank: { family: 'foundation', level: 1 } }),
  ];
  const out = orderCeremonies(input).map((e) => e.kind);
  assert.deepEqual(out, ['rankUp', 'goalAchieved', 'programGraduated', 'honorEarned']);
});

test('multiple rank ups fire in ascending rank order before lower priorities', () => {
  const input = [
    ev('goalAchieved', { goalName: 'g' }),
    ev('rankUp', { rank: { family: 'legend', level: 2 } }),
    ev('rankUp', { rank: { family: 'foundation', level: 3 } }),
  ];
  const out = orderCeremonies(input);
  assert.equal(out[0].kind, 'rankUp');
  assert.equal(out[0].rank.family, 'foundation'); // foundation precedes legend
  assert.equal(out[1].kind, 'rankUp');
  assert.equal(out[1].rank.family, 'legend');
  assert.equal(out[2].kind, 'goalAchieved');
});

test('stable within a priority band (enqueue order preserved)', () => {
  const out = orderCeremonies([ev('honorEarned', { honorName: 'A' }), ev('honorEarned', { honorName: 'B' })]);
  assert.equal(out[0].honorName, 'A');
  assert.equal(out[1].honorName, 'B');
});

test('orderCeremonies does not mutate its input', () => {
  const input = [ev('honorEarned', { honorName: 'h' }), ev('rankUp', { rank: { family: 'foundation', level: 1 } })];
  const snapshot = input.map((e) => e.id);
  orderCeremonies(input);
  assert.deepEqual(input.map((e) => e.id), snapshot);
});

test('premiumUpsell (not an earned ceremony) sorts last', () => {
  const out = orderCeremonies([ev('premiumUpsell'), ev('rankUp', { rank: { family: 'foundation', level: 1 } })]);
  assert.equal(out[0].kind, 'rankUp');
  assert.equal(out[1].kind, 'premiumUpsell');
  assert.ok(CEREMONY_PRIORITY.premiumUpsell > CEREMONY_PRIORITY.honorEarned);
});

/*
 * `CeremonyBase.id` has always been documented as the dedupe key and nothing ever deduped on it. That was
 * harmless while every caller enqueued once from an effect that ran once, and stopped being harmless when
 * W-17 began enqueueing M-4 from a `useQuery` result — which refetches whenever the units preference
 * changes, re-announcing the same graduation.
 */
test('mergeCeremonies drops an id already pending, and re-orders what it adds', () => {
  const grad = { id: 'program-grad-1', kind: 'programGraduated', programName: 'SF I' };
  const rank = { id: 'rank-13', kind: 'rankUp', rank: { family: 'architect', level: 1 } };

  const once = mergeCeremonies([], [grad]);
  assert.equal(once.length, 1);
  assert.deepEqual(mergeCeremonies(once, [grad]).map((e) => e.id), ['program-grad-1'], 'a refetch adds nothing');

  // Still ordered: rank (priority 1) must come before a program graduation (3) even though it arrived later.
  assert.deepEqual(mergeCeremonies(once, [rank]).map((e) => e.kind), ['rankUp', 'programGraduated']);
});

test('mergeCeremonies dedupes within a single batch too', () => {
  const a = { id: 'x', kind: 'goalAchieved', goalName: 'Squat 315' };
  assert.equal(mergeCeremonies([], [a, { ...a }]).length, 1);
});

test('mergeCeremonies never mutates the queue it was handed', () => {
  const q = [{ id: 'a', kind: 'goalAchieved', goalName: 'g' }];
  const out = mergeCeremonies(q, [{ id: 'b', kind: 'honorEarned', honorName: 'h' }]);
  assert.equal(q.length, 1);
  assert.equal(out.length, 2);
});
