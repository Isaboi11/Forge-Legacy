"""
process_clip.py — one exercise animation (white-background 3D render) -> looping
transparent WebP, recolored to the app bronze and warm-graded to match the UI.

Pipeline per clip:
  1. Decode the mp4 at NATIVE resolution (the exact-255 pocket signal below only
     survives before downscaling).
  2. recolor(): the red "target muscle" highlight -> app bronze. It is the only
     saturated thing in an otherwise grey frame, so a saturation gate isolates it.
  3. matte(): remove the pure-white background, INCLUDING see-through gaps between
     limbs, WITHOUT punching holes in bright muscle highlights. See matte() docstring.
  4. warm_grade(): tint the neutral greys toward warm ivory (spares the bronze).
  5. Crop to the subject bbox (union across frames), downscale to WORK_H, encode a
     looping animated WebP with true (soft) alpha.

Usage:
  python process_clip.py <input.mp4> <output.webp> [work_dir]

Requires ffmpeg on PATH (or set FFMPEG=/path/to/ffmpeg.exe) and: pillow scipy numpy.
The matte/recolor constants are TUNED — see README.md before changing them.
"""
import sys, os, glob, time, shutil, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage


def resolve_ffmpeg():
    """Find ffmpeg without pinning a version-specific path."""
    env = os.environ.get("FFMPEG")
    if env and (os.path.isfile(env) or shutil.which(env)):
        return env
    onpath = shutil.which("ffmpeg")
    if onpath:
        return onpath
    home = os.path.expanduser("~")
    candidates = [
        os.path.join(home, r"AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*", "**", "bin", "ffmpeg.exe"),
        r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
        "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg",
    ]
    for pat in candidates:
        hits = glob.glob(pat, recursive=True)
        if hits:
            return hits[0]
    raise RuntimeError(
        "ffmpeg not found. Install it (Windows: `winget install Gyan.FFmpeg`) "
        "or set the FFMPEG environment variable to the ffmpeg executable."
    )


FFMPEG = resolve_ffmpeg()

# ---- app tokens: the target-muscle bronze, PER THEME ----
#
# ⚠ TWO PROFILES, BECAUSE THE ANIMATIONS SHIP TWICE. Forge's muscle is a bright bronze that GLOWS
#   against a near-black card; Paper's is the dense antique brass of the Start Workout button, which is
#   a mid-value colour on cream. Rendering one set for both themes cannot work: the Forge value at
#   #A57C54 reads as hot orange on ivory, and the Paper value reads as mud on black.
#
# ⚠ PAPER'S V IS A CUT, NOT A LIFT — that is the whole difference and it is easy to get backwards.
#   Forge multiplies brightness by 1.12 to make the muscle glow. Paper's target `#836A3E` has V=131,
#   a MID value: a glowing muscle on paper looks like a highlighter. 0.86 was not chosen, it was
#   solved for — measured across 12 real source frames, it lands the mean muscle at **#82693E**
#   against a target of **#836A3E**, a total error of 2 across all three channels.
#
# Select with FL_THEME=paper (default: forge).
THEMES = {
    "forge": dict(
        BRONZE_H=21,      # PIL hue of the app's saturated bronze (~30 deg) — #BA8654 / #C99767
        S_MUL=0.80,       # keep most of the source saturation -> prominent, not pale
        S_FLOOR=110,      # floor so even low-sat reds read as bronze
        S_CAP=150,        # cap so it stays bronze, not garish orange
        V_MUL=1.12,       # LIFT brightness of the recolored muscle ("glow" against near-black)
        WARM_TINT=(1.05, 0.995, 0.88),
    ),
    "paper": dict(
        BRONZE_H=27,      # PIL hue of --fl-bronze-fill's mid stop, #836A3E
        S_MUL=0.85,
        S_FLOOR=125,
        S_CAP=145,        # the button's own S is 134; this brackets it
        V_MUL=0.86,       # solved against 12 real frames -> #82693E vs #836A3E
        # Neutral greys go toward the PAPER canvas rather than the forged-dark ivory.
        WARM_TINT=(1.02, 1.00, 0.96),
    ),
}

