# Forge Legacy Design System v1.0

**Status:** ACTIVE — Visual Source of Truth
**Version:** 1.0
**Created:** 2026-06-30
**Audience:** Claude Design, screen authors, component implementers
**Authority:** This document governs visual decisions — aesthetics, hex values, visual depth rules, brand guardrails, and component visual contracts. For behavioral contracts, state management, and reuse rules, defer to `Component-Library-Architecture-v1.0.md` (LOCKED).

---

## §1 — Visual Identity

### The Forge Legacy Aesthetic

Forge Legacy should feel **premium, dark, disciplined, cinematic, athletic, and legacy-driven**.

It is not a fitness tracker. It is a permanent record of what you built. The visual language must communicate that weight: that what happens here is earned, kept, and remembered.

**Five words that define the visual tone:**
> Forged. Grounded. Earned. Cinematic. Permanent.

**Five words that must never describe it:**
> Playful. Neon. Flat. Generic. Urgent.

---

## §2 — Color System

### 2.0 ⭐ THE TWO-THEME RULE — which side of the app a change lands on

**LOCKED — PO, 2026-08-25.** Forge Legacy ships two themes: **Forge** (dark) and **Alabaster** (light,
`foundation.paper.ts`). Every visual change has to answer one question before it is made — *does this
belong to one theme or to both?* — and the answer is not a judgement call:

| What is changing | Applies to |
|---|---|
| **Layout** — position, order, spacing, hierarchy, what sits where | **BOTH themes** |
| **Shape or form** — geometry, radii, structure, what a screen is composed of, adding or removing an element | **BOTH themes** |
| **Colour** — palette, fill, texture strength, contrast, opacity, border weight *as a colour decision* | **ONE theme**, 99% of the time |

> PO: *"If we are changing layout it changes on both the light and dark side. If we are adding or
> changing shape or form of the screen it's for both. If it's color specific then it'll 99% of the time
> be either for light or dark."*

**Why it is worth stating.** The two palettes live in sibling files and a change made while looking at
one theme is physically easy to make in one file. That is correct for a colour and a silent defect for
anything else: a layout fix applied to Alabaster only leaves Forge with the bug the PO reported, and
nobody finds out until somebody switches themes. The rule turns "which file do I edit" from an instinct
into a check.

**The 1%.** A colour change crosses over when it is not really about colour — a token that encodes
*state* rather than appearance (a semantic good/warning/critical), or a contrast fix that is a legibility
requirement in both themes. State it explicitly when you take that exception; the default is one side.

⚠ **THE COMPILER ENFORCES THE HALF IT CAN.** `foundation.forge.ts` exports the shape types both palettes
must satisfy, so adding a colour to one file and not the other is a build error. Nothing enforces the
other direction — a layout edit made in a themed component is invisible to the type system — which is
exactly why this rule is written down rather than left to the tokens.

---

### 2.1 Implementation

All colors are defined in `src/constants/tokens.ts` under the `color` export. Do not use raw hex values in screens or components — reference named tokens only.

```ts
import { color } from '@/constants/tokens'
// or
import { Theme } from '@/constants/tokens'
```

---

### 2.2 Background Colors

| Token | Hex | Role |
|---|---|---|
| `color.background.primary` | `#0E0E12` | Main app canvas — near-black charcoal with a very slight warm undertone |
| `color.background.surface` | `#111118` | Card surface — one lightness step above canvas |
| `color.background.elevated` | `#18181F` | Sheets and modals — noticeably above card |
| `color.background.overlay` | `rgba(0,0,0,0.75)` | Modal dimming backdrop |

**Visual principle:** Backgrounds must feel *deep*, not flat. The slight warm undertone in `#0E0E12` (vs. a cold blue-black) allows amber accents to read as warm light, not contrast noise.

---

### 2.3 Text Colors

| Token | Hex | Role |
|---|---|---|
| `color.text.primary` | `#F0EDE8` | Body text — slightly warm near-white, not sterile pure white |
| `color.text.secondary` | `#9E9890` | Supporting text — muted warm gray |
| `color.text.tertiary` | `#666060` | Very muted — section labels, placeholders, chevrons |
| `color.text.inverse` | `#09090C` | Dark text for use on light/accent surfaces |

