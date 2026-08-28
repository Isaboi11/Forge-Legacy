import { supabase } from '@/lib/supabase';
import { isLiveSnapshot, type LiveSessionSnapshot } from '@/domain/workout/live-session';

/**
 * The live session, both directions (0181). See `domain/workout/live-session.ts` for the shape and the
 * reasoning; this file only carries it across the wire.
 *
 * Every function here swallows failure. An unapplied 0181 must read as "nothing shared" on the viewer's
 * side and as nothing at all on the athlete's — a workout is never interrupted by a publish that did not
 * land, and a friend's screen degrades to "they aren't sharing this" rather than an error.
 */

export async function publishLiveSession(snapshot: LiveSessionSnapshot): Promise<void> {
  try {
    await supabase.rpc('publish_live_session', { p_payload: snapshot });
  } catch {
    /* offline, or 0181 not applied — the session goes on */
  }
}

export async function clearLiveSession(): Promise<void> {
  try {
    await supabase.rpc('clear_live_session');
  } catch {
    /* the 4-hour ceiling on the read covers a clear that never lands */
  }
}

export interface LiveSessionView {
  name: string;
  avatarUrl: string | null;
  training: boolean;
  /** Only meaningful while `training`. */
  label: string | null;
  startedAt: string | null;
  /** They have opted in to sharing the detail. `snapshot` may still be null on an older build. */
  sharing: boolean;
  snapshot: LiveSessionSnapshot | null;
  updatedAt: string | null;
}

/**
 * What the viewer is allowed to see of this athlete's session right now. `null` means the viewer may
 * not even know whether they are training — a private athlete and a resting one look the same.
 */
export async function fetchLiveSession(athleteId: string): Promise<LiveSessionView | null> {
  try {
    const { data, error } = await supabase.rpc('live_session_of', { p_athlete: athleteId });
    if (error || !data) return null;
    const d = data as Record<string, unknown>;
    const payload = d.payload;
    return {
      name: String(d.name ?? 'Athlete'),
      avatarUrl: (d.avatar_url as string) ?? null,
      training: d.training === true,
      label: (d.label as string) ?? null,
      startedAt: d.started_at ? String(d.started_at) : null,
      sharing: d.sharing === true,
      snapshot: isLiveSnapshot(payload) ? payload : null,
      updatedAt: d.updated_at ? String(d.updated_at) : null,
    };
  } catch {
    return null;
  }
}
