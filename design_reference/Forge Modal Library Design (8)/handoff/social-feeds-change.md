# Social feeds — implementation spec (Friends feed + Squad feed)

Reference mockups: `Forge Friends Feed v2.dc.html`, `Squad Detail.dc.html` (design prototypes, not production code).
Design system: `ForgeLegacyVisualFoundation_5368b2`. Every value below is a `--fl-*` token or a literal
already present in the mockups. Do not introduce new colors, type sizes, or components.

**Read this first.** The two feeds are separate screens with separate data stores, and they stay separate.
But the **post rendering rules are identical on both** — every rule in §2 and §3 applies to the Friends feed
and the Squad feed equally. Where a screen needs something the other doesn't, it is called out explicitly.
Do not implement this twice with different values. Build one shared post-renderer and mount it in both.

---

## 1. The problem being fixed

Both feeds currently render every post as a rounded, bordered card, with a second bronze-tinted container
nested inside for workout data. Two containers deep, plus a border, plus a background tint, on a screen
whose entire visual language is already "forged surface." The result reads as boxes inside boxes, bronze
loses all meaning because it is on everything, and roughly 40% of each post's height is chrome rather than
content. Photo posts are worse — on the Squad feed a progress post renders as the sentence
`posted progress photos.` with no photo at all.

The fix is one idea: **the feed is a ledger, not a stack of cards.** Posts are separated by hairlines, not
walls. Bronze appears only where it means something. Media is the exception that gets to break the grid.

---

## 2. Rules that apply to every post on both feeds

### 2.1 Kill the containers

- Remove the per-post card: no `border`, no `border-radius`, no `box-shadow`, no elevated background.
- A post is a block with `padding: 22px 0 14px` and a single bottom separator:
  `1px solid var(--fl-charcoal-700)`.
- Horizontal gutter is **18px**, applied to each inner block individually — **not** to the post wrapper.
  The wrapper must have zero horizontal padding so media can run edge to edge (§3).
- Alternate posts may carry `background: rgba(255,255,255,0.012)` — an almost-invisible surface shift that
  keeps a long feed from reading as one slab. If it is visible as banding, remove it.
- **Delete the nested bronze workout container entirely.** Workout stats sit directly on the feed canvas.
- Squad feed only: the Weekly Summary row **keeps** its card treatment (bronze border, bronze-tinted
  gradient). It is a system artifact, not a member post, and the contrast is the point.

### 2.2 Where bronze is allowed

Bronze appears in exactly three places in a post:

1. the post-type icon,
2. the post-type label,
3. the stat labels (`--fl-text-bronze-label`).

Nowhere else. Not on borders, not on backgrounds, not on the author name, not on timestamps, not on the
action row in its resting state.

### 2.3 Post header — one row, 34px

`[avatar 34px] [name / audience] [time]`, `align-items: center`, gap 10px, inside the 18px gutter.

- Avatar: 34px circle, `1px solid var(--fl-charcoal-600)`. When there is no photo, use **AvatarGlyph** —
  initials in `var(--fl-font-display)` 14px weight 600 `var(--fl-bronze-primary)` on
  `var(--fl-icon-container-bg)`. Never a silhouette.
- Name: 14.5px, weight 600, `var(--fl-text-primary)`, line-height 1.2.
- Audience beneath it: 11.5px `var(--fl-text-tertiary)` — `Friends`, `Friends & Squad`, or the squad name.
- Time: 12px `var(--fl-text-tertiary)`, right-aligned, `flex: none`.

### 2.4 Type marker

Icon + label on one line, `margin-top: 17px`, gap 7px, both in `var(--fl-bronze-primary)`.
Label is 10px, weight 700, letter-spacing 2.2px, uppercase (`WORKOUT`, `GOAL`, `PR`, `FORM CHECK`).
**A photo post has no type marker** — see §3.

### 2.5 Title and context

- Title: `var(--fl-font-display)` 22px, weight 600, line-height 1.15, letter-spacing 0.2px,
  `var(--fl-text-primary)`, `text-wrap: pretty`, `margin-top: 7px`.
  Every workout post must have a real title — `Push — Chest & Shoulders`, not a generic label.
