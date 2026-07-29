import Svg, { Circle, Path } from 'react-native-svg';
import { flColor } from '@/constants/foundation';

/**
 * Squad crest glyph — the 8 keys a squad can pick (`Create Squad.dc.html` CRESTS array, in order). Single
 * source for crest rendering across the Create picker + live hero preview, Hub cards, Detail hero, and
 * Squad Settings. Stroke glyphs (24×24), matching the ForgeSymbol style; `target`/`medal` use circles.
 */

export type CrestKey = 'swords' | 'mountain' | 'shield' | 'flame' | 'dumbbell' | 'medal' | 'trophy' | 'target';
export const CREST_KEYS: CrestKey[] = ['swords', 'mountain', 'shield', 'flame', 'dumbbell', 'medal', 'trophy', 'target'];

const CRESTS: Record<CrestKey, { paths?: string[]; circles?: [number, number, number][] }> = {
  swords: { paths: ['M14.5 17.5 L3 6 L3 3 L6 3 L17.5 14.5', 'M13 19 L19 13', 'M16 16 L20 20', 'M14.5 6.5 L18 3 L21 3 L21 6 L17.5 9.5', 'M5 14 L9 18', 'M7 17 L4 20'] },
  mountain: { paths: ['M3 18 L9 8 L13 14 L16 10 L21 18', 'M9 8 l1.6 2.4'] },
  shield: { paths: ['M12 3 L19 6 v5 c0 4.5 -3 7.5 -7 9 c-4 -1.5 -7 -4.5 -7 -9 V6 Z'] },
  flame: { paths: ['M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6 .5-2.7 1.2-3.4 .2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z'] },
  dumbbell: { paths: ['M7 8v8', 'M4.5 9.5v5', 'M17 8v8', 'M19.5 9.5v5', 'M7 12h10'] },
  medal: { paths: ['M8.5 3 L12 9', 'M15.5 3 L12 9'], circles: [[12, 15, 5.4], [12, 15, 2.1]] },
  trophy: { paths: ['M8 4h8v5a4 4 0 0 1-8 0z', 'M8 4H5.5a2 2 0 0 0 0 4H8', 'M16 4h2.5a2 2 0 0 1 0 4H16', 'M12 13v3', 'M9 20h6', 'M10 20l.6-4', 'M14 20l-.6-4'] },
  target: { circles: [[12, 12, 8], [12, 12, 4.6], [12, 12, 1.3]] },
};

export function SquadCrest({ crest, size = 24, color = flColor.bronze300, strokeWidth = 1.7 }: { crest: string; size?: number; color?: string; strokeWidth?: number }) {
  const def = CRESTS[crest as CrestKey] ?? CRESTS.swords;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {def.paths?.map((d, i) => (
        <Path key={i} d={d} />
      ))}
      {def.circles?.map(([cx, cy, r], i) => (
        <Circle key={`c${i}`} cx={cx} cy={cy} r={r} />
      ))}
    </Svg>
  );
}