**Contrast targets (WCAG 2.1 AA):**
- `text.primary` on `background.primary`: ~15:1 — passes large and body text
- `text.secondary` on `background.primary`: ~6:1 — passes body text
- `text.tertiary` on `background.primary`: ~3:1 — passes large text; document exceptions for 11sp section labels

---

### 2.4 Accent Colors — Bronze / Warm Gold System

The bronze accent is the most important visual element in Forge Legacy. It communicates **earned recognition**. It marks progress, achievement, and legacy — not excitement, novelty, or alerts.

| Token | Hex | Role |
|---|---|---|
| `color.accent.primary` | `#C8A97E` | Primary accent — active states, progress fill, tappable links, earned markers |
| `color.accent.muted` | `#7A6040` | Muted accent — progress track tint, ambient glow backgrounds |
| `color.accent.highlight` | `#DFC49A` | Highlight — pressed / hover state on accent surfaces |
| `color.accent.glow` | `rgba(200,169,126,0.10)` | Ambient amber wash — background glow only, never a fill |

**CLA-P1 rule:** Every use of an accent token must pass this test: *Does this surface communicate something the athlete built?* If not, use a secondary or tertiary color instead.

---

### 2.5 Semantic Feedback Colors

| Token | Hex | Role |
|---|---|---|
| `color.success` | `#5A9E68` | Achievement confirmation, completion checkmarks |
| `color.warning` | `#C8A97E` | Warning — same hue family as accent (amber) |
| `color.danger` | `#A85252` | Danger state — muted crimson |
| `color.info` | `#4A7CA0` | Informational — muted steel blue (rare) |
| `color.destructive` | `#A85252` | **RESERVED**: M-6 Confirm CTA + L-13 Delete ONLY |

**Critical:** `color.destructive` may not be used for urgency, warning, or general emphasis. It is reserved for the two specific confirmed-destructive surfaces defined in `Component-Library-Architecture-v1.0.md` CLA-D8.

---

### 2.6 Difficulty Colors

| Token | Hex | Label |
|---|---|---|
| `color.difficulty.beginner` | `#5A9E68` | Beginner — muted green |
| `color.difficulty.intermediate` | `#C8A97E` | Intermediate — amber (same as accent) |
| `color.difficulty.advanced` | `#A85252` | Advanced — muted crimson |

Per CLA-D2: color is never the sole differentiator. Every difficulty chip must also carry a text label.

---

### 2.7 Border Colors

| Token | Hex | Role |
|---|---|---|
| `color.border.subtle` | `#222229` | Divider lines, input borders, card definition edges |
| `color.progressTrack` | `#222229` | Unfilled ProgressBar track |
| `color.skeleton` | `#18181F` | Skeleton shimmer base |

**Note:** borders are used sparingly. Card definition primarily comes from surface color contrast, not from drawn borders. `border.subtle` appears where a line is genuinely needed to separate content — not to define every block.

---

### 2.8 Presence Colors (Squad surfaces only)

| Token | Hex | Role |
|---|---|---|
| `color.presence.active` | `#C8A97E` | "Trained today" — accent-tinted |
| `color.presence.recent` | `#9E9890` | "Trained this week" — secondary |
| `color.presence.inactive` | `#666060` | "Not yet this week" — muted (never red, never orange) |

Presence colors appear only on Squad surfaces (Performance Firewall — CLA-P3).

---

## §3 — Typography System

### 3.1 Typeface

**Platform system font** — SF Pro on iOS, Roboto on Android. Zero licensing cost, zero load time, full Dynamic Type support.

**Why system font:** Forge Legacy's typographic quality comes from scale, weight, and spacing choices — not from a custom typeface. A premium feel at this stage is achieved through discipline of the type system, not through a decorative font.

**Font family token:** `typography.fontFamily.system` (resolves to platform default)

---

### 3.2 Type Scale

12-step locked scale. No intermediate sizes without a Component Library amendment (CLA-D13).

