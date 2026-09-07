"""
fix_flicker.py — temporal cleanup of a DELIVERED loop, in the alpha domain. No source MP4 needed.

Every defect is a matte decision that disagreed with the frames around it, or with the scene:

  FLASH-IN  a flat, near-white blob is OPAQUE where it should be transparent — the source's white
            background showing through a machine/cable gap. -> alpha := 0 there (feathered).
  HOLE      a flat, near-white body region is TRANSPARENT for a frame or two where it is opaque on
            both sides. -> fill RGBA from the nearest opaque neighbours (never from a pixel the clear took).
  SHEET     the matte failed outright and the whole background is still there (a handful of loops).
            -> flood from the frame border over transparent-or-bright pixels, plus islands and dust.

The blob is the same ivory in every case (both are white in the source); what decides is its RING —
the 2px of opaque pixels around it: shaded skin (median luminance ~190-235) means body, machine steel
and outlines (~130-160) mean a gap. A blob = component of (opaque & near-white) grown from a seed that
survives a 2px erosion with flat luminance (std <= FLAT_STD; a real gap is 0.5-1.9, a limb 4-8).

A dark-ringed blob is cleared on one of three grounds:
  blink   it is transparent in the frame before or after while its ring stays put — the matte flipped
          on a static patch. Voted within ±VOTE_WINDOW frames of its run.
  static  it never blinks, and the 3-5px band beyond its ring is machine, not skin (SKIN_BAND_MAX,
          averaged over ±SKIN_WINDOW frames; neighbouring gaps excluded from the band). Decided once per
          PIXEL over the loop: opaque-bright for >= STATIC_MIN_FRAMES and flagged in the majority of them,
          then every flagged run is cleared whole — a panel is see-through for the whole loop or not at all.
  transient  it neither blinks nor is bounded by machine, but its pixels are transparent for most of the loop,
          it is big, and its ring is darker still (TRANSIENT_*): the wedge of background between a band and the
          body that the matte keeps while the arm rises, a panel between smith uprights there for a fifth of the loop.
A blob whose ring is mostly transparent is OPEN — background kept around the silhouette — and is cleared
without the ring test. Open and sheet clears are voted over the anti-aliased edge (M_edge) so a silhouette
pixel hovering around BRIGHT cannot join the clear on alternate frames.

PERMANENT: a pixel opaque in EVERY frame is scene (a white bench leg, a treadmill console, the towers of a
cable machine) and is never cleared by blink/static/open. Colour cannot tell it from a gap — same ivory,
same flatness, same ring — only whole-loop opacity can; so a gap panel that is opaque in every frame stays
too (it is static ivory, not a flicker). A sheet loop is the exception: when the sheet is there in every
frame nothing is permanent; when it comes and goes, permanent pixels are excluded from the flood.

Forge and paper loops are not twins (different crops and frame counts); each is classified on its own.
Known not fixable here: a hole longer than MAX_GAP frames (a face), a static gap bounded by skin on both
sides (between two limbs), pale cable-crossover panels whose band reads as skin, permanently-opaque gap
panels, ambiguous rings.

  python fix_flicker.py <in.webp> <out.webp>            # one loop
  python fix_flicker.py --tree <loops_dir> <out_dir>    # every loop under loops_dir; only the CHANGED ones
                                                        # are written (same relative path) + report.json
  import: fix_frames(frames) -> (frames, stats)
"""
import json
import sys
from pathlib import Path
import time
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image
from scipy import ndimage

BRIGHT = 205
ERODE = 2
FLAT_STD = 2.5            # seed: luminance std over the eroded blob. A real gap is 0.5-1.9 (WebP noise on a flat
                          # source white); the flattest body region we were ever wrong about was 4.8 (a paper-theme
                          # calf), a forearm in close-up 7.9. The old 6.0 seeded whole limbs.
