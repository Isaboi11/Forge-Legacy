/**
 * What this athlete has trained lately, so Holt stops writing the same day forever.
 *
 * ══ THE BUG THIS EXISTS FOR ══
 *
 * PO, 2026-08-31: *"It has made me the same workout over and over again if I choose the same options.
 * It needs to be able to see what we did last time for those options and be able to have variety. An
 * example is my last few back and bicep workouts. I've had to swap out exercises to mix it up."*
 *
 * That was not a tuning problem, it was determinism. `fillSlot` took `candidatesFor(...)[0]` — the single
 * top-ranked exercise for the movement — and the ranking is a pure function of goal, equipment,
 * experience and limitations. Identical answers to the wizard produced a byte-identical program, every
 * time, forever. The only variety in the whole engine was WHICH MOVEMENTS a day visited (`day.ts`'s
 * pattern round-robin); which exercise expressed each one never moved.
 *
 * ⚠ AND SWAPPING MADE IT WORSE, NOT BETTER. A substitution feeds `learned-preference.ts`, which after two
 * occurrences re-ranks that exercise to the front of its pattern — permanently. So swapping out of
 * boredom did not add variety; it installed a different single answer to repeat. The athlete was doing
 * the engine's job by hand and being punished for it.
 *
 * ══ RE-RANK, NEVER REMOVE — THE SAME RULE `learned-preference.ts` FOLLOWS ══
 *
 * This is a preference signal, not a blocklist. It can reorder a shortlist the rulebook already approved;
 * it can never take an exercise out of the pool, shrink a pattern, or make a slot unfillable. That is
 * deliberate and it is the CL-D3 line: an avoidance list silently shrinks training, and the precondition
 * for reading one is a visible, reversible surface. Nothing here needs that precondition, because nothing
 * here can lose anything — the worst case is that every candidate is equally recent and the ranking's own
 * first choice wins, which is exactly today's behaviour.
 *
 * ══ PURE, LIKE THE REST OF `domain/coach/**` ══
 *
 * Reads no database. The caller resolves the sessions at the boundary and passes them in, the way
 * `learned` already is. `recent-work-live.ts` is the one read.
 */

/**
 * How many recent sessions to remember. PO decision, 2026-08-31.
 *
 * ⚠ THREE, AND THE NUMBER IS A COACHING JUDGEMENT rather than an implementation detail. Wide enough to
 * break a run of identical back-and-bicep days; narrow enough that a good movement comes back around the
 * fourth time the athlete trains it, instead of being exiled for a fortnight. A two-week window sounds
 * more thorough and is worse: on a narrow pattern it exhausts the alternatives and falls back to the same
 * pick anyway, having spent the intervening sessions on weaker ones.
 */
export const RECENT_WINDOW = 3;

/**
 * How long ago each exercise was last trained, in sessions.
 *
 * `1` is the most recent session. A key that is absent was not trained inside the window at all, which
 * `stalenessOf` reports as `Infinity` — the freshest thing a slot can be handed.
 */
export interface RecentWork {
  readonly sessionsAgo: Readonly<Record<string, number>>;
}

/** No history: a new athlete, a failed read, or a coach asked to build before anything was logged. */
export const NO_RECENT_WORK: RecentWork = { sessionsAgo: {} };

/**
 * Fold recent sessions into "how many sessions ago did this last appear".
 *
 * `sessions` is newest-first, one entry per session, each holding that session's catalogue keys. Only the
 * first `RECENT_WINDOW` are read — the caller may pass more without changing the answer, so a shared read
 * does not have to know this module's window.
 *
 * ⚠ THE EARLIEST WIN IS THE ONE KEPT. An exercise trained in both the last session and the one before is
 * one session ago, not two: recency is about the most recent contact, and taking the older number would
 * make a movement done twice look staler than one done once.
 */
export function recentWorkFrom(sessions: readonly (readonly string[])[], window = RECENT_WINDOW): RecentWork {
  const sessionsAgo: Record<string, number> = {};
  const depth = Math.max(0, Math.min(window, sessions.length));
  for (let i = 0; i < depth; i++) {
    const ago = i + 1;
    for (const key of sessions[i] ?? []) {
      if (!key) continue;
      // First writer wins, and the loop runs newest-first, so this keeps the most recent sighting.
      if (sessionsAgo[key] === undefined) sessionsAgo[key] = ago;
    }
  }
  return { sessionsAgo };
}

/**
 * How stale an exercise is for this athlete — bigger is fresher, and unseen is freshest.
 *
 * `Infinity` for anything outside the window is the point: an exercise they have not touched should beat
 * one they did last session, and it should do so without a second sort key or a magic sentinel number.
 */
export function stalenessOf(recent: RecentWork | undefined, key: string): number {
  const ago = recent?.sessionsAgo[key];
  return ago === undefined ? Infinity : ago;
}

/**
 * Pick the least recently trained of an already-ranked shortlist.
 *
 * ⚠ TIES GO TO THE RANKING, NOT TO THE ARRAY. `>` rather than `>=` means an exercise only displaces the
 * incumbent by being strictly staler, so when nothing in the shortlist has been trained lately — the
 * normal case for a new athlete, where every staleness is `Infinity` — the rulebook's own first choice is
 * returned unchanged. Variety is what happens when there is something to vary FROM.
 */
export function leastRecent<T>(shortlist: readonly T[], keyOf: (item: T) => string, recent: RecentWork | undefined): T | null {
  if (!shortlist.length) return null;
  let best = shortlist[0];
  let bestStaleness = stalenessOf(recent, keyOf(best));
  for (let i = 1; i < shortlist.length; i++) {
    const s = stalenessOf(recent, keyOf(shortlist[i]));
    if (s > bestStaleness) {
      best = shortlist[i];
      bestStaleness = s;
    }
  }
  return best;
}
