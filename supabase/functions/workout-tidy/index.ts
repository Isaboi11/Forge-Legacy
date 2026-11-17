/**
 * WORKOUT TIDY — a workout card written a way the code reader has never seen, rewritten in the reader's layout.
 *
 * ══ WHEN THIS IS CALLED, AND WHEN IT IS NOT ══
 *
 * PO, 2026-09-28: *"use AI when needed. For simple workouts it shouldn't be hard, but for workouts like this where
 * it's more complicated it might be difficult. Make sure to build a fool proof plan of when to use ai and when not
 * to."* Import Amendment 002 is the plan. The app calls this ONLY when `whenToUseAi`
 * (`src/domain/workout/workout-ai-gate.ts`) says the code reader could not read the card: a line not read, a lift
 * with no reps, a % that went nowhere. Every card the PO has sent is read by the rules and never reaches here.
 *
 * ══ ⚠ THE MODEL DOES NOT SET A NUMBER ══
 *
 * It rewrites WORDS into one fixed layout, the one `rowsToWrittenText` writes. The code reader on the device then
 * reads that layout exactly as it reads a typed card: sets, reps, percentages, rest, weights. Then
 * `checkAiRewrite` on the device THROWS THE REWRITE AWAY if any number in it is not on the card, any % on the card
 * is missing from it, or any lift in it is not on the card. The poster then sees it in the box, marked, with Undo,
 * and nothing is used until they press Use. Four walls; the prompt below is only the first.
 *
 * ⚠ SELF-CONTAINED ON PURPOSE. It imports nothing from `src/`, so THIS FILE is the dashboard paste copy: there is
 * no generated `deploy-*.ts` to fall out of step with it. The guard is on the device, which is where the rewrite
 * is accepted or not.
 *
 * ══ ⚠ THE KEY LIVES HERE AND NOWHERE ELSE ══
 *
 * `ANTHROPIC_API_KEY` is an Edge Function secret, the same one `program-photo-read` uses. It never reaches the app.
 *
 * ══ THE METER (AI Road to 10, Sprint 1) ══
 *
 * `coach_ai_reserve` holds the credit (Premium AI, the AI-sharing consent, the balance — 0268), the model runs
 * under this function's own 45 s abort (the app waits 60 s), and `coach_ai_settle` runs ONCE before the answer:
 * every failure after the reservation — upstream, timeout, refusal, cut off, not a workout — gives the credit
 * back (P-D2). No reply carries the upstream's words (P-D8) or the reservation id. The meter's code is a COPY of
 * `src/domain/ai/meter-server.ts` between the METER markers (`meter-server.test.mjs` holds the two together).
 *
 * No age line (P-G8): this is a copy job. The age cannot change what the card says, and one more line in the
 * request is one more way to corrupt a copy.
 *
 * Deploy: Supabase dashboard → Edge Functions → Deploy a new function → "Via Editor" → name it `workout-tidy` →
 * replace the editor contents with this whole file → Deploy. ⚠ Apply `pending-0268.sql` FIRST, or every call
 * answers "meter unavailable" (`coach_ai_reserve` does not exist before it).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** This function's deployed slug — the meter's `fn` (0268). */
const FN = 'workout-tidy';

/** Same model as `coach-interpret` and `program-photo-read`. One model is one set of numbers. */
const MODEL = 'claude-sonnet-5';

/** The meter's name for this call, weighted in `coach_ai_config.action_credits` (0232: 1 credit). */
const ACTION = 'workout_tidy';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Same ceiling as `MAX_AI_CHARS` on the device. A day's card is 300–1,200 characters. */
const MAX_CHARS = 6000;

/** One bad day's blast radius. A coach posting a month of cards in one sitting stays well under it. */
const MAX_TIDIES_PER_DAY = 40;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE METER — a COPY of src/domain/ai/meter-server.ts (without `export`). Change that file, then paste it here.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

