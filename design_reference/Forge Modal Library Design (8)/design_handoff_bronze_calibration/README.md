# Handoff: Bronze renders yellow-gold on device

## Overview

Forge Legacy's bronze accent looks correct on a desktop browser and reads **yellow-gold / brassy** on
the phone. The phone is the shipping surface, so the phone is the target. This is a colour-management
and compositing problem, not a taste problem — there are four independent causes and they compound.

**This is a fix brief, not a feature build.** There are no new screens. The work is: diagnose which of
four causes are active in *this* codebase, then apply the corresponding corrections. Diagnosis comes
first — do not start editing tokens until step 0 is answered, because two of the four causes only exist
on web and one only exists in React Native.

---

## About the design files

`reference/` and `bronze-calibration-standalone.html` are **design references created in HTML** —
diagnostic prototypes showing the intended look and the test methodology. They are not production code
to copy. The bronze *values* in them are authoritative; the HTML around them is not.

`bronze-calibration-standalone.html` is a single self-contained file. **Open it on the target phone.**
It is the instrument for this whole task — it renders the hue ladder, the chroma ladder, the grain
blend A/B, and a live gamut probe on the real device. Every "pick a value" decision below is made by
looking at that file on the hardware, not by reasoning about hex codes.

## Fidelity

**High-fidelity.** Every hex value, alpha, hue angle, and gradient stop below is exact and has been
derived from `tokens/foundation.css` (copied into `reference/`). Use them verbatim.

---

## Step 0 — Determine the stack before changing anything

Answer these three questions first and record the answers. They gate everything downstream.

1. **Is the app React Native / Expo, or web?**
   The design system guide states base values originate in `src/constants/tokens.ts`, which suggests
   React Native or a TypeScript web app. Confirm by looking for `react-native` in `package.json`.

2. **How is the full-bleed "forged grain" noise layer implemented in production?**
   In the HTML prototypes it is a `<div>` with `mix-blend-mode: overlay` at 0.05–0.09 opacity, present
   in ~40 files. Find the production equivalent — search for `grain`, `noise`, `turbulence`, `blend`,
   `overlay`, `BlendMode`.
   - If it uses a **blend mode** (CSS `mix-blend-mode`, `react-native-skia` `BlendMode`,
     `expo-blur`, or a native composite) → **Cause C is active. It is the most likely single culprit.**
   - If it is a plain image or view at low opacity with **no blend mode** → Cause C does not apply.
     React Native has no built-in `mix-blend-mode`, so unless Skia or a custom native view is in play,
     expect this outcome.

3. **How are the bronze gradients rendered?**
   CSS `linear-gradient`, `expo-linear-gradient`, `react-native-linear-gradient`, or Skia? This decides
   whether Cause D has a fix available (see Cause D).

---

## The four causes, in order of likely impact

### Cause A — True Tone / Night Shift warms the display white point

iOS shifts the entire screen's white point toward amber based on ambient light. Our bronze sits at
**hue ≈ 34°**, which is right on the amber boundary. A warm white-point shift pushes the *perceived*
hue up toward ~40°, which is where bronze stops reading as burnished metal and starts reading as gold.

There is **no web-facing or React Native-facing signal for True Tone state** and no way to opt out. It
affects every app on the device. The only available defence is to choose a source hue that survives the
shift — i.e. pre-rotate the bronze toward copper so the device's warm shift lands it back on target.

**This is why the primary fix is a hue rotation and not a brightness change.**

Note for verification: the design system guide records that bronze was already warmed once
("hue ≈ 34–36°, not the oversaturated yellow-gold of the first pass"). That correction was calibrated
against desktop screenshots. This pass corrects the same value against the device.

### Cause B — Wide-gamut (Display P3) expansion

iPhone displays are P3. Correctly colour-managed sRGB fills should *not* expand — but anything that
composites in the display's native space will, and P3-tagged image assets will. The calibration page's
**section 5 gamut probe** is the test: it puts our `#BF8F4F` next to `color(display-p3 0.749 0.561 0.310)`
(the same numbers declared in the wide space).

- Right half looks **more vivid / more yellow** → the device is expanding. Apply the chroma reduction
  (Fix 2).
- The two halves look **identical** → gamut expansion is not your problem; the cause is A or C.

### Cause C — The grain overlay's blend mode amplifies saturation