FLAT_STD_HOLE = 6.0       # hole seeds keep the looser bound: the fill has its own guards (enclosed, skin ring, run <= MAX_GAP)
GROW_TOL = 6.0            # a flash blob grows from its seed only over pixels within this of the seed's median luminance
FLAT_STD_BLOB = 3.0       # ...and the grown blob must still be flat, else only the seed (+ERODE) is taken
MIN_BLOB = 12             # px after erosion, at 300p
BG_RING_MAX = 168.0       # ring median luminance below this = machine/outline = background gap
BG_RING_THIN = 150.0      # ...for a THIN blob (no 3px-eroded core of THICK_CORE px): a bright sliver between two
THICK_CORE = 20           # muscle outlines has a ring of outline+skin that lands 160-168; a real thin gap is darker
BODY_RING_MIN = 182.0     # above this = skin = body highlight
MAX_GAP = 4               # frames; a transparent run longer than this is not bridged (the fill would be a ghost)
REACH = MAX_GAP           # nearest opaque neighbour on each side must be within this
OPEN_MAX = 0.2            # a hole's ring may be at most this transparent (else it is an open edge)
OPEN_BG = 0.35            # a flash blob whose ring is at least this transparent is attached to the OUTSIDE: the
                          # background kept around the silhouette (or an island of it). Never a body highlight —
                          # those sit inside the outline. Cleared without the ring test.
BLINK_FRAC = 0.6          # a closed blob is ANCHORED when this much of it is transparent in the frame before or after...
RING_STABLE = 0.8         # ...while this much of its opaque ring is still opaque there: the matte flipped, nothing moved.
SKIN_LUM = 200            # ...or, when it never blinks, the 3-5px band beyond its ring holds at most SKIN_BAND_MAX of
SKIN_BAND_MAX = 0.15      # skin: the gap is bounded by machine (KCC panel 0.00, assisted-pull-up slabs 0.01 and
                          # 0.10-0.16). A body strip between tendon outlines has the ring of a gap and skin beyond it
                          # (0.26-0.40); a gap between two limbs reads 0.23 and is cleared only when it blinks.
SKIN_WINDOW = 6           # frames; the band fraction is averaged over ±this before the test — measured per frame it
                          # wobbles across any threshold (the pull-up slab: .10 .12 .16 .11 .15) and a static gap
                          # would be cleared on alternate frames, which is a strobe we made ourselves.
VOTE_WINDOW = 3           # frames; a clear is kept where the majority of its run within ±this agrees
EDGE_TOL = 15             # a static gap's pixels are counted over its anti-aliased edge (min-RGB down to BRIGHT-this):
                          # measured, every pop the fix itself made on the panel loops was a 1px edge pixel at 193-205
STATIC_MIN_FRAMES = 8     # a static gap pixel is opaque-bright for at least this many frames of the loop (a panel:
                          # 30-100); a highlight sweeping over a limb sits on a pixel for 2-3 and once cut a forearm
SHEET_BIG = 0.08          # a loop is a SHEET loop when, in its median frame, the largest opaque-bright component
                          # covers at least this fraction of the frame: the matte failed and the source background
                          # is still there as a sheet (3 loops: 17-30%; a body highlight is a few percent at most).
SHEET_BIG_ANY = 0.25      # ...or when ANY frame's largest component covers this much: the sheet came and went (decline-
                          # push-up: 11 of 151 frames, 44% at worst, and the debris of it in the other 140). The largest
                          # such component on a loop that is not a sheet loop is 9.5%, a white machine part.
SHEET_ERODE = 2           # the sheet is flooded from the frame border over transparent-or-bright pixels, eroded
                          # by this first so a 1px gap in the figure's outline is not a door (a raw flood eats
                          # 1-4k px of body per frame; eroded by 2 it eats a few dozen on a forge loop)
ISLAND_OPEN = 0.5         # after the flood, an opaque-bright component whose ring is at least this transparent
                          # (the flood counts) with no skin in the rest of its ring is an island of the sheet
DEBRIS_MAX = 100          # px; on a sheet loop a component (any alpha) up to this size with no bigger component
                          # within 2px is the blotch-edge dust the sheet leaves behind (the figure, the machine, a
                          # dumbbell in a hand are thousands of px; the fringe around them is attached to them)
