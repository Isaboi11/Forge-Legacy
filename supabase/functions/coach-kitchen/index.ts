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
 *   4. Reserve the credit (`coach_ai_spend_credits`, `p_action` 'kitchen', 0222) — also the Premium AI gate.
 *   5. One call — Sonnet 5, thinking off, effort low, cached system block, structured output.
 *   6. Record what it cost. 7. The guard (`sanitizeKitchenAnswer`), then the answer.
 *
 * ══ THE WIRE ══
 *
 *   { ok: false, reason: 'bad_request' }                                   400
 *   { ok: false, reason: 'stop', route: 'crisis'|'urgent'|'care'|'medical' } 200  (no credit spent)
 *   { ok: false, reason: 'no_nutrition' }                                  403
 *   { ok: false, reason: 'daily_limit', limit }                            429
 *   { ok: false, reason: 'out_of_credits', remaining, allowance }          200
 *   { ok: false, reason: 'unconfigured'|'meter_unavailable'|'upstream_error'|'upstream_unreachable' } 503
 *   { ok: false, reason: 'none', remaining }                               200
 *   { ok: true, options: KitchenDish[], remaining }
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

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** The model already locked for Holt (Holt-AI benchmark 2026-09-24). */
const MODEL = 'claude-sonnet-5';

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
- Plain, appetizing names a person would say out loud: "Crispy Chicken Fried Rice", "Spinach and Feta Egg Scramble". No brand names. At most 40 characters.

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
  - "unit": "g", "oz", "lb", "cup", "tbsp", "tsp", "ml", or the counting word ("large", "cloves", "slices", "can"); "" for a plain count ("2 eggs").
  - "food": the plain food in everyday words, without amount, unit, brand or preparation ("chicken thighs", "long-grain white rice", "feta"). This is what the app matches to its food database, so be plain and specific.
- "steps": 3 to 8 short steps in plain words. Every step a home cook can follow. Include the doneness cue and the safe internal temperature whenever meat, poultry, fish or eggs are cooked (USDA: poultry 165°F, ground meat 160°F, whole cuts of beef, pork and lamb 145°F then rest 3 minutes, fish 145°F).

# Amounts

Real amounts for the servings you give: a portion of protein is usually 4 to 8 oz cooked, rice or pasta about 1/2 to 1 cup cooked, oil a teaspoon to a couple of tablespoons for the whole dish. Never an amount no one cooks.

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

  // ── 4. Reserve the credit — and the Premium AI gate (0203) ───────────────────
  const { data: spend, error: spendError } = await supabase.rpc('coach_ai_spend_credits', { p_action: KITCHEN_ACTION }).maybeSingle();
  if (spendError) return json({ ok: false, reason: 'meter_unavailable' }, 503);
  const reserved = spend as { allowed: boolean; credits_spent: number; remaining: number; allowance: number } | null;
  if (!reserved?.allowed) {
    return json({ ok: false, reason: 'out_of_credits', remaining: reserved?.remaining ?? 0, allowance: reserved?.allowance ?? 0 });
  }

  // ── 5. The model call ───────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: KITCHEN_OUTPUT_CAP,
        thinking: { type: 'disabled' },
        // ⛔ The schema is the NUT-D4 wall: it has no field for a nutrition number.
        output_config: { effort: 'low', format: { type: 'json_schema', schema: KITCHEN_SCHEMA } },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: kitchenUserTurn(request) }],
      }),
    });
  } catch {
    return json({ ok: false, reason: 'upstream_unreachable' }, 503);
  }

  if (!response.ok) {
    console.error('anthropic', response.status, (await response.text().catch(() => '')).slice(0, 800));
    await supabase.rpc('coach_ai_record_usage', {
      p_action: KITCHEN_ACTION, p_credits: reserved.credits_spent, p_model: MODEL,
      p_input_tokens: 0, p_output_tokens: 0, p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
      p_uncharged: true,
    });
    return json({ ok: false, reason: 'upstream_error' }, 503);
  }

  const payload = await response.json();
  const usage = payload?.usage ?? {};

  // ── 6. Record what it cost ──────────────────────────────────────────────────
  await supabase.rpc('coach_ai_record_usage', {
    p_action: KITCHEN_ACTION,
    p_credits: reserved.credits_spent,
    p_model: payload?.model ?? MODEL,
    p_input_tokens: usage.input_tokens ?? 0,
    p_output_tokens: usage.output_tokens ?? 0,
    p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    p_uncharged: false,
  });

  if (payload?.stop_reason === 'refusal') return json({ ok: false, reason: 'none', remaining: reserved.remaining });

  const text: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');

  // ── 7. THE BOUNDARY — runs after the model and overrules it (NUT-D4, forced spread, no repeats) ──
  const options = kitchenFromModelText(text, request.exclude);
  if (!options.length) return json({ ok: false, reason: 'none', remaining: reserved.remaining });
  return json({ ok: true, options, remaining: reserved.remaining });
});
