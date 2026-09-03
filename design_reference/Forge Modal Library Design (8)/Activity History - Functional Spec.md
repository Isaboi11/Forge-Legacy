# Forge Activity History (W-18) — Complete Functional Specification

Build-to spec for `Forge Activity History.dc.html`. Everything here exists in the current build. The screen is a **read-only, reverse-chronological training log**: a filterable, month-grouped list of every logged session. Tapping a row opens Activity Detail (W-19). Its data comes from a shared module (`forge-activity-log.js`) that also feeds the detail screen, so a tapped row always opens the matching session.

---

## 0. Frame & shell

- Fixed phone frame **404 × 868**, radius 32, charcoal border, ambient shadow, `overflow:hidden`, column flex.
- Background: `#07080a` + stone texture (`forge-stone-texture.png`, cover/center) under a 50% black gradient scrim.
- A **grain overlay** (SVG fractal-noise, opacity 0.03, `mix-blend:overlay`, `pointer-events:none`) sits above everything at z-20.
- Vertical layout: **header (fixed)** → **scroll list (flex:1)** → **TabBar (fixed)**.

### Props (tweakable)
- **`units`** — enum `mi` | `km`, default `mi`. Controls run/walk/bike distance display (swim is always meters).
- **`iconTint`** — enum `bronze` | `category`, default `bronze`. `bronze` = every row/chip icon uses `--fl-icon-bronze`; `category` = each activity type uses its own accent color.

---

## 1. Readiness gate

- On mount, poll every 40 ms until **four** globals exist: `React.createElement`, `window.ForgeSymbols`, `window.ForgeLegacyVisualFoundation_5368b2`, `window.ForgeActivityLog`. Then `ready:true`.
- Until ready, render the **loading splash** (centered bronze forge-mark on solid `--fl-bg-primary`).
- `componentWillUnmount` clears the timeout.
- (Preview-runtime shim per project notes — production mounts normally.)

---

## 2. State

- **`filter`** — `'all'` or one of the 9 type keys. Default `'all'`.
- Persists only within the component instance (one navigation session). A fresh entry resets to `'all'` — this is intentional, not persisted to storage.

---

## 3. Data source (`window.ForgeActivityLog`)

The screen calls `ForgeActivityLog.records()` → newest-first array. `records()` = **logged sessions (localStorage) concatenated in front of the static seed RECORDS**, each shallow-cloned.

### 3.1 Record shape
```
{
  key: string,          // unique id, e.g. 'j10' (seed) or 'L{ts}-{seq}{rand}' (logged)
  type: string,         // one of the 9 type keys
  title: string,        // e.g. 'Leg Day A', 'Tempo Run'
  month: string,        // group key, e.g. 'June 2026'
  date: string,         // 'Tue, Jun 10' (weekday, mon day)
  min: number,          // duration in minutes
  // type-specific:
  sets, ex,             // strength: set count, exercise count
  mi,                   // run/walk/bike: miles (stored in miles)
  swim,                 // swim: display string e.g. '1,500 m'
  rounds,               // hiit: round count
  // optional attributes:
  chapter,              // e.g. 'Chapter III · The Rebuild'
  pr: boolean,          // personal record
  milestone,            // PR/milestone text (detail only)
  partial: boolean,     // cut-short session
  partners: string[],   // co-athletes full names
  playlist              // (detail only)
}
```
- **Static seed:** 23 records spanning June / May / April 2026, already reverse-chronological.
- **Logged sessions:** written by `ForgeActivityLog.logSession(entry)` — prepends a record with generated key, today's date/month/time, default `chapter: 'Chapter III · The Rebuild'`; caps the stored list at 50; localStorage key `forge_logged_sessions_v1`.

### 3.2 Activity type registry (fixed order)
`All` + 9 types, order: **strength, run, walk, bike, swim, hiit, mobility, yoga, other**. Each type has `{ label, symbol (ForgeSymbols id), color (oklch accent) }`:
- strength → dumbbell / bronze
- run → shoe / warm orange `oklch(0.74 0.10 55)`
- walk → footprints / green `oklch(0.74 0.05 145)`
- bike → bicycle / blue `oklch(0.72 0.06 235)`
- swim → swim / cyan `oklch(0.74 0.07 205)`
- hiit → glove / red `oklch(0.66 0.13 35)`
- mobility → lotus / violet `oklch(0.72 0.06 300)`
- yoga → lotus / rose `oklch(0.74 0.07 20)`
- other → mountain / neutral `oklch(0.72 0.02 80)`

