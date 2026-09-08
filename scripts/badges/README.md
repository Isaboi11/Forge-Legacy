# Forge Legacy — Paper Mode Rank Badges — Claude Code Handoff

Paste everything below into Claude Code, pointed at the Forge Legacy repo.

---

## Prompt

Add Paper Mode (light theme) variants of all 32 rank-badge cutouts and make the badge component theme-aware. Everything needed is in this folder: `assets/` holds the 32 graded PNGs, `tools/` holds the two grading scripts, and this file is the spec. Copy `assets/*-paper.png` into the repo's badge asset directory (next to the existing dark `{family}-{tier}.png` files) and `tools/*.js` into a `tools/badges/` directory. The repo work is wiring the PNGs in and keeping the tools so the set can be regenerated if the source art changes.

**Tool runtime note.** `paper-grade.js` and `die-cut.js` were written for a browser canvas environment and take three injected helpers: `readImage(path) → HTMLImageElement`, `createCanvas(w,h) → canvas with getContext('2d')`, `saveFile(path, canvas)`. To run them in Node, write a ~20-line adapter using the `canvas` npm package (`loadImage`, `createCanvas`, `canvas.toBuffer('image/png')` + `fs.writeFileSync`) and pass it in as `window.FLPaperGrade({readImage, createCanvas, saveFile})` — define `window = globalThis` first. Regeneration is optional; the shipped PNGs are final.

### What is being delivered

Every badge in `assets/` has a `-paper.png` sibling with identical dimensions and naming:

```
assets/{family}-{tier}.png          dark theme (existing, unchanged)
assets/{family}-{tier}-paper.png    Paper Mode (new)
```

Families: `foundation`, `builder`, `craftsman`, `architect`, `established-m`, `established-f`, `hall`, `legacy`. Tiers 1–4. 32 files total.

Exception: `architect-{1..4}-paper.png` are **taller** than their dark siblings (1534–1535px vs 1443px). The source canvas ends while the badge is still tapering, so the bottom point was reconstructed (see below). Render them with `width: 100%; height: auto` and they align correctly; do not force the dark aspect ratio.

### Component change

`RankBadge` (or whatever component resolves `assets/{rank}-{tier}.png`) gets a `theme` prop:

```ts
theme?: 'dark' | 'paper'   // default 'dark'
```

Resolution:

```ts
const suffix = theme === 'paper' ? '-paper' : '';
const src = rank === 'established'
  ? `assets/established-${sex}-${tier}${suffix}.png`
  : `assets/${rank}-${tier}${suffix}.png`;
```

Wire `theme` to the app's existing Paper Mode switch (`data-theme="paper"` / ThemeProvider — whichever the light theme already uses). No other component, spacing, or layout changes.

### How the Paper grade works (so it can be regenerated)

The badges are re-grades of the existing dark artwork, not new illustrations. Two tools, both plain browser JS operating on canvas pixels, are included:

**`tools/paper-grade.js`** — `window.FLPaperGrade({readImage, createCanvas, saveFile})` returns `grade(name, opts)`.

1. **Colour grade.** Source luminance is remapped through a curated bronze ramp (`#33281E → #463424 → #6B5231 → #8E6E40 → #B2914F → #D5BE8A → #F0E7D2`, gamma 0.92). Lighting direction is preserved; blacks are lifted to warm umber, not inverted. Forge glow is held at terracotta `#B4491C` (saturation ≥ 0.82, hue 19–30°, strength 0.42) so it stays warm without going neon on cream.
2. **Silhouette (default "alpha path").** Start from the source's own alpha outline, shrink each row inward past near-black padding (`darkCut`, default 10), clamp the top/bottom tapers so they never widen away from the widest row, detect the straight-wall region from the profile (rows ≥ 98.5% of max width — *not* a fixed fraction of height), median-filter the edges, and snap wall rows to the **modal** edge level in both directions.
3. **Repair.** Fill interior transparent holes horizontally from the same row; force alpha 255 for every interior pixel (the sources carry partial-alpha columns that are invisible on black but read as pale streaks on cream); keep only the outermost pixel per row anti-aliased.

**`tools/die-cut.js`** — `window.FLDieCut({...})` returns `dieCut(name, geom)`. For families whose alpha is not a usable outline, cut a sticker silhouette geometrically: a pointy-top hexagon (taper = 0.56 × half-width, measured from the art) unioned with an octagonal numeral plate, filled from a raw-graded image and anti-aliased with 3×3 supersampling.

### Per-family recipe (exact calls used)

Run `grade` first for every file. For die-cut families, run `grade(name, {rawGrade:true})` then `dieCut` **in a separate step** (the fill helpers buffer writes until the script ends).

