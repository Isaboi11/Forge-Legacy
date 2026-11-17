/**
 * ══ WHAT A MODEL CALL COSTS — the per-model rate map (AI Road to 10, Sprint 1 · P-D5) ══
 *
 * A MIRROR of `coach_ai_config.model_rates` and `coach_ai_rate_cost()` in migration 0268
 * (`Docs/AI-Sprint-1-Build-Notes.md` §2). The database is the one that prices the ledger; this copy exists so a page
 * or a script can say what a call cost without a round trip, and `model-rates.test.mjs` fails the moment the two
 * disagree (it parses the SQL literal out of the migration).
 *
 * USD per million tokens, Anthropic list prices (cached table 2026-11-03 — check the pricing page before the first
 * monthly reconcile against the invoice).
 *
 * Pure and import-free: `node --test` runs it directly.
 */

export interface ModelRate {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
}

export const MODEL_RATES: Readonly<Record<string, ModelRate>> = {
  'claude-sonnet-5': { input: 2.0, output: 10.0, cache_read: 0.2, cache_write: 2.5 },
  'claude-sonnet-5-5': { input: 2.0, output: 10.0, cache_read: 0.1, cache_write: 2.5 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0, cache_read: 0.1, cache_write: 1.25 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cache_read: 0.01, cache_write: 0.125 },
  'claude-opus-5-5': { input: 4.0, output: 20.0, cache_read: 0.2, cache_write: 5.0 },
  'claude-opus-5': { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  default: { input: 2.0, output: 10.0, cache_read: 0.2, cache_write: 2.5 },
};

/**
 * The key a model is priced under: the exact key, else the LONGEST key that is a prefix of the model
 * (`claude-haiku-4-5-20251001` → `claude-haiku-4-5`), else `default`. Same order as `coach_ai_rate_cost()`.
 */
export function rateKeyFor(model: string | null | undefined, rates: Readonly<Record<string, ModelRate>> = MODEL_RATES): string {
  if (model && Object.prototype.hasOwnProperty.call(rates, model)) return model;
  let best: string | null = null;
  if (model) {
    for (const key of Object.keys(rates)) {
      if (key === 'default' || !model.startsWith(key)) continue;
      if (best == null || key.length > best.length) best = key;
    }
  }
  return best ?? 'default';
}

export interface TokenCounts {
  input?: number | null;
  output?: number | null;
  cacheRead?: number | null;
  cacheWrite?: number | null;
}

/** USD for one call, rounded to 6 places like the ledger's numeric(12,6). Negative or missing counts are 0. */
export function rateCost(model: string | null | undefined, t: TokenCounts, rates: Readonly<Record<string, ModelRate>> = MODEL_RATES): number {
  const r = rates[rateKeyFor(model, rates)];
  const n = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
  const usd = (n(t.input) * r.input + n(t.output) * r.output + n(t.cacheRead) * r.cache_read + n(t.cacheWrite) * r.cache_write) / 1_000_000;
  return Math.round(usd * 1_000_000) / 1_000_000;
}
