/**
 * ══ WHAT EACH MODEL IS SENT — one request shape per model (AI Road to 10 Sprint 3b, PL-7) ══
 *
 * Every AI function used to write `thinking: { type: 'disabled' }, output_config: { effort: 'low' }` by hand, tuned
 * for Claude Sonnet 5. Moving a function to another model with those lines is a 400 on the first call: Sonnet 5.5 and
 * Opus 5.5 reject `disabled`, Haiku 4.5 rejects `effort`. This module is the one place that knows what each model
 * takes, so a model switch (a row in `coach_ai_model_config`, 0274) can never send a field the model refuses.
 * `__tests__/model-request.test.mjs` walks every model × every knob a function uses and fails on a rejected field.
 *
 * What each model accepts (claude-api skill, models + migration guides, cached 2026-11-03, confirmed 2026-11-18):
 *
 *   model               thinking off              effort         refusal fallback (`fallbacks: "default"`)
 *   claude-sonnet-5     {type:'disabled'}          low … max      — (it is the fallback target)
 *   claude-sonnet-5-5   {type:'between_tools'}*    low … max      yes — retries cyber / frontier_llm on Sonnet 5
 *                       (`disabled` is a 400)
 *   claude-haiku-5-5    {type:'disabled'}*         low … max      ✕ none exists (the array form is a 400; "default"
 *                                                                 does nothing) — so it is never sent
 *   claude-opus-5-5     cannot be off: omit        low … max      yes
 *                       (`disabled` 400s at every effort; effort is the only lever)
 *   claude-opus-5       {type:'disabled'}*         low … max      yes
 *   claude-haiku-4-5    omit (no adaptive either)  ✕ (a 400)      —
 *
 *   * only at effort `high` or below. Asked for thinking off at `xhigh`/`max`, the model runs adaptive instead — the
 *     request stays valid, and the effort the caller asked for is kept.
 *
 * `between_tools` takes no other field inside `thinking`, so nothing is ever added next to it. `fallbacks` needs the
 * `server-side-fallback-2026-07-01` beta header; `anthropicHeaders` adds it exactly when the body carries it.
 * Web search (`web_search_20260209`): Sonnet 5 / 5.5 and Opus 5 / 5.5 only — never Haiku (`takesWebSearch`).
 * Forced `tool_choice` (`any` / `tool`) is a 400 on Sonnet 5.5 and Opus 5.5 — no function sends one (`none` is fine).
 * A model this table does not know gets the minimal request (no thinking, no effort, no fallback): never a field it
 * might refuse. The config table's CHECK (0274) only admits KNOWN_MODELS anyway.
 *
 * ⛔ Pure and import-free: the Edge Function bundles inline it and `node --test` runs it directly.
 */

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

/** The beta header the server-side refusal fallback needs. */
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/** Every model a function may be configured to run. Same list as 0274's CHECK; each has its own rate in `model-rates.ts`. */
export const KNOWN_MODELS = ['claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-opus-5'] as const;
/**
 * Retired in Sprint 3b (PL-7) wherever it was selectable: Haiku 5.5 proved as good on every job it did (chat summaries,
 * coach-interpret's and coach-ask's routing slot) at a tenth of the price. Still RECOGNISED (its rules below, its rate
 * for the ledger's history), never configurable.
 */
export const RETIRED_MODELS = ['claude-haiku-4-5'] as const;
export type KnownModel = (typeof KNOWN_MODELS)[number] | (typeof RETIRED_MODELS)[number];

