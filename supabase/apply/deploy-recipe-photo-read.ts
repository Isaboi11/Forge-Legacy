// ===
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
// ! Apply supabase/apply/pending-0268.sql FIRST - it creates coach_ai_reserve / coach_ai_settle (the meter
// this copy also inlines, src/domain/ai/meter-server.ts); until then every read answers "meter unavailable".
// ===

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
            return 'That doesn\u2019t look like a recipe. Try a screenshot of the ingredients and method.';
        case 'unreadable':
            return 'Couldn\u2019t read a recipe out of that picture. A closer, straighter shot usually does it.';
        case 'too_large':
            return 'That image is too big to read. Try a screenshot instead.';
        case 'daily_limit':
            return 'That\u2019s a lot of recipes for one day. Try again tomorrow, or enter this one by hand.';
        case 'out_of_credits':
            return 'You\u2019re out of Premium AI credits for this month. You can still enter the recipe by hand.';
        case 'not_entitled':
            return 'Reading recipes from a picture is part of Premium AI. You can still enter it by hand.';
        case 'no_nutrition':
            return 'Nutrition isn\u2019t turned on for your account yet.';
        case 'unsupported_format':
            return 'That image type can\u2019t be read. Take a screenshot of it and upload that instead.';
        case 'unavailable':
            return 'Recipe reading isn\u2019t working right now. Try again in a bit, or enter it by hand.';
        case 'not_available':
            return 'Scanning a recipe isn\u2019t available right now. You can still enter it by hand.';
        case 'offline':
        default:
            return 'Couldn\u2019t reach Forge. Check your connection and try again.';
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
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
export const KNOWN_MODELS = ['claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-opus-5'] as const;
export const RETIRED_MODELS = ['claude-haiku-4-5'] as const;
export type KnownModel = (typeof KNOWN_MODELS)[number] | (typeof RETIRED_MODELS)[number];
export interface ModelRule {
    off: {
        type: 'disabled';
    } | {
        type: 'between_tools';
    } | null;
    offMaxEffort: Effort | null;
    effort: boolean;
    adaptive: boolean;
    fallbacks: boolean;
    webSearch: boolean;
}
export const MODEL_RULES: Readonly<Record<KnownModel | 'unknown', ModelRule>> = {
    'claude-sonnet-5': { off: { type: 'disabled' }, offMaxEffort: 'max', effort: true, adaptive: true, fallbacks: false, webSearch: true },
    'claude-sonnet-5-5': { off: { type: 'between_tools' }, offMaxEffort: 'high', effort: true, adaptive: true, fallbacks: true, webSearch: true },
    'claude-haiku-5-5': { off: { type: 'disabled' }, offMaxEffort: 'high', effort: true, adaptive: true, fallbacks: false, webSearch: false },
    'claude-opus-5-5': { off: null, offMaxEffort: null, effort: true, adaptive: true, fallbacks: true, webSearch: true },
    'claude-opus-5': { off: { type: 'disabled' }, offMaxEffort: 'high', effort: true, adaptive: true, fallbacks: true, webSearch: true },
    'claude-haiku-4-5': { off: null, offMaxEffort: null, effort: false, adaptive: false, fallbacks: false, webSearch: false },
    unknown: { off: null, offMaxEffort: null, effort: false, adaptive: false, fallbacks: false, webSearch: false },
};
export function modelFamily(model: unknown): KnownModel | 'unknown' {
    const m = typeof model === 'string' ? model : '';
    let best: KnownModel | null = null;
    for (const k of [...KNOWN_MODELS, ...RETIRED_MODELS]) {
        if (m === k)
            return k;
        if (m.startsWith(`${k}-`) && (best == null || k.length > best.length))
            best = k;
    }
    return best ?? 'unknown';
}
export const isKnownModel = (model: unknown): boolean => typeof model === 'string' && (KNOWN_MODELS as readonly string[]).includes(model);
export const isEffort = (e: unknown): e is Effort => typeof e === 'string' && (EFFORTS as readonly string[]).includes(e);
export interface RequestKnobs {
    thinkingOff?: boolean;
    adaptive?: boolean;
    effort?: Effort | null;
    format?: unknown;
    fallback?: boolean;
}
export interface RequestFields {
    thinking?: {
        type: 'disabled' | 'between_tools' | 'adaptive';
    };
    output_config?: {
        effort?: Effort;
        format?: unknown;
    };
    fallbacks?: 'default';
}
const effortRank = (e: Effort) => EFFORTS.indexOf(e);
export function requestFields(model: unknown, knobs: RequestKnobs = {}): RequestFields {
    const rule = MODEL_RULES[modelFamily(model)];
    const effort = rule.effort && isEffort(knobs.effort) ? knobs.effort : null;
    const out: RequestFields = {};
    if (knobs.thinkingOff) {
        const offOk = rule.off != null && (effort == null || rule.offMaxEffort == null || effortRank(effort) <= effortRank(rule.offMaxEffort));
        if (offOk && rule.off)
            out.thinking = { ...rule.off };
    }
    else if (knobs.adaptive && rule.adaptive) {
        out.thinking = { type: 'adaptive' };
    }
    const oc: {
        effort?: Effort;
        format?: unknown;
    } = {};
    if (effort)
        oc.effort = effort;
    if (knobs.format !== undefined && knobs.format !== null)
        oc.format = knobs.format;
    if (Object.keys(oc).length)
        out.output_config = oc;
    if (knobs.fallback !== false && rule.fallbacks)
        out.fallbacks = 'default';
    return out;
}
export const takesWebSearch = (model: unknown): boolean => MODEL_RULES[modelFamily(model)].webSearch;
export function requestBetas(fields: RequestFields): string[] {
    return fields.fallbacks ? [FALLBACK_BETA] : [];
}
export function anthropicHeaders(apiKey: string, fields: RequestFields): Record<string, string> {
    const h: Record<string, string> = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
    const betas = requestBetas(fields);
    if (betas.length)
        h['anthropic-beta'] = betas.join(',');
    return h;
}
export function answeredBy(payload: unknown, requested: string): string {
    const m = (payload as {
        model?: unknown;
    } | null | undefined)?.model;
    return typeof m === 'string' && m ? m : requested;
}
export function fellBack(payload: unknown): boolean {
    const it = (payload as {
        usage?: {
            iterations?: unknown;
        };
    } | null | undefined)?.usage?.iterations;
    return Array.isArray(it) && it.some((e) => (e as {
        type?: unknown;
    } | null)?.type === 'fallback_message');
}
export interface ModelChoice {
    model: string;
    effort: string | null;
    canary: boolean;
    source: 'config' | 'default' | 'default_no_row' | 'default_read_failed' | 'default_invalid';
}
export interface ModelDefault {
    model: string;
    effort: string | null;
}
export interface ModelConfigDeps {
    url: string | undefined;
    serviceKey: string | undefined;
    fetch: (input: string, init: Record<string, unknown>) => Promise<{
        ok: boolean;
        json: () => Promise<unknown>;
    }>;
    now?: () => number;
    ttlMs?: number;
    timeoutMs?: number;
    known: readonly string[];
    efforts: readonly string[];
}
export const MODEL_CONFIG_TTL_MS = 60000;
export const MODEL_CONFIG_FAIL_TTL_MS = 10000;
export const MODEL_CONFIG_TIMEOUT_MS = 1500;
const MODEL_CONFIG_CACHE_MAX = 500;
export function uidFromAuthorization(authorization: string | null | undefined): string | null {
    try {
        const jwt = String(authorization ?? '').replace(/^Bearer\s+/i, '');
        const part = jwt.split('.')[1];
        if (!part)
            return null;
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
        const sub = json?.sub;
        return typeof sub === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub) ? sub : null;
    }
    catch {
        return null;
    }
}
export function choiceFromRow(row: unknown, dflt: ModelDefault, deps: Pick<ModelConfigDeps, 'known' | 'efforts'>): ModelChoice {
    const r = (Array.isArray(row) ? row[0] : row) as {
        model?: unknown;
        effort?: unknown;
        canary?: unknown;
    } | null | undefined;
    if (!r || typeof r !== 'object' || r.model == null)
        return { ...dflt, canary: false, source: 'default_no_row' };
    if (typeof r.model !== 'string' || !deps.known.includes(r.model))
        return { ...dflt, canary: false, source: 'default_invalid' };
    if (r.effort != null && (typeof r.effort !== 'string' || !deps.efforts.includes(r.effort)))
        return { ...dflt, canary: false, source: 'default_invalid' };
    return { model: r.model, effort: (r.effort as string | null) ?? null, canary: r.canary === true, source: 'config' };
}
export function modelConfigReader(deps: ModelConfigDeps) {
    const now = deps.now ?? (() => Date.now());
    const ttl = deps.ttlMs ?? MODEL_CONFIG_TTL_MS;
    const cache = new Map<string, {
        at: number;
        ttl: number;
        choice: ModelChoice;
    }>();
    async function read(fn: string, uid: string | null, dflt: ModelDefault): Promise<{
        choice: ModelChoice;
        ttl: number;
    }> {
        if (!deps.url || !deps.serviceKey)
            return { choice: { ...dflt, canary: false, source: 'default' }, ttl };
        let timer: ReturnType<typeof setTimeout> | null = null;
        try {
            const ctl = new AbortController();
            timer = setTimeout(() => ctl.abort(), deps.timeoutMs ?? MODEL_CONFIG_TIMEOUT_MS);
            const res = await deps.fetch(`${deps.url}/rest/v1/rpc/coach_ai_model_pick`, {
                method: 'POST',
                signal: ctl.signal,
                headers: { apikey: deps.serviceKey, Authorization: `Bearer ${deps.serviceKey}`, 'content-type': 'application/json' },
                body: JSON.stringify({ p_fn: fn, p_uid: uid }),
            });
            if (!res.ok)
                return { choice: { ...dflt, canary: false, source: 'default_read_failed' }, ttl: MODEL_CONFIG_FAIL_TTL_MS };
            return { choice: choiceFromRow(await res.json(), dflt, deps), ttl };
        }
        catch {
            return { choice: { ...dflt, canary: false, source: 'default_read_failed' }, ttl: MODEL_CONFIG_FAIL_TTL_MS };
        }
        finally {
            if (timer != null)
                clearTimeout(timer);
        }
    }
    return {
        async pick(fn: string, uid: string | null, dflt: ModelDefault): Promise<ModelChoice> {
            const key = `${fn}|${uid ?? ''}`;
            const hit = cache.get(key);
            if (hit && now() - hit.at < hit.ttl)
                return hit.choice;
            const { choice, ttl: keep } = await read(fn, uid, dflt);
            if (cache.size >= MODEL_CONFIG_CACHE_MAX)
                cache.delete(cache.keys().next().value as string);
            cache.set(key, { at: now(), ttl: keep, choice });
            return choice;
        },
        size: () => cache.size,
    };
}
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const FN = 'recipe-photo-read';
const MODEL = 'claude-sonnet-5';
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
  - "quantity": the amount as a number. Convert fractions and mixed numbers ("1 1/2" is 1.5, "\u00bd" is 0.5, "\u00be" is 0.75). For a range ("2-3 cups") use the first number. null when the line has no amount ("salt to taste", "oil for frying").
  - "unit": the unit as written, shortened the usual way where there is one: "cup", "tbsp", "tsp", "g", "kg", "oz", "lb", "ml", "l", "fl oz", or the counting word the page uses ("cloves", "slices", "large", "can"). Empty string when the amount is a plain count ("2 eggs").
  - "food": the plain food, in everyday words, WITHOUT the amount, the unit, the brand or the preparation. "2 cloves garlic, minced" is "garlic". "1 lb boneless skinless chicken breasts, cubed" is "chicken breasts". "1 cup long-grain white rice, rinsed" is "long-grain white rice". "Kerrygold butter, softened" is "butter". Keep a word that changes what the food is ("smoked salmon", "brown sugar", "whole wheat bread").
