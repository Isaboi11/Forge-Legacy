# Starter recipes (removed 2026-09-24): review copy

The 40 recipes Forge shipped on 2026-09-23 and took out of the app on 2026-09-24, when you said to get rid of them
and replace them with your own. They still exist as test data (`src/domain/nutrition/__tests__/fixtures/starter-recipes.ts`);
nothing in the app uses them.

**Numbers are the app's own:** USDA values from the ingredient table, per ONE serving, rounded. Written by Forge,
not copied from any site.

Mark each one ✅ keep · ✏️ change · ❌ drop, and I'll put the keepers back in (as Forge recipes or in your book).

## At a glance

| # | Recipe | Meal | Time | Per serving | Allergens | Keep? |
|---|---|---|---|---|---|---|
| b01 | Greek yogurt bowl with granola and berries | Breakfast | 5 min | 583 cal · 40 P · 72 C · 16 F | Tree nuts · Dairy · Gluten | ⬜ |
| b02 | Steak and egg hash | Breakfast | 25 min | 582 cal · 46 P · 41 C · 26 F | Eggs | ⬜ |
| b03 | Peanut butter overnight oats | Breakfast | 5 min | 699 cal · 19 P · 107 C · 24 F | Peanuts · Gluten | ⬜ |
| b04 | Smoked salmon bagel | Breakfast | 10 min | 521 cal · 29 P · 58 C · 19 F | Dairy · Gluten · Fish · Sesame | ⬜ |
| b05 | Tofu scramble with black beans | Breakfast | 15 min | 617 cal · 48 P · 51 C · 29 F | Gluten · Soy | ⬜ |
| b06 | Protein pancakes with banana | Breakfast | 20 min | 632 cal · 46 P · 78 C · 16 F | Dairy · Eggs · Gluten | ⬜ |
| b07 | Turkey sausage breakfast burrito | Breakfast | 20 min | 634 cal · 44 P · 39 C · 33 F | Dairy · Eggs · Gluten | ⬜ |
| b08 | Shakshuka with feta and toast | Breakfast | 25 min | 635 cal · 35 P · 45 C · 36 F | Dairy · Eggs · Gluten | ⬜ |
| b09 | Cottage cheese and almond toast | Breakfast | 5 min | 523 cal · 37 P · 59 C · 18 F | Tree nuts · Dairy · Gluten | ⬜ |
| b10 | Chia pudding with mango | Breakfast or Snack | 5 min | 577 cal · 11 P · 54 C · 40 F | None | ⬜ |
| l01 | Chicken shawarma rice bowl | Lunch or Dinner | 30 min | 821 cal · 61 P · 81 C · 28 F | Sesame | ⬜ |
| l02 | Tuna, white bean and rocket salad | Lunch | 10 min | 554 cal · 44 P · 48 C · 22 F | Fish | ⬜ |
| l03 | Turkey and avocado wrap | Lunch | 10 min | 648 cal · 34 P · 56 C · 33 F | Dairy · Gluten | ⬜ |
| l04 | Lentil and roasted vegetable soup | Lunch or Dinner | 40 min | 802 cal · 37 P · 128 C · 19 F | Gluten | ⬜ |
| l05 | Chickpea and quinoa power bowl | Lunch or Dinner | 20 min | 704 cal · 27 P · 89 C · 30 F | Sesame | ⬜ |
| l06 | Halloumi grain salad | Lunch | 20 min | 694 cal · 30 P · 64 C · 38 F | Dairy · Gluten | ⬜ |
| l07 | Prawn noodle stir-fry | Lunch or Dinner | 20 min | 682 cal · 50 P · 77 C · 20 F | Gluten · Soy · Shellfish · Sesame | ⬜ |
| l08 | Beef burrito bowl | Lunch or Dinner | 25 min | 830 cal · 57 P · 82 C · 29 F | Dairy | ⬜ |
| l09 | Egg fried rice with edamame | Lunch or Dinner | 15 min | 774 cal · 33 P · 91 C · 30 F | Eggs · Gluten · Soy | ⬜ |
| l10 | Mediterranean chicken pita | Lunch | 15 min | 643 cal · 57 P · 60 C · 19 F | Dairy · Gluten | ⬜ |
| d01 | Salmon, sweet potato and greens | Dinner | 30 min | 732 cal · 45 P · 61 C · 35 F | Fish | ⬜ |
| d02 | Beef chilli with rice | Dinner | 45 min | 911 cal · 52 P · 115 C · 28 F | None | ⬜ |
| d03 | Chicken thigh tray bake | Dinner | 40 min | 722 cal · 54 P · 71 C · 26 F | None | ⬜ |
| d04 | Turkey bolognese | Dinner | 35 min | 819 cal · 57 P · 92 C · 26 F | Gluten | ⬜ |
| d05 | Chickpea and spinach curry | Dinner or Lunch | 30 min | 873 cal · 28 P · 133 C · 29 F | None | ⬜ |
| d06 | Steak, potatoes and green beans | Dinner | 30 min | 758 cal · 57 P · 64 C · 31 F | Dairy | ⬜ |
| d07 | Cod with lemon orzo | Dinner | 25 min | 762 cal · 60 P · 75 C · 24 F | Dairy · Gluten · Fish | ⬜ |
| d08 | Black bean tacos | Dinner | 20 min | 839 cal · 36 P · 108 C · 31 F | Dairy · Gluten | ⬜ |
| d09 | Teriyaki tofu and broccoli rice | Dinner or Lunch | 25 min | 848 cal · 52 P · 92 C · 34 F | Gluten · Soy · Sesame | ⬜ |
| d10 | Pork tenderloin, rice and slaw | Dinner | 35 min | 779 cal · 61 P · 82 C · 22 F | None | ⬜ |
| d11 | Mushroom and barley risotto | Dinner | 45 min | 757 cal · 26 P · 95 C · 34 F | Dairy · Gluten | ⬜ |
| d12 | Chicken fajitas | Dinner | 25 min | 870 cal · 71 P · 70 C · 34 F | Dairy · Gluten | ⬜ |
| s01 | Apple and peanut butter | Snack | 3 min | 285 cal · 8 P · 32 C · 17 F | Peanuts | ⬜ |
| s02 | Protein shake with banana | Snack | 3 min | 315 cal · 32 P · 36 C · 6 F | Dairy | ⬜ |
| s03 | Hummus and pitta | Snack | 3 min | 316 cal · 11 P · 45 C · 11 F | Gluten · Sesame | ⬜ |
| s04 | Trail mix | Snack | 1 min | 322 cal · 11 P · 26 C · 22 F | Peanuts · Tree nuts | ⬜ |
| s05 | Boiled eggs and fruit | Snack | 12 min | 259 cal · 14 P · 28 C · 11 F | Eggs | ⬜ |
| s06 | Edamame with sea salt | Snack | 5 min | 218 cal · 21 P · 16 C · 9 F | Soy | ⬜ |
| s07 | Rice cakes with cottage cheese | Snack | 3 min | 226 cal · 18 P · 29 C · 4 F | Dairy | ⬜ |
| s08 | Beef jerky and an orange | Snack | 1 min | 230 cal · 15 P · 21 C · 10 F | Gluten · Soy | ⬜ |

