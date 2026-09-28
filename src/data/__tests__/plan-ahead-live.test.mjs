import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * PLAN AHEAD, END TO END (PO 2026-09-27, 0228) — the REAL `nutrition-live.ts`, against an in-memory database.
 *
 * PO: "Make it seamless. Test it over and over again to make sure it doesn't break and it's not logging wrong."
 * The rules under test:
 *   1. Food put on a day that has not begun is PLANNED and counts toward nothing — not the ring, the week,
 *      the range totals.
 *   2. A check logs it; unchecking takes it back. Nothing ever ticks itself, and a day that passes leaves an
 *      unticked row unticked.
 *   3. The Meal Plan's meals (manual or Holt's — both are the saved week) are on their days, and the check
 *      writes the diary row ON THAT DAY, once, however many times it is tapped.
 *   4. A tick with no signal is held and lands when signal returns.
 *   5. What the screen draws the instant a box is tapped (`applyChecks`) is what the diary says after.
 */

const { db, ATHLETE } = await import('./harness/fake-supabase.mjs');
const { store } = await import('./harness/stubs.mjs');
const live = await import('../nutrition-live.ts');
const { localToday, shiftDay, totals } = await import('../../domain/nutrition/day.ts');
const { itemTotals, logKey, mondayOf, setForgeRecipes } = await import('../../domain/nutrition/meal-planner.ts');
const { applyChecks, checklistByMeal, planRowsFor } = await import('../../domain/nutrition/plan-ahead.ts');
const { STARTER_RECIPES } = await import('../../domain/nutrition/__tests__/fixtures/starter-recipes.ts');

setForgeRecipes(STARTER_RECIPES);
const RECIPE = { breakfast: STARTER_RECIPES.find((r) => r.slot === 'breakfast').id, dinner: STARTER_RECIPES.find((r) => r.slot === 'dinner').id };

const TODAY = localToday();
const TOMORROW = shiftDay(TODAY, 1);
const YESTERDAY = shiftDay(TODAY, -1);

const food = (name, kcal, meal = 'breakfast') => ({
  meal,
  source: 'usda',
  sourceKey: `usda:${name}`,
  name,
  servingLabel: '1 serving',
  quantity: 1,
  macros: { kcal, protein: Math.round(kcal / 20), carb: Math.round(kcal / 10), fat: Math.round(kcal / 40), grams: 100 },
});

const rowsOn = (iso) => db.rows('food_log_entries').filter((r) => r.logged_on === iso);
const eatenKcal = (iso) => Math.round(rowsOn(iso).filter((r) => !r.planned).reduce((t, r) => t + Number(r.kcal), 0));

/** A saved Meal Plan week — what both the manual planner and Holt's fill leave behind (`meal_plan_weeks`). */
function putWeek(weekStart, byDay) {
  const days = Array.from({ length: 7 }, (_, d) => ({ items: byDay[d] ?? [] }));
  const rows = db.rows('meal_plan_weeks').filter((r) => r.week_start !== weekStart);
  rows.push({ athlete_id: ATHLETE, week_start: weekStart, seed: 1, target_kcal: 2500, prefs_updated_at: null, days, locked: {}, logged: {}, cleared_at: null, grocery: {} });
  db.tables.set('meal_plan_weeks', rows);
}
const dayIndex = (iso) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
const planItem = (slot, portion = 1) => ({ slot, recipeId: RECIPE[slot], portion, leftover: false });

/**
 * Drain until the queue is EMPTY. `drainFoodOutbox` returns at once while a drain it kicked itself (a write
 * queued behind others) is still running — so one call is not "everything has landed".
 */
async function drained() {
  for (let i = 0; i < 50 && store.get('forge.nutritionOutbox.v1'); i++) {
    await live.drainFoodOutbox();
    await new Promise((r) => setTimeout(r, 1));
  }
}

function fresh() {
  db.reset();
  store.clear();
}

test.beforeEach(fresh);

