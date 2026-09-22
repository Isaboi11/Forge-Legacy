# Forge Activity Detail (W-19) — Complete Functional Specification

Build-to spec for `Forge Activity Detail.dc.html`. Everything here exists in the current build. This is the **read-only detail view** for a single logged training session. It is reached by tapping a row in Activity History (W-18) — which navigates here as `Forge Activity Detail.dc.html?id={key}`. Both screens read the same module (`forge-activity-log.js`), so the tapped row always resolves to the matching session.

The screen is **polymorphic**: one layout that renders different body sections depending on the session `type` (strength vs run/walk/bike vs swim vs hiit vs mobility/yoga/other). All body content is computed by `ForgeActivityLog.detail(id)`; the DC is a thin presentation layer over that view-model.

---

## 0. Frame & shell

- Fixed phone frame **404 × 868**, radius 32, 1px `--fl-charcoal-600` border, `--fl-shadow-ambient`, `overflow:hidden`, column flex, `data-screen-label="W-19 Activity Detail"`.
- Background: `linear-gradient(rgba(5,5,5,0.3),…)` over `#050505 url('assets/legacy-bg.png') center/cover`.
- Body base: `--fl-bg-atmospheric` (fixed attachment), `--fl-text-primary`, `--fl-font-sans`, antialiased.
- **Grain overlay:** SVG fractalNoise, opacity 0.07, `mix-blend:overlay`, `pointer-events:none`, z-20, 160×160 tile.
- Link colors defined: `a` → `--fl-bronze-primary`, `a:hover` → `--fl-bronze-bright`.
- Scrollbars hidden (`.fl-scroll`, both webkit and firefox).
- Vertical layout: **app bar (fixed, 56px)** → **scroll region (flex:1)** → floating toast (conditional).
- No TabBar on this screen (it is a pushed detail, not a tab root).

### Fonts & scripts loaded (`<helmet>`)
- Google **Playfair Display** (500/600/700 + italic 500) — the display serif.
- DS `foundation.css` + `styles.css`, then `_ds_bundle.js` injected via a React/ReactDOM-ready poller (25ms, ≤600 tries) guarded by `window.__flBundleInjected`.
- `forge-theme.js`, `forge-symbols.js`, `forge-activity-log.js`, `image-slot.js`.

### Motion
- `@keyframes flFade` (opacity), `flToast` (slide-up + fade), `flMenu` (drop + scale).
- `prefers-reduced-motion` collapses all animation durations to 0.001ms.

### Props
- **None declared** beyond `$preview` (404×868). Units are hardcoded `'lbs'` in `renderVals` (see §9 note).

---

## 1. Readiness gate

- `state = { ready:false, toast:null, menu:false }`.
- On mount, poll every **40ms** until FOUR globals exist: `React.createElement`, `window.ForgeLegacyVisualFoundation_5368b2`, `window.ForgeSymbols`, `window.ForgeActivityLog` → `ready:true`.
- Until ready → **loading splash** (centered bronze forge-mark disc on `--fl-bg-primary`).
- `renderVals` also early-returns `{ready:false, notReady:true}` if not ready / no React.
- `componentWillUnmount` clears both the poll timeout and the toast timeout.
- (Preview-runtime shim per project notes — production mounts normally.)

---

## 2. Session resolution

- Read `id` from `new URLSearchParams(window.location.search).get('id')` (empty string on failure).
- `const d = window.ForgeActivityLog.detail(id)`.
- **Fallback:** if no record matches the id, `detail()` returns `RECORDS[0]` (the newest seed, `j10` "Leg Day A") — the screen never renders empty.

---

## 3. App bar (56px, fixed, z-37)

- **Back** (44×44 chevron-left, `--fl-text-secondary`) → `goBack()`:
  - Same-origin referrer → `window.history.back()`; else navigate to `Forge Activity History.dc.html`.
- **Overflow / "More"** (44×44 three-dot) → `toggleMenu()` (flips `state.menu`).

### 3.1 Overflow menu (`menuOpen`, z-38)
- Rendered only when open. A full-screen invisible scrim (z-35) closes it (`closeMenu`).
- Popover top:52 right:12, width 172, `#17130d` bg, bronze-subtle border, `--fl-shadow-float`, `flMenu` animation.
- Two items (both bronze-stroked 16px icons, hover → recessed surface):
  - **Share** → `share()` → toast "Share this session".
  - **Export** → `exportSession()` → toast "Exporting session…".
- Both close the menu (via `_showToast` which sets `menu:false`).

---

## 4. Hero block (always rendered, `flFade` in)

Row: 44×44 **activity icon** tile (bronze-subtle border, icon-container bg, bronze icon = `ForgeSymbols.create(type.symbol, 24)`) + a column:

- **Title** `h1` — Playfair 22px/600, `sessionName` = `d.title`.
- **Program tag** — 12px/600 tertiary = `d.programTag`:
  - strength → program name (`programOf`) or **"Free Session"**.
  - non-strength → the **type label** (Run, Swim, HIIT, …).
