"""
deliver_forge.py — the masters this review pass produced -> the two objects the bucket holds, then upload.

    python deliver_forge.py                 # deliver only; writes nothing to the bucket
    python deliver_forge.py 8               # ...with 8 workers
    python deliver_forge.py 8 --upload      # deliver + upload (needs SUPABASE_SERVICE_ROLE_KEY)

`deliver.py` already does this for ONE file and `deliver_alabaster.py` does it for the light theme.
Neither covers "every pick from the missing-animation review", which is 369 masters standing in for
420 catalogue slots, so this is the Forge-side batch equivalent. The encode constants are lifted from
`deliver.py` unchanged and deliberately: a clip that lands beside the existing ones must not make the
list view change weight.

══ ⚠ TWO OBJECTS PER SLOT, NOT ONE ══

The bucket holds a LOOP and a POSTER for every exercise:

    <sex>/<id>.webp            300px, every other frame, 12fps   — the demo
    poster/<sex>/<id>.webp     220px, a single frame             — what shows before it plays

`media.ts` derives both URLs rather than asking whether the object exists, so shipping loops without
posters does not degrade gracefully — it puts an empty frame under every new demo. 420 slots means
840 objects.

══ ⚠ 369 MASTERS, 420 SLOTS — THE FAN-OUT IS THE POINT ══

36 source clips serve more than one exercise (a suspension row standing in for the high and low
variants, a lever chest press for the converging one). Delivery therefore runs ONCE per master, and
the upload walks the targets — the same bytes land under several ids. Delivering per-slot would
re-encode the same frames up to five times.

══ ⚠ THE FILE'S FOLDER IS NOT THE TARGET'S SEX ══

`batch.py --by-gender` files a master by its SOURCE PATH; the bucket key uses the sex of the
EXERCISE. Those usually agree and, for this pass, always do — but the map carries both, and this
script reads the target's own `sex` rather than inferring it from where the file happens to sit.
`deliver_alabaster.py` documents three entries where the two disagree; nothing here should be the
place that reintroduces that bug.

══ ⚠ `source-map.json` IS EXTENDED ONLY AFTER A SUCCESSFUL UPLOAD ══

That file is what stops the Forge and Alabaster libraries drifting on which clip belongs to which
exercise. Writing it during a delivery-only run would claim a bucket object that is not there yet,
and the Alabaster pass reads it as truth.
"""

from pathlib import Path
import json
import multiprocessing as mp
import os
import sys

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"

# ---- encode: every one of these matches deliver.py. Do not "improve" them in isolation. ----
LOOP_H = 300
LOOP_FPS = 12      # every other frame of the 24fps master
POSTER_H = 220
QUALITY = 74
METHOD = 4
MINIMIZE = True

BUCKET = "exercise-media"


def anim_root() -> Path:
    """Same scan as serve_review.mjs and deliver_alabaster.py — the drive is not promised a letter."""
    for letter in "FGHIJKLMNOPQRSTUVWXYZABCDE":
        p = Path(letter + ":\\Forge Legacy Animations")
        if p.exists():
            return p
    return Path("F:\\Forge Legacy Animations")


def frames_of(master: Path):
    im = Image.open(master)
    out = []
    try:
        while True:
            out.append(im.convert("RGBA").copy())
            im.seek(im.tell() + 1)
    except EOFError:
        pass
    return out


def write_loop(frames, dst: Path) -> None:
    fr = frames[::2]
    w, h = fr[0].size
    nw = max(1, round(w * LOOP_H / h))
    fr = [f.resize((nw, LOOP_H), Image.LANCZOS) for f in fr]
    tmp = dst.with_suffix(".tmp")
    fr[0].save(tmp, "WEBP", save_all=True, append_images=fr[1:], duration=int(1000 / LOOP_FPS),
               loop=0, quality=QUALITY, method=METHOD, minimize_size=MINIMIZE)
    os.replace(tmp, dst)  # atomic — a resumable run must never see a half file


