/* ⚠ SINCE 2026-09-24 THIS FILE IS EDITED BY HAND, NOT REGENERATED. The starter 40 came from
 * scripts/nutrition; re-running gen_recipes_ts.py would bring them back and drop the PO's recipes. A new
 * ingredient's numbers are still copied from SR Legacy by fdcId (`python usda.py <words>`), never typed
 * from memory, and `recipe-book.test.mjs` checks every shipped recipe.
 *
 * Every per-100 g figure below is copied by script from USDA FoodData Central, SR Legacy 2018-04
 * (`food_nutrient.csv`: 1008 energy kcal · 1003 protein · 1004 fat · 1005 carbohydrate), keyed by the
 * `fdcId` beside it — https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients. USDA data is CC0, so it
 * may be kept and shown forever (Architecture §4). US measures (cup / tsp / each) take their gram
 * weights from the same release's `food_portion.csv`.
 *
 * ⚠ SINCE 2026-09-24 A FEW ROWS COME FROM USDA BRANDED FOODS (label data, also CC0), where the PO's recipes
 * name a product SR Legacy lacks (low-carb wraps and bagels, brioche, reduced-calorie sauce). Their fdcIds are
 * 7 digits; brands are never shown. Those rows carry `fiber`, because label calories count fibre at ~2 cal/g.
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
  /** Per 100 g — only where it matters: a high-fibre product (a low-carb wrap) whose calories 4/4/9 would overstate. */
  fiber?: number;
  allergens: readonly Allergen[];
  diet: DietClass;
  us: UsMeasure;
}