---

# Breakfast (10)

## b01 · Greek yogurt bowl with granola and berries

**Breakfast** · 5 min · **583 cal · 40 g protein · 72 g carbs · 16 g fat** per serving · Allergens: Tree nuts · Dairy · Gluten

**Ingredients** (grams as the app counts them)

- Greek yogurt, plain nonfat: 300 g
- Granola: 60 g
- Blueberries: 75 g
- Strawberries, halved: 75 g
- Honey: 15 g

**Steps**

1. **Build the bowl.** Spoon the yogurt into a bowl.
2. **Top it.** Scatter over the granola and berries, then drizzle with the honey.

## b02 · Steak and egg hash

**Breakfast** · 25 min · **582 cal · 46 g protein · 41 g carbs · 26 g fat** per serving · Allergens: Eggs

**Ingredients** (grams as the app counts them)

- Sirloin steak, trimmed: 130 g
- Eggs: 100 g
- Potatoes: 200 g
- Red bell pepper: 75 g
- Olive oil: 10 g
- Salt: 1 g
- Black pepper: 0.5 g

**Steps**

1. **Crisp the potatoes.** Dice the potatoes small. Heat the oil in a large pan over medium-high heat and cook the potatoes, turning now and then, until golden and tender. (12 min)
2. **Add the pepper.** Stir in the diced pepper and cook until it softens. (3 min)
3. **Cook the steak.** Push everything to the side. Season the steak with salt and pepper and sear it in the pan, 2–3 minutes a side for medium. Rest it, then slice. (6 min)
4. **Fry the eggs.** Crack the eggs into the pan and cook until the whites are fully set. (3 min)
5. **Serve.** Pile the hash on a plate with the sliced steak and eggs on top.

## b03 · Peanut butter overnight oats

**Breakfast** · 5 min · keeps 2 days · **699 cal · 19 g protein · 107 g carbs · 24 g fat** per serving · Allergens: Peanuts · Gluten

**Ingredients** (grams as the app counts them)

- Rolled oats: 80 g
- Peanut butter, smooth: 32 g
- Banana: 100 g
- Rice milk, unsweetened: 240 g
- Ground cinnamon: 1 g

**Steps**

1. **Mix.** Stir the oats, rice milk, peanut butter and cinnamon together in a jar or container.
2. **Chill overnight.** Cover and refrigerate for at least 6 hours.
3. **Serve.** Slice the banana over the top. Eat cold.

## b04 · Smoked salmon bagel

**Breakfast** · 10 min · **521 cal · 29 g protein · 58 g carbs · 19 g fat** per serving · Allergens: Dairy · Gluten · Fish · Sesame

**Ingredients** (grams as the app counts them)

- Plain bagel: 105 g
- Smoked salmon: 85 g
- Cream cheese: 40 g
- Capers, drained: 10 g
- Lemon juice: 5 g
- Black pepper: 0.3 g

**Steps**

1. **Toast.** Split and toast the bagel. (3 min)
2. **Spread.** Spread both halves with the cream cheese.
3. **Top and serve.** Lay over the smoked salmon, scatter the capers, add a squeeze of lemon and a grind of pepper.

## b05 · Tofu scramble with black beans

