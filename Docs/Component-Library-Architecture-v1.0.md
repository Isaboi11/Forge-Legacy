# Component Library Architecture v1.0

**Status:** LOCKED
**Version:** 1.0
**Last Updated:** 2026-06-30
**Author:** Architecture session, 2026-06-30
**Amendment Log:** Initial.

---

## Overview

This document is the canonical contract for every UI component in Forge Legacy V1. It governs what components exist, what variants they support, how they behave in all states, what tokens they consume, and how they are owned and extended.

**Authority:** This document supersedes any per-screen component descriptions in wireframe specs when a conflict arises at the component level. For screen-level layout and composition, wireframe specs remain authoritative.

**Architecture Freeze:** This document closes Freeze Row 18 (Component Library / Design System).

---

## §1 — Purpose & Scope

### 1.1 Purpose

This architecture prevents the failure modes that arise when components are designed per-screen rather than shared:

- Duplicated components with diverging behavior
- Inconsistent interaction states across screens
- Accessibility gaps on screens that weren't individually audited
- Styling drift as the codebase grows
- Ambiguous ownership when components need to change

Every Forge Legacy screen is built from the components defined here. No UI pattern that appears on two or more screens may be reimplemented per-screen.

### 1.2 Scope

**In scope:**
- All reusable UI components (Tier 1 through Tier 3, defined in §3)
- Component behavior contracts: variants, states, sizing, tokens, accessibility, motion
- Design token taxonomy (semantic names; not hex values — those are branding assets)
- Iconography standards
- Typography usage governance
- Ownership and governance rules

**Out of scope:**
- Screen-level layout and composition — governed by individual wireframe specs
- Platform-native components (system status bar, OS keyboard, biometric prompts, native alert dialogs)
- Bespoke brand assets (Forge logo, rank insignia artwork, honor badge artwork) — these are not UI components
- Rest Timer component — governed by `Rest-Timer-Architecture-v1.0.md` (LOCKED, Freeze Row 19)
- Hex color values — governed by a future Branding Assets document

### 1.3 Document Relationships

| Document | Relationship |
|---|---|
| `FORGE_LEGACY_PRODUCT_DNA.md` | Parent — visual direction and UX philosophy principles |
| All wireframe specs (H-1 through P-9, W-1 through W-28, etc.) | Consumers — reference components by ID/name; defer behavior contract to this doc |
| `Backend-Data-Model-Architecture-v1.0.1.md` | Peer — defines the entity shapes that Tier 3 components render |
| `Squad-System-Architecture-v1.0.md` | Peer — defines Performance Firewall surface scoping (§2.3) |
| `Rest-Timer-Architecture-v1.0.md` (LOCKED) | Peer — owns the ProgressRing component; not part of this library |
| Future Branding Assets document | Downstream — will provide hex values for semantic tokens defined in §10 |

---

## §2 — Component Philosophy

Six governing principles. Every component decision in this document satisfies all six. A proposed new component that fails any one of them is rejected.

### CLA-P1 — Earned Visual Weight

The bronze accent communicates earned recognition. It marks progress, achievement, and legacy — not excitement, novelty, or engagement signals. Every use of `accent.*` tokens must pass the test: *does this surface communicate something the athlete built?*

### CLA-P2 — Accountability Without Shame

No component communicates urgency, failure, or absence as a negative signal. There are no drain-direction animations, no red states for "nothing logged," no "days since" counters, no streak-pressure patterns. The muted secondary color token (`text.secondary`) is the correct treatment for neutral absence (e.g., "Not yet this week" in the squad member presence state). `color.destructive` is reserved exclusively for confirmed-destructive user actions.

### CLA-P3 — Performance Firewall at the Component Layer

No component that renders ranking, standings, or cross-athlete performance comparison may be composed outside a squad-scoped or challenge-scoped surface. This is a composition-layer rule, not merely a data-layer rule. A component that renders comparative data carries a documentation flag indicating its permitted surfaces. (Governing surface definitions: `Squad-System-Architecture-v1.0.md` §2; `Challenge-System-Architecture-v1.0.md` §3.)

### CLA-P4 — Every Element Earns Its Place

Visual clutter is the enemy (Product DNA §6). A component variant, state, or property that cannot be justified by a specific, named screen requirement does not exist. The component library is not a design exploration surface — it is a production contract.

### CLA-P5 — Reduce Motion Is First-Class

Every component that has an animation has a Reduce Motion alternative defined alongside it in this document. Reduce Motion is not a post-launch accessibility pass; it is authored at the same time as the animation itself. Components are authored motion-last, not motion-first.

### CLA-P6 — Components Own Behavior; Screens Own Composition

Screen-level code may not override canonical component behavior. A screen passes props to a component; it does not reimplement the component's internal rendering, state management, or accessibility contract. If a screen requires a behavior not supported by an existing component's props, that behavior is added to this library via a formal amendment before the screen is implemented.

---

## §3 — Component Hierarchy

Three tiers. Composition flows downward only: Tier 3 composes Tier 2; Tier 2 composes Tier 1. No Tier 2 component renders another Tier 2 component as a child.

**Card** is a specialized Surface with fixed padding and elevation contracts — it does not compose Surface as a child; it IS a Surface with additional guarantees. **Modal** renders a `Surface` (CLA-C06) at `elevation.modal` for its content container — this is the only permitted Tier 2 structural nesting, and it is documented explicitly in CLA-C20.

### Tier 1 — Primitives

Atomic, token-only, no business logic. Never instantiated directly in screen code — always accessed through a Tier 2 wrapper. Not independently styled by callers.

| ID | Component |
|---|---|
| CLA-C01 | Text |
| CLA-C02 | Icon |
| CLA-C03 | Divider |
| CLA-C04 | ProgressFill |
| CLA-C05 | AvatarGlyph |

### Tier 2 — Composites

Multi-primitive assemblies, context-agnostic, reusable across any screen. Owned by the Component Library. Extended through props only — never forked or re-implemented at the screen level.

| ID | Component |
|---|---|
| CLA-C06 | Surface |
| CLA-C07 | Card |
| CLA-C08 | Button |
| CLA-C09 | Chip |
| CLA-C10 | Badge |
| CLA-C11 | Avatar |
| CLA-C12 | ProgressBar |
| CLA-C13 | SearchBar |
| CLA-C14 | InputField |
| CLA-C15 | TextArea |
| CLA-C16 | ListItem |
| CLA-C17 | SectionHeader |
| CLA-C18 | AppBar |
| CLA-C19 | TabBar |
| CLA-C20 | Modal |
| CLA-C21 | BottomSheet |
| CLA-C22 | Toast |
| CLA-C23 | Skeleton |
| CLA-C24 | EmptyState |

### Tier 3 — Screen-Level Compositions

Named compositions of Tier 2 components, context-aware, owned jointly by the Component Library and their governing wireframe spec. The wireframe spec holds the layout contract; this document holds the reuse contract.

