# Forge Exercise Detail (W-22) — Complete Functional Specification

Build-to spec for `Forge Exercise Detail.dc.html`. Everything here exists in the current build. This is the **read-only reference page for a single exercise** — its demonstration loop, definition, target muscles, step-by-step technique, coaching cues, common mistakes, and alternatives. It doubles as the entry point to the **Replace exercise** flow when opened from a program/workout in an actionable context.

All exercise content comes from a shared module `forge-exercise-catalog.js` (`window.ForgeExerciseCatalog`) that W-21 (Library), W-22 (this Detail), and W-23 (Picker) all read from — a single source of truth.

---

## 0. Frame & shell

- Fixed phone frame **404 × 868**, radius 32, 1px `--fl-charcoal-600` border, `--fl-shadow-ambient`, `overflow:hidden`, column flex, `data-screen-label="Exercise Detail · Bench Press"`.
- Background: `linear-gradient(rgba(6,7,8,0.3),…)` over `#060708 url('assets/forge-bg-2.png') center/cover`.
- Body base: `--fl-bg-atmospheric` (fixed), `--fl-text-primary`, `--fl-font-sans`, antialiased.
- **Grain overlay:** SVG fractalNoise, opacity 0.06, `mix-blend:overlay`, `pointer-events:none`, z-20, 160×160 tile.
- Link colors: `a` → `--fl-bronze-bright`, `a:hover` → `--fl-bronze-primary`.
- Scrollbars hidden (`.fl-scroll`).
- Vertical layout: **AppBar (fixed, 56px)** → **scroll region (flex:1, `ref=setScrollEl`)**. No TabBar (pushed detail).

### Fonts & scripts (`<helmet>`)
- Google **Playfair Display** (500/600/700 + italic 500).
- DS `foundation.css` + `styles.css`; `_ds_bundle.js` injected via React/ReactDOM-ready poller (25ms ≤600 tries, guarded by `window.__flBundleInjected`).
- `forge-theme.js`, `forge-exercise-catalog.js`.
- `image-slot` mounted via `<x-import component-from-global-scope="image-slot">` (registered by the DS/global scope).

### Motion
- `@keyframes edRise` (fade + rise, used on demo/title blocks with staggered `animation-delay`), `edDemo` (subtle 3px horizontal drift of the ghost icon, 3200ms loop).
- `prefers-reduced-motion` → all animations 0.001ms.

---