/* ── 1 · planned counts toward nothing ───────────────────────────────────── */

test('food put on tomorrow is planned: stored planned, drawn apart, and in no total', async () => {
  const [row] = await live.addEntries(TOMORROW, [food('oats', 350)]);
  assert.equal(row.planned, true);
  const stored = rowsOn(TOMORROW);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].planned, true);
  assert.equal(stored[0].pre_logged, true);

  const day = await live.fetchDay(TOMORROW);
  assert.equal(day.entries.length, 0, 'nothing eaten tomorrow');
  assert.equal(day.planned.length, 1);
  assert.equal(totals(day.entries).kcal, 0);

  const range = await live.fetchRangeTotals(YESTERDAY, TOMORROW);
  assert.equal(range.find((d) => d.iso === TOMORROW), undefined, 'a day of only planned food is absent, not a zero');
});

test('food logged today is an ordinary row — the write does not even name the new columns', async () => {
  await live.addEntries(TODAY, [food('eggs', 200)]);
  const write = db.log.find((l) => l.table === 'food_log_entries');
  assert.equal('planned' in write.payload[0], false);
  assert.equal('pre_logged' in write.payload[0], false);
  const day = await live.fetchDay(TODAY);
  assert.equal(day.entries.length, 1);
  assert.equal(day.planned.length, 0);
});

/* ── 2 · the check ───────────────────────────────────────────────────────── */

test('when the day comes, a check logs it and an uncheck takes it back — twice over, still one row', async () => {
  /* Pre-logged yesterday for today: the row as the database holds it. */
  db.rows('food_log_entries').push({ id: 'pre-1', athlete_id: ATHLETE, logged_on: TODAY, meal: 'lunch', source: 'usda', source_key: 'usda:wrap', name: 'Wrap', brand: null, serving_label: '1', grams: 200, quantity: 1, kcal: 480, protein: 30, carb: 50, fat: 15, micros: null, planned: true, pre_logged: true, created_at: new Date().toISOString() });

  let day = await live.fetchDay(TODAY);
  assert.equal(totals(day.entries).kcal, 0);
  assert.equal(day.planned[0].id, 'pre-1');

  await live.checkEntry('pre-1', true, TODAY);
  await live.checkEntry('pre-1', true, TODAY);
  day = await live.fetchDay(TODAY);
  assert.equal(day.entries.length, 1);
  assert.equal(totals(day.entries).kcal, 480);
  assert.equal(rowsOn(TODAY).length, 1, 'ticking twice is one row');
  assert.equal((await live.fetchRangeTotals(TODAY, TODAY))[0].kcal, 480, 'and the week sees it');

  await live.checkEntry('pre-1', false, TODAY);
  day = await live.fetchDay(TODAY);
  assert.equal(totals(day.entries).kcal, 0);
  assert.equal(day.planned.length, 1, 'back on the plan, still there');
});

test('nothing can be ticked on a day that has not begun', async () => {
  const [row] = await live.addEntries(TOMORROW, [food('oats', 350)]);
  await assert.rejects(() => live.checkEntry(row.id, true, TOMORROW), { message: live.PLAN_NOT_YET });
  assert.equal(rowsOn(TOMORROW)[0].planned, true);
});

test('an unticked row on a day that has passed stays unticked, and counts toward nothing, however often it is read', async () => {
  db.rows('food_log_entries').push({ id: 'old', athlete_id: ATHLETE, logged_on: YESTERDAY, meal: 'dinner', source: 'quick', source_key: null, name: 'Pizza', brand: null, serving_label: null, grams: null, quantity: 1, kcal: 900, protein: 30, carb: 90, fat: 40, micros: null, planned: true, pre_logged: true, created_at: new Date().toISOString() });
  for (let i = 0; i < 5; i++) {
    const day = await live.fetchDay(YESTERDAY);
    assert.equal(day.entries.length, 0);
    assert.equal(day.planned.length, 1);
  }
  assert.deepEqual(await live.fetchRangeTotals(YESTERDAY, YESTERDAY), []);
  assert.equal(await live.mealHasFood(YESTERDAY, 'dinner'), false, '"Copy yesterday" will not copy what was never eaten');
  assert.deepEqual(await live.copyMealFrom(YESTERDAY, TODAY, 'dinner'), []);
  assert.equal(db.rows('food_log_entries').find((r) => r.id === 'old').planned, true);
});

