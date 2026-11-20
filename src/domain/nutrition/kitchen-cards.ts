/**
 * HOLT'S DISHES → CARDS, WITH THE APP'S NUMBERS (Kitchen Scope §3, NUT-D4, NUT-D6).
 *
 * A dish from `coach-kitchen` is ingredient lines only. Here each line is matched to the USDA catalogue by the
 * same code a photographed recipe goes through (`draftFromRead`), and the numbers on the card are
 * `totalsOf(matched) / servings` — the app's, never the model's. A line the catalogue can't match adds
 * nothing and makes the card say so ("≈"), per §3.4.
 *
 * ⛔ ALLERGENS: a dish is DROPPED, never shown with a warning (§4), when the catalogue's tags on its matched
 * lines OR the words on any line (`allergensByWord`) name one the athlete avoids.
 *
 * ⛔ AND AN UNKNOWN LINE IS AN EXCLUDED LINE (NUT-D6, AI audit 11-16 N-D1). Once the athlete avoids anything — an
 * allergen or a diet — a dish with a line the catalogue couldn't match (and that carries an amount) is dropped
 * too: nobody knows what is in it, and a word list can never name every sauce. The audit's probe showed 11 of
 * 14 hidden-allergen foods ("basil pesto", "buttermilk", "naan", "calamari"…) shown to someone avoiding them.
 * The same rule Meal Plan's fill already keeps (`plannable` in `holt-fill.ts`). "Salt to taste" carries no
 * amount and stays, as it does for the "≈".
 */
import { draftFromRead } from './recipe-import.ts';
import { ALLERGEN_WORDS, allergensByWord, DIET_WORDS, foldAccents, type KitchenDish } from './kitchen-dishes.ts';
import { detectAllergens, totalsOf } from './user-recipes.ts';
import { INGREDIENTS } from './recipes-data.ts';
import type { RecipeRead } from './recipe-photo-read.ts';

export interface DishCard {
  name: string;
  why: string;
  cuisine: string;
  method: string;
  minutes: number | null;
  /** Per serving, from the catalogue. */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** Lines the catalogue couldn't match — the numbers leave them out, so the card reads "≈". */
  unmatched: number;
  /** The dish as a recipe read — what "See the recipe" opens in My Recipes, and what the planner can take. */
  read: RecipeRead;
}

export function dishAsRead(d: KitchenDish): RecipeRead {
  return { name: d.name, servings: d.servings, minutes: d.minutes, mealType: d.mealType, ingredients: d.ingredients, steps: d.steps };
}

/*
 * Diets, checked by the app (live check 09-26: a vegan got cheese, a vegetarian got chicken — the prompt alone
 * doesn't hold it). By the catalogue's own `diet` on matched lines, and by word on every line — the SAME word
 * lists the allergy check reads (`kitchen-dishes.ts`), so a word added there (Worcestershire, gelatin, kefir)
 * holds for a diet too. A nut, seed or plant butter or milk is renamed first so "peanut butter" isn't dairy.
 */
const isMeat = (t: string) => DIET_WORDS.meat.test(t) || DIET_WORDS.poultry.test(t);
const isSea = (t: string) => ALLERGEN_WORDS.fish.test(t) || ALLERGEN_WORDS.shellfish.test(t);
const OTHER_ANIMAL = /\b(beeswax|royal\s+jelly|bee\s+pollen|carmine|cochineal)\b/i;
const isAnimal = (t: string) => ALLERGEN_WORDS.dairy.test(t) || ALLERGEN_WORDS.eggs.test(t) || DIET_WORDS.honey.test(t) || OTHER_ANIMAL.test(t);
const BLOCKED_DIETS: Record<string, readonly string[]> = {
  vegan: ['meat', 'fish', 'shellfish', 'animal'],
  vegetarian: ['meat', 'fish', 'shellfish'],
  pescatarian: ['meat'],
};

export function breaksDiet(d: KitchenDish, keys: readonly string[], diet: string | null | undefined): boolean {
  const blocked = BLOCKED_DIETS[diet ?? ''];
  if (!blocked) return false;
  if (keys.some((k) => blocked.includes((INGREDIENTS as Record<string, { diet: string }>)[k]?.diet))) return true;
  const text = foldAccents(d.ingredients.map((i) => `${i.food} ${i.text}`).join(' | ')).replace(
    /\b(peanut|almond|cashew|sunflower|seed|nut|apple|pumpkin|soy|coconut)\s+(butter|milk|yogh?urt|cream)\b/gi,
    '$1 spread',
  );
  if (isMeat(text)) return true;
  if (diet !== 'pescatarian' && isSea(text)) return true;
  return diet === 'vegan' && isAnimal(text);
}

/** Does this athlete avoid anything at all? Then a line nobody can identify is a line they can't eat. */
const avoidsAnything = (banned: ReadonlySet<string>, diet: string | null | undefined): boolean => banned.size > 0 || !!BLOCKED_DIETS[diet ?? ''];

/**
 * What a line with NO amount may be and still be "known" (AI re-audit 11-20). Seasonings, herbs, citrus and water —
 * none of them one of the nine allergens. Anything else unmatched with no amount ("hot sauce", "a spoon of mole",
 * "Kewpie to serve", "gochujang") is an unknown line like any other: the re-audit's probe showed 12 of 21 hidden-
 * allergen dishes shown because the old rule only counted unknown lines that carried an amount. ⚠ Malt vinegar is
 * barley (gluten), so only plain vinegars are here; soy and fish sauces are never here.
 */