---

## 4. Header (fixed, z-6)

Solid `#070808`, bottom charcoal border. Two rows:

### 4.1 Title row (height 56)
- **Back button** (44×44 chevron-left) → `back()`.
  - `back()` logic: if `document.referrer` exists AND its origin === current origin → `window.history.back()`; else navigate to `Forge Programs Catalog.dc.html`.
- Centered label **"ACTIVITY HISTORY"** — 11px, 700, letter-spacing 2.4px, uppercase.
- A 44px spacer on the right to balance the back button.

### 4.2 Type filter chip strip
- Horizontal scroll (`overflow-x:auto`, scrollbar hidden). Padding `0 16px 13px`.
- Chips: **All** (no icon) + one per type in ORDER (icon at 13px + label). **All 10 chips always render** regardless of whether any rows match.
- Single-select. Tapping sets `filter`. Chips are `role="button"`, `tabindex=0`, `aria-pressed` reflects selection.
- **On chip style** (`chipOn`): bronze tint bg, bronze-bright text, bronze-primary border, 700 weight, subtle glow.
- **Off chip style** (`chipOff`): transparent bg, tertiary text, charcoal border.

---

## 5. Session list (scroll region, flex:1)

Hidden scrollbar. Renders `monthGroups` derived from the filtered records.

### 5.1 Filtering & grouping
- `filtered` = records where `filter === 'all' || r.type === filter`.
- Group by `r.month`, preserving newest-first order (RAW already ordered). `monthGroups = [{ key, month, rows[] }]`.

### 5.2 Month header (sticky, z-3)
- `position:sticky; top:0`, `#060708` bg, padding `40px 24px 14px`, downward shadow.
- Label = month string, 15px, 700, letter-spacing 2px, uppercase, opacity 0.82.

### 5.3 Session row
`role="button"`, `tabindex=0`, `min-height:80px`, bottom charcoal divider, hover wash (`style-hover: --fl-hover-wash`). Tap → `open(key)` → navigate to `Forge Activity Detail.dc.html?id={key}`.

Three zones (left icon · center content · right meta):

**Left — icon (30px column):** the type's symbol at 22px. Color = category accent if `iconTint === 'category'`, else `--fl-icon-bronze`.

**Center — title + stat + attributes:**
- **Title row:** display-serif title (15.5px, 600, ellipsis) + optional **PR badge** (bronze-tint pill, trophy icon + "PR") when `r.pr`.
- **Stat line** (`hasStat`, tertiary 12px) via `statOf(r)`:
  - strength → `{program · }{sets} sets` where program is derived from chapter (`programOf`: chapter containing "III" → "Powerbuilding II", else "Powerbuilding I"; no chapter → "").
  - run/walk/bike → `dist(mi)` (miles→km if units=km; 1 decimal; `× 1.609`).
  - swim → the `swim` string.
  - hiit → `{rounds} rounds`.
  - mobility/yoga/other → "" (duration covers it).
- **Attributes row** (`hasAttr` when chapter, partial, or partners present):
  - **Chapter** text (tertiary 11px, ellipsis) when present.
  - **Partial** pill (charcoal-bordered, "PARTIAL") when `r.partial`.
  - **Partners** pill (bronze-tint, people icon + label) when partners exist. Label = `with {FirstNameOfFirst}{ +N-1 if more}` (e.g. "with Marcus +1").

**Right — duration + date:**
- **Duration** (13.5px, 600, tabular-nums) via `fmtDur(min)`: `< 1 min` · `{m} min` (<60) · `{h} hr` (exact) · `{h} hr {r} min`.
- **Date** (tertiary 11px) = `r.date` with the leading weekday stripped (`"Tue, Jun 10"` → `"Jun 10"`).

**Accessibility:** each row has an `aria-label` (`a11y`) concatenating title, type label, full date, duration, stat, and any of "personal record" / chapter / "partial session", ending "Double-tap for detail."

### 5.4 Empty state (`noResults` = filtered length 0)
Centered block (padding 70/34): calendar icon in a bordered square + message:
- filter `all` → "Your workout history will appear here as you train."
- else → "No {TypeLabel} sessions yet."

