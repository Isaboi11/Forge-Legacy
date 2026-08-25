#!/usr/bin/env python3
"""
Re-cut the 72 home/workout artwork PNGs from their opaque masters: luminance -> alpha, properly.

    python scripts/artwork/alpha.py

Reads  design_reference/Forge Modal Library Design/assets/artwork/**/*.png   (opaque masters)
Writes assets/artwork/**/*.png                                              (alpha-cut, shipped)

══ THE DEFECT THIS FIXES ══

PO, 2026-08-25, looking at Home in Paper: *"the artwork is off and is not blended into the card."*

The shipped cut-outs are not cut out. Measured: the masters are 100% opaque with a dark background at
luminance ~18, and the shipped alpha is ~2.4x that luminance — so the BACKGROUND became a uniform
alpha of about 40/255 rather than going to zero. 87% of every asset carries some alpha, and the mean
alpha where anything is drawn is 43.

On near-black that is invisible: a dark-grey haze at 16% over a dark card is nothing. On cream, with
the Paper bronze tint applied, the same haze paints a visible warm RECTANGLE with a hard vertical
seam where the image ends. The tint did not cause it — it revealed it.

⚠ SO THE ORIGINAL PASS WAS `alpha = luminance`, WITH NO BLACK POINT. That is the whole bug. A
  luminance-keyed cut has to subtract the background's own level first, or the background survives at
  exactly the level it started at.

══ WHAT THIS DOES INSTEAD ══

  1. BLACK POINT, taken per-asset from the image's own corners — which are always background, never
     figure. Everything at or below it goes to a true zero. This is what removes the rectangle.
  2. WHITE POINT at the 99.5th percentile, so the figure's highlights still reach full alpha.
  3. A GAMMA below 1 to hold the figure's mid-tones up, because subtracting the black point otherwise
     thins the body and leaves only the rim light.
  4. AN EDGE FEATHER. Even a perfect key leaves a boundary wherever the figure runs off the canvas —
     the assets are composed to bleed. The last few percent of each edge ramps to zero so the art can
     never show a seam, at any size, in either theme, on any of its four sides.

⚠ THE MASTERS ARE THE INPUT AND ARE NEVER WRITTEN. Running this twice gives the same result as
  running it once; it does not erode the figure the way re-processing the shipped files would. That is
  the reason it reads from `design_reference/` rather than editing in place.

⚠ THIS CHANGES THE DARK THEME TOO, and it should. The haze is a defect there as well — it has simply
  never been visible against near-black. The figure itself is untouched.
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "design_reference" / "Forge Modal Library Design" / "assets" / "artwork"
OUT = ROOT / "assets" / "artwork"

#: Only the four collections the resolver can actually select. `honors/` and `legacy/` are RESERVED in
#: `manifest.ts` and are never required by the app, so they are deliberately not processed.
COLLECTIONS = ["exercise-families", "program-themes", "training-splits", "workout-modalities"]

#: Percentile of the CORNER pixels used as the black point. Corners are always background. 85 rather
#: than 50 so the background's own texture is taken with it — at 50 half the grain survived the key.
CORNER_PCT = 85.0
WHITE_PCT = 99.5

#: < 1 lifts the mid-tones. Subtracting a black point compresses everything toward zero, and without
#: this the figure reads as a wire outline with no body. Chosen by rendering, not derived.
GAMMA = 0.75

#: Fraction of width/height over which each edge ramps to zero.
#:
#: ⚠ 6% WAS NOT ENOUGH AND THE SEAM SURVIVED IT. The figures carry a soft atmospheric halo that runs
#: all the way to the canvas edge, so a narrow ramp just moves the boundary a few pixels rather than
#: dissolving it. Tested at the card's REAL geometry (62% width, contain, top-right, -24 bleed) at 6 /
#: 12 / 18 / 26%: the edge is gone by 18 and 26 starts eating the figure's near arm.
FEATHER = 0.18

#: The ramp is eased rather than linear — a straight ramp has a visible corner where it meets 1.0.
FEATHER_EASE = 1.5


def edge_window(h: int, w: int) -> np.ndarray:
    """A separable ramp: 0 at every border, 1 once past `FEATHER` of that dimension."""

    def ramp(n: int) -> np.ndarray:
        k = max(1, int(round(n * FEATHER)))
        r = np.ones(n, dtype=np.float32)
        edge = np.linspace(0.0, 1.0, k, dtype=np.float32) ** FEATHER_EASE
        r[:k] = edge
        r[-k:] = edge[::-1]
        return r

    return ramp(h)[:, None] * ramp(w)[None, :]


def cut(src: Path, dst: Path) -> tuple[float, float]:
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

    h, w = lum.shape
    ch, cw = max(1, h // 8), max(1, w // 8)
    corners = np.concatenate(
        [lum[:ch, :cw].ravel(), lum[:ch, -cw:].ravel(), lum[-ch:, :cw].ravel(), lum[-ch:, -cw:].ravel()]
    )
    black = float(np.percentile(corners, CORNER_PCT))
    white = float(np.percentile(lum, WHITE_PCT))
    if white - black < 1e-6:
        white = black + 1.0

    a = np.clip((lum - black) / (white - black), 0.0, 1.0) ** GAMMA
    a *= edge_window(h, w)

    out = np.dstack([rgb, np.clip(a * 255.0, 0, 255)]).astype(np.uint8)
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(dst, optimize=True)
    return black, float((a > 0.02).mean())


def main() -> int:
    if not MASTERS.is_dir():
        print(f"!! masters not found: {MASTERS}", file=sys.stderr)
        return 1

    done = 0
    for coll in COLLECTIONS:
        for src in sorted((MASTERS / coll).rglob("*.png")):
            rel = src.relative_to(MASTERS)
            black, covered = cut(src, OUT / rel)
            done += 1
            if done <= 3 or done % 24 == 0:
                print(f"  {str(rel):46s} black={black:5.1f}  ink coverage {covered*100:5.1f}%")

    print(f"\n{done} artwork files re-cut from the masters.")
    if done != 72:
        print(f"!! expected 72, got {done}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
