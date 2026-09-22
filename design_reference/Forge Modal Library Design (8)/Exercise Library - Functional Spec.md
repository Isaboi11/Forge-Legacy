# Forge Exercise Library (W-21) — Complete Functional Specification

Build-to spec for `Forge Exercise Library.dc.html`. Everything here exists in the current build. This is the **browse / search / filter entry point** to the whole exercise catalog. It has two top-level modes (a **Hub** of curated shortcuts and a **Flat list** for search/category/filtered results), a full **filter bottom sheet** (including a home-gym–aware environment filter), favoriting, and links out to Exercise Detail and the Create Custom Exercise flow.

It reads three shared modules: `forge-exercise-catalog.js` (all exercises — the same source W-22 Detail and W-23 Picker use), `forge-homegym.js` (the athlete's owned-equipment profile), and `forge-custom-exercises.js` (the athlete's authored exercises).

---

## 0. Frame & shell

- Fixed phone frame **404 × 868**, radius 32, 1px `--fl-charcoal-600` border, `--fl-shadow-ambient`, `overflow:hidden`, column flex, `data-screen-label="W-21 Exercise Library"`.
- Above the frame sits a **review switcher** (outside the device) — a "W-21 · states (review)" label + Hub/Category/Search chips (§11). This is a review affordance, not part of the shipped screen chrome.
- Background: `linear-gradient(rgba(6,7,8,0.30),…)` over `#050505 url('assets/forge-slate.png') center/cover`.
- Body base: `--fl-bg-atmospheric` (fixed), `--fl-text-primary`, `--fl-font-sans`, antialiased.
- **Grain overlay:** fractalNoise SVG, opacity 0.06, mix-blend overlay, z-20.
- Link colors: `a` → `--fl-bronze-primary`, hover → `--fl-bronze-bright`. Scrollbars hidden.
- Vertical layout: **header (fixed: app bar + search/filter + active chips)** → **scroll region (flex:1)** → filter sheet + toast overlays. No TabBar (pushed screen).

### Fonts & scripts (`<helmet>`)
- Google **Playfair Display** (500/600/700).
- DS `foundation.css` + `styles.css`; `_ds_bundle.js` injected via React/ReactDOM-ready poller (25ms ≤600, guarded by `__flBundleInjected`).
- `forge-theme.js`, `forge-exercise-catalog.js`, `forge-homegym.js`, `forge-custom-exercises.js`.

### Motion
- `flFade` (opacity), `flRise` (rise+fade). Reduced-motion collapses animation + transition durations.

---

## 1. Props (tweakable — `data-props`)
- `$preview` 436×940.
- **`screenState`** — enum `hub` | `category` | `search`, default `hub`, section "Review". Seeds the initial view on mount: `category` → opens category "Legs"; `search` → seeds query "press"; `hub` → default. A **review/dev seed only** — production opens on the hub.

---

## 2. State & readiness

`state = { ready:false, query:'', view:null, favs:null, toast:null, filters:{env:[],diff:[],equip:[],type:[]}, filterSheet:false, homeGym:null }`.

- On mount, poll every **40ms** until FIVE globals: `React.createElement`, `window.ForgeLegacyVisualFoundation_5368b2`, `ForgeExerciseCatalog`, `ForgeHomeGym`, `ForgeCustomExercises` → then set `ready:true` **and** seed:
  - `view`/`query` from `screenState` prop.
  - **`?home=1`** in the URL (returning from the Home Gym editor) → auto-applies `filters.env = ['Home']`.
  - **`favs` seeded to `['squat','bench','pullup']`** (demo favorites).
- Until ready → loading splash (bronze forge-mark disc).
- `componentWillUnmount` clears poll + toast timeouts.
- `_toast(msg)` shows a toast for **2200ms**. (Toast overlay exists but is not currently triggered by any handler in this build — reserved.)
- (Preview-runtime shim per project notes.)

---

## 3. Data assembly (per render)

- **`DB`** = `ForgeExerciseCatalog.list` mapped to `{key, name, cat, equip, type, muscles: primary+secondary}`. If the catalog is missing, a 24-item **`DB_FALLBACK`** hardcoded list is used (one representative set across Chest/Back/Shoulders/Legs/Arms/Core). Single source of truth = the shared catalog.
- **`byKey`** index built from DB.
- **Enrichment:** each exercise gets `difficulty` (from `ForgeExerciseCatalog.get(key).difficulty`, default "Intermediate") and `env` (training environments derived from equipment via `ENV_BY_EQUIP`):
  - Barbell/Dumbbell/Kettlebell → [Gym, Home]; Cable/Machine → [Gym]; Band/Bodyweight → [Gym, Home, Outside].
- **`CUSTOM`** = `ForgeCustomExercises.all()` mapped to `{key:id, name, equip, type, meta:'Custom · {cat|type|Exercise}'}`.
- **`RECENT`** = fixed key list `['deadlift','ohp','pulldown','rdl']` (demo recents).
- **`CATS`** = `ForgeExerciseCatalog.categories` (`['Chest','Back','Shoulders','Legs','Arms','Core','Conditioning']`), fallback to the first six.

