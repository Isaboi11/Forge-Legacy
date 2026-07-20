/**
 * HonorGlyph — renders a category glyph by name for the Honors Hub (Design `forge-honors.js` category
 * glyphs). The reachable categories today are `origin` (flame), `training` (dumbbell), and `chapters`
 * (book); the rest fall back to a neutral forged seal until their glyphs are ported from the map's
 * `ForgeSymbols`. The flame path is identical to the locked First Honor Ceremony mark, so Initiative reads
 * the same everywhere.
 */

import Svg, { Circle, Path } from 'react-native-svg';

import { flColor } from '@/constants/foundation';
import type { HonorGlyphName } from '@/domain/honor/catalog';

type Part = { d: string } | { c: [number, number, number] };

const GLYPHS: Partial<Record<HonorGlyphName, Part[]>> & { __default: Part[] } = {
  // The locked Initiative flame (same path as the ceremony's HonorSymbol).
  flame: [{ d: 'M12 3c.6 3.2 3.4 4.4 3.4 7.6a3.4 3.4 0 0 1-6.8 0c0-1 .3-1.7.7-2.3-1.9 1-3.3 3-3.3 5.4a5.3 5.3 0 0 0 10.6 0C16.6 8.4 13.9 6 12 3z' }],
  // Barbell (ported from the app's Workouts tab glyph).
  dumbbell: [{ d: 'M6.5 9v6' }, { d: 'M17.5 9v6' }, { d: 'M4 10.5v3' }, { d: 'M20 10.5v3' }, { d: 'M6.5 12h11' }],
  // Open book (ported from the app's Legacy tab glyph).
  book: [{ d: 'M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5' }, { d: 'M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z' }],
  // Neutral forged seal — placeholder for categories whose glyph isn't ported yet.
  __default: [{ d: 'M12 3l7 7-7 7-7-7z' }, { d: 'M12 8.5l3.5 3.5-3.5 3.5-3.5-3.5z' }],
};

export function HonorGlyph({ glyph, size = 30, color = flColor.bronze300, strokeWidth = 1.7 }: { glyph: HonorGlyphName; size?: number; color?: string; strokeWidth?: number }) {
  const parts = GLYPHS[glyph] ?? GLYPHS.__default;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {parts.map((p, i) => ('c' in p ? <Circle key={i} cx={p.c[0]} cy={p.c[1]} r={p.c[2]} /> : <Path key={i} d={p.d} />))}
    </Svg>
  );
}
