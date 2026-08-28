import { useCallback } from 'react';

import { syncBodyGoals } from '@/data/goals-live';
import { useCeremony, useToast } from '@/hooks/useCeremony';

/**
 * ══ A WEIGH-IN MOVES THE WEIGHT GOAL — THE MOMENT IT IS SAVED ══
 *
 * PO (2026-08-28): *"I entered my new weight and it didn't move the goal at all. Why?"*
 *
 * Because nothing asked it to. A bodyweight goal is auto-tracked — `goal_metric_value` reads the latest
 * `body_entries` row — but the ONLY place that ran the sync was the Goals screen's own effect, on open.
 * The Legacy tab and the chapter card read the stored `current`, which was whatever it was the last time
 * somebody visited Goals. So a weigh-in logged on the Progress Hub changed the number on the Goals
 * screen the next time it was opened, and nowhere else, and the PO watched "0 / 190" not move.
 *
 * This hook is the sync with its consequences attached, for the two places that now call it: right
 * after a weigh-in is saved, and when the Legacy tab comes into focus. It syncs ONLY body-kind goals
 * (weight and measurements) — the cumulative kinds are the Goals screen's business and cost a query each.
 * If a goal is newly achieved by the sync, the same ceremony the Goals screen would have fired fires here,
 * because `updateProgress` consumes `newlyAchieved` and the Goals screen would otherwise never see it.
 */
export function useBodyGoalSync(): () => Promise<boolean> {
  const { enqueue } = useCeremony();
  const { showToast } = useToast();
  return useCallback(async () => {
    try {
      const res = await syncBodyGoals();
      for (const g of res.achieved) {
        if (g.isPrimary) enqueue({ id: `goal-${g.id}`, kind: 'goalAchieved', goalName: g.name, chapterName: res.chapterName ?? undefined });
        else showToast('Goal achieved · recorded in your legacy');
      }
      return res.changed;
    } catch {
      return false; // a sync that fails leaves the stored number; the Goals screen will try again
    }
  }, [enqueue, showToast]);
}
