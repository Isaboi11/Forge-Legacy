import { supabase } from '@/lib/supabase';

/**
 * Deleting your account — the whole path, in the only order that is safe.
 *
 * ══ WHY THIS EXISTS ══
 *
 * **App Store Review Guideline 5.1.1(v)**: an app that lets you create an account must let you delete it
 * from inside the app. There was no delete path anywhere in Forge Legacy, and the Terms of Service
 * (`src/domain/settings/content.ts:44`) have been promising one the entire time — *"you may export or
 * delete it at any time from Account settings."* Found by the 2026-08-12 launch audit; a submission
 * blocker independent of the copy.
 *
 * ══ ⚠ MEDIA FIRST, THEN THE ACCOUNT. THE ORDER IS THE WHOLE DESIGN ══
 *
 * `delete_my_account()` removes `auth.users`, which cascades every athlete-owned table in the schema. It
 * cannot touch storage: `storage.protect_delete()` (0142) raises 42501 on any direct delete from the
 * storage tables, deliberately.
 *
 * So the objects have to go from the client, while the athlete is still signed in and still owns them —
 * and that is only possible at all because **0146** gave `transformation-media` and `squad-photos`
 * owner-scoped delete policies. Before that migration an athlete could not remove their own progress
 * photos, and could remove anybody else's. Run this in the other order and the rows that name the objects
 * are already gone, so nothing knows which bytes were theirs: unreferenced, unreachable, and permanent.
 *
 * ══ ⚠ BEST-EFFORT ON MEDIA, STRICT ON THE ACCOUNT ══
 *
 * A failed object delete must never block somebody from leaving. A privacy right that fails because a
 * photo would not delete is not one. So the media pass swallows per-bucket failures and the account
 * deletion does not — if the account itself cannot be deleted, the athlete is told, and nothing has been
 * half-destroyed because the media pass only ever removes things that were about to become orphans.
 *
 * Anything missed is an orphan of the same class the audit records for photos generally (there is no
 * `.remove(` anywhere else in `src/`). That gap is real and tracked; it does not belong in the path of
 * somebody trying to delete their account.
 */

/** Buckets whose objects are keyed under the athlete's own id, and can be listed and removed by prefix. */
const OWNED_PREFIX_BUCKETS = ['avatars', 'media'] as const;

async function removeOwnedObjects(bucket: string, prefix: string): Promise<number> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data?.length) return 0;
    // `list` returns names relative to the prefix; `remove` wants full paths.
    const paths = data.filter((o) => o.name).map((o) => `${prefix}/${o.name}`);
    if (!paths.length) return 0;
    const { error: rmError } = await supabase.storage.from(bucket).remove(paths);
    return rmError ? 0 : paths.length;
  } catch {
    // Best-effort by design — see the header. Never block the deletion on a bucket.
    return 0;
  }
}

export interface DeleteAccountResult {
  squadsTransferred: number;
  squadsDissolved: number;
  objectsRemoved: number;
}

/**
 * Delete the signed-in athlete's account. Irreversible.
 *
 * Throws if the account could not be deleted — the caller must surface that rather than signing out, or
 * the athlete believes they are gone when they are not.
 */
export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // ── 1 · the athlete's own media, while they still own it ──────────────────
  let objectsRemoved = 0;
  for (const bucket of OWNED_PREFIX_BUCKETS) {
    objectsRemoved += await removeOwnedObjects(bucket, user.id);
  }
  /*
   * `chapter-photos` and `transformation-media` are keyed by CHAPTER id and by a `xf-<epoch>` draft id
   * respectively, not by the athlete's id — so they cannot be listed by prefix here. Their rows carry the
   * URLs, so the objects are enumerated from the rows before those rows cascade away.
   */
  objectsRemoved += await removeMediaNamedByRows(user.id);

  // ── 2 · the account itself ────────────────────────────────────────────────
  const { data, error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  const r = (data ?? {}) as { squads_transferred?: number; squads_dissolved?: number };

  return {
    squadsTransferred: r.squads_transferred ?? 0,
    squadsDissolved: r.squads_dissolved ?? 0,
    objectsRemoved,
  };
}

/**
 * The objects whose keys live in a row rather than under the athlete's id.
 *
 * ⚠ READ THE ROWS BEFORE THE CASCADE. Once `delete_my_account()` runs, `chapter_photos` and
 * `transformation_entries` are gone, and with them the only record of which objects were this athlete's.
 * A public bucket plus no row pointing at it is exactly the orphan class 0142 built a ledger for.
 */
async function removeMediaNamedByRows(athleteId: string): Promise<number> {
  let n = 0;

  const pathOf = (url: string, bucket: string): string | null => {
    // A public URL is `…/storage/v1/object/public/<bucket>/<path>?v=…`; take what follows the bucket.
    const marker = `/${bucket}/`;
    const i = url.indexOf(marker);
    if (i < 0) return null;
    return url.slice(i + marker.length).split('?')[0] || null;
  };

  try {
    const { data } = await supabase.from('chapter_photos').select('url').eq('athlete_id', athleteId);
    const paths = (data ?? [])
      .map((r) => pathOf(String((r as { url: string }).url ?? ''), 'chapter-photos'))
      .filter((p): p is string => !!p);
    if (paths.length) {
      const { error } = await supabase.storage.from('chapter-photos').remove(paths);
      if (!error) n += paths.length;
    }
  } catch {
    /* best-effort */
  }

  try {
    const { data } = await supabase.from('transformation_entries').select('photos, video_url').eq('athlete_id', athleteId);
    const urls: string[] = [];
    for (const row of data ?? []) {
      const r = row as { photos: Record<string, string> | null; video_url: string | null };
      if (r.photos) urls.push(...Object.values(r.photos));
      if (r.video_url) urls.push(r.video_url);
    }
    const paths = urls.map((u) => pathOf(u, 'transformation-media')).filter((p): p is string => !!p);
    if (paths.length) {
      const { error } = await supabase.storage.from('transformation-media').remove(paths);
      if (!error) n += paths.length;
    }
  } catch {
    /* best-effort */
  }

  return n;
}