TRANSIENT_OPFRAC = 0.5    # a dark-ringed blob that neither blinks nor is bounded by machine is still cleared when its
TRANSIENT_MIN = 800       # pixels are transparent for most of the loop, it is at least this big, and its ring is darker
TRANSIENT_RING = 146.0    # than this: the wedge of background between a band and the body that the matte keeps while
                          # the arm rises and drops when it falls (band-lateral-raise: ring 129-140, 800-4800 px, 17 of
                          # 111 frames, twice a loop); the panel between the smith uprights that is there for 22% of
                          # machine-biceps-curl (ring 142-144, 6300-6800 px). A bright flat patch on a limb that sweeps
                          # (dragon-flag shin, dive-bomber, dead-bug) has the same op_frac but a ring of outline+skin
                          # (150-165) and is 290-770 px; a panel the matte never got right is opaque all loop (perm).
PERM_PAD = 1              # a pixel that is opaque in EVERY frame is scene — a white bench leg, a treadmill console, the
                          # towers of a cable machine: graded to the same ivory as the background gaps and just as flat,
                          # with nothing in the loop to say it was ever background. Never cleared (padded by this so the
                          # anti-aliased edge of a kept part is not cut into a hairline), except on a sheet loop.
FEATHER = 0.8

LOOP_FPS = 12
QUALITY = 80              # delivered at 74; re-encoding a decoded 74 at 80 costs +5% bytes for +2 dB (alpha is lossless either way)
METHOD = 4
MINIMIZE = True

ST = ndimage.generate_binary_structure(2, 1)
ST8 = ndimage.generate_binary_structure(2, 2)


def frames_of(p):
    im = Image.open(p)
    out, durs = [], []
    try:
        while True:
            out.append(np.asarray(im.convert("RGBA")))
            durs.append(im.info.get("duration", int(1000 / LOOP_FPS)))
            im.seek(im.tell() + 1)
    except EOFError:
        pass
    return np.stack(out), durs


def _seeds(cand, lum_frame, flat_std):
    """Seeds: eroded blobs of `cand` >= MIN_BLOB px whose luminance in `lum_frame` is flat. Returns a bool mask or None."""
    if not cand.any():
        return None
    er = ndimage.binary_erosion(cand, ST, iterations=ERODE)
    if not er.any():
        return None
    lbl_e, n = ndimage.label(er)
    areas = np.bincount(lbl_e.ravel())
    seed = np.zeros_like(cand)
    for i in range(1, n + 1):
        if areas[i] < MIN_BLOB:
            continue
        sel = lbl_e == i
        if float(lum_frame[sel].std()) <= flat_std:
            seed |= sel
    return seed if seed.any() else None


def _seeded_components(cand, lum_frame, flat_std=FLAT_STD_HOLE):
    """Whole components of `cand` that contain a seed (a hole has thin fingers between muscle groups
    that the erosion removes, and the fill has its own guards)."""
    seed = _seeds(cand, lum_frame, flat_std)
    if seed is None:
        return None
    lbl_c, _ = ndimage.label(cand)
    ids = np.unique(lbl_c[seed])
    ids = ids[ids > 0]
    return np.isin(lbl_c, ids) if ids.size else None


def _flat_blobs(cand, lum_frame):
    """Flash blobs: each seed grown over the pixels of `cand` within GROW_TOL of the seed's median
    luminance (a gap's fingers are the same flat ivory; a shaded highlight next to it is not), then
    widened back by ERODE. A grown blob that is no longer flat is cut back to its seed — a bright
    limb whose flattest patch seeded it must not come along. Returns a bool mask or None."""
    seed = _seeds(cand, lum_frame, FLAT_STD)
    if seed is None:
        return None
    out = np.zeros_like(cand)
    lbl_s, n = ndimage.label(seed)
    for i in range(1, n + 1):
        s = lbl_s == i
        med = float(np.median(lum_frame[s]))
        near = cand & (np.abs(lum_frame - med) <= GROW_TOL)
        lbl_n, _ = ndimage.label(near)
        ids = np.unique(lbl_n[s])
        ids = ids[ids > 0]
        region = np.isin(lbl_n, ids) if ids.size else s
        blob = ndimage.binary_dilation(region, ST, iterations=ERODE) & cand
        core = ndimage.binary_erosion(blob, ST, iterations=ERODE)
        if core.sum() >= MIN_BLOB and float(lum_frame[core].std()) > FLAT_STD_BLOB:
            blob = ndimage.binary_dilation(s, ST, iterations=ERODE) & cand
        out |= blob
    return out if out.any() else None


