import type { RankFamily, RankLevel } from './resolver';
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
const REGISTRY: Record<string, Record<RankLevel, number>> = {
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
