import type { RunSnapshot } from '@/domain/workout/live-activity-plan';
import type { WatchState } from '@/domain/workout/watch-projection';

/**
 * ══ THE LOCK-SCREEN CARD — WEB HALF ══
 *
 * There is no lock screen on the web preview. ActivityKit is an iOS framework, and no browser can put
 * anything on a phone's lock screen or in its Dynamic Island.
 *
 * So this is a real no-op, not a placeholder — the same reason `watch-bridge.web.ts` exists: so
 * `workout.tsx` and `CardioBlockCard` call the same three functions on both platforms and never branch.
 * Every signature matches `live-activity.ts` exactly.
 */

export function pushLiveActivityState(_ws: WatchState, _meta: { workoutName: string; startedAt: string }): void {}

export function pushLiveActivityRun(_snapshot: RunSnapshot | null): void {}

export function endLiveActivity(_how: 'finished' | 'discarded'): void {}