- "steps": the method, one entry per step, rewritten briefly in plain words \u2014 a short sentence or two each, in your own words, not copied. Keep every temperature, time and doneness cue the page gives. Empty list if the page has no method.

# Worked ingredient lines

These show how a printed line becomes one entry. Follow the pattern; do not copy the examples into an answer.

- "1 1/2 cups whole milk" \u2192 text "1 1/2 cups whole milk", quantity 1.5, unit "cup", food "whole milk".
- "3 Tbsp. extra-virgin olive oil, divided" \u2192 quantity 3, unit "tbsp", food "olive oil".
- "2 tsp ground cumin" \u2192 quantity 2, unit "tsp", food "cumin".
- "200g dried spaghetti" \u2192 quantity 200, unit "g", food "spaghetti".
- "1 (14.5 oz) can diced tomatoes, undrained" \u2192 quantity 1, unit "can", food "canned tomatoes".
- "4 large eggs, beaten" \u2192 quantity 4, unit "large", food "eggs".
- "1 medium onion, finely chopped" \u2192 quantity 1, unit "medium", food "onion".
- "Juice of 1 lemon" \u2192 quantity 1, unit "", food "lemon".
- "Salt and pepper, to taste" \u2192 one line, quantity null, unit "", food "salt and pepper".
- "Fresh cilantro, for garnish" \u2192 quantity null, unit "", food "cilantro".
- "1/4 cup (60 ml) maple syrup" \u2192 use the first amount the page gives: quantity 0.25, unit "cup", food "maple syrup".

