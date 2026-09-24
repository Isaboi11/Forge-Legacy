/* ⚠ GENERATED — regenerate with scripts/nutrition/gen_grocery_ts.py (see grocery.py's header).
 *
 * How each ingredient is BOUGHT: its aisle, the unit a store sells it in, whether it is a pantry staple
 * (starts in "Have it"), and a price where a public government source has one:
 *   · USDA ERS Fruit and Vegetable Prices — 2023 data, updated 2025-12-09 (per pound as sold)
 *   · BLS Average Price Data — U.S. city average, August 2026 (series APU0000<item>)
 * Prices are converted to dollars per 100 g of the ingredient AS THE RECIPE WEIGHS IT — canned beans
 * drained (60% of net weight), an avocado without skin and seed, lemon as juice (84 g lemon → 48 g).
 *
 * ⚠ NO PRICE IS INVENTED. An ingredient with no public price is `price: null`, and the Grocery List
 * says how many items its estimate leaves out. Pack sizes are common US retail sizes, used only to
 * round a need up to something a store sells.
 */

export type Aisle = 'Produce' | 'Meat & Fish' | 'Dairy & Eggs' | 'Pantry' | 'Spices';

export type BuyUnit =
  | { kind: 'lb' }
  | { kind: 'dozen' }
  | { kind: 'each'; grams: number; one: string; many: string }
  | { kind: 'pack'; grams: number; unit: string };

export interface GroceryItemMeta {
  /** What it is called on a shopping list ("Lemons"), not how the recipe prepares it ("Lemon juice"). */
  name: string;
  aisle: Aisle;
  buy: BuyUnit;
  /** Salt, oil, spices… assumed in the kitchen: starts in "Have it". */
  staple: boolean;
  /** Dollars per 100 g as used, and where the number came from. Null = no public price. */
  price: { per100g: number; source: string } | null;
}

export const AISLES: readonly Aisle[] = ['Produce', 'Meat & Fish', 'Dairy & Eggs', 'Pantry', 'Spices'];

