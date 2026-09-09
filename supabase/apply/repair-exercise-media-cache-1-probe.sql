-- repair-exercise-media-cache-1-probe.sql — RAN 2026-09-09; KEPT AS THE RECORD OF A DEAD END.
--
-- ⛔ OUTCOME: SQL CANNOT FIX THE SERVED HEADER. This probe set the stored value and the edge went on
-- serving `no-cache` — even on `?v=3`, a URL nobody had ever requested — because Supabase's CDN keys
-- on the PATH, ignores the query string, and refreshes only on a storage-API write. The paper set
-- proved the mechanism (stores max-age, GET serves max-age); the fix is therefore a byte-identical
-- re-upload per object: scripts/animation-processing/set_cache_control.py. A step-2 all-objects
-- version of this file was deleted unrun. ⚠ Diagnosis rule that made this take three passes:
-- Supabase answers HEAD with `no-cache` even where GET serves `public, max-age=31536000` — verify
-- with GET only. Original header follows.
--
-- Why: every object in `exercise-media` serves `Cache-Control: no-cache` (measured 2026-09-09 with
-- curl: CF-Cache-Status MISS/BYPASS on every request, loops are 0.5–1.2 MB each), so each FIRST view
-- of a demo loop pulls the whole file from origin — "takes forever" on gym reception. The served
-- header comes from `storage.objects.metadata->>'cacheControl'`. This file flips ONE object as a
-- probe. The app is untouched either way: the `?v=` MEDIA_REV suffix already keys every cache, so a
-- long lifetime can never pin a stale re-cut — bumping MEDIA_REV invalidates, exactly as before.
--
-- ⚠ upload_fixed.py PASSED `"cache-control": "31536000"` on the 09-07 uploads and the objects serve
-- no-cache anyway — the SELECT below is the diagnosis: it prints what is actually STORED for the
-- probe and three untouched neighbours (one re-cut loop, one paper loop, one poster).
--
-- After this paste: curl the probe URL twice; expect `Cache-Control: max-age=31536000` and, on the
-- second hit, `CF-Cache-Status: HIT`. Only then run step 2.
-- Rollback (if ever wanted): re-run the UPDATE with '"no-cache"' in place of the max-age string.

update storage.objects
set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{cacheControl}', '"max-age=31536000"')
where bucket_id = 'exercise-media'
  and name = 'male/barbell-bench-press.webp';

-- ONE result set on purpose — the editor shows only the last statement's output.
select name,
       metadata->>'cacheControl'        as stored_cache_control,
       (metadata->>'size')::bigint     as bytes
from storage.objects
where bucket_id = 'exercise-media'
  and name in ('male/barbell-bench-press.webp',
               'male/dumbbell-chest-fly.webp',
               'paper/male/barbell-bench-press.webp',
               'poster/male/dumbbell-chest-fly.webp')
order by name;
