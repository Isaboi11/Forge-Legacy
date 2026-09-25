/**
 * RECIPE PHOTO READ — a screenshot of a recipe becomes a draft in My Recipes.
 *
 * PO, 2026-09-25: *"take a screenshot of a recipe and put it into the meals/recipes just like we do with
 * pictures of programs."* Built on `program-photo-read`'s pattern: the model reads the page, code guards
 * the answer, and the app — not the model — decides what the recipe is worth.
 *
 * ══ ⛔ NUT-D4: THE MODEL NEVER WRITES A NUTRITION NUMBER ══
 *
 * The answer is structured output against `RECIPE_READ_SCHEMA`, which has no field that can carry a
 * calorie or a macro, and `readFromModelText` (→ `sanitizeRecipeRead`) copies only the whitelisted fields
 * after the model answers. A recipe card's own nutrition panel is ignored by the prompt, cannot be
 * expressed by the schema, and would be dropped by the guard. The app computes every number from its
 * USDA catalogue (`src/domain/nutrition/recipe-import.ts`).
 *
 * ══ THE SHAPE ══
 *
 *   0. Validate the image — refused before anything is spent.
 *   1. Nutrition access (`has_nutrition_access()`, as the caller) — 403 otherwise, before the credit.
 *   2. The day's ceiling.
 *   3. Reserve the credit (`coach_ai_spend_credits`, `p_action` 'recipe_photo', 0220) — which is also the
 *      Premium AI gate (0203): no add-on, `allowed` false with an allowance of 0.
 *   4. One vision call — Sonnet 5, thinking off, effort low, cached system block, structured output.
 *   5. Record what it cost — all four token counts.
 *   6. The guard, then the answer.
 *
 * There is no `medicalRoute` step because there are no athlete words: the request is an image and
 * nothing else. The answer carries no sentence about a person — only a recipe's fields.
 *
 * ══ THE WIRE (to the app) ══
 *
 *   Refused:  { ok: false, reason: 'bad_request' | 'too_large' }                                  400
 *             { ok: false, reason: 'no_nutrition' }                                               403
 *             { ok: false, reason: 'daily_limit', limit }                                         429
 *             { ok: false, reason: 'out_of_credits', remaining, allowance }                        200
 *             { ok: false, reason: 'unconfigured' | 'meter_unavailable' | 'upstream_error' |
 *                                  'upstream_unreachable' }                                        503
 *             { ok: false, reason: 'not_a_recipe' | 'unreadable', remaining }                      200
 *   Read:     { ok: true, read: { name, servings, minutes, mealType, ingredients[], steps[] }, remaining }
 *
 * ⚠ A PHOTOGRAPHED RECIPE IS THE ATHLETE'S PERSONAL COPY (third-party provenance): it is saved only to
 * their own `user_recipes` (owner-only, 0213) and never shared or published. Steps are rewritten briefly.
 *
 * `ANTHROPIC_API_KEY` is an Edge Function secret and lives nowhere else — the same note at the top of
 * `program-photo-read`. Expo inlines `EXPO_PUBLIC_*` into the bundle.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE SHAPE, THE GUARD AND EVERY CAP — the app imports the same module.
import {
  RECIPE_PHOTO_ACTION,
  RECIPE_PHOTO_MAX_BASE64,
  RECIPE_PHOTO_MEDIA,
  RECIPE_PHOTO_OUTPUT_CAP,
  RECIPE_PHOTO_PER_DAY,
  RECIPE_READ_SCHEMA,
  readFromModelText,
} from '../../../src/domain/nutrition/recipe-photo-read.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** The same model `program-photo-read` and `coach-form-check` use. One model is one set of numbers. */
const MODEL = 'claude-sonnet-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SYSTEM PROMPT — one stable block, cached
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ EVERY BYTE IS CACHED AND MUST NOT VARY PER REQUEST. No athlete id, no timestamp, no filename. The
 * image goes in the user turn. Sonnet 5's minimum cacheable prefix is 1024 tokens; if
 * `usage.cache_read_input_tokens` is zero across repeated calls, something variable has been added here.
 */
