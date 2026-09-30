import { blockAt, breakBlock } from './session-core.ts';
import type { SessionExercise } from './types.ts';

/**
 * ══ DRAG AN EXERCISE TO A NEW PLACE IN A SESSION THAT IS ALREADY UNDER WAY ══
 *
 * PO, 2026-09-28: *"When you click on the list of your workouts during an active workout, we should make
 * it where you can drag around the exercises to rearrange if you're wanting."*
 *
 * `to` is the index the row should end up at — what `useListReorder` reports on release. The list it
 * returns is always a legal session, which comes down to one rule: **a grouped block (superset or
 * circuit) is found by ADJACENCY** (`blockAt`), so a move must never leave a block in two pieces.
 *
 *   · **Within its own block** — the members swap places and stay one block. Reordering A1/A2 is allowed.
 *   · **Out of its block** — the row leaves the group. Dragging a lift away from its partner is the
 *     plainest way there is to say "not paired any more"; keeping the group id would read as two
 *     one-member blocks. A partner left on its own stops being a superset (same rule as removal).
 *   · **Into the middle of someone else's block** — never. It lands just past that block, on the side the
 *     drag was heading, so a superset is never split by a lift that was only passing through.
 *
 * ⚠ `position` TRAVELS WITH EACH ROW AND IS NEVER RENUMBERED. It is the save join key (substitutions,
 * appends to a continued session), not a display order — renumbering it here would re-attach logged work
 * to a different lift. Logged sets travel with their rows for the same reason.
 */
export function moveExercise(exercises: readonly SessionExercise[], from: number, to: number): SessionExercise[] {
  const n = exercises.length;
  if (from === to || from < 0 || from >= n || to < 0 || to >= n) return exercises.slice();
  const moving = exercises[from];
  const without = exercises.filter((_, i) => i !== from);

  let at = to;
  // Landed between two members of a block it does not belong to → step past that block.
  const before = without[at - 1];
  const after = without[at];
  if (before?.groupId && before.groupId === after?.groupId && before.groupId !== moving.groupId) {
    const b = blockAt(without, at - 1);
    if (b) at = to > from ? b.start + b.count : b.start;
  }
  let placed = [...without.slice(0, at), moving, ...without.slice(at)];

  const gid = moving.groupId;
  if (!gid) return placed;
  const k = placed.indexOf(moving);
  const stillPaired = placed[k - 1]?.groupId === gid || placed[k + 1]?.groupId === gid;
  if (stillPaired) return placed;

  // Left its block: it goes solo, and a partner left alone is no longer a group either.
  const { groupId: _g, groupName: _n, groupKind: _k, groupRounds: _r, groupCapSec: _c, ...solo } = moving;
  placed = placed.map((e, i) => (i === k ? solo : e));
  const partner = placed.findIndex((e) => e.groupId === gid);
  if (partner >= 0 && (blockAt(placed, partner)?.count ?? 0) < 2) placed = breakBlock(placed, partner);
  return placed;
}

/**
 * ══ ONE TAP ON AN UP / DOWN ARROW, IN EITHER BUILDER ══
 *
 * Both builders swapped the row with its neighbour and nothing else (library-01, QA 09-26). A block is
 * found by ADJACENCY, so a swap across a block's edge left two members apart with the same `groupId` —
 * the header vanished, "A1 / A2" vanished, and the save wrote two one-member groups. A lift stepping
 * INTO a superset did the same from the other side.
 *
 * The list this returns is always legal, and an arrow NEVER breaks a pairing — "Break" is its own
 * button, and an arrow that also un-pairs would be doing two things on one tap:
 *
 *   · **Inside its own block** — the two members trade places. A1 ⇄ A2 is an ordinary reorder.
 *   · **At the edge of its block, stepping out** — the WHOLE block steps past whatever is next to it.
 *   · **A lone row next to a block** — it steps past the whole block, never into the middle of it.
 *
 * Generic over the row because a program day, a workout template and a live session all group the
 * same way (`groupId`, adjacency) and only that field is read.
 */
export function stepExercise<T extends { groupId?: string | null }>(list: readonly T[], index: number, dir: -1 | 1): T[] {
  const n = list.length;
  const j = index + dir;
  if (index < 0 || index >= n || j < 0 || j >= n) return list.slice();

  /** The run of adjacent rows sharing `i`'s group — a lone row is a run of one. `[start, end)`. */
  const runAt = (i: number): [number, number] => {
    const gid = list[i].groupId;
    if (!gid) return [i, i + 1];
    let a = i;
    while (a > 0 && list[a - 1].groupId === gid) a -= 1;
    let b = i;
    while (b < n - 1 && list[b + 1].groupId === gid) b += 1;
    return [a, b + 1];
  };

  const [a, b] = runAt(index);
  if (j >= a && j < b) {
    const next = list.slice();
    [next[index], next[j]] = [next[j], next[index]];
    return next;
  }
  // `j` is the row just outside this unit, so its run is the neighbouring unit — the two trade sides.
  const [c, d] = runAt(j);
  return dir === 1
    ? [...list.slice(0, a), ...list.slice(c, d), ...list.slice(a, b), ...list.slice(d)]
    : [...list.slice(0, c), ...list.slice(a, b), ...list.slice(c, d), ...list.slice(b)];
}

/**
 * Where the athlete stands after a move: on the SAME exercise they were on, wherever it went. Matched by
 * `position` (unique per session — see `nextPosition`), never by index, because every index between the
 * two ends of the move has shifted.
 */
export function indexAfterMove(next: readonly SessionExercise[], currentPosition: number | undefined, fallback: number): number {
  const i = currentPosition == null ? -1 : next.findIndex((e) => e.position === currentPosition);
  return i >= 0 ? i : Math.max(0, Math.min(next.length - 1, fallback));
}
