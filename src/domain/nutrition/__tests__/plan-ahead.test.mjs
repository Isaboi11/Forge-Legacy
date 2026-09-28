import test from 'node:test';
import assert from 'node:assert/strict';

import { isAhead, shiftDay, totals } from '../day.ts';
import { RECIPE_BY_ID, itemTotals, logKey, setForgeRecipes } from '../meal-planner.ts';
import {
  applyChecks,
  checklistByMeal,
  checklistCount,
  entryRow,
  locatePlanItem,
  mayCheck,
  planRowsFor,
  plannedKcal,
  splitPlanned,
  weekDayIndex,
} from '../plan-ahead.ts';
import { overlayDay } from '../outbox.ts';
import { STARTER_RECIPES } from './fixtures/starter-recipes.ts';

/*
 * Plan ahead (PO 09-27, 0228): "when tomorrow comes it will all be down there with a check box next to it for
 * when you actually eat it" — unchecked counts toward nothing, a check logs it, unchecked stays unchecked.
 */

setForgeRecipes(STARTER_RECIPES);
const BREAKFAST = STARTER_RECIPES.find((r) => r.slot === 'breakfast').id;
const DINNER = STARTER_RECIPES.find((r) => r.slot === 'dinner').id;

const MON = '2026-09-28';
const food = (id, over = {}) => ({
  id,
  meal: 'breakfast',
  name: `Food ${id}`,
  quantity: 1,
  kcal: 100,
  protein: 10,
  carb: 12,
  fat: 3,
  source: 'usda',
  sourceKey: `usda:${id}`,
  grams: 100,
  micros: null,
  ...over,
});
const week = (over = {}) => ({
  weekStart: MON,
  seed: 1,
  targetKcal: 2500,
  prefsUpdatedAt: null,
  days: Array.from({ length: 7 }, (_, d) =>
    d === 2
      ? {
          items: [
            { slot: 'breakfast', recipeId: BREAKFAST, portion: 1, leftover: false },
            { slot: 'dinner', recipeId: DINNER, portion: 1.25, leftover: false },
          ],
        }
      : { items: [] },
  ),
  locked: {},
  logged: {},
  ...over,
});
const WED = shiftDay(MON, 2);

test('a planned row is split away from what was eaten', () => {
  const { eaten, planned } = splitPlanned([food('a'), food('b', { planned: true, preLogged: true }), food('c', { preLogged: true })]);
  assert.deepEqual(eaten.map((e) => e.id), ['a', 'c']);
  assert.deepEqual(planned.map((e) => e.id), ['b']);
  assert.equal(totals(eaten).kcal, 200, 'the planned 100 counts toward nothing');
});

test('only a day that has begun can be ticked', () => {
  assert.equal(mayCheck('2026-09-27', '2026-09-27'), true);
  assert.equal(mayCheck('2026-09-20', '2026-09-27'), true, 'a late logger can tick last week');
  assert.equal(mayCheck('2026-09-28', '2026-09-27'), false);
  assert.equal(isAhead('2026-09-28', '2026-09-27'), true);
  assert.equal(isAhead('2026-09-27', '2026-09-27'), false);
});

test('the plan week finds its day — and only its own week', () => {
  assert.equal(weekDayIndex({ weekStart: MON }, MON), 0);
  assert.equal(weekDayIndex({ weekStart: MON }, WED), 2);
  assert.equal(weekDayIndex({ weekStart: MON }, '2026-10-04'), 6, 'Sunday');
  assert.equal(weekDayIndex({ weekStart: MON }, '2026-10-05'), null, 'next Monday is next week');
  assert.equal(weekDayIndex({ weekStart: MON }, '2026-09-27'), null, 'the Sunday before');
});

test("the plan's meals are on their day, unticked, at the plan's numbers", () => {
  const rows = planRowsFor(week(), WED);
  assert.equal(rows.length, 2);
  const [b, d] = rows;
  assert.equal(b.meal, 'breakfast');
  assert.equal(b.name, RECIPE_BY_ID[BREAKFAST].name);
  assert.equal(b.checked, false);
  assert.equal(d.kcal, itemTotals({ recipeId: DINNER, portion: 1.25 }).kcal, '1¼ servings, not one');
  assert.match(d.detail, /1¼ servings/);
  assert.deepEqual(planRowsFor(week(), MON), [], 'nothing planned Monday');
  assert.deepEqual(planRowsFor(week(), '2026-10-07'), [], 'another week draws nothing');
  assert.deepEqual(planRowsFor(null, WED), []);
});

test('a logged plan meal is ticked; a recipe no longer in the book is left out, not drawn nameless', () => {
  const w = week();
  const key = logKey(2, w.days[2].items[0]);
  const rows = planRowsFor({ ...w, logged: { [key]: 'row-1' } }, WED);
  assert.equal(rows[0].checked, true);
  assert.equal(rows[1].checked, false);
  const gone = week();
  gone.days[2].items[0] = { ...gone.days[2].items[0], recipeId: 'u:deleted' };
  assert.equal(planRowsFor(gone, WED).length, 1);
});

