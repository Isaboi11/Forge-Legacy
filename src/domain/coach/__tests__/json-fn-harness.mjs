/**
 * THE REAL PASTE BUNDLES OF THE JSON AI FUNCTIONS, RUN OFFLINE — coach-interpret, coach-kitchen, coach-form-check
 * (AI Road to 10 Sprint 2). The sibling of `coach-ask-harness.mjs`, for functions that answer with one JSON body.
 *
 * `loadJsonFunction(build, log)` takes a bundle builder (`buildCoachInterpretDeploy`, …), swaps the jsr import for a
 * fake `createClient`, and loads the code that gets deployed in Node with a fake `Deno`. The meter
 * (`coach_ai_reserve` / `coach_ai_settle`), `has_nutrition_access`, the day's `coach_ai_spend` count and the Anthropic
 * API are fakes; `log` records what was asked.
 *
 * ⚠ No request leaves the machine. Not a test file itself (no `.test.mjs`).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RESERVATION = 'res-json-SECRET';

/** An adult with credits. Override any field per test with `meter.reserve`. */
export const ADULT = Object.freeze({
  allowed: true,
  reason: 'ok',
  reservation_id: RESERVATION,
  credits_spent: 1,
  remaining: 40,
  allowance: 50,
  age_years: 30,
  minor: false,
});

export const newLog = (meter = {}) => ({ rpcs: [], requests: [], meter });

function fakeSupabase(log) {
  const reply = (data) => {
    const p = Promise.resolve({ data, error: null });
    return { maybeSingle: () => p, then: (ok, bad) => p.then(ok, bad) };
  };
  return {
    rpc: (name, args) => {
      log.rpcs.push([name, args]);
      if (name === 'coach_ai_reserve') return reply({ ...ADULT, ...(log.meter.reserve ?? {}) });
      if (name === 'coach_ai_settle') return reply({ settled: true, refunded: args.p_refund === true, cost_usd: 0.01, remaining: args.p_refund ? 41 : 40 });
      if (name === 'has_nutrition_access') return reply(true);
      throw new Error(`unexpected rpc ${name}`);
    },
    from: () => {
      const b = { select: () => b, eq: () => b, gte: () => Promise.resolve({ count: log.meter.today ?? 0, error: null }) };
      return b;
    },
  };
}

/** Load a bundle; returns its `Deno.serve` handler. */
export async function loadJsonFunction(build, log) {
  const src = build().replace(
    /^import \{ createClient \} from 'jsr:@supabase\/supabase-js@2';$/m,
    'const createClient = (...a) => globalThis.__fakeJsonClient(...a);',
  );
  assert.ok(!src.includes("from 'jsr:"), 'the jsr import was not replaced');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'json-fn-')), 'fn.mts');
  fs.writeFileSync(file, src);
  let handler = null;
  globalThis.Deno = {
    env: { get: (k) => ({ ANTHROPIC_API_KEY: 'test-key', SUPABASE_URL: 'http://fake', SUPABASE_ANON_KEY: 'anon' })[k] },
    serve: (h) => (handler = h),
  };
  globalThis.__fakeJsonClient = () => fakeSupabase(log);
  await import(pathToFileURL(file).href);
  assert.ok(handler, 'Deno.serve was never called');
  return handler;
}

/** A fake Anthropic that answers every call with `text` (one text block). Restored after the test. */
export function fakeModel(t, log, text, extra = {}) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.anthropic.com/v1/messages', `unexpected network call: ${url}`);
    log.requests.push(JSON.parse(init.body));
    const body = { model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'text', text }], usage: { input_tokens: 100, output_tokens: 50 }, ...extra };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  t.after(() => (globalThis.fetch = real));
}

/** POST a JSON body; returns `{ status, json }`. */
export async function post(handler, body) {
  const res = await handler(new Request('http://fake/fn', { method: 'POST', headers: { Authorization: 'Bearer jwt', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  return { status: res.status, json: JSON.parse(await res.text()) };
}

/** The settle calls made, as `[outcome, refund]`. */
export const settled = (log) => log.rpcs.filter(([n]) => n === 'coach_ai_settle').map(([, a]) => [a.p_outcome, a.p_refund]);
