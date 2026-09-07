# Exercise Animation Pipeline

Turns the raw exercise animations (white-background 3D anatomy renders, `.mp4`) into
**looping transparent WebP** assets that match the app: the red "target muscle" highlight
recolored to the app **bronze**, the white background removed, and the whole figure
**warm-graded** to sit in the dark forged UI.

The source library (Seagate `Forge Legacy Animations/`) is ~9k MP4s (male + female,
gym / home / library). These scripts process a chosen subset and write one `.webp` per clip.

```
input:  Barbell-Split-Snatch_Weightlifting_.mp4   (white bg, red target muscle, ~6s @30fps 1080p)
output: Barbell-Split-Snatch_Weightlifting_.webp  (transparent, bronze muscle, 720h @24fps, looping)
```

---

## Setup

```bash
pip install -r requirements.txt
winget install Gyan.FFmpeg          # Windows; or any ffmpeg on PATH
```
`process_clip.py` auto-detects ffmpeg (PATH, winget/choco, common locations) or honours a
`FFMPEG=/path/to/ffmpeg` env var.

---

## Usage

**One clip** (quick test):
```bash
python process_clip.py "in.mp4" "out.webp"
```

**Match the app catalog to the library** (produces a review sheet + a process list):
```bash
# 1) list the library files
find "/d/Forge Legacy Animations/MP4" -iname '*.mp4' > library_list.txt
# 2) match
python match_catalog.py \
  "../../src/domain/exercise-relationships/source/exercises.json" \
  library_list.txt  ./out
```
This writes `out/catalog_match_review.csv` — **review it.** Token matching is fuzzy and
*will* mis-pick (e.g. "Bulgarian Split Squat" can grab "**Zercher** Bulgarian Split Squat").
It also writes `out/process_list.txt` (the confident matches).

**Batch process** (parallel, resumable):
```bash
python batch.py process_list.txt "D:/Forge Legacy Animations/Processed" 8 --by-gender
```
`--by-gender` routes outputs into `Processed/male/` and `Processed/female/`.
Re-running **skips everything already done** — safe to stop/resume. Failures are written to
`<out_root>/_failures.txt`; re-run with that file to retry only those.

Throughput: ~4 min/clip (native-resolution matte); 8 workers ≈ ~100 clips/hour. On a 16 GB
machine keep workers ≤ 8 (each peaks ~1–1.5 GB).

---

## How the matte works (and why it's the hard part)

The renders have **no alpha**. A see-through gap between two limbs is **pixel-identical**
to a bright muscle highlight — both pure white — so naive keying either leaves white blobs
in the gaps or punches holes in the muscles. `matte()` classifies each white blob as
background only if **either**:

1. **Dark-ring** — a large fraction of its border is near-black. Catches gaps next to
   equipment / the silhouette edge.
2. **Big-and-flat-255** — it's large *and* almost perfectly pure `255,255,255`. Catches
   see-through gaps between limbs that are bordered by *light* body (invisible to test 1).
   Muscle highlights are smaller AND only partly pure-255 (form shading), so the **area gate
   spares them**. This distinction only survives at **native resolution** — downscaling
   blurs the exact-255 signal away — which is why the matte runs before the downscale.

Tiny leftover notches are filled (`HOLE_MAX_FRAC`); large gaps stay transparent.
The recolor targets red by **saturation** (the only saturated thing in a grey frame).

### Flicker: the decision is per frame, and it flips

Both rules run on one frame at a time, so a blob near a threshold is background in this frame
and body in the next. Two shapes of glitch come out of that, and they look the same to the
rules (both are 255-white in the source):

- **flash-in** — a gap the matte KEPT for a frame or a stretch of frames: a flat ivory slab of
  background between an arm and the machine (assisted-pull-up, 16 frames).
- **hole** — a bright muscle highlight the matte called a gap: the lower back of
  barbell-back-squat vanishing 2 frames on / 2 frames off.

`fix_flicker.py` repairs a **delivered** loop without the source. A blob is a flat, near-white
component (luminance std ≤ 2.5 over its 2px-eroded seed — a real gap is 0.5–1.9, the flattest limb
we were ever wrong about 4.8; the seed grows only over pixels within 6 of its median). What decides
is the 2px **ring** around it: skin (median luminance ~190–235) means body → a hole is filled from
the nearest opaque neighbour frames; steel and outlines (~130–160) mean background. Over the 18,297
blink events in the 2,268 live loops the ring luminance is bimodal with a valley at 150–180, and
the valley is left alone. A thin sliver (no 3px core) needs a darker ring still — a bright strip
between two muscle outlines reads 160–168 and is body.

A dark-ringed blob is cleared on one of four grounds:

- **blink** — it is transparent in the frame before or after while its ring stays put: the matte
  flipped on a static patch.
- **static** — it never blinks, and the 3–5px band beyond its ring is machine, not skin (≤ 15%
  skin, averaged over ±6 frames, neighbouring gaps excluded from the band). Decided once per
  **pixel** over the whole loop — opaque-bright for ≥ 8 frames and flagged in most of them — so a
  panel is see-through for the whole loop or not at all, and a highlight sweeping over a forearm
  (flat for one frame, on a pixel for two) is never cut.
