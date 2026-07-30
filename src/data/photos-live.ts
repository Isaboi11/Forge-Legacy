import { supabase } from '@/lib/supabase';

/**
 * Legacy photos (L-15 / L-16) — migration 0085.
 *
 * A chapter IS an album. There is no album entity because there never needed to be one: the archive is
 * grouped by the thing that already groups a life in this app.
 *
 * BROWSE-ONLY, and that is a rule rather than a gap. `L-15-Photos-Architecture` §2 names the chapter
 * screens as the only creation paths and §6 makes the gallery read-only, so `addChapterPhoto` below is
 * exported for the chapter's media strip and is not reachable from the gallery.
 */

export interface ChapterPhoto {
  id: string;
  url: string;
  takenOn: string;
  pose: string | null;
  caption: string | null;
  isVideo: boolean;
  isStarred: boolean;
  role: string | null;
  /** Derived server-side from the chapter's dates and the athlete's PRs. Null on an ordinary day. */
  event: string | null;
}

export interface PhotoAlbum {
  chapterId: string;
  name: string;
  subtitle: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  sealed: boolean;
  coverUrl: string | null;
  coverIsVideo: boolean;
  photoCount: number;
  weeks: number;
  highlightExercise: string | null;
  highlightValue: number | null;
}

export interface PhotoAlbums {
  total: number;
  albums: PhotoAlbum[];
}

export interface AlbumDetail {
  chapterId: string;
  name: string;
  subtitle: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  sealed: boolean;
  weeks: number;
  photos: ChapterPhoto[];
}

const toAlbum = (r: Record<string, unknown>): PhotoAlbum => ({
  chapterId: String(r.chapter_id),
  name: String(r.name),
  subtitle: (r.subtitle as string) ?? null,
  startDate: String(r.start_date),
  endDate: (r.end_date as string) ?? null,
  isActive: !!r.is_active,
  sealed: !!r.sealed,
  coverUrl: (r.cover_url as string) ?? null,
  coverIsVideo: !!r.cover_is_video,
  photoCount: Number(r.photo_count ?? 0),
  weeks: Number(r.weeks ?? 1),
  highlightExercise: (r.highlight_exercise as string) ?? null,
  highlightValue: r.highlight_value == null ? null : Number(r.highlight_value),
});

const toPhoto = (r: Record<string, unknown>): ChapterPhoto => ({
  id: String(r.id),
  url: String(r.url),
  takenOn: String(r.taken_on),
  pose: (r.pose as string) ?? null,
  caption: (r.caption as string) ?? null,
  isVideo: !!r.is_video,
  isStarred: !!r.is_starred,
  role: (r.role as string) ?? null,
  event: (r.event as string) ?? null,
});

const MISSING = 'The photo archive isn’t available yet — migration 0085 hasn’t been applied.';

export async function fetchPhotoAlbums(): Promise<PhotoAlbums> {
  const { data, error } = await supabase.rpc('photo_albums');
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error(MISSING);
    throw error;
  }
  const d = (data ?? {}) as { total?: number; albums?: Record<string, unknown>[] };
  return { total: Number(d.total ?? 0), albums: (d.albums ?? []).map(toAlbum) };
}

