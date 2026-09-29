import { supabase } from '@/lib/supabase';
import { CHEER_MAX, cleanCheer, type Cheer } from '@/domain/coach/cheers';

/**
 * A squad-mate's message to an athlete who is training — sent from `/workout-join`, shown by Holt on the
 * workout screen (0231, PO 2026-09-28). The rules (squad-mates only, no blocks, 140 chars, 5 per 10 min)
 * live in the INSERT policy; this file only moves rows.
 */

export { CHEER_MAX };

/** Why a send did not land, in words the sender can act on. */
function sendError(e: unknown): Error {
  const code = (e as { code?: string } | null)?.code;
  const msg = (e as { message?: string } | null)?.message ?? '';
  // 42P01: the table does not exist yet (0231 not applied).
  if (code === '42P01' || /workout_cheers/.test(msg) && /does not exist|schema cache/.test(msg)) {
    return new Error('Messages aren’t switched on yet. Try again soon.');
  }
  // 42501: the INSERT policy refused — not squad-mates any more, a block, or the rate limit.
  if (code === '42501') return new Error('Couldn’t send that one. You may have sent a few already — give it a minute.');
  return e instanceof Error ? e : new Error('Couldn’t send your message.');
}

export async function sendCheer(toId: string, body: string): Promise<void> {
  const text = cleanCheer(body);
  if (!text) throw new Error('Type a message first.');
  const { error } = await supabase.from('workout_cheers').insert({ to_id: toId, body: text });
  if (error) throw sendError(error);
}

/**
 * Unseen messages to me since `sinceIso` (the session's start), oldest first so they are read in order.
 *
 * Never throws: a failed poll — or a database without 0231 — is "nothing new", and the workout screen
 * carries on. Sender names come from `profiles`, which every signed-in athlete can read.
 */
export async function fetchUnseenCheers(sinceIso: string): Promise<Cheer[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('workout_cheers')
      .select('id, body, created_at, from_id, sender:profiles!workout_cheers_from_id_fkey(first_name, name)')
      .eq('to_id', user.id)
      .is('seen_at', null)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) return [];
    return ((data ?? []) as unknown as {
      id: string;
      body: string;
      created_at: string;
      from_id: string;
      sender: { first_name: string | null; name: string | null } | null;
    }[]).map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      fromId: r.from_id,
      fromName: r.sender?.first_name?.trim() || r.sender?.name?.trim()?.split(/\s+/)[0] || 'A squad-mate',
    }));
  } catch {
    return [];
  }
}

/** The athlete closed it. Best effort — a failure only means it may show once more. */
export async function markCheerSeen(id: string): Promise<void> {
  try {
    await supabase.from('workout_cheers').update({ seen_at: new Date().toISOString() }).eq('id', id);
  } catch {
    // See above.
  }
}

/**
 * The one-tap answers to a squad-mate's message (0240, PO 2026-09-29). Three, no custom text: a keyboard
 * over the set table mid-set is the wrong moment, and three taps cover what people say back.
 */
export const CHEER_REPLIES = [
  { key: 'got_it', label: '👊 Got it' },
  { key: 'lets_go', label: '🔥 Let’s go' },
  { key: 'thanks', label: '🙏 Thanks' },
] as const;
export type CheerReply = (typeof CHEER_REPLIES)[number]['key'];

/**
 * Answer it — which also closes it (the server stamps `seen_at` and `replied_at`, and pushes the sender).
 * On a database without 0240 the column is unknown and the write fails; it then falls back to marking the
 * message seen, so the bubble still closes and nothing is lost but the answer.
 */
export async function replyToCheer(id: string, reply: CheerReply): Promise<void> {
  try {
    const { error } = await supabase.from('workout_cheers').update({ reply }).eq('id', id);
    if (error) await markCheerSeen(id);
  } catch {
    await markCheerSeen(id);
  }
}
