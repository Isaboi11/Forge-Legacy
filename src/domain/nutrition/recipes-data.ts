/* ⚠ GENERATED — do not hand-edit numbers. Regenerate with scripts/nutrition (see usda.py's header).
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

export const INGREDIENTS = {
  almonds: { fdcId: 170567, name: "Almonds", kcal: 579, protein: 21.15, fat: 49.93, carb: 21.55, allergens: ["tree_nuts"], diet: "plant", us: { kind: 'cup', grams: 143 } },
  apple: { fdcId: 171688, name: "Apple", kcal: 52, protein: 0.26, fat: 0.17, carb: 13.81, allergens: [], diet: "plant", us: { kind: 'each', grams: 182, one: "medium apple", many: "medium apples" } },
  arugula: { fdcId: 169387, name: "Rocket (arugula)", kcal: 25, protein: 2.58, fat: 0.66, carb: 3.65, allergens: [], diet: "plant", us: { kind: 'cup', grams: 20 } },
  avocado: { fdcId: 171706, name: "Avocado", kcal: 167, protein: 1.96, fat: 15.41, carb: 8.64, allergens: [], diet: "plant", us: { kind: 'each', grams: 136, one: "avocado", many: "avocados" } },
  bagel: { fdcId: 174899, name: "Plain bagel", kcal: 264, protein: 10.56, fat: 1.32, carb: 52.38, allergens: ["gluten", "sesame"], diet: "plant", us: { kind: 'each', grams: 105, one: "bagel", many: "bagels" } },
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
  cottage_cheese: { fdcId: 172182, name: "Cottage cheese, 2%", kcal: 81, protein: 10.45, fat: 2.27, carb: 4.76, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 226 } },
  cream_cheese: { fdcId: 173418, name: "Cream cheese", kcal: 350, protein: 6.15, fat: 34.44, carb: 5.52, allergens: ["dairy"], diet: "animal", us: { kind: 'tsp', grams: 4.83 } },
  cucumber: { fdcId: 168409, name: "Cucumber", kcal: 15, protein: 0.65, fat: 0.11, carb: 3.63, allergens: [], diet: "plant", us: { kind: 'cup', grams: 104 } },
  cumin: { fdcId: 170923, name: "Cumin", kcal: 375, protein: 17.81, fat: 22.27, carb: 44.24, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.1 } },
  curry_powder: { fdcId: 170924, name: "Curry powder", kcal: 325, protein: 14.29, fat: 14.01, carb: 55.83, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2 } },
  deli_turkey: { fdcId: 172941, name: "Sliced turkey breast", kcal: 106, protein: 14.81, fat: 3.77, carb: 2.2, allergens: [], diet: "meat", us: { kind: 'each', grams: 16, one: "slice", many: "slices" } },
  edamame: { fdcId: 168411, name: "Edamame, shelled", kcal: 121, protein: 11.91, fat: 5.2, carb: 8.91, allergens: ["soy"], diet: "plant", us: { kind: 'cup', grams: 155 } },
  egg: { fdcId: 171287, name: "Eggs", kcal: 143, protein: 12.56, fat: 9.51, carb: 0.72, allergens: ["eggs"], diet: "animal", us: { kind: 'each', grams: 50, one: "large egg", many: "large eggs" } },
  feta: { fdcId: 173420, name: "Feta, crumbled", kcal: 265, protein: 14.21, fat: 21.49, carb: 3.88, allergens: ["dairy"], diet: "animal", us: { kind: 'cup', grams: 150 } },
  flour: { fdcId: 168894, name: "All-purpose flour", kcal: 364, protein: 10.33, fat: 0.98, carb: 76.31, allergens: ["gluten"], diet: "plant", us: { kind: 'cup', grams: 125 } },
  flour_tortilla: { fdcId: 175037, name: "Flour tortilla (10-inch)", kcal: 306, protein: 8.2, fat: 7.99, carb: 49.38, allergens: ["gluten"], diet: "plant", us: { kind: 'each', grams: 72, one: "tortilla", many: "tortillas" } },
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
  onion: { fdcId: 170000, name: "Onion", kcal: 40, protein: 1.1, fat: 0.1, carb: 9.34, allergens: [], diet: "plant", us: { kind: 'each', grams: 150, one: "large onion", many: "large onions" } },
  orange: { fdcId: 169097, name: "Orange", kcal: 47, protein: 0.94, fat: 0.12, carb: 11.75, allergens: [], diet: "plant", us: { kind: 'each', grams: 131, one: "orange", many: "oranges" } },
  oregano: { fdcId: 171328, name: "Dried oregano", kcal: 265, protein: 9, fat: 4.28, carb: 68.92, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 1 } },
  paprika: { fdcId: 171329, name: "Smoked paprika", kcal: 282, protein: 14.14, fat: 12.89, carb: 53.99, allergens: [], diet: "plant", us: { kind: 'tsp', grams: 2.3 } },
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
export const RECIPE_SOURCES: readonly RecipeSource[] = [];
