/**
 * Ceremony queue ordering — pure, so it unit-tests under `node --test`.
 *
 * The LOCKED priority order (Rank-Up-Modal-Spec-M1 §Queue Integration):
 *   1. M-1 Rank Up            ← highest
 *   2. M-3 Goal Achieved
 *   3. M-4 Program Graduation
 *   4. M-2 Honor Earned
 * "Never stack" (Modal Library principle): one ceremony presents at a time; the rest
 * wait behind it in this order. When multiple Rank Ups queue, each fires in ascending
 * rank order before any lower-priority ceremony (M-1 §"Multiple M-1 ceremonies").
 * `premiumUpsell` (M-7) is not an earned ceremony; it sorts last if ever co-queued.
 */

import type { CeremonyEvent, CeremonyKind } from './types';
// Explicit .ts so the value import (RANK_FAMILIES) resolves under `node --test` too.
import { RANK_FAMILIES, type RankFamily } from '../rank-artwork/resolver.ts';

/** Lower number = presented earlier. */
export const CEREMONY_PRIORITY: Record<CeremonyKind, number> = {
  rankUp: 1,
  goalAchieved: 2,
  programGraduated: 3,
  honorEarned: 4,
  premiumUpsell: 99,
};

/** Ascending rank order for tie-breaking multiple Rank Ups (family then level). */
function rankOrdinal(e: CeremonyEvent): number {
  if (e.kind !== 'rankUp') return 0;
  const fam = RANK_FAMILIES.indexOf(e.rank.family as RankFamily);
  return fam * 10 + e.rank.level;
}

/**
 * Order a set of pending ceremonies into presentation order. Stable within a priority
 * band, except Rank Ups which sort by ascending rank. Does not mutate the input.
 */
export function orderCeremonies(events: readonly CeremonyEvent[]): CeremonyEvent[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const pa = CEREMONY_PRIORITY[a.e.kind];
      const pb = CEREMONY_PRIORITY[b.e.kind];
      if (pa !== pb) return pa - pb;
      const ra = rankOrdinal(a.e);
      const rb = rankOrdinal(b.e);
      if (ra !== rb) return ra - rb;
      return a.i - b.i; // stable: preserve enqueue order otherwise
    })
    .map(({ e }) => e);
}
