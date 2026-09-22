# Forge Settings Root (P-4) — Complete Functional Specification

Build-to spec for `Forge Settings Root.dc.html`. Everything here exists in the current build.

> ## ⚠ CRITICAL: this screen is DEPRECATED / redirects
> `componentDidMount` runs **`window.location.replace('Forge Account Settings.dc.html')` before anything else** and returns. Settings Root has been **merged into Account Settings** — in production this screen never renders; any lingering entry point (old link, deep link) is bounced to Account Settings. The layout below is documented for completeness and because its **legal content, version string, and category map are the source that Account Settings absorbed**. Do NOT rebuild this as a live standalone screen — build Account Settings as the settings home and carry over the pieces documented here.

---

## 0. Frame & shell

- Fixed phone frame **404 × 868**, radius 32, 1px `--fl-charcoal-600` border, `--fl-shadow-ambient`, `overflow:hidden`, column flex, `data-screen-label="P-4 Settings Root"`.
- Background: `linear-gradient(rgba(5,5,5,0.3),…)` over `#050505 url('assets/forge-slate2.png') center/cover`.
- Body base: `--fl-bg-atmospheric` (fixed), `--fl-text-primary`, `--fl-font-sans`, antialiased.
- Link colors: `a` → `--fl-bronze-primary`, hover → bright. Scrollbars hidden.
- No grain overlay on this screen. No TabBar.
- Vertical layout: **AppBar (fixed, 56px)** → **scroll region (flex:1)** → legal sheet overlay.

### Fonts & scripts (`<helmet>`)
- Google **Playfair Display** (500/600/700).
- DS `foundation.css` + `styles.css`; `_ds_bundle.js` injected via React/ReactDOM-ready poller (25ms ≤600, guarded by `__flBundleInjected`).
- `forge-theme.js`, `forge-symbols.js`.

### Motion
- `seRise` (rise+fade) on the scroll body and legal sheet. Reduced-motion collapses durations.

### Props
- Only `$preview` 404×868. No tweakable props.

---

## 1. State & lifecycle

`state = { ready:false, sheet:null }`.

- **`componentDidMount`:** FIRST attempts `window.location.replace('Forge Account Settings.dc.html')` and returns (the redirect). Only if that throws does it fall through to the readiness poller (40ms) waiting on `React.createElement`, `ForgeLegacyVisualFoundation_5368b2`, `ForgeSymbols` → `ready:true`.
- Until ready → loading splash (bronze forge-mark disc).
- `componentWillUnmount` clears the poll timeout.

---

## 2. AppBar (56px)
- **Back** (44×44 chevron) → `back`: same-origin referrer → `history.back()`; else navigate `Forge Legacy.dc.html`.
- **Title** "SETTINGS" (13px, 700, letter-spacing 2.4px, uppercase, centered).
- 44px right spacer for symmetry.

---

## 3. Scroll region — the settings menu

Three grouped cards + footer.

### 3.1 Account & controls card (`accountCategories`)
List rows, each: 36px bronze icon tile + label + chevron. Rows separated by top borders (first row `border:none`, rest `1px charcoal-700`). Tap → navigate:
1. **Account** (`profile` icon) → `Forge Account Settings.dc.html`
2. **Privacy** (`shield` icon) → `Forge Profile Visibility.dc.html`
3. **Notifications** (`bell` icon) → `Forge Notifications.dc.html`
4. **Preferences** (`settings` icon) → `Forge Preferences.dc.html`

### 3.2 Billing card (`billingCategories`) — separate group
A distinct card below (billing is a different mental model):
- **Subscription** (credit-card icon, built inline as `cardIcon`) → `Forge Subscription.dc.html`

### 3.3 Sign Out card — standalone
Own card (non-destructive styling, secondary-text label + door-arrow icon). Tap → `signOut`:
- `window.confirm("Sign Out?\n\nYou'll need to sign back in to reach your Legacy on this device.")`. On confirm, the logged-out destination is **owned by P-9** (no navigation wired here — placeholder).

### 3.4 Footer
- **Terms of Service** / **Privacy Policy** text links (dot separator) → open the legal sheet (`openTerms` / `openPrivacy`).
- **Version string:** `"Forge Legacy 2.4.1 (build 318)"`.

---

## 4. Legal webview sheet (`sheetOpen`)

A bottom sheet mimicking an in-app browser for legal/membership content. Opened with a key (`terms` | `privacy`; `subscription` content also defined but not opened from this screen). Scrim tap → `closeSheet`; inner tap `stopProp` (stops propagation so tapping content doesn't dismiss).

- Height 88%, modal surface, top-rounded.
- Header: a fake browser host label (`sheetHost`, e.g. "forgelegacy.app/terms") + close ×.
- Body: Playfair title (`sheetTitle`), an uppercase `sheetUpdated` line, then a list of paragraphs (`sheetBody`).

### 4.1 `LEGAL` content (all three, verbatim in the build)
- **subscription** — host `forgelegacy.app/membership`, title "Membership", updated "Forge Legacy · Founder", 4 paragraphs (Founder access; not pay-to-win; yearly renewal via app store; support contact). *Defined but not linked from this screen — carried for Account Settings/Subscription.*
- **terms** — host `forgelegacy.app/terms`, "Terms of Service", "Last updated · Feb 2026", 4 paragraphs (agree to terms; your Legacy is yours + exportable/deletable; training companion not medical advice; terms may change).
- **privacy** — host `forgelegacy.app/privacy`, "Privacy Policy", "Last updated · Feb 2026", 4 paragraphs (collect only what's needed; per-section visibility control; never sell data / de-identified aggregate only; contact via Account › Privacy).

---

## 5. Complete behavior index
- **On mount → redirect to Account Settings** (the operative behavior).
- (If redirect fails) poll-gate 3 globals → ready.
- AppBar back → history.back / Legacy.
- Account card → Account / Privacy / Notifications / Preferences.
- Billing card → Subscription.
- Sign Out → confirm dialog (destination owned by P-9).
- Footer → Terms / Privacy legal sheets; version string.
- Legal sheet: scrim + stopProp, host label, title/updated/body from `LEGAL`.

---

## 6. Reference values
- Frame 404×868, radius 32. AppBar 56px. Row icon tile 36px (icon 19px). Legal sheet 88% height.
- Version: **Forge Legacy 2.4.1 (build 318)**.
- Nav targets: Account Settings, Profile Visibility, Notifications, Preferences, Subscription, Legacy (back fallback).
- Legal `updated` dates: Terms/Privacy "Feb 2026"; membership "Founder".

---

## 7. Notes for Claude Code
- **DO NOT ship this as a separate screen.** It redirects to Account Settings on mount and is a merged artifact. Account Settings is the settings home.
- **Carry these pieces into Account Settings** (they're the canonical source here): the category map (Account/Privacy/Notifications/Preferences + Subscription in a separate billing group), the standalone Sign Out with its confirm copy, the footer legal links + version string, and the full `LEGAL` content object (terms, privacy, membership).
- **Sign Out's logged-out destination is a P-9 concern** — not wired here; the confirm dialog is the only behavior.
- **The legal "webview" is faked** (host label + local paragraphs), not a real browser — keep it as an in-app content sheet unless real hosted legal pages are wanted.
- **Billing is deliberately a separate card/group** from account controls — preserve that grouping in Account Settings.
