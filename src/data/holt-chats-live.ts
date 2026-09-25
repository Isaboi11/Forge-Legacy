import { fetch } from 'expo/fetch';

import { supabase } from '@/lib/supabase';
import type { AskTurn } from '@/domain/coach/ask-wire';

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

export async function summarizeChat(turns: readonly AskTurn[]): Promise<void> {
  if (turns.filter((t) => t.role === 'athlete').length < SUMMARY_MIN_ATHLETE_TURNS) return;
  try {
    const { data: auth } = await supabase.auth.getSession();
    const jwt = auth.session?.access_token;
    if (!jwt) return;
    await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'summarize', question: '', history: turns.slice(-40) }),
    });
  } catch {
    // Offline or signed out — the chat simply is not remembered.
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
