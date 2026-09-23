import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canEditPortion,
  countLabel,
  dayChoices,
  defaultSavedMealName,
  defaultTargetDay,
  entryMacroLine,
  entrySubtitle,
  isSameSpot,
  mealBreakdown,
  mealDateLabel,
  moveButtonLabel,
  saveMealHelper,
  slotChoices,
} from '../meal.ts';

/** A logged food with everything a good USDA record gives. Micros are PER 100 g; `grams` is the portion. */
const oats = {
  id: 'a',
  meal: 'breakfast',
  name: 'Rolled Oats',
  brand: 'Generic',
  servingLabel: '80 g',
  quantity: 80,
  kcal: 300,
  protein: 10.6,
  carb: 54.2,
  fat: 5.2,
  source: 'usda',
  sourceKey: 'usda:1',
  grams: 80,
  micros: { fiber: 10.1, sugar: 1, satFat: 1.1, sodium: 6, cholesterol: 0 },
};

/** A branded row whose source gave macros and nothing else — the common case. */
const bar = {
  id: 'b',
  meal: 'breakfast',
  name: 'Protein Bar',
  brand: 'Brand',
  servingLabel: '1 bar (60 g)',
  quantity: 1,
  kcal: 220,
  protein: 20,
  carb: 23,
  fat: 7,
  source: 'off',
  sourceKey: 'off:2',
  grams: 60,
  micros: null,
};

/** Calories somebody typed. No food behind it, so no key, no weight, no micronutrients — ever. */
const quick = {
  id: 'c',
  meal: 'breakfast',
  name: 'Quick add',
  brand: null,
  servingLabel: null,
  quantity: 1,
  kcal: 150,
  protein: 0,
  carb: 0,
  fat: 0,
  source: 'quick',
  sourceKey: null,
  grams: null,
  micros: null,
};

/* ── rows ─────────────────────────────────────────────────────────────────── */

test('a row says its brand and its serving', () => {
  assert.equal(entrySubtitle(oats), 'Generic · 80 g');
});

test('a Quick Add has neither, so it says what it is instead of showing an empty line', () => {
  assert.equal(entrySubtitle(quick), 'Quick add');
});

test('the macro line rounds once, at the end', () => {
  assert.equal(entryMacroLine(oats), 'P 11 · C 54 · F 5');
});

test('one food is "1 food"', () => {
  assert.equal(countLabel(1), '1 food');
  assert.equal(countLabel(0), '0 foods');
  assert.equal(countLabel(4), '4 foods');
});

test('a Quick Add cannot have its portion edited — there is no food to re-multiply', () => {
  assert.equal(canEditPortion(oats), true);
  assert.equal(canEditPortion(quick), false);
  /* A catalogue row whose key was lost is the same situation, whatever its source says. */
  assert.equal(canEditPortion({ ...oats, sourceKey: null }), false);
});

/* ── the breakdown ────────────────────────────────────────────────────────── */

test('the four stored figures are always there, in the design’s order', () => {
  const { rows } = mealBreakdown([bar]);
  assert.deepEqual(
    rows.map((r) => r.label),
    ['Calories', 'Protein', 'Carbs', 'Fat'],
  );
  assert.equal(rows[0].value, '220');
  assert.equal(rows[1].value, '20 g');
});

test('a meal whose foods all report micronutrients shows them, indented under their macro', () => {
  const { rows, partial } = mealBreakdown([oats]);
  assert.equal(partial, false);
  assert.deepEqual(
    rows.map((r) => r.label),
    ['Calories', 'Protein', 'Carbs', 'Fiber', 'Sugar', 'Fat', 'Saturated fat', 'Sodium', 'Cholesterol'],
  );
  const fiber = rows.find((r) => r.key === 'fiber');
  assert.equal(fiber.indent, true);
  /* 10.1 g per 100 g of an 80 g portion. */
  assert.equal(fiber.value, '8.1 g');
  assert.equal(rows.find((r) => r.key === 'sodium').indent, false);
  assert.equal(rows.find((r) => r.key === 'sodium').value, '5 mg');
});

