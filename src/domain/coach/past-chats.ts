/**
 * ══ PAST CHATS — what a stored chat IS (AI Road to 10 Sprint 4b §1.5, CH-4, migration 0279) ══
 *
 * A conversation with Holt is kept as a row in `holt_chats`: the athlete's lines, Holt's lines and the app's
 * short bracketed notes of what it did (as `summaryHistory` writes them). This module is every rule about that
 * row that does not need a network: what is stored, the title, the search words, the size limits, the read-back
 * filter, and how a stored chat becomes the thread again for "Continue this chat".
 *
 * ⛔ A STOPPED LINE NEVER REACHES THE ROW (PO medical rule 09-22, QA R2-F1). Three locks, the same as every
 *   history the app builds:
 *     1. A `me` turn the app marked `stopped`, the stop card, and everything Holt or the app said in answer
 *        (up to the athlete's next line) are left out here.
 *     2. Everything left runs through `withoutStoppedTurns` — the code guard the question goes through — with
 *        the app's notes counted in Holt's column, so a note can never break the "answer to a stopped line" run.
 *     3. On the way back OUT (`readBack`) the same guard runs again with TODAY's rules, so a chat stored before a
 *        stop was widened is read as if it had been stored today (C-I5).
 *
 * Pure and import-clean: relative `.ts` imports only, so `node --test` runs it (`@/` would not resolve).
 */
import type { Turn } from './chat-core.ts';
import type { StoredTurn } from './holt-memory.ts';
import { withoutPartialReplies } from './chat-core.ts';
import { stopsForMedical, withoutStoppedTurns } from './medical-routing.ts';

/** `holt_chats_turns_size` (0279): at most this many turns in one stored chat. */
export const PAST_CHAT_MAX_TURNS = 200;
/** `holt_chats_turns_size` (0279): at most this many bytes of `turns::text`. */
export const PAST_CHAT_MAX_BYTES = 96 * 1024;
/**
 * What the app aims under. `jsonb::text` prints `{"role": "holt", "text": "…"}` with a space after every `:` and
 * `,`, which `JSON.stringify` does not — so the phone measures its own JSON plus a per-turn allowance and stays a
 * few KB clear of the database's ceiling rather than finding it with a failed save.
 */
const BYTES_TARGET = PAST_CHAT_MAX_BYTES - 4 * 1024;
const BYTES_PER_TURN_SLACK = 8;
/** One line longer than this is cut — a pasted program, a very long answer. The chat stays readable. */
export const PAST_CHAT_LINE_CHARS = 6000;
/** §1.5: the title is the first athlete line, at most this long, cut at a word. */
export const PAST_CHAT_TITLE_CHARS = 60;
/** The list's second line when there is no summary yet: Holt's first answer, this long at most. */
export const PAST_CHAT_PREVIEW_CHARS = 160;
/** §1.5: the list pages 30 at a time, newest first. */
export const PAST_CHATS_PAGE = 30;
/** 0279's trim trigger: the newest this many chats per athlete. */
export const PAST_CHATS_KEPT = 100;
/** `holt_chats.recap` (0279) and `holt_chats.summary` (varchar 500). */
export const PAST_CHAT_RECAP_CHARS = 800;
export const PAST_CHAT_SUMMARY_CHARS = 500;
/** `search_text` is capped well under the column's check — the words, not the chat twice over. */
export const PAST_CHAT_SEARCH_CHARS = 20000;
/** A query of more words than this is cut — each word is one `ilike`. */
export const PAST_CHAT_SEARCH_WORDS = 5;
/** Shown when a chat has no athlete line that survived the guard (it should not be stored at all then). */
export const UNTITLED_CHAT = 'Chat with Holt';

const ROLES: ReadonlySet<StoredTurn['role']> = new Set(['athlete', 'holt', 'note']);

/** Collapse whitespace; a stored line is one line of text however it was typed. */
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** At most `max` characters, cut at the last word that fits, with an ellipsis when anything was cut. */
export function cutAtWord(text: string, max: number): string {
  const s = squash(text);
  if (s.length <= max) return s;
  const room = s.slice(0, max - 1);
  const space = room.lastIndexOf(' ');
  const head = (space >= Math.floor(max / 3) ? room.slice(0, space) : room).replace(/[\s,;:.\-–—]+$/, '');
  return `${head}…`;
}

