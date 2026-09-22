# Build: Progress Photo Post

Implementation prompt for Claude Code. Build the **Progress Photo Post** screen for Forge Legacy and
rewire the two entry points that lead into it. Follow this document section by section. Screenshots
referenced by number live in `./screenshots/`. The finished design is `Progress Photo Post.dc.html`
in the design project — read it when a detail here is ambiguous; it is the source of truth for geometry.

---

## 1. What this feature is

An athlete has been shooting progress photos into their Transformation entries. Today the only way to
share them produces one long vertical card that reads badly on Instagram or Facebook. This screen
replaces that: pick an **output format** (1:1 or 4:5), pick a **style** (Grid or Hero carousel), pick
**which photos**, and send — either to a Forge squad or out to a social app.

It is not a Then/Now comparison. Comparison sharing already exists in `Forge Share Configuration`
and is deliberately untouched; the two will be merged in a later pass.

---

## 2. Files to create and modify

Create:

1. `ProgressPhotoPost` screen — the whole surface described in sections 5–14.

Modify:

2. `forge-squad-posts.js` — the post-type registry (section 15).
3. `SquadComposer` — the type picker routes `progress` out to the new screen (section 16).
4. `SquadDetail` — feed rendering for `progress` posts (section 17).
5. `ForgeTransformation` — entry-level Share now opens this screen (section 18).

Do not touch `Forge Share Configuration`.

---

## 3. Design system

Everything is composed from the bound **Forge Legacy Visual Foundation**
(`ForgeLegacyVisualFoundation_5368b2`) and styled against `--fl-*` foundation tokens. No new colors,
no new type ramp. Every value quoted in this document is either a `--fl-*` token or a literal already
present in the design file.

Fonts: `--fl-font-display` (Playfair Display) for the card's date and athlete name; `--fl-font-sans`
for UI; `--fl-font-mono` for the format chip labels and the carousel counter.

---

## 4. Data model

### 4.1 Source of photos

Photos come from `ForgeTransformation`:

```
ForgeTransformation.entries()   // newest first
ForgeTransformation.POSES       // fixed six-pose set
```

An entry is `{ id, label, chapter, caption, tags, hasVideo, meta }` where `label` is the display date
(`"Mar 6, 2026"`) and `meta` is the stat line (`"183 lb · Week 12 · Morning · Gym lighting"`).

The six poses, in this order:

| key  | label          | short    |
|------|----------------|----------|
| `rf` | Front Relaxed  | Front    |
| `rs` | Side Relaxed   | Side     |
| `rb` | Back Relaxed   | Back     |
| `ff` | Front Flexed   | Front    |
| `su` | Side Arms Up   | Arms Up  |
| `bf` | Back Flexed    | Back     |

A single photo is addressed by the composite key `` `${entryId}-${poseKey}` `` — e.g.
`xf-seed-3-ff`. In the design prototype these resolve through the image-slot store; in the app they
resolve to the athlete's stored progress photo for that entry and pose.

### 4.2 Launch context

The screen is opened with a context object, written by the caller and **consumed on read** (read it,
then delete it, so a stale context can never hijack a later open):

```json
{ "origin": "squad" | "transformation", "entryId": "xf-seed-3" }
```

`origin` decides the primary CTA and the back destination. `entryId` is optional; absent means "the
most recent entry."

### 4.3 Screen state

```
entryId   string        which Transformation entry is being posted
fmt       '1x1'|'4x5'   output format          default '4x5'
style     'grid'|'hero' layout style           default 'grid'
sel       string[]      selected pose keys, in tap order
heroIdx   number        active carousel slide  default 0
incl      object        card content toggles
caption   string        seeded from entry.caption
```

---

## 5. Screen frame — screenshot 02

Full-screen. In the design file it is drawn at 404 × 868. Three regions, top to bottom:

1. **App bar** — fixed, does not scroll.
2. **Content** — single vertical scroller.
3. **Footer** — fixed, does not scroll.