FL_THEME = os.environ.get("FL_THEME", "forge").strip().lower()
if FL_THEME not in THEMES:
    raise SystemExit(f"FL_THEME must be one of {sorted(THEMES)}, got {FL_THEME!r}")

_T = THEMES[FL_THEME]
BRONZE_H = _T["BRONZE_H"]
S_MUL = _T["S_MUL"]
S_FLOOR = _T["S_FLOOR"]
S_CAP = _T["S_CAP"]
V_LIFT = _T["V_MUL"]

# ---- output ----
WORK_H     = 720         # output height (px); asset shows in a ~132dp slot
FPS_OUT    = 24
QUALITY    = 74          # WebP quality
PAD        = 12          # px padding around the subject bbox (at output res)

# ---- matte (px constants tuned @720; matte() scales them to native res) ----
SAT_GATE      = 60       # a pixel above this chroma is "the red highlight"
WHITE_THR     = 250      # near-pure white = background candidate
BIG_AREA      = 40000    # enormous blob -> background regardless
AREA_MIN      = 400      # below this, never remove (protects small muscle highlights)
DARK_VAL      = 70       # a ring pixel darker than this counts as "dark"
DARK_FRAC     = 0.15     # remove blob if this fraction of its ring is dark (equipment gap)
E255_FRAC     = 0.90     # OR remove a near-perfectly-flat-255 blob (a see-through limb gap)...
BIG_FLAT_FRAC = 0.00265  # ...that is also at least this big (frac of frame). Muscle highlights
                         # are smaller AND not perfectly flat, so the area gate spares them.
BAR_LEVEL     = 40       # a pixel never brighter than this is letterbox bar, not picture
BG_FRAC       = 0.90     # white in >= this share of frames -> background (see static_background)
RING_DIL      = 3        # ring search radius (px)
HOLE_MAX_FRAC = 0.0003   # fill enclosed body holes smaller than this (tiny notches); real gaps stay open
MIN_FG_PX     = 40       # drop isolated foreground specks smaller than this
ERODE_PX      = 1        # pull the silhouette in to kill the white fringe
FEATHER       = 0.8      # gaussian sigma for edge anti-alias

WARM_TINT  = np.array(_T["WARM_TINT"], np.float32)   # per-theme; see THEMES above


def warm_grade(rgb):
    """Tint neutral greys toward warm ivory; the saturated bronze muscle is left alone."""
    f = rgb.astype(np.float32)
    chroma = f.max(2, keepdims=True) - f.min(2, keepdims=True)
    neutral = np.clip(1.0 - chroma / 60.0, 0.0, 1.0)
    out = f + (f * WARM_TINT - f) * neutral
    return np.clip(out, 0, 255).astype(np.uint8)


def recolor(rgb):
    """Red target-muscle highlight -> app bronze (isolated by saturation)."""
    hsv = np.asarray(Image.fromarray(rgb, "RGB").convert("HSV")).astype(np.int16)
    H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    red = (S > SAT_GATE) & ((H < 24) | (H > 232))
    H[red] = BRONZE_H
    S[red] = np.clip(S[red] * S_MUL, S_FLOOR, S_CAP)
    V[red] = np.clip(V[red] * V_LIFT, 0, 255)
    hsv2 = np.stack([H, S, V], -1).astype(np.uint8)
    return np.asarray(Image.fromarray(hsv2, "HSV").convert("RGB"))


