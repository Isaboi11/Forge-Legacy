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
 * Deploy: Supabase dashboard → Edge Functions → Deploy a new function → "Via Editor" → name it `workout-tidy` →
 * replace the editor contents with this whole file → Deploy. ⚠ Apply `pending-0232.sql` FIRST, or every call
 * answers "meter unavailable" (an action absent from the credit map raises 22023).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

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

Number the lifts 1, 2, 3 … in order; a superset takes one number. Write "4x10" as "4 sets of 10 reps". A lift with no rep count on the card (a carry for distance, a time) gets "N sets" and its distance or time on a * note. Leave out the date and the author's own scores and results ("I got 10 sets at 305"). Write nothing but the layout: no introduction, no explanation, no code fences.

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

  // ── 1. Reserve the credit BEFORE the model call (refuses anyone without Premium AI — 0203) ──
  const { data: spend, error: spendError } = await supabase.rpc('coach_ai_spend_credits', { p_action: ACTION }).maybeSingle();
  if (spendError) return json({ ok: false, reason: 'meter_unavailable' }, 503);
  const reserved = spend as { allowed: boolean; credits_spent: number; remaining: number; allowance: number } | null;
  if (!reserved?.allowed) {
    // 0203 refuses an account without Premium AI as (allowed false, allowance 0): no allowance at all is not
    // "out of credits", and the app says which.
    return json({ ok: false, reason: reserved?.allowance ? 'out_of_credits' : 'not_entitled', remaining: reserved?.remaining ?? 0 });
  }

  // ── 2. The model call ──────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
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
    });
  } catch {
    return json({ ok: false, reason: 'upstream_unreachable' }, 503);
  }

  if (!response.ok) {
    await supabase.rpc('coach_ai_record_usage', {
      p_action: ACTION, p_credits: reserved.credits_spent, p_model: MODEL,
      p_input_tokens: 0, p_output_tokens: 0, p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
      p_uncharged: true,
    });
    return json({ ok: false, reason: 'upstream_error' }, 503);
  }

  const payload = await response.json();
  const usage = payload?.usage ?? {};
  await supabase.rpc('coach_ai_record_usage', {
    p_action: ACTION,
    p_credits: reserved.credits_spent,
    p_model: payload?.model ?? MODEL,
    p_input_tokens: usage.input_tokens ?? 0,
    p_output_tokens: usage.output_tokens ?? 0,
    p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    p_uncharged: false,
  });

  // A refusal, or an answer cut off at the cap, is a card that was not rewritten — never half of one.
  if (payload?.stop_reason === 'refusal' || payload?.stop_reason === 'max_tokens') {
    return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
  }

  const out: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')
    .replace(/^\s*```[a-z]*\s*\n?|\n?\s*```\s*$/g, '')
    .trim();

  if (!out || /^NOT_A_WORKOUT\b/.test(out)) return json({ ok: false, reason: 'not_a_workout', remaining: reserved.remaining });
  return json({ ok: true, text: out.slice(0, MAX_CHARS * 2), remaining: reserved.remaining });
});
