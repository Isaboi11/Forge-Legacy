# App Style Review — typography & colour

**Date:** 2026-08-27
**Standard:** `better-typography` + `better-colors` (interfaces plugin, jakubkrehel/skills v1.6.2),
**adapted to React Native for this run** — see *Adaptation* below.
**Scope:** `src/app` (92 routes) + `src/components` (~200), and both theme files
(`foundation.forge.ts`, `foundation.paper.ts`).
**Verdict:** originally **Block** on two HIGH colour findings. One was **fixed in this pass**
(`gray600`); the other (`bronze600`) is a design decision and remains open. See *Outcome* at the end.

---

## Adaptation

Both skills are written for the browser. What was dropped, translated and kept:

| | |
| --- | --- |
| **Dropped — no RN equivalent** | `text-wrap: balance/pretty`, `-webkit-font-smoothing`, `text-overflow: ellipsis`, `overflow-wrap`, `::selection`, iOS input zoom, `.woff2`/`font-synthesis`, `oklch()` and P3 gamut fallbacks, `prefers-color-scheme` (Alabaster is reload-not-toggle, so there is no live switch to audit) |
| **Translated** | `font-variant-numeric: tabular-nums` → `fontVariant: ['tabular-nums']` · CSS truncation → `numberOfLines` / `ellipsizeMode` · CSS custom properties → the `flColor` / `flText` / `flIcon` token objects |
| **Added — RN-only, no web rule exists** | **`lineHeight` is absolute, not a multiplier.** In CSS `line-height: 1.5` is unitless and scales; in RN `lineHeight: 1.5` is *1.5 pixels* and collapses the text to a line. The web skill has no rule for this because it cannot happen there |
| **Kept unchanged** | Contrast arithmetic, type-scale discipline, the weight-at-small-size floor, primitive-vs-semantic token separation, one-colour-one-meaning, "measure the rendered pair, not the page background" |

---

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/constants/foundation.forge.ts:35`, reaching text through `flText.tertiary` (`:214`) and icons through `flIcon.inactive` (`:220`) | `gray600: '#666060'` | Lighten to **`#888282`** — matches the fix already shipped to `site/index.html:47` | Measured against all four Forge grounds: `charcoal700` **2.81:1**, `charcoal800` **2.97:1**, `charcoal900` **3.10:1**, `base` **3.26:1**. Normal-size text requires **4.5:1**, so it fails on every ground — and on two of them it is under the **3.0** floor that non-text UI needs, which is what `flIcon.inactive` is. This is the same token and the same value that blocked the landing-site review; the app copy was left in place then because it is `.dc`-governed. |
| HIGH | Colors | `foundation.forge.ts:39` (`bronze600`, aliased `bronzeSolid`), used as a text `color:` in 4 places and an SVG `stroke` in 2 | `bronze600: '#765B44'` | Either stop using it for text, or add a text-weight bronze the way Alabaster already did with `bronzeInk` | **2.77:1** on `charcoal700`, **3.20:1** on `base` — below 4.5 for text everywhere and below 3.0 on two grounds. Alabaster hit exactly this problem and solved it by splitting the "bronze you draw with" from the "bronze you write with" (`foundation.paper.ts:72`). Forge never got that split because its `bronzeInk` was set equal to `bronze400`, which passes — so the gap is `bronze600` being used for text at all. |
| MEDIUM | Colors | `foundation.paper.ts` — `bronzeInk:72` `4.32`, `greenMuted:75` `4.32`, `statusOnline` `4.24`, `bronze600:37` `4.12`, `bronze400:36` `3.25`, `gray600:44` `3.15` (worst ground each) | Six tokens in the 3.0–4.5 band | Re-measure each against **`charcoal700` `#F1EBDD`**, the sheet/elevated surface, not just `base` | Every one clears 3.0 but none clears 4.5, so all are fine for large text and icons and none is safe for body copy. **`bronzeInk` is the pointed case**: it exists *specifically* to fix small bronze labels, and the comment recording that work measures it against `base` (`#F4F0E6`) alone, where it scores **4.51** — a pass by 0.01. On `charcoal700` it drops to **4.32**. The token is right; the measurement covered one of the four grounds it renders on. `better-colors`: *measure the rendered pair, not the page background.* |
| MEDIUM | Typography | app-wide — 2,704 `fontSize` declarations across **45 distinct values** | `7.5 · 8 · 8.5 · 9 · 9.5 · 10 · 10.5 · 11 · 11.5 · 12 · 12.5 · 13 · 13.5 · 14 · 14.5 · 15 · 15.5 · 16 · 16.5 · 17 · 17.5 · 18 · 19 · 20 · 21 · 22 · 23 · 24 · 25 · 26 · 27 · 28 · 30 · 31 · 32 · 34 · 38 · 40 · 44 · 46 · 48 · 52 · 64 · 96` | Define a named scale of ~8 steps in `foundation.shared.ts` beside `flRadius`, and floor UI text at `12` | There is no scale, so every size was chosen per component. **731 declarations sit below the 12px floor** — `11` (299), `10` (136), `9.5` (92), `10.5` (89), `9` (70), `8.5` (27), `8` (16), `7.5` (2). `better-typography` puts captions at `13` and *rarely below `12`*; `7.5` is under that by 38%. Half-pixel neighbours (`13`/`13.5`, `14`/`14.5`) are differences no reader perceives but every future edit must guess between. |
| MEDIUM | Typography | `components/workout/CardioBlockCard.tsx:1502` `stripValue`, `:1514` `fieldValue`, `:1533` `computedValue` | No `fontVariant` | Add `fontVariant: ['tabular-nums']` | These are values that *change while being read* — the live duration/distance strip and the computed pace. Proportional digits have different widths, so the row re-flows on every tick. The file carries only 2 `tabular-nums` in 1,570 lines. The app gets this right everywhere it matters most (see Verification), which is what makes these three stand out rather than read as a systemic gap. |
| LOW | Colors | `foundation.paper.ts:35` | `bronze300: '#BD9257'` — **2.38–2.62:1**, under even 3.0 | Leave for ornament; measure before any icon that identifies a control uses it | Paper's own note scopes this token to *"borders, icons and ornamental elements"*, and purely decorative borders are exempt from contrast. Recorded because the margin is thin enough that one promotion to a control-identifying icon would make it a real failure. |

