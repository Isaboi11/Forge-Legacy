import type { RankFamily, RankLevel } from './resolver';
import type { Sex } from '@/domain/profile/schema';

/**
 * Rank badge ARTWORK registry — ONLY alpha-clean, shaped cutouts (verified by the build-time guard in
 * `__tests__/rank-art-alpha.test.mjs`, opaque-bbox fill < 0.90).
 *
 * Families whose badge art is a rectangular black-box matte (foundation, craftsman, architect, builder)
 * or missing entirely (legend) are DELIBERATELY absent from this registry. For those, `resolveRankBadge`
 * returns null and the caller renders the vector `RankSeal` instead — so the retired alpha-flatten black
 * box can never return. Only art that passes the guard is wired here.
 *
 * `established` carries sex variants (both -m and -f are clean, so this swaps trivially); `legacy` is a
 * single sex-neutral badge.
 */

const ESTABLISHED_M: Record<RankLevel, number> = {
  1: require('@/assets/artwork/ranks/established-m-1.png'),
  2: require('@/assets/artwork/ranks/established-m-2.png'),
  3: require('@/assets/artwork/ranks/established-m-3.png'),
  4: require('@/assets/artwork/ranks/established-m-4.png'),
};
const ESTABLISHED_F: Record<RankLevel, number> = {
  1: require('@/assets/artwork/ranks/established-f-1.png'),
  2: require('@/assets/artwork/ranks/established-f-2.png'),
  3: require('@/assets/artwork/ranks/established-f-3.png'),
  4: require('@/assets/artwork/ranks/established-f-4.png'),
};
const LEGACY: Record<RankLevel, number> = {
  1: require('@/assets/artwork/ranks/legacy-1.png'),
  2: require('@/assets/artwork/ranks/legacy-2.png'),
  3: require('@/assets/artwork/ranks/legacy-3.png'),
  4: require('@/assets/artwork/ranks/legacy-4.png'),
};

const REGISTRY: Record<string, Record<RankLevel, number>> = {
  'established-m': ESTABLISHED_M,
  'established-f': ESTABLISHED_F,
  legacy: LEGACY,
};

/**
 * The served registry key for a rank. `established` resolves to a sex variant: a `female` athlete gets
 * `-f`, everyone else `-m` — applying the existing §7 neutral→served-male precedent (an `unspecified`
 * athlete is NOT guessed male; it's served the documented male placeholder until a real neutral asset /
 * decision lands, exactly as the home-artwork resolver already does). `legacy` is sex-neutral.
 * Every other family returns null → no clean art → vector RankSeal fallback.
 */
function badgeKey(family: RankFamily, sex?: Sex): string | null {
  if (family === 'established') return sex === 'female' ? 'established-f' : 'established-m';
  if (family === 'legacy') return 'legacy';
  return null;
}

/**
 * Resolve the rank badge artwork module for a tier, or null when no guard-passing art exists (the
 * caller then renders the vector RankSeal). Never returns a black-box asset — the registry only holds
 * guard-verified cutouts.
 */
export function resolveRankBadge(args: { family: RankFamily; level: RankLevel; sex?: Sex }): number | null {
  const key = badgeKey(args.family, args.sex);
  if (!key) return null;
  return REGISTRY[key]?.[args.level] ?? null;
}
