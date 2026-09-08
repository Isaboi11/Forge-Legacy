#!/usr/bin/env python3
"""
Rebuild the Craftsman numeral plates so I / II / III say I / II / III.

    python scripts/badges/craftsman-numerals.py            # write
    python scripts/badges/craftsman-numerals.py --preview  # render a sheet, touch nothing

Reads and writes `assets/artwork/ranks/craftsman-{1,2,3}[-paper].png` in place.

══ THE DEFECT ══

All four Craftsman masters carry **IV** on the numeral plate. Found on this side while wiring the Paper
set, and independently listed in the design's own handoff under "known source-art defects" —
*"Craftsman I–IV all show IV on the numeral plate. Needs the source art regenerated for tiers I–III."*

Until that regeneration happens the app shows an athlete at Craftsman I a badge that says IV, on the
Legacy hero, the Progress Hub, Rank Progression, the M-1 ceremony and the rank-ascension post.

══ WHY THIS IS NOT A FONT ══

Nothing here draws a numeral. The badge already contains a correctly lit, correctly weathered **I** —
the left third of its own IV — so each tier is rebuilt from its own glyph: lift the I, erase the group,
stamp it once, twice or three times. Same typeface, same bevel, same specular direction, same metal, same
plate, same compression artefacts. A drawn glyph would be the one thing on the badge that came from
somewhere else, and at this size (a 19×45 px glyph) it would show.

⚠ TIER IV IS NOT TOUCHED. Its numeral is already correct. It is also the file the handoff flags as a bad
crop, so it is the last one that should be edited by geometry.

══ WHY THE GEOMETRY IS HARDCODED ══

The same reason `die-cut.js` hardcodes its hexagons: these are eight specific files, measured once, and a
detector that gets it wrong fails silently by painting over the wrong part of a badge. An earlier attempt
here auto-located "the brightest cluster on the plate" and found the frame highlight instead.

Numbers below are the measured bright-core runs of each glyph — profiled at the 82nd percentile of the
plate band — plus the padding that recovers the serifs and the dark edge the core threshold misses.

⚠ THIS IS A STOPGAP AND SHOULD BE DELETED WHEN THE SOURCE ART IS REGENERATED. It is honest pixel surgery
on somebody else's artwork; the right fix is upstream. Re-running it after a re-delivery would stamp
glyphs onto already-correct numerals.
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RANKS = ROOT / "assets" / "artwork" / "ranks"

#: Per file: the I glyph's bright core, the V's right edge, the numeral band's rows, and the padding
#: that turns a bright core into the whole glyph. Tier 4 is absent because tier 4 is already correct.
GEOM = {
    "craftsman-1":       dict(i=(200, 208), vEnd=247, y=(446, 490), pad=6, ypad=3),
    "craftsman-2":       dict(i=(203, 212), vEnd=252, y=(446, 489), pad=6, ypad=3),
    "craftsman-3":       dict(i=(204, 213), vEnd=254, y=(446, 490), pad=6, ypad=3),
    "craftsman-1-paper": dict(i=(167, 175), vEnd=207, y=(374, 411), pad=5, ypad=3),
    "craftsman-2-paper": dict(i=(171, 178), vEnd=212, y=(374, 411), pad=5, ypad=3),
    "craftsman-3-paper": dict(i=(171, 179), vEnd=213, y=(374, 411), pad=5, ypad=3),
}
TIER = {"craftsman-1": 1, "craftsman-2": 2, "craftsman-3": 3}


def rebuild(name: str) -> Image.Image:
    g = GEOM[name]
    tier = TIER[name.replace("-paper", "")]
    a = np.asarray(Image.open(RANKS / f"{name}.png").convert("RGBA")).astype(np.float32)
    H, W = a.shape[:2]

    gx0, gx1 = g["i"][0] - g["pad"], g["vEnd"] + g["pad"]
    gy0, gy1 = g["y"][0] - g["ypad"], g["y"][1] + g["ypad"]
    ix0, ix1 = g["i"][0] - g["pad"], g["i"][1] + g["pad"]
    gw = ix1 - ix0 + 1
    centre = (gx0 + gx1) / 2.0
    pitch = gw + 2

    glyph = a[gy0:gy1 + 1, ix0:ix1 + 1].copy()
    out = a.copy()

    # ── erase ── refill the numeral band row by row from the plate on either side of it, so the plate's
    #    own vertical gradient and vignette survive. A flat fill reads as a patch at any size.
    for y in range(gy0, gy1 + 1):
        left = out[y, max(0, gx0 - 13):max(1, gx0 - 1), :3]
        right = out[y, min(W - 1, gx1 + 2):min(W, gx1 + 14), :3]
        ref = np.concatenate([left, right], axis=0)
        if ref.size:
            out[y, gx0:gx1 + 1, :3] = np.median(ref, axis=0)

    # ── the glyph's own soft mask ── how far each pixel stands above the plate it sits on. Taken after
    #    the erase, so the mask is measured against the surface the glyph is about to be stamped onto.
    plate = out[gy0:gy1 + 1, ix0:ix1 + 1, :3] @ [0.2126, 0.7152, 0.0722]
    lit = glyph[..., :3] @ [0.2126, 0.7152, 0.0722]
    lo = float(np.percentile(plate, 70))
    hi = float(np.percentile(lit, 98))
    m = np.clip((lit - lo) / max(hi - lo, 1e-6), 0.0, 1.0)[..., None]

    starts = [centre - (tier - 1) * pitch / 2.0 - gw / 2.0 + k * pitch for k in range(tier)]
    for sx in starts:
        x = int(round(sx))
        dst = out[gy0:gy1 + 1, x:x + gw, :3]
        out[gy0:gy1 + 1, x:x + gw, :3] = dst * (1 - m) + glyph[..., :3] * m

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def preview(path: Path) -> None:
    cells = []
    for suffix in ("", "-paper"):
        for t in (1, 2, 3):
            name = f"craftsman-{t}{suffix}"
            cells.append((name, rebuild(name)))
        four = f"craftsman-4{suffix}"
        cells.append((four, Image.open(RANKS / f"{four}.png").convert("RGBA")))
    W = 300
    tiles = []
    for name, im in cells:
        box = (int(im.width * 0.34), int(im.height * 0.78), int(im.width * 0.66), int(im.height * 0.95))
        c = im.crop(box)
        c = c.resize((W, round(W * c.height / c.width)), Image.LANCZOS)
        tiles.append((name, c))
    hgt = max(c.height for _, c in tiles)
    sheet = Image.new("RGB", (W * 4, hgt * 2), (20, 20, 22))
    for i, (name, c) in enumerate(tiles):
        row, col = divmod(i, 4)
        bg = Image.new("RGBA", (W, hgt), (20, 20, 22, 255) if row == 0 else (246, 242, 232, 255))
        bg.alpha_composite(c, (0, (hgt - c.height) // 2))
        sheet.paste(bg.convert("RGB"), (col * W, row * hgt))
    sheet.save(path)
    print(f"preview -> {path}   rows: Forge / Alabaster   cols: I  II  III  IV(untouched)")


def main() -> int:
    if "--preview" in sys.argv:
        preview(ROOT / "craftsman-numerals-preview.png")
        return 0
    for name in GEOM:
        rebuild(name).save(RANKS / f"{name}.png", optimize=True)
        print(f"  {name}.png  -> {TIER[name.replace('-paper', '')] * 'I'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
