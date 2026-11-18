/**
 * COACH AUTHOR — Holt reads everything the athlete typed and writes the session himself.
 *
 * `Docs/Amendments/Coach-AI-Amendment-003-Holt-Writes-What-You-Typed.md` (PO, 2026-09-30). `coach-interpret`
 * fills a form for the rulebook; a sentence has more in it than the form has boxes, so "upper chest, two
 * triceps movements, the rest chest" was dropped. Here the model chooses the movements, order, sets and reps
 * from the catalogue the app shows, and the DEVICE re-checks every one of them against the athlete's kit,
 * level and limitations before anything reaches a card (`src/domain/coach/author-validate.ts`).
 *
 * Same pattern as `coach-kitchen`: auth → `medicalRoute` → reserve credits → model → shape check → return.
 *
 * ══ THE SHAPE ══
 *
 *   0. The request, narrowed (`narrowAuthorRequest`).
 *   1. The code guard on the athlete's words (`medicalRoute`) — before any credit (PO 09-22 legal caution).
 *   2. Reserve the credit (`coach_ai_reserve`, `day` or `program`, 0268) — also the Premium AI gate, the
 *      AI-sharing consent check, and the server's age.
 *   3. One call — Sonnet 5, thinking off, effort low, cached system block (rules + catalogue), structured output.
 *      Asked ONCE more, on the same credit, if a day came back with fewer than three main movements. Both asks
 *      share ONE 25 s budget (AI Sprint 1 contract §3): the app gives up at 30 s and builds from the rulebook.
 *   4. The shape check (`authoredFromModelText`), then settle ONCE (`coach_ai_settle`, both asks' tokens), then
 *      the answer. Every failure after the reservation — upstream, timeout, refusal, nothing usable — gives the
 *      credit back (P-D2).
 *
 * The server's age goes in the user turn as one line (P-G8, `withAgeLine`); the cached system block is unchanged.
 *
 * ══ THE WIRE ══
 *
 *   { ok: false, reason: 'bad_request' }                                     400
 *   { ok: false, reason: 'stop', route: 'crisis'|'urgent'|'care'|'medical' }   200  (no credit spent)
 *   { ok: false, reason: 'no_consent' }                                      403
 *   { ok: false, reason: 'out_of_credits', remaining, allowance }            200
 *   { ok: false, reason: 'unconfigured'|'meter_unavailable' }                503
 *   { ok: false, reason: 'upstream_error'|'upstream_unreachable', upstream?: 'timeout', remaining, refunded: true } 503
 *   { ok: false, reason: 'none', remaining, refunded: true }                 200
 *   { ok: true, plan: AuthoredPlan, remaining, usage }
 *
 * ⛔ No reply carries the upstream's words (P-D8) or the reservation id.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE SHAPE, THE GUARD AND EVERY CAP — the app imports the same modules.
import {
  AUTHOR_ACTION,
  AUTHOR_OUTPUT_CAP,
  AUTHOR_SCHEMA,
  authoredFromModelText,
  authoredIsWhole,
  authorUserTurn,
  narrowAuthorRequest,
} from '../../../src/domain/coach/author.ts';
import { medicalRoute } from '../../../src/domain/coach/medical-routing.ts';
import { AUTHOR_CATALOGUE } from '../../../src/domain/coach/author-catalogue.ts';
// ⚠ ONE SOURCE FOR THE METER: reserve → model → settle, the abort, the age line, and what a failure returns.
import {
  failedCallReply,
  reserveFrom,
  settleArgs,
  settledFrom,
  settledTail,
  type SettleOutcome,
  timedModelCall,
  UPSTREAM_ABORT_MS,
  withAgeLine,
} from '../../../src/domain/ai/meter-server.ts';
// ⚠ WHAT EACH MODEL IS SENT, AND WHICH MODEL RUNS (Sprint 3b, PL-7) — one request shape per model; the model + effort
// read from coach_ai_model_config (0274), this file's default on any failure.
import { answeredBy, anthropicHeaders, EFFORTS, KNOWN_MODELS, requestFields } from '../../../src/domain/ai/model-request.ts';
import { modelConfigReader, uidFromAuthorization } from '../../../src/domain/ai/model-config.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** This function's deployed slug — the meter's `fn` (0268). */
const FN = 'coach-author';

