# Holt's Kitchen: "What can I make?" Scope v1.0

**Status:** SCOPE, decisions LOCKED (PO 2026-09-24: "Perfect"; all four recommendations in §9 taken). Not built.
Part of `Coach-Holt-Everywhere-v1.0.md`.
**Product:** Premium AI (`coach_ai`), metered through `coach_ai_spend_credits` like every Holt AI call.
**Reads with:** `Nutrition-Architecture-v1.0` NUT-D4 (the model never writes a number), NUT-D5 (floors, no
recommendations under 18), NUT-D6 (allergens), §6 step 7 ("I have chicken, eggs and rice") ·
`Nutrition-Architecture-Amendment-001` (Holt nutrition scope) · `…-002` (Holt meal plans, NOT locked) ·
`domain/coach/medical-routing.ts` · Decision Queue #36 (Holt's four safety fixes)

PO: *"The problem with not using AI is we'd need a recipe for every situation. The coach AI needs to come up
with what they can make, as if I'm talking to Claude or ChatGPT … robust so it's not saying the same things
over and over. Give a couple of options, then ask if they want other options."*

---

## 1. What the athlete gets

1. **Ask in plain words**, in Holt's chat or from a *"What can I make?"* button on Nutrition Home:
   *"I have chicken thighs, rice, spinach, eggs and some feta."*
2. **Holt answers with 2–3 options**, each different on purpose. For example:
   - **Greek chicken rice bowl** · 25 min · 640 cal · 52 g protein
   - **Spinach & feta egg scramble with rice** · 12 min · 480 cal · 34 g protein
   - **Crispy chicken fried rice** · 20 min · 590 cal · 45 g protein

   Each option shows a one-line "why" (*"closest to your protein for the day"*, *"fastest"*,
   *"uses the most of what you have"*).
3. **Then he asks:** *"Want different ideas? I can go quicker, higher protein, no stove, or a different
   cuisine."* The buttons are **More ideas · Quicker · More protein · Different style**, plus free typing
   (*"something spicy"*, *"I don't want rice"*).
4. **Tap an option** → the full recipe: ingredients with amounts, steps, and the numbers.
   Then **Log it** (to the right meal) or **Save to My Recipes** (so the planner can use it from then on).

## 1b. "What do I have?" comes from the Grocery List (PO, 2026-09-24)

PO: *"Could be cool if he took from the completed grocery list … so he can suggest what they have."*

- **Your pantry, without typing it.** The Grocery List already stores, per week, what was checked off as
  **bought** and what was marked **Have it** (`meal_plan_weeks.grocery`, 0212: `checked` / `have` /
  `extras`). Tapping *What can I make?* with nothing typed starts from this week's bought + have items, then
  last week's.
- **Holt confirms before cooking with it:** *"From your list: chicken thighs, rice, spinach, eggs, feta.
  Anything gone?"* with each item as a chip to remove, plus *Add something*. Typed words always win over the list.
- **Freshness is respected, not guessed.** Fresh produce, meat and fish bought more than 7 days ago show as
  *"still good?"* instead of being assumed. Pantry staples (rice, oil, spices) are assumed until removed.
- **Meals already cooked count.** Ingredients the planner's logged meals used this week are subtracted first,
  so Holt doesn't build dinner on chicken that went into Monday's lunch.
- **No new data and no new permission.** It reads the athlete's own list, owner-only like every nutrition
  table (P6-A2-D1).

## 2. Robust and never repetitive (the core ask)

| Mechanism | What it does |
|---|---|
| **Kitchen memory** | Every suggested dish is remembered per athlete (name, cuisine, main method) for 30 days. Recent dishes are sent to the model as *"already suggested, do not repeat"*. |
| **Forced spread** | The 2–3 options in one answer must differ in **method** (pan / oven / no-cook / bowl), and at least two must differ in **cuisine**. The code checks this after the model answers, and one bad option is regenerated rather than shown. |
| **More ideas** | Sends the options already on screen as exclusions, so page 2 is never page 1 again. |
| **Rotation seed** | A cuisine and method hint rotates per ask (Mediterranean one day, Mexican the next), so the same pantry doesn't open with the same dish every time. |
| **Saved or logged dishes** | Suggested again only when the athlete asks for "something I've made before". |

## 3. The numbers are never the model's (NUT-D4)

Holt writes the **dish, ingredients, amounts and steps**. **The app computes the calories and macros:**