def _ring(blob, op_t, lum_t):
    """(median luminance of the opaque ring pixels, fraction of the ring that is transparent)."""
    ring = ndimage.binary_dilation(blob, ST, iterations=2) & ~blob
    ring_op = ring & op_t
    n = int(ring.sum())
    if n == 0 or not ring_op.any():
        return None, 1.0
    return float(np.median(lum_t[ring_op])), 1.0 - float(ring_op.sum()) / n


def _nearest_opaque(op, t, direction):
    """Per pixel: distance (1..REACH) to the nearest opaque frame in `direction`, 0 if none within REACH."""
    N, H, W = op.shape
    d = np.zeros((H, W), np.int16)
    for k in range(REACH, 0, -1):
        d[op[(t + direction * k) % N]] = k
    return d


def _blinks(b, ring_op, op, t):
    """True when the blob `b` (opaque at t) is mostly transparent in the frame before or after while its
    opaque ring stays opaque there — the matte flipped on a static patch. A limb moving away takes
    its outline with it."""
    N = op.shape[0]
    for k in (-1, 1):
        o = op[(t + k) % N]
        if float((~o)[b].mean()) >= BLINK_FRAC and float(o[ring_op].mean()) >= RING_STABLE:
            return True
    return False


def _sheet(op_t, bright_t, lum_t, any_t, perm):
    """The source background kept opaque as a SHEET: everything reachable from the frame border over
    transparent-or-bright pixels (eroded by SHEET_ERODE so a pinhole in the figure's outline is not a
    door), plus the islands of it left inside the flood — any opaque-bright component whose ring is mostly
    flood/transparent and shows no skin. Returns (opaque pixels to clear, dust).
    `perm` (pixels opaque in every frame) is None when the sheet itself is there in every frame; when the
    sheet comes and goes, a permanent pixel is scene — a lit bench leg at the threshold, touching the
    background with no outline — and is neither traversed, an island, nor dust."""
    trav = ~op_t | (op_t & bright_t)
    if perm is not None:
        trav &= ~perm
    core = ndimage.binary_erosion(trav, ST8, iterations=SHEET_ERODE, border_value=1)
    lbl, n = ndimage.label(core, ST)
    if n == 0:
        return np.zeros_like(op_t), np.zeros_like(op_t)
    edge = np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]])
    ids = np.unique(edge[edge > 0])
    if ids.size == 0:
        return np.zeros_like(op_t), np.zeros_like(op_t)
    flood = ndimage.binary_dilation(np.isin(lbl, ids), ST8, iterations=SHEET_ERODE) & trav
    sheet = flood & op_t
    outside = ~op_t | sheet
    rest = op_t & bright_t & ~sheet
    if perm is not None:
        rest &= ~perm
    lbl, n = ndimage.label(rest, ST8)
    for i in range(1, n + 1):
        b = lbl == i
        ring = ndimage.binary_dilation(b, ST, iterations=2) & ~b
        if not ring.any() or float(outside[ring].mean()) < ISLAND_OPEN:
            continue
        ring_op = ring & op_t & ~sheet
        if ring_op.any() and float(np.median(lum_t[ring_op])) >= BODY_RING_MIN:
            continue
        sheet |= b
    # debris: the anti-aliased edges of the sheet's blotches are opaque and not bright, so neither the flood nor
    # an island takes them; left behind they are grey dust that moves with the blotches. A small opaque
    # component with nothing but cleared/transparent around it goes with the sheet.
    # Measured over every pixel with any alpha: most of the dust is semi-transparent (alpha 1-127), under the
    # opaque threshold and so untouched by everything above; it is returned apart, to be zeroed without a vote.
    # Dust sits next to dust, so a speck is judged against the BIG components only: nothing big within 2px.
    dust = np.zeros_like(op_t)
    lbl, n = ndimage.label(any_t & ~sheet, ST8)
    if perm is not None:
        lbl[perm] = 0
    if n:
        sizes = np.bincount(lbl.ravel())
        ids = np.nonzero(sizes > DEBRIS_MAX)[0]
        big = np.isin(lbl, ids[ids > 0])
        dust = (lbl > 0) & ~ndimage.binary_dilation(big, ST, iterations=2)
    return sheet, dust


