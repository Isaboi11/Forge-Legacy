/**
 * COACH AI — INTERPRET
 *
 * ══ WHAT THIS IS ══
 *
 * The one model call in Forge Legacy. It turns a sentence an athlete typed into the same
 * `Partial<CoachConstraints>` the chips already produce, and hands it back. Phase D · D1 of the Pricing
 * Structure & Monetization Build Plan (locked 2026-08-12).
 *
 * ⚠ **THE MODEL DOES NOT WRITE TRAINING.** `Coach-Chat-Design-Brief-v1.0` §0: *"Holt does not write
 * programs. He calls a machine that does."* This function fills fields. `assemble()` on the device
 * builds the program from them, validated by the same rules the free wizard uses. That is why the AI
 * tier cannot emit an invalid program — it is not writing one. Nothing here may return sets, reps,
 * weights, or exercises.
 *
 * ══ ⚠ THE API KEY LIVES HERE AND NOWHERE ELSE ══
 *
 * `ANTHROPIC_API_KEY` is an Edge Function secret. It must never reach the client bundle — brief §10.
 * Set it with `supabase secrets set ANTHROPIC_API_KEY=...`, never in `.env` (Expo inlines
 * `EXPO_PUBLIC_*` into the bundle, and a key committed to a repo is a key that is gone).
 *
 * ══ ⚠ THE MEDICAL SPLIT — ACTION IS FINE, TALKING IS NOT ══
 *
 * PO decision, 2026-08-12, and it is the reason this function is not a thin proxy.
 *
 * The pricing plan sells Coach AI with *"My shoulder hurts, swap tomorrow."* `isMedical()` in
 * `chat-core.ts` matches `hurt\w*` and stops flat, so the sentence the feature is sold with is one the
 * app refuses. The check is not wrong — a false negative is a training app improvising about an injury
 * — but it also means an athlete cannot use ordinary words to ask for a substitution the app already
 * gives away free.
 *
 * So the split, which is the shape the photo-read rules already use (always paired with an action,
 * never an assessment):
 *
 *   · **Action** — *"my shoulder hurts, swap tomorrow"* → perform the swap. Say NOTHING about the
 *     shoulder. No advice, no reassurance, no "take it easy". The swap is mechanical and identical to
 *     the free substitution button.
 *   · **Advice** — *"my shoulder hurts, what's wrong with it?"* → `medical_stop`, unchanged.
 *   · **Acuity** — *"I tore my rotator cuff"* → `medical_stop`, unchanged, AND never mapped onto the
 *     `shoulders` limitation. `Coach-AI-Preflight-Gates` §1.2: the limitation vocabulary has no severity
 *     axis, so `shoulders` means "cranky" and applying it to a tear applies a mild rule to a serious
 *     problem. Acuity is routed to the stop precisely because the enum cannot hold it.
 *
 * ⚠ **AND THE ACUITY GUARD IS CODE, NOT PROMPT.** `ACUTE` below runs on the raw text after the model
 * answers and overrides a patch to a stop. A system prompt saying "don't do that" is a request; this is
 * a boundary. Same rule `entitlement.ts` states about itself — the gate belongs in the layer that
 * cannot be talked out of it.
 *
 * ══ ⚠ THE CACHE IS THE COST MODEL ══
 *
 * Cache reads are ~0.1× input. The pricing plan's ≈$49/yr worst case assumes the rulebook prompt is
 * cached; without it every projection is wrong by roughly 10×. So the system prompt is one stable block
 * carrying `cache_control`, and **everything that varies per request goes in the user turn** — no
 * athlete id, no timestamp, no question text in the system block.
 *
 * Sonnet 5's minimum cacheable prefix is **1024 tokens**. A shorter system prompt silently does not
 * cache — no error, just `cache_creation_input_tokens: 0` forever. `SYSTEM` is comfortably over it, and
 * `coach_ai_cache_health()` in migration 0144 is how you confirm it in production.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE GUARD. The classifier is a pure domain module so `node --test` can prove it
// separates real sentences, and so the function and the app can never drift apart on where the line is.
import { medicalRoute } from '../../../src/domain/coach/medical-routing.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** Locked in the pricing plan. Sonnet 5 — the engine does the hard work; the model only parses intent. */
const MODEL = 'claude-sonnet-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SYSTEM PROMPT — one stable block, cached
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ EVERY BYTE OF THIS IS CACHED AND MUST NOT VARY PER REQUEST. Adding a name, a date, or an athlete id
 * here invalidates the cache on every call and multiplies the cost of the product by ~10.
 */
