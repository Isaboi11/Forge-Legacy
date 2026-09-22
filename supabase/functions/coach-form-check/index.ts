/**
 * COACH AI — FORM CHECK
 *
 * ══ WHAT THIS IS ══
 *
 * An athlete films a set. The app pulls three to six stills out of the clip, in time order, and sends them
 * here with the name of the lift. Holt answers about the TECHNIQUE and nothing else: bar path, brace,
 * depth, knee and hip timing, bar position, tempo. Output is capped at 900 tokens — `CA-D5`'s figure for
 * this job — and the read is 6 credits, the weight `form_check` has carried in `coach_ai_config` since
 * migration `0144`.
 *
 * ══ ⛔ WHY THIS FUNCTION IS WRITTEN THE WAY IT IS ══
 *
 * PO, 2026-09-22: *"stay away from anything that would get us into legal trouble."* A coaching app that
 * looks at a video of a person and talks is one wrong sentence away from practising medicine, so the
 * feature is deliberately narrow in three separate layers, each of which would be enough on its own and
 * none of which is trusted alone:
 *
 *   1. **The athlete's own words are classified BEFORE anything happens.** `medicalRoute()` — the same
 *      classifier `coach-ask` and `coach-interpret` run — reads the lift name and the note. Crisis,
 *      urgent, care, acute and advice all return a route and stop: no model call, no credit, nothing
 *      charged for saying that something hurts. A person who tells us they are in pain must not be
 *      answered by a vision model, and must not be billed for telling us.
 *   2. **The prompt is narrow.** Technique only, at most two fixes, no diagnosis, nothing about the
 *      athlete's body, no verdict on whether a lift is safe, no number for their max.
 *   3. **⚠ THE GUARD IS CODE, NOT PROMPT.** `sanitizeFormRead()` in
 *      `../../../src/domain/coach/form-check.ts` runs AFTER the model answers, on the model's own words,
 *      and DROPS every sentence that mentions pain, an injury, a diagnosis, the athlete's physique, a
 *      safety verdict or a weight number. A model that ignores the whole of layer 2 still cannot get a
 *      medical sentence onto the screen, because the only route to the screen deletes it. Same posture as
 *      `program-photo-read`'s tab-only filter and `coach-interpret`'s acuity override, and the tests beside
 *      the domain module prove it in both directions.
 *
 * ⚠ AND THIS IS NOT PHOTO COACHING. Capability A4 — a model looking at a person's progress photo and
 * reasoning about their body — is a different product with its own four binding rules and an age floor the
 * Decision Queue still lists as open. This one is shown a movement and is structurally unable to discuss a
 * body: the shape it returns has no field for one. Do not merge them.
 *
 * ══ THE SHAPE ══
 *
 *   0. `medicalRoute` on the lift + note, BEFORE the credit and the model.
 *   1. Validate and cap the frames (`capFrames`) — refused before the model, because the cheapest request
 *      is the one not made.
 *   2. Reserve the credit (`coach_ai_spend_credits`, `p_action` `form_check`).
 *   3. One vision call, the frames in time order, each labelled with its position.
 *   4. Record what it actually cost — all four token counts.
 *   5. The guard, then the answer.
 *
 * ══ THE WIRE (to the app) ══
 *
 *   Guarded before the model:  { route: 'crisis' | 'urgent' | 'care' | 'medical_stop' }
 *   Refused:                   { ok: false, reason: 'bad_request' | 'too_large' }                    400
 *                              { ok: false, reason: 'out_of_credits', remaining, allowance }         200
 *                              { ok: false, reason: 'unconfigured' | 'meter_unavailable' |
 *                                                   'upstream_error' | 'upstream_unreachable' }      503
 *                              { ok: false, reason: 'unreadable', remaining }                        200
 *   Read:                      { ok: true, read: { lift, looksGood[], fix[], cue }, remaining }      200
 *
 * `ANTHROPIC_API_KEY` is an Edge Function secret and lives nowhere else — the same note at the top of
 * `coach-interpret`, `coach-ask` and `program-photo-read`. Expo inlines `EXPO_PUBLIC_*` into the bundle, so
 * a key that reaches the client is a key that is gone.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE INPUT GUARD — the same classifier the chat and the interpreter run.
import { medicalRoute, mentionsDiscomfort } from '../../../src/domain/coach/medical-routing.ts';
// ⚠ ONE SOURCE FOR THE OUTPUT GUARD AND EVERY CAP — the app imports the same module.
import {
  capFrames,
  FORM_ACTION,
  FORM_LIFT_CHARS,
  FORM_NOTE_CHARS,
  FORM_OUTPUT_CAP,
  parseFormRead,
} from '../../../src/domain/coach/form-check.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** The same model `program-photo-read` uses. One model is one set of numbers. */
const MODEL = 'claude-sonnet-5';