def _run_vote(flag, M, window=None, max_len=None, any_=False):
    """Make a per-frame decision consistent along time.

    `flag` (N,H,W) is a subset of `M` (N,H,W). Per pixel, `M` is cut into circular runs of consecutive
    frames; a frame's flag becomes the MAJORITY of the flags in its run (window=None) or in the part
    of its run within ±window frames — or, with any_=True, the run is flagged whole if ANY of its
    frames is. A run longer than `max_len` is dropped altogether.
    Only pixels flagged somewhere are visited."""
    N = M.shape[0]
    touched = flag.any(axis=0)
    if not touched.any():
        return flag
    ys, xs = np.nonzero(touched)
    m = M[:, ys, xs]                                  # (N,P)
    f = flag[:, ys, xs] & m
    P = m.shape[1]
    start = m & ~np.roll(m, 1, axis=0)
    ids = np.cumsum(start, axis=0).astype(np.int32)
    ids = np.where(m & (ids == 0), ids[-1][None, :], ids)   # a run that wraps past frame 0 is one run
    ids[~m] = 0
    key = ids * P + np.arange(P, dtype=np.int32)[None, :]
    K = int(key.max()) + 1
    cnt = np.bincount(key[m], minlength=K)
    if window is None:
        pos = np.bincount(key[f], minlength=K)
        maj = (pos > 0) if any_ else ((pos * 2 >= cnt) & (pos > 0))
        out = maj[key] & m
    else:
        num = np.zeros((N, P), np.int16)
        den = np.zeros((N, P), np.int16)
        for k in range(-window, window + 1):
            same = (np.roll(ids, k, axis=0) == ids) & m
            num += np.roll(f, k, axis=0) & same
            den += same
        out = (num * 2 >= den) & (num > 0) & m
    if max_len is not None:
        out &= cnt[key] <= max_len
    res = np.zeros_like(flag)
    res[:, ys, xs] = out
    return res


def _smooth(vals, window):
    """Circular mean of `vals` (N,H,W, NaN = not measured) over ±window frames, per pixel; NaN where nothing
    was measured in the window. Only pixels measured somewhere are visited."""
    touched = np.isfinite(vals).any(axis=0)
    res = np.full(vals.shape, np.nan, np.float32)
    if not touched.any():
        return res
    ys, xs = np.nonzero(touched)
    v = vals[:, ys, xs]
    ok = np.isfinite(v)
    v0 = np.where(ok, v, 0.0).astype(np.float32)
    num = np.zeros(v.shape, np.float32)
    den = np.zeros(v.shape, np.int16)
    for k in range(-window, window + 1):
        num += np.roll(v0, k, axis=0)
        den += np.roll(ok, k, axis=0)
    out = np.full(v.shape, np.nan, np.float32)
    np.divide(num, den, out=out, where=den > 0)
    res[:, ys, xs] = out
    return res