**Breakfast** · 15 min · keeps 1 day · **617 cal · 48 g protein · 51 g carbs · 29 g fat** per serving · Allergens: Gluten · Soy

**Ingredients** (grams as the app counts them)

- Firm tofu: 200 g
- Black beans, canned, drained: 120 g
- Baby spinach: 60 g
- Flour tortilla (10-inch): 45 g
- Olive oil: 7 g
- Cumin: 1 g
- Smoked paprika: 1 g
- Salt: 1 g

**Steps**

1. **Crumble the tofu.** Pat the tofu dry and crumble it with your hands.
2. **Cook.** Heat the oil in a pan over medium heat. Add the tofu, cumin, paprika and salt and cook, stirring, until lightly golden. (6 min)
3. **Add beans and spinach.** Stir in the beans and spinach and cook until the beans are hot and the spinach wilts. (3 min)
4. **Serve.** Warm the tortilla in a dry pan and serve with the scramble. (1 min)

## b06 · Protein pancakes with banana

**Breakfast** · 20 min · keeps 1 day · **632 cal · 46 g protein · 78 g carbs · 16 g fat** per serving · Allergens: Dairy · Eggs · Gluten

**Ingredients** (grams as the app counts them)

- All-purpose flour: 50 g
- Eggs: 100 g
- Whey protein powder: 30 g
- Milk, 2%: 120 g
- Banana: 100 g
- Honey: 10 g
- Butter: 3 g

**Steps**

1. **Make the batter.** Whisk the flour, protein powder, eggs and milk until smooth. Rest for 2 minutes. (3 min)
2. **Cook the pancakes.** Melt a little butter in a non-stick pan over medium heat. Pour in small rounds of batter and cook until bubbles form, then flip and cook until set. (10 min)
3. **Serve.** Stack the pancakes, top with sliced banana and drizzle with honey.

## b07 · Turkey sausage breakfast burrito

**Breakfast** · 20 min · keeps 2 days · **634 cal · 44 g protein · 39 g carbs · 33 g fat** per serving · Allergens: Dairy · Eggs · Gluten

**Ingredients** (grams as the app counts them)

- Turkey sausage: 100 g
- Eggs: 100 g
- Cheddar, shredded: 28 g
- Flour tortilla (10-inch): 70 g
- Salsa: 30 g

**Steps**

1. **Cook the sausage.** Remove the sausage from its casing and cook in a pan over medium-high heat, breaking it up, until browned and cooked through (165°F / 74°C). (8 min)
2. **Scramble the eggs.** Lower the heat, add the beaten eggs and stir gently until just set. (3 min)
3. **Fill and roll.** Warm the tortilla. Fill with the sausage and eggs, top with the cheese and salsa, and roll up tightly. (2 min)
4. **Toast.** Toast the burrito seam-side down in the pan until golden. (2 min)

## b08 · Shakshuka with feta and toast

**Breakfast** · 25 min · **635 cal · 35 g protein · 45 g carbs · 36 g fat** per serving · Allergens: Dairy · Eggs · Gluten

**Ingredients** (grams as the app counts them)

- Eggs: 150 g
- Canned tomatoes: 250 g
- Feta, crumbled: 40 g
- Whole-wheat bread: 60 g
- Olive oil: 10 g
- Onion: 60 g
- Garlic: 3 g
- Cumin: 1 g
- Smoked paprika: 1 g
- Salt: 1 g

**Steps**

1. **Soften the onion.** Heat the oil in a small pan over medium heat. Cook the diced onion until soft. (5 min)
2. **Build the sauce.** Add the garlic, cumin and paprika for 30 seconds, then the tomatoes and salt. Simmer until slightly thickened. (8 min)
3. **Cook the eggs.** Make small wells and crack in the eggs. Cover and cook until the whites are fully set. (7 min)
4. **Serve.** Crumble over the feta and serve with toast.

## b09 · Cottage cheese and almond toast

**Breakfast** · 5 min · **523 cal · 37 g protein · 59 g carbs · 18 g fat** per serving · Allergens: Tree nuts · Dairy · Gluten

**Ingredients** (grams as the app counts them)

- Cottage cheese, 2%: 225 g
- Almonds: 20 g
- Whole-wheat bread: 60 g
- Peach: 150 g
- Honey: 5 g

**Steps**

1. **Toast.** Toast the bread. (3 min)
2. **Top.** Spread the cottage cheese over the toast.
3. **Finish.** Top with the sliced peach and chopped almonds, and drizzle with the honey.

## b10 · Chia pudding with mango

**Breakfast or Snack** · 5 min · keeps 3 days · **577 cal · 11 g protein · 54 g carbs · 40 g fat** per serving · Allergens: None

**Ingredients** (grams as the app counts them)

- Chia seeds: 40 g
- Coconut milk, canned: 120 g
- Rice milk, unsweetened: 120 g
- Mango, diced: 150 g

**Steps**

1. **Mix.** Stir the chia seeds, coconut milk and rice milk together. Wait 5 minutes and stir again to break up clumps.
2. **Chill.** Cover and refrigerate for at least 4 hours, or overnight.
3. **Serve.** Top with the diced mango.

---

# Lunch (10)

## l01 · Chicken shawarma rice bowl

