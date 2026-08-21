/**
 * PROGRAM PHOTO READ — a screenshot of a training table becomes tab-separated rows.
 *
 * ══ WHAT THIS IS ══
 *
 * `Architecture-Amendment-001-Import.md` §5 named this and deferred it: *"Image Import: screenshots of
 * training tables from other apps, photos of printed programs. Requires OCR or vision model parsing.
 * Post-MVP."* The same document's §4.3 locks the principle it has to live inside — *"Import First,
 * Automate Later … No AI interpretation. No inference."*
 *
 * ⚠ **SO THE MODEL DOES NOT READ A PROGRAM. IT READS CHARACTERS.** It transcribes the pixels to TSV and
 * stops. `parseProgramTable()` on the device — the same thousand lines that already read a paste — does
 * every bit of the interpreting: which column is which, what a scheme means, which numbers were assumed.
 * A photographed table and a pasted one therefore produce identical results through an identical
 * preview, which is what keeps this inside §4.3 rather than around it.
 *
 * It is the same split `coach-interpret` runs on, and for the same reason: *"Holt does not write
 * programs. He calls a machine that does."*
 *
 * ══ ⚠ THE KEY LIVES HERE AND NOWHERE ELSE ══
 *
 * `ANTHROPIC_API_KEY` is an Edge Function secret — brief §10, and the identical note at the top of
 * `coach-interpret/index.ts`. It must never reach the client bundle: Expo inlines `EXPO_PUBLIC_*`, and
 * a key committed to a repo is a key that is gone.
 *
 * ══ ⚠ THE GUARD IS `sanitizeTranscript`, AND IT IS CODE ══
 *
 * The prompt below tells the model to emit rows and nothing else. That is a request. The boundary is
 * `../../../src/domain/program/photo-transcript.ts`, which runs AFTER the model answers and drops every
 * line that does not contain a tab — the same shape as the acuity override in `coach-interpret`.
 *
 * That matters most for the case the app cannot control. An athlete points a camera; nothing here can
 * enforce what is in frame. The guarantee is therefore not that the model will decline to describe a
 * person — it is that **this function has no channel that carries a sentence**, so it cannot. Prose,
 * a caption, an assessment of a body: none of them contain a tab, and none of them come back.
 *
 * ⚠ **AND THAT IS WHY THIS FUNCTION IS NOT `coach-interpret` WITH AN IMAGE BOLTED ON.** Photo COACHING
 * (capability A4, 3 credits, four binding rules, and an age floor the Decision Queue still lists as
 * open) is a different product that looks at a person on purpose. This one looks at a table and is
 * structurally incapable of the other job. Do not merge them.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE GUARD, same rule `medical-routing.ts` follows: the sanitiser is a pure domain
// module so `node --test` can prove it separates real transcripts from prose, and so the function and
// the app can never drift on where the line is.
import { sanitizeTranscript } from '../../../src/domain/program/photo-transcript.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** Same model as `coach-interpret` — locked in the pricing plan, and one model is one set of numbers. */
const MODEL = 'claude-sonnet-5';

/**
 * The meter's name for this call. Weighted in `coach_ai_config.action_credits` (migration `0174`), never
 * here — MA3-D16: *every cap and allowance is server-side config, never a constant in `src/`*.
 *
 * ⚠ ITS OWN ACTION, NOT `photo_read`. Reusing photo coaching's weight would save a migration and cost
 * the 60-day run the only thing it is for: `photo_read` is a model looking at a body and reasoning,
 * this is a transcription, and their per-call economics are not the same number. A ledger that cannot
 * tell two capabilities apart cannot price either.
 */
const ACTION = 'photo_import';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Request ceiling, in base64 characters (~7.5 MB of image).
 *
 * `useMediaPicker` already downscales before upload, so anything near this is a client that skipped the
 * resize rather than a legitimately large photo. Refused before the model call, because the cheapest
 * request is the one not made.
 */
const MAX_BASE64_CHARS = 10_000_000;

const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SYSTEM PROMPT — one stable block, cached
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ EVERY BYTE IS CACHED AND MUST NOT VARY PER REQUEST — the same cost rule `coach-interpret` states at
 * length. No athlete id, no timestamp, no filename in here. The image goes in the user turn.
 *
 * Sonnet 5's minimum cacheable prefix is 1024 tokens. If `usage.cache_read_input_tokens` is zero across
 * repeated calls, something variable has been added below and the cost projection is wrong by ~10×.
 */
