import { fetch } from 'expo/fetch';

import { supabase } from '@/lib/supabase';
import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { medicalRoute } from '@/domain/coach/medical-routing';
import {
  ASK_HISTORY_MAX,
  trimHistory,
  type AskContext,
  type AskTurn,
} from '@/domain/coach/ask-wire';
import {
  ASK_FIRST_BYTE_MS,
  ASK_IDLE_MS,
  ASK_WEB_FIRST_BYTE_MS,
  askClock,
  readAskStream,
  settleAskRead,
  type AskRead,
  type AskSettled,
} from '@/domain/coach/ask-stream';
import type { AskSources } from '@/domain/coach/ask-context';
import type { RecipeCard } from '@/domain/coach/ask-tools';
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

/** Something Holt asked the app to do, still in the model's words — the sheet narrows and confirms it. */
export interface AskAction {
  name: string;
  input: unknown;
}

export type AskResult =
  /**
   * Holt answered (`answer`) — `complete` is false when the stream broke after some words had already
   * arrived, `cut` true when it stopped at the length cap; `actions` are what he asked the app to do (a
   * program change to confirm, an online-search offer). Or he declined (`refused`, not an outage), or the app
   * failed (`offline` — `timedOut` when nothing came back in time, `aborted` when the sheet closed).
   * See `domain/coach/ask-stream.ts`.
   */
  | AskSettled
  /** Self-harm, an emergency now, or disordered eating — the caller shows CRISIS_ / URGENT_ / CARE_STOP. */
  | { kind: 'crisis' }
  | { kind: 'urgent' }
  | { kind: 'care' }
  /** Injury language or a question about the body — the caller shows MEDICAL_STOP. */
  | { kind: 'medical' }
  /** The month's credits are gone. A commercial state, not a coaching one. */
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /** The athlete chose "Not now" on the AI consent sheet. Nothing was sent. */
  | NoAiConsent;

/** The app failed before a word came back (network, no session, upstream error). `detail` is for logs. */
const offline = (detail: string): AskResult => ({ kind: 'offline', detail, timedOut: false, aborted: false });

export interface AskOptions {
  /** Abort when the athlete closes the sheet; the promise then resolves `offline` with `aborted`. */
  signal?: AbortSignal;
  /** Override the clock (`ask-stream.ts`) — for a test, never the sheet. */
  firstByteMs?: number;
  idleMs?: number;
  /** One of the function's ALLOWED_MODELS, for the routing benchmark (CA-D7). */
  model?: string;
  /** The athlete TAPPED "Find one online" — only then does the function carry web search (and meter 'web'). */
  allowWeb?: boolean;
  /** The recipe book with the app's own numbers (`holtRecipeCardsLive`), for Holt's `get_recipes`. */
  recipes?: readonly RecipeCard[];
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
      return offline(d.reason ?? d.detail ?? 'unknown_route');
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
  if (!q) return offline('empty_question');

  // The code guard, on the device first: free, instant, and it works in a basement with no signal. The
  // function runs the same classifier again, because the device is not a boundary.
  const guard = medicalRoute(q);
  if (guard === 'crisis' || guard === 'urgent' || guard === 'care') return { kind: guard };
  if (guard !== 'clear') return { kind: 'medical' };

  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;

  /*
   * ⚠ THE CLOCK STARTS HERE, AFTER CONSENT (AI audit C-D2). The consent sheet waits on a person; everything
   * from now on waits on the network, and is bounded — the first byte, then the gaps between events, then
   * the sheet closing (`options.signal`). Every await below is raced against it.
   */
  const clock = askClock({
    firstByteMs: options.firstByteMs ?? (options.allowWeb ? ASK_WEB_FIRST_BYTE_MS : ASK_FIRST_BYTE_MS),
    idleMs: options.idleMs ?? ASK_IDLE_MS,
    signal: options.signal,
  });
  let read: AskRead | null = null;
  try {
    const { data: auth } = await clock.race(supabase.auth.getSession());
    const jwt = auth.session?.access_token;
    if (!jwt) return offline('no_session');

    const res = await clock.race(fetch(FUNCTION_URL, {
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
        // The device's clock, so Holt's lookups (`ask-tools.ts`) date a workout on the athlete's calendar.
        tz: new Date().getTimezoneOffset(),
        ...(options.model ? { model: options.model } : {}),
        ...(options.allowWeb ? { allowWeb: true } : {}),
        ...(options.recipes?.length ? { recipes: options.recipes } : {}),
      }),
      signal: clock.signal,
    }));

    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('text/event-stream')) {
      // Guard, meter or error — a JSON body, whatever the status.
      const body = await clock.race(res.json()).catch(() => null);
      if (body == null && clock.why()) return settleAskRead(brokeRead('json'), clock.why());
      return fromRoute(body);
    }
    if (!res.body) return offline('no_body');

    // The words, the actions and how it ended — read against the clock (`domain/coach/ask-stream.ts`).
    read = await readAskStream(res.body.getReader(), onText, clock);
    return settleAskRead(read, clock.why());
  } catch (e) {
    // Before the stream (the session, the request itself): nothing was said yet.
    return settleAskRead(read ?? brokeRead(String((e as Error)?.message ?? e)), clock.why());
  } finally {
    clock.done();
  }
}

/** A read that broke before a word arrived. */
const brokeRead = (why: string): AskRead => ({
  text: '',
  remaining: null,
  finished: false,
  stop: null,
  failure: null,
  actions: [],
  broke: why.slice(0, 200),
});

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
