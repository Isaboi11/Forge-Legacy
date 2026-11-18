/**
 * The found-via question's two calls (migration 0273). Both are RPCs — `athlete_found_via` has no client
 * grant, so nobody can read another athlete's answer.
 *
 * ⚠ FAILS CLOSED. Any error — signed out, offline, or a database that does not have 0273 yet — reads as
 * "not owed", and Home simply draws no card. A question is never worth a broken Home.
 */

import { supabase } from '@/lib/supabase';
import type { FoundViaAnswer } from '@/domain/home/found-via';

export async function fetchFoundViaOwed(): Promise<boolean> {
  const { data, error } = await supabase.rpc('found_via_owed');
  if (error) return false;
  return data === true;
}

/** Saves the answer. The first answer wins on the server, so a retry or a second device is harmless. */
export async function saveFoundVia(answer: FoundViaAnswer): Promise<void> {
  const { error } = await supabase.rpc('set_found_via', { p_source: answer });
  if (error) throw error;
}
