# Forge Legacy — Visual Foundation

This is not a component library and not an application. It is the visual source of truth every future
Forge Legacy component and screen inherits from: material, light, and atmosphere — not just color values.

Forge Legacy should feel forged, monumental, disciplined, timeless, premium, cinematic, handcrafted,
heavy, masculine, and aspirational. Carved from steel, illuminated by the warmth of a forge. Nothing
playful, flat, generic, or trendy.

## What's here

Twelve foundation cards, each documenting one material dimension:

- **Backgrounds** — atmospheric, never-flat-black background language, cinematic imagery scrim
- **Surfaces** — card / elevated / recessed / panel / modal / nav materials
- **Bronze** — the complete bronze metal system (primary, bright, muted, dark, metallic sweep, sanctioned fill)
- **Borders** — machined edges, not drawn outlines
- **Shadows** — weight without obvious blur
- **Glow** — restrained forge-heat glow, never neon
- **Typography** — display serif + sans hierarchy and text color hierarchy
- **Icons** — engraved-in-surface icon treatment
- **Imagery** — how photography is graded to belong to the interface
- **Lighting** — light falls from above; the UI catches it, never emits it
- **Elevation** — the physical layer stack from canvas to ceremony modal
- **Motion** — deliberate, heavy, smooth easing and duration tokens

## Components

Components assemble the material into actual app surfaces (`window.ForgeLegacyVisualFoundation_5368b2.<Name>`).
Application screens *consume* these — they never implement custom UI (no forking, no overrides).

**Primitives & structure**

- **Surface** — forged-steel container primitive (card / elevated / recessed / panel / modal)
- **Card** — Surface + the standard padding contract (default / hero / elevated); base for every Tier-3 card
- **AppBar** — fixed top bar; back-chevron / ×-dismiss / avatar-entry conventions
- **TabBar** — bottom navigation, finalized 4 tabs (Home · Workouts · Legacy · Squads), bronze active state
- **SectionHeader** — the 11sp all-caps group label (the only sanctioned all-caps scale)
- **Button** — primary (sanctioned bronze fill) · secondary · destructive · text · icon
- **InputField** — single-line text entry with character caps
- **TextArea** — multi-line free text for reflections / notes
- **ProgressBar** — linear progress, fills left-to-right only, never drains
- **ProgressRing** — rest-timer-scoped fill ring (excluded from the general catalog)
- **Avatar** — circular athlete photo with per-context size tokens
- **AvatarGlyph** — initials fallback disc (never a silhouette)
- **Modal** — centered ceremony overlay, no tap-outside dismiss
- **BottomSheet** — slide-up utility surface for non-ceremony flows
- **Toast** — transient 3s confirmation, non-modal
- **Skeleton** — loading placeholder (shimmer → static block under Reduce Motion)
- **EmptyState** — the rare explicit exception to Smart Omission

**Content & marks**

- **ListRow** — canonical 3-zone list item with density tokens (48 / 56 / 72dp)
- **TimelineRow** — one Legacy-Timeline entry, 10 canonical event-type glyphs
- **StatBlock** — engraved icon + value + bronze label stat unit
- **Pill** — small uppercase attribute tag (COMPOUND, PUSH)
- **RankMarker** — letterspaced uppercase rank / honor text marker ("ARCHITECT · IV")
- **CountBadge** — numeric count indicator (unread counts)
- **Insignia** — badge / rank-insignia shell with a deferred-artwork slot (final art TBD)

## Source of truth

Base hex values originate in `src/constants/tokens.ts` in the Forge Legacy repo. Two deliberate divergences
bring the foundation in line with the target app screens: the bronze accent was **warmed** for forge-lit
chroma (`--fl-bronze-primary` → `#BF8F4F`, `--fl-bronze-bright` → `#CDA063` — a muted, burnished copper-bronze, calibrated by
sampling the target screens (hue ≈ 34–36°, not the oversaturated yellow-gold of the first pass), with all bronze
glow/border rgba retuned to match), and the charcoal ramp neutralized to the target's near-neutral dark (blue/violet cast removed). A **display serif**
(`--fl-font-display`) and a **sanctioned dark metallic button fill** (`--fl-bronze-fill`) were added — the latter
is the single exception to “bronze is never a large fill.” The full variable set lives in `tokens/foundation.css`
(`--fl-*` custom properties).

Re-derive this foundation whenever `tokens/foundation.css`'s source values change.
