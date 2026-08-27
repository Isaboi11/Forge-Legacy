# Interface Review — forgelegacy.app

**Date:** 2026-08-27
**Standard:** `better-interface` (interfaces plugin, jakubkrehel/skills v1.6.2), routing to all six
`better-*` domain skills.
**Verdict:** **Approve** — the one HIGH finding was found and fixed in this pass (originally Block).
One MEDIUM remains open. See *Outcome* at the end.

---

## Scope

`site/index.html` (1,466 lines, 169 KB), the whole single-page landing site at **forgelegacy.app**.
`privacy.html`, `terms.html` and `support.html` were **not** inspected — stated as a boundary, not
implied coverage.

**Stack.** Static HTML served by a Cloudflare Worker with static assets. No framework, no build step.
Styling is a `:root` custom-property system in one inline `<style>` block plus per-element inline
styles. Progressive enhancement: one vanilla-JS reveal engine, with a `<noscript>` block that settles
the page without it.

**Convention documents found in recon.** `site/README.md` (deployment, file states, build provenance)
and the repo's `AGENTS.md`. The page is generated from a design source of truth —
`design_handoff_landing_v6/Forge Legacy Landing v6.dc.html` in Claude Design project `b029488a` — so
per PD-7 the design governs visual choices. That decides **where** a finding is reported, not whether
it is one: a measured contrast failure is a failure whatever the design file says.

### Coverage

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Viewport meta, `lang`, landmarks, heading outline (1×`h1`, 11×`h2`, no skips), all 22 `alt` values, `:focus-visible`, the full interactive inventory (5 `<a>`, 0 `<button>`, 0 `onclick`, 0 `role="button"`, 0 `tabindex`), all 3 `prefers-reduced-motion` blocks and the JS `matchMedia` guard | **1 finding** |
| Layout | 11 `max-width` caps (0 bare fixed widths ≥600px), `min-width:0` ×18 and `min-width:min(100%,280px)` ×10, all 5 breakpoints, logical-vs-physical properties, decorative-layer overflow | Clear |
| Writing | All 5 link texts, both CTA labels, the held-CTA copy, footer copy | Clear |
| Typography | Every `px` `font-size` declaration (108 across 15 distinct values), `text-wrap`, `line-height`, `-webkit-font-smoothing`, the `clamp()` fluid heads | **1 finding** |
| Colors | All 12 primitives and 3 semantic text tokens; contrast computed for every text token against every surface it renders on | Folded into the Accessibility finding |
| UI | Easing tokens (184 `var(--fl-ease-*)` vs 3 raw, and those 3 are the token definitions), radius tokens (27 `var(--fl-radius-*)`, **0** raw `px`), `pointer-events:none` on all 4 decorative layers | Clear |

---

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Accessibility | `site/index.html:47` (the primitive), `:98` (the role token), rendering at `:795`, `:800`, `:805`, `:810`, `:906`, `:931`, `:937`, `:1291`, `:1359` | `--fl-gray-600: #666060`, reaching text at 11–14.5 px | Lighten the primitive to **`#888282`** — the first step clearing 4.5:1 on all four grounds | Measured, not estimated: `#666060` on `surface-card` top `#181A1C` is **2.83:1**, on its bottom `#131517` **2.97:1**, on `charcoal-900` **3.10:1**, on `charcoal-700` **2.81:1**. None of these nine is large text (all 11–14.5 px), so all require **4.5:1**. Two pairs fall below even the 3.0 non-text floor. This is `better-interface`'s escalation trigger *"body or control text whose rendered contrast pair fails its required ratio"*, and it reaches the page's own body copy — `:906` (14.5 px, `max-width:52ch`) and `:1291` (14 px, `max-width:76ch`) are paragraphs, not chrome. One token fix clears all nine. |
| MEDIUM | Typography | `site/index.html` — 32 declarations at `9.5px` (8), `10px` (4), `10.5px` (9), `11px` (11), within a 15-step ladder | 15 distinct sizes: `9.5 · 10 · 10.5 · 11 · 11.5 · 12 · 12.5 · 13 · 13.5 · 14 · 14.5 · 15 · 15.5 · 16.5 · 17` | Define a scale of ~6 named steps and floor UI text at `12px`; raise the 32 sub-floor declarations onto it | Two symptoms, one root cause — there is no type scale, so sizes were picked per element. Half-pixel neighbours (`13`/`13.5`, `14`/`14.5`, `15`/`15.5`) are differences no reader perceives but every future edit has to guess at, and the ladder's bottom sits below the readable floor: `better-typography` puts UI text at `13px` for captions and *rarely below `12px`*, and `9.5px` is under that by a third. Compounding with the finding above — the smallest sizes and the failing token appear together at `:795`, `:800`, `:805`, `:810`, `:931`. |

---

## Verification

**Ran and passed**

