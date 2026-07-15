/**
 * Rank badge artwork resolver — maps a rank tier (family + level, plus sex for the
 * one sex-specific family) to a bundled badge asset. Deterministic, pure (no
 * `require`), so it runs under both Metro and `node --test`.
 *
 * Provenance (design handoff, verified/RESOLVED — no open flags): the 7 rank
 * families each have 4 levels, imported into `assets/artwork/ranks/`:
 *   Foundation · Builder · Craftsman · Architect · Established · Legend · Legacy
 * `Established` is sex-specific (`-m` / `-f`); every other family is one badge per
 * level. On disk the source `hall-*` became `legend-*` and `legacy-rank-*` became
 * `legacy-*` (the duplicate `legacy-*` source set was skipped at import).
 *
 * Ranks are an IDENTITY surface, kept separate from the Home workout-artwork resolver
 * (which deliberately excludes Legacy/Honors from the workout card). This module owns
 * rank art only.
 */

import type { Sex } from '../profile/schema';

export type RankFamily = 'foundation' | 'builder' | 'craftsman' | 'architect' | 'established' | 'legend' | 'legacy';

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
export const RANK_LEVELS: readonly RankLevel[] = [1, 2, 3, 4];

/** Only `established` has distinct male/female badge art. */
export const SEX_SPECIFIC_FAMILIES: readonly RankFamily[] = ['established'];

export interface RankTier {
  family: RankFamily;
  level: RankLevel;
}

/**
 * PLACEHOLDER current rank — there is NO rank backend yet (no RCM evaluation wired to
 * an athlete). The Home chapter medallion + Legacy hero seal display THIS demo tier so
 * the imported badge art is visible; swap for the real evaluated rank when it lands.
 */
export const PLACEHOLDER_RANK: RankTier = { family: 'foundation', level: 3 };

/** Served sex for sex-specific art. Mirrors the Home resolver: neutral/unspecified → male (documented placeholder). */
export type ServedRankSex = 'male' | 'female';

export interface ResolvedRankArtwork {
  family: RankFamily;
  level: RankLevel;
  /** Set ONLY for sex-specific families (`established`); undefined otherwise. */
  sexVariant?: ServedRankSex;
  /** `assets/artwork/ranks/<file>.png` — the key into the rank registry. */
  assetPath: string;
  reason: string;
}

const BASE = 'assets/artwork/ranks';

function isSexSpecific(family: RankFamily): boolean {
  return SEX_SPECIFIC_FAMILIES.includes(family);
}

/** Saved selection only — never inferred. Female → female; male/unspecified/missing → male. */
function servedSex(sex?: Sex): ServedRankSex {
  return sex === 'female' ? 'female' : 'male';
}

/** The registry key (relative asset path) for a rank tier. */
export function rankAssetPath(family: RankFamily, level: RankLevel, sex?: Sex): string {
  if (isSexSpecific(family)) {
    return `${BASE}/${family}-${servedSex(sex) === 'female' ? 'f' : 'm'}-${level}.png`;
  }
  return `${BASE}/${family}-${level}.png`;
}

/**
 * Resolve a rank tier to its badge asset. Pure — returns the assetPath (registry key);
 * `resolveRankArtworkSource` maps that to the bundled module. Callers must treat a
 * missing source as "no image" (graceful placeholder), never a crash.
 */
export function resolveRankArtwork({ family, level, sex }: RankTier & { sex?: Sex }): ResolvedRankArtwork {
  if (isSexSpecific(family)) {
    const variant = servedSex(sex);
    const neutralNote = sex !== 'male' && sex !== 'female' ? ' (neutral → male placeholder)' : '';
    return {
      family,
      level,
      sexVariant: variant,
      assetPath: rankAssetPath(family, level, sex),
      reason: `${family} rank is sex-specific; served ${variant}${neutralNote}`,
    };
  }
  return {
    family,
    level,
    assetPath: rankAssetPath(family, level),
    reason: `${family} rank level ${level}`,
  };
}
