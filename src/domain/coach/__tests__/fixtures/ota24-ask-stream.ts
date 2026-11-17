// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// ⛔ FROZEN FIXTURE — DO NOT EDIT. A verbatim copy of src/domain/coach/ask-stream.ts at b87a2511 (OTA #24),
// for ask-wire-old-client.test.mjs. Changed: these comment lines, and the one import below now points at the
// frozen wire (`./ota24-ask-wire.ts`) instead of the live one.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * HOLT'S ANSWER OFF THE WIRE, WITH A CLOCK ON IT (AI audit 2026-11-16, C-D2 · C-D4).
 *
 * `askHolt` (`src/data/coach-ask-live.ts`) used to read the coach-ask stream with no signal and no clock.
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
 * ⚠ Domain code: relative imports only (`@/` would break `node --test`).
 */

import { parseSse, readAskEvent, utf8Decoder } from './ota24-ask-wire.ts';

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

/** Start the clock for one ask. */
export function askClock(opts: { firstByteMs: number; idleMs: number; signal?: AbortSignal }): AskClock {
  const ctl = new AbortController();
  let why: AskEarlyStop | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
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
  const stop = (reason: AskEarlyStop) => {
    if (finished || why) return;
    why = reason;
    clear();
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
  /** The function's own `error` line. */
  failure: string | null;
  actions: { name: string; input: unknown }[];
  /** The read itself broke — the connection, the clock, or the sheet closing. Null when it did not. */
  broke: string | null;
}

/**
 * Read the function's stream to its end. `onText` gets the ACCUMULATED words each time more arrive.
 *
 * ⚠ NEVER THROWS. A break is recorded in `broke`, and the reader is cancelled so the far end stops too.
 */
export async function readAskStream(reader: AskStreamReader, onText: (text: string) => void, clock?: AskClock): Promise<AskRead> {
  const decoder = utf8Decoder();
  const out: AskRead = { text: '', remaining: null, finished: false, stop: null, failure: null, actions: [], broke: null };
  let carry = '';
  try {
    while (!out.finished && out.failure == null) {
      const { done, value } = clock ? await clock.race(reader.read()) : await reader.read();
      if (done) break;
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
        } else if ('error' in e) {
          out.failure = e.detail ? `${e.error}: ${e.detail}` : e.error;
          break;
        } else {
          out.remaining = e.remaining;
          out.stop = e.stop ?? null;
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

/** What an ask came to, from the stream's side. `src/data/coach-ask-live.ts` widens this into `AskResult`. */
export type AskSettled =
  /**
   * Holt answered. `complete` is false when the stream broke after some words had already arrived. `cut` is
   * true when it finished at the length cap (the words stand; he says it ran long).
   */
  | { kind: 'answer'; text: string; remaining: number | null; complete: boolean; cut: boolean; actions: { name: string; input: unknown }[] }
  /** He declined it (the model's `refusal`). Whatever streamed is taken back. Not an outage. */
  | { kind: 'refused' }
  /**
   * The app failed. `timedOut` — nothing (or nothing more) came back in time. `aborted` — the caller's own
   * signal (the sheet closed), and nobody is left to tell. `detail` is for logs, never the athlete.
   */
  | { kind: 'offline'; detail: string | null; timedOut: boolean; aborted: boolean };

/** Turn what the stream said into what the sheet shows. `early` is the clock's verdict, when it stopped first. */
export function settleAskRead(read: AskRead, early: AskEarlyStop | null = null): AskSettled {
  const said = read.text.trim();
  const timedOut = early === 'timeout';
  const aborted = early === 'aborted';
  /* ⚠ DECLINED, WITH OR WITHOUT WORDS BEFORE IT. A refusal can land mid-reply; what came before it is not
     an answer to keep, and any action he forwarded before declining goes with it. */
  if (read.finished && read.stop === 'refusal') return { kind: 'refused' };
  if (aborted) return { kind: 'offline', detail: 'aborted', timedOut: false, aborted: true };
  if (read.failure != null) {
    return said
      ? { kind: 'answer', text: said, remaining: null, complete: false, cut: false, actions: read.actions }
      : { kind: 'offline', detail: read.failure, timedOut: false, aborted: false };
  }
  if (read.broke != null) {
    return said
      ? { kind: 'answer', text: said, remaining: null, complete: false, cut: false, actions: [] }
      : { kind: 'offline', detail: timedOut ? 'timeout' : read.broke, timedOut, aborted: false };
  }
  /* A reply that is only an action (a change to confirm) is still an answer — the card is the reply. */
  if (!said && read.actions.length === 0) {
    return { kind: 'offline', detail: read.finished ? 'empty_reply' : 'stream_ended', timedOut: false, aborted: false };
  }
  return {
    kind: 'answer',
    text: said,
    remaining: read.remaining,
    complete: read.finished,
    cut: read.finished && read.stop != null && CUT_STOPS.has(read.stop),
    actions: read.actions,
  };
}