const SYSTEM = `You are a transcriber. You convert a photograph or screenshot of a training program into tab-separated rows.

# Your entire job

Read the table in the image and write it out as TSV. You are OCR with an understanding of table layout. You are not a coach, an assistant, or an editor.

Output ONLY tab-separated rows. A header row first, then one row per line. No prose before it, no summary after it, no markdown code fences, no commentary of any kind. If you catch yourself writing a sentence, delete it.

# The columns

Use these header names where the source has them: Week, Day, Exercise, Sets, Reps.

- Keep the source's own column layout when it differs. If the sheet is one row per day with the whole session written out as a sentence, use Week, Day, Session and put the sentence in the Session cell whole.
- If a column is not in the image, leave the cell empty. An empty cell is a true statement about the photograph.
- If the image shows no Week column, do not invent one — omit it entirely.

# What you must never do

**Never invent a value.** If the sets column is blank, blurred, cut off, or you are unsure, leave it blank. A blank cell is read downstream as "the sheet did not say" and is shown to the athlete as an assumption they can correct. A number you guessed is indistinguishable from a number their coach wrote, and it is not correctable because nobody knows it is wrong.

**Never correct an exercise name.** Transcribe exactly what is written, including abbreviations, misspellings, and shorthand. "Bench" stays "Bench". "RDL" stays "RDL". "Squat 3ct pause" stays "Squat 3ct pause". Something downstream matches these to a catalogue; a name you improved is a name that no longer matches what the athlete was given.

**Never reorder, merge, summarise, or skip rows.** Including rows you think are redundant.

**Never describe the image.** Not the table, not the paper, not the room, and never a person. If a person is visible in the photograph, transcribe the table and say nothing whatsoever about them — no count, no description, no note that anyone is present.

# When it is not a training program

If the image does not contain a training table — it is a photo of a person, a receipt, a conversation, a landscape, a blank page, or anything else — output exactly this single line and nothing else:

NOT_A_PROGRAM

Do not explain the decision. Do not describe what the image showed instead. Do not apologise or offer to help. That one token is the entire response.

If the image contains a training table you can only partly read, transcribe the part you can read and leave the rest blank. Partly-read is not the same as not-a-program, and the athlete reviews everything before anything is created.`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface Body {
  /** Base64 image data, no data-URI prefix. */
  image?: string;
  mediaType?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!ANTHROPIC_API_KEY) {
    // A misconfigured secret must read as an outage, never as a refusal — brief §6. The athlete has to
    // be able to tell "the app failed" from "we could not read that photo".
    return json({ ok: false, reason: 'unconfigured' }, 503);
  }

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

  // The caller's JWT is forwarded so the RPCs run as that athlete under RLS. This function holds no
  // service key, deliberately — same reason `coach-interpret` and `admin-live.ts` give.
  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  // ── 1. Reserve the credit BEFORE the model call ────────────────────────────
  //
  // `coach_ai_config.metering_only` is TRUE today, so this records the spend and never refuses — the
  // metered-tester posture the plan requires. When it flips, this line starts gating with no code
  // change, which is the entire point of the reservation living in SQL.
  const { data: spend, error: spendError } = await supabase
    .rpc('coach_ai_spend_credits', { p_action: ACTION })
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

  // ── 2. The model call ──────────────────────────────────────────────────────
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
        // A 12-week sheet is a lot of rows, and a transcript cut off at the cap is a program that
        // silently loses its last weeks. `sanitizeTranscript` caps the rows that reach the parser;
        // this only has to be big enough that the model is not the thing truncating.
        max_tokens: 8192,
        // Transcription, not reasoning — and the guard is code, so the model is not the only thing
        // standing between an athlete and a bad read. Same posture as `coach-interpret`.
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
              { type: 'text', text: 'Transcribe this training table as TSV.' },
            ],
          },
        ],
      }),
    });
  } catch {
    return json({ ok: false, reason: 'upstream_unreachable' }, 503);
  }

  if (!response.ok) {
    // Record the failed attempt so the 60-day run does not under-count what the product costs to
    // operate. Credits stay spent — `coach-interpret`'s closing note explains why there is no refund
    // path, and a second meter with different rules would be worse than the rounding error it fixes.
    await supabase.rpc('coach_ai_record_usage', {
      p_action: ACTION, p_credits: reserved.credits_spent, p_model: MODEL,
      p_input_tokens: 0, p_output_tokens: 0,
      p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
      p_uncharged: true,
    });
    return json({ ok: false, reason: 'upstream_error' }, 503);
  }

  const payload = await response.json();
  const usage = payload?.usage ?? {};

  // ── 3. Record what it actually cost ────────────────────────────────────────
  //
  // All four counts separately. The cache read is the one that matters — collapsing them into "input
  // tokens" is how a product convinces itself it is 10× more expensive than it is.
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

  // A safety refusal is the model declining, not the app failing, and not a verdict on the photo. It
  // gets the same copy as an unreadable image rather than inventing a third state for the athlete.
  if (payload?.stop_reason === 'refusal') {
    return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
  }

  const text: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n');

  // ── 4. THE BOUNDARY ────────────────────────────────────────────────────────
  //
  // ⚠ RUNS AFTER THE MODEL AND OVERRULES IT. Everything the model wrote that is not a tab-separated row
  // is dropped here, including the `NOT_A_PROGRAM` token itself — which needs no special case, because
  // it has no tab in it either.
  const clean = sanitizeTranscript(text);
  if (!clean.ok) {
    return json({ ok: false, reason: clean.reason, remaining: reserved.remaining });
  }

  return json({ ok: true, tsv: clean.tsv, rows: clean.rows, remaining: reserved.remaining });
});
