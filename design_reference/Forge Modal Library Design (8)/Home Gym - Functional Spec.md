# Forge Home Gym Editor — Complete Functional Specification

Build-to spec for `Forge Home Gym.dc.html`. Everything here exists in the current build. This is the **equipment-profile editor**: the athlete marks which equipment they own, saves it, and every "Home Gym" filter across the app (Exercise Library W-21, Programs Catalog, Onboarding, Account Settings) then reads that one profile to show only what they can actually train. It is a modal-style editor reached from those filters (with a `?return=` round-trip) or from settings.

The single source of truth is `forge-homegym.js` (`window.ForgeHomeGym`) — a localStorage-backed profile with a canonical equipment inventory, change listeners, and the exercise/program eligibility resolvers other screens call.

---

## 0. Frame & shell

- Fixed phone frame **404 × 868**, radius 32, 1px `--fl-charcoal-600` border, `--fl-shadow-ambient`, `overflow:hidden`, column flex, `data-screen-label="Home Gym Editor"`.
- Background: `linear-gradient(rgba(6,7,8,0.3),…)` over `#050505 url('assets/forge-slate.png') center/cover`.
- Body base: `--fl-bg-atmospheric` (fixed), `--fl-text-primary`, `--fl-font-sans`, antialiased.
- **Grain overlay:** fractalNoise SVG, opacity 0.06, mix-blend overlay, z-20.
- Link colors: `a` → `--fl-bronze-primary`, hover → bright. Scrollbars hidden.
- Vertical layout: **app bar (fixed, 56px)** → **scroll region (flex:1)** → **commit bar (fixed footer)** → toast overlay. No TabBar.

### Fonts & scripts (`<helmet>`)
- Google **Playfair Display** (500/600/700).
- DS `foundation.css` + `styles.css`; `_ds_bundle.js` injected via React/ReactDOM-ready poller (25ms ≤600, guarded by `__flBundleInjected`).
- `forge-theme.js`, `forge-homegym.js`.

### Motion
- `flFade` (intro block), `flRise` (toast). Reduced-motion collapses animation + transition durations.

### Props
- Only `$preview` 436×940. No tweakable props.

---

## 1. State & readiness

`state = { ready:false, owned:null, toast:null, returnTo:null }`.

- On mount, poll every **40ms** until THREE globals: `React.createElement`, `window.ForgeLegacyVisualFoundation_5368b2`, `window.ForgeHomeGym` → then:
  - `owned` seeded from `ForgeHomeGym.read()` (current saved profile).
  - `returnTo` = the `?return=` URL param (where to go after save/close).
  - `ready:true`.
- Until ready → loading splash (bronze forge-mark disc).
- `componentWillUnmount` clears poll, toast, and nav timeouts.
- `_toast(msg)` shows a toast for **2000ms**.
- (Preview-runtime shim per project notes.)

**`owned` is edited in local state** during the session; nothing is persisted until Save (`ForgeHomeGym.write`). Closing without saving discards edits.

---

## 2. App bar (56px)

- **Back** (44×44 chevron-left) → `onClose` → `_exit()`.
- **Title** "My Home Gym" (centered).
- **Clear** button (right) → `onClear`: only acts when `n > 0` (clears `owned` to `[]` in state; does not save). Ink is bronze when items exist, tertiary when empty.

### 2.1 `_exit()` navigation
1. If `returnTo` set → navigate to that URL.
2. Else same-origin referrer → `window.history.back()`.
3. Else → navigate `Forge Account Settings.dc.html`.

---

## 3. Scroll region

### 3.1 Intro block
- Bronze micro-label "Your equipment" (house icon).
- `h1` (Playfair 27px) "What's in your gym?".
- Paragraph explaining the Home Gym filter shows only trainable exercises/programs, and **"Bodyweight is always included."**

### 3.2 Equipment groups (`equipGroups`)
Built from `ForgeHomeGym.byGroup()` — six groups in fixed order, each a labeled 2-column grid of selectable equipment cards:

1. **Barbell & rack** — Barbell · Weight plates · Squat rack · Bench · EZ-curl bar · Trap bar · Smith machine
2. **Free weights** — Dumbbells · Kettlebells · Medicine ball · Sandbag · Weight vest
3. **Machines & cable** — Cable machine · Lat pulldown · Leg press · Leg curl / extension
4. **Cardio** — Treadmill · Rowing machine · Exercise bike · Air bike · Elliptical · Jump rope
5. **Bodyweight & rigs** — Pull-up bar · Dip bars · Gymnastic rings · Suspension trainer · Plyo box
6. **Bands & accessories** — Bands · Mini bands · Ab wheel · Foam roller · Exercise mat

**Each card (`cardFor`):**
- 34px icon disc (per-item SVG from `ICONS`, else a group-level fallback `GROUP_ICON`, else a generic bar).
- Label + `hint` subtitle (e.g. "Bar + plates").
- `role=button`, `tabindex=0`, `aria-pressed = sel`.
- **Selected** (`owned` contains the label): bronze metal border, bronze tint bg, bronze-bright label, tinted icon, and a **bronze checkmark badge** (top-right).
- **Toggle** (`e.toggle`): adds/removes the label from `owned` in state (no save).
- Hover lifts the card 1px.

