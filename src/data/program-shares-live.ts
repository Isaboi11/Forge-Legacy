import { trackInvite } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import type { ProgramStructure } from '@/data/programs-live';

/**
 * Sending a program to someone who can run it (migration 0110).
 *
 * Distinct from the share CARD, which posts a picture of a program to a feed. This hands over the plan:
 * the recipient accepts and gets their own independent copy in `programs`.
 *
 * A share carries a SNAPSHOT of the structure rather than a reference, so the sender editing or deleting
 * their program afterwards cannot rewrite or delete a plan somebody else is running. See 0110's header.
 */

export interface ProgramShare {
  id: string;
  name: string;
  structure: ProgramStructure;
  sourceDefinitionId: string | null;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
  fromId: string;
  fromName: string;
  fromHandle: string | null;
  fromAvatarUrl: string | null;
}

const MISSING = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);
const isMissing = (e: unknown): boolean => MISSING.has((e as { code?: string } | null)?.code ?? '');
const NOT_MIGRATED = 'Sending programs isn’t available yet — migration 0110 hasn’t been applied.';

/**
 * Send to one or more athletes. Returns how many actually received it.
 *
 * The count can be LOWER than the number asked for, and that is reported rather than smoothed over: the
 * server drops recipients who are neither a friend nor a squad-mate, and skips anyone who already has
 * this offer pending. A caller that assumed success would tell the athlete they sent twelve copies when
 * eleven landed.
 */
export async function shareProgram(
  toIds: string[],
  name: string,
  structure: ProgramStructure,
  sourceDefinitionId?: string | null,
): Promise<number> {
  if (!toIds.length) return 0;
  const { data, error } = await supabase.rpc('share_program', {
    p_to: toIds,
    p_name: name,
    p_structure: structure,
    p_source: sourceDefinitionId ?? null,
  });
  if (error) throw new Error(isMissing(error) ? NOT_MIGRATED : error.message);
  const sent = Number(data ?? 0);
  // The funnel counts what LANDED, not what was asked for — see the note above about the server dropping
  // recipients. An invite that never reached anybody is not an invite.
  if (sent > 0) trackInvite('sent', { kind: 'program', method: 'in_app', count: sent });
  return sent;
}

/** One share, for the accept screen. Null when it has been withdrawn or declined out of existence. */
export async function fetchProgramShare(id: string): Promise<ProgramShare | null> {
  const { data, error } = await supabase.rpc('program_share', { p_share: id });
  if (error) throw new Error(isMissing(error) ? NOT_MIGRATED : error.message);
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    id: String(d.id),
    name: String(d.name),
    structure: d.structure as ProgramStructure,
    sourceDefinitionId: (d.source_definition_id as string) ?? null,
    status: d.status === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING',
    createdAt: String(d.created_at),
    fromId: String(d.from_id),
    fromName: String(d.from_name ?? 'An athlete'),
    fromHandle: (d.from_handle as string) ?? null,
    fromAvatarUrl: (d.from_avatar_url as string) ?? null,
  };
}

/**
 * Take the copy. Returns the new program's id — idempotent, so a double tap never forks two copies.
 *
 * ⚠ THIS CONSUMES ONE OF THE RECIPIENT'S THREE PROGRAM SLOTS (MA3-D10). The cap is checked BEFORE this
 * call, on the accept screen, so M-7 fires instead of the RPC — `programs_cap_guard()` in migration 0145
 * is the backstop, not the experience. **Sending stays free** (MA3-D13); only receiving costs a slot.
 */
export async function acceptProgramShare(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_program_share', { p_share: id });
  if (error) throw new Error(isMissing(error) ? NOT_MIGRATED : error.message);
  trackInvite('accepted', { kind: 'program', method: 'in_app' });
  return String(data);
}

/**
 * Decline, or withdraw — one call, because both mean "this offer no longer exists" and neither may leave
 * a trace. Afterwards a decline is indistinguishable from never having been sent (0073's rule).
 */
export async function dismissProgramShare(id: string): Promise<void> {
  const { error } = await supabase.from('program_shares').delete().eq('id', id);
  if (error) throw new Error(isMissing(error) ? NOT_MIGRATED : error.message);
}