def fix_frames(fr):
    src = fr
    fr = fr.copy()
    N, H, W, _ = fr.shape
    rgb = fr[..., :3].astype(np.int16)
    op = fr[..., 3] > 128
    op_frac = op.mean(axis=0)
    perm_px = op.all(axis=0)
    bright = rgb.min(axis=3) > BRIGHT
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    stats = {"flash_px": 0, "flash_frames": 0, "hole_px": 0, "hole_frames": 0, "ambiguous": 0,
             "flash_voted_out": 0, "flash_voted_in": 0, "hole_voted_out": 0, "hole_voted_in": 0,
             "open_px": 0, "unanchored_px": 0}
    yy, xx = np.indices((H, W))
    dark_all = np.zeros((N, H, W), bool)      # closed blobs whose ring says background
    blink_all = np.zeros((N, H, W), bool)     # ...and that blink
    skin_map = np.full((N, H, W), np.nan, np.float32)   # ...and the skin fraction of the band beyond their ring
    trans_all = np.zeros((N, H, W), bool)               # dark-ringed blobs that are transparent most of the loop
    open_all = np.zeros((N, H, W), bool)      # blobs attached to the outside
    fill_all = np.zeros((N, H, W), bool)

    # SHEET: the matte failed on the whole background. Decided once per loop, on the median frame.
    M = op & bright
    big = []
    for t in range(N):
        lbl, n = ndimage.label(M[t], ST8)
        big.append(int(np.bincount(lbl.ravel())[1:].max()) if n else 0)
    sheet_perm = float(np.median(big)) / (H * W) >= SHEET_BIG
    sheet_mode = sheet_perm or float(max(big)) / (H * W) >= SHEET_BIG_ANY
    stats["sheet"] = bool(sheet_mode)
    sheet_all = np.zeros((N, H, W), bool)
    dust_all = np.zeros((N, H, W), bool)
    any_a = fr[..., 3] > 0

    # ---------- pass 1: decide per frame ----------
    for t in range(N):
        if sheet_mode:
            sheet_all[t], dust_all[t] = _sheet(op[t], bright[t], lum[t], any_a[t], None if sheet_perm else perm_px)
        # FLASH-IN: opaque flat-bright blobs — open to the outside, or ringed by machine/outline
        z = _flat_blobs(op[t] & bright[t], lum[t])
        if z is not None:
            lbl, n = ndimage.label(z)
            blobs = []
            gapish = np.zeros((H, W), bool)   # every blob whose ring says background — the band test must not
            for i in range(1, n + 1):         # count a NEIGHBOURING gap as skin (cable-crossover panels sit 3-5px apart)
                b = lbl == i
                rl, tr = _ring(b, op[t], lum[t])
                blobs.append((b, rl, tr))
                if rl is None or rl < BG_RING_MAX:
                    gapish |= b
            for b, rl, tr in blobs:
                if tr >= OPEN_BG and (rl is None or rl < BODY_RING_MIN):
                    open_all[t] |= b
                    continue
                if rl is None:
                    continue
                core = int(ndimage.binary_erosion(b, ST, iterations=3).sum())
                if rl < (BG_RING_MAX if core >= THICK_CORE else BG_RING_THIN):
                    # the ring says background; a bright flat body strip between tendon outlines says the same.
                    # It qualifies when it BLINKS (the matte flipped on a static patch) or when what lies
                    # beyond the outline is machine, not skin (then it may be static — a gap the matte
                    # never got right, shown in every frame).
                    ring_op = ndimage.binary_dilation(b, ST, iterations=2) & ~b & op[t]
                    d3 = ndimage.binary_dilation(b, ST, iterations=3)
                    band = ndimage.binary_dilation(d3, ST, iterations=2) & ~d3 & op[t]
                    band_own = band & ~gapish
                    dark_all[t] |= b
                    if rl < TRANSIENT_RING and int(b.sum()) >= TRANSIENT_MIN and float(op_frac[b].mean()) <= TRANSIENT_OPFRAC:
                        trans_all[t] |= b
                    if band_own.any():
                        skin_map[t][b] = float((lum[t][band_own] > SKIN_LUM).mean())
                    else:
                        skin_map[t][b] = 0.0 if band.any() else 1.0   # bounded by other gaps / by nothing opaque
                    if _blinks(b, ring_op, op, t):
                        blink_all[t] |= b
                elif rl < BODY_RING_MIN:
                    stats["ambiguous"] += 1

        # HOLE: transparent now, opaque+bright on both sides within REACH, ringed by skin
        db = _nearest_opaque(op, t, -1)
        da = _nearest_opaque(op, t, +1)
        cand = ~op[t] & (db > 0) & (da > 0)
        if not cand.any():
            continue
        nb = src[(t - db) % N, yy, xx]
        na = src[(t + da) % N, yy, xx]
        nb_br = nb[..., :3].min(axis=2) > BRIGHT
        na_br = na[..., :3].min(axis=2) > BRIGHT
        lum_nb = 0.299 * nb[..., 0].astype(np.float32) + 0.587 * nb[..., 1] + 0.114 * nb[..., 2]
        # seed on pixels bright in both neighbours; the component may extend over any blinking pixel
        z = _seeded_components(cand & nb_br & na_br, lum_nb)
        if z is None:
            continue
        lbl_c, _ = ndimage.label(cand)
        ids = np.unique(lbl_c[z])
        ids = ids[ids > 0]
        z = np.isin(lbl_c, ids)
        lbl, n = ndimage.label(z)
        for i in range(1, n + 1):
            b = lbl == i
            if int(b.sum()) < MIN_BLOB:
                continue
            rl, tr = _ring(b, op[t], lum[t])
            if rl is None or tr > OPEN_MAX:
                continue
            if rl > BODY_RING_MIN:
                fill_all[t] |= b
            elif rl > BG_RING_MAX:
                stats["ambiguous"] += 1

    # ---------- pass 2: a decision covers a run, not a frame ----------
    # A pixel's run of opaque-bright frames is cleared as a whole (a windowed vote, so a long run whose
    # ring changes halfway can still change halfway); a transparent run is filled as a whole, and only
    # when it is short enough to bridge. Anything else was a pop we would have introduced.
    skin = _smooth(skin_map, SKIN_WINDOW)
    perm = ndimage.binary_dilation(perm_px, ST, iterations=PERM_PAD)[None]
    stats["perm_px"] = int(((dark_all | open_all) & perm).sum())
    dark_all &= ~perm
    open_all &= ~perm
    blink_clear = dark_all & (blink_all | trans_all)   # a transient wedge is voted like a blink: over its run
    static_clear = dark_all & ~blink_all & (skin <= SKIN_BAND_MAX)
    clear_all = blink_clear | static_clear
    stats["transient_px"] = int((dark_all & trans_all & ~blink_all).sum())
    stats["unanchored_px"] = int((dark_all & ~clear_all).sum())
    # a blink is judged within a window (a long run whose ring changes halfway may change halfway); a static
    # gap is judged once per PIXEL over the whole loop — a panel is see-through for the whole loop or not at
    # all, and it has to be there for a real stretch of frames: a highlight sweeping over a limb is flat in one
    # frame and opaque-bright on any given pixel for two or three, and a run vote would clear it for that frame.
    # (the pixel's frames are counted over the panel's anti-aliased edge too — a pixel just under BRIGHT on some
    # frames would otherwise sit outside the count and blink at 1px along the cleared edge)
    M_edge = op & (rgb.min(axis=3) > BRIGHT - EDGE_TOL)
    cnt = M_edge.sum(axis=0)
    pos = (static_clear & M_edge).sum(axis=0)
    static_px = (cnt >= STATIC_MIN_FRAMES) & (pos * 2 >= cnt) & (pos > 0)
    # ...and within an eligible pixel, a run is cleared when it carries the flag at all: the anti-aliased edge of
    # a bar or an arm moving over the cleared gap is a one-frame run just under BRIGHT that was never a blob
    s2s = static_px[None] & _run_vote(static_clear & M_edge, M_edge, window=None, any_=True)
    stats["static_dropped_px"] = int((static_clear & ~s2s).sum())
    c2 = _run_vote(blink_clear, M, window=VOTE_WINDOW) | s2s
    stats["flash_voted_out"] = int((clear_all & ~c2).sum())
    stats["flash_voted_in"] = int((c2 & ~clear_all).sum())
    # background attached to the outside (open blobs, the sheet) is voted over the anti-aliased edge too: a
    # silhouette pixel hovering around BRIGHT would otherwise join the clear on some frames and not others
    o2 = _run_vote(open_all, M_edge, window=VOTE_WINDOW)
    stats["open_px"] = int(o2.sum())
    s2 = _run_vote(sheet_all, op, window=VOTE_WINDOW) if sheet_mode else sheet_all   # over op: debris is not bright
    stats["sheet_px"] = int(s2.sum())
    clear_all = c2 | o2 | s2
    f2 = _run_vote(fill_all, ~op, window=None, max_len=MAX_GAP)
    stats["hole_voted_out"] = int((fill_all & ~f2).sum())
    stats["hole_voted_in"] = int((f2 & ~fill_all).sum())
    fill_all = f2

    # ---------- pass 3: apply ----------
    new_alpha = fr[..., 3].astype(np.float32)
    stats["dust_px"] = int(dust_all.sum())
    for t in range(N):
        new_alpha[t][dust_all[t]] = 0
        clear = clear_all[t]
        if clear.any():
            clear = (ndimage.binary_closing(clear, ST) & op[t]) | clear   # 1px notches at the blob edge go with it
            soft = ndimage.gaussian_filter(clear.astype(np.float32), FEATHER)
            new_alpha[t] = new_alpha[t] * (1.0 - np.clip(soft * 1.4, 0, 1))
            new_alpha[t][clear] = 0
            stats["flash_px"] += int(clear.sum())
            stats["flash_frames"] += 1
        fillm = fill_all[t]
        if fillm.any():
            db = _nearest_opaque(op, t, -1).astype(np.float32)
            da = _nearest_opaque(op, t, +1).astype(np.float32)
            ok = fillm & (db > 0) & (da > 0)
            # never fill from a pixel the clear took: on a sheet loop the blotches in one frame's sheet are
            # "holes" between two opaque-bright neighbours, and the fill would paint the sheet back into them
            ok &= ~clear_all[(t - db.astype(np.int16)) % N, yy, xx] & ~clear_all[(t + da.astype(np.int16)) % N, yy, xx]
            nb = src[(t - db.astype(np.int16)) % N, yy, xx].astype(np.float32)
            na = src[(t + da.astype(np.int16)) % N, yy, xx].astype(np.float32)
            wb = (da / np.maximum(db + da, 1))[..., None]                 # closer neighbour weighs more
            fill = wb * nb + (1.0 - wb) * na
            fr[t][ok] = fill[ok].astype(np.uint8)
            new_alpha[t][ok] = fill[ok, 3]
            stats["hole_px"] += int(ok.sum())
            stats["hole_frames"] += 1
    fr[..., 3] = np.clip(new_alpha, 0, 255).astype(np.uint8)
    return fr, stats