**Lunch or Dinner** · 30 min · keeps 2 days · **821 cal · 61 g protein · 81 g carbs · 28 g fat** per serving · Allergens: Sesame

**Ingredients** (grams as the app counts them)

- Chicken breast, boneless skinless: 220 g
- Long-grain white rice, dry: 85 g
- Tahini: 20 g
- Cucumber: 80 g
- Tomatoes, chopped: 80 g
- Olive oil: 10 g
- Lemon juice: 10 g
- Cumin: 1 g
- Smoked paprika: 1 g
- Garlic: 3 g
- Salt: 1 g

**Steps**

1. **Cook the rice.** Rinse the rice and simmer, covered, in twice its volume of water until tender. Rest for 5 minutes. (18 min)
2. **Season the chicken.** Slice the chicken into strips and toss with the oil, cumin, paprika, grated garlic and salt.
3. **Cook the chicken.** Cook in a hot pan, turning, until browned and cooked through (165°F / 74°C). (8 min)
4. **Make the sauce.** Stir the tahini with the lemon juice and a splash of water until pourable.
5. **Build the bowl.** Serve the chicken over the rice with the diced cucumber and tomato, and drizzle with the sauce.

## l02 · Tuna, white bean and rocket salad

**Lunch** · 10 min · keeps 1 day · **554 cal · 44 g protein · 48 g carbs · 22 g fat** per serving · Allergens: Fish

**Ingredients** (grams as the app counts them)

- Tuna in water, drained: 140 g
- White beans, canned, drained: 200 g
- Rocket (arugula): 40 g
- Lemon juice: 15 g
- Olive oil: 20 g
- Tomatoes, chopped: 80 g
- Salt: 0.5 g
- Black pepper: 0.3 g

**Steps**

1. **Make the dressing.** Whisk the oil, lemon juice, salt and pepper in a bowl.
2. **Toss.** Add the beans, tomatoes and tuna and toss gently.
3. **Serve.** Fold in the rocket just before eating.

## l03 · Turkey and avocado wrap

**Lunch** · 10 min · **648 cal · 34 g protein · 56 g carbs · 33 g fat** per serving · Allergens: Dairy · Gluten

**Ingredients** (grams as the app counts them)

- Sliced turkey breast: 120 g
- Avocado: 75 g
- Flour tortilla (10-inch): 90 g
- Cheddar, shredded: 28 g
- Baby spinach: 30 g
- Lemon juice: 3 g

**Steps**

1. **Mash the avocado.** Mash the avocado with the lemon juice.
2. **Fill.** Spread the avocado over the tortilla, then layer the turkey, cheese and spinach.
3. **Roll.** Roll up tightly and cut in half.

## l04 · Lentil and roasted vegetable soup

**Lunch or Dinner** · 40 min · batch cook · keeps 4 days · **802 cal · 37 g protein · 128 g carbs · 19 g fat** per serving · Allergens: Gluten

**Ingredients** (grams as the app counts them)

- Brown or green lentils, dry: 100 g
- Carrot: 100 g
- Butternut squash, cubed: 150 g
- Onion: 80 g
- Olive oil: 15 g
- Vegetable broth: 350 g
- Whole-wheat bread: 60 g
- Garlic: 3 g
- Cumin: 1 g
- Salt: 1 g

**Steps**

1. **Roast the vegetables.** Heat the oven to 425°F (220°C). Toss the diced carrot, squash and onion with the oil and salt, and roast on a sheet pan until tender and browned. (25 min)
2. **Cook the lentils.** Meanwhile rinse the lentils and simmer them in the broth with the garlic and cumin until soft. (25 min)
3. **Combine.** Stir the roasted vegetables into the lentils. Blend a little of the soup if you like it thicker. (3 min)
4. **Serve.** Season to taste and serve with the bread.
5. **Store the leftovers.** Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through.

## l05 · Chickpea and quinoa power bowl

**Lunch or Dinner** · 20 min · keeps 3 days · **704 cal · 27 g protein · 89 g carbs · 30 g fat** per serving · Allergens: Sesame

**Ingredients** (grams as the app counts them)

- Chickpeas, canned, drained: 150 g
- Quinoa, dry: 65 g
- Kale, chopped: 60 g
- Tahini: 25 g
- Lemon juice: 15 g
- Avocado: 50 g
- Salt: 0.5 g

**Steps**

1. **Cook the quinoa.** Rinse the quinoa and simmer in twice its volume of water until the water is absorbed. (15 min)
2. **Massage the kale.** Rub the kale with a pinch of salt and half the lemon juice until it softens. (2 min)
3. **Make the dressing.** Stir the tahini with the rest of the lemon juice and a splash of water.
4. **Build the bowl.** Top the quinoa with the kale, chickpeas and sliced avocado, and drizzle with the dressing.

## l06 · Halloumi grain salad

**Lunch** · 20 min · keeps 1 day · **694 cal · 30 g protein · 64 g carbs · 38 g fat** per serving · Allergens: Dairy · Gluten

**Ingredients** (grams as the app counts them)

- Halloumi: 90 g
- Bulgur, dry: 70 g
- Tomatoes, chopped: 100 g
- Cucumber: 80 g
- Fresh mint: 5 g
- Olive oil: 15 g
- Lemon juice: 15 g

**Steps**

