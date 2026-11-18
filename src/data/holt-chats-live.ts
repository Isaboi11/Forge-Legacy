import { fetch } from 'expo/fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { consentAllowsNow } from '@/lib/consent';
import { track } from '@/lib/analytics';
import type { AskTurn } from '@/domain/coach/ask-wire';
import { askClock, SUMMARY_TIMEOUT_MS } from '@/domain/coach/ask-stream';
import { classifyAiFailure, wasRefunded } from '@/domain/ai/ai-failure';
import { HOLT_ACTION_CAPS } from '@/domain/coach/holt-actions';
import { HOLT_MEMORY_CAPS, RECAP_WIRE_CHARS } from '@/domain/coach/holt-memory';
import { elapsedMs, reportAiFailure } from '@/lib/ai-telemetry';
import { getRemembers } from '@/data/holt-memory-live';

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

/**
 * Sprint 4b §1.1: what this app asks coach-ask for — the 4a cards AND memory (the facts half of the summary, the recap).
 * The function reads `memory_v1` only on the summary, the recap and `earlier`; the ask's own body sends the same list.
 */
export const MEMORY_CAPS = [HOLT_ACTION_CAPS, HOLT_MEMORY_CAPS] as const;

/** The function's own reasons that mean the summary FAILED (not "nothing worth keeping", not "no Premium AI"). */
const SUMMARY_FAILED = new Set(['upstream_error', 'upstream_unreachable', 'failed', 'refusal', 'bad_output']);

/**
 * `options.signal` — abort it (the chat is gone with the app, say) and the call stops; `timeoutMs` is for tests.
 * Never throws, and never shows anything: a failure is reported to `client_errors` / Sentry (PL-4) and that is all.
 */
/** Sprint 4b §1.6: what the end-of-chat call kept — the summary text (for the past-chat row) and how many facts. */
export interface SummarizeResult {
  summary: string | null;
  kept: number;
}

export async function summarizeChat(turns: readonly AskTurn[], options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<SummarizeResult> {
  const none: SummarizeResult = { summary: null, kept: 0 };
  if (turns.filter((t) => t.role === 'athlete').length < SUMMARY_MIN_ATHLETE_TURNS) return none;
  /* A summary is written by the model, so it is sharing too — but nobody tapped anything, so it never asks:
     without a yes already given, the chat simply is not remembered (MHMDA / Nevada SB 370). */
  if (!consentAllowsNow('ai_sharing')) return none;
  /* Sprint 4b §1.4: memory switched off — nothing is sent (the function keeps nothing anyway, for any app). */
  if (!(await getRemembers())) return none;
  const ms = options.timeoutMs ?? SUMMARY_TIMEOUT_MS;
  /* One wall for the whole call: the session, the request and the reply (`askClock`, the ask's own clock). */
  const clock = askClock({ firstByteMs: ms, idleMs: ms, totalMs: ms, signal: options.signal });
  const startedAt = Date.now();
  let status: number | null = null;
  try {
    const { data: auth } = await clock.race(supabase.auth.getSession());
    const jwt = auth.session?.access_token;
    if (!jwt) return none;
    const res = await clock.race(
      fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'summarize', question: '', history: turns.slice(-40), caps: MEMORY_CAPS }),
        signal: clock.signal,
      }),
    );
    status = res.status;
    const body = (await clock.race(res.json()).catch(() => null)) as { reason?: unknown; upstream?: unknown; summary?: unknown; kept?: unknown } | null;
    const reason = typeof body?.reason === 'string' ? body.reason : null;
    if (res.ok && !(reason && SUMMARY_FAILED.has(reason))) {
      /* §1.3: what the server kept — the summary (for lane B's chat row) and how many facts (the next open says so). */
      const kept = typeof body?.kept === 'number' && Number.isInteger(body.kept) && body.kept > 0 ? Math.min(body.kept, 20) : 0;
      const summary = typeof body?.summary === 'string' && body.summary.trim() ? body.summary.trim() : null;
      if (kept > 0) {
        track('holt_memory', { kind: 'facts_kept', count: kept });
        await noteKept(kept);
      }
      return { summary, kept };
    }
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
  return none;
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


// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Sprint 4b §1.2 — the rolling recap of THIS chat
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** How long a recap may take. Fire-and-forget: nobody waits on it, and a late one is simply dropped. */
export const RECAP_TIMEOUT_MS = 30_000;

/**
 * Fold `turns` (spoken turns that fell out of the question's window, already through `askHistory`'s stop rule) into
 * `prior` (the recap so far) — coach-ask `mode: 'recap'` (Haiku, 0 credits, Premium AI only). The new recap text, or
 * null on any failure or refusal (the old recap stays; the ask goes on without it). Never throws, never shows anything.
 * Runs with memory switched off too: it is this chat's own words, the ones the window already sends (§1.2).
 */
export async function recapChat(prior: string | null, turns: readonly AskTurn[], options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<string | null> {
  if (turns.length === 0) return null;
  /* Model-written from what they said, so it is AI sharing — and nobody tapped anything, so it never asks. */
  if (!consentAllowsNow('ai_sharing')) return null;
  const ms = options.timeoutMs ?? RECAP_TIMEOUT_MS;
  const clock = askClock({ firstByteMs: ms, idleMs: ms, totalMs: ms, signal: options.signal });
  try {
    const { data: auth } = await clock.race(supabase.auth.getSession());
    const jwt = auth.session?.access_token;
    if (!jwt) return null;
    const res = await clock.race(
      fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'recap', question: '', caps: MEMORY_CAPS, earlier: (prior ?? '').slice(0, RECAP_WIRE_CHARS), history: turns.slice(-40) }),
        signal: clock.signal,
      }),
    );
    if (!res.ok) return null;
    const body = (await clock.race(res.json()).catch(() => null)) as { recap?: unknown } | null;
    return typeof body?.recap === 'string' && body.recap.trim() ? body.recap.trim() : null;
  } catch {
    return null;
  } finally {
    clock.done();
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Sprint 4b §1.3 — "Holt kept 2 things from your last chat · See"
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const KEPT_KEY = 'fl_holt_kept_v1';

/** Remember, on this phone, that the last chat kept `n` facts — the next sheet open says so once. */
async function noteKept(n: number): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await AsyncStorage.setItem(KEPT_KEY, JSON.stringify({ n, uid: user.id, at: Date.now() }));
  } catch {
    // A line that does not show is a smaller nudge, never a lost fact — the facts are in What Holt Remembers.
  }
}

/** How many facts the last chat kept, if the line has not been shown yet (and it is this athlete's). */
export async function readKeptNotice(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEPT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { n?: unknown; uid?: unknown };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || v.uid !== user.id) return null;
    return typeof v.n === 'number' && v.n > 0 ? v.n : null;
  } catch {
    return null;
  }
}

/** The line was shown (or tapped): it never shows again for that chat. */
export async function clearKeptNotice(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEPT_KEY);
  } catch {
    // ignore
  }
}