const SEASONING =
  /^\s*(?:(?:sea|kosher|flaky|table)\s+)?salt(?:\s+and\s+(?:black\s+)?pepper)?\s*$|^\s*(?:freshly\s+ground\s+|ground\s+|cracked\s+)?(?:black\s+|white\s+)?pepper(?:corns)?\s*$|^\s*(?:fresh\s+|dried\s+|chopped\s+)?(?:parsley|cilantro|coriander(?:\s+leaves)?|basil(?:\s+leaves)?|mint(?:\s+leaves)?|dill|chives|thyme|rosemary|oregano|sage|bay\s+leaf|bay\s+leaves|tarragon)\s*$|^\s*(?:ground\s+)?(?:cumin|paprika|smoked\s+paprika|chili\s+powder|chilli\s+powder|cayenne(?:\s+pepper)?|turmeric|cinnamon|nutmeg|garlic\s+powder|onion\s+powder|ginger|allspice|cloves|cardamom|coriander\s+seeds?|fennel\s+seeds?|mustard\s+seeds?|italian\s+seasoning|herbes\s+de\s+provence|red\s+pepper\s+flakes|chil(?:l)?i\s+flakes|crushed\s+red\s+pepper)\s*$|^\s*(?:lemon|lime)(?:\s+(?:juice|zest|wedges?|slices?))?\s*$|^\s*(?:(?:white|red\s+wine|white\s+wine|apple\s+cider|cider|rice|balsamic)\s+)?vinegar\s*$|^\s*(?:cold\s+|warm\s+|hot\s+)?water\s*$|^\s*ice(?:\s+cubes)?\s*$/i;

/** An unmatched line the app can't vouch for: one with an amount, or one with none that isn't a plain seasoning. */
function unknownLine(u: { food: string; text: string; quantity: number | null; reason: string; candidates: readonly string[] }): boolean {
  if (u.quantity != null) return true;
  if (u.reason === 'amount' && u.candidates.length === 1) return false; // the food is certain; its tags are read below
  return !SEASONING.test(foldAccents(u.food || u.text || ''));
}

/** "Dairy-free yogurt", "no peanuts", "without sesame" — the disclaimer is not the food (the name's rule, for steps). */
const withoutDisclaimers = (s: string): string => s.replace(/\b\w+[-\s]free\b/gi, ' ').replace(/\b(?:no|without|free\s+of|skip\s+the)\s+\w+/gi, ' ');

/**
 * The dish with its STEPS read as lines too (AI re-audit 11-20): "Garnish with sesame seeds", "Top with crushed
 * peanuts", "Serve with naan" put an allergen on the plate without being an ingredient line.
 */
const withSteps = (d: KitchenDish): KitchenDish => ({
  ...d,
  ingredients: [...d.ingredients, ...(d.steps ?? []).map((s) => ({ text: withoutDisclaimers(s), food: '', quantity: null, unit: '' }))],
});

/** Dishes → cards, with anything the athlete avoids removed (allergens and diet). Order is kept. */
export function dishCards(dishes: readonly KitchenDish[], avoid: readonly string[], diet: string | null = null): DishCard[] {
  const banned = new Set(avoid);
  const strict = avoidsAnything(banned, diet);
  const out: DishCard[] = [];
  for (const d of dishes) {
    const read = dishAsRead(d);
    const draft = draftFromRead(read);
    /* ⛔ NUT-D6 (AI audit 11-16, N-D1; re-audit 11-20): unknown counts as excluded — see the header and `unknownLine`. */
    if (strict && draft.unmatched.some(unknownLine)) continue;
    /* A line whose FOOD matched but whose amount didn't ("a splash of teriyaki sauce") is still that food: its
       catalogue tags and diet count, even though it adds nothing to the numbers. */
    const amountOnly = draft.unmatched.flatMap((u) => (u.reason === 'amount' && u.candidates.length === 1 ? [{ key: u.candidates[0] }] : []));
    const keys = [...draft.form.ingredients, ...amountOnly].flatMap((i) => (i.key ? [i.key] : []));
    const full = withSteps(d);
    const tagged = [...detectAllergens([...draft.form.ingredients, ...amountOnly]), ...allergensByWord(full)];
    if (tagged.some((a) => banned.has(a))) continue;
    if (breaksDiet(full, keys, diet)) continue;
    const t = totalsOf(draft.form.ingredients);
    const y = Math.max(1, d.servings);
    out.push({
      name: d.name,
      why: d.why,
      cuisine: d.cuisine,
      method: d.method,
      minutes: d.minutes,
      kcal: Math.round(t.kcal / y),
      protein: Math.round(t.protein / y),
      carb: Math.round(t.carb / y),
      fat: Math.round(t.fat / y),
      // Salt, pepper and spices "to taste" carry no amount and next to no calories: they don't make a card "≈".
      unmatched: draft.unmatched.filter((u) => u.quantity != null).length,
      read,
    });
  }
  return out;
}

/** The card's one line of numbers: "25 min · 640 cal · 52 g protein", with "≈" when a line is unmatched. */
export function dishLine(c: DishCard, showNumbers: boolean): string {
  const parts: string[] = [];
  if (c.minutes) parts.push(`${c.minutes} min`);
  if (showNumbers) {
    const approx = c.unmatched ? '≈' : '';
    parts.push(`${approx}${c.kcal.toLocaleString('en-US')} cal`, `${approx}${c.protein} g protein`);
  }
  return parts.join(' · ');
}

/** Diet → foods to avoid, in the model's words (the allergen tags cover allergies; this covers diets). */
export function dietAvoid(diet: string | null | undefined): string[] {
  switch (diet) {
    case 'vegetarian':
      return ['meat', 'poultry', 'fish', 'shellfish'];
    case 'vegan':
      return ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'eggs', 'honey'];
    case 'pescatarian':
      return ['meat', 'poultry'];
    default:
      return [];
  }
}