/*
 * ⚠ THE NOTE TEXTS ARE `summaryHistory`'s, CHARACTER FOR CHARACTER (chat-history.ts). The summariser was taught
 * what those brackets mean (`SUMMARY_SYSTEM`), and a stored chat continued later is summarised from these notes —
 * so a different wording here would be a second dialect for the same model. `past-chats.test.mjs` pins the parity.
 */
function noteFor(x: Turn): string | null {
  switch (x.kind) {
    case 'error':
      return `[The app: that did not work — ${x.text.trim()} Nothing was changed.]`;
    case 'saved':
      return `[The app: ${x.text.trim()}]`;
    case 'program':
    case 'day':
    case 'pick':
      return `[The app showed "${x.card.title}" as a card. Not started or saved unless a later note says so.]`;
    case 'refusal':
      return `[The app: Holt could not do that — ${x.card.title}.]`;
    default:
      return null;
  }
}

/**
 * The medical guard over a stored chat. Notes are counted in Holt's column for the guard (they ARE the app's
 * answer), so `[athlete stopped, holt answer, note, holt more]` drops all three after the stopped line — with
 * `note` as its own role, `withoutStoppedTurns` would have reset at the note and kept "holt more".
 */
export function guardStored(turns: readonly StoredTurn[], stops: (text: string) => boolean = stopsForMedical): StoredTurn[] {
  const wrapped = turns.map((t) => ({ role: t.role === 'note' ? 'holt' : t.role, text: t.text, t }));
  return withoutStoppedTurns(wrapped, stops).map((w) => w.t);
}

/**
 * §1.5 — the chat as it is STORED: athlete + Holt lines and the app's notes, nothing stopped, nothing Holt said
 * before the athlete's first line (the greeting and the introduction are not the conversation), no reply still
 * arriving, every line one line and at most `PAST_CHAT_LINE_CHARS`.
 */
export function storedTurns(thread: readonly Turn[]): StoredTurn[] {
  const out: StoredTurn[] = [];
  /* Lock 1: from a stopped line (or a stop card) to the athlete's next line, nothing is kept. */
  let silenced = false;
  let started = false;
  for (const x of withoutPartialReplies(thread)) {
    if (x.kind === 'me') {
      if (x.stopped) {
        silenced = true;
        continue;
      }
      const text = squash(x.text);
      if (!text) continue;
      silenced = false;
      started = true;
      out.push({ role: 'athlete', text: text.slice(0, PAST_CHAT_LINE_CHARS) });
      continue;
    }
    if (x.kind === 'stop') {
      silenced = true;
      continue;
    }
    if (silenced || !started) continue;
    if (x.kind === 'holt') {
      const text = squash(x.text);
      if (text) out.push({ role: 'holt', text: text.slice(0, PAST_CHAT_LINE_CHARS) });
      continue;
    }
    const note = noteFor(x);
    if (note) out.push({ role: 'note', text: squash(note).slice(0, PAST_CHAT_LINE_CHARS) });
  }
  /* Lock 2: the code guard, over what is left. */
  return guardStored(out);
}

/** §1.5 — the first athlete line, ≤ 60 characters, cut at a word. No model call. */
export function chatTitle(turns: readonly StoredTurn[]): string {
  const first = turns.find((t) => t.role === 'athlete');
  return first ? cutAtWord(first.text, PAST_CHAT_TITLE_CHARS) || UNTITLED_CHAT : UNTITLED_CHAT;
}

/** Holt's first answer — the list's second line until a summary exists. */
export function chatPreview(turns: readonly StoredTurn[]): string | null {
  const first = turns.find((t) => t.role === 'holt');
  return first ? cutAtWord(first.text, PAST_CHAT_PREVIEW_CHARS) : null;
}

/** Lower-case words: letters and digits of any script, everything else a space. */
const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

/**
 * §1.5 — `search_text`: the lower-case words of every stored line (and the title), each once, in the order they
 * first appear. Searched word by word with `ilike`, so order and repeats add nothing but bytes.
 */
export function searchText(turns: readonly StoredTurn[]): string {
  const seen = new Set<string>();
  const kept: string[] = [];
  let length = 0;
  for (const t of turns) {
    for (const w of words(t.text)) {
      if (seen.has(w)) continue;
      if (length + w.length + 1 > PAST_CHAT_SEARCH_CHARS) return kept.join(' ');
      seen.add(w);
      kept.push(w);
      length += w.length + 1;
    }
  }
  return kept.join(' ');
}

