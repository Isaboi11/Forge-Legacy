/**
 * HOLT'S ANSWER OFF THE WIRE, WITH A CLOCK ON IT (AI audit 2026-11-16, C-D2 · C-D4).
 *
 * `streamCoachAsk` (`src/data/coach-ask-live.ts`, `askHolt` before Sprint 2) used to read the coach-ask stream with no
 * signal and no clock.
 * A stalled connection left "Holt is working" on screen until the phone gave up, so anything the athlete
 * typed meanwhile sat in the queue; and closing the sheet never stopped the model, which kept writing (and
 * costing) to the end. The read lives here now, pure, so a fake stream can prove the clock and the endings.
 *
 * ══ THE CLOCK ══
 *
 * One per ask, started once the request goes out (after the consent sheet, which waits on a person):
 *
 *   · FIRST BYTE — nothing at all back inside {@link ASK_FIRST_BYTE_MS} and the ask ends as an outage.
 *     A web search runs inside the model's turn before any word arrives, so a tapped search waits longer.
 *   · IDLE — once something has arrived, silence longer than {@link ASK_IDLE_MS} between two events ends it.
 *     Generous on purpose: the function relays only words, so a tool round mid-reply is silence too.
 *   · THE SHEET CLOSING — the caller's signal. Same abort, but the caller says nothing about it.
 *
 * Each read is RACED against the clock rather than trusting the platform fetch to reject a pending read on
 * abort (the expo/fetch docs do not say it does). The abort still goes to `fetch`, which cancels the native
 * request, and the reader is cancelled too, so the function's own `cancel()` runs and the model stops.
 *
 * ══ HOW IT ENDED (C-D4) ══
 *
 * The function forwards the model's stop reason on its `done` line. `refusal` is Holt DECLINING — any words
 * that streamed before it are taken back (the API's guidance for a refusal mid-reply) and the sheet says so
 * in his voice, never with the outage card (Design Brief §6: a refusal must not look like the app failing).
 * `max_tokens` (or the context window) is a reply cut at the length cap: the words stand, and he says it ran
 * long.
 *
 * ══ SPRINT 1 (AI Road to 10 — PL-3 / PL-4, audit C-G5 · P-D2 · P-G1) ══
 *
 *   · THE WALL — one more timer, {@link ASK_TOTAL_MS}, that no activity resets. The function now sends a
 *     keep-alive at least every 10 s, so the idle clock no longer fires while it is alive; the wall is what
 *     still ends an ask that never finishes. The function's own turn budget sits 15 s inside it.
 *   · STATUS — `{status}` lines during a tool round go to `onStatus` ("Checking your lift log…"), so the
 *     waiting bubble can say what he is doing. Only the fixed table's phrases ever arrive (`readAskEvent`).
 *   · REFUNDED — the function says when it gave the credit back; the settled result carries it, and the
 *     sheet shows "Not charged." under the outage card.
 *   · TELEMETRY — {@link askFailureReport} turns any ending that is not a clean answer into the one
 *     `AiFailure` shape `reportAiFailure` sends to `client_errors` and Sentry.
 *
 * ══ SPRINT 2 (AI Road to 10 — CH-2, audit C-I1) ══
 *
 *   · TAKEN BACK — a `retract` line means the function's output scanner stopped Holt's finished reply: the read
 *     settles `retracted`, whatever the `done` line after it says, and the sheet swaps the streamed words for the
 *     medical stop card. Any action he forwarded goes with them, as on a refusal.
 *   · AND CHECKED HERE TOO — {@link withOutputScan} runs the same scanner (`domain/ai/output-scan.ts`) on the settled
 *     answer, so a phone with this code is protected even while the function on the server is an older one. A
 *     client is not a boundary; it is a second layer.
 *
 * ⚠ Domain code: relative imports only (`@/` would break `node --test`).
 */

import { classifyAiFailure, type AiFailure } from '../ai/ai-failure.ts';
import { scanStringsOf, scanTexts } from '../ai/output-scan.ts';
import { parseSse, readAskEvent, utf8Decoder, type AskStatusDetail } from './ask-wire.ts';