- **Milestone pill** (`hasMilestone`, only if `d.milestone`) — bronze-tint rounded pill, trophy icon + `milestoneText` (e.g. "405 lb Back Squat"). Bronze-bright text.
- **Summary line** — 15px/500 secondary = `d.summaryLine`, by type:
  - strength → `{dur} · {ex} exercises · {sets} sets`
  - run/walk/bike → `{dur} · {mi} mi` (1 decimal)
  - swim → `{dur} · {swim}` (e.g. "1,500 m")
  - hiit → `{dur} · {rounds} rounds`
  - else → `{dur}`
- **When line** — 13.5px tertiary = `d.whenLine` = `{FullWeekday}, {FullMonth} {day} · {time}`. Time = the record's logged `_time`, else a value from the fixed `TIMES` rotation indexed by session ordinal.
- **Ordinal line** (`role=button`, hover→bronze) — `d.ordinalLine` + chevron → `goTimeline()` → `Forge Legacy Timeline.dc.html`.
  - `ordinalLine` = `{Workout #N | Session #N}{ · ChapterShort}`. Strength sessions counted separately ("Workout #") from the global index ("Session #"), oldest = 1, computed once over the seed. ChapterShort = the part before "·" in the chapter string (e.g. "Chapter III").

Followed by a hairline divider (`--fl-charcoal-700`, inset 24px).

---

## 5. Body — polymorphic sections

Exactly one primary body renders per session type. All are `sc-if`-gated on flags from `detail()`.

### 5.1 Exercises (strength only, `isStrength`)
Section label "Exercises". For each **section** in `d.sections` (`_sections` on the record, else `WORKOUTS[title]`, else null):
- Section sublabel (bronze, 9.5px, uppercase) = `s.section` (e.g. "Warm-up" / "Main Workout" / "Cool-down"), `showLabel` always true.
- For each **exercise** (`role=button`, hover lifts bg/border) → `ex.open` → `openExercise(name)`:
  - Persists `localStorage['forge.exercise.origin']='legacy'`, navigates to `Forge Exercise Detail.dc.html#origin=legacy&ex={name}`.
  - **52×52 media thumb:** `image-slot id="w19-{key}-{si}-{xi}"` (`hasMedia` always true in current build). A `deleted` state (bordered empty square) exists but is never triggered (`deleted:false` hardcoded).
  - **Name** 15px/600 + trailing chevron. `nameColor` = `--fl-text-primary`.
  - **Sets list** (`hasSets`, when `ex.sets.length>0`): per set a left index label (1,2,3…) + value via `setStr(st)`:
    - weight + reps → `{w} lbs × {r}`
    - reps only → `{r} reps`
    - weight only → `{w} lbs × —`
    - neither → "" 
  - **Meta row** (`hasMeta`, when `ex.meta`): uppercase `metaLabel` + `meta` value (e.g. "Duration" / "2 min") — used for timed cool-downs.
  - **No-sets** (`noSets`, when no sets AND no meta): italic "No sets logged".
  - **Note** (`hasNote`): italic secondary text with a bronze left-border quote block.

**Seed breakdowns** (`WORKOUTS`): only "Leg Day A" and "Pull Day B" carry representative section trees (warm-up / weighted main sets / timed cool-down). Other strength titles resolve to `null` sections → the Exercises block renders with no items. Logged sessions supply their own `_sections`.

### 5.2 Session summary (non-strength, `hasStats`)
Section label "Session". A row of stat tiles (`d.stats`), each: uppercase micro-label + Playfair 19px value. By type:
- run/walk/bike → **Distance** (`{mi} mi`) · **Avg Pace** (`pacePerMile` = `m:ss /mi`) · **Duration**.
- swim → **Distance** (`swim` string) · **Avg Pace** (`m:ss /100m`, computed as `min*60/15`) · **Duration**.
- hiit → **Rounds** · **Work : Rest** (`"40s : 20s"`, fixed) · **Duration**.
- mobility/yoga/other → **Duration** only (single tile).

### 5.3 Splits (run only, `hasSplits`)
Section label "Splits". One row per whole mile (`floor(mi)`): "Mile {i+1}" + a `m:ss` pace. Paces are representative — average pace ± a fixed offset cycle `[8,3,-2,-4,-1,5,2,-3,6,0]`.

---

## 6. Attribution block (bottom, always rendered container)

Opens with a hairline divider, then up to four tappable rows, each gated on data presence. Every row: 100px uppercase micro-label + value + trailing chevron/action.

