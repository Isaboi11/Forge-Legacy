from usda import foods, nut
from recipes import I, R

used = sorted({k for r in R for k, _ in r[5]})
out = []
out.append("""/* ⚠ GENERATED — do not hand-edit numbers. Regenerate from the USDA SR Legacy CSV (2018-04 release).
 *
 * Every per-100 g figure below is copied by script from USDA FoodData Central, SR Legacy
 * (`food_nutrient.csv`: 1008 energy kcal · 1003 protein · 1004 fat · 1005 carbohydrate), keyed by the
 * `fdcId` beside it — look any row up at https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients.
 * USDA data is CC0, so it may be kept and shown forever (Architecture §4).
 *
 * Allergen and diet tags are Forge's, set per INGREDIENT (not per recipe) so a recipe's tags are
 * derived and cannot drift from what is in it. Tagging is conservative: oats and granola carry gluten
 * (cross-contact), granola carries tree nuts, the plain bagel carries sesame (USDA's own description:
 * "includes onion, poppy, sesame"), beef jerky and teriyaki carry soy and gluten.
 *
 * ⚠ ONE STAND-IN: SR Legacy has no halloumi. `halloumi` uses low-moisture whole-milk mozzarella
 * (170846: 318 kcal · 21.6 P · 24.6 F · 2.5 C per 100 g), the closest brined, grilling-style cheese in
 * the dataset. Replace it when a halloumi record is sourced.
 */

import type { Allergen } from './meal-plan-setup.ts';

/** meat · fish · shellfish · animal (dairy, eggs, honey — vegetarian, not vegan) · plant */
export type DietClass = 'meat' | 'fish' | 'shellfish' | 'animal' | 'plant';

export interface Ingredient {
  fdcId: number;
  /** What the recipe calls it — also what a dislike is matched against. */
  name: string;
  /** Per 100 g, from USDA. */
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
  allergens: Allergen[];
  diet: DietClass;
}

export const INGREDIENTS = {""")
for k in used:
    fid, name, al, dc = I[k]
    n = nut[str(fid)]
    out.append(f"  {k}: {{ fdcId: {fid}, name: {name!r}, kcal: {n['kcal']:g}, protein: {n['protein']:g}, fat: {n['fat']:g}, carb: {n['carb']:g}, allergens: {al!r}, diet: {dc!r} }},".replace("'", "'"))
out.append("} as const satisfies Record<string, Ingredient>;\n")
out.append("export type IngredientKey = keyof typeof INGREDIENTS;\n")
out.append("""export type PlanSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface RecipeSource {
  id: string;
  slot: PlanSlot;
  name: string;
  /** Hands-on + cooking time, minutes. */
  minutes: number;
  /** Cooks for more than one sitting — a dinner that becomes the next day's lunch. */
  batch: boolean;
  /** Grams of each ingredient in ONE serving. */
  ingredients: readonly (readonly [IngredientKey, number])[];
}

/** The starter set: ten breakfasts, ten lunches, twelve dinners, eight snacks. Names and times from `meal-recipes.js` in the design project; ingredients and amounts are Forge's. */
export const RECIPE_SOURCES: readonly RecipeSource[] = [""")
for rid, slot, name, mn, b, ings in R:
    ing = ', '.join(f"['{k}', {g}]" for k, g in ings)
    out.append(f"  {{ id: '{rid}', slot: '{slot}', name: {name!r}, minutes: {mn}, batch: {'true' if b else 'false'}, ingredients: [{ing}] }},")
out.append("];\n")
src = '\n'.join(out)
# python repr uses single quotes; fine for TS. Escape check:
open('recipes.gen.ts', 'w', encoding='utf-8', newline='\n').write(src)
print(len(used), 'ingredients', len(R), 'recipes')
