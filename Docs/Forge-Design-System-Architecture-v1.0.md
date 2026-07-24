# Forge Design System Architecture v1.0

**Status:** LOCKED
**Version:** 1.1
**Created:** 2026-07-01
**Author:** Architecture session, 2026-07-01
**Amendment Log:**
- v1.0 — Initial.
- v1.1 (2026-07-02) — Documentation-consistency audit reconciliation, per §16 Maintenance: this document's own mandate that it "must never become stale" had been violated — §14 was missing the already-committed Navigation Library v1.0 (`9d199a6`) and Progress Library v1.0 (`374563f`), and §15 still listed both (plus the also-already-committed Modal & Overlay Library) as "Not started"/"Remaining." Added Navigation and Progress subsections to §14 (matching the existing Button/Input/Card/Modal pattern); moved Modal, Navigation, and Progress from §15's "Remaining" tables into "Completed"; removed Navigation/Progress from §14's "Planned Libraries" table. Also strengthened the §15 Roadmap Notes' `ProgressRing` exclusion language for consistency with `Component-Library-Architecture-v1.0.md` and `Rest-Timer-Architecture-v1.0.md`. No design/behavioral decisions changed — implementation-status bookkeeping only.

---

## Overview

This document is the permanent architectural authority for every reusable UI component created for Forge Legacy. It governs how component libraries are designed, structured, implemented, exported, validated, and maintained — from initial design through production commit.

**Relationship to Component Library Architecture:**
`Component-Library-Architecture-v1.0.md` (LOCKED) governs the V1 component catalog — what 37 components exist, what variants they support, and what tokens they consume. This document governs the *engineering discipline* applied to every library — past, present, and future. The two documents are complementary; when a conflict arises, this document governs process and structure; the CLA governs component behavior contracts.

**Every Claude session that implements a component library must read this document before writing any code.**

---

## §1 — Purpose

### 1.1 What This Document Governs

This document defines the standards that every reusable UI component library in Forge Legacy must satisfy. It covers:

- Design philosophy and visual principles
- Component hierarchy and the four-level system
- Repository structure and folder conventions
- Rules every component must obey
- Token usage and the distinction between global and component-scoped tokens
- Naming conventions for files, components, props, and types
- Required visual states and accessibility standards
- Composition rules that prevent duplication
- Export contracts that ensure clean barrel access
- The validation workflow every library must complete before commit
- The verification checklist used to confirm compliance
- Current locked library status and future roadmap
- Governance of this document itself

### 1.2 Authority

Every reusable UI component created for Forge Legacy must conform to this architecture. Any component that does not satisfy these rules is considered non-compliant and must be corrected before it is committed.

Application screens consume the design system. Screens do not implement custom UI. If a UI pattern is used on more than one screen, or if it is complex enough to need state management, it belongs in the design system — not in a screen file.

### 1.3 What This Document Does Not Govern

- Screen-level layout and composition — governed by individual wireframe specs
- Component behavioral contracts, variants, and state definitions — governed by `Component-Library-Architecture-v1.0.md` (LOCKED)
- Visual identity: hex values, brand color assignments, and depth rules — governed by `Forge-Legacy-Design-System-v1.0.md` (ACTIVE)
- Design token semantic names and taxonomy — governed by `Component-Library-Architecture-v1.0.md` §10
- The Rest Timer ProgressRing component — governed by `Rest-Timer-Architecture-v1.0.md` (LOCKED)
- Program and exercise content — governed by program authoring standards

### 1.4 Document Relationships

| Document | Relationship |
|---|---|
| `FORGE_LEGACY_PRODUCT_DNA.md` | Parent — visual and product philosophy |
| `Component-Library-Architecture-v1.0.md` | Peer — governs component catalog and behavior contracts |
| `Forge-Legacy-Design-System-v1.0.md` | Peer — governs hex values, depth rules, brand identity |
| `src/constants/tokens.ts` | Implementation — canonical token source consumed by all libraries |
| All wireframe specs | Consumers — reference components by name; defer to CLA for behavior |

---

## §2 — Design Philosophy

The following principles govern every design and implementation decision in the Forge Legacy component system. A proposed component that contradicts any of these principles is rejected until it is brought into compliance.

### 2.1 Premium Dark Interface

Forge Legacy is a premium product. Every component must feel deliberate, refined, and high-craft. The background palette is warm near-black with subtle depth. No surface should feel flat, washed-out, or generic. The visual weight of the UI communicates permanence, not velocity.

### 2.2 Bronze Accent

The bronze accent (`color.accent.primary` — `#C8A97E`) is the earned signal. It marks progress, achievement, and legacy. Every use of bronze must pass the test: *does this surface communicate something the athlete built?* Bronze is not used for decoration, novelty, or engagement signals. This is the Performance Firewall at the visual layer (see `Component-Library-Architecture-v1.0.md` §2 CLA-P1 and CLA-P3).