/** Nothing back at all inside this long, and the ask ends as an outage. */
export const ASK_FIRST_BYTE_MS = 20_000;
/**
 * The same, for an online search the athlete TAPPED for. The search runs inside the model's turn before
 * any word is relayed, and the tap already spent the larger web credit — giving up on it early would charge
 * them for an outage card.
 */
export const ASK_WEB_FIRST_BYTE_MS = 45_000;
/** Silence this long between two events, once the reply has started, and the ask ends as an outage. */
export const ASK_IDLE_MS = 45_000;
/**
 * The outer wall for one ask, however busy the line is (Sprint 1 contract §3). `coach-ask` ends its own turn
 * at 60 s (`ASK_SERVER_TURN_MS`) and settles before its last line, so on a working function this never fires.
 */
export const ASK_TOTAL_MS = 75_000;
/** The same for a tapped online search; the function's own budget for one is 90 s (`ASK_SERVER_WEB_TURN_MS`). */
export const ASK_WEB_TOTAL_MS = 105_000;
/**
 * The end-of-chat summary (`summarizeChat`, holt-chats-live.ts), end to end. `coach-ask` cuts its own model call
 * off at 20 s (`SUMMARY_UPSTREAM_MS`); before Sprint 1 this call had no clock at all.
 */
export const SUMMARY_TIMEOUT_MS = 30_000;

/**
 * The lookups the sheet gathers BEFORE it asks (the active program, notes, recipes, the pantry). They read
 * the database with no deadline of their own, and "Holt is working" holds the queue while they run — so past
 * this, the ask goes ahead without whatever has not come back (C-D2: the hold always lets go).
 */
export const ASK_CONTEXT_MS = 8_000;

/** `p`, or `fallback` if it rejects or has not settled inside `ms`. For a lookup an ask can do without. */
export function within<T>(ms: number, p: Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/** Why an ask stopped early: either timer ran out, or the caller's signal fired (the sheet closed). */
export type AskEarlyStop = 'timeout' | 'aborted';

export interface AskClock {
  /** Aborted when either timer runs out or the caller's signal fires. Hand it to `fetch`. */
  readonly signal: AbortSignal;
  /** Something arrived: the first-byte timer gives way to the idle one, and the idle one restarts. */
  heard(): void;
  /** `p`, unless the clock stops first — then it rejects at once, whatever `p` is still doing. */
  race<T>(p: Promise<T>): Promise<T>;
  /** Why it stopped, or null while it is still running. */
  why(): AskEarlyStop | null;
  /** Clear the timer and let go of the caller's signal. Call it however the ask ended. */
  done(): void;
}

/**
 * Start the clock for one ask. `totalMs` is the wall — it runs from the start and nothing resets it; without
 * it, the first-byte and idle timers are the whole clock (as before Sprint 1).
 */
export function askClock(opts: { firstByteMs: number; idleMs: number; totalMs?: number; signal?: AbortSignal }): AskClock {
  const ctl = new AbortController();
  let why: AskEarlyStop | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let wall: ReturnType<typeof setTimeout> | null = null;
  let finished = false;
  let fail: ((e: Error) => void) | null = null;
  /* One promise that rejects when the clock stops, raced against each step. Caught here so a clock that
     stops while nothing is racing it is never an unhandled rejection. */
  const stopped = new Promise<never>((_, reject) => {
    fail = reject;
  });
  stopped.catch(() => undefined);

  const clear = () => {
    if (timer != null) clearTimeout(timer);
    timer = null;
  };
  const clearWall = () => {
    if (wall != null) clearTimeout(wall);
    wall = null;
  };
  const stop = (reason: AskEarlyStop) => {
    if (finished || why) return;
    why = reason;
    clear();
    clearWall();
    ctl.abort();
    fail?.(new Error(reason === 'timeout' ? 'ask_timeout' : 'ask_aborted'));
  };
  const arm = (ms: number) => {
    clear();
    timer = setTimeout(() => stop('timeout'), ms);
  };
  const onCallerAbort = () => stop('aborted');

  if (opts.signal?.aborted) stop('aborted');
  else {
    opts.signal?.addEventListener('abort', onCallerAbort);
    arm(opts.firstByteMs);
    if (typeof opts.totalMs === 'number' && opts.totalMs > 0) wall = setTimeout(() => stop('timeout'), opts.totalMs);
  }

  return {
    signal: ctl.signal,
    heard: () => {
      if (!finished && !why) arm(opts.idleMs);
    },
    race: <T>(p: Promise<T>) => Promise.race([p, stopped]),
    why: () => why,
    done: () => {
      finished = true;
      clear();
      clearWall();
      opts.signal?.removeEventListener('abort', onCallerAbort);
    },
  };
}

/** The slice of a `ReadableStreamDefaultReader` the read needs — so a test can hand it a fake one. */
export interface AskStreamReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel?(reason?: unknown): Promise<void>;
}

