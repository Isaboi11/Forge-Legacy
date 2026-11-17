/**
 * THE REAL coach-ask PASTE BUNDLE, RUN OFFLINE — shared by coach-ask-loop.test.mjs and coach-ask-turn.test.mjs.
 *
 * `loadFunction` builds the dashboard paste copy (the exact code that gets deployed), swaps the jsr import for a
 * fake `createClient`, and loads it in Node with a fake `Deno`. The meter (`coach_ai_reserve` / `coach_ai_settle`,
 * Sprint 1 contract §1), the athlete's tables and the Anthropic API are all fakes.
 *
 * ⚠ No request leaves the machine: every test replaces `fetch`, and the fakes throw on anything unexpected.
 * Not a test file itself (no `.test.mjs`), so `node --test "src/**\/*.test.mjs"` does not run it alone.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildCoachAskDeploy } from '../../../../scripts/build-coach-ask-deploy.mjs';

export const BENCH = [
  {
    started_at: '2026-09-22T23:30:00Z',
    workout_exercises: [{ name: 'Barbell Bench Press', catalog_key: null, section: 'main', workout_sets: [{ set_index: 0, weight: 225, weight_unit: 'lb', reps: 5 }] }],
  },
  {
    started_at: '2026-03-05T15:00:00Z',
    workout_exercises: [{ name: 'Barbell Bench Press', catalog_key: null, section: 'main', workout_sets: [{ set_index: 0, weight: 205, weight_unit: 'lb', reps: 5 }] }],
  },
];

/** The reservation id the fake meter hands out — the tests prove it never reaches the app. */
export const RESERVATION = 'res-0000-SECRET-RESERVATION';

/** An adult with credits — `coach_ai_reserve`'s happy row. Override any field per test. */
export const RESERVED = Object.freeze({
  allowed: true,
  reason: 'ok',
  reservation_id: RESERVATION,
  credits_spent: 1,
  remaining: 41,
  allowance: 50,
  age_years: 30,
  minor: false,
});

/** A fresh log for one test. `meter.reserve` replaces the reserve row; `meter.settleDelayMs` slows settle down. */
export const newLog = (meter = {}) => ({ reads: [], rpcs: [], inserts: [], jwt: null, requests: [], timeline: [], meter });

/** A fake supabase client: the meter, the athlete's JWT, and their tables. Records what was asked. */
export function fakeSupabase(log) {
  const from = (table) => {
    const q = { table, eq: [] };
    log.reads.push(q);
    const rows = { workouts: BENCH, profiles: [{ app_prefs: { units: 'imperial' } }] }[table] ?? [];
    const result = () => {
      const r = { data: rows, error: null };
      const ms = log.meter.readDelayMs ?? 0;
      return ms ? new Promise((ok) => setTimeout(() => ok(r), ms)) : Promise.resolve(r);
    };
    const b = {
      select: () => b,
      eq: (k, v) => (q.eq.push([k, v]), b),
      gte: () => b,
      lte: () => b,
      lt: () => b,
      in: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      insert: (row) => (log.inserts.push([table, row]), Promise.resolve({ error: null })),
      then: (ok, bad) => result().then(ok, bad),
    };
    return b;
  };
  return {
    from,
    auth: { getUser: (jwt) => ((log.jwt = jwt), Promise.resolve({ data: { user: { id: 'athlete-1' } } })) },
    rpc: (name, args) => {
      log.rpcs.push([name, args]);
      log.timeline.push(['rpc', name, Date.now()]);
      if (name === 'coach_ai_reserve') {
        const reply = log.meter.reserveError
          ? { data: null, error: { message: 'meter down' } }
          : { data: { ...RESERVED, ...(log.meter.reserve ?? {}) }, error: null };
        return { maybeSingle: () => Promise.resolve(reply) };
      }
      if (name === 'coach_ai_settle') {
        const refunded = args.p_refund === true;
        const row = { settled: true, refunded, cost_usd: 0.002, remaining: refunded ? 42 : 41 };
        const ms = log.meter.settleDelayMs ?? 0;
        return {
          maybeSingle: () =>
            new Promise((ok) =>
              setTimeout(() => {
                log.timeline.push(['settled', Date.now()]);
                ok({ data: row, error: null });
              }, ms),
            ),
        };
      }
      // ⛔ The old meter is gone from this function (Sprint 1): fail loudly if it comes back.
      throw new Error(`unexpected rpc ${name}`);
    },
  };
}

/** One streamed model reply, as Anthropic sends it. */
export function sse(events, init = {}) {
  const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' }, ...init });
}

/**
 * A streamed reply that sends `events` and then HANGS — the way a stalled upstream looks. Like a real fetch body,
 * it errors when the request's signal aborts (the WHATWG rule), so the function's own abort is what ends it.
 */
