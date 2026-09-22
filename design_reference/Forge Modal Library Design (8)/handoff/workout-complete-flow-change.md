# Workout Completion Flow — implementation spec

Reference mockup: `Forge Workout Complete v2.dc.html` (design prototype, not production code).
Design system: `ForgeLegacyVisualFoundation_5368b2`. All values below are `--fl-*` tokens or literals
already used in the mockup. Do not invent new tokens, colors, or type sizes.

---

## 1. What changes, in one paragraph

Today the post-workout flow is three sequential screens: **Completion → Workout Details → Add Note**,
with Share reachable only as an icon in the top-right corner of the third screen. That is being replaced
with a **two-stage completion screen** plus three bottom sheets. Stage 1 is the existing seal/ceremony
screen, unchanged. Pressing/holding to seal transforms the *same* screen into Stage 2 ("capture"), which
offers note, photo/video, and playlist as sheet-opening rows, with **Share as the single primary button**.
Workout Details becomes an optional detour reachable from either stage, not a mandatory step. The standalone
Add Note screen is deleted entirely — it becomes a bottom sheet.

Rationale to preserve in code review: Stage 1's only job is "you finished, it is sealed." Nothing may be
added to it. Capture is a second, distinct moment that happens *after* closure.

---

## 2. Routing / state model

Replace any multi-route navigation for this flow with a single screen holding one state variable:

```
stage: 'seal' | 'capture' | 'record'
```

- Initial value: `'seal'`.
- `seal → capture`: on seal completion only. Delay the transition **850ms** after the seal completes so the
  stamp animation finishes; do not transition on press-down.
- `seal → record` and `capture → record`: "See the details" / "See workout details" link.
- `record → back`: returns to **whichever stage it was opened from**. Track this in a second variable
  (`from`) set at navigation time. Do not hardcode a back target.
- `capture → exit`: "Back to home" pops the flow.
- There is **no** path from `capture` back to `seal`. The seal is a one-time moment.

Attachment state lives at the same level and survives stage changes:

```
note: string        // '' = not added
photos: number      // 0 = none
playlist: string    // '' = none
sheet: 'note' | 'playlist' | 'share' | null
```

Persist `note` / `photos` / `playlist` to the workout record as they are set (on sheet dismiss), **not**
on "Back to home." A user who force-quits from the capture stage must not lose an attached note.

---

## 3. Stage 1 — the seal screen

**Do not restyle this screen.** Two changes only:

1. **Delete the top-right share icon button** from the app bar. Share now lives on Stage 2. Nothing
   replaces it — the app bar on this screen has no trailing action.
2. **Change the seal action's outcome.** It previously dismissed the flow / navigated home. It now sets
   `stage = 'capture'`. The hold interaction, progress fill, haptic pattern, "Sealed" label swap, and stamp
   ring animation all stay exactly as they are.

Everything else is untouched: chapter eyebrow, 132px seal disc with ember glow, workout name at 38px display,
`Week 6 · Day 2 · <date>` line, the two-stat strip (Under Iron / Volume) with the hairline divider, the hero
recognition card (honor / PR / milestone / consistency variants), the quote block, the "Up next" line, and
"See the details" as a text link below the seal control.

---

## 4. Stage 2 — the capture screen

Same screen container, same background. Content replaces Stage 1's content and animates in with a single
rise: `opacity 0 → 1`, `translateY(14px) → 0`, **560ms**, `--fl-ease-out`. One animation on the whole block;
do not stagger the children.

Container: vertical flex, `align-items: center`, `text-align: center`,
padding `52px 34px 34px`, scrollable with hidden scrollbars. **Everything flows from the top — no
`margin-top: auto`, no `justify-content: space-between`, no pinned footer.** The dead space between the rows
and the buttons in the first draft was the main defect being fixed here.

Top to bottom:

1. **Seal disc, small.** 72px square. Outer circle: `1px solid var(--fl-bronze-border)`, background
   `var(--fl-icon-container-bg)`, `box-shadow: var(--fl-border-inset)`. Inner ring inset 7px,
   `1px solid var(--fl-bronze-border-subtle)`. Forge mark at 34px in `var(--fl-bronze-bright)`.
   **No ember glow and no pulse** — the glow belongs to Stage 1 only.
