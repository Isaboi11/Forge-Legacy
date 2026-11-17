// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/meal-photo-read/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/nutrition/meal-photo-read.ts, which the Supabase dashboard
// editor cannot reach. This copy inlines that module in place of its import line; nothing else differs.
// Regenerate with `node scripts/build-meal-photo-read-deploy.mjs`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// meal-photo-read -> replace the editor contents with this whole file -> Deploy.
// ANTHROPIC_API_KEY is already set (recipe-photo-read and program-photo-read use the same secret).
// ! Apply supabase/apply/pending-0223.sql FIRST - it prices `meal_photo`; until then every read answers
// "meter unavailable".
// ! Apply supabase/apply/pending-0268.sql FIRST - it creates coach_ai_reserve / coach_ai_settle (the meter
// this copy also inlines, src/domain/ai/meter-server.ts); until then every read answers "meter unavailable".
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';
export const MEAL_PHOTO_ACTION = 'meal_photo';
export const MEAL_PHOTO_MAX_BASE64 = 6990000;
export const MEAL_PHOTO_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MEAL_PHOTO_PER_DAY = 25;
export const MEAL_PHOTO_OUTPUT_CAP = 1500;
export const MAX_MEAL_ITEMS = 12;
const NAME_CHARS = 60;
const SEARCH_CHARS = 60;
const UNIT_CHARS = 20;
const MAX_GRAMS = 2000;
const MAX_AMOUNT = 100;
export type MealItemConfidence = 'high' | 'medium' | 'low';
export interface MealItem {
    name: string;
    search: string;
    amount: number | null;
    unit: string;
    grams: number | null;
    confidence: MealItemConfidence;
}
export interface MealRead {
    items: MealItem[];
}
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };
export const MEAL_READ_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['isFood', 'items'],
    properties: {
        isFood: { type: 'boolean' },
        items: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'search', 'amount', 'unit', 'grams', 'confidence'],
                properties: {
                    name: { type: 'string' },
                    search: { type: 'string' },
                    amount: nullableNumber,
                    unit: { type: 'string' },
                    grams: nullableNumber,
                    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                },
            },
        },
    },
} as const;
const clean = (v: unknown, max: number): string => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const positive = (v: unknown, max: number): number | null => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max ? v : null;
const CONFIDENCE: readonly MealItemConfidence[] = ['high', 'medium', 'low'];
export function sanitizeMealRead(raw: unknown): MealRead | null {
    if (!raw || typeof raw !== 'object')
        return null;
    const d = raw as Record<string, unknown>;
    if (d.isFood === false)
        return null;
    const items: MealItem[] = [];
    for (const entry of Array.isArray(d.items) ? d.items : []) {
        if (!entry || typeof entry !== 'object')
            continue;
        const x = entry as Record<string, unknown>;
        const name = clean(x.name, NAME_CHARS);
        const search = clean(x.search, SEARCH_CHARS);
        if (!name && !search)
            continue;
        const grams = positive(x.grams, MAX_GRAMS);
        const amount = positive(x.amount, MAX_AMOUNT);
        const confidence = typeof x.confidence === 'string' && CONFIDENCE.includes(x.confidence as MealItemConfidence)
            ? (x.confidence as MealItemConfidence)
            : 'low';
        items.push({
            name: name || search,
            search: search || name,
            amount: amount == null ? null : Math.round(amount * 100) / 100,
            unit: clean(x.unit, UNIT_CHARS),
            grams: grams == null ? null : Math.round(grams),
            confidence,
        });
        if (items.length >= MAX_MEAL_ITEMS)
            break;
    }
    return items.length ? { items } : null;
}
export function readFromModelText(text: string): {
    ok: true;
    read: MealRead;
} | {
    ok: false;
    reason: 'not_food' | 'unreadable';
} {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text.trim());
    }
    catch {
        return { ok: false, reason: 'unreadable' };
    }
    if (parsed && typeof parsed === 'object' && (parsed as {
        isFood?: unknown;
    }).isFood === false) {
        return { ok: false, reason: 'not_food' };
    }
    const read = sanitizeMealRead(parsed);
    return read ? { ok: true, read } : { ok: false, reason: 'unreadable' };
}
export type MealPhotoResult = {
    kind: 'ok';
    read: MealRead;
    remaining: number | null;
} | {
    kind: 'not_food';
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
    kind: 'offline';
};
export function mealPhotoResultFrom(body: unknown): MealPhotoResult {
    if (!body || typeof body !== 'object')
        return { kind: 'unavailable' };
    const d = body as {
        ok?: boolean;
        read?: unknown;
        reason?: string;
        remaining?: number;
        allowance?: number;
    };
    if (d.ok) {
        const read = sanitizeMealRead(d.read);
        if (!read)
            return { kind: 'unreadable' };
        return { kind: 'ok', read, remaining: typeof d.remaining === 'number' ? d.remaining : null };
    }
    switch (d.reason) {
        case 'not_food':
            return { kind: 'not_food' };
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
export function mealPhotoError(r: Exclude<MealPhotoResult, {
    kind: 'ok';
}>): string {
    switch (r.kind) {
        case 'not_food':
            return 'No food in that one. Take the photo from above, with the whole plate in the frame.';
        case 'unreadable':
            return 'Couldn’t make out the food in that photo. A brighter shot from above usually does it.';
        case 'too_large':
            return 'That image is too big to read. Try taking the photo again.';
        case 'daily_limit':
            return 'That’s a lot of meal photos for one day. Search for the food instead, or try again tomorrow.';
        case 'out_of_credits':
            return 'You’re out of Premium AI credits for this month. You can still search for the food.';
        case 'not_entitled':
            return 'Logging a meal from a photo is part of Premium AI. You can still search for the food.';
        case 'no_nutrition':
            return 'Nutrition isn’t turned on for your account yet.';
        case 'unsupported_format':
            return 'That image type can’t be read. Take the photo with the camera instead.';
        case 'unavailable':
            return 'Photo logging isn’t working right now. Try again in a bit, or search for the food.';
        case 'offline':
        default:
            return 'Couldn’t reach Forge. Check your connection and try again.';
    }
}
export type SettleOutcome = 'ok' | 'upstream_error' | 'upstream_unreachable' | 'timeout' | 'refusal' | 'truncated' | 'not_a_program' | 'unreadable' | 'bad_output' | 'cancelled' | 'guarded';
export const UPSTREAM_ABORT_MS: Readonly<Record<string, number>> = {
    'meal-photo-read': 75000,
    'recipe-photo-read': 75000,
    'program-photo-read': 75000,
    'workout-card-read': 75000,
    'coach-form-check': 75000,
    'coach-kitchen': 45000,
    'coach-interpret': 45000,
    'workout-tidy': 45000,
    'coach-author': 25000,
};
export interface ModelUsage {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
}
export interface ModelPayload {
    content?: {
        type: string;
        text: string;
    }[];
    stop_reason?: string;
    model?: string;
    usage?: ModelUsage;
}
export type ModelCall = {
    kind: 'ok';
    payload: ModelPayload;
    latencyMs: number;
} | {
    kind: 'upstream_error';
    status: number;
    latencyMs: number;
} | {
    kind: 'upstream_unreachable';
    latencyMs: number;
} | {
    kind: 'timeout';
    latencyMs: number;
};
export type MeterReserve = {
    ok: true;
    id: string;
    credits: number;
    remaining: number;
    allowance: number;
    ageYears: number | null;
    minor: boolean;
} | {
    ok: false;
    reason: 'not_entitled' | 'no_consent' | 'out_of_credits' | 'meter_unavailable';
    remaining: number;
    allowance: number;
};
export interface Settled {
    settled: boolean;
    refunded: boolean;
    remaining: number | null;
}
export interface CallFacts {
    model: string;
    usage?: ModelUsage | null;
    latencyMs?: number | null;
}
const meterInt = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
export function reserveFrom(data: unknown, error: unknown): MeterReserve {
    if (error || !data || typeof data !== 'object')
        return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
    const d = data as Record<string, unknown>;
    if (d.allowed === true) {
        if (typeof d.reservation_id !== 'string' || !d.reservation_id)
            return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
        return {
            ok: true,
            id: d.reservation_id,
            credits: meterInt(d.credits_spent),
            remaining: meterInt(d.remaining),
            allowance: meterInt(d.allowance),
            ageYears: typeof d.age_years === 'number' && Number.isFinite(d.age_years) ? d.age_years : null,
            minor: d.minor === true,
        };
    }
    const reason = d.reason === 'not_entitled' || d.reason === 'no_consent' ? d.reason : 'out_of_credits';
    return { ok: false, reason, remaining: meterInt(d.remaining), allowance: meterInt(d.allowance) };
}
export async function timedModelCall(send: (signal: AbortSignal) => Promise<Response>, abortMs: number): Promise<ModelCall> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, Math.max(0, abortMs));
    const started = Date.now();
    const took = () => Date.now() - started;
    try {
        const response = await send(controller.signal);
        if (!response.ok) {
            const said = await response.text().catch(() => '');
            console.error('anthropic', response.status, said.slice(0, 800));
            return { kind: 'upstream_error', status: response.status, latencyMs: took() };
        }
        try {
            return { kind: 'ok', payload: (await response.json()) as ModelPayload, latencyMs: took() };
        }
        catch {
            return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_error', status: response.status, latencyMs: took() };
        }
    }
    catch {
        return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_unreachable', latencyMs: took() };
    }
    finally {
        clearTimeout(timer);
    }
}
export function failedCallReply(kind: 'upstream_error' | 'upstream_unreachable' | 'timeout'): {
    reason: 'upstream_error' | 'upstream_unreachable';
    upstream?: 'timeout';
} {
    if (kind === 'timeout')
        return { reason: 'upstream_error', upstream: 'timeout' };
    return { reason: kind };
}
export function callFacts(call: ModelCall, fallbackModel: string): CallFacts {
    if (call.kind !== 'ok')
        return { model: fallbackModel, usage: null, latencyMs: call.latencyMs };
    return {
        model: typeof call.payload.model === 'string' && call.payload.model ? call.payload.model : fallbackModel,
        usage: call.payload.usage ?? null,
        latencyMs: call.latencyMs,
    };
}
export function settleArgs(reservation: string, outcome: SettleOutcome, facts: CallFacts): Record<string, unknown> {
    const u = facts.usage ?? {};
    return {
        p_reservation: reservation,
        p_outcome: outcome,
        p_model: facts.model,
        p_input_tokens: meterInt(u.input_tokens),
        p_output_tokens: meterInt(u.output_tokens),
        p_cache_read_input_tokens: meterInt(u.cache_read_input_tokens),
        p_cache_creation_input_tokens: meterInt(u.cache_creation_input_tokens),
        p_latency_ms: facts.latencyMs == null ? null : meterInt(facts.latencyMs),
        p_refund: outcome !== 'ok',
    };
}
export function settledFrom(data: unknown, error: unknown): Settled {
    if (error || !data || typeof data !== 'object')
        return { settled: false, refunded: false, remaining: null };
    const d = data as Record<string, unknown>;
    return {
        settled: d.settled === true,
        refunded: d.settled === true && d.refunded === true,
        remaining: typeof d.remaining === 'number' && Number.isFinite(d.remaining) ? d.remaining : null,
    };
}
export function settledTail(s: Settled, reservedRemaining: number): {
    remaining: number;
    refunded?: true;
} {
    const remaining = s.remaining ?? reservedRemaining;
    return s.refunded ? { remaining, refunded: true } : { remaining };
}
export function ageLine(ageYears: number | null, minor: boolean): string | null {
    if (minor) {
        const age = ageYears != null && ageYears <= 18 ? `${ageYears}, under 18` : 'under 18';
        return `Athlete's age, from their profile: ${age}. Keep every suggestion conservative and right for supervised training: no maximal-effort sets or max attempts, and nothing about losing weight.`;
    }
    return ageYears == null ? null : `Athlete's age, from their profile: ${ageYears}.`;
}
export function withAgeLine(turn: string, ageYears: number | null, minor: boolean): string {
    const line = ageLine(ageYears, minor);
    return line ? `${turn}\n\n${line}` : turn;
}
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const FN = 'meal-photo-read';
const MODEL = 'claude-sonnet-5';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
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
    if (image.length > MEAL_PHOTO_MAX_BASE64)
        return json({ ok: false, reason: 'too_large' }, 400);
    if (!MEAL_PHOTO_MEDIA.includes(mediaType))
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
        .eq('action', MEAL_PHOTO_ACTION)
        .gte('occurred_at', since.toISOString());
    if (!countError && (count ?? 0) >= MEAL_PHOTO_PER_DAY) {
        return json({ ok: false, reason: 'daily_limit', limit: MEAL_PHOTO_PER_DAY }, 429);
    }
    const { data: reservedRow, error: reserveError } = await supabase
        .rpc('coach_ai_reserve', { p_action: MEAL_PHOTO_ACTION, p_fn: FN })
        .maybeSingle();
    const meter = reserveFrom(reservedRow, reserveError);
    if (!meter.ok) {
        if (meter.reason === 'meter_unavailable')
            return json({ ok: false, reason: 'meter_unavailable' }, 503);
        if (meter.reason === 'no_consent')
            return json({ ok: false, reason: 'no_consent' }, 403);
        return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
    }
    const settle = async (outcome: SettleOutcome, call: ModelCall) => {
        const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, callFacts(call, MODEL))).maybeSingle();
        return settledTail(settledFrom(data, error), meter.remaining);
    };
    const call = await timedModelCall((signal) => fetch('https://api.anthropic.com/v1/messages', {
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
            thinking: { type: 'disabled' },
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
    }), UPSTREAM_ABORT_MS[FN]);
    if (call.kind !== 'ok') {
        return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind, call)) }, 503);
    }
    const payload = call.payload;
    if (payload?.stop_reason === 'refusal') {
        return json({ ok: false, reason: 'unreadable', ...(await settle('refusal', call)) });
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
    if (!verdict.ok) {
        const outcome: SettleOutcome = verdict.reason === 'not_food' ? 'not_a_program' : payload?.stop_reason === 'max_tokens' ? 'truncated' : 'unreadable';
        return json({ ok: false, reason: verdict.reason, ...(await settle(outcome, call)) });
    }
    return json({ ok: true, read: verdict.read, ...(await settle('ok', call)) });
});