| ID | Component | Governing Wireframe Spec |
|---|---|---|
| CLA-C25 | ChapterCard | H-1, L-1, P-1 |
| CLA-C26 | ProgramCard | H-1, W-1, W-2, W-3 |
| CLA-C27 | GoalCard | G-1, G-2 |
| CLA-C28 | HonorCard | L-10, L-11, P-1 |
| CLA-C29 | SquadCard | S-1 |
| CLA-C30 | WorkoutSessionCard | W-17, W-18, W-19 |
| CLA-C31 | ExerciseRow | W-22, W-23, W-24, W-9–W-16 |
| CLA-C32 | MemberRow | S-2 |
| CLA-C33 | TimelineEventRow | L-2 |
| CLA-C34 | PostCard | Friends Feed, Squad Feed, Community Feed |
| CLA-C35 | AccomplishmentRow | L-12, L-13, L-14, P-1 |
| CLA-C36 | PhotoThumbnail | L-15, L-16 |
| CLA-C37 | HomepagePrinciple | H-1 |

---

## §4 — Canonical Components

### CLA-C01 — Text

**Tier:** 1 — Primitive

The foundational typographic unit. Renders a single string with a named scale step (§12) and a named color token (§10). Does not accept raw size or color values.

**Props contract:**
- `scale` — one of the 12 named scale steps (e.g., `sectionHeader`, `mutedSecondary`, `primaryCardContent`)
- `color` — one of the named text tokens (e.g., `text.primary`, `text.secondary`, `text.tertiary`)
- `numberOfLines` — optional; only in explicitly documented single-line contexts (see §12 truncation rules)

**Rule:** Raw font sizes, weights, and color values are prohibited. All styling flows through named tokens.

---

### CLA-C02 — Icon

**Tier:** 1 — Primitive

Renders a single Phosphor icon glyph at a named size with a semantic role that maps to a Phosphor weight variant.

**Semantic icon roles** (implementation maps these to Phosphor weight variants):

| Role | Phosphor weight | Usage |
|---|---|---|
| `Decorative` | Light or Thin | Non-interactive glyphs; hidden from accessibility tree |
| `Standard` | Regular | Default interactive icons (navigation, row affordances) |
| `Active` | Bold | Toggled-on or selected state of a `Standard` icon |
| `Filled` | Fill | Strong emphasis; active tab indicator, favorited state |

**Props contract:**
- `name` — Phosphor icon name (e.g., `"Heart"`, `"CaretRight"`)
- `role` — one of `Decorative | Standard | Active | Filled`
- `size` — one of the named icon sizes (§11): `inline` / `card` / `standard` / `featured` / `emptyState` / `badge`
- `color` — one named token; inherits from parent context if omitted
- `accessibilityLabel` — required unless `role` is `Decorative`

**Bespoke brand assets** (Forge logo, rank insignia, honor badge artwork) are not CLA-C02 instances. They are custom assets rendered via their own asset-specific components.

---

### CLA-C03 — Divider

**Tier:** 1 — Primitive

A single-pixel horizontal rule. Full-width by default; optional inset.

**Props contract:**
- `inset` — optional left/right offset (default: 0, full-width)
- `color` — `border.subtle` token (default); no other values permitted

---

### CLA-C04 — ProgressFill

**Tier:** 1 — Primitive (internal use only)

The filled segment inside a ProgressBar (CLA-C12). Not used directly by any screen. Renders a proportional fill from 0–100% of its container's width.

**Props contract:**
- `percentage` — 0–100 (clamped at component level; callers need not clamp)
- `color` — `accent.primary` token (default); `color.progressTrack` for the unfilled track (provided by parent)

---

### CLA-C05 — AvatarGlyph

**Tier:** 1 — Primitive (internal use only)

The initials fallback displayed inside an Avatar (CLA-C11) when no photo is available. Renders 1–2 initials derived from the display name.

**Props contract:**
- `initials` — 1–2 character string
- `size` — inherits from parent Avatar

---

### CLA-C06 — Surface

**Tier:** 2 — Composite

A generic themed container. Provides background color (via elevation level) and optional corner radius. No padding contract — callers manage inner spacing. Surface is the base on which Card (CLA-C07) and other containers build.

**Variants:**

| Variant | Elevation token | Typical usage |
|---|---|---|
| `none` | `elevation.none` | Flat content within a screen (section backgrounds) |
| `card` | `elevation.card` | Entity cards, list containers |
| `sheet` | `elevation.sheet` | Bottom sheets, profile modal |
| `modal` | `elevation.modal` | Ceremony modals (M1–M9) |

**Props contract:**
- `elevation` — one of `none | card | sheet | modal`
- `radius` — one of `radius.*` tokens, or `none` (default: `none`)
- `children` — any content

**Rule:** Surface components do not nest. A Surface may not contain another Surface with a higher or equal elevation. Modal-elevation surfaces may contain card-elevation surfaces; the reverse is not permitted.

---

### CLA-C07 — Card

**Tier:** 2 — Composite

A Surface with a standard content/padding contract. All named entity cards in Tier 3 build on Card.

**Locked measurements:**
- Corner radius: `radius.card` (8dp)
- Inner padding: `space.lg` (16dp) all sides
- Elevation: `elevation.card`
- Gap between sibling Cards in a list: `space.md` (12dp)

**Variants:**
- `default` — standard entity card
- `hero` — visually prominent treatment; callers supply hero-specific layout inside (no padding override)
- `elevated` — slightly stronger surface differentiation (P-1 Chapter Card treatment vs. list card treatment)

**Props contract:**
- `variant` — `default | hero | elevated`
- `onPress` — optional; makes the full card tappable with a pressed state
- `children` — card body content

**Tappable Card:** when `onPress` is provided, the caller must supply `accessibilityLabel` and the Card internally sets `accessibilityRole="button"`.

**Rule:** Cards do not contain other Cards. A Card body may contain Surfaces at `elevation.none` for internal groupings, but never another Card.

---

### CLA-C08 — Button

**Tier:** 2 — Composite

**ID: CLA-C08**

**Visual classes:**

| Class | Visual treatment | Decision |
|---|---|---|
| `Primary` | Filled; `accent.primary` background or high-contrast fill | Highest priority action on a screen; maximum one per viewport |
| `Secondary` | Outlined; `accent.primary` or `text.primary` border; no fill | Standard action; may appear multiple times |
| `Tertiary` | Text-link; no border, no fill; `accent.primary` color text | Subordinate actions, "View all →" affordances |
| `Icon` | Icon-only, no label; square; icon centered | Compact interactive icon with a 44dp touch area |

**Sizing:**
- Height: minimum **44dp**; full-width or content-hugging per context
- Full-width: all single-primary-action surfaces (H-1 CTA, W-9 End Workout, G-3 Save Goal)
- Content-hugging: inline card footer actions, secondary actions alongside Primary

**States:**
- `enabled` — standard appearance
- `pressed` — 80% opacity; immediate (~50ms)
- `disabled` — 40% opacity; no interaction; no disabled icon or alternate color
- `loading` — spinner replaces label; button remains full-width; disabled during load

**Decision CLA-D1:** Destructive actions use `color.destructive` only in the M-6 Destructive Confirm modal's confirm CTA. No other Button context uses `color.destructive`. Destructive intent is communicated through copy and the M-6 confirmation pattern, not through button color.