- **Trained With** (`hasPartners`) — overlapping 30px initials discs + `partnersLabel` (comma-joined names). Tap → `openPartners()`: maps the **first** partner's name → a known id (`dana/marcus/theo/lena/ada`, default `marcus`) and navigates to `Forge Public Profile.dc.html?name={name}&id={id}&rel=Friend`.
- **Playlist** (`hasPlaylist`) — 34px `image-slot#w19-playlist-art` cover + `playlistName` + "Open ↗". Tap → `openPlaylist()` → toast "Opening {name}…".
- **Chapter** (`hasChapter`) — `chapterName` (full chapter string). Tap → `openChapter()`: sets `localStorage['forge.chapter.state']='active'`, navigates to `Forge Chapter Detail.dc.html`.
- **Program** (`hasProgram`, strength w/ program only) — `programName` = `{Program} — {title}` (e.g. "Powerbuilding II — Leg Day A"). Tap → `openProgram()` → `Forge Program Detail.dc.html`.

The last present row drops its bottom border.

---

## 7. Toast (`toastOpen`, z-40)

- Floating card, left/right 16, bottom 26, `#17130d`, bronze-subtle border, `--fl-shadow-float`, `flToast` animation.
- Message = `state.toast`. Auto-dismisses after **2600ms** (`_showToast` sets a timeout). Showing a toast also closes the overflow menu.

---

## 8. `detail(key)` — data contract (the single source of truth)

Returns a flat view-model. Full field list:

```
key, type, typeLabel, symbol, color,
title,
programTag,               // strength: program||'Free Session'; else typeLabel
hasMilestone, milestoneText,
summaryLine,              // §4
whenLine,                 // {FullWeekday}, {FullMonth} {d} · {time}
ordinalLine,              // '{Workout|Session} #N[ · ChapterShort]'
isStrength,
sections,                 // strength: _sections || WORKOUTS[title] || null
hasStats, stats,          // §5.2 tiles
hasSplits, splits,        // §5.3 per-mile
partners[]{name,initials}, partnersLabel,
playlist,                 // string ('' if none)
chapterName,              // full chapter string
programName               // strength+program: '{Program} — {title}'; else ''
```

Supporting helpers in the module: `programOf` (chapter contains "III" → "Powerbuilding II", any other chapter → "Powerbuilding I", no chapter → ""), `chapterShort` (text before "·"), `pacePerMile`, `fmtDur` (`< 1 min` / `{m} min` / `{h} hr` / `{h} hr {r} min`), and the once-computed `ordMap`. `DOW`/`MON` expand abbreviations to full names; `TIMES` is the 7-entry synthetic clock rotation.

Record shape and `logSession`/`records`/`clearLogged` are documented in the Activity History spec (§3 there) — same module, same `RECORDS` seed (23) + localStorage logged sessions (`forge_logged_sessions_v1`, cap 50, newest first).

---

## 9. Complete behavior index
- Poll-gate 4 globals → ready; else splash.
- Resolve session by `?id=`; fallback to newest seed if unmatched.
- App bar: back (history.back same-origin, else History), overflow → Share/Export (toasts).
- Hero: icon tile, serif title, program tag, optional milestone pill, type-specific summary, when line, tappable ordinal → Legacy Timeline.
- Body switches on type: strength → Exercises (sections → weighted/rep/timed sets, notes, tappable → Exercise Detail); cardio → 3 stat tiles; swim/hiit → their own tiles; run → per-mile splits; mobility/yoga/other → duration tile only.
- Attribution rows (each conditional): Trained With → Public Profile; Playlist → toast; Chapter → Chapter Detail; Program → Program Detail.
- Toast auto-dismiss 2600ms; grain overlay always on top.

---

## 10. Reference values & known constants
- Frame 404×868, radius 32. App bar 56px. Hero icon 44px (icon 24). Exercise thumb 52px. Partner disc 30px. Playlist art 34px.
- Units **hardcoded to `'lbs'`** in this screen (unlike History which has a `units` prop). Set weight display; a future units prop would replace the `const unit = 'lbs'`.
- Toast duration 2600ms. Bundle poller 25ms ×600. Ready poller 40ms.
- Swim pace divisor: `min*60/15` (assumes ~1500m / 100m units). HIIT work:rest fixed "40s : 20s".
- Split offset cycle `[8,3,-2,-4,-1,5,2,-3,6,0]`.
- Partner→id map: Dana Cole→dana, Marcus Vale→marcus, Theo Brandt→theo, Lena Cross→lena, Ada Ridge→ada (default marcus).
- Navigation targets: Activity History, Legacy Timeline, Exercise Detail (`#origin=legacy&ex=`), Public Profile (`?name&id&rel`), Chapter Detail, Program Detail.

---

## 11. Dependencies (must build together)
- `forge-activity-log.js` — the shared record source + `detail()`. **W-18 History and W-19 Detail must be built against this single module** or a tapped row won't resolve to the right session.
- `forge-symbols.js` — activity type glyphs.
- `image-slot.js` — exercise/playlist media placeholders.
- DS bundle + `forge-theme.js` — tokens and components.
- Linked screens: Exercise Detail, Public Profile, Chapter Detail, Program Detail, Legacy Timeline, Activity History.