export const INGREDIENTS = {
  almonds: { fdcId: 170567, name: "Almonds", kcal: 579, protein: 21.15, fat: 49.93, carb: 21.55, allergens: ["tree_nuts"], diet: "plant", us: { kind: 'cup', grams: 143 } },
  apple: { fdcId: 171688, name: "Apple", kcal: 52, protein: 0.26, fat: 0.17, carb: 13.81, allergens: [], diet: "plant", us: { kind: 'each', grams: 182, one: "medium apple", many: "medium apples" } },
  arugula: { fdcId: 169387, name: "Rocket (arugula)", kcal: 25, protein: 2.58, fat: 0.66, carb: 3.65, allergens: [], diet: "plant", us: { kind: 'cup', grams: 20 } },
  avocado: { fdcId: 171706, name: "Avocado", kcal: 167, protein: 1.96, fat: 15.41, carb: 8.64, allergens: [], diet: "plant", us: { kind: 'each', grams: 136, one: "avocado", many: "avocados" } },
  bagel: { fdcId: 174899, name: "Plain bagel", kcal: 264, protein: 10.56, fat: 1.32, carb: 52.38, allergens: ["gluten", "sesame"], diet: "plant", us: { kind: 'each', grams: 105, one: "bagel", many: "bagels" } },
  // USDA Branded 2596973 (label: 80 cal, 9 P, 18 C incl. 16 fibre per 46 g bagel). Brand not shown in the app.
  low_carb_bagel: { fdcId: 2596973, name: "Low-carb bagel", kcal: 174, protein: 19.57, fat: 5.43, carb: 39.13, fiber: 34.8, allergens: ["gluten", "soy", "sesame"], diet: "plant", us: { kind: 'each', grams: 46, one: "bagel", many: "bagels" } },
  banana: { fdcId: 173944, name: "Banana", kcal: 89, protein: 1.09, fat: 0.33, carb: 22.84, allergens: [], diet: "plant", us: { kind: 'each', grams: 118, one: "medium banana", many: "medium bananas" } },
  barley: { fdcId: 170284, name: "Pearl barley, dry", kcal: 352, protein: 9.91, fat: 1.16, carb: 77.72, allergens: ["gluten"], diet: "plant", us: { kind: 'cup', grams: 200 } },
  beef_jerky: { fdcId: 167536, name: "Beef jerky", kcal: 410, protein: 33.2, fat: 25.6, carb: 11, allergens: ["soy", "gluten"], diet: "meat", us: { kind: 'oz' } },
  black_beans: { fdcId: 175238, name: "Black beans, canned, drained", kcal: 91, protein: 6.03, fat: 0.29, carb: 16.55, allergens: [], diet: "plant", us: { kind: 'cup', grams: 240 } },
  blueberries: { fdcId: 171711, name: "Blueberries", kcal: 57, protein: 0.74, fat: 0.33, carb: 14.49, allergens: [], diet: "plant", us: { kind: 'cup', grams: 148 } },
  boiled_egg: { fdcId: 173424, name: "Eggs, hard-boiled", kcal: 155, protein: 12.58, fat: 10.61, carb: 1.12, allergens: ["eggs"], diet: "animal", us: { kind: 'each', grams: 50, one: "large egg", many: "large eggs" } },
  bok_choy: { fdcId: 170390, name: "Bok choy", kcal: 13, protein: 1.5, fat: 0.2, carb: 2.18, allergens: [], diet: "plant", us: { kind: 'cup', grams: 70 } },
  broccoli: { fdcId: 170379, name: "Broccoli florets", kcal: 34, protein: 2.82, fat: 0.37, carb: 6.64, allergens: [], diet: "plant", us: { kind: 'cup', grams: 91 } },
  bulgur: { fdcId: 170688, name: "Bulgur, dry", kcal: 342, protein: 12.29, fat: 1.33, carb: 75.87, allergens: ["gluten"], diet: "plant", us: { kind: 'cup', grams: 140 } },
  butter: { fdcId: 173410, name: "Butter", kcal: 717, protein: 0.85, fat: 81.11, carb: 0.06, allergens: ["dairy"], diet: "animal", us: { kind: 'tsp', grams: 4.73 } },
  butternut: { fdcId: 169295, name: "Butternut squash, cubed", kcal: 45, protein: 1, fat: 0.1, carb: 11.69, allergens: [], diet: "plant", us: { kind: 'cup', grams: 140 } },
  cabbage: { fdcId: 169975, name: "Cabbage, shredded", kcal: 25, protein: 1.28, fat: 0.1, carb: 5.8, allergens: [], diet: "plant", us: { kind: 'cup', grams: 70 } },
  canned_tomatoes: { fdcId: 170051, name: "Canned tomatoes", kcal: 16, protein: 0.79, fat: 0.25, carb: 3.47, allergens: [], diet: "plant", us: { kind: 'cup', grams: 240 } },
  capers: { fdcId: 172238, name: "Capers, drained", kcal: 23, protein: 2.36, fat: 0.86, carb: 4.89, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.87 } },
  carrot: { fdcId: 170393, name: "Carrot", kcal: 41, protein: 0.93, fat: 0.24, carb: 9.58, allergens: [], diet: "plant", us: { kind: 'each', grams: 61, one: "medium carrot", many: "medium carrots" } },
  cheddar: { fdcId: 173414, name: "Cheddar, shredded", kcal: 403, protein: 22.87, fat: 33.31, carb: 3.37, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 113 } },
  chia: { fdcId: 170554, name: "Chia seeds", kcal: 486, protein: 16.54, fat: 30.74, carb: 42.12, allergens: [], diet: "plant", us: { kind: 'oz' } },
  chicken_breast: { fdcId: 171077, name: "Chicken breast, boneless skinless", kcal: 120, protein: 22.5, fat: 2.62, carb: 0, allergens: [], diet: "meat", us: { kind: 'oz' } },
  chicken_thigh: { fdcId: 173627, name: "Chicken thighs, boneless skinless", kcal: 121, protein: 19.66, fat: 4.12, carb: 0, allergens: [], diet: "meat", us: { kind: 'oz' } },
  chickpeas: { fdcId: 173800, name: "Chickpeas, canned, drained", kcal: 139, protein: 7.05, fat: 2.77, carb: 22.53, allergens: [], diet: "plant", us: { kind: 'each', grams: 253, one: "can, drained", many: "cans, drained" } },
  chili_powder: { fdcId: 171319, name: "Chilli powder", kcal: 282, protein: 13.46, fat: 14.28, carb: 49.7, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.7 } },
  cinnamon: { fdcId: 171320, name: "Ground cinnamon", kcal: 247, protein: 3.99, fat: 1.24, carb: 80.59, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.6 } },
  coconut_milk: { fdcId: 170173, name: "Coconut milk, canned", kcal: 197, protein: 2.02, fat: 21.33, carb: 2.81, allergens: [], diet: "plant", us: { kind: 'cup', grams: 226 } },
  cod: { fdcId: 171955, name: "Cod fillet", kcal: 82, protein: 17.81, fat: 0.67, carb: 0, allergens: ["fish"], diet: "fish", us: { kind: 'oz' } },
  cheddar_slice: { fdcId: 170899, name: "Cheddar, sliced", kcal: 410, protein: 24.25, fat: 33.82, carb: 2.13, allergens: ["dairy"], diet: "animal", us: { kind: 'each', grams: 21, one: "slice", many: "slices" } },
  cottage_cheese_nonfat: { fdcId: 172181, name: "Cottage cheese, fat-free", kcal: 72, protein: 10.34, fat: 0.29, carb: 6.66, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 145 } },
  cottage_cheese: { fdcId: 172182, name: "Cottage cheese, 2%", kcal: 81, protein: 10.45, fat: 2.27, carb: 4.76, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 226 } },
  cream_cheese: { fdcId: 173418, name: "Cream cheese", kcal: 350, protein: 6.15, fat: 34.44, carb: 5.52, allergens: ["dairy"], diet: "animal", us: { kind: 'tsp', grams: 4.83 } },
  cucumber: { fdcId: 168409, name: "Cucumber", kcal: 15, protein: 0.65, fat: 0.11, carb: 3.63, allergens: [], diet: "plant", us: { kind: 'cup', grams: 104 } },
  cumin: { fdcId: 170923, name: "Cumin", kcal: 375, protein: 17.81, fat: 22.27, carb: 44.24, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.1 } },
  curry_powder: { fdcId: 170924, name: "Curry powder", kcal: 325, protein: 14.29, fat: 14.01, carb: 55.83, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2 } },
  deli_turkey: { fdcId: 172941, name: "Sliced turkey breast", kcal: 106, protein: 14.81, fat: 3.77, carb: 2.2, allergens: [], diet: "meat", us: { kind: 'each', grams: 16, one: "slice", many: "slices" } },
  edamame: { fdcId: 168411, name: "Edamame, shelled", kcal: 121, protein: 11.91, fat: 5.2, carb: 8.91, allergens: ["soy"], diet: "plant", us: { kind: 'cup', grams: 155 } },
  egg_white: { fdcId: 172183, name: "Egg whites", kcal: 52, protein: 10.9, fat: 0.17, carb: 0.73, allergens: ["eggs"], diet: "animal", us: { kind: 'cup', grams: 243 } },
  egg: { fdcId: 171287, name: "Eggs", kcal: 143, protein: 12.56, fat: 9.51, carb: 0.72, allergens: ["eggs"], diet: "animal", us: { kind: 'each', grams: 50, one: "large egg", many: "large eggs" } },
  feta: { fdcId: 173420, name: "Feta, crumbled", kcal: 265, protein: 14.21, fat: 21.49, carb: 3.88, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 150 } },
  flour: { fdcId: 168894, name: "All-purpose flour", kcal: 364, protein: 10.33, fat: 0.98, carb: 76.31, allergens: ["gluten"], diet: "plant", us: { kind: 'cup', grams: 125 } },
  flour_tortilla: { fdcId: 175037, name: "Flour tortilla (10-inch)", kcal: 306, protein: 8.2, fat: 7.99, carb: 49.38, allergens: ["gluten"], diet: "plant", us: { kind: 'each', grams: 72, one: "tortilla", many: "tortillas" } },
  garlic_powder: { fdcId: 171325, name: "Garlic powder", kcal: 331, protein: 16.55, fat: 0.73, carb: 72.73, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 3.1 } },
  garlic: { fdcId: 169230, name: "Garlic", kcal: 149, protein: 6.36, fat: 0.5, carb: 33.06, allergens: [], diet: "plant", us: { kind: 'each', grams: 3, one: "clove", many: "cloves" } },
  ginger: { fdcId: 169231, name: "Fresh ginger, grated", kcal: 80, protein: 1.82, fat: 0.75, carb: 17.77, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2 } },
  granola: { fdcId: 171646, name: "Granola", kcal: 489, protein: 13.67, fat: 24.31, carb: 53.88, allergens: ["gluten", "tree_nuts"], diet: "plant", us: { kind: 'cup', grams: 122 } },
  grapes: { fdcId: 174683, name: "Grapes", kcal: 69, protein: 0.72, fat: 0.16, carb: 18.1, allergens: [], diet: "plant", us: { kind: 'cup', grams: 151 } },
  greek_yogurt: { fdcId: 170894, name: "Greek yogurt, plain nonfat", kcal: 59, protein: 10.19, fat: 0.39, carb: 3.6, allergens: ["dairy"], diet: "animal", us: { kind: 'each', grams: 170, one: "container", many: "containers" } },
  green_beans: { fdcId: 169961, name: "Green beans", kcal: 31, protein: 1.83, fat: 0.22, carb: 6.97, allergens: [], diet: "plant", us: { kind: 'cup', grams: 100 } },
  ground_beef: { fdcId: 174030, name: "Lean ground beef (90%)", kcal: 176, protein: 20, fat: 10, carb: 0, allergens: [], diet: "meat", us: { kind: 'oz' } },
  ground_turkey: { fdcId: 171505, name: "Ground turkey", kcal: 148, protein: 19.66, fat: 7.66, carb: 0, allergens: [], diet: "meat", us: { kind: 'oz' } },
  halloumi: { fdcId: 170846, name: "Halloumi", kcal: 318, protein: 21.6, fat: 24.64, carb: 2.47, allergens: ["dairy"], diet: "animal", us: { kind: 'oz' } },
  honey: { fdcId: 169640, name: "Honey", kcal: 304, protein: 0.3, fat: 0, carb: 82.4, allergens: [], diet: "animal", us: { kind: 'tsp', grams: 7 } },
  hummus: { fdcId: 174289, name: "Hummus", kcal: 237, protein: 7.78, fat: 17.82, carb: 15, allergens: ["sesame"], diet: "plant", us: { kind: 'tsp', grams: 5 } },
  kale: { fdcId: 168421, name: "Kale, chopped", kcal: 35, protein: 2.92, fat: 1.49, carb: 4.42, allergens: [], diet: "plant", us: { kind: 'cup', grams: 21 } },
  kidney_beans: { fdcId: 174285, name: "Kidney beans, canned, drained", kcal: 124, protein: 7.98, fat: 1.05, carb: 21.49, allergens: [], diet: "plant", us: { kind: 'each', grams: 266, one: "can, drained", many: "cans, drained" } },
  lemon: { fdcId: 167747, name: "Lemon juice", kcal: 22, protein: 0.35, fat: 0.24, carb: 6.9, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 5.08 } },
  lentils: { fdcId: 172420, name: "Brown or green lentils, dry", kcal: 352, protein: 24.63, fat: 1.06, carb: 63.35, allergens: [], diet: "plant", us: { kind: 'cup', grams: 192 } },
  mango: { fdcId: 169910, name: "Mango, diced", kcal: 60, protein: 0.82, fat: 0.38, carb: 14.98, allergens: [], diet: "plant", us: { kind: 'cup', grams: 165 } },
  milk: { fdcId: 171267, name: "Milk, 2%", kcal: 50, protein: 3.3, fat: 1.98, carb: 4.8, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 244 } },
  mint: { fdcId: 173475, name: "Fresh mint", kcal: 44, protein: 3.29, fat: 0.73, carb: 8.41, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 1.9 } },
  mushrooms: { fdcId: 169251, name: "Mushrooms, sliced", kcal: 22, protein: 3.09, fat: 0.34, carb: 3.26, allergens: [], diet: "plant", us: { kind: 'cup', grams: 70 } },
  oats: { fdcId: 173904, name: "Rolled oats", kcal: 379, protein: 13.15, fat: 6.52, carb: 67.7, allergens: ["gluten"], diet: "plant", us: { kind: 'cup', grams: 81 } },
  olive_oil: { fdcId: 171413, name: "Olive oil", kcal: 884, protein: 0, fat: 100, carb: 0, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 4.5 } },
  onion_powder: { fdcId: 171327, name: "Onion powder", kcal: 341, protein: 10.41, fat: 1.04, carb: 79.12, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.4 } },
  onion: { fdcId: 170000, name: "Onion", kcal: 40, protein: 1.1, fat: 0.1, carb: 9.34, allergens: [], diet: "plant", us: { kind: 'each', grams: 150, one: "large onion", many: "large onions" } },
  orange: { fdcId: 169097, name: "Orange", kcal: 47, protein: 0.94, fat: 0.12, carb: 11.75, allergens: [], diet: "plant", us: { kind: 'each', grams: 131, one: "orange", many: "oranges" } },
  oregano: { fdcId: 171328, name: "Dried oregano", kcal: 265, protein: 9, fat: 4.28, carb: 68.92, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 1 } },
  paprika: { fdcId: 171329, name: "Smoked paprika", kcal: 282, protein: 14.14, fat: 12.89, carb: 53.99, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.3 } },
  // ── Added 2026-09-24 for the PO's first recipes. Same source (SR Legacy 2018-04), same rules. ──
  // ⚠ STAND-IN: SR Legacy has no "Italian seasoning" blend; dried oregano (its main herb) carries it.
  italian_herbs: { fdcId: 171328, name: "Italian herbs, dried", kcal: 265, protein: 9, fat: 4.28, carb: 68.92, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 1 } },
  parsley_dried: { fdcId: 170930, name: "Dried parsley", kcal: 292, protein: 26.63, fat: 5.48, carb: 50.64, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 0.5 } },
  parsley: { fdcId: 170416, name: "Fresh parsley, chopped", kcal: 36, protein: 2.97, fat: 0.79, carb: 6.33, allergens: [], diet: "plant", us: { kind: 'cup', grams: 60 } },
  chili_flakes: { fdcId: 170932, name: "Chilli flakes", kcal: 318, protein: 12.01, fat: 17.27, carb: 56.63, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 1.8 } },
  skim_milk: { fdcId: 171269, name: "Milk, skim", kcal: 34, protein: 3.37, fat: 0.08, carb: 4.96, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 245 } },
  light_cream_cheese: { fdcId: 169079, name: "Light cream cheese", kcal: 208, protein: 7.85, fat: 16.67, carb: 6.73, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 240 } },
  light_butter: { fdcId: 173581, name: "Light butter", kcal: 499, protein: 3.3, fat: 55.1, carb: 0, allergens: ["dairy"], diet: "animal", us: { kind: 'tsp', grams: 4.7 } },
  sundried_tomatoes: { fdcId: 169384, name: "Sun-dried tomatoes in oil, drained", kcal: 213, protein: 5.06, fat: 14.08, carb: 23.33, allergens: [], diet: "plant", us: { kind: 'cup', grams: 110 } },
  ground_beef_95: { fdcId: 171790, name: "Extra-lean ground beef (95%)", kcal: 137, protein: 21.41, fat: 5, carb: 0, allergens: [], diet: "meat", us: { kind: 'oz' } },
  tomato_paste: { fdcId: 170459, name: "Tomato paste", kcal: 82, protein: 4.32, fat: 0.47, carb: 18.91, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 5.3 } },
  // USDA Branded 1626824, a reduced-calorie sauce (20 cal / 2 tbsp) — what the source asks for.
  bbq_sauce: { fdcId: 1626824, name: "Reduced-calorie barbecue sauce", kcal: 61, protein: 0, fat: 0, carb: 15.15, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 5.5 } },
  balsamic: { fdcId: 172241, name: "Balsamic vinegar", kcal: 88, protein: 0.49, fat: 0, carb: 17.03, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 5.3 } },
  brown_sugar: { fdcId: 168833, name: "Brown sugar", kcal: 380, protein: 0.12, fat: 0, carb: 98.09, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 4.6 } },
  // USDA Branded 2376856, a real brioche bun at 57 g. Its label lists egg and wheat, no milk.
  burger_bun: { fdcId: 2376856, name: "Brioche burger bun", kcal: 282, protein: 8.82, fat: 7.05, carb: 45.86, fiber: 7.1, allergens: ["gluten", "eggs"], diet: "animal", us: { kind: 'each', grams: 57, one: "bun", many: "buns" } },
  american_cheese_light: { fdcId: 173455, name: "Reduced-fat American cheese", kcal: 240, protein: 17.6, fat: 14.1, carb: 10.6, allergens: ["dairy"], diet: "animal", us: { kind: 'each', grams: 21, one: "slice", many: "slices" } },
  mozzarella_light: { fdcId: 171244, name: "Part-skim mozzarella", kcal: 295, protein: 23.75, fat: 19.78, carb: 5.58, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 113 } },
  cilantro: { fdcId: 169997, name: "Fresh cilantro, chopped", kcal: 23, protein: 2.13, fat: 0.52, carb: 3.67, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 0.33 } },
  avocado_oil: { fdcId: 173573, name: "Avocado oil (or spray)", kcal: 884, protein: 0, fat: 100, carb: 0, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 4.5 } },
  // USDA Branded 2657253, a low-carb wrap at taco size (label: 45 cal, 12 C incl. 9 fibre per 28 g).
  mini_wrap: { fdcId: 2657253, name: "Low-carb mini wrap", kcal: 161, protein: 14.29, fat: 7.14, carb: 42.86, fiber: 32.1, allergens: ["gluten"], diet: "plant", us: { kind: 'each', grams: 28, one: "mini wrap", many: "mini wraps" } },
  // USDA Branded 2676733, the same low-carb line at burrito size (label: 110 cal, 32 C incl. 28 fibre per 71 g).
  low_carb_tortilla: { fdcId: 2676733, name: "Low-carb tortilla (large)", kcal: 155, protein: 14.08, fat: 8.45, carb: 45.07, fiber: 39.4, allergens: ["gluten"], diet: "plant", us: { kind: 'each', grams: 71, one: "tortilla", many: "tortillas" } },
  light_mayo: { fdcId: 173594, name: "Light mayonnaise", kcal: 238, protein: 0.37, fat: 22.22, carb: 9.23, allergens: ["eggs"], diet: "animal", us: { kind: 'tsp', grams: 5 } },
  hot_sauce: { fdcId: 174527, name: "Hot sauce", kcal: 11, protein: 0.51, fat: 0.37, carb: 1.75, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 4.7 } },
  baking_powder: { fdcId: 172804, name: "Baking powder", kcal: 51, protein: 0.1, fat: 0, carb: 24.1, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 4.6 } },
  applesauce: { fdcId: 171695, name: "Unsweetened applesauce", kcal: 42, protein: 0.17, fat: 0.1, carb: 11.27, allergens: [], diet: "plant", us: { kind: 'cup', grams: 244 } },
  pb_light: { fdcId: 172458, name: "Reduced-fat peanut butter", kcal: 520, protein: 25.9, fat: 34, carb: 35.65, allergens: ["peanuts"], diet: "plant", us: { kind: 'tsp', grams: 6 } },
  vanilla: { fdcId: 173471, name: "Vanilla extract", kcal: 288, protein: 0.06, fat: 0.06, carb: 12.65, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 4.2 } },
  // Semisweet chips are often made on dairy lines with soy lecithin — tagged both, conservatively.
  choc_chips: { fdcId: 167976, name: "Mini chocolate chips", kcal: 480, protein: 4.2, fat: 30, carb: 63.9, allergens: ["dairy", "soy"], diet: "animal", us: { kind: 'cup', grams: 173 } },
  // Marshmallow creme is whipped with egg white (no gelatin), so eggs — and vegetarian, not vegan.
  marshmallow_creme: { fdcId: 169664, name: "Marshmallow creme", kcal: 322, protein: 0.8, fat: 0.3, carb: 79, allergens: ["eggs"], diet: "animal", us: { kind: 'oz' } },
  milk_chocolate: { fdcId: 167587, name: "Milk chocolate", kcal: 535, protein: 7.65, fat: 29.66, carb: 59.4, allergens: ["dairy", "soy"], diet: "animal", us: { kind: 'each', grams: 6, one: "square", many: "squares" } },
  pepperoni: { fdcId: 174575, name: "Pepperoni, sliced", kcal: 504, protein: 19.25, fat: 46.28, carb: 1.18, allergens: [], diet: "meat", us: { kind: 'each', grams: 2, one: "slice", many: "slices" } },
  // SR Legacy's only turkey pepperoni is a branded record (174593); the brand is not shown.
  turkey_pepperoni: { fdcId: 174593, name: "Turkey pepperoni, sliced", kcal: 243, protein: 30.99, fat: 11.52, carb: 3.78, allergens: [], diet: "meat", us: { kind: 'each', grams: 2, one: "slice", many: "slices" } },
  pizza_sauce: { fdcId: 172880, name: "Pizza sauce", kcal: 54, protein: 2.18, fat: 1.15, carb: 8.66, allergens: [], diet: "plant", us: { kind: 'cup', grams: 252 } },
  light_cheddar: { fdcId: 173439, name: "Reduced-fat cheddar, shredded", kcal: 173, protein: 24.35, fat: 7, carb: 1.91, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 113 } },
  turkey_bacon: { fdcId: 174592, name: "Turkey bacon", kcal: 226, protein: 15.94, fat: 16.93, carb: 1.89, allergens: [], diet: "meat", us: { kind: 'each', grams: 16, one: "slice", many: "slices" } },
  parmesan: { fdcId: 171247, name: "Parmesan, grated", kcal: 420, protein: 28.42, fat: 27.84, carb: 13.91, allergens: ["dairy"], diet: "animal", us: { kind: 'tsp', grams: 1.67 } },
  pasta: { fdcId: 169736, name: "Orzo or pasta, dry", kcal: 371, protein: 13.04, fat: 1.51, carb: 74.67, allergens: ["gluten"], diet: "plant", us: { kind: 'oz' } },
  peach: { fdcId: 169928, name: "Peach", kcal: 39, protein: 0.91, fat: 0.25, carb: 9.54, allergens: [], diet: "plant", us: { kind: 'each', grams: 150, one: "medium peach", many: "medium peaches" } },
  peanut_butter: { fdcId: 172470, name: "Peanut butter, smooth", kcal: 598, protein: 22.21, fat: 51.36, carb: 22.31, allergens: ["peanuts"], diet: "plant", us: { kind: 'tsp', grams: 5.33 } },
  peanuts: { fdcId: 173806, name: "Dry-roasted peanuts", kcal: 587, protein: 24.35, fat: 49.66, carb: 21.26, allergens: ["peanuts"], diet: "plant", us: { kind: 'cup', grams: 146 } },
  pepper: { fdcId: 170931, name: "Black pepper", kcal: 251, protein: 10.39, fat: 3.26, carb: 63.95, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.3 } },
  pita: { fdcId: 174915, name: "Pita (6½-inch)", kcal: 275, protein: 9.1, fat: 1.2, carb: 55.7, allergens: ["gluten"], diet: "plant", us: { kind: 'each', grams: 60, one: "pita", many: "pitas" } },
  pork: { fdcId: 168249, name: "Pork tenderloin", kcal: 109, protein: 20.95, fat: 2.17, carb: 0, allergens: [], diet: "meat", us: { kind: 'oz' } },
  potato: { fdcId: 170026, name: "Potatoes", kcal: 77, protein: 2.05, fat: 0.09, carb: 17.49, allergens: [], diet: "plant", us: { kind: 'each', grams: 213, one: "medium potato", many: "medium potatoes" } },
  quinoa: { fdcId: 168874, name: "Quinoa, dry", kcal: 368, protein: 14.12, fat: 6.07, carb: 64.16, allergens: [], diet: "plant", us: { kind: 'cup', grams: 170 } },
  raisins: { fdcId: 168165, name: "Raisins", kcal: 299, protein: 3.3, fat: 0.25, carb: 79.32, allergens: [], diet: "plant", us: { kind: 'cup', grams: 145 } },
  red_pepper: { fdcId: 170108, name: "Red bell pepper", kcal: 26, protein: 0.99, fat: 0.3, carb: 6.03, allergens: [], diet: "plant", us: { kind: 'each', grams: 119, one: "pepper", many: "peppers" } },
  rice_cakes: { fdcId: 170250, name: "Brown rice cakes", kcal: 387, protein: 8.2, fat: 2.8, carb: 81.5, allergens: [], diet: "plant", us: { kind: 'each', grams: 9, one: "rice cake", many: "rice cakes" } },
  rice_milk: { fdcId: 171942, name: "Rice milk, unsweetened", kcal: 47, protein: 0.28, fat: 0.97, carb: 9.17, allergens: [], diet: "plant", us: { kind: 'cup', grams: 240 } },
  salmon: { fdcId: 175167, name: "Salmon fillet", kcal: 208, protein: 20.42, fat: 13.42, carb: 0, allergens: ["fish"], diet: "fish", us: { kind: 'oz' } },
  salsa: { fdcId: 174524, name: "Salsa", kcal: 29, protein: 1.52, fat: 0.17, carb: 6.64, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 6 } },
  salt: { fdcId: 173468, name: "Salt", kcal: 0, protein: 0, fat: 0, carb: 0, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 6 } },
  sesame_seeds: { fdcId: 170150, name: "Sesame seeds", kcal: 573, protein: 17.73, fat: 49.67, carb: 23.45, allergens: ["sesame"], diet: "plant", us: { kind: 'tsp', grams: 3 } },
  shrimp: { fdcId: 175179, name: "Raw prawns, peeled", kcal: 85, protein: 20.1, fat: 0.51, carb: 0, allergens: ["shellfish"], diet: "shellfish", us: { kind: 'oz' } },
  sirloin: { fdcId: 174763, name: "Sirloin steak, trimmed", kcal: 135, protein: 21.91, fat: 4.62, carb: 0, allergens: [], diet: "meat", us: { kind: 'oz' } },
  smoked_salmon: { fdcId: 173687, name: "Smoked salmon", kcal: 117, protein: 18.28, fat: 4.32, carb: 0, allergens: ["fish"], diet: "fish", us: { kind: 'oz' } },
  sour_cream: { fdcId: 171257, name: "Sour cream", kcal: 198, protein: 2.44, fat: 19.35, carb: 4.63, allergens: ["dairy"], diet: "animal", us: { kind: 'tsp', grams: 4 } },
  soy_sauce: { fdcId: 174277, name: "Soy sauce", kcal: 53, protein: 8.14, fat: 0.57, carb: 4.93, allergens: ["soy", "gluten"], diet: "plant", us: { kind: 'tsp', grams: 5.3 } },
  spaghetti: { fdcId: 169736, name: "Spaghetti, dry", kcal: 371, protein: 13.04, fat: 1.51, carb: 74.67, allergens: ["gluten"], diet: "plant", us: { kind: 'oz' } },
  spinach: { fdcId: 168462, name: "Baby spinach", kcal: 23, protein: 2.86, fat: 0.39, carb: 3.63, allergens: [], diet: "plant", us: { kind: 'cup', grams: 30 } },
  strawberries: { fdcId: 167762, name: "Strawberries, halved", kcal: 32, protein: 0.67, fat: 0.3, carb: 7.68, allergens: [], diet: "plant", us: { kind: 'cup', grams: 152 } },
  sweet_potato: { fdcId: 168482, name: "Sweet potato", kcal: 86, protein: 1.57, fat: 0.05, carb: 20.12, allergens: [], diet: "plant", us: { kind: 'each', grams: 130, one: "sweet potato", many: "sweet potatoes" } },
  tahini: { fdcId: 170189, name: "Tahini", kcal: 595, protein: 17, fat: 53.76, carb: 21.19, allergens: ["sesame"], diet: "plant", us: { kind: 'tsp', grams: 5 } },
  teriyaki: { fdcId: 171167, name: "Teriyaki sauce", kcal: 89, protein: 5.93, fat: 0.02, carb: 15.56, allergens: ["soy", "gluten"], diet: "plant", us: { kind: 'tsp', grams: 6 } },
  tofu: { fdcId: 172475, name: "Firm tofu", kcal: 144, protein: 17.27, fat: 8.72, carb: 2.78, allergens: ["soy"], diet: "plant", us: { kind: 'oz' } },
  tomato: { fdcId: 170457, name: "Tomatoes, chopped", kcal: 18, protein: 0.88, fat: 0.2, carb: 3.89, allergens: [], diet: "plant", us: { kind: 'cup', grams: 180 } },
  tuna: { fdcId: 173709, name: "Tuna in water, drained", kcal: 86, protein: 19.44, fat: 0.96, carb: 0, allergens: ["fish"], diet: "fish", us: { kind: 'oz' } },
  turkey_sausage: { fdcId: 174617, name: "Turkey sausage", kcal: 155, protein: 18.79, fat: 8.08, carb: 0.47, allergens: [], diet: "meat", us: { kind: 'oz' } },
  veg_broth: { fdcId: 171583, name: "Vegetable broth", kcal: 5, protein: 0.24, fat: 0.07, carb: 0.93, allergens: [], diet: "plant", us: { kind: 'cup', grams: 221 } },
  vinegar: { fdcId: 173469, name: "Cider vinegar", kcal: 21, protein: 0, fat: 0, carb: 0.93, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 5 } },
  wheat_noodles: { fdcId: 168908, name: "Wheat noodles, dry", kcal: 356, protein: 11.35, fat: 0.81, carb: 74.1, allergens: ["gluten"], diet: "plant", us: { kind: 'oz' } },
  whey: { fdcId: 173180, name: "Whey protein powder", kcal: 352, protein: 78.13, fat: 1.56, carb: 6.25, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 97 } },
  white_beans: { fdcId: 175204, name: "White beans, canned, drained", kcal: 114, protein: 7.26, fat: 0.29, carb: 21.2, allergens: [], diet: "plant", us: { kind: 'cup', grams: 262 } },
  white_rice: { fdcId: 168877, name: "Long-grain white rice, dry", kcal: 365, protein: 7.13, fat: 0.66, carb: 79.95, allergens: [], diet: "plant", us: { kind: 'cup', grams: 185 } },
  wholewheat_bread: { fdcId: 172688, name: "Whole-wheat bread", kcal: 252, protein: 12.45, fat: 3.5, carb: 42.71, allergens: ["gluten"], diet: "plant", us: { kind: 'each', grams: 32, one: "slice", many: "slices" } },
  yogurt: { fdcId: 171284, name: "Plain yogurt", kcal: 61, protein: 3.47, fat: 3.25, carb: 4.66, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 245 } },
} as const satisfies Record<string, Ingredient>;

