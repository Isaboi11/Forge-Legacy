import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseRetiredWeeks, withRetiredWeek } from './weekly-review-seen-model';

/**
 * The storage half of "which weekly reviews this device has finished with". All of the reasoning, and the
 * reason the safe failure points the way it does, is in `weekly-review-seen-model.ts` — this file is the
 * AsyncStorage edge, kept separate so the decisions stay testable under `node --test`.
 *
 * Cleared on account switch by `first-run.ts`.
 */
const KEY = 'forge_weekly_review_retired_v1';

export { isWeekRetired } from './weekly-review-seen-model';

export async function getRetiredReviewWeeks(): Promise<string[]> {
  try {
    return parseRetiredWeeks(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/**
 * Mark a week's Home card done with — on View as well as on Skip. Idempotent.
 *
 * Best-effort by design: the caller sets its own state first, so a failed write costs the athlete one
 * re-appearance on the next launch rather than a blocked tap on the card in front of them.
 */
export async function retireReviewWeek(weekStart: string): Promise<void> {
  try {
    const weeks = await getRetiredReviewWeeks();
    if (weeks.includes(weekStart)) return;
    await AsyncStorage.setItem(KEY, JSON.stringify(withRetiredWeek(weeks, weekStart)));
  } catch {
    // best-effort; the card returns once, which is harmless
  }
}

export async function clearRetiredReviewWeeks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
