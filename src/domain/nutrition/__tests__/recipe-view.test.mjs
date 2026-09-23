import test from 'node:test';
import assert from 'node:assert/strict';

import { batchNote, ingredientRows, metricAmount, servingsFor, usAmount } from '../recipe-view.ts';
import { RECIPE_SOURCES } from '../recipes-data.ts';

test('ounces for meat, one decimal, no trailing .0', () => {
  assert.equal(usAmount({ kind: 'oz' }, 160), '5.6 oz');
  assert.equal(usAmount({ kind: 'oz' }, 283.5), '10 oz');
});

test('cups round to quarters with fraction glyphs', () => {
  assert.equal(usAmount({ kind: 'cup', grams: 185 }, 85), '½ cup');
  assert.equal(usAmount({ kind: 'cup', grams: 240 }, 360), '1½ cups');
  assert.equal(usAmount({ kind: 'cup', grams: 240 }, 240), '1 cup');
});

test('a small fraction of a cup becomes spoons', () => {
  assert.equal(usAmount({ kind: 'cup', grams: 240 }, 30), '2 tbsp'); // ⅛ cup = 6 tsp = 2 tbsp
});

test('teaspoons: tbsp from 3 tsp up, quarter steps below, pinch at nothing', () => {
  assert.equal(usAmount({ kind: 'tsp', grams: 4.5 }, 9), '2 tsp');
  assert.equal(usAmount({ kind: 'tsp', grams: 4.5 }, 13.5), '1 tbsp');
  assert.equal(usAmount({ kind: 'tsp', grams: 2.3 }, 0.2), 'pinch');
});

test('each: halves, singular vs plural, never zero', () => {
  const egg = { kind: 'each', grams: 50, one: 'large egg', many: 'large eggs' };
  assert.equal(usAmount(egg, 100), '2 large eggs');
  assert.equal(usAmount(egg, 50), '1 large egg');
  assert.equal(usAmount({ kind: 'each', grams: 3, one: 'clove', many: 'cloves' }, 0.5), '½ clove');
});

test('grams read like a scale: whole grams, decimals under 10, pinch under half a gram', () => {
  assert.equal(metricAmount(160), '160 g');
  assert.equal(metricAmount(1340), '1,340 g');
  assert.equal(metricAmount(4.5), '4.5 g');
  assert.equal(metricAmount(0.3), 'pinch');
});

test('every ingredient of every recipe renders an amount in both systems', () => {
  for (const src of RECIPE_SOURCES) {
    for (const row of ingredientRows(src, 2, true)) {
      assert.ok(row.metric.length > 0, `${src.id} ${row.key}`);
      if (row.metric !== 'pinch') assert.ok(row.us && !row.us.startsWith('null'), `${src.id} ${row.key}: ${row.us}`);
    }
  }
});

test('metric only when the athlete uses metric', () => {
  const rows = ingredientRows(RECIPE_SOURCES[0], 1, false);
  assert.ok(rows.every((r) => r.us === null));
});

test('amounts scale with servings', () => {
  const chilli = RECIPE_SOURCES.find((r) => r.id === 'd02');
  const one = ingredientRows(chilli, 1, false).find((r) => r.key === 'ground_beef');
  const four = ingredientRows(chilli, 4, false).find((r) => r.key === 'ground_beef');
  assert.equal(one.metric, '160 g');
  assert.equal(four.metric, '640 g');
});

const ctx = (over) => ({ household: 2, leftover: false, makesLunchFor: null, cookedOn: null, slot: 'dinner', fromPlan: true, ...over });

test('a dinner that feeds tomorrow’s lunch prepares twice the household, and says why', () => {
  const s = servingsFor(ctx({ makesLunchFor: 'Tuesday' }));
  assert.deepEqual(s.options, [1, 4]);
  assert.equal(s.defaultN, 4);
  assert.equal(batchNote(ctx({ makesLunchFor: 'Tuesday' }), 4, 4), '4 servings · dinner for 2 + Tuesday lunch for 2');
});

test('a plain dinner prepares for the household', () => {
  const s = servingsFor(ctx({}));
  assert.deepEqual(s.options, [1, 2]);
  assert.equal(batchNote(ctx({}), 2, 2), '2 servings · dinner for 2');
  assert.equal(batchNote(ctx({}), 1, 2), '');
});

test('a leftover prepares nothing: one serving, and where it came from', () => {
  const c = ctx({ leftover: true, cookedOn: 'Monday', slot: 'lunch' });
  assert.deepEqual(servingsFor(c).options, [1]);
  assert.equal(batchNote(c, 1, null), 'Cooked with Monday dinner. Reheat 1 serving.');
});

test('cooking for one shows a single option and no note', () => {
  const s = servingsFor(ctx({ household: 1 }));
  assert.deepEqual(s.options, [1]);
  assert.equal(batchNote(ctx({ household: 1 }), 1, 1), '');
});

test('opened outside a plan: one serving', () => {
  assert.deepEqual(servingsFor(ctx({ fromPlan: false })).options, [1]);
});
