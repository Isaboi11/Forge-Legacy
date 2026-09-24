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
| p04 | Crispy sheet-pan beef tacos (2 tacos) | Lunch or dinner | 7½ | 699 cal · 53 P · 54 C · 30 F | Dairy · Eggs · Gluten | ⬜ |
| p05 | Stuffed s'mores protein cookies | Snack | 6 | 215 cal · 14 P · 20 C · 9 F | Peanuts · Dairy · Eggs · Gluten · Soy | ⬜ |
| p06 | Crispy pepperoni pizza chicken burritos | Lunch or dinner | 10 | 705 cal · 69 P · 45 C · 26 F | Dairy · Gluten | ⬜ |

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


## p04 · Crispy sheet-pan beef tacos
**Poster said:** 294 cal a taco (588 for two). **Ours:** 699 for two tacos. The gap is the wrap. USDA
has no low-carb one, so a flour tortilla's numbers stand in at a mini wrap's 30 g. The light mayo in the
sauce is richer than theirs too.
- **One serving = 2 tacos.** The source makes 15, so the batch is divided by 7½.
- Keeps 3 days (sauce separate). Reheats OK: oven or air fryer.
- **Batch (15 tacos):** 1200 g 95% lean beef · 200 g tomato paste · 200 g onion · 200 g bell pepper ·
  15 mini wraps · 320 g mozzarella · sauce: 300 g yogurt, 120 g light mayo, 100 g hot sauce, 50 g honey · spices.

## p05 · Stuffed s'mores protein cookies
**Poster said:** 227 cal · 12.5 P. **Ours:** 215 cal · 14 P. Close.
- **Stand-in:** casein powder counted as whey (USDA has no casein powder).
- Marshmallow creme is made with egg white, so it's tagged **eggs**. It's vegetarian, not vegan.
- The chocolate is tagged dairy + soy to be safe.
- 12 dough balls sandwiched into **6 cookies**; 1 cookie = 1 serving. Keeps 4 days.

## p06 · Crispy pepperoni pizza chicken burritos
**Poster said:** 517 cal · 65 P. **Ours:** 705 cal · 69 P. The gap is the tortilla. USDA only has
a regular 10-inch flour tortilla (about 220 cal), not a low-carb one (about 70–110).
- **Turkey pepperoni** used. The source allows beef, turkey or regular, and turkey is the lean choice.
- Hot sauce kept in (optional in the source).
- Keeps 4 days, freezes 2 months. Reheats great.
- **Batch (10):** 1.7 kg chicken breast · 200 g turkey pepperoni + 4 slices outside each · 350 g pizza
  sauce · 80 g parmesan · 5 garlic cloves · 200 g light cream cheese · 100 ml hot sauce ·
  10 large tortillas · 25 g mozzarella inside + 20 g reduced-fat cheddar outside each.

---

**Adding more:** send recipes in chat. Each one gets the same treatment, plus a row above.
A test (`recipe-book.test.mjs`) fails if a recipe names an unknown ingredient or its calories disagree
with its macros.
