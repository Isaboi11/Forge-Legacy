/**
 * Past chats — the store (Sprint 4b §1.5, migration 0279), with the client handed in so `node --test` can run
 * every query shape and every failure against a fake. `src/data/holt-past-chats-live.ts` hands it the real one.
 *
 * ══ THE RULES ══
 *
 *   · A FAILED READ IS NEVER AN EMPTY ONE (the "my squad is gone" lesson, 11-11). `listPastChats` and
 *     `getPastChat` answer `{ ok: false }` on a failure, so the screen says "couldn't load" with a retry —
 *     never "no past chats yet" to somebody who has thirty.
 *   · BEFORE 0279 IS APPLIED (PGRST205 / 42P01) every read is an honest empty and every write a quiet no-op —
 *     the expected state for a while, not an error to show anyone (holt-notes' rule).
 *   · EVERYTHING READ BACK GOES THROUGH TODAY'S GUARD (`readBack`, `guardProse`), whatever was stored.
 *   · RLS is the boundary: the athlete id comes from the session for the list/export filters, and `athlete_id`
 *     is never written (the column defaults to `auth.uid()`).
 *
 * Pure and import-clean (relative `.ts` imports only).
 */
import type { StoredTurn } from './holt-memory.ts';
import {
  guardProse,
  ilikePattern,
  PAST_CHAT_RECAP_CHARS,
  PAST_CHAT_SUMMARY_CHARS,
  PAST_CHATS_KEPT,
  PAST_CHATS_PAGE,
  readBack,
  searchTerms,
  type PastChatWrite,
} from './past-chats.ts';

type DbError = { code?: string | null; message?: string | null } | null;

/** PostgREST / Postgres codes for "the table is not there yet" — 0279 not applied. */
const MISSING = new Set(['PGRST205', '42P01']);
export const isMissingTable = (e: DbError): boolean => !!e && MISSING.has(String(e.code ?? ''));

/** A PostgREST query in the shape this store uses: chainable, and awaitable to `{ data, error }`. */
export interface ChatsQuery extends PromiseLike<{ data: unknown; error: DbError }> {
  select(columns: string): ChatsQuery;
  eq(column: string, value: string): ChatsQuery;
  ilike(column: string, pattern: string): ChatsQuery;
  order(column: string, options: { ascending: boolean }): ChatsQuery;
  range(from: number, to: number): ChatsQuery;
  limit(n: number): ChatsQuery;
  maybeSingle(): ChatsQuery;
}

export interface ChatsClient {
  from(table: 'holt_chats'): {
    select(columns: string): ChatsQuery;
    upsert(row: PastChatWrite, options: { onConflict: string }): ChatsQuery;
    update(values: { summary: string }): ChatsQuery;
    delete(): ChatsQuery;
  };
}

/** One chat in the list — no transcript, so a page of thirty stays small. */
export interface PastChatItem {
  id: string;
  title: string;
  /** The end-of-chat summary when there is one, else Holt's first answer — the list's second line. */
  line: string | null;
  turnCount: number;
  startedAt: string;
  updatedAt: string;
}

/** One chat opened: the transcript as it may be shown (today's guard), with what "Continue" needs. */
export interface PastChat extends PastChatItem {
  turns: StoredTurn[];
  summary: string | null;
  recap: { text: string; through: number } | null;
}

export type ListResult = { ok: true; chats: PastChatItem[]; more: boolean } | { ok: false };
export type GetResult = { ok: true; chat: PastChat | null } | { ok: false };
export type SaveResult = 'saved' | 'unavailable' | 'failed';

/** One stored line, flattened for Export My Data (§1.7). Mirrors `ExportChat` in holt-past-chats-live.ts. */
export interface ExportLine {
  chatId: string;
  title: string;
  startedAt: string;
  who: 'athlete' | 'holt' | 'note';
  text: string;
}

const LIST_COLUMNS = 'id, title, preview, summary, turn_count, started_at, updated_at';
const FULL_COLUMNS = 'id, title, preview, summary, turn_count, started_at, updated_at, turns, recap, recap_through';

type ListRow = {
  id: string;
  title: string;
  preview: string | null;
  summary: string | null;
  turn_count: number | null;
  started_at: string;
  updated_at: string;
};
type FullRow = ListRow & { turns: unknown; recap: string | null; recap_through: number | null };

function toItem(r: ListRow): PastChatItem {
  const summary = guardProse(r.summary, PAST_CHAT_SUMMARY_CHARS);
  const preview = guardProse(r.preview, 200);
  return {
    id: r.id,
    title: r.title,
    line: summary ?? preview,
    turnCount: typeof r.turn_count === 'number' ? r.turn_count : 0,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
  };
}

