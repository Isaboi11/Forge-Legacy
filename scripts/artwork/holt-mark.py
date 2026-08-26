#!/usr/bin/env python3
"""Strike BOTH of Coach Holt's medallions from the one master.

    python scripts/artwork/holt-mark.py

Reads  assets/images/coach-holt-mark.master.png   (the pristine artwork, NEVER written)
Writes assets/images/coach-holt-mark.png          (Forge, shipped)
       assets/images/coach-holt-mark-paper.png    (Alabaster, shipped)

⚠ THIS SUPERSEDES `holt-mark-paper.py`. That script read the SHIPPED Forge file as its source
  and wrote only the Paper variant. Both shipped files are now generated output, so its source
  would be an already-processed image — running it re-ramps a ramp. It has been left in place
  with a deprecation banner; this is the one to run.

══ WHAT THIS FIXES, MEASURED ══

PO, 2026-08-26: *"I don't know if I like the 3d look of it. The sliver on the right side that's
outside of the outline"* — and earlier, that the light variant read worse than the dark one.

Two separate defects, both measured on the shipped assets rather than eyeballed.

1. THE SLIVER IS SHADING, NOT AN EDGE. Reading outward from the coin's fitted centre
   (192.5, 207.0 in master pixels):

       R < 152      field + figure
       R 153-157    a DARK ring, median luminance 4 of 255   <- the 3D disc's bevel
       R 159-173    the rim
       R > 174      nothing

   That trench runs the whole way round. Where the light catches it (lower-left) it fills with
   bronze and the rim reads as part of the coin; where it does not (upper-right) it stays black
   and the rim's highlight floats free as a thin crescent. Cropping was tried first and does
   nothing, because there is no stray geometry to crop — so the trench is filled with the
   field's own colour and the rim is redrawn as one flat ring.

2. ALABASTER COLLAPSED THE FIGURE INTO THE FIELD. Measured inside the coin, relief against field:

       Forge master          3.89 : 1
       Paper (old ramp)      1.58 : 1   <- the light-mode complaint
       Paper (this script)   4.08 : 1
       Forge (this script)   6.48 : 1

   The old ramp (#765B44 -> #C99767, gamma 0.80) squeezed the whole medallion into luminance
   95-158. Widening it to #745730 -> #F7E9D0 with the midtones pushed apart lands Paper on
   Forge's separation, and the disc still measures 5.6:1 against Alabaster's #F4F0E6 page
   (up from 4.9:1) - so it gained presence rather than punching a hole.

⚠ THE LIGHT END STOPS AT WARM IVORY ON PURPOSE. `holt-mark-paper.py`'s header already recorded
  that neutral-ended ramps come out PEWTER. Confirmed again here: pushing the light end to
  near-white (#FDF7EC) scores better on separation and renders as a silver coach on bronze.
  #F7E9D0 is the furthest the ramp goes while the metal still reads as bronze.

⚠ FORGE IS TONED, NOT RE-RAMPED. Its lift is applied as a per-pixel gain on the master's own
  RGB, so the rim keeps reading as a different piece of metal from the field. Mapping Forge
  through a luminance ramp the way Paper is mapped flattens that colour variation.
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets' / 'images' / 'coach-holt-mark.master.png'
OUT_FORGE = ROOT / 'assets' / 'images' / 'coach-holt-mark.png'
OUT_PAPER = ROOT / 'assets' / 'images' / 'coach-holt-mark-paper.png'

# ── coin geometry in master pixels, fitted to the rim (see module docstring) ──────────
CX, CY = 192.5, 207.0
R_FIELD = 159.0          # field + figure kept inside this
R_OUT = 173.0            # the coin's true outer edge
TRENCH_FROM = 143.0      # where to start hunting the bevel trench

# ── per-theme metal ──────────────────────────────────────────────────────────────────
PAPER_RAMP = ((116, 87, 49), (247, 233, 208))   # #745731 -> #F7E9D0
PAPER_GAMMA, PAPER_SHARPEN = 0.90, 1.70
FORGE_ENDS = (11, 233)                           # the master's own luminance endpoints
FORGE_SHARPEN = 1.10

RIM = {
    'forge': ((88, 67, 44), (226, 190, 148)),
    # Paper's highlight stops well short of the page (#F4F0E6) so the coin keeps a
    # silhouette against cream instead of dissolving into it at the lit edge.
    'paper': ((116, 87, 49), (214, 177, 126)),
}
SEAM = {'forge': (26, 20, 15), 'paper': (122, 95, 58)}
LIGHT_DEG = 225.0        # one light source, upper-left
CROWN = 0.45             # how much the ring brightens across its width


def _lum(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def _denoise(lum, k=3):
    """A median kernel: kills the struck field's speckle without rounding the relief's
    edges the way a blur does. The speckle is detail at 200px and mush below about 48."""
    return np.asarray(
        Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(k)),
        dtype=float)


def _tone(lum, sharpen, gamma):
    """Normalise on the master's own 1st-99th percentile, then push the midtones apart.

    ⚠ PERCENTILE, NOT [0,255]. The master is very dark (median luminance 11), so a linear
      map puts the entire coin within a few percent of the dark end - a flat disc with no
      relief. This is the same reasoning `holt-mark-paper.py` recorded."""
    lo, hi = np.percentile(lum, 1), np.percentile(lum, 99)
    t = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)
    t = np.clip(0.5 + (t - 0.5) * sharpen, 0, 1)
    return t ** gamma


def _load():
    if not SRC.exists():
        sys.exit('missing master: %s\n(it is the pristine artwork; restore it from git history '
                 'rather than pointing this script at a shipped file)' % SRC)
    return Image.open(SRC).convert('RGBA')


def forge_plate():
    im = _load()
    rgb = np.asarray(im.convert('RGB')).astype(float)
    old = _lum(rgb)
    clean = _denoise(old)
    t = _tone(clean, FORGE_SHARPEN, 1.0)
    target = FORGE_ENDS[0] + (FORGE_ENDS[1] - FORGE_ENDS[0]) * t
    gain = np.clip(target / np.maximum(clean, 1.0), 0, 6)[..., None]
    base = rgb * (np.maximum(clean, 1.0) / np.maximum(old, 1.0))[..., None]
    return np.clip(base * gain, 0, 255)


def paper_plate():
    im = _load()
    rgb = np.asarray(im.convert('RGB')).astype(float)
    lum = _denoise(_lum(rgb))
    t = _tone(lum, PAPER_SHARPEN, PAPER_GAMMA)
    d, l = np.array(PAPER_RAMP[0], float), np.array(PAPER_RAMP[1], float)
    return np.clip(d + (l - d) * t[..., None], 0, 255)


def strike(plate, theme):
    """Fill the bevel trench, redraw the rim as one flat ring, cut a clean circle."""
    H, W = plate.shape[:2]
    S = int(round(R_OUT * 2))
    oy, ox = np.mgrid[0:S, 0:S]
    r = np.hypot(ox - S / 2.0 + 0.5, oy - S / 2.0 + 0.5)
    ang = np.degrees(np.arctan2(oy - S / 2.0, ox - S / 2.0)) % 360

    xi = np.clip((ox - S / 2.0 + CX).astype(int), 0, W - 1)
    yi = np.clip((oy - S / 2.0 + CY).astype(int), 0, H - 1)
    out = plate[yi, xi].copy()

    # 1. Fill the trench with the field's own colour - but ONLY where it is actually dark,
    #    so the bottom of the speech bubble (which reaches R~152) survives.
    lum = _lum(out)
    inner = (r >= 118) & (r <= 142)
    ref_lum = np.median(lum[inner])
    ref_rgb = np.median(out[inner & (lum < ref_lum * 1.35)], axis=0)
    out[(r >= TRENCH_FROM) & (r < R_FIELD) & (lum < ref_lum * 0.82)] = ref_rgb

    # 2. One flat ring, lit from a single direction.
    lo, hi = np.array(RIM[theme][0], float), np.array(RIM[theme][1], float)
    lit = (0.5 + 0.5 * np.cos(np.radians(ang - LIGHT_DEG))) ** 1.15
    band = np.clip((r - R_FIELD) / max(R_OUT - R_FIELD, 1e-6), 0, 1)
    crown = 1.0 - CROWN * np.abs(band - 0.42) / 0.58
    shade = np.clip(lit * crown, 0, 1)[..., None]
    in_rim = (r >= R_FIELD) & (r <= R_OUT)
    out[in_rim] = (lo + (hi - lo) * shade)[in_rim]

    # 3. A 1px seam, so it still reads as struck rather than printed.
    out[(r >= R_FIELD - 1.2) & (r < R_FIELD + 0.6)] = np.array(SEAM[theme], float)

    alpha = np.clip((R_OUT - r) * 1.6 + 0.5, 0, 1) * 255.0
    return Image.fromarray(
        np.dstack([np.clip(out, 0, 255).astype(np.uint8), alpha.astype(np.uint8)]), 'RGBA')


def separation(im, label):
    """Relief against field, inside the coin. The number the PO's complaint was about."""
    rgb = np.asarray(im.convert('RGB')).astype(float)
    lum = _lum(rgb)
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w]
    disc = np.hypot(xx - w / 2, yy - h / 2) < min(w, h) / 2 * 0.86
    d = lum[disc]
    mid = (np.percentile(d, 5) + np.percentile(d, 95)) / 2

    def lin(v):
        v = np.asarray(v) / 255.0
        return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4).mean()

    a, b = lin(d[d < mid].mean()), lin(d[d >= mid].mean())
    print('  %-24s separation %.2f:1' % (label, (max(a, b) + 0.05) / (min(a, b) + 0.05)))


if __name__ == '__main__':
    f = strike(forge_plate(), 'forge')
    p = strike(paper_plate(), 'paper')
    f.save(OUT_FORGE)
    p.save(OUT_PAPER)
    print('wrote %s and %s  (%dx%d)' % (OUT_FORGE.name, OUT_PAPER.name, *f.size))
    separation(f, 'forge')
    separation(p, 'paper')
