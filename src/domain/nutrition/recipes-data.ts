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

/** The starter set: ten breakfasts, ten lunches, twelve dinners, eight snacks. Names and times from `meal-recipes.js` in the design project; ingredients, amounts and steps are Forge's. */
export const RECIPE_SOURCES: readonly RecipeSource[] = [
  {
    id: 'b01', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 0, reheat: 'cold', proteinSource: 'dairy', format: "bowl",
    name: "Greek yogurt bowl with granola and berries", minutes: 5, batch: false, equipment: [],
    ingredients: [['greek_yogurt', 300], ['granola', 60], ['blueberries', 75], ['strawberries', 75], ['honey', 15]],
    steps: [{ title: "Build the bowl", text: "Spoon the yogurt into a bowl." }, { title: "Top it", text: "Scatter over the granola and berries, then drizzle with the honey." }],
  },
  {
    id: 'b02', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 0, reheat: 'poor', proteinSource: 'beef', format: "hash",
    name: "Steak and egg hash", minutes: 25, batch: false, equipment: [],
    ingredients: [['sirloin', 130], ['egg', 100], ['potato', 200], ['red_pepper', 75], ['olive_oil', 10], ['salt', 1], ['pepper', 0.5]],
    steps: [{ title: "Crisp the potatoes", text: "Dice the potatoes small. Heat the oil in a large pan over medium-high heat and cook the potatoes, turning now and then, until golden and tender.", min: 12 }, { title: "Add the pepper", text: "Stir in the diced pepper and cook until it softens.", min: 3 }, { title: "Cook the steak", text: "Push everything to the side. Season the steak with salt and pepper and sear it in the pan, 2–3 minutes a side for medium. Rest it, then slice.", min: 6 }, { title: "Fry the eggs", text: "Crack the eggs into the pan and cook until the whites are fully set.", min: 3 }, { title: "Serve", text: "Pile the hash on a plate with the sliced steak and eggs on top." }],
  },
  {
    id: 'b03', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 2, reheat: 'cold', proteinSource: 'legume', format: "oats",
    name: "Peanut butter overnight oats", minutes: 5, batch: false, equipment: [],
    ingredients: [['oats', 80], ['peanut_butter', 32], ['banana', 100], ['rice_milk', 240], ['cinnamon', 1]],
    steps: [{ title: "Mix", text: "Stir the oats, rice milk, peanut butter and cinnamon together in a jar or container." }, { title: "Chill overnight", text: "Cover and refrigerate for at least 6 hours." }, { title: "Serve", text: "Slice the banana over the top. Eat cold." }],
  },
  {
    id: 'b04', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 0, reheat: 'poor', proteinSource: 'fish', format: "toast",
    name: "Smoked salmon bagel", minutes: 10, batch: false, equipment: [],
    ingredients: [['bagel', 105], ['smoked_salmon', 85], ['cream_cheese', 40], ['capers', 10], ['lemon', 5], ['pepper', 0.3]],
    steps: [{ title: "Toast", text: "Split and toast the bagel.", min: 3 }, { title: "Spread", text: "Spread both halves with the cream cheese." }, { title: "Top and serve", text: "Lay over the smoked salmon, scatter the capers, add a squeeze of lemon and a grind of pepper." }],
  },
  {
    id: 'b05', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 1, reheat: 'ok', proteinSource: 'tofu', format: "scramble",
    name: "Tofu scramble with black beans", minutes: 15, batch: false, equipment: [],
    ingredients: [['tofu', 200], ['black_beans', 120], ['spinach', 60], ['flour_tortilla', 45], ['olive_oil', 7], ['cumin', 1], ['paprika', 1], ['salt', 1]],
    steps: [{ title: "Crumble the tofu", text: "Pat the tofu dry and crumble it with your hands." }, { title: "Cook", text: "Heat the oil in a pan over medium heat. Add the tofu, cumin, paprika and salt and cook, stirring, until lightly golden.", min: 6 }, { title: "Add beans and spinach", text: "Stir in the beans and spinach and cook until the beans are hot and the spinach wilts.", min: 3 }, { title: "Serve", text: "Warm the tortilla in a dry pan and serve with the scramble.", min: 1 }],
  },
  {
    id: 'b06', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 1, reheat: 'ok', proteinSource: 'egg', format: "pancakes",
    name: "Protein pancakes with banana", minutes: 20, batch: false, equipment: [],
    ingredients: [['flour', 50], ['egg', 100], ['whey', 30], ['milk', 120], ['banana', 100], ['honey', 10], ['butter', 3]],
    steps: [{ title: "Make the batter", text: "Whisk the flour, protein powder, eggs and milk until smooth. Rest for 2 minutes.", min: 3 }, { title: "Cook the pancakes", text: "Melt a little butter in a non-stick pan over medium heat. Pour in small rounds of batter and cook until bubbles form, then flip and cook until set.", min: 10 }, { title: "Serve", text: "Stack the pancakes, top with sliced banana and drizzle with honey." }],
  },
  {
    id: 'b07', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 2, reheat: 'ok', proteinSource: 'turkey', format: "wrap",
    name: "Turkey sausage breakfast burrito", minutes: 20, batch: false, equipment: [],
    ingredients: [['turkey_sausage', 100], ['egg', 100], ['cheddar', 28], ['flour_tortilla', 70], ['salsa', 30]],
    steps: [{ title: "Cook the sausage", text: "Remove the sausage from its casing and cook in a pan over medium-high heat, breaking it up, until browned and cooked through (165°F / 74°C).", min: 8 }, { title: "Scramble the eggs", text: "Lower the heat, add the beaten eggs and stir gently until just set.", min: 3 }, { title: "Fill and roll", text: "Warm the tortilla. Fill with the sausage and eggs, top with the cheese and salsa, and roll up tightly.", min: 2 }, { title: "Toast", text: "Toast the burrito seam-side down in the pan until golden.", min: 2 }],
  },
  {
    id: 'b08', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 0, reheat: 'poor', proteinSource: 'egg', format: "skillet",
    name: "Shakshuka with feta and toast", minutes: 25, batch: false, equipment: [],
    ingredients: [['egg', 150], ['canned_tomatoes', 250], ['feta', 40], ['wholewheat_bread', 60], ['olive_oil', 10], ['onion', 60], ['garlic', 3], ['cumin', 1], ['paprika', 1], ['salt', 1]],
    steps: [{ title: "Soften the onion", text: "Heat the oil in a small pan over medium heat. Cook the diced onion until soft.", min: 5 }, { title: "Build the sauce", text: "Add the garlic, cumin and paprika for 30 seconds, then the tomatoes and salt. Simmer until slightly thickened.", min: 8 }, { title: "Cook the eggs", text: "Make small wells and crack in the eggs. Cover and cook until the whites are fully set.", min: 7 }, { title: "Serve", text: "Crumble over the feta and serve with toast." }],
  },
  {
    id: 'b09', slot: 'breakfast', mealTypes: ["breakfast"], leftoverDays: 0, reheat: 'poor', proteinSource: 'dairy', format: "toast",
    name: "Cottage cheese and almond toast", minutes: 5, batch: false, equipment: [],
    ingredients: [['cottage_cheese', 225], ['almonds', 20], ['wholewheat_bread', 60], ['peach', 150], ['honey', 5]],
    steps: [{ title: "Toast", text: "Toast the bread.", min: 3 }, { title: "Top", text: "Spread the cottage cheese over the toast." }, { title: "Finish", text: "Top with the sliced peach and chopped almonds, and drizzle with the honey." }],
  },
  {
    id: 'b10', slot: 'breakfast', mealTypes: ["breakfast", "snacks"], leftoverDays: 3, reheat: 'cold', proteinSource: 'mixed', format: "pudding",
    name: "Chia pudding with mango", minutes: 5, batch: false, equipment: [],
    ingredients: [['chia', 40], ['coconut_milk', 120], ['rice_milk', 120], ['mango', 150]],
    steps: [{ title: "Mix", text: "Stir the chia seeds, coconut milk and rice milk together. Wait 5 minutes and stir again to break up clumps." }, { title: "Chill", text: "Cover and refrigerate for at least 4 hours, or overnight." }, { title: "Serve", text: "Top with the diced mango." }],
  },
  {
    id: 'l01', slot: 'lunch', mealTypes: ["lunch", "dinner"], leftoverDays: 2, reheat: 'great', proteinSource: 'chicken', format: "bowl",
    name: "Chicken shawarma rice bowl", minutes: 30, batch: false, equipment: [],
    ingredients: [['chicken_breast', 220], ['white_rice', 85], ['tahini', 20], ['cucumber', 80], ['tomato', 80], ['olive_oil', 10], ['lemon', 10], ['cumin', 1], ['paprika', 1], ['garlic', 3], ['salt', 1]],
    steps: [{ title: "Cook the rice", text: "Rinse the rice and simmer, covered, in twice its volume of water until tender. Rest for 5 minutes.", min: 18 }, { title: "Season the chicken", text: "Slice the chicken into strips and toss with the oil, cumin, paprika, grated garlic and salt." }, { title: "Cook the chicken", text: "Cook in a hot pan, turning, until browned and cooked through (165°F / 74°C).", min: 8 }, { title: "Make the sauce", text: "Stir the tahini with the lemon juice and a splash of water until pourable." }, { title: "Build the bowl", text: "Serve the chicken over the rice with the diced cucumber and tomato, and drizzle with the sauce." }],
  },
  {
    id: 'l02', slot: 'lunch', mealTypes: ["lunch"], leftoverDays: 1, reheat: 'cold', proteinSource: 'fish', format: "salad",
    name: "Tuna, white bean and rocket salad", minutes: 10, batch: false, equipment: [],
    ingredients: [['tuna', 140], ['white_beans', 200], ['arugula', 40], ['lemon', 15], ['olive_oil', 20], ['tomato', 80], ['salt', 0.5], ['pepper', 0.3]],
    steps: [{ title: "Make the dressing", text: "Whisk the oil, lemon juice, salt and pepper in a bowl." }, { title: "Toss", text: "Add the beans, tomatoes and tuna and toss gently." }, { title: "Serve", text: "Fold in the rocket just before eating." }],
  },
  {
    id: 'l03', slot: 'lunch', mealTypes: ["lunch"], leftoverDays: 0, reheat: 'cold', proteinSource: 'turkey', format: "wrap",
    name: "Turkey and avocado wrap", minutes: 10, batch: false, equipment: [],
    ingredients: [['deli_turkey', 120], ['avocado', 75], ['flour_tortilla', 90], ['cheddar', 28], ['spinach', 30], ['lemon', 3]],
    steps: [{ title: "Mash the avocado", text: "Mash the avocado with the lemon juice." }, { title: "Fill", text: "Spread the avocado over the tortilla, then layer the turkey, cheese and spinach." }, { title: "Roll", text: "Roll up tightly and cut in half." }],
  },
  {
    id: 'l04', slot: 'lunch', mealTypes: ["lunch", "dinner"], leftoverDays: 4, reheat: 'great', proteinSource: 'legume', format: "soup",
    name: "Lentil and roasted vegetable soup", minutes: 40, batch: true, equipment: ["Sheet pan"],
    ingredients: [['lentils', 100], ['carrot', 100], ['butternut', 150], ['onion', 80], ['olive_oil', 15], ['veg_broth', 350], ['wholewheat_bread', 60], ['garlic', 3], ['cumin', 1], ['salt', 1]],
    steps: [{ title: "Roast the vegetables", text: "Heat the oven to 425°F (220°C). Toss the diced carrot, squash and onion with the oil and salt, and roast on a sheet pan until tender and browned.", min: 25 }, { title: "Cook the lentils", text: "Meanwhile rinse the lentils and simmer them in the broth with the garlic and cumin until soft.", min: 25 }, { title: "Combine", text: "Stir the roasted vegetables into the lentils. Blend a little of the soup if you like it thicker.", min: 3 }, { title: "Serve", text: "Season to taste and serve with the bread." }, { title: "Store the leftovers", text: "Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through." }],
  },
  {
    id: 'l05', slot: 'lunch', mealTypes: ["lunch", "dinner"], leftoverDays: 3, reheat: 'cold', proteinSource: 'legume', format: "bowl",
    name: "Chickpea and quinoa power bowl", minutes: 20, batch: false, equipment: [],
    ingredients: [['chickpeas', 150], ['quinoa', 65], ['kale', 60], ['tahini', 25], ['lemon', 15], ['avocado', 50], ['salt', 0.5]],
    steps: [{ title: "Cook the quinoa", text: "Rinse the quinoa and simmer in twice its volume of water until the water is absorbed.", min: 15 }, { title: "Massage the kale", text: "Rub the kale with a pinch of salt and half the lemon juice until it softens.", min: 2 }, { title: "Make the dressing", text: "Stir the tahini with the rest of the lemon juice and a splash of water." }, { title: "Build the bowl", text: "Top the quinoa with the kale, chickpeas and sliced avocado, and drizzle with the dressing." }],
  },
  {
    id: 'l06', slot: 'lunch', mealTypes: ["lunch"], leftoverDays: 1, reheat: 'cold', proteinSource: 'dairy', format: "salad",
    name: "Halloumi grain salad", minutes: 20, batch: false, equipment: [],
    ingredients: [['halloumi', 90], ['bulgur', 70], ['tomato', 100], ['cucumber', 80], ['mint', 5], ['olive_oil', 15], ['lemon', 15]],
    steps: [{ title: "Soak the bulgur", text: "Cover the bulgur with boiling water and leave, covered, until tender. Drain well.", min: 12 }, { title: "Grill the halloumi", text: "Slice the halloumi and cook in a dry pan until golden on both sides.", min: 4 }, { title: "Toss", text: "Mix the bulgur with the diced tomato and cucumber, chopped mint, oil and lemon juice." }, { title: "Serve", text: "Top with the halloumi." }],
  },
  {
    id: 'l07', slot: 'lunch', mealTypes: ["lunch", "dinner"], leftoverDays: 1, reheat: 'ok', proteinSource: 'shellfish', format: "stir-fry",
    name: "Prawn noodle stir-fry", minutes: 20, batch: false, equipment: [],
    ingredients: [['shrimp', 170], ['wheat_noodles', 95], ['soy_sauce', 18], ['bok_choy', 120], ['olive_oil', 15], ['sesame_seeds', 6], ['garlic', 3], ['ginger', 4]],
    steps: [{ title: "Cook the noodles", text: "Boil the noodles until just tender. Drain and rinse under cold water.", min: 4 }, { title: "Cook the prawns", text: "Heat the oil in a wok or large pan over high heat. Stir-fry the prawns until pink and opaque all the way through.", min: 3 }, { title: "Add the greens", text: "Add the garlic, ginger and bok choy and stir-fry until the bok choy wilts.", min: 2 }, { title: "Toss and serve", text: "Add the noodles and soy sauce and toss until hot. Scatter with sesame seeds.", min: 2 }],
  },
  {
    id: 'l08', slot: 'lunch', mealTypes: ["lunch", "dinner"], leftoverDays: 3, reheat: 'great', proteinSource: 'beef', format: "bowl",
    name: "Beef burrito bowl", minutes: 25, batch: false, equipment: [],
    ingredients: [['ground_beef', 185], ['white_rice', 70], ['black_beans', 120], ['cheddar', 28], ['salsa', 60], ['chili_powder', 2], ['cumin', 1], ['salt', 1]],
    steps: [{ title: "Cook the rice", text: "Rinse the rice and simmer, covered, in twice its volume of water until tender.", min: 18 }, { title: "Brown the beef", text: "Cook the beef in a pan over medium-high heat, breaking it up, until browned with no pink left (160°F / 71°C).", min: 7 }, { title: "Season", text: "Stir in the chilli powder, cumin, salt and a splash of water, and simmer until it coats the meat.", min: 2 }, { title: "Warm the beans", text: "Warm the beans in a small pan or the microwave.", min: 2 }, { title: "Build the bowl", text: "Layer the rice, beans and beef. Top with the cheese and salsa." }],
  },
  {
    id: 'l09', slot: 'lunch', mealTypes: ["lunch", "dinner"], leftoverDays: 2, reheat: 'great', proteinSource: 'egg', format: "stir-fry",
    name: "Egg fried rice with edamame", minutes: 15, batch: false, equipment: [],
    ingredients: [['white_rice', 100], ['egg', 100], ['edamame', 100], ['soy_sauce', 15], ['olive_oil', 15], ['garlic', 3]],
    steps: [{ title: "Use cold rice", text: "Cook the rice ahead and chill it. Fresh rice turns mushy when fried." }, { title: "Scramble the eggs", text: "Heat half the oil in a wok over high heat. Scramble the eggs until just set and set them aside.", min: 2 }, { title: "Fry the rice", text: "Add the rest of the oil, the garlic and the edamame, then the rice. Stir-fry until hot and starting to crisp.", min: 5 }, { title: "Finish", text: "Return the eggs, add the soy sauce and toss to combine.", min: 1 }],
  },
  {
    id: 'l10', slot: 'lunch', mealTypes: ["lunch"], leftoverDays: 0, reheat: 'poor', proteinSource: 'chicken', format: "wrap",
    name: "Mediterranean chicken pita", minutes: 15, batch: false, equipment: [],
    ingredients: [['chicken_breast', 200], ['pita', 90], ['yogurt', 60], ['cucumber', 50], ['tomato', 80], ['olive_oil', 10], ['oregano', 1], ['garlic', 3], ['lemon', 5], ['salt', 1]],
    steps: [{ title: "Cook the chicken", text: "Slice the chicken thinly, toss with the oil, oregano and salt, and cook in a hot pan until cooked through (165°F / 74°C).", min: 8 }, { title: "Make the tzatziki", text: "Grate the cucumber, squeeze out the water, and stir into the yogurt with the grated garlic and lemon juice.", min: 3 }, { title: "Fill", text: "Warm the pita. Fill with the chicken, tomato and tzatziki.", min: 1 }],
  },
  {
    id: 'd01', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 1, reheat: 'ok', proteinSource: 'fish', format: "plate",
    name: "Salmon, sweet potato and greens", minutes: 30, batch: false, equipment: ["Sheet pan"],
    ingredients: [['salmon', 180], ['sweet_potato', 250], ['broccoli', 150], ['olive_oil', 10], ['lemon', 10], ['salt', 1], ['pepper', 0.3]],
    steps: [{ title: "Roast the sweet potato", text: "Heat the oven to 425°F (220°C). Cut the sweet potato into wedges, toss with half the oil and salt, and roast on a sheet pan.", min: 15 }, { title: "Add the salmon and broccoli", text: "Add the broccoli to the pan with the rest of the oil. Season the salmon and lay it on the pan." }, { title: "Roast", text: "Roast until the salmon flakes easily and reaches 145°F (63°C).", min: 12 }, { title: "Serve", text: "Squeeze over the lemon." }],
  },
  {
    id: 'd02', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 3, reheat: 'great', proteinSource: 'beef', format: "stew",
    name: "Beef chilli with rice", minutes: 45, batch: true, equipment: [],
    ingredients: [['ground_beef', 160], ['white_rice', 85], ['kidney_beans', 120], ['canned_tomatoes', 200], ['onion', 60], ['red_pepper', 60], ['olive_oil', 8], ['garlic', 6], ['chili_powder', 4], ['cumin', 2], ['salt', 1]],
    steps: [{ title: "Soften the vegetables", text: "Heat the oil in a large pot over medium-high heat. Add the diced onion and pepper and cook until soft.", min: 5 }, { title: "Brown the beef", text: "Add the beef. Break it up and cook until no pink remains.", min: 7 }, { title: "Toast the spices", text: "Stir in the garlic, chilli powder and cumin and cook until fragrant.", min: 1 }, { title: "Simmer", text: "Add the tomatoes and beans. Bring to a simmer, cover, and cook on low, stirring now and then.", min: 20 }, { title: "Cook the rice", text: "While the chilli simmers, rinse the rice and cook it covered in twice its volume of water. Rest for 5 minutes.", min: 15 }, { title: "Season and serve", text: "Season with salt and serve the chilli over the rice." }, { title: "Store the leftovers", text: "Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through." }],
  },
  {
    id: 'd03', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 3, reheat: 'ok', proteinSource: 'chicken', format: "tray bake",
    name: "Chicken thigh tray bake", minutes: 40, batch: true, equipment: ["Sheet pan"],
    ingredients: [['chicken_thigh', 230], ['potato', 300], ['red_pepper', 120], ['onion', 80], ['olive_oil', 15], ['paprika', 2], ['oregano', 1], ['garlic', 6], ['salt', 1]],
    steps: [{ title: "Heat the oven", text: "Heat the oven to 425°F (220°C)." }, { title: "Prep the tray", text: "Cut the potatoes into chunks and the pepper and onion into wedges. Toss with the oil, paprika, oregano, garlic and salt on a sheet pan.", min: 5 }, { title: "Add the chicken", text: "Nestle the seasoned chicken thighs among the vegetables." }, { title: "Roast", text: "Roast until the potatoes are golden and the chicken reaches 165°F (74°C).", min: 35 }, { title: "Store the leftovers", text: "Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through." }],
  },
  {
    id: 'd04', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 3, reheat: 'great', proteinSource: 'turkey', format: "pasta",
    name: "Turkey bolognese", minutes: 35, batch: true, equipment: [],
    ingredients: [['ground_turkey', 200], ['spaghetti', 100], ['canned_tomatoes', 200], ['mushrooms', 80], ['onion', 50], ['olive_oil', 8], ['garlic', 6], ['oregano', 1], ['salt', 1]],
    steps: [{ title: "Soften the onion", text: "Heat the oil in a large pan. Cook the diced onion and mushrooms until soft and browned.", min: 6 }, { title: "Brown the turkey", text: "Add the turkey and cook, breaking it up, until no pink remains (165°F / 74°C).", min: 7 }, { title: "Simmer the sauce", text: "Add the garlic, oregano, tomatoes and salt. Simmer until thick.", min: 15 }, { title: "Cook the pasta", text: "Meanwhile boil the spaghetti in salted water until al dente. Drain.", min: 10 }, { title: "Serve", text: "Toss the pasta with the sauce." }, { title: "Store the leftovers", text: "Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through." }],
  },
  {
    id: 'd05', slot: 'dinner', mealTypes: ["dinner", "lunch"], leftoverDays: 4, reheat: 'great', proteinSource: 'legume', format: "curry",
    name: "Chickpea and spinach curry", minutes: 30, batch: true, equipment: [],
    ingredients: [['chickpeas', 200], ['spinach', 100], ['coconut_milk', 100], ['white_rice', 85], ['onion', 60], ['garlic', 6], ['ginger', 4], ['curry_powder', 4], ['canned_tomatoes', 100], ['salt', 1]],
    steps: [{ title: "Cook the rice", text: "Rinse the rice and simmer, covered, in twice its volume of water until tender.", min: 18 }, { title: "Build the base", text: "In a large pan, cook the diced onion in a splash of water until soft. Add the garlic, ginger and curry powder for 1 minute.", min: 6 }, { title: "Simmer", text: "Add the chickpeas, tomatoes and coconut milk. Simmer until slightly thickened.", min: 12 }, { title: "Wilt the spinach", text: "Stir in the spinach until it wilts. Season with salt.", min: 2 }, { title: "Serve", text: "Serve over the rice." }, { title: "Store the leftovers", text: "Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through." }],
  },
  {
    id: 'd06', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 0, reheat: 'poor', proteinSource: 'beef', format: "plate",
    name: "Steak, potatoes and green beans", minutes: 30, batch: false, equipment: [],
    ingredients: [['sirloin', 220], ['potato', 300], ['green_beans', 150], ['butter', 15], ['olive_oil', 8], ['garlic', 3], ['salt', 1], ['pepper', 0.5]],
    steps: [{ title: "Boil the potatoes", text: "Cut the potatoes into chunks and boil in salted water until tender. Drain.", min: 15 }, { title: "Cook the steak", text: "Pat the steak dry and season. Sear in the oil in a very hot pan, 3–4 minutes a side for medium. Rest for 5 minutes.", min: 8 }, { title: "Cook the beans", text: "Steam or boil the green beans until bright and just tender.", min: 4 }, { title: "Finish", text: "Toss the potatoes and beans with the butter and garlic. Slice the steak and serve." }],
  },
  {
    id: 'd07', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 1, reheat: 'ok', proteinSource: 'fish', format: "pasta",
    name: "Cod with lemon orzo", minutes: 25, batch: false, equipment: [],
    ingredients: [['cod', 230], ['pasta', 90], ['lemon', 20], ['parmesan', 20], ['olive_oil', 15], ['spinach', 60], ['garlic', 3], ['salt', 1]],
    steps: [{ title: "Cook the orzo", text: "Boil the orzo in salted water until tender. Drain.", min: 10 }, { title: "Cook the cod", text: "Season the cod. Cook in half the oil in a pan over medium-high heat until it flakes easily (145°F / 63°C).", min: 8 }, { title: "Finish the orzo", text: "Toss the orzo with the rest of the oil, the garlic, spinach, lemon juice and Parmesan until the spinach wilts.", min: 2 }, { title: "Serve", text: "Serve the cod on the orzo." }],
  },
  {
    id: 'd08', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 0, reheat: 'poor', proteinSource: 'legume', format: "tacos",
    name: "Black bean tacos", minutes: 20, batch: false, equipment: [],
    ingredients: [['black_beans', 250], ['flour_tortilla', 110], ['cheddar', 40], ['salsa', 80], ['avocado', 50], ['cumin', 1], ['chili_powder', 1], ['salt', 0.5]],
    steps: [{ title: "Season the beans", text: "Warm the beans in a pan with the cumin, chilli powder, salt and a splash of water, mashing a few.", min: 6 }, { title: "Warm the tortillas", text: "Warm the tortillas in a dry pan.", min: 2 }, { title: "Fill", text: "Fill with the beans, cheese, salsa and sliced avocado." }],
  },
  {
    id: 'd09', slot: 'dinner', mealTypes: ["dinner", "lunch"], leftoverDays: 2, reheat: 'ok', proteinSource: 'tofu', format: "stir-fry",
    name: "Teriyaki tofu and broccoli rice", minutes: 25, batch: false, equipment: [],
    ingredients: [['tofu', 220], ['broccoli', 150], ['white_rice', 85], ['teriyaki', 40], ['sesame_seeds', 8], ['olive_oil', 10]],
    steps: [{ title: "Cook the rice", text: "Rinse the rice and simmer, covered, in twice its volume of water until tender.", min: 18 }, { title: "Crisp the tofu", text: "Press the tofu dry and cut into cubes. Fry in the oil over medium-high heat until golden on all sides.", min: 8 }, { title: "Cook the broccoli", text: "Add the broccoli and a splash of water, cover, and steam until just tender.", min: 3 }, { title: "Glaze", text: "Pour in the teriyaki sauce and toss until sticky. Serve over the rice with sesame seeds.", min: 1 }],
  },
  {
    id: 'd10', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 2, reheat: 'ok', proteinSource: 'pork', format: "plate",
    name: "Pork tenderloin, rice and slaw", minutes: 35, batch: false, equipment: [],
    ingredients: [['pork', 250], ['white_rice', 85], ['cabbage', 120], ['carrot', 60], ['olive_oil', 15], ['vinegar', 15], ['paprika', 2], ['salt', 1]],
    steps: [{ title: "Cook the rice", text: "Rinse the rice and simmer, covered, in twice its volume of water until tender.", min: 18 }, { title: "Sear the pork", text: "Heat the oven to 400°F (200°C). Rub the pork with half the oil, the paprika and salt, and sear it all over in an oven-safe pan.", min: 5 }, { title: "Roast", text: "Roast until it reaches 145°F (63°C), then rest for 3 minutes before slicing.", min: 15 }, { title: "Make the slaw", text: "Toss the cabbage and grated carrot with the vinegar and the rest of the oil." }, { title: "Serve", text: "Serve the sliced pork with the rice and slaw." }],
  },
  {
    id: 'd11', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 2, reheat: 'ok', proteinSource: 'mixed', format: "risotto",
    name: "Mushroom and barley risotto", minutes: 45, batch: false, equipment: [],
    ingredients: [['mushrooms', 200], ['barley', 95], ['parmesan', 30], ['onion', 60], ['olive_oil', 15], ['veg_broth', 400], ['butter', 10], ['garlic', 3], ['salt', 0.5]],
    steps: [{ title: "Brown the mushrooms", text: "Heat the oil in a pot. Cook the mushrooms until browned, then set half aside.", min: 6 }, { title: "Toast the barley", text: "Add the onion and garlic and cook until soft, then stir in the barley.", min: 4 }, { title: "Simmer", text: "Add the broth a ladle at a time, stirring often, until the barley is tender and creamy.", min: 35 }, { title: "Finish", text: "Stir in the butter, Parmesan and reserved mushrooms. Season to taste." }],
  },
  {
    id: 'd12', slot: 'dinner', mealTypes: ["dinner"], leftoverDays: 2, reheat: 'ok', proteinSource: 'chicken', format: "wrap",
    name: "Chicken fajitas", minutes: 25, batch: true, equipment: [],
    ingredients: [['chicken_breast', 260], ['red_pepper', 150], ['onion', 80], ['flour_tortilla', 100], ['sour_cream', 40], ['olive_oil', 10], ['chili_powder', 2], ['cumin', 1], ['paprika', 1], ['salt', 1], ['lemon', 5]],
    steps: [{ title: "Season the chicken", text: "Slice the chicken into strips and toss with the chilli powder, cumin, paprika and salt." }, { title: "Cook the chicken", text: "Heat the oil in a large pan over high heat. Cook the chicken until browned and cooked through (165°F / 74°C). Set aside.", min: 7 }, { title: "Cook the vegetables", text: "Add the sliced pepper and onion and cook until charred at the edges.", min: 6 }, { title: "Combine", text: "Return the chicken, squeeze over the lemon and toss." }, { title: "Serve", text: "Serve in warm tortillas with sour cream." }, { title: "Store the leftovers", text: "Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through." }],
  },
  {
    id: 's01', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 0, reheat: 'cold', proteinSource: 'legume', format: "snack",
    name: "Apple and peanut butter", minutes: 3, batch: false, equipment: [],
    ingredients: [['apple', 180], ['peanut_butter', 32]],
    steps: [{ title: "Slice and serve", text: "Core and slice the apple. Serve with the peanut butter for dipping." }],
  },
  {
    id: 's02', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 0, reheat: 'cold', proteinSource: 'dairy', format: "shake",
    name: "Protein shake with banana", minutes: 3, batch: false, equipment: ["Blender"],
    ingredients: [['whey', 30], ['milk', 240], ['banana', 100]],
    steps: [{ title: "Blend", text: "Blend the milk, protein powder and banana until smooth." }],
  },
  {
    id: 's03', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 0, reheat: 'cold', proteinSource: 'legume', format: "snack",
    name: "Hummus and pitta", minutes: 3, batch: false, equipment: [],
    ingredients: [['hummus', 60], ['pita', 60], ['cucumber', 60]],
    steps: [{ title: "Serve", text: "Warm the pita and cut into wedges. Serve with the hummus and cucumber sticks." }],
  },
  {
    id: 's04', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 30, reheat: 'cold', proteinSource: 'mixed', format: "snack",
    name: "Trail mix", minutes: 1, batch: false, equipment: [],
    ingredients: [['almonds', 25], ['peanuts', 20], ['raisins', 20]],
    steps: [{ title: "Mix", text: "Mix the almonds, peanuts and raisins." }],
  },
  {
    id: 's05', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 4, reheat: 'cold', proteinSource: 'egg', format: "snack",
    name: "Boiled eggs and fruit", minutes: 12, batch: false, equipment: [],
    ingredients: [['boiled_egg', 100], ['grapes', 150], ['salt', 0.3]],
    steps: [{ title: "Boil the eggs", text: "Lower the eggs into boiling water and cook for 9–10 minutes for firm yolks.", min: 10 }, { title: "Cool", text: "Cool in cold water, then peel. Season with a pinch of salt and serve with the grapes.", min: 2 }],
  },
  {
    id: 's06', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 2, reheat: 'cold', proteinSource: 'tofu', format: "snack",
    name: "Edamame with sea salt", minutes: 5, batch: false, equipment: [],
    ingredients: [['edamame', 180], ['salt', 0.5]],
    steps: [{ title: "Cook", text: "Cook the edamame in boiling water until hot.", min: 4 }, { title: "Season", text: "Drain and toss with the salt." }],
  },
  {
    id: 's07', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 0, reheat: 'cold', proteinSource: 'dairy', format: "snack",
    name: "Rice cakes with cottage cheese", minutes: 3, batch: false, equipment: [],
    ingredients: [['rice_cakes', 27], ['cottage_cheese', 150], ['pepper', 0.2]],
    steps: [{ title: "Top and serve", text: "Spread the cottage cheese over the rice cakes and add a grind of pepper." }],
  },
  {
    id: 's08', slot: 'snacks', mealTypes: ["snacks"], leftoverDays: 30, reheat: 'cold', proteinSource: 'beef', format: "snack",
    name: "Beef jerky and an orange", minutes: 1, batch: false, equipment: [],
    ingredients: [['beef_jerky', 40], ['orange', 140]],
    steps: [{ title: "Serve", text: "Peel the orange and serve with the jerky." }],
  },
];