| Scale Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `exerciseTitle` | 28sp | Semibold | 34 | -0.3 | Exercise names in active workout card; ceremony modal headlines |
| `screenSectionHeading` | 24sp | Semibold | 30 | -0.2 | Section headings within a screen |
| `largeHeading` | 22sp | Semibold | 28 | -0.2 | Profile display name (P-1 Tier 1), large onboarding headings |
| `screenTitle` | 20sp | Semibold | 26 | -0.2 | AppBar titles, screen-level titles |
| `primaryCardContent` | 18sp | Semibold | 24 | -0.1 | Chapter / goal / squad names inside Cards |
| `wordmark` | 17sp | Medium | 22 | 0 | App wordmark, invitation headlines |
| `standardCardName` | 16sp | Medium | 22 | 0 | Standard card names, list row primary text, honor names |
| `secondaryContent` | 15sp | Regular | 21 | 0 | Descriptions, secondary card body, search input |
| `supportingMeta` | 14sp | Regular | 20 | 0 | Athlete type, rank, metadata in cards |
| `mutedSecondary` | 13sp | Regular | 18 | 0 | Dates, time-ago, presence labels, secondary metadata |
| `smallLabel` | 12sp | Regular | 16 | 0 | Small labels, program association, character count |
| `sectionHeader` | 11sp | Regular | 14 | +0.8 | **Section headers ONLY — always ALL-CAPS** |

**Typography rules:**
- Maximum weight is Semibold (CLA-D15). No Bold or Black.
- ALL-CAPS is restricted to `sectionHeader` only (CLA-D14).
- Text wraps and stacks at Dynamic Type larger sizes — no fixed-height text containers.
- Single-line truncation with ellipsis is only permitted where the governing wireframe spec explicitly documents it.

---

### 3.3 Typographic Hierarchy — Visual Intent

| Level | Token | Color Token | Intent |
|---|---|---|---|
| Display | `exerciseTitle` | `text.primary` | Command attention; earned achievement |
| Title | `screenTitle` / `largeHeading` | `text.primary` | Screen identity |
| Heading | `primaryCardContent` | `text.primary` | Card / section entity name |
| Body | `secondaryContent` | `text.secondary` | Supporting detail, descriptions |
| Caption | `mutedSecondary` | `text.secondary` | Timestamps, metadata, status |
| Label | `smallLabel` | `text.tertiary` | Inline labels, counts, associations |
| Stat | `screenSectionHeading` | `color.accent.primary` | Achievement numbers, key stats |
| Meta | `sectionHeader` | `text.tertiary` | Section grouping labels |

---

## §4 — Spacing & Radius System

### 4.1 Spacing Scale

| Token | Value | Use |
|---|---|---|
| `space.xs` | 4dp | Micro gaps — element sub-spacing within dense contexts |
| `space.sm` | 8dp | Internal card element gaps |
| `space.md` | 12dp | Card-to-card gap in scroll lists |
| `space.lg` | 16dp | Screen horizontal margin; card inner padding |
| `space.xl` | 24dp | Above SectionHeaders; major element separation |
| `space['2xl']` | 32dp | Major section breaks; between primary screen sections |

### 4.2 Radius Scale

| Token | Value | Use |
|---|---|---|
| `radius.card` | 8dp | Card containers, Surface containers |
| `radius.chip` | 99dp | Chips, ProgressBar ends, Badge pill |
| `radius.image` | 4dp | Exercise thumbnails, photo thumbnails |
| `radius.avatar` | 9999 | Full circles — all avatar sizes |

**Design intent:** `radius.card` (8dp) is intentionally conservative — it communicates *solid, grounded, architectural* surfaces rather than soft or bubbly ones. Cards should feel like slabs of premium dark material, not floating bubbles.

---

## §5 — Component Visual System

All component behavioral contracts live in `Component-Library-Architecture-v1.0.md`. This section defines visual rules for each component — what it looks like, what depth it has, how states change it visually.

---

### 5.1 App Background

- Color: `color.background.primary` (`#0E0E12`)
- Full-screen; no texture, no pattern, no gradient on the base canvas
- The warmth of `#0E0E12` vs. pure black is the foundation that allows amber accents to glow rather than glare

---

### 5.2 Page Container

- Horizontal padding: `space.lg` (16dp) from screen edge
- Top safe-area inset: provided by `react-native-safe-area-context`
- Bottom safe-area inset: `space.lg` + safe area to clear TabBar
- Max content width: `layout.maxContentWidth` (800dp) on tablet/web; centered

