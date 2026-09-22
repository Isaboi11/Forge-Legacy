import { fetch } from 'expo/fetch';

import { supabase } from '@/lib/supabase';
import { medicalRoute } from '@/domain/coach/medical-routing';
import {
  ASK_HISTORY_MAX,
  parseSse,
  readAskEvent,
  trimHistory,
  utf8Decoder,
  type AskContext,
  type AskTurn,
} from '@/domain/coach/ask-wire';
import type { AskSources } from '@/domain/coach/ask-context';
import { catalogForMatching } from '@/domain/exercise-picker/data';
import { getExerciseDetailCoaching } from '@/domain/exercise-coaching/integration';

export { parseSse } from '@/domain/coach/ask-wire';
export type { AskContext, AskTurn } from '@/domain/coach/ask-wire';

/**
 * HOLT'S `ask` JOB — the app end.
 *
 * Calls the `coach-ask` Edge Function (which holds the key, the meter and the prompt) and reads Holt's reply
 * as it streams, so the first words appear immediately (Coach-AI-Amendment-001 CA-D10).
 *
 * ══ WHY `expo/fetch` AND NOT `supabase.functions.invoke` ══
 *
 * `invoke` buffers the whole body before it resolves, which throws away the stream. `expo/fetch` is the
 * SDK 56 WinterCG fetch with a readable `response.body` on iOS, Android and web alike
 * (docs.expo.dev/versions/v56.0.0/sdk/expo — "Streaming"). So the call is made by hand, with the signed-in
 * athlete's JWT so the function's RPCs run as them under RLS.
 *
 * ══ ⚠ NEVER THROWS, AND AN OUTAGE IS NOT A REFUSAL ══
 *
 * Same rule as `coach-interpret-live.ts` (Brief §6): every failure resolves `offline`, never a coaching
 * answer, so the caller can say "the app failed" rather than making Holt look arbitrary.
 */

export type AskResult =
  /** Holt answered. `complete` is false when the stream broke after some words had already arrived. */
  | { kind: 'answer'; text: string; remaining: number | null; complete: boolean }
  /** Self-harm, an emergency now, or disordered eating — the caller shows CRISIS_ / URGENT_ / CARE_STOP. */
  | { kind: 'crisis' }
  | { kind: 'urgent' }
  | { kind: 'care' }
  /** Injury language or a question about the body — the caller shows MEDICAL_STOP. */
  | { kind: 'medical' }
  /** The month's credits are gone. A commercial state, not a coaching one. */
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /** The app failed (network, no session, upstream error). `detail` is for logs, never the athlete. */
  | { kind: 'offline'; detail?: string | null };

export interface AskOptions {
  /** Abort when the athlete closes the sheet; the promise then resolves `offline`. */
  signal?: AbortSignal;
  /** One of the function's ALLOWED_MODELS, for the routing benchmark (CA-D7). */
  model?: string;
}

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/coach-ask`;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** A JSON reply from the function — the guard, the meter, or an error before any streaming began. */
function fromRoute(data: unknown): AskResult {
  const d = (data ?? {}) as { route?: string; remaining?: number; allowance?: number; reason?: string; detail?: string };
  switch (d.route) {
    case 'crisis':
    case 'urgent':
    case 'care':
      return { kind: d.route };
    case 'medical_stop':
      return { kind: 'medical' };
    case 'out_of_credits':
      return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance ?? 0 };
    default:
      return { kind: 'offline', detail: d.reason ?? d.detail ?? null };
  }
}

/**
 * Ask Holt a question and stream his answer.
 *
 * `history` is THIS conversation's turns only (CA-D1); the last 8 are sent. `context` comes from
 * `buildAskContext` (domain/coach/ask-context.ts). `onText` receives the ACCUMULATED reply each time more
 * arrives — render it as-is.
 */
export async function askHolt(
  question: string,
  history: readonly AskTurn[],
  context: AskContext,
  onText: (text: string) => void,
  options: AskOptions = {},
): Promise<AskResult> {
  const q = question.trim();
  if (!q) return { kind: 'offline', detail: 'empty_question' };

  // The code guard, on the device first: free, instant, and it works in a basement with no signal. The
  // function runs the same classifier again, because the device is not a boundary.
  const guard = medicalRoute(q);
  if (guard === 'crisis' || guard === 'urgent' || guard === 'care') return { kind: guard };
  if (guard !== 'clear') return { kind: 'medical' };

  let text = '';
  try {
    const { data: auth } = await supabase.auth.getSession();
    const jwt = auth.session?.access_token;
    if (!jwt) return { kind: 'offline', detail: 'no_session' };

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        question: q,
        history: trimHistory(history, ASK_HISTORY_MAX),
        context,
        ...(options.model ? { model: options.model } : {}),
      }),
      signal: options.signal,
    });

    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('text/event-stream')) {
      // Guard, meter or error — a JSON body, whatever the status.
      const body = await res.json().catch(() => null);
      return fromRoute(body);
    }
    if (!res.body) return { kind: 'offline', detail: 'no_body' };

    const reader = res.body.getReader();
    const decoder = utf8Decoder();
    let carry = '';
    let remaining: number | null = null;
    let finished = false;
    let failure: string | null = null;

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      const parsed = parseSse(decoder.decode(value), carry);
      carry = parsed.carry;
      for (const ev of parsed.events) {
        const e = readAskEvent(ev.data);
        if (!e) continue;
        if ('t' in e) {
          text += e.t;
          onText(text);
        } else if ('error' in e) {
          failure = e.detail ? `${e.error}: ${e.detail}` : e.error;
          finished = true;
          break;
        } else {
          remaining = e.remaining;
          finished = true;
          break;
        }
      }
    }

    const said = text.trim();
    if (failure) {
      return said ? { kind: 'answer', text: said, remaining: null, complete: false } : { kind: 'offline', detail: failure };
    }
    if (!said) return { kind: 'offline', detail: finished ? 'empty_reply' : 'stream_ended' };
    return { kind: 'answer', text: said, remaining, complete: finished };
  } catch (e) {
    const said = text.trim();
    if (said && !options.signal?.aborted) return { kind: 'answer', text: said, remaining: null, complete: false };
    return { kind: 'offline', detail: String((e as Error)?.message ?? e).slice(0, 200) };
  }
}

/**
 * The live sources for `buildAskContext`: the VISIBLE catalogue and the published coaching records.
 * The catalogue array is built once, so `ask-context.ts` can cache its vocabulary against it.
 */
let sources: AskSources | null = null;
export function askSourcesLive(): AskSources {
  if (!sources) {
    sources = {
      catalog: catalogForMatching(),
      coachingFor: (key) => getExerciseDetailCoaching(key),
    };
  }
  return sources;
}