### 2.3 Strong Visual Hierarchy

Every component contributes to a clear information hierarchy. Primary content is high-contrast and immediately readable. Supporting content steps down to `text.secondary`. Metadata and labels step further to `text.tertiary`. The eye is never confused about what is most important on any surface.

### 2.4 Soft Lighting

Depth is communicated through surface color steps — not harsh outlines. Cards sit one step above the canvas. Sheets and modals sit above cards. The top-edge inner highlight (`rgba(255,255,255,0.05)`) simulates warm light falling on a physical surface. Shadows are soft and atmospheric, not sharp.

### 2.5 Minimal Clutter

Every element on a surface must earn its presence. Components expose only the information and controls that the current context requires. No chrome, decoration, or feature exists because it was technically possible to add it. When in doubt, remove it.

### 2.6 Mobile-First

All components are designed and tested for mobile-first, touch-first interaction. The minimum tap target is 44×44 dp. Gestures and pressable feedback are considered primary interactions, not afterthoughts.

### 2.7 React Native and Expo

The implementation platform is React Native with Expo SDK v56+. No web-only APIs, no DOM-specific assumptions, no CSS constructs that do not have an equivalent React Native StyleSheet representation. Where a visual effect cannot be natively reproduced (e.g., radial gradients, inset box-shadows), document the approximation clearly in a code comment.

### 2.8 Reusable Primitives

No UI pattern that appears in more than one place may be implemented more than once. Every reusable element is a component. Components are composed from other components. The system grows by addition and composition, not by copy and modification.

### 2.9 Composition Over Duplication

Specialized components compose primitives — they do not reimplement them. When a new component needs card surface behavior, it wraps `BaseCard`. When it needs a progress bar, it uses the progress bar component. Shared logic lives in exactly one place.

### 2.10 Accessibility First

Accessibility is not a post-hoc audit item. Every component is built with accessibility in mind from the first line of code. `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, and minimum touch target size are required, not optional.

### 2.11 Consistency Over Customization

The design system defines the decisions so that screens do not have to. A component's variants and props cover the legitimate range of uses. If a screen needs something outside that range, the correct response is to propose a new variant or a new component — not to override tokens, fork the component, or add one-off styles inline.

---

## §3 — Component Hierarchy

The Forge Legacy UI is organized as four levels. A higher level may consume from lower levels. A lower level must never depend on a higher level. Screens may not bypass lower levels.

```
Level 1 — Design Tokens
─────────────────────────────────────────────────────────
src/constants/tokens.ts

The foundation of the entire system. All hex values, spacing,
radius, shadow, typography, motion, and z-index decisions live here.
No component may reference a raw hex value, magic number, or arbitrary
pixel size that is not derived from or defined in this file.
                            ↓
Level 2 — Primitive Components
─────────────────────────────────────────────────────────
src/components/forge/

Buttons       inputs/         cards/          navigation/
badges/       progress/       avatars/        lists/
charts/       empty-states/   feedback/

Stateless or minimally-stateful building blocks. Context-agnostic.
Reusable across any screen. Extended through props only.
                            ↓
Level 3 — Composed Components
─────────────────────────────────────────────────────────
src/components/forge/composites/
src/components/forge/compositions/

Assemblies of two or more Tier 2 primitives. May carry screen-specific
prop vocabularies (e.g., a WorkoutSummaryRow that combines an Avatar,
a stat display, and a CompactListCard) but still contains no navigation
or API logic.
                            ↓
Level 4 — Application Screens
─────────────────────────────────────────────────────────
src/app/       src/screens/

