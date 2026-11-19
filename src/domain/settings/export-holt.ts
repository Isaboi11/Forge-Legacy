/**
 * Export My Data — what Holt remembers (pure; AI Road to 10 Sprint 4b §1.7, PO 2026-11-18: "Memory goes in Export My
 * Data and the account wipe").
 *
 * Three CSVs beside the workout and nutrition ones, in the same ZIP:
 *   holt-memory.csv          every fact / note Holt keeps (0204 + 0278's kind): kind, text, when kept, where from
 *   holt-chat-summaries.csv  the short note of each recent chat (0218)
 *   holt-chats.csv           every stored line of every past chat (lane B's 0279, `fetchExportChats`)
 * An athlete with none of it gets exactly the export they got before.
 */

import { csvCell, localStamp } from './export-core.ts';

export interface ExportHoltNote {
  kind: string | null;
  text: string;
  createdAt: string;
  source: string | null;
}

export interface ExportHoltSummary {
  createdAt: string;
  summary: string;
}

/** One stored chat line — the shape of lane B's `ExportChat` (holt-past-chats-live.ts). */
export interface ExportHoltChatLine {
  chatId: string;
  title: string;
  startedAt: string;
  who: 'athlete' | 'holt' | 'note';
  text: string;
}

export interface ExportHolt {
  notes: ExportHoltNote[];
  summaries: ExportHoltSummary[];
  chats: ExportHoltChatLine[];
}

export const HOLT_MEMORY_HEADERS = ['Kind', 'What Holt keeps', 'Kept', 'Source'] as const;
export const HOLT_SUMMARY_HEADERS = ['Date', 'Summary'] as const;
export const HOLT_CHAT_HEADERS = ['Chat', 'Started', 'Who', 'Text'] as const;

const WHO: Record<ExportHoltChatLine['who'], string> = { athlete: 'You', holt: 'Holt', note: 'App' };

/** Where a note came from, in words (the column is free text since 0204). */
const sourceWords = (s: string | null): string => (s === 'chat' ? 'Kept from a chat' : s === 'ask' || s === 'remember_note' ? 'You confirmed it in a chat' : s ? s : '');

const csv = (headers: readonly string[], rows: unknown[][]) => `${[headers.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n')}\r\n`;

/** True when there is anything of Holt's memory to export. */
export const hasHolt = (h: ExportHolt): boolean => h.notes.length > 0 || h.summaries.length > 0 || h.chats.length > 0;

/** The three files — only the ones with rows, so an athlete who never talked to Holt gets none of them. */
export function holtCsvFiles(h: ExportHolt): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  if (h.notes.length) {
    out.push({
      name: 'holt-memory.csv',
      text: csv(HOLT_MEMORY_HEADERS, h.notes.map((n) => [n.kind ?? 'other', n.text, localStamp(n.createdAt), sourceWords(n.source)])),
    });
  }
  if (h.summaries.length) {
    out.push({ name: 'holt-chat-summaries.csv', text: csv(HOLT_SUMMARY_HEADERS, h.summaries.map((s) => [localStamp(s.createdAt), s.summary])) });
  }
  if (h.chats.length) {
    out.push({ name: 'holt-chats.csv', text: csv(HOLT_CHAT_HEADERS, h.chats.map((c) => [c.title, localStamp(c.startedAt), WHO[c.who] ?? c.who, c.text])) });
  }
  return out;
}

/** How many past chats the file holds (distinct chats, not lines) — for the toast. */
export const holtChatCount = (h: ExportHolt): number => new Set(h.chats.map((c) => c.chatId)).size;

/** The toast's Holt half: " · 4 things Holt kept · 2 chats", or '' when there is none. */
export function holtToastPart(h: ExportHolt): string {
  const parts: string[] = [];
  if (h.notes.length) parts.push(`${h.notes.length} ${h.notes.length === 1 ? 'thing' : 'things'} Holt kept`);
  const chats = holtChatCount(h) || h.summaries.length;
  if (chats) parts.push(`${chats} ${chats === 1 ? 'chat' : 'chats'} with Holt`);
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}