- **transient** — it neither blinks nor is bounded by machine, but its pixels are transparent for
  most of the loop, it is ≥ 800 px, and its ring is darker still (< 146): the wedge of background
  between a band and the body that the matte keeps while the arm rises and drops when it falls
  (band-lateral-raise: 17 of 111 frames, 10k px at its widest), the panel between smith uprights
  that is there for a fifth of machine-biceps-curl. A bright patch on a sweeping limb (dragon-flag
  shin, dead-bug) has the same opacity profile but a ring of outline+skin (150–165) and is < 800 px.
  Voted like a blink, over its run.
- **open** — its ring is mostly transparent: background kept around the silhouette. A body
  highlight sits inside the outline, so no ring test.

The verdict is then made consistent **along time** before anything is written: a clear is voted
over the pixel's run of opaque-bright frames (±3), a fill over its whole transparent run, and a run
longer than 4 frames is never bridged. Static and open clears are voted over the anti-aliased edge
too (min-RGB down to 190), because every pop the fixer itself made on the panel loops was a 1px
edge pixel just under the brightness threshold. Without the vote the fixer was a second source of
pops (glute-bridge: 20k px of new 1–2 frame pops; with it, 28). A fill never sources from a pixel
the clear took. Alpha is lossless in WebP, so untouched pixels come back byte-identical; RGB is
re-encoded at q80.

**Permanent pixels are scene.** A pixel that is opaque in *every* frame is never cleared (padded
by 1px so a kept part's anti-aliased edge is not cut to a hairline). The white bench legs, a
treadmill console, smith uprights and the towers of a cable machine are graded to the same ivory
as a background gap, just as flat, with the same dark ring — measured, nothing in colour, ring
transparency or band opacity separates them; only whole-loop opacity does. The cost is that a gap
panel which is opaque in every frame (kneeling-cable-crunch, assisted-pull-up, lat-pulldown,
cable-crossover: 26–91% of their gap pixels) is left as it is — static ivory, not a flicker.

**Sheet loops.** On a handful of loops the matte failed outright and the whole background is
still there (largest opaque-bright component ≥ 8% of the median frame; forge/male
hanging-knee-raise, lying-leg-curl-machine, dumbbell-front-squat, dumbbell-bulgarian-split-squat)
— or came and went (≥ 25% in *any* frame; forge/male decline-push-up: 11 of 151 frames, and the
debris of it in the other 140). There the sheet is flooded from the frame border over
transparent-or-bright pixels (eroded by 2 first so a pinhole in the outline is not a door), plus
islands of it inside the figure and the semi-transparent dust its blotch edges leave behind
(components ≤ 100 px with nothing bigger within 2px). When the sheet is permanent nothing is
scene; when it is transient, permanent pixels are excluded from the flood, the islands and the
dust (the flood otherwise eats the lit side of a bench leg that touches the sheet with no
outline). The figure's own edge motion against the now-transparent background shows up as
"new pops" in the metric; it is the figure, not a defect.

Forge and paper loops are **not twins** (different crops and frame counts) — each is classified
on its own colours. Not fixable here: a hole longer than 4 frames (a face), a static gap bounded
by skin on both sides (between two limbs), the pale ivory panels of the cable-crossover machines
(their band reads as skin — partially cleared, otherwise left), a gap panel that is opaque in
every frame, ambiguous rings, and dust chains longer than 100 px on a sheet loop.

```bash
python fix_flicker.py in.webp out.webp
python fix_flicker.py --tree ./live-loops ./fixed      # forge/<sex>/<id>.webp + paper/...; writes CHANGED loops + report.json
python upload_fixed.py ./fixed --dry-run               # then without --dry-run, with the service key in the env
```

`upload_fixed.py` upserts the loops under their `media.ts` keys and re-cuts a poster only when
the poster frame (`len//10`) was one of the frames that changed. Then bump `MEDIA_REV` in
`src/domain/exercise-detail/media.ts` — the objects are cached for a year at every hop, so a
re-upload under the same key reaches nobody who has already watched the clip.

---

## Tunables (`process_clip.py`)

| const | meaning |
|---|---|
| `WORK_H` / `FPS_OUT` / `QUALITY` | output height, fps, WebP quality |
| `BRONZE_H` `S_*` `V_LIFT` | recolor target = app bronze `#BA8654`/`#C99767` |
| `WARM_TINT` | warm grade applied to neutral greys only |
| `DARK_FRAC` / `DARK_VAL` | dark-ring pocket rule |
| `E255_FRAC` / `BIG_FLAT_FRAC` | big-flat-255 gap rule (the muscle-safe one) |
| `AREA_MIN` / `HOLE_MAX_FRAC` | highlight protection / tiny-notch fill |

These are **tuned** against real clips — change one at a time and eyeball the result
(composite over the app charcoal `#0E0E12` AND over magenta to spot stray transparency).

---

## Known limitations

- **Matching is fuzzy** — the exercise→file map needs human review (`catalog_match_review.csv`).
  Some catalog exercises (strongman, mobility) aren't in this gym library at all.
- **Residual sub-pixel roughness** at limb junctions (armpit, inner knee) can show when zoomed
  ~10×, but is invisible at the ~132 dp media-slot size. A transparent-background source would
  eliminate it; this library doesn't have one.
- WebP isn't animated by Windows Explorer/Photos — preview in a browser or the app.
- All frames of a clip are held in memory (~700 MB at 720h); fine for these ~6 s clips.
