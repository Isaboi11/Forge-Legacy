# Workout Entry screen — line-for-line spec

Replaces the current card-in-a-void modal for **Freestyle** and **Resume workout**.
Reference implementation: `Forge Workout Entry.dc.html` (toggle Freestyle / Resume above the phone).
Design system: **ForgeLegacyVisualFoundation_5368b2**, tokens at
`_ds/forge-legacy-use-this-5368b220-9e78-4104-bd8b-969c39e84346/tokens/foundation.css`.

**What changed, in one line:** the bordered container is deleted; the workout identity now sits directly on
the stone as a single centered vertical composition, artwork carries the top half, and bronze is spent on
exactly one element — the CTA.

---

## 0 · The changes, enumerated

Each item is a discrete change from the shipped screen.

| # | Change |
| --- | --- |
| 1 | **Delete the card.** No `Surface`, no `Card`, no border, no radius, no card background. Content sits on the screen background. |
| 2 | **Add artwork to the top half** — resolver-driven, screen-blended, masked (§2). |
| 3 | **Re-anchor the composition to the bottom.** Content is a bottom-anchored centered column, not a vertically centered box (§3). |
| 4 | **Center-align all type.** It was left-aligned inside the card. |
| 5 | **Add hairline rules flanking the eyebrow** and a **diamond divider** under the title (§4, §6). |
| 6 | **Rewrite the Freestyle body copy** to two lines (§5). |
| 7 | **CTA goes full-width, 64px tall, and gains a leading `+`** (Freestyle only) (§7). |
| 8 | **Demote the dismiss** from bronze to warm gray, unbordered, 15px (§8). |
| 9 | **Resume becomes a sibling, not a copy** — same shell, different eyebrow / title / second line / CTA / dismiss, and no `+` (§9). |
| 10 | **No decorative glyph, no bottom logo, no bottom glow.** Considered and rejected — see §10. |

Nothing else on the screen changes. No new cards, stats, icons, gradients, or feature chips were added.

---

## 1 · Screen shell

- Background: the existing stone. In the reference:
  `linear-gradient(rgba(5,5,5,0.15), rgba(5,5,5,0.15)), #050505 url('assets/forge-slate.png') center center / cover no-repeat`
  — identical to `Forge Home.dc.html` line 55. Use whatever the app already uses; do not introduce a new one.
- Full-bleed. The screen is the surface; there is no inner container at any level.
- Reference frame is `404 × 868`. All px values below are at that scale.
- Two stacking layers only: artwork at `z-index: 0`, content at `z-index: 1`.

## 2 · Artwork — top half

```html
<img src="{resolved}" alt="" aria-hidden="true" style="
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  height: 438px;
  width: auto;
  opacity: 0.72;
  mix-blend-mode: screen;
  mask-image: linear-gradient(180deg,
    transparent 0%, #000 14%, #000 58%, rgba(0,0,0,0.5) 80%, transparent 96%);
  -webkit-mask-image: /* same */;
  pointer-events: none;
  z-index: 0;">
```

- **`opacity: 0.72` + `mix-blend-mode: screen` is deliberately identical to the Home hero card's grading**
  (`Forge Home.dc.html`, `workoutArtImg`). Do not add `filter`, brightness, or contrast — an earlier pass
  tone-corrected the asset and it read as neon rather than relief. Same asset, same grading, everywhere.
- The mask differs from Home's: Home uses a right-anchored radial
  (`radial-gradient(115% 130% at 96% 44%, #000 52%, transparent 82%)`) because the art bleeds off the card's
  right edge. Here the art is centered and full-width, so it is a **vertical** linear mask — soft in at the top
  under the status bar, soft out at the bottom into the type. Keep both stops; without the top fade the
  rectangle's edge shows against the status bar.
- `height: 438px` on a 404px-wide frame means the near-square asset overflows horizontally and crops at both
  edges. That is intended — the figure fills the width and the crop hides the asset's own rectangular ground.

### Artwork source — use the resolver, not a hardcoded path

The reference DC hardcodes `assets/workout-push.png` because the user asked to reuse the Home hero card's
day/workout art for the mock. **Production must not hardcode it.** Call the same resolver Home calls:

```js
ForgeArtworkResolver.resolveHomeWorkoutArtwork({ user, workout, program, exercises })
// -> { collection, key, sexVariant, confidence, reason, source, assetPath }
```