---

## Verification

**Ran and passed**

| Check | Method | Result |
| --- | --- | --- |
| Contrast, both themes | Every text/icon token × all four grounds, WCAG 2.x relative luminance computed from the parsed palettes | 24 pairs computed per theme — see findings |
| Palettes read accurately | Regex-parsed both `flColor` objects rather than transcribed by eye | Corrected an earlier assumption mid-review: Alabaster **does** define its own `greenMuted`/`redMuted`/`blueMuted` (`#3E7A4C`/`#A6402F`/`#3C6D92`), it did not inherit Forge's |
| **RN `lineHeight` trap** | Grepped every `lineHeight` under 2 across `app`, `components`, `constants` | **Pass — zero occurrences.** Every `lineHeight` in the app is an absolute pixel value. This is the single most destructive RN typography bug and it is not present |
| Weight floor below 18px | Grepped `fontWeight: '100' \| '200' \| '300'` | **Pass — zero.** Nothing uses a display-only weight at text size |
| Tabular figures on live values | Traced the three counters that tick while visible | **Pass** — `restActiveTime` and `restOverlayTime` (`workout.tsx:4916`, `:4926`) both carry `tabular-nums`, and `restActiveTime` adds `minWidth`; `HoldTimer.tsx:164` carries it too. 35 files use it overall |
| Theme separation | Diffed all 36 palette keys across both files | **Pass** — only `emberFlame`, `onBronze`, `onMedia` are byte-identical, and all three are deliberately ground-independent. Alabaster is a genuinely re-tuned palette, not a mechanical inversion |
| Primitive vs semantic seam | `flColor` → `flText` / `flIcon` | **Pass** — the seam exists, which is what makes the two-theme swap possible at all |
| Disabled-label tokens | Checked the four `*Disabled` tokens in both themes | **Pass, and not a finding** — Forge expresses them as `rgba(...)` alpha and Paper as solid hex. Different mechanisms, both present; WCAG exempts disabled controls from contrast |

**Not verified**