export interface ModelRule {
  /** What "thinking off" is on this model: a `thinking` object to send, or `null` = leave `thinking` out. */
  off: { type: 'disabled' } | { type: 'between_tools' } | null;
  /** The highest effort `off` may be sent with; above it the model runs adaptive. */
  offMaxEffort: Effort | null;
  /** Takes `output_config.effort`. */
  effort: boolean;
  /** Takes `thinking: { type: 'adaptive' }`. */
  adaptive: boolean;
  /** Takes `fallbacks: "default"` (with FALLBACK_BETA) and something happens on a refusal. */
  fallbacks: boolean;
  /** Offers the `web_search_20260209` tool coach-ask sends on a tapped online search. */
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

/** The family a model id belongs to: exact, else the longest known id it starts with (`claude-haiku-4-5-20251001`). */
export function modelFamily(model: unknown): KnownModel | 'unknown' {
  const m = typeof model === 'string' ? model : '';
  let best: KnownModel | null = null;
  for (const k of [...KNOWN_MODELS, ...RETIRED_MODELS]) {
    if (m === k) return k;
    if (m.startsWith(`${k}-`) && (best == null || k.length > best.length)) best = k;
  }
  return best ?? 'unknown';
}

/** Configurable (known and not retired). */
export const isKnownModel = (model: unknown): boolean => typeof model === 'string' && (KNOWN_MODELS as readonly string[]).includes(model);

export const isEffort = (e: unknown): e is Effort => typeof e === 'string' && (EFFORTS as readonly string[]).includes(e);

export interface RequestKnobs {
  /** The function wants no extended thinking (a short answer, not reasoning). */
  thinkingOff?: boolean;
  /** The function wants adaptive thinking on (workout-tidy). Ignored when `thinkingOff`. */
  adaptive?: boolean;
  effort?: Effort | null;
  /** Structured output (`output_config.format`), passed through unchanged. */
  format?: unknown;
  /** The server-side refusal fallback. On by default wherever the model has one (contract §1.2). */
  fallback?: boolean;
}

export interface RequestFields {
  thinking?: { type: 'disabled' | 'between_tools' | 'adaptive' };
  output_config?: { effort?: Effort; format?: unknown };
  fallbacks?: 'default';
}

const effortRank = (e: Effort) => EFFORTS.indexOf(e);

/**
 * The `thinking` / `output_config` / `fallbacks` fields for one request — only what this model accepts. Spread them
 * into the body next to `model`, `max_tokens`, `system` and `messages`.
 */
export function requestFields(model: unknown, knobs: RequestKnobs = {}): RequestFields {
  const rule = MODEL_RULES[modelFamily(model)];
  const effort = rule.effort && isEffort(knobs.effort) ? knobs.effort : null;
  const out: RequestFields = {};
  if (knobs.thinkingOff) {
    const offOk = rule.off != null && (effort == null || rule.offMaxEffort == null || effortRank(effort) <= effortRank(rule.offMaxEffort));
    if (offOk && rule.off) out.thinking = { ...rule.off };
    // else: leave `thinking` out — adaptive on the models that have it, none on the rest.
  } else if (knobs.adaptive && rule.adaptive) {
    out.thinking = { type: 'adaptive' };
  }
  const oc: { effort?: Effort; format?: unknown } = {};
  if (effort) oc.effort = effort;
  if (knobs.format !== undefined && knobs.format !== null) oc.format = knobs.format;
  if (Object.keys(oc).length) out.output_config = oc;
  if (knobs.fallback !== false && rule.fallbacks) out.fallbacks = 'default';
  return out;
}

/** Can this model take coach-ask's web search tool (`web_search_20260209`)? Haiku models cannot. */
export const takesWebSearch = (model: unknown): boolean => MODEL_RULES[modelFamily(model)].webSearch;

/** The beta headers a body built by `requestFields` needs. */
export function requestBetas(fields: RequestFields): string[] {
  return fields.fallbacks ? [FALLBACK_BETA] : [];
}

/** The Anthropic request headers for a body built with `requestFields`. */
export function anthropicHeaders(apiKey: string, fields: RequestFields): Record<string, string> {
  const h: Record<string, string> = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  const betas = requestBetas(fields);
  if (betas.length) h['anthropic-beta'] = betas.join(',');
  return h;
}

/**
 * The model that actually answered: the response's own `model` (a refusal fallback answers as another model, and the
 * meter must price what ran), else the one asked for.
 */
export function answeredBy(payload: unknown, requested: string): string {
  const m = (payload as { model?: unknown } | null | undefined)?.model;
  return typeof m === 'string' && m ? m : requested;
}

/** True when a refusal fallback model served this response (`usage.iterations` carries a `fallback_message`). */
export function fellBack(payload: unknown): boolean {
  const it = (payload as { usage?: { iterations?: unknown } } | null | undefined)?.usage?.iterations;
  return Array.isArray(it) && it.some((e) => (e as { type?: unknown } | null)?.type === 'fallback_message');
}
