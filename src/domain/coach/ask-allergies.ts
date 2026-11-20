/**
 * ══ HOLT'S CHAT KNOWS WHAT THE ATHLETE CAN'T EAT (AI re-audit 11-20, P1) ══
 *
 * Before this, the Kitchen's dish writer avoided the athlete's allergies but the CHAT did not know them at all:
 * `coach-ask` never read Meal Plan Setup, `get_recipes` searched the whole book (Forge's + My Recipes) unfiltered, and
 * the prompt let Holt suggest "one simple dish" of his own or describe an online recipe. A peanut-allergic athlete
 * asking "any dinner ideas?" could be offered peanuts.
 *
 * Now the SERVER reads the allergies (as the athlete, RLS) on every turn, for every app version, and:
 *   1. `withoutAllergens` — a recipe whose own allergen tags meet theirs never reaches `get_recipes` (the model
 *      cannot suggest what it cannot see). The tags are the app's (`meal-planner.ts` / `user-recipes.ts`), never the
 *      model's.
 *   2. `allergyNote` — one bracketed line in the athlete's turn names them, so a dish he describes in his own words
 *      or finds online is held to them too.
 *
 * ⛔ FAILS CLOSED (NUT-D6 / N-D2's rule): if the read fails, no recipe reaches him and he is told to ask about
 * allergies before suggesting food. Nobody guesses around an allergy.
 *
 * ⚠ The note rides in the USER turn, never the system block, and only when there is something to say — so the cached
 * prefix is byte-identical and every eval recording without allergies is unchanged (the 4b `earlier` rule).
 *
 * Pure and import-free: tested by `ask-allergies.test.mjs`.
 */

/** Meal Plan Setup's allergen keys (`meal-plan-setup.ts` `Allergen`; DB check `meal_plan_prefs_allergens_chk`). */
const LABEL: Record<string, string> = {
  peanuts: 'peanuts (and peanut butter, peanut oil, satay sauce)',
  tree_nuts: 'tree nuts (almonds, cashews, walnuts, pecans, pistachios, hazelnuts, macadamias, pesto, nut butters, nut milks)',
  dairy: 'dairy (milk, butter, cheese, yogurt, cream, whey and casein protein)',
  eggs: 'eggs (and mayonnaise, aioli, most baked goods)',
  gluten: 'gluten (wheat, barley, rye, regular pasta, bread, flour tortillas, couscous, soy sauce unless gluten-free)',
  soy: 'soy (tofu, tempeh, edamame, soy sauce, miso, soy protein)',
  fish: 'fish (and fish sauce, anchovies, Worcestershire sauce, Caesar dressing)',
  shellfish: 'shellfish (shrimp, prawns, crab, lobster, scallops, mussels, oyster sauce)',
  sesame: 'sesame (sesame seeds and oil, tahini, hummus)',
};

/** The read, as the function saw it: the athlete's allergen keys (possibly none), or a failed read. */
export type AllergyRead = { ok: true; allergens: string[] } | { ok: false };

/** A `meal_plan_prefs` row (or null for "never answered") → the read. Anything malformed is a FAILED read. */
export function allergyReadFrom(row: unknown, error: unknown): AllergyRead {
  if (error) return { ok: false };
  if (row == null) return { ok: true, allergens: [] };
  const a = (row as { allergens?: unknown }).allergens;
  if (a == null) return { ok: true, allergens: [] };
  if (!Array.isArray(a) || a.some((x) => typeof x !== 'string')) return { ok: false };
  return { ok: true, allergens: [...new Set((a as string[]).map((x) => x.trim().toLowerCase()).filter(Boolean))] };
}

/** Recipe cards whose own allergen tags miss every one of the athlete's. A failed read keeps none. */
export function withoutAllergens<T extends { allergens: readonly string[] }>(cards: readonly T[], read: AllergyRead): T[] {
  if (!read.ok) return [];
  if (!read.allergens.length) return [...cards];
  const theirs = new Set(read.allergens);
  return cards.filter((c) => !c.allergens.some((a) => theirs.has(a.trim().toLowerCase())));
}

/** The bracketed line for the athlete's turn, or null when there is nothing to say. */
export function allergyNote(read: AllergyRead): string | null {
  if (!read.ok) {
    return "(The app couldn't load this athlete's food allergies just now. Before you suggest any food, dish or recipe, ask whether they have any food allergies.)";
  }
  if (!read.allergens.length) return null;
  const named = read.allergens.map((a) => LABEL[a] ?? a.replace(/_/g, ' '));
  return `(Food allergies on their Meal Plan Setup: ${named.join('; ')}. Never suggest a food, dish, recipe or online recipe that contains any of these or usually does — including sauces, toppings and garnishes. If you aren't sure a dish is free of them, say so and suggest something else. The recipe search already leaves those recipes out.)`;
}
