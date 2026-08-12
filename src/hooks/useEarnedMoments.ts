import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { fetchUncelebratedHonors } from '@/data/honors-live';
import { refreshRank } from '@/data/rank-live';
import { useCeremony } from '@/hooks/useCeremony';
import { type RankLevel } from '@/domain/rank-artwork/resolver';

/**
 * Announce what the athlete has earned, on whichever main tab they reach first.
 *
 * ══ WHY THIS IS NOT ON LEGACY ANY MORE ══
 *
 * The rank refresh and the honor sweep both used to live in Legacy's focus effect, which meant the
 * ceremony was owed to a screen rather than to a person: earn an honor on a day you never open Legacy
 * and the moment simply waited, sometimes for days, sometimes through the exact session it was meant to
 * reward. The PO's framing is the right one — that is a missed opportunity, not a deferred one.
 *
 * ⚠ THE RECORD DID NOT MOVE. Ranks and honors still LIVE in Legacy; this is only where the ceremony
 * FIRES. M-2's reasoning — an honor is a Legacy fact and the Seal screen is the wrong room for it —
 * is about where the record belongs, and is untouched.
 *
 * ══ THE FOUR TABS, AND WHY THAT NEEDS NO EXCLUSION LIST ══
 *
 * Home, Workouts, Legacy and Squads are the entire tab group. The active workout is a PUSHED route
 * sitting above it, and so is the Seal screen — neither is focused while it is on top, so neither can
 * fire a ceremony. "Never interrupt a working set" falls out of the navigation shape; there is no
 * screen blocklist to keep in step with the router.
 *
 * ══ THROTTLED, BECAUSE THE CHECK IS NOT CHEAP ══
 *
 * `refreshRank` runs six queries, one of which reads EVERY workout the athlete has ever saved with no
 * limit. That was affordable at one call site and is not at four: without a gate, every tap between
 * Home and Squads pays it, and it gets slower the more they train — precisely backwards. So the
 * evaluation runs at most once a minute.
 *
 * The gate is time-based, so it can swallow the one moment that matters: finish a workout a minute
 * after glancing at a tab and the promotion it just earned would wait for the next window. That is what
 * `invalidateEarnedMoments` is for — the end of a session drops the gate, so the next tab the athlete
 * lands on evaluates immediately. Cheap when nothing happened, instant when something did.
 */

const MIN_GAP_MS = 60_000;

/** Module-level on purpose: one gate for the whole app, not one per mounted tab. */
let lastRunAt = 0;

/**
 * Force the next tab focus to re-evaluate, whatever the clock says. Called when a workout session
 * ends — the only event that can actually change a rank.
 */
export function invalidateEarnedMoments(): void {
  lastRunAt = 0;
}

export interface EarnedMomentsOptions {
  /** Fired only when a promotion was actually persisted, so the caller can re-read its own display. */
  onRankChanged?: () => void;
  /**
   * Whether the screen is actually in front of the athlete yet. Default true — being focused IS the
   * answer for three of the four tabs.
   *
   * ⚠ HOME IS THE EXCEPTION, because Home holds its first paint behind the splash until every read is
   * in. Focused and VISIBLE stopped being the same thing there, and a ceremony is a full-screen
   * takeover rendered by `CeremonyProvider` at the root — above Home and therefore above its cover. A
   * rank-up would have announced itself over the splash on the launch that earned it: the biggest
   * moment the app has, played to a screen that had not opened yet.
   *
   * ⚠ AND IT MUST NOT BURN THE THROTTLE. The early return below sits ABOVE `lastRunAt`, so a
   * not-yet-visible screen costs nothing and the real evaluation still happens the moment it appears.
   * Setting the gate first would swallow the check for a full minute — exactly the missed moment this
   * hook exists to prevent.
   */
  enabled?: boolean;
}

export function useEarnedMoments({ onRankChanged, enabled = true }: EarnedMomentsOptions = {}): void {
  const { enqueue } = useCeremony();

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const now = Date.now();
      if (now - lastRunAt < MIN_GAP_MS) return;
      lastRunAt = now;

      let cancelled = false;

      /* Rank. Persisted by `refreshRank` itself and idempotent once written, so four tabs racing to
         evaluate cannot announce the same promotion twice — the second one reads earned == stored. */
      void refreshRank()
        .then((res) => {
          if (cancelled || !res || (!res.promotedFamily && res.promotedSubTier == null)) return;
          enqueue({
            id: `rank-${res.rank.rankLevel}`,
            kind: 'rankUp',
            rank: { family: res.rank.family, level: res.rank.subTier as RankLevel },
          });
          onRankChanged?.();
        })
        .catch(() => {
          // A rank that fails to announce itself is still earned and still on the Hub. Never take a tab
          // down for it.
        });

      /* Honors. `uncelebrated_honors()` reads and marks nothing — the marking happens on dismissal, in
         CeremonyProvider — so an honor stays owed through a crash, a force-quit, or a tab closed
         mid-ceremony. Retroactive `claim_earned_honors` sweeps land here too, nowhere near a workout. */
      void fetchUncelebratedHonors()
        .then((honors) => {
          if (cancelled || !honors.length) return;
          enqueue(honors.map((h) => ({ id: `honor-${h.id}`, kind: 'honorEarned' as const, honorName: h.name })));
        })
        .catch(() => {
          // Same: still earned, still on the Hub.
        });

      return () => {
        cancelled = true;
      };
    }, [enabled, enqueue, onRankChanged]),
  );
}
