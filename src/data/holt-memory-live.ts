import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { deleteAllPastChats } from '@/data/holt-past-chats-live';

/**
 * The "Holt remembers" switch and Forget everything (AI Road to 10 Sprint 4b §1.4, migration 0278).
 *
 *   getRemembers()       → is memory on? No row, no table yet (before 0278), signed out or any failure → true
 *                          (PO 2026-11-18: Holt remembers by default). Kept 60 s in memory; every ask reads it.
 *   setRemembers(on)     → true when saved. One row per athlete (`holt_memory_prefs`, owner-only RLS).
 *   forgetEverything()   → deletes every kept fact (`holt_notes`), chat summary (`holt_chat_summaries`) and past chat
 *                          (lane B's `deleteAllPastChats`). True when all of it went.
 *
 * ⚠ OFF IS ENFORCED ON THE SERVER TOO. coach-ask reads the same row in `summarize` (every app version) and in
 *   `get_past_chats`, and treats a row it cannot read as off. This file only decides what THIS phone sends: no notes in
 *   the brief (`fetchBriefNotes`), no end-of-chat summary, no past-chat rows (lane B reads `getRemembers`).
 *
 * Telemetry (§1.9): `holt_memory` with `kind` = switch_on | switch_off | forget_all (facts_kept / fact_deleted from
 * their callers) and `count` — names and counts, never text (the analytics allowlist's own keys, `kind` and `count`).
 */

const CACHE_MS = 60_000;
let cached: { on: boolean; at: number; uid: string } | null = null;

async function signedInId(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Drop what this phone remembers about the switch (tests; a different athlete signs in — the uid key covers that too). */
export function forgetRemembersCache(): void {
  cached = null;
}

/** Is memory on for this athlete? No row, no table yet, or any failure → true (PO: on by default). */
export async function getRemembers(): Promise<boolean> {
  const uid = await signedInId();
  if (!uid) return true;
  if (cached && cached.uid === uid && Date.now() - cached.at < CACHE_MS) return cached.on;
  try {
    const { data, error } = await supabase.from('holt_memory_prefs').select('remembers').eq('athlete_id', uid).maybeSingle();
    if (error) return true;
    const on = (data as { remembers?: unknown } | null)?.remembers !== false;
    cached = { on, at: Date.now(), uid };
    return on;
  } catch {
    return true;
  }
}

/** Turn memory on or off. True when saved. */
export async function setRemembers(on: boolean): Promise<boolean> {
  const uid = await signedInId();
  if (!uid) return false;
  try {
    const { error } = await supabase
      .from('holt_memory_prefs')
      .upsert({ athlete_id: uid, remembers: on, updated_at: new Date().toISOString() }, { onConflict: 'athlete_id' });
    if (error) return false;
    cached = { on, at: Date.now(), uid };
    track('holt_memory', { kind: on ? 'switch_on' : 'switch_off' });
    return true;
  } catch {
    return false;
  }
}

/** Delete every kept fact, chat summary and past chat. True when all of it went. */
export async function forgetEverything(): Promise<boolean> {
  const uid = await signedInId();
  if (!uid) return false;
  try {
    const [notes, summaries, chats] = await Promise.all([
      supabase.from('holt_notes').delete().eq('athlete_id', uid),
      supabase.from('holt_chat_summaries').delete().eq('athlete_id', uid),
      deleteAllPastChats(),
    ]);
    const ok = !notes.error && !summaries.error && chats === true;
    if (ok) track('holt_memory', { kind: 'forget_all' });
    return ok;
  } catch {
    return false;
  }
}

/* ── "New · from a chat on <date>" — when this phone last showed What Holt Remembers ── */
const SEEN_KEY = 'fl_holt_memory_seen_v1';

/** When the athlete last looked at What Holt Remembers on this phone (ISO), or null. */
export async function readMemorySeen(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(SEEN_KEY);
    return v && !Number.isNaN(Date.parse(v)) ? v : null;
  } catch {
    return null;
  }
}

/** They are looking now: what was new is not new next time. */
export async function markMemorySeen(at: Date = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, at.toISOString());
  } catch {
    // A fact that still says New next time is a small cost.
  }
}