export function stalledSse(events, signal) {
  const enc = new TextEncoder();
  let i = 0;
  const body = new ReadableStream({
    start(c) {
      signal?.addEventListener('abort', () => {
        try {
          c.error(new DOMException('The operation was aborted.', 'AbortError'));
        } catch {
          /* already closed */
        }
      });
    },
    pull(c) {
      if (i < events.length) {
        const e = events[i++];
        c.enqueue(enc.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
        return;
      }
      return new Promise(() => {});
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

/** A fetch that never answers until its signal aborts — then rejects, as a real one does. */
export const hangingFetch = (init) =>
  new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError'))));

/** An Anthropic error reply. Retry-After 0 so a retry test does not wait the default second. */
export const errorReply = (status, message = 'Overloaded', extra = {}) =>
  new Response(JSON.stringify({ type: 'error', error: { type: status === 529 ? 'overloaded_error' : 'api_error', message } }), {
    status,
    headers: { 'content-type': 'application/json', 'retry-after': '0', ...extra },
  });

export const toolRound = (name = 'get_lift_history', input = '{"exercise": "bench"}', text = '') =>
  sse([
    { type: 'message_start', message: { model: 'claude-sonnet-5', usage: { input_tokens: 900, cache_read_input_tokens: 3000, cache_creation_input_tokens: 0, output_tokens: 1 } } },
    ...(text
      ? [
          { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
          { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
          { type: 'content_block_stop', index: 0 },
        ]
      : []),
    { type: 'content_block_start', index: text ? 1 : 0, content_block: { type: 'tool_use', id: 'tu_1', name, input: {} } },
    { type: 'content_block_delta', index: text ? 1 : 0, delta: { type: 'input_json_delta', partial_json: input.slice(0, 6) } },
    { type: 'content_block_delta', index: text ? 1 : 0, delta: { type: 'input_json_delta', partial_json: input.slice(6) } },
    { type: 'content_block_stop', index: text ? 1 : 0 },
    { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 40 } },
    { type: 'message_stop' },
  ]);

export const answerEvents = (text, stop = 'end_turn') => [
  { type: 'message_start', message: { model: 'claude-sonnet-5', usage: { input_tokens: 1400, cache_read_input_tokens: 3000, cache_creation_input_tokens: 0, output_tokens: 1 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  ...(text
    ? [
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(0, 20) } },
        ...(text.length > 20 ? [{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(20) } }] : []),
      ]
    : []),
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: stop }, usage: { output_tokens: 60 } },
  { type: 'message_stop' },
];

export const answerRound = (text, stop = 'end_turn') => sse(answerEvents(text, stop));

/**
 * Load the deploy copy with the fakes wired in; returns the Deno.serve handler. `overrides` rewrites a constant
 * in the bundle (`{ ASK_SERVER_IDLE_MS: 80 }`) so a clock test runs in milliseconds — the line must exist.
 */
export async function loadFunction(log, overrides = {}) {
  let src = buildCoachAskDeploy().replace(
    /^import \{ createClient \} from 'jsr:@supabase\/supabase-js@2';$/m,
    'const createClient = (...a) => globalThis.__fakeCreateClient(...a);',
  );
  assert.ok(!src.includes("from 'jsr:"), 'the jsr import was not replaced');
  for (const [name, value] of Object.entries(overrides)) {
    const re = new RegExp(`^export const ${name} = [\\d_]+;$`, 'm');
    assert.match(src, re, `${name} is not a plain numeric constant in the bundle`);
    src = src.replace(re, `export const ${name} = ${value};`);
  }
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'coach-ask-')), 'fn.mts');
  fs.writeFileSync(file, src);
  let handler = null;
  globalThis.Deno = {
    env: { get: (k) => ({ ANTHROPIC_API_KEY: 'test-key', SUPABASE_URL: 'http://fake', SUPABASE_ANON_KEY: 'anon' })[k] },
    serve: (h) => (handler = h),
  };
  globalThis.__fakeCreateClient = () => fakeSupabase(log);
  await import(pathToFileURL(file).href);
  assert.ok(handler, 'Deno.serve was never called');
  return handler;
}

export const request = (body, headers = {}) =>
  new Request('http://fake/functions/v1/coach-ask', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-abc', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

/** The `data:` events of an SSE body, parsed. */
export const dataEvents = (text) =>
  text
    .split('\n\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)));

/** Ask, and read the whole reply: `{ status, type, raw, events }` (`events` empty for a JSON reply). */
export async function askRaw(handler, body) {
  const res = await handler(request(body));
  const raw = await res.text();
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, type, raw, events: type.includes('text/event-stream') ? dataEvents(raw) : [], json: type.includes('json') ? JSON.parse(raw) : null };
}

export async function ask(handler, question, tz = 300) {
  return (await askRaw(handler, { question, history: [], context: {}, tz })).events;
}

/** Install a fake Anthropic for one test: `reply(body, init, n)` returns the Response. Restored after the test. */
export function fakeAnthropic(t, log, reply) {
  const realFetch = globalThis.fetch;
  let n = 0;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.anthropic.com/v1/messages', `unexpected network call: ${url}`);
    const body = JSON.parse(init.body);
    log.requests.push(body);
    log.timeline.push(['model', Date.now()]);
    n += 1;
    return reply(body, init, n);
  };
  t.after(() => (globalThis.fetch = realFetch));
}

/** The settle calls the function made. */
export const settles = (log) => log.rpcs.filter(([n]) => n === 'coach_ai_settle').map(([, a]) => a);
