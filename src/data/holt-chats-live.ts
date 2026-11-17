import { fetch } from 'expo/fetch';

import { supabase } from '@/lib/supabase';
import { consentAllowsNow } from '@/lib/consent';
import type { AskTurn } from '@/domain/coach/ask-wire';
import { askClock, SUMMARY_TIMEOUT_MS } from '@/domain/coach/ask-stream';
import { classifyAiFailure, wasRefunded } from '@/domain/ai/ai-failure';
import { elapsedMs, reportAiFailure } from '@/lib/ai-telemetry';

/**
 * HOLT REMEMBERS PAST CHATS — the app end (Coach-AI-Amendment-002, migration 0218).
 *
 *   summarizeChat(turns)       → when a chat ENDS, asks `coach-ask` (mode 'summarize') to write its 2–3
 *                                line summary as this athlete. Fire-and-forget: a missed summary is a
 *                                smaller memory, never an error on screen. The function decides whether
 *                                there was anything worth keeping and whether they have Premium AI.
 *   fetchChatSummaries()       → the last ten, newest first, for What Holt Remembers. [] on any failure.
 *   deleteChatSummary(id)      → boolean. The athlete can always make him forget a chat.
 *
 * Holt reads the summaries himself, through his `get_past_chats` tool, only when a question needs them —
 * so the cost stays flat however long the athlete has been talking to him.
 */

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/coach-ask`;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Fewer athlete turns than this is a greeting or a tap, not a conversation — nothing is sent. */
export const SUMMARY_MIN_ATHLETE_TURNS = 2;

/*
 * How long the summary may take, end to end, is `SUMMARY_TIMEOUT_MS` (ask-stream.ts, 30 s — AI Road to 10 Sprint 1,
 * PL-3). `coach-ask` cuts its own model call off at 20 s, so on a working function it never fires; before Sprint 1
 * the call had no clock at all and could hang on a dead line for as long as the phone allowed.
 */
export { SUMMARY_TIMEOUT_MS };

/** The function's own reasons that mean the summary FAILED (not "nothing worth keeping", not "no Premium AI"). */
const SUMMARY_FAILED = new Set(['upstream_error', 'upstream_unreachable', 'failed', 'refusal', 'bad_output']);

/**
 * `options.signal` — abort it (the chat is gone with the app, say) and the call stops; `timeoutMs` is for tests.
 * Never throws, and never shows anything: a failure is reported to `client_errors` / Sentry (PL-4) and that is all.
 */
export async function summarizeChat(turns: readonly AskTurn[], options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<void> {
  if (turns.filter((t) => t.role === 'athlete').length < SUMMARY_MIN_ATHLETE_TURNS) return;
  /* A summary is written by the model, so it is sharing too — but nobody tapped anything, so it never asks:
     without a yes already given, the chat simply is not remembered (MHMDA / Nevada SB 370). */
  if (!consentAllowsNow('ai_sharing')) return;
  const ms = options.timeoutMs ?? SUMMARY_TIMEOUT_MS;
  /* One wall for the whole call: the session, the request and the reply (`askClock`, the ask's own clock). */
  const clock = askClock({ firstByteMs: ms, idleMs: ms, totalMs: ms, signal: options.signal });
  const startedAt = Date.now();
  let status: number | null = null;
  try {
    const { data: auth } = await clock.race(supabase.auth.getSession());
    const jwt = auth.session?.access_token;
    if (!jwt) return;
    const res = await clock.race(
      fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'summarize', question: '', history: turns.slice(-40) }),
        signal: clock.signal,
      }),
    );
    status = res.status;
    const body = (await clock.race(res.json()).catch(() => null)) as { reason?: unknown; upstream?: unknown } | null;
    const reason = typeof body?.reason === 'string' ? body.reason : null;
    if (res.ok && !(reason && SUMMARY_FAILED.has(reason))) return;
    const why = reason ?? `http_${res.status}`;
    reportAiFailure({
      fn: 'coach-ask',
      kind: classifyAiFailure({ reason: why, upstream: typeof body?.upstream === 'string' ? body.upstream : null, status }),
      reason: `summary_${why}`.slice(0, 40),
      status,
      latencyMs: elapsedMs(startedAt),
      refunded: wasRefunded(body),
    });
  } catch {
    // Offline, signed out, or out of time — the chat simply is not remembered. Reported, never shown.
    const early = clock.why();
    reportAiFailure({
      fn: 'coach-ask',
      kind: classifyAiFailure({ timedOut: early === 'timeout', cancelled: early === 'aborted', offline: status == null && !early }),
      reason: early === 'timeout' ? 'summary_timeout' : early === 'aborted' ? 'summary_aborted' : 'summary_fetch_failed',
      status,
      latencyMs: elapsedMs(startedAt),
      refunded: false,
    });
  } finally {
    clock.done();
  }
}

export interface ChatSummary {
  id: string;
  summary: string;
  createdAt: string;
}

export async function fetchChatSummaries(): Promise<ChatSummary[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('holt_chat_summaries')
      .select('id, summary, created_at')
      .eq('athlete_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error || !data) return [];
    return (data as { id: string; summary: string; created_at: string }[]).map((r) => ({ id: r.id, summary: r.summary, createdAt: r.created_at }));
  } catch {
    return [];
  }
}

export async function deleteChatSummary(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('holt_chat_summaries').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
