import { supabase } from '@/lib/supabase';
import { reaskConsent } from '@/lib/consent';
import {
  AI_APP_TIMEOUT_MS,
  aiFailureOf,
  serverSaysNoConsent,
  type AiAnswer,
  type TimedAiFunction,
} from '@/domain/ai/ai-call';
import { elapsedMs, reportAiFailure } from '@/lib/ai-telemetry';
import { noteAiRemaining } from '@/data/ai-credits-live';

/**
 * ══ EVERY NON-CHAT AI CALL GOES THROUGH HERE (AI Road to 10, Sprint 1 — PL-3 / PL-4, audit P-G1 / P-G3) ══
 *
 *   · A clock on every call — the contract's app timeout (`AI_APP_TIMEOUT_MS`), passed to functions-js as `timeout`
 *     AND raced here: React Native's `AbortSignal` is a polyfill, and an answer must never wait on it
 *     (the same reason as `authorWithin`, Sprint 0 B-D8).
 *   · The screen's own signal: a screen that closes mid-call aborts it, and that is a cancel, never a failure.
 *   · The failure body read ONCE, the way every module used to read it by hand: a non-2xx still carries the
 *     function's reason on the error's `context` (the Response). Only no answer at all is offline.
 *   · `no_consent` from the server (P-G9) goes to the consent sheet — once — and is tried again if they agree.
 *
 * ⚠ NEVER THROWS. Each module turns the answer into its own result, then calls `reportAiCall` on a failure.
 */

export interface AiInvokeOptions {
  /** The screen going away, or a stop. Aborting it is a cancel: nothing is reported. */
  signal?: AbortSignal;
  /** Shorter than the contract value (tests). Never longer: the function's upstream abort is set against it. */
  timeoutMs?: number;
}

export async function invokeAi(fn: TimedAiFunction, body: unknown, opts: AiInvokeOptions = {}): Promise<AiAnswer> {
  const first = await callOnce(fn, body, opts);
  if (!serverSaysNoConsent(first)) return first;
  /* The phone asked first, so the server's "no" is a bug worth seeing — then the sheet, and one more try. */
  reportAiFailure(aiFailureOf(first));
  if (opts.signal?.aborted || !(await reaskConsent('ai_sharing'))) return first;
  return callOnce(fn, body, opts);
}

/** The credits chip's number is the one an answer carries (`remaining`, Sprint 1 §1.2 — UX-2, 0272). */
function noted(answer: AiAnswer): AiAnswer {
  noteAiRemaining(answer.body);
  return answer;
}

/** Report one failed call (`AiFailure` via `reportAiFailure`). `outcome` = the module's own name for what happened. */
export function reportAiCall(answer: AiAnswer, outcome?: string | null): void {
  reportAiFailure(aiFailureOf(answer, outcome));
}

async function callOnce(fn: TimedAiFunction, body: unknown, opts: AiInvokeOptions): Promise<AiAnswer> {
  const t0 = Date.now();
  const wall = Math.min(opts.timeoutMs ?? AI_APP_TIMEOUT_MS[fn], AI_APP_TIMEOUT_MS[fn]);
  const answer = (over: Partial<AiAnswer>): AiAnswer => ({
    fn,
    body: null,
    status: null,
    offline: false,
    timedOut: false,
    cancelled: false,
    latencyMs: elapsedMs(t0),
    ...over,
  });
  const screen = opts.signal;
  if (screen?.aborted) return answer({ cancelled: true });

  const ctl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const stopped = new Promise<AiAnswer>((resolve) => {
    timer = setTimeout(() => {
      ctl.abort();
      resolve(answer({ timedOut: true }));
    }, wall);
    onAbort = () => {
      ctl.abort();
      resolve(answer({ cancelled: true }));
    };
    screen?.addEventListener('abort', onAbort);
  });

  const work = (async (): Promise<AiAnswer> => {
    try {
      const res = await supabase.functions.invoke(fn, { body: body as Record<string, unknown>, timeout: wall, signal: ctl.signal });
      if (!res.error) return answer({ body: res.data ?? null, status: (res as { response?: Response }).response?.status ?? 200 });
      const ctx = (res.error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return answer({ offline: true });
      return answer({ body: await ctx.json().catch(() => null), status: ctx.status });
    } catch {
      return answer({ offline: true });
    }
  })().then(noted);

  try {
    return await Promise.race([work, stopped]);
  } finally {
    clearTimeout(timer);
    if (onAbort) screen?.removeEventListener('abort', onAbort);
  }
}
