import type { RecipeCard } from '@/domain/coach/ask-tools';
import { RECIPES, type Recipe } from '@/domain/nutrition/meal-planner';
import { toBook } from '@/domain/nutrition/user-recipes';
import { fetchUserRecipes } from '@/data/nutrition-live';

/**
 * THE RECIPE BOOK HOLT SEARCHES — Forge's recipes and the athlete's own, with the APP's numbers.
 *
 * The book's calories and macros are computed on the device from USDA ingredient data (`deriveRecipe`,
 * `toBook`) and are never stored (NUT-D4), so the device is where they exist. They travel with a question
 * as `recipes` and reach the model only if he calls `get_recipes` — so a question that is not about food
 * pays nothing for them.
 *
 * ⚠ ONLY FOR AN ATHLETE WITH NUTRITION (0206). The caller passes `useNutritionAccess()`; without it this
 * returns [] and Holt's recipe search comes back empty. The athlete's own recipes are behind the same RLS
 * anyway — this keeps Forge's bundled book out of reach too, as the tab is.
 *
 * Read once per chat and kept for a few minutes: a saved recipe shows up the next time the sheet opens.
 */

const TTL_MS = 5 * 60_000;
let cache: { at: number; cards: RecipeCard[] } | null = null;

const card = (r: Recipe, mine: boolean): RecipeCard => ({
  id: r.id,
  name: r.name,
  mine,
  meals: [...r.mealTypes],
  minutes: r.minutes,
  kcal: r.kcal,
  protein: r.protein,
  carb: r.carb,
  fat: r.fat,
  allergens: [...r.allergens],
  ingredients: [...new Set(r.ingredientNames.filter(Boolean))].slice(0, 12),
});

export async function holtRecipeCardsLive(hasNutrition: boolean): Promise<RecipeCard[]> {
  if (!hasNutrition) return [];
  if (cache && Date.now() - cache.at < TTL_MS) return cache.cards;
  const mine = await fetchUserRecipes().catch(() => []);
  const cards = [...mine.map((u) => card(toBook(u).recipe, true)), ...RECIPES.map((r) => card(r, false))];
  cache = { at: Date.now(), cards };
  return cards;
}