const SYSTEM = `You are the intent parser behind Coach Holt, a strength and endurance coach in the Forge Legacy training app.

# What you do, and the one thing you must never do

An athlete types a sentence. You turn it into structured fields. A deterministic rules engine on the device then builds the actual training from those fields.

You NEVER write training. You do not choose exercises, sets, reps, weights, distances, or paces. You do not describe a workout. If you find yourself writing "3 sets of 10", you have misunderstood your job. You fill in fields; the engine does the rest.

# The fields

- goal: one of strength, muscle, weight_loss, conditioning, mobility, run_5k, run_10k, run_half, run_marathon, triathlon
- daysPerWeek: integer 2-6
- sessionMinutes: one of 30, 45, 60, 75 — round to the nearest
- environment: one of full_gym, home, bodyweight, outdoor
- experience: { lifting, running } each one of beginner, intermediate, advanced
- limitations: any of shoulders, knees, lower_back, no_jumping, no_overhead, no_barbell, no_running
- raceDate: ISO date, only for a race goal
- currentWeeklyMi: number, only for a race goal — current weekly running mileage
- dayFocus: only when the athlete wants ONE session rather than a program

Emit only fields the athlete actually gave you. Never guess a field to be helpful. A missing field is asked again; a wrong field is a program built on a lie.

# Routing

Every reply is one of three routes.

**patch** — the athlete gave you usable information. Return the fields.

**medical_stop** — the athlete described an injury, or asked what is wrong with their body, or asked how to treat something. Anything clinical stops. You do not assess, reassure, hedge, or suggest rest, ice, stretching or a movement to "work around it". You do not say it is probably fine. You do not ask a follow-up question about the symptom.

**unclear** — you could not place what they said. This is a normal, frequent, correct answer. Returning unclear costs an athlete one more question; guessing costs them a wrong program.

# Soreness is not an injury, and this distinction is the important one

An athlete who says a body part hurts and asks you to CHANGE something is making a training request. Answer it as one: set the matching limitation, and say nothing whatsoever about the body part.

- "my shoulder hurts, swap tomorrow" → patch, limitations: ["shoulders"]. No comment about the shoulder.
- "knees are cranky, nothing jumpy" → patch, limitations: ["knees", "no_jumping"]
- "bad back, keep me off deadlifts" → patch, limitations: ["lower_back"]

An athlete who describes damage, or asks you about the symptom, gets medical_stop — even if they also asked for a change. The stop wins.

- "I tore my rotator cuff, swap tomorrow" → medical_stop
- "my shoulder hurts, what's wrong with it?" → medical_stop
- "shoulder's been numb since Tuesday" → medical_stop

Never map an injury onto a limitation. The limitation vocabulary describes a preference to avoid a movement pattern, not a diagnosis, and it has no way to express severity.

# Voice, for the one line you write

Holt is a coach, not an assistant. Direct. Short sentences. No exclamation marks, no emoji, no "Great question!", no motivational filler, and never any shame about a missed session.

Write at most one short sentence confirming what you understood. Never explain your reasoning. Never list the fields back. When the route is medical_stop or unclear, write nothing — the app supplies that copy itself.`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE OUTPUT SHAPE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const GOALS = [
  'strength', 'muscle', 'weight_loss', 'conditioning', 'mobility',
  'run_5k', 'run_10k', 'run_half', 'run_marathon', 'triathlon',
];
const LIMITATIONS = [
  'shoulders', 'knees', 'lower_back', 'no_jumping', 'no_overhead', 'no_barbell', 'no_running',
];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];

