# Forge Recipe Book — review list

The recipes the app ships (`src/domain/nutrition/recipes-data.ts`). The planner, Recipe screen and
Grocery List all read from there. **This page is for the PO's review:** check each recipe's numbers,
tags and steps, then mark it ✅.

**How the numbers are made.** Every ingredient's per-100 g figure is copied from USDA FoodData Central
(SR Legacy 2018-04) by its `fdcId`. A recipe's per-serving numbers are the app's own calculation from
those. Nobody types a macro by hand. Allergy tags come from the ingredients, so they cannot drift.

**Where the recipes come from.** Each one started from a recipe the PO found online. Ingredients and
method are facts and free to use. The poster's name for the dish, wording, product brands and macro
counts are theirs, so Forge renames the dish, rewrites the steps, uses plain ingredients, and computes
its own numbers. Brands are never named.

**Why our numbers differ from the poster's.** Theirs use specific products (beef bacon, low-carb
bagels, reduced-calorie sauce, local "light" cheeses) that USDA's generic data doesn't have. Ours
describe the plain version you'd buy in a US store. Stand-ins are listed per recipe.

| # | Recipe | Meal | Serves | Per serving | Allergens | Review |
|---|---|---|---|---|---|---|
| p01 | Egg and turkey bacon breakfast bagels | Breakfast | 8 | 410 cal · 32 P · 28 C · 18 F | Dairy · Eggs · Gluten | ⬜ |
| p02 | Chicken Alfredo sheet-pan rice | Lunch or dinner | 8 | 653 cal · 53 P · 57 C · 23 F | Dairy | ⬜ |
| p03 | Honey barbecue beef sliders | Lunch or dinner | 6 | 578 cal · 49 P · 47 C · 21 F | Dairy · Eggs · Gluten | ⬜ |

---

## p01 · Egg and turkey bacon breakfast bagels
**Poster said:** 470 cal · 40 P. **Ours:** 410 cal · 32 P. The gap is beef bacon (the poster's pick)
vs turkey bacon, and a high-protein low-carb bagel vs a plain bagel thin.
- **Stand-in:** bagel thin = USDA wheat bagel at a thin's 46 g (USDA has no bagel thin).
- Keeps 4 days in the fridge, 2 months frozen. Reheats OK.
- **Batch (8):** 16 slices turkey bacon · 8 eggs · 500 g egg whites · 300 g fat-free cottage cheese ·
  5 g parmesan · 1 tsp each onion + garlic powder · 8 bagel thins · 8 slices cheddar.

## p02 · Chicken Alfredo sheet-pan rice
**Poster said:** 573 cal · 51 P. **Ours:** 653 cal · 53 P. Most of the gap is sun-dried tomatoes
packed in oil, and USDA's "low fat" cream cheese being richer than a UK/AU "light" one.
- **Stand-in:** Italian herbs = dried oregano (USDA has no blend).
- Sodium is high (4 tsp salt across 8 servings, as the source has it). Worth cutting to 2–3 tsp?
- Keeps 3 days. Reheats great, so it can feed a later lunch.
- **Batch (8):** 1400 g chicken breast · 350 g dry basmati · 450 g skim milk · 110 g parmesan ·
  190 g light cream cheese · 25 g light butter · 40 g garlic · 90 g white + 200 g red onion ·
  200 g sun-dried tomatoes · 40 g olive oil · handful of parsley · spices.

## p03 · Honey barbecue beef sliders
**Poster said:** 513 cal · 47 P. **Ours:** 578 cal · 49 P. The gap is USDA's regular barbecue sauce
(no reduced-calorie version in the data) and a 60 g brioche bun.
- **Stand-in:** brioche bun = USDA plain hamburger roll at 60 g, tagged eggs + dairy because brioche has both.
- Garlic butter left out; it's optional in the source.
- Keeps 2 days. Reheats OK.
- **Batch (6):** 800 g 95% lean beef · 30 g tomato paste · 60 g barbecue sauce · 2 tsp honey · spices ·
  1 red onion + balsamic + 1 tsp brown sugar · 6 brioche buns · 6 reduced-fat American slices ·
  250 g part-skim mozzarella.

---

**Adding more:** send recipes in chat. Each one gets the same treatment, plus a row above.
A test (`recipe-book.test.mjs`) fails if a recipe names an unknown ingredient or its calories disagree
with its macros.
