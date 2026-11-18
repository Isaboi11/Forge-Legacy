// ===
// DASHBOARD PASTE COPY of supabase/functions/program-photo-read/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/program/photo-transcript.ts and src/domain/ai/meter-server.ts, which
// the Supabase dashboard editor cannot reach. This copy inlines them in place of their import lines; nothing
// else differs. Regenerate with `node scripts/build-program-photo-read-deploy.mjs`.
//
// Supabase dashboard -> Edge Functions -> program-photo-read -> replace the editor contents with this whole
// file -> Deploy. ANTHROPIC_API_KEY is already set (coach-interpret and coach-ask use the same secret).
// ! Apply supabase/apply/pending-0268.sql FIRST - it creates coach_ai_reserve / coach_ai_settle; until then
// every read answers "meter unavailable".
// ===

import { createClient } from 'jsr:@supabase/supabase-js@2';
export type TranscriptResult = {
    ok: true;
    tsv: string;
    rows: number;
} | {
    ok: false;
    reason: 'not_a_program';
} | {
    ok: false;
    reason: 'unreadable';
};
const MAX_ROWS = 600;
const MAX_LINE_CHARS = 300;
const FENCE = /^\s*```[\w]*\s*$/;
const TRAINING_VOCABULARY = [
    'exercise', 'movement', 'lift', 'name',
    'set', 'rep', 'scheme', 'volume',
    'week', 'day', 'session', 'workout', 'split',
    'time', 'duration', 'interval',
];
const MIN_VOCABULARY = 2;
const cells = (line: string) => line.split('\t');
const isEmptyRow = (line: string) => cells(line).every((c) => c.trim() === '');
function looksLikeTrainingHeader(line: string): boolean {
    const lower = line.toLowerCase();
    const hits = TRAINING_VOCABULARY.filter((word) => lower.includes(word));
    return hits.length >= MIN_VOCABULARY;
}
export function sanitizeTranscript(raw: string | null | undefined): TranscriptResult {
    if (!raw || typeof raw !== 'string')
        return { ok: false, reason: 'not_a_program' };
    const kept: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
        if (kept.length >= MAX_ROWS)
            break;
        if (FENCE.test(line))
            continue;
        if (!line.includes('\t'))
            continue;
        const trimmed = line.replace(/\s+$/, '').slice(0, MAX_LINE_CHARS);
        if (isEmptyRow(trimmed))
            continue;
        kept.push(trimmed);
    }
    if (kept.length === 0)
        return { ok: false, reason: 'not_a_program' };
    if (kept.length < 2)
        return { ok: false, reason: 'unreadable' };
    if (!looksLikeTrainingHeader(kept[0]))
        return { ok: false, reason: 'not_a_program' };
    return { ok: true, tsv: kept.join('\n'), rows: kept.length - 1 };
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
const FN = 'program-photo-read';
const MODEL = 'claude-sonnet-5';
const EFFORT = 'low';
const modelConfig = modelConfigReader({
    url: SUPABASE_URL,
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    fetch: (u, init) => fetch(u, init),
    known: KNOWN_MODELS,
    efforts: EFFORTS,
});
const ACTION = 'photo_import';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const MAX_BASE64_CHARS = 6990000;
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_READS_PER_DAY = 60;
const SYSTEM = `You are a transcriber. You convert a photograph or screenshot of a training program into tab-separated rows.

# Your entire job

Read the table in the image and write it out as TSV. You are OCR with an understanding of table layout. You are not a coach, an assistant, or an editor.

Output ONLY tab-separated rows. A header row first, then one row per line. No prose before it, no summary after it, no markdown code fences, no commentary of any kind. If you catch yourself writing a sentence, delete it.

# The columns

Use these header names where the source has them: Week, Day, Exercise, Sets, Reps, Time.