2. **Workout name.** `var(--fl-font-display)`, 26px, weight 700, line-height 1.08, letter-spacing 0.3px,
   `margin-top: 15px`.
3. **One meta line.** 12.5px, `var(--fl-text-tertiary)`, letter-spacing 0.3px, `margin-top: 6px`.
   Format: `<date> · <duration> · <volume> volume` (e.g. `Mar 14 · 52:18 · 18,140 volume`). Volume must
   run through the existing unit formatter. This line replaces the Stage 1 stat strip — do not repeat the
   boxed two-stat treatment here.
4. **Section block**, `max-width: 322px`, `margin-top: 30px`, left-aligned, gap 7px:
   - Label `YOUR RECORD` — 10.5px, weight 700, letter-spacing 2.2px, uppercase,
     `var(--fl-bronze-primary)`.
   - Body copy, **verbatim, do not rewrite**: `The workout is sealed. What surrounds it is still yours to add.`
     13px, line-height 1.5, `var(--fl-text-secondary)`, `text-wrap: pretty`, `margin-bottom: 4px`.
     This line is load-bearing: it explains why Done was already pressed but things can still be added.
5. **The three rows**, in one bordered group: `border-radius: var(--fl-radius-lg)`,
   `1px solid var(--fl-charcoal-600)`, background `var(--fl-surface-recessed)`,
   `box-shadow: var(--fl-border-inset)`, `overflow: hidden`. Each row is a button, height **54px**,
   padding `0 15px`, gap 13px, dividers `1px solid var(--fl-charcoal-600)` on rows 2 and 3 only
   (no top border on row 1, no bottom border on row 3). Each row is `[icon 18px] [label, flex:1] [chevron 15px]`;
   chevron is always `var(--fl-text-tertiary)`.

   | Row | Empty label | Filled label | Opens |
   |---|---|---|---|
   | Note (pencil) | `Add a note` | the note in curly quotes, single-line ellipsis | note sheet |
   | Photo (camera) | `Add photo or video` | `N photo attached` / `N photos attached` | native picker |
   | Playlist (music note) | `Add playlist` | the playlist name, ellipsis | playlist sheet |

   State coloring, applied per row: empty → label `var(--fl-text-secondary)`, icon `var(--fl-bronze-primary)`.
   Filled → label `var(--fl-text-primary)`, icon `var(--fl-bronze-bright)`. That icon shift from primary to
   bright is the only "done" affordance; **do not add checkmarks, filled backgrounds, or badges.**

6. **Share — primary button.** `Button variant="primary"`, full width, 52px, `max-width: 322px`,
   `margin-top: 22px`. Label: `Share your workout`. This is the only filled button on the screen.
7. **Two exits**, stacked and centered, `margin-top: 10px`, gap 6px. Both are bare text buttons with
   `min-height: 44px` for hit area, never full-width buttons:
   - `Back to home` — 14px, weight 600, `var(--fl-text-secondary)`, hover `var(--fl-text-primary)`.
   - `See workout details` — 13.5px, regular weight, `var(--fl-text-tertiary)`, hover
     `var(--fl-text-secondary)`.

   The weight difference is intentional: exit reads above secondary navigation, and neither competes with Share.

---

## 5. The three sheets

All three use `BottomSheet` from the design system with its standard title bar and dismiss. They must be
rendered **inside the screen's own stacking context** (the screen root needs `transform: translate3d(0,0,0)`
so a fixed-position sheet is contained by the phone frame rather than the viewport). Dismissing any sheet
returns to the capture stage with state committed.

**Note sheet** — title `A note for future you`.
- Helper line: `One line. You'll read it again someday.` 13px `var(--fl-text-secondary)`.
- **Memory block** (keep this — it is the emotional hook): recessed surface, `radius-lg`,
  `1px solid var(--fl-charcoal-600)` plus `border-left: 2px solid var(--fl-bronze-primary)`, padding 12/14px.
  Inside: uppercase 9px tertiary label `A year ago today, you wrote`, then the past note in
  `var(--fl-font-display)` italic 14px `var(--fl-text-secondary)`. Render this block only when a note from
  ~1 year ago exists; omit the whole block otherwise (Smart Omission — no empty-state copy).
