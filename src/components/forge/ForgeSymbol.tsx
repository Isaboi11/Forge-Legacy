import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { flColor } from '@/constants/foundation';

/**
 * The Forge symbol set used by the settings branch screens, ported VERBATIM from `forge-symbols.js`
 * (and the inline SVGs in `Forge Notifications.dc.html` / `Forge Preferences.dc.html`). These are the
 * exact per-row glyphs the design renders, so Notifications, Preferences and Profile Visibility match
 * the north star instead of approximating it.
 *
 * `seal` stands in for the design's `chapter-seal`, which `ForgeSymbols.create` returns null for (it is
 * not in the library) — a shield-check reads "sealed chapter" and, unlike an empty tile, isn't a gap.
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

const p = (d: string) => <Path key={d} d={d} />;

const SYMBOLS: Record<SymbolName, (color: string) => ReactNode> = {
  target: (c) => [
    <Circle key="o" cx={12} cy={12} r={8.5} />,
    <Circle key="m" cx={12} cy={12} r={4.6} />,
    <Circle key="i" cx={12} cy={12} r={1.2} fill={c} stroke="none" />,
  ],
  medal: () => [
    <Circle key="o" cx={12} cy={14.5} r={4.8} />,
    <Circle key="i" cx={12} cy={14.5} r={1.8} />,
    p('M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4'),
  ],
  book: () => [p('M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5'), p('M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z')],
  rankUp: () => [p('M6 13l6-6 6 6'), p('M6 18l6-6 6 6')],
  squad: () => [
    <Circle key="a" cx={7.5} cy={8} r={2.7} />,
    <Circle key="b" cx={16.5} cy={8} r={2.7} />,
    p('M3 19.5a4.5 4.5 0 0 1 9 0'),
    p('M12 19.5a4.5 4.5 0 0 1 9 0'),
  ],
  heart: () => [p('M12 20C6.6 15.5 4 12.4 4 9.2A4 4 0 0 1 11.2 6.8L12 7.8 12.8 6.8A4 4 0 0 1 20 9.2C20 12.4 17.4 15.5 12 20z')],
  banner: () => [p('M6 4h12v14l-6-3.5L6 18z'), p('M6 8.5h12')],
  dumbbell: () => [p('M6.5 9v6'), p('M17.5 9v6'), p('M4 10.5v3'), p('M20 10.5v3'), p('M6.5 12h11')],
  invite: () => [<Circle key="h" cx={9} cy={8} r={3.2} />, p('M3 19a6 6 0 0 1 12 0'), p('M18.5 7v6M15.5 10h6')],
  trophy: () => [
    p('M8 4h8v3.5a4 4 0 0 1-8 0z'),
    p('M8 5.5H5.3c0 2.4 1 3.6 2.9 3.9'),
    p('M16 5.5h2.7c0 2.4-1 3.6-2.9 3.9'),
    p('M12 11.5V15'),
    p('M9 19h6l-.6-4h-4.8z'),
  ],
  spark: () => [
    p('M11 3c.4 3.4 1.6 4.6 5 5-3.4.4-4.6 1.6-5 5-.4-3.4-1.6-4.6-5-5 3.4-.4 4.6-1.6 5-5z'),
    p('M18 13c.2 1.7.8 2.3 2.5 2.5-1.7.2-2.3.8-2.5 2.5-.2-1.7-.8-2.3-2.5-2.5 1.7-.2 2.3-.8 2.5-2.5z'),
  ],
  seal: () => [p('M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z'), p('M9.2 12l2 2 3.6-3.6')],
  scale: () => [p('M12 4.5v14'), p('M8.5 18.5h7'), p('M5 8h14'), p('M5 8l-2.2 4.4a2.8 2.8 0 0 0 5.6 0z'), p('M19 8l-2.2 4.4a2.8 2.8 0 0 0 5.6 0z')],
  haptics: () => [<Rect key="r" x={8} y={3.5} width={8} height={17} rx={2.4} />, p('M4.5 9v6'), p('M19.5 9v6')],
  sound: () => [p('M5 9.5h3l4-3.5v12l-4-3.5H5z'), p('M16 9a4 4 0 0 1 0 6'), p('M18.5 6.5a7.5 7.5 0 0 1 0 11')],
  motion: () => [<Circle key="c" cx={12} cy={12} r={8.5} />, p('M12 7v5l3 2')],
  eye: () => [p('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z'), <Circle key="p" cx={12} cy={12} r={3} />],
  chat: () => [p('M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z')],
};

export function ForgeSymbol({
  name,
  size = 18,
  color = flColor.bronze300,
  strokeWidth = 1.8,
}: {
  name: SymbolName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {SYMBOLS[name](color)}
    </Svg>
  );
}