---

### CLA-C09 — Chip

**Tier:** 2 — Composite

**ID: CLA-C09**

Small, compact label used for categorization, filtering, and status communication.

**Types:**

| Type | Description | Interactive? |
|---|---|---|
| `Filled` | Accent or category-colored fill; primary category label | No (display only) |
| `Outlined` | Transparent fill, border; secondary or inactive | No (display only) |
| `Filter` | Outlined with trailing × dismiss button | Yes — tap × to clear |
| `Status` | Non-interactive state label; may include a leading colored dot | No |

**Sizing:**
- Height: 28–32dp (pill shape; `radius.chip` = 99dp)
- Horizontal padding: `space.sm` (8dp) each side
- Label: `text.smallLabel` scale (12sp)

**Difficulty chip** = Status chip type with a leading colored dot:
- Beginner: `color.difficulty.beginner` dot + "Beginner" label
- Intermediate: `color.difficulty.intermediate` dot + "Intermediate" label
- Advanced: `color.difficulty.advanced` dot + "Advanced" label

**Decision CLA-D2:** Color is never the sole differentiator. Every colored chip must also carry a text label. This applies to difficulty chips and to any future category-colored chip variants.

---

### CLA-C10 — Badge

**Tier:** 2 — Composite

**ID: CLA-C10**

Numeric count indicator. Used for unread notification counts and honor category counts.

**Sizing:**
- Single digit (1–9): circular, 20dp diameter
- Multi-digit (10+): pill shape, 20dp height, content-hugging width
- `radius.chip` (99dp) for the pill variant

**Token usage:**
- Background: `accent.primary`
- Text: `text.inverse`, `text.sectionHeader` scale (11sp), no all-caps

---

### CLA-C11 — Avatar

**Tier:** 2 — Composite

**ID: CLA-C11**

Circular representation of an athlete. Displays a profile photo, or AvatarGlyph (CLA-C05) initials fallback when no photo is available.

**Canonical sizes:**

| Name | Size | Context |
|---|---|---|
| `squadStack` | 28dp | Squad card member cluster (S-1, S-2 header) |
| `appBar` | 36dp | TopAppBar trailing avatar |
| `listRow` | 40dp | Member list rows (S-2), partner rows |
| `profile` | 88dp | Profile header (P-1) |
| `modalProfile` | 96dp | Limited Athlete Profile modal |

**AvatarStack variant** (squadStack size only):
- 8dp overlap between adjacent avatars
- Capped at 4 visible avatars
- "+N" overflow indicator: `text.mutedSecondary` scale (13sp), secondary color

**Initials fallback:**
- 1–2 initials derived from display name
- Background: `background.elevated` or named muted surface
- Text: `text.primary`

---

### CLA-C12 — ProgressBar

**Tier:** 2 — Composite

**ID: CLA-C12**

Linear progress indicator. Single canonical height only.

**Locked measurements:**
- Height: **6dp**
- Track background: `color.progressTrack`
- Fill: `color.accent.primary`
- `radius.chip` (99dp) applied to both track and fill ends for pill appearance

**Behavior:**
- Value applied immediately on mount — no entrance animation
- Fill direction: left to right only (never right to left; never drain-direction)
- Clamps internally to 0–100%; callers need not validate
- Optional percentage label: `text.mutedSecondary` scale (13sp) rendered adjacent to bar, never overlaid

**States:**
- `0%` — empty track visible; fill not rendered
- `intermediate` — proportional fill
- `100%` — full fill; optional ✓ checkmark in `color.accent.primary`

---

### CLA-C13 — SearchBar

**Tier:** 2 — Composite

**ID: CLA-C13**

Full-width text input styled for search contexts.

**Locked measurements:**
- Height: **44dp**
- Full-width within screen margin

**Anatomy:**
- Leading: search glyph (CLA-C02, role `Decorative`, `standard` size, `color.text.tertiary`)
- Input field: `text.secondaryContent` scale (15sp)
- Trailing: × clear glyph (CLA-C02, role `Standard`, 44dp tap target) — visible only when query is non-empty

**States:**
- `empty` — placeholder text; no trailing clear
- `active` — cursor visible; placeholder cleared
- `hasQuery` — trailing × visible and interactive

---

### CLA-C14 — InputField

**Tier:** 2 — Composite

**ID: CLA-C14**

Single-line text input for form contexts.

**Anatomy:**
- Label (optional): `text.smallLabel` scale (12sp), `text.secondary`
- Input area: `text.secondaryContent` scale (15sp)
- Character count (optional): `text.smallLabel` scale (12sp), `text.tertiary`, right-aligned; shown when a limit is defined
- Error text (optional): `text.smallLabel` scale (12sp), `color.text.secondary` (muted — not red)

**States:**
- `default` — standard border using `border.subtle` token
- `focused` — border highlighted using `accent.primary` token
- `error` — border tinted with muted red; error text appears below field

**Height:** minimum **44dp** (accessible tap target; content-driven above this minimum).

**Decision CLA-D3:** Error state in InputField uses a muted border tint and calm inline text. No red background fill, no alert icon, no modal. The error is the quietest signal that communicates a correction is needed.

---

### CLA-C15 — TextArea

**Tier:** 2 — Composite

**ID: CLA-C15**

Multi-line text input. Inherits all InputField behavior and constraints.

**Differences from InputField:**
- Grows vertically as content is entered (up to a maximum line count defined at call site)
- Character count display recommended when a limit is defined
- No single-line truncation; all text visible

---

### CLA-C16 — ListItem

**Tier:** 2 — Composite

**ID: CLA-C16**

A single row in a scrollable list. Three-zone anatomy.

**Anatomy:**
```
[ Leading ] [ Center (primary text + optional secondary text) ] [ Trailing ]
```
- **Leading** (optional): Avatar, Icon, or nothing; left-aligned; 44dp minimum width if present
- **Center**: primary text (`text.standardCardName` / `text.secondaryContent`); optional secondary line (`text.mutedSecondary`)
- **Trailing** (optional): metadata text, Chip, Icon, or chevron glyph

**Canonical heights:**

| Height | Context |
|---|---|
| 48dp | Standard (primary text only) |
| 56dp | Tall (primary + secondary line) |
| 72dp | Exercise rows (thumbnail + chips + detail affordance) |

**Tap target:** Full row width × full row height. The row body and any separate trailing affordance share the row's tap area unless the trailing element has its own explicit onPress (e.g., detail ⓘ icon alongside a navigable row body — both targets must meet 44dp individually).

**Chevron affordance:** `CLA-C02` with role `Decorative`, glyph `CaretRight`, 13sp-sized rendering, `text.tertiary` color, right-aligned; hidden from accessibility tree; navigation indicated by the row's `accessibilityLabel`.

---

### CLA-C17 — SectionHeader

**Tier:** 2 — Composite

**ID: CLA-C17**

The labeled divider between content sections within a scrollable screen.

**Locked styling:**
- Label: `text.sectionHeader` scale (11sp ALL-CAPS, enforced internally)
- Color: `text.tertiary`
- Optional trailing count: same size and color, right-aligned
- Optional trailing action (e.g., "View all →"): Tertiary Button class, right-aligned

