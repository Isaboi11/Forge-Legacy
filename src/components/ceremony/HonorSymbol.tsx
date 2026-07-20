/**
 * HonorSymbol — the per-honor mark that sits inside the forged medallion of the honor ceremony
 * (`Forge First Honor Ceremony.dc.html`). This is the ONE part of the ceremony that changes per honor;
 * the medallion, coloring, and glow stay identical across every honor.
 *
 * The flame is the design's Initiative mark. Honors without a bespoke mark yet fall back to a neutral
 * forged seal (an engraved diamond) — a placeholder, never a fabricated per-honor emblem — until their
 * real glyphs are designed. Keyed on the honor's display name (the only id a `honorEarned` ceremony
 * carries).
 */

import Svg, { Path } from 'react-native-svg';
import { flColor } from '@/constants/foundation';

/** Stroke-path glyphs on a 24-grid, matching the design's flame. */
const SYMBOLS: Record<string, string[]> = {
  // The design's living flame (Forge First Honor Ceremony.dc.html).
  Initiative: ['M12 3c.6 3.2 3.4 4.4 3.4 7.6a3.4 3.4 0 0 1-6.8 0c0-1 .3-1.7.7-2.3-1.9 1-3.3 3-3.3 5.4a5.3 5.3 0 0 0 10.6 0C16.6 8.4 13.9 6 12 3z'],
  // Neutral forged seal — the placeholder mark for honors whose glyph isn't designed yet.
  __default: ['M12 3l7 7-7 7-7-7z', 'M12 8.5l3.5 3.5-3.5 3.5-3.5-3.5z'],
};

export function HonorSymbol({ honorName, size = 50, color = flColor.bronze300 }: { honorName: string; size?: number; color?: string }) {
  const paths = SYMBOLS[honorName] ?? SYMBOLS.__default;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