export async function fetchAlbum(chapterId: string): Promise<AlbumDetail | null> {
  const { data, error } = await supabase.rpc('chapter_album', { p_chapter: chapterId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error(MISSING);
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    chapterId: String(d.chapter_id),
    name: String(d.name),
    subtitle: (d.subtitle as string) ?? null,
    startDate: String(d.start_date),
    endDate: (d.end_date as string) ?? null,
    isActive: !!d.is_active,
    sealed: !!d.sealed,
    weeks: Number(d.weeks ?? 1),
    photos: ((d.photos ?? []) as Record<string, unknown>[]).map(toPhoto),
  };
}

// ── Creation (chapter screens only) ──────────────────────────────────────────

export interface AddPhotoInput {
  chapterId: string;
  url: string;
  takenOn?: string;
  pose?: string | null;
  caption?: string | null;
  isVideo?: boolean;
}

export async function addChapterPhoto(input: AddPhotoInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('chapter_photos')
    .insert({
      athlete_id: user.id,
      chapter_id: input.chapterId,
      url: input.url,
      taken_on: input.takenOn ?? new Date().toISOString().slice(0, 10),
      pose: input.pose?.trim() || null,
      caption: input.caption?.trim() || null,
      is_video: !!input.isVideo,
    })
    .select('id')
    .single();
  if (error) {
    if ((error as { code?: string }).code === '42P01') throw new Error(MISSING);
    throw error;
  }
  return (data as { id: string }).id;
}

/** Upload to the public `chapter-photos` bucket and return the URL. Mirrors `uploadTransformationMedia`. */
export async function uploadChapterPhoto(chapterId: string, uri: string, kind: 'image' | 'video'): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = kind === 'video' ? (blob.type.includes('quicktime') ? 'mov' : 'mp4') : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  // A fresh path per upload — a chapter holds many photos, so re-using one path would overwrite.
  const path = `${chapterId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage
    .from('chapter-photos')
    .upload(path, blob, { contentType: blob.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg') });
  if (error) throw error;
  const { data } = supabase.storage.from('chapter-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ── Presentation ─────────────────────────────────────────────────────────────

/** One day of the archive: the shots taken on it, plus whatever the record says happened that day. */
export interface PhotoDay {
  date: string;
  photos: ChapterPhoto[];
  event: string | null;
  /** A day the record can vouch for — chapter opened or sealed, or a PR. Drives the larger cover. */
  major: boolean;
}

export interface PhotoMonth {
  key: string;
  label: string;
  days: PhotoDay[];
}

/**
 * Group a chapter's photos into months and days, newest first, preserving the order the server returned
 * rather than sorting alphabetically by month name.
 */
export function groupByMonth(photos: ChapterPhoto[]): PhotoMonth[] {
  const order: string[] = [];
  const byMonth = new Map<string, Map<string, ChapterPhoto[]>>();

  for (const p of photos) {
    const mKey = p.takenOn.slice(0, 7);
    if (!byMonth.has(mKey)) {
      byMonth.set(mKey, new Map());
      order.push(mKey);
    }
    const days = byMonth.get(mKey)!;
    if (!days.has(p.takenOn)) days.set(p.takenOn, []);
    days.get(p.takenOn)!.push(p);
  }

  return order.map((mKey) => ({
    key: mKey,
    label: monthLabel(mKey),
    days: [...byMonth.get(mKey)!.entries()].map(([date, dayPhotos]) => {
      const event = dayPhotos.find((p) => p.event)?.event ?? null;
      return { date, photos: dayPhotos, event, major: !!event };
    }),
  }));
}

/** Every photo in the album, flattened newest-first — the order the viewer pages through. */
export function flatten(months: PhotoMonth[]): ChapterPhoto[] {
  return months.flatMap((m) => m.days.flatMap((d) => d.photos));
}

export function monthLabel(monthKey: string): string {
  const d = new Date(`${monthKey}-01T00:00:00`);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : monthKey;
}

/** "Mar 8" — day headings inside an album, where the month is already the group label. */
export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : iso;
}

/** "Mar 8, 2026" — the viewer, where nothing else supplies the year. */
export function fullDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : iso;
}

/**
 * "Jan 2 – Mar 8, 2026". The year is KEPT: the design strips it from the album cards, which makes a 2026
 * chapter and a 2025 chapter indistinguishable in a list whose whole job is telling them apart.
 */
export function rangeLabel(start: string, end: string | null): string {
  const from = dayLabel(start);
  if (!end) return `${from} – now`;
  return `${from} – ${fullDayLabel(end)}`;
}

/**
 * "Back Squat 405" from a catalog key and a load. The key is a slug (`barbell-back-squat`); the leading
 * equipment word is dropped because the card has room for a lift, not a sentence.
 */
export function highlightLabel(exercise: string | null, value: number | null): string | null {
  if (!exercise || value == null) return null;
  const words = exercise.split('-').filter(Boolean);
  const trimmed = words.length > 2 ? words.slice(1) : words;
  const name = trimmed.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return `${name} ${Math.round(value)}`;
}

/** "17 photos", "1 photo". */
export function photoCountLabel(n: number): string {
  return `${n} ${n === 1 ? 'photo' : 'photos'}`;
}

export function weeksLabel(n: number): string {
  return `${n} ${n === 1 ? 'week' : 'weeks'}`;
}

/** Active vs sealed — the chapter's own state, which the album card wears as a chip. */
export function albumStatus(a: { isActive: boolean; sealed: boolean }): 'Active' | 'Sealed' {
  return a.sealed || !a.isActive ? 'Sealed' : 'Active';
}
