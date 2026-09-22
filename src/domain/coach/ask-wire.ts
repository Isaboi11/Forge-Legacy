/**
 * COACH AI — THE `ask` WIRE
 *
 * The one module both ends of Holt's conversational `ask` job share: the Edge Function
 * (`supabase/functions/coach-ask/index.ts`, which imports this file and has it inlined into its dashboard
 * paste copy) and the app (`src/data/coach-ask-live.ts`). Pure and import-free on purpose — Deno, Metro and
 * `node --test` all load it as-is, so the two ends can never disagree on the format.
 *
 * ══ WHAT LIVES HERE ══
 *
 *   · `parseSse` — Server-Sent Events, chunk by chunk. The function reads Anthropic's stream with it and the
 *     app reads the function's stream with it.
 *   · `trimHistory` — the CA-D1 rule that an `ask` job carries at most the last 8 turns of THIS
 *     conversation. Both ends apply it: the app to send less, the function because a client is not a
 *     boundary.
 *   · `askUserTurn` — the final user turn. ⚠ The app's context (program, coaching records, rationale) goes
 *     HERE and never in the system block: the system block is cached, and a byte that varies per request
 *     there multiplies the cost of the product by ~10 (CA-D5).
 *   · `utf8Decoder` — streamed bytes to text without splitting a multi-byte character across chunks.
 */

/** CA-D1: the last N turns of this `ask` conversation, and nothing from any other job. */
export const ASK_HISTORY_MAX = 8;

/** CA-D5: the `ask` output cap. A ceiling, not a target — Holt's voice is short anyway. */
export const ASK_OUTPUT_CAP = 600;

/** One character cap per turn, so a pasted essay in the history cannot become the bill. */
export const ASK_TURN_CHARS = 1200;

/** The question itself. The composer takes 1,000 characters; this is the server's ceiling. */
export const ASK_QUESTION_CHARS = 2000;

export type AskTurn = { role: 'athlete' | 'holt'; text: string };

