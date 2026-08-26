#!/usr/bin/env python3
"""
deliver_alabaster.py — Alabaster masters -> the two files the bucket holds, then upload them.

    python deliver_alabaster.py [workers]            # deliver only (no key needed)
    python deliver_alabaster.py [workers] --upload   # deliver + upload (needs SUPABASE_SERVICE_ROLE_KEY)

Reads  <drive>:/Forge Legacy Animations/Alabaster/<variant>/<processed>.webp   (720h, FL_THEME=paper)
Writes <drive>:/Forge Legacy Animations/Alabaster_small/<variant>/<id>.webp    (300h loop, 12fps)
       <drive>:/Forge Legacy Animations/Alabaster_posters/<variant>/<id>.webp  (220h still, 1 frame)
Uploads to  exercise-media/paper/<variant>/<id>.webp
            exercise-media/poster/paper/<variant>/<id>.webp

══ WHY A SECOND RENDER EXISTS AT ALL ══

The target-muscle colour is BAKED into every clip — `process_clip.py` remaps the source render's red
highlight to the app's bronze — so a light theme needs its own pass, not a tint at display time.
Alabaster's muscle is the dense antique brass of the Start Workout button (`#836A3E`); Forge's is a
brighter bronze that glows on near-black. Neither works on the other's ground.

⚠ A CHEAPER PATH WAS TRIED FIRST AND DOES NOT WORK. Re-grading the EXISTING Forge masters (bronze ->
bronze, no re-matte) would have taken ~20 minutes instead of ~8 hours, and on the first test clip it
landed within 2 channel values of a true re-render. On a second, independent clip it was off by 29.
The Forge pass is LOSSY — it clamps saturation into [110,150] and lifts V by 1.12, which clips at 255
by a different amount on every clip depending on its exposure — so no single constant inverts it. The
first clip simply happened to fit. One validation sample would have shipped a subtly wrong library.

══ NAMING ══

The masters are named after their SOURCE clip (`Air-Bike-_male__Waist-FIX.webp`); the bucket is keyed
by CATALOG ID (`air-bike.webp`). `source-map.json` is the bridge and is the same map the Forge upload
used, so the two themes cannot drift apart on which clip belongs to which exercise.

⚠ ROUTED BY THE MAP'S `variant`, NOT BY THE SOURCE PATH. Three female exercises use a clip that lives
under `MP4/MALE`, so `batch.py --by-gender` would file them as male. This script never guesses.

⚠ THE APP IS NOT POINTED AT THESE PATHS UNTIL THIS HAS RUN WITH --upload. `media.ts` derives its URL
rather than asking whether the object exists (a HEAD per exercise to answer what the image load answers
for free), so adding the `paper/` segment before the objects are there turns every Alabaster demo into
an empty frame. The one-line change is applied in the SAME pass as the upload. It is:

    const THEME_PREFIX = IS_PAPER ? 'paper/' : '';
    ... getPublicUrl(THEME_PREFIX + demoVariant(sex) + '/' + id + '.webp')
    ... getPublicUrl('poster/' + THEME_PREFIX + demoVariant(sex) + '/' + id + '.webp')

⚠ SOME ENTRIES HAVE NO USABLE SOURCE MP4 and cannot be re-rendered. `--upload` copies their FORGE
object to the Alabaster key instead, so those athletes see a slightly-too-warm demo rather than an
empty frame — the better of the two failures.
"""

from pathlib import Path
import json
import multiprocessing as mp
import os
import string
import sys

from PIL import Image

HERE = Path(__file__).resolve().parent

LOOP_H = 300      # matches deliver.py — the bucket's existing loops are this tall
LOOP_FPS = 12     # every other frame of the 24fps master
POSTER_H = 220    # matches the existing posters
QUALITY = 74

# ⚠ `method=4` AND `minimize_size`, COPIED FROM `deliver.py` RATHER THAN CHOSEN.
#
# This started at `method=6` — the slowest, smallest setting — on the reasoning that better is better.
# It was wrong twice over. It made delivery ~2 MINUTES PER CLIP (24 hours for the library, against ~2
# at these settings), and more importantly it produces a DIFFERENT ENCODE from the ~700 Forge clips
# already in the bucket. `deliver.py` documents exactly why its numbers are not invented: a
# re-processed clip has to "drop in beside the existing ones without the list view suddenly changing
# weight". An Alabaster library encoded differently from its Forge twin is that same defect.
METHOD = 4
MINIMIZE = True

BUCKET = "exercise-media"


def anim_root() -> Path:
    """The Seagate gets a different letter each time it is plugged in — scan, never trust a stored one."""
    for L in string.ascii_uppercase:
        p = Path(L + ":/Forge Legacy Animations")
        if p.is_dir():
            return p
    raise SystemExit("!! 'Forge Legacy Animations' not found on any drive — is the Seagate plugged in?")


