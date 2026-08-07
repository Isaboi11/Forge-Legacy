import { supabase } from '@/lib/supabase';
import { candidatesFromContent, type PinCandidate, type PinRef } from '@/domain/legacy/pins';
import { fmtDate } from '@/lib/format';
import { fetchAccomplishments } from './accomplishments-live';

/**
 * Pinned Legacy curation (the L-13 sheet) — reads the athlete's real pinnable content and the pins they
 * already hold, and writes pin/unpin against the `pins` table (0005 + 0024's `accomplishment` kind).
 *
 * Candidates come from live content only (accomplishments · honors · chapters); nothing is fabricated,
 * so the sheet lists exactly what can really be pinned today.
 */

async function uid(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface PinManagerData {
  candidates: PinCandidate[];
  pins: PinRef[];
}

export async function fetchPinManager(): Promise<PinManagerData> {
  const id = await uid();
  if (!id) return { candidates: [], pins: [] };

  const [accomplishments, honorsRes, chaptersRes, pinsRes] = await Promise.all([
    fetchAccomplishments(),
    supabase.from('honor_instances').select('id, display_name, date_earned').eq('athlete_id', id).order('date_earned', { ascending: false }),
    supabase.from('chapters').select('id, name, is_active, sealed_at, created_at').eq('athlete_id', id).order('created_at', { ascending: false }),
    supabase.from('pins').select('id, kind, ref_id').eq('athlete_id', id).order('position', { ascending: true }),
  ]);

  const honors = ((honorsRes.data ?? []) as { id: string; display_name: string; date_earned: string }[]).map((h) => ({
    id: h.id,
    name: h.display_name,
    // `candidatesFromContent` prints this straight into the subtitle, so it has to arrive as a display
    // string — the raw column is `2026-08-06`, which read as "Honor · 2026-08-06" in the sheet.
    dateEarned: fmtDate(h.date_earned),
  }));
  const chapters = ((chaptersRes.data ?? []) as { id: string; name: string; is_active: boolean; sealed_at: string | null }[]).map((c) => ({
    id: c.id,
    name: c.name,
    active: c.is_active,
    sealed: c.sealed_at != null,
  }));
  const pins = ((pinsRes.data ?? []) as { id: string; kind: PinRef['kind']; ref_id: string | null }[]).map((p) => ({
    id: p.id,
    kind: p.kind,
    refId: p.ref_id,
  }));

  return { candidates: candidatesFromContent({ accomplishments, honors, chapters }), pins };
}

/** Pin a candidate — appended to the end of the strip. Denormalized title/subtitle + a soft ref. */
export async function pinCandidate(candidate: PinCandidate): Promise<void> {
  const id = await uid();
  if (!id) return;
  const { count } = await supabase.from('pins').select('id', { count: 'exact', head: true }).eq('athlete_id', id);
  await supabase.from('pins').insert({
    athlete_id: id,
    kind: candidate.kind,
    title: candidate.title,
    subtitle: candidate.subtitle,
    ref_id: candidate.refId,
    position: count ?? 0,
    /*
     * The keepsake, denormalized alongside the title — the same posture the rest of this row takes, and
     * the reason `saveAccomplishment` already syncs `pins.title` on a rename. It syncs the media there
     * too, so replacing an accomplishment's photo updates the pin instead of leaving the museum showing
     * a picture the athlete deleted.
     *
     * `poster_url` stays null: a video pin wants a still frame, and nothing in the app extracts one yet.
     * `PinnedCard` reads `posterUrl ?? mediaUrl`, so a video falls back to its own first frame, which is
     * what the platform players render for a bare video URL.
     */
    media_url: candidate.mediaUrl ?? null,
    is_video: candidate.isVideo ?? false,
  });
}

export async function unpin(pinId: string): Promise<void> {
  const id = await uid();
  if (!id) return;
  await supabase.from('pins').delete().eq('id', pinId).eq('athlete_id', id);
}