Background: `--fl-bg-atmospheric` over the `forge-bg-2` texture at 36% scrim, per the foundation's
Backgrounds card. A 5% overlay-blend noise layer sits on top of everything at the frame level,
`pointer-events: none`.

---

## 6. App bar

- Padding `14px 14px 12px`. Bottom border `1px solid var(--fl-charcoal-700)`.
  Background `linear-gradient(180deg, rgba(9,9,9,0.9), rgba(7,7,7,0.8))`.
- Back button: 36 × 36, `--fl-radius-round`, `--fl-surface-recessed`, `1px solid --fl-charcoal-600`,
  chevron-left 18px stroke 2. Behavior in section 19.
- Title `Progress Photos` — `--fl-font-display`, 17px / 600, line-height 1.15.
- Subtitle — 11.5px, `--fl-text-tertiary`, reads `{entry date} · {entry chapter}`, e.g.
  `Mar 6, 2026 · The Rebuild`. Omit the ` · chapter` half when the entry has no chapter.
- There is **no** Post action in the app bar. Sending happens in the footer only.

---

## 7. Content scroller

Padding `16px 20px 22px`. Scrollbar hidden (`scrollbar-width: none`, zero-width WebKit thumb).
Section order, top to bottom — screenshot 12 shows the whole sheet uncropped:

1. Format row
2. Live preview card
3. Style
4. Photos
5. From entry
6. On the card
7. Caption

Every section label is the same token: 9.5px / 700, letter-spacing 1.4px, uppercase,
`--fl-text-bronze-label`, margin `0 2px 10px`.

---

## 8. Format row — screenshots 02 vs 03

A single row directly above the preview: the label `FORMAT` on the left, the chips pushed right.

Two chips, always both visible, single-select:

| id    | label | proportion glyph |
|-------|-------|------------------|
| `1x1` | `1:1` | 13 × 13 px       |
| `4x5` | `4:5` | 11 × 13.75 px    |

Chip: pill radius, padding `7px 12px 7px 9px`, gap 8. The glyph is an empty rounded rect (radius 3)
with a `1.5px solid currentColor` border — it is the literal shape of the output, which is why the
two glyphs differ in proportion. The label is `--fl-font-mono` 12px / 600, letter-spacing 0.3px.

- Selected: border `--fl-bronze-border`, background `--fl-bronze-tint`, ink `--fl-bronze-bright`.
- Unselected: border `--fl-charcoal-600`, background `--fl-surface-card`, ink `--fl-text-tertiary`.
- Transition `border-color 160ms var(--fl-ease-out)`.

Changing format must **not** reset style, selection, toggles, or caption.

---

## 9. Live preview card

The preview is a true-proportion render of the exported asset, not an approximation. Width is fixed
at 300; height follows the format:

| format | preview | export     |
|--------|---------|------------|
| `1x1`  | 300×300 | 1080×1080  |
| `4x5`  | 300×375 | 1080×1350  |

**The export scale factor is 3.6×.** Author the card once at preview scale and multiply on export;
do not maintain two layouts. Worked examples: 16px padding → 57.6px, 6px grid gap → 21.6px, 8px tile
radius → 28.8px, 27px hero date → 97.2px.

Card shell (both styles):

- `--fl-radius-lg`, `overflow: hidden`, border `1px solid var(--fl-bronze-border)`.
- Background `linear-gradient(168deg, var(--fl-bronze-tint) 0%, transparent 46%), #0A0A0B` — the
  forge-light-from-above rule: the sheen enters top-left and dies by 46%.
- Shadow `var(--fl-border-inset), var(--fl-shadow-card-hero)`.
- Entering animation on style/format change: 220ms, opacity 0→1 with `scale(0.985)→1`,
  `var(--fl-ease-out)`. Suppressed under `prefers-reduced-motion`.

---

## 10. Style: Grid — screenshots 02, 03, 04, 05

One card, up to four photos, arranged in a grid. Layout inside the card:

