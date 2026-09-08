import type { RankFamily, RankLevel } from './resolver';
import { IS_PAPER } from '@/constants/foundation';
import type { Sex } from '@/domain/profile/schema';

/**
 * Rank badge ARTWORK registry — alpha-clean, shaped cutouts for ALL seven families (verified by the
 * build-time guard in `__tests__/rank-art-alpha.test.mjs`, opaque-bbox fill < 0.90).
 *
 * foundation/builder/craftsman/architect/legend were imported from the design source (`Rank
 * Progression.dc.html`) and background-cut (the black surround flood-removed to transparency); `legend`
 * comes from the design's `hall` art. `established` carries sex variants (both -m and -f are clean);
 * `legacy` and the five above are single sex-neutral badges. Every family now resolves to real art, so
 * the vector `RankSeal` is only a defensive fallback.
 */

// NOTE: React Native's Metro bundler requires static string literals in require(), so every path is
// enumerated explicitly rather than built from the family name.
/**
 * ══ TWO SETS, ONE SELECTOR — AND BOTH HAVE TO BE ENUMERATED ══
 *
 * `constants/backgrounds.ts` carries the identical shape for the screen plates, and the identical
 * reason: *"Metro resolves `require()` from a STRING LITERAL at build time — it cannot take a variable,
 * so the theme cannot be interpolated into the path."* Both sets are written out and the choice is made
 * once, here, on the resolved module. Every call site is untouched: it asks `resolveRankBadge` for a
 * tier and gets whichever plate the active theme means by it.
 *
 * The Alabaster set is the DESIGN'S OWN Paper Mode delivery — 32 graded cutouts plus the two tools that
 * produced them, in `scripts/badges/` with the handoff spec beside them. It replaced a transform I wrote
 * first; the design's is authored art and governs (PD-7).
 *
 * ⚠ THE TWO SETS DO NOT SHARE A SILHOUETTE, and assuming they did was the mistake in the version this
 * replaced. Builder and Craftsman are geometrically RE-CUT (`tools/die-cut.js`) because their source
 * alpha is not a usable outline, and Architect's bottom point is reconstructed because its source canvas
 * ends mid-taper. What every family except Architect does keep is its master's ASPECT, which is the only
 * property the render sites depend on — see `__tests__/rank-art-alpha.test.mjs`.
 *
 * ⚠ `hall` IS `legend`. The delivery names that family after the design's `hall` art; this repo has
 * always called it `legend` (see the header above). The files were renamed on the way in, so a future
 * re-delivery must be renamed too or four badges will silently go missing.
 *
 * ⚠ THE BADGES GO FROM 12 MB TO 33 MB, and both sets ship to every athlete regardless of theme. Same
 * price `backgrounds.ts` pays, and worth stating plainly rather than discovering in a bundle report —
 * but larger than that file's, because the Paper delivery is drawn at a much higher resolution than the
 * masters for three families (foundation 4.7x the pixels, hall/legend 5.7x, architect 7.6x). Every
 * badge in this app renders at 150pt. If it needs to come down, downscaling the Paper set to its
 * masters' dimensions is the lever and costs nothing visible; dropping a theme is not.
 */
const FORGE_BADGES: Record<string, Record<RankLevel, number>> = {
  foundation: {
    1: require('@/assets/artwork/ranks/foundation-1.png'),
    2: require('@/assets/artwork/ranks/foundation-2.png'),
    3: require('@/assets/artwork/ranks/foundation-3.png'),
    4: require('@/assets/artwork/ranks/foundation-4.png'),
  },
  builder: {
    1: require('@/assets/artwork/ranks/builder-1.png'),
    2: require('@/assets/artwork/ranks/builder-2.png'),
    3: require('@/assets/artwork/ranks/builder-3.png'),
    4: require('@/assets/artwork/ranks/builder-4.png'),
  },
  craftsman: {
    1: require('@/assets/artwork/ranks/craftsman-1.png'),
    2: require('@/assets/artwork/ranks/craftsman-2.png'),
    3: require('@/assets/artwork/ranks/craftsman-3.png'),
    4: require('@/assets/artwork/ranks/craftsman-4.png'),
  },
  architect: {
    1: require('@/assets/artwork/ranks/architect-1.png'),
    2: require('@/assets/artwork/ranks/architect-2.png'),
    3: require('@/assets/artwork/ranks/architect-3.png'),
    4: require('@/assets/artwork/ranks/architect-4.png'),
  },
  'established-m': {
    1: require('@/assets/artwork/ranks/established-m-1.png'),
    2: require('@/assets/artwork/ranks/established-m-2.png'),
    3: require('@/assets/artwork/ranks/established-m-3.png'),
    4: require('@/assets/artwork/ranks/established-m-4.png'),
  },
  'established-f': {
    1: require('@/assets/artwork/ranks/established-f-1.png'),
    2: require('@/assets/artwork/ranks/established-f-2.png'),
    3: require('@/assets/artwork/ranks/established-f-3.png'),
    4: require('@/assets/artwork/ranks/established-f-4.png'),
  },
  legend: {
    1: require('@/assets/artwork/ranks/legend-1.png'),
    2: require('@/assets/artwork/ranks/legend-2.png'),
    3: require('@/assets/artwork/ranks/legend-3.png'),
    4: require('@/assets/artwork/ranks/legend-4.png'),
  },
  legacy: {
    1: require('@/assets/artwork/ranks/legacy-1.png'),
    2: require('@/assets/artwork/ranks/legacy-2.png'),
    3: require('@/assets/artwork/ranks/legacy-3.png'),
    4: require('@/assets/artwork/ranks/legacy-4.png'),
  },
};

