// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/recipe-photo-read/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/nutrition/recipe-photo-read.ts, which the Supabase dashboard
// editor cannot reach. This copy inlines that module in place of its import line; nothing else differs.
// Regenerate with `node scripts/build-recipe-photo-read-deploy.mjs`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// recipe-photo-read -> replace the editor contents with this whole file -> Deploy.
// ANTHROPIC_API_KEY is already set (coach-interpret, coach-ask and program-photo-read use the same secret).
// ! Apply supabase/apply/pending-0220.sql FIRST - it prices `recipe_photo`; until then every read answers
// "meter unavailable".
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';
export const RECIPE_PHOTO_ACTION = 'recipe_photo';
export const RECIPE_PHOTO_MAX_BASE64 = 6990000;
export const RECIPE_PHOTO_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const RECIPE_PHOTO_PER_DAY = 30;
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
    text: string;
    quantity: number | null;
    unit: string;
    food: string;
}
export interface RecipeRead {
    name: string;
    servings: number | null;
    minutes: number | null;
    mealType: ReadMealType | null;
    ingredients: ReadIngredient[];
    steps: string[];
}
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };
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
const clean = (v: unknown, max: number): string => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const positive = (v: unknown, max: number): number | null => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max ? v : null;
const MEAL_TYPES: readonly ReadMealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
export function sanitizeRecipeRead(raw: unknown): RecipeRead | null {
    if (!raw || typeof raw !== 'object')
        return null;
    const d = raw as Record<string, unknown>;
    if (d.isRecipe === false)
        return null;
    const ingredients: ReadIngredient[] = [];
    for (const item of Array.isArray(d.ingredients) ? d.ingredients : []) {
        if (!item || typeof item !== 'object')
            continue;
        const x = item as Record<string, unknown>;
        const text = clean(x.text, TEXT_CHARS);
        const food = clean(x.food, FOOD_CHARS);
        if (!text && !food)
            continue;
        ingredients.push({
            text: text || food,
            quantity: positive(x.quantity, 100000),
            unit: clean(x.unit, UNIT_CHARS),
            food: food || text,
        });
        if (ingredients.length >= MAX_READ_INGREDIENTS)
            break;
    }
    if (!ingredients.length)
        return null;
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
export function readFromModelText(text: string): {
    ok: true;
    read: RecipeRead;
} | {
    ok: false;
    reason: 'not_a_recipe' | 'unreadable';
} {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text.trim());
    }
    catch {
        return { ok: false, reason: 'unreadable' };
    }
    if (parsed && typeof parsed === 'object' && (parsed as {
        isRecipe?: unknown;
    }).isRecipe === false) {
        return { ok: false, reason: 'not_a_recipe' };
    }
    const read = sanitizeRecipeRead(parsed);
    return read ? { ok: true, read } : { ok: false, reason: 'unreadable' };
}
export type RecipePhotoResult = {
    kind: 'ok';
    read: RecipeRead;
    remaining: number | null;
} | {
    kind: 'not_a_recipe';
} | {
    kind: 'unreadable';
} | {
    kind: 'too_large';
} | {
    kind: 'daily_limit';
} | {
    kind: 'out_of_credits';
    remaining: number;
    allowance: number;
} | {
    kind: 'not_entitled';
} | {
    kind: 'no_nutrition';
} | {
    kind: 'unsupported_format';
} | {
    kind: 'unavailable';
} | {
    kind: 'not_available';
} | {
    kind: 'offline';
};
export function recipePhotoResultFrom(body: unknown): RecipePhotoResult {
    if (!body || typeof body !== 'object')
        return { kind: 'unavailable' };
    if (isFunctionMissing(body))
        return { kind: 'not_available' };
    const d = body as {
        ok?: boolean;
        read?: unknown;
        reason?: string;
        remaining?: number;
        allowance?: number;
    };
    if (d.ok) {
        const read = sanitizeRecipeRead(d.read);
        if (!read)
            return { kind: 'unreadable' };
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
            if (!d.allowance)
                return { kind: 'not_entitled' };
            return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance };
        case 'bad_request':
            return { kind: 'unsupported_format' };
        default:
            return { kind: 'unavailable' };
    }
}
export function isFunctionMissing(body: unknown): boolean {
    if (!body || typeof body !== 'object')
        return false;
    const d = body as {
        ok?: unknown;
        code?: unknown;
        message?: unknown;
    };
    if ('ok' in d)
        return false;
    return d.code === 'NOT_FOUND' || (typeof d.message === 'string' && /function was not found/i.test(d.message));
}
export function recipePhotoError(r: Exclude<RecipePhotoResult, {
    kind: 'ok';
}>): string {
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
        case 'not_available':
            return 'Scanning a recipe isn’t available right now. You can still enter it by hand.';
        case 'offline':
        default:
            return 'Couldn’t reach Forge. Check your connection and try again.';
    }
}
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MODEL = 'claude-sonnet-5';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
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
interface Body {
    image?: string;
    mediaType?: string;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
});
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response('ok', { headers: CORS });
    if (!ANTHROPIC_API_KEY)
        return json({ ok: false, reason: 'unconfigured' }, 503);
    let body: Body;
    try {
        body = await req.json();
    }
    catch {
        return json({ ok: false, reason: 'bad_request' }, 400);
    }
    const image = (typeof body.image === 'string' ? body.image : '').trim();
    const mediaType = body.mediaType ?? 'image/jpeg';
    if (!image)
        return json({ ok: false, reason: 'bad_request' }, 400);
    if (image.length > RECIPE_PHOTO_MAX_BASE64)
        return json({ ok: false, reason: 'too_large' }, 400);
    if (!RECIPE_PHOTO_MEDIA.includes(mediaType))
        return json({ ok: false, reason: 'bad_request' }, 400);
    const authorization = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authorization } },
    });
    const { data: mayUseNutrition, error: gateError } = await supabase.rpc('has_nutrition_access');
    if (gateError || mayUseNutrition !== true)
        return json({ ok: false, reason: 'no_nutrition' }, 403);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase
        .from('coach_ai_spend')
        .select('id', { count: 'exact', head: true })
        .eq('action', RECIPE_PHOTO_ACTION)
        .gte('occurred_at', since.toISOString());
    if (!countError && (count ?? 0) >= RECIPE_PHOTO_PER_DAY) {
        return json({ ok: false, reason: 'daily_limit', limit: RECIPE_PHOTO_PER_DAY }, 429);
    }
    const { data: spend, error: spendError } = await supabase
        .rpc('coach_ai_spend_credits', { p_action: RECIPE_PHOTO_ACTION })
        .maybeSingle();
    if (spendError)
        return json({ ok: false, reason: 'meter_unavailable' }, 503);
    const reserved = spend as {
        allowed: boolean;
        credits_spent: number;
        remaining: number;
        allowance: number;
    } | null;
    if (!reserved?.allowed) {
        return json({
            ok: false,
            reason: 'out_of_credits',
            remaining: reserved?.remaining ?? 0,
            allowance: reserved?.allowance ?? 0,
        });
    }
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
                thinking: { type: 'disabled' },
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
    }
    catch {
        return json({ ok: false, reason: 'upstream_unreachable' }, 503);
    }
    if (!response.ok) {
        console.error('anthropic', response.status, (await response.text().catch(() => '')).slice(0, 800));
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
    if (payload?.stop_reason === 'refusal') {
        return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
    }
    const text: string = (payload?.content ?? [])
        .filter((b: {
        type: string;
    }) => b.type === 'text')
        .map((b: {
        text: string;
    }) => b.text)
        .join('');
    const verdict = readFromModelText(text);
    if (!verdict.ok)
        return json({ ok: false, reason: verdict.reason, remaining: reserved.remaining });
    return json({ ok: true, read: verdict.read, remaining: reserved.remaining });
});
