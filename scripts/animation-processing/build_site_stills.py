"""
Extract a still frame from every exercise demo loop and bundle it into `site/assets/exercise/`.

    python scripts/animation-processing/build_site_stills.py            # resumable; skips what exists
    python scripts/animation-processing/build_site_stills.py --force    # re-extract everything
    python scripts/animation-processing/build_site_stills.py --dry      # report coverage, write nothing

══ WHY A STILL, AND WHY BUNDLED ══

`site/README.md` already settled this for the landing page's bench demo, and the reasoning applies to
all 735 catalogue pages exactly as it did to one:

    "In the app the loop is resolved live by domain/exercise-detail/media.ts; a static page cannot do
     that, and hotlinking Supabase storage from marketing traffic is a live backend dependency with no
     upside."

The catalogue's first build hotlinked the bucket from all 735 pages — the same mistake, at scale. Every
marketing visitor would have hit the app's storage backend, an outage there would have silently gutted
the catalogue, and the bytes were absurd: the loops average 928 KB and run to 2.29 MB.

A frame-0 still is 10-12 KB. The whole set is ~4 MB, which is a rounding error against the 6.9 MB of HTML
already in `site/`, and it costs nothing at request time because Cloudflare serves it as a static asset
from the same origin as the page.

══ WHAT IT WRITES ══

    site/assets/exercise/<exerciseId>.webp   the still, at the source's own dimensions
    site/assets/exercise/manifest.json       {"<id>": [width, height]} — the generator's source of truth

⚠ THE MANIFEST IS WHY THE GENERATOR CAN STOP GUESSING. Its first version hardcoded width="600" height="600"
  on every image; the sources are 302x300. That upscales and shifts layout on load — the exact failure
  `site/README.md`'s "all width/height attrs are each file's real intrinsic size" rule exists to prevent.
  With a manifest the page states the true size, and an exercise with no clip renders no <figure> at all
  rather than an onerror placeholder.

⚠ ONLY ~50% OF PUBLISHED EXERCISES HAVE A CLIP. That is a property of the library, not a bug here: it does
  not cover most mobility or strongman work. A missing clip is an ordinary state.
"""

import argparse
import io
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError, URLError

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "src/domain/exercise-coaching/content/coaching_content.json"
OUT_DIR = ROOT / "site/assets/exercise"
MANIFEST = OUT_DIR / "manifest.json"

BUCKET = "https://ucqbzoeouvwoyfnnmqoo.supabase.co/storage/v1/object/public/exercise-media/male"
QUALITY = 80

ap = argparse.ArgumentParser()
ap.add_argument("--force", action="store_true", help="re-extract stills that already exist")
ap.add_argument("--dry", action="store_true", help="report only, write nothing")
ap.add_argument("--jobs", type=int, default=12)
args = ap.parse_args()

rows = json.loads(CONTENT.read_text(encoding="utf-8"))
published = sorted(r["exerciseId"] for r in rows if r.get("contentStatus") == "Published")
print(f"published exercises: {len(published)}")

if not args.dry:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

existing = {p.stem for p in OUT_DIR.glob("*.webp")} if OUT_DIR.exists() else set()
todo = published if (args.force or args.dry) else [i for i in published if i not in existing]
if existing and not args.force:
    print(f"already extracted:   {len(existing)}  (use --force to redo)")
print(f"to fetch:            {len(todo)}")


def one(ex_id):
    """Returns (id, (w, h)) on success, (id, None) when the library has no clip."""
    try:
        with urlopen(f"{BUCKET}/{ex_id}.webp", timeout=60) as r:
            raw = r.read()
    except (HTTPError, URLError, TimeoutError):
        return ex_id, None
    if len(raw) < 1000:
        return ex_id, None
    try:
        im = Image.open(io.BytesIO(raw))
        im.seek(0)  # frame 0. The loops open on the start position, which is the readable one.
        still = im.convert("RGB")
    except Exception:
        return ex_id, None
    if not args.dry:
        still.save(OUT_DIR / f"{ex_id}.webp", "WEBP", quality=QUALITY, method=6)
    return ex_id, still.size


found, missing = {}, []
done = 0
with ThreadPoolExecutor(max_workers=args.jobs) as pool:
    for ex_id, size in pool.map(one, todo):
        done += 1
        if size:
            found[ex_id] = list(size)
        else:
            missing.append(ex_id)
        if done % 100 == 0:
            print(f"  ... {done}/{len(todo)}", flush=True)

# Anything already on disk from an earlier run still belongs in the manifest.
if not args.force and not args.dry:
    for p in OUT_DIR.glob("*.webp"):
        if p.stem not in found:
            with Image.open(p) as im:
                found[p.stem] = list(im.size)

total_bytes = sum((OUT_DIR / f"{i}.webp").stat().st_size for i in found if (OUT_DIR / f"{i}.webp").exists())

print()
print(f"stills:   {len(found)} / {len(published)}  ({round(100 * len(found) / len(published))}% of published)")
print(f"no clip:  {len(missing)}  — ordinary; the library does not cover most mobility or strongman work")
if total_bytes:
    print(f"size:     {total_bytes / 1024 / 1024:.1f} MB total, {total_bytes / len(found) / 1024:.1f} KB mean")
    dims = {tuple(v) for v in found.values()}
    print(f"dims:     {len(dims)} distinct, e.g. {sorted(dims)[:3]}")

if not args.dry:
    MANIFEST.write_text(json.dumps(dict(sorted(found.items())), indent=0), encoding="utf-8")
    print(f"written:  site/assets/exercise/<id>.webp + manifest.json")
else:
    print("(dry run — nothing written)")
