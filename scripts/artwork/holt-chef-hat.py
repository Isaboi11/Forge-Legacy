#!/usr/bin/env python3
"""Cut Coach Holt's KITCHEN medallion (Holt in a chef's hat) out of the PO's approved mockup.

    python scripts/artwork/holt-chef-hat.py <mockup.png>

Reads  the PO's 1536x1024 mockup sheet (2026-09-25, "Refine the existing Chef Holt")
Writes assets/images/coach-holt-kitchen.master.png   (566x566, transparent outside the rim)
       assets/images/coach-holt-kitchen.png          (346x346, shipped, Forge)
       assets/images/coach-holt-kitchen-paper.png    (346x346, shipped, Alabaster)

`Docs/Holt-Kitchen-Mode-v1.0.md` §1 / §6 Q4. The large medallion on the sheet IS the approved art (ivory
toque, jaw line, narrower torso, smaller chat bubble). The sheet's six annotation leader lines cross the
coin (into the face, the torso and the bubble), so each one's two rows are re-interpolated from the rows
2 px above and below before the coin is cut.

⚠ ALABASTER SHIPS THE SAME DARK COIN. The sheet labels the flat light-bronze variant "PREVIOUS VERSION —
  too flat and loses identity", and the dark coin reads on the #F4F0E6 page. So unlike
  `coach-holt-mark-paper.png` there is no re-ramp; both files are the same strike.
"""
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
IMG = ROOT / 'assets' / 'images'

CROP = (252, 45, 862, 655)          # the large medallion on the sheet
# (rows of the leader line, x0, x1), in CROP coordinates; found by a thin-bright-row detector
LINES = [((78, 79), 0, 256), ((105, 106), 466, 610), ((222, 223), 0, 290),
         ((301, 302), 505, 610), ((402, 403), 0, 200), ((477, 478), 330, 610)]
CX, CY, R = 302, 301, 281          # the rim, fitted in CROP coordinates


def main(src):
    a = np.array(Image.open(src).convert('RGB').crop(CROP)).astype(float)
    out = a.copy()
    for (r0, r1), x0, x1 in LINES:
        y0, y1 = r0 - 2, r1 + 2
        for y in range(y0 + 1, y1):
            t = (y - y0) / (y1 - y0)
            out[y, x0:x1] = a[y0, x0:x1] * (1 - t) + a[y1, x0:x1] * t
    im = Image.fromarray(out.clip(0, 255).astype(np.uint8)).convert('RGBA')
    sq = im.crop((CX - R - 2, CY - R - 2, CX + R + 2, CY + R + 2))
    n, s = sq.size[0], 4
    m = Image.new('L', (n * s, n * s), 0)
    ImageDraw.Draw(m).ellipse((2 * s, 2 * s, (n - 2) * s, (n - 2) * s), fill=255)
    sq.putalpha(m.resize((n, n), Image.LANCZOS))
    sq.save(IMG / 'coach-holt-kitchen.master.png')
    shipped = sq.resize((346, 346), Image.LANCZOS)
    shipped.save(IMG / 'coach-holt-kitchen.png')
    shipped.save(IMG / 'coach-holt-kitchen-paper.png')
    print('wrote coach-holt-kitchen.master.png (%dx%d) + both shipped files (346x346)' % sq.size)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
