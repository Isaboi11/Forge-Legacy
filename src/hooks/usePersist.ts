import { useCallback } from 'react';

import { errorMessage } from '@/lib/useQuery';
import { useToast } from './useCeremony';

/**
 * THE ONE WAY A USER-INITIATED WRITE IS ALLOWED TO FAIL.
 *
 * ══ WHY THIS EXISTS ══
 *
 * `preferences.tsx` already had this exact shape, under a comment that got it exactly right:
 *
 *     "A settings screen that lies about what it saved is worse than one that fails loudly."
 *
 * It was applied to that one screen. The 2026-08-12 audit found **fifteen** other places doing
 * `void save(...)` with no rejection arm — every settings toggle, the privacy audience picker, "Reset to
 * defaults", marking a goal achieved, logging a weigh-in, the workout reflection, and Seal Chapter. In
 * each, the control moved, the write rejected unhandled, and the server kept the old value. The athlete
 * had no way to know.
 *
 * The worst of them are promises rather than preferences: an athlete who sets a photo audience to
 * "Only me", or opts out of analytics, and is shown that state while the server never accepted it, has
 * been told something untrue about their own privacy.
 *
 * A comment describing the right pattern is a thing to remember. This is a thing to import.
 *
 * ══ USE ══
 *
 *   const persist = usePersist();
 *
 *   // optimistic toggle — moves now, reverts if the server refuses:
 *   const before = prefs;
 *   setOverride(next);
 *   persist(() => saveAppPrefs(next), { rollback: () => setOverride(before), onOk: refetch });
 *
 *   // one-shot action — nothing to roll back, but the failure must be visible:
 *   persist(() => markAchieved(id), { onOk: () => setDone(true), detail: true });
 *
 * ⚠ NOT FOR BEST-EFFORT TELEMETRY. Presence, analytics, capture stamps and the post-commit annotations in
 *   `save.ts` are deliberately silent — they are marks ON a thing the athlete did, not the thing itself,
 *   and `save.ts` states outright that they "must never be able to fail a save that otherwise worked".
 *   Toasting those would train people to ignore the toast that matters. Use this only where the athlete
 *   pressed something and believes it took effect.
 */

/** What an athlete sees when a save they initiated did not land. */
export const PERSIST_FAILED = 'Couldn’t save that — check your connection and try again.';

export interface PersistOptions<T> {
  /** Undo the optimistic UI. Runs before the toast, so the control has already moved back. */
  rollback?: () => void;
  /** Runs only on success. */
  onOk?: (value: T) => void;
  /** Override the message entirely. */
  message?: string;
  /**
   * Show the server's own error text instead of the generic line. Use where the reason is actionable to
   * the athlete (a taken handle, a cap, a validation refusal) rather than "the network was bad".
   */
  detail?: boolean;
}

export function usePersist(): <T>(write: () => Promise<T>, opts?: PersistOptions<T>) => void {
  const { showToast } = useToast();

  return useCallback(
    <T,>(write: () => Promise<T>, opts?: PersistOptions<T>) => {
      void write().then(
        (value) => opts?.onOk?.(value),
        (e: unknown) => {
          // Roll back FIRST: the athlete should never read "couldn't save" beside the value it failed to
          // save, which reads as though the toast is about something else.
          opts?.rollback?.();
          showToast(opts?.message ?? (opts?.detail ? errorMessage(e) : PERSIST_FAILED));
        },
      );
    },
    [showToast],
  );
}
