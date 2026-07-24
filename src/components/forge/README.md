# Forge Legacy Component Library

> ## ⚠️ STATUS: LEGACY / REFERENCE — NOT CURRENT VISUAL SOURCE OF TRUTH
> The visual design system is being **rebuilt in Claude Design first**. Everything
> in this directory (Buttons, Inputs, Cards, Navigation, Modals, Progress — all
> six libraries below) is the **pre-redesign implementation**. It still works and
> is still imported by any screens that use it, but its visuals are no longer
> authoritative.
>
> **Do not delete anything here.** Once the new design system is approved and
> locked, each library will be replaced **one at a time**, preserving whatever
> is still useful from the current implementation: component logic, TypeScript
> prop contracts, accessibility behavior, barrel exports, and interaction
> patterns. Only the visual layer is being redone.
>
> **No destructive cleanup of this directory until:** (1) the new Claude Design
> system is locked, and (2) each replacement component has been implemented and
> verified against it. Until then, treat this code as a working reference
> implementation, not dead code.

The canonical home for every approved UI component. This is the single source
of truth for the component layer. Screens never create component variations —
they import from here.

**Architecture:** `Docs/Component-Library-Architecture-v1.0.md` (LOCKED)
**Tokens:** `src/constants/tokens.ts` (CLA-D11)
**Import path:** `@/components/forge`

---

## Structure

```
forge/
├── primitives/       CLA-C01–C05  Tier 1 — atomic, token-only
├── composites/       CLA-C06–C24  Tier 2 — multi-primitive, reusable
├── compositions/     CLA-C25–C37  Tier 3 — context-aware screen pieces
├── _template/                     Copy this when adding a new component
└── index.ts                       Single barrel export — import from here only
```

Each component lives in its own folder:
```
composites/Button/
├── Button.tsx          implementation
├── Button.types.ts     props interface (from CLA contract)
└── index.ts            re-export
```

---

## How to add a component

1. **Design is approved** — the component's CLA entry is final and the screen spec
   that uses it has been reviewed.

2. **Copy the template:**
   ```bash
   cp -r src/components/forge/_template src/components/forge/<tier>/<ComponentName>
   ```
   Rename files: `ComponentName.tsx`, `ComponentName.types.ts`, `index.ts`.

3. **Implement** using only token values from `@/constants/tokens`. No raw hex,
   no magic numbers, no inline style overrides.

4. **Uncomment the export** in the tier's `index.ts` (e.g., `composites/index.ts`).

5. **Run `/design-sync`** to push the new component to the claude.ai/design
   project so future AI-assisted screens use the real component.

---

## Rules (enforced by CLA-P6)

- Screens pass props only. Screen code never overrides a component's internal
  rendering, state management, or accessibility contract.
- All styling flows through named tokens from `@/constants/tokens`.
- No raw hex values, raw pixel sizes, or magic numbers in component files.
- No component imports another component at the same tier or above
  (composition flows downward: Tier 3 → Tier 2 → Tier 1 only).
- If a screen needs behavior that no prop supports, the behavior goes through
  a CLA amendment before the screen is implemented — never solved with a fork.

---

## What's actually implemented (legacy libraries)

The tier folders below (`primitives/`, `composites/`, `compositions/`) are mostly
empty barrels reserved for the CLA-numbered structure this README describes.
In practice, six flat libraries were built directly and are re-exported through
`composites/index.ts`. These are the real, working, **legacy-status** code:

| Library | Folder | Components | Commit |
|---|---|---:|---|
| Buttons | `buttons/` | 6 | `2d20772` |
| Inputs | `inputs/` | 10 | `d309b3b` |
| Cards | `cards/` | 13 | `a91fea7` |
| Navigation | `navigation/` | 10 | `9d199a6` |
| Modals | `modals/` | 11 | `39f8529` |
| Progress | `progress/` | 12 | `374563f` |

The CLA-C01–C37 registry table below is the aspirational target mapping, not a
record of what's built — treat "Pending" as "not yet mapped back to this table,"
not "not yet implemented." When each library is replaced against the new
Claude Design system, this table should be reconciled at the same time.

## Home v2 (Claude Design visual system — first library replaced)

The first slice of the new Claude Design visual system is now implemented,
scoped to what H-1 Home v2 needs (`Forge Home.dc.html`, project `b029488a`).
These live in `primitives/icons/`, `composites/<Name>/`, and
`compositions/<Name>/` and consume `@/constants/foundation` (the new `--fl-*`
token bridge — additive to `@/constants/tokens`, not a replacement).