`mix-blend-mode: overlay` mathematically **increases saturation and contrast** of whatever is beneath
it. On mobile Safari, blend modes composite in the display's native (P3) gamut rather than sRGB, so the
same overlay layer pushes colour further on the phone than it does on a desktop sRGB monitor.

That means there is a saturation amplifier sitting directly on top of every bronze button on the phone
that is effectively not there on desktop. **This is the single best explanation for a phone-vs-desktop
delta**, because unlike A and B it is asymmetric between the two environments.

Only applies if step 0 question 2 found a real blend mode. If it did, the calibration page's
**section 4** is the A/B: identical bronze, three blend treatments (`overlay` @ 0.08 shipping,
`soft-light` @ 0.14, no blend @ 0.05). It uses the exact production noise —
`feTurbulence baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"`, 160×160 tile — so the
comparison is valid for the real texture.

### Cause D — Gradient interpolation space

`--fl-bronze-fill` is a five-stop gradient. The colour of the space *between* stops — which is most of
the button's area — is interpolated in the renderer's default space, which differs per engine and per
platform. Forcing perceptual interpolation makes the ramp identical everywhere.

- **CSS**: add `in oklab` → `linear-gradient(180deg in oklab, …)`. Free, no visual cost, resolves the
  inconsistency outright.
- **`expo-linear-gradient` / `react-native-linear-gradient`**: these interpolate in premultiplied sRGB
  with **no interpolation-space option**. You cannot force oklab. The workaround is to add intermediate
  stops so each segment is short enough that the interpolation space stops mattering — pre-compute the
  oklab midpoints and emit them as explicit stops.
- **Skia**: use `interpolateColorsOKLab` / a colour-space-aware shader if available.

---

## The fixes

### Fix 1 (primary) — rotate every bronze value from hue 34° to 30°

**30° is the recommendation, not a decision.** Confirm it on the device against the calibration page's
section 2 ladder (34° / 32° / 30° / 28° / 26°) with True Tone **off** first for a baseline, then **on**
to check drift. If the user picked a different rung, substitute that hue and re-derive with the formula
below.

For every bronze colour, all of which have the form max=R, min=B, hue is:

```
H = 60 × (G − B) / (R − B)
```

So rotating to a target hue while **preserving lightness and saturation exactly** means recomputing
green only, leaving R and B untouched:

```
G' = B + (H_target / 60) × (R − B)
```

For H_target = 30° this is simply `G' = B + 0.5 × (R − B)` — the midpoint of R and B.

This is the whole fix. R and B never move, so lightness and chroma are preserved by construction and
the change is verifiable by inspection.

#### Core bronze ramp

| Token | Current | Hue | → 30° | Note |
|---|---|---|---|---|
| `--fl-bronze-300` | `#CDA063` | 34.5° | `#CD9863` | `--fl-bronze-bright` |
| `--fl-bronze-400` | `#BF8F4F` | 34.3° | `#BF874F` | `--fl-bronze-primary` |
| `--fl-bronze-600` | `#7A6040` | 33.1° | `#7A5D40` | `--fl-bronze-mid` |
| `--fl-bronze-dark` | `#574029` | 30.0° | `#574029` | already at 30°, no change |

#### `--fl-bronze-fill` stops (the sanctioned dark metallic button fill)

| Position | Current | Hue | → 30° |
|---|---|---|---|
| 0% (polished top edge) | `#8A6A3E` | 34.7° | `#8A643E` |
| 22% | `#6E5330` | 33.9° | `#6E4F30` |
| 52% (specular band) | `#5C4527` | 34.0° | `#5C4227` |
| 97% (reflected bottom) | `#4A3822` | 33.0° | `#4A3622` |
| 100% | `#382A18` | 33.8° | `#382818` |

#### rgba() bronze values

Apply the same `G' = B + 0.5 × (R − B)` rule. Alphas are unchanged.

| Used for | Current | → 30° |
|---|---|---|
| glow / crest ring wash | `rgba(198, 156, 100, α)` | `rgba(198, 149, 100, α)` |
| borders, metal border | `rgba(186, 146, 92, α)` | `rgba(186, 139, 92, α)` |
| subtle border, side falloff | `rgba(174, 136, 86, α)` | `rgba(174, 130, 86, α)` |
| inner top-rim highlight | `rgba(222, 190, 148, α)` | `rgba(222, 185, 148, α)` |
| brushed-grain streaks | `rgba(255, 244, 214, α)` | `rgba(255, 235, 214, α)` |

