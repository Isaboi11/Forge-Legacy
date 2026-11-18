/**
 * COACH KITCHEN — "What can I make?" Holt writes three dishes from what the athlete has; the app computes
 * every number.
 *
 * `Docs/Holt-Kitchen-Scope-v1.0.md` (LOCKED) §6: *"One Edge Function, `coach-kitchen`, following `coach-ask`'s
 * pattern: auth → `medicalRoute` → reserve credits → model → validate → match numbers → return. Structured
 * output (a fixed JSON shape), never free prose, so the app can check and compute."* The matching runs on the
 * device (`recipe-import.ts` `draftFromRead`, the same code a photographed recipe goes through), so this
 * function returns dishes as ingredient lines and nothing that can carry a calorie (NUT-D4).
 *
 * ══ THE SHAPE ══
 *
 *   0. The request, narrowed (`narrowKitchenRequest`).
 *   1. The code guard on the athlete's words (`medicalRoute`) — before any credit (PO 09-22 legal caution).
 *   2. Nutrition access (`has_nutrition_access()`), before the credit.
 *   3. The day's ceiling.
 *   4. Reserve the credit (`coach_ai_reserve`, `p_action` 'kitchen', 0268) — also the Premium AI gate, the
 *      AI-sharing consent check, and the server's age.
 *   5. One call — Sonnet 5, thinking off, effort low, cached system block, structured output — under this
 *      function's own 45 s abort (AI Sprint 1 contract §3; the app waits 60 s).
 *   6. The guard (`sanitizeKitchenAnswer`), then the output scan (`scanTexts`, Sprint 2 CH-2), then settle ONCE
 *      (`coach_ai_settle`), then the answer. Every failure after the reservation — upstream, timeout, refusal, no
 *      usable dish, a scanner stop (`guarded`) — gives the credits back (P-D2).
 *
 * ══ AGE (P-G8) ══
 *
 * A minor is the server's minor (`coach_ai_reserve`, from the profile) OR the app's flag — the stricter wins. It
 * keeps the "left today" numbers out of the user turn, as before, and the age goes in the user turn as one line
 * (`withAgeLine`). The cached system block is unchanged.
 *
 * ══ THE WIRE ══
 *
 *   { ok: false, reason: 'bad_request' }                                   400
 *   { ok: false, reason: 'stop', route: 'crisis'|'urgent'|'care'|'medical' } 200  (no credit spent)
 *   { ok: false, reason: 'stop', route: 'medical', remaining, refunded: true } 200  (the output scan, after the model)
 *   { ok: false, reason: 'no_nutrition' | 'no_consent' }                   403
 *   { ok: false, reason: 'daily_limit', limit }                            429
 *   { ok: false, reason: 'out_of_credits', remaining, allowance }          200
 *   { ok: false, reason: 'unconfigured'|'meter_unavailable' }              503
 *   { ok: false, reason: 'upstream_error'|'upstream_unreachable', upstream?: 'timeout', remaining, refunded: true } 503
 *   { ok: false, reason: 'none', remaining, refunded: true }               200
 *   { ok: true, options: KitchenDish[], remaining }
 *
 * ⛔ No reply carries the upstream's words (P-D8) or the reservation id.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE SHAPE, THE GUARD AND EVERY CAP — the app imports the same modules.
import {
  KITCHEN_ACTION,
  KITCHEN_OUTPUT_CAP,
  KITCHEN_PER_DAY,
  KITCHEN_SCHEMA,
  kitchenFromModelText,
  kitchenUserTurn,
  narrowKitchenRequest,
} from '../../../src/domain/nutrition/kitchen-dishes.ts';
import { medicalRoute } from '../../../src/domain/coach/medical-routing.ts';
// ⚠ WHAT THE MODEL WROTE, CHECKED BEFORE IT LEAVES (Sprint 2, CH-2) — the scanner coach-ask and the app run.
import { scanStringsOf, scanTexts } from '../../../src/domain/ai/output-scan.ts';
import { KITCHEN_FOODS } from '../../../src/domain/nutrition/kitchen-foods.ts';
// ⚠ ONE SOURCE FOR THE METER: reserve → model → settle, the abort, the age line, and what a failure returns.
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
  withAgeLine,
} from '../../../src/domain/ai/meter-server.ts';
// ⚠ WHAT EACH MODEL IS SENT, AND WHICH MODEL RUNS (Sprint 3b, PL-7) — one request shape per model; the model + effort
// read from coach_ai_model_config (0274), this file's default on any failure.
import { anthropicHeaders, EFFORTS, KNOWN_MODELS, requestFields } from '../../../src/domain/ai/model-request.ts';
import { modelConfigReader, uidFromAuthorization } from '../../../src/domain/ai/model-config.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** This function's deployed slug — the meter's `fn` (0268). */
const FN = 'coach-kitchen';

