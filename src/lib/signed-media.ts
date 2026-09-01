import { supabase } from '@/lib/supabase';

/**
 * Signed media — the ONE place a stored media URL becomes a viewable one (migration 0187, FC-D16).
 *
 * ══ WHY THIS EXISTS ══
 *
 * Every media row in this app stores an ABSOLUTE PUBLIC URL, not a path:
 * `https://…/storage/v1/object/public/chapter-photos/<chapter>/<file>.jpg`. That was fine while every
 * bucket was `public: true`, and it is exactly what `0146`'s "Still open" §1 says cannot be closed by a
 * policy — *"Making the bucket private turns every one of those into a 404 — every photo in the app
 * disappears."* This module is the app change that sentence is asking for.
 *
 * The stored rows do NOT change and never need to. The object path is already inside the stored URL;
 * `storagePathFrom` takes it back out, which is the same parse `account-live.ts` has always used to
 * delete an athlete's objects. So there is no data migration, no backfill, and no dual-write.
 *
 * ══ ⚠ THIS IS SAFE TO SHIP BEFORE THE MIGRATION, AND MUST BE ══
 *
 * `createSignedUrl` works on a PUBLIC bucket too — it signs whatever the caller may already select. So
 * shipping this first is a no-op that quietly starts handing out signed URLs, and flipping the bucket
 * afterwards changes nothing for anyone already running it.
 *
 * ⛔ THE REVERSE ORDER BLANKS THE ARCHIVE. Apply 0187 before the OTA is out and every athlete still on
 * the old bundle is calling `getPublicUrl` against a private bucket — every photo 404s, on a screen
 * whose whole purpose is photos. Ship the update, THEN paste the migration.
 *
 * ══ WHY SIGNING LIVES HERE AND NOT IN THE SCREENS ══
 *
 * `media.ts` is the one id→URL place for exercise demos and that has held. Same argument: five screens
 * render chapter photos (`photos`, `add-photo`, `chapter/[id]`, `workout-complete`, `workout`), and a
 * signing call in each is five chances to forget one and ship a blank tile. `photos-live.ts` reads them
 * all through three functions, so those three sign and the screens stay unchanged.
 *
 * ══ WHY A CACHE, AND WHY IT EXPIRES EARLY ══
 *
 * A signed URL is minted per object per call. The gallery re-reads on every focus, so an uncached
 * implementation re-signs the same hundred objects each time the athlete opens the tab. Entries are
 * therefore held until `REFRESH_MARGIN_MS` before they actually expire — re-signing slightly early is
 * free, while handing a component a URL that dies mid-render is a broken image with no error path.
 */

/**
 * Buckets whose objects must be signed. A URL naming any other bucket comes back untouched, so this
 * module is inert for `avatars`, `squad-media`, `squad-photos`, `media` and `exercise-media` — all of
 * which are public BY DESIGN and are not liabilities: they hold what an athlete chose to show people,
 * plus the product's own demo loops.
 *
 * ⚠ `transformation-media` is NOT here yet, and its absence is deliberate rather than an oversight.
 * A progress post stores the transformation object's URL DIRECTLY (`progress-photo-post.tsx` passes
 * `entry.photos[k]` into `addSquadPost`), so a squad-mate — who is not the owner and cannot sign it —
 * reads that same object off the feed. Locking that bucket without first making the share path COPY
 * into `squad-media` breaks every progress post already in the feed. See `Forge-Coach-Architecture`
 * FC-D16.
 */
const SIGNED_BUCKETS = ['chapter-photos'] as const;

/** One hour. Long enough that a browsing session never re-signs; short enough that a leaked URL dies. */
const TTL_SEC = 3600;

/** Re-sign this long before true expiry, so a URL handed to a component outlives the render. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * The object path inside a stored public URL, or null if this URL does not name that bucket.
 *
 * A public URL is `…/storage/v1/object/public/<bucket>/<path>` and may carry a `?v=` cache-buster
 * (`transformation-live.ts` adds one on re-upload). Pure string work — no network, no client.
 */
export function storagePathFrom(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return url.slice(i + marker.length).split('?')[0] || null;
}

/** The bucket a stored URL belongs to, if it is one this module signs. */
function signedBucketOf(url: string): (typeof SIGNED_BUCKETS)[number] | null {
  for (const b of SIGNED_BUCKETS) if (url.includes(`/${b}/`)) return b;
  return null;
}

interface Entry {
  url: string;
  /** Wall-clock ms after which this must be re-signed. Already includes REFRESH_MARGIN_MS. */
  goodUntil: number;
}

const cache = new Map<string, Entry>();

/** Cache key. Bucket-qualified because two buckets may hold the same path. */
const keyOf = (bucket: string, path: string) => `${bucket}/${path}`;

/**
 * Drop every cached signature. Called on sign-out: the cache is in-memory only and signed URLs are
 * per-object rather than per-user, but a signature minted for one account has no business surviving
 * into the next one on a shared device.
 */
export function clearSignedMedia(): void {
  cache.clear();
}

/**
 * Sign a list of stored URLs, preserving order and length.
 *
 * ⚠ NEVER THROWS AND NEVER BLANKS. A URL that cannot be signed — unknown bucket, storage error,
 * migration not applied yet, no session — comes back exactly as it went in. The failure mode of this
 * module is "the photo loads the way it used to", never "the photo is gone". A gallery that throws
 * because one object went missing is worse than a gallery with one broken tile.
 */
export async function signMedia<T extends string | null | undefined>(urls: T[]): Promise<T[]> {
  const out = urls.slice();
  const now = Date.now();

  // Group the misses by bucket so each bucket is one round trip, not one per object.
  const wanted = new Map<string, Map<string, number[]>>();

  urls.forEach((url, i) => {
    if (!url) return;
    const bucket = signedBucketOf(url);
    if (!bucket) return;
    const path = storagePathFrom(url, bucket);
    if (!path) return;

    const hit = cache.get(keyOf(bucket, path));
    if (hit && hit.goodUntil > now) {
      out[i] = hit.url as T;
      return;
    }
    const byPath = wanted.get(bucket) ?? new Map<string, number[]>();
    byPath.set(path, [...(byPath.get(path) ?? []), i]);
    wanted.set(bucket, byPath);
  });

  for (const [bucket, byPath] of wanted) {
    const paths = [...byPath.keys()];
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, TTL_SEC);
      if (error || !data) continue; // leave the originals in place
      const goodUntil = Date.now() + TTL_SEC * 1000 - REFRESH_MARGIN_MS;
      for (const row of data) {
        // `path` echoes the input; a per-object error leaves signedUrl null and that object unchanged.
        const p = (row as { path?: string | null }).path;
        const signed = (row as { signedUrl?: string | null }).signedUrl;
        if (!p || !signed) continue;
        cache.set(keyOf(bucket, p), { url: signed, goodUntil });
        for (const i of byPath.get(p) ?? []) out[i] = signed as T;
      }
    } catch {
      // Offline, or storage unreachable. The originals are already in `out`.
    }
  }

  return out;
}

/** Single-URL convenience. Same contract: the original comes back rather than a blank. */
export async function signOne<T extends string | null | undefined>(url: T): Promise<T> {
  const [signed] = await signMedia([url]);
  return signed;
}