/** Everything the stream said, before it is turned into an answer. */
export interface AskRead {
  /** The words, exactly as accumulated. */
  text: string;
  remaining: number | null;
  /** The function's `done` line arrived. */
  finished: boolean;
  /** The model's stop reason on that line (`end_turn`, `max_tokens`, `refusal`, …), when it sent one. */
  stop: string | null;
  /**
   * The function's own `error` line — its reason CODE only (`upstream_error`, …). ⛔ An older function's
   * `detail` (Anthropic's own words) is dropped by `readAskEvent` and never stored here (P-D8).
   */
  failure: string | null;
  actions: { name: string; input: unknown }[];
  /** The read itself broke — the connection, the clock, or the sheet closing. Null when it did not. */
  broke: string | null;
  /** The function said it gave the credit back (on its `error` or `done` line). */
  refunded: boolean;
  /** The function's hint on its `error` line — `'timeout'` when its own upstream clock ran out. */
  upstream: string | null;
  /** The last status line ("Checking your lift log…"), if any arrived. */
  status: string | null;
  /** The function took the reply back (`retract`, Sprint 2): its output scanner stopped it. */
  retracted?: boolean;
}

/**
 * Read the function's stream to its end. `onText` gets the ACCUMULATED words each time more arrive; `onStatus`
 * gets each status line (one of `ASK_STATUS_PHRASES`, never anything else).
 *
 * ⚠ NEVER THROWS. A break is recorded in `broke`, and the reader is cancelled so the far end stops too.
 */
export async function readAskStream(
  reader: AskStreamReader,
  onText: (text: string) => void,
  clock?: AskClock,
  /** Sprint 4a: `detail` rides along when the function sent one (caps only) — narrowed by `readAskEvent`. */
  onStatus?: (status: string, detail?: AskStatusDetail) => void,
): Promise<AskRead> {
  const decoder = utf8Decoder();
  const out: AskRead = {
    text: '',
    remaining: null,
    finished: false,
    stop: null,
    failure: null,
    actions: [],
    broke: null,
    refunded: false,
    upstream: null,
    status: null,
  };
  let carry = '';
  try {
    while (!out.finished && out.failure == null) {
      const { done, value } = clock ? await clock.race(reader.read()) : await reader.read();
      if (done) break;
      /* Any bytes at all — a keep-alive comment included — say the function is alive. */
      clock?.heard();
      const parsed = parseSse(decoder.decode(value ?? new Uint8Array(0)), carry);
      carry = parsed.carry;
      for (const ev of parsed.events) {
        const e = readAskEvent(ev.data);
        if (!e) continue;
        if ('t' in e) {
          out.text += e.t;
          onText(out.text);
        } else if ('action' in e) {
          out.actions.push(e.action);
        } else if ('status' in e) {
          out.status = e.status;
          if (e.detail) onStatus?.(e.status, e.detail);
          else onStatus?.(e.status);
        } else if ('retract' in e) {
          // The `done` line follows; reading on keeps its balance and its refund.
          out.retracted = true;
        } else if ('error' in e) {
          out.failure = e.error;
          out.refunded = e.refunded === true;
          out.upstream = e.upstream ?? null;
          if (typeof e.remaining === 'number') out.remaining = e.remaining;
          break;
        } else {
          out.remaining = e.remaining;
          out.stop = e.stop ?? null;
          out.refunded = e.refunded === true;
          out.finished = true;
          break;
        }
      }
    }
  } catch (e) {
    out.broke = String((e as Error)?.message ?? e).slice(0, 200);
    try {
      void reader.cancel?.(out.broke)?.catch(() => undefined);
    } catch {
      // The stream was already gone.
    }
  }
  return out;
}