**Also rotate**, by the same rule, any stops in: `--fl-bronze-fill-hover`, `--fl-bronze-fill-pressed`,
`--fl-bronze-metallic`, `--fl-bronze-brush`, and every `--fl-glow-*`. Do not hand-pick these — run the
formula. Grep the token file for `#` and for `rgba(` within the bronze block and transform every match
where R > G > B and the hue computes to 33–36°.

**Do not touch** `--fl-bronze-fill-disabled` (`#1C1E22` → `#15171B`) or
`--fl-bronze-border-disabled` (`rgba(150,140,122,0.22)`) — those are deliberately cool/neutral.

### Fix 2 (conditional) — reduce chroma ~10%

Apply **only if** the section 5 gamut probe showed visible expansion. A wide-gamut screen stretches
saturated colours further than a desktop sRGB monitor, so a slightly duller source lands correctly on
the phone and is imperceptibly different on desktop.

Reduce HSL saturation from **46.7% → ~42%** (a 10% relative cut) at the chosen hue, holding lightness
at 52.9%. Confirm the amount against the calibration page's section 3 ladder (Current / −10% / −20% /
−30%) on the device.

### Fix 3 (conditional, high impact) — change the grain blend mode

Apply **only if** step 0 question 2 found a real blend mode.

Change `overlay` → the winner of section 4 (expected: **`soft-light` at 0.14 opacity**, which preserves
the texture while dropping the saturation kick). This is a mechanical find-and-replace across every
surface that carries the grain layer — ~40 files in the prototypes; find the production equivalent,
which may be a single shared component.

If it is one shared component, this is a **one-line fix with the largest single effect** on the
phone-vs-desktop delta. Do this one first if so.

### Fix 4 — pin interpolation and colour scheme

- Add `in oklab` to every bronze gradient (CSS), or the platform equivalent from Cause D.
- Web only: ensure `<meta name="color-scheme" content="dark">` is present so iOS stops applying its own
  auto-adjustment to the page. The calibration file already sets this.

### Fix 5 (optional belt-and-braces) — gamut-scoped override

Web only. Serve the corrected/duller variant *only* to wide-gamut screens, leaving desktop sRGB exactly
as it ships today:

```css
@media (color-gamut: p3) {
  :root { /* corrected bronze ramp */ }
}
```

Worth it only if desktop appearance must be preserved bit-for-bit. Otherwise Fix 1 alone is simpler and
the desktop difference at a 4° rotation is very hard to see.

---

## Design tokens

Full current token set is in `reference/foundation.css` (110 `--fl-*` custom properties). The bronze
block is what changes; charcoals, greys, creams, type, spacing, radii, shadows, and motion tokens are
all untouched by this work.

Authoritative source per the design system guide: `src/constants/tokens.ts` in the Forge Legacy repo.
`foundation.css` is derived from it. **Change `tokens.ts` first, then re-derive `foundation.css`** —
do not edit the CSS in isolation or the next re-derivation will revert this fix.

---

## Acceptance criteria

1. On the target phone with True Tone **off**, the primary CTA reads as burnished copper-bronze, not
   gold or brass.
2. With True Tone **on**, it still does not read as gold.
3. On desktop, the bronze is not perceptibly duller or redder than it is today.
4. No bronze value's lightness or saturation changed — only hue. Verify: R and B channels are byte-identical
   to the previous values for every rotated colour.
5. Disabled-state tokens are unchanged and still read cool/neutral against the corrected bronze.
6. Gradient mid-tones are identical between desktop and device.

## Out of scope

Two things came up while investigating and are **not** part of this fix. Flagging so they don't get
silently folded in:

- **Button material treatment.** The foundation defines `--fl-bronze-metal-top-rim`,
  `--fl-bronze-metal-bottom-rim`, `--fl-bronze-metal-sides`, `--fl-bronze-brush`,
  `--fl-bronze-metal-border`, and `--fl-glow-forge`. The prototypes substitute the generic
  `--fl-bronze-border` + `--fl-glow-subtle` instead, which drops the top highlight, side falloff, and
  grain — making the button read flat. Separate open decision, tracked in `Bronze CTA Study.dc.html`.
- **Accent scarcity.** Some screens use bronze in eight places at once, which dilutes it. Also separate.

## Files

- `bronze-calibration-standalone.html` — **the instrument.** Self-contained, open on the target phone.
- `reference/Bronze Device Calibration.dc.html` — source of the above; runs inside the design project.
- `reference/foundation.css` — the current token set, for exact before-values.