/* ── 3 · the Meal Plan's meals ───────────────────────────────────────────── */

test("the plan's meals are on today's checklist; the check logs ONE row on the planned day with the plan's numbers", async () => {
  const week = mondayOf(TODAY);
  const d = dayIndex(TODAY);
  putWeek(week, { [d]: [planItem('breakfast'), planItem('dinner', 1.25)] });

  let view = await live.fetchPlanDay(TODAY);
  const lists = checklistByMeal([...view.day.entries, ...view.day.planned], view.week, TODAY);
  assert.equal(lists.breakfast.length, 1);
  assert.equal(lists.dinner.length, 1);
  assert.equal(lists.dinner[0].checked, false);
  assert.equal(totals(view.day.entries).kcal, 0, 'the plan is not eaten until ticked');

  const key = lists.dinner[0].planKey;
  await live.checkPlanMeal(week, key, TODAY, true);
  await live.checkPlanMeal(week, key, TODAY, true); // a double tap
  const rows = rowsOn(TODAY);
  assert.equal(rows.length, 1, 'one row, however many taps');
  assert.equal(rows[0].meal, 'dinner');
  assert.equal(rows[0].planned, false);
  assert.equal(Number(rows[0].kcal), itemTotals(planItem('dinner', 1.25)).kcal, '1¼ servings of it');

  view = await live.fetchPlanDay(TODAY);
  assert.equal(planRowsFor(view.week, TODAY).find((r) => r.planKey === key).checked, true);
  assert.equal(view.week.logged[key], rows[0].id, 'the plan remembers exactly that row');

  await live.checkPlanMeal(week, key, TODAY, false);
  await live.checkPlanMeal(week, key, TODAY, false);
  assert.equal(rowsOn(TODAY).length, 0, 'unticked: the row is gone');
  view = await live.fetchPlanDay(TODAY);
  assert.equal(view.week.logged[key], undefined);
});

test("tomorrow's plan meal is on tomorrow, and cannot be ticked until tomorrow", async () => {
  const week = mondayOf(TOMORROW);
  putWeek(week, { [dayIndex(TOMORROW)]: [planItem('breakfast')] });
  const view = await live.fetchPlanDay(TOMORROW);
  const [row] = planRowsFor(view.week, TOMORROW);
  assert.ok(row, "tomorrow's breakfast is on tomorrow");
  await assert.rejects(() => live.checkPlanMeal(week, row.planKey, TOMORROW, true), { message: live.PLAN_NOT_YET });
  assert.equal(db.rows('food_log_entries').length, 0);
});

test("yesterday's plan meal, ticked today, is logged on YESTERDAY — the late logger (flow scenario A7)", async () => {
  const week = mondayOf(YESTERDAY);
  putWeek(week, { [dayIndex(YESTERDAY)]: [planItem('dinner')] });
  const view = await live.fetchPlanDay(YESTERDAY);
  const [row] = planRowsFor(view.week, YESTERDAY);
  await live.checkPlanMeal(week, row.planKey, YESTERDAY, true);
  assert.equal(rowsOn(YESTERDAY).length, 1);
  assert.equal(rowsOn(TODAY).length, 0, 'not filed on today');
});