```
padding 16
├─ header row (flex, gap 7, margin-bottom 12)
│    17×17 Forge mark, radius 4, --fl-bronze-metallic, glyph #1A1206
│    "FORGE LEGACY"  8.5px/700, ls 2.2px, uppercase, --fl-text-secondary, flex:1
│    date            9px/700, ls 0.9px, uppercase, --fl-bronze-bright   [toggle: Date]
├─ photo grid (flex:1, min-height:0, gap 6)
│    tile: radius 8, 1px --fl-charcoal-700, bg --fl-surface-recessed, object-fit cover
│    pose chip (optional): bottom-left 6/5, pill, rgba(6,6,7,0.72), 7.5px/700 ls 0.8 uppercase
└─ footer row (flex, align-items flex-end, gap 10, margin-top 12)
     left column:
       athlete   --fl-font-display 14px/700, ls -0.2px    [toggle: Name]
       meta      9.5px, --fl-text-tertiary                [toggle: Stats]
     right:
       chapter   8.5px/700, ls 1.2px, uppercase, --fl-bronze-primary  [toggle: Chapter]
```

Column count is derived from the selection count — never hardcode 2×2:

| photos | `grid-template-columns` | result           |
|--------|-------------------------|------------------|
| 1      | `1fr`                   | single full tile |
| 2      | `1fr 1fr`               | side by side     |
| 3      | `1fr 1fr 1fr`           | 3-up row         |
| 4      | `1fr 1fr`               | 2 × 2            |

Photos fill their cell with `object-fit: cover`, centered. At 3-up in a 4:5 card the cells are
narrow; that is expected — a standing figure is vertical and stays intact under a center crop.

Grid caps at **4** photos. Tapping a fifth raises the toast `Four photos max in a grid`.

---

## 11. Style: Hero carousel — screenshots 06, 07, 08

One full-bleed photo per slide, swipeable exactly like an Instagram carousel. Every slide carries the
full chrome, so any single slide still reads as a complete Forge card if it is saved alone.

Track:

- `position: absolute; inset: 0; display: flex; overflow-x: auto; overflow-y: hidden`.
- `scroll-snap-type: x mandatory`, `-webkit-overflow-scrolling: touch`, scrollbar hidden.
- Slide: `flex: 0 0 100%`, full height, `scroll-snap-align: center`, `scroll-snap-stop: always`.

Per slide:

```
image                full bleed, object-fit cover
scrim (pointer-events none)
  linear-gradient(180deg,
    rgba(6,6,7,0.62) 0%, rgba(6,6,7,0) 30%,
    rgba(6,6,7,0.18) 52%, rgba(6,6,7,0.9) 100%)
top chrome  (top 16, left/right 16, flex gap 7)
  17×17 Forge mark
  "FORGE LEGACY"  8.5px/700 ls 2.2 uppercase, rgba(240,238,234,0.82),
                  text-shadow 0 1px 4px rgba(0,0,0,0.6)
  pose chip       optional, same style as grid    [toggle: Pose labels]
  counter pill    "2/4", --fl-font-mono 8px/600, rgba(6,6,7,0.62) pill
                  — only when the carousel has more than one slide
bottom block (left/right 18, bottom 30, pointer-events none)
  date      --fl-font-display 27px/700, ls -0.6px, #F7F5F1,
            text-shadow 0 2px 14px rgba(0,0,0,0.7)          [toggle: Date]
  meta      10px, rgba(240,238,234,0.72)                     [toggle: Stats]
  name      11px/600, #F0EEEA · 3px dot · chapter 8.5px/700 ls 1.2 uppercase,
            --fl-bronze-bright                     [toggles: Name / Chapter]
```

Dots (only when slides > 1): centered, `bottom: 12`, 5px circles, gap 5,
`box-shadow: 0 1px 3px rgba(0,0,0,0.6)`. Active `--fl-bronze-bright`; inactive
`rgba(240,238,234,0.34)`; `transition: background 180ms var(--fl-ease-out)`. The bottom text block
sits at `bottom: 30` precisely so it clears the dots.

Active slide is derived from scroll position — `round(scrollLeft / clientWidth)` on scroll — never
from a tap handler. Dots are an indicator, not a control.