/** A reply stopped at the length cap — the words stand, but they are not all of it. */
const CUT_STOPS = new Set(['max_tokens', 'model_context_window_exceeded']);

/**
 * What an ask came to, from the stream's side. `src/data/coach-ask-live.ts` widens this into `AskResult`.
 *
 * `refunded` (only ever present as `true`) — the function gave the credit back, so the sheet says "Not charged.".
 */
export type AskSettled =
  /**
   * Holt answered. `complete` is false when the stream broke after some words had already arrived. `cut` is
   * true when it finished at the length cap (the words stand; he says it ran long).
   */
  | {
      kind: 'answer';
      text: string;
      remaining: number | null;
      complete: boolean;
      cut: boolean;
      actions: { name: string; input: unknown }[];
      refunded?: true;
    }
  /** He declined it (the model's `refusal`). Whatever streamed is taken back. Not an outage. */
  | { kind: 'refused'; refunded?: true }
  /**
   * Taken back by the output scanner (Sprint 2, CH-2) — the function's (`retract`) or this app's
   * ({@link withOutputScan}). Whatever streamed goes, and the medical stop card stands in its place.
   */
  | { kind: 'retracted'; refunded?: true }
  /**
   * The app failed. `timedOut` — nothing (or nothing more) came back in time: our clock, or the function's own
   * (`upstream: 'timeout'`). `aborted` — the caller's own signal (the sheet closed), and nobody is left to tell.
   * `detail` is for logs, never the athlete — and never the upstream's words.
   */
  | { kind: 'offline'; detail: string | null; timedOut: boolean; aborted: boolean; refunded?: true };

/** Turn what the stream said into what the sheet shows. `early` is the clock's verdict, when it stopped first. */
export function settleAskRead(read: AskRead, early: AskEarlyStop | null = null): AskSettled {
  const said = read.text.trim();
  const timedOut = early === 'timeout';
  const aborted = early === 'aborted';
  /* Present only when true, so a result the function did not refund looks exactly as it did before Sprint 1. */
  const refunded = read.refunded ? { refunded: true as const } : {};
  /* ⛔ TAKEN BACK FIRST: the function's scanner stopped the reply. Its `done` line says `refusal` (for older apps);
     this app shows the medical stop card instead, and nothing he forwarded survives it. */
  if (read.retracted) return { kind: 'retracted', ...refunded };
  /* ⚠ DECLINED, WITH OR WITHOUT WORDS BEFORE IT. A refusal can land mid-reply; what came before it is not
     an answer to keep, and any action he forwarded before declining goes with it. */
  if (read.finished && read.stop === 'refusal') return { kind: 'refused', ...refunded };
  if (aborted) return { kind: 'offline', detail: 'aborted', timedOut: false, aborted: true };
  if (read.failure != null) {
    return said
      ? { kind: 'answer', text: said, remaining: null, complete: false, cut: false, actions: read.actions, ...refunded }
      : { kind: 'offline', detail: read.failure, timedOut: read.upstream === 'timeout', aborted: false, ...refunded };
  }
  if (read.broke != null) {
    return said
      ? { kind: 'answer', text: said, remaining: null, complete: false, cut: false, actions: [] }
      : { kind: 'offline', detail: timedOut ? 'timeout' : read.broke, timedOut, aborted: false };
  }
  /* A reply that is only an action (a change to confirm) is still an answer — the card is the reply. */
  if (!said && read.actions.length === 0) {
    return { kind: 'offline', detail: read.finished ? 'empty_reply' : 'stream_ended', timedOut: false, aborted: false, ...refunded };
  }
  return {
    kind: 'answer',
    text: said,
    remaining: read.remaining,
    complete: read.finished,
    cut: read.finished && read.stop != null && CUT_STOPS.has(read.stop),
    actions: read.actions,
    ...refunded,
  };
}

/**
 * ⛔ THE SAME OUTPUT SCAN, ON THIS END (Sprint 2, CH-2). An answer whose words — or whose forwarded card — the scanner
 * stops becomes `retracted`, exactly as if the function had sent `retract`. `asked` is the athlete's question (a reply
 * to a symptom that says "that's normal" is about the symptom). Everything that is not an answer passes untouched.
 */
