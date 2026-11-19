/**
 * COACH REWRITE — Holt rewrites the program an athlete is running, for ANY change they ask (Holt Listens, PO D12
 * 2026-11-19: "this is AI — I shouldn't have to give every example"; "AI rewrites, the app checks").
 *
 * coach-ask's chat calls `propose_program_change { brief }`; the device reads the running program and sends this
 * function the weeks still ahead (as text), what the athlete said and Holt's brief. One model call returns the change
 * (`REWRITE_SCHEMA`: sessions written once by name, per-week overrides, rest days). The DEVICE then checks every row
 * (`engine/checker.ts`) and shows a before/after to confirm — nothing here writes anything.
 *
 * Same pattern as `coach-author`: auth → `medicalRoute` → reserve → model → shape check → settle → return.
 *
 * ══ THE SHAPE ══
 *
 *   0. The request, narrowed (`narrowRewriteRequest`): plain fields; THIS function builds the user turn.
 *   1. The code guard on the athlete's words and the brief (`medicalRoute`) — before any credit (PO 09-22).
 *   2. Reserve the credit (`coach_ai_reserve`, action `program`) — the Premium AI gate, the AI-sharing consent and the
 *      server's age. D11: a change opened in Holt's chat rides that turn's credit, as a typed build does (0281 extends
 *      0276's `typed_build` waiver to `coach-rewrite`; coach-ask marks a propose_program_change turn `opened_build`).
 *      Before 0281 is applied a change is chat 1 + this 1.
 *   3. One call — Sonnet 5, thinking off, effort low, cached system block (rules + catalogue), structured output, ONE
 *      75 s budget (a 5-day block rewrite measured 10–55 s live, 11-19).
 *   4. The shape check (`rewriteFromModelText`), settle ONCE, return. Every failure after the reservation refunds.
 *
 * ══ THE WIRE ══
 *
 *   { ok: false, reason: 'bad_request' }                                      400
 *   { ok: false, reason: 'stop', route: 'crisis'|'urgent'|'care'|'medical' }    200  (no credit spent)
 *   { ok: false, reason: 'no_consent' }                                       403
 *   { ok: false, reason: 'out_of_credits', remaining, allowance }             200
 *   { ok: false, reason: 'unconfigured'|'meter_unavailable' }                 503
 *   { ok: false, reason: 'upstream_error'|'upstream_unreachable', upstream?: 'timeout', remaining, refunded: true } 503
 *   { ok: false, reason: 'none', remaining, refunded: true }                  200
 *   { ok: true, text, remaining, usage }   — `text` is the model's JSON; the device parses and checks it
 *
 * ⛔ No reply carries the upstream's words beyond the structured answer (P-D8) or the reservation id.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE PROMPT, THE SHAPE AND THE CAPS — the app imports the same module.
import { narrowRewriteRequest, REWRITE_OUTPUT_CAP, REWRITE_SCHEMA, rewriteFromModelText, rewriteSystem, rewriteUserTurn } from '../../../src/domain/coach/rewrite-wire.ts';
import { AUTHOR_CATALOGUE } from '../../../src/domain/coach/author-catalogue.ts';
import { medicalRoute } from '../../../src/domain/coach/medical-routing.ts';
import { failedCallReply, reserveFrom, settleArgs, settledFrom, settledTail, type SettleOutcome, timedModelCall, withAgeLine } from '../../../src/domain/ai/meter-server.ts';
import { answeredBy, anthropicHeaders, EFFORTS, KNOWN_MODELS, requestFields } from '../../../src/domain/ai/model-request.ts';
import { modelConfigReader, uidFromAuthorization } from '../../../src/domain/ai/model-config.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** This function's deployed slug — the meter's `fn`. */
const FN = 'coach-rewrite';
/** The upstream budget: ≥ 10 s inside the app's 90 s (contract §3), so the function always answers with a refund. */
const UPSTREAM_MS = 75_000;

/** The same text the app's `REWRITE_SYSTEM` is (rewrite.ts) — rules + the exercise library. */
const REWRITE_SYSTEM = rewriteSystem(AUTHOR_CATALOGUE);

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

  // ── 0. The request ──
  const request = narrowRewriteRequest(raw);
  if (!request.said.length || !request.program) return json({ ok: false, reason: 'bad_request' }, 400);

  // ── 1. The code guard, BEFORE anything is spent — every line they said, and Holt's brief ──
  for (const line of [...request.said, request.brief]) {
    const guard = medicalRoute(line);
    if (guard === 'clear') continue;
    const route = guard === 'crisis' || guard === 'urgent' || guard === 'care' ? guard : 'medical';
    return json({ ok: false, reason: 'stop', route });
  }

  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } });

  // ── 2. Reserve the credit ──
  const { data: reservedRow, error: reserveError } = await supabase.rpc('coach_ai_reserve', { p_action: 'program', p_fn: FN }).maybeSingle();
  const meter = reserveFrom(reservedRow, reserveError);
  if (!meter.ok) {
    if (meter.reason === 'meter_unavailable') return json({ ok: false, reason: 'meter_unavailable' }, 503);
    if (meter.reason === 'no_consent') return json({ ok: false, reason: 'no_consent' }, 403);
    return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
  }

  // ── 3. The model call ──
  const choice = await modelConfig.pick(FN, uidFromAuthorization(authorization), { model: MODEL, effort: EFFORT });
  const model = choice.model;
  // ⛔ The schema has no field for a load — he cannot write a weight because there is nowhere to put one (PO D13).
  const modelFields = requestFields(model, { thinkingOff: true, effort: choice.effort ?? EFFORT, format: { type: 'json_schema', schema: REWRITE_SCHEMA } });
  const turn = withAgeLine(rewriteUserTurn(request), meter.ageYears, meter.minor);
  const call = await timedModelCall(
    (signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: anthropicHeaders(ANTHROPIC_API_KEY!, modelFields),
        body: JSON.stringify({
          model,
          max_tokens: REWRITE_OUTPUT_CAP,
          ...modelFields,
          system: [{ type: 'text', text: REWRITE_SYSTEM, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: turn }],
        }),
      }),
    UPSTREAM_MS,
  );

  let modelUsed = model;
  const total = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  const settle = async (outcome: SettleOutcome) => {
    const usage = { input_tokens: total.input, output_tokens: total.output, cache_read_input_tokens: total.cacheRead, cache_creation_input_tokens: total.cacheWrite };
    const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, { model: modelUsed, usage, latencyMs: call.latencyMs })).maybeSingle();
    return settledTail(settledFrom(data, error), meter.remaining);
  };

  if (call.kind !== 'ok') return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind)) }, 503);

  const payload = call.payload;
  const usage = payload?.usage ?? {};
  modelUsed = answeredBy(payload, model);
  total.input += usage.input_tokens ?? 0;
  total.output += usage.output_tokens ?? 0;
  total.cacheRead += usage.cache_read_input_tokens ?? 0;
  total.cacheWrite += usage.cache_creation_input_tokens ?? 0;
  if (payload?.stop_reason === 'refusal') return json({ ok: false, reason: 'none', ...(await settle('refusal')) });

  const text: string = (payload?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');

  // ── 4. THE SHAPE CHECK — the device then checks every row against the athlete (`engine/checker.ts`) ──
  if (!rewriteFromModelText(text)) {
    return json({ ok: false, reason: 'none', ...(await settle(payload?.stop_reason === 'max_tokens' ? 'truncated' : 'bad_output')) });
  }
  return json({ ok: true, text, ...(await settle('ok')), usage: { model: modelUsed, ...total } });
});
