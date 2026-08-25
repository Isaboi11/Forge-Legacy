#!/usr/bin/env python3
"""
Recolour the seven full-bleed background plates from Forge (dark) to Paper (light).

    python scripts/paper-plates/recolor.py

Reads  assets/backgrounds/<name>.png
Writes assets/backgrounds/<name>-paper.png

══ WHY THIS SCRIPT EXISTS RATHER THAN A MANUAL EXPORT ══

The Claude Design project has already produced five of these by hand (`forge-slate-paper.png`,
`forge-slate2-paper.png`, `legacy-bg-paper.png`, `squad-bg-continued-paper.png`,
`squads-hub-bg-paper.png`). They are 2–9 MB each, which is far over the design API's 256 KiB read cap,
so they cannot be pulled programmatically — they need a human export.

This script is not a replacement for that. It is the reproducible version of the same mapping, it
covers the two plates the design has NOT produced (`forge-bg-2`, `hero-mountains`), and it means the
recolour is a versioned transform rather than seven binaries whose provenance is a memory. When the
design's five are exported, diff them against these and keep whichever the PO prefers — but keep the
script either way, because the next plate that gets added will need the same treatment.

══ THE MAPPING, AND WHY IT IS NOT A LUMINANCE INVERT ══

The handoff specifies: *"same composition, luminance mapped from dark→cream base (~#F4EFE3) with
highlights/veins mapped to a warm bronze (~#946838), rather than swapped for a flat color."*

So the sense is preserved rather than inverted: where the dark plate is DARKEST (the bulk of the
field) the paper plate is CREAM, and where the dark plate is BRIGHTEST (veins, grain, ridgelines) the
paper plate is BRONZE. A plain `ImageOps.invert` would do the opposite — it would turn the field
bronze and the veins cream, which reads as a photographic negative rather than as paper.

⚠ PERCENTILE NORMALISATION IS LOAD-BEARING. These plates are extremely dark and extremely
  low-contrast — measured on `forge-slate.png`, 95% of pixels sit below luminance 32/255 and the
  median is 14.3. Mapping [0,255] linearly onto the cream→bronze ramp would put the entire image
  within 6% of the cream end and produce a flat beige rectangle with no visible texture at all. The
  ramp is fitted to the 1st–99th percentile of each plate's OWN luminance, so the texture that exists
  survives the move.

⚠ THE GAMMA IS WHAT KEEPS IT PAPER RATHER THAN RUST. After normalisation the median lands around
  t=0.29, i.e. 29% of the way to full bronze — which would tint the whole field. `GAMMA = 2.0` pushes
  the midtones back toward cream so the field reads as paper and only the top few percent — the actual
  veining — carries bronze.

⚠ ONE PLATE TAKES THE OPPOSITE SENSE, AND THIS WAS FOUND BY LOOKING RATHER THAN BY REASONING.

  Six of the seven are TEXTURES — a dark field with brighter grain and veins running through it. For
  those, preserving the luminance sense is right: field → cream, veins → bronze.

  `hero-mountains` is not a texture, it is a PICTURE: dark peaks silhouetted against a bright,
  glowing sky. Run through the texture mapping it came out *backwards* — the dark mountains became
  white and the glowing cloudbreak became bronze, so the ridgeline dissolved into the page and the
  plate read as snow rather than as mountains. Figure and ground had swapped.

  A pictorial plate has to keep its FIGURE dark: on paper the peaks must be the bronze/ink element and
  the sky the cream one, which is the inverted mapping. `INVERT` marks the plates that are pictures.
  Anything added here that depicts a thing rather than a surface belongs in that set — and the way to
  know is to open the output, not to predict it.
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BG = ROOT / "assets" / "backgrounds"

# --fl-paper base and the warm bronze the handoff names for highlights/veins.
CREAM = np.array([0xF4, 0xEF, 0xE3], dtype=np.float32)
BRONZE = np.array([0x94, 0x68, 0x38], dtype=np.float32)

#: How much of the cream→bronze ramp a plate is allowed to travel, overall.
#:
#: ⚠ PO CALL, 2026-08-25: *"the background is too prominent, I would make it 50% more subtle."*
#: At 1.0 the veining carried real weight and competed with the cards sitting on it. Halving the mix
#: keeps every bit of the texture — the grain, the veins, their shape and their position are all
#: unchanged — and simply lets less bronze into it, so the plate reads as paper STOCK rather than as an
#: image. This is the honest lever for "more subtle": raising GAMMA instead would have crushed the
#: midtones and lost detail rather than volume.
STRENGTH = 0.5

GAMMA = 2.0
#: Inverted plates need a much harder gamma — see the note on `INVERT` in the header. In
#: `hero-mountains` the peaks AND most of the sky are dark, so simply flipping the ramp bronzes 81% of
#: the image into a slab. 6.0 pulls the sky back to cream and leaves the ridgeline as the dark figure;
#: it was chosen by rendering 2.0 / 4.0 / 6.0 composited at the 0.375 opacity Legacy actually uses.
INVERT_GAMMA = 6.0
LO_PCT, HI_PCT = 1.0, 99.0

PLATES = [
    "forge-slate",
    "forge-slate2",
    "forge-bg-2",
    "legacy-bg",
    "hero-mountains",
    "squad-bg-continued",
    "squads-hub-bg",
]

#: Pictorial plates — see the header. These depict a subject, so their figure must stay dark on paper.
INVERT = {"hero-mountains"}


def recolor(src: Path, dst: Path, invert: bool = False) -> None:
    im = Image.open(src)
    has_alpha = im.mode in ("RGBA", "LA") or "transparency" in im.info
    alpha = im.getchannel("A") if has_alpha else None

    a = np.asarray(im.convert("RGB")).astype(np.float32)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]

    lo, hi = np.percentile(lum, [LO_PCT, HI_PCT])
    if hi - lo < 1e-6:  # a genuinely flat plate; nothing to normalise against
        hi = lo + 1.0

    t = np.clip((lum - lo) / (hi - lo), 0.0, 1.0)
    if invert:
        # Keep the subject dark: bright sky -> cream, dark peaks -> bronze. The gamma is applied to
        # the flipped value so it still favours cream, otherwise the whole sky bronzes over.
        t = (1.0 - t) ** INVERT_GAMMA
    else:
        t = t**GAMMA
    t = t * STRENGTH
    out = CREAM + (BRONZE - CREAM) * t[..., None]

    res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")
    if alpha is not None:
        res = res.convert("RGBA")
        res.putalpha(alpha)

    res.save(dst, optimize=True)

    pct = np.percentile(t, [50, 95, 99])
    print(
        f"  {src.name:26s} -> {dst.name:32s} "
        f"{'INVERTED ' if invert else '         '}"
        f"lum[{lo:5.1f},{hi:6.1f}]  bronze-mix p50/p95/p99 "
        f"{pct[0]*100:4.1f}% {pct[1]*100:4.1f}% {pct[2]*100:5.1f}%  "
        f"{dst.stat().st_size/1_048_576:.1f} MB"
    )


def main() -> int:
    if not BG.is_dir():
        print(f"!! no {BG}", file=sys.stderr)
        return 1
    print(f"Paper plates -> {BG}")
    missing = 0
    for name in PLATES:
        src = BG / f"{name}.png"
        if not src.exists():
            print(f"  !! missing {src.name}", file=sys.stderr)
            missing += 1
            continue
        recolor(src, BG / f"{name}-paper.png", invert=name in INVERT)
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