1. **Soak the bulgur.** Cover the bulgur with boiling water and leave, covered, until tender. Drain well. (12 min)
2. **Grill the halloumi.** Slice the halloumi and cook in a dry pan until golden on both sides. (4 min)
3. **Toss.** Mix the bulgur with the diced tomato and cucumber, chopped mint, oil and lemon juice.
4. **Serve.** Top with the halloumi.

## l07 · Prawn noodle stir-fry

**Lunch or Dinner** · 20 min · keeps 1 day · **682 cal · 50 g protein · 77 g carbs · 20 g fat** per serving · Allergens: Gluten · Soy · Shellfish · Sesame

**Ingredients** (grams as the app counts them)

- Raw prawns, peeled: 170 g
- Wheat noodles, dry: 95 g
- Soy sauce: 18 g
- Bok choy: 120 g
- Olive oil: 15 g
- Sesame seeds: 6 g
- Garlic: 3 g
- Fresh ginger, grated: 4 g

**Steps**

1. **Cook the noodles.** Boil the noodles until just tender. Drain and rinse under cold water. (4 min)
2. **Cook the prawns.** Heat the oil in a wok or large pan over high heat. Stir-fry the prawns until pink and opaque all the way through. (3 min)
3. **Add the greens.** Add the garlic, ginger and bok choy and stir-fry until the bok choy wilts. (2 min)
4. **Toss and serve.** Add the noodles and soy sauce and toss until hot. Scatter with sesame seeds. (2 min)

## l08 · Beef burrito bowl

**Lunch or Dinner** · 25 min · keeps 3 days · **830 cal · 57 g protein · 82 g carbs · 29 g fat** per serving · Allergens: Dairy

**Ingredients** (grams as the app counts them)

- Lean ground beef (90%): 185 g
- Long-grain white rice, dry: 70 g
- Black beans, canned, drained: 120 g
- Cheddar, shredded: 28 g
- Salsa: 60 g
- Chilli powder: 2 g
- Cumin: 1 g
- Salt: 1 g

**Steps**

1. **Cook the rice.** Rinse the rice and simmer, covered, in twice its volume of water until tender. (18 min)
2. **Brown the beef.** Cook the beef in a pan over medium-high heat, breaking it up, until browned with no pink left (160°F / 71°C). (7 min)
3. **Season.** Stir in the chilli powder, cumin, salt and a splash of water, and simmer until it coats the meat. (2 min)
4. **Warm the beans.** Warm the beans in a small pan or the microwave. (2 min)
5. **Build the bowl.** Layer the rice, beans and beef. Top with the cheese and salsa.

## l09 · Egg fried rice with edamame

**Lunch or Dinner** · 15 min · keeps 2 days · **774 cal · 33 g protein · 91 g carbs · 30 g fat** per serving · Allergens: Eggs · Gluten · Soy

**Ingredients** (grams as the app counts them)

- Long-grain white rice, dry: 100 g
- Eggs: 100 g
- Edamame, shelled: 100 g
- Soy sauce: 15 g
- Olive oil: 15 g
- Garlic: 3 g

**Steps**

1. **Use cold rice.** Cook the rice ahead and chill it. Fresh rice turns mushy when fried.
2. **Scramble the eggs.** Heat half the oil in a wok over high heat. Scramble the eggs until just set and set them aside. (2 min)
3. **Fry the rice.** Add the rest of the oil, the garlic and the edamame, then the rice. Stir-fry until hot and starting to crisp. (5 min)
4. **Finish.** Return the eggs, add the soy sauce and toss to combine. (1 min)

## l10 · Mediterranean chicken pita

**Lunch** · 15 min · **643 cal · 57 g protein · 60 g carbs · 19 g fat** per serving · Allergens: Dairy · Gluten

**Ingredients** (grams as the app counts them)

- Chicken breast, boneless skinless: 200 g
- Pita (6½-inch): 90 g
- Plain yogurt: 60 g
- Cucumber: 50 g
- Tomatoes, chopped: 80 g
- Olive oil: 10 g
- Dried oregano: 1 g
- Garlic: 3 g
- Lemon juice: 5 g
- Salt: 1 g

**Steps**

1. **Cook the chicken.** Slice the chicken thinly, toss with the oil, oregano and salt, and cook in a hot pan until cooked through (165°F / 74°C). (8 min)
2. **Make the tzatziki.** Grate the cucumber, squeeze out the water, and stir into the yogurt with the grated garlic and lemon juice. (3 min)
3. **Fill.** Warm the pita. Fill with the chicken, tomato and tzatziki. (1 min)

---

# Dinner (12)

## d01 · Salmon, sweet potato and greens

**Dinner** · 30 min · keeps 1 day · **732 cal · 45 g protein · 61 g carbs · 35 g fat** per serving · Allergens: Fish

**Ingredients** (grams as the app counts them)

- Salmon fillet: 180 g
- Sweet potato: 250 g
- Broccoli florets: 150 g
- Olive oil: 10 g
- Lemon juice: 10 g
- Salt: 1 g
- Black pepper: 0.3 g

**Steps**

