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
 *
 * ══ THE METER (AI Road to 10, Sprint 1) ══
 *
 * `coach_ai_reserve` holds the credits (Premium AI, the AI-sharing consent, the balance — 0268), the model runs
 * under this function's own 75 s abort (the app waits 90 s), and `coach_ai_settle` runs ONCE before the answer:
 * every failure after the reservation — upstream, timeout, refusal, not a program, unreadable — gives the
 * credits back (P-D2). No reply carries the upstream's words (P-D8) or the reservation id.
 *
 * No age line (P-G8): this is a transcription. The age cannot change what the table says, and one more line in
 * the request is one more way to corrupt a copy.
 *
 * The dashboard paste copy is `supabase/apply/deploy-program-photo-read.ts`, built by
 * `scripts/build-program-photo-read-deploy.mjs`.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
// ⚠ ONE SOURCE FOR THE GUARD, same rule `medical-routing.ts` follows: the sanitiser is a pure domain
// module so `node --test` can prove it separates real transcripts from prose, and so the function and
// the app can never drift on where the line is.
import { sanitizeTranscript } from '../../../src/domain/program/photo-transcript.ts';
// ⚠ ONE SOURCE FOR THE METER: reserve → model → settle, the abort, and what a failure returns (AI Sprint 1).
import {
  callFacts,
  failedCallReply,
  type ModelCall,
  reserveFrom,
  settleArgs,
  settledFrom,
  settledTail,
  type SettleOutcome,
  timedModelCall,
  UPSTREAM_ABORT_MS,
} from '../../../src/domain/ai/meter-server.ts';
// ⚠ WHAT EACH MODEL IS SENT, AND WHICH MODEL RUNS (Sprint 3b, PL-7) — one request shape per model; the model + effort
// read from coach_ai_model_config (0274), this file's default on any failure.
import { anthropicHeaders, EFFORTS, KNOWN_MODELS, requestFields } from '../../../src/domain/ai/model-request.ts';
import { modelConfigReader, uidFromAuthorization } from '../../../src/domain/ai/model-config.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** This function's deployed slug — the meter's `fn` (0268). */
const FN = 'program-photo-read';

/** Same model as `coach-interpret` — locked in the pricing plan, and one model is one set of numbers. */
const MODEL = 'claude-sonnet-5';
/** The in-code default effort. `coach_ai_model_config` (0274) can run another model / effort here, 60 s cache (PL-7). */
const EFFORT = 'low';
const modelConfig = modelConfigReader({
  url: SUPABASE_URL,
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  fetch: (u, init) => fetch(u, init),
  known: KNOWN_MODELS,
  efforts: EFFORTS,
});

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
 * Request ceiling, in base64 characters — 5 MB of image, the Messages API's own per-image limit.
 *
 * `useMediaPicker` already downscales before upload, so anything near this is a client that skipped the
 * resize rather than a legitimately large photo. Refused before the model call, because the cheapest
 * request is the one not made.
 *
 * ⚠ IT WAS 10,000,000 (~7.5 MB), ABOVE THE API'S LIMIT (stress test, 2026-09-21). An image between 5 and
 * 7.5 MB passed this check, spent its reserved credit, and failed upstream as `upstream_error` — so the
 * athlete paid and was told the service was down, when the true answer was "too large".
 */
const MAX_BASE64_CHARS = 6_990_000;

const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * A DAY'S CEILING, per athlete.
 *
 * PO, 2026-09-22 — a cap "but people realistically don't reach it". An import takes at most six photos
 * (`MAX_PHOTOS`), so sixty is ten whole programs in one day; nobody importing their training will see
 * this, and a runaway client or a bored tester stops costing money. The monthly credit allowance is the
 * real budget (0174/0203) — this is the blast radius of one bad day.
 */
const MAX_READS_PER_DAY = 60;

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

Use these header names where the source has them: Week, Day, Exercise, Sets, Reps, Time.