### 3.1 Favorites
- `favs` is an array of keys in state. `isFav(k)`, `toggleFav(k)` (stops event propagation so the row's open handler doesn't also fire; adds/removes the key). Client-only, not persisted.

### 3.2 Row model (`toRow`)
`{key, name, meta, fav, notFav, starColor, toggleFav, open}` where `meta` = `e.meta` or `"{equip} · {type}"`, `starColor` = bronze-bright if fav else charcoal, `open` → `openEx(key)` → navigate `Forge Exercise Detail.dc.html?ex={key}`.

---

## 4. Header

### 4.1 App bar (56px)
- **Left button** (`onLeft`) — context-sensitive back:
  1. In a drill `view` → clear the view (return to hub).
  2. Else if searching or filters active → clear query + filters.
  3. Else same-origin referrer → `history.back()`.
  4. Else → navigate `Forge Programs Catalog.dc.html`.
- **Title** = "Exercise Library" on the hub / when searching; in a category or favorites/recent sub-view (`inSub` = flatMode AND not searching), the title becomes the sub-view name (e.g. "Legs").

### 4.2 Search + filter row
- **Search input** (`.xl-search`, magnifier icon) — `value = query`, `onInput = onSearch` → sets `query` and clears `view`. Placeholder "Search exercises".
- **Filter button** (44×44) → `openFilter` (opens sheet). Styling turns bronze when filters active (`filterBtnBg/Border/Ink`). Shows a **count badge** (`filterCount`) when `hasFilters`.

### 4.3 Active filter chips (only when `hasFilters`)
- One removable bronze chip per active filter value (`filterChips`), each tap → removes that value. Env chips use `ENV_LABELS` ("Home Gym" for Home).
- **Clear** button → `clearFilters` (resets all four filter groups).

---

## 5. Search & filter logic

- **`q`** = trimmed lowercased query; **`searching`** = q length > 0.
- **`qMatch(e)`** matches query against name, category, joined muscles, OR equipment (substring).
- **Filters `F`** = `{env[], diff[], equip[], type[]}`; `filterCount` = total selected; `hasFilters` = count > 0.
- **`passFilters(e)`** — an exercise passes if it satisfies every non-empty group:
  - **env** via `envPass`: **Gym** → always true (a full gym has everything); **Outside** → equip === Bodyweight only; **Home** → `ForgeHomeGym.exerciseEquipOwned(e.equip, homeGym)` (bodyweight + owned equipment).
  - **diff** → difficulty ∈ selected.
  - **equip** → equipment ∈ selected.
  - **type** → Compound/Isolation ∈ selected.
- **`liveCount`** = `DB.filter(passFilters).length` — drives the sheet's apply label.

---

## 6. Flat mode (search / category / favorites / recent / filtered)

`flatMode` triggers when there's a `view`, OR searching, OR filters active. `baseList` is chosen by:
- `view.type === 'category'` → `DB` where `cat === view.id`; title = category.
- `view.type === 'favorites'` → favorited exercises; title "Favorites".
- `view.type === 'recent'` → RECENT keys; title "Recently Used".
- else (searching or hasFilters) → all DB; title "Results" (searching) or "Filtered".

Then `baseList` is narrowed by `qMatch` (if searching) and `passFilters` (if filters), mapped to rows.

Rendered:
- Header: `flatTitle` + `flatCount` (`"{n} exercise(s)"`).
- **Empty state** (`flatEmpty`): "Nothing found" / "Try a different name or muscle."
- Rows: barbell icon disc, name, meta, and a **favorite star toggle** (filled bronze / outline).

---

## 7. Hub mode (`hubMode` = not flatMode)

### 7.1 Top sections (`topSections`)
- **Favorites** (only if any favorited) — star icon, up to 3 preview rows, "View all" → sets `view: {type:'favorites'}`.
- **Recently Used** — clock icon, up to 3 rows from RECENT, "View all" → `view: {type:'recent'}`.

### 7.2 Browse by category
- 2-column grid of category cards (`categories`): display-serif name + count ("{n} exercises"), decorative barbell glyph. Tap → `view: {type:'category', id}`.

### 7.3 Custom Exercises
- One row per `customRows` entry (name, "Custom · {cat}" meta, favorite star). Tap → `openCustom(id)` → navigate `Forge Create Custom Exercise.dc.html?id={id}`.
- **Create Custom Exercise** dashed button → `onCreate` → navigate `Forge Create Custom Exercise.dc.html` (no id).

---

## 8. Filter bottom sheet (`filterOpen`)