test('⚠ a micronutrient only half the meal reports is DROPPED, not summed short', () => {
  const { rows, partial } = mealBreakdown([oats, bar]);
  assert.deepEqual(
    rows.map((r) => r.label),
    ['Calories', 'Protein', 'Carbs', 'Fat'],
  );
  /* The screen has to say why the list is short, so the flag has to be raised. */
  assert.equal(partial, true);
  assert.equal(rows[0].value, '520');
});

test('a meal where nobody reported one is not "partial" — nothing was dropped, it was never known', () => {
  const { partial } = mealBreakdown([bar, quick]);
  assert.equal(partial, false);
});

test('a portion with no weight cannot scale a per-100 g figure, so it counts as not reporting', () => {
  const weightless = { ...oats, id: 'd', grams: null };
  assert.equal(mealBreakdown([weightless]).rows.length, 4);
});

test('an empty meal still draws its four zeros rather than nothing', () => {
  const { rows } = mealBreakdown([]);
  assert.deepEqual(rows.map((r) => r.value), ['0', '0 g', '0 g', '0 g']);
});

/* ── the header ───────────────────────────────────────────────────────────── */

test('the eyebrow names the day and dates it', () => {
  assert.equal(mealDateLabel('2026-09-22', '2026-09-22'), 'Today · Tue, Sep 22');
  assert.equal(mealDateLabel('2026-09-21', '2026-09-22'), 'Yesterday · Mon, Sep 21');
});

test('a day far enough back is already its own date, and is not said twice', () => {
  assert.equal(mealDateLabel('2026-09-16', '2026-09-22'), 'Wed, Sep 16');
});

/* ── move and copy ────────────────────────────────────────────────────────── */

test('the day pills are relative to the day on screen, not to today', () => {
  assert.deepEqual(dayChoices('2026-09-16', '2026-09-22'), [
    { iso: '2026-09-15', label: 'Tue, Sep 15' },
    { iso: '2026-09-16', label: 'Wed, Sep 16' },
    { iso: '2026-09-17', label: 'Thu, Sep 17' },
  ]);
});

test('on today they read as the design does', () => {
  assert.deepEqual(
    dayChoices('2026-09-22', '2026-09-22').map((d) => d.label),
    ['Yesterday', 'Today', 'Tomorrow'],
  );
});

test('move opens where the food already is; copy opens on the next day, because copying is meal prep', () => {
  assert.equal(defaultTargetDay('2026-09-22', 'move'), '2026-09-22');
  assert.equal(defaultTargetDay('2026-09-22', 'copy'), '2026-09-23');
});

test('moving a row to where it already is is refused by the button, not by a toast afterwards', () => {
  assert.equal(isSameSpot('2026-09-22', 'lunch', '2026-09-22', 'lunch'), true);
  assert.equal(isSameSpot('2026-09-22', 'lunch', '2026-09-22', 'dinner'), false);
  assert.equal(isSameSpot('2026-09-22', 'lunch', '2026-09-23', 'lunch'), false);
  assert.equal(moveButtonLabel('move', 'Today', 'lunch', true), 'Choose a meal or day');
  assert.equal(moveButtonLabel('move', 'Tomorrow', 'dinner', false), 'Move to Tomorrow · Dinner');
});

test('copy is never a no-op — the same spot is a second helping, and the button says so', () => {
  assert.equal(moveButtonLabel('copy', 'Today', 'lunch', true), 'Copy to Today · Lunch');
});

test('"Current" marks the slot the food is in, and only on its own day', () => {
  const sameDay = slotChoices('lunch', '2026-09-22', '2026-09-22');
  assert.deepEqual(sameDay.map((s) => s.note), ['', 'Current', '', '']);
  const otherDay = slotChoices('lunch', '2026-09-22', '2026-09-23');
  assert.deepEqual(otherDay.map((s) => s.note), ['', '', '', '']);
});

/* ── save as a meal ───────────────────────────────────────────────────────── */

test('the name field opens on the meal it came from', () => {
  assert.equal(defaultSavedMealName('breakfast'), 'Usual Breakfast');
});

test('the helper says what is being saved and where to find it', () => {
  assert.equal(
    saveMealHelper([oats, bar]),
    '2 foods · 520 cal. Find it under My Meals in Log Food.',
  );
});
