/**
 * demo-loop-prefetch — warm the demonstration clips a session is about to need.
 *
 * The loops are 0.5–1.2 MB apiece and load on first view of each exercise's hero slot; on gym
 * reception that reads as "takes forever" (PO, 2026-09-09). Starting a workout names every planned
 * lift up front, so the whole list is handed to expo-image's disk prefetch the moment the session
 * starts, and the downloads race the warm-up instead of the athlete.
 *
 * Fire-and-forget on purpose: prefetch must never block or fail a workout. A miss costs nothing —
 * the slot's own load path (`ExerciseLoop`) is unchanged and still fetches on mount; this only means
 * the bytes are usually already on disk when it does. Lives in `src/lib` (not the domain layer) so
 * `node --test` never has to resolve expo-image.
 */

import { Image } from 'expo-image';

import { exerciseDemoUrl, type AthleteSex } from '@/domain/exercise-detail/media';

export function prefetchDemoLoops(
  catalogKeys: readonly (string | null | undefined)[],
  sex: AthleteSex | null | undefined,
): void {
  // Dedupe — a superset program can carry the same lift twice, and a repeated URL is a repeated MB.
  const urls = [...new Set(catalogKeys.map((k) => exerciseDemoUrl(k, sex)))].filter(
    (u): u is string => !!u,
  );
  if (urls.length === 0) return;
  // `disk` is the same store ExerciseLoop's `cachePolicy="memory-disk"` reads through. A prefetch
  // failure is swallowed: the mount-time load is the retry, and nothing here may throw at a caller
  // that is busy starting a workout.
  void Image.prefetch(urls, { cachePolicy: 'disk' }).catch(() => {});
}