/** What the app attaches to a question. Small by construction — see `ask-context.ts`. */
export interface AskContext {
  /** One line: program name, week N of M, today's sessions. */
  program?: string | null;
  /** Up to three published coaching records for exercises the question names. */
  coaching?: { name: string; text: string }[];
  /** Why the plan is shaped the way it is (`rulebook/rationale.ts`), for "why is X in my plan" questions. */
  rationale?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The last `max` well-formed turns, each capped in length. Anything that is not a turn is dropped rather
 * than trusted — this runs on the server against whatever a client sent.
 */
export function trimHistory(history: unknown, max: number = ASK_HISTORY_MAX): AskTurn[] {
  if (!Array.isArray(history)) return [];
  const clean: AskTurn[] = [];
  for (const t of history) {
    if (!t || typeof t !== 'object') continue;
    const role = (t as { role?: unknown }).role;
    const text = (t as { text?: unknown }).text;
    if ((role !== 'athlete' && role !== 'holt') || typeof text !== 'string') continue;
    const trimmed = text.trim();
    if (!trimmed) continue;
    clean.push({ role, text: trimmed.slice(0, ASK_TURN_CHARS) });
  }
  return clean.slice(-Math.max(0, max));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The user turn
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const str = (v: unknown, cap: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, cap) : null;

/**
 * The context, narrowed to what the function accepts. A client can send anything; this keeps three
 * coaching records at most and caps every string, so the context stays a few hundred tokens.
 */
export function cleanContext(ctx: unknown): AskContext {
  if (!ctx || typeof ctx !== 'object') return {};
  const c = ctx as Record<string, unknown>;
  const coaching = Array.isArray(c.coaching)
    ? c.coaching
        .map((r) => {
          const name = str((r as { name?: unknown } | null)?.name, 80);
          const text = str((r as { text?: unknown } | null)?.text, 700);
          return name && text ? { name, text } : null;
        })
        .filter((r): r is { name: string; text: string } => r !== null)
        .slice(0, 3)
    : [];
  return {
    program: str(c.program, 300),
    coaching,
    rationale: str(c.rationale, 700),
  };
}

/**
 * The final user turn: the app's context, labelled as the app's and not the athlete's, then the question.
 *
 * ⚠ THIS IS THE ONLY PLACE PER-REQUEST CONTEXT ENTERS THE PROMPT. Never the system block (cache).
 */
export function askUserTurn(question: string, context: AskContext, todayISO: string): string {
  const lines: string[] = [`Today is ${todayISO}.`];
  if (context.program) lines.push(`The athlete's program: ${context.program}`);
  for (const r of context.coaching ?? []) lines.push(`Coaching record — ${r.name}: ${r.text}`);
  if (context.rationale) lines.push(`Why the plan is built this way: ${context.rationale}`);
  const header =
    lines.length > 1
      ? `From the app (reference material, not the athlete's words — use it when it is relevant):\n${lines.join('\n')}`
      : lines[0];
  return `${header}\n\nThe athlete asks: "${question}"`;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Server-Sent Events
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface SseEvent {
  /** The `event:` field, or null when the block had none. */
  event: string | null;
  /** Every `data:` line of the block, joined with newlines. */
  data: string;
}

/**
 * Parse one chunk of an SSE stream. `carry` is the unfinished tail from the previous call ('' to start);
 * the returned `carry` goes into the next one. Chunks split anywhere — mid-line, mid-`\r\n`, mid-JSON —
 * and a block is only emitted once its blank line has arrived.
 */
export function parseSse(chunk: string, carry: string): { events: SseEvent[]; carry: string } {
  let buf = carry + chunk;
  // A lone trailing CR may be the first half of a CRLF split across chunks — hold it back.
  let held = '';
  if (buf.endsWith('\r')) {
    held = '\r';
    buf = buf.slice(0, -1);
  }
  buf = buf.replace(/\r\n?/g, '\n');

  const blocks = buf.split('\n\n');
  const rest = blocks.pop() ?? '';
  const events: SseEvent[] = [];
  for (const block of blocks) {
    let event: string | null = null;
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (event !== null || data.length) events.push({ event, data: data.join('\n') });
  }
  return { events, carry: rest + held };
}

/** One line of the function's own stream to the app. */
export const sseLine = (payload: unknown): string => `data: ${JSON.stringify(payload)}\n\n`;

/** What the function sends the app, one per `data:` line. */
export type AskStreamEvent =
  | { t: string }
  | {
      done: true;
      usage: { model: string; input: number; cacheRead: number; cacheWrite: number; output: number };
      remaining: number | null;
      stop?: string | null;
    }
  | { error: string; detail?: string | null };

/** A `data:` payload from the function, narrowed; null for anything unrecognised. */
export function readAskEvent(data: string): AskStreamEvent | null {
  let v: unknown;
  try {
    v = JSON.parse(data);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.t === 'string') return { t: o.t };
  if (typeof o.error === 'string') return { error: o.error, detail: typeof o.detail === 'string' ? o.detail : null };
  if (o.done === true) {
    const u = (o.usage ?? {}) as Record<string, unknown>;
    const n = (x: unknown) => (typeof x === 'number' ? x : 0);
    return {
      done: true,
      usage: {
        model: typeof u.model === 'string' ? u.model : '',
        input: n(u.input),
        cacheRead: n(u.cacheRead),
        cacheWrite: n(u.cacheWrite),
        output: n(u.output),
      },
      remaining: typeof o.remaining === 'number' ? o.remaining : null,
      stop: typeof o.stop === 'string' ? o.stop : null,
    };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Bytes → text
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A streaming UTF-8 decoder. Uses the platform `TextDecoder` when there is one; otherwise decodes by hand,
 * holding an incomplete trailing sequence for the next chunk so "—" or an emoji split across two network
 * chunks does not come out as garbage.
 */
export function utf8Decoder(): { decode(bytes: Uint8Array): string } {
  const TD = (globalThis as { TextDecoder?: new (label?: string) => { decode(b?: Uint8Array, o?: { stream?: boolean }): string } }).TextDecoder;
  if (typeof TD === 'function') {
    const td = new TD('utf-8');
    return { decode: (bytes) => td.decode(bytes, { stream: true }) };
  }
  let pending: number[] = [];
  return {
    decode(bytes) {
      const all = pending.length ? [...pending, ...bytes] : Array.from(bytes);
      pending = [];
      let out = '';
      let i = 0;
      while (i < all.length) {
        const b = all[i];
        const need = b < 0x80 ? 1 : b >= 0xf0 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 ? 2 : 1;
        if (i + need > all.length) {
          pending = all.slice(i);
          break;
        }
        let cp: number;
        if (need === 1) cp = b < 0x80 ? b : 0xfffd;
        else if (need === 2) cp = ((b & 0x1f) << 6) | (all[i + 1] & 0x3f);
        else if (need === 3) cp = ((b & 0x0f) << 12) | ((all[i + 1] & 0x3f) << 6) | (all[i + 2] & 0x3f);
        else cp = ((b & 0x07) << 18) | ((all[i + 1] & 0x3f) << 12) | ((all[i + 2] & 0x3f) << 6) | (all[i + 3] & 0x3f);
        out += String.fromCodePoint(cp);
        i += need;
      }
      return out;
    },
  };
}