Hero caps at **6** slides. Tapping a seventh raises `Six slides max`.

Switching Grid → Hero keeps the current selection and turns each photo into a slide. Switching
Hero → Grid keeps the first four. When selection shrinks, clamp `heroIdx` to the last valid index.

---

## 12. Style picker

Two cards side by side, `grid-template-columns: 1fr 1fr`, gap 9. Each card: padding `12px 13px`,
`--fl-radius-lg`, left-aligned, with a 26 × 26 miniature diagram, gap 11.

| id     | label | sub                        | diagram              |
|--------|-------|----------------------------|----------------------|
| `grid` | Grid  | `Up to 4 photos`           | 2 × 2 cells, gap 2   |
| `hero` | Hero  | `Swipeable, date stamped`  | 1 full cell          |

Diagram cells are 2px-radius blocks: `--fl-bronze-primary` when selected, `--fl-charcoal-500`
otherwise. Card selected state matches the format chips (bronze border + tint); label ink goes
`--fl-bronze-bright`, sub stays `--fl-text-tertiary` 10px.

---

## 13. Photos picker — screenshots 09, 10

Header row: label `PHOTOS` on the left; on the right, a live count in 10.5px `--fl-text-tertiary` —
`3 of 4` in Grid, `4 slides` (singular `1 slide`) in Hero.

Six tiles, `grid-template-columns: repeat(6, 1fr)`, gap 7 — one per pose, always all six, in POSES
order. Each tile:

- 3:4 aspect, radius 7, `1.5px` border, background `--fl-surface-recessed`.
- Thumbnail `object-fit: cover`. Unselected thumbnails render at `opacity: 0.42`.
- A pose with no photo shows a 14px `camera` symbol in `--fl-charcoal-500`, centered.
- Selected: border `--fl-bronze-border`, `box-shadow: var(--fl-glow-subtle)`, plus a 14 × 14
  `--fl-bronze-metallic` check disc pinned top-right at 3/3 with a `#1A1206` tick.
- Caption below the tile: 8px / 600, letter-spacing 0.5px, uppercase, the pose `short`;
  `--fl-bronze-bright` when selected, `--fl-text-tertiary` otherwise.

Rules:

- Tap toggles. Selection order is preserved and drives card order.
- Deselecting the last selected photo is a no-op — never allow an empty card.
- Over the cap, do not silently drop: toast and leave the selection alone.
- Default selection on open: every pose that has a photo, capped at 4. If the entry has no photos at
  all, preselect the first four poses so the layout is legible.

---

## 14. From entry, On the card, Caption — screenshot 12

**From entry.** Horizontally scrolling pill row, up to 6 most recent entries, newest first, labelled
with the entry date. Pill: padding `8px 14px`, 12px / 600, bronze-tint when active. Switching entry
**resets the photo selection** to that entry's default (section 13) and reseeds the caption.

**On the card.** A wrapping row of toggle pills, gap 7, padding `8px 13px 8px 10px`, 12px / 600,
each with a 14px leading icon. Same bronze-tint selected treatment.

| pill        | key       | default | controls                          |
|-------------|-----------|---------|-----------------------------------|
| Date        | `date`    | on      | date line / hero date stamp       |
| Stats       | `meta`    | on      | the entry meta line               |
| Chapter     | `chapter` | on      | chapter marker                    |
| Name        | `name`    | on      | athlete name                      |
| Pose labels | `pose`    | **off** | per-photo pose chips              |

Toggling any of these updates the preview immediately. Screenshot 09 is pose labels on; screenshot 10
is Date only, everything else off — the card must stay composed at that extreme, not collapse.

**Caption.** Two-row textarea, seeded from `entry.caption`, placeholder `Say something about this one…`.
14px / 1.5, `--fl-charcoal-900` background, `1px solid --fl-charcoal-600`, `--fl-radius-md`,
padding `12px 13px`, `resize: none`. Below it, a 10.5px `--fl-text-tertiary` note whose text depends
on origin:

- `origin: squad` → `Posts with the card to {squad name}.`
- otherwise → `Copied alongside the image when you share out.`