```js
// Alpha path — defaults
for (const f of ['foundation','established-m','established-f','hall','legacy'])
  for (let t=1;t<=4;t++) await grade(`${f}-${t}`);

// Architect — alpha path, then close the truncated bottom point (see below)
for (let t=1;t<=4;t++) await grade(`architect-${t}`);

// Craftsman — raw grade, then die-cut
for (let t=1;t<=4;t++) await grade(`craftsman-${t}`, {rawGrade:true});
await dieCut('craftsman-1',{cx:188.5, hw:167.5, yTop:11, yApex:437, plate:{pw:48, yTop:398, yBot:445, chamfer:14}});
await dieCut('craftsman-2',{cx:191,   hw:167,   yTop:11, yApex:437, plate:{pw:48, yTop:398, yBot:445, chamfer:14}});
await dieCut('craftsman-3',{cx:190,   hw:167,   yTop:11, yApex:437, plate:{pw:48, yTop:398, yBot:445, chamfer:14}});
await dieCut('craftsman-4',{cx:218,   hw:167,   yTop:12, yApex:438, plate:{pw:48, yTop:399, yBot:446, chamfer:14}});

// Builder — raw grade, then die-cut
for (let t=1;t<=4;t++) await grade(`builder-${t}`, {rawGrade:true});
await dieCut('builder-1',{cx:205, hw:159, yTop:11, yApex:404, plate:{pw:46, yTop:376, yBot:412, chamfer:12}});
await dieCut('builder-2',{cx:193, hw:166, yTop:10, yApex:420, plate:{pw:46, yTop:392, yBot:428, chamfer:12}});
await dieCut('builder-3',{cx:190, hw:163, yTop:11, yApex:414, plate:{pw:46, yTop:386, yBot:422, chamfer:12}});
await dieCut('builder-4',{cx:165, hw:159, yTop:11, yApex:404, plate:{pw:46, yTop:376, yBot:412, chamfer:12}});
```

**Architect bottom-point reconstruction.** After grading, extend the canvas by `ceil(halfWidthAtLastRow / slope)` rows (slope measured over the final 60 rows), and for each new row `k` copy row `y1 − ((k−1) mod 34) − 1` (a 34-row band just above the cut, so the numeral plate is never sampled), clipped to the continuing taper. Result: 91, 92, 119, 118 added rows for tiers I–IV.

### Known source-art defects (not fixable by grading)

- **Craftsman I–IV** all show **IV** on the numeral plate. Needs the source art regenerated for tiers I–III.
- **Craftsman IV** source is a crop — the badge is cut off at the right edge with a stray glyph in the left margin. The die-cut geometry above masks it; regenerate when convenient.
- **Builder II** source has no real alpha cutout and a lit surround; **Builder III** has an opaque black block on the right. Both are handled by the explicit die-cut geometry.

### Verify

- Every `-paper.png` is a single contiguous silhouette (no detached specks, no interior holes, no interior partial alpha).
- Nothing outside the badge outline: on a `#F4F0E6` ground, no 90° corners at the shoulders, no floating bars above the apex, no debris below the plate.
- Walls are straight (one dominant edge level per side); tapers converge to a point; plates are intact and, on Builder/Craftsman, protrude ~8px below the apex.
- Reference sheet: `Rank Badges - Paper.dc.html` in the design project shows all 32 on paper at three app sizes.

---

*Reference files (design tool): `Rank Badges - Paper.dc.html`, `FoundationBadge.dc.html` (theme-aware component), `tools/paper-grade.js`, `tools/die-cut.js`.*

---

## Repo-side notes (added when this was wired in)

Three things differ between this handoff and the repository, recorded here so the next delivery does
not trip on them.

- **`hall` is `legend`.** This delivery names that family after the design's `hall` art; the repo has
  always called it `legend` (`domain/rank-artwork/resolver.ts`, and `badge-art.ts` says so). The four
  files were renamed to `legend-{1..4}-paper.png` on the way in. **A re-delivery must be renamed too**,
  or those four badges silently fall back to nothing.
- **These tools live in `scripts/badges/`, not `tools/badges/`.** The repo keeps every build-time
  transform under `scripts/` — `scripts/paper-plates/` produced the light background plates the same
  way. Only the directory moved; the files are byte-identical to the delivery.
- **"Identical dimensions" holds for two families, not eight.** `established-*` and `legacy` match their
  masters exactly. The rest keep the master's *aspect* but not its resolution (foundation 4.7× the
  pixels, hall/legend 5.7×, architect 7.6×, builder 0.63×, craftsman 0.70×). Aspect is what the render
  sites need — every badge is drawn `contentFit="contain"` in a square box — and
  `domain/rank-artwork/__tests__/rank-art-alpha.test.mjs` asserts it, with Architect exempted for the
  documented bottom-point reconstruction.

### The Craftsman numerals are patched here, as a stopgap

**The `Craftsman I–IV all show IV` defect was found independently on this side before the handoff
arrived, so it is confirmed by two routes.** It was on every surface that draws a Craftsman badge —
Legacy hero, Progress Hub, Rank Progression, the M-1 ceremony and the rank-ascension post — so it is
patched rather than left waiting: `scripts/badges/craftsman-numerals.py` rebuilds tiers I–III from each
badge's own `I` glyph, in both themes. Nothing draws a numeral; the glyph is lifted from the left third
of the badge's own `IV`, so the typeface, bevel, specular direction and metal are the badge's own.

⚠ **Delete that script when the source art is regenerated for tiers I–III.** It is pixel surgery on
somebody else's artwork and the right fix is upstream; re-running it after a corrected re-delivery would
stamp glyphs over already-correct numerals. Tier IV is never touched — its numeral was always right, and
it is the file this handoff flags as a bad crop.
