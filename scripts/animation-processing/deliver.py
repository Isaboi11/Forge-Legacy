"""
deliver.py — the 720p master out of `process_clip.py` -> the format the bucket actually holds.

WHY THIS IS A SEPARATE STEP AND NOT PART OF process_clip.py: the master is worth keeping at full
height and full frame rate (re-grading or re-cropping later should never mean re-mattingv from mp4),
while what ships is a ~300px, half-frame-rate loop that has to stay near 1MB because the exercise
library mounts many of them at once.

The numbers here are not invented — they reproduce the delivery pass that produced the clips already
in `exercise-media`, which is why a re-processed clip drops in beside the existing ones without the
list view suddenly changing weight:

    height 300px · every other frame · 12fps · WebP quality 74

Usage: deliver.py <master.webp> <out.webp> [height]
"""
import sys
import os
from PIL import Image

HEIGHT = 300
FPS = 12
QUALITY = 74

src, out = sys.argv[1], sys.argv[2]
height = int(sys.argv[3]) if len(sys.argv) > 3 else HEIGHT

im = Image.open(src)
frames = []
try:
    while True:
        frames.append(im.convert("RGBA").copy())
        im.seek(im.tell() + 1)
except EOFError:
    pass

if not frames:
    raise RuntimeError(f"no frames in {src}")

frames = frames[::2]
w, h = frames[0].size
nw = max(1, round(w * height / h))
frames = [f.resize((nw, height), Image.LANCZOS) for f in frames]

tmp = out + ".tmp"
frames[0].save(tmp, save_all=True, append_images=frames[1:], format="WEBP",
               duration=int(1000 / FPS), loop=0, quality=QUALITY, method=4, minimize_size=True)
os.replace(tmp, out)                       # atomic: a resumable batch must never see a half file
print(f"{os.path.basename(out)}: {nw}x{height} {len(frames)}f {os.path.getsize(out)//1024}KB")