## 1. Props (tweakable — `data-props`)
- **`demoFit`** — enum `cover` | `contain`, default `cover`, section "Demonstration". Passed to the demo `image-slot` `fit`. Use `contain` for full-body movements that shouldn't crop.
- **`showMistakes`** — boolean, default true, section "Content". Gates the Common Mistakes section (AND'd with data presence).
- **`showAlternatives`** — boolean, default true, section "Content". Gates the Alternatives section + the "View alternatives" action (AND'd with data presence).
- **`startFavorited`** — boolean, default false, section "Content". Seeds the favorite (bookmark) state on mount.

---

## 2. State & readiness

- `state = { ready:false, favorite:false, paused:false, showAllAlts:false }`.
- On mount: if `props.startFavorited` → `favorite:true`. Then poll every **40ms** until THREE globals: `React.createElement`, `window.ForgeLegacyVisualFoundation_5368b2`, `window.ForgeExerciseCatalog` → `ready:true`.
- Until ready → loading splash (bronze forge-mark disc on `--fl-bg-primary`). `renderVals` also early-returns `{ready:false, notReady:true}`.
- `componentWillUnmount` clears the poll timeout.
- (Preview-runtime shim per project notes — production mounts normally.)

---

## 3. URL parsing & context resolution

Parsed from `location.hash` and `location.search`:
- **`?ex=<key or name>`** (search) — primary exercise selector.
- **hash** `#…` may carry: `replace` (flag), `o=<origin>` (`program`|`workout`, default `workout`), `ex=<key>` (exercise being replaced, passed through), `slot=<slot>`, `pid=<programId>`.

Derived:
- **`actionable`** = hash contains `replace` — unlocks the Replace pill (§4.2), the Actions block (§10), and "Replacing exercise" tag.
- **`edOrigin`** = the `o=` value; **`edEx`/`edSlot`/`edPid`** passed through to the picker.
- **`edBackDest`** = `program` origin → `Forge Program.dc.html#{pid}`; else `Forge Active Workout.dc.html`.
- **Exercise to show** (`exKey`) = `?ex=` query → else decoded `#ex=` → else `'bench'`. Resolved via `CAT.get(exKey)`, falling back to `CAT.get('bench')`.

`CAT.get(idOrName)` matches case-insensitively by **key OR normalized name** (so callers that only know a display name still resolve). Catalog also exposes `list`, `byKey`, `byCategory(cat)`, `categories`.

---

## 4. AppBar

DS `AppBar`, title "Exercise", `on-back = onBack`, `actions = favBtn`.

### 4.1 Back (`onBack`)
- Same-origin referrer → `window.history.back()`; else navigate to `edBackDest` (Program or Active Workout by origin).

### 4.2 Favorite button (`favBtn`, built in JS)
- 34×34 bookmark icon. Filled bronze + `aria-label="Saved"` when `favorite`, else outlined + "Save exercise". Tap toggles `state.favorite`. (Client-only; not persisted.)

---

## 5. Section 1 — Demonstration (top of scroll)

- 290px rounded media panel (radial charcoal gradient bg, inset + image shadow).
- **Ghost icon** (barbell glyph, bronze, opacity 0.11) behind the slot, animated with `edDemo`; `animation-play-state` bound to `demoPlayState` (running/paused).
- **`image-slot id="benchDemoLoop"`** (`fit = demoFit`, placeholder "Drop demonstration loop") — the user-supplied movement loop.
- Bottom scrim gradient for legibility.
- **"Movement demo" badge** (top-left): pulsing bronze dot + label.
- **Full-area tap button** (`onMediaToggle`) → toggles `state.paused` (pauses/plays the ghost animation and shows a play overlay).
- **Play overlay** (`mediaPaused`): centered 54px circular play glyph.
- Caption bottom-left: "Side view · Full ROM · Normal tempo" (static).

---

## 6. Section 2 — What it is (identity)

- **Tag** (bronze micro-label) = `ex.type + ' · ' + ex.cat` (e.g. "Compound · Chest").
- **Name** `h1` — Playfair 32px/600 = `ex.name`.
- **"Replacing exercise" pill** (`actionable` only) — bronze-tint pill with swap icon.
- **Equipment line** — barbell icon + `ex.equip` (uppercase).
- **Definition** paragraph = `ex.definition` (one-liner).
- **2×2 attribute grid** (card tiles): **Equipment** (`ex.equip`) · **Difficulty** (`ex.difficulty`) · **Pattern** (`ex.pattern`) · **Prime target** (`ex.primary[0]` or `ex.cat`).

---

## 7. Section 3 — Why it matters

DS `SectionHeader` "Why it matters" + a bronze-bordered card (subtle bronze gradient wash) containing `ex.why` (1–2 lines).

---

## 8. Section 4 — What it trains (muscles)

Card with two groups:
- **Prime movers** — bronze-tint pills w/ rotated-square marker, one per `ex.primary[]`.
- **Secondary muscles** (top-bordered) — outline pills w/ dot marker, one per `ex.secondary[]`.

---

## 9. Section 5 — How to do it + cues + mistakes

### 9.1 How to do it (`steps`)
Numbered list from `ex.steps[]`. Each row: rotated-diamond bronze numeral badge (`n` = 1-indexed) + step text. First row no divider; subsequent rows get a top border (`s.divider`).

### 9.2 Coaching cues (5b)
Always-rendered card (star icon + "Coaching cues" label). One diamond-bulleted line per `ex.cues[]`.

### 9.3 Common mistakes (5c, `showMistakes`)
Gated by `showMistakes` prop AND `ex.mistakes.length > 0`. SectionHeader "Common mistakes" + one recessed row per `ex.mistakes[]`, each with a red ✕ disc.

---

## 10. Section 6 — Alternatives (`showAlternatives`)

Gated by `showAlternatives` prop AND `baseAlts.length > 0`. Section wrapper has `ref=setAltsEl` (scroll target).

- Source: `ex.alternatives[]` (`{name, equip, note, ic}`), `ic ∈ db|bar|machine|body|cable` → mapped to an inline SVG icon (`altIcons`, default `bar`).
- **`ALT_CAP = 5`:** 0 → section hidden; 1–5 → all shown; 6+ → first five + a **"View all {N}"** expander (`onViewAllAlts` sets `showAllAlts`, revealing the rest).
- Each row (`button` → `a.onTap` → `exNav(a.name)` → navigate to `Forge Exercise Detail.dc.html?ex={resolvedKey}`):
  - 42px bronze icon disc, name, `{equip} · {note}` subtitle, chevron.
  - **First alternative** (`i === 0`) is marked **"Best substitute"** (recommended) with a bronze-tint pill and a faint bronze gradient row background.
  - Rows after the first get a top divider.

---

## 11. Actions block (`actionable` only)

SectionHeader "Actions" + a bronze-bordered card:
- **Replace exercise** (primary) → `onReplace` → navigate to `Forge Exercise Picker.dc.html#o={origin}[&pid=][&slot=][&ex=]` (carries the replace context forward so the picker knows what/where it's replacing).
- **View alternatives** (secondary, only if `showAlternatives`) → `onViewAlternatives` — smooth-scrolls the scroll container to the Alternatives section (`setAltsEl`), offset −12px, using the captured `setScrollEl`/`setAltsEl` refs.

---

## 12. Exercise record shape (`forge-exercise-catalog.js`)

```
{
  key, name, cat,            // 'bench', 'Bench Press', 'Chest'
  equip,                     // 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight'
  type,                      // 'Compound' | 'Isolation'
  pattern,                   // e.g. 'Horizontal push'
  difficulty,                // 'Beginner' | 'Intermediate' | 'Advanced'
  primary[], secondary[],    // muscle name strings
  definition,                // one line
  why,                       // 1–2 lines
  steps[], cues[], mistakes[],
  alternatives[]{ name, equip, note, ic }   // ic ∈ db|bar|machine|body|cable
}
```

Module API: `ForgeExerciseCatalog.{ list, byKey, get(idOrName), byCategory(cat), categories }`. `get` resolves by key or lowercased name; `categories = ['Chest','Back','Shoulders','Legs','Arms','Core','Conditioning']`. Exposed both as `window.ForgeExerciseCatalog` and CommonJS `module.exports`.

---

## 13. Complete behavior index
- Poll-gate 3 globals → ready; else splash.
- Resolve exercise: `?ex=` → `#ex=` → `'bench'`; `CAT.get` by key or name; fallback bench.
- AppBar: back (history.back same-origin, else Program/Active-Workout by origin), favorite toggle (client-only).
- Demonstration: image-slot loop, tap to pause/play (pauses ghost animation, shows play overlay), static caption + "Movement demo" badge.
- Identity: tag (type · cat), serif name, optional "Replacing exercise" pill, equipment, definition, 2×2 attribute grid.
- Why it matters card; What it trains (prime + secondary muscle pills).
- How to do it (numbered steps); Coaching cues (always); Common mistakes (prop + data gated).
- Alternatives (prop + data gated): first = "Best substitute", cap 5 with "View all N" expander, tap → navigate to that exercise's detail.
- Actions (actionable/replace context only): Replace exercise → Picker with carried context; View alternatives → smooth-scroll to section.

---

## 14. Reference values & constants
- Frame 404×868, radius 32. AppBar 56px. Demo panel 290px. Fav btn 34px. Alt icon disc 42px. Step badge 30px. Action icon disc 40px.
- `ALT_CAP = 5`. Ghost demo drift 3px / 3200ms. edRise delays: title block +40ms.
- Ready poller 40ms; bundle poller 25ms ×600.
- Alt icon keys: db, bar (default), machine, body, cable.
- Navigation targets: Exercise Picker (`#o=&pid=&slot=&ex=`), Program (`Forge Program.dc.html#{pid}`), Active Workout, and self (`?ex={key}` for alternatives).

---

## 15. Dependencies (must build together)
- `forge-exercise-catalog.js` — the shared record source + `get`/`byCategory`. **W-21 Library, W-22 Detail, W-23 Picker all read this** — build them against the one module.
- `image-slot.js` — demonstration loop placeholder (global-scope component).
- DS bundle + `forge-theme.js` — AppBar, SectionHeader, tokens.
- Linked screens: Exercise Picker (replace flow), Program Detail, Active Workout, Exercise Library.

---

## 16. Notes for Claude Code
- **Favorite is not persisted** in the current build — toggling only updates local state. If a saved-exercises feature is intended, wire `favBtn` to storage/backend.
- **Demo caption is static** ("Side view · Full ROM · Normal tempo") — not data-driven per exercise; move to the record if per-exercise captions are wanted.
- **`primeTarget`** falls back to `ex.cat` when `primary` is empty — safe for records missing muscle data.
- The **replace context is entirely URL-driven** — Replace forwards `o/pid/slot/ex` to the Picker, and the Picker is expected to complete the swap and return to `edBackDest`. Keep that hash contract identical across Detail ↔ Picker ↔ Program/Active Workout.