- Keep the source's own column layout when it differs. If the sheet is one row per day with the whole session written out as a sentence, use Week, Day, Session and put the sentence in the Session cell whole.
- If a column is not in the image, leave the cell empty. An empty cell is a true statement about the photograph.
- If the image shows no Week column, do not invent one \u2014 omit it entirely.
- If an exercise is prescribed by TIME instead of a rep count \u2014 an interval timer's "0:40", a hold's "45s", "1 min" \u2014 put that time in a Time column exactly as written. Never move a time into Sets or Reps, and never leave it out.
- Rest rows ("Rest 0:20") are rows like any other: transcribe them.

# What you must never do

**Never invent a value.** If the sets column is blank, blurred, cut off, or you are unsure, leave it blank. A blank cell is read downstream as "the sheet did not say" and is shown to the athlete as an assumption they can correct. A number you guessed is indistinguishable from a number their coach wrote, and it is not correctable because nobody knows it is wrong.

**Never correct an exercise name.** Transcribe exactly what is written, including abbreviations, misspellings, and shorthand. "Bench" stays "Bench". "RDL" stays "RDL". "Squat 3ct pause" stays "Squat 3ct pause". Something downstream matches these to a catalogue; a name you improved is a name that no longer matches what the athlete was given.

**Never reorder, merge, summarise, or skip rows.** Including rows you think are redundant.

**Never describe the image.** Not the table, not the paper, not the room, and never a person. If a person is visible in the photograph, transcribe the table and say nothing whatsoever about them \u2014 no count, no description, no note that anyone is present.

# When it is not a training program

If the image does not contain a training table \u2014 it is a photo of a person, a receipt, a conversation, a landscape, a blank page, or anything else \u2014 output exactly this single line and nothing else:

NOT_A_PROGRAM

Do not explain the decision. Do not describe what the image showed instead. Do not apologise or offer to help. That one token is the entire response.

If the image contains a training table you can only partly read, transcribe the part you can read and leave the rest blank. Partly-read is not the same as not-a-program, and the athlete reviews everything before anything is created.`;
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
    if (!ANTHROPIC_API_KEY) {
        return json({ ok: false, reason: 'unconfigured' }, 503);
    }
    let body: Body;
    try {
        body = await req.json();
    }
    catch {
        return json({ ok: false, reason: 'bad_request' }, 400);
    }
    const image = (body.image ?? '').trim();
    const mediaType = body.mediaType ?? 'image/jpeg';
    if (!image)
        return json({ ok: false, reason: 'bad_request' }, 400);
    if (image.length > MAX_BASE64_CHARS)
        return json({ ok: false, reason: 'too_large' }, 400);
    if (!ALLOWED_MEDIA.includes(mediaType))
        return json({ ok: false, reason: 'bad_request' }, 400);
    const authorization = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authorization } },
    });
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase
        .from('coach_ai_spend')
        .select('id', { count: 'exact', head: true })
        .eq('action', ACTION)
        .gte('occurred_at', since.toISOString());
    if (!countError && (count ?? 0) >= MAX_READS_PER_DAY) {
        return json({ ok: false, reason: 'daily_limit', limit: MAX_READS_PER_DAY }, 429);
    }
    const { data: reservedRow, error: reserveError } = await supabase
        .rpc('coach_ai_reserve', { p_action: ACTION, p_fn: FN })
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
            max_tokens: 8192,
            ...modelFields,
            system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
                        { type: 'text', text: 'Transcribe this training table as TSV.' },
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
        .join('\n');
    const clean = sanitizeTranscript(text);
    if (!clean.ok) {
        const outcome: SettleOutcome = clean.reason === 'not_a_program' ? 'not_a_program' : payload?.stop_reason === 'max_tokens' ? 'truncated' : 'unreadable';
        return json({ ok: false, reason: clean.reason, ...(await settle(outcome, call)) });
    }
    return json({ ok: true, tsv: clean.tsv, rows: clean.rows, ...(await settle('ok', call)) });
});