export function withOutputScan(settled: AskSettled, asked: string): AskSettled {
  if (settled.kind !== 'answer') return settled;
  const hit = scanTexts([settled.text, ...settled.actions.flatMap((a) => scanStringsOf(a.input, 40))], asked);
  if (!hit.hit) return settled;
  return settled.refunded ? { kind: 'retracted', refunded: true } : { kind: 'retracted' };
}

/**
 * ══ WHICH ENDINGS ARE REPORTED (PL-4, audit P-G1 / C-G7) ══
 *
 * Every ask that did not end in a whole answer becomes ONE `AiFailure` for `reportAiFailure` — or null when it
 * is not a failure at all (a whole answer, a medical stop, the athlete's own "Not now" on the consent sheet).
 * The athlete's own state (out of credits, the sheet closing) still comes back, as `out_of_credits` /
 * `cancelled`: the reporter leaves those as a breadcrumb and never as an error.
 *
 * ⛔ `reason` is always one of OUR codes — never a platform error message, never the upstream's words.
 */
export type AskReportable =
  | AskSettled
  | { kind: 'out_of_credits' }
  | { kind: 'crisis' | 'urgent' | 'care' | 'medical' | 'no_consent' };

export function askFailureReport(x: {
  result: AskReportable;
  /** What the stream said, when one was read. */
  read: AskRead | null;
  /** The clock's verdict. */
  early: AskEarlyStop | null;
  /** The function's HTTP status; null when the request never got an answer at all. */
  status: number | null;
  latencyMs: number;
}): AiFailure | null {
  const base = { fn: 'coach-ask' as const, status: x.status, latencyMs: x.latencyMs };
  const r = x.result;
  const timedOut = x.early === 'timeout';
  const upstream = x.read?.upstream ?? null;
  const refunded = 'refunded' in r && r.refunded === true;
  switch (r.kind) {
    case 'answer': {
      if (r.complete && !r.cut) return null;
      if (r.cut) return { ...base, kind: 'unreadable', reason: 'truncated', refunded };
      /* Words, then the line broke: the function's own failure line, or our clock, or the connection. */
      const reason = x.read?.failure ?? (timedOut ? 'timeout' : 'stream_dropped');
      return { ...base, kind: kindOf(reason, { upstream, timedOut, status: x.status }), reason, refunded };
    }
    case 'refused':
      return { ...base, kind: 'unreadable', reason: 'refusal', refunded };
    /* The scanner working, like a medical stop — not a failure. The function's ledger counts it (`guarded`). */
    case 'retracted':
      return null;
    case 'out_of_credits':
      return { ...base, kind: 'out_of_credits', reason: 'out_of_credits', refunded: false };
    case 'offline': {
      if (r.aborted) return { ...base, kind: 'cancelled', reason: 'aborted', refunded: false };
      /* Never reached the function: the reason is ours, not the platform's message (which can carry a URL). */
      const neverSent = x.status == null && x.read?.failure == null && !timedOut;
      const reason = timedOut ? 'timeout' : neverSent ? (r.detail === 'no_session' ? 'no_session' : 'fetch_failed') : (r.detail ?? 'unknown');
      if (reason === 'empty_question') return null;
      return {
        ...base,
        kind: neverSent ? 'offline' : kindOf(reason, { upstream, timedOut: timedOut || r.timedOut, status: x.status }),
        reason: reason.slice(0, 40),
        refunded,
      };
    }
    default:
      return null;
  }
}

/**
 * `classifyAiFailure`, plus coach-ask's own codes it does not know: `upstream_dropped` (the line to Anthropic broke
 * partway) and `empty_reply` (a clean ending with nothing in it — the function refunds it as `bad_output`).
 */
function kindOf(reason: string, o: { upstream: string | null; timedOut: boolean; status: number | null }) {
  if (!o.timedOut && o.upstream !== 'timeout') {
    if (reason === 'upstream_dropped') return 'upstream' as const;
    if (reason === 'empty_reply') return 'unreadable' as const;
  }
  return classifyAiFailure({ reason, upstream: o.upstream, timedOut: o.timedOut, status: o.status });
}
