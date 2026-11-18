/**
 * ══ CHAT BASICS: STOP · REGENERATE · EDIT AND RESEND (AI Road to 10 Sprint 3a, CH-6) ══
 *
 * The thread rules behind the controls on Holt's replies, kept pure so they are tested without the sheet.
 *
 *   · Stop ends the ask through the same abort the sheet's close uses. coach-ask settles it `cancelled` and does
 *     NOT refund it — the model ran for them (Sprint 1 §1: "never on the athlete's own cancel"). A Stop before
 *     the call left the phone costs nothing (no reservation was made).
 *   · What a Stop leaves: the words so far, unless they say nothing (under CUT_OFF_KEEP_CHARS, like a dropped
 *     line) — and ⛔ never words the output scan would have taken back. The scan runs on a FINISHED reply; a
 *     stopped one never finishes, so it is scanned here.
 *   · Regenerate and Edit act only on the LAST AI reply, so the thread never forks: nothing the athlete said
 *     after it, and no card (a change to confirm, a stop, an error) standing under it.
 */
import { withOutputScan } from './ask-stream.ts';
import { ASK_ACTION_NAMES } from './ask-tools.ts';
import { ASK_STATUS_PHRASES } from './ask-wire.ts';
import { CUT_OFF_KEEP_CHARS, type Turn } from './chat-core.ts';

/** What a Stop leaves of the reply that was arriving: its words, nothing, or the medical stop in its place. */
export function afterStop(shown: string, asked: string): 'keep' | 'drop' | 'retract' {
  const said = shown.trim();
  if (said.length < CUT_OFF_KEEP_CHARS) return 'drop';
  const scanned = withOutputScan({ kind: 'answer', text: said, remaining: null, complete: false, cut: false, actions: [] }, asked);
  return scanned.kind === 'retracted' ? 'retract' : 'keep';
}

/**
 * The `sid` of the reply Regenerate and Edit may act on, or null. Holt's own scripted lines after it (the
 * question on the table, "that ran long") and chips may follow it — those are re-said by the new answer.
 */
export function lastReplySid(thread: readonly Turn[]): number | null {
  for (let i = thread.length - 1; i >= 0; i -= 1) {
    const t = thread[i];
    if (t.kind === 'holt' && t.sid != null) return t.streaming ? null : t.sid;
    if (t.kind === 'chips' || t.kind === 'holt') continue;
    return null;
  }
  return null;
}

const replyIndex = (thread: readonly Turn[], sid: number) => thread.findIndex((t) => t.kind === 'holt' && t.sid === sid);

/** Regenerate: the thread without that reply and everything after it. Null when the reply is gone. */
export function withoutReply(thread: readonly Turn[], sid: number): Turn[] | null {
  const i = replyIndex(thread, sid);
  return i < 0 ? null : thread.slice(0, i);
}

/**
 * Edit and resend: the athlete's question that reply answered, and the thread from before it. Null when there is
 * no typed question to edit (the reply came from a chip, or the question carried a picture).
 */
export function questionOf(thread: readonly Turn[], sid: number): { text: string; before: Turn[] } | null {
  const i = replyIndex(thread, sid);
  for (let j = i - 1; j >= 0; j -= 1) {
    const t = thread[j];
    if (t.kind === 'me') return t.picture || t.stopped ? null : { text: t.text, before: thread.slice(0, j) };
    if (t.kind !== 'holt' && t.kind !== 'chips') return null;
  }
  return null;
}

/*
 * ══ CHAT TELEMETRY (CH-6) ══ — three events per ask, through `track()` (consent-gated, allowlisted props):
 * `holt_ask_sent` · `holt_ask_first_word` (ms) · `holt_ask_ended` (result, ms, lookups as `count`).
 * ⛔ Never the athlete's words or Holt's: only the enum below, a duration and a count.
 */
export type AskEndResult =
  | 'answer'
  | 'cut'
  | 'dropped'
  | 'refused'
  | 'retracted'
  | 'crisis'
  | 'urgent'
  | 'care'
  | 'medical'
  | 'out_of_credits'
  | 'no_consent'
  | 'timeout'
  | 'offline'
  | 'stopped'
  | 'closed';