### 3.3 Bodyweight always-on note
A dashed recessed card (running-figure icon): "Bodyweight training is always available — no equipment needed." Static — bodyweight is never a selectable item; it's implied by the module.

---

## 4. Commit bar (fixed footer)

- **Owned summary** (`ownedSummary`): `n === 0` → "Nothing added yet — bodyweight only"; else "{n} item(s) in your gym".
- **Save button** ("Save My Home Gym", star icon) → `onSave`:
  1. `ForgeHomeGym.write(owned)` — persists (filters to valid labels, notifies listeners).
  2. `_toast('Home gym saved')`.
  3. After **900ms**, `_exit()` (returns to `returnTo` / referrer / Account Settings).

Footer has a gradient scrim and honors `env(safe-area-inset-bottom)`.

---

## 5. Toast (`toastOpen`)
Centered pill (bottom 104px, above the commit bar), bronze star icon + message, `flRise` in, auto-dismiss 2000ms. Fired by Save.

---

## 6. `forge-homegym.js` — full module contract

Persisted under localStorage key **`forge.homegym.equip`** as a JSON array of canonical equipment labels. Bodyweight is always implied (never stored).

### 6.1 Data
- **`EQUIPMENT`** — canonical inventory: `[{id, label, hint, group}]` (31 items across the 6 groups above).
- **`GROUPS`** — the 6 group names in order.
- **`LABELS`** — all valid labels (used to sanitize reads/writes).
- **`byGroup()`** → `[{group, items[]}]` grouped for the editor (what this screen renders).

### 6.2 Read/write
- **`read()`** → owned label array, filtered to valid `LABELS` (drops stale/unknown entries).
- **`write(list)`** → sanitizes to valid labels, persists, **notifies all change listeners**, returns the clean list.
- **`isEmpty()`** → true when nothing owned.

### 6.3 Eligibility resolvers (what other screens call)
- **`exerciseEquipOwned(equip, owned?)`** — is a catalog exercise's equip category covered? Bodyweight → always true; else checks the owned labels against **`EX_UNLOCK`** (owned home-gym label → catalog equip categories it unlocks; e.g. Smith machine → [Barbell, Machine], Cable machine → [Cable, Machine]). Catalog equip categories: Barbell | Dumbbell | Kettlebell | Cable | Machine | Band | Bodyweight.
- **`canDoExercise(ex, owned?)`** — convenience wrapper over `exerciseEquipOwned(ex.equip)`.
- **`programFit(program, owned?)`** → `{fits, owned, missing[]}` — **lenient** program eligibility. Maps each program equipment tag through **`PROG_REQ`** (some tags are `'always'` = no gear needed: Mat, Bodyweight, Running shoes, Track). A program **fits** if: no real requirements, OR nothing missing, OR at most one piece missing AND the athlete owns at least one required piece. A program the athlete owns none of never fits.

### 6.4 Change notification
- **`onChange(fn)` / `offChange(fn)`** — subscribe/unsubscribe to profile changes (fired by `write`). This is how live screens (Library, Programs Catalog) re-filter when the profile is edited.

Exposed as `window.ForgeHomeGym` and CommonJS `module.exports`.

---

## 7. Complete behavior index
- Poll-gate 3 globals → ready; seed `owned` from saved profile, `returnTo` from `?return=`.
- App bar: back → `_exit`; Clear (only when items exist) empties selection in state.
- Six grouped equipment sections (from `byGroup()`), 2-col selectable cards with icon, hint, checkmark on select; toggle edits local state only.
- Bodyweight always-on note (static).
- Commit bar: live owned summary + Save → `write` + toast + 900ms → `_exit`.
- `_exit` precedence: `returnTo` → same-origin history.back → Account Settings.
- Module resolves exercise eligibility (`exerciseEquipOwned`/`canDoExercise`) and lenient program fit (`programFit`), and notifies subscribers on write.

---

## 8. Reference values & constants
- Frame 404×868, radius 32; preview 436×940. App bar 56px. Card icon disc 34px, check badge 22px.
- Ready poller 40ms; bundle poller 25ms ×600. Toast 2000ms; post-save nav delay 900ms.
- localStorage key `forge.homegym.equip`. 31 equipment items, 6 groups.
- Nav targets: `returnTo` URL, Account Settings (default fallback).

---

## 9. Notes for Claude Code
- **This editor is the ONLY writer of the home-gym profile** — every other screen reads via `ForgeHomeGym.read()`/resolvers and edits by navigating here with `?return=`. Keep that contract: filters that hit an empty profile open this screen first, then apply on return (`?home=1` on the Library/Catalog return URL).
- **Edits are session-local until Save** — `owned` lives in component state; Clear and toggles don't persist, only `onSave` calls `write`. Closing discards.
- **Bodyweight is implied, never stored** — don't add it as a selectable item; `exerciseEquipOwned` special-cases it to always-true.
- **`EX_UNLOCK` and `PROG_REQ` are the mapping tables** between home-gym labels and (a) catalog equip categories and (b) program equipment tags — these encode deliberate stand-ins (functional trainer covers cable + light machine; Smith covers barbell + machine). Preserve them exactly; they drive filtering correctness everywhere.
- **`programFit` is intentionally lenient** (allows a one-piece "minor swap") — don't tighten it to strict all-or-nothing without a product decision.
- **Subscribe via `onChange`** for any live screen that must re-filter when the profile changes mid-session.
