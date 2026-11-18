/**
 * WORKOUT CARD READ — a photograph of a coach's workout card becomes its text, line by line.
 *
 * ══ WHY THIS IS NOT `program-photo-read` ══
 *
 * That function reads a TABLE and can only answer in tab-separated rows; every other line is dropped in code, so it
 * has no channel that carries a sentence. It stays exactly as it is, for program import.
 *
 * A handwritten card is not a table (PO 2026-09-30, Squatober Season 12 Day 1). Read as one, the card's title had
 * no row to sit in, and the warm-up, the rests and "super set all 3" landed in whichever cell the model chose that
 * day; nine squat sets were posted as one. Here the card is copied as it is written, top to bottom, and the app
 * then does what it does with typed words: the AI layout (`workout-tidy`), `checkAiRewrite`, and the code reader.
 * Import Amendment 002 (amended 2026-09-30) is the governing text.
 *
 * ══ ⚠ THE MODEL STILL SETS NO NUMBER AND DESCRIBES NOTHING ══
 *
 * It copies characters. The guards, in order: the prompt below; the rule `LIFTY` (no training written in the answer
 * = not a workout, so a description of a photograph is refused, and the answer is capped);
 * `cleanCardTranscript` on the device, which is the same rule and the one that decides; and then nothing is posted
 * as it stands — the text goes in the poster's own box and through the reader.
 *
 * ⚠ SELF-CONTAINED ON PURPOSE. It imports nothing from `src/`, so THIS FILE is the dashboard paste copy.
 *
 * ══ ⚠ THE KEY LIVES HERE AND NOWHERE ELSE ══
 *
 * `ANTHROPIC_API_KEY` is an Edge Function secret, the same one `program-photo-read` uses. It never reaches the app.
 *
 * ══ THE METER (AI Road to 10, Sprint 1) ══
 *
 * `coach_ai_reserve` holds the credits (Premium AI, the AI-sharing consent, the balance — 0268), the model runs
 * under this function's own 75 s abort (the app waits 90 s), and `coach_ai_settle` runs ONCE before the answer:
 * every failure after the reservation — upstream, timeout, refusal, cut off, not a workout — gives the credits
 * back (P-D2; AI audit V-D1 found real cards refused with their 2 credits kept). No reply carries the upstream's
 * words (P-D8) or the reservation id. The meter's code is a COPY of `src/domain/ai/meter-server.ts` between the
 * METER markers (`meter-server.test.mjs` holds the two together).
 *
 * No age line (P-G8): this is a transcription. The age cannot change what the card says, and one more line in the
 * request is one more way to corrupt a copy.
 *
 * Deploy: Supabase dashboard → Edge Functions → Deploy a new function → "Via Editor" → name it `workout-card-read`
 * → replace the editor contents with this whole file → Deploy. It meters as `photo_import`, the action
 * `program-photo-read` already uses (0174) — the same job, a photo transcribed, at the same price. ⚠ Apply
 * `pending-0268.sql` FIRST, or every read answers "meter unavailable" (`coach_ai_reserve` does not exist before it).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** This function's deployed slug — the meter's `fn` (0268). */
const FN = 'workout-card-read';

/** Same model as `program-photo-read` and `workout-tidy`. One model is one set of numbers. */
const MODEL = 'claude-sonnet-5';

/** The meter's name for this call — the photo transcription action, shared with `program-photo-read`. */
const ACTION = 'photo_import';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** 5 MB of image in base64 — the Messages API's own per-image limit (see `program-photo-read`). */
const MAX_BASE64_CHARS = 6_990_000;
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** One bad day's blast radius, counted together with `program-photo-read` (same action). */
const MAX_READS_PER_DAY = 60;

/** Same ceilings as `cleanCardTranscript` on the device. */
const MAX_CARD_CHARS = 6000;
const MAX_CARD_LINES = 120;