// ── METER: begin ──
/**
 * The outcome `coach_ai_settle` stores (contract §1). Every value except `ok` refunds. `guarded`: a server guard
 * stopped the call after the reserve (coach-ask, a server-derived minor).
 */
type SettleOutcome =
  | 'ok'
  | 'upstream_error'
  | 'upstream_unreachable'
  | 'timeout'
  | 'refusal'
  | 'truncated'
  | 'not_a_program'
  | 'unreadable'
  | 'bad_output'
  | 'cancelled'
  | 'guarded';

/**
 * The server's own upstream abort, per function (contract §3). Each sits at least 10 s inside the app's timeout, so
 * the function always answers — with a refund — before the app gives up. coach-author's is the budget for BOTH of its
 * attempts together.
 */
const UPSTREAM_ABORT_MS: Readonly<Record<string, number>> = {
  'meal-photo-read': 75_000,
  'recipe-photo-read': 75_000,
  'program-photo-read': 75_000,
  'workout-card-read': 75_000,
  'coach-form-check': 75_000,
  'coach-kitchen': 45_000,
  'coach-interpret': 45_000,
  'workout-tidy': 45_000,
  'coach-author': 25_000,
};

/** As much of Anthropic's `usage` block as the ledger keeps. */
interface ModelUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/** The parts of a Messages API reply the functions read. */
interface ModelPayload {
  content?: { type: string; text: string }[];
  stop_reason?: string;
  model?: string;
  usage?: ModelUsage;
}

/** One model round trip. The failure kinds are the settle outcomes of the same name. */
type ModelCall =
  | { kind: 'ok'; payload: ModelPayload; latencyMs: number }
  | { kind: 'upstream_error'; status: number; latencyMs: number }
  | { kind: 'upstream_unreachable'; latencyMs: number }
  | { kind: 'timeout'; latencyMs: number };

/** What `coach_ai_reserve` answered. `id` is the reservation — ⛔ never put it, or this object, in a reply. */
type MeterReserve =
  | { ok: true; id: string; credits: number; remaining: number; allowance: number; ageYears: number | null; minor: boolean }
  | { ok: false; reason: 'not_entitled' | 'no_consent' | 'out_of_credits' | 'meter_unavailable'; remaining: number; allowance: number };

/** What `coach_ai_settle` answered. A settle that could not be written reads as not settled and not refunded. */
interface Settled {
  settled: boolean;
  refunded: boolean;
  remaining: number | null;
}

/** The facts of the model call(s) a settle records. */
interface CallFacts {
  model: string;
  usage?: ModelUsage | null;
  latencyMs?: number | null;
}

const meterInt = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);

/** `coach_ai_reserve`'s row → the reservation, or the refusal in the function's terms. A failed RPC is the meter down. */
function reserveFrom(data: unknown, error: unknown): MeterReserve {
  if (error || !data || typeof data !== 'object') return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
  const d = data as Record<string, unknown>;
  if (d.allowed === true) {
    if (typeof d.reservation_id !== 'string' || !d.reservation_id) return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
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
  // Refused. An answer this code does not know is still a refusal — it never reaches a model.
  const reason = d.reason === 'not_entitled' || d.reason === 'no_consent' ? d.reason : 'out_of_credits';
  return { ok: false, reason, remaining: meterInt(d.remaining), allowance: meterInt(d.allowance) };
}

/**
 * One model round trip under the function's own abort (contract §3). `send` makes the request with the signal it is
 * given; the body is read here too, so a reply that stalls half-way is also cut off. The upstream's own words go to
 * the function's log (dashboard → Edge Functions → Logs) and never into the result (P-D8).
 */
async function timedModelCall(send: (signal: AbortSignal) => Promise<Response>, abortMs: number): Promise<ModelCall> {
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
    } catch {
      return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_error', status: response.status, latencyMs: took() };
    }
  } catch {
    return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_unreachable', latencyMs: took() };
  } finally {
    clearTimeout(timer);
  }
}

