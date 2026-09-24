/**
 * TEST DATA ONLY. The 40 starter recipes Forge shipped on 2026-09-23 and removed from the app on 2026-09-24
 * (PO: "get rid of all of the recipes", replaced by the PO's own). The planner, grocery and recipe-view
 * tests still need a realistic book to plan from, so it lives here, never imported by `src/app`.
 */
import type { RecipeSource } from '../../recipes-data.ts';

export const STARTER_RECIPES: readonly RecipeSource[] = [
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