test('a saved meal in the plan logs every one of its foods, and the uncheck takes every one back', async () => {
  db.rows('saved_meals').push({ id: 'meal-1', athlete_id: ATHLETE, name: 'Usual lunch' });
  for (const [i, n] of ['Rice', 'Chicken', 'Broccoli'].entries()) {
    db.rows('saved_meal_items').push({ id: `it-${i}`, meal_id: 'meal-1', source: 'usda', source_key: `usda:${n}`, name: n, brand: null, serving_label: '1', grams: 100, quantity: 1, kcal: 100 * (i + 1), protein: 5, carb: 10, fat: 2 });
  }
  const week = mondayOf(TODAY);
  putWeek(week, { [dayIndex(TODAY)]: [{ slot: 'lunch', recipeId: 'm:meal-1', portion: 1, leftover: false }] });
  const view = await live.fetchPlanDay(TODAY);
  const [row] = planRowsFor(view.week, TODAY);
  assert.equal(row.name, 'Usual lunch');
  assert.equal(row.kcal, 600);

  await live.checkPlanMeal(week, row.planKey, TODAY, true);
  assert.equal(rowsOn(TODAY).length, 3);
  assert.equal(eatenKcal(TODAY), 600);
  await live.checkPlanMeal(week, row.planKey, TODAY, false);
  assert.equal(rowsOn(TODAY).length, 0);
});

test('if the plan cannot be saved after the diary row was written, the row is taken back out — never counted AND unticked', async () => {
  const week = mondayOf(TODAY);
  putWeek(week, { [dayIndex(TODAY)]: [planItem('breakfast')] });
  const view = await live.fetchPlanDay(TODAY);
  const [row] = planRowsFor(view.week, TODAY);
  db.fail = (table, mode) => (table === 'meal_plan_weeks' && mode === 'upsert' ? { code: '42501', message: 'permission denied' } : null);
  await assert.rejects(() => live.checkPlanMeal(week, row.planKey, TODAY, true));
  db.fail = null;
  assert.equal(rowsOn(TODAY).length, 0);
  const again = await live.fetchPlanDay(TODAY);
  assert.equal(planRowsFor(again.week, TODAY)[0].checked, false);
});

test('Meal Plan / Recipe "Log meal" (togglePlanLog) now writes to the day the meal is planned for', async () => {
  const week = mondayOf(YESTERDAY);
  putWeek(week, { [dayIndex(YESTERDAY)]: [planItem('breakfast')] });
  const w = await live.fetchMealPlanWeek(week);
  const out = await live.togglePlanLog(w, dayIndex(YESTERDAY), 0, YESTERDAY);
  assert.equal(out.logged, true);
  assert.equal(rowsOn(YESTERDAY).length, 1);
});

/* ── moving, copying, clearing ───────────────────────────────────────────── */

test('moving eaten food onto tomorrow makes it planned there; copying a meal onto tomorrow is meal prep, planned', async () => {
  const [a] = await live.addEntries(TODAY, [food('toast', 150)]);
  await live.addEntries(TODAY, [food('jam', 50)]);
  await live.copyMealTo({ iso: TODAY, meal: 'breakfast' }, { iso: TOMORROW, meal: 'breakfast' });
  assert.equal(rowsOn(TOMORROW).length, 2);
  assert.ok(rowsOn(TOMORROW).every((r) => r.planned && r.pre_logged));
  assert.equal(eatenKcal(TODAY), 200, 'the originals are untouched');

  await live.moveEntry(a.id, { iso: TOMORROW, meal: 'lunch' }, a);
  const moved = db.rows('food_log_entries').find((r) => r.id === a.id);
  assert.equal(moved.logged_on, TOMORROW);
  assert.equal(moved.planned, true);
  assert.equal(eatenKcal(TODAY), 50);
  assert.equal((await live.fetchDay(TOMORROW)).entries.length, 0, 'still nothing eaten tomorrow');
});

test('a planned meal on tomorrow copies on as planned; clearing tomorrow clears the planned food', async () => {
  await live.addEntries(TOMORROW, [food('oats', 350), food('berries', 60)]);
  await live.copyMealTo({ iso: TOMORROW, meal: 'breakfast' }, { iso: shiftDay(TODAY, 2), meal: 'breakfast' });
  assert.equal(rowsOn(shiftDay(TODAY, 2)).filter((r) => r.planned).length, 2);
  await live.clearMeal(TOMORROW, 'breakfast');
  assert.equal(rowsOn(TOMORROW).length, 0);
});