/** How an ask ended, as one enum. `stopped` — the athlete tapped Stop (vs the sheet closing). */
export function askEndResult(
  r: { kind: string; complete?: boolean; cut?: boolean; timedOut?: boolean; aborted?: boolean },
  stopped: boolean,
): AskEndResult {
  switch (r.kind) {
    case 'answer':
      return r.complete === false ? 'dropped' : r.cut ? 'cut' : 'answer';
    case 'offline':
      if (r.aborted) return stopped ? 'stopped' : 'closed';
      return r.timedOut ? 'timeout' : 'offline';
    case 'refused':
    case 'retracted':
    case 'crisis':
    case 'urgent':
    case 'care':
    case 'medical':
    case 'out_of_credits':
    case 'no_consent':
      return r.kind as AskEndResult;
    default:
      return 'offline';
  }
}

/** A whole answer reached the athlete (cut at the length cap still counts — the words stand). */
export const askEndedWell = (result: AskEndResult): boolean => result === 'answer' || result === 'cut';

/*
 * ══ CHAT TELEMETRY: WHICH TOOLS (AI Road to 10 Sprint 3b, CH-6 / C-G7) ══
 *
 * `holt_ask_ended` also says which tools the ask used, as `tools`: tool NAMES only, from two fixed tables — the
 * status lines coach-ask sends during a tool round (`ASK_STATUS_PHRASES`, one line per read tool and for web search)
 * and the actions he forwards (`ASK_ACTION_NAMES`). ⛔ Never a tool's input, never a word he or the athlete wrote: a
 * line or a name that is not in those tables is dropped. The server is not changed — every phone already gets both.
 *
 * One string, because an analytics prop is a string, number or boolean (`sanitizeProps`): the names in the order
 * first used, each once, joined by ',' (no spaces — a value with a space is read as prose and dropped), whole names
 * only within `TOOLS_MAX_CHARS` (the sanitiser's 64). `'none'` when he used none, so "none" and "an older app"
 * (no key) are told apart.
 */
export const TOOLS_MAX_CHARS = 64;

const TOOL_BY_STATUS: ReadonlyMap<string, string> = new Map(Object.entries(ASK_STATUS_PHRASES).map(([name, line]) => [line, name]));

export function askToolsUsed(statusLines: readonly string[], actionNames: readonly string[]): string {
  const names: string[] = [];
  const add = (n: string | undefined) => {
    if (n && !names.includes(n)) names.push(n);
  };
  for (const line of statusLines) add(TOOL_BY_STATUS.get(line));
  for (const n of actionNames) add(ASK_ACTION_NAMES.includes(n) ? n : undefined);
  let out = '';
  for (const n of names) {
    const next = out ? `${out},${n}` : n;
    if (next.length > TOOLS_MAX_CHARS) break;
    out = next;
  }
  return out || 'none';
}

/*
 * ══ WEB SEARCH SAYS WHAT IT COSTS BEFORE THE TAP (AI Road to 10 Sprint 3b, CH-6 / C-G6) ══
 *
 * "Find one online" asks again WITH web search, metered as `web` — 2 credits since 0272, not the 1 a message costs.
 * The chip says so before it is tapped: "Find one online · N credits". ⛔ The number is the SERVER's, read through
 * `coach_ai_quote('web')` (0221, live; `action_credits ->> p_action`) — never one typed into the app. A read that
 * fails, an older server, an athlete without Premium AI (the quote answers cost 0) → no number, the chip reads as
 * it always has.
 */
export const WEB_SEARCH_ACTION = 'web';

/** The quote's cost, or null when it said nothing usable (failed, not entitled, unpriced). */
export function webSearchCostFrom(row: unknown): number | null {
  const r = Array.isArray(row) ? row[0] : row;
  const cost = r && typeof r === 'object' ? (r as { cost?: unknown }).cost : null;
  return typeof cost === 'number' && Number.isInteger(cost) && cost > 0 && cost < 100 ? cost : null;
}

/** "Find one online · N credits" — the chip as shown. The chip's own label (what the transcript says) is unchanged. */
export function withCreditCost(label: string, cost: number | null | undefined): string {
  if (cost == null || cost <= 0) return label;
  return `${label} · ${cost} ${cost === 1 ? 'credit' : 'credits'}`;
}
