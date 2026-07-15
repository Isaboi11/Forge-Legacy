/**
 * Screen background artwork — the design's per-screen photographic/textured backgrounds, imported
 * from the handoff. These EXISTED in `design_reference/.../assets/` and were simply never wired
 * (FORGE_DELTAS §16 — a DROPPED-FREE miss, the app rendered a flat gradient instead). Metro needs
 * static `require()` literals. Consumed only via `<ScreenBackground image={SCREEN_BG.x} />`.
 *
 * Palette (from the `.dc` set): `slate` = default standard screens; `slate2` = settings / program /
 * records; `bg2` = create / detail screens; `legacy` = Legacy-family (mountains, the `legacyMountains`
 * layer drives the scroll-fade); `squadDetail` / `squadsHub` = the two squad surfaces.
 */
export const SCREEN_BG = {
  slate: require('@/assets/backgrounds/forge-slate.png'),
  slate2: require('@/assets/backgrounds/forge-slate2.png'),
  bg2: require('@/assets/backgrounds/forge-bg-2.png'),
  legacy: require('@/assets/backgrounds/legacy-bg.png'),
  legacyMountains: require('@/assets/backgrounds/hero-mountains.png'),
  squadDetail: require('@/assets/backgrounds/squad-bg-continued.png'),
  squadsHub: require('@/assets/backgrounds/squads-hub-bg.png'),
} as const;