- Context line beneath: 12.5px `var(--fl-text-tertiary)`, `margin-top: 4px`.
  Format: `<Program> · Week N · Day N`.

This is a content requirement as much as a layout one. A workout post with no name and no program context
is an anonymous pile of numbers; the title is what makes it a legible entry in someone's record.

### 2.6 Stats

A plain horizontal row, `margin-top: 15px`, gap 26px, no container, no dividers, no background.
Per stat: value in `var(--fl-font-display)` 21px weight 600 line-height 1 `var(--fl-text-primary)`,
label beneath at 9px weight 700 letter-spacing 1.5px uppercase `var(--fl-text-bronze-label)`, gap 3px.
Maximum three stats: **Volume · Time · Lifts**. Weight and volume figures run through the existing lb/kg
formatter.

### 2.7 Music attachment

The playlist is content, not a tag. Render it as a real row: full width minus the gutter,
`margin-top: 16px`, `border-radius: 10px`, `1px solid var(--fl-charcoal-600)`,
`background: var(--fl-surface-recessed)`, `box-shadow: var(--fl-border-inset)`, padding `9px 12px 9px 9px`,
gap 12px. Contents: 52px square artwork (`border-radius: 8px`, `1px solid var(--fl-charcoal-600)`),
then playlist name at 14.5px weight 600 `var(--fl-text-primary)` with single-line ellipsis, then
`<Source> · N tracks` at 11.5px `var(--fl-text-tertiary)`, then a 15px chevron in
`var(--fl-text-tertiary)`. The whole row is one tap target.

Artwork comes from the Spotify / Apple Music API at runtime. Until it loads, show the bronze music glyph on
`linear-gradient(145deg, rgba(191,143,79,0.14), rgba(191,143,79,0.03))` with `var(--fl-border-inset)`.
**Never use Spotify green or any partner brand color** — the attachment belongs to Forge's surface.

### 2.8 Caption

14px, line-height 1.55, `var(--fl-text-secondary)`, `text-wrap: pretty`, inside the gutter.
On a media post the caption's position is fixed by §3.4.

### 2.9 Action row

`margin-top: 16px`, left-aligned, hit areas `min-height: 44px`, no top border, no separator above it.
Pull the row 8px left of the gutter so the first label optically aligns with the text above it.

- **Acknowledge** — flame glyph + the word + count. Resting `var(--fl-text-secondary)`;
  once acknowledged, glyph and label both go `var(--fl-bronze-bright)` and the count increments.
  This is the only state change in the row. No fill, no border, no animation beyond the color change.
- **Comment** — speech glyph + count in `var(--fl-text-tertiary)`. Count hidden when zero.

Do not add a share control to the feed row.

### 2.10 Composer (Friends feed)

One flat 68px row at the top of the scroller, not a card:
`[avatar 38px] [What did you forge today?] [+ in a 30px bronze-outlined circle]`, padding `0 18px`,
bottom separator `1px solid var(--fl-charcoal-700)`, and a barely-there top wash
`linear-gradient(180deg, rgba(191,143,79,0.035), transparent)`. Placeholder is 15px
`var(--fl-text-tertiary)`.
Squad feed keeps its existing `New Post` pill in the section header — do not replace it with this composer.

### 2.11 End of feed

Centered, `padding: 26px 0 34px`: a 4px bronze diamond, `END OF THE LEDGER` at 10.5px letter-spacing 2px
uppercase `var(--fl-text-tertiary)`, another diamond. Squad feed keeps its existing `Load More` control
and shows this only when everything is loaded.

---

## 3. Media posts — the deliberate exception

Everything above strips containers so data can breathe. **Media inverts that rule.** On a photo post the
image *is* the content, and in a feed with no cards left, a full-bleed photo becomes the only rectangle on
the screen. That is exactly the emphasis it should have, and it costs nothing structurally.

### 3.1 Full-bleed

The media band ignores the 18px gutter and runs to the screen edge (Friends feed) or the card edge
(Squad feed — negative margins past the icon column, with `overflow: hidden` on the card so the corners
still clip). No radius, no border, no inset from the sides.