const PAPER_BADGES: Record<string, Record<RankLevel, number>> = {
  foundation: {
    1: require('@/assets/artwork/ranks/foundation-1-paper.png'),
    2: require('@/assets/artwork/ranks/foundation-2-paper.png'),
    3: require('@/assets/artwork/ranks/foundation-3-paper.png'),
    4: require('@/assets/artwork/ranks/foundation-4-paper.png'),
  },
  builder: {
    1: require('@/assets/artwork/ranks/builder-1-paper.png'),
    2: require('@/assets/artwork/ranks/builder-2-paper.png'),
    3: require('@/assets/artwork/ranks/builder-3-paper.png'),
    4: require('@/assets/artwork/ranks/builder-4-paper.png'),
  },
  craftsman: {
    1: require('@/assets/artwork/ranks/craftsman-1-paper.png'),
    2: require('@/assets/artwork/ranks/craftsman-2-paper.png'),
    3: require('@/assets/artwork/ranks/craftsman-3-paper.png'),
    4: require('@/assets/artwork/ranks/craftsman-4-paper.png'),
  },
  architect: {
    1: require('@/assets/artwork/ranks/architect-1-paper.png'),
    2: require('@/assets/artwork/ranks/architect-2-paper.png'),
    3: require('@/assets/artwork/ranks/architect-3-paper.png'),
    4: require('@/assets/artwork/ranks/architect-4-paper.png'),
  },
  'established-m': {
    1: require('@/assets/artwork/ranks/established-m-1-paper.png'),
    2: require('@/assets/artwork/ranks/established-m-2-paper.png'),
    3: require('@/assets/artwork/ranks/established-m-3-paper.png'),
    4: require('@/assets/artwork/ranks/established-m-4-paper.png'),
  },
  'established-f': {
    1: require('@/assets/artwork/ranks/established-f-1-paper.png'),
    2: require('@/assets/artwork/ranks/established-f-2-paper.png'),
    3: require('@/assets/artwork/ranks/established-f-3-paper.png'),
    4: require('@/assets/artwork/ranks/established-f-4-paper.png'),
  },
  legend: {
    1: require('@/assets/artwork/ranks/legend-1-paper.png'),
    2: require('@/assets/artwork/ranks/legend-2-paper.png'),
    3: require('@/assets/artwork/ranks/legend-3-paper.png'),
    4: require('@/assets/artwork/ranks/legend-4-paper.png'),
  },
  legacy: {
    1: require('@/assets/artwork/ranks/legacy-1-paper.png'),
    2: require('@/assets/artwork/ranks/legacy-2-paper.png'),
    3: require('@/assets/artwork/ranks/legacy-3-paper.png'),
    4: require('@/assets/artwork/ranks/legacy-4-paper.png'),
  },
};

const REGISTRY = IS_PAPER ? PAPER_BADGES : FORGE_BADGES;

/**
 * The served registry key for a rank. `established` resolves to a sex variant: a `female` athlete gets
 * `-f`, everyone else `-m` (the §7 neutral→served-male precedent — an `unspecified` athlete is served the
 * documented male placeholder, not guessed). Every other family is sex-neutral, keyed by family name.
 */
function badgeKey(family: RankFamily, sex?: Sex): string {
  if (family === 'established') return sex === 'female' ? 'established-f' : 'established-m';
  return family;
}

/**
 * Resolve the rank badge artwork module for a tier, or null when no art exists (the caller then renders
 * the vector RankSeal). With all seven families registered this is effectively always non-null; the null
 * path remains as a defensive fallback.
 */
export function resolveRankBadge(args: { family: RankFamily; level: RankLevel; sex?: Sex }): number | null {
  return REGISTRY[badgeKey(args.family, args.sex)]?.[args.level] ?? null;
}