def write_loop(fr, durs, dst):
    ims = [Image.fromarray(f, "RGBA") for f in fr]
    tmp = Path(str(dst) + ".tmp")
    ims[0].save(tmp, "WEBP", save_all=True, append_images=ims[1:],
                duration=list(durs) if durs else int(1000 / LOOP_FPS),   # per-frame, as delivered (83/84 ms alternate)
                loop=0, quality=QUALITY, method=METHOD, minimize_size=MINIMIZE)
    tmp.replace(dst)


def fix_file(src, dst):
    """One loop. Writes `dst` only when something changed. Returns the stats dict (+ 'changed')."""
    fr, durs = frames_of(src)
    fixed, stats = fix_frames(fr)
    stats["frames"] = int(len(fr))
    stats["changed"] = bool(stats["flash_px"] or stats["hole_px"] or stats["dust_px"])
    if stats["changed"]:
        Path(dst).parent.mkdir(parents=True, exist_ok=True)
        write_loop(fixed, durs, dst)
        # which frames moved, so a poster (frame len//10) can be re-cut only when its frame did
        delta = ((fr[..., 3] > 128) != (fixed[..., 3] > 128)).reshape(len(fr), -1).sum(axis=1)
        stats["changed_frames"] = [int(i) for i in np.flatnonzero(delta)]
    return stats