/*
 * IS THERE TRAINING WRITTEN HERE — a COPY of `LIFTY` in `src/domain/workout/card-transcript.ts`, which explains each
 * line (AI audit 2026-11-16, V-D1: the first rule refused "4×6-8", "15 Push-ups", "Run 5 km" and Sets/Reps sheets,
 * and kept their credits). ⚠ Change both, character for character: `card-rule.test.mjs` fails when they differ.
 */
// ── LIFTY: begin ──
const LIFT_MOVE = String.raw`\b(?:push[ -]?ups?|pull[ -]?ups?|chin[ -]?ups?|sit[ -]?ups?|squats?|lunges?|burpees?|planks?|rows?|rowing|run|jog|sprints?|jumps?|jumping|crunch(?:es)?|swim|bike|swings?|wall[ -]?sits?|dead[ -]?hangs?|mountain[ -]?climbers?)\b`;
const LIFT_TIME = String.raw`(?:\d+(?:\.\d+)?[ \t]*(?:s|secs?|seconds?|mins?|minutes?)\b|\b\d{1,2}:\d{2}\b)`;
const LIFT_DISTANCE = String.raw`\d+(?:\.\d+)?[ \t]*(?:m|km|k|mi|miles?|meters?|metres?|yds?|yards?|cals?)\b`;
const LIFT_AMOUNT = `(?:${LIFT_TIME}|${LIFT_DISTANCE})`;
const LIFTY = new RegExp(
  [
    String.raw`\d[ \t]*[x×][ \t]*(?!\d*[.,]\d\d(?!\d))\d`,
    String.raw`${LIFT_AMOUNT}[ \t]*[x×][ \t]*\d`,
    String.raw`\d[ \t]*(?:sets?|reps?)\b`,
    String.raw`\b(?:sets?|reps?)[ \t]*[:=][ \t]*\d`,
    String.raw`@[ \t]*\d{1,3}(?:\.\d+)?[ \t]*%`,
    String.raw`\d[ \t]*%[ \t]*(?:of[ \t]+)?(?:your[ \t]+)?(?:e?1[ \t]*rm|rm|max|tm)\b`,
    String.raw`\d[ \t]*%[^\n]*\d[ \t]*%`,
    String.raw`\b(?:sets?\b[^\n]*\breps?|reps?\b[^\n]*\b(?:sets?|weight|load|lbs?|kgs?)|(?:weight|load)\b[^\n]*\breps?)\b[^\n]*\n[\s\S]*?\d`,
    String.raw`^[ \t]*(?:[-*•·]|\d{1,2}[.)])?[ \t]*\d{1,3}[ \t]+(?:[a-z]+[ \t]+)?${LIFT_MOVE}`,
    String.raw`${LIFT_MOVE}(?:[ \t]+[a-z]+)?[ \t]*[:\-–—]?[ \t]*(?:for[ \t]+)?${LIFT_AMOUNT}`,
    String.raw`${LIFT_AMOUNT}[ \t]+(?:of[ \t]+)?(?:[a-z]+[ \t]+)?${LIFT_MOVE}`,
    String.raw`\b(?:emom|amrap|tabata)\b`,
  ].join('|'),
  'im',
);
// ── LIFTY: end ──

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
// THE SYSTEM PROMPT — one stable block. No per-request value in it, ever: the image is the user turn.
// This is the prompt the live proof ran on the PO's own photo on 2026-09-30 (6 lifts, every number right).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const SYSTEM = `You are a transcriber. You copy a photograph of a workout card into plain text, line by line.

# Your entire job

Write out every line of the workout exactly as it is written, top to bottom, one line of the card per line of text. You are OCR. You are not a coach, an assistant, or an editor.

Copy all of it: the workout's name, the day, the warm up, every lift and its sets, reps and percentages, every note under a lift (keep its * or bullet), every rest line, the cardio block, and the recovery lines.

- When a lift's sets run over several lines, keep them on several lines, in order.
- Words written down the margin beside a group of lines (for example "super set all 3") go on ONE line of their own, directly above the first line they are beside.
- Keep numbers, percentages and times exactly as written. Never add, total, round or correct a number. If a number cannot be read, write [?] in its place.
- Never correct or expand an exercise name.
- Leave out drawings, decoration, logos, labels on drawn objects, and slogans that are not part of the workout.
- Never describe the image, and never say anything about a person in it.