### 3.2 Ratio

- Photo: **4:5**, hard cap. Taller source images are center-cropped. Never let a portrait shot consume a
  whole viewport — the feed stops being scannable.
- Video: **16:9**. This replaces the current fixed 96px letterbox.

### 3.3 Grading

The design system requires imagery to belong to the interface, not sit on top of it. Two overlays, both
`pointer-events: none`, on a single absolutely-positioned span:

```
box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05),
            inset 0 -70px 70px -50px rgba(6,7,9,0.85);
```

The hairline seats the image in the surface; the bottom scrim lets the counter sit on it and stops a bright
photo from colliding with the copy beneath. Use `-56px 56px -44px` on 16:9 video.

### 3.4 Order — attribution, image, words

1. The header row (§2.3).
2. Squad feed only: the one-line attribution sentence (`Marcus Vale posted a form check`) stays above the
   media — it is who-did-what, not commentary.
3. The media band.
4. The caption, **below the image**, `margin-top: 12px`, back inside the gutter.

A photo post's body copy never renders above its photo. On the Squad feed this means moving the post body
out of the existing detail slot into a new slot beneath the media, and leaving the detail slot empty for
media posts.

### 3.5 No competing chrome

A photo post has **no type marker, no title, and no stat row.** The image announces what the post is.
Adding a `PHOTO` label above it is the same mistake as the nested container — decoration stating what is
already obvious.

If the photo came from a session, attach the workout as a compact strip below the caption so the image
still links back to the record. Do not promote it above the image.

### 3.6 Overlays on the media

- Multiple photos: swipe horizontally **in place** within the same band — not a grid, not a stack.
  Counter `1 / 3` pinned bottom-right: padding `4px 9px`, `border-radius: var(--fl-radius-pill)`,
  `background: rgba(6,7,9,0.62)`, `1px solid rgba(255,255,255,0.09)`, `backdrop-filter: blur(6px)`,
  11px weight 600. Hidden when there is only one photo.
- Video: a 44px centered play disc, `rgba(0,0,0,0.45)` with `1px solid var(--fl-bronze-border)` and
  `backdrop-filter: blur(4px)`, plus a duration chip bottom-right in the same style as the counter.

### 3.7 Squad feed specifics

`progress` posts get the photo treatment; `formcheck` posts get the video treatment. The placeholder
sentence `posted progress photos.` must not appear alongside a visible photo — it becomes the attribution
line only, and the member's own words move below the image.

---

## 4. Goal posts

A goal is a first-class post type, not a workout post with the numbers removed.

- Type marker: target glyph + `GOAL`.
- Title: `<Exercise> · <Target>` (`Bench Press · 225 lb`), display 22px, same as any post title.
- Context line: `Target established <date>`.
- Caption: `A new target has been set.`
- No stat row.

**Delete the `Forged in Forge Legacy` badge.** Every post in the app was forged in Forge Legacy; the label
carries no information and consumes a full row.

---

## 5. Resulting rhythm

Workout post lands at roughly 350px, goal post at roughly 250px, photo post at roughly 560px including the
4:5 image. A user always sees one complete post plus meaningful evidence of the next — which is what makes
a feed feel continuous rather than paged.

---

## 6. Acceptance checks

- No post on either feed has a border, radius, or shadow, except the Squad Weekly Summary row.
- No bronze appears on any post except the type icon, type label, and stat labels.
- Every workout post shows a title and a `Program · Week · Day` line.
- Photos and videos touch the screen edge (Friends) or card edge (Squad); every other element sits on the
  same 18px gutter.
- A 4:5 photo post never exceeds ~62% of viewport height on a 6.1" device.
- A photo post renders no type label, no title, and no stats.
- Media captions render below the media, never above.
- A Squad `progress` post shows an actual photo, never the sentence `posted progress photos.` alone.
- Acknowledge toggles bronze and increments in place; no other element in the action row changes.
- Playlist rows show artwork, name, and source, and use no partner brand color.
- All weight and volume figures respect the lb/kg setting.
