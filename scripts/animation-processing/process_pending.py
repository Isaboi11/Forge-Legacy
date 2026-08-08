"""Run every status=='queued' entry in pending-clips.json through process_clip, writing the output
NAMED BY CATALOG ID (so make_small / make_posters / upload are all 1:1, no rename table needed).

    python process_pending.py

Idempotent: skips an output that already exists. After this, run make_small.py and make_posters.py
(they glob Processed/ and skip what's done), QA, then upload the id-named loops + posters."""
import json, os, string
import process_clip

HERE = os.path.dirname(os.path.abspath(__file__))
PENDING = os.path.join(HERE, "pending-clips.json")

ANIM = "Forge Legacy Animations"

def anim_root():
    """The Seagate portable gets a different drive letter each time it's plugged in, so never trust a
    stored letter — scan for the volume that actually holds the library."""
    for L in string.ascii_uppercase:
        p = f"{L}:/{ANIM}"
        if os.path.isdir(os.path.join(p, "MP4")):
            return p
    raise RuntimeError(f"'{ANIM}' drive not mounted — plug in the Seagate.")

ROOT = anim_root()
PROC = os.path.join(ROOT, "Processed")

def remap(src):
    """Rewrite a stored 'X:/Forge Legacy Animations/...' path onto whatever letter ROOT is now."""
    s = src.replace("\\", "/")
    i = s.find(ANIM)
    return os.path.join(ROOT, s[i + len(ANIM) + 1:]) if i >= 0 else src

def _work_one(job):
    src, out, work, cid, g = job
    try:
        process_clip.main(src, out, work)
        return ("ok", g, cid)
    except Exception as ex:
        return (f"ERR:{ex!r}", g, cid)

def main():
    data = json.load(open(PENDING, encoding="utf-8"))
    jobs = []
    for e in data["pending"]:
        if e.get("status") != "queued":
            continue
        for g in ("male", "female"):
            src = e.get(f"{g}_src")
            if not src:
                continue
            src = remap(src)
            out = os.path.join(PROC, g, e["catalog_id"] + ".webp")
            if os.path.exists(out) and os.path.getsize(out) > 0:
                print("skip", g, e["catalog_id"], flush=True); continue
            if not os.path.isfile(src):
                print("MISSING SRC", g, e["catalog_id"], src, flush=True); continue
            # per-clip work dir (distinct by gender AND id) — safe to run in parallel
            work = os.path.join(PROC, g, "_work_" + e["catalog_id"])
            jobs.append((src, out, work, e["catalog_id"], g))

    import multiprocessing as mp
    print(f"processing {len(jobs)} clips across {min(4, mp.cpu_count())} workers ...", flush=True)
    done = err = 0
    with mp.Pool(min(4, mp.cpu_count())) as pool:
        for status, g, cid in pool.imap_unordered(_work_one, jobs):
            if status == "ok":
                done += 1; print("ok", g, cid, flush=True)
            else:
                err += 1; print(status, g, cid, flush=True)
    print(f"\nDONE processed={done} err={err}", flush=True)

if __name__ == "__main__":
    main()
