/**
 * WHAT THIS ATHLETE REACHES FOR — learned from the swaps they actually made.
 *
 * ══ THE ASK ══
 *
 * PO: *"it's more just to help Holt learn of what people like and help him build better programs for
 * them."*
 *
 * ⚠ **THAT FRAMING IS SAFER THAN THE ONE IT REPLACED, AND THE DIFFERENCE IS THE WHOLE DESIGN.**
 *
 * The first version of this was AVOIDANCE — "stop giving me this" — which is a blocklist, and a
 * blocklist silently shrinks somebody's training: swap away from squats twice and the pattern quietly
 * disappears, the athlete never learns what they are missing, and the program degrades toward whatever
 * was easiest. That is the failure `Coach-Adaptive-Learning-Amendment-001` CL-D3 was written against,
 * and it is why CL-D3 makes a visible, reversible list a PRECONDITION of reading an avoidance.
 *
 * PREFERENCE has no such failure mode. It re-ranks WITHIN a movement pattern and never removes one, so
 * a knee-dominant slot is still filled by a knee-dominant exercise — just the one this athlete actually
 * does. Nothing can be lost, so nothing needs to be visible before it is safe.
 *
 * ══ HOW IT LEARNS ══
 *
 * `workout_exercises` records the exercise performed AND, since 0138, the one it replaced. A swap is
 * therefore a stated comparison: *offered A, chose B, in this pattern.* That is a far better signal
 * than "logged B often", which mostly measures what the program prescribed.
 *
 * ⚠ TWO OCCURRENCES BEFORE ANYTHING MOVES (CL-D3). One swap is a busy rack, an unfamiliar machine, or a
 * gym that had the thing occupied. Two is a preference.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

/** One recorded swap: what the plan asked for, what the athlete did instead. */
export interface SwapRecord {
  pattern: string;
  /** The catalogue key actually performed. */
  chosen: string;
  /** The catalogue key it replaced. Null when the row predates 0138 or was not a substitution. */
  replaced: string | null;
}

/** How many times a swap must repeat before it counts. */
export const PREFERENCE_THRESHOLD = 2;

/**
 * `pattern → ordered keys this athlete has repeatedly chosen`, strongest first.
 *
 * ⚠ EMPTY IS THE NORMAL ANSWER and must stay cheap to handle: most athletes never swap, and the engine
 * has to behave exactly as it does today for them.
 */
export type LearnedPreferences = Readonly<Record<string, readonly string[]>>;

export function learnPreferences(swaps: readonly SwapRecord[]): LearnedPreferences {
  const counts = new Map<string, Map<string, number>>();

  for (const s of swaps) {
    // A row with nothing replaced is not a comparison — it is just an exercise that was prescribed and
    // performed, which says nothing about what this athlete would have picked.
    if (!s.replaced || !s.chosen || !s.pattern) continue;
    // Swapping a lift for itself is not a choice. It happens when a program renames a movement.
    if (s.replaced === s.chosen) continue;
    const byKey = counts.get(s.pattern) ?? new Map<string, number>();
    byKey.set(s.chosen, (byKey.get(s.chosen) ?? 0) + 1);
    counts.set(s.pattern, byKey);
  }

  const out: Record<string, readonly string[]> = {};
  for (const [pattern, byKey] of counts) {
    const strong = [...byKey.entries()]
      .filter(([, n]) => n >= PREFERENCE_THRESHOLD)
      // Most-chosen first; ties settle alphabetically so the result is stable across reads rather than
      // depending on Map insertion order, which depends on the order rows came back from Postgres.
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key]) => key);
    if (strong.length) out[pattern] = strong;
  }
  return out;
}

/**
 * The athlete's own ranking for one exercise, or null when they have no opinion about it.
 *
 * ⚠ NEGATIVE BY CONSTRUCTION, so a learned choice sorts AHEAD of the rulebook's canonical order without
 * needing a second sort key. `preferenceRank` returns 0-based indices and `Infinity` for "not in the
 * table", so returning -1, -2, … keeps one number meaning one thing.
 */
export function learnedRank(prefs: LearnedPreferences, pattern: string, key: string): number | null {
  const list = prefs[pattern];
  if (!list) return null;
  const i = list.indexOf(key);
  return i === -1 ? null : -(list.length - i);
}

/**
 * The sentence Holt can say about it (CL-D2 — every adaptation explicable, and the sentence shown).
 *
 * Null when there is nothing learned for this pattern, which is most of the time.
 */
export function preferenceSentence(prefs: LearnedPreferences, pattern: string, nameOf: (key: string) => string): string | null {
  const list = prefs[pattern];
  if (!list?.length) return null;
  return `You keep going to ${nameOf(list[0])} here, so I lead with it.`;
}

/**
 * The one line shown on a finished program or day — CL-D2's "and the sentence is shown".
 *
 * ⚠ IT NAMES ONLY WHAT ACTUALLY LANDED. `usedKeys` is what the built plan contains, so a preference the
 * assembler could not honour — the equipment was not there, the slot went to another pattern — is never
 * claimed. A coach who says "I picked your hack squat" over a program without one is worse than a coach
 * who says nothing, because after that nothing else he explains can be believed either.
 *
 * At most two are named. A paragraph listing nine substitutions is a changelog, not an explanation.
 */
export function appliedSentence(
  prefs: LearnedPreferences,
  usedKeys: readonly string[],
  nameOf: (key: string) => string,
): string | null {
  const used = new Set(usedKeys);
  const landed: string[] = [];
  for (const list of Object.values(prefs)) {
    const hit = list.find((k) => used.has(k));
    if (hit) landed.push(nameOf(hit));
  }
  if (!landed.length) return null;
  const named = landed.slice(0, 2).join(' and ');
  return `You keep swapping to ${named}, so I built it in.`;
}
