import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * PLAN AHEAD BEFORE 0228 IS PASTED — the app ships over the air, and the migration is a paste in the SQL editor.
 * If the app lands first, the diary must work exactly as it did, and a future day must REFUSE food rather than
 * write it as eaten (a row with no `planned` column would count on a day that has not happened).
 * Its own file: the column latch is per session, like the app's.
 */

const { db } = await import('./harness/fake-supabase.mjs');
const { store } = await import('./harness/stubs.mjs');
const live = await import('../nutrition-live.ts');
const { localToday, shiftDay, totals } = await import('../../domain/nutrition/day.ts');

const TODAY = localToday();
const TOMORROW = shiftDay(TODAY, 1);
const food = (name, kcal) => ({ meal: 'lunch', source: 'usda', sourceKey: `usda:${name}`, name, quantity: 1, macros: { kcal, protein: 10, carb: 10, fat: 5, grams: 100 } });

test('with no planned column: today logs and reads as before; tomorrow refuses food and writes nothing', async () => {
  db.reset();
  store.clear();
  db.missing = new Set(['planned', 'pre_logged']);

  await live.addEntries(TODAY, [food('soup', 300)]);
  const day = await live.fetchDay(TODAY);
  assert.equal(day.entries.length, 1);
  assert.equal(totals(day.entries).kcal, 300);
  assert.equal((await live.fetchRangeTotals(TODAY, TODAY))[0].kcal, 300);

  await assert.rejects(() => live.addEntries(TOMORROW, [food('oats', 350)]), { message: live.PLAN_NOT_LIVE });
  assert.equal(db.rows('food_log_entries').filter((r) => r.logged_on === TOMORROW).length, 0);
  await assert.rejects(() => live.addEntries(TOMORROW, [food('oats', 350)]), { message: live.PLAN_NOT_LIVE }, 'and again, from the latch');
  const [row] = await live.fetchDay(TODAY).then((d) => d.entries);
  await assert.rejects(() => live.moveEntry(row.id, { iso: TOMORROW, meal: 'lunch' }, row), { message: live.PLAN_NOT_LIVE });
  assert.equal(db.rows('food_log_entries')[0].logged_on, TODAY, 'the move did not happen');
});
