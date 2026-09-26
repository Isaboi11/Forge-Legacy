import { fetchDay, fetchGroceryState, fetchMealPlanPrefs, fetchMealPlanWeek } from '@/data/nutrition-live';
import { leftTodayLine } from '@/domain/coach/kitchen';
import { localToday, totals } from '@/domain/nutrition/day';
import { groceryList, planSignature, stateFor } from '@/domain/nutrition/grocery';
import { mondayOf, planIsReadable } from '@/domain/nutrition/meal-planner';

/**
 * WHAT'S IN THE KITCHEN — this week's grocery list, bought or already at home, by name.
 *
 * `Holt-Kitchen-Scope-v1.0` §1b: *"What can I make?" starts from this week's bought + have items.* The same
 * derivation the Grocery List screen and the Home card use (`groceryList` → `stateFor`), so Holt sees the list
 * the athlete sees. Owner-only, no new permission. Never throws: an empty kitchen is an answer, not an error.
 */
export async function kitchenPantryLive(): Promise<string[]> {
  try {
    const monday = mondayOf(localToday());
    const [week, prefs, saved] = await Promise.all([fetchMealPlanWeek(monday), fetchMealPlanPrefs(), fetchGroceryState(monday)]);
    const extras = (saved?.extras ?? []).map((x) => x.name);
    if (!week || !planIsReadable(week.days)) return extras.slice(0, 30);
    const household = prefs?.household ?? 1;
    const list = groceryList(week.days, household);
    const state = stateFor(saved, list, planSignature(week.days, household));
    const onHand = list.items.filter((i) => !state.removed[i.key] && (state.have[i.key] || state.checked[i.key])).map((i) => i.name);
    return [...onHand, ...state.extras.map((x) => x.name)].slice(0, 30);
  } catch {
    return [];
  }
}

/** Today's remaining calories and protein, computed by the app (the Home card's numbers), or null. */
export async function kitchenLeftLive(): Promise<string | null> {
  try {
    const day = await fetchDay(localToday());
    const eaten = totals(day.entries);
    return leftTodayLine({ kcal: eaten.kcal, protein: eaten.protein }, day.targets ? { kcal: day.targets.kcal, protein: day.targets.protein } : null);
  } catch {
    return null;
  }
}