### 5.5 Bottom spacer
A 22px spacer div closes the scroll region.

---

## 6. Tab bar (fixed)

DS `TabBar`, `active-id = 'workouts'`. Four items with ForgeSymbols icons: **Home** (home), **Workouts** (workouts), **Legacy** (forge-mark, 20px), **Squads** (squads). `on-change = setTab(id)`:
- home → `Forge Home.dc.html`
- workouts → `Forge Programs Catalog.dc.html`
- legacy → `Forge Legacy.dc.html`
- squads → `Squads Hub.dc.html`

---

## 7. Helper functions (in `renderVals`)
- `ico(id, size, sw)` — `ForgeSymbols.create` wrapper (default 22px / 1.7 stroke).
- `dist(mi)` — miles→display in active unit.
- `fmtDur(m)` — duration formatting (see §5.3).
- `programOf(r)` — chapter → program name.
- `statOf(r)` — the center stat line by type.
- `open(key)` — returns a navigation handler to Activity Detail.
- `mkChip(key, label, symbol)` — builds a chip view-model.

---

## 8. Shared detail module (context for the linked screen)

The list navigates to **Activity Detail** by `?id={key}`; that screen calls `ForgeActivityLog.detail(key)`. Documented here because the two share one source of truth and the History spec is incomplete without knowing what a tapped row yields:

`detail(key)` returns a hero + body view-model:
- **Hero:** `programTag` (strength → program name or "Free Session"; else type label), `summaryLine` (strength: `{dur} · {ex} exercises · {sets} sets`; run/walk/bike: `{dur} · {mi} mi`; swim: `{dur} · {swim}`; hiit: `{dur} · {rounds} rounds`; else `{dur}`), `whenLine` (full weekday + month + a time from a fixed rotation or the logged `_time`), `ordinalLine` (`Workout #N`/`Session #N` chronological ordinal + short chapter), optional `milestoneText`.
- **Ordinals:** computed once over the seed, oldest = 1; strength sessions counted separately ("Workout #") from the global session index ("Session #").
- **Strength body:** per-section breakdown from `WORKOUTS[title]` (Warm-up / Main Workout / Cool-down; each item has weighted or rep-only `sets[]`, optional `note`, or duration `meta`/`metaLabel`). Six seed workouts have representative breakdowns; logged sessions carry their own `_sections`.
- **Cardio/other body:** `stats[]` tiles — run/walk/bike: Distance / Avg Pace (`pacePerMile`) / Duration; swim: Distance / Avg Pace per 100m / Duration; hiit: Rounds / Work:Rest 40s:20s / Duration; mobility/yoga/other: Duration only.
- **Run splits:** per-mile split list, representative offsets centered on average pace.
- **Also:** partners (name + initials), partnersLabel, playlist, chapterName, programName.

Module API: `ForgeActivityLog.{ TYPES, ORDER, records(), detail(key), logSession(entry), clearLogged() }`.

---

## 9. Complete behavior index
- Poll-gate 4 globals → ready.
- Filter chips (All + 9), single-select, always all visible, session-scoped state.
- Records = logged (localStorage, ≤50, newest first) + static seed (23), cloned.
- Filter → group by month (newest first) → sticky month headers.
- Row: type icon (bronze or category tint), display-serif title, optional PR pill, type-specific stat line, chapter/partial/partners attributes, right-side duration + date (weekday stripped).
- Empty state copy varies by all vs specific filter.
- Row tap → Activity Detail `?id={key}`.
- Back → history.back() (same-origin referrer) else Programs Catalog.
- TabBar routes to Home / Programs Catalog / Legacy / Squads; Workouts active.
- Props `units` (mi/km) and `iconTint` (bronze/category) alter distance display and icon coloring.

---

## 10. Reference values
- Frame 404×868, radius 32.
- Row min-height 80. Icon column 30px, icon 22px. Chip icon 13px.
- Duration format: `< 1 min` / `{m} min` / `{h} hr` / `{h} hr {r} min`.
- km conversion factor 1.609, 1 decimal.
- Logged-session cap 50; localStorage keys `forge_logged_sessions_v1`.
- Seed data: 23 records, months June/May/April 2026.