export type IngredientKey = keyof typeof INGREDIENTS;

export type PlanSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

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

/**
 * Forge's own recipe book. EMPTY since 2026-09-24: the PO removed the 40 starter recipes to write
 * their own. Add a recipe here in the same `RecipeSource` shape (ingredients are INGREDIENTS keys, in grams
 * per serving) and the planner, Recipe screen and Grocery List pick it up. Until then the planner draws
 * only from My Recipes. The 40 live on as test data in `__tests__/fixtures/starter-recipes.ts`.
 */
export const RECIPE_SOURCES: readonly RecipeSource[] = [
  /*
   * The PO's recipes, from 2026-09-24. Each started from a recipe the PO found online. Ingredients and
   * method are facts and free to use; name, wording, brands and the poster's macros are not, so all four
   * are Forge's own here: plain ingredients, steps rewritten, numbers from USDA via the table above.
   * Amounts are the source batch divided by its servings.
   */
  {
    id: 'p01', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 4, reheat: 'ok', proteinSource: 'egg', format: "sandwich",
    name: "Egg and turkey bacon breakfast bagels", minutes: 40, batch: true, equipment: ["8×8-inch baking dish"],
    // Batch of 8: 16 slices turkey bacon, 8 eggs, 500 g egg whites, 300 g fat-free cottage cheese, 5 g parmesan,
    // 1 tsp each onion + garlic powder, 8 low-carb bagels, 8 cheddar slices.
    ingredients: [['turkey_bacon', 32], ['egg', 50], ['egg_white', 63], ['cottage_cheese_nonfat', 38], ['parmesan', 0.6], ['onion_powder', 0.3], ['garlic_powder', 0.4], ['low_carb_bagel', 46], ['cheddar_slice', 21]],
    steps: [
      { title: "Crisp the bacon", text: "Cook the turkey bacon in a pan over medium heat until crisp, 3–4 minutes a side. Cut each slice in half.", min: 10 },
      { title: "Mix the eggs", text: "Heat the oven to 350°F. Blend the cottage cheese until smooth, then whisk it with the eggs, egg whites, parmesan, and onion and garlic powder." },
      { title: "Bake the egg layer", text: "Pour into a lined 8×8-inch dish — a small dish keeps the layer thick enough to cut. Bake 20–25 minutes, until set in the middle (160°F). Cool, then cut into 8 squares.", min: 25 },
      { title: "Build", text: "Toast the bagels. Fill each with an egg square, a slice of cheddar and four half-slices of bacon." },
      { title: "Store and reheat", text: "Wrap each in foil and freeze for up to 2 months. Move one to the fridge the night before. Unwrap, wrap in a damp paper towel and microwave 2–4 minutes until hot through (165°F)." },
    ],
  },
  {
    id: 'p02', slot: 'dinner', mealTypes: ["lunch", "dinner"], leftoverDays: 3, reheat: 'great', proteinSource: 'chicken', format: "rice bowl",
    name: "Chicken Alfredo sheet-pan rice", minutes: 60, batch: true, equipment: ["Large sheet pan"],
    // Batch of 8: 1400 g chicken breast, 350 g dry rice, 450 g skim milk, 110 g parmesan, 190 g light cream cheese,
    // 25 g light butter, 40 g garlic, 90 g white + 200 g red onion, 200 g sun-dried tomatoes, 40 g olive oil,
    // a handful of parsley, and the spices (4 tsp salt, 10 tsp Italian herbs, 5 tsp paprika…).
    ingredients: [
      ['chicken_breast', 175], ['olive_oil', 5], ['salt', 3], ['italian_herbs', 1.25], ['parsley_dried', 0.25], ['garlic_powder', 1.55],
      ['onion_powder', 1.2], ['paprika', 1.44], ['chili_flakes', 0.56], ['light_butter', 3], ['garlic', 5], ['onion', 36],
      ['skim_milk', 56], ['parmesan', 14], ['light_cream_cheese', 24], ['white_rice', 44], ['sundried_tomatoes', 25], ['parsley', 4],
    ],
    steps: [
      { title: "Season the chicken", text: "Cut the chicken into bite-size cubes. Toss with the olive oil, most of the salt, half the Italian herbs, the dried parsley, garlic and onion powder, most of the paprika and the chilli flakes." },
      { title: "Cook the rice", text: "Boil the rice in plenty of salted water until tender, about 12 minutes. Drain.", min: 15 },
      { title: "Make the sauce", text: "Melt the light butter over medium heat. Soften the chopped garlic and white onion, 5 minutes. Add a pinch of salt and herbs, then the milk, parmesan and cream cheese. Stir until smooth and thick.", min: 10 },
      { title: "Roast the chicken", text: "Spread the chicken on a lined sheet pan and roast at 400°F for 18 minutes, then broil 5 minutes until golden (165°F inside). Lift the chicken out and keep the juices in the pan.", min: 23 },
      { title: "Roast the vegetables", text: "Add the red onion, sun-dried tomatoes, fresh parsley and the rest of the paprika and herbs to the pan juices. Spread flat and roast 15 minutes.", min: 15 },
      { title: "Finish", text: "Fold the rice through the vegetables until coated. Serve with the chicken and the sauce. Keeps 3 days in the fridge; reheat until hot through (165°F)." },
    ],
  },
  {
    id: 'p03', slot: 'dinner', mealTypes: ["lunch", "dinner"], leftoverDays: 2, reheat: 'ok', proteinSource: 'beef', format: "burger",
    name: "Honey barbecue beef sliders", minutes: 35, batch: true, equipment: [],
    // Batch of 6: 800 g 95% lean beef, 30 g tomato paste, 60 g barbecue sauce, 2 tsp honey, the spices,
    // 1 red onion with balsamic + 1 tsp brown sugar, 6 brioche buns (57 g), 6 reduced-fat American slices, 250 g mozzarella.
    ingredients: [
      ['ground_beef_95', 133], ['paprika', 0.77], ['garlic_powder', 1.03], ['onion_powder', 0.8], ['pepper', 0.38], ['salt', 2],
      ['tomato_paste', 5], ['garlic', 1.25], ['bbq_sauce', 10], ['honey', 2.3], ['onion', 25], ['balsamic', 2.5], ['brown_sugar', 0.7],
      ['burger_bun', 57], ['american_cheese_light', 21], ['mozzarella_light', 42],
    ],
    steps: [
      { title: "Cook the beef", text: "Brown the beef in a large pan over medium-high heat, breaking it up, until no pink remains (160°F). Stir in the paprika, garlic and onion powder, pepper, salt, tomato paste and garlic.", min: 10 },
      { title: "Glaze it", text: "Add the barbecue sauce and honey and simmer 2 minutes until sticky.", min: 2 },
      { title: "Caramelise the onion", text: "Slice the red onion and cook it in a lightly oiled pan until soft, 8 minutes. Add a splash of balsamic and the brown sugar and cook until jammy.", min: 10 },
      { title: "Build and bake", text: "Heat the oven to 375°F. Fill each bun with beef, onion, a slice of American cheese and the mozzarella. Bake 10–12 minutes until the cheese melts.", min: 12 },
      { title: "Store and reheat", text: "Wrap cooled sliders in foil and refrigerate up to 2 days. Microwave 30–60 seconds, then air-fry to crisp until hot through (165°F)." },
    ],
  },
  {
    id: 'p04', slot: 'dinner', mealTypes: ["lunch", "dinner"], leftoverDays: 3, reheat: 'ok', proteinSource: 'beef', format: "taco",
    name: "Crispy sheet-pan beef tacos", minutes: 55, batch: true, equipment: ["Large sheet pan"],
    // Batch of 15 tacos; ONE SERVING = 2 TACOS, so the batch is divided by 7.5. 1200 g 95% lean beef,
    // 200 g tomato paste, 200 g onion, 200 g bell pepper, 15 mini wraps, 320 g mozzarella; sauce: 300 g yogurt,
    // 120 g light mayo, 100 g hot sauce, 50 g honey. Spices summed across beef, vegetables and sauce.
    ingredients: [
      ['ground_beef_95', 160], ['tomato_paste', 26.7], ['onion', 26.7], ['red_pepper', 26.7], ['avocado_oil', 3], ['salt', 2.4],
      ['paprika', 1.53], ['oregano', 0.53], ['garlic_powder', 1.65], ['onion_powder', 1.28], ['cumin', 0.84], ['cilantro', 0.27],
      ['mini_wrap', 56], ['mozzarella_light', 43], ['yogurt', 40], ['light_mayo', 16], ['hot_sauce', 13.3], ['honey', 6.7], ['parsley', 0.67],
    ],
    steps: [
      { title: "Make the sauce", text: "Stir together the yogurt, light mayo, hot sauce, honey, a pinch of smoked paprika and onion powder, and some chopped parsley. Chill until serving." },
      { title: "Roast the vegetables", text: "Heat the oven to 375°F. Spread the chopped onion and bell pepper on a lined sheet pan, spray with avocado oil, season with some of the salt and spices, and roast 15 minutes.", min: 15 },
      { title: "Add the beef", text: "Spread the beef over the vegetables with the tomato paste, cilantro and the rest of the spices. Mix, flatten, and spray lightly." },
      { title: "Bake the beef", text: "Bake 6 minutes, break it up, then bake 6 more until lightly crisp and no pink remains (160°F). Stir in a splash of water so it stays juicy.", min: 12 },
      { title: "Crisp the tacos", text: "Dip each wrap in the pan juices, fill with beef and mozzarella, fold, and bake 12 minutes, turning halfway, until golden. Serve with the sauce.", min: 12 },
      { title: "Store and reheat", text: "Refrigerate up to 3 days, sauce separately. Reheat in the oven or air fryer until crisp and hot through (165°F)." },
    ],
  },
  {
    id: 'p05', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 4, reheat: 'cold', proteinSource: 'dairy', format: "cookie",
    name: "Stuffed s'mores protein cookies", minutes: 20, batch: true, equipment: [],
    // Batch of 6 filled cookies (12 dough balls, sandwiched): 45 g whey + 15 g casein (casein as whey — SR
    // Legacy has no casein powder), 30 g flour, 3 g baking powder, 30 g applesauce, 35 g Greek yogurt,
    // 100 g reduced-fat peanut butter, 10 ml vanilla, 30 g mini chips; filling 18 g marshmallow creme, 35 g milk chocolate.
    ingredients: [
      ['whey', 10], ['flour', 5], ['baking_powder', 0.5], ['applesauce', 5], ['greek_yogurt', 5.8], ['pb_light', 16.7],
      ['vanilla', 1.5], ['choc_chips', 5], ['marshmallow_creme', 3], ['milk_chocolate', 5.8],
    ],
    steps: [
      { title: "Mix the dry", text: "Heat the oven to 350°F. Whisk the flour, protein powder and baking powder together." },
      { title: "Make the dough", text: "Stir in the peanut butter, applesauce, Greek yogurt and vanilla until it forms a dough. Fold in the chocolate chips." },
      { title: "Fill", text: "Divide into 12 balls and press them slightly flat on a lined sheet. Top six with a square of milk chocolate and ½ tsp marshmallow creme, cover with the other six and pinch the edges shut." },
      { title: "Bake", text: "Bake about 7 minutes — they should look barely set. Overbaked, they turn dry.", min: 7 },
      { title: "Cool completely", text: "Leave them on the sheet until fully cool; warm, they fall apart. Keep in an airtight box up to 4 days." },
    ],
  },
  {
    id: 'p06', slot: 'dinner', mealTypes: ["lunch", "dinner"], leftoverDays: 4, reheat: 'great', proteinSource: 'chicken', format: "burrito",
    name: "Crispy pepperoni pizza chicken burritos", minutes: 45, batch: true, equipment: [],
    // Batch of 10: 1.7 kg chicken breast, 200 g turkey pepperoni (the source allows beef, turkey or regular) in the filling + 4 slices outside each, 350 g pizza sauce,
    // 80 g parmesan, 5 garlic cloves, 200 g light cream cheese, 100 ml hot sauce, 10 large low-carb tortillas, 25 g mozzarella inside + 20 g reduced-fat cheddar outside each.
    ingredients: [
      ['chicken_breast', 170], ['olive_oil', 0.45], ['salt', 0.6], ['garlic_powder', 0.31], ['onion_powder', 0.24], ['paprika', 0.23],
      ['turkey_pepperoni', 28], ['pizza_sauce', 35], ['parmesan', 8], ['garlic', 1.5], ['light_cream_cheese', 20], ['italian_herbs', 0.15],
      ['hot_sauce', 10], ['parsley', 1], ['low_carb_tortilla', 71], ['mozzarella_light', 25], ['light_cheddar', 20],
    ],
    steps: [
      { title: "Cook the chicken", text: "Slice the chicken into thin fillets, toss with the oil, salt, garlic and onion powder and paprika. Cook over medium-high heat 4–6 minutes a side (165°F inside). Rest, then dice small.", min: 12 },
      { title: "Make the filling", text: "In the same pan, crisp the pepperoni. Add back the chicken with the pizza sauce, parmesan, chopped garlic, cream cheese, Italian herbs and hot sauce. Stir about 5 minutes until melted and combined. Add parsley.", min: 7 },
      { title: "Roll", text: "Warm a tortilla, spoon a tenth of the filling and the mozzarella down the middle, and roll tightly." },
      { title: "Crisp the outside", text: "Lay 4 pepperoni slices in a hot pan, scatter the cheddar over them and set the burrito on top, seam down. When the cheese is crisp, flip and brown the other side. Repeat.", min: 20 },
      { title: "Store and reheat", text: "Refrigerate up to 4 days or freeze up to 2 months. Reheat in an air fryer or oven until hot through (165°F)." },
    ],
  },
];