Consume all lower levels. Contain navigation logic, data fetching,
business logic, and screen-specific composition. Screens never define
their own primitive UI — all visual elements come from Levels 1–3.
```

**Hard rules:**

- Level 4 may import from Levels 1, 2, and 3.
- Level 3 may import from Levels 1 and 2.
- Level 2 may import from Level 1 and from other Level 2 libraries (cross-library imports are permitted when the dependency is clean and one-directional — e.g., `cards/` importing `inputs/ForgeToggle`).
- Level 1 has no imports from any forge component.
- No level may import from a level above it.

---

## §4 — Repository Structure

### 4.1 Required Folder Layout

```
src/components/forge/
├── index.ts                    ← Single public entry point
├── primitives/
│   └── index.ts
├── composites/
│   └── index.ts
├── compositions/
│   └── index.ts
├── buttons/
│   ├── ComponentName.tsx
│   ├── _buttonTokens.ts        ← optional
│   ├── _types.ts               ← optional
│   └── index.ts
├── inputs/
│   ├── ForgeTextInput.tsx
│   ├── _inputTokens.ts         ← optional
│   ├── _inputUtils.ts          ← optional
│   ├── _types.ts               ← optional
│   └── index.ts
├── cards/
│   ├── BaseCard.tsx
│   ├── types.ts                ← shared card types
│   ├── _cardTokens.ts          ← optional
│   └── index.ts
├── navigation/                 ← future
├── modals/                     ← future
├── badges/                     ← future
├── progress/                   ← future
├── avatars/                    ← future
├── lists/                      ← future
├── charts/                     ← future
├── empty-states/               ← future
└── feedback/                   ← future
```

### 4.2 Required Files Per Library

Every library folder must contain:

| File | Purpose | Required |
|---|---|---|
| `ComponentName.tsx` | Component implementation | Yes (one per component) |
| `types.ts` | Shared TypeScript types for this library | Yes if types are shared across components |
| `index.ts` | Barrel export — all components and types | Yes, always |

### 4.3 Optional Private Helpers

| File | Purpose | Convention |
|---|---|---|
| `_componentTokens.ts` | Library-scoped visual constants | Prefix with `_`; never exported from `index.ts` |
| `_helpers.ts` | Internal utility functions | Prefix with `_`; never exported from `index.ts` |
| `_types.ts` | Internal-only types | Prefix with `_`; only exported if consumed by `index.ts` |
| `_ComponentName.tsx` | Internal subcomponent | Prefix with `_`; consumed by siblings, never by external callers |

The `_` prefix signals: *not part of the public API*. External callers import from `index.ts` only.

### 4.4 What Does Not Belong in `forge/`

- Screen components — belong in `src/app/` or `src/screens/`
- Business logic (workout calculation, honor evaluation, program progression)
- API calls or data fetching
- Navigation actions (`router.push`, `Link`)
- Screen-specific state or context providers
- One-off layout wrappers built for a single screen

If a component requires any of the above, it is not a design system component.

---

## §5 — Component Rules

Every component in the Forge Legacy design system must satisfy all of the following rules without exception.

### 5.1 Use Forge Design Tokens

All color, spacing, radius, shadow, typography, and motion values must be sourced from `src/constants/tokens.ts`. No raw hex values, no magic pixel numbers, no arbitrary constants.

```typescript
// CORRECT
import { color, space, radius } from '@/constants/tokens'
backgroundColor: color.background.surface

// INCORRECT
backgroundColor: '#111118'
```

The one permitted exception: library-scoped visual constants in a `_componentTokens.ts` file may contain derived constants (e.g., specific icon sizes or padding multiples) that are not yet represented in global tokens. These must be clearly named and must never duplicate a value already in `tokens.ts`.

### 5.2 No Hardcoded Values

Magic numbers, hardcoded strings, and raw hex values are prohibited. If a value is needed and has no token, define a named constant in `_componentTokens.ts` before using it.

### 5.3 Reusable by Design

Every component must be context-agnostic. It accepts content and configuration through props. It does not reference specific screens, specific data models, or specific use cases in its implementation. A component that only works in one place is not a design system component.

### 5.4 Props Over Fixed Content

Components must accept their content as props. No hardcoded labels, hardcoded strings, or hardcoded images inside component implementations. Sample content belongs only in design files and test fixtures — never in production component code.

### 5.5 Accessibility Required

Every interactive component must include:
- `accessibilityRole` appropriate to its function
- `accessibilityLabel` (required or optional, but documented)
- `accessibilityState` for dynamic states (disabled, checked, selected, busy)
- Minimum 44×44 dp touch target (or `hitSlop` to meet this minimum)

### 5.6 Dark Mode

All components are dark-only for V1. Every token reference already points to the dark palette. Do not add conditional light/dark logic unless an Architecture Amendment explicitly introduces a light mode.

### 5.7 Composition Over Duplication

When a component needs a capability already built by another component, it composes that component — it does not reimplement the capability. BaseCard surface behavior must never be copy-pasted into another card. Progress bar logic must never be inlined in a card that already has a progress component available.

### 5.8 No Business Logic

Components must not contain:
- Domain-specific calculations (e.g., rank math, honor eligibility evaluation)
- Rules about which content is visible to which user
- Program progression logic
- Any logic that would need to change if the data model changed

### 5.9 No API Calls

Components do not fetch data. Data is passed as props. Side effects that trigger API calls are the responsibility of the screen or a data layer above the component.

### 5.10 No Navigation Logic

Components do not call `router.push()`, use `Link`, or directly trigger navigation. Navigation is triggered by callback props (`onPress`, `onCTAPress`) that the screen provides. The component is responsible only for rendering the control and invoking the callback.

---

## §6 — Token Rules

### 6.1 Global Design Tokens (`src/constants/tokens.ts`)

Global tokens are defined once and consumed everywhere. They are the single source of truth for:

- Color: `color.*` — background, text, accent, danger, success, etc.
- Spacing: `space.*` — xs through 2xl
- Radius: `radius.*` — card, chip, image, avatar
- Shadow: `shadow.*` — card, elevated, modal
- Typography: `typography.scale.*` — the 12-step locked type scale
- Motion: `motion.duration.*`, `motion.easing.*`
- Elevation: `elevation.*` — surface color by elevation level
- Layout: `layout.*` — screen padding, card gap, section gap
- Z-index: `zIndex.*` — content through modal

**Rule:** Global decisions must never be duplicated inside a library. If a value belongs in global tokens, it must live there — not in `_componentTokens.ts`.

### 6.2 Component Helper Tokens (`_componentTokens.ts`)

Component-scoped tokens are permitted when:
- A value is specific to one library and has no reasonable place in global tokens (e.g., a specific icon-box size unique to cards)
- A value is derived from global tokens but needs a named alias to be readable (e.g., `CARD.BORDER = '#222229'` is equivalent to `color.border.subtle` — a valid alias for clarity)

**Rule:** Component helper tokens may not introduce values that contradict global tokens. If `color.border.subtle` is `#222229`, a `_cardTokens.ts` constant for a card border must equal `color.border.subtle`, not a different color.