**Spacing:**
- `space.xl` (24dp) above
- `space.sm` (8dp) below

**Collapsible variant** (L-10 honors categories):
- Trailing expand/collapse indicator: `CaretDown` / `CaretUp` Phosphor icon, role `Standard`
- Collapse/expand animation: instant (or <150ms ease-out if Reduce Motion is OFF)

---

### CLA-C18 — AppBar

**Tier:** 2 — Composite

**ID: CLA-C18**

Fixed top navigation bar. Does not scroll with content.

**Variants:**

| Variant | Leading | Center | Trailing |
|---|---|---|---|
| `tabRoot` | Wordmark or nothing | Screen title (optional) | Avatar, actions, or both |
| `stackScreen` | ← Back button (44dp) | Screen title | Optional actions or ⋯ overflow |

**Title:** `text.screenTitle` scale (20sp); centered or left-aligned per screen's wireframe spec.

**Tap targets:** All interactive elements — back arrow, avatar, action icons, overflow — minimum **44dp**.

**Decision CLA-D4:** AppBar is hidden during Active Workout (W9–W16) full-screen mode. All components used within W9–W16 must function correctly without an AppBar present.

---

### CLA-C19 — TabBar

**Tier:** 2 — Composite

**ID: CLA-C19**

Fixed bottom navigation bar. Five tabs. *(Updated 2026-07-07: Communities promoted from a Home/Squads discovery entry point to a full tab — `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`. Previously four tabs.)*

**Tabs:** Home · Workouts · Legacy · Squads · Communities

**Profile** is not a tab. It is accessed via the AppBar's trailing avatar, which opens the Profile BottomSheet.

**Tab anatomy:**
- Icon: `CLA-C02`, role `Standard` (unselected) or `Filled` (selected)
- Label: `text.smallLabel` scale (12sp)
- Selected state: icon and label in `color.accent.primary`
- Unselected state: icon and label in `color.text.tertiary`

**Behavior:** Always visible except during Active Workout (W9–W16) full-screen mode. Tab root screens replace the stack on tap (do not push).

---

### CLA-C20 — Modal

**Tier:** 2 — Composite

**ID: CLA-C20**

Centered overlay. Used exclusively for ceremony moments (M1–M9). Not used for utility confirmations, filters, or profile — those use BottomSheet (CLA-C21).