- Textarea: 3 rows, no resize, recessed surface, `radius-lg`, padding 14/15px, text in
  `var(--fl-font-display)` italic 16px, placeholder `Today I…` in `var(--fl-text-tertiary)`.
- Primary button, full width, 50px: `Seal the note`.

**Playlist sheet** — title `Attach a playlist`.
- Helper line: `What was playing while you trained.`
- A list of selectable rows, 56px, `radius-md`, recessed surface, gap 8px. Each shows a music icon in
  `var(--fl-bronze-primary)`, the playlist name at 14px primary, and a source/track-count meta line at
  11.5px tertiary. The currently selected row's border is `var(--fl-bronze-border)` instead of
  `var(--fl-charcoal-600)`.
- Selecting a row sets `playlist` and closes the sheet immediately. No confirm button.
- **This is a manual picker.** There is no auto-detection of what was playing; do not build one, and do not
  label anything "detected."

**Share sheet** — title `Share your workout`. Scrollable, `max-height: 64vh`.
- **Card preview first**, centered, 238px wide, `border-radius: 20px`,
  `1px solid var(--fl-bronze-border)`, `box-shadow: var(--fl-shadow-card-hero)`, background is a radial
  bronze wash at the top over a vertical `#0E1216 → #070A0C` gradient, padding `24px 20px 20px`. Contents,
  centered: 64px seal disc → `SESSION SEALED` (9px, ls 2.4px, bronze-primary) → workout name (display 22px,
  700) → `Chapter III · <date>` (11px secondary) → 44px bronze hairline → two stats (volume, under iron) at
  display 16px with 8px uppercase tertiary labels split by a vertical hairline → `FORGE LEGACY` wordmark
  (display 12px, weight 700, ls 2.6px, `var(--fl-bronze-bright)`).
  The user sees what they are sending before choosing where. Do not put destinations above the preview.
- **`WITHIN FORGE`** group label (10.5px, 700, ls 2.2px, tertiary), then two equal tiles side by side, 74px
  tall, `radius-md`, recessed, gap 9px: **Friends** and **Squads**, each icon-over-label with the icon in
  `var(--fl-bronze-primary)` and a 12.5px label.
- **`OUTSIDE FORGE`** group label, then a single bordered group of 50px rows (dividers between only):
  `Save workout card`, `Instagram Stories`, `Messages`, `More…`. Icons 17px `var(--fl-text-secondary)`,
  labels 14px primary. `More…` invokes the OS share sheet.
- The inside/outside split is presented in one pass. Do **not** ask "in the app or outside?" first.

---

## 6. Workout Details screen

Content unchanged. Two changes:

1. The primary button at the bottom is **contextual**: label it `Back to your record` when the screen was
   opened from the capture stage, and `Done` when opened from the seal stage. Both just pop back to the
   stage in `from`.
2. It is no longer part of a forced sequence and must not auto-advance to anything.

---

## 7. Deletions

- The standalone **Add Note screen** and its route. It is a sheet now.
- The **share icon button** in the completion app bar.
- Any "skip" affordance tied to the note step — nothing is being skipped anymore.

---

## 8. Acceptance checks

- Sealing lands on the capture stage in the same screen, with no navigation push and no flash of the
  home screen.
- The capture stage fits an iPhone 13-mini viewport without scrolling in the empty state, and there is no
  gap larger than 30px between any two adjacent blocks.
- Attaching a note, then a photo, then a playlist updates all three rows in place; leaving to Workout
  Details and coming back preserves all three.
- Share is the only filled button on the capture stage.
- Bottom sheets are clipped by the device frame, not the browser viewport.
- Under `prefers-reduced-motion`, the stage transition and the seal stamp are instant; layout is identical.
- Volume and weight figures respect the lb/kg setting everywhere they appear, including inside the share
  card preview.