| Check | Command / method | Result |
| --- | --- | --- |
| Contrast, every text token × every surface | WCAG 2.x relative-luminance computed from the declared hex values | 4 of 6 pairs pass; `text-tertiary` fails — see the finding |
| Zoom not capped | `<meta name="viewport" content="width=device-width, initial-scale=1">` | Pass — no `maximum-scale`, no `user-scalable=no` |
| Heading outline | Counted `h1`–`h6` | Pass — one `h1`, 11 `h2`, no skipped levels |
| Alt text by purpose | All 22 `<img>` | Pass — 21 decorative `alt=""`, 1 informative `alt="Forge Legacy"` |
| Focus indicator | `:focus-visible { outline:2px solid var(--fl-bronze-primary); outline-offset:2px }` at `:123` | Pass — 2 px solid, and `#BF8F4F` on `#0C1013` measures **6.60:1**, well over the 3.0 required of a focus indicator |
| Reduced motion | 3 CSS blocks (`:126`, `:145`, `:162`) plus `var reduce = matchMedia(...)` at `:1396` | Pass — all 14 `6s` loops are descendants of `[data-workout]` (opens `:500`), killed by `[data-workout] * { animation:none !important }`; the two 44–46 s scroll loops are killed at `:145`; the JS reveal engine collapses every delay to `0` under `reduce` |
| Non-native controls | Grepped `onclick`, `role="button"`, `tabindex`, `<div>` handlers | Pass — none. All 5 interactive elements are real `<a href>` |
| Link text out of context | All 5 link texts | Pass — "Privacy", "Terms", "Support", the support address. No "Click here", no bare "Learn more" |
| Fixed-width overflow | Every `width:` ≥600 px | Pass — all 11 are `max-width`; the single bare `width:760px` (`:195`) is an `aria-hidden`, `pointer-events:none` radial glow |
| Token discipline | Easing and radius | Pass — 184 token easings vs 3 raw (the definitions themselves); **0** raw `px` radii against 27 token uses |

**Not verified** — needs a browser; reported as gaps, not findings.

- Rendered contrast over `--fl-surface-card`'s **gradient midpoint** and over the WebP art behind the hero. Both gradient endpoints were computed; the midpoint and any image-backed text were not.
- 320 px reflow and 200 % zoom. The static checks are clean (no fixed widths, `min-width:0`, `min-width:min(100%,280px)`), but the `left:50%; width:760px; margin-left:-380px` glow at `:195` extends 380 px past centre and only one `overflow-x:hidden` exists on the page. Whether that produces a horizontal scrollbar at 320 px is a runtime question.
- Wrapping, widows and truncation at real content lengths — `better-typography` requires reading the rendered page, not the source.
- Keyboard tab order walked end to end, and the accessibility tree read for computed names and roles.
- `privacy.html`, `terms.html`, `support.html` — outside the stated scope.

---

## Verdict

~~**Block.**~~ → **Approve** — the HIGH finding was fixed in this pass. See *Outcome* below.

The original verdict was **Block** on one HIGH finding: `--fl-text-tertiary` failing its required
contrast ratio at all nine real-copy locations, two of the measured pairs falling below even the 3.0
non-text floor.

The MEDIUM typography finding stays in the table as work to do.

Everything else inspected is genuinely clean, and unusually so for a page this size: zero non-native
controls, zero raw radius values, 184-to-3 easing-token discipline, correct decorative `alt=""`,
reduced motion honoured in both CSS and JS, and content-derived breakpoints rather than device
presets. The held App Store CTA (`:219`, `:1353`) was examined and is **not** a finding — it reads
"Coming to the App Store", so the copy carries the state honestly rather than inviting a dead tap.

`Approve` is not claimed for `privacy.html`, `terms.html`, `support.html`, or for any check listed
above as Not verified.

---

# Outcome — same pass, 2026-08-27

## Fixed — the HIGH finding

`site/index.html:47` — `--fl-gray-600` moved from `#666060` to **`#888282`**, clearing all nine
locations with one change.

| Ground | Was | Now | Required |
| --- | --- | --- | --- |
| `--fl-surface-card` top `#181A1C` | 2.83 | **4.62** | 4.5 |
| `--fl-surface-card` bottom `#131517` | 2.97 | **4.85** | 4.5 |
| `--fl-charcoal-900` `#0C1013` | 3.10 | **5.06** | 4.5 |
| `--fl-charcoal-700` `#1A1A1E` | 2.81 | **4.60** | 4.5 |
| `--fl-base` `#05080A` | 3.26 | **5.32** | 4.5 |

The primitive moved rather than a new role token being added, because `--fl-gray-600` has exactly one
consumer — `--fl-text-tertiary` — verified by grep: two occurrences in the file, both token
definitions, and zero uses in `privacy.html`, `terms.html`, `support.html`.

`#888282` keeps the `+6` red offset that made the original a warm grey rather than a neutral one.

**Correction to the finding as first written.** It proposed `#7C7676`, derived against
`--fl-surface-card` alone. That value reaches only **3.91:1** on `--fl-charcoal-700`, which is the
true worst ground and was missing from the first pass. `#888282` is the first step that clears 4.5:1
on all four. The finding's severity and location list were right; the proposed value was not.

**Regression check.** No other token moved: `text-primary` 16.36, `text-secondary` 6.69, `bronze-400`
link 6.60, all on `charcoal-900`, all unchanged.

**Recorded as a deliberate divergence** in `site/README.md` under *Deltas from the `.dc.html`, and
why*, so a regeneration from the design source cannot silently restore `#666060`.

## Found while fixing — not changed

**The app carries the same failing token.** `src/constants/foundation.forge.ts:35` has
`gray600: '#666060'`, serving both `text.tertiary` (`:214`) and `inactive` (`:220`), over the same
`charcoal700/800/900` surfaces. The measured failures above apply to it unchanged.

Left alone deliberately. That token is `.dc`-governed and reaches 277 stylesheets built at module
scope, and the Paper theme carries its own `gray600: '#8B8377'` which would need measuring against a
light ground separately. It is a PO decision, not a cleanup.

## Still open

The MEDIUM typography finding — no type scale, 15 sizes, 32 declarations below the 12 px floor — is
untouched.

Everything under **Not verified** above remains unverified: 320 px reflow, 200 % zoom, gradient
midpoint contrast, wrapping at real content lengths, a walked tab order, and the three secondary
pages.