def crop_letterbox(frames):
    """
    Remove uniform black letterbox/pillarbox bars, rewriting the decoded frames in place.

    ══ WHY THIS RUNS BEFORE EVERYTHING ELSE ══

    `clip_threshold` reads the background level off the four corners. That is sound for the vendor's
    renders, which are white to the edge — and completely wrong for a clip delivered inside black
    bars, where all four corners are the bar. `bg_min` comes back 0, the threshold goes to -5, every
    pixel in the frame satisfies `> thr`, the entire frame is classified background, and the clip
    mattes away to nothing. `main()` then raises "no subject found", which points at the background
    without saying that the real problem is a letterbox.

    Cropping first is better than teaching the threshold to ignore bars, because the bars break more
    than the threshold: they are not white, so `matte()` would keep them as subject, and the bbox
    crop at the end would preserve them as two black slabs beside the athlete.

    Only a run of edge rows/columns that is uniformly near-black is removed. A white-background
    render has none, so this is a no-op on every clip that was already working — which is what makes
    it safe to apply to all of them rather than only to the one that failed.
    """
    probe = frames[:: max(1, len(frames) // 8)]
    acc = None
    for fp in probe:
        v = np.asarray(Image.open(fp).convert("RGB")).max(axis=2)
        acc = v if acc is None else np.maximum(acc, v)   # brightest this pixel ever gets
    H, W = acc.shape
    dark_row = (acc < BAR_LEVEL).all(axis=1)
    dark_col = (acc < BAR_LEVEL).all(axis=0)

    def run(mask):
        """Length of the uniformly-dark run at the START of mask (edges only — a dark band through
        the middle of the picture is content, not a bar)."""
        n = 0
        while n < len(mask) and mask[n]:
            n += 1
        return n

    top, bottom = run(dark_row), run(dark_row[::-1])
    left, right = run(dark_col), run(dark_col[::-1])
    if not (top or bottom or left or right):
        return False

    y0, y1 = top, H - bottom
    x0, x1 = left, W - right
    if y1 - y0 < H // 4 or x1 - x0 < W // 4:
        # Nearly everything is dark — this is not a letterboxed white render, and cropping it would
        # be a guess. Leave it alone and let the caller fail loudly.
        return False

    for fp in frames:
        Image.open(fp).convert("RGB").crop((x0, y0, x1, y1)).save(fp)
    print(f"  letterbox: cropped {left}L {right}R {top}T {bottom}B -> {x1-x0}x{y1-y0}")
    return True


def clip_threshold(frames):
    """
    ONE white threshold for the whole clip.

    ══ WHY THIS IS NOT PER-FRAME ══

    It was, and that alone made the background shimmer. `thr` is derived from the median of the
    corner pixels, and on a compressed source those corners drift by a level or two between frames.
    Each drift moves the threshold, which moves the white mask, which moves the alpha — so a band of
    background pixels near the cutoff switched between opaque and transparent from frame to frame.

    A clip has ONE background. Deciding what it is once, from every frame at once, removes an entire
    class of flicker before any of the blob heuristics below even run.
    """
    mins = []
    for fp in frames:
        rgb = np.asarray(Image.open(fp).convert("RGB"))
        corners = np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3),
                                  rgb[-8:, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3)])
        mins.append(corners.min(axis=1))
    bg_min = int(np.median(np.concatenate(mins)))
    return min(WHITE_THR, bg_min - 5)


def static_background(frames, thr, frac=BG_FRAC):
    """
    Pixels that are white in at least `frac` of the clip's frames. Background.

    ══ THE MACHINE FLICKER, AND WHY THIS FIXES IT ══

    `matte()` judges each enclosed white blob on its own, one frame at a time, against thresholds
    with hard edges (`darkfrac >= 0.15`; area `>= big_flat`). A dumbbell clip has few enclosed white
    regions and sits nowhere near those edges. A MACHINE is mostly enclosed white regions — the gap
    inside the uprights, the window under the seat, the space around the stack — and their measured
    ring darkness and area wobble as the model moves through them. A blob that hovers at the cutoff
    is removed on one frame and kept on the next, so the athlete watches the source's white
    background blink through the machine.

    A pixel that is white across the clip cannot be part of the subject. Not the athlete, who moves
    through their own silhouette; not a muscle highlight, which is bronze after `recolor()` and never
    flat white; not equipment, which is rendered grey. It is either outer background or a see-through
    gap, and either way it must be transparent.

    ══ WHY "MOST FRAMES" AND NOT "EVERY FRAME" ══

    This demanded ALL frames first, and that left half the bug in place. The gaps that still flashed
    were exactly the ones the athlete sweeps through — the window between the uprights that an arm
    crosses at the top of the rep, the space a cable passes over. Covered for even one frame, the
    pixel fails an all-frames test, drops back to the per-frame blob heuristic, and gets called
    subject: the gap fills in white for that stretch of the rep and empties again after. The PO
    described it exactly — "good moments, then glitchy moments" — and it is worst on cables and
    machines because those clips have both the most gaps and something crossing them every rep.

    A gap briefly crossed is still a gap. A spot the athlete genuinely occupies is white for a real
    share of the clip, not 95% of it, so the body is not eaten by the relaxation: at 0.90 the
    foreground given up is 0.34% of the subject, and it is the flashing patches themselves.

    `frac` errs high on purpose. The two failure modes are not symmetric — too loose eats the
    athlete, permanently and on every clip; too tight leaves some flashing, on machine clips only.
    Measured on Cable Standing Crossover (alpha flips per pixel, delivery size):
    1.00 -> 4.8% · 0.90 -> 3.3% · 0.80 -> 2.6%, against 0.34% / 0.97% of foreground given up.

    Small regions are left to `matte()`'s existing judgement (`AREA_MIN` exists to protect them), so
    this only overrules the decision where the decision was unstable in the first place.
    """
    acc = None
    for fp in frames:
        rgb = np.asarray(Image.open(fp).convert("RGB"))
        w = (rgb[..., 0] > thr) & (rgb[..., 1] > thr) & (rgb[..., 2] > thr)
        acc = w.astype(np.uint16) if acc is None else (acc + w)
    acc = acc >= frac * len(frames)
    H, W = acc.shape
    area_min = AREA_MIN * (H / 720.0) ** 2
    lbl, n = ndimage.label(acc)
    if not n:
        return acc
    keep = np.bincount(lbl.ravel()) >= area_min
    keep[0] = False
    return keep[lbl]