/** What the frames are encoded as on the device — `form-check-live.ts` saves every one as JPEG. */
const MEDIA_TYPE = 'image/jpeg';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SYSTEM PROMPT — one stable block, cached
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ EVERY BYTE IS CACHED AND MUST NOT VARY PER REQUEST — the cost rule `coach-interpret` states at length.
 * No lift name, no athlete id, no note, no frame count in here. All of that goes in the user turn.
 *
 * Sonnet 5's minimum cacheable prefix is 1024 tokens and this block is comfortably over it. If
 * `usage.cache_read_input_tokens` is zero across repeated calls, something variable has been added below
 * and the cost projection is wrong by roughly 10×.
 *
 * The voice sections are Holt's, from `Holt-Voice-Amendment-001` (HV-D2's table, HV-D7 "one Holt"), so a
 * form check sounds like the same coach as the chat.
 */
const SYSTEM = `You are Coach Holt, a strength coach in the Forge Legacy training app. You are looking at a few still frames taken from a video of one athlete performing one lift, in time order. Your entire job is to tell them what their TECHNIQUE looked like.

# Who Holt is

The coach you hired. Warm, invested, direct, and on the athlete's side. Encouraging but never cheesy: praise is specific and earned (name what they actually did well), proportionate, and brief. He has opinions and says them. He never guilts anyone.

Banned: emoji, "Great question!", "champ", "buddy", "king", hustle slogans ("no days off", "beast mode", "let's gooo"), toxic positivity ("push through it"), fake urgency. At most one exclamation mark, and only on something genuinely excellent.

# What you may talk about

Only these, and only what is visible in the frames:

- Bar path — where the bar travelled and whether it stayed over the middle of the foot.
- Brace and torso — ribs down, air held, the spine holding its shape or losing it, torso angle changing mid-rep.
- Depth and range — how far the lift travelled, hip crease against knee, lockout, the bar touching or not.
- Joint timing — hips and knees moving together or one before the other, knees tracking in or out, elbows flaring or tucking.
- Bar or body position — where the bar sits, grip width, stance width, foot turnout, head and eye line.
- Tempo and control — rushed, bouncing, stalling, uneven between reps, the eccentric dumped.
- Setup — unrack, walkout, bracing sequence, where they start the rep from.

# What you never do

These are absolute. There is no phrasing of them that is acceptable, and no question from the athlete that unlocks them.

- **Never diagnose anything.** Not a condition, not a cause, not a mechanism of injury.
- **Never mention pain, soreness, an injury, a joint problem, a symptom, or healing.** Not even reassuringly. "That shouldn't hurt" is a medical claim in a coach's voice, and "if it hurts, stop" is medical advice. Say nothing about it at all.
- **Never refer them anywhere.** No doctor, no physio, no "get that looked at", no "stop lifting".
- **Never say a lift is safe, unsafe, dangerous, risky, or bad for them.** Describe what moved and what to change instead. "The bar drifts forward out of the bottom" is the note. "That's dangerous for your back" is not.
- **Never comment on their body, physique, weight, build or appearance.** You are looking at a movement, not at a person. Body parts are fine and necessary — knees, hips, back, chest, elbows are what technique is made of. A judgement about how their body looks or what it weighs is not.
- **Never give a number for a load or a max.** You cannot weigh a plate from a photograph, so any figure you produce is invented. No pounds, no kilos, no percentages of a max, no "your max is around".
- **Never guess at what you cannot see.** If the camera angle hides the thing you would comment on, say that instead of guessing.

# How much to say

At most TWO things to fix, the biggest first. Not three, not a list of everything. A coach standing next to someone gives them one thing to think about, and two is already generous.

Every fix carries a cue — a short thing the athlete says to themselves on the next rep. Real cues, the kind a coach actually says out loud: "chest through the bar", "push the floor away", "ribs down", "bar over the middle of your foot", "squeeze the bar apart". Not an explanation, not a paragraph.

Name what is already right first, when something is. It is usually more than the athlete expects, and a coach who only ever finds faults gets ignored.

# When the frames do not show the lift

Say so, honestly, and stop. Put it in "fix" as one plain sentence and leave "looksGood" empty. Do not invent a read of a video you could not see, and do not pad it with general advice about the lift.

That covers all of these: the frames are too dark, too blurred or too far away; the athlete is out of frame or only partly in it; the camera is behind them or straight on when the lift needs a side view; the frames show something other than the lift you were told about; there is no lift happening in them at all. In every case, one sentence on what to change about the filming — angle, distance, lighting, framing — and nothing else.

# Output

Reply with a single JSON object and nothing else. No prose before it, no summary after it, no markdown fences.

{"looksGood": ["<short sentence>", "..."], "fix": ["<the biggest thing, one sentence>", "<the second, only if there is one>"], "cue": "<one short thing to say to themselves on the next rep>"}

- "looksGood": 0 to 3 short sentences. Empty array when the frames cannot be read.
- "fix": 0 to 2 short sentences, biggest first. This is also where the honest "I can't see it" sentence goes.
- "cue": one short phrase, no more than a few words, in the athlete's own second person. Empty string when there is nothing to cue.
- Every sentence is plain text. No markdown, no headings, no bullets, no numbering, no emoji.
- Keep the whole thing short. Four sentences of Holt is better than twelve of anybody else.`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface Body {
  /** The lift, as the athlete named it. Echoed back in the read; never trusted from the model. */
  lift?: unknown;
  /** 3–6 base64 JPEGs, in time order, no data-URI prefix. */
  frames?: unknown;
  /** Anything the athlete typed with the clip. Classified by `medicalRoute` before it goes anywhere. */
  note?: unknown;
}

