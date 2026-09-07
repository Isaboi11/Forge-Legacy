"""
upload_fixed.py — push a tree of re-cut loops (fix_flicker.py --tree output) over the live bucket objects.

    python upload_fixed.py <fixed_dir>              # upsert every loop under <fixed_dir> (+ posters whose frame moved)
    python upload_fixed.py <fixed_dir> --dry-run    # list the keys, write nothing

<fixed_dir> is laid out <theme>/<sex>/<id>.webp with theme = forge | paper, and carries the report.json
fix_flicker.py wrote beside it. Keys follow media.ts:

    forge/<sex>/<id>.webp  ->  <sex>/<id>.webp                 poster/<sex>/<id>.webp
    paper/<sex>/<id>.webp  ->  paper/<sex>/<id>.webp           poster/paper/<sex>/<id>.webp

A poster is the loop's frame len//10 at 220px (deliver_forge.write_poster). It is re-cut from the fixed loop
ONLY when that frame is in the report's `changed_frames` — the live posters were cut from the 720h masters
and a 300p re-cut is a downgrade when nothing moved.

Needs SUPABASE_SERVICE_ROLE_KEY and EXPO_PUBLIC_SUPABASE_URL in the env for this command only; never commit
either. The bucket is public-read with no insert policy (0116) by design. Without the service key, the
alternative is a temporary write window: `supabase/apply/exercise-media-upload-window.sql` grants anon
insert+update on the bucket, the upload runs with SUPABASE_UPLOAD_KEY=<anon key>, and the same file's
CLOSE block drops the grant again — minutes, not a migration. Objects are served with
cache-control 31536000, so a client that has already cached a loop keeps the old one until its URL changes —
media.ts appends MEDIA_REV for exactly that reason; bump it when this runs.
"""
import json
import os
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image

BUCKET = "exercise-media"
POSTER_H = 220
QUALITY = 74
METHOD = 4


def poster_bytes(loop_path: Path) -> bytes:
    im = Image.open(loop_path)
    n = getattr(im, "n_frames", 1)
    im.seek(min(n - 1, max(1, n // 10)))
    f = im.convert("RGBA")
    w, h = f.size
    nw = max(1, round(w * POSTER_H / h))
    buf = BytesIO()
    f.resize((nw, POSTER_H), Image.LANCZOS).save(buf, "WEBP", quality=QUALITY, method=METHOD)
    return buf.getvalue()


def poster_index(n_frames: int) -> int:
    return min(n_frames - 1, max(1, n_frames // 10))


def main(argv):
    if len(argv) < 2:
        raise SystemExit(__doc__)
    root = Path(argv[1])
    dry = "--dry-run" in argv
    report_p = root / "report.json"
    report = json.loads(report_p.read_text()) if report_p.exists() else {}

    jobs = []   # (key, path-or-bytes, kind)
    for p in sorted(root.rglob("*.webp")):
        rel = str(p.relative_to(root)).replace("\\", "/")
        theme, sex, name = rel.split("/")
        if theme not in ("forge", "paper") or sex not in ("male", "female"):
            print("!! skipping unexpected path", rel)
            continue
        prefix = "paper/" if theme == "paper" else ""
        jobs.append((prefix + sex + "/" + name, p, "loop"))
        st = report.get(rel)
        if st and st.get("changed") and poster_index(int(st["frames"])) in st.get("changed_frames", []):
            jobs.append(("poster/" + prefix + sex + "/" + name, p, "poster"))

    loops = sum(1 for j in jobs if j[2] == "loop")
    posters = len(jobs) - loops
    print(len(jobs), "objects:", loops, "loops,", posters, "posters", "(dry run)" if dry else "")
    if dry:
        for k, _, kind in jobs:
            print("  ", kind, k)
        return

    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_UPLOAD_KEY")
    url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    if not key or not url:
        raise SystemExit("!! needs SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_UPLOAD_KEY inside an open write window) "
                         "and EXPO_PUBLIC_SUPABASE_URL in the env (export for this command only; do not commit).")
    from supabase import create_client
    client = create_client(url, key)

    done_p = root / "uploaded.json"
    done = set(json.loads(done_p.read_text())) if done_p.exists() else set()
    ok = fail = 0
    for i, (k, p, kind) in enumerate(jobs, 1):
        if k in done:
            continue
        blob = poster_bytes(p) if kind == "poster" else p.read_bytes()
        try:
            client.storage.from_(BUCKET).upload(
                k, blob, {"content-type": "image/webp", "cache-control": "31536000", "upsert": "true"})
            ok += 1
            done.add(k)
        except Exception as e:  # noqa: BLE001
            fail += 1
            print("!! failed", k, repr(e)[:160])
        if i % 50 == 0:
            done_p.write_text(json.dumps(sorted(done)))   # resumable
            print(i, "/", len(jobs), "ok", ok, "failed", fail, flush=True)
    done_p.write_text(json.dumps(sorted(done)))
    print("done: ok", ok, "failed", fail, "already", len(done) - ok)


if __name__ == "__main__":
    main(sys.argv)
