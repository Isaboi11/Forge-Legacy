#!/usr/bin/env python3
"""
deliver_alabaster.py — Alabaster masters -> the two files the bucket holds, then upload them.

    python deliver_alabaster.py            # deliver only (no key needed)
    python deliver_alabaster.py --upload   # deliver + upload (needs SUPABASE_SERVICE_ROLE_KEY)

Reads  F:/Forge Legacy Animations/Alabaster/<variant>/<processed>.webp   (720h masters, FL_THEME=paper)
Writes F:/Forge Legacy Animations/Alabaster_small/<variant>/<id>.webp    (300h loop, 12fps)
       F:/Forge Legacy Animations/Alabaster_posters/<variant>/<id>.webp  (220h still, 1 frame)
Uploads to  exercise-media/paper/<variant>/<id>.webp
            exercise-media/poster/paper/<variant>/<id>.webp

══ WHY A SECOND RENDER EXISTS AT ALL ══

The target-muscle colour is BAKED into every clip — `process_clip.py` remaps the source render's red
highlight to the app's bronze — so a light theme needs its own pass, not a tint at display time.
Alabaster's muscle is the dense antique brass of the Start Workout button (`#836A3E`); Forge's is a
brighter bronze that glows on near-black. Neither works on the other's ground.

⚠ A CHEAPER PATH WAS TRIED FIRST AND DOES NOT WORK. Re-grading the EXISTING Forge masters (bronze ->
bronze, no re-matte) would have taken ~20 minutes instead of ~5 hours, and on the first test clip it
landed within 2 channel values of a true re-render. On a second, independent clip it was off by 29.
The Forge pass is LOSSY — it clamps saturation into [110,150] and lifts V by 1.12, which clips at 255
by a different amount on every clip depending on its exposure — so no single constant inverts it. The
first clip simply happened to fit. Hence the full re-run from MP4.

══ NAMING ══

The masters are named after their SOURCE clip (`Air-Bike-_male__Waist-FIX.webp`); the bucket is keyed
by CATALOG ID (`air-bike.webp`). `source-map.json` is the bridge and is the same map the Forge upload
used, so the two themes cannot drift apart on which clip belongs to which exercise.

⚠ ROUTED BY THE MAP'S `variant`, NOT BY THE SOURCE PATH. Three female exercises use a clip that lives
under `MP4/MALE`, so `batch.py --by-gender` would file them as male. This script never guesses.

⚠ THE APP IS NOT POINTED AT THESE PATHS YET, AND MUST NOT BE UNTIL THIS HAS RUN WITH --upload.
`media.ts` derives its URL rather than asking whether the object exists (a HEAD per exercise to answer
what the image load answers for free), so adding the `paper/` segment before the objects are there
turns every Alabaster demo into an empty frame. The one-line change is held in
`scratchpad/media-theme-prefix.patch` and applied in the SAME pass as the upload. It is:

    const THEME_PREFIX = IS_PAPER ? 'paper/' : '';
    ... getPublicUrl(`${THEME_PREFIX}${demoVariant(sex)}/${id}.webp`)
    ... getPublicUrl(`poster/${THEME_PREFIX}${demoVariant(sex)}/${id}.webp`)

⚠ TWELVE ENTRIES HAVE NO USABLE SOURCE MP4 (`_counts.no_source_file` in the map). They cannot be
re-rendered. `--upload` copies their FORGE object to the Alabaster key instead, so an Alabaster athlete
sees a slightly-too-warm demo rather than an empty frame — the better of the two failures.
"""

from pathlib import Path
import json
import os
import string
import sys

from PIL import Image

HERE = Path(__file__).resolve().parent

LOOP_H = 300      # matches deliver.py — the bucket's existing loops are this tall
LOOP_FPS = 12     # every other frame of the 24fps master
POSTER_H = 220    # matches the existing posters
QUALITY = 74

BUCKET = "exercise-media"


def anim_root() -> Path:
    """The Seagate gets a different letter each time it is plugged in — scan, never trust a stored one."""
    for L in string.ascii_uppercase:
        p = Path(f"{L}:/Forge Legacy Animations")
        if p.is_dir():
            return p
    raise SystemExit("!! 'Forge Legacy Animations' not found on any drive — is the Seagate plugged in?")