### 6.3 When to Use Each

| Scenario | Use |
|---|---|
| Color, spacing, radius, shadow in any component | Global tokens (`color.*`, `space.*`, etc.) |
| Icon size specific to one library | Component token (`_componentTokens.ts`) |
| Library-specific layout constant (e.g., min-height, date-block size) | Component token |
| A value already defined in global tokens | Global token — never redefine it locally |
| A value used in three or more libraries | Propose a global token addition via amendment |

---

## §7 — Naming Standards

### 7.1 Component Names

- `PascalCase` for all component names
- Names must be specific and self-documenting: `StatCard`, not `Card2` or `MetricCard`
- Forge-prefixed names for inputs only (convention established by Input Library v1.0): `ForgeTextInput`, `ForgeToggle`
- All other libraries use plain PascalCase: `BaseCard`, `PrimaryButton`, `HonorCard`

### 7.2 Folder Names

- `kebab-case` — all lowercase with hyphens
- Match the library's semantic domain: `buttons/`, `inputs/`, `cards/`, `empty-states/`
- No abbreviations: `navigation/` not `nav/`

### 7.3 Props

- `camelCase` for all prop names
- Boolean props use `is` or `has` prefix when ambiguity exists: `isLoading`, `hasError`
- Callback props use `on` prefix: `onPress`, `onDismiss`, `onToggleChange`
- Avoid abbreviation: `accessibilityLabel` not `a11yLabel`, `iconName` not `icon` (when multiple icon slots exist)

### 7.4 Private Helper Files

- Prefix with `_` to signal non-public scope
- Name after their role: `_buttonTokens.ts`, `_inputUtils.ts`, `_ButtonIcon.tsx`
- Never export private helpers from `index.ts`

### 7.5 Types

- Suffix component prop interfaces with `Props`: `BaseCardProps`, `StatCardProps`
- For variant/state enums, use descriptive names: `CardVariant`, `HonorCardState`, `TrendDirection`
- Export all prop types alongside their components in `index.ts`
- Use `type` aliases instead of empty `interface` declarations:

```typescript
// CORRECT — type alias for a props type that extends another without adding members
export type PrimaryButtonProps = ButtonBaseProps

// INCORRECT — empty interface adds noise and triggers no-empty-object-type lint rule
export interface PrimaryButtonProps extends ButtonBaseProps {}
```

### 7.6 Barrel Exports

- One export per name — no duplicate exports across files
- Each library's `index.ts` exports all public components and all public types
- `src/components/forge/index.ts` re-exports from `primitives`, `composites`, and `compositions` only — not directly from libraries
- Libraries connect to the public API through the composites or compositions index

### 7.7 Animated Value Initialization

Use `useState` lazy initializers for `Animated.Value` instances — not `useRef(...).current`:

```typescript
// CORRECT — lint-clean, semantically equivalent to useRef
const [scale]  = useState(() => new Animated.Value(1))
const [shakeX] = useState(() => new Animated.Value(0))

// INCORRECT — triggers react-hooks/refs lint error
const scale  = useRef(new Animated.Value(1)).current
const shakeX = useRef(new Animated.Value(0)).current
```

---

## §8 — State Standards

Components implement only the states relevant to their function. This section defines the complete set of states a component may need, and the visual treatment for each.

| State | Visual Treatment | Notes |
|---|---|---|
| **Default** | Full token values, no modification | The baseline rendering |
| **Pressed** | `opacity: 0.80` or `scale: 0.97` spring | Use Animated for scale; use Pressable pressed for opacity |
| **Focused** | 2px bronze border or bronze shadow ring | Accessibility state for keyboard/TV navigation |
| **Disabled** | `opacity: 0.45` | Do not change color token — use opacity only |
| **Loading** | `ActivityIndicator` replaces interactive content | Disable interaction while loading |
| **Selected** | Bronze border or accent fill | Indicates active/current selection |
| **Error** | Danger border or danger-colored text | Never red background fill — border + text only |
| **Success** | Success-colored indicator | Green icon or text; brief, not persistent |
| **Locked** | `opacity: 0.50` + lock icon | Communicates premium gating; never red |
| **Featured** | Bronze glow + bronze accent border | Performance Firewall: earned surfaces only |
| **Highlighted** | Bronze border, bronze inner highlight | Social/feed surfaces |
| **Pinned** | Pin icon + label | Feed surfaces only |
| **Hidden** | Placeholder content (`???`, blurred) | Honor hidden state |

