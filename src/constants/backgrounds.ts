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

/**
 * Screen-level bronze radial-glows, verbatim from each `.dc`'s `radial-gradient(rx ry at cx cy,
 * color 0%, transparent stop)` (FORGE_DELTAS §16). Peaks sit off-screen so only the falloff frames the
 * top/bottom edge. Consumed via `<ScreenBackground radials={[BG_RADIAL.x]} />`.
 */
export const BG_RADIAL = {
  /** Friends Feed apex — `120% 44% at 50% -4%`, bronze. */
  friendsApex: { cx: '50%', cy: '-4%', rx: '120%', ry: '44%', color: 'rgba(191,143,79,0.05)', stop: 0.6 },
  /** Squad Detail top — `100% 40% at 50% -6%`, bronze. */
  squadTop: { cx: '50%', cy: '-6%', rx: '100%', ry: '40%', color: 'rgba(191,143,79,0.05)', stop: 0.6 },
  /** Squad Detail bottom — `120% 62% at 50% 108%`, warm. */
  squadBottom: { cx: '50%', cy: '108%', rx: '120%', ry: '62%', color: 'rgba(150,110,60,0.06)', stop: 0.6 },
} as const;