def frames_of(path: Path):
    im = Image.open(path)
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
    """One still. Not frame 0 — a tenth of the way in, the same place the app samples video posters."""
    f = frames[min(len(frames) - 1, max(1, len(frames) // 10))]
    w, h = f.size
    nw = max(1, round(w * POSTER_H / h))
    tmp = dst.with_suffix(".tmp")
    f.resize((nw, POSTER_H), Image.LANCZOS).save(tmp, "WEBP", quality=QUALITY, method=METHOD)
    os.replace(tmp, dst)


def _deliver_one(job):
    """One master -> loop + poster. Runs in a worker process; returns (id, variant, ok)."""
    master, loop_out, poster_out, ident, variant = job
    master, loop_out, poster_out = Path(master), Path(loop_out), Path(poster_out)
    try:
        if loop_out.exists() and poster_out.exists():
            return (ident, variant, True)
        fr = frames_of(master)
        if not fr:
            return (ident, variant, False)
        if not loop_out.exists():
            write_loop(fr, loop_out)
        if not poster_out.exists():
            write_poster(fr, poster_out)
        return (ident, variant, True)
    except Exception:  # noqa: BLE001 — one bad clip must not take the run down
        return (ident, variant, False)


def main() -> int:
    do_upload = "--upload" in sys.argv
    workers = next((int(a) for a in sys.argv[1:] if a.isdigit()), max(2, (os.cpu_count() or 4) - 2))
    root = anim_root()
    masters = root / "Alabaster"
    small = root / "Alabaster_small"
    posters = root / "Alabaster_posters"

    m = json.loads((HERE / "source-map.json").read_text(encoding="utf-8"))["map"]

    client = None
    if do_upload:
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
        if not key or not url:
            raise SystemExit(
                "!! --upload needs SUPABASE_SERVICE_ROLE_KEY and EXPO_PUBLIC_SUPABASE_URL in the env. "
                "The bucket is public-READ with no insert policy (0116), by design - writes are a "
                "service-key or dashboard job. Do not commit the key; export it for this command only."
            )
        from supabase import create_client
        client = create_client(url, key)

    for variant in ("male", "female"):
        (small / variant).mkdir(parents=True, exist_ok=True)
        (posters / variant).mkdir(parents=True, exist_ok=True)

    jobs = []
    no_master = []
    for v in m.values():
        variant = v["variant"]
        ident = v["id"]
        src = masters / variant / v["processed"]
        if not src.exists():
            no_master.append((variant, ident))
            continue
        jobs.append((str(src), str(small / variant / (ident + ".webp")),
                     str(posters / variant / (ident + ".webp")), ident, variant))

    print(str(len(jobs)) + " to deliver | " + str(len(no_master)) +
          " without an Alabaster master | " + str(workers) + " workers", flush=True)

    ok = 0
    bad = []
    with mp.Pool(workers) as pool:
        for i, (ident, variant, good) in enumerate(pool.imap_unordered(_deliver_one, jobs), 1):
            if good:
                ok += 1
            else:
                bad.append(variant + "/" + ident)
            if i % 50 == 0:
                print("  " + str(i) + "/" + str(len(jobs)) + "  ok=" + str(ok) +
                      " failed=" + str(len(bad)), flush=True)
    print("delivered " + str(ok) + "/" + str(len(jobs)) +
          (" | FAILED " + str(len(bad)) + ": " + ", ".join(bad[:5]) if bad else ""), flush=True)

    if not do_upload:
        if no_master:
            print("   " + str(len(no_master)) +
                  " entries have no Alabaster master - --upload copies their Forge object")
        return 0

    up = 0
    fb = 0
    for v in m.values():
        variant = v["variant"]
        ident = v["id"]
        loop_out = small / variant / (ident + ".webp")
        poster_out = posters / variant / (ident + ".webp")
        try:
            if loop_out.exists() and poster_out.exists():
                pairs = ((loop_out, "paper/" + variant + "/" + ident + ".webp"),
                         (poster_out, "poster/paper/" + variant + "/" + ident + ".webp"))
                for path, key_ in pairs:
                    client.storage.from_(BUCKET).upload(
                        key_, path.read_bytes(),
                        {"content-type": "image/webp", "cache-control": "31536000", "upsert": "true"})
                up += 1
            else:
                # No Alabaster render possible - copy the Forge object so the demo is merely warm
                # rather than absent. See the note at the top of the file.
                copies = ((variant + "/" + ident + ".webp", "paper/" + variant + "/" + ident + ".webp"),
                          ("poster/" + variant + "/" + ident + ".webp",
                           "poster/paper/" + variant + "/" + ident + ".webp"))
                for a, b in copies:
                    client.storage.from_(BUCKET).copy(a, b)
                fb += 1
        except Exception as e:  # noqa: BLE001
            print("  !! " + variant + "/" + ident + ": " + str(e), flush=True)
        if (up + fb) % 100 == 0:
            print("  uploaded " + str(up) + " | forge-fallback " + str(fb), flush=True)

    print("uploaded " + str(up) + " | forge-fallback copies " + str(fb), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