/**
 * Structured outputs rather than prose parsing. The schema is the contract: a field that is not here
 * cannot come back, so the engine never receives a key it does not understand.
 *
 * `additionalProperties: false` and a full `required` list are both mandatory for strict validation.
 * Optional-in-spirit fields are expressed as nullable rather than absent, because the schema language
 * has no "sometimes".
 */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['route', 'patch', 'say'],
  properties: {
    route: { type: 'string', enum: ['patch', 'medical_stop', 'unclear'] },
    say: { type: ['string', 'null'], description: 'At most one short sentence, or null.' },
    patch: {
      type: 'object',
      additionalProperties: false,
      required: [
        'goal', 'daysPerWeek', 'sessionMinutes', 'environment',
        'experienceLifting', 'experienceRunning', 'limitations', 'raceDate', 'currentWeeklyMi', 'dayFocus',
      ],
      properties: {
        goal: { type: ['string', 'null'], enum: [...GOALS, null] },
        daysPerWeek: { type: ['integer', 'null'] },
        sessionMinutes: { type: ['integer', 'null'], enum: [30, 45, 60, 75, null] },
        environment: { type: ['string', 'null'], enum: ['full_gym', 'home', 'bodyweight', 'outdoor', null] },
        experienceLifting: { type: ['string', 'null'], enum: [...EXPERIENCE, null] },
        experienceRunning: { type: ['string', 'null'], enum: [...EXPERIENCE, null] },
        limitations: { type: ['array', 'null'], items: { type: 'string', enum: LIMITATIONS } },
        raceDate: { type: ['string', 'null'] },
        currentWeeklyMi: { type: ['number', 'null'] },
        dayFocus: { type: ['string', 'null'] },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface Body {
  text: string;
  /** Which question is on the table, so the model scopes its answer to it. Null for a free request. */
  questionId?: string | null;
  ask?: string | null;
  chips?: string[];
  mode?: 'program' | 'day';
  /** What the athlete has already answered — so the model does not re-fill settled fields. */
  known?: Record<string, unknown>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!ANTHROPIC_API_KEY) {
    // A misconfigured secret must read as an outage, never as a refusal — brief §6 requires the athlete
    // to be able to tell "the app failed" from "Holt decided".
    return json({ route: 'error', reason: 'unconfigured' }, 503);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ route: 'error', reason: 'bad_request' }, 400);
  }

  const text = (body.text ?? '').trim();
  if (!text) return json({ route: 'unclear' });
  // A sentence, not an essay. Brief §11 sizes the composer at 280 characters; anything past this is not
  // an answer to a coaching question and is the cheapest possible thing to refuse.
  if (text.length > 2000) return json({ route: 'unclear' });

  // The caller's JWT is forwarded so the RPCs run as that athlete and RLS applies. The function holds no
  // service key — deliberately, and the same reason `admin-live.ts` gives.
  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  // ── 1. Reserve the credit BEFORE the model call ────────────────────────────
  //
  // An athlete one credit short must be refused before a dollar is spent, not billed and then told.
  const action = body.mode === 'day' ? 'day' : body.questionId ? 'message' : 'program';
  const { data: spend, error: spendError } = await supabase
    .rpc('coach_ai_spend_credits', { p_action: action })
    .maybeSingle();

  if (spendError) return json({ route: 'error', reason: 'meter_unavailable' }, 503);

  const reserved = spend as { allowed: boolean; credits_spent: number; remaining: number; allowance: number } | null;
  if (!reserved?.allowed) {
    return json({
      route: 'out_of_credits',
      remaining: reserved?.remaining ?? 0,
      allowance: reserved?.allowance ?? 0,
    });
  }

  // ── 2. The model call ──────────────────────────────────────────────────────
  //
  // Everything variable is in the user turn, below the cached system block. See the cache note at the
  // top of this file — this ordering IS the cost model.
  const context = [
    body.ask ? `Holt just asked: "${body.ask}"` : 'The athlete spoke first; no question is on the table.',
    body.chips?.length ? `Offered answers: ${body.chips.join(' · ')}` : null,
    body.mode === 'day' ? 'Mode: ONE session, not a program.' : 'Mode: a full program.',
    body.known && Object.keys(body.known).length
      ? `Already settled, do not re-fill: ${JSON.stringify(body.known)}`
      : null,
  ].filter(Boolean).join('\n');

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        // Slot-filling, not reasoning, and it is the highest-volume call in the product. The acuity
        // guard below is code, so the model is not the only thing standing between an athlete and a
        // wrong route. If routing quality slips, `{type:'adaptive'}` with effort 'low' is the escape
        // hatch — it costs more per call and is the documented recommendation for Sonnet 5.
        thinking: { type: 'disabled' },
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: SCHEMA },
        },
        system: [
          { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        ],
        messages: [
          { role: 'user', content: `${context}\n\nThe athlete typed: "${text}"` },
        ],
      }),
    });
  } catch {
    return json({ route: 'error', reason: 'upstream_unreachable' }, 503);
  }

  if (!response.ok) {
    // Record the failed attempt so the 60-day run does not under-count what the product actually costs
    // to operate. Credits already reserved stay spent — see the refund note below.
    await supabase.rpc('coach_ai_record_usage', {
      p_action: action, p_credits: reserved.credits_spent, p_model: MODEL,
      p_input_tokens: 0, p_output_tokens: 0,
      p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
      p_uncharged: true,
    });
    return json({ route: 'error', reason: 'upstream_error' }, 503);
  }

  const payload = await response.json();
  const usage = payload?.usage ?? {};

  // ── 3. Record what it actually cost ────────────────────────────────────────
  //
  // All four counts, separately. The cache read is the one that matters, and collapsing them into
  // "input tokens" is how a product convinces itself it is 10× more expensive than it is.
  await supabase.rpc('coach_ai_record_usage', {
    p_action: action,
    p_credits: reserved.credits_spent,
    p_model: payload?.model ?? MODEL,
    p_input_tokens: usage.input_tokens ?? 0,
    p_output_tokens: usage.output_tokens ?? 0,
    p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    p_uncharged: false,
  });

  // A safety refusal is not a route the athlete chose; treat it as unclear rather than inventing copy.
  if (payload?.stop_reason === 'refusal') {
    return json({ route: 'unclear', remaining: reserved.remaining });
  }

  let parsed: { route?: string; say?: string | null; patch?: Record<string, unknown> } | null = null;
  try {
    const block = (payload?.content ?? []).find((b: { type: string }) => b.type === 'text');
    parsed = block ? JSON.parse(block.text) : null;
  } catch {
    parsed = null;
  }
  if (!parsed?.route) return json({ route: 'unclear', remaining: reserved.remaining });

  // ── 4. THE ACUITY OVERRIDE ─────────────────────────────────────────────────
  //
  // ⚠ THIS RUNS AFTER THE MODEL AND OVERRULES IT. The model is good at this and is not trusted with it
  // alone. If the athlete's own words describe damage or ask what is wrong, the route is a stop no
  // matter what came back — including when they also asked for a swap.
  if (medicalRoute(text) !== 'clear') {
    return json({ route: 'medical_stop', remaining: reserved.remaining });
  }

  if (parsed.route !== 'patch') {
    return json({ route: parsed.route, remaining: reserved.remaining });
  }

  // ── 5. Narrow the patch to what the engine accepts ─────────────────────────
  //
  // The schema already constrains shape; this drops nulls and re-nests experience, so the device
  // receives exactly a `Partial<CoachConstraints>` and never a bag of nulls to filter itself.
  const p = parsed.patch ?? {};
  const patch: Record<string, unknown> = {};
  const put = (k: string, v: unknown) => { if (v !== null && v !== undefined) patch[k] = v; };

  put('goal', p.goal);
  put('daysPerWeek', p.daysPerWeek);
  put('sessionMinutes', p.sessionMinutes);
  put('environment', p.environment);
  put('raceDate', p.raceDate);
  put('currentWeeklyMi', p.currentWeeklyMi);
  put('dayFocus', p.dayFocus);
  if (Array.isArray(p.limitations)) patch.limitations = p.limitations;
  if (p.experienceLifting || p.experienceRunning) {
    patch.experience = {
      ...(p.experienceLifting ? { lifting: p.experienceLifting } : {}),
      ...(p.experienceRunning ? { running: p.experienceRunning } : {}),
    };
  }

  // An empty patch is not a patch. Saying "I didn't catch that" is the honest answer and it is what the
  // local matcher already does when it cannot place an answer.
  if (Object.keys(patch).length === 0) {
    return json({ route: 'unclear', remaining: reserved.remaining });
  }

  return json({
    route: 'patch',
    patch,
    say: typeof parsed.say === 'string' && parsed.say.trim() ? parsed.say.trim() : null,
    remaining: reserved.remaining,
  });
});

/*
 * ⚠ CREDITS ARE NOT REFUNDED ON AN UPSTREAM FAILURE, AND THAT IS A DECISION.
 *
 * A refund path is a second write that can itself fail, and a meter that both grants and returns credits
 * is a meter with a race in it. At one credit for a message the athlete loses a fraction of a cent's
 * worth of allowance; at 150/month it is not felt. If the 60-day run shows upstream failures are common
 * enough to matter, the fix is a compensating ledger entry — never a decrement of `spent`, which would
 * reopen the race the single guarded UPDATE closes.
 */