---

## 15. Footer — screenshots 02 and 13

Fixed. Padding `12px 20px calc(16px + env(safe-area-inset-bottom))`, top border
`1px solid --fl-charcoal-700`, background `linear-gradient(180deg, rgba(6,7,8,0.35), rgba(6,7,8,0.75))`,
column gap 11.

**Send row** — `repeat(4, 1fr)`, gap 8. Each: `--fl-radius-lg`, `1px solid --fl-charcoal-600`,
`--fl-surface-card`, padding `10px 4px`, 19px icon in `--fl-icon-bronze` over a 10.5px / 600
`--fl-text-secondary` label.

| target      | action                                                       |
|-------------|--------------------------------------------------------------|
| Instagram   | render at chosen format, hand off to the Instagram share intent |
| Facebook    | same, Facebook share intent                                   |
| Save        | write the rendered image(s) to the camera roll                |
| More        | OS share sheet (`navigator.share` on web)                     |

For Hero with N slides, Instagram/Facebook/Save must produce **N images in slide order**, not one.

**Primary button** — full width, padding 15, `--fl-radius-md`, `--fl-bronze-fill` with
`--fl-bronze-metal-border`, `--fl-bronze-metal-top-rim`, ink `#F7F5F1`, 14px / 700, share glyph at 16.
This is the sanctioned bronze fill; it is the only large bronze area on the screen.

Label depends on origin:

- `origin: squad` → `Post to {squad name}` (screenshot 13)
- otherwise → `Share`, opening the OS share sheet

**Toast** — screenshot 11. Centered pill at `bottom: 150`, `--fl-surface-elevated`,
`1px solid --fl-bronze-border`, `--fl-shadow-float`, bronze check glyph, 13.5px / 600, 2.4s, rise-in
220ms. Non-modal, never blocks.

---

## 16. Squad post type registry

In `forge-squad-posts.js`:

1. Replace the `checkin` entry in `TYPES` with:
   `{ id: 'progress', label: 'Progress Photos', icon: 'camera', gate: 'member', blurb: 'Share your progress photos.' }`
   It stays **first** in the member section — it is now the most common post.
2. Add a `LEGACY` array holding the old `checkin` definition, and make `type(id)` fall back to it.
   Historic check-in posts must keep rendering; they simply cannot be authored any more.

---

## 17. Squad Composer — screenshot 01

The picker grid is unchanged except that the first card now reads **Progress Photos** with the
`camera` symbol. Add `camera` to the composer's type-glyph map
(`M4 8.5h3l1.5-2h7l1.5 2h3v10H4z` plus a circle at 12,13 r 3.5) — without it the card falls back to
the message glyph.

Selecting it does **not** open the inline compose form. It writes
`{ origin: 'squad' }` to the launch-context key and navigates to Progress Photo Post. Apply the same
redirect to the composer's preselect path, so deep links that preselect `progress` also land on the
new screen instead of a text form.

Posting from Progress Photo Post writes:

```json
{
  "type": "progress",
  "author": "You",
  "role": null,
  "body": "<caption>",
  "progress": {
    "entryId": "xf-seed-3",
    "date": "Mar 6, 2026",
    "format": "4x5",
    "style": "grid",
    "poses": ["rf", "rs", "rb", "ff"]
  }
}
```

then marks it as just-posted and navigates to Squad Detail. Body falls back to `Progress photos.`
when the caption is empty.

---

## 18. Squad Detail feed

- Type icon map: `progress → 'camera'`.
- Lead line: `posted progress photos.`
- Keep the `checkin` cases in both maps for historic posts.
- The feed post renders the same card the composer previewed — Grid as a static card, Hero as a
  swipeable carousel with the same dots. Same asset everywhere; there is no separate in-app layout.

---

## 19. Transformation entry point

`ForgeTransformation`'s per-entry **Share** action no longer routes to Share Configuration. It writes
`{ origin: 'transformation', entryId }` to the launch-context key and navigates to Progress Photo Post.