**Layout:**
- Full-screen dimmed overlay: `background.overlay` token
- Content container: `Surface` (CLA-C06) at `elevation.modal`; `radius.card` applied; maximum width ~340dp; padding 24dp (not Card — Modal uses 24dp padding and `elevation.modal`, both of which differ from Card's locked contract)

**Dismiss:** Explicit CTA button only. No tap-outside dismiss, no swipe. Recognition moments must be acknowledged — not accidentally dismissed.

**Animation (Reduce Motion OFF):** Fade-in over 200ms, ease-out. Overlay dims simultaneously.
**Animation (Reduce Motion ON):** Appears immediately; no fade.

---

### CLA-C21 — BottomSheet

**Tier:** 2 — Composite

**ID: CLA-C21**

Bottom-anchored utility surface. Used for: Profile, Honor Detail, Filter panels, Confirmation dialogs, Action menus, Timer preferences.

**Anatomy:**
- Handle bar: centered at top (drag-to-dismiss affordance)
- [×] dismiss button: top-right, **44dp** tap target
- Content area: scrollable when content exceeds container

**Height:** 50–85% of screen height. Expandable only when the governing wireframe spec explicitly defines expansion behavior.

**Dismiss:** Tap outside, swipe down, or explicit [×] button.
**Focus:** Trapped inside BottomSheet while open. Returns to triggering element on dismiss.

**Animation (Reduce Motion OFF):** Slide-up from bottom, 250ms, ease-out.
**Animation (Reduce Motion ON):** Appears immediately; no slide.

---

### CLA-C22 — Toast

**Tier:** 2 — Composite

**ID: CLA-C22**

Auto-dismissing transient notification.

**Layout:** Full-width within screen margins; `Surface` at `elevation.sheet`; positioned above TabBar.

**Content:** Single-line message; `text.secondaryContent` scale (15sp). No CTA inside Toast. No multi-line content.

**Dismiss:** Auto-dismisses after **3 seconds** (total display time). Fade-out begins at 2.7s, completes at 3.0s.

**Types:**
- `informational` — standard transient confirmation ("Accomplishment saved")
- `error` — network or system error only ("Connection lost"); uses standard appearance — no red; error is in the copy

**Reduce Motion:** No fade; appears and disappears instantly after 3 seconds.

**Decision CLA-D5:** Toast is the only non-inline feedback component. It is never used as a replacement for screen-level navigation or for persistent errors. Network errors for content sections use inline text, not Toast.

---

### CLA-C23 — Skeleton

**Tier:** 2 — Composite

**ID: CLA-C23**

Loading placeholder while data is being fetched.

**Variants:**
- `row` — 72dp height; simulates a ListItem
- `card` — ~100dp height; simulates a Card
- `section` — ~200dp height; simulates a content section

**Behavior:**
- Shimmer animation: left-to-right wave sweep, continuous, until content resolves
- **Suppressed if content resolves in <200ms** — prevents flash of loading state
- Reduces motion: shimmer replaced with a static muted placeholder block (`background.surface` color); no animation

**Decision CLA-D6:** Avatars use an AvatarGlyph initials placeholder during loading — not Skeleton shimmer. Skeleton is used for content sections, cards, and list rows, not for individual atomic elements.

---

### CLA-C24 — EmptyState

**Tier:** 2 — Composite

**ID: CLA-C24**

Contextual invitation for screens or sections with no content.

**Default behavior — Smart Omission:** When a section has no content, the section and its SectionHeader are omitted entirely. No placeholder row, no "Nothing here" text. This is the correct behavior for the majority of empty states.

**Invitation copy** is rendered only for first-experience states where the athlete is genuinely expected to be uncertain (e.g., Squad Hub with no squads, Goals section with no goals on first open of a new chapter).

**Anatomy:**
- Icon (optional): 48dp, `text.tertiary` color, role `Decorative`; not an illustration — a simple glyph
- Primary copy: `text.primaryCardContent` scale (18sp), `text.primary`; warm, aspirational language
- Secondary copy (optional): `text.secondaryContent` scale (15sp), `text.secondary`
- CTA (optional): Secondary or Tertiary Button class

**Decision CLA-D7:** The Primary Button class is used inside an EmptyState only in the S-1 Squad Hub's absolute-zero-squad state. In all other EmptyState contexts, CTAs are Secondary or Tertiary class.

**Voice rule:** Invitation copy never uses the word "empty," "nothing," "no results," or phrases that communicate the athlete is behind or missing out. It uses action-forward or aspirational language: "Training alongside someone changes how it feels to show up." / "Build your first squad."

---

## §5 — Variants & Sizing Rules

### 5.1 Locked Measurement Table

| Token | Value | Source |
|---|---|---|
| `radius.card` | 8dp | Confirmed across all wireframe specs |
| `radius.chip` | 99dp (pill) | Chip specs across all specs |
| `radius.image` | 4dp | Exercise thumbnails, photo thumbnails |
| `radius.avatar` | 50% (circle) | All avatar contexts |
| `space.xs` | 4dp | Element gap within dense contexts |
| `space.sm` | 8dp | Internal element gap within cards |
| `space.md` | 12dp | Card-to-card gap in lists |
| `space.lg` | 16dp | Screen horizontal margin; card inner padding |
| `space.xl` | 24dp | Section gap (SectionHeader → content) |
| `space.2xl` | 32dp | Major section breaks |
| `size.tapTargetMin` | 44dp | All interactive elements |
| `size.tapTargetRow` | 48dp | Standard list rows |
| `size.tapTargetRowTall` | 56dp | Tall list rows (primary + secondary) |
| `size.tapTargetRowExercise` | 72dp | Exercise rows (thumbnail + chips) |
| `size.progressBarHeight` | 6dp | ProgressBar (single canonical height) |
| `size.avatarSquadStack` | 28dp | Squad card member cluster |
| `size.avatarAppBar` | 36dp | AppBar trailing avatar |
| `size.avatarListRow` | 40dp | Member list rows, partner rows |
| `size.avatarProfile` | 88dp | Profile header (P-1) |
| `size.avatarModalProfile` | 96dp | Limited Athlete Profile modal |
| `size.avatarStackOverlap` | 8dp | Avatar overlap in AvatarStack |

### 5.2 Icon Size Table

| Name | Size (dp) | Context |
|---|---|---|
| `inline` | 16dp | Inline affordances (chevrons in dense contexts) |
| `card` | 20dp | Decorative icons embedded in card content |
| `standard` | 24dp | Standard interactive icons (AppBar, row affordances) |
| `featured` | 28–40dp | Activity type icons, prominent action icons |
| `emptyState` | 48dp | EmptyState glyph |
| `badge` | 72dp | Honor badge ceremonial display (L-11) |

All icons with a tap handler have a minimum **44dp touch target** regardless of visual glyph size.

---

## §6 — States

Eight canonical states. Each Tier 2 component documents which subset it supports.

| State | Definition |
|---|---|
| `default` | Standard resting appearance |
| `pressed` | 80% opacity or background highlight; ~50ms response |
| `disabled` | 40% opacity; pointer-events none; no disabled icon or color change |
| `loading` | Spinner replaces button label; Skeleton replaces content areas |
| `error` | Muted border tint + inline error text for inputs; Toast for transient errors |
| `success` | Accent fill or ✓ indicator; used for completion confirmation only |
| `selected` | Filled chip variant; accent-colored tab icon; highlighted list row |
| `focused` | Visible focus ring (keyboard and switch-access navigation) |

**Decision CLA-D8 — The Absence Rule:** Absence of data is never expressed as `error` state. Muted secondary color (`text.secondary`) is the correct treatment for neutral absence. `color.destructive` is reserved exclusively for two surfaces: the M-6 Destructive Confirm CTA, and the Delete action in L-13 Accomplishment Detail.

**Decision CLA-D9:** The following states do not exist in this component library and may not be introduced via amendment without explicit architectural justification:
- "Streak broken" or "streak at risk"
- "Days since last workout"
- "Missed workout" (as distinct from "not yet this week" — the latter is factual; the former is editorial)
- Any pulsing, blinking, or color-shifting state tied to absence

**Known conflict, tracked, not yet fixed:** the committed (LEGACY/REFERENCE) `WorkoutCard` (`missed`, red-toned) and `ForgeStreakIndicator` (`broken`, "streak lost") components in `src/components/forge/` render exactly the language/color this decision prohibits. The internal state values are legitimate application states and are not being removed; only the user-facing label/color needs to change in a future revision. See `Component-State-Language-Reconciliation-Note.md` for the specific recommendation.

---

## §7 — Composition Rules

### 7.1 Tier Hierarchy Is Strict

Tier 3 composes Tier 2; Tier 2 composes Tier 1. No skipping tiers. No Tier 2 component renders another Tier 2 component as a child (see §3 for the two permitted structural exceptions: Card IS-A Surface; Modal renders Surface at `elevation.modal`).

### 7.2 Nesting Prohibitions

- **No nested Cards** — a Card body does not contain another Card
- **No nested BottomSheets** — a BottomSheet does not open a BottomSheet
- **No nested Modals** — ceremony modals do not stack; they queue (per M-1 §3 priority)

### 7.3 Spacing Ownership

Each Tier 3 component owns its outer margin; Tier 2 components do not add outer margin by default. This prevents double-margin collisions in list contexts.

Screen-level spacing standards:
- Horizontal margin from screen edge: `space.lg` (16dp)
- Card-to-card gap in a scroll list: `space.md` (12dp)
- SectionHeader gap above content: `space.xl` (24dp)
- Element gap within a card: `space.sm` (8dp)

### 7.4 Z-Layer Order

| Layer | Components |
|---|---|
| 0 — Content | All Tier 3 components, ListItems, Cards |
| 1 — AppBar | AppBar (fixed top) |
| 2 — TabBar | TabBar (fixed bottom) |
| 3 — Toast | Toast (above TabBar) |
| 4 — BottomSheet | BottomSheet (utility surfaces) |
| 5 — Modal | Modal (ceremony overlays; highest) |

No component may render above its assigned z-layer floor without a Component Library amendment.

### 7.5 Full-Screen Rule (Active Workout)

AppBar and TabBar are both absent during Active Workout (W9–W16). All components must function correctly in a chrome-free full-screen environment.

### 7.6 Performance Firewall Composition Rule

No Tier 2 or Tier 3 component that renders comparative performance data (rank standings, challenge scores, cross-athlete workout statistics) may be composed on a non-Squad / non-Challenge surface. Components that carry this restriction include a `performanceFirewallSurface` documentation flag identifying their permitted surfaces (Squad-internal per `Squad-System-Architecture-v1.0` §2; Challenge-scoped per `Challenge-System-Architecture-v1.0` §3).

### 7.7 Token Purity Rule

**Decision CLA-D10:** Components may reference semantic design tokens only. Raw color values (hex, rgb, hsl, named CSS colors), raw numeric pixel values outside the locked measurement table (§5.1), and magic numbers are prohibited in component contracts. All styling flows through named tokens. This is enforced in this document; implementation must honor it.

---

## §8 — Accessibility Requirements

### 8.1 Standard

**WCAG 2.1 AA** is the V1 target.

- Body text (15–16sp): minimum 4.5:1 contrast ratio
- Large text (18sp semibold or 24sp any weight): minimum 3:1
- Muted / tertiary text (11–13sp section labels): target 4.5:1; document explicitly where this cannot be achieved against the dark-first palette
- UI components and graphical objects: minimum 3:1

### 8.2 Touch Targets

- All interactive elements: **44dp minimum** in both dimensions
- Row items: **48dp height minimum**
- Icons within rows: visual glyph size per §5.2; touch target padded to 44dp (not the glyph size)

### 8.3 Screen Reader Support

All interactive elements declare:
- `accessibilityLabel` — content and purpose in plain language
- `accessibilityRole` — button / link / image / header / adjustable (as appropriate)
- `accessibilityValue` — current value for progress bars, sliders, and toggles

Non-interactive decorative elements (Decorative-role icons, dividers, visual backgrounds) are hidden from the accessibility tree (`accessibilityElementsHidden` / `importantForAccessibility="no"`).

Compound components define a canonical focus traversal order. Example pattern: ExerciseRow (CLA-C31) announces name, category, and primary muscle as a single accessibility label; the detail ⓘ affordance is a separate focus stop with its own label.

### 8.4 Focus Order

Top-to-bottom, left-to-right, matching visual order. Modals (CLA-C20) and BottomSheets (CLA-C21) trap focus while open. Focus returns to the triggering element on dismiss.

### 8.5 Dynamic Type

All Text (CLA-C01) instances scale with the system font size setting. No fixed-height text containers. Text wraps and stacks at larger sizes. Exception: single-line list item primary text may truncate with ellipsis (1 line) or two-line wrap (2 lines) only in contexts explicitly documented in the governing wireframe spec.

### 8.6 Reduce Motion

When the user's system Reduce Motion preference is enabled:
- All shimmer animations: replaced with static muted placeholder blocks
- All crossfades and opacity transitions: immediate (instant swap)
- All spring interactions: instant state change
- All layout transition animations: instant show/hide
- Ceremony modals (M1–M9): content appears immediately; no reveal sequence
- BottomSheets: appear immediately; no slide-up
- Section collapse/expand: instant; no animation

### 8.7 Color as Sole Differentiator

Color is never the sole differentiator for any state, category, or status. Every instance where color communicates meaning also provides a text label, icon, or both. This applies to: difficulty chips (color + label), presence states in the squad member list (text weight + label), ProgressBar fill (accent + percentage label).

---

## §9 — Motion & Animation Principles

### 9.1 Governing Principles

1. **Motion serves comprehension, not impression.** If removing an animation would make the interaction clearer or faster, remove it.
2. **Ceremony moments earn motion.** M1–M9 ceremony modals represent significant life achievements and warrant intentional animation. Utility screens (workout logger, exercise picker, settings) are instant.
3. **Duration scales with distance.** Micro-interactions (<150ms). Layout transitions (200–300ms). Ceremony reveals (up to 500ms for the most significant moments, e.g., M-1 Rank Up).
4. **Fill direction only.** No drain, depletion, or countdown animations. ProgressBar fills. It does not deplete. This is a hard rule derived from CLA-P2.

### 9.2 Confirmed Timing Values

| Interaction | Duration | Easing | Source |
|---|---|---|---|
| Image crossfade (media load) | ~200ms | ease-in-out | W-22, W-19 pattern |
| Toggle spring (favorite, toggle) | ~50ms | spring | W-23 spec |
| Section collapse/expand | <150ms | ease-out | L-10 pattern |
| BottomSheet slide-up | 250ms | ease-out | Standard mobile |
| Modal fade-in | 200ms | ease-out | M1–M9 pattern |
| Skeleton → content cross-dissolve | 150ms | ease-in-out | Suppressed if <200ms |
| Toast fade-out | 300ms (begins at 2.7s) | ease-in | Multiple specs |

### 9.3 Easing Guide

- **Spring:** interactive responses (toggles, tap feedback, favorite heart)
- **Ease-out:** element entrances (modals appearing, sheets sliding up, skeletons resolving)
- **Ease-in:** element exits (toasts fading, modals dismissing)
- **Linear:** never applied

### 9.4 Reduce Motion

All animations in §9.2 become instant when Reduce Motion is active. See §8.6 for the complete rule.

---

## §10 — Theming & Design Tokens

**Decision CLA-D11 — Token Purity (reiteration of CLA-D10):** Component contracts reference token names only. Hex values are provided by a future Branding Assets document and bound to these token names at build time.

**Decision CLA-D12 — Dark-first, V1 dark-only:** The token structure below defines one value per token (no light/dark pair). Light mode is explicitly deferred to a future version. The semantic naming is intentionally neutral so that light values can be added later without restructuring the token hierarchy.

### 10.1 Color Tokens

| Token | Semantic Role |
|---|---|
| `color.background.primary` | Main canvas (near-black) |
| `color.background.surface` | Card surface (slightly elevated from canvas) |
| `color.background.elevated` | Modal/sheet surface (above card level) |
| `color.background.overlay` | Modal dimming backdrop (semi-transparent black) |
| `color.text.primary` | High-contrast body text (near-white on dark) |
| `color.text.secondary` | Supporting text (muted gray) |
| `color.text.tertiary` | Very muted — section labels, placeholders |
| `color.text.inverse` | Dark text for use on accent/light surfaces |
| `color.accent.primary` | Bronze/warm gold — progress, earned states, active tab, tappable links |
| `color.accent.muted` | Subtler warm tone — progress bar track tint |
| `color.difficulty.beginner` | Green — Beginner difficulty |
| `color.difficulty.intermediate` | Amber — Intermediate difficulty |
| `color.difficulty.advanced` | Red — Advanced difficulty |
| `color.destructive` | Red — destructive action CTAs and network error toasts ONLY |
| `color.presence.active` | Accent-tinted — "Trained today" (squad surfaces only) |
| `color.presence.recent` | Secondary — "Trained this week" (squad surfaces only) |
| `color.presence.inactive` | Muted secondary — "Not yet this week" (squad surfaces only; never red or orange) |
| `color.border.subtle` | Divider lines, input borders |
| `color.progressTrack` | Unfilled track for ProgressBar |
| `color.skeleton` | Skeleton shimmer base |

### 10.2 Spacing Tokens

| Token | Value |
|---|---|
| `space.xs` | 4dp |
| `space.sm` | 8dp |
| `space.md` | 12dp |
| `space.lg` | 16dp |
| `space.xl` | 24dp |
| `space.2xl` | 32dp |

### 10.3 Radius Tokens

| Token | Value | Usage |
|---|---|---|
| `radius.card` | 8dp | Card containers, Surface containers |
| `radius.chip` | 99dp | Chips, ProgressBar ends, Badge pill |
| `radius.image` | 4dp | Exercise thumbnails, photo thumbnails |
| `radius.avatar` | 50% | All Avatar sizes |

### 10.4 Elevation Tokens

On a dark-first palette, elevation is expressed through surface color lightness steps, not drop shadows. Shadows are invisible on dark backgrounds.

| Token | Role | Relative surface lightness |
|---|---|---|
| `elevation.none` | Flat content, section backgrounds | = canvas |
| `elevation.card` | Card surface | Slightly lighter than canvas |
| `elevation.sheet` | BottomSheet, profile modal | Noticeably lighter than card |
| `elevation.modal` | Ceremony modals | Distinctly set above sheet |

---

## §11 — Iconography

### 11.1 Icon Library

**Phosphor Icons** is the canonical V1 icon library. No other icon set is used for UI icons (no SF Symbols, no Material Icons, no Ionicons). A single library ensures visual consistency across iOS and Android.

**Bespoke Forge brand assets** (logo, rank insignia artwork, honor badge artwork) are custom assets produced for Forge Legacy. They are not Phosphor icons and are not governed by this section.

### 11.2 Semantic Icon Roles

Implementation maps these semantic roles to Phosphor weight variants:

| Semantic Role | Phosphor Weight | When to use |
|---|---|---|
| `Decorative` | Light or Thin | Non-interactive glyphs; hidden from accessibility tree |
| `Standard` | Regular | Default interactive icons (navigation, row affordances, unselected states) |
| `Active` | Bold | Toggled-on state of `Standard` icons |
| `Filled` | Fill | Strong emphasis: selected tab, favorited state, confirmed completion |

### 11.3 Icon Sizes

| Name | Size | Context |
|---|---|---|
| `inline` | 16dp | Inline affordances (chevrons in dense contexts) |
| `card` | 20dp | Decorative embedded in card content |
| `standard` | 24dp | Standard interactive (AppBar, row affordances) |
| `featured` | 28–40dp | Activity type icons, prominent action icons |
| `emptyState` | 48dp | EmptyState section glyph |
| `badge` | 72dp | Honor badge ceremonial display (L-11) |

### 11.4 Rules

- All interactive icons have `accessibilityLabel`
- All Decorative icons are hidden from the accessibility tree
- Touch target is always **44dp** regardless of visual glyph size
- Icon color inherits from component context unless explicitly assigned via a named token
- The `Active` role uses the same glyph as `Standard`; only weight changes
- The `Filled` role uses the "filled" variant of the Phosphor glyph (available for most Phosphor icons as a separate weight)

---

## §12 — Typography Usage

### 12.1 Typeface

**V1 typeface: Platform system font** — SF Pro on iOS, Roboto on Android. Both are delivered natively via Expo at zero licensing cost, zero load time, with full Dynamic Type support.

**Font family token:** `font.family.system` (maps to platform default at runtime)

### 12.2 Type Scale

| Scale Token | Size | Weight | Case | Permitted Contexts |
|---|---|---|---|---|
| `text.exerciseTitle` | 28sp | Semibold | Sentence | Exercise names in W9 active card; ceremony modal headlines |
| `text.screenSectionHeading` | 24sp | Semibold | Sentence | Section headings within a screen |
| `text.largeHeading` | 22sp | Semibold | Sentence | Profile display name (P-1 Tier 1), large onboarding headings |
| `text.screenTitle` | 20sp | Semibold | Sentence | AppBar titles, screen-level titles |
| `text.primaryCardContent` | 18sp | Semibold | Sentence | Chapter/goal/squad names inside Cards |
| `text.wordmark` | 17sp | Medium | Sentence | App wordmark (if in-app), invitation headlines |
| `text.standardCardName` | 16sp | Medium | Sentence | Standard card names, list row primary text, honor names |
| `text.secondaryContent` | 15sp | Regular | Sentence | Descriptions, secondary card body |
| `text.supportingMeta` | 14sp | Regular | Sentence | Athlete type, rank display, metadata in cards |
| `text.mutedSecondary` | 13sp | Regular | Sentence | Dates, time-ago, presence state labels, secondary metadata |
| `text.smallLabel` | 12sp | Regular | Sentence | Small labels, program association, character count |
| `text.sectionHeader` | 11sp | Regular | **ALL-CAPS** | Section headers **only** |

### 12.3 Typography Rules

**Decision CLA-D13 — Scale is locked:** The 12-step scale above is complete for V1. No intermediate sizes (e.g., 19sp, 21sp) may be introduced without a Component Library amendment.

**Decision CLA-D14 — ALL-CAPS is restricted:** Only `text.sectionHeader` (11sp) uses ALL-CAPS. This is enforced at the component level via `textTransform: 'uppercase'` in SectionHeader (CLA-C17) — it is not a formatting choice for callers. No other scale token may use ALL-CAPS.

**Decision CLA-D15 — Maximum weight is semibold:** No weight heavier than semibold is used. Font weight communicates hierarchy, not decoration.

**Truncation:** Text wraps and stacks at Dynamic Type larger sizes. Single-line truncation with ellipsis is permitted only in contexts explicitly documented in the governing wireframe spec (typically: list item primary text — 1 line; honor names — up to 2 lines; squad purpose — up to 2 lines).

---

## §13 — Empty, Loading & Error States

### 13.1 Empty States

**Default — Smart Omission:**
When a section has no content, the section and its SectionHeader are omitted entirely. No "Nothing here yet" row, no placeholder row, no empty box. This is the correct behavior for the majority of empty sections.

**Invitation copy** applies only to first-experience states where the athlete is expected to be genuinely uncertain. It uses EmptyState (CLA-C24) with warm, action-forward language. Examples from locked wireframe specs:
- S-1 (no squads): "Training alongside someone changes how it feels to show up."
- G-1 (no goals, active chapter): "What are you building toward?"
- H-1 (no active chapter): "Your training builds your legacy."

Never use: "empty," "nothing," "no results," "you haven't…," "you need to…" Language is always about what the athlete is building — not about what is absent.

### 13.2 Loading States

**Skeleton (CLA-C23)** is the default for content areas expected to take >200ms to load. Skeleton is suppressed if content resolves within 200ms (unified threshold — resolves the W-19/Activity-Detail discrepancy between 100ms and 200ms).

**Avatars** use AvatarGlyph initials placeholder during loading (not Skeleton shimmer).

**Buttons** show a spinner that replaces the label during async operations. The button remains full-width; no layout shift.

**Reduce Motion:** Skeleton shimmer becomes a static muted block. No animation.

### 13.3 Error States

**Network / content error (inline):** Calm inline text below the affected section, `text.mutedSecondary` scale (13sp), `text.secondary` color. A "Retry" Tertiary Button may follow. No red, no modal, no banner.

**Form validation error:** InputField (CLA-C14) `error` state — muted border tint + 13sp error text below field. No red background fill, no alert icon.

**Transient system error (non-blocking):** Toast (CLA-C22) `error` type. Message copy describes what happened. Auto-dismisses at 3s. No modal.

**Fatal error (rare):** Full-screen treatment with "Try Again" Secondary Button. This is a screen-routing concern, not a component concern; defined here for completeness only.

---

## §14 — Ownership & Reuse Rules

### 14.1 Tier Ownership

| Tier | Owner | Rule |
|---|---|---|
| Tier 1 — Primitives | Component Library | Never instantiated directly in screen code; always accessed through a Tier 2 wrapper |
| Tier 2 — Composites | Component Library | Any screen may import; customization via documented props only; never re-implemented in screen code |
| Tier 3 — Screen-level | Feature Area + Component Library | Feature area owns layout; this document owns reuse contract |

### 14.2 Reuse Rule

Any UI pattern that appears on two or more screens must be a Tier 2 or Tier 3 component. It may not be re-implemented inline on each screen.

### 14.3 Variant Rule

Component variants are defined in this architecture document. A new visual variant may not be added in screen-level code. If a screen requires a behavior not supported by an existing component's props, that behavior is added to this document via a formal Component Library amendment before the screen is implemented.

### 14.4 Prop Extension Rule

Tier 2 and Tier 3 components are extended through new props only. Forking (copying and modifying source) is prohibited. A forked component is, by definition, a new component and requires a formal amendment.

### 14.5 The Override Prohibition

**Decision CLA-D16** — Screen-level code may not override canonical component behavior. This includes: internal layout, state rendering logic, accessibility declarations, animation curves, token assignments, and sizing. A screen passes props to a component; it does not patch or shadow the component's internals. (This is CLA-P6 restated as a governance rule.)

---

## §15 — Future Component Expansion Governance

### 15.1 Adding a New Tier 2 Component

Before any new Tier 2 component is built:

1. **Check for coverage** — confirm no existing Tier 2 component satisfies the need, even with new props
2. **Draft an amendment** — file a Component Library Amendment document with:
   - Component ID (next available CLA-C number)
   - All required variants
   - All 8 states (§6)
   - Sizing and token assignments
   - Accessibility contract (label, role, traits, focus behavior)
   - Motion spec + Reduce Motion alternative
   - Composition rules
   - Governing principle acceptance test (all 6 principles from §2)
3. **Identify consumers** — list all screens that will adopt the new component; schedule reconciliation
4. **Lock the amendment** before any consuming screen begins implementation

### 15.2 Adding a New Tier 3 Component

- Self-approved by the feature area team
- Must compose from existing Tier 1 + Tier 2 only (no new visual atoms)
- Must comply with §8 (accessibility), §9 (motion), and §7.7 (token purity)
- Must be documented in the governing wireframe spec

### 15.3 Expansion Checklist

Before any new Tier 2+ component is considered LOCK-CANDIDATE:

- [ ] All 8 states defined (§6)
- [ ] Accessibility contract complete (`accessibilityLabel`, `accessibilityRole`, focus behavior, Reduce Motion)
- [ ] All 6 governing principles satisfied (§2)
- [ ] Token assignments named (no raw values)
- [ ] Motion spec + Reduce Motion alternative both defined
- [ ] Composition rules specified (what it can and cannot contain)
- [ ] Performance Firewall surface flag if applicable (§7.6)
- [ ] Downstream screen references updated

---

## §16 — Open Questions / Blockers

No open questions block LOCK-CANDIDATE status. All five questions are resolved or have accepted V1 defaults.

| ID | Question | Resolution |
|---|---|---|
| CLA-OQ-1 | **Typeface** | **RESOLVED** — System font: SF Pro on iOS, Roboto on Android. No custom typeface in V1. |
| CLA-OQ-2 | **Icon library** | **RESOLVED** — Phosphor Icons is the canonical V1 icon library. No mixing. Forge brand assets (logo, rank insignia, honor badges) are bespoke and excluded from this rule. |
| CLA-OQ-3 | **Light mode** | **RESOLVED** — Dark-only in V1. Single value per semantic color token. Light mode deferred to a future version. Token names are intentionally neutral to support light values later without restructuring. |
| CLA-OQ-4 | **WCAG level** | **DEFAULT: WCAG 2.1 AA.** The near-black/near-white palette almost certainly exceeds AA for primary text. Bronze accent on near-black must be verified against AA thresholds when hex values are confirmed. |
| CLA-OQ-5 | **Color hex values** | **DEFERRED** — No branding assets file exists in the repository. Semantic tokens are the V1 contract. Hex values are provided by a future Branding Assets document and bound at build time. |

---

## §17 — Downstream Reconciliation

The following documents should add a cross-reference pointer to this document once it is LOCKED. No content in those documents changes — only a header pointer is added noting that component behavior contracts are governed by `Component-Library-Architecture-v1.0.md`.

### Priority 1 — Active Workout & Rest Timer
| Document | Component IDs referenced |
|---|---|
| `Active-Workout-Flow-Spec-W9-W16.md` | CLA-C08, CLA-C12, CLA-C16, CLA-C18, CLA-C20 |
| `Amendments/W9-Amendment-003-Optional-Rest-Progress-Ring.md` | Note: ProgressRing is owned by `Rest-Timer-Architecture-v1.0.md` (LOCKED, Freeze Row 19), not this Component Library |

### Priority 2 — Core Screens
| Document | Component IDs referenced |
|---|---|
| `Squads-Hub-Wireframe-Spec-S1.md` | CLA-C29, CLA-C11, CLA-C24 |
| `Squad-Detail-Wireframe-Spec-S2.md` | CLA-C16 (MemberRow), CLA-C07, CLA-C17 |
| `Profile-Wireframe-Spec-P1.md` | CLA-C11, CLA-C07, CLA-C16, CLA-C21 |
| `Activity-Detail-Wireframe-Spec-W19.md` | §18 (Accessibility) is adopted as the governing pattern; CLA-C16, CLA-C12 |
| `Honors-Spec-L10.md` | CLA-C17 (collapsible variant), CLA-C28, CLA-C24 |
| `Honor-Detail-Sheet-Spec-L11.md` | CLA-C21, CLA-C23 |

### Priority 3 — Supporting Screens
| Document | Component IDs referenced |
|---|---|
| `Home-Screen-Wireframe-Spec-H1.md` | CLA-C25, CLA-C26, CLA-C37, CLA-C19, CLA-C18 |
| `Goal-Hub-Wireframe-Spec-G1.md` | CLA-C27, CLA-C12, CLA-C24 |
| `Rank-Up-Modal-Spec-M1.md` | CLA-C20, CLA-C08 |
| `Honor-Earned-Modal-Spec-M2.md` | CLA-C20, CLA-C08 |
| `Workout-Summary-Spec-W17.md` | CLA-C30, CLA-C20, CLA-C08 |
| `Activity-History-Wireframe-Spec-W18.md` | CLA-C30, CLA-C17, CLA-C23 |
| `Exercise-Detail-Wireframe-Spec-W22.md` | CLA-C09, CLA-C11, CLA-C12, CLA-C18 |
| `Exercise-Picker-Wireframe-Spec-W23.md` | CLA-C13, CLA-C31, CLA-C09, CLA-C21 |
| `Workout-Builder-Wireframe-Spec-W24.md` | CLA-C08, CLA-C16, CLA-C14, CLA-C21 |
| `M-3-Goal-Achieved-Spec.md`, `M-4-Program-Graduated-Spec.md`, `M-5-Chapter-Sealing-Confirmation-Spec.md`, `M-6-Destructive-Action-Confirmation-Spec.md`, `M-7-Premium-Upsell-Spec.md` | CLA-C20, CLA-C08 |

### Architecture Documents
| Document | Update needed |
|---|---|
| `Backend-Data-Model-Architecture-v1.0.1.md` | Add one-line pointer in §2: component display contracts for all entities are governed by CLA-v1.0 |
| `Forge-Legacy-Master-PRD.md` | Add CLA to §0 architecture cross-references |
| `Forge-Legacy-Master-Status.md` | Mark Freeze Row 18 ✅ Complete at time of LOCK |

---

*Component Library Architecture v1.0 — Forge Legacy — 2026-06-30*
