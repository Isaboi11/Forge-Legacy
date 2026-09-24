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

**Specific products.** When a recipe needs one (a low-carb wrap, a brioche bun), its numbers come from
USDA's brand-name database: real US label data, still USDA, and brands are never shown in the app.
Where even that has no match, a stand-in is named in the recipe's notes.

| # | Recipe | Meal | Serves | Per serving | Allergens | Review |
|---|---|---|---|---|---|---|
| p01 | Egg and turkey bacon breakfast bagels | Breakfast | 8 | 375 cal · 37 P · 23 C · 20 F | Dairy · Eggs · Gluten · Soy · Sesame | ⬜ |
| p02 | Chicken Alfredo sheet-pan rice | Lunch or dinner | 8 | 653 cal · 53 P · 57 C · 23 F | Dairy | ⬜ |
| p03 | Honey barbecue beef sliders | Lunch or dinner | 6 | 560 cal · 48 P · 41 C · 22 F | Dairy · Eggs · Gluten | ⬜ |
| p04 | Crispy sheet-pan beef tacos (2 tacos) | Lunch or dinner | 7½ | 606 cal · 57 P · 48 C · 29 F | Dairy · Eggs · Gluten | ⬜ |
| p05 | Stuffed s'mores protein cookies | Snack | 6 | 215 cal · 14 P · 20 C · 9 F | Peanuts · Dairy · Eggs · Gluten · Soy | ⬜ |
| p06 | Crispy pepperoni pizza chicken burritos | Lunch or dinner | 10 | 595 cal · 73 P · 42 C · 27 F | Dairy · Gluten | ⬜ |

---

## p01 · Egg and turkey bacon breakfast bagels
**Poster said:** 470 cal · 40 P. **Ours:** 375 cal · 37 P. Ours is lighter mainly from turkey bacon vs
the poster's beef bacon.
- **Real product:** a low-carb bagel from USDA's brand database (46 g, 80 cal). Its label lists soy and
  sesame, so the recipe is tagged for both.
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
**Poster said:** 513 cal · 47 P. **Ours:** 560 cal · 48 P.
- **Real products:** a reduced-calorie barbecue sauce and a 57 g brioche bun, from USDA's brand database.
  This brioche's label lists egg and wheat but no milk.
- Garlic butter left out; it's optional in the source.
- Keeps 2 days. Reheats OK.
- **Batch (6):** 800 g 95% lean beef · 30 g tomato paste · 60 g barbecue sauce · 2 tsp honey · spices ·
  1 red onion + balsamic + 1 tsp brown sugar · 6 brioche buns · 6 reduced-fat American slices ·
  250 g part-skim mozzarella.


## p04 · Crispy sheet-pan beef tacos
**Poster said:** 294 cal a taco (588 for two). **Ours:** 606 for two. Close.
- **Real product:** a low-carb mini wrap from USDA's brand database (28 g, 45 cal).
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
**Poster said:** 517 cal · 65 P. **Ours:** 595 cal · 73 P.
- **Real product:** the large low-carb tortilla the source names, from USDA's brand database (71 g, 110 cal).
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
