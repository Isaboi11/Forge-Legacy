import { supabase } from '@/lib/supabase';
import { sortAccomplishments, type Accomplishment } from '@/domain/legacy/accomplishments';

/**
 * Accomplishments persistence (`accomplishments`, 0023) — athlete-owned CRUD behind L-12/13/14.
 *
 * A missing table (pre-0023) resolves to an empty list rather than breaking the Legacy screen that
 * previews these, mirroring how `exercise-favorites` degrades before its migration.
 */

const ROW = 'id, name, date, chapter_id, featured, note, media_url, media_kind, created_at';

interface Row {
  id: string;
  name: string;
  date: string | null;
  chapter_id: string | null;
  featured: boolean;
  note: string | null;
  media_url: string | null;
  media_kind: string | null;
  created_at: string;
}

const toModel = (r: Row): Accomplishment => ({
  id: r.id,
  name: r.name,
  date: r.date,
  chapterId: r.chapter_id,
  featured: r.featured,
  note: r.note,
  mediaUrl: r.media_url,
  // The database's check constraint makes anything else impossible, but a value read from the network
  // is narrowed here rather than cast, so a row from a partially-applied migration cannot reach a
  // renderer that will try to play it.
  mediaKind: r.media_kind === 'image' || r.media_kind === 'video' ? r.media_kind : null,
  createdAt: r.created_at,
});

async function uid(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function fetchAccomplishments(): Promise<Accomplishment[]> {
  const id = await uid();
  if (!id) return [];
  const { data, error } = await supabase
    .from('accomplishments')
    .select(ROW)
    .eq('athlete_id', id)
    .order('created_at', { ascending: false });
  if (error) return []; // pre-migration or transient — the Legacy preview must not break
  return sortAccomplishments(((data ?? []) as Row[]).map(toModel));
}

export interface SaveAccomplishmentInput {
  id?: string;
  name: string;
  date: string | null;
  chapterId: string | null;
  note: string | null;
  /**
   * The attached photo or video (0118). Both null clears it.
   *
   * Passed on every save rather than only when it changed, so the form is the single statement of what
   * the row should be — an "only write it if it's set" rule would make removing a photo impossible.
   */
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
}

/** Upsert — insert when there's no id, else update the athlete's own row. Returns the saved record. */
export async function saveAccomplishment(input: SaveAccomplishmentInput): Promise<Accomplishment> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');

  // Both or neither, mirroring the database's own constraint — a URL with no kind cannot be rendered
  // and a kind with no URL is a claim about a file that isn't there.
  const mediaUrl = input.mediaUrl?.trim() || null;
  const mediaKind = mediaUrl ? (input.mediaKind ?? 'image') : null;

  const fields = {
    name: input.name.trim(),
    date: input.date,
    chapter_id: input.chapterId,
    note: input.note?.trim() || null,
    media_url: mediaUrl,
    media_kind: mediaKind,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('accomplishments')
      .update(fields)
      .eq('id', input.id)
      .eq('athlete_id', id)
      .select(ROW)
      .single();
    if (error) throw error;
    /*
     * Keep any Pinned-Legacy pin of this accomplishment in sync — the title on a rename, and now the
     * MEDIA too. A pin denormalizes what it shows, so without this the museum goes on displaying a photo
     * the athlete has since replaced or removed, and there is no path that would ever correct it.
     */
    await supabase
      .from('pins')
      .update({ title: fields.name, media_url: fields.media_url, is_video: fields.media_kind === 'video' })
      .eq('athlete_id', id)
      .eq('kind', 'accomplishment')
      .eq('ref_id', input.id);
    return toModel(data as Row);
  }

  const { data, error } = await supabase
    .from('accomplishments')
    .insert({ ...fields, athlete_id: id })
    .select(ROW)
    .single();
  if (error) throw error;
  return toModel(data as Row);
}

/**
 * Upload a photo or clip for an accomplishment to the public `media` bucket, returning its URL.
 *
 * `draftId` scopes the object path — the accomplishment's own id when editing, a fresh `acc-…` id when
 * composing a new one, since the row does not exist yet and therefore has no id to key on. Same shape
 * `uploadTransformationMedia` uses, and the same reason.
 *
 * The path's first segment is the athlete's uid because that is what 0006's storage policy checks:
 * `(storage.foldername(name))[1] = auth.uid()`. Anything else uploads to a 403.
 */
export async function uploadAccomplishmentMedia(
  draftId: string,
  uri: string,
  kind: 'image' | 'video',
): Promise<string> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');

  const res = await fetch(uri);
  const blob = await res.blob();
  const ext =
    kind === 'video'
      ? blob.type.includes('quicktime')
        ? 'mov'
        : 'mp4'
      : blob.type === 'image/png'
        ? 'png'
        : blob.type === 'image/webp'
          ? 'webp'
          : 'jpg';
  const path = `${id}/accomplishments/${draftId}.${ext}`;
  const { error } = await supabase.storage
    .from('media')
    .upload(path, blob, { contentType: blob.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'), upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  // Cache-bust a re-upload to the same path, or the athlete saves a new photo and goes on seeing the
  // old one — a save that reports success and shows the opposite.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAccomplishment(accomplishmentId: string): Promise<void> {
  const id = await uid();
  if (!id) return;
  // Remove any Pinned-Legacy pin of it first, so the museum never renders a dead tile.
  await supabase.from('pins').delete().eq('athlete_id', id).eq('kind', 'accomplishment').eq('ref_id', accomplishmentId);
  await supabase.from('accomplishments').delete().eq('id', accomplishmentId).eq('athlete_id', id);
}

export async function setAccomplishmentFeatured(accomplishmentId: string, featured: boolean): Promise<void> {
  const id = await uid();
  if (!id) return;
  await supabase.from('accomplishments').update({ featured }).eq('id', accomplishmentId).eq('athlete_id', id);
}

/** The athlete's chapters for the form picker — active first, then newest. Label matches the design. */
export async function fetchChaptersForPicker(): Promise<{ id: string; label: string; active: boolean }[]> {
  const id = await uid();
  if (!id) return [];
  const { data, error } = await supabase
    .from('chapters')
    .select('id, name, is_active, created_at')
    .eq('athlete_id', id)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return [];
  return ((data ?? []) as { id: string; name: string; is_active: boolean }[]).map((c) => ({
    id: c.id,
    label: c.name,
    active: c.is_active,
  }));
}
