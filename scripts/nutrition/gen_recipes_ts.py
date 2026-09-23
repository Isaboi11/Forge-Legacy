import json
from usda import foods, nut
from recipes import I, R, META

used = sorted({k for r in R for k, _ in r[6]})
missing = [k for k in used if k not in I]
assert not missing, missing

def ts(v):
    return json.dumps(v, ensure_ascii=False)

def us_ts(u):
    if u[0] == 'oz': return "{ kind: 'oz' }"
    if u[0] in ('cup', 'tsp'): return f"{{ kind: '{u[0]}', grams: {u[1]:g} }}"
    return f"{{ kind: 'each', grams: {u[1]:g}, one: {ts(u[2])}, many: {ts(u[3])} }}"

out = []
out.append("""/* ⚠ GENERATED — do not hand-edit numbers. Regenerate with scripts/nutrition (see usda.py's header).
 *
 * Every per-100 g figure below is copied by script from USDA FoodData Central, SR Legacy 2018-04
 * (`food_nutrient.csv`: 1008 energy kcal · 1003 protein · 1004 fat · 1005 carbohydrate), keyed by the
 * `fdcId` beside it — https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients. USDA data is CC0, so it
 * may be kept and shown forever (Architecture §4). US measures (cup / tsp / each) take their gram
 * weights from the same release's `food_portion.csv`.
 *
 * Weights are as BOUGHT AND COOKED FROM: raw meat and fish, dry rice, pasta, grains and lentils — what a
 * recipe asks you to weigh, and what a grocery list must buy.
 *
 * Allergen and diet tags are Forge's, set per INGREDIENT (not per recipe) so a recipe's tags are
 * derived and cannot drift from what is in it. Tagging is conservative: oats and granola carry gluten
 * (cross-contact), granola carries tree nuts, the plain bagel carries sesame (USDA's own description:
 * "includes onion, poppy, sesame"), beef jerky and teriyaki carry soy and gluten.
 *
 * ⚠ ONE STAND-IN: SR Legacy has no halloumi. `halloumi` uses low-moisture whole-milk mozzarella
 * (170846), the closest brined, grilling-style cheese in the dataset. Replace it when a halloumi
 * record is sourced.
 *
 * Method steps are Forge-written drafts (2026-09-23) for PO review; they state safe internal
 * temperatures (USDA FSIS) wherever meat, poultry or fish is cooked.
 */

import type { Allergen } from './meal-plan-setup.ts';

/** meat · fish · shellfish · animal (dairy, eggs, honey — vegetarian, not vegan) · plant */
export type DietClass = 'meat' | 'fish' | 'shellfish' | 'animal' | 'plant';

/** How to show an amount in US units, with USDA's gram weight for one unit. */
export type UsMeasure =
  | { kind: 'oz' }
  | { kind: 'cup'; grams: number }
  | { kind: 'tsp'; grams: number }
  | { kind: 'each'; grams: number; one: string; many: string };

export interface Ingredient {
  fdcId: number;
  /** What the recipe calls it — also what a dislike is matched against. */
  name: string;
  /** Per 100 g, from USDA. */
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
  allergens: readonly Allergen[];
  diet: DietClass;
  us: UsMeasure;
}

export const INGREDIENTS = {""")
for k in used:
    fid, name, al, dc, us = I[k]
    n = nut[str(fid)]
    out.append(f"  {k}: {{ fdcId: {fid}, name: {ts(name)}, kcal: {n['kcal']:g}, protein: {n['protein']:g}, fat: {n['fat']:g}, carb: {n['carb']:g}, allergens: {ts(al)}, diet: {ts(dc)}, us: {us_ts(us)} }},")
out.append("} as const satisfies Record<string, Ingredient>;\n")
out.append("export type IngredientKey = keyof typeof INGREDIENTS;\n")
out.append("""export type PlanSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface RecipeStep {
  title: string;
  text: string;
  /** Minutes this step takes, when it takes any. */
  min?: number;
}

export type Reheat = 'great' | 'ok' | 'poor' | 'cold';
export type ProteinSource =
  | 'chicken' | 'beef' | 'pork' | 'turkey' | 'fish' | 'shellfish' | 'egg' | 'dairy' | 'tofu' | 'legume' | 'mixed';

export interface RecipeSource {
  id: string;
  /** The slot it was written for — where it is listed. */
  slot: PlanSlot;
  /** Every slot it can fill (a burrito bowl is lunch OR dinner). Always includes `slot`. */
  mealTypes: readonly PlanSlot[];
  /** How many days a cooked batch keeps. 0 = eat it the day it is made. */
  leftoverDays: number;
  /** `poor` never becomes a leftover; `cold` is eaten cold (salads, overnight oats). */
  reheat: Reheat;
  proteinSource: ProteinSource;
  /** bowl, wrap, tray bake… — for the variety rule. */
  format: string;
  name: string;
  /** Hands-on + cooking time, minutes. */
  minutes: number;
  /** Cooked to feed a later meal too — derived: keeps ≥ 1 day and reheats better than `poor`. */
  batch: boolean;
  /** Unusual items only (sheet pan, blender). Empty for most, and hidden when empty. */
  equipment: readonly string[];
  /** Grams of each ingredient in ONE serving. */
  ingredients: readonly (readonly [IngredientKey, number])[];
  steps: readonly RecipeStep[];
}

/** The starter set: ten breakfasts, ten lunches, twelve dinners, eight snacks. Names and times from `meal-recipes.js` in the design project; ingredients, amounts and steps are Forge's. */
export const RECIPE_SOURCES: readonly RecipeSource[] = [""")
for rid, slot, name, mn, b, eq, ings, steps in R:
    ing = ', '.join(f"['{k}', {g:g}]" for k, g in ings)
    st = ', '.join('{ title: ' + ts(t) + ', text: ' + ts(x) + (f', min: {m}' if m else '') + ' }' for t, x, m in steps)
    mt, ld, rh, ps, fm = META[rid]
    batch = ld >= 1 and rh != 'poor' and b
    out.append(f"  {{\n    id: '{rid}', slot: '{slot}', mealTypes: {ts(mt)}, leftoverDays: {ld}, reheat: '{rh}', proteinSource: '{ps}', format: {ts(fm)},\n    name: {ts(name)}, minutes: {mn}, batch: {'true' if batch else 'false'}, equipment: {ts(eq)},\n    ingredients: [{ing}],\n    steps: [{st}],\n  }},")
out.append("];\n")
open('recipes.gen.ts', 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print(len(used), 'ingredients', len(R), 'recipes')
