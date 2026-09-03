# Handoff: Forge Legacy — Screens, Artwork System & Home Workout Artwork Resolver

## Overview
This package is the full Forge Legacy design project: the HTML screen prototypes, the shared
mock-data modules, the artwork system (collections + master reference), and the **Home Workout
Artwork Resolver** (spec + working implementation). It is handed over as one bundle so every
screen keeps its shared references intact.

## About the design files
The files in this bundle are **design references built in HTML** — prototypes that show intended
look and behaviour, not production code to copy line-for-line. The task is to **recreate these
designs in the target codebase's environment** (the Forge app's real framework), using its
established patterns, component library, and data layer. Where a real environment does not exist
yet, choose the most appropriate framework and implement the designs there.

The HTML uses a lightweight in-house component runtime (`support.js`) and `.dc.html` files. That
runtime is a **prototyping tool, not the production architecture** — do not port it. Read the
`.dc.html` files as specifications of layout, behaviour, copy, and data flow.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, motion, and interactions. Recreate the UI
faithfully using the codebase's own libraries. Exact design tokens live in
`_ds/forge-legacy-use-this-5368b220-9e78-4104-bd8b-969c39e84346/tokens/foundation.css`
(`--fl-*` custom properties) — treat that file as the token source of truth.

---

## ⚠ Read this first — source-of-truth & precedence

Several decisions made during design **diverge from the older architecture/blueprint docs**. Those
divergences are intentional and current.

**Precedence, highest to lowest:**
1. The built **screens** (`*.dc.html`) — the authoritative definition of look, flow, and copy.
2. **`FORGE_DELTAS.md`** (in this folder) — the record of every intentional divergence + rationale.
3. The **resolver spec** (`Forge Home Artwork Resolver.dc.html`) for the artwork-resolution system.
4. The older blueprint/PRD (`uploads/Forge-Design-Blueprint-*.md`) — **superseded wherever it
   conflicts** with the above.

> When the screens or `FORGE_DELTAS.md` conflict with the blueprint, the screens and deltas win.
> **Do not "correct" the screens back toward the blueprint.** If a conflict is genuinely unclear,
> stop and flag it — do not guess.

---

## Build order

Nothing visual is correct until the data + resolver foundation exists. Build in this order.

### Phase 0 — Data model foundation (do first; everything depends on it)
The resolver and several screens rely on **structured fields that mostly do not exist yet** in the
mock model. Add them to the real schema before wiring screens. See §14 of the resolver doc and
`FORGE_DELTAS.md` §Data-model. Minimum set:
- `workout.modality` (enum), `workout.split` (enum), `workout.targetMuscleGroups[]`
- `workout.artworkOverride { collection, key }`
- `program.theme` (enum), `program.structure` (`upper_lower | ppl | full_body | …`)
- session-exercise `catalogKey` + per-exercise `workingSets`
- `user.sex` with an explicit **neutral / unspecified** state (see the bug note below)

### Phase 1 — Resolver + manifest + tests
- Port `forge-artwork-resolver.js` to production. It is the **spec of record** for artwork
  resolution: deterministic, centralized, testable, reusable.
- Build the real **asset manifest** (registered key → file), populating `version`, `aspectRatio`,
  and `placement`. Never construct asset filenames dynamically at call sites.
- Implement the **unit-test matrix** from the resolver doc (§16) — especially determinism and the
  "workout card never selects Legacy or Honors" case.

### Phase 2 — Core screens
- **Home** (`Forge Home.dc.html`) — already consumes the resolver; the "Today's Workout" card art,
  title, focus, and count all come from the resolved object. Use it as the reference wiring.
- Workout / program / active-session flows.

### Phase 3 — Peripheral screens
- Legacy, Squads, Community, Settings, Competitions, Onboarding, etc.

### Phase 4 — Assets
- Replace the ~300px prototype crops in `assets/artwork/` with high-res masters.
- Produce the missing **neutral** artwork set (currently a documented male placeholder).

---

## Known issues to fix during implementation
- **Sex default bug:** `forge-user.js` defaults a *missing* sex to `male`. The resolver spec
  requires **neutral**. Fix at the model level and add the neutral asset.
- **Neutral artwork missing:** the resolver's neutral path currently falls back to the male set as
  a documented temporary placeholder. Replace with real neutral art.
- **Structured fields incomplete:** only the single active program (`usr-active-powerbuilding`) has
  `modality/split/structure/theme` populated; every other program/workout still lacks them.
- **Prototype crop resolution:** collection art was sliced from composite reference sheets at low
  resolution — fine for prototype, not for production.

## Artwork system — what exists
Collections live under `assets/artwork/<collection>/<sex|shared>/<key>.png`:
- Sex-specific: `training-splits`, `workout-modalities`, `program-themes`, `exercise-families`
  (each with `male/` and `female/`).
- Shared (both sides): `legacy`, `honors`.
- **Legacy and Honors are reserved** — never used on an active workout card (enforce in code).
- The female **Honors** set intentionally omits four figure-based emblems (see `FORGE_DELTAS.md`).

Reference documents (open in a browser):
- `Forge Artwork Reference.dc.html` — master artwork system: direction, rules, all collections.
- `Forge Home Artwork Resolver.dc.html` — full resolver spec (precedence, contracts, manifest,
  confidence, edge cases, data-model audit, checklists).
- `Forge Workout Modalities Collection.dc.html` — the combined artwork sheet with a Male/Female
  toggle across every activated collection.

## Key files
- Screens: every `*.dc.html` at the project root.
- Shared data / logic: `forge-programs.js`, `forge-user.js`, `forge-exercise-catalog.js`,
  `forge-templates.js`, `forge-artwork-resolver.js`, and the other `forge-*.js` modules.
- Design tokens & components: `_ds/forge-legacy-use-this-5368b220-.../`.
- Artwork: `assets/artwork/`.
- Runtime (prototype only, do not port): `support.js`.

## Design tokens
Use `_ds/.../tokens/foundation.css` verbatim as the token reference — colours (`--fl-bronze-*`,
`--fl-charcoal-*`, `--fl-cream-*`, text/surface tokens), radii (`--fl-radius-*`), shadows,
motion (`--fl-ease-*`, `--fl-duration-*`), and typography (`--fl-font-display` = Playfair Display,
`--fl-font-sans`). Do not invent values outside this system.

## Assets
All artwork was produced for this project and lives in `assets/artwork/`. No third-party or brand
assets are involved. Fonts: Playfair Display (display) + system sans.
