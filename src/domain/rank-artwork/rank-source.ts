/**
 * resolveRankArtworkSource — maps a `resolveRankArtwork` assetPath to the bundled image
 * module for `expo-image`. Returns `undefined` for an unregistered path; callers (the
 * Home chapter medallion, the Legacy hero seal) must treat that as "no image" and fall
 * back to the graceful bronze placeholder, never crash. The rank-registry coverage test
 * guarantees every resolver-producible path is present, so `undefined` should not occur
 * in practice — this is the defensive floor.
 */

import { RANK_ARTWORK_SOURCES } from './rank-registry';

export function resolveRankArtworkSource(assetPath: string): number | undefined {
  return RANK_ARTWORK_SOURCES[assetPath];
}
