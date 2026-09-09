#!/usr/bin/env python3
"""set_cache_control.py — re-upload every exercise-media object so it SERVES a one-year cache-control.

Why a RE-UPLOAD and not SQL (proved 2026-09-09): `storage.objects.metadata->>'cacheControl'` is only
the record. The served header is fixed into Supabase's CDN when the edge caches the object, the edge
keys on the PATH (a `?v=3` nobody had ever requested came back CF HIT), and it revalidates by etag —
so a SQL metadata update changed the stored value and the edge went on serving `no-cache` anyway.
Only a storage-API write fires the Smart CDN invalidation that refreshes the served headers.

The bytes are downloaded and re-uploaded UNCHANGED, so no device re-downloads anything and MEDIA_REV
stays at '2'; only the headers change. Diagnosis note: `curl -I` (HEAD) is NOT trustworthy here —
Supabase answers HEAD with `no-cache` even where GET serves `public, max-age=31536000`. Verify with
GET only (`curl -s -D - -o /dev/null`).

Usage (PowerShell; key comes from C:/Users/isaia/forge-service-key.txt — never commit, delete after):
  $env:SUPABASE_SERVICE_ROLE_KEY = (Get-Content C:/Users/isaia/forge-service-key.txt -Raw).Trim()
  $env:EXPO_PUBLIC_SUPABASE_URL  = "https://ucqbzoeouvwoyfnnmqoo.supabase.co"
  python set_cache_control.py --probe     # ONE object (male/barbell-bench-press.webp), then stop
  python set_cache_control.py             # everything in the bucket; resumable, safe to re-run
"""

import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BUCKET = "exercise-media"
CACHE_SECONDS = "31536000"  # one year; ?v= (MEDIA_REV) stays the invalidation lever for re-cuts
PROBE_KEY = "male/barbell-bench-press.webp"
# The whole layout, from src/domain/exercise-detail/media.ts: loops <theme?>/<sex>/<id>.webp,
# posters poster/<theme?>/<sex>/<id>.webp. Theme prefix OUTSIDE for loops, INSIDE for posters.
PREFIXES = [
    "male", "female", "paper/male", "paper/female",
    "poster/male", "poster/female", "poster/paper/male", "poster/paper/female",
]
STATE = Path(__file__).with_name("cache_control_done.json")  # gitignored, resumable

_local = threading.local()


def client():
    # httpx clients aren't shared across threads — one supabase client per worker.
    if not hasattr(_local, "c"):
        from supabase import create_client
        _local.c = create_client(os.environ["EXPO_PUBLIC_SUPABASE_URL"],
                                 os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    return _local.c


def list_keys():
    keys = []
    for prefix in PREFIXES:
        offset = 0
        while True:
            page = client().storage.from_(BUCKET).list(
                prefix, {"limit": 1000, "offset": offset, "sortBy": {"column": "name", "order": "asc"}})
            files = [f for f in page if f.get("id")]  # folders come back id-less
            keys += [f"{prefix}/{f['name']}" for f in files]
            if len(page) < 1000:
                break
            offset += 1000
    return keys


def reupload(key):
    blob = client().storage.from_(BUCKET).download(key)
    client().storage.from_(BUCKET).upload(
        key, blob, {"content-type": "image/webp", "cache-control": CACHE_SECONDS, "upsert": "true"})
    return key


def main():
    if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or not os.environ.get("EXPO_PUBLIC_SUPABASE_URL"):
        raise SystemExit("!! needs SUPABASE_SERVICE_ROLE_KEY and EXPO_PUBLIC_SUPABASE_URL in the env "
                         "(export for this command only; do not commit).")

    if "--probe" in sys.argv:
        reupload(PROBE_KEY)
        print("probe re-uploaded:", PROBE_KEY)
        print("now verify with a GET (not -I):")
        print(f'  curl -s -D - -o /dev/null "{os.environ["EXPO_PUBLIC_SUPABASE_URL"]}'
              f'/storage/v1/object/public/{BUCKET}/{PROBE_KEY}?v=2"')
        return

    done = set(json.loads(STATE.read_text())) if STATE.exists() else set()
    todo = [k for k in list_keys() if k not in done]
    print(f"{len(todo)} objects to touch ({len(done)} already done)")
    ok = fail = 0
    lock = threading.Lock()
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(reupload, k): k for k in todo}
        for i, fut in enumerate(as_completed(futures), 1):
            k = futures[fut]
            try:
                fut.result()
                with lock:
                    ok += 1
                    done.add(k)
            except Exception as e:  # noqa: BLE001
                with lock:
                    fail += 1
                print("!! failed", k, repr(e)[:160])
            if i % 100 == 0:
                with lock:
                    STATE.write_text(json.dumps(sorted(done)))
                print(i, "/", len(todo), "ok", ok, "failed", fail, flush=True)
    STATE.write_text(json.dumps(sorted(done)))
    print("done — ok", ok, "failed", fail)


if __name__ == "__main__":
    main()