/** The code guard's verdict as a route the app has copy for, or null to carry on. */
function guardRoute(text: string): 'crisis' | 'urgent' | 'care' | 'medical_stop' | null {
  const r = medicalRoute(text);
  if (r === 'clear') return null;
  if (r === 'crisis' || r === 'urgent' || r === 'care') return r;
  return 'medical_stop';
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!ANTHROPIC_API_KEY) {
    // A misconfigured secret must read as an outage, never as a refusal — brief §6.
    return json({ ok: false, reason: 'unconfigured' }, 503);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'bad_request' }, 400);
  }

  const lift = (typeof body.lift === 'string' ? body.lift : '').replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);
  const note = (typeof body.note === 'string' ? body.note : '').replace(/\s+/g, ' ').trim().slice(0, FORM_NOTE_CHARS);
  if (!lift) return json({ ok: false, reason: 'bad_request' }, 400);

  // ── 0. The code guard, BEFORE the credit and the model ───────────────────────
  //
  // ⚠ THE LIFT NAME IS CLASSIFIED TOO, NOT ONLY THE NOTE. "squat" arrives in the same field an athlete
  // can type anything into, and "shoulder press since I tore my cuff" is a sentence somebody will put
  // there. Both are joined and read as one piece of text, so neither field can launder the other.
  //
  // ⚠ AND THE LINE IS BROADER HERE THAN IN THE CHAT. `medicalRoute` lets "my shoulder hurts, swap
  // tomorrow" through on purpose — in a conversation that is a substitution the app gives away free. This
  // is a VIDEO OF A BODY, and reading frames against "my knee hurts on rep 3" is exactly what we will not
  // do (PO, 2026-09-22, legal caution). Live test the same day: that note reached the model and spent
  // credits, because the narrow route is correctly clear. `mentionsDiscomfort` is the broad list.
  const said = `${lift}\n${note}`;
  const guarded = guardRoute(said) ?? (mentionsDiscomfort(said) ? ('medical_stop' as const) : null);
  if (guarded) return json({ route: guarded });

  // ── 1. The frames ───────────────────────────────────────────────────────────
  //
  // Capped before anything is spent. `capFrames` returns null for too few, too many bytes, or anything
  // that is not a base64 string — an image over the API's own per-image limit would otherwise spend the
  // credit and fail upstream, so the athlete pays and is told the service is down.
  const frames = capFrames(body.frames);
  if (!frames) return json({ ok: false, reason: 'bad_request' }, 400);

  // The caller's JWT is forwarded so the RPCs run as that athlete under RLS. No service key here,
  // deliberately — the same reason `coach-ask` and `program-photo-read` give.
  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  // ── 2. Reserve the credit BEFORE the model call ─────────────────────────────
  //
  // The weight is `coach_ai_config.action_credits.form_check` and lives only there (MA3-D16). While
  // `metering_only` is true this records the spend and never refuses; when it flips, this line starts
  // gating with no code change, which is the whole point of the reservation living in SQL.
  const { data: spend, error: spendError } = await supabase
    .rpc('coach_ai_spend_credits', { p_action: FORM_ACTION })
    .maybeSingle();

  if (spendError) return json({ ok: false, reason: 'meter_unavailable' }, 503);

  const reserved = spend as
    | { allowed: boolean; credits_spent: number; remaining: number; allowance: number }
    | null;
  if (!reserved?.allowed) {
    return json({
      ok: false,
      reason: 'out_of_credits',
      remaining: reserved?.remaining ?? 0,
      allowance: reserved?.allowance ?? 0,
    });
  }

  // ── 3. The model call ───────────────────────────────────────────────────────
  //
  // The frames go in one user turn, each preceded by its position, because the ORDER is the information:
  // a bar moving up and a bar moving down are the same still image twice. The lift and the note follow
  // them, labelled as the athlete's own words.
  const content: unknown[] = [];
  frames.forEach((data, i) => {
    content.push({ type: 'text', text: `Frame ${i + 1} of ${frames.length}:` });
    content.push({ type: 'image', source: { type: 'base64', media_type: MEDIA_TYPE, data } });
  });
  content.push({
    type: 'text',
    text: `Those frames are one set of: ${lift}. They are in time order.${
      note ? `\n\nThe athlete says: "${note}"` : ''
    }\n\nAnswer with the JSON object only.`,
  });

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
        // CA-D5: the form-check cap. A ceiling, not a target — the answer is four short sentences.
        max_tokens: FORM_OUTPUT_CAP,
        // Observation, not reasoning — and the guard is code, so the model is not the only thing standing
        // between an athlete and a bad read. Same settings as `coach-interpret` and `program-photo-read`.
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content }],
      }),
    });
  } catch {
    return json({ ok: false, reason: 'upstream_unreachable' }, 503);
  }

  if (!response.ok) {
    console.error('anthropic', response.status, (await response.text().catch(() => '')).slice(0, 800));
    // Record the failed attempt so the 60-day run does not under-count what the product costs to operate.
    // Credits stay spent — `coach-interpret`'s closing note explains why there is no refund path.
    await supabase.rpc('coach_ai_record_usage', {
      p_action: FORM_ACTION, p_credits: reserved.credits_spent, p_model: MODEL,
      p_input_tokens: 0, p_output_tokens: 0,
      p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
      p_uncharged: true,
    });
    return json({ ok: false, reason: 'upstream_error' }, 503);
  }

  const payload = await response.json();
  const usage = payload?.usage ?? {};

  // ── 4. Record what it actually cost ─────────────────────────────────────────
  //
  // All four counts separately. The cache read is the one that matters — collapsing them into "input
  // tokens" is how a product convinces itself it is 10× more expensive than it is.
  await supabase.rpc('coach_ai_record_usage', {
    p_action: FORM_ACTION,
    p_credits: reserved.credits_spent,
    p_model: payload?.model ?? MODEL,
    p_input_tokens: usage.input_tokens ?? 0,
    p_output_tokens: usage.output_tokens ?? 0,
    p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    p_uncharged: false,
  });

  // A safety refusal is the model declining, not the app failing, and not a verdict on the athlete. It
  // gets the same copy as an unreadable clip rather than inventing a third state for them.
  if (payload?.stop_reason === 'refusal') {
    return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
  }

  const text: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n');

  // ── 5. THE BOUNDARY ─────────────────────────────────────────────────────────
  //
  // ⚠ RUNS AFTER THE MODEL AND OVERRULES IT. Every sentence about pain, an injury, a diagnosis, the
  // athlete's body, whether the lift is safe, or a number for a load is dropped here — see the long note
  // in `src/domain/coach/form-check.ts`. `lift` comes from the REQUEST, so a model that renames the
  // exercise cannot put words in the athlete's mouth about what they were doing.
  const read = parseFormRead(text, lift);
  if (!read) return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });

  return json({ ok: true, read, remaining: reserved.remaining });
});
