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
