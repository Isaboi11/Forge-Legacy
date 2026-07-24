# Design Sync — Forge Legacy Notes

## Context

- **Expo / React Native** project — not a standard web React DS
- **`react-native-web`** is a dependency, so components COULD render in web context on a future sync
- **Tokens-only V1** — first sync uploaded CSS custom properties only, no components
- Source of truth for tokens: `src/constants/tokens.ts`
- CSS output committed at: `ds-bundle/tokens/forge-legacy-tokens.css`

## Re-sync checklist

1. Read this file first
2. Check `src/constants/tokens.ts` for any token changes since last sync
3. If tokens changed: update `ds-bundle/tokens/forge-legacy-tokens.css` manually (no converter)
4. Run `DesignSync(finalize_plan)` → upload → `_ds_sync.json` last

## Re-sync risks

- Token values are hand-transcribed from TypeScript to CSS — any future token additions in `tokens.ts` must be manually mirrored to `forge-legacy-tokens.css` (no auto-generation)
- No `_ds_sync.json` anchor was uploaded in V1, so the next sync will re-upload everything (correct behavior)
- When components are eventually implemented: revisit shape, build `dist/`, run the full converter

## Known decisions

- No Storybook — shape = `package`
- No dist/ build — tokens-only V1 was built manually, not via the converter
- System font (`-apple-system, BlinkMacSystemFont, "SF Pro Display"`) — no font file to ship; system fonts serve at runtime (`runtimeFontPrefixes` not needed since no CSS @font-face reference)
- All-caps text-transform is CLA-D14 restricted to `sectionHeader` scale step only