**Implementation rules:**

- States must not overlap destructively. A `disabled` + `selected` component should appear disabled (opacity 0.45) rather than selected (full bronze).
- `color.destructive` is reserved exclusively for M-6 Destructive Confirm CTA and L-13 Delete action (CLA-D8). Error states use border color changes, not red fills.
- `color.accent.*` in a non-earned context violates the Performance Firewall. If you are unsure whether a surface is earned, it is not.

---

## §9 — Accessibility Standards

### 9.1 Touch Targets

- Minimum touch target: **44×44 dp** for all interactive elements
- Use `hitSlop` to extend touch area without changing visual size when a control is smaller than 44dp
- Rows and list items: 48dp minimum height (`size.tapTargetRow`)

### 9.2 Contrast

- Primary text on card surface: `#F0EDE8` on `#111118` — passes WCAG AA
- Secondary text on card surface: `#9E9890` on `#111118` — acceptable for supporting copy
- All interactive labels must use `color.text.primary` or `color.accent.primary`, not `color.text.tertiary`
- Never place `color.text.tertiary` on interactive CTAs

### 9.3 Typography

- Body text minimum: 14sp (`typography.scale.supportingMeta`)
- Touch labels minimum: 14sp
- Section labels (ALL-CAPS): 11sp (`typography.scale.sectionHeader`) — never used for interactive elements (CLA-D14)
- Do not apply `textTransform: 'uppercase'` outside of `sectionHeader` scale unless explicitly specified in a wireframe

### 9.4 Screen Reader Labels

- `accessibilityLabel` must be present on all Pressable/TouchableOpacity components that lack visible text
- Icon-only buttons require an `accessibilityLabel` prop (required prop, not optional)
- `accessibilityRole="button"` on all custom touch targets that perform actions
- `accessibilityRole="switch"` on toggle controls
- `accessibilityRole="checkbox"` on checkbox controls
- `accessibilityRole="radio"` on radio controls
- `accessibilityState={{ disabled, checked, selected, busy }}` as applicable

### 9.5 Disabled Clarity

- Disabled components use `opacity: 0.45` — not hidden, not removed
- Interactive callbacks are suppressed (`disabled` prop passed through)
- `accessibilityState={{ disabled: true }}` must be set when a component is disabled

### 9.6 Focus Visibility

- Focus state must produce a visible ring: 2px bronze border or `shadowColor: color.accent.primary` with `shadowRadius: 6, shadowOpacity: 0.35`
- Focus ring is required for all interactive elements (TV navigation, keyboard navigation, external keyboard users on mobile)

---

## §10 — Composition Rules

### 10.1 Base Components Are the Source of Truth

When a library has a base component (e.g., `BaseCard`), all specialized variants of that component must compose the base — not reimplement it. The base component owns: surface color, border, radius, padding, inner highlight, shadow, pressed state, disabled state, and overflow behavior. Specialized components own: their specific slots, content layout, state-specific styling additions, and gradient overlays.

### 10.2 Specialized Components Compose Primitives

```typescript
// CORRECT — ProgramCard composes BaseCard
export function ProgramCard({ ... }: ProgramCardProps) {
  return (
    <BaseCard minHeight={190} onPress={onPress}>
      {/* ProgramCard-specific content */}
    </BaseCard>
  )
}

// INCORRECT — reimplements the card surface
export function ProgramCard({ ... }: ProgramCardProps) {
  return (
    <View style={{ borderRadius: 8, backgroundColor: '#111118', ... }}>
      {/* ... */}
    </View>
  )
}
```

### 10.3 Never Duplicate Shared Behavior

If two components share a behavior (e.g., both show a progress bar), the progress bar must be a shared component — not inlined in both. If the shared behavior does not yet have a component, create one before implementing either consumer.

### 10.4 Slots and Children for Flexible Composition

Components that act as containers expose slots through props (`children`, `leadingIcon`, `trailingAction`, `footer`, `header`) rather than accepting only a flat list of content props. This enables composition without forcing specialized forks.

### 10.5 Intra-Library Imports Are Permitted

A library may import from another library when the dependency is clean, one-directional, and documented. Example: `cards/CompactListCard.tsx` imports `ForgeToggle` from `inputs/`. This is correct — it composes an existing primitive rather than reimplementing the toggle. Cross-library imports must never create circular dependencies.

### 10.6 Do Not Fork Components for One-Off Variations

