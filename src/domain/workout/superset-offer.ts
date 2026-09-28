import { blockAt, makeSuperset } from './session-core.ts';
import type { SessionExercise } from './types.ts';

/**
 * ══ "WOULD YOU LIKE TO SUPERSET THIS WITH …?" — HOLT NOTICING A SUPERSET BEING BUILT ══
 *
 * PO, 2026-09-21: *"have him recognize when someone is building a super set by seeing that they're
 * adding another exercise before finishing the one before."*
 *
 * The signal is the ORDER of two things the athlete did: they added another lift while the one they are
 * on still has work left in it. Holt asks; he never assumes. A "no" leaves the added lift exactly where
 * it would have landed without him.
 *
 * PO, 2026-09-28: *"Coach holt should suggest to super set if I add an exercise while I still have an
 * exercise that has two or less sets completed. Just offer."* So the window is now **0–2 sets logged**
 * on the lift they are on (and not finished). It used to need at least one set logged, which read "added
 * before starting" as planning ahead — the PO wants the offer there too; it costs one "No thanks". Three
 * or more sets in, the lift is mostly done and a new one is the next exercise, not a partner.
 *
 * ⚠ ONE LIFT, ADDED AS MAIN WORK, BESIDE A STRENGTH LIFT. Everything else is refused rather than guessed:
 *   · several added at once — which one would pair? The Picker already has its own superset switch for that.
 *   · already declared a superset in the Picker — the athlete has answered the question.
 *   · a warm-up or cool-down on either side — nobody supersets a stretch with a squat.
 *   · cardio on either side — a run is not a set.
 *   · the lift they were on is in a CIRCUIT — joining that is a different structure, not this one.
 *   · everything logged — that is moving on.
 *   · three or more sets logged — see the PO's rule above.
 */
export const SUPERSET_OFFER_MAX_DONE = 2;

export function supersetOffer(o: {
  /** The session BEFORE the new lift was appended. */
  exercises: readonly SessionExercise[];
  /** The lift the athlete was on when they opened the Picker. */
  currentIdx: number;
  added: readonly { kind?: SessionExercise['kind'] }[];
  addedSection: SessionExercise['section'];
  declaredSuperset: boolean;
}): { prevIdx: number } | null {
  if (o.declaredSuperset || o.added.length !== 1) return null;
  if (o.addedSection !== 'main' || o.added[0].kind === 'cardio') return null;
  const prev = o.exercises[o.currentIdx];
  if (!prev || prev.kind === 'cardio' || prev.section !== 'main') return null;
  const b = blockAt(o.exercises, o.currentIdx);
  if (b && b.kind !== 'superset') return null;
  const done = prev.sets.filter((s) => s.done).length;
  if (done >= prev.sets.length || done > SUPERSET_OFFER_MAX_DONE) return null;
  return { prevIdx: o.currentIdx };
}

/**
 * Pull the lift at `newIdx` in beside `prevIdx` and make them one superset.
 *
 * ⚠ MOVED, NOT JUST TAGGED. `blockAt` finds a superset by ADJACENCY, and an added lift lands at the end
 * of the session — possibly several exercises after the one it pairs with. Tagging both with one group
 * id where they stand would read as two separate one-member blocks. So it moves to directly after the
 * pairing (after the WHOLE superset, if `prevIdx` is already in one — joining extends it, the same rule
 * as "Superset with next"). `position` travels with the row, so the save join key is unchanged.
 *
 * Returns the new list and where the block starts — the screen lands the athlete there.
 */
export function joinAsSuperset(
  exercises: readonly SessionExercise[],
  prevIdx: number,
  newIdx: number,
  groupId: string,
): { exercises: SessionExercise[]; start: number } {
  const moving = exercises[newIdx];
  if (!moving || !exercises[prevIdx] || prevIdx === newIdx) return { exercises: exercises.slice(), start: prevIdx };
  const existing = blockAt(exercises, prevIdx);
  const joining = existing?.kind === 'superset';
  const start = joining ? existing.start : prevIdx;
  const count = joining ? existing.count : 1;
  const without = exercises.filter((_, i) => i !== newIdx);
  /* Removing the moving row shifts everything after it left by one — the block only moves if it sat
     after the new lift, which an append never does, but the rule costs one comparison to keep honest. */
  const at = newIdx < start ? start - 1 : start;
  const insertAt = at + count;
  const placed = [...without.slice(0, insertAt), moving, ...without.slice(insertAt)];
  const gid = joining ? existing.groupId : groupId;
  return { exercises: makeSuperset(placed, at, count + 1, gid), start: at };
}