- Scrim (blurred, tap → `closeFilter`) + slide-up sheet (max-height 82%, `flRise`), grabber, "Filter" title, **Reset** (→ `clearFilters`, ink bronze when active).
- **Filter groups** (`filterGroups`), each a labeled wrap of toggle pills (`optFor` → on-state bronze tint):
  1. **Where you train** — Gym · Home Gym · Outside.
  2. **Difficulty** — Beginner · Intermediate · Advanced.
  3. **Equipment** — Barbell · Dumbbell · Kettlebell · Cable · Machine · Band · Bodyweight.
  4. **Movement type** — Compound · Isolation.
- **Home Gym special-case** (`envOption('Home')`): tapping Home when it's off AND `ForgeHomeGym.isEmpty()` → navigate to the editor first (`Forge Home Gym.dc.html?return=Forge Exercise Library.dc.html?home=1`); otherwise toggles the filter normally.
- **Home-gym summary card** (`homeSelected` — shown when Home is active): a house icon + summary line —
  - empty profile → "No equipment saved yet — showing bodyweight only. Add your gear to unlock more."
  - else → "Owned: {list}. Bodyweight is always included."
  - **Edit my home gym** button → `editHomeGym` → the editor with the same return URL.
- **Apply button** (footer) → `closeFilter`, labeled **"Show {liveCount} exercise(s)"** (live preview count).

---

## 9. Toast (`toastOpen`)
Centered pill, bronze icon + message, `flRise` in, auto-dismiss 2200ms. Present in markup; no current handler fires it (reserved for future confirmations).

---

## 10. Shared module contracts

- **`ForgeExerciseCatalog`** — `.list`, `.get(idOrName)`, `.categories`, `.byCategory(cat)` (see Exercise Detail spec for the record shape).
- **`ForgeHomeGym`** — `read()` → owned label strings; `write(list)`; `isEmpty()`; `exerciseEquipOwned(equip, owned?)` (bodyweight always true, else category covered by owned profile); `canDoExercise(ex, owned?)`; `programFit(program)`; `byGroup`, `LABELS`; `onChange/offChange`.
- **`ForgeCustomExercises`** — `all()` → authored records `{id, name, equip, type, cat?}`; `get(id)`; `save(rec)`; localStorage-backed (`KEY`).

---

## 11. Review switcher (above the frame)
`viewChips` = Hub / Category / Search. `activeChip` derived from state (searching → search, view → category, else hub). Tapping: Hub → clear view+query; Category → open "Legs"; Search → seed query "press". Review-only affordance.

---

## 12. Complete behavior index
- Poll-gate 5 globals → ready; seed view/query from `screenState`, auto-Home from `?home=1`, favs demo-seeded.
- DB from shared catalog (fallback to 24-item list), enriched with env + difficulty; custom from custom-exercise store; recents fixed.
- Header: context-sensitive back, live search (clears view), filter button w/ count badge, removable active-filter chips + Clear.
- Flat mode (search/category/favorites/recent/filtered): title + count, empty state, favoritable rows → Exercise Detail.
- Hub mode: Favorites + Recently Used previews (View all → sub-view), category grid → category drill, custom rows → Create Custom Exercise (edit), Create button → new.
- Filter sheet: 4 groups, Home-gym-aware env filter (opens editor if empty), home-gym summary, live "Show N" apply.
- Favoriting toggles client-side (stops propagation).

---

## 13. Reference values & constants
- Frame 404×868, radius 32; preview 436×940. App bar 56px. Row icon disc 40px, star 34px. Category grid 2-col.
- Ready poller 40ms; bundle poller 25ms ×600. Toast 2200ms.
- Demo seeds: favs `['squat','bench','pullup']`, recents `['deadlift','ohp','pulldown','rdl']`.
- `ENV_BY_EQUIP`: Barbell/Dumbbell/Kettlebell→[Gym,Home]; Cable/Machine→[Gym]; Band/Bodyweight→[Gym,Home,Outside].
- Filter env semantics: Gym=all, Outside=Bodyweight only, Home=owned+bodyweight.
- Nav targets: Exercise Detail (`?ex={key}`), Create Custom Exercise (`?id=` or new), Home Gym editor (`?return=…?home=1`), Programs Catalog (back fallback).

---

## 14. Notes for Claude Code
- **Favorites and recents are demo-seeded and not persisted** — favs live in component state, recents are a hardcoded key list. Wire both to real storage (favorites store + a recents derived from `workout_exercises`) for production. Same note applies across Library/Detail — align the favorites source.
- **The 24-item `DB_FALLBACK` is a safety net only** — production always has the full catalog; keep the fallback but it should never be the live path.
- **`screenState` prop and the review switcher are dev/review affordances** — omit from the shipped screen; the hub is the real entry.
- **Toast is wired in markup but never fired** — reserved; hook it to favorite/add confirmations if desired.
- **Home-gym filter is the one cross-screen contract** — tapping Home with an empty profile must round-trip through `Forge Home Gym.dc.html?return=…?home=1`, and the `?home=1` return must auto-apply the Home env filter. Programs Catalog uses the identical pattern — keep them consistent.