/** The model already locked for Holt (Holt-AI benchmark 2026-09-24). */
const MODEL = 'claude-sonnet-5';
/** The in-code default effort. `coach_ai_model_config` (0274) can run another model / effort here, 60 s cache (PL-7). */
const EFFORT = 'low';
const modelConfig = modelConfigReader({
  url: SUPABASE_URL,
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  fetch: (u, init) => fetch(u, init),
  known: KNOWN_MODELS,
  efforts: EFFORTS,
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * ⚠ EVERY BYTE IS CACHED AND MUST NOT VARY PER REQUEST. What they have, their words, the exclusions and the
 * rotation seed all go in the user turn (`kitchenUserTurn`).
 */
const SYSTEM = `You are Coach Holt in the kitchen, in the Forge Legacy training and nutrition app. An athlete has told you what food they have, or asked what to make, and you come up with dishes they can cook. You write the dish; the app does the numbers.

# Your entire job

Write exactly the number of options asked for, as JSON in the fixed shape. Each option is a real, cookable home dish built mostly from what they have on hand, plus ordinary pantry staples (oil, salt, pepper, dried spices, garlic, onion, stock, vinegar, soy sauce or hot sauce) when a dish needs them. Never build a dish around something they did not list and that is not a staple.

# Make the options different on purpose

- Every option uses a different cooking method ("pan", "oven", "no-cook", "bowl", "pot", "grill", "air-fryer", "microwave").
- At least two options are from different cuisines. When the message says what to lean toward, use it for one option if it fits what they have.
- Never repeat, or lightly rename, a dish listed as already suggested. "Greek Chicken Bowl" and "Mediterranean Chicken Rice Bowl" are the same dish.
- Plain, appetizing names a person would say out loud: "Crispy Chicken Fried Rice", "Spinach and Feta Egg Scramble". No brand names. At most 45 characters.

# The fields

- "name": the dish.
- "why": one short line on why this one, in Holt's voice — "uses the most of what you have", "fastest of the three", "closest to your protein for the day", "no stove needed". Never a number.
- "cuisine": one or two words ("Mexican", "Korean", "American").
- "method": one of the methods above.
- "minutes": realistic total time, prep plus cook.
- "servings": how many servings the amounts make. Usually 1 or 2; the household size only if they said it.
- "mealType": "breakfast", "lunch", "dinner" or "snacks", or "unknown".
- "ingredients": one entry per ingredient, like a printed recipe.
  - "text": the line as a recipe would print it ("6 oz boneless chicken thighs, sliced").
  - "quantity": the amount as a number, or null for "to taste".
  - "unit": "g" (see Amounts); "large" for eggs; "" when the quantity is null.
  - "food": the food, without amount, unit, brand or preparation. **Use one of the app's food names below, written exactly, whenever one fits** — "rice" is "white rice" or "brown rice", "spinach" is "baby spinach", "oil" is "olive oil", "beans" is "black beans". This is what the app matches to its food database; a name it doesn't know leaves the dish's numbers incomplete. Only when nothing on the list is close, write the plain food in everyday words.
- "steps": 3 to 8 short steps in plain words. Every step a home cook can follow. Include the doneness cue and the safe internal temperature whenever meat, poultry, fish or eggs are cooked (USDA: poultry 165°F, ground meat 160°F, whole cuts of beef, pork and lamb 145°F then rest 3 minutes, fish 145°F).

# Amounts

**Give every amount by weight: "quantity" in grams and "unit" "g".** The app converts grams exactly; cans, handfuls, pieces and cups often can't be converted. The "text" line can say it the way a cook would ("6 oz chicken thighs"), but "quantity" and "unit" are grams. The only exceptions: eggs are a count (quantity 2, unit "large"), and salt, pepper, dried herbs and spices used "to taste" have quantity null.

**Weigh rice, pasta, noodles, quinoa, couscous, bulgur, barley, lentils and oats DRY (uncooked)** — that is how the app's food data counts them. A serving of rice or pasta is 50 to 90 g dry; oats 40 to 60 g dry.

Real amounts for the servings you give: a portion of meat or fish is usually 110 to 225 g raw, oil 5 to 30 g for the whole dish. Never an amount no one cooks.

# The app's food names

${KITCHEN_FOODS}

# Hard rules

**Never write a nutrition number** — no calories, protein, carbs, fat or grams-of-protein, anywhere, including "why" and "steps". There is no field for them. The app calculates every number itself from the ingredients.

**A food on the "never use" line is never in any dish,** not as an ingredient, a garnish, a sauce or an option. That includes foods that contain it: peanut means no peanut butter or satay; dairy means no butter, cheese, yogurt, cream or milk; gluten means no regular pasta, bread, flour, tortillas or soy sauce (tamari is fine); shellfish means no shrimp, crab, lobster or scallops; eggs means no mayonnaise. If you are not sure whether something contains it, leave it out.

**Never mention the athlete's body, weight or intake,** and never tell them to eat less. If today's numbers are given, lean the options toward them (more protein when protein is behind) without saying so.

**No medical or diet advice.** You are a cook here. Nothing about conditions, medications, detoxes, fasting or supplements. Food only.

**Your own recipes, not someone else's.** Write every dish in your own words. Never copy a published recipe or name a recipe site.

If what they listed is too thin to make anything real from, still write the best simple options you can with pantry staples. Never return an empty list.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  // ⚠ The browser's preflight — without it the web app's call fails silently (`feedback_edge_function_needs_cors`).
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!ANTHROPIC_API_KEY) return json({ ok: false, reason: 'unconfigured' }, 503);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, reason: 'bad_request' }, 400);
  }

  // ── 0. The request ──────────────────────────────────────────────────────────
  const request = narrowKitchenRequest(raw);
  if (!request.ask && !request.have.length) return json({ ok: false, reason: 'bad_request' }, 400);

  // ── 1. The code guard, BEFORE anything is spent ─────────────────────────────
  // The athlete's own words: their sentence and what they typed as "on hand". The app runs the same guard.
  const guard = medicalRoute(`${request.ask} ${request.have.join(', ')}`.trim());
  if (guard !== 'clear') {
    const route = guard === 'crisis' || guard === 'urgent' || guard === 'care' ? guard : 'medical';
    return json({ ok: false, reason: 'stop', route });
  }

  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } });

  // ── 2. Nutrition access, BEFORE the credit ──────────────────────────────────
  const { data: mayUseNutrition, error: gateError } = await supabase.rpc('has_nutrition_access');
  if (gateError || mayUseNutrition !== true) return json({ ok: false, reason: 'no_nutrition' }, 403);

  // ── 3. The day's ceiling ────────────────────────────────────────────────────
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('coach_ai_spend')
    .select('id', { count: 'exact', head: true })
    .eq('action', KITCHEN_ACTION)
    .gte('occurred_at', since.toISOString());
  if (!countError && (count ?? 0) >= KITCHEN_PER_DAY) return json({ ok: false, reason: 'daily_limit', limit: KITCHEN_PER_DAY }, 429);

  // ── 4. Reserve the credit — the Premium AI gate (0203), the consent check and the server's age (0268) ──
  //
  // The credits are HELD until step 6 settles them; every failure from here on gives them back (P-D2).
  // ⛔ `meter.id` (the reservation) stays in this function — no reply carries it.
  const { data: reservedRow, error: reserveError } = await supabase
    .rpc('coach_ai_reserve', { p_action: KITCHEN_ACTION, p_fn: FN })
    .maybeSingle();
  const meter = reserveFrom(reservedRow, reserveError);
  if (!meter.ok) {
    if (meter.reason === 'meter_unavailable') return json({ ok: false, reason: 'meter_unavailable' }, 503);
    if (meter.reason === 'no_consent') return json({ ok: false, reason: 'no_consent' }, 403);
    // No Premium AI reads as out_of_credits with an allowance of 0, as it always has (0203).
    return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
  }
  const choice = await modelConfig.pick(FN, uidFromAuthorization(authorization), { model: MODEL, effort: EFFORT });
  const model = choice.model;
  // Thinking off, effort low (or the configured effort), in the form THIS model takes, + the refusal fallback where it
  // exists (model-request.ts: Sonnet 5 / Haiku 5.5 `disabled`, Sonnet 5.5 `between_tools`, Opus 5.5 no field).
  const modelFields = requestFields(model, {
    thinkingOff: true,
    effort: choice.effort ?? EFFORT,
    format: { type: 'json_schema', schema: KITCHEN_SCHEMA },
  });
  /** Settled ONCE, before the answer is returned (contract §1.3). Every outcome but `ok` refunds. */
  const settle = async (outcome: SettleOutcome, call: ModelCall) => {
    const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, callFacts(call, model))).maybeSingle();
    return settledTail(settledFrom(data, error), meter.remaining);
  };

  // P-G8: the stricter of the server's minor (from the profile) and the app's flag. A minor gets no "left today"
  // numbers (as before) and the conservative-advice line.
  const minor = request.minor || meter.minor;

  // ── 5. The model call, under this function's own abort (contract §3) ───────
  const call = await timedModelCall(
    (signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: anthropicHeaders(ANTHROPIC_API_KEY!, modelFields),
        body: JSON.stringify({
          model,
          max_tokens: KITCHEN_OUTPUT_CAP,
          // ⛔ The schema is the NUT-D4 wall: it has no field for a nutrition number.
          ...modelFields,
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          // The age is per request, so it is in the user turn — never the cached block.
          messages: [{ role: 'user', content: withAgeLine(kitchenUserTurn({ ...request, minor }), meter.ageYears, minor) }],
        }),
      }),
    UPSTREAM_ABORT_MS[FN],
  );

  // Unreachable, a non-2xx, or our own abort: refunded. The upstream's words are in this function's log only (P-D8).
  if (call.kind !== 'ok') {
    return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind, call)) }, 503);
  }
  const payload = call.payload;

  if (payload?.stop_reason === 'refusal') return json({ ok: false, reason: 'none', ...(await settle('refusal', call)) });

  const text: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');

  // ── 6. THE BOUNDARY — runs after the model and overrules it (NUT-D4, forced spread, no repeats) — then the settle ──
  // No usable dish is refunded.
  const options = kitchenFromModelText(text, request.exclude);
  if (!options.length) {
    return json({ ok: false, reason: 'none', ...(await settle(payload?.stop_reason === 'max_tokens' ? 'truncated' : 'bad_output', call)) });
  }
  // ⛔ THE OUTPUT SCAN (Sprint 2, CH-2 · contract §1.1): every field of every dish Holt wrote — name, "why", each step,
  // each ingredient line — read on its own. A dose, a reassurance, a diagnosis or a clinical word is the existing stop
  // (`reason: 'stop'`, which every app shows as the stop card), settled `guarded` and refunded. Food amounts flow:
  // "200 g chicken" is not a dose (the scanner's corpus holds the kitchen's real dishes to that).
  if (scanTexts(scanStringsOf(options, 400), request.ask).hit) {
    return json({ ok: false, reason: 'stop', route: 'medical', ...(await settle('guarded', call)) });
  }
  return json({ ok: true, options, ...(await settle('ok', call)) });
});