1. Holt must name each ingredient in plain food words, with grams or a US measure.
2. Each one is matched: first Forge's ingredient table (`recipes-data.ts`, USDA-sourced), then
   `food-search` (USDA / FatSecret), the same path Log Food uses.
3. The per-serving numbers come from the matches: the same maths as the recipe book.
4. **An ingredient that can't be matched is shown as unmatched** (*"≈ numbers: 'harissa' not found"*). It is
   never guessed, and the card says the total is approximate.
5. Grams stay sane: a check rejects amounts no one cooks (2 kg of oil, 0 g of chicken) and asks the model once
   to fix it.

## 4. Safety (non-negotiable, all enforced in code)

- **Allergies and diet** from Meal Plan Setup are sent as hard rules AND checked afterwards against every
  matched ingredient's allergen tags. An option that contains one is dropped, never shown with a warning.
- **Medical stop rules** (`medicalRoute`) run on the athlete's words **before** any model call: conditions,
  pregnancy, symptoms, "I'm diabetic, what can I eat" → the standard route, no recipe, no credit spent.
- **Under 18:** recipes yes, but no "fits your target" or calorie steering (NUT-D5).
- **Under-eating care** (owed before Nutrition opens) overrides: Holt never offers a "lighter version" to
  someone whose recent intake is far below their floor.
- **Food safety** in steps: safe internal temperatures (USDA FSIS) whenever meat, poultry, fish or eggs are
  cooked. That's a prompt rule plus a check that inserts the temperature if it's missing.
- **No brands, no copied recipes.** Holt writes his own. Nothing is fetched from recipe websites
  (their text is copyrighted, their numbers are unreliable, and recipe APIs cost money and carry licences).

## 5. Target-aware, not target-obsessed

If the athlete has a target, the ask includes **what's left today** (the numbers the Home card shows). Holt
leans the options toward it (*"you have 110 g protein left"*) and says which option fits best. He never
says "too many calories", never "you shouldn't", and never recommends eating less than the floor.

## 6. How it's built

- **One Edge Function, `coach-kitchen`,** following `coach-ask`'s pattern: auth → `medicalRoute` → reserve
  credits → model → validate → match numbers → return. **Structured output** (a fixed JSON shape: options,
  ingredients, grams, steps, cuisine, method), never free prose, so the app can check and compute.
- **Model:** Sonnet (the model already locked for Holt). About 1,000 output tokens per 3 options, **≈ 1–2¢
  per ask**. A new `coach_ai_config` weight, `kitchen`.
- **Tables:** `kitchen_suggestions` (owner-only, 30-day memory for variety). Saved dishes go into the
  existing `user_recipes` (0213) with `source = 'holt'`.
- **Screens:** the answer renders in Holt's chat as option cards; *What can I make?* on Nutrition Home opens
  the same chat pre-filled. The recipe view reuses the Recipe screen.
- **No new app build.** Everything is OTA plus one migration and one function deploy.

## 7. What it is not

- Not a meal plan. That's Amendment 002 (still unlocked). A saved dish can feed the planner later.
- Not a shopping assistant in v1 ("what should I buy to make X" is a later step).
- Not photo-of-the-fridge in v1. Typed or spoken ingredients only. A fridge photo is a natural v2 on the same
  function once photo logging exists.

## 8. Build order

1. Holt's four safety fixes + the under-eating response (already required before Nutrition opens)
2. `coach-kitchen` + structured output + ingredient matching + the allergen and gram checks
3. Option cards in chat, More ideas / Quicker / More protein / Different style, the full-recipe view
4. Log it / Save to My Recipes
5. Kitchen memory + forced spread + rotation (the anti-repeat layer)
6. *What can I make?* entry on Nutrition Home
7. Eval set before release: 50 real pantries × 3 asks. Pass = zero allergen misses, zero model-written
   numbers, no repeated dish within one pantry's three asks, every meat/egg step has its temperature.

## 9. Decisions (LOCKED 2026-09-24: Premium AI only · chat AND a Nutrition button · 3 options · 30 days)

1. **Premium AI only?** *Recommendation: yes. It's an AI call per ask.*
2. **Where it lives:** Holt's chat only, or also a *What can I make?* button on Nutrition Home?
   *Recommendation: both, pointing at the same chat.*
3. **How many options per answer:** 2 or 3? *Recommendation: 3 on a phone screen, as cards.*
4. **Kitchen memory length:** how long before a dish can come back unasked? *Recommendation: 30 days.*