Output only the card's text. No introduction, no explanation, no code fences.

If the image is not a workout, output exactly NOT_A_WORKOUT and nothing else.`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface Body {
  /** Base64 image data, no data-URI prefix. */
  image?: string;
  mediaType?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!ANTHROPIC_API_KEY) return json({ ok: false, reason: 'unconfigured' }, 503);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'bad_request' }, 400);
  }
  const image = (body.image ?? '').trim();
  const mediaType = body.mediaType ?? 'image/jpeg';
  if (!image) return json({ ok: false, reason: 'bad_request' }, 400);
  if (image.length > MAX_BASE64_CHARS) return json({ ok: false, reason: 'too_large' }, 400);
  if (!ALLOWED_MEDIA.includes(mediaType)) return json({ ok: false, reason: 'bad_request' }, 400);

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
  if (!countError && (count ?? 0) >= MAX_READS_PER_DAY) return json({ ok: false, reason: 'daily_limit', limit: MAX_READS_PER_DAY }, 429);

  // ── 1. Reserve the credit BEFORE the model call — Premium AI (0203) and the consent check (0268) ──
  //
  // The credits are HELD until step 3 settles them; every failure from here on gives them back (P-D2).
  // ⛔ `meter.id` (the reservation) stays in this function — no reply carries it.
  const { data: reservedRow, error: reserveError } = await supabase.rpc('coach_ai_reserve', { p_action: ACTION, p_fn: FN }).maybeSingle();
  const meter = reserveFrom(reservedRow, reserveError);
  if (!meter.ok) {
    if (meter.reason === 'meter_unavailable') return json({ ok: false, reason: 'meter_unavailable' }, 503);
    if (meter.reason === 'no_consent') return json({ ok: false, reason: 'no_consent' }, 403);
    // No Premium AI reads as out_of_credits with an allowance of 0, as it always has (0203).
    return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
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
          max_tokens: 4096,
          // Transcription, not reasoning. Same posture as `program-photo-read`.
          thinking: { type: 'disabled' },
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
                { type: 'text', text: 'Copy this workout card as text.' },
              ],
            },
          ],
        }),
      }),
    UPSTREAM_ABORT_MS[FN],
  );

  // Unreachable, a non-2xx, or our own abort: refunded. The upstream's words are in this function's log only (P-D8).
  if (call.kind !== 'ok') {
    return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind, call)) }, 503);
  }
  const payload = call.payload;

  // A refusal, or an answer cut off at the cap, is a card that was not read — never half of one. Refunded.
  if (payload?.stop_reason === 'refusal' || payload?.stop_reason === 'max_tokens') {
    return json({ ok: false, reason: 'unreadable', ...(await settle(payload.stop_reason === 'refusal' ? 'refusal' : 'truncated', call)) });
  }

  // ── 3. THE BOUNDARY ────────────────────────────────────────────────────────
  // ⚠ RUNS AFTER THE MODEL AND OVERRULES IT. No training written in the answer (`LIFTY`) means it is not a workout,
  // whatever else it says — so a description of a photograph, or of anyone in it, never leaves this function.
  const text: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')
    .replace(/\r/g, '')
    .replace(/^\s*```[a-z]*\s*\n?|\n?\s*```\s*$/g, '')
    .split('\n')
    .map((l: string) => l.replace(/\s+$/, ''))
    .slice(0, MAX_CARD_LINES)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CARD_CHARS);

  // ── 4. The settle: nothing readable, or not a workout, is refunded ─────────
  if (!text) return json({ ok: false, reason: 'unreadable', ...(await settle('unreadable', call)) });
  if (/^NOT_A_WORKOUT\b/.test(text) || !LIFTY.test(text)) {
    return json({ ok: false, reason: 'not_a_program', ...(await settle('not_a_program', call)) });
  }
  return json({ ok: true, text, ...(await settle('ok', call)) });
});