---

### 5.3 AppBar (CLA-C18)

- Background: `color.background.primary` — blends with canvas (no distinct bar color)
- Bottom divider: optional 1px `color.border.subtle` line when content scrolls beneath it
- Title: `typography.scale.screenTitle`, `color.text.primary`
- Back icon: `color.text.primary`, 44dp touch target
- AppBar is hidden in Active Workout (W9–W16) full-screen mode

---

### 5.4 Hero Section

Used for identity cards, chapter headers, and primary screen openers.

- Background: `color.background.surface` with optional inner-edge amber glow: `color.accent.glow` as a radial gradient wash at the top or top-right
- Corner radius: `radius.card` (8dp)
- Inner top border: 1px `color.innerHighlight` across the top edge for subtle elevation highlight
- Shadow: `shadow.card` values
- Content: premium, minimal — athlete name in `largeHeading`, supporting metadata in `mutedSecondary`

---

### 5.5 Cards — Visual Contract

**Standard Card (CLA-C07 default variant):**
- Background: `color.background.surface` (`#111118`)
- Corner radius: `radius.card` (8dp)
- Inner padding: `space.lg` (16dp) all sides
- Top edge inner highlight: 1px `color.innerHighlight` (`rgba(255,255,255,0.04)`) — this subtle highlight gives the card a sense of physical presence, as if lit from above
- Shadow: `shadow.card`
- No border by default. A border using `color.border.subtle` is added only when the card sits on a surface with the same color (rare — e.g., a card inside a sheet)

**Elevated Card (CLA-C07 elevated variant):**
- Background: slightly closer to `#13131C` — one notch above standard surface
- Stronger top inner highlight: `color.innerHighlightMd`
- Shadow: `shadow.elevated`
- Used for the P-1 Chapter Card (personal identity surface)

**Hero Card (CLA-C07 hero variant):**
- Full-width treatment; may use a background image with a dark overlay
- Ambient amber glow: `color.accent.glow` radial wash
- Deeper shadow: `shadow.elevated`

---

### 5.6 Specific Card Types

**Chapter Card (CLA-C25):**
- Elevated variant with identity-level visual weight
- Chapter name: `primaryCardContent` scale, `color.text.primary`
- Status badge / chapter number: `smallLabel` scale, `color.accent.primary`

**Program Card (CLA-C26):**
- Default Card variant
- Program name: `standardCardName`, `color.text.primary`
- Metadata row: `mutedSecondary`, `color.text.secondary`
- Difficulty chip bottom-left

**Honor / Badge Card (CLA-C28):**
- Default Card variant
- Badge glyph: `size.iconBadge` (72dp) centered or leading
- Honor name: `standardCardName`, `color.text.primary`
- Earned date: `mutedSecondary`, `color.text.tertiary`
- Accent ring or dot on earned honors: `color.accent.primary`

**Stat Card:**
- Surface: `color.background.surface`
- Stat number: `screenSectionHeading` scale (24sp Semibold), `color.accent.primary`
- Stat label: `smallLabel` scale, `color.text.secondary`
- Use only for genuinely significant metrics — not decorative numbers

**Progress Card:**
- Progress bar: `size.progressBarHeight` (6dp), fill `color.accent.primary`, track `color.progressTrack`
- Percentage label: `mutedSecondary` scale, `color.text.secondary`

---

### 5.7 Buttons (CLA-C08)

| Class | Background | Border | Text Color | Use |
|---|---|---|---|---|
| `Primary` | `color.accent.primary` | None | `color.text.inverse` | Highest priority; one per viewport |
| `Secondary` | Transparent | `color.accent.primary` | `color.accent.primary` | Standard action |
| `Tertiary` | None | None | `color.accent.primary` | Subordinate / "View all →" |
| `Icon` | Transparent | None | `color.text.primary` | Compact icon-only action |

**States:**
- `pressed`: 80% opacity; immediate ~50ms response
- `disabled`: 40% opacity; no color change
- `loading`: spinner replaces label; button holds full width

**Primary Button visual intent:** Warm amber bronze fill communicates that this action moves the athlete forward. Reserve it for that meaning.

