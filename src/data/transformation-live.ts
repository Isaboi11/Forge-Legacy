import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { syncPhotoReminder, type ReminderResult } from '@/lib/photo-reminder';

/**
 * Transformation gallery data (L-17) — a personal, owner-scoped progress-photo archive (migration 0044).
 * Entries are chapter-grouped; each holds a `photos` map (poseKey → public URL) + an optional posing clip.
 * Photos/video upload to the public `transformation-media` bucket at capture time; the entry row stores the
 * resulting URLs. New entries tie to the athlete's ACTIVE chapter. The capture reminder is a device-local
 * preference (AsyncStorage), not server state.
 */

export type PoseKey = 'rf' | 'rs' | 'rb' | 'ff' | 'su' | 'bf';

/** Six guided poses — relaxed triad, then flexed triad (bodybuilding-shoot convention). */
export const XFORM_POSES: { key: PoseKey; label: string; short: string }[] = [
  { key: 'rf', label: 'Front Relaxed', short: 'Front' },
  { key: 'rs', label: 'Side Relaxed', short: 'Side' },
  { key: 'rb', label: 'Back Relaxed', short: 'Back' },
  { key: 'ff', label: 'Front Flexed', short: 'Front' },
  { key: 'su', label: 'Side Arms Up', short: 'Arms Up' },
  { key: 'bf', label: 'Back Flexed', short: 'Back' },
];

export const XFORM_TAGS = ['Milestone', 'Competition', 'Posing', 'Bulk', 'Cut', 'Off-season'];

export type PhotoMap = Partial<Record<PoseKey, string>>;

export interface TransformationEntry {
  id: string;
  chapterId: string | null;
  chapterName: string; // resolved (fallback "Your Progress")
  label: string; // capture date (free text)
  caption: string | null; // reflection
  meta: string | null; // context line
  tags: string[];
  photos: PhotoMap;
  videoUrl: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  chapter_id: string | null;
  label: string;
  caption: string | null;
  meta: string | null;
  tags: string[] | null;
  photos: PhotoMap | null;
  video_url: string | null;
  created_at: string;
  chapters: { name: string } | null;
}

const COLS = 'id, chapter_id, label, caption, meta, tags, photos, video_url, created_at, chapters(name)';

const toEntry = (r: Row): TransformationEntry => ({
  id: r.id,
  chapterId: r.chapter_id,
  chapterName: r.chapters?.name ?? 'Your Progress',
  label: r.label,
  caption: r.caption,
  meta: r.meta,
  tags: r.tags ?? [],
  photos: r.photos ?? {},
  videoUrl: r.video_url,
  createdAt: r.created_at,
});

/** Whether an entry has any photo or a video (drives the "has media" states). */
export const entryHasMedia = (e: TransformationEntry): boolean => !!e.videoUrl || Object.keys(e.photos).length > 0;
export const filledPoses = (e: TransformationEntry): { key: PoseKey; label: string; short: string }[] => XFORM_POSES.filter((p) => e.photos[p.key]);