def write_poster(frames, dst: Path) -> None:
    """A tenth of the way in, not frame 0 — the same sample point deliver_alabaster.py uses."""
    f = frames[min(len(frames) - 1, max(1, len(frames) // 10))]
    w, h = f.size
    nw = max(1, round(w * POSTER_H / h))
    tmp = dst.with_suffix(".tmp")
    f.resize((nw, POSTER_H), Image.LANCZOS).save(tmp, "WEBP", quality=QUALITY, method=METHOD)
    os.replace(tmp, dst)


def _deliver_one(job):
    """One master -> loop + poster. Returns (rel, ok, note)."""
    master, loop_out, poster_out, rel = (Path(job[0]), Path(job[1]), Path(job[2]), job[3])
    try:
        if loop_out.exists() and poster_out.exists():
            return (rel, True, "skip")
        fr = frames_of(master)
        if not fr:
            return (rel, False, "no frames")
        if not loop_out.exists():
            write_loop(fr, loop_out)
        if not poster_out.exists():
            write_poster(fr, poster_out)
        return (rel, True, "ok")
    except Exception as e:  # noqa: BLE001 — one bad clip must not take the run down
        return (rel, False, type(e).__name__ + ": " + str(e)[:120])


def main() -> int:
    do_upload = "--upload" in sys.argv
    workers = next((int(a) for a in sys.argv[1:] if a.isdigit()), max(2, (os.cpu_count() or 4) - 2))

    root = anim_root()
    masters = root / "Processed"
    small = root / "Processed_small"
    posters = root / "Posters"

    umap = json.loads((OUT / "upload_map.json").read_text(encoding="utf-8"))
    slots = sum(len(v) for v in umap.values())

    client = None
    if do_upload:
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
        if not key or not url:
            raise SystemExit(
                "!! --upload needs SUPABASE_SERVICE_ROLE_KEY and EXPO_PUBLIC_SUPABASE_URL in the env. "
                "The bucket is public-READ with no insert policy (0116), by design - writes are a "
                "service-key or dashboard job. Export it for this command only; do not commit it.")
        from supabase import create_client
        client = create_client(url, key)

    jobs, no_master = [], []
    for rel in umap:
        src = masters / rel
        if not src.exists():
            no_master.append(rel)
            continue
        for d in (small, posters):
            (d / rel).parent.mkdir(parents=True, exist_ok=True)
        jobs.append((str(src), str(small / rel), str(posters / rel), rel))

    print(str(len(jobs)) + " masters -> " + str(slots) + " catalogue slots | " +
          str(workers) + " workers" +
          (" | " + str(len(no_master)) + " WITHOUT A MASTER" if no_master else ""), flush=True)
    for rel in no_master[:5]:
        print("   !! no master: " + rel, flush=True)

    ok, bad = 0, []
    with mp.Pool(workers) as pool:
        for i, (rel, good, note) in enumerate(pool.imap_unordered(_deliver_one, jobs), 1):
            if good:
                ok += 1
            else:
                bad.append(rel + " (" + note + ")")
            if i % 25 == 0 or i == len(jobs):
                print("  " + str(i) + "/" + str(len(jobs)) + "  ok=" + str(ok) +
                      " failed=" + str(len(bad)), flush=True)
    print("delivered " + str(ok) + "/" + str(len(jobs)), flush=True)
    for b in bad[:10]:
        print("   !! " + b, flush=True)

    if not do_upload:
        print("\n(no --upload: nothing was written to the bucket)", flush=True)
        return 0 if not bad else 1

    # ---- upload: one master can serve several ids, so this walks TARGETS, not files ----
    up, fail = 0, []
    done_pairs = []
    for rel, targets in umap.items():
        loop_p, poster_p = small / rel, posters / rel
        if not (loop_p.exists() and poster_p.exists()):
            fail.append(rel + " (not delivered)")
            continue
        loop_bytes, poster_bytes = loop_p.read_bytes(), poster_p.read_bytes()
        for t in targets:
            keys = ((t["sex"] + "/" + t["id"] + ".webp", loop_bytes),
                    ("poster/" + t["sex"] + "/" + t["id"] + ".webp", poster_bytes))
            try:
                for key_, blob in keys:
                    client.storage.from_(BUCKET).upload(
                        key_, blob,
                        {"content-type": "image/webp", "cache-control": "31536000", "upsert": "true"})
                up += 1
                done_pairs.append((t["sex"], t["id"], rel))
            except Exception as e:  # noqa: BLE001
                fail.append(t["sex"] + "/" + t["id"] + ": " + str(e)[:120])
            if (up + len(fail)) % 50 == 0:
                print("  uploaded " + str(up) + "/" + str(slots) + " failed=" + str(len(fail)), flush=True)
    print("uploaded " + str(up) + "/" + str(slots) + " slots" +
          (" | FAILED " + str(len(fail)) if fail else ""), flush=True)
    for f in fail[:10]:
        print("   !! " + f, flush=True)

    # ---- only now is the map allowed to claim these exist ----
    smp_path = HERE / "source-map.json"
    smp = json.loads(smp_path.read_text(encoding="utf-8"))
    decisions = json.loads((OUT / "decisions.json").read_text(encoding="utf-8"))
    added = 0
    for sex, ident, rel in done_pairs:
        k = sex + "/" + ident
        if k in smp["map"]:
            continue
        dec = decisions.get(sex + "::" + ident, {})
        src = (dec.get("path") or "").replace("\\", "/")
        i = src.find("/MP4/")
        smp["map"][k] = {
            "id": ident,
            "variant": sex,
            "processed": rel.split("/")[-1],
            "source": src[i + 1:] if i >= 0 else None,
            "via_review": True,
            **({"approximate": True, "note": dec.get("note", "")} if dec.get("approximate") else {}),
        }
        added += 1
    smp["_counts"] = {**smp.get("_counts", {}), "mapped": len(smp["map"])}
    tmp = smp_path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(smp, indent=1, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, smp_path)
    print("source-map.json: +" + str(added) + " entries (now " + str(len(smp["map"])) + ")", flush=True)

    return 0 if not fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