---

### 5.8 Chips / Tags (CLA-C09)

| Type | Background | Border | Text |
|---|---|---|---|
| `Filled` | `color.accent.muted` | None | `color.accent.highlight` |
| `Outlined` | Transparent | `color.border.subtle` | `color.text.secondary` |
| `Filter` | Transparent | `color.border.subtle` | `color.text.secondary` + trailing × |
| `Status` | Varies by dot color | None | `color.text.secondary` |

- Height: 28–32dp; `radius.chip` (99dp) for pill shape
- Text: `smallLabel` scale (12sp)

---

### 5.9 Tabs (CLA-C19 TabBar)

- Bar background: `color.background.primary` (blends with canvas; not a distinct surface)
- Top edge: 1px `color.border.subtle` to separate from scroll content
- Unselected: icon + label in `color.text.tertiary`
- Selected: icon (Filled weight) + label in `color.accent.primary`
- Tabs: Home · Workouts · Legacy · Squads (4 total)
- No background fill behind selected tab icon — selection expressed through icon weight + label color only

---

### 5.10 Bottom Navigation (TabBar — same as §5.9)

Safe area handling: The TabBar respects the bottom safe area inset. Content beneath the TabBar must also clear this area using `react-native-safe-area-context`.

---

### 5.11 Forms / Inputs (CLA-C13 SearchBar, CLA-C14 InputField, CLA-C15 TextArea)

**InputField:**
- Background: `color.background.surface`
- Border (default): 1px `color.border.subtle`
- Border (focused): 1px `color.accent.primary`
- Border (error): 1px `color.danger` (muted, not red-fill)
- Label: `smallLabel`, `color.text.secondary`
- Input text: `secondaryContent`, `color.text.primary`
- Error text: `smallLabel`, `color.text.secondary` (calm, not alarming — CLA-D3)
- Min height: 44dp

**SearchBar:**
- Same surface treatment as InputField
- Leading search icon: `color.text.tertiary`
- Clear icon: `color.text.secondary`

---

### 5.12 List Rows (CLA-C16 ListItem)

- No background (rows sit on their parent container surface)
- Divider: `color.border.subtle` 1px, optional, inset from leading element
- Primary text: `standardCardName` or `secondaryContent`, `color.text.primary`
- Secondary text: `mutedSecondary`, `color.text.secondary`
- Trailing chevron: `size.iconInline` (16dp), `color.text.tertiary`
- Pressed: subtle background highlight — `color.background.elevated` or 5% white overlay

---

### 5.13 Empty States (CLA-C24)

- Icon (optional): 48dp, `color.text.tertiary`, Decorative role
- Primary copy: `primaryCardContent` (18sp), `color.text.primary` — aspirational, never apologetic
- Secondary copy: `secondaryContent`, `color.text.secondary`
- Default: section omitted entirely (Smart Omission). EmptyState only for first-experience states.

**Voice:** Warm, forward, earned. Never: "empty," "nothing," "no results," "you haven't."

---

### 5.14 Modals / Bottom Sheets

**Modal (CLA-C20) — Ceremony:**
- Background: `elevation.modal` (`#1F1F28`)
- Overlay: `color.background.overlay` (75% black)
- Shadow: `shadow.modal`
- Corner radius: `radius.card` (8dp)
- Max width: `size.modalMaxWidth` (340dp)
- Inner highlight: 1px `color.innerHighlightMd` on top edge
- Padding: 24dp all sides
- Dismiss: explicit CTA only — no tap-outside dismiss

**Bottom Sheet (CLA-C21) — Utility:**
- Background: `color.background.elevated` (`#18181F`)
- Handle: centered, 4dp tall × 32dp wide, `color.border.subtle`
- Shadow: `shadow.elevated`
- Top corner radius only: `radius.card` (8dp)
- Dismiss: tap outside, swipe down, or × button

---

### 5.15 Toasts / Alerts (CLA-C22)

- Background: `color.background.elevated`
- Border: optional 1px `color.border.subtle` to separate from background
- Text: `secondaryContent` scale (15sp), `color.text.primary`
- Auto-dismiss: 3 seconds; fade begins at 2.7s
- Position: above TabBar, full-width within screen margins
- No red background. Error tone is carried in copy, not color.