def frames_of(path: Path) -> list[Image.Image]:
    im = Image.open(path)
    out = []
    try:
        while True:
            out.append(im.convert("RGBA").copy())
            im.seek(im.tell() + 1)
    except EOFError:
        pass
    return out


def write_loop(frames: list[Image.Image], dst: Path) -> None:
    fr = frames[::2]
    w, h = fr[0].size
    nw = max(1, round(w * LOOP_H / h))
    fr = [f.resize((nw, LOOP_H), Image.LANCZOS) for f in fr]
    dst.parent.mkdir(parents=True, exist_ok=True)
    fr[0].save(dst, "WEBP", save_all=True, append_images=fr[1:], duration=int(1000 / LOOP_FPS),
               loop=0, quality=QUALITY, method=6)


def write_poster(frames: list[Image.Image], dst: Path) -> None:
    """One still. Not frame 0 — a tenth of a second in, the same place the app samples video posters."""
    f = frames[min(len(frames) - 1, max(1, len(frames) // 10))]
    w, h = f.size
    nw = max(1, round(w * POSTER_H / h))
    dst.parent.mkdir(parents=True, exist_ok=True)
    f.resize((nw, POSTER_H), Image.LANCZOS).save(dst, "WEBP", quality=QUALITY, method=6)


def main() -> int:
    do_upload = "--upload" in sys.argv
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
                "!! --upload needs SUPABASE_SERVICE_ROLE_KEY and EXPO_PUBLIC_SUPABASE_URL in the env.\n"
                "   The bucket is public-READ with no insert policy (0116), by design — writes are a\n"
                "   service-key or dashboard job. Do not commit the key; export it for this command only."
            )
        from supabase import create_client  # imported here so delivery works without the dependency
        client = create_client(url, key)

    done = missing = uploaded = fallback = 0
    for k, v in m.items():
        variant, ident, processed = v["variant"], v["id"], v["processed"]
        master = masters / variant / processed
        loop_out = small / variant / f"{ident}.webp"
        poster_out = posters / variant / f"{ident}.webp"

        if not master.exists():
            missing += 1
            if do_upload:
                # No Alabaster render possible (no source MP4). Copy the Forge object so the demo is
                # merely warm rather than absent — see the note at the top.
                try:
                    for src_key, dst_key in (
                        (f"{variant}/{ident}.webp", f"paper/{variant}/{ident}.webp"),
                        (f"poster/{variant}/{ident}.webp", f"poster/paper/{variant}/{ident}.webp"),
                    ):
                        client.storage.from_(BUCKET).copy(src_key, dst_key)
                    fallback += 1
                except Exception as e:  # noqa: BLE001 — a missing fallback is not worth failing the run
                    print(f"  !! fallback copy failed for {variant}/{ident}: {e}")
            continue

        if not (loop_out.exists() and poster_out.exists()):
            fr = frames_of(master)
            if not fr:
                print(f"  !! no frames in {master.name}")
                continue
            if not loop_out.exists():
                write_loop(fr, loop_out)
            if not poster_out.exists():
                write_poster(fr, poster_out)
        done += 1

        if do_upload:
            for path, key_ in ((loop_out, f"paper/{variant}/{ident}.webp"),
                               (poster_out, f"poster/paper/{variant}/{ident}.webp")):
                client.storage.from_(BUCKET).upload(
                    key_, path.read_bytes(),
                    {"content-type": "image/webp", "cache-control": "31536000", "upsert": "true"},
                )
            uploaded += 1

        if done % 50 == 0:
            print(f"  {done} delivered" + (f" · {uploaded} uploaded" if do_upload else ""))

    print(f"\ndelivered {done} · masters missing {missing}" +
          (f" · uploaded {uploaded} · forge-fallback copies {fallback}" if do_upload else ""))
    if missing and not do_upload:
        print("   (missing = the Alabaster batch has not reached them yet, or they have no source MP4)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