- **Rendered contrast over gradients and artwork.** Only the four flat grounds were measured. `flGradient` surfaces (`surfaceCard`, `surfaceElevated`) and the 72 Home artwork PNGs put text over varying luminance that a static read cannot resolve.
- **Whether the 731 sub-12px declarations are all body text.** They were confirmed to be real `StyleSheet` entries rather than SVG coordinate space (sampled: `pinKindText`, `chipText`, `youPillText`, `rowScoreUnit`, `badgeText`), but most are uppercase micro-labels with letter-spacing, where the readability calculus differs from prose. A rendered pass would separate them.
- **Dynamic Type / OS font scaling.** Not inspected. RN honours it unless `allowFontScaling={false}`, which was not audited.
- **Truncation.** `numberOfLines` usage was not checked against realistic string lengths.
- Alabaster was measured, not viewed. Per the standing note, a role token flipping under a fixed ground has bitten this theme five times, and only a rendered pass catches that class.

---

## Verdict

**Block.** Two HIGH findings, both colour, both in Forge:

1. `gray600` `#666060` — fails 4.5 on every ground and 3.0 on two, serving both tertiary text and inactive icons. The identical fix is already live in `site/index.html`.
2. `bronze600` `#765B44` — used as text colour in four places at 2.77–3.20:1.

Neither was changed in this pass. Both are `.dc`-governed tokens reaching 277 module-scope
stylesheets, and `gray600` moving would shift every tertiary label and inactive icon in the app at
once. That is a PO decision, not a cleanup.

The typography half is in better shape than the colour half: the RN `lineHeight` trap is absent
entirely, no weight sits below 400 at text size, and the live counters that matter most already carry
tabular figures. What it lacks is a scale — 45 sizes with 731 of them under the readable floor.

**One compounding pattern worth naming.** The smallest text and the failing colour keep landing on
the same element: `rowScoreUnit` (8px, `gray600`), `badgeText` (8.5px, `gray600`),
`HoldTimer.hint` (9px, `gray600`), `create-challenge.count` (11px, `gray600`). Fixing `gray600`
alone lifts each of these from *unreadable* to *small*.

---

# Outcome — same pass, 2026-08-27

## Fixed

**Forge `gray600`** — `foundation.forge.ts:58`, `#666060` → **`#888282`**.

| Ground | Was | Now | Need |
| --- | --- | --- | --- |
| `charcoal700` | 2.81 | **4.60** | 4.5 |
| `charcoal800` | 2.97 | **4.85** | 4.5 |
| `charcoal900` | 3.10 | **5.06** | 4.5 |
| `base` | 3.26 | **5.32** | 4.5 |

**878 usages move with the one line** — 752 `color`, 69 `placeholderTextColor`, 44 `stroke`, 5
`fill`, 1 `borderColor`. Every non-text use was inspected first: a 5 px separator dot
(`exercise/[id].tsx:327`), two switch knobs in the off state (`squad-settings.tsx:1153`,
`workout.tsx:4912`), a ShareCard element and one border. All five only become *more* visible, so
none regresses.

**Ramp ordering held.** `gray400` stays clearly brighter than `gray600` (6.69 vs 5.06 on
`charcoal900`), so secondary and tertiary remain distinguishable steps rather than collapsing.

Matches the value already shipped to `site/index.html:47`, so the site and the app now agree on this
token again.

**Gates:** `tsc` clean · `expo lint` at baseline (1 error + 13 warnings, all pre-existing in
`use-color-scheme.web.ts`) · `src/constants` tests **28/28** · full domain suite **2538/2538**.

## Not fixed, and why

**Alabaster `gray600`** (`foundation.paper.ts:44`, `#8B8377`, worst `3.15:1`). It clears the 3.0
non-text floor but not 4.5 for text, so it is a MEDIUM rather than a blocker — and it is **not a
one-line fix**. Darkening it to reach 4.5 lands at `#71695D` (`4.55`), which sits within `0.08` of
that theme's `gray400` (`4.63`). Secondary and tertiary would become indistinguishable steps, trading
a contrast failure for a hierarchy failure. Fixing it properly means moving both tokens and
re-spacing the light end of the ramp — a palette change that needs the PO and a rendered pass, not a
find-and-replace.

**Forge `bronze600`** (`#765B44`, 4 text usages). Left in place. The clean fix is the split Alabaster
already made — a separate text-weight bronze — and choosing that value is a design decision.

**The type scale** — 45 sizes, 731 declarations below the 12 px floor. Untouched.

## What this bought

The compounding named in the review is gone: `rowScoreUnit` (8 px), `badgeText` (8.5 px),
`HoldTimer.hint` (9 px) and `create-challenge.count` (11 px) all rendered the smallest type in the
faintest colour. They are still small — that is the open typography finding — but they are no longer
below the readable threshold as well.