1. **Roast the sweet potato.** Heat the oven to 425°F (220°C). Cut the sweet potato into wedges, toss with half the oil and salt, and roast on a sheet pan. (15 min)
2. **Add the salmon and broccoli.** Add the broccoli to the pan with the rest of the oil. Season the salmon and lay it on the pan.
3. **Roast.** Roast until the salmon flakes easily and reaches 145°F (63°C). (12 min)
4. **Serve.** Squeeze over the lemon.

## d02 · Beef chilli with rice

**Dinner** · 45 min · batch cook · keeps 3 days · **911 cal · 52 g protein · 115 g carbs · 28 g fat** per serving · Allergens: None

**Ingredients** (grams as the app counts them)

- Lean ground beef (90%): 160 g
- Long-grain white rice, dry: 85 g
- Kidney beans, canned, drained: 120 g
- Canned tomatoes: 200 g
- Onion: 60 g
- Red bell pepper: 60 g
- Olive oil: 8 g
- Garlic: 6 g
- Chilli powder: 4 g
- Cumin: 2 g
- Salt: 1 g

**Steps**

1. **Soften the vegetables.** Heat the oil in a large pot over medium-high heat. Add the diced onion and pepper and cook until soft. (5 min)
2. **Brown the beef.** Add the beef. Break it up and cook until no pink remains. (7 min)
3. **Toast the spices.** Stir in the garlic, chilli powder and cumin and cook until fragrant. (1 min)
4. **Simmer.** Add the tomatoes and beans. Bring to a simmer, cover, and cook on low, stirring now and then. (20 min)
5. **Cook the rice.** While the chilli simmers, rinse the rice and cook it covered in twice its volume of water. Rest for 5 minutes. (15 min)
6. **Season and serve.** Season with salt and serve the chilli over the rice.
7. **Store the leftovers.** Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through.

## d03 · Chicken thigh tray bake

**Dinner** · 40 min · batch cook · keeps 3 days · **722 cal · 54 g protein · 71 g carbs · 26 g fat** per serving · Allergens: None

**Ingredients** (grams as the app counts them)

- Chicken thighs, boneless skinless: 230 g
- Potatoes: 300 g
- Red bell pepper: 120 g
- Onion: 80 g
- Olive oil: 15 g
- Smoked paprika: 2 g
- Dried oregano: 1 g
- Garlic: 6 g
- Salt: 1 g

**Steps**

1. **Heat the oven.** Heat the oven to 425°F (220°C).
2. **Prep the tray.** Cut the potatoes into chunks and the pepper and onion into wedges. Toss with the oil, paprika, oregano, garlic and salt on a sheet pan. (5 min)
3. **Add the chicken.** Nestle the seasoned chicken thighs among the vegetables.
4. **Roast.** Roast until the potatoes are golden and the chicken reaches 165°F (74°C). (35 min)
5. **Store the leftovers.** Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through.

## d04 · Turkey bolognese

**Dinner** · 35 min · batch cook · keeps 3 days · **819 cal · 57 g protein · 92 g carbs · 26 g fat** per serving · Allergens: Gluten

**Ingredients** (grams as the app counts them)

- Ground turkey: 200 g
- Spaghetti, dry: 100 g
- Canned tomatoes: 200 g
- Mushrooms, sliced: 80 g
- Onion: 50 g
- Olive oil: 8 g
- Garlic: 6 g
- Dried oregano: 1 g
- Salt: 1 g

**Steps**

1. **Soften the onion.** Heat the oil in a large pan. Cook the diced onion and mushrooms until soft and browned. (6 min)
2. **Brown the turkey.** Add the turkey and cook, breaking it up, until no pink remains (165°F / 74°C). (7 min)
3. **Simmer the sauce.** Add the garlic, oregano, tomatoes and salt. Simmer until thick. (15 min)
4. **Cook the pasta.** Meanwhile boil the spaghetti in salted water until al dente. Drain. (10 min)
5. **Serve.** Toss the pasta with the sauce.
6. **Store the leftovers.** Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through.

## d05 · Chickpea and spinach curry

**Dinner or Lunch** · 30 min · batch cook · keeps 4 days · **873 cal · 28 g protein · 133 g carbs · 29 g fat** per serving · Allergens: None

**Ingredients** (grams as the app counts them)

- Chickpeas, canned, drained: 200 g
- Baby spinach: 100 g
- Coconut milk, canned: 100 g
- Long-grain white rice, dry: 85 g
- Onion: 60 g
- Garlic: 6 g
- Fresh ginger, grated: 4 g
- Curry powder: 4 g
- Canned tomatoes: 100 g
- Salt: 1 g

**Steps**

1. **Cook the rice.** Rinse the rice and simmer, covered, in twice its volume of water until tender. (18 min)
2. **Build the base.** In a large pan, cook the diced onion in a splash of water until soft. Add the garlic, ginger and curry powder for 1 minute. (6 min)
3. **Simmer.** Add the chickpeas, tomatoes and coconut milk. Simmer until slightly thickened. (12 min)
4. **Wilt the spinach.** Stir in the spinach until it wilts. Season with salt. (2 min)
5. **Serve.** Serve over the rice.
6. **Store the leftovers.** Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through.

## d06 · Steak, potatoes and green beans

**Dinner** · 30 min · **758 cal · 57 g protein · 64 g carbs · 31 g fat** per serving · Allergens: Dairy

**Ingredients** (grams as the app counts them)