/** A failed call, in the function's EXISTING reasons: our own timeout is `upstream_error` + `upstream: 'timeout'` (§1.2). */
function failedCallReply(kind: 'upstream_error' | 'upstream_unreachable' | 'timeout'): { reason: 'upstream_error' | 'upstream_unreachable'; upstream?: 'timeout' } {
  if (kind === 'timeout') return { reason: 'upstream_error', upstream: 'timeout' };
  return { reason: kind };
}

/** The model, tokens and round-trip time of one call, for the settle. */
function callFacts(call: ModelCall, fallbackModel: string): CallFacts {
  if (call.kind !== 'ok') return { model: fallbackModel, usage: null, latencyMs: call.latencyMs };
  return {
    model: typeof call.payload.model === 'string' && call.payload.model ? call.payload.model : fallbackModel,
    usage: call.payload.usage ?? null,
    latencyMs: call.latencyMs,
  };
}

/** `coach_ai_settle`'s arguments. Every outcome but `ok` refunds — a delivered, readable answer is the only charge. */
function settleArgs(reservation: string, outcome: SettleOutcome, facts: CallFacts): Record<string, unknown> {
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

/** `coach_ai_settle`'s row → what happened. */
function settledFrom(data: unknown, error: unknown): Settled {
  if (error || !data || typeof data !== 'object') return { settled: false, refunded: false, remaining: null };
  const d = data as Record<string, unknown>;
  return {
    settled: d.settled === true,
    refunded: d.settled === true && d.refunded === true,
    remaining: typeof d.remaining === 'number' && Number.isFinite(d.remaining) ? d.remaining : null,
  };
}

/** The balance after the settle (the reservation's when the settle did not answer), and `refunded: true` when it refunded. */
function settledTail(s: Settled, reservedRemaining: number): { remaining: number; refunded?: true } {
  const remaining = s.remaining ?? reservedRemaining;
  return s.refunded ? { remaining, refunded: true } : { remaining };
}

/**
 * P-G8: the server's age, as ONE line for the USER turn of a function whose model writes advice. It never goes in the
 * cached system block. Unknown age is no line (an unknown age reads as an adult, as `isUnderAge(null)` does). A minor
 * also gets the conservative-advice instruction.
 */
function ageLine(ageYears: number | null, minor: boolean): string | null {
  if (minor) {
    const age = ageYears != null && ageYears <= 18 ? `${ageYears}, under 18` : 'under 18';
    return `Athlete's age, from their profile: ${age}. Keep every suggestion conservative and right for supervised training: no maximal-effort sets or max attempts, and nothing about losing weight.`;
  }
  return ageYears == null ? null : `Athlete's age, from their profile: ${ageYears}.`;
}

/** A user turn with the age line after it, or unchanged when there is none. */
function withAgeLine(turn: string, ageYears: number | null, minor: boolean): string {
  const line = ageLine(ageYears, minor);
  return line ? `${turn}\n\n${line}` : turn;
}
// ── METER: end ──

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SYSTEM PROMPT — one stable block, cached. No per-request value in it, ever: the card is the user turn.
// ⚠ `workout-tidy-prompt.test.mjs` reads the example between the EXAMPLE markers and proves the code reader reads
// its output cleanly and that the output passes `checkAiRewrite` against its input. Edit the example, run that.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const SYSTEM = `You rewrite a workout card into one fixed plain-text layout, so that a strict program can read it. You are a copyist, not a coach.

# The only rule that matters

Every number you write must be on the card. Never add, change, round, total, convert or work out a number. If the card says 2½ min rest you may write rest 2:30, because that is the same time. If you cannot tell what a number belongs to, put the card's words on a * note line under the lift, unchanged. A note line is always safe; a guessed number never is.

Keep every lift, every percentage and every rest on the card. Do not drop anything to make it tidy. Do not correct or improve exercise names beyond spelling out an abbreviation the card uses (DB → Dumbbell is fine; do not change which lift it is).

# The layout

One item per line, in the card's order:

"Workout name"                                   the name, in double quotes, first line
Warm up: <the card's words>                      how the workout starts, and anything before the first lift
<Lift> warm up sets: 3 reps @ 55%, 3 reps @ 67%  build-up sets before a lift, when the card gives them as %
1. <Lift> 5 sets of 5 reps @ 75%                 same reps and % every set
1. <Lift> 4 sets of 2-4 reps                     a rep range
1. <Lift> 4,6,8,6,4 reps @ 67%                   different reps each set, one %
1. <Lift> 8 reps @ 50% rest 2:30, 9 reps @ 55% rest 2:30, 10 reps @ 60% rest 3:00
                                                 different % or rest per set: one "N reps @ P%" per set, in order
1. <Lift> 5 sets of 3 reps @ 80% of back squat max
                                                 a % of ANOTHER lift's max (back squat, bench, deadlift, front squat, overhead press)
1. <Lift> 1 set of 3 reps @ 75%                  "as many sets as possible" style: one set, and the instruction on a note
* <the card's words about the lift above>        cues, instructions, "each leg", time windows, options, distances
rest 2:00                                        the rest after every set of the lift above, as minutes:seconds
2. a. <Lift> 4 sets of 10 reps                   a superset: its first lift
super set b. <Lift> 4 sets of 10 reps            the next lift in the same superset (then c., d.)
rest 2:00 between each super set                 the rest after each round of the superset
Recovery: <the card's words>                     what comes after: cardio, food, walking, sleep

Number the lifts 1, 2, 3 … in order; a superset takes one number. Write "4x10" as "4 sets of 10 reps". A rep ladder on the card ("10-8-6-4 reps", one count per set) keeps the card's order exactly: write 10,8,6,4 reps, never sorted or reversed. When every count in it is the same ("10-10-10-10 reps"), write 4 sets of 10 reps. A lift with no rep count on the card (a carry for distance, a time) gets "N sets", where N is the card's own set count (leave the count out when the card gives none), and its distance or time on a * note. Leave out the date and the author's own scores and results ("I got 10 sets at 305"). Write nothing but the layout: no introduction, no explanation, no code fences.

If the text is not a workout at all, write exactly NOT_A_WORKOUT and nothing else.

# Example

The card:
<!-- EXAMPLE CARD -->
"THE PRESSURE COOKER"
Day: 21 Monday 10-21-24
Warm Up: Spike the Chili temp. Hit some build up squat sets. 3reps e 55%, 67%
1. BACK SQUAT 75%
Perform as many SETS of 3reps as possible in a 10 minute window of time.
Record how many SETS you got here 10.66 305LBS
2. BENCH PRESS = same warm up and same pressure cooker as the Squat.
3. SLOW Strict Chin Ups 5 sets of 3-6 reps
* 2 min rest between sets, Full range of motion add resistance if needed
a. Cable/or Band Triceps Pushdowns 4 x 20 reps
super set b. Heavy DB Shrugs 4x10 reps
c. Close Grip Pushups 4x10 reps * add weight if needed
2 min rest between each superset
Recovery
Steak and Eggs
30 min walk
<!-- /EXAMPLE CARD -->

The rewrite:
<!-- EXAMPLE REWRITE -->
"Day 21: The Pressure Cooker"
Warm up: Spike the Chili temp. Hit some build up squat sets.
Back Squat warm up sets: 3 reps @ 55%, 3 reps @ 67%
1. Back Squat 1 set of 3 reps @ 75%
* Perform as many sets of 3 reps as possible in a 10 minute window of time.
Bench Press warm up sets: 3 reps @ 55%, 3 reps @ 67%
2. Bench Press 1 set of 3 reps @ 75%
* Perform as many sets of 3 reps as possible in a 10 minute window of time.
3. Slow Strict Chin Ups 5 sets of 3-6 reps
* Full range of motion, add resistance if needed
rest 2:00
4. a. Cable Triceps Pushdowns 4 sets of 20 reps
* Or band
super set b. Heavy DB Shrugs 4 sets of 10 reps
super set c. Close Grip Pushups 4 sets of 10 reps
* Add weight if needed
rest 2:00 between each super set
Recovery: Steak and Eggs · 30 min walk
<!-- /EXAMPLE REWRITE -->`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!ANTHROPIC_API_KEY) return json({ ok: false, reason: 'unconfigured' }, 503);

  let text = '';
  try {
    text = String((await req.json())?.text ?? '').trim();
  } catch {
    return json({ ok: false, reason: 'bad_request' }, 400);
  }
  if (!text) return json({ ok: false, reason: 'bad_request' }, 400);
  if (text.length > MAX_CHARS) return json({ ok: false, reason: 'too_long' }, 400);

  // The caller's JWT, so every RPC runs as that athlete under RLS. No service key, same as program-photo-read.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  // ── 0. The day's ceiling, read before a credit is reserved ─────────────────
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('coach_ai_spend')
    .select('id', { count: 'exact', head: true })
    .eq('action', ACTION)
    .gte('occurred_at', since.toISOString());
  if (!countError && (count ?? 0) >= MAX_TIDIES_PER_DAY) return json({ ok: false, reason: 'daily_limit' }, 429);

  // ── 1. Reserve the credit BEFORE the model call — Premium AI (0203) and the consent check (0268) ──
  //
  // The credit is HELD until step 3 settles it; every failure from here on gives it back (P-D2).
  // ⛔ `meter.id` (the reservation) stays in this function — no reply carries it.
  const { data: reservedRow, error: reserveError } = await supabase.rpc('coach_ai_reserve', { p_action: ACTION, p_fn: FN }).maybeSingle();
  const meter = reserveFrom(reservedRow, reserveError);
  if (!meter.ok) {
    if (meter.reason === 'meter_unavailable') return json({ ok: false, reason: 'meter_unavailable' }, 503);
    if (meter.reason === 'no_consent') return json({ ok: false, reason: 'no_consent' }, 403);
    // No allowance at all is not "out of credits", and the app says which.
    return json({ ok: false, reason: meter.reason, remaining: meter.remaining });
  }
  /** Settled ONCE, before the answer is returned (contract §1.3). Every outcome but `ok` refunds. */
  const settle = async (outcome: SettleOutcome, call: ModelCall) => {
    const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, callFacts(call, MODEL))).maybeSingle();
    return settledTail(settledFrom(data, error), meter.remaining);
  };

  // ── 2. The model call, under this function's own abort (contract §3) ───────
  const call = await timedModelCall(
    (signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8000,
          // The cards that reach here are the hard ones (missions, clusters, "same as the squat"), so the model
          // may think before it writes. Effort stays low: this is a copy job with a code check behind it.
          thinking: { type: 'adaptive' },
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: `<card>\n${text}\n</card>\n\nRewrite this card in the layout.` }],
        }),
      }),
    UPSTREAM_ABORT_MS[FN],
  );

  // Unreachable, a non-2xx, or our own abort: refunded. The upstream's words are in this function's log only (P-D8).
  if (call.kind !== 'ok') {
    return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind, call)) }, 503);
  }
  const payload = call.payload;

  // ── 3. The answer, then the settle ─────────────────────────────────────────
  // A refusal, or an answer cut off at the cap, is a card that was not rewritten — never half of one. Refunded.
  if (payload?.stop_reason === 'refusal' || payload?.stop_reason === 'max_tokens') {
    return json({ ok: false, reason: 'unreadable', ...(await settle(payload.stop_reason === 'refusal' ? 'refusal' : 'truncated', call)) });
  }

  const out: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')
    .replace(/^\s*```[a-z]*\s*\n?|\n?\s*```\s*$/g, '')
    .trim();

  if (!out || /^NOT_A_WORKOUT\b/.test(out)) return json({ ok: false, reason: 'not_a_workout', ...(await settle('not_a_program', call)) });
  return json({ ok: true, text: out.slice(0, MAX_CHARS * 2), ...(await settle('ok', call)) });
});