Section headings inside an ingredient list ("For the sauce:", "Topping") are not ingredients; skip them, and read the lines under them normally.

# What you must never do

**Never write a nutrition number.** Recipe pages often print calories, protein, carbs, fat, sugar, sodium or "per serving" figures. Ignore all of them completely. There is no field for them and the app will never use them \u2014 it calculates its own from the ingredients.

**Never invent an ingredient or an amount.** If a line is cut off, blurred or you are unsure of a number, set "quantity" to null rather than guess. A missing amount is shown to the athlete to fill in; a guessed one looks exactly like one the recipe wrote, and nobody can tell it is wrong.

**Never add ingredients the page does not list,** even ones the method mentions in passing or that a cook would obviously need. Never merge two lines into one or split one line into two. If the page lists the same food twice (for the sauce and for the topping), keep both lines.

**Never correct the recipe.** Transcribe amounts as printed, even if they look unusual.

**Never describe the image,** the page, the website, or anyone in the picture. If a person is visible, read the recipe and say nothing about them.

# When it is not a recipe

If the image does not show a recipe \u2014 a photo of a meal with no ingredient list, a nutrition label, a receipt, a menu, a conversation, a person, a landscape, a blank page \u2014 set "isRecipe" to false, "name" to "", "servings" and "minutes" to null, "mealType" to "unknown", and both lists empty. Do not explain.

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
    const { data: reservedRow, error: reserveError } = await supabase
        .rpc('coach_ai_reserve', { p_action: RECIPE_PHOTO_ACTION, p_fn: FN })
        .maybeSingle();
    const meter = reserveFrom(reservedRow, reserveError);
    if (!meter.ok) {
        if (meter.reason === 'meter_unavailable')
            return json({ ok: false, reason: 'meter_unavailable' }, 503);
        if (meter.reason === 'no_consent')
            return json({ ok: false, reason: 'no_consent' }, 403);
        return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
    }
    const choice = await modelConfig.pick(FN, uidFromAuthorization(authorization), { model: MODEL, effort: EFFORT });
    const model = choice.model;
    const modelFields = requestFields(model, {
        thinkingOff: true,
        effort: choice.effort ?? EFFORT,
        format: { type: 'json_schema', schema: RECIPE_READ_SCHEMA },
    });
    const settle = async (outcome: SettleOutcome, call: ModelCall) => {
        const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, callFacts(call, model))).maybeSingle();
        return settledTail(settledFrom(data, error), meter.remaining);
    };
    const call = await timedModelCall((signal) => fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: anthropicHeaders(ANTHROPIC_API_KEY!, modelFields),
        body: JSON.stringify({
            model,
            max_tokens: RECIPE_PHOTO_OUTPUT_CAP,
            ...modelFields,
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
        const outcome: SettleOutcome = verdict.reason === 'not_a_recipe' ? 'not_a_program' : payload?.stop_reason === 'max_tokens' ? 'truncated' : 'unreadable';
        return json({ ok: false, reason: verdict.reason, ...(await settle(outcome, call)) });
    }
    return json({ ok: true, read: verdict.read, ...(await settle('ok', call)) });
});
