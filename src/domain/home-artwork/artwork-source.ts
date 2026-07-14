/**
 * resolveArtworkSource — maps a resolver `assetPath` to the bundled image module for
 * `expo-image`. Returns `undefined` for an unregistered path; the Home hero must treat
 * that as "no image" (graceful placeholder), never crash. The asset-registry coverage
 * test guarantees every resolver-producible path is present, so `undefined` should not
 * occur in practice — this is the defensive floor.
 */

import { ARTWORK_SOURCES } from './asset-registry';

export function resolveArtworkSource(assetPath: string): number | undefined {
  return ARTWORK_SOURCES[assetPath];
}
