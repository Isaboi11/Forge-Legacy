/**
 * HOLT'S DISHES → CARDS, WITH THE APP'S NUMBERS (Kitchen Scope §3, NUT-D4, NUT-D6).
 *
 * A dish from `coach-kitchen` is ingredient lines only. Here each line is matched to the USDA catalogue by the
 * same code a photographed recipe goes through (`draftFromRead`), and the numbers on the card are
 * `totalsOf(matched) / servings` — the app's, never the model's. A line the catalogue can't match adds
 * nothing and makes the card say so ("≈"), per §3.4.
 *
 * ⛔ ALLERGENS: a dish is DROPPED, never shown with a warning (§4), when the catalogue's tags on its matched
 * lines OR the words on any line (`allergensByWord`, which covers unmatched lines) name one the athlete avoids.
 */
import { draftFromRead } from './recipe-import.ts';
import { allergensByWord, type KitchenDish } from './kitchen-dishes.ts';
import { detectAllergens, totalsOf } from './user-recipes.ts';
import type { RecipeRead } from './recipe-photo-read.ts';

export interface DishCard {
  name: string;
  why: string;
  cuisine: string;
  method: string;
  minutes: number | null;
  /** Per serving, from the catalogue. */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** Lines the catalogue couldn't match — the numbers leave them out, so the card reads "≈". */
  unmatched: number;
  /** The dish as a recipe read — what "See the recipe" opens in My Recipes, and what the planner can take. */
  read: RecipeRead;
}

export function dishAsRead(d: KitchenDish): RecipeRead {
  return { name: d.name, servings: d.servings, minutes: d.minutes, mealType: d.mealType, ingredients: d.ingredients, steps: d.steps };
}

/** Dishes → cards, with anything the athlete avoids removed. Order is kept. */
export function dishCards(dishes: readonly KitchenDish[], avoid: readonly string[]): DishCard[] {
  const banned = new Set(avoid);
  const out: DishCard[] = [];
  for (const d of dishes) {
    const read = dishAsRead(d);
    const draft = draftFromRead(read);
    const tagged = [...detectAllergens(draft.form.ingredients), ...allergensByWord(d)];
    if (tagged.some((a) => banned.has(a))) continue;
    const t = totalsOf(draft.form.ingredients);
    const y = Math.max(1, d.servings);
    out.push({
      name: d.name,
      why: d.why,
      cuisine: d.cuisine,
      method: d.method,
      minutes: d.minutes,
      kcal: Math.round(t.kcal / y),
      protein: Math.round(t.protein / y),
      carb: Math.round(t.carb / y),
      fat: Math.round(t.fat / y),
      unmatched: draft.unmatched.length,
      read,
    });
  }
  return out;
}

/** The card's one line of numbers: "25 min · 640 cal · 52 g protein", with "≈" when a line is unmatched. */
export function dishLine(c: DishCard, showNumbers: boolean): string {
  const parts: string[] = [];
  if (c.minutes) parts.push(`${c.minutes} min`);
  if (showNumbers) {
    const approx = c.unmatched ? '≈' : '';
    parts.push(`${approx}${c.kcal.toLocaleString('en-US')} cal`, `${approx}${c.protein} g protein`);
  }
  return parts.join(' · ');
}

/** Diet → foods to avoid, in the model's words (the allergen tags cover allergies; this covers diets). */
export function dietAvoid(diet: string | null | undefined): string[] {
  switch (diet) {
    case 'vegetarian':
      return ['meat', 'poultry', 'fish', 'shellfish'];
    case 'vegan':
      return ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'eggs', 'honey'];
    case 'pescatarian':
      return ['meat', 'poultry'];
    default:
      return [];
  }
}