| Component | Tier | Folder | Note |
|---|---|---|---|
| Home icon set | 1 (CLA-C02) | `primitives/icons/HomeIcons.tsx` | Barbell, Calendar, Squad, Friends, Chevron, Flame, ForgeMark — hand-ported SVG paths, not Phosphor yet |
| Surface | 2 (CLA-C06) | `composites/Surface` | |
| Card | 2 (CLA-C07) | `composites/Surface` | `CardVariant` type not re-exported from the barrel — collides with the legacy `../cards` `CardVariant`; import from `composites/Surface` directly if needed |
| Button (v2) | 2 (CLA-C08) | `composites/Button` | 5-variant (primary/secondary/destructive/text/icon); additive to the LEGACY `buttons/` library, does not replace it yet |
| Pill | 2 (CLA-C09) | `composites/Pill` | |
| Avatar / AvatarGlyph | 2 / 1 (CLA-C11 / CLA-C05) | `composites/Avatar` | |
| ProgressBar (v2) | 2 (CLA-C12) | `composites/ProgressBar` | Additive to the LEGACY `progress/` library |
| SectionHeader | 2 (CLA-C17) | `composites/SectionHeader` | |
| AppBar | 2 (CLA-C18) | `composites/AppBar` | |
| BottomSheet | 2 (CLA-C21) | `composites/BottomSheet` | |
| TabBar / TabBarButton | 2 (CLA-C19) | `composites/TabBar` | **App-wide navigation standard** (2026-07-03) — replaces `expo-router` `NativeTabs`; app shell (`src/components/app-tabs.tsx`) now built on `expo-router/ui`'s headless `Tabs`/`TabList`/`TabTrigger`/`TabSlot`, one file for both web and native (`app-tabs.web.tsx` deleted) |
| HomepagePrinciple | 3 (CLA-C37) | `compositions/HomepagePrinciple` | |
| MissionCard | 3 (fuses CLA-C25/C26) | `compositions/MissionCard` | Home-v2-specific: fuses Chapter + Goal + Program + Today's Session + Workout CTA into one card — not a drop-in ChapterCard/ProgramCard |
| TrainTogetherSection + FriendActionSheet | 3 | `compositions/TrainTogetherSection` | Replaces the Squad Card slot (CLA-C29) for H-1; also carries Friends (Train Together / Challenge) |

## Component registry

### Tier 1 — Primitives (CLA-C01–C05)

| ID | Component | Status |
|---|---|---|
| CLA-C01 | Text | Pending |
| CLA-C02 | Icon | Pending |
| CLA-C03 | Divider | Pending |
| CLA-C04 | ProgressFill | Pending |
| CLA-C05 | AvatarGlyph | Complete (v2 — `composites/Avatar`) |

### Tier 2 — Composites (CLA-C06–C24)

| ID | Component | Status |
|---|---|---|
| CLA-C06 | Surface | Complete (v2 — `composites/Surface`) |
| CLA-C07 | Card | Complete (v2 — `composites/Surface`) |
| CLA-C08 | Button | Complete (v2 — `composites/Button`; LEGACY `buttons/` also still in place) |
| CLA-C09 | Chip | Complete (v2 — `composites/Pill`, named Pill not Chip) |
| CLA-C10 | Badge | Pending |
| CLA-C11 | Avatar | Complete (v2 — `composites/Avatar`) |
| CLA-C12 | ProgressBar | Complete (v2 — `composites/ProgressBar`; LEGACY `progress/` also still in place) |
| CLA-C13 | SearchBar | Pending |
| CLA-C14 | InputField | Pending |
| CLA-C15 | TextArea | Pending |
| CLA-C16 | ListItem | Pending |
| CLA-C17 | SectionHeader | Complete (v2 — `composites/SectionHeader`) |
| CLA-C18 | AppBar | Complete (v2 — `composites/AppBar`) |
| CLA-C19 | TabBar | Complete (v2 — `composites/TabBar`); app-wide navigation standard, see Home v2 section above |
| CLA-C20 | Modal | Pending |
| CLA-C21 | BottomSheet | Complete (v2 — `composites/BottomSheet`) |
| CLA-C22 | Toast | Pending |
| CLA-C23 | Skeleton | Pending |
| CLA-C24 | EmptyState | Pending |

### Tier 3 — Compositions (CLA-C25–C37)

| ID | Component | Governing Spec | Status |
|---|---|---|---|
| CLA-C25 | ChapterCard | H-1, L-1, P-1 | Fused into `MissionCard` for H-1 v2 (see Home v2 section above); standalone ChapterCard for L-1/P-1 still Pending |
| CLA-C26 | ProgramCard | H-1, W-1–W-3 | Fused into `MissionCard` for H-1 v2; standalone ProgramCard for W-1–W-3 still Pending |
| CLA-C27 | GoalCard | G-1, G-2 | Pending |
| CLA-C28 | HonorCard | L-10, L-11, P-1 | Pending |
| CLA-C29 | SquadCard | S-1 | H-1 v2 uses `TrainTogetherSection` instead (Home-specific, not this reusable slot); standalone SquadCard for S-1 still Pending |
| CLA-C30 | WorkoutSessionCard | W-17–W-19 | Pending |
| CLA-C31 | ExerciseRow | W-22–W-24, W-9–W-16 | Pending |
| CLA-C32 | MemberRow | S-2 | Pending |
| CLA-C33 | TimelineEventRow | L-2 | Pending |
| CLA-C34 | PostCard | Friends/Squad/Community feeds | Pending |
| CLA-C35 | AccomplishmentRow | L-12–L-14, P-1 | Pending |
| CLA-C36 | PhotoThumbnail | L-15, L-16 | Pending |
| CLA-C37 | HomepagePrinciple | H-1 | Complete (v2 — `compositions/HomepagePrinciple`) |