If a screen needs a slightly different version of an existing component, the correct response is:
1. Determine whether the variation is reusable (would another screen need it?).
2. If yes: add a new variant or prop to the existing component.
3. If no: the screen handles the difference through composition, not by forking.
4. Forking (copying a component file and modifying it) is never permitted.

---

## §11 — Export Standards

### 11.1 Library Barrel (`library/index.ts`)

Every library's `index.ts` must export:
- All public component functions
- All public prop type definitions
- All public shared type aliases and enums

```typescript
// Example: cards/index.ts
export { BaseCard }        from './BaseCard'
export { StatCard }        from './StatCard'
// ... all 13 components

export type { BaseCardProps }   from './BaseCard'
export type { StatCardProps }   from './StatCard'
// ... all 13 prop types

export type { CardVariant, HonorCardState, ... } from './types'
```

### 11.2 Forge Root (`src/components/forge/index.ts`)

The root index re-exports all three tiers:

```typescript
export * from './primitives'
export * from './composites'
export * from './compositions'
```

Libraries connect through the composites or compositions index — never directly to the root. The composites index comments out planned but unimplemented components so the architecture intention is always visible:

```typescript
// CLA-C06  export { Surface }   from './Surface'        ← not yet implemented
export * from '../buttons'                                 ← implemented
export * from '../inputs'                                  ← implemented
export * from '../cards'                                   ← implemented
```

### 11.3 One Export Per Name

No name may be exported more than once across the entire system. If a type is defined in `types.ts` and imported in `ComponentName.tsx`, the barrel exports it from exactly one of these locations. Verify with a grep before committing:

```bash
grep -r "export.*ComponentName" src/components/forge/
```

### 11.4 No Direct Deep Imports in Screens

Screens import from `@/components/forge` only. They never import from a specific component file path:

```typescript
// CORRECT
import { BaseCard, StatCard } from '@/components/forge'

// INCORRECT — bypasses barrel, creates fragile path dependency
import { BaseCard } from '@/components/forge/cards/BaseCard'
```

---

## §12 — Validation Workflow

Every new component library must complete the following sequence in order before a commit is made. No step may be skipped.

| Step | Action | Completion Criteria |
|---|---|---|
| **1** | Design the library in Claude Design | All component variants and states are visually resolved and locked in the design project |
| **2** | Refine until visually locked | PO has reviewed and approved; no open visual questions remain |
| **3** | Export into Claude Code via DesignSync | Design file is available in the repository at the correct path under `src/components/forge/` |
| **4** | Implement reusable React Native components | All components, types, and helpers are authored |
| **5** | Place in correct folder | Files are under `src/components/forge/{library-name}/` — no component exists elsewhere |
| **6** | Use Forge Design Tokens | All color, spacing, radius, shadow, and typography values sourced from `tokens.ts` or `_componentTokens.ts` |
| **7** | Run TypeScript validation | `npx tsc --noEmit` exits with code 0, zero errors |
| **8** | Run lint | `npx expo lint` reports zero errors and zero warnings **in the new library files** |
| **9** | Verify exports | Every component is exported exactly once from the library barrel and from `src/components/forge/index.ts` |
| **10** | Verify architecture | All §5 component rules satisfied; no business logic, no navigation, no API calls, no hardcoded values |
| **11** | Commit only that library | The commit contains only the new library files plus the composites index update; no unrelated files |

---

## §13 — Verification Checklist

Before committing any new library, every item in this checklist must be explicitly verified. This checklist is permanent and applies to every current and future library.

---

**1. Folder Structure**

Show the complete directory tree for `src/components/forge/` including every subfolder.

---

**2. Component Placement**

Verify every newly created component file exists only inside `src/components/forge/{library-name}/`. No component exists outside its designated library folder.

---

**3. Barrel Exports**

Show `src/components/forge/{library-name}/index.ts` and `src/components/forge/index.ts`. Verify every component is exported exactly once.

---

**4. Dependency Audit**

List every import in the new library. Confirm all dependencies are:
- Forge Design Tokens (`src/constants/tokens.ts`)
- Existing Forge components (from within `src/components/forge/`)
- React Native core (`react-native`)
- Expo-supported packages (installed via `npx expo install`)

List any external dependency that was introduced that was not previously in the project.

---

**5. TypeScript**

Run `npx tsc --noEmit`.

Report: **PASS** or **FAIL** with every error.

---

**6. Lint**

Run `npx expo lint`.

Report: **PASS** or **FAIL** with every warning and error in the new library files. Pre-existing errors in unrelated files must be identified as pre-existing and excluded from the pass/fail verdict for this library.

---

**7. File List**

Provide every file created or modified. No unrelated file should appear in this list.

---

**8. Repository Scope**

Confirm no unrelated file was modified. Docs, program files, unrelated source files, and existing components outside the new library must be unchanged.

---

**9. Architecture Verification**

Confirm each item explicitly:

