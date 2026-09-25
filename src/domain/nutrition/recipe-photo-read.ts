/**
 * READING A PHOTOGRAPHED RECIPE — the guard, the shape, and the app's words for every outcome.
 *
 * PO, 2026-09-25: *"take a screenshot of a recipe and put it into the meals/recipes just like we do with
 * pictures of programs."* The `recipe-photo-read` Edge Function looks at the picture; this module decides
 * what of its answer is allowed to exist.
 *
 * ══ ⛔ NUT-D4: THE MODEL NEVER WRITES A NUMBER THE APP SHOWS AS NUTRITION ══
 *
 * `Nutrition-Architecture-v1.0` NUT-D4 — *"any number it emits is discarded"* — and Holt-Kitchen-Scope §3.
 * A recipe card very often prints its own calories and macros. They are ignored in THREE places, each
 * enough on its own:
 *
 *   1. The prompt tells the model to ignore any nutrition panel.
 *   2. `RECIPE_READ_SCHEMA` (structured output, `additionalProperties: false`) has **no field that can
 *      carry one** — no calories, protein, carbs, fat, per-serving anything.
 *   3. `sanitizeRecipeRead()` below copies ONLY the whitelisted fields, so a key the model (or anything
 *      else) adds never survives. It runs in the function AND again on the device.
 *
 * The numbers that do survive are what is WRITTEN ON THE PAGE as a recipe: servings, minutes, and each
 * ingredient's amount and unit. The app turns those into grams against its own USDA catalogue and computes
 * every calorie itself (`recipe-import.ts`, `totalsOf`).
 *
 * ══ ⚠ A PHOTOGRAPHED RECIPE IS THE ATHLETE'S PERSONAL COPY ══
 *
 * Third-party provenance (`project_third_party_program_provenance`): someone else's recipe, read from a
 * screenshot, is stored for the athlete alone — `user_recipes` is owner-only (0213) and nothing publishes
 * it. The steps are rewritten briefly in plain words rather than copied.
 *
 * ⚠ NO IMPORTS. The Edge Function inlines this file into its dashboard paste copy
 * (`scripts/build-recipe-photo-read-deploy.mjs`), and the generator refuses a module that imports.
 */

/** The meter's name for this call. Its weight (3) lives in `coach_ai_config.action_credits` (0220), never here. */
export const RECIPE_PHOTO_ACTION = 'recipe_photo';

/** 5 MB of image in base64 — the Messages API's own per-image limit, as `program-photo-read`. */
export const RECIPE_PHOTO_MAX_BASE64 = 6_990_000;

/** What the function accepts. Same list as `program-photo-read`'s `ALLOWED_MEDIA`. */
export const RECIPE_PHOTO_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** A recipe is a page, not a program: a day's ceiling well above any real kitchen. */
export const RECIPE_PHOTO_PER_DAY = 30;

/** The output ceiling. A long recipe is ~40 ingredients and a dozen short steps — well under this. */
export const RECIPE_PHOTO_OUTPUT_CAP = 3000;

export const MAX_READ_INGREDIENTS = 40;
export const MAX_READ_STEPS = 20;
const NAME_CHARS = 40;
const TEXT_CHARS = 120;
const FOOD_CHARS = 60;
const UNIT_CHARS = 24;
const STEP_CHARS = 200;

export type ReadMealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface ReadIngredient {
  /** The line as written on the page, e.g. "2 cloves garlic, minced". Shown to the athlete as-is. */
  text: string;
  /** The amount written on the page (a range reads as its first number), or null when there is none. */
  quantity: number | null;
  /** The unit as written ("cup", "tbsp", "g", "cloves"), or "" when there is none. */
  unit: string;
  /** The plain food, without amount, unit or prep ("garlic"). What the app matches against its catalogue. */
  food: string;
}

/** A photographed recipe. ⚠ Deliberately NO calories or macros — NUT-D4. */
export interface RecipeRead {
  name: string;
  servings: number | null;
  minutes: number | null;
  mealType: ReadMealType | null;
  ingredients: ReadIngredient[];
  steps: string[];
}

const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };

/**
 * The structured-output schema the model must answer in. ⛔ No nutrition field, on purpose — the source
 * test fails if one is ever added.
 */
