/**
 * MEAL PHOTO READ — a photo of a plate becomes a list of foods and estimated portions.
 *
 * PO, 2026-09-25: *"let's build the photo food logging."* Nutrition Architecture §2 ("Log a meal from a
 * photo" — Premium AI, credits) and §5 (one meter, weight `meal_photo`, Sonnet for photos). Built on
 * `recipe-photo-read`'s pattern: the model looks, code guards the answer, and the app — not the model —
 * decides what the meal is worth.
 *
 * ══ ⛔ NUT-D4: THE MODEL NEVER WRITES A NUTRITION NUMBER ══
 *
 * The answer is structured output against `MEAL_READ_SCHEMA`, which has no field that can carry a calorie
 * or a macro, and `readFromModelText` (→ `sanitizeMealRead`) copies only the whitelisted fields. The model
 * names each food, gives a food-database search phrase, and estimates the portion. The app searches
 * `food-search` for every item and computes every number from the matched food
 * (`src/domain/nutrition/meal-photo-match.ts`). The athlete reviews each row before anything is logged.
 *
 * ══ THE SHAPE ══
 *
 *   0. Validate the image — refused before anything is spent.
 *   1. Nutrition access (`has_nutrition_access()`, as the caller) — 403 otherwise, before the credit.
 *   2. The day's ceiling.
 *   3. Reserve the credit (`coach_ai_reserve`, `p_action` 'meal_photo', 0268) — which is also the Premium AI
 *      gate (0203: no add-on, out_of_credits with an allowance of 0) and the AI-sharing consent check.
 *   4. One vision call — Sonnet 5, thinking off, effort low, cached system block, structured output — under
 *      this function's own 75 s abort (AI Sprint 1 contract §3; the app waits 90 s).
 *   5. The guard, then settle ONCE (`coach_ai_settle`, all four token counts), then the answer. Every failure
 *      after the reservation — upstream, timeout, refusal, not food, unreadable — gives the credit back (P-D2).
 *
 * No age line (P-G8): the model returns names and amounts, never advice, so the age could not change the answer.
 *
 * There is no `medicalRoute` step because there are no athlete words: the request is an image and nothing
 * else. The answer carries no sentence about a person — only foods and amounts.
 *
 * ⚠ THE PHOTO IS NEVER STORED (NUT-D7). It is held in this request's memory, sent to the model once, and
 * dropped. No bucket, no row, no log line carries it.
 *
 * ══ THE WIRE (to the app) ══
 *
 *   Refused:  { ok: false, reason: 'bad_request' | 'too_large' }                                  400
 *             { ok: false, reason: 'no_nutrition' }                                               403
 *             { ok: false, reason: 'no_consent' }                                                 403
 *             { ok: false, reason: 'daily_limit', limit }                                         429
 *             { ok: false, reason: 'out_of_credits', remaining, allowance }                        200
 *             { ok: false, reason: 'unconfigured' | 'meter_unavailable' }                          503
 *             { ok: false, reason: 'upstream_error' | 'upstream_unreachable', upstream?: 'timeout',
 *               remaining, refunded: true }                                                       503
 *             { ok: false, reason: 'not_food' | 'unreadable', remaining, refunded: true }          200
 *   Read:     { ok: true, read: { items: [{ name, search, amount, unit, grams, confidence }] }, remaining }
 *
 * ⛔ No reply carries the upstream's words (P-D8) or the reservation id.
 *
 * `ANTHROPIC_API_KEY` is an Edge Function secret and lives nowhere else — the same note at the top of
 * `program-photo-read`. Expo inlines `EXPO_PUBLIC_*` into the bundle.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE SHAPE, THE GUARD AND EVERY CAP — the app imports the same module.
import {
  MEAL_PHOTO_ACTION,
  MEAL_PHOTO_MAX_BASE64,
  MEAL_PHOTO_MEDIA,
  MEAL_PHOTO_OUTPUT_CAP,
  MEAL_PHOTO_PER_DAY,
  MEAL_READ_SCHEMA,
  readFromModelText,
} from '../../../src/domain/nutrition/meal-photo-read.ts';
// ⚠ ONE SOURCE FOR THE METER: reserve → model → settle, the abort, and what a failure returns (AI Sprint 1).
import {
  callFacts,
  failedCallReply,
  type ModelCall,
  reserveFrom,
  settleArgs,
  settledFrom,
  settledTail,
  type SettleOutcome,
  timedModelCall,
  UPSTREAM_ABORT_MS,
} from '../../../src/domain/ai/meter-server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** This function's deployed slug — the meter's `fn` (0268). */
const FN = 'meal-photo-read';

/** The same model `recipe-photo-read` and `program-photo-read` use — Architecture §5: "Sonnet 5 for photos". */
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
 * ⚠ EVERY BYTE IS CACHED AND MUST NOT VARY PER REQUEST. No athlete id, no timestamp, no meal name. The
 * image goes in the user turn. Sonnet 5's minimum cacheable prefix is 1024 tokens; if
 * `usage.cache_read_input_tokens` is zero across repeated calls, something variable has been added here.
 */