- Keep the source's own column layout when it differs. If the sheet is one row per day with the whole session written out as a sentence, use Week, Day, Session and put the sentence in the Session cell whole.
- If a column is not in the image, leave the cell empty. An empty cell is a true statement about the photograph.
- If the image shows no Week column, do not invent one — omit it entirely.
- If an exercise is prescribed by TIME instead of a rep count — an interval timer's "0:40", a hold's "45s", "1 min" — put that time in a Time column exactly as written. Never move a time into Sets or Reps, and never leave it out.
- Rest rows ("Rest 0:20") are rows like any other: transcribe them.

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

  // ── 0. The day's ceiling ───────────────────────────────────────────────────
  //
  // Counted under the caller's own JWT, so RLS means it can only ever see that athlete's rows. Read
  // BEFORE the credit is reserved: a refusal must not spend one.
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('coach_ai_spend')
    .select('id', { count: 'exact', head: true })
    .eq('action', ACTION)
    .gte('occurred_at', since.toISOString());

  // A counter that cannot be read must not block the feature — the monthly meter still bounds the spend.
  if (!countError && (count ?? 0) >= MAX_READS_PER_DAY) {
    return json({ ok: false, reason: 'daily_limit', limit: MAX_READS_PER_DAY }, 429);
  }

  // ── 1. Reserve the credit BEFORE the model call — the Premium AI gate (0203) and the consent check (0268) ──
  //
  // The credits are HELD until step 3 settles them; every failure from here on gives them back (P-D2).
  // ⛔ `meter.id` (the reservation) stays in this function — no reply carries it.
  const { data: reservedRow, error: reserveError } = await supabase
    .rpc('coach_ai_reserve', { p_action: ACTION, p_fn: FN })
    .maybeSingle();
  const meter = reserveFrom(reservedRow, reserveError);
  if (!meter.ok) {
    if (meter.reason === 'meter_unavailable') return json({ ok: false, reason: 'meter_unavailable' }, 503);
    if (meter.reason === 'no_consent') return json({ ok: false, reason: 'no_consent' }, 403);
    // No Premium AI reads as out_of_credits with an allowance of 0, as it always has (0203).
    return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
  }
  /**
   * Settled ONCE, before the answer is returned (contract §1.3), with all four token counts — the cache read is
   * the one that matters. Every outcome but `ok` refunds.
   */
  const choice = await modelConfig.pick(FN, uidFromAuthorization(authorization), { model: MODEL, effort: EFFORT });
  const model = choice.model;
  // Thinking off, effort low (or the configured effort), in the form THIS model takes, + the refusal fallback where it
  // exists (model-request.ts: Sonnet 5 / Haiku 5.5 `disabled`, Sonnet 5.5 `between_tools`, Opus 5.5 no field).
  const modelFields = requestFields(model, {
    thinkingOff: true,
    effort: choice.effort ?? EFFORT,
  });
  const settle = async (outcome: SettleOutcome, call: ModelCall) => {
    const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, callFacts(call, model))).maybeSingle();
    return settledTail(settledFrom(data, error), meter.remaining);
  };

  // ── 2. The model call, under this function's own abort (contract §3) ───────
  const call = await timedModelCall(
    (signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: anthropicHeaders(ANTHROPIC_API_KEY!, modelFields),
        body: JSON.stringify({
          model,
          // A 12-week sheet is a lot of rows, and a transcript cut off at the cap is a program that
          // silently loses its last weeks. `sanitizeTranscript` caps the rows that reach the parser;
          // this only has to be big enough that the model is not the thing truncating.
          max_tokens: 8192,
          // Transcription, not reasoning — and the guard is code, so the model is not the only thing
          // standing between an athlete and a bad read. Same posture as `coach-interpret`.
          ...modelFields,
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
      }),
    UPSTREAM_ABORT_MS[FN],
  );

  // Unreachable, a non-2xx, or our own abort: refunded. The upstream's words are in this function's log only (P-D8).
  if (call.kind !== 'ok') {
    return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind, call)) }, 503);
  }
  const payload = call.payload;

  // A safety refusal is the model declining, not the app failing, and not a verdict on the photo. It
  // gets the same copy as an unreadable image rather than inventing a third state for the athlete. Refunded.
  if (payload?.stop_reason === 'refusal') {
    return json({ ok: false, reason: 'unreadable', ...(await settle('refusal', call)) });
  }

  const text: string = (payload?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n');

  // ── 3. THE BOUNDARY, then the settle ───────────────────────────────────────
  //
  // ⚠ RUNS AFTER THE MODEL AND OVERRULES IT. Everything the model wrote that is not a tab-separated row
  // is dropped here, including the `NOT_A_PROGRAM` token itself — which needs no special case, because
  // it has no tab in it either. Not a program, or too little to read: refunded.
  const clean = sanitizeTranscript(text);
  if (!clean.ok) {
    const outcome: SettleOutcome =
      clean.reason === 'not_a_program' ? 'not_a_program' : payload?.stop_reason === 'max_tokens' ? 'truncated' : 'unreadable';
    return json({ ok: false, reason: clean.reason, ...(await settle(outcome, call)) });
  }

  return json({ ok: true, tsv: clean.tsv, rows: clean.rows, ...(await settle('ok', call)) });
});