- Sirloin steak, trimmed: 220 g
- Potatoes: 300 g
- Green beans: 150 g
- Butter: 15 g
- Olive oil: 8 g
- Garlic: 3 g
- Salt: 1 g
- Black pepper: 0.5 g

**Steps**

1. **Boil the potatoes.** Cut the potatoes into chunks and boil in salted water until tender. Drain. (15 min)
2. **Cook the steak.** Pat the steak dry and season. Sear in the oil in a very hot pan, 3–4 minutes a side for medium. Rest for 5 minutes. (8 min)
3. **Cook the beans.** Steam or boil the green beans until bright and just tender. (4 min)
4. **Finish.** Toss the potatoes and beans with the butter and garlic. Slice the steak and serve.

## d07 · Cod with lemon orzo

**Dinner** · 25 min · keeps 1 day · **762 cal · 60 g protein · 75 g carbs · 24 g fat** per serving · Allergens: Dairy · Gluten · Fish

**Ingredients** (grams as the app counts them)

- Cod fillet: 230 g
- Orzo or pasta, dry: 90 g
- Lemon juice: 20 g
- Parmesan, grated: 20 g
- Olive oil: 15 g
- Baby spinach: 60 g
- Garlic: 3 g
- Salt: 1 g

**Steps**

1. **Cook the orzo.** Boil the orzo in salted water until tender. Drain. (10 min)
2. **Cook the cod.** Season the cod. Cook in half the oil in a pan over medium-high heat until it flakes easily (145°F / 63°C). (8 min)
3. **Finish the orzo.** Toss the orzo with the rest of the oil, the garlic, spinach, lemon juice and Parmesan until the spinach wilts. (2 min)
4. **Serve.** Serve the cod on the orzo.

## d08 · Black bean tacos

**Dinner** · 20 min · **839 cal · 36 g protein · 108 g carbs · 31 g fat** per serving · Allergens: Dairy · Gluten

**Ingredients** (grams as the app counts them)

- Black beans, canned, drained: 250 g
- Flour tortilla (10-inch): 110 g
- Cheddar, shredded: 40 g
- Salsa: 80 g
- Avocado: 50 g
- Cumin: 1 g
- Chilli powder: 1 g
- Salt: 0.5 g

**Steps**

1. **Season the beans.** Warm the beans in a pan with the cumin, chilli powder, salt and a splash of water, mashing a few. (6 min)
2. **Warm the tortillas.** Warm the tortillas in a dry pan. (2 min)
3. **Fill.** Fill with the beans, cheese, salsa and sliced avocado.

## d09 · Teriyaki tofu and broccoli rice

**Dinner or Lunch** · 25 min · keeps 2 days · **848 cal · 52 g protein · 92 g carbs · 34 g fat** per serving · Allergens: Gluten · Soy · Sesame

**Ingredients** (grams as the app counts them)

- Firm tofu: 220 g
- Broccoli florets: 150 g
- Long-grain white rice, dry: 85 g
- Teriyaki sauce: 40 g
- Sesame seeds: 8 g
- Olive oil: 10 g

**Steps**

1. **Cook the rice.** Rinse the rice and simmer, covered, in twice its volume of water until tender. (18 min)
2. **Crisp the tofu.** Press the tofu dry and cut into cubes. Fry in the oil over medium-high heat until golden on all sides. (8 min)
3. **Cook the broccoli.** Add the broccoli and a splash of water, cover, and steam until just tender. (3 min)
4. **Glaze.** Pour in the teriyaki sauce and toss until sticky. Serve over the rice with sesame seeds. (1 min)

## d10 · Pork tenderloin, rice and slaw

**Dinner** · 35 min · keeps 2 days · **779 cal · 61 g protein · 82 g carbs · 22 g fat** per serving · Allergens: None

**Ingredients** (grams as the app counts them)

- Pork tenderloin: 250 g
- Long-grain white rice, dry: 85 g
- Cabbage, shredded: 120 g
- Carrot: 60 g
- Olive oil: 15 g
- Cider vinegar: 15 g
- Smoked paprika: 2 g
- Salt: 1 g

**Steps**

1. **Cook the rice.** Rinse the rice and simmer, covered, in twice its volume of water until tender. (18 min)
2. **Sear the pork.** Heat the oven to 400°F (200°C). Rub the pork with half the oil, the paprika and salt, and sear it all over in an oven-safe pan. (5 min)
3. **Roast.** Roast until it reaches 145°F (63°C), then rest for 3 minutes before slicing. (15 min)
4. **Make the slaw.** Toss the cabbage and grated carrot with the vinegar and the rest of the oil.
5. **Serve.** Serve the sliced pork with the rice and slaw.

## d11 · Mushroom and barley risotto

**Dinner** · 45 min · keeps 2 days · **757 cal · 26 g protein · 95 g carbs · 34 g fat** per serving · Allergens: Dairy · Gluten

**Ingredients** (grams as the app counts them)

- Mushrooms, sliced: 200 g
- Pearl barley, dry: 95 g
- Parmesan, grated: 30 g
- Onion: 60 g
- Olive oil: 15 g
- Vegetable broth: 400 g
- Butter: 10 g
- Garlic: 3 g
- Salt: 0.5 g

**Steps**