export function pastChatsStore(client: ChatsClient, athleteId: () => Promise<string | null>) {
  const table = () => client.from('holt_chats');

  /**
   * Newest first, `PAST_CHATS_PAGE` at a time. `query` → only chats whose `search_text` holds EVERY word of it.
   * `{ ok: false }` on any failure that is not "the table is not there yet".
   */
  async function listPastChats(options: { query?: string; page?: number } = {}): Promise<ListResult> {
    try {
      const uid = await athleteId();
      if (!uid) return { ok: false };
      const page = Math.max(0, Math.floor(options.page ?? 0));
      const from = page * PAST_CHATS_PAGE;
      let q = table().select(LIST_COLUMNS).eq('athlete_id', uid);
      for (const term of searchTerms(options.query ?? '')) q = q.ilike('search_text', ilikePattern(term));
      /* One more than a page, to know whether there is a next one without a count query. */
      const { data, error } = await q.order('updated_at', { ascending: false }).order('id', { ascending: false }).range(from, from + PAST_CHATS_PAGE);
      if (error) return isMissingTable(error) ? { ok: true, chats: [], more: false } : { ok: false };
      const rows = Array.isArray(data) ? (data as ListRow[]) : [];
      return { ok: true, chats: rows.slice(0, PAST_CHATS_PAGE).map(toItem), more: rows.length > PAST_CHATS_PAGE };
    } catch {
      return { ok: false };
    }
  }

  /** One chat, read back through today's guard. `chat: null` = not there (deleted, trimmed, or never saved). */
  async function getPastChat(id: string): Promise<GetResult> {
    try {
      const { data, error } = await table().select(FULL_COLUMNS).eq('id', id).maybeSingle();
      if (error) return isMissingTable(error) ? { ok: true, chat: null } : { ok: false };
      if (!data) return { ok: true, chat: null };
      const r = data as FullRow;
      const recapText = guardProse(r.recap, PAST_CHAT_RECAP_CHARS);
      return {
        ok: true,
        chat: {
          ...toItem(r),
          turns: readBack(r.turns),
          summary: guardProse(r.summary, PAST_CHAT_SUMMARY_CHARS),
          recap: recapText && typeof r.recap_through === 'number' && r.recap_through > 0 ? { text: recapText, through: r.recap_through } : null,
        },
      };
    } catch {
      return { ok: false };
    }
  }

  /** Upsert the row (same id = the same chat, every time). */
  async function savePastChat(row: PastChatWrite): Promise<SaveResult> {
    try {
      const { error } = await table().upsert(row, { onConflict: 'id' });
      if (!error) return 'saved';
      return isMissingTable(error) ? 'unavailable' : 'failed';
    } catch {
      return 'failed';
    }
  }

  /** The end-of-chat summary onto the row — guarded again; nothing is written when no sentence survives. */
  async function writePastChatSummary(id: string, summary: string | null | undefined): Promise<boolean> {
    const clean = guardProse(summary, PAST_CHAT_SUMMARY_CHARS);
    if (!clean) return false;
    try {
      const { error } = await table().update({ summary: clean }).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  async function deletePastChat(id: string): Promise<boolean> {
    try {
      const { error } = await table().delete().eq('id', id);
      return !error || isMissingTable(error);
    } catch {
      return false;
    }
  }

  /** Every past chat of this athlete. True when they are gone (or there never was a table to hold any). */
  async function deleteAllPastChats(): Promise<boolean> {
    try {
      const uid = await athleteId();
      if (!uid) return false;
      const { error } = await table().delete().eq('athlete_id', uid);
      return !error || isMissingTable(error);
    } catch {
      return false;
    }
  }

  /** Export My Data (§1.7): every kept chat, oldest first, one line per stored turn, through today's guard. */
  async function fetchExportLines(): Promise<ExportLine[]> {
    try {
      const uid = await athleteId();
      if (!uid) return [];
      const { data, error } = await table()
        .select('id, title, started_at, turns')
        .eq('athlete_id', uid)
        .order('started_at', { ascending: true })
        .limit(PAST_CHATS_KEPT);
      if (error || !Array.isArray(data)) return [];
      const out: ExportLine[] = [];
      for (const r of data as { id: string; title: string; started_at: string; turns: unknown }[]) {
        for (const t of readBack(r.turns)) out.push({ chatId: r.id, title: r.title, startedAt: r.started_at, who: t.role, text: t.text });
      }
      return out;
    } catch {
      return [];
    }
  }

  return { listPastChats, getPastChat, savePastChat, writePastChatSummary, deletePastChat, deleteAllPastChats, fetchExportLines };
}