export const GROCERY: Record<string, GroceryItemMeta> = {
  almonds: { name: "Almonds", aisle: "Pantry", buy: { kind: 'pack', grams: 170, unit: "bag" }, staple: false, price: null },
  apple: { name: "Apples", aisle: "Produce", buy: { kind: 'each', grams: 182, one: "apple", many: "apples" }, staple: false, price: { per100g: 0.4103, source: "USDA ERS · Apples, fresh · 2023" } },
  arugula: { name: "Arugula", aisle: "Produce", buy: { kind: 'pack', grams: 142, unit: "bag" }, staple: false, price: null },
  avocado: { name: "Avocados", aisle: "Produce", buy: { kind: 'each', grams: 136, one: "avocado", many: "avocados" }, staple: false, price: { per100g: 0.674, source: "USDA ERS · Avocados, fresh · 2023" } },
  bagel: { name: "Bagels", aisle: "Pantry", buy: { kind: 'pack', grams: 570, unit: "pack of 6" }, staple: false, price: null },
  banana: { name: "Bananas", aisle: "Produce", buy: { kind: 'each', grams: 118, one: "banana", many: "bananas" }, staple: false, price: { per100g: 0.1437, source: "BLS 711211 · Bananas · 2026-08" } },
  barley: { name: "Pearl barley", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "bag" }, staple: false, price: null },
  beef_jerky: { name: "Beef jerky", aisle: "Pantry", buy: { kind: 'pack', grams: 85, unit: "bag" }, staple: false, price: null },
  black_beans: { name: "Black beans", aisle: "Pantry", buy: { kind: 'pack', grams: 250, unit: "can" }, staple: false, price: { per100g: 0.48, source: "USDA ERS · Black beans, canned · 2023" } },
  blueberries: { name: "Blueberries", aisle: "Produce", buy: { kind: 'pack', grams: 170, unit: "pack" }, staple: false, price: { per100g: 1.1315, source: "USDA ERS · Blueberries, fresh · 2023" } },
  boiled_egg: { name: "Eggs", aisle: "Dairy & Eggs", buy: { kind: 'dozen' }, staple: false, price: { per100g: 0.3787, source: "BLS 708111 · Eggs, large, per dozen · 2026-08" } },
  bok_choy: { name: "Bok choy", aisle: "Produce", buy: { kind: 'each', grams: 200, one: "head", many: "heads" }, staple: false, price: null },
  broccoli: { name: "Broccoli", aisle: "Produce", buy: { kind: 'each', grams: 350, one: "head", many: "heads" }, staple: false, price: { per100g: 0.6797, source: "USDA ERS · Broccoli florets, fresh · 2023" } },
  bulgur: { name: "Bulgur", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "bag" }, staple: false, price: null },
  butter: { name: "Butter", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 454, unit: "pack" }, staple: true, price: { per100g: 0.8865, source: "BLS FS1101 · Butter, stick · 2026-08" } },
  butternut: { name: "Butternut squash", aisle: "Produce", buy: { kind: 'each', grams: 900, one: "squash", many: "squashes" }, staple: false, price: { per100g: 0.3296, source: "USDA ERS · Butternut squash, fresh · 2023" } },
  cabbage: { name: "Cabbage", aisle: "Produce", buy: { kind: 'each', grams: 900, one: "head", many: "heads" }, staple: false, price: { per100g: 0.1822, source: "USDA ERS · Cabbage, green, fresh · 2023" } },
  canned_tomatoes: { name: "Canned tomatoes", aisle: "Pantry", buy: { kind: 'pack', grams: 411, unit: "can" }, staple: false, price: { per100g: 0.2663, source: "USDA ERS · Tomatoes, canned · 2023" } },
  capers: { name: "Capers", aisle: "Pantry", buy: { kind: 'pack', grams: 100, unit: "jar" }, staple: false, price: null },
  carrot: { name: "Carrots", aisle: "Produce", buy: { kind: 'lb' }, staple: false, price: { per100g: 0.2217, source: "USDA ERS · Carrots, raw whole, fresh · 2023" } },
  cheddar: { name: "Shredded cheddar", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 227, unit: "bag" }, staple: false, price: { per100g: 1.319, source: "BLS 710212 · Cheddar cheese · 2026-08" } },
  chia: { name: "Chia seeds", aisle: "Pantry", buy: { kind: 'pack', grams: 340, unit: "bag" }, staple: false, price: null },
  chicken_breast: { name: "Chicken breast", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: { per100g: 0.92, source: "BLS FF1101 · Chicken breast, boneless · 2026-08" } },
  chicken_thigh: { name: "Chicken thighs", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: null },
  chickpeas: { name: "Chickpeas", aisle: "Pantry", buy: { kind: 'pack', grams: 253, unit: "can" }, staple: false, price: null },
  chili_powder: { name: "Chilli powder", aisle: "Spices", buy: { kind: 'pack', grams: 70, unit: "jar" }, staple: true, price: null },
  cinnamon: { name: "Ground cinnamon", aisle: "Spices", buy: { kind: 'pack', grams: 70, unit: "jar" }, staple: true, price: null },
  coconut_milk: { name: "Coconut milk", aisle: "Pantry", buy: { kind: 'pack', grams: 400, unit: "can" }, staple: false, price: null },
  cod: { name: "Cod fillets", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: null },
  cottage_cheese: { name: "Cottage cheese", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 454, unit: "tub" }, staple: false, price: null },
  cream_cheese: { name: "Cream cheese", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 227, unit: "block" }, staple: false, price: null },
  cucumber: { name: "Cucumbers", aisle: "Produce", buy: { kind: 'each', grams: 300, one: "cucumber", many: "cucumbers" }, staple: false, price: { per100g: 0.2409, source: "USDA ERS · Cucumbers with peel, fresh · 2023" } },
  cumin: { name: "Cumin", aisle: "Spices", buy: { kind: 'pack', grams: 45, unit: "jar" }, staple: true, price: null },
  curry_powder: { name: "Curry powder", aisle: "Spices", buy: { kind: 'pack', grams: 45, unit: "jar" }, staple: true, price: null },
  deli_turkey: { name: "Sliced turkey", aisle: "Meat & Fish", buy: { kind: 'pack', grams: 227, unit: "pack" }, staple: false, price: null },
  edamame: { name: "Frozen edamame", aisle: "Pantry", buy: { kind: 'pack', grams: 340, unit: "frozen bag" }, staple: false, price: null },
  egg: { name: "Eggs", aisle: "Dairy & Eggs", buy: { kind: 'dozen' }, staple: false, price: { per100g: 0.3787, source: "BLS 708111 · Eggs, large, per dozen · 2026-08" } },
  feta: { name: "Feta", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 170, unit: "pack" }, staple: false, price: null },
  flour: { name: "Flour", aisle: "Pantry", buy: { kind: 'pack', grams: 2270, unit: "bag" }, staple: true, price: { per100g: 0.1208, source: "BLS 701111 · Flour, all purpose · 2026-08" } },
  flour_tortilla: { name: "Flour tortillas", aisle: "Pantry", buy: { kind: 'pack', grams: 576, unit: "pack of 8" }, staple: false, price: null },
  garlic: { name: "Garlic", aisle: "Produce", buy: { kind: 'each', grams: 50, one: "head", many: "heads" }, staple: false, price: null },
  ginger: { name: "Fresh ginger", aisle: "Produce", buy: { kind: 'each', grams: 50, one: "piece", many: "pieces" }, staple: false, price: null },
  granola: { name: "Granola", aisle: "Pantry", buy: { kind: 'pack', grams: 340, unit: "bag" }, staple: false, price: null },
  grapes: { name: "Grapes", aisle: "Produce", buy: { kind: 'lb' }, staple: false, price: { per100g: 0.4957, source: "USDA ERS · Grapes, fresh · 2023" } },
  greek_yogurt: { name: "Greek yogurt", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 907, unit: "tub" }, staple: false, price: { per100g: 0.6984, source: "BLS FJ4101 · Yogurt, per 8 oz · 2026-08" } },
  green_beans: { name: "Green beans", aisle: "Produce", buy: { kind: 'lb' }, staple: false, price: { per100g: 0.5862, source: "USDA ERS · Green beans, fresh · 2023" } },
  ground_beef: { name: "Lean ground beef", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: { per100g: 1.89, source: "BLS 703113 · Ground beef, lean · 2026-08" } },
  ground_turkey: { name: "Ground turkey", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: null },
  halloumi: { name: "Halloumi", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 225, unit: "block" }, staple: false, price: null },
  honey: { name: "Honey", aisle: "Pantry", buy: { kind: 'pack', grams: 340, unit: "jar" }, staple: true, price: null },
  hummus: { name: "Hummus", aisle: "Produce", buy: { kind: 'pack', grams: 283, unit: "tub" }, staple: false, price: null },
  kale: { name: "Kale", aisle: "Produce", buy: { kind: 'pack', grams: 200, unit: "bunch" }, staple: false, price: { per100g: 0.7873, source: "USDA ERS · Kale, fresh · 2023" } },
  kidney_beans: { name: "Kidney beans", aisle: "Pantry", buy: { kind: 'pack', grams: 266, unit: "can" }, staple: false, price: { per100g: 0.4409, source: "USDA ERS · Kidney beans, canned · 2023" } },
  lemon: { name: "Lemons", aisle: "Produce", buy: { kind: 'each', grams: 48, one: "lemon", many: "lemons" }, staple: false, price: { per100g: 0.8156, source: "BLS 711412 · Lemons (84 g lemon → 48 g juice) · 2026-08" } },
  lentils: { name: "Lentils", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "bag" }, staple: false, price: { per100g: 0.4316, source: "USDA ERS · Lentils, dried · 2023" } },
  mango: { name: "Mangoes", aisle: "Produce", buy: { kind: 'each', grams: 200, one: "mango", many: "mangoes" }, staple: false, price: { per100g: 0.4594, source: "USDA ERS · Mangoes, fresh · 2023" } },
  milk: { name: "Milk", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 1950, unit: "half gallon" }, staple: false, price: { per100g: 0.0953, source: "BLS FJ1101 · Milk, low-fat, per gallon · 2026-08" } },
  mint: { name: "Mint", aisle: "Produce", buy: { kind: 'pack', grams: 30, unit: "bunch" }, staple: false, price: null },
  mushrooms: { name: "Mushrooms", aisle: "Produce", buy: { kind: 'pack', grams: 227, unit: "pack" }, staple: false, price: { per100g: 0.8832, source: "USDA ERS · Mushrooms, sliced, fresh · 2023" } },
  oats: { name: "Rolled oats", aisle: "Pantry", buy: { kind: 'pack', grams: 510, unit: "canister" }, staple: false, price: null },
  olive_oil: { name: "Olive oil", aisle: "Pantry", buy: { kind: 'pack', grams: 500, unit: "bottle" }, staple: true, price: null },
  onion: { name: "Onions", aisle: "Produce", buy: { kind: 'each', grams: 150, one: "onion", many: "onions" }, staple: false, price: { per100g: 0.2342, source: "USDA ERS · Onions, fresh · 2023" } },
  orange: { name: "Oranges", aisle: "Produce", buy: { kind: 'each', grams: 131, one: "orange", many: "oranges" }, staple: false, price: { per100g: 0.5161, source: "BLS 711311 · Oranges, navel · 2026-08" } },
  // ── Added 2026-09-24 with the PO's first recipes. Priced only where the same commodity already is. ──
  bagel_thin: { name: "Bagel thins", aisle: "Pantry", buy: { kind: 'pack', grams: 368, unit: "pack of 8" }, staple: false, price: null },
  cheddar_slice: { name: "Sliced cheddar", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 227, unit: "pack" }, staple: false, price: { per100g: 1.319, source: "BLS 710212 · Cheddar cheese · 2026-08" } },
  cottage_cheese_nonfat: { name: "Fat-free cottage cheese", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 454, unit: "tub" }, staple: false, price: null },
  egg_white: { name: "Liquid egg whites", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 454, unit: "carton" }, staple: false, price: null },
  garlic_powder: { name: "Garlic powder", aisle: "Spices", buy: { kind: 'pack', grams: 88, unit: "jar" }, staple: true, price: null },
  onion_powder: { name: "Onion powder", aisle: "Spices", buy: { kind: 'pack', grams: 74, unit: "jar" }, staple: true, price: null },
  turkey_bacon: { name: "Turkey bacon", aisle: "Meat & Fish", buy: { kind: 'pack', grams: 340, unit: "pack" }, staple: false, price: null },
  italian_herbs: { name: "Italian seasoning", aisle: "Spices", buy: { kind: 'pack', grams: 20, unit: "jar" }, staple: true, price: null },
  parsley_dried: { name: "Dried parsley", aisle: "Spices", buy: { kind: 'pack', grams: 10, unit: "jar" }, staple: true, price: null },
  parsley: { name: "Fresh parsley", aisle: "Produce", buy: { kind: 'pack', grams: 60, unit: "bunch" }, staple: false, price: null },
  chili_flakes: { name: "Chilli flakes", aisle: "Spices", buy: { kind: 'pack', grams: 40, unit: "jar" }, staple: true, price: null },
  skim_milk: { name: "Skim milk", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 980, unit: "quart" }, staple: false, price: null },
  light_cream_cheese: { name: "Light cream cheese", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 227, unit: "tub" }, staple: false, price: null },
  light_butter: { name: "Light butter", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 227, unit: "tub" }, staple: false, price: null },
  sundried_tomatoes: { name: "Sun-dried tomatoes in oil", aisle: "Pantry", buy: { kind: 'pack', grams: 240, unit: "jar" }, staple: false, price: null },
  ground_beef_95: { name: "Extra-lean ground beef (95%)", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: null },
  tomato_paste: { name: "Tomato paste", aisle: "Pantry", buy: { kind: 'pack', grams: 170, unit: "can" }, staple: false, price: null },
  bbq_sauce: { name: "Barbecue sauce", aisle: "Pantry", buy: { kind: 'pack', grams: 510, unit: "bottle" }, staple: false, price: null },
  balsamic: { name: "Balsamic vinegar", aisle: "Pantry", buy: { kind: 'pack', grams: 255, unit: "bottle" }, staple: true, price: null },
  brown_sugar: { name: "Brown sugar", aisle: "Pantry", buy: { kind: 'pack', grams: 907, unit: "bag" }, staple: true, price: null },
  burger_bun: { name: "Brioche burger buns", aisle: "Pantry", buy: { kind: 'pack', grams: 360, unit: "pack of 6" }, staple: false, price: null },
  american_cheese_light: { name: "Reduced-fat American slices", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 340, unit: "pack" }, staple: false, price: null },
  mozzarella_light: { name: "Part-skim mozzarella", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 227, unit: "bag" }, staple: false, price: null },
  oregano: { name: "Dried oregano", aisle: "Spices", buy: { kind: 'pack', grams: 20, unit: "jar" }, staple: true, price: null },
  paprika: { name: "Smoked paprika", aisle: "Spices", buy: { kind: 'pack', grams: 60, unit: "jar" }, staple: true, price: null },
  parmesan: { name: "Parmesan", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 142, unit: "wedge" }, staple: false, price: null },
  pasta: { name: "Orzo", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "box" }, staple: false, price: { per100g: 0.3029, source: "BLS 701322 · Spaghetti and macaroni · 2026-08" } },
  peach: { name: "Peaches", aisle: "Produce", buy: { kind: 'each', grams: 150, one: "peach", many: "peaches" }, staple: false, price: { per100g: 0.5417, source: "USDA ERS · Peaches, fresh · 2023" } },
  peanut_butter: { name: "Peanut butter", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "jar" }, staple: false, price: null },
  peanuts: { name: "Peanuts", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "jar" }, staple: false, price: null },
  pepper: { name: "Black pepper", aisle: "Spices", buy: { kind: 'pack', grams: 57, unit: "jar" }, staple: true, price: null },
  pita: { name: "Pita", aisle: "Pantry", buy: { kind: 'pack', grams: 360, unit: "pack of 6" }, staple: false, price: null },
  pork: { name: "Pork tenderloin", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: null },
  potato: { name: "Potatoes", aisle: "Produce", buy: { kind: 'lb' }, staple: false, price: { per100g: 0.2152, source: "BLS 712112 · Potatoes, white · 2026-08" } },
  quinoa: { name: "Quinoa", aisle: "Pantry", buy: { kind: 'pack', grams: 340, unit: "bag" }, staple: false, price: null },
  raisins: { name: "Raisins", aisle: "Pantry", buy: { kind: 'pack', grams: 340, unit: "box" }, staple: false, price: { per100g: 0.9542, source: "USDA ERS · Grapes (raisins), dried · 2023" } },
  red_pepper: { name: "Red bell peppers", aisle: "Produce", buy: { kind: 'each', grams: 150, one: "bell pepper", many: "bell peppers" }, staple: false, price: { per100g: 0.3759, source: "USDA ERS · Red peppers, fresh · 2023" } },
  rice_cakes: { name: "Rice cakes", aisle: "Pantry", buy: { kind: 'pack', grams: 130, unit: "pack" }, staple: false, price: null },
  rice_milk: { name: "Rice milk", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 1890, unit: "carton" }, staple: false, price: null },
  salmon: { name: "Salmon fillets", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: null },
  salsa: { name: "Salsa", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "jar" }, staple: false, price: null },
  salt: { name: "Salt", aisle: "Spices", buy: { kind: 'pack', grams: 737, unit: "canister" }, staple: true, price: null },
  sesame_seeds: { name: "Sesame seeds", aisle: "Spices", buy: { kind: 'pack', grams: 70, unit: "jar" }, staple: false, price: null },
  shrimp: { name: "Shrimp, peeled", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: null },
  sirloin: { name: "Sirloin steak", aisle: "Meat & Fish", buy: { kind: 'lb' }, staple: false, price: { per100g: 3.1651, source: "BLS 703613 · Sirloin steak, boneless · 2026-08" } },
  smoked_salmon: { name: "Smoked salmon", aisle: "Meat & Fish", buy: { kind: 'pack', grams: 113, unit: "pack" }, staple: false, price: null },
  sour_cream: { name: "Sour cream", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 454, unit: "tub" }, staple: false, price: null },
  soy_sauce: { name: "Soy sauce", aisle: "Pantry", buy: { kind: 'pack', grams: 296, unit: "bottle" }, staple: true, price: null },
  spaghetti: { name: "Spaghetti", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "box" }, staple: false, price: { per100g: 0.3029, source: "BLS 701322 · Spaghetti and macaroni · 2026-08" } },
  spinach: { name: "Baby spinach", aisle: "Produce", buy: { kind: 'pack', grams: 142, unit: "bag" }, staple: false, price: { per100g: 0.9922, source: "USDA ERS · Spinach, eaten raw, fresh · 2023" } },
  strawberries: { name: "Strawberries", aisle: "Produce", buy: { kind: 'pack', grams: 454, unit: "pack" }, staple: false, price: { per100g: 0.6787, source: "USDA ERS · Strawberries, fresh · 2023" } },
  sweet_potato: { name: "Sweet potatoes", aisle: "Produce", buy: { kind: 'each', grams: 250, one: "sweet potato", many: "sweet potatoes" }, staple: false, price: { per100g: 0.2568, source: "USDA ERS · Sweet potatoes, fresh · 2023" } },
  tahini: { name: "Tahini", aisle: "Pantry", buy: { kind: 'pack', grams: 454, unit: "jar" }, staple: false, price: null },
  teriyaki: { name: "Teriyaki sauce", aisle: "Pantry", buy: { kind: 'pack', grams: 296, unit: "bottle" }, staple: false, price: null },
  tofu: { name: "Firm tofu", aisle: "Produce", buy: { kind: 'pack', grams: 396, unit: "block" }, staple: false, price: null },
  tomato: { name: "Tomatoes", aisle: "Produce", buy: { kind: 'each', grams: 120, one: "tomato", many: "tomatoes" }, staple: false, price: { per100g: 0.4358, source: "BLS 712311 · Tomatoes, field grown · 2026-08" } },
  tuna: { name: "Canned tuna", aisle: "Pantry", buy: { kind: 'pack', grams: 113, unit: "can" }, staple: false, price: null },
  turkey_sausage: { name: "Turkey sausage", aisle: "Meat & Fish", buy: { kind: 'pack', grams: 454, unit: "pack" }, staple: false, price: null },
  veg_broth: { name: "Vegetable broth", aisle: "Pantry", buy: { kind: 'pack', grams: 926, unit: "carton" }, staple: false, price: null },
  vinegar: { name: "Cider vinegar", aisle: "Pantry", buy: { kind: 'pack', grams: 473, unit: "bottle" }, staple: true, price: null },
  wheat_noodles: { name: "Wheat noodles", aisle: "Pantry", buy: { kind: 'pack', grams: 340, unit: "pack" }, staple: false, price: null },
  whey: { name: "Whey protein powder", aisle: "Pantry", buy: { kind: 'pack', grams: 907, unit: "tub" }, staple: false, price: null },
  white_beans: { name: "White beans", aisle: "Pantry", buy: { kind: 'pack', grams: 250, unit: "can" }, staple: false, price: { per100g: 0.4289, source: "USDA ERS · Great northern beans, canned · 2023" } },
  white_rice: { name: "Long-grain white rice", aisle: "Pantry", buy: { kind: 'pack', grams: 907, unit: "bag" }, staple: false, price: { per100g: 0.2449, source: "BLS 701312 · Rice, white, long grain · 2026-08" } },
  wholewheat_bread: { name: "Whole-wheat bread", aisle: "Pantry", buy: { kind: 'pack', grams: 680, unit: "loaf" }, staple: false, price: { per100g: 0.6204, source: "BLS 702212 · Bread, whole wheat · 2026-05" } },
  yogurt: { name: "Plain yogurt", aisle: "Dairy & Eggs", buy: { kind: 'pack', grams: 907, unit: "tub" }, staple: false, price: { per100g: 0.6984, source: "BLS FJ4101 · Yogurt, per 8 oz · 2026-08" } },
};