def _tree_one(job):
    src, dst, rel = job
    try:
        return rel, fix_file(src, dst)
    except Exception as e:  # noqa: BLE001
        return rel, {"error": repr(e)}


def main(argv):
    if len(argv) == 4 and argv[1] == "--tree":
        root, out = Path(argv[2]), Path(argv[3])
        paths = sorted(root.rglob("*.webp"))
        jobs = [(str(p), str(out / p.relative_to(root)), str(p.relative_to(root)).replace("\\", "/")) for p in paths]
        t0 = time.time()
        report = {}
        with ProcessPoolExecutor() as ex:
            for i, (rel, st) in enumerate(ex.map(_tree_one, jobs, chunksize=2), 1):
                report[rel] = st
                if i % 100 == 0:
                    print(i, "/", len(jobs), "changed", sum(1 for v in report.values() if v.get("changed")),
                          "%.0fs" % (time.time() - t0), flush=True)
        out.mkdir(parents=True, exist_ok=True)
        (out / "report.json").write_text(json.dumps(report, indent=0))
        print("done:", len(report), "loops,", sum(1 for v in report.values() if v.get("changed")), "changed,",
              sum(1 for v in report.values() if "error" in v), "errors ->", out / "report.json")
    elif len(argv) == 3:
        st = fix_file(argv[1], argv[2])
        print(Path(argv[2]).name, st)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