| Check | Expected |
|---|---|
| Components are reusable primitives | ✓ No screen-specific content or logic |
| No business logic | ✓ No domain calculations, no model-specific rules |
| No screen-specific layouts | ✓ All layout is prop-driven |
| No hardcoded colors | ✓ All values from `tokens.ts` or `_componentTokens.ts` |
| No duplicated implementations | ✓ Shared behavior is composed, not copied |
| Shared logic abstracted | ✓ Base components own shared behavior |

---

**10. Ready for Commit**

Only if all nine checks above pass: provide the exact commit command and commit message. If any check fails, stop and report the failure before proceeding.

---

## §14 — Current Library Status

The following libraries are locked and committed to the repository. Each has completed the full validation workflow defined in §12.

### Design Tokens

| Item | Value |
|---|---|
| **Status** | LOCKED |
| **File** | `src/constants/tokens.ts` |
| **Contents** | `color`, `space`, `radius`, `elevation`, `size`, `typography`, `motion`, `shadow`, `layout`, `zIndex`, `Theme` |
| **Visual spec** | `Docs/Forge-Legacy-Design-System-v1.0.md` |
| **Governance** | `Component-Library-Architecture-v1.0.md` §10 |

### Button Library v1.0

| Item | Value |
|---|---|
| **Status** | LOCKED |
| **Path** | `src/components/forge/buttons/` |
| **Components** | `PrimaryButton`, `SecondaryButton`, `GhostButton`, `DestructiveButton`, `IconButton`, `FloatingActionButton` |
| **Implementation commit** | `2d20772` — feat: add Forge button library v1.0 |
| **Lint fix commit** | `3ac04ce` — Fix lint errors across Forge button, input, and card libraries |
| **Design source** | Claude Design (button library project) |

### Input Library v1.0

| Item | Value |
|---|---|
| **Status** | LOCKED |
| **Path** | `src/components/forge/inputs/` |
| **Components** | `ForgeTextInput`, `ForgePasswordInput`, `ForgeSearchInput`, `ForgeTextArea`, `ForgeSelectInput`, `ForgeNumberInput`, `ForgeDateInput`, `ForgeCheckbox`, `ForgeRadioGroup`, `ForgeToggle` |
| **Implementation commit** | `d309b3b` — feat: add Forge input library v1.0 |
| **Lint fix commit** | `3ac04ce` — Fix lint errors across Forge button, input, and card libraries |
| **Design source** | Claude Design (input library project, ID `20ce8411-cce2-42a6-a9aa-c7937183fcdb`) |

### Card Library v1.0

| Item | Value |
|---|---|
| **Status** | LOCKED |
| **Path** | `src/components/forge/cards/` |
| **Components** | `BaseCard`, `StatCard`, `ProgramCard`, `WorkoutCard`, `HonorCard`, `ChallengeCard`, `LegacyCard`, `MediaCard`, `FeedPostCard`, `CompactListCard`, `SectionCard`, `BannerCard`, `SkeletonCard` |
| **Implementation commit** | `a91fea7` — Add Forge Card Library v1.0 |
| **Lint fix commit** | `3ac04ce` — Fix lint errors across Forge button, input, and card libraries |
| **Design source** | Claude Design (card library project, ID `da2530d2-ccd3-4c3b-b4cb-62a1e338e7c3`) |

### Navigation Library v1.0

| Item | Value |
|---|---|
| **Status** | LOCKED |
| **Path** | `src/components/forge/navigation/` |
| **Components** | `ForgeTopBar`, `ForgeBottomNav`, `ForgeBackButton`, `ForgeTabNavigation`, `ForgeSegmentedControl`, `ForgeStepNavigation`, `ForgePagination`, `ForgeBreadcrumbs`, `ForgeOverflowMenu`, `ForgeSearchHeader` |
| **Implementation commit** | `9d199a6` — Add Forge Navigation Library v1.0 |
| **Design source** | Claude Design (Forge Navigation Library project) |

### Modal & Overlay Library v1.0

| Item | Value |
|---|---|
| **Status** | LOCKED |
| **Path** | `src/components/forge/modals/` |
| **Components** | `ForgeModal`, `ForgeConfirmationModal`, `ForgeBottomSheet`, `ForgeActionSheet`, `ForgePickerModal`, `ForgeMediaModal`, `ForgeLoadingModal`, `ForgeSuccessModal`, `ForgeErrorModal`, `ForgePremiumModal`, `ForgeFormModal` |
| **Implementation commit** | `39f8529` — Add Forge Modal Library v1.0; updated in place to the latest Claude Design export (spec §14 motion, swipe-to-dismiss sheet, picker date mode, media video chrome, determinate loading, 44pt touch targets) |
| **Design source** | Claude Design (Forge Modal Library Design project, ID `b029488a-201b-432f-b04c-b0df5228381e`, file `Forge Modal Library.dc.html`) |

### Progress Library v1.0