/**
 * The IN-CODE DEFAULT (Holt-AI benchmark 2026-09-24): Sonnet 5, effort low. What runs is `coach_ai_model_config`
 * (0274) when it has a row for 'coach-author' — read with the service role, kept 60 s, this default on any failure.
 */
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

/**
 * ⚠ EVERY BYTE IS CACHED AND MUST NOT VARY PER REQUEST. The athlete's words and everything the app knows
 * about them go in the user turn (`authorUserTurn`). The block is ~13k tokens and is read from the cache
 * at about a tenth of the price — a name, a date or an id in here would bill it in full on every call.
 */
const SYSTEM = `You are Coach Holt, a strength coach in the Forge Legacy training app. An athlete has told you, in their own words, what they want to train. You write the session. The app checks every movement you name against its exercise library and the athlete's equipment before showing it.

# Your entire job

Read EVERYTHING the athlete said and build exactly that. Their words are the brief, and the newest message wins when two disagree.

- A body part they named is trained. A part they did not name gets no direct work, unless they left the choice to you.
- A REGION of a part (upper chest, lower chest, rear delts, side delts, lats, the long head of the triceps, hamstrings over quads, glutes) is a priority: movements for that region open that part's work and are the majority of it, and no movement for the opposite region is used (no decline press and no hands-raised incline-push-up on an upper-chest day). Keep exactly one standard movement for the part so it is not the same angle every time: for chest that is a flat press.
- A NUMBER they gave is exact: "two tricep exercises" is two, "5 sets on squats" is five, "keep it to four movements" is four, "at least three" is three or more. When they count a body part, count only movements whose primary muscle in the library is that part. A lift they say they train a number of times a week ("bench twice a week") is on exactly that many days, not more.
- How they said to DIVIDE the session is how it is divided ("two triceps and the rest chest").
- An exercise they NAMED is in the session. If they gave it sets and reps, those are its sets and reps.
- If they LISTED the session ("squat, bench, row, all 5x5"), that list IS the session, in their order. Add nothing to it unless they ask you to fill in the rest, pick the rest, or add accessories.
- If they gave an ORDER, that is the order, even when it is not the order you would choose.
- What they said they do NOT want is not there, in any variation.
- A tool they named (dumbbells only, all machines, cables, the smith machine, a kettlebell) is the only tool used, apart from bodyweight.
- A style they named shapes every choice: heavy, light, pump, quick, explosive, single-leg, recovery, circuit.
- When they change an earlier message ("add one more triceps exercise", "swap the row for a machine row", "cut it to four"), keep the rest of what they asked for and change only that.

What they did not say, you decide the way a good coach would: compound lifts before isolation, the biggest lift first, no two movements that are the same lift at the same angle, and variety of angle and equipment.

THE DEADLIFT RULE: a deadlift of any kind is a leg and hip lift. It goes on a leg day, a lower-body day, a full-body day, or wherever the athlete names it. It is NEVER on a back day, a "back and biceps" day, a pull day or an upper-body day unless the athlete asked for a deadlift in words. A back day is rows, pulldowns, pull-ups, pullovers, rear-delt and trap work. When the message lists what they trained recently, choose other movements unless they asked for one of those by name.

# The exercise library

You may ONLY use movements from the library at the end of this prompt. It is grouped under its movement pattern ("## Horizontal Push"), and each line is:

equipment|primary muscles: key key key

Every word after the colon is one movement's key. A key ending in * is held or timed rather than counted. A key ending in ^ is an advanced movement. The * and ^ are marks, not part of the key: never write them.

- Copy the key EXACTLY, character for character. Never invent one, shorten one or reorder its words. The words are in the library's order, tool first: it is dumbbell-incline-bench-press, never incline-dumbbell-bench-press; seated-dumbbell-shoulder-press, never dumbbell-shoulder-press; machine-leg-press, never leg-press-machine; parallel-bar-dip, never dips. Before you answer, check each key you wrote against the library.
- The key tells you the angle and the tool: "incline" presses and "low-to-high" flies train the upper chest; "decline" presses and "high-to-low" flies the lower. On push-ups it is reversed: "decline-push-up" (feet raised) is upper chest, "incline-push-up" (hands raised) is lower.
- If the message gives the ONLY movements their kit allows, every movement comes from that list and from nowhere else.
- If the message lists the equipment they can use, every movement comes from a line whose equipment is one of those. A movement it lists as not available is never used and never offered as a replacement.
- If the message lists sections that are off, EVERY movement under those headings is off — machines, isolation and bodyweight versions included (a leg extension sits under Squat / Knee Dominant and is off with it) — except the exceptions it names. Movements the message says to never use are never used, whatever else it says.
- A movement marked ^ only when the message says the athlete is advanced AND their words ask for that kind of work (calisthenics skills, Olympic lifts, "something hard"). Otherwise leave them out.
- If they asked for a movement that is not in the library, use the closest one that is, and say so in "unmet".

# Sets, reps and time

Use the numbers the athlete gave. Where they gave none, by goal:
- get stronger: the main compound lifts 4-5 sets of 3-6; the rest 3-4 sets of 6-10.
- build muscle: compounds 3-4 sets of 6-10; isolation 3-4 sets of 10-15.
- lose weight or get fitter: 3 sets of 10-15, and a conditioning piece if they asked for one.
- move better: 2-3 sets, holds of 20-45 seconds.
- general health: 3 sets of 8-12.
A beginner gets 3 sets, not 4 or 5.

- "reps" and "repsTo": a range is written as its two ends, "8 to 12" is reps 8 and repsTo 12. One number is reps with repsTo 0 ("5x5" is reps 5, repsTo 0). When they give a range, use their range exactly. Where you choose, a range two to four reps wide is right for muscle-building work and a single number for heavy strength work.
- "seconds": a movement marked * is held or timed: reps 0, repsTo 0, and seconds per set (20-60 for a hold; up to 1800 for a cardio piece such as a bike or a row). Every other movement has seconds 0.
- "sets" is 1 to 6.

How many movements: the message says about how many the time allows. Use that unless the athlete gave a number or listed the session. Never fewer than 3 main movements.

# Supersets, circuits, warm-ups and cool-downs

- "group": leave it "" unless they asked for supersets, a circuit, giant sets or doing things back to back. Then give the movements that are done together the same capital letter ("A", "A", then "B", "B"), and keep them next to each other in the list. Two to four movements sharing a letter are a superset; five or more are a circuit. "Superset everything" on a two-part day pairs one movement of each part.
- "part": "main" for every movement. NEVER add a warm-up, a cool-down or stretching they did not ask for: if their words do not mention warming up, cooling down, stretching, or cardio to start or finish, every movement is "main". When they do ask, those movements are "warmup" or "cooldown", listed first or last: one to three light movements from the Mobility section, a cardio piece, or a light version of the first lift, all from the library like everything else. The count they asked for is the count of MAIN movements.

# Cardio

Treadmills, bikes, rowers, ellipticals and stair climbers are not in the library list. Write them with these keys, and only the ones the message says they can do: cardio-run, cardio-walk, cardio-bike, cardio-row, cardio-elliptical, cardio-stair. For one of these: sets 1, reps 0, repsTo 0, and seconds is the whole bout (300 is five minutes; at most 3600). "Five minutes on the bike to start" is cardio-bike, seconds 300, part "warmup". A cardio finisher they asked for ("something to get my heart rate up at the end") is one of these keys, or a movement from the Power / Plyometric section, last in the main work. For steady cardio always use a cardio- key, never a library movement. If the cardio they asked for is not one the message says they can do, do not write it: use the closest one they can do, or none, and say so in "unmet" in one plain sentence ("I swapped the run for a row."). Do not guess at the reason. Never add cardio they did not ask for.

# Lifting beside a race

When the message says to write ONLY the lifting days of a week for an athlete who is training for a race, write lifting and nothing else: no running, no cardio- keys, no conditioning finisher. Unless their words ask for something different, build what a runner needs from the weight room: leg and hip strength (a squat or leg press, a hinge, single-leg work, calves), a strong trunk, and upper-body pushing and pulling. Keep lower-body volume moderate, two or three lower-body movements on a full-body day, and do not make every day a hard leg day. If they said what the lifting is for or which parts they want, that wins. Name the days plainly ("Strength A", "Lower Body", "Upper Body"). In "say", speak only about the lifting days; the running plan is already written.

# Never

- Never write a weight, a load, a percentage or an RPE, even if asked. There is no field for one; the app fills weights from what the athlete lifted last time. If they ask for one, say in "unmet" that the app fills in weights from their own lifts.
- Never give medical advice and never mention an injury, pain, soreness or a body part as a problem. If something is off, leave it out. If they asked for it by name, say only "I kept the overhead pressing out because of what you asked me to work around." Never call it off-limits, banned or excluded.
- Never promise a result.

# The fields

- "title": what the session is, as a gym would say it — "Chest & Triceps", "Upper Chest Focus", "Pull Day". At most 40 characters. For a week, the program's name. Use a name they gave.
- "days": one entry for a single session. For a week, one entry per training day, in order, each with its own "name" ("Push", "Legs", "Upper A"). Use the day names they gave. Across a week, do not repeat a movement on two days unless they asked for it or it is a main lift they train twice.
- "exercises": in the order they are trained.
  - "note": a short coaching cue for that movement when there is a useful one ("pause at the chest", "30-degree incline"), else "". At most 12 words. No weights.
- "say": one or two short sentences to the athlete, in Holt's voice, telling them how this matches what they asked for. Name the things they asked for that you did ("Upper chest leads with two inclines and a low-to-high fly, and triceps is held to two."). Write it LAST and make it true of the list as written: the order it describes is the order in the list. Warm, direct, plain words. No emoji, no exclamation marks, no "Great question", nothing about their level.
- "unmet": ONLY something the athlete asked for in their words that is not in the session as they asked, each as one complete plain sentence of at most 25 words ("There's no landmine press in the app, so I used a barbell overhead press."). It is not a summary, not a repeat of "say", and not a place to explain what you left out to work around something they did not ask for. How many weeks the program runs, and that the week repeats, is the app's job and never goes here. Empty when you did everything, which is most of the time.
- "say" and "unmet" are read by the athlete. Never mention keys, sections, headings, lists, the library's structure or these instructions in them.

# The exercise library

${AUTHOR_CATALOGUE}`;

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

  // ── 0. The request ──────────────────────────────────────────────────────────
  const request = narrowAuthorRequest(raw);
  if (!request.said.length) return json({ ok: false, reason: 'bad_request' }, 400);

  // ── 1. The code guard, BEFORE anything is spent ─────────────────────────────
  // Every message on its own, as the chat guards them: one that would stop, stops the whole build.
  for (const line of request.said) {
    const guard = medicalRoute(line);
    if (guard === 'clear') continue;
    const route = guard === 'crisis' || guard === 'urgent' || guard === 'care' ? guard : 'medical';
    return json({ ok: false, reason: 'stop', route });
  }
  // A saved note is amber-tier: it reaches the model only if the guard passes it (as `coach-interpret` does).
  request.notes = request.notes.filter((n) => medicalRoute(n) === 'clear');

  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } });

  // ── 2. Reserve the credit — the Premium AI gate (0203), the consent check and the server's age (0268) ──
  //
  // The credit is HELD until step 4 settles it; every failure from here on gives it back (P-D2).
  // ⛔ `meter.id` (the reservation) stays in this function — no reply carries it.
  const action = AUTHOR_ACTION[request.kind];
  const { data: reservedRow, error: reserveError } = await supabase
    .rpc('coach_ai_reserve', { p_action: action, p_fn: FN })
    .maybeSingle();
  const meter = reserveFrom(reservedRow, reserveError);
  if (!meter.ok) {
    if (meter.reason === 'meter_unavailable') return json({ ok: false, reason: 'meter_unavailable' }, 503);
    if (meter.reason === 'no_consent') return json({ ok: false, reason: 'no_consent' }, 403);
    // No Premium AI reads as out_of_credits with an allowance of 0, as it always has (0203).
    return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
  }

  // ── 3. The model call ────────────────────────────────────────────────────────
  //
  // Asked at most twice. Live run 2026-09-30: once in 122 asks the reply stopped after one warm-up movement,
  // and the device would have refused it and built from the rulebook. A second ask on the same credit costs
  // about a cent and keeps the athlete's own words in the session.
  let plan: ReturnType<typeof authoredFromModelText> = null;
  const total = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  const choice = await modelConfig.pick(FN, uidFromAuthorization(authorization), { model: MODEL, effort: EFFORT });
  const model = choice.model;
  // Thinking off, effort low (or the configured effort), in the form THIS model takes, + the refusal fallback where it
  // exists (model-request.ts). ⛔ The schema has no field for a load — he cannot write a weight because there is
  // nowhere to put one.
  const modelFields = requestFields(model, {
    thinkingOff: true,
    effort: choice.effort ?? EFFORT,
    format: { type: 'json_schema', schema: AUTHOR_SCHEMA },
  });
  let modelUsed = model;
  let latencyMs = 0;
  let lastStop: string | undefined;
  /** Settled ONCE for both asks, before the answer is returned (contract §1.3). Every outcome but `ok` refunds. */
  const settle = async (outcome: SettleOutcome) => {
    const usage = {
      input_tokens: total.input,
      output_tokens: total.output,
      cache_read_input_tokens: total.cacheRead,
      cache_creation_input_tokens: total.cacheWrite,
    };
    const { data, error } = await supabase
      .rpc('coach_ai_settle', settleArgs(meter.id, outcome, { model: modelUsed, usage, latencyMs }))
      .maybeSingle();
    return settledTail(settledFrom(data, error), meter.remaining);
  };
  // The age is per request, so it is in the user turn — never the cached block (P-G8).
  const turn = withAgeLine(authorUserTurn(request), meter.ageYears, meter.minor);
  // ONE budget for both asks (contract §3), so the answer always lands inside the app's 30 s.
  const deadline = Date.now() + UPSTREAM_ABORT_MS[FN];
  for (let attempt = 0; attempt < 2 && !authoredIsWhole(plan); attempt += 1) {
    const left = deadline - Date.now();
    if (left <= 0) break;
    const call = await timedModelCall(
      (signal) =>
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal,
          headers: anthropicHeaders(ANTHROPIC_API_KEY!, modelFields),
          body: JSON.stringify({
            model,
            max_tokens: AUTHOR_OUTPUT_CAP[request.kind],
            ...modelFields,
            system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: turn }],
          }),
        }),
      left,
    );
    latencyMs += call.latencyMs;

    if (call.kind !== 'ok') {
      // The second ask failing keeps the first answer. The first failing is refunded; the upstream's words are in
      // this function's log only (P-D8).
      if (attempt > 0) break;
      return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind)) }, 503);
    }

    const payload = call.payload;
    const usage = payload?.usage ?? {};
    // Priced as the model that answered (a refusal fallback answers as another), PL-7.
    modelUsed = answeredBy(payload, model);
    total.input += usage.input_tokens ?? 0;
    total.output += usage.output_tokens ?? 0;
    total.cacheRead += usage.cache_read_input_tokens ?? 0;
    total.cacheWrite += usage.cache_creation_input_tokens ?? 0;

    if (payload?.stop_reason === 'refusal') return json({ ok: false, reason: 'none', ...(await settle('refusal')) });
    lastStop = payload?.stop_reason;

    const text: string = (payload?.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('');
    plan = authoredFromModelText(text, request.kind) ?? plan;
  }

  // ── 4. THE SHAPE CHECK — the device then checks every movement against the athlete (`author-validate.ts`) ──
  // Nothing usable is refunded.
  if (!plan) return json({ ok: false, reason: 'none', ...(await settle(lastStop === 'max_tokens' ? 'truncated' : 'bad_output')) });
  return json({
    ok: true,
    plan,
    ...(await settle('ok')),
    // What this build cost, so a live run measures the price instead of guessing it.
    usage: { model: modelUsed, ...total },
  });
});