def matte(rgb, thr, static_bg):
    """
    Alpha for a white-background 3D render. Removes the outer background AND enclosed
    see-through gaps between limbs, while protecting bright muscle highlights (which
    are pixel-identical to a gap locally). A white blob is background if EITHER:
      - it is white in every frame of the clip (see `static_background`), OR
      - a large fraction of its ring is near-black (equipment / silhouette edge), OR
      - it is big AND almost perfectly flat 255 (a see-through gap bordered by light
        body). Highlights are smaller and not perfectly flat, so the area gate spares them.
    Runs at native res: the exact-255 signal is destroyed by downscaling.

    `thr` and `static_bg` are computed ONCE per clip and passed in. Both used to be derived
    per frame, and both flickered for it.
    """
    H, W = rgb.shape[:2]
    rs = H / 720.0
    ring_dil = max(2, round(RING_DIL * rs))
    area_min = AREA_MIN * rs * rs
    big_area = BIG_AREA * rs * rs
    min_fg = int(MIN_FG_PX * rs * rs)
    erode = max(1, round(ERODE_PX * rs))
    feather = FEATHER * rs
    big_flat = BIG_FLAT_FRAC * H * W

    white = (rgb[..., 0] > thr) & (rgb[..., 1] > thr) & (rgb[..., 2] > thr)
    exact = (rgb[..., 0] == 255) & (rgb[..., 1] == 255) & (rgb[..., 2] == 255)
    gray = rgb.min(axis=2)
    lbl, n = ndimage.label(white)
    counts = np.bincount(lbl.ravel())
    border = np.unique(np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]]))
    is_bg = np.zeros(n + 1, bool)
    is_bg[border] = True
    is_bg[counts >= big_area] = True
    slices = ndimage.find_objects(lbl) if n else []
    for i in range(1, n + 1):
        if is_bg[i] or counts[i] < area_min:
            continue
        sl = slices[i - 1]
        if sl is None:
            continue
        y0 = max(0, sl[0].start - ring_dil - 1); y1 = min(H, sl[0].stop + ring_dil + 1)
        x0 = max(0, sl[1].start - ring_dil - 1); x1 = min(W, sl[1].stop + ring_dil + 1)
        comp = lbl[y0:y1, x0:x1] == i
        e255 = float(exact[y0:y1, x0:x1][comp].mean())
        ring = ndimage.binary_dilation(comp, iterations=ring_dil) & ~white[y0:y1, x0:x1]
        darkfrac = float((gray[y0:y1, x0:x1][ring] < DARK_VAL).mean()) if ring.any() else 0.0
        if darkfrac >= DARK_FRAC or (e255 >= E255_FRAC and counts[i] >= big_flat):
            is_bg[i] = True
    is_bg[0] = False
    # Anything white for the whole clip is background regardless of what this frame's ring and area
    # measurements happened to say. This is the one rule here that cannot disagree with itself
    # between frames, which is exactly why it is applied last and overrules the rest.
    fg = ~is_bg[lbl] & ~static_bg
    if erode:
        fg = ndimage.binary_erosion(fg, iterations=erode)
    if min_fg:
        lbl2, _ = ndimage.label(fg)
        keep = np.bincount(lbl2.ravel()) >= min_fg
        keep[0] = False
        fg = keep[lbl2]
    holes = ndimage.binary_fill_holes(fg) & ~fg     # fill tiny notches; large gaps stay open
    if holes.any():
        hl2, _ = ndimage.label(holes)
        tiny = np.bincount(hl2.ravel()) < HOLE_MAX_FRAC * H * W
        tiny[0] = False
        fg = fg | tiny[hl2]
    alpha = ndimage.gaussian_filter(fg.astype(np.float32) * 255.0, feather)
    return np.clip(alpha, 0, 255).astype(np.uint8)