test("each meal's checklist: the plan's dish first, then pre-logged food; eaten food that was never planned stays out", () => {
  const rows = [
    food('eaten-normal'),
    food('pre-eaten', { preLogged: true }),
    food('pre-waiting', { preLogged: true, planned: true, meal: 'dinner' }),
  ];
  const lists = checklistByMeal(rows, week(), WED);
  assert.deepEqual(lists.breakfast.map((r) => r.key), [`p:${logKey(2, week().days[2].items[0])}`, 'e:pre-eaten']);
  assert.deepEqual(lists.dinner.map((r) => r.key), [`p:${logKey(2, week().days[2].items[1])}`, 'e:pre-waiting']);
  assert.deepEqual(lists.lunch, []);
  assert.deepEqual(lists.snacks, []);
  assert.equal(lists.breakfast[1].checked, true);
  assert.equal(lists.dinner[1].checked, false);
  assert.equal(checklistCount(lists.breakfast), '1 of 2 checked');
});

test('planned calories are only what still waits on a tick', () => {
  const lists = checklistByMeal([food('x', { preLogged: true, planned: true, kcal: 250 }), food('y', { preLogged: true, kcal: 999 })], null, WED);
  assert.equal(plannedKcal(lists), 250);
});

test('entryRow says the portion as it was logged', () => {
  assert.equal(entryRow(food('a', { servingLabel: '1 cup' })).detail, '1 cup');
  assert.equal(entryRow(food('a', { servingLabel: '1 cup', quantity: 2 })).detail, '2 × 1 cup');
  assert.equal(entryRow(food('a', { servingLabel: null, quantity: 1.5 })).detail, '1.5 servings');
});

test('a plan meal is found again by its key, even when the week moved under it', () => {
  const w = week();
  const key = logKey(2, w.days[2].items[1]);
  assert.deepEqual(locatePlanItem(w, key), { d: 2, i: 1 });
  const moved = week();
  moved.days[2].items.reverse();
  assert.deepEqual(locatePlanItem(moved, key), { d: 2, i: 0 });
  assert.equal(locatePlanItem(week(), 'nope'), null);
});

/* ── the tick before the server answers ──────────────────────────────────── */

test('ticking a pre-logged row moves its calories into the day at once, and unticking moves them back', () => {
  const rows = [food('a', { preLogged: true, planned: true, kcal: 300 }), food('b', { kcal: 200 })];
  const on = applyChecks(rows, null, WED, { 'e:a': true });
  assert.equal(totals(on.rows.filter((e) => !e.planned)).kcal, 500);
  const off = applyChecks(on.rows, null, WED, { 'e:a': false });
  assert.equal(totals(off.rows.filter((e) => !e.planned)).kcal, 200);
});

test("ticking a plan meal draws a stand-in row with the plan's numbers — the SAME numbers the real row gets", () => {
  const w = week();
  const item = w.days[2].items[1];
  const key = `p:${logKey(2, item)}`;
  const { rows, week: after } = applyChecks([], w, WED, { [key]: true });
  const eaten = rows.filter((e) => !e.planned);
  assert.equal(eaten.length, 1);
  const t = itemTotals(item);
  assert.deepEqual(totals(eaten), { kcal: t.kcal, protein: t.protein, carb: t.carb, fat: t.fat });
  assert.equal(eaten[0].meal, 'dinner');
  assert.equal(planRowsFor(after, WED)[1].checked, true);
});

test('unticking a plan meal takes every row its mark remembers off the day (a saved meal is several)', () => {
  const w = week();
  const key = logKey(2, w.days[2].items[0]);
  const logged = { ...w, logged: { [key]: 'r1,r2' } };
  const rows = [food('r1'), food('r2'), food('other', { meal: 'lunch' })];
  const out = applyChecks(rows, logged, WED, { [`p:${key}`]: false });
  assert.deepEqual(out.rows.map((e) => e.id), ['other']);
  assert.equal(out.week.logged[key], undefined);
});

test('a tick asking for the state already shown changes nothing', () => {
  const w = week();
  const key = logKey(2, w.days[2].items[0]);
  const logged = { ...w, logged: { [key]: 'r1' } };
  const out = applyChecks([food('r1')], logged, WED, { [`p:${key}`]: true });
  assert.equal(out.rows.length, 1, 'no second stand-in');
});

/* ── the outbox ──────────────────────────────────────────────────────────── */

test('a tick made with no signal is drawn on the day before it drains', () => {
  const base = [food('a', { preLogged: true, planned: true })];
  const shown = overlayDay(WED, base, [{ kind: 'check', id: 'a', planned: false }]);
  assert.equal(shown[0].planned, false);
  const back = overlayDay(WED, shown, [{ kind: 'check', id: 'a', planned: true }]);
  assert.equal(back[0].planned, true);
});

test('a row moved onto a day ahead arrives there planned', () => {
  const moved = overlayDay('2026-10-01', [], [{ kind: 'move', id: 'a', iso: '2026-10-01', meal: 'lunch', entry: food('a'), planned: true }]);
  assert.equal(moved[0].planned, true);
  assert.equal(moved[0].preLogged, true);
  assert.equal(moved[0].meal, 'lunch');
  const kept = overlayDay(WED, [], [{ kind: 'move', id: 'a', iso: WED, meal: 'lunch', entry: food('a', { planned: true, preLogged: true }) }]);
  assert.equal(kept[0].planned, true, 'moved back without the flag: its tick state is kept');
});