async function uid(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Every transformation entry, newest first (by insertion time). */
export async function fetchTransformationEntries(): Promise<TransformationEntry[]> {
  const id = await uid();
  if (!id) return [];
  const { data, error } = await supabase.from('transformation_entries').select(COLS).eq('athlete_id', id).order('created_at', { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown as Row[]).map(toEntry);
}

/**
 * One entry by id. `null` means GONE OR NOT YOURS. A failed read THROWS.
 *
 * ⚠ THE DIFFERENCE IS SIX IRREPLACEABLE PHOTOS. This used to be `if (error || !data) return null`, which
 * made a dropped connection indistinguishable from a deleted entry. The edit screen prefills only when
 * this resolves truthy, so on `null` it rendered a COMPLETELY BLANK form — no date, no poses, no
 * reflection — while still enabling Save, because `canSave` was satisfied by edit mode alone. An athlete
 * who assumed it hadn't finished loading and tapped Save wrote `photos: {}` and `video_url: null` over a
 * full entry. The objects stay in the bucket and nothing in the app can ever re-link them.
 *
 * Throwing puts the failure in `useQuery`'s `error`, which is the only way the screen can tell the two
 * apart and refuse to save. `fetchTransformationEntries` above deliberately still returns `[]` on error —
 * that one feeds a list where an empty state is survivable, and changing it is a separate decision.
 */
export async function fetchTransformationEntry(entryId: string): Promise<TransformationEntry | null> {
  const id = await uid();
  if (!id) return null;
  const { data, error } = await supabase.from('transformation_entries').select(COLS).eq('id', entryId).eq('athlete_id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toEntry(data as unknown as Row);
}

/** The athlete's active chapter (for the "Tied to …" label + new-entry grouping). Null if none. */
export async function fetchActiveChapter(): Promise<{ id: string; name: string } | null> {
  const id = await uid();
  if (!id) return null;
  const { data } = await supabase.from('chapters').select('id, name').eq('athlete_id', id).eq('is_active', true).maybeSingle();
  return (data as { id: string; name: string } | null) ?? null;
}

export interface SaveEntryInput {
  label: string;
  caption: string;
  meta: string;
  tags: string[];
  photos: PhotoMap;
  videoUrl: string | null;
  chapterId: string | null;
}

/** Create a new entry (ties to the given chapter). Returns the new id. */
export async function addTransformationEntry(input: SaveEntryInput): Promise<string> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('transformation_entries')
    .insert({
      athlete_id: id,
      chapter_id: input.chapterId,
      label: input.label.trim() || 'Today',
      caption: input.caption.trim() || null,
      meta: input.meta.trim() || null,
      tags: input.tags,
      photos: input.photos,
      video_url: input.videoUrl,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Edit an entry in place (metadata + media map). */
export async function updateTransformationEntry(entryId: string, patch: Partial<SaveEntryInput>): Promise<void> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');
  const upd: Record<string, unknown> = {};
  if (patch.label !== undefined) upd.label = patch.label.trim() || 'Today';
  if (patch.caption !== undefined) upd.caption = patch.caption.trim() || null;
  if (patch.meta !== undefined) upd.meta = patch.meta.trim() || null;
  if (patch.tags !== undefined) upd.tags = patch.tags;
  if (patch.photos !== undefined) upd.photos = patch.photos;
  if (patch.videoUrl !== undefined) upd.video_url = patch.videoUrl;
  const { error } = await supabase.from('transformation_entries').update(upd).eq('id', entryId).eq('athlete_id', id);
  if (error) throw error;
}

/** Delete an entry. (Media objects are left in storage — orphaned but harmless.) */
export async function deleteTransformationEntry(entryId: string): Promise<void> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');
  const { error } = await supabase.from('transformation_entries').delete().eq('id', entryId).eq('athlete_id', id);
  if (error) throw error;
}

/**
 * Upload one pose photo / posing clip to the public `transformation-media` bucket, returning its public URL.
 * `draftId` scopes the object path (the entry id in edit mode, a fresh `xf-…` id when composing a new set).
 */
export async function uploadTransformationMedia(draftId: string, key: PoseKey | 'video', uri: string, kind: 'image' | 'video'): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = kind === 'video' ? (blob.type.includes('quicktime') ? 'mov' : 'mp4') : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${draftId}/${key}.${ext}`;
  const { error } = await supabase.storage.from('transformation-media').upload(path, blob, { contentType: blob.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'), upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('transformation-media').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`; // cache-bust re-uploads to the same path
}

// ── Capture reminder (device-local) ──
// The scheduling half lives in `lib/photo-reminder` — see its header for why this is a local
// notification rather than a push, and why it ships over the air.
export type RemindFreq = 'weekly' | 'biweekly' | 'monthly';
export interface Remind {
  enabled: boolean;
  freq: RemindFreq;
}
const REMIND_KEY = 'forge.xform.remind';

export async function getRemind(): Promise<Remind> {
  try {
    const raw = await AsyncStorage.getItem(REMIND_KEY);
    if (raw) {
      const r = JSON.parse(raw);
      if (r && typeof r === 'object') return { enabled: !!r.enabled, freq: r.freq ?? 'monthly' };
    }
  } catch {
    // fall through
  }
  return { enabled: false, freq: 'monthly' };
}
/**
 * Save the preference AND make the device obey it.
 *
 * ⚠ THE SCHEDULING CALL IS THE WHOLE POINT OF THIS FUNCTION NOW. For months this wrote a key that
 * nothing read — the switch moved, the sub-line said "On · monthly", and no reminder was ever
 * scheduled (PO: *"hasn't sent any reminders for progress pics even though I did"*). The write and the
 * schedule live in ONE function so that cannot come apart again: there is no way to record the
 * preference without acting on it.
 *
 * Returns what the device actually did, so the screen can stop claiming "On" when iOS has notifications
 * turned off for the app — which would reproduce this exact bug one layer down.
 */
export async function setRemind(r: Remind): Promise<ReminderResult> {
  try {
    await AsyncStorage.setItem(REMIND_KEY, JSON.stringify(r));
  } catch {
    // best-effort device pref
  }
  return syncPhotoReminder(r.enabled, r.freq);
}

/**
 * Calendar elapsed between two capture labels — "3 weeks", "5 months", "1y 5mo". Unparseable / "Today" reads
 * as now (matches the design's `parseLabel`). Proper partial-month handling.
 */
export function elapsedBetween(l1: string, l2: string): string {
  const parse = (l: string): Date => {
    if (!l || l === 'Today' || l === 'Now') return new Date();
    const d = new Date(l);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };
  let a = parse(l1);
  let b = parse(l2);
  if (a > b) [a, b] = [b, a];
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months--;
  if (months < 1) {
    const days = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
    const wk = Math.round(days / 7);
    return wk <= 1 ? `${days} ${days === 1 ? 'day' : 'days'}` : `${wk} weeks`;
  }
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const y = Math.floor(months / 12);
  const rem = months % 12;
  return rem ? `${y}y ${rem}mo` : `${y} ${y === 1 ? 'year' : 'years'}`;
}
