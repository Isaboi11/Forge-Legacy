import { supabase } from '@/lib/supabase';

/**
 * Taking a deleted row's photos with it (launch QA B11 / UX-001, 2026-11-09).
 *
 * ══ THE DEFECT ══
 *
 * Deleting a progress set deleted its `transformation_entries` row and nothing else. The photos and the
 * posing clip stayed in the public `transformation-media` bucket, at the same public URL, downloadable by
 * anyone holding it — under a confirm that said they "will be permanently removed… This can't be undone".
 * A squad or friends post with photos did the same to `squad-media`. The 11-09 sweep deleted two sets
 * through the UI and fetched every photo afterwards, unauthenticated: HTTP 200.
 *
 * ══ THE RULES THIS FILE KEEPS ══
 *
 *  · THE ROW FIRST, THEN THE FILES. The row is the only record of which objects were this athlete's, so
 *    the delete asks for it back (`delete().select(...)`) and the files are named from what was actually
 *    deleted. A row delete that fails therefore never costs a photo.
 *  · BEST-EFFORT, NEVER BLOCKING. A file that will not go must not undo, fail, or hold up the delete the
 *    athlete confirmed. Nothing here throws; the caller gets a count of what was LEFT and says so.
 *  · ONLY THE ATHLETE'S OWN OBJECTS. Storage lets an athlete remove only what they uploaded
 *    (`owner = auth.uid()`, 0146 / 0075 / 0261). A squad owner taking down someone else's post cannot
 *    remove that person's files, and this does not try to — no service key, no workaround.
 */

/**
 * The object path inside `bucket` that a stored public URL names, or `null` when the URL is not in that
 * bucket. A public URL is `…/storage/v1/object/public/<bucket>/<path>?v=…`; the path is what follows the
 * bucket, without the cache-busting query.
 *
 * ⚠ A URL FROM ANOTHER BUCKET IS NULL, AND THAT IS LOAD-BEARING. A progress post carries the athlete's
 * `transformation-media` URLs and a session recap carries their `chapter-photos` album URLs; asking for
 * `squad-media` paths is what keeps deleting the POST from deleting the ARCHIVE it was composed from.
 */
export function storagePathOf(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return url.slice(i + marker.length).split('?')[0] || null;
}

export interface MediaCleanup {
  /** Files this row named that are still in storage after the attempt. 0 = everything went. */
  left: number;
}

/**
 * Remove the objects these URLs name from `bucket`. URLs outside the bucket are ignored. Never throws.
 *
 * Storage answers a remove with the objects it actually deleted, and silently skips one the caller does
 * not own — so `left` is counted from that answer, never assumed. A failed request is tried once more.
 */
export async function removeObjectsAt(bucket: string, urls: readonly string[]): Promise<MediaCleanup> {
  const paths = [...new Set(urls.map((u) => storagePathOf(u, bucket)).filter((p): p is string => !!p))];
  if (!paths.length) return { left: 0 };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data, error } = await supabase.storage.from(bucket).remove(paths);
      if (!error) return { left: Math.max(0, paths.length - (Array.isArray(data) ? data.length : 0)) };
    } catch {
      // A transport failure — the second attempt is the retry.
    }
  }
  return { left: paths.length };
}

/** What a deleted `squad_posts` row gives back: `delete().select('author_id, media')`. */
export interface DeletedPostRow {
  author_id?: string | null;
  media?: unknown;
}

const POST_MEDIA_BUCKET = 'squad-media';

/**
 * A deleted post's own files: the `squad-media` objects the athlete uploaded for it, that no other post of
 * theirs still shows. Never throws.
 *
 * ⚠ ONE UPLOAD CAN BELONG TO SEVERAL POSTS. A session recap posted to three squads and to friends uploads
 * its picture ONCE and every row carries the same URL (`workout-post-live.ts`). Deleting one of those
 * posts must not blank the other three, so a file goes only when none of the athlete's remaining posts
 * still names it. If that check cannot be made, the file is KEPT — and counted as left, because the
 * athlete was told it would go.
 *
 * Only the author's rows are considered (`me` is the signed-in athlete, read by the caller BEFORE it
 * deleted anything). A squad owner deleting someone else's post removes the row; the author's files are
 * theirs, and storage would refuse the remove anyway.
 */
export async function removeDeletedPostMedia(rows: readonly DeletedPostRow[], me: string): Promise<MediaCleanup> {
  const urls = new Set<string>();
  for (const row of rows) {
    if (row.author_id !== me || !Array.isArray(row.media)) continue;
    for (const m of row.media) {
      const url = (m as { url?: unknown } | null)?.url;
      if (typeof url === 'string' && storagePathOf(url, POST_MEDIA_BUCKET)) urls.add(url);
    }
  }
  if (!urls.size) return { left: 0 };

  try {
    const unshared: string[] = [];
    let unchecked = 0;
    for (const url of urls) {
      // `media` is jsonb: containment must be sent as JSON text — an array argument would be written as a
      // Postgres array literal and match nothing.
      const { data, error } = await supabase
        .from('squad_posts')
        .select('id')
        .eq('author_id', me)
        .contains('media', JSON.stringify([{ url }]))
        .limit(1);
      if (error) unchecked += 1;
      else if (!data?.length) unshared.push(url);
    }
    const removed = await removeObjectsAt(POST_MEDIA_BUCKET, unshared);
    return { left: removed.left + unchecked };
  } catch {
    return { left: urls.size };
  }
}