---

## §6 — Component States

Eight canonical states (source: `Component-Library-Architecture-v1.0.md` §6):

| State | Visual Treatment |
|---|---|
| `default` | Standard resting appearance |
| `pressed` | 80% opacity; ~50ms; spring easing |
| `disabled` | 40% opacity; pointer-events none; no color change |
| `loading` | Spinner replaces label; Skeleton replaces content sections |
| `error` | Muted border tint + inline text (no red fill, no modal) |
| `success` | `color.success` accent or ✓ indicator |
| `selected` | Filled chip; accent-colored tab; highlighted row background |
| `focused` | Visible focus ring for keyboard / switch-access navigation |

**The Absence Rule (CLA-D8):** Absence of data is never expressed as `error`. Muted secondary color is the correct treatment for neutral absence.

---

## §7 — Layout Rules

### 7.1 Mobile-First Layout

All screen designs are authored for mobile (375dp reference width — iPhone 15 viewport). Tablet / desktop behavior is constrained by `layout.maxContentWidth` (800dp) with centered content.

### 7.2 Safe Area Handling

- Top: always respect safe area (status bar region)
- Bottom: always respect safe area (home indicator region)
- Horizontal: safe areas respected; all content within `screenPaddingH` from screen edge

### 7.3 Page Padding

- Horizontal: `space.lg` (16dp) from screen edge — uniform, applies to all screens
- Vertical scroll: content starts after AppBar; bottom inset clears TabBar + safe area

### 7.4 Card Spacing

- Between sibling cards in a list: `space.md` (12dp)
- Card inner padding: `space.lg` (16dp) all sides
- Section header above first card: `space.xl` (24dp) above + `space.sm` (8dp) below

### 7.5 Section Spacing

- Above SectionHeader: `space.xl` (24dp)
- Below SectionHeader (before content): `space.sm` (8dp)
- Between major screen sections: `space['2xl']` (32dp)

### 7.6 Scroll Behavior

- ScrollViews are the default for list screens
- No horizontal scroll except explicitly defined carousels (e.g., H-1 Featured Moments)
- No nested ScrollViews without architectural justification
- Pull-to-refresh is supported on data-driven screens

### 7.7 Avoiding Clutter

- No more than one primary CTA per viewport
- SectionHeaders before every content grouping (no unlabeled sections)
- Smart Omission for empty sections — do not show headers with no content beneath them
- Maximum 2 metadata lines per card before truncation or "expand" pattern
- No horizontal spacing below minimum 16dp from screen edge

---

## §8 — Visual Depth System

The core principle: **depth through material, not through borders.**

### 8.1 Layered Backgrounds

Three physical layers from deepest to nearest:

| Layer | Color | Surface |
|---|---|---|
| Canvas | `#0E0E12` | App background — the void beneath everything |
| Card | `#111118` | Entity cards — slightly elevated from canvas |
| Sheet / Modal | `#18181F` | Utility sheets and ceremony modals |

The distinction between layers is created by these three color steps alone. A card is visually *lifted* from the canvas without any border.

### 8.2 Borders — Used Sparingly

- `color.border.subtle` (`#222229`) is used for:
  - Input field outlines
  - Explicit dividers (CLA-C03) between list sections
  - TabBar top edge separator
  - Optional card edge definition when card sits on elevated surface
- **Never used:** to decorate every element, as a default on all cards, or as a substitute for proper surface color contrast

### 8.3 Shadows

- `shadow.card` on standard entity cards
- `shadow.elevated` on sheets, profile modals, and elevated cards
- `shadow.modal` on ceremony modals
- Shadows are invisible on very dark backgrounds — their value comes from peripheral perception of depth, not from visible drop shadow rendering

### 8.4 Inner Highlights

A 1px `rgba(255,255,255,0.04)` line along the top edge of elevated surfaces creates a subtle sense of a physically lit top surface — as if the card is a dark slab with light catching its top edge.

- Standard surface: `color.innerHighlight` — 4% white
- Elevated / modal surface: `color.innerHighlightMd` — 7% white
- Applied as a top border (`borderTopWidth: 1, borderTopColor: color.innerHighlight`) or as a subtle gradient

