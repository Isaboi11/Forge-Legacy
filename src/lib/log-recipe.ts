import { addEntries } from '@/data/nutrition-live';
import type { MealSlot } from '@/domain/nutrition/day';
import { clampEaten, eatenTotals, servingsEatenLabel, type UserRecipe } from '@/domain/nutrition/user-recipes';

/**
 * Log what the athlete ATE of one of their recipes — one diary row, `servings` of it. Shared by every
 * door (Recipe, Log Food, My Foods) so the row reads the same wherever it was logged from. A one-way
 * log: there is no plan row to remember it in, so the diary is where it is undone.
 */
export async function logRecipeEaten(iso: string, meal: MealSlot, recipe: UserRecipe, servings: number): Promise<void> {
  const t = eatenTotals(recipe, servings);
  await addEntries(iso, [
    {
      meal,
      source: 'quick',
      name: recipe.name,
      servingLabel: `${servingsEatenLabel(servings)} · My recipe`,
      quantity: clampEaten(servings),
      macros: { kcal: t.kcal, protein: t.protein, carb: t.carb, fat: t.fat, grams: null },
    },
  ]);
}
