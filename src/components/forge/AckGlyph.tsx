import { EngravedIcon, type EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
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
 *   · Support   — a hand lifting. Somebody underneath you, pushing up.
 *   · Strength  — a barbell. The only literal one, and the one nobody will misread.
 *
 * ⚠ STROKE ONLY, NO FILL. The row draws these beside sans-serif labels at text weight; a filled mark
 * would out-weigh its own label and turn a quiet action row into four badges.
 */
const GLYPH: Record<string, EngravedName> = {
  honor: 'medal',
  support: 'support',
  strength: 'barbell',
};

export function AckGlyph({ kind, on, size = 17 }: { kind: AckKind; on?: boolean; size?: number }) {
  // On = the engraved bronze; off = flat grey (state). Respect — the flame — is the default.
  return <EngravedIcon name={GLYPH[kind] ?? 'flame'} size={size} color={on ? undefined : flColor.gray400} />;
}
