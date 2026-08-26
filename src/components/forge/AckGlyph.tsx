import Svg, { Circle, Path } from 'react-native-svg';

import { flColor } from '@/constants/foundation';
import type { AckKind } from '@/data/squad-feed-live';

/**
 * One mark per acknowledgement kind — Respect · Honor · Support · Strength (SOC-A4-D3).
 *
 * PO: *"make different symbols for each. Simple ones."*
 *
 * ══ WHY FOUR SILHOUETTES AND NOT FOUR COLOURS ══
 *
 * Every kind used the same flame, so the row could tell you that somebody had acknowledged a post and
 * never which way — the whole point of having four. Colour alone would not fix it: they all share the
 * bronze, and a bronze-versus-bronze distinction at 17pt is no distinction. The difference has to be in
 * the SHAPE, readable at a glance and at a thumbnail size.
 *
 * ⚠ EACH IS A DIFFERENT OUTLINE, NOT A DIFFERENT DETAIL. At 17pt an icon is a silhouette and nothing
 * more, so the four were chosen to disagree at that size: a flame tapers to a point, a rosette is round
 * with tails, an arrow is a vertical spike, a barbell is horizontal. Any two of them are distinguishable
 * squinting.
 *
 *   · Respect   — the flame. Unchanged, because it is the default a plain tap still writes, and every
 *                 acknowledgement in the database before 0178 was one.
 *   · Honor     — a rosette: a medal given, not a fire lit.
 *   · Support   — an arrow lifting off a baseline. Somebody underneath you, pushing up.
 *   · Strength  — a barbell. The only literal one, and the one nobody will misread.
 *
 * ⚠ STROKE ONLY, NO FILL. The row draws these beside sans-serif labels at text weight; a filled mark
 * would out-weigh its own label and turn a quiet action row into four badges.
 */
export function AckGlyph({ kind, on, size = 17 }: { kind: AckKind; on?: boolean; size?: number }) {
  const color = on ? flColor.bronze300 : flColor.gray400;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (kind === 'honor') {
    return (
      <Svg {...common}>
        <Circle cx={12} cy={9} r={5} />
        {/* The two ribbon tails — what makes it a medal rather than a coin. */}
        <Path d="M9 13.5 7.5 21l4.5-2.5L16.5 21 15 13.5" />
      </Svg>
    );
  }

  if (kind === 'support') {
    return (
      <Svg {...common}>
        <Path d="M12 20V6" />
        <Path d="M6.5 11.5 12 6l5.5 5.5" />
        {/* The baseline is the point: lifted FROM somewhere, by somebody. */}
        <Path d="M5 21h14" />
      </Svg>
    );
  }

  if (kind === 'strength') {
    return (
      <Svg {...common}>
        <Path d="M4 12h16" />
        <Path d="M6.5 8.5v7M17.5 8.5v7" />
        <Path d="M3.5 10.5v3M20.5 10.5v3" />
      </Svg>
    );
  }

  // respect — the flame, and the default.
  return (
    <Svg {...common}>
      <Path d="M12 3c3.5 4 5.5 6.2 5.5 9.2A5.5 5.5 0 0 1 6.5 12.2C6.5 9.9 8 8 9.2 6.6c.5 1.4 1.3 2.2 2.1 2.6C11.1 7 11.3 5 12 3z" />
    </Svg>
  );
}
