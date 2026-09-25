import { EngravedIcon, engravedTint, type EngravedName } from './primitives/icons/EngravedIcon';
import { flColor } from '@/constants/foundation';

/**
 * The Forge symbol set used by the settings branch screens, ported VERBATIM from `forge-symbols.js`
 * (and the inline SVGs in `Forge Notifications.dc.html` / `Forge Preferences.dc.html`). These are the
 * exact per-row glyphs the design renders, so Notifications, Preferences and Profile Visibility match
 * the north star instead of approximating it.
 *
 * `seal` stands in for the design's `chapter-seal`, which `ForgeSymbols.create` returns null for (it is
 * not in the library) — a shield-check reads "sealed chapter" and, unlike an empty tile, isn't a gap.
 *
 * ⭐ 2026-09-25: every symbol now draws from the PO's engraved set (`EngravedIcon`) — `seal` is now the
 * engraved wax seal. The names above are unchanged so no caller moved.
 */
export type SymbolName =
  | 'target'
  | 'medal'
  | 'book'
  | 'rankUp'
  | 'squad'
  | 'heart'
  | 'banner'
  | 'dumbbell'
  | 'invite'
  | 'trophy'
  | 'spark'
  | 'seal'
  | 'scale'
  | 'haptics'
  | 'sound'
  | 'motion'
  | 'eye'
  /** Somebody wrote something back. Added 0135, when comments first needed a control of their own. */
  | 'chat';

/** Each symbol's drawing in the PO's engraved set (2026-09-25). */
const ENGRAVED: Record<SymbolName, EngravedName> = {
  target: 'target',
  medal: 'medal',
  book: 'book',
  rankUp: 'rank-up',
  squad: 'people',
  heart: 'heart',
  banner: 'banner',
  dumbbell: 'dumbbell',
  invite: 'user-plus',
  trophy: 'trophy',
  spark: 'spark',
  seal: 'seal',
  scale: 'weigh-scale',
  haptics: 'haptics',
  sound: 'speaker',
  motion: 'motion',
  eye: 'eye',
  chat: 'chat',
};

export function ForgeSymbol({
  name,
  size = 18,
  color = flColor.bronze300,
}: {
  name: SymbolName;
  size?: number;
  color?: string;
  /** Ignored since the engraved set — its stroke weights are part of the drawing. Kept so callers compile. */
  strokeWidth?: number;
}) {
  return <EngravedIcon name={ENGRAVED[name]} size={size} color={engravedTint(color)} />;
}