Use the returned `assetPath`. Fall back to `assets/workout-push.png` only if the resolver is unavailable —
exactly as `Forge Home.dc.html` line 439 does.

**Male and female artwork are specified on the Home card and carry over here unchanged.**
`resolveSexVariant()` reads the athlete's *saved* selection only and never infers it: `m*` → `male`,
`f*` → `female`, anything else → `neutral` served via `NEUTRAL_SEX_FALLBACK`. Sexed collections resolve to
`<base>/<dir>/<male|female>/<key>.png`. This screen adds no new artwork rules and no new assets — it consumes
the resolver's existing output.

Per state:

- **Freestyle** — there is no planned workout, so the resolver lands on its neutral default. Pass the same
  context Home passes; do not special-case.
- **Resume** — pass the in-progress workout as `workout`, so the art matches the session being resumed
  (a Push Day resumes under push art). This is the main reason to call the resolver rather than hardcode.

## 3 · Composition and spacing

One flex column, `z-index: 1`, `position: absolute; inset: 0`:

1. Status bar row — `height: 44px`, `flex: none`.
2. Spacer — `flex: 1; min-height: 0`. **This is what bottom-anchors the composition.**
3. Content column — `flex: none`, `align-items: center`, `padding: 0 22px 46px`.

Content column, top to bottom, with exact gaps:

| Element | Spacing above |
| --- | --- |
| Eyebrow + rules | — (first child) |
| Title | `margin-top: 18px` |
| Diamond divider | `margin-top: 20px` |
| Body copy | `margin-top: 20px` |
| CTA | `margin-top: 40px` |
| Dismiss | `margin-top: 30px` |

The 40px before the CTA is the largest gap in the column and is load-bearing: it separates *reading* from
*acting*. Do not equalize the rhythm.

**Both the title and the body paragraph need `width: 100%`.** The column is `align-items: center`, which
shrink-wraps block children — without it the copy wraps at roughly half width. This was an actual bug in the
first pass.

## 4 · Eyebrow

Row, `align-items: center`, `gap: 14px`, `width: 100%`, `max-width: 300px`.

- Label: `12px / 700`, `letter-spacing: 4.6px`, `white-space: nowrap`, `var(--fl-bronze-primary)`.
  Text is authored in caps.
- Flanking rules, `flex: 1`, `height: 1px`, fading toward the label's outside edge:
  - left `linear-gradient(90deg, rgba(186,146,92,0) 0%, rgba(186,146,92,0.45) 100%)`
  - right the mirror.
- `max-width: 300px` keeps the rules short enough to frame the label rather than span the screen.

## 5 · Title and body copy

**Title** — `h2`, `width: 100%`, `var(--fl-font-display)`, weight `600`, `line-height: 1.06`,
`letter-spacing: 0.3px`, `text-align: center`, `var(--fl-text-primary)`.
Size is per state: **34px** Freestyle, **38px** Resume (a real workout name earns more scale).

**Body** — `p`, `width: 100%`, `16px`, `line-height: 1.62`, `text-align: center`,
`var(--fl-text-secondary)`. Two lines, split by an explicit `<br>` — the break is composed, not left to
wrapping. No `text-wrap: pretty` here; it fights the authored break.

Freestyle copy is **changed**:

- Before: `Nothing planned — add whatever you train, as you go.`
- After: `Build today's session as you go.` / `Add exercises as you train.`

## 6 · Diamond divider

Row, `align-items: center`, `gap: 10px`, `width: 100%`, `max-width: 236px`.

- Two `flex: 1`, `height: 1px` rules fading outward at `rgba(186,146,92,0.38)`.
- Center: `6 × 6`, `transform: rotate(45deg)`, `background: var(--fl-bronze-primary)`, `opacity: 0.85`.
- Narrower than the eyebrow's 300px — the two rule-pairs must not read as a repeat.

## 7 · CTA

```
width: 100%;  height: 64px;  border-radius: 14px;
display: flex; align-items: center; justify-content: center; gap: 16px;
background: var(--fl-bronze-fill);
border: 1px solid var(--fl-bronze-metal-border);
box-shadow: var(--fl-bronze-metal-top-rim), var(--fl-glow-forge);
```