const SYSTEM = `You read recipes from pictures for the Forge Legacy nutrition app. An athlete has taken a screenshot or photo of a recipe they want to keep in their own private recipe list. You write down what the page says, in a fixed JSON shape, and nothing else.

# Your entire job

Read the recipe in the image and fill in the fields. You are a careful reader, not a cook, a nutritionist or an editor. The app does everything else: it matches each ingredient to its own food database, works out the grams, calculates the calories and macros itself, and shows the athlete every line to check before anything is saved.

# The fields

- "isRecipe": true when the image shows a recipe (a list of ingredients, usually with a method). False for anything else.
- "name": the recipe's title as written. Keep it short; if the title is long, keep its first few words. Empty string if there is no title.
- "servings": the number of servings or portions the page says it makes ("Serves 4", "Makes 6 bowls", "Yield: 2"). If it gives a range, use the first number. null if the page does not say.
- "minutes": the total time the page states, in minutes. If it gives prep and cook separately, add them. null if the page does not say. Never estimate a time the page does not print.
- "mealType": your best reading of which meal it is for: "breakfast", "lunch", "dinner" or "snacks" (desserts, bars, bites and drinks are snacks). "unknown" when nothing on the page suggests one. The athlete can change it.
- "ingredients": one entry per ingredient line, in the page's order.
  - "text": the line exactly as written, including the amount and any prep notes ("2 cloves garlic, minced").
  - "quantity": the amount as a number. Convert fractions and mixed numbers ("1 1/2" is 1.5, "½" is 0.5, "¾" is 0.75). For a range ("2-3 cups") use the first number. null when the line has no amount ("salt to taste", "oil for frying").
  - "unit": the unit as written, shortened the usual way where there is one: "cup", "tbsp", "tsp", "g", "kg", "oz", "lb", "ml", "l", "fl oz", or the counting word the page uses ("cloves", "slices", "large", "can"). Empty string when the amount is a plain count ("2 eggs").
  - "food": the plain food, in everyday words, WITHOUT the amount, the unit, the brand or the preparation. "2 cloves garlic, minced" is "garlic". "1 lb boneless skinless chicken breasts, cubed" is "chicken breasts". "1 cup long-grain white rice, rinsed" is "long-grain white rice". "Kerrygold butter, softened" is "butter". Keep a word that changes what the food is ("smoked salmon", "brown sugar", "whole wheat bread").
- "steps": the method, one entry per step, rewritten briefly in plain words — a short sentence or two each, in your own words, not copied. Keep every temperature, time and doneness cue the page gives. Empty list if the page has no method.

# Worked ingredient lines

These show how a printed line becomes one entry. Follow the pattern; do not copy the examples into an answer.

- "1 1/2 cups whole milk" → text "1 1/2 cups whole milk", quantity 1.5, unit "cup", food "whole milk".
- "3 Tbsp. extra-virgin olive oil, divided" → quantity 3, unit "tbsp", food "olive oil".
- "2 tsp ground cumin" → quantity 2, unit "tsp", food "cumin".
- "200g dried spaghetti" → quantity 200, unit "g", food "spaghetti".
- "1 (14.5 oz) can diced tomatoes, undrained" → quantity 1, unit "can", food "canned tomatoes".
- "4 large eggs, beaten" → quantity 4, unit "large", food "eggs".
- "1 medium onion, finely chopped" → quantity 1, unit "medium", food "onion".
- "Juice of 1 lemon" → quantity 1, unit "", food "lemon".
- "Salt and pepper, to taste" → one line, quantity null, unit "", food "salt and pepper".
- "Fresh cilantro, for garnish" → quantity null, unit "", food "cilantro".
- "1/4 cup (60 ml) maple syrup" → use the first amount the page gives: quantity 0.25, unit "cup", food "maple syrup".

Section headings inside an ingredient list ("For the sauce:", "Topping") are not ingredients; skip them, and read the lines under them normally.

# What you must never do

**Never write a nutrition number.** Recipe pages often print calories, protein, carbs, fat, sugar, sodium or "per serving" figures. Ignore all of them completely. There is no field for them and the app will never use them — it calculates its own from the ingredients.

**Never invent an ingredient or an amount.** If a line is cut off, blurred or you are unsure of a number, set "quantity" to null rather than guess. A missing amount is shown to the athlete to fill in; a guessed one looks exactly like one the recipe wrote, and nobody can tell it is wrong.

**Never add ingredients the page does not list,** even ones the method mentions in passing or that a cook would obviously need. Never merge two lines into one or split one line into two. If the page lists the same food twice (for the sauce and for the topping), keep both lines.

**Never correct the recipe.** Transcribe amounts as printed, even if they look unusual.

**Never describe the image,** the page, the website, or anyone in the picture. If a person is visible, read the recipe and say nothing about them.

# When it is not a recipe

If the image does not show a recipe — a photo of a meal with no ingredient list, a nutrition label, a receipt, a menu, a conversation, a person, a landscape, a blank page — set "isRecipe" to false, "name" to "", "servings" and "minutes" to null, "mealType" to "unknown", and both lists empty. Do not explain.

If the image shows a recipe you can only partly read, fill in the part you can read. Partly read is still a recipe; the athlete reviews everything before it is saved.`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface Body {
  /** Base64 image data, no data-URI prefix. */
  image?: string;
  mediaType?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  // ⚠ The browser's preflight. Without this answer the web app's call fails before it is sent, with
  // nothing in the function's logs (`feedback_edge_function_needs_cors`).
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!ANTHROPIC_API_KEY) return json({ ok: false, reason: 'unconfigured' }, 503);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'bad_request' }, 400);
  }

  // ── 0. The image ────────────────────────────────────────────────────────────
  const image = (typeof body.image === 'string' ? body.image : '').trim();
  const mediaType = body.mediaType ?? 'image/jpeg';
  if (!image) return json({ ok: false, reason: 'bad_request' }, 400);
  if (image.length > RECIPE_PHOTO_MAX_BASE64) return json({ ok: false, reason: 'too_large' }, 400);
  if (!RECIPE_PHOTO_MEDIA.includes(mediaType)) return json({ ok: false, reason: 'bad_request' }, 400);

  // The caller's JWT, so every RPC runs as that athlete under RLS. No service key here, deliberately.
  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  // ── 1. Nutrition access, BEFORE the credit ──────────────────────────────────
  //
  // `has_nutrition_access()` reads `auth.uid()`, so it is asked through the caller's client — the same
  // shape `food-search` uses. A recipe read for someone who cannot open Nutrition is money for a screen
  // they cannot reach.
  const { data: mayUseNutrition, error: gateError } = await supabase.rpc('has_nutrition_access');
  if (gateError || mayUseNutrition !== true) return json({ ok: false, reason: 'no_nutrition' }, 403);

  // ── 2. The day's ceiling ────────────────────────────────────────────────────
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('coach_ai_spend')
    .select('id', { count: 'exact', head: true })
    .eq('action', RECIPE_PHOTO_ACTION)
    .gte('occurred_at', since.toISOString());
  // A counter that cannot be read must not block the feature — the monthly meter still bounds the spend.
  if (!countError && (count ?? 0) >= RECIPE_PHOTO_PER_DAY) {
    return json({ ok: false, reason: 'daily_limit', limit: RECIPE_PHOTO_PER_DAY }, 429);
  }

  // ── 3. Reserve the credit BEFORE the model call — and the Premium AI gate (0203) ──
  const { data: spend, error: spendError } = await supabase
    .rpc('coach_ai_spend_credits', { p_action: RECIPE_PHOTO_ACTION })
    .maybeSingle();

  if (spendError) return json({ ok: false, reason: 'meter_unavailable' }, 503);

  const reserved = spend as
    | { allowed: boolean; credits_spent: number; remaining: number; allowance: number }
    | null;
  if (!reserved?.allowed) {
    return json({
      ok: false,
      reason: 'out_of_credits',
      remaining: reserved?.remaining ?? 0,
      allowance: reserved?.allowance ?? 0,
    });
  }

  // ── 4. The model call ───────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: RECIPE_PHOTO_OUTPUT_CAP,
        // Reading, not reasoning — and the guard is code. Same settings as `program-photo-read`.
        thinking: { type: 'disabled' },
        // ⛔ The schema is the NUT-D4 wall: it has no field for a nutrition number.
        output_config: { effort: 'low', format: { type: 'json_schema', schema: RECIPE_READ_SCHEMA } },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
              { type: 'text', text: 'Read this recipe.' },
            ],
          },
        ],
      }),
    });
  } catch {
    return json({ ok: false, reason: 'upstream_unreachable' }, 503);
  }

  if (!response.ok) {
    console.error('anthropic', response.status, (await response.text().catch(() => '')).slice(0, 800));
    // Recorded so the 60-day run does not under-count; credits stay spent (see `coach-interpret`).
    await supabase.rpc('coach_ai_record_usage', {
      p_action: RECIPE_PHOTO_ACTION, p_credits: reserved.credits_spent, p_model: MODEL,
      p_input_tokens: 0, p_output_tokens: 0,
      p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
      p_uncharged: true,
    });
    return json({ ok: false, reason: 'upstream_error' }, 503);
  }

  const payload = await response.json();
  const usage = payload?.usage ?? {};

  // ── 5. Record what it actually cost — all four counts separately ────────────
  await supabase.rpc('coach_ai_record_usage', {
    p_action: RECIPE_PHOTO_ACTION,
    p_credits: reserved.credits_spent,
    p_model: payload?.model ?? MODEL,
    p_input_tokens: usage.input_tokens ?? 0,
    p_output_tokens: usage.output_tokens ?? 0,
    p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    p_uncharged: false,
  });

  // A safety refusal is the model declining, not the app failing — the same copy as an unreadable image.
  if (payload?.stop_reason === 'refusal') {
    return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
  }

  const text: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');

  // ── 6. THE BOUNDARY ─────────────────────────────────────────────────────────
  //
  // ⚠ RUNS AFTER THE MODEL AND OVERRULES IT. Only the whitelisted fields survive; any nutrition number,
  // any extra key, is dropped here (NUT-D4). The app runs the same guard again on what arrives.
  const verdict = readFromModelText(text);
  if (!verdict.ok) return json({ ok: false, reason: verdict.reason, remaining: reserved.remaining });

  return json({ ok: true, read: verdict.read, remaining: reserved.remaining });
});
