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
 * It copies characters. The guards, in order: the prompt below; the rule at the bottom of this file (no sets or
 * reps in the answer = not a workout, so a description of a photograph is refused, and the answer is capped);
 * `cleanCardTranscript` on the device, which is the same rule and the one that decides; and then nothing is posted
 * as it stands — the text goes in the poster's own box and through the reader.
 *
 * ⚠ SELF-CONTAINED ON PURPOSE. It imports nothing from `src/`, so THIS FILE is the dashboard paste copy.
 *
 * ══ ⚠ THE KEY LIVES HERE AND NOWHERE ELSE ══
 *
 * `ANTHROPIC_API_KEY` is an Edge Function secret, the same one `program-photo-read` uses. It never reaches the app.
 *
 * Deploy: Supabase dashboard → Edge Functions → Deploy a new function → "Via Editor" → name it `workout-card-read`
 * → replace the editor contents with this whole file → Deploy. No migration: it meters as `photo_import`, the
 * action `program-photo-read` already uses (0174) — it is the same job, a photo transcribed, at the same price.
 * Until it is deployed the app falls back to the table read, so nothing breaks in between.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

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

  // ── 1. Reserve the credit BEFORE the model call ────────────────────────────
  const { data: spend, error: spendError } = await supabase.rpc('coach_ai_spend_credits', { p_action: ACTION }).maybeSingle();
  if (spendError) return json({ ok: false, reason: 'meter_unavailable' }, 503);
  const reserved = spend as { allowed: boolean; credits_spent: number; remaining: number; allowance: number } | null;
  if (!reserved?.allowed) {
    return json({ ok: false, reason: 'out_of_credits', remaining: reserved?.remaining ?? 0, allowance: reserved?.allowance ?? 0 });
  }

  // ── 2. The model call ──────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
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

  // A refusal, or an answer cut off at the cap, is a card that was not read — never half of one.
  if (payload?.stop_reason === 'refusal' || payload?.stop_reason === 'max_tokens') {
    return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
  }

  // ── 3. THE BOUNDARY ────────────────────────────────────────────────────────
  // ⚠ RUNS AFTER THE MODEL AND OVERRULES IT. No sets or reps in the answer means it is not a workout, whatever
  // else it says — so a description of a photograph, or of anyone in it, never leaves this function.
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

  if (!text) return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
  if (/^NOT_A_WORKOUT\b/.test(text) || !/\d\s*(?:x\s*\d|sets?\b|reps?\b|%)/i.test(text)) {
    return json({ ok: false, reason: 'not_a_program', remaining: reserved.remaining });
  }
  return json({ ok: true, text, remaining: reserved.remaining });
});
