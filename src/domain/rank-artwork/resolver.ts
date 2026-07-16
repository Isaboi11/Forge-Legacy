/**
 * Rank tier vocabulary — the 7 families × 4 levels, plus the placeholder current rank.
 *
 * The raster badge resolver + registry that mapped a tier to a flattened PNG were RETIRED once the
 * vector `RankSeal` (src/components/forge/RankSeal.tsx) replaced the raster badge at every render
 * site (Home medallion, Legacy hero, rank-up ceremony) — the flatten is structurally impossible in
 * vector. This module now owns only the rank-tier types, the family order (used to order rank-up
 * ceremonies), and the demo placeholder rank.
 */

export type RankFamily = 'foundation' | 'builder' | 'craftsman' | 'architect' | 'established' | 'legend' | 'legacy';

/** Family order, low → high — consumed by `domain/ceremony/queue` to order rank-up ceremonies. */
export const RANK_FAMILIES: readonly RankFamily[] = [
  'foundation',
  'builder',
  'craftsman',
  'architect',
  'established',
  'legend',
  'legacy',
];

export type RankLevel = 1 | 2 | 3 | 4;

export interface RankTier {
  family: RankFamily;
  level: RankLevel;
}

/**
 * PLACEHOLDER current rank — there is NO rank backend yet (no RCM evaluation wired to an athlete).
 * The Home medallion, Legacy hero seal, and rank-up ceremony display THIS demo tier via `RankSeal`;
 * swap for the real evaluated rank when it lands.
 */
export const PLACEHOLDER_RANK: RankTier = { family: 'foundation', level: 3 };