const SYSTEM = `You look at photos of meals for the Forge Legacy nutrition app. An athlete has photographed what they are about to eat, or just ate, so they can log it in their private food diary. You list the foods you can see and estimate how much of each is there, in a fixed JSON shape, and nothing else.

# Your entire job

Name each food on the plate and estimate its portion. You are a careful observer, not a nutritionist. The app does everything else: it searches its food databases (USDA, restaurant data, packaged-food labels) for each item you name, takes the calories and macros from the database match, and shows the athlete every item to check, change or remove before anything is logged.

# The fields

- "isFood": true when the photo shows food or drink someone is eating or about to eat. False for anything else.
- "items": one entry per distinct food, in a sensible order (main, sides, sauces, drinks).
  - "name": the food in plain everyday words, the way the athlete would say it: "grilled chicken breast", "white rice", "steamed broccoli", "caesar salad", "cheeseburger", "glass of orange juice". Keep it short.
  - "search": a short phrase to search a food database with — the food's common database name, most important word first, without amounts: "chicken breast grilled", "rice white cooked", "broccoli steamed", "caesar salad", "cheeseburger". When the brand or restaurant is plainly visible (a wrapper, a logo, a labelled package, a branded cup), put it in: "big mac mcdonalds", "chipotle chicken burrito bowl", "chobani greek yogurt vanilla". Never guess a brand you cannot see.
  - "amount" and "unit": the portion in the household measure a person would use for that food: 1.5 "cup" of rice, 2 "slice" of pizza, 1 "medium" apple, 2 "tbsp" of dressing, 3 "piece" of sushi, 1 "can" of soda. Use "piece" for countable things with no better word. amount null only when no household measure makes sense.
  - "grams": your best estimate of the weight of that portion in grams, as eaten. Always give it when you can see the food.
  - "confidence": how sure you are of WHAT the food is (not of the amount). "high" when it is unmistakable, "medium" when it is probably right, "low" when you are guessing between similar foods.

# Estimating portions

Use what is in the frame for scale: a standard dinner plate is about 26 cm (10 in) across, a side plate about 20 cm, a fork about 19 cm, a can 12 cm tall, a hand about 18 cm long. A cooked chicken breast is usually 120 to 200 g. A cup of cooked rice or pasta is about 160 to 200 g. A slice of bread is about 30 to 40 g. A tablespoon of oil or dressing is about 14 g. Estimate what is actually on the plate, not a standard serving; if half a sandwich is left, count what is there. When the photo shows a meal part-eaten, estimate what remains.

# Splitting and combining

List foods the way a food diary would. A burger is one item, not bun, patty and cheese. A mixed dish (a curry, a stir fry, a burrito bowl, a salad with toppings) is one item unless its parts are clearly separate on the plate. Plated components that are separate — meat, a starch, a vegetable — are separate items. A visible sauce, dressing, butter or oil in a noticeable amount is its own item. A drink in the frame that is clearly with the meal is its own item; plain water is not listed.

Never list more than twelve items. For a spread (a buffet, a shared table), list only what is on the plate nearest the camera.

# Worked items

These show how something on a plate becomes one entry. Follow the pattern; do not copy the examples into an answer.

- A grilled chicken breast beside rice → name "grilled chicken breast", search "chicken breast grilled", amount 1, unit "piece", grams 170, confidence "high".
- A mound of white rice about the size of a fist → name "white rice", search "rice white cooked", amount 1, unit "cup", grams 180.
- Two slices of pepperoni pizza → name "pepperoni pizza", search "pepperoni pizza", amount 2, unit "slice", grams 220.
- A McDonald's Big Mac in its box, logo visible → name "Big Mac", search "big mac mcdonalds", amount 1, unit "piece", grams 215.
- A bowl of oatmeal topped with blueberries → two items: "oatmeal" (amount 1, unit "cup", grams 240) and "blueberries" (amount 0.25, unit "cup", grams 37).
- A drizzle of ranch dressing on a salad → its own item: name "ranch dressing", search "ranch dressing", amount 2, unit "tbsp", grams 30.
- A can of cola beside the plate → name "cola", search "cola soda", amount 1, unit "can", grams 368.
- A curry you cannot tell is chicken or lamb → name "meat curry", search "curry chicken", confidence "low".

# What you must never do

**Never write a nutrition number.** No calories, protein, carbs, fat, sugar, sodium, points or "per serving" figures, even if a label or menu in the photo prints them. There is no field for them and the app will never use them — it takes its own from the food database.

**Never invent a food you cannot see.** Do not add a drink, a sauce or a side because meals like this usually have one. If something is hidden or ambiguous, list what you can see and mark "confidence" "low" rather than guess what is underneath.

**Never comment on the meal.** Do not judge it as healthy or unhealthy, large or small, and do not suggest changes. The athlete asked what is on the plate, not for advice.

**Never describe the photo, the room, or anyone in it.** If a person, a face or a hand is visible, list the food and say nothing about them.

# When it is not a meal

If the photo does not show food or drink — a person, a pet, a landscape, a document, a screenshot of a conversation, a blank or dark image — set "isFood" to false and "items" to an empty list. A nutrition label, a menu or a recipe page is not a meal either: set "isFood" to false. Do not explain.

If the photo shows food you can only partly make out, list what you can make out. A partial list is still useful; the athlete reviews every item before it is saved.`;

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
  if (image.length > MEAL_PHOTO_MAX_BASE64) return json({ ok: false, reason: 'too_large' }, 400);
  if (!MEAL_PHOTO_MEDIA.includes(mediaType)) return json({ ok: false, reason: 'bad_request' }, 400);

  // The caller's JWT, so every RPC runs as that athlete under RLS. No service key here, deliberately.
  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  // ── 1. Nutrition access, BEFORE the credit ──────────────────────────────────
  //
  // `has_nutrition_access()` reads `auth.uid()`, so it is asked through the caller's client — the same
  // shape `food-search` and `recipe-photo-read` use. A read for someone who cannot open Nutrition is money
  // for a diary they cannot write to.
  const { data: mayUseNutrition, error: gateError } = await supabase.rpc('has_nutrition_access');
  if (gateError || mayUseNutrition !== true) return json({ ok: false, reason: 'no_nutrition' }, 403);

  // ── 2. The day's ceiling ────────────────────────────────────────────────────
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('coach_ai_spend')
    .select('id', { count: 'exact', head: true })
    .eq('action', MEAL_PHOTO_ACTION)
    .gte('occurred_at', since.toISOString());
  // A counter that cannot be read must not block the feature — the monthly meter still bounds the spend.
  if (!countError && (count ?? 0) >= MEAL_PHOTO_PER_DAY) {
    return json({ ok: false, reason: 'daily_limit', limit: MEAL_PHOTO_PER_DAY }, 429);
  }

  // ── 3. Reserve the credit BEFORE the model call — the Premium AI gate (0203) and the consent check (0268) ──
  //
  // The credit is HELD until step 5 settles it; every failure from here on gives it back (P-D2).
  // ⛔ `meter.id` (the reservation) stays in this function — no reply carries it.
  const { data: reservedRow, error: reserveError } = await supabase
    .rpc('coach_ai_reserve', { p_action: MEAL_PHOTO_ACTION, p_fn: FN })
    .maybeSingle();
  const meter = reserveFrom(reservedRow, reserveError);
  if (!meter.ok) {
    if (meter.reason === 'meter_unavailable') return json({ ok: false, reason: 'meter_unavailable' }, 503);
    if (meter.reason === 'no_consent') return json({ ok: false, reason: 'no_consent' }, 403);
    // No Premium AI reads as out_of_credits with an allowance of 0, as it always has (0203).
    return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
  }
  /** Settled ONCE, before the answer is returned (contract §1.3). Every outcome but `ok` refunds. */
  const settle = async (outcome: SettleOutcome, call: ModelCall) => {
    const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, callFacts(call, MODEL))).maybeSingle();
    return settledTail(settledFrom(data, error), meter.remaining);
  };

  // ── 4. The model call, under this function's own abort (contract §3) ────────
  const call = await timedModelCall(
    (signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MEAL_PHOTO_OUTPUT_CAP,
          // Looking, not reasoning — and the guard is code. Same settings as `recipe-photo-read`.
          thinking: { type: 'disabled' },
          // ⛔ The schema is the NUT-D4 wall: it has no field for a nutrition number.
          output_config: { effort: 'low', format: { type: 'json_schema', schema: MEAL_READ_SCHEMA } },
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
                { type: 'text', text: 'List the foods in this meal.' },
              ],
            },
          ],
        }),
      }),
    UPSTREAM_ABORT_MS[FN],
  );

  // Unreachable, a non-2xx, or our own abort: refunded. The upstream's words are in this function's log only (P-D8).
  if (call.kind !== 'ok') {
    return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind, call)) }, 503);
  }
  const payload = call.payload;

  // A safety refusal is the model declining, not the app failing — the same copy as an unreadable photo. Refunded.
  if (payload?.stop_reason === 'refusal') {
    return json({ ok: false, reason: 'unreadable', ...(await settle('refusal', call)) });
  }

  const text: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');

  // ── 5. THE BOUNDARY, then the settle ────────────────────────────────────────
  //
  // ⚠ RUNS AFTER THE MODEL AND OVERRULES IT. Only the whitelisted fields survive; any nutrition number,
  // any extra key, is dropped here (NUT-D4). The app runs the same guard again on what arrives.
  // Not food, or nothing readable: refunded — the athlete pays only for a read they can use.
  const verdict = readFromModelText(text);
  if (!verdict.ok) {
    const outcome: SettleOutcome =
      verdict.reason === 'not_food' ? 'not_a_program' : payload?.stop_reason === 'max_tokens' ? 'truncated' : 'unreadable';
    return json({ ok: false, reason: verdict.reason, ...(await settle(outcome, call)) });
  }

  return json({ ok: true, read: verdict.read, ...(await settle('ok', call)) });
});