### 8.5 Ambient Amber Glow

The bronze accent creates ambient warmth when used as a glow wash:

- `color.accent.glow` — `rgba(200, 169, 126, 0.10)` — 10% bronze
- Used on Hero section backgrounds as a radial wash, typically at top-right or center-top
- Used on the identity card / chapter header to communicate warmth and earned weight
- **Not used:** as a fill, as a glow ring, on standard list cards, or as a highlight on every element

**Rule:** the glow should feel like ambient light from a source above and slightly behind the screen. It is atmospheric, not decorative.

### 8.6 Visual Depth — What Not to Do

- **No harsh outlines** — don't border every card with a visible line
- **No flat gray blocks** — every surface has a specific elevation-step color; neutral gray is not in the palette
- **No glassmorphism** — no blur backgrounds, no frosted glass effects, no translucent panels
- **No transparent cards** — surfaces must be solid; depth comes from color steps, not from see-through materials
- **No neon glow** — the amber glow is warm and subtle; it does not pulse, bloom, or compete with content
- **No gradient overload** — backgrounds are solid; gradients are used only for the ambient glow wash on Hero sections

---

## §9 — Motion System

### 9.1 Motion Values

| Interaction | Duration | Easing | Reduce Motion |
|---|---|---|---|
| Toggle / favorite tap | 50ms | Spring | Instant |
| Image crossfade (media load) | 200ms | ease-in-out | Instant |
| Section collapse / expand | 150ms | ease-out | Instant |
| Skeleton → content | 150ms | ease-in-out | Instant (static block) |
| BottomSheet slide-up | 250ms | ease-out | Instant |
| Modal fade-in | 200ms | ease-out | Instant |
| Toast fade-out | 300ms (at 2.7s) | ease-in | Instant at 3s |
| Rank Up ceremony reveal | 500ms | ease-out | Instant |

### 9.2 Motion Principles

1. Motion serves comprehension, not impression.
2. Ceremony moments earn motion — utility screens are instant.
3. Duration scales with distance and significance.
4. Fill direction only — ProgressBar fills, never depletes. (CLA-P2)
5. Reduce Motion is authored simultaneously with motion — not a post-launch pass.

---

## §10 — Brand Rules

### 10.1 Do

- Use deep charcoal near-black as the canvas — never pure `#000000` black, which reads as void rather than depth
- Use warm cream near-white for text — `#F0EDE8` reads as natural in warm lighting
- Reserve the bronze accent for earned, active, and legacy surfaces
- Let surface color steps do the heavy lifting for depth — not borders
- Apply inner highlights on elevated surfaces to suggest physical weight and lit surfaces
- Use the amber glow wash on Hero sections — atmospheric, earned, cinematic
- Keep cards solid — they are slabs of premium dark material, not floating translucent panels
- Use Semibold as the maximum type weight — strength through restraint
- Give empty space room to breathe — the absence of clutter is itself a premium signal
- Make achievement surfaces feel *significant* — ceremony modals earn animation, utility screens do not

### 10.2 Do Not

- Do not use pure `#000000` black as the app background — it reads as a void, not a canvas
- Do not use bright yellow, neon gold, or vivid orange as accent colors — amber bronze is warm and earned, not exciting
- Do not use blue-purple sci-fi effects, gradients, or haze
- Do not use glassmorphism — no blur panels, no frosted backgrounds
- Do not make cards transparent or semi-transparent
- Do not add glow to standard cards — glow is reserved for Hero sections and identity surfaces
- Do not use red for absence, streaks, or missed workouts — red is reserved for confirmed-destructive actions only
- Do not use pulsing, blinking, or color-shifting states tied to absence or urgency
- Do not add borders to every element — visual definition comes from surface color contrast
- Do not use ALL-CAPS for anything other than SectionHeaders
- Do not use font weights heavier than Semibold
- Do not design per-screen — every reusable UI pattern must be a named component from the library
- Do not use linear easing — motion is either spring or ease-in/ease-out
- Do not clutter screens with more than one primary CTA per viewport

---

## §11 — Implementation Guide

### 11.1 Importing Tokens

