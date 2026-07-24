import { supabase } from '@/lib/supabase';
import { sortAccomplishments, type Accomplishment } from '@/domain/legacy/accomplishments';

/**
 * Accomplishments persistence (`accomplishments`, 0023) — athlete-owned CRUD behind L-12/13/14.
 *
 * A missing table (pre-0023) resolves to an empty list rather than breaking the Legacy screen that
 * previews these, mirroring how `exercise-favorites` degrades before its migration.
 */

const ROW = 'id, name, date, chapter_id, featured, note, photo_url, created_at';

interface Row {
  id: string;
  name: string;
  date: string | null;
  chapter_id: string | null;
  featured: boolean;
  note: string | null;
  photo_url: string | null;
  created_at: string;
}

const toModel = (r: Row): Accomplishment => ({
  id: r.id,
  name: r.name,
  date: r.date,
  chapterId: r.chapter_id,
  featured: r.featured,
  note: r.note,
  photoUrl: r.photo_url,
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
}

/** Upsert — insert when there's no id, else update the athlete's own row. Returns the saved record. */
export async function saveAccomplishment(input: SaveAccomplishmentInput): Promise<Accomplishment> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');

  const fields = { name: input.name.trim(), date: input.date, chapter_id: input.chapterId, note: input.note?.trim() || null };

  if (input.id) {
    const { data, error } = await supabase
      .from('accomplishments')
      .update(fields)
      .eq('id', input.id)
      .eq('athlete_id', id)
      .select(ROW)
      .single();
    if (error) throw error;
    // Keep any Pinned-Legacy pin of this accomplishment in sync with the renamed title.
    await supabase.from('pins').update({ title: fields.name }).eq('athlete_id', id).eq('kind', 'accomplishment').eq('ref_id', input.id);
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