/* ── 4 · no signal ───────────────────────────────────────────────────────── */

test('ticks and pre-logs made with no signal are drawn at once and land when signal returns', async () => {
  const [pre] = await live.addEntries(TOMORROW, [food('soup', 300, 'lunch')]);
  db.rows('food_log_entries').push({ id: 'due', athlete_id: ATHLETE, logged_on: TODAY, meal: 'dinner', source: 'quick', source_key: null, name: 'Tacos', brand: null, serving_label: null, grams: null, quantity: 1, kcal: 700, protein: 35, carb: 60, fat: 30, micros: null, planned: true, pre_logged: true, created_at: new Date().toISOString() });
  await live.fetchDay(TODAY); // the day read once with signal — it is in the cache
  await live.fetchDay(TOMORROW);

  db.offline = true;
  await live.checkEntry('due', true, TODAY);
  const [later] = await live.addEntries(TOMORROW, [food('bread', 120, 'lunch')]);
  let today = await live.fetchDay(TODAY);
  assert.equal(totals(today.entries).kcal, 700, 'the tick is drawn with no signal');
  const tomorrow = await live.fetchDay(TOMORROW);
  assert.deepEqual(tomorrow.planned.map((e) => e.id).sort(), [pre.id, later.id].sort(), 'the held pre-log is drawn, planned');
  assert.equal(tomorrow.entries.length, 0);
  assert.equal(db.rows('food_log_entries').find((r) => r.id === 'due').planned, true, 'nothing reached the server yet');

  db.offline = false;
  await live.drainFoodOutbox();
  assert.equal(db.rows('food_log_entries').find((r) => r.id === 'due').planned, false);
  const landed = db.rows('food_log_entries').find((r) => r.id === later.id);
  assert.equal(landed.planned, true);
  assert.equal(landed.pre_logged, true);
  today = await live.fetchDay(TODAY);
  assert.equal(totals(today.entries).kcal, 700);
});

/* ── 5 · the screen's instant tick is the truth ──────────────────────────── */

