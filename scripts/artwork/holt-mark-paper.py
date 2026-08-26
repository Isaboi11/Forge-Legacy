#!/usr/bin/env python3
"""
⛔ SUPERSEDED 2026-08-26 — DO NOT RUN. Use `scripts/artwork/holt-mark.py` instead.

   Its premise no longer holds. This script reads `coach-holt-mark.png` as "the Forge master,
   never written" — but that file is now GENERATED OUTPUT, so running this re-ramps an already
   ramped image and regresses the Paper variant. The pristine artwork moved to
   `coach-holt-mark.master.png`.

   Two defects were fixed after this script was written, both measured rather than eyeballed:
     · the ramp below squeezed the coin to 1.58:1 relief-against-field, where Forge sits at
       3.89:1 — the light variant read as mush. The replacement lands 4.08:1.
     · the coin's 3D bevel left a dark trench at R 153-157 whose unlit side made the rim's
       highlight float free of the body on the upper right (the PO's "sliver").

   Kept only for the ramp reasoning in the header below, which is still correct and is carried
   forward in the replacement: neutral-ended ramps come out PEWTER.

Strike Coach Holt's medallion in Alabaster's metal.

    python scripts/artwork/holt-mark-paper.py

Reads  assets/images/coach-holt-mark.png        (the Forge master, never written)
Writes assets/images/coach-holt-mark-paper.png  (the Paper variant, shipped)

══ THE DEFECT THIS FIXES ══

PO, 2026-08-26, on Active Workout in Alabaster: *"evaluate coach holt and his coloring to make him fit
more with the light mode."*

The master is a bronze relief struck on a NEAR-BLACK field — measured, the field sits at luminance 11
(median) and the image's darkest 1% is 0.2, i.e. true black. `HoltMark` renders it cover-filled inside
a 52px circular clip, so on a cream page the coach reads as a hole punched in the paper: the single
highest-contrast object on the screen, and a control the athlete is not being asked to press.

══ WHY A RECOLOUR AND NOT A LUMINANCE→ALPHA CUT ══

`scripts/artwork/alpha.py` solves the neighbouring problem — the 72 home artworks are FIGURES on a
background, so keying the background out and tinting the figure is exactly right, and Paper draws them
as a pale bronze watermark.

The medallion is not a figure on a background. It is a struck object: a rim, a field, and a relief that
only reads as relief because the field is behind it. Key the field out and there is no coin, just a
floating man. So this preserves the whole object and moves the METAL.

══ THE MAPPING ══

`foundation.paper.ts` states the rule this follows, in its own header: `bronzeMetallic` is the one
gradient Paper deliberately does NOT invert, because *"the machined sweep is an object in the world — a
struck badge — not a surface of the UI, and it reads as metal on paper exactly as it does on black."*
The medallion is the same kind of object and was failing that claim, so the ramp is fitted to that
gradient's own endpoints rather than to a colour chosen here:

    DARK  #765B44   `bronzeMetallic` stop 0 — the shadowed edge of the sweep
    LIGHT #C99767   `bronzeMetallic` stop 2 — its highlight

⚠ THE SENSE IS PRESERVED, NOT INVERTED. Where the master is darkest (the field) the variant is shadowed
  bronze; where it is brightest (the relief's lit faces) the variant is bronze highlight. Inverting —
  which is what `recolor.py` does for its PICTORIAL plates — was rendered and rejected: it produces a
  pale ivory disc with a soft bronze figure, which is beautiful and which dissolves into the page. This
  is a floating tap target in the corner of a gym screen, and it has to be findable.

⚠ PERCENTILE NORMALISATION, for the reason `recolor.py` gives: the master is extremely dark (median
  luminance 11 of 255) and a linear [0,255] map would put the entire coin within 5% of the dark end —
  a flat brown disc with no relief at all. The ramp is fitted to the image's own 1st–99th percentile.

⚠ GAMMA 0.80 LIFTS THE FIELD OFF THE FLOOR. At gamma 1.0 the field lands at t=0.06 and the coin is a
  dark brown puck with a bright figure — the black-hole problem again, one step warmer. Pushing the
  midtones up puts the field at a readable mid-bronze and keeps the relief above it.

⚠ FOUR RAMPS WERE RENDERED AND COMPARED ON THE REAL #F6F2E8 ACTION BAR AT THE REAL 52px, not reasoned
  about. Two neutral-ended ramps (`#6B5238`→`#E8CFA4`, `#6B5238`→`#F0DDBE`) came out PEWTER — the
  figure lost its warmth entirely — and `#5C4726`→`#E3C18C` came out olive-brass. Only the
  `bronzeMetallic` pair reads as bronze, which is a fair argument that the design had already chosen
  these two numbers for this exact material.

⚠ THE MASTER IS NEVER WRITTEN, so running this twice gives the same result as running it once and Forge
  is untouched by construction. `HoltMark` picks between the two files on `IS_PAPER`.
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets' / 'images' / 'coach-holt-mark.png'
OUT = ROOT / 'assets' / 'images' / 'coach-holt-mark-paper.png'

DARK = '#765B44'   # bronzeMetallic stop 0
LIGHT = '#C99767'  # bronzeMetallic stop 2
GAMMA = 0.80


def _hex(value: str) -> np.ndarray:
    value = value.lstrip('#')
    return np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def main() -> int:
    if not SRC.exists():
        print(f'missing master: {SRC}', file=sys.stderr)
        return 1

    src = Image.open(SRC)
    rgb = np.asarray(src.convert('RGB')).astype(np.float32)
    # Rec. 709 luminance — the same weights `alpha.py` and `recolor.py` key on.
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

    lo, hi = np.percentile(lum, 1), np.percentile(lum, 99)
    t = np.clip((lum - lo) / max(float(hi - lo), 1e-6), 0.0, 1.0) ** GAMMA

    dark, light = _hex(DARK), _hex(LIGHT)
    out = dark + (light - dark) * t[..., None]
    paper = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB')

    # The master carries a fully-opaque alpha channel; keep the shape identical so the two files are
    # interchangeable at the `require` site and nothing downstream has to care which one it got.
    if src.mode == 'RGBA':
        paper = Image.merge('RGBA', (*paper.split(), src.getchannel('A')))

    paper.save(OUT)
    print(f'wrote {OUT.relative_to(ROOT)}  ({paper.size[0]}x{paper.size[1]}, {OUT.stat().st_size:,} bytes)')
    print(f'  luminance p1={lo:.1f} p50={np.percentile(lum, 50):.1f} p99={hi:.1f}')
    print(f'  ramp {DARK} -> {LIGHT} @ gamma {GAMMA}')
    return 0


if __name__ == '__main__':
    sys.exit(
        'SUPERSEDED: run scripts/artwork/holt-mark.py instead.\n'
        'This script would read a generated file as its master and re-ramp it.'
    )


def _retired_main():
    raise SystemExit(main())