export const RECIPE_READ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isRecipe', 'name', 'servings', 'minutes', 'mealType', 'ingredients', 'steps'],
  properties: {
    isRecipe: { type: 'boolean' },
    name: { type: 'string' },
    servings: nullableNumber,
    minutes: nullableNumber,
    mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'unknown'] },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'quantity', 'unit', 'food'],
        properties: {
          text: { type: 'string' },
          quantity: nullableNumber,
          unit: { type: 'string' },
          food: { type: 'string' },
        },
      },
    },
    steps: { type: 'array', items: { type: 'string' } },
  },
} as const;

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const positive = (v: unknown, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max ? v : null;

const MEAL_TYPES: readonly ReadMealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

/**
 * ⚠ THE BOUNDARY. Whatever came back — the model's JSON, or a body on the device — becomes a
 * `RecipeRead` by copying ONLY the fields above, or null when it is not a readable recipe.
 *
 * `isRecipe: false` (the model's abstain) and a read with no ingredients both return null: a recipe the
 * app cannot build from is not a recipe to it. Any other key — `calories`, `protein`, `nutrition`, a
 * per-serving panel — is never read, so it can never reach a screen (NUT-D4).
 */
export function sanitizeRecipeRead(raw: unknown): RecipeRead | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.isRecipe === false) return null;

  const ingredients: ReadIngredient[] = [];
  for (const item of Array.isArray(d.ingredients) ? d.ingredients : []) {
    if (!item || typeof item !== 'object') continue;
    const x = item as Record<string, unknown>;
    const text = clean(x.text, TEXT_CHARS);
    const food = clean(x.food, FOOD_CHARS);
    if (!text && !food) continue;
    ingredients.push({
      text: text || food,
      quantity: positive(x.quantity, 100_000),
      unit: clean(x.unit, UNIT_CHARS),
      food: food || text,
    });
    if (ingredients.length >= MAX_READ_INGREDIENTS) break;
  }
  if (!ingredients.length) return null;

  const steps = (Array.isArray(d.steps) ? d.steps : [])
    .map((s) => clean(s, STEP_CHARS))
    .filter(Boolean)
    .slice(0, MAX_READ_STEPS);

  const servings = positive(d.servings, 100);
  const minutes = positive(d.minutes, 24 * 60);
  const meal = typeof d.mealType === 'string' ? (d.mealType as ReadMealType) : null;

  return {
    name: clean(d.name, NAME_CHARS),
    servings: servings == null ? null : Math.round(servings),
    minutes: minutes == null ? null : Math.round(minutes),
    mealType: meal && MEAL_TYPES.includes(meal) ? meal : null,
    ingredients,
    steps,
  };
}

/**
 * The model's text → a verdict. `not_a_recipe` is the model's own abstain (`isRecipe: false`);
 * `unreadable` is anything else that did not yield a recipe (bad JSON, no ingredients).
 */
export function readFromModelText(text: string): { ok: true; read: RecipeRead } | { ok: false; reason: 'not_a_recipe' | 'unreadable' } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (parsed && typeof parsed === 'object' && (parsed as { isRecipe?: unknown }).isRecipe === false) {
    return { ok: false, reason: 'not_a_recipe' };
  }
  const read = sanitizeRecipeRead(parsed);
  return read ? { ok: true, read } : { ok: false, reason: 'unreadable' };
}

/* ── the app's side of the wire ─────────────────────────────────────────── */

export type RecipePhotoResult =
  | { kind: 'ok'; read: RecipeRead; remaining: number | null }
  /** Read fine; it is not a recipe. */
  | { kind: 'not_a_recipe' }
  /** Looked, and could not get a recipe out of it. A clearer shot may work. */
  | { kind: 'unreadable' }
  | { kind: 'too_large' }
  | { kind: 'daily_limit' }
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /** No Premium AI — 0203's gate answers with an allowance of 0. */
  | { kind: 'not_entitled' }
  /** No nutrition access — the function's 403. */
  | { kind: 'no_nutrition' }
  | { kind: 'unsupported_format' }
  /** We reached the server and IT failed. Not the athlete's connection, not the photo. */
  | { kind: 'unavailable' }
  /** The app failed. Never conflated with the two above. */
  | { kind: 'offline' };

/** The function's JSON body — from a 200 or a non-2xx alike — as a result. The read is re-guarded here. */
export function recipePhotoResultFrom(body: unknown): RecipePhotoResult {
  if (!body || typeof body !== 'object') return { kind: 'unavailable' };
  const d = body as { ok?: boolean; read?: unknown; reason?: string; remaining?: number; allowance?: number };

  if (d.ok) {
    const read = sanitizeRecipeRead(d.read);
    if (!read) return { kind: 'unreadable' };
    return { kind: 'ok', read, remaining: typeof d.remaining === 'number' ? d.remaining : null };
  }

  switch (d.reason) {
    case 'not_a_recipe':
      return { kind: 'not_a_recipe' };
    case 'unreadable':
      return { kind: 'unreadable' };
    case 'too_large':
      return { kind: 'too_large' };
    case 'daily_limit':
      return { kind: 'daily_limit' };
    case 'no_nutrition':
      return { kind: 'no_nutrition' };
    case 'out_of_credits':
      if (!d.allowance) return { kind: 'not_entitled' };
      return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance };
    case 'bad_request':
      return { kind: 'unsupported_format' };
    default:
      return { kind: 'unavailable' };
  }
}

/** Every failure, in words. An outage never reads as a verdict on the photo. */
export function recipePhotoError(r: Exclude<RecipePhotoResult, { kind: 'ok' }>): string {
  switch (r.kind) {
    case 'not_a_recipe':
      return 'That doesn’t look like a recipe. Try a screenshot of the ingredients and method.';
    case 'unreadable':
      return 'Couldn’t read a recipe out of that picture. A closer, straighter shot usually does it.';
    case 'too_large':
      return 'That image is too big to read. Try a screenshot instead.';
    case 'daily_limit':
      return 'That’s a lot of recipes for one day. Try again tomorrow, or enter this one by hand.';
    case 'out_of_credits':
      return 'You’re out of Premium AI credits for this month. You can still enter the recipe by hand.';
    case 'not_entitled':
      return 'Reading recipes from a picture is part of Premium AI. You can still enter it by hand.';
    case 'no_nutrition':
      return 'Nutrition isn’t turned on for your account yet.';
    case 'unsupported_format':
      return 'That image type can’t be read. Take a screenshot of it and upload that instead.';
    case 'unavailable':
      return 'Recipe reading isn’t working right now. Try again in a bit, or enter it by hand.';
    case 'offline':
    default:
      return 'Couldn’t reach Forge. Check your connection and try again.';
  }
}
