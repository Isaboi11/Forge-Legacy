/* ⚠ GENERATED — do not hand-edit numbers. Regenerate from the USDA SR Legacy CSV (2018-04 release).
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
  allergens: readonly Allergen[];
  diet: DietClass;
}

export const INGREDIENTS = {
  almonds: { fdcId: 170567, name: 'almonds', kcal: 579, protein: 21.15, fat: 49.93, carb: 21.55, allergens: ['tree_nuts'], diet: 'plant' },
  apple: { fdcId: 171688, name: 'apple', kcal: 52, protein: 0.26, fat: 0.17, carb: 13.81, allergens: [], diet: 'plant' },
  arugula: { fdcId: 169387, name: 'rocket', kcal: 25, protein: 2.58, fat: 0.66, carb: 3.65, allergens: [], diet: 'plant' },
  avocado: { fdcId: 171706, name: 'avocado', kcal: 167, protein: 1.96, fat: 15.41, carb: 8.64, allergens: [], diet: 'plant' },
  bagel: { fdcId: 174899, name: 'plain bagel', kcal: 264, protein: 10.56, fat: 1.32, carb: 52.38, allergens: ['gluten', 'sesame'], diet: 'plant' },
  banana: { fdcId: 173944, name: 'banana', kcal: 89, protein: 1.09, fat: 0.33, carb: 22.84, allergens: [], diet: 'plant' },
  barley: { fdcId: 170285, name: 'pearl barley', kcal: 123, protein: 2.26, fat: 0.44, carb: 28.22, allergens: ['gluten'], diet: 'plant' },
  beef_jerky: { fdcId: 167536, name: 'beef jerky', kcal: 410, protein: 33.2, fat: 25.6, carb: 11, allergens: ['soy', 'gluten'], diet: 'meat' },
  black_beans: { fdcId: 175238, name: 'black beans', kcal: 91, protein: 6.03, fat: 0.29, carb: 16.55, allergens: [], diet: 'plant' },
  blueberries: { fdcId: 171711, name: 'blueberries', kcal: 57, protein: 0.74, fat: 0.33, carb: 14.49, allergens: [], diet: 'plant' },
  boiled_egg: { fdcId: 173424, name: 'boiled eggs', kcal: 155, protein: 12.58, fat: 10.61, carb: 1.12, allergens: ['eggs'], diet: 'animal' },
  bok_choy: { fdcId: 170390, name: 'bok choy', kcal: 13, protein: 1.5, fat: 0.2, carb: 2.18, allergens: [], diet: 'plant' },
  broccoli: { fdcId: 169967, name: 'broccoli', kcal: 35, protein: 2.38, fat: 0.41, carb: 7.18, allergens: [], diet: 'plant' },
  bulgur: { fdcId: 170287, name: 'bulgur', kcal: 83, protein: 3.08, fat: 0.24, carb: 18.58, allergens: ['gluten'], diet: 'plant' },
  butter: { fdcId: 173410, name: 'butter', kcal: 717, protein: 0.85, fat: 81.11, carb: 0.06, allergens: ['dairy'], diet: 'animal' },
  butternut: { fdcId: 169295, name: 'butternut squash', kcal: 45, protein: 1, fat: 0.1, carb: 11.69, allergens: [], diet: 'plant' },
  cabbage: { fdcId: 169975, name: 'cabbage', kcal: 25, protein: 1.28, fat: 0.1, carb: 5.8, allergens: [], diet: 'plant' },
  canned_tomatoes: { fdcId: 170051, name: 'canned tomatoes', kcal: 16, protein: 0.79, fat: 0.25, carb: 3.47, allergens: [], diet: 'plant' },
  capers: { fdcId: 172238, name: 'capers', kcal: 23, protein: 2.36, fat: 0.86, carb: 4.89, allergens: [], diet: 'plant' },
  carrot: { fdcId: 170393, name: 'carrots', kcal: 41, protein: 0.93, fat: 0.24, carb: 9.58, allergens: [], diet: 'plant' },
  cheddar: { fdcId: 173414, name: 'cheddar', kcal: 403, protein: 22.87, fat: 33.31, carb: 3.37, allergens: ['dairy'], diet: 'animal' },
  chia: { fdcId: 170554, name: 'chia seeds', kcal: 486, protein: 16.54, fat: 30.74, carb: 42.12, allergens: [], diet: 'plant' },
  chicken_breast: { fdcId: 171477, name: 'chicken breast', kcal: 165, protein: 31.02, fat: 3.57, carb: 0, allergens: [], diet: 'meat' },
  chicken_thigh: { fdcId: 172388, name: 'chicken thighs', kcal: 179, protein: 24.76, fat: 8.15, carb: 0, allergens: [], diet: 'meat' },
  chickpeas: { fdcId: 173800, name: 'chickpeas', kcal: 139, protein: 7.05, fat: 2.77, carb: 22.53, allergens: [], diet: 'plant' },
  coconut_milk: { fdcId: 170173, name: 'coconut milk', kcal: 197, protein: 2.02, fat: 21.33, carb: 2.81, allergens: [], diet: 'plant' },
  cod: { fdcId: 171956, name: 'cod', kcal: 105, protein: 22.83, fat: 0.86, carb: 0, allergens: ['fish'], diet: 'fish' },
  cottage_cheese: { fdcId: 172182, name: 'cottage cheese', kcal: 81, protein: 10.45, fat: 2.27, carb: 4.76, allergens: ['dairy'], diet: 'animal' },
  cream_cheese: { fdcId: 173418, name: 'cream cheese', kcal: 350, protein: 6.15, fat: 34.44, carb: 5.52, allergens: ['dairy'], diet: 'animal' },
  cucumber: { fdcId: 168409, name: 'cucumber', kcal: 15, protein: 0.65, fat: 0.11, carb: 3.63, allergens: [], diet: 'plant' },
  deli_turkey: { fdcId: 172941, name: 'sliced turkey', kcal: 106, protein: 14.81, fat: 3.77, carb: 2.2, allergens: [], diet: 'meat' },
  edamame: { fdcId: 168411, name: 'edamame', kcal: 121, protein: 11.91, fat: 5.2, carb: 8.91, allergens: ['soy'], diet: 'plant' },
  egg: { fdcId: 171287, name: 'eggs', kcal: 143, protein: 12.56, fat: 9.51, carb: 0.72, allergens: ['eggs'], diet: 'animal' },
  feta: { fdcId: 173420, name: 'feta', kcal: 265, protein: 14.21, fat: 21.49, carb: 3.88, allergens: ['dairy'], diet: 'animal' },
  flour: { fdcId: 168894, name: 'flour', kcal: 364, protein: 10.33, fat: 0.98, carb: 76.31, allergens: ['gluten'], diet: 'plant' },
  flour_tortilla: { fdcId: 175037, name: 'flour tortilla', kcal: 306, protein: 8.2, fat: 7.99, carb: 49.38, allergens: ['gluten'], diet: 'plant' },
  garlic: { fdcId: 169230, name: 'garlic', kcal: 149, protein: 6.36, fat: 0.5, carb: 33.06, allergens: [], diet: 'plant' },
  granola: { fdcId: 171646, name: 'granola', kcal: 489, protein: 13.67, fat: 24.31, carb: 53.88, allergens: ['gluten', 'tree_nuts'], diet: 'plant' },
  grapes: { fdcId: 174683, name: 'grapes', kcal: 69, protein: 0.72, fat: 0.16, carb: 18.1, allergens: [], diet: 'plant' },
  greek_yogurt: { fdcId: 170894, name: 'Greek yogurt, nonfat', kcal: 59, protein: 10.19, fat: 0.39, carb: 3.6, allergens: ['dairy'], diet: 'animal' },
  green_beans: { fdcId: 169961, name: 'green beans', kcal: 31, protein: 1.83, fat: 0.22, carb: 6.97, allergens: [], diet: 'plant' },
  ground_beef: { fdcId: 171794, name: 'lean ground beef', kcal: 230, protein: 28.45, fat: 12.04, carb: 0, allergens: [], diet: 'meat' },
  ground_turkey: { fdcId: 171506, name: 'ground turkey', kcal: 203, protein: 27.37, fat: 10.4, carb: 0, allergens: [], diet: 'meat' },
  halloumi: { fdcId: 170846, name: 'halloumi', kcal: 318, protein: 21.6, fat: 24.64, carb: 2.47, allergens: ['dairy'], diet: 'animal' },
  honey: { fdcId: 169640, name: 'honey', kcal: 304, protein: 0.3, fat: 0, carb: 82.4, allergens: [], diet: 'animal' },
  hummus: { fdcId: 174289, name: 'hummus', kcal: 237, protein: 7.78, fat: 17.82, carb: 15, allergens: ['sesame'], diet: 'plant' },
  kale: { fdcId: 168421, name: 'kale', kcal: 35, protein: 2.92, fat: 1.49, carb: 4.42, allergens: [], diet: 'plant' },
  kidney_beans: { fdcId: 174285, name: 'kidney beans', kcal: 124, protein: 7.98, fat: 1.05, carb: 21.49, allergens: [], diet: 'plant' },
  lemon: { fdcId: 167747, name: 'lemon juice', kcal: 22, protein: 0.35, fat: 0.24, carb: 6.9, allergens: [], diet: 'plant' },
  lentils: { fdcId: 172421, name: 'lentils', kcal: 116, protein: 9.02, fat: 0.38, carb: 20.13, allergens: [], diet: 'plant' },
  mango: { fdcId: 169910, name: 'mango', kcal: 60, protein: 0.82, fat: 0.38, carb: 14.98, allergens: [], diet: 'plant' },
  milk: { fdcId: 171267, name: 'milk', kcal: 50, protein: 3.3, fat: 1.98, carb: 4.8, allergens: ['dairy'], diet: 'animal' },
  mint: { fdcId: 173475, name: 'mint', kcal: 44, protein: 3.29, fat: 0.73, carb: 8.41, allergens: [], diet: 'plant' },
  mushrooms: { fdcId: 169251, name: 'mushrooms', kcal: 22, protein: 3.09, fat: 0.34, carb: 3.26, allergens: [], diet: 'plant' },
  oats: { fdcId: 173904, name: 'rolled oats', kcal: 379, protein: 13.15, fat: 6.52, carb: 67.7, allergens: ['gluten'], diet: 'plant' },
  olive_oil: { fdcId: 171413, name: 'olive oil', kcal: 884, protein: 0, fat: 100, carb: 0, allergens: [], diet: 'plant' },
  onion: { fdcId: 170000, name: 'onion', kcal: 40, protein: 1.1, fat: 0.1, carb: 9.34, allergens: [], diet: 'plant' },
  orange: { fdcId: 169097, name: 'orange', kcal: 47, protein: 0.94, fat: 0.12, carb: 11.75, allergens: [], diet: 'plant' },
  parmesan: { fdcId: 171247, name: 'parmesan', kcal: 420, protein: 28.42, fat: 27.84, carb: 13.91, allergens: ['dairy'], diet: 'animal' },
  pasta: { fdcId: 169737, name: 'pasta', kcal: 158, protein: 5.8, fat: 0.93, carb: 30.86, allergens: ['gluten'], diet: 'plant' },
  peach: { fdcId: 169928, name: 'peach', kcal: 39, protein: 0.91, fat: 0.25, carb: 9.54, allergens: [], diet: 'plant' },
  peanut_butter: { fdcId: 172470, name: 'peanut butter', kcal: 598, protein: 22.21, fat: 51.36, carb: 22.31, allergens: ['peanuts'], diet: 'plant' },
  peanuts: { fdcId: 173806, name: 'peanuts', kcal: 587, protein: 24.35, fat: 49.66, carb: 21.26, allergens: ['peanuts'], diet: 'plant' },
  pita: { fdcId: 174915, name: 'pita', kcal: 275, protein: 9.1, fat: 1.2, carb: 55.7, allergens: ['gluten'], diet: 'plant' },
  pork: { fdcId: 168250, name: 'pork tenderloin', kcal: 143, protein: 26.17, fat: 3.51, carb: 0, allergens: [], diet: 'meat' },
  potato: { fdcId: 170026, name: 'potatoes', kcal: 77, protein: 2.05, fat: 0.09, carb: 17.49, allergens: [], diet: 'plant' },
  quinoa: { fdcId: 168917, name: 'quinoa', kcal: 120, protein: 4.4, fat: 1.92, carb: 21.3, allergens: [], diet: 'plant' },
  raisins: { fdcId: 168165, name: 'raisins', kcal: 299, protein: 3.3, fat: 0.25, carb: 79.32, allergens: [], diet: 'plant' },
  red_pepper: { fdcId: 170108, name: 'red peppers', kcal: 26, protein: 0.99, fat: 0.3, carb: 6.03, allergens: [], diet: 'plant' },
  rice_cakes: { fdcId: 170250, name: 'rice cakes', kcal: 387, protein: 8.2, fat: 2.8, carb: 81.5, allergens: [], diet: 'plant' },
  rice_milk: { fdcId: 171942, name: 'rice milk', kcal: 47, protein: 0.28, fat: 0.97, carb: 9.17, allergens: [], diet: 'plant' },
  salmon: { fdcId: 175168, name: 'salmon', kcal: 206, protein: 22.1, fat: 12.35, carb: 0, allergens: ['fish'], diet: 'fish' },
  salsa: { fdcId: 174524, name: 'salsa', kcal: 29, protein: 1.52, fat: 0.17, carb: 6.64, allergens: [], diet: 'plant' },
  sesame_seeds: { fdcId: 170150, name: 'sesame seeds', kcal: 573, protein: 17.73, fat: 49.67, carb: 23.45, allergens: ['sesame'], diet: 'plant' },
  shrimp: { fdcId: 175180, name: 'prawns', kcal: 99, protein: 23.98, fat: 0.28, carb: 0.2, allergens: ['shellfish'], diet: 'shellfish' },
  sirloin: { fdcId: 174763, name: 'sirloin steak', kcal: 135, protein: 21.91, fat: 4.62, carb: 0, allergens: [], diet: 'meat' },
  smoked_salmon: { fdcId: 173687, name: 'smoked salmon', kcal: 117, protein: 18.28, fat: 4.32, carb: 0, allergens: ['fish'], diet: 'fish' },
  sour_cream: { fdcId: 171257, name: 'sour cream', kcal: 198, protein: 2.44, fat: 19.35, carb: 4.63, allergens: ['dairy'], diet: 'animal' },
  soy_sauce: { fdcId: 174277, name: 'soy sauce', kcal: 53, protein: 8.14, fat: 0.57, carb: 4.93, allergens: ['soy', 'gluten'], diet: 'plant' },
  spinach: { fdcId: 168462, name: 'spinach', kcal: 23, protein: 2.86, fat: 0.39, carb: 3.63, allergens: [], diet: 'plant' },
  strawberries: { fdcId: 167762, name: 'strawberries', kcal: 32, protein: 0.67, fat: 0.3, carb: 7.68, allergens: [], diet: 'plant' },
  sweet_potato: { fdcId: 168483, name: 'sweet potato', kcal: 90, protein: 2.01, fat: 0.15, carb: 20.71, allergens: [], diet: 'plant' },
  tahini: { fdcId: 170189, name: 'tahini', kcal: 595, protein: 17, fat: 53.76, carb: 21.19, allergens: ['sesame'], diet: 'plant' },
  teriyaki: { fdcId: 171167, name: 'teriyaki sauce', kcal: 89, protein: 5.93, fat: 0.02, carb: 15.56, allergens: ['soy', 'gluten'], diet: 'plant' },
  tofu: { fdcId: 172475, name: 'firm tofu', kcal: 144, protein: 17.27, fat: 8.72, carb: 2.78, allergens: ['soy'], diet: 'plant' },
  tomato: { fdcId: 170457, name: 'tomatoes', kcal: 18, protein: 0.88, fat: 0.2, carb: 3.89, allergens: [], diet: 'plant' },
  tuna: { fdcId: 173709, name: 'tuna', kcal: 86, protein: 19.44, fat: 0.96, carb: 0, allergens: ['fish'], diet: 'fish' },
  turkey_sausage: { fdcId: 173871, name: 'turkey sausage', kcal: 196, protein: 23.89, fat: 10.44, carb: 0, allergens: [], diet: 'meat' },
  veg_broth: { fdcId: 171583, name: 'vegetable broth', kcal: 5, protein: 0.24, fat: 0.07, carb: 0.93, allergens: [], diet: 'plant' },
  vinegar: { fdcId: 173469, name: 'cider vinegar', kcal: 21, protein: 0, fat: 0, carb: 0.93, allergens: [], diet: 'plant' },
  wheat_noodles: { fdcId: 168909, name: 'wheat noodles', kcal: 131, protein: 4, fat: 0.18, carb: 27.54, allergens: ['gluten'], diet: 'plant' },
  whey: { fdcId: 173180, name: 'whey protein', kcal: 352, protein: 78.13, fat: 1.56, carb: 6.25, allergens: ['dairy'], diet: 'animal' },
  white_beans: { fdcId: 175204, name: 'white beans', kcal: 114, protein: 7.26, fat: 0.29, carb: 21.2, allergens: [], diet: 'plant' },
  white_rice: { fdcId: 168878, name: 'white rice', kcal: 130, protein: 2.69, fat: 0.28, carb: 28.17, allergens: [], diet: 'plant' },
  wholewheat_bread: { fdcId: 172688, name: 'whole-wheat bread', kcal: 252, protein: 12.45, fat: 3.5, carb: 42.71, allergens: ['gluten'], diet: 'plant' },
  yogurt: { fdcId: 171284, name: 'plain yogurt', kcal: 61, protein: 3.47, fat: 3.25, carb: 4.66, allergens: ['dairy'], diet: 'animal' },
} as const satisfies Record<string, Ingredient>;

export type IngredientKey = keyof typeof INGREDIENTS;

export type PlanSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

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
export const RECIPE_SOURCES: readonly RecipeSource[] = [
  { id: 'b01', slot: 'breakfast', name: 'Greek yogurt bowl with granola and berries', minutes: 5, batch: false, ingredients: [['greek_yogurt', 300], ['granola', 60], ['blueberries', 75], ['strawberries', 75], ['honey', 15]] },
  { id: 'b02', slot: 'breakfast', name: 'Steak and egg hash', minutes: 25, batch: false, ingredients: [['sirloin', 120], ['egg', 100], ['potato', 200], ['red_pepper', 75], ['olive_oil', 10]] },
  { id: 'b03', slot: 'breakfast', name: 'Peanut butter overnight oats', minutes: 5, batch: false, ingredients: [['oats', 80], ['peanut_butter', 32], ['banana', 100], ['rice_milk', 240]] },
  { id: 'b04', slot: 'breakfast', name: 'Smoked salmon bagel', minutes: 10, batch: false, ingredients: [['bagel', 105], ['smoked_salmon', 85], ['cream_cheese', 40], ['capers', 10]] },
  { id: 'b05', slot: 'breakfast', name: 'Tofu scramble with black beans', minutes: 15, batch: false, ingredients: [['tofu', 200], ['black_beans', 120], ['spinach', 60], ['flour_tortilla', 45], ['olive_oil', 7]] },
  { id: 'b06', slot: 'breakfast', name: 'Protein pancakes with banana', minutes: 20, batch: false, ingredients: [['flour', 50], ['egg', 100], ['whey', 30], ['milk', 120], ['banana', 100], ['honey', 10]] },
  { id: 'b07', slot: 'breakfast', name: 'Turkey sausage breakfast burrito', minutes: 20, batch: false, ingredients: [['turkey_sausage', 90], ['egg', 100], ['cheddar', 28], ['flour_tortilla', 70]] },
  { id: 'b08', slot: 'breakfast', name: 'Shakshuka with feta and toast', minutes: 25, batch: false, ingredients: [['egg', 150], ['canned_tomatoes', 250], ['feta', 40], ['wholewheat_bread', 60], ['olive_oil', 10], ['onion', 60]] },
  { id: 'b09', slot: 'breakfast', name: 'Cottage cheese and almond toast', minutes: 5, batch: false, ingredients: [['cottage_cheese', 225], ['almonds', 20], ['wholewheat_bread', 60], ['peach', 150]] },
  { id: 'b10', slot: 'breakfast', name: 'Chia pudding with mango', minutes: 5, batch: false, ingredients: [['chia', 40], ['coconut_milk', 120], ['rice_milk', 120], ['mango', 150]] },
  { id: 'l01', slot: 'lunch', name: 'Chicken shawarma rice bowl', minutes: 30, batch: false, ingredients: [['chicken_breast', 170], ['white_rice', 250], ['tahini', 20], ['cucumber', 80], ['tomato', 80], ['olive_oil', 10]] },
  { id: 'l02', slot: 'lunch', name: 'Tuna, white bean and rocket salad', minutes: 10, batch: false, ingredients: [['tuna', 140], ['white_beans', 200], ['arugula', 40], ['lemon', 15], ['olive_oil', 20], ['tomato', 80]] },
  { id: 'l03', slot: 'lunch', name: 'Turkey and avocado wrap', minutes: 10, batch: false, ingredients: [['deli_turkey', 120], ['avocado', 75], ['flour_tortilla', 90], ['cheddar', 28], ['spinach', 30]] },
  { id: 'l04', slot: 'lunch', name: 'Lentil and roasted vegetable soup', minutes: 40, batch: true, ingredients: [['lentils', 300], ['carrot', 100], ['butternut', 150], ['onion', 80], ['olive_oil', 15], ['veg_broth', 250], ['wholewheat_bread', 60]] },
  { id: 'l05', slot: 'lunch', name: 'Chickpea and quinoa power bowl', minutes: 20, batch: false, ingredients: [['chickpeas', 150], ['quinoa', 185], ['kale', 60], ['tahini', 25], ['lemon', 15], ['avocado', 50]] },
  { id: 'l06', slot: 'lunch', name: 'Halloumi grain salad', minutes: 20, batch: false, ingredients: [['halloumi', 90], ['bulgur', 200], ['tomato', 100], ['cucumber', 80], ['mint', 5], ['olive_oil', 15], ['lemon', 15]] },
  { id: 'l07', slot: 'lunch', name: 'Prawn noodle stir-fry', minutes: 20, batch: false, ingredients: [['shrimp', 150], ['wheat_noodles', 250], ['soy_sauce', 18], ['bok_choy', 120], ['olive_oil', 15], ['sesame_seeds', 6]] },
  { id: 'l08', slot: 'lunch', name: 'Beef burrito bowl', minutes: 25, batch: false, ingredients: [['ground_beef', 140], ['white_rice', 200], ['black_beans', 120], ['cheddar', 28], ['salsa', 60]] },
  { id: 'l09', slot: 'lunch', name: 'Egg fried rice with edamame', minutes: 15, batch: false, ingredients: [['white_rice', 300], ['egg', 100], ['edamame', 100], ['soy_sauce', 15], ['olive_oil', 15]] },
  { id: 'l10', slot: 'lunch', name: 'Mediterranean chicken pita', minutes: 15, batch: false, ingredients: [['chicken_breast', 150], ['pita', 90], ['yogurt', 60], ['cucumber', 50], ['tomato', 80], ['olive_oil', 10]] },
  { id: 'd01', slot: 'dinner', name: 'Salmon, sweet potato and greens', minutes: 30, batch: false, ingredients: [['salmon', 180], ['sweet_potato', 250], ['broccoli', 150], ['olive_oil', 10]] },
  { id: 'd02', slot: 'dinner', name: 'Beef chilli with rice', minutes: 45, batch: true, ingredients: [['ground_beef', 150], ['kidney_beans', 130], ['canned_tomatoes', 200], ['white_rice', 250], ['onion', 60], ['olive_oil', 8]] },
  { id: 'd03', slot: 'dinner', name: 'Chicken thigh tray bake', minutes: 40, batch: true, ingredients: [['chicken_thigh', 200], ['potato', 300], ['red_pepper', 120], ['onion', 80], ['olive_oil', 15]] },
  { id: 'd04', slot: 'dinner', name: 'Turkey bolognese', minutes: 35, batch: true, ingredients: [['ground_turkey', 150], ['pasta', 280], ['canned_tomatoes', 200], ['mushrooms', 80], ['onion', 50], ['olive_oil', 8]] },
  { id: 'd05', slot: 'dinner', name: 'Chickpea and spinach curry', minutes: 30, batch: true, ingredients: [['chickpeas', 200], ['spinach', 100], ['coconut_milk', 100], ['white_rice', 250], ['onion', 60], ['garlic', 6]] },
  { id: 'd06', slot: 'dinner', name: 'Steak, potatoes and green beans', minutes: 30, batch: false, ingredients: [['sirloin', 220], ['potato', 300], ['green_beans', 150], ['butter', 15], ['olive_oil', 8]] },
  { id: 'd07', slot: 'dinner', name: 'Cod with lemon orzo', minutes: 25, batch: false, ingredients: [['cod', 200], ['pasta', 250], ['lemon', 20], ['parmesan', 20], ['olive_oil', 15], ['spinach', 60]] },
  { id: 'd08', slot: 'dinner', name: 'Black bean tacos', minutes: 20, batch: false, ingredients: [['black_beans', 250], ['flour_tortilla', 110], ['cheddar', 40], ['salsa', 80], ['avocado', 50]] },
  { id: 'd09', slot: 'dinner', name: 'Teriyaki tofu and broccoli rice', minutes: 25, batch: false, ingredients: [['tofu', 220], ['broccoli', 150], ['white_rice', 250], ['teriyaki', 40], ['sesame_seeds', 8], ['olive_oil', 10]] },
  { id: 'd10', slot: 'dinner', name: 'Pork tenderloin, rice and slaw', minutes: 35, batch: false, ingredients: [['pork', 220], ['white_rice', 250], ['cabbage', 120], ['carrot', 60], ['olive_oil', 15], ['vinegar', 15]] },
  { id: 'd11', slot: 'dinner', name: 'Mushroom and barley risotto', minutes: 45, batch: false, ingredients: [['mushrooms', 200], ['barley', 300], ['parmesan', 30], ['onion', 60], ['olive_oil', 15], ['veg_broth', 200], ['butter', 10]] },
  { id: 'd12', slot: 'dinner', name: 'Chicken fajitas', minutes: 25, batch: true, ingredients: [['chicken_breast', 200], ['red_pepper', 150], ['onion', 80], ['flour_tortilla', 100], ['sour_cream', 40], ['olive_oil', 10]] },
  { id: 's01', slot: 'snacks', name: 'Apple and peanut butter', minutes: 3, batch: false, ingredients: [['apple', 180], ['peanut_butter', 32]] },
  { id: 's02', slot: 'snacks', name: 'Protein shake with banana', minutes: 3, batch: false, ingredients: [['whey', 30], ['milk', 240], ['banana', 100]] },
  { id: 's03', slot: 'snacks', name: 'Hummus and pitta', minutes: 3, batch: false, ingredients: [['hummus', 60], ['pita', 60], ['cucumber', 60]] },
  { id: 's04', slot: 'snacks', name: 'Trail mix', minutes: 1, batch: false, ingredients: [['almonds', 25], ['peanuts', 20], ['raisins', 20]] },
  { id: 's05', slot: 'snacks', name: 'Boiled eggs and fruit', minutes: 12, batch: false, ingredients: [['boiled_egg', 100], ['grapes', 150]] },
  { id: 's06', slot: 'snacks', name: 'Edamame with sea salt', minutes: 5, batch: false, ingredients: [['edamame', 180]] },
  { id: 's07', slot: 'snacks', name: 'Rice cakes with cottage cheese', minutes: 3, batch: false, ingredients: [['rice_cakes', 27], ['cottage_cheese', 150]] },
  { id: 's08', slot: 'snacks', name: 'Beef jerky and an orange', minutes: 1, batch: false, ingredients: [['beef_jerky', 40], ['orange', 140]] },
];