**Named imports (preferred for components — allows tree-shaking):**
```ts
import { color, space, radius, typography, size } from '@/constants/tokens'
```

**Composed import (convenient for screen code):**
```ts
import { Theme } from '@/constants/tokens'
// Usage: Theme.color.accent.primary, Theme.space.lg, etc.
```

**Legacy components (backward compat):**
```ts
import { LC, LS } from '@/constants/legacy-theme'
// These map to canonical token values — see legacy-theme.ts for migration guide.
```

### 11.2 Applying Tokens in StyleSheet

```ts
import { StyleSheet } from 'react-native'
import { color, space, radius, typography } from '@/constants/tokens'

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.background.surface,
    borderRadius: radius.card,
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: color.innerHighlight,
  },
  cardTitle: {
    ...typography.scale.primaryCardContent,
    color: color.text.primary,
  },
  accentLabel: {
    ...typography.scale.smallLabel,
    color: color.accent.primary,
  },
})
```

### 11.3 Typography Spread Pattern

Typography scale tokens include all text styling fields. Spread them into StyleSheet styles:

```ts
// Do this:
{ ...typography.scale.standardCardName, color: color.text.primary }

// Not this:
{ fontSize: 16, fontWeight: '500' }  // raw values prohibited (CLA-D10)
```

### 11.4 Elevation via Background Color

```ts
// Elevation = surface background color
const containerStyle = {
  backgroundColor: elevation.card,     // card surface
  // or
  backgroundColor: elevation.sheet,    // bottom sheet
  // or
  backgroundColor: elevation.modal,    // ceremony modal
}
```

### 11.5 Shadow Application (iOS / Android)

```ts
import { shadow } from '@/constants/tokens'

// Standard card:
const cardStyle = { ...shadow.card, backgroundColor: color.background.surface }

// Note: React Native shadow props (shadowColor, shadowOffset, etc.) are iOS only.
// Android elevation property is included in each shadow token for cross-platform.
```

### 11.6 Backward Compatibility

- Existing `src/constants/theme.ts` (`Colors`, `Fonts`, `Spacing`) is preserved unchanged.
- Existing `src/constants/legacy-theme.ts` (`LC`, `LS`) is updated to align with canonical values but remains exported at the same names.
- No existing Legacy prototype components need to be changed — `LC.*` values now match `Theme.color.*` equivalents.
- `src/hooks/use-theme.ts` continues to work as before.

### 11.7 When Building a New Screen

1. Import tokens from `@/constants/tokens`
2. Use the composed component library (CLA-C01 through CLA-C37) — do not re-implement patterns
3. Reference only named tokens in `StyleSheet.create` — no raw hex or magic numbers
4. Follow the layout rules from §7 of this document
5. Reference the governing wireframe spec for that screen's layout composition

---

## §12 — Reference Alignment

The Forge Legacy visual direction is defined by these reference qualities. When designing any new screen or component, verify it aligns with all five:

1. **Premium dark canvas** — `#0E0E12` warm-tinted near-black background with clear surface lift on cards
2. **Warm bronze/gold lighting** — `#C8A97E` accent on progress, earned states, active navigation; ambient glow on Hero
3. **Deep layered cards** — solid surfaces with elevation color steps, inner top-edge highlights, and subtle shadows
4. **Strong central identity** — profile and chapter cards have elevated visual weight; they command the screen
5. **Minimal, meaningful details** — every visual element earns its place (CLA-P4); silence and space are deliberate

---

## §13 — Document Relationships

| Document | Relationship |
|---|---|
| `Component-Library-Architecture-v1.0.md` | **Behavioral authority** — component contracts, states, reuse rules, token names |
| `src/constants/tokens.ts` | **Implementation** — hex values bound to token names from CLA |
| `FORGE_LEGACY_PRODUCT_DNA.md` | **Parent** — visual philosophy and UX principles |
| All wireframe specs (H-1 through P-9, W-1 through W-28, etc.) | **Consumers** — reference components and tokens from this system |
| `src/constants/legacy-theme.ts` | **Legacy compat layer** — existing legacy prototype (LC/LS); points to canonical tokens |

---

*Forge Legacy Design System v1.0 — Visual source of truth for all Claude Design screen work.*