/**
 * What the athlete typed into the search box, as the words to match — the same normalising as `searchText`, so
 * "Push-day!" finds a chat that said "push day". Each word is safe inside an `ilike` pattern (no `%`, `_` or `\`
 * can survive the normalising, and `ilikePattern` escapes them anyway).
 */
export function searchTerms(query: string): string[] {
  return [...new Set(words(query))].slice(0, PAST_CHAT_SEARCH_WORDS);
}

export const ilikePattern = (term: string): string => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** UTF-8 length without TextEncoder (not on every runtime this ships to). */
export function utf8Length(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

const turnsBytes = (turns: readonly StoredTurn[]): number => utf8Length(JSON.stringify(turns)) + turns.length * BYTES_PER_TURN_SLACK;

/**
 * Inside `holt_chats_turns_size`: at most 200 turns and under the byte target, the OLDEST turns going first — the
 * recent ones are the conversation (the device thread's own rule, §15.6). The title is taken before this runs.
 */
export function fitTurns(turns: readonly StoredTurn[]): StoredTurn[] {
  let kept = turns.slice(-PAST_CHAT_MAX_TURNS);
  let bytes = turnsBytes(kept);
  while (kept.length > 0 && bytes > BYTES_TARGET) {
    bytes -= utf8Length(JSON.stringify(kept[0])) + 1 + BYTES_PER_TURN_SLACK;
    kept = kept.slice(1);
  }
  /* Notes and Holt lines left at the head with their athlete line trimmed away say nothing on their own. */
  const firstAthlete = kept.findIndex((t) => t.role === 'athlete');
  return firstAthlete <= 0 ? kept : kept.slice(firstAthlete);
}

/**
 * Lock 3 — a stored chat as it may be SHOWN or CONTINUED: only well-formed lines, through today's guard.
 * Anything that is not an array of `{role, text}` reads as an empty chat, never a crash.
 */
export function readBack(raw: unknown, stops: (text: string) => boolean = stopsForMedical): StoredTurn[] {
  if (!Array.isArray(raw)) return [];
  const clean: StoredTurn[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const { role, text } = r as { role?: unknown; text?: unknown };
    if (typeof role !== 'string' || !ROLES.has(role as StoredTurn['role'])) continue;
    if (typeof text !== 'string' || !text.trim()) continue;
    clean.push({ role: role as StoredTurn['role'], text: text.slice(0, PAST_CHAT_LINE_CHARS) });
  }
  return guardStored(clean, stops);
}

/** A summary or recap read back or written: every sentence the guard catches is dropped (the summary's own rule). */
export function guardProse(text: string | null | undefined, max: number, stops: (text: string) => boolean = stopsForMedical): string | null {
  if (typeof text !== 'string') return null;
  const sentences = squash(text).match(/[^.!?]+[.!?]*/g) ?? [];
  const kept = sentences.map((s) => s.trim()).filter((s) => s && !stops(s));
  const joined = kept.join(' ').slice(0, max).trim();
  return joined || null;
}

/**
 * A note as the transcript shows it: the brackets off, and "The app: " off where it leads — the athlete does not
 * need to be told which voice is the app, the styling says so.
 */
export function noteForDisplay(text: string): string {
  const inner = text.replace(/^\[/, '').replace(/\]$/, '').trim();
  return inner.replace(/^The app:\s*/, '').replace(/^The app showed\b/, 'Showed').replace(/^./, (c) => c.toUpperCase());
}

/* ── continue this chat ──────────────────────────────────────────────────────────────────────────────── */

/**
 * §1.5 — the stored turns as the thread "Continue this chat" opens on: the athlete's lines and Holt's, read back
 * through today's guard.
 *
 * ⚠ THE APP'S NOTES DO NOT BECOME TURNS. The cards they describe are gone (a card is drawn from data a stored chat
 * does not keep), and the only turn that could carry their words, `saved`, draws a check mark — on "that did not
 * work" it would say the opposite of the note. They are kept on the ROW instead: `mergeContinued` puts the stored
 * chat back in front of whatever is said after continuing, notes and all, so the row and the summariser still see
 * what the app did and did not do.
 */
export function threadFrom(stored: readonly StoredTurn[]): Turn[] {
  const out: Turn[] = [];
  for (const t of guardStored(stored)) {
    if (t.role === 'athlete') out.push({ kind: 'me', text: t.text });
    else if (t.role === 'holt') out.push({ kind: 'holt', text: t.text });
  }
  return out;
}

const same = (a: StoredTurn, b: StoredTurn): boolean => a.role === b.role && a.text === b.text;

/**
 * The row of a CONTINUED chat: the chat as it was stored when continued (`head`, notes included) followed by what
 * was said since. `current` is `storedTurns` of the thread now, which begins with `threadFrom(head)`'s lines —
 * possibly with its oldest lines trimmed by the device (100 turns, §15.6), possibly with one of them stopped since.
 *
 * The new part is found by aligning: the longest run at the start of `current` that matches the END of the head's
 * spoken lines is what was restored; everything after it is new. When nothing aligns (the thread was edited out
 * of recognition), what follows the last line both share is new — and when they share nothing, all of `current`
 * is. Either way the head is never lost and nothing is written twice. Lock 2 runs over the result.
 */
export function mergeContinued(head: readonly StoredTurn[], current: readonly StoredTurn[]): StoredTurn[] {
  const spoken = guardStored(head).filter((t) => t.role !== 'note');
  const L = spoken.length;
  let fresh: readonly StoredTurn[] | null = null;
  for (let o = 0; o < L && fresh == null; o++) {
    const run = L - o;
    if (run > current.length) continue;
    let ok = true;
    for (let i = 0; i < run && ok; i++) ok = same(current[i], spoken[o + i]);
    if (ok) fresh = current.slice(run);
  }
  if (fresh == null) {
    let last = -1;
    for (let j = current.length - 1; j >= 0 && last < 0; j--) if (spoken.some((s) => same(s, current[j]))) last = j;
    fresh = current.slice(last + 1);
  }
  return guardStored([...head, ...fresh]);
}

/* ── the row ─────────────────────────────────────────────────────────────────────────────────────────── */

/** What the phone writes to `holt_chats` (0279). `athlete_id` is the column default (`auth.uid()`), never sent. */
export interface PastChatWrite {
  id: string;
  title: string;
  turns: StoredTurn[];
  preview: string | null;
  recap: string | null;
  recap_through: number | null;
  search_text: string;
  turn_count: number;
  /** Absent on a continued chat — the row keeps the day it began. */
  started_at?: string;
}

/**
 * The row for one save, or null when there is nothing to keep (no athlete line survived the guard — a chat that
 * was only a stopped line is not a chat to keep). `head` = the stored chat this one continues, if it does.
 */
export function pastChatRow(input: {
  id: string;
  thread: readonly Turn[];
  recap?: { text: string; through: number } | null;
  head?: readonly StoredTurn[] | null;
  now?: number;
}): PastChatWrite | null {
  const current = storedTurns(input.thread);
  const all = input.head ? mergeContinued(input.head, current) : current;
  if (!all.some((t) => t.role === 'athlete')) return null;
  const turns = fitTurns(all);
  const recapText = input.recap ? guardProse(input.recap.text, PAST_CHAT_RECAP_CHARS) : null;
  const row: PastChatWrite = {
    id: input.id,
    title: chatTitle(all),
    turns,
    preview: chatPreview(turns),
    recap: recapText,
    recap_through: recapText && input.recap ? Math.max(0, Math.floor(input.recap.through)) : null,
    search_text: searchText([{ role: 'athlete', text: chatTitle(all) }, ...turns]),
    turn_count: turns.length,
  };
  if (!input.head) {
    const firstAt = input.thread.find((t): t is Extract<Turn, { kind: 'me' }> => t.kind === 'me' && !t.stopped && !!t.text.trim())?.at;
    row.started_at = new Date(typeof firstAt === 'number' && Number.isFinite(firstAt) ? firstAt : input.now ?? Date.now()).toISOString();
  }
  return row;
}

/** Two saves of the same chat that would write the same row — the second is skipped. */
export function rowSignature(row: PastChatWrite): string {
  const last = row.turns[row.turns.length - 1];
  return `${row.id}|${row.turn_count}|${row.title}|${last ? `${last.role}:${last.text.length}:${last.text.slice(-40)}` : ''}|${row.recap ?? ''}|${row.recap_through ?? ''}`;
}
