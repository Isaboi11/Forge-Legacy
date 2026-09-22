import type { WatchCommandResult } from '@/domain/workout/watch-commands';
import type { WatchState } from '@/domain/workout/watch-projection';

/**
 * ══ THE WIRE BETWEEN THE PHONE AND THE WRIST — WEB HALF ══
 *
 * There is no wrist on the web preview and there never will be: WatchConnectivity is an iOS framework,
 * and no browser can reach an Apple Watch (`Wearable-Integration-Feasibility-Note.md` §1 — no HealthKit
 * web API, no Web Bluetooth path to it).
 *
 * So this is a real no-op, not a placeholder. It exists for the same reason `ding.web.ts` does: so
 * `workout.tsx` can call the same four functions on both platforms and never branch on which one it is
 * running on. Every signature below matches `watch-bridge.ts` exactly, and the export surface is
 * type-checked against it by the shared call sites.
 *
 * ⚠ `isWatchReachable()` IS FALSE HERE, ALWAYS. That is the honest answer and it is load-bearing: the
 * PO tests on the web preview, and a bridge that claimed reachability there would show watch-connected
 * affordances on a surface that has no watch.
 */

export function pushWatchState(_state: WatchState): void {}

export function resetWatchStateCache(): void {}

export function isWatchReachable(): boolean {
  return false;
}

export function subscribeWatchCommands(_onResult?: (result: WatchCommandResult) => void): () => void {
  return () => {};
}