1. **Brown the mushrooms.** Heat the oil in a pot. Cook the mushrooms until browned, then set half aside. (6 min)
2. **Toast the barley.** Add the onion and garlic and cook until soft, then stir in the barley. (4 min)
3. **Simmer.** Add the broth a ladle at a time, stirring often, until the barley is tender and creamy. (35 min)
4. **Finish.** Stir in the butter, Parmesan and reserved mushrooms. Season to taste.

## d12 · Chicken fajitas

**Dinner** · 25 min · batch cook · keeps 2 days · **870 cal · 71 g protein · 70 g carbs · 34 g fat** per serving · Allergens: Dairy · Gluten

**Ingredients** (grams as the app counts them)

- Chicken breast, boneless skinless: 260 g
- Red bell pepper: 150 g
- Onion: 80 g
- Flour tortilla (10-inch): 100 g
- Sour cream: 40 g
- Olive oil: 10 g
- Chilli powder: 2 g
- Cumin: 1 g
- Smoked paprika: 1 g
- Salt: 1 g
- Lemon juice: 5 g

**Steps**

1. **Season the chicken.** Slice the chicken into strips and toss with the chilli powder, cumin, paprika and salt.
2. **Cook the chicken.** Heat the oil in a large pan over high heat. Cook the chicken until browned and cooked through (165°F / 74°C). Set aside. (7 min)
3. **Cook the vegetables.** Add the sliced pepper and onion and cook until charred at the edges. (6 min)
4. **Combine.** Return the chicken, squeeze over the lemon and toss.
5. **Serve.** Serve in warm tortillas with sour cream.
6. **Store the leftovers.** Cool within 2 hours and refrigerate in a sealed container. Reheat until piping hot all the way through.

---

# Snack (8)

## s01 · Apple and peanut butter

**Snack** · 3 min · **285 cal · 8 g protein · 32 g carbs · 17 g fat** per serving · Allergens: Peanuts

**Ingredients** (grams as the app counts them)

- Apple: 180 g
- Peanut butter, smooth: 32 g

**Steps**

1. **Slice and serve.** Core and slice the apple. Serve with the peanut butter for dipping.

## s02 · Protein shake with banana

**Snack** · 3 min · **315 cal · 32 g protein · 36 g carbs · 6 g fat** per serving · Allergens: Dairy

**Ingredients** (grams as the app counts them)

- Whey protein powder: 30 g
- Milk, 2%: 240 g
- Banana: 100 g

**Steps**

1. **Blend.** Blend the milk, protein powder and banana until smooth.

## s03 · Hummus and pitta

**Snack** · 3 min · **316 cal · 11 g protein · 45 g carbs · 11 g fat** per serving · Allergens: Gluten · Sesame

**Ingredients** (grams as the app counts them)

- Hummus: 60 g
- Pita (6½-inch): 60 g
- Cucumber: 60 g

**Steps**

1. **Serve.** Warm the pita and cut into wedges. Serve with the hummus and cucumber sticks.

## s04 · Trail mix

**Snack** · 1 min · keeps 30 days · **322 cal · 11 g protein · 26 g carbs · 22 g fat** per serving · Allergens: Peanuts · Tree nuts

**Ingredients** (grams as the app counts them)

- Almonds: 25 g
- Dry-roasted peanuts: 20 g
- Raisins: 20 g

**Steps**

1. **Mix.** Mix the almonds, peanuts and raisins.

## s05 · Boiled eggs and fruit

**Snack** · 12 min · keeps 4 days · **259 cal · 14 g protein · 28 g carbs · 11 g fat** per serving · Allergens: Eggs

**Ingredients** (grams as the app counts them)

- Eggs, hard-boiled: 100 g
- Grapes: 150 g
- Salt: 0.3 g

**Steps**

1. **Boil the eggs.** Lower the eggs into boiling water and cook for 9–10 minutes for firm yolks. (10 min)
2. **Cool.** Cool in cold water, then peel. Season with a pinch of salt and serve with the grapes. (2 min)

## s06 · Edamame with sea salt

**Snack** · 5 min · keeps 2 days · **218 cal · 21 g protein · 16 g carbs · 9 g fat** per serving · Allergens: Soy

**Ingredients** (grams as the app counts them)

- Edamame, shelled: 180 g
- Salt: 0.5 g

**Steps**

1. **Cook.** Cook the edamame in boiling water until hot. (4 min)
2. **Season.** Drain and toss with the salt.

## s07 · Rice cakes with cottage cheese

**Snack** · 3 min · **226 cal · 18 g protein · 29 g carbs · 4 g fat** per serving · Allergens: Dairy

**Ingredients** (grams as the app counts them)

- Brown rice cakes: 27 g
- Cottage cheese, 2%: 150 g
- Black pepper: 0.2 g

**Steps**

1. **Top and serve.** Spread the cottage cheese over the rice cakes and add a grind of pepper.

## s08 · Beef jerky and an orange

**Snack** · 1 min · keeps 30 days · **230 cal · 15 g protein · 21 g carbs · 10 g fat** per serving · Allergens: Gluten · Soy

**Ingredients** (grams as the app counts them)

- Beef jerky: 40 g
- Orange: 140 g

**Steps**

1. **Serve.** Peel the orange and serve with the jerky.