| Item | Value |
|---|---|
| **Status** | LOCKED |
| **Path** | `src/components/forge/progress/` |
| **Components** | `ForgeProgressBar`, `ForgeXPProgressBar`, `ForgeProgramProgress`, `ForgeWorkoutProgress`, `ForgeCircularProgress`, `ForgeGoalProgress`, `ForgeChallengeProgress`, `ForgeRankProgress`, `ForgeStreakIndicator`, `ForgeCountdownProgress`, `ForgeLoadingProgress`, `InlineSpinner`, `ForgeMilestoneProgress` |
| **Implementation commit** | `374563f` — feat(design-system): add forge progress components library |
| **Design source** | Claude Design (Forge Progress Library project) |
| **Note** | `ProgressRing` is **not** a component in this library and is not exported from it — it is a distinct, standalone component owned exclusively by `Rest-Timer-Architecture-v1.0.md` (§9) and excluded from this catalog by that document's own governance. No file in this library implements or claims that name. |

### Planned Libraries (Not Yet Started)

| Library | Folder | Status |
|---|---|---|
| Badges | `src/components/forge/badges/` | Not started |
| Avatars | `src/components/forge/avatars/` | Not started |
| Lists | `src/components/forge/lists/` | Not started |
| Charts | `src/components/forge/charts/` | Not started |
| Empty States | `src/components/forge/empty-states/` | Not started |
| Toasts | `src/components/forge/feedback/` | Not started |

---

## §15 — Roadmap

### Completed

| Library | Components | Status |
|---|---|---|
| Design Tokens | `tokens.ts` — all global tokens | ✅ LOCKED |
| Button Library v1.0 | 6 button variants | ✅ LOCKED |
| Input Library v1.0 | 10 input controls | ✅ LOCKED |
| Card Library v1.0 | 13 card variants | ✅ LOCKED |
| Modal & Overlay Library v1.0 | 11 modal/overlay components | ✅ LOCKED |
| Navigation Library v1.0 | 10 navigation components | ✅ LOCKED |
| Progress Library v1.0 | 13 progress components | ✅ LOCKED |

### Remaining — Priority Order

The following libraries are the logical next steps to enable implementation of the first screens. Priority is determined by which screens are built first.

**Priority 1 — Required for any screen:**

| Library | Rationale |
|---|---|
| **Avatars** | Used in squad surfaces, feed, profile header, and activity rows |
| **Badges / Chips** | Used in program cards, honor catalog, exercise library, and challenge surfaces |

**Priority 2 — Required for core content screens:**

| Library | Rationale |
|---|---|
| **Lists** (ListItem, SectionHeader) | Exercise library (W-21), settings (P-4/P-5/P-6), most catalog screens |
| **Empty States** | Every data screen needs an empty-state treatment |

**Priority 3 — Required for social and ceremony surfaces:**

| Library | Rationale |
|---|---|
| **Feedback** (Toast) | Workout logging confirmations, action feedback |
| **Charts** | Progress analytics (P-2 Progress Hub) |

> Navigation, Progress, and Modals have all since been completed (§14) and are no longer part of this remaining-work list.

### Roadmap Notes

- Each library must complete the full validation workflow (§12) before commit.
- Libraries may be built in parallel if there are no cross-library dependencies.
- `ProgressRing` is owned exclusively by `Rest-Timer-Architecture-v1.0.md` — it is not part of, and must never be added to, the Progress library (§14); it is a standalone component governed entirely by that document and may not be reused elsewhere without a formal amendment.
- When a new library is completed, this document's §14 must be updated to reflect its locked status and commit hash.

---

## §16 — Governance

### Authority

This document is the governing authority for all current and future Forge Legacy reusable UI component libraries. Every Claude session that creates, modifies, or audits a component library must read this document before beginning work.

### Amendment Process

This document is LOCKED at v1.0. Future amendments follow the same process used across all Forge Legacy architecture documents:

1. The amendment is authored as a decision in a Claude session.
2. It is reviewed and approved by the PO.
3. It is applied to this document with a version increment (v1.1, v1.2, etc.) and logged in the Amendment Log at the top of this file.
4. Downstream documents that reference this governance document are updated if affected.

### Precedence

When a conflict arises between this document and another:

- This document governs: process, structure, export standards, validation workflow, naming conventions, accessibility minimums, and composition rules.
- `Component-Library-Architecture-v1.0.md` governs: the V1 component catalog, behavioral contracts, variant definitions, state definitions, and token taxonomy.
- `Forge-Legacy-Design-System-v1.0.md` governs: hex values, visual identity, brand guardrails, and depth rules.
- Individual wireframe specs govern: screen-level layout and composition.

### Maintenance

After every new library is completed and committed:
1. Update §14 with the library's status, components, and commit hash.
2. Remove the library from §15's "Remaining" list.
3. Update `Forge-Legacy-Master-Status.md` to reflect the new library.

This document must never become stale. A stale governance document provides no governance.
