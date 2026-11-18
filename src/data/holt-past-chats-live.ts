import { supabase } from '@/lib/supabase';
import { getRemembers } from '@/data/holt-memory-live';
import { heldPlace } from '@/lib/coach-thread';
import { pastChatsStore, type ChatsClient, type SaveResult } from '@/domain/coach/past-chats-store';
import type { PastChatWrite } from '@/domain/coach/past-chats';

export type { GetResult, ListResult, PastChat, PastChatItem } from '@/domain/coach/past-chats-store';

/**
 * Past chats — the live store (Sprint 4b §1.5, migration 0279).
 *
 * The rules (fail soft before 0279, a failed read is never an empty one, today's guard on everything read back)
 * live in `domain/coach/past-chats-store.ts`, where `node --test` reaches them; the shape of a row in
 * `domain/coach/past-chats.ts`. This file hands that store the real client and the signed-in athlete, and adds
 * the one rule that needs another lane's switch:
 *
 *   ⛔ NOTHING NEW IS SAVED WITH "HOLT REMEMBERS" OFF (§1.4). `savePastChat` and `writePastChatSummary` ask
 *     `getRemembers()` (0278's switch, lane A) first — every time, so turning it off mid-chat stops the next save.
 *     Reading, deleting and export are untouched: what is already kept stays visible and deletable.
 *
 *   listPastChats({ query?, page? }) → { ok, chats, more } | { ok: false }   newest first, 30 a page
 *   getPastChat(id)                   → { ok, chat | null } | { ok: false }
 *   savePastChat(row)                 → 'saved' | 'off' | 'unavailable' | 'failed'
 *   writePastChatSummary(id, text)    → boolean
 *   deletePastChat(id)                → boolean
 *   deleteAllPastChats()              → boolean      (lane A's Forget everything)
 *   fetchExportChats()                → ExportChat[] (lane A's Export My Data; [] on any failure)
 */
const store = pastChatsStore(supabase as unknown as ChatsClient, async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
});

export const listPastChats = store.listPastChats;
export const getPastChat = store.getPastChat;

/*
 * ⚠ A DELETED CHAT STAYS DELETED WHILE IT IS STILL ON THE PHONE. The chat on the device can be the one just
 * deleted (opened from the sheet's "Past chats", the sheet handed off and kept it) — and its next reply would
 * upsert the whole row straight back. So a deleted id is remembered for the life of the app and never saved again;
 * the device's next chat gets a new id and saves as normal.
 */
const forgotten = new Set<string>();
export const isForgottenChat = (id: string): boolean => forgotten.has(id);

export async function savePastChat(row: PastChatWrite): Promise<SaveResult | 'off'> {
  if (forgotten.has(row.id)) return 'off';
  if (!(await getRemembers())) return 'off';
  return store.savePastChat(row);
}

export async function writePastChatSummary(id: string, summary: string | null | undefined): Promise<boolean> {
  if (forgotten.has(id)) return false;
  if (!(await getRemembers())) return false;
  return store.writePastChatSummary(id, summary);
}

export async function deletePastChat(id: string): Promise<boolean> {
  forgotten.add(id);
  return store.deletePastChat(id);
}

/** One stored line, flattened for Export My Data (§1.7). */
export interface ExportChat {
  chatId: string;
  title: string;
  startedAt: string;
  who: 'athlete' | 'holt' | 'note';
  text: string;
}

export async function fetchExportChats(): Promise<ExportChat[]> {
  return store.fetchExportLines();
}

/** Forget everything (§1.4): the chat on the phone right now is one of "everything" — it is not saved back. */
export async function deleteAllPastChats(): Promise<boolean> {
  const live = heldPlace()?.chatId;
  if (live) forgotten.add(live);
  return store.deleteAllPastChats();
}