The Then/Now **compare** share is unchanged and still goes to Share Configuration. Do not merge them
in this pass.

---

## 20. Navigation and back behavior

- `origin: squad` → back returns to Squad Composer's type picker.
- `origin: transformation` → back returns to the Transformation screen (history back when the
  referrer is same-origin, else a direct navigation).
- The launch context is read once at mount and deleted immediately.
- After a successful squad post, navigate to Squad Detail ~800ms behind the toast so the confirmation
  is seen.

---

## 21. Motion

Per the foundation's Motion card — deliberate and heavy, nothing springy.

| moment                         | spec                                              |
|--------------------------------|---------------------------------------------------|
| Format / style change          | 220ms opacity + `scale(0.985)→1`, `--fl-ease-out` |
| Chip and pill selection        | 160ms `border-color`, `--fl-ease-out`             |
| Carousel dot                   | 180ms `background`                                |
| Carousel paging                | native scroll snap, no JS animation               |
| Toast in                       | 220ms rise 8px + fade                             |

Under `prefers-reduced-motion: reduce`, all durations collapse to ~0. Scroll snapping stays — it is
navigation, not decoration.

---

## 22. Edge cases

1. **Entry with no photos.** Tiles show the camera glyph; the card still composes with placeholder
   cells. Do not block the screen; the athlete may be about to add photos.
2. **Fewer photos than the cap.** Grid column count follows the real count (section 10); never pad
   with empty cells.
3. **One photo in Hero.** No counter pill, no dots — it is just a card.
4. **Long meta strings.** `text-wrap: pretty`, wrap to a second line, never truncate mid-value.
5. **Long caption.** The card never renders the caption. It rides along as post body or share text.
6. **Entry switched mid-edit.** Photo selection resets; format, style, and toggles persist.
7. **Cap reached.** Toast, no state change.

---

## 23. Acceptance

- [ ] Format chips switch the preview between exact 1:1 and 4:5 proportions.
- [ ] Grid renders 1, 2, 3, and 4 photos with the column counts in section 10.
- [ ] Hero swipes, snaps per slide, and the dots track the scroll position.
- [ ] Grid caps at 4 and Hero at 6, each with the right toast; neither can reach zero photos.
- [ ] All five card toggles change the preview live, and Date-only still looks composed.
- [ ] Exports are 1080×1080 / 1080×1350, and a Hero carousel exports one image per slide.
- [ ] Squad Composer's first card is Progress Photos and routes to this screen, not a text form.
- [ ] Historic check-in posts still render in the squad feed.
- [ ] Transformation entry Share opens this screen; compare share still opens Share Configuration.
- [ ] Reduced motion removes all transitions and keeps scroll snap.

---

## 24. Screenshot index

| # | file | state |
|---|------|-------|
| 01 | `01-composer-picker.png` | Squad Composer, Progress Photos as the first type |
| 02 | `02-grid-4x5-4up.png` | Grid · 4:5 · 4 photos — the default open state |
| 03 | `03-grid-1x1-4up.png` | Grid · 1:1 · 4 photos |
| 04 | `04-grid-4x5-3up.png` | Grid · 4:5 · 3-up row |
| 05 | `05-grid-4x5-2up.png` | Grid · 4:5 · 2 photos |
| 06 | `06-hero-4x5-slide1.png` | Hero · 4:5 · slide 1, counter and dots |
| 07 | `07-hero-4x5-slide3.png` | Hero · 4:5 · swiped, third dot active |
| 08 | `08-hero-1x1.png` | Hero · 1:1 |
| 09 | `09-grid-pose-labels.png` | Grid with pose labels on |
| 10 | `10-grid-minimal.png` | Grid with Date only — every other toggle off |
| 11 | `11-toast.png` | Toast confirmation |
| 12 | `12-controls-full-sheet.png` | Whole control sheet uncropped |
| 13 | `13-squad-origin-cta.png` | Opened from the composer — `Post to Iron Vigil` |

Photo areas in these captures are rendered as flat bronze plates. That is a capture substitute for
the athlete's real photos, not a design element.