- `width: 100%` inside the column's `padding: 0 22px` gives the near-screen-width button with generous
  margins. It was previously inset inside the card, which made it read as a form's confirm button.
- Leading `+`: `26 × 26`, stroke `2.4`, `var(--fl-bronze-bright)`, `gap: 16px` to the label.
  **Freestyle only** — Resume adds nothing, so it gets no plus.
- Label: `17px / 700`, `letter-spacing: 2.4px`, `var(--fl-text-primary)`. Authored in caps.
- Hover/press: `filter: brightness(1.08)`, `160ms var(--fl-ease-out)`. No scale, no shadow change.
- `var(--fl-bronze-fill)` is the design system's single sanctioned bronze fill. This button is the only
  bronze fill on the screen.

## 8 · Dismiss

- `margin-top: 30px`, `font-size: 15px`, color **`#8A817A`** (warm gray), no border, no background,
  no letterspacing, not caps.
- Hover → `var(--fl-text-secondary)`, `150ms var(--fl-ease-out)`.
- It was `var(--fl-bronze-primary)` before, which gave the two paths equal weight. Bronze now points at
  exactly one thing.
- Resume's dismiss is **"End workout"** — destructive in meaning. It stays this same quiet gray;
  it does **not** become `--fl-red-*` or use `Button variant="destructive"`. Confirmation belongs in the
  sheet that follows, not in the weight of this label.

## 9 · The two states

The shell is identical. Everything below it differs.

| | Freestyle | Resume |
| --- | --- | --- |
| Eyebrow | `FREESTYLE` | `WORKOUT IN PROGRESS` |
| Title | `Freestyle Workout` | the workout name, e.g. `Push Day` |
| Title size | 34px | 38px |
| Line 1 | `Build today's session as you go.` | session stats, e.g. `4 exercises · 11 sets · 38 min` |
| Line 2 | `Add exercises as you train.` | last exercise, e.g. `Last: Incline Dumbbell Press` |
| CTA | `+ ADD EXERCISE` | `RESUME WORKOUT` (no plus) |
| Dismiss | `Not today` | `End workout` |
| Artwork | resolver neutral default | resolver output for the in-progress workout |

Freestyle is an **entry** state: instruction, invitation, a CTA naming what happens next.
Resume is a **continuation** state: the second line is session *state* rather than instruction, and the
"extremely subtle progress/history treatment" is exactly that line — `Last: <exercise>`. No progress bar,
no ring, no card.

Separator in the Resume stat line is ` · ` (space, middot, space).

## 10 · Rejected, and why — do not re-add

- **A small anvil/mark glyph above the eyebrow.** Prototyped, then removed. The project's real anvil asset
  (`assets/artwork/legacy/anvils.png`) is a full illustration with a stone plinth and turns to mud at ~26px,
  and a hand-drawn SVG substitute violates the artwork conventions. The relief figure is the one restrained
  visual element; a second mark competes with it. If a glyph is wanted later it needs a purpose-built
  small-scale asset.
- **A cropped carved `F` at the foot** (`assets/welcome-logo-carved.png`). Removed — it collided with the
  dismiss label.
- **A forge glow at the bottom edge.** Removed. The composition ends on the CTA; the stone simply runs out.
- **Tone-correcting the artwork** with `filter: brightness()/contrast()`. Removed. Match the Home card's
  grading exactly.
- **More cards, stats, icons, gradients, feature chips** to fill the space. The emptiness is the point; the
  composition is what was missing.

## 11 · Motion

- Easing is `--fl-ease-out` throughout.
- Screen entry: fade + slight rise on the content column, ~260ms. The artwork does not animate.
- CTA hover 160ms, dismiss hover 150ms. Nothing pulses or bounces.
- Under Reduce Motion, drop the entry transition; keep everything static.

## 12 · Accessibility

- Artwork is `alt=""` + `aria-hidden="true"` + `pointer-events: none` — decorative, never announced.
- CTA and dismiss need real button semantics (the reference uses `role="button" tabindex="0"`; use actual
  `Button` / pressable components in the app).
- CTA is 64px tall and dismiss ~44px of tappable padding — both clear the 44pt minimum. Keep the dismiss's
  hit area at 44pt even though its text is 15px.
- `#8A817A` on the stone is ~5.2:1 — passes AA for body text. Do not darken it further to make it quieter;
  reduce its size or spacing instead.