def main(src, out, work):
    """Process one clip. Writes atomically (out.tmp -> out) so a crash never leaves a
    truncated .webp that a resumable batch would mistake for 'done'."""
    if not os.path.isfile(src):
        raise FileNotFoundError(src)
    os.makedirs(work, exist_ok=True)
    for f in glob.glob(os.path.join(work, "*.png")):
        os.remove(f)
    r = subprocess.run([FFMPEG, "-y", "-i", src, "-vsync", "0",
                        os.path.join(work, "f_%04d.png")],
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg decode failed: {r.stderr.decode('utf-8', 'ignore')[-300:]}")
    frames = sorted(glob.glob(os.path.join(work, "f_*.png")))
    if not frames:
        raise RuntimeError("no frames decoded")

    t = time.time()
    # Bars first: they poison the corner sample `clip_threshold` depends on, and every later stage
    # inherits that mistake as a fully-transparent clip.
    crop_letterbox(frames)
    # Two clip-wide passes BEFORE any per-frame work. Both quantities used to be re-derived from
    # each frame in isolation, and a matte that re-decides the same question every frame answers it
    # differently near its thresholds — which the athlete sees as the background blinking through a
    # machine. Costs two extra reads of frames already on disk.
    thr = clip_threshold(frames)
    static_bg = static_background(frames, thr)

    rgba = []
    ax0 = ay0 = 10 ** 9; ax1 = ay1 = -1
    for fp in frames:
        rgb = np.asarray(Image.open(fp).convert("RGB"))
        a = matte(rgb, thr, static_bg)
        rc = warm_grade(recolor(rgb))
        im = Image.fromarray(np.dstack([rc, a]), "RGBA")
        if im.height != WORK_H:
            im = im.resize((round(im.width * WORK_H / im.height), WORK_H), Image.LANCZOS)
        arr = np.asarray(im)
        rgba.append(arr)
        ys, xs = np.where(arr[..., 3] > 8)
        if xs.size:
            ax0, ay0 = min(ax0, xs.min()), min(ay0, ys.min())
            ax1, ay1 = max(ax1, xs.max()), max(ay1, ys.max())
    if ax1 < 0:
        raise RuntimeError("no subject found (fully transparent) — check the source background")

    Hh, Ww = rgba[0].shape[:2]
    x0, y0 = max(0, ax0 - PAD), max(0, ay0 - PAD)
    x1, y1 = min(Ww, ax1 + PAD), min(Hh, ay1 + PAD)
    imgs = [Image.fromarray(fr[y0:y1, x0:x1], "RGBA") for fr in rgba]
    tmp = out + ".tmp"
    imgs[0].save(tmp, save_all=True, append_images=imgs[1:], format="WEBP",
                 duration=int(1000 / FPS_OUT), loop=0, quality=QUALITY,
                 method=4, minimize_size=True)
    os.replace(tmp, out)                            # atomic
    for f in glob.glob(os.path.join(work, "f_*.png")):
        os.remove(f)                                # free temp frames
    kb = os.path.getsize(out) // 1024
    print(f"{os.path.basename(out)}: {imgs[0].size} {len(imgs)}f {kb}KB in {time.time()-t:.1f}s")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    work = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(sys.argv[2]) or ".", "_work")
    main(sys.argv[1], sys.argv[2], work)