test('RANDOMISED — 2,500 steps (25 seeds × 100) of logging, planning, ticking, moving and losing signal never count a planned meal or log one twice', async () => {
  const seedRng = (s) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (const seed of Array.from({ length: 25 }, (_, i) => 1 + i * 7919)) {
    fresh();
    const rnd = seedRng(seed);
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
    const DAYS = [shiftDay(TODAY, -2), YESTERDAY, TODAY, TOMORROW, shiftDay(TODAY, 2)];
    for (const iso of DAYS) {
      const wk = mondayOf(iso);
      const cur = db.rows('meal_plan_weeks').find((r) => r.week_start === wk);
      const byDay = cur ? Object.fromEntries(cur.days.map((d, i) => [i, d.items])) : {};
      byDay[dayIndex(iso)] = [planItem('breakfast'), planItem('dinner', pick([0.75, 1, 1.25, 1.5]))];
      putWeek(wk, byDay);
    }
    const planEaten = new Map(); // planKey@iso → kcal expected in the diary while ticked

    for (let step = 0; step < 100; step++) {
      const iso = pick(DAYS);
      const action = rnd();
      const label = `seed ${seed} step ${step} on ${iso}`;
      if (!db.offline && rnd() < 0.08) {
        db.offline = true;
      } else if (db.offline && rnd() < 0.3) {
        db.offline = false;
        await drained();
      }

      if (action < 0.25) {
        await live.addEntries(iso, [food(`f${step}`, 50 + Math.floor(rnd() * 500), pick(['breakfast', 'lunch', 'dinner', 'snacks']))]);
      } else if (action < 0.55) {
        /* A tick on a pre-logged row, predicted first exactly as the screen draws it. */
        if (db.offline) continue;
        const view = await live.fetchPlanDay(iso);
        const all = [...view.day.entries, ...view.day.planned];
        const pre = all.filter((e) => e.preLogged);
        if (!pre.length) continue;
        const e = pick(pre);
        const want = !!e.planned;
        const predicted = applyChecks(all, view.week, iso, { [`e:${e.id}`]: want });
        if (want && iso > TODAY) {
          await assert.rejects(() => live.checkEntry(e.id, true, iso), label);
          continue;
        }
        await live.checkEntry(e.id, want, iso);
        const after = await live.fetchDay(iso);
        assert.deepEqual(totals(after.entries), totals(predicted.rows.filter((r) => !r.planned)), `${label}: the instant tick matched the diary`);
      } else if (action < 0.85) {
        if (db.offline) continue;
        const view = await live.fetchPlanDay(iso);
        const rows = planRowsFor(view.week, iso);
        if (!rows.length) continue;
        const r = pick(rows);
        const want = rnd() < 0.7 ? !r.checked : r.checked; // mostly flips, sometimes a repeat tap
        if (want && !r.checked && iso > TODAY) {
          await assert.rejects(() => live.checkPlanMeal(r.weekStart, r.planKey, iso, true), label);
          continue;
        }
        const all = [...view.day.entries, ...view.day.planned];
        const predicted = applyChecks(all, view.week, iso, { [r.key]: want });
        await live.checkPlanMeal(r.weekStart, r.planKey, iso, want);
        const after = await live.fetchDay(iso);
        assert.deepEqual(totals(after.entries), totals(predicted.rows.filter((x) => !x.planned)), `${label}: the instant plan tick matched the diary`);
        if (want) planEaten.set(`${r.planKey}@${iso}`, r.kcal);
        else planEaten.delete(`${r.planKey}@${iso}`);
      } else {
        const view = db.offline ? null : await live.fetchDay(iso);
        const all = view ? [...view.entries, ...view.planned] : [];
        if (!all.length) continue;
        const e = pick(all);
        const to = pick(DAYS);
        await live.moveEntry(e.id, { iso: to, meal: e.meal }, e);
        /* A plan meal's row moved off its day is no longer that meal's row there — forget it for the ledger. */
        for (const k of [...planEaten.keys()]) if (k.endsWith(`@${iso}`)) planEaten.delete(k);
      }
    }

    db.offline = false;
    await drained();

    /* ══ the invariants, read back through the data layer ══ */
    const range = await live.fetchRangeTotals(DAYS[0], DAYS[DAYS.length - 1]);
    for (const iso of DAYS) {
      const stored = rowsOn(iso);
      const day = await live.fetchDay(iso);
      assert.ok(day.entries.every((e) => !e.planned) && day.planned.every((e) => e.planned), `seed ${seed}: ${iso} split cleanly`);
      assert.equal(day.entries.length + day.planned.length, stored.length, `seed ${seed}: ${iso} draws every row`);
      assert.equal(totals(day.entries).kcal, eatenKcal(iso), `seed ${seed}: ${iso} total is the eaten rows only`);
      assert.equal(range.find((d) => d.iso === iso)?.kcal ?? 0, eatenKcal(iso), `seed ${seed}: ${iso} week total skips planned`);
      if (iso > TODAY) assert.ok(stored.every((r) => r.planned), `seed ${seed}: nothing is EATEN on a day that has not begun (${iso})`);
    }
    /* Every plan mark points at rows that exist, once each — no double logging. */
    const ids = db.rows('food_log_entries').map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, `seed ${seed}: no duplicate rows`);
    for (const w of db.rows('meal_plan_weeks')) {
      const marked = Object.values(w.logged).flatMap((v) => v.split(','));
      assert.equal(new Set(marked).size, marked.length, `seed ${seed}: no row claimed by two plan meals`);
    }
    assert.equal(store.get('forge.nutritionOutbox.v1') ?? null, null, `seed ${seed}: the outbox drained`);
  }
});
