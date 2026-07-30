import { supabase } from '@/lib/supabase';
import { XFORM_POSES, fetchTransformationEntries, type TransformationEntry } from './transformation-live';

/**
 * The Legacy screen's "What Endures" archive band — three tiles, three real reads.
 *
 * Kept out of `legacy-live` on purpose. That read is one large composite the whole screen blocks on;
 * this one only feeds a band near the bottom of a long scroll, so it loads alongside rather than
 * delaying the hero. A tile that hasn't resolved yet renders its own recessed surface, which is the same
 * surface its empty state uses — so nothing flashes a placeholder and then rearranges.
 *
 * NO `advance_challenges()` HERE. The Trophy Case screen advances the challenge lifecycle when it opens
 * (there is no scheduler), so a season that closed an hour ago is counted the moment the athlete taps
 * through. Advancing from a band on the Legacy tab would run that write on every visit to a screen that
 * is not about competitions, to make a two-digit count fresher by one tap.
 */

export interface ArchiveTransformation {
  count: number;
  /** First photo of the OLDEST entry that has one. Null when no entry carries a photo. */
  oldest: string | null;
  /** First photo of the NEWEST entry that has one. Equal to `oldest` when only one entry has a photo. */
  newest: string | null;
}

export interface ArchivePhotos {
  count: number;
  latest: string | null;
}

export interface ArchiveTrophies {
  gold: number;
  /** 2nd and 3rd ONLY — a championship is never also counted as a podium. */
  podium: number;
  entered: number;
}

export interface LegacyArchive {
  transformation: ArchiveTransformation;
  photos: ArchivePhotos;
  trophies: ArchiveTrophies;
}

/**
 * The first photo an entry carries, in the authored pose order — so the thumbnail is the relaxed front
 * shot whenever there is one, rather than whichever pose happened to be keyed first in the JSON.
 */
function thumbOf(e: TransformationEntry): string | null {
  for (const p of XFORM_POSES) {
    const url = e.photos[p.key];
    if (url) return url;
  }
  return null;
}

/**
 * Real since 0085. The tile used to print `LEGACY_FIXTURE_PENDING.totalPhotoCount` — a literal "12
 * photos" on a permanent record — and tapped to nothing.
 *
 * The thumbnail is the most recent photo account-wide, which is deliberately NOT the same rule as an
 * album cover: a cover answers "what represents this chapter" through the five-tier waterfall, while the
 * tile answers "what did you last add". An unapplied migration degrades to the empty state rather than
 * taking the Legacy screen down with it.
 */
async function readPhotos(): Promise<ArchivePhotos> {
  const [{ count }, { data }] = await Promise.all([
    supabase.from('chapter_photos').select('id', { count: 'exact', head: true }),
    supabase.from('chapter_photos').select('url').order('taken_on', { ascending: false }).order('created_at', { ascending: false }).limit(1),
  ]);
  const latest = ((data ?? []) as { url: string }[])[0]?.url ?? null;
  return { count: count ?? 0, latest };
}

async function readTransformation(): Promise<ArchiveTransformation> {
  const entries = await fetchTransformationEntries(); // newest first
  const withPhoto = entries.map((e) => thumbOf(e)).filter((u): u is string => !!u);
  return {
    count: entries.length,
    newest: withPhoto[0] ?? null,
    oldest: withPhoto.length > 0 ? withPhoto[withPhoto.length - 1] : null,
  };
}

async function readTrophies(): Promise<ArchiveTrophies> {
  const { data, error } = await supabase.rpc('athlete_trophy_case', { p_athlete: null });
  // An unapplied 0084 must not take down the Legacy screen — the tile falls back to its empty state.
  if (error || !data) return { gold: 0, podium: 0, entered: 0 };
  const d = data as Record<string, unknown>;
  return {
    gold: Number(d.championships ?? 0),
    podium: Number(d.silvers ?? 0) + Number(d.bronzes ?? 0),
    entered: Number(d.entered ?? 0),
  };
}

export async function fetchLegacyArchive(): Promise<LegacyArchive> {
  const [transformation, photos, trophies] = await Promise.all([readTransformation(), readPhotos(), readTrophies()]);
  return { transformation, photos, trophies };
}

// ── the tiles' second lines ────────────────────────────────────────────────

export function transformationCount(t: ArchiveTransformation): string {
  if (t.count === 0) return 'Add your first';
  return `${t.count} ${t.count === 1 ? 'entry' : 'entries'}`;
}

export function photosCount(p: ArchivePhotos): string {
  if (p.count === 0) return 'Add photos';
  return `${p.count} ${p.count === 1 ? 'photo' : 'photos'}`;
}

/**
 * "3 gold · 6 podium", and never a zero.
 *
 * The design writes both halves unconditionally, which produces "0 gold · 2 podium" for an athlete who
 * has stood on a podium twice — a line that leads with what they haven't done. CC-D3 governs: a component
 * that would read zero is dropped, and an athlete who has competed without placing gets the fact that is
 * actually true about them, which is that they turned up.
 */
export function trophyCount(t: ArchiveTrophies): string {
  if (t.entered === 0) return 'No finishes yet';
  const parts: string[] = [];
  if (t.gold > 0) parts.push(`${t.gold} gold`);
  if (t.podium > 0) parts.push(`${t.podium} podium`);
  if (parts.length > 0) return parts.join(' · ');
  return `${t.entered} ${t.entered === 1 ? 'competition' : 'competitions'}`;
}
