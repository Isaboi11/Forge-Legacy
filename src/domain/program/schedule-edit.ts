/**
 * Reordering the sessions inside a week of a program the athlete is already running.
 *
 * Pure (no JSON, no Supabase) so every rule here is unit-testable under `node --test`.
 *
 * ══ WHY THIS EXISTS ══
 *
 * PO, 2026-09-09, relaying a tester: *"He basically has been doing legs one day, then chest on the next,
 * then back, and so on. But he started playing soccer on Saturday and doesn't want to do legs on the day
 * he has."*
 *
 * ⚠ THE ANSWER IS NOT A WEEKDAY. Forge programs are SEQUENTIAL and that is locked in three places —
 * `Program-Authoring-Standard-v1.0` §2.2 (*"`dayOfWeek` is always null … programs are sequential, not
 * calendar-based"*), `Program-Catalog-Architecture-v1.0`, and `Calendar-System-Architecture-v1.0`
 * CAL-D3/D9, where the Calendar is a read-only projection that *"edits no slot"*. A program is Day 1,
 * Day 2, Day 3 in order; there is no Saturday in it to move anything off.
 *
 * So the ask, in the model the product actually has, is: change the ORDER, and keep the change. The
 * existing `swapSessionOrder` trades two sessions inside one week and stops there — good for "the rack
 * is busy today", useless for "and every week from now on".
 *
 * ══ WHAT MAY MOVE, AND WHAT MAY NOT ══
 *
 *   1. **A touched session never moves.** `program_sessions` rows are keyed by (week_index, day_index),
 *      so moving a session that has been trained or skipped re-points a real record at a different
 *      workout — the app would then claim a session nobody did. Touched positions are PINNED and the
 *      permutation flows around them.
 *   2. **The session COUNT never changes.** Migration 0123's invariant, in its own words: *"A STARTED
 *      PROGRAM MAY BE REORDERED. IT MAY NOT CHANGE HOW MANY SESSIONS IT HAS."* 0175 enforces it again on
 *      every write. A permutation trivially satisfies this, and `reorderWeek` is only ever a permutation.
 *   3. **Empty days stay where they are.** They are not sessions the athlete owes (`trainingDays` drops
 *      them), so they are not in the ordering at all — but they DO occupy positions in the raw `days`
 *      array, and moving one would shift the schedule index of every training day after it.
 *
 * ══ THE TWO INDEX SPACES, WHICH ARE THE WHOLE DIFFICULTY ══
 *
 * SCHEDULE space is `trainingDays(...)` — days that prescribe something. `scheduleSlots`, `nextOpenSlot`,
 * every `program_sessions` row and every screen speak this.
 *
 * RAW space is the `days` array itself, empties included. `plannedDays` returns it and the builder edits
 * it.
 *
 * They differ exactly when a week has an empty day above a built one. `swapSessionOrder` took SCHEDULE
 * indices from its callers and applied them to the RAW array — the same filtered-vs-unfiltered divergence
 * the Decision Queue names for `edit-ops.ts`. It has been correct in the field only because Holt and the
 * catalog never author a gap. Everything here converts explicitly, once, through `rawIndexOf`.
 */

import type { ProgramDay, ProgramStructure } from '@/data/programs-live';
// Relative + extensioned: `@/` is TYPE-ONLY in domain code, and these are runtime reads.
import { plannedDays, totalSessions, trainingDays, type SessionMark } from './progress-core.ts';

/**
 * How far a change reaches.
 *
 * Deliberately the SAME two words `edit-ops.ts` uses for Holt's edits, so one athlete-facing idea has one
 * name: this week, or this week and everything after it.
 */
export type ReorderScope = 'this_week' | 'rest_of_block';

/** Is this day one the athlete owes? The predicate `trainingDays` filters on, named for reuse. */
const isTrainingDay = (d: ProgramDay): boolean => d.warmup.length + d.main.length + d.cooldown.length > 0;

/**
 * Where the n-th TRAINING day sits in the raw `days` array.
 *
 * The same walk `lockedCells` does in `program-draft-model.ts`, and for the same reason: schedule index
 * `n` and raw index `n` are different numbers on any week with a gap in it, and treating them as one
 * silently edits the wrong day. Returns -1 when there is no n-th training day.
 */
export function rawIndexOf(days: readonly ProgramDay[], scheduleDayIndex: number): number {
  let seen = -1;
  for (let i = 0; i < days.length; i += 1) {
    if (!isTrainingDay(days[i])) continue;
    seen += 1;
    if (seen === scheduleDayIndex) return i;
  }
  return -1;
}

/**
 * The weeks a reorder will actually change.
 *
 * ⚠ A WEEK WITH A DIFFERENT SHAPE IS LEFT ALONE, and is reported so the confirmation can say so. An
 * `order` is a permutation of one week's session count; applying it to a week with a different number of
 * sessions is not a smaller version of the same edit, it is a guess. Real programs are full of these —
 * a block that drops a conditioning day, a deload week, anything `weekSizes` returns a ragged array for.
 *
 * `weekSizes` floors an unbuilt week at `daysPerWeek`, so a week with nothing built reports a size its
 * raw array cannot honour. Comparing the TRAINING-DAY COUNT rather than `weekSizes` excludes those too:
 * there is nothing in them to reorder.
 */
export function reorderTargets(
  structure: ProgramStructure,
  weekIndex: number,
  scope: ReorderScope,
): number[] {
  const weeks = Math.max(1, structure.weeks);
  if (weekIndex < 0 || weekIndex >= weeks) return [];

  const n = trainingDays(plannedDays(structure, weekIndex)).length;
  if (n === 0) return [];

  const last = scope === 'this_week' ? weekIndex : weeks - 1;
  const out: number[] = [];
  for (let w = weekIndex; w <= last; w += 1) {
    if (trainingDays(plannedDays(structure, w)).length === n) out.push(w);
  }
  return out;
}

/** Is `order` a permutation of 0..n-1? A malformed one would duplicate or drop a session. */
function isPermutation(order: readonly number[], n: number): boolean {
  if (order.length !== n) return false;
  const seen = new Set(order);
  if (seen.size !== n) return false;
  return order.every((i) => Number.isInteger(i) && i >= 0 && i < n);
}

/**
 * Reorder the sessions of a week — and, optionally, of every week after it that has the same shape.
 *
 * `order[k]` is the SCHEDULE-space index of the session that should end up at position `k`. So an
 * athlete who drags the third session to the front of a four-session week produces `[2, 0, 1, 3]`.
 *
 * ══ PINNED POSITIONS ══
 *
 * A position with a mark against it keeps the day it already has — that record must go on pointing at the
 * workout it describes. The remaining positions, in ascending order, receive the remaining days in the
 * order `order` ranks them. With nothing touched this is just the permutation; with the first three of a
 * six-day week trained, it reorders the last three and leaves the record alone.
 *
 * That projection is why the athlete is never shown a refusal. The sheet renders touched rows as fixed
 * and un-draggable, so what they can express is exactly what this will do.
 *
 * ⚠ IT MATERIALISES PER-WEEK PLANS, exactly as `swapSessionOrder` does. A non-varying program stores ONE
 * `days` array that every week repeats, so editing it in place would silently rewrite the weeks the
 * athlete has already trained. Every week is materialised from whatever it resolves to today, and only
 * the target weeks are touched.
 *
 * Returns the input structure unchanged when there is nothing to do or the request is malformed — the
 * same by-reference no-op contract `swapSessionOrder` has, which its tests assert on.
 */
export function reorderWeek(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  weekIndex: number,
  order: readonly number[],
  scope: ReorderScope,
): ProgramStructure {
  const targets = reorderTargets(structure, weekIndex, scope);
  if (targets.length === 0) return structure;

  const n = trainingDays(plannedDays(structure, weekIndex)).length;
  if (!isPermutation(order, n)) return structure;
  if (order.every((v, i) => v === i)) return structure; // nothing moved

  const weeks = Math.max(1, structure.weeks);
  /* Array copies, NOT deep clones. A permutation moves `ProgramDay` objects; it never edits one. Keeping
     identity is what lets the tests assert `===` on a pinned session, which is the invariant that matters
     here — that the day under a written record is the same object it always was. */
  const plans = Array.from({ length: weeks }, (_, wi) => ({ days: [...plannedDays(structure, wi)] }));

  for (const w of targets) {
    const days = plans[w].days;

    // Schedule position → raw index, computed BEFORE anything moves. Reading it mid-shuffle would ask
    // where a day is now rather than which position it is being placed into.
    const rawAt = Array.from({ length: n }, (_, k) => rawIndexOf(days, k));
    if (rawAt.some((r) => r < 0)) continue; // week does not have the sessions it claims — leave it be

    const pinned = new Set(
      marks.filter((m) => m.weekIndex === w && m.dayIndex >= 0 && m.dayIndex < n).map((m) => m.dayIndex),
    );

    // The days about to be redistributed, ranked by where `order` puts them. `order.indexOf(d)` is the
    // rank of session `d` in the athlete's requested ordering.
    const movable = Array.from({ length: n }, (_, k) => k)
      .filter((k) => !pinned.has(k))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));

    const before = rawAt.map((r) => days[r]);
    let take = 0;
    for (let pos = 0; pos < n; pos += 1) {
      // A pinned position keeps exactly what it had; every other takes the next movable day in rank order.
      const source = pinned.has(pos) ? pos : movable[take++];
      days[rawAt[pos]] = before[source];
    }
  }

  /* ⚠ `days` IS REWRITTEN TOO, mirroring week 1 — the same thing `edit-ops.commit()` does and the one
     thing `swapSessionOrder` forgot. `program-share/[id].tsx` renders `structure.days` under the caption
     "week one" with no `vary` check, so leaving it behind showed the share card a pre-edit order. */
  /* ⚠ A COPY, not `plans[0].days` itself. Sharing the array would make `structure.days` and
     `weekPlans[0].days` the same object, so any in-place edit of one — the builder's draft path,
     `edit-ops` — would silently rewrite the other. Nothing does that today; nothing should be able to. */
  const next: ProgramStructure = { ...structure, vary: true, weekPlans: plans, days: [...plans[0].days] };

  /* The 0123 invariant, checked rather than trusted. A permutation cannot break it, which is exactly why
     a failure here would mean the code above is not the permutation it claims to be — better to return
     the untouched structure than to hand the database a write it will reject with a stack trace. */
  return totalSessions(next) === totalSessions(structure) ? next : structure;
}

/**
 * Move the item at display position `from` to position `to`, keeping pinned positions fixed.
 *
 * The drag helper. `order` is the current ordering (schedule indices), `pinned` the POSITIONS that cannot
 * receive anything. A drop onto a pinned position snaps past it in the direction of travel, so the
 * gesture always resolves to something legal rather than being refused — the athlete is dragging a row
 * past a row that visibly cannot move, and the obvious meaning is "put me on its far side".
 *
 * Always returns a new array, and always a permutation of what went in. Callers compare before setting
 * state, so a cancelled drag still re-renders nothing.
 */
export function moveInOrder(
  order: readonly number[],
  from: number,
  to: number,
  pinned: ReadonlySet<number>,
): number[] {
  const n = order.length;
  if (from < 0 || from >= n || pinned.has(from)) return [...order];

  // Snap past any pinned position, travelling the way the drag was going. Running off the end means
  // there is nowhere legal that way, and the row stays where it is.
  const step = to >= from ? 1 : -1;
  let dest = Math.max(0, Math.min(n - 1, to));
  while (dest >= 0 && dest < n && pinned.has(dest)) dest += step;
  if (dest < 0 || dest >= n || dest === from) return [...order];

  /*
   * ⚠ THE SPLICE HAPPENS AMONG THE MOVABLE POSITIONS ONLY.
   *
   * Splicing the whole array would shift every row the dragged one passes over — correct for its
   * neighbours, wrong for a trained session, whose `program_sessions` row is keyed by the position it is
   * sitting in. So the movable positions are lifted out, reordered among themselves, and dropped back
   * into the same positions they came from; the pinned ones are never read or written.
   */
  const slots = Array.from({ length: n }, (_, i) => i).filter((i) => !pinned.has(i));
  const items = slots.map((p) => order[p]);
  const i = slots.indexOf(from);
  const j = slots.indexOf(dest);
  if (i < 0 || j < 0) return [...order];

  const [moved] = items.splice(i, 1);
  items.splice(j, 0, moved);

  const out = [...order];
  slots.forEach((p, k) => {
    out[p] = items[k];
  });
  return out;
}

/**
 * Swap two sessions' positions within one week — a real reorder of the plan, not a one-off.
 *
 * ══ WHY IT MATERIALISES PER-WEEK PLANS ══
 *
 * A non-varying program stores ONE `days` array that every week repeats. Reordering that array would
 * change the order of every remaining week — so swapping Tuesday and Thursday in week 3 because the rack
 * was busy would silently rewrite weeks 4 through 8 as well. Almost never what anyone means.
 *
 * So the first swap converts the program to per-week plans (`vary: true`, every week materialised as its
 * own copy) and edits only the week asked for. That is the same "Customize" shape the builder already
 * writes, so nothing downstream learns a new structure — `plannedDays` has always preferred `weekPlans`.
 *
 * ⚠ BOTH DAYS MUST BE UNTOUCHED, and the caller is responsible for only offering those.
 * `program_sessions` rows are keyed by (week, dayIndex), so moving a day that has been trained or
 * skipped would silently re-point that record at a different workout — the app would then claim you did
 * a session you never did. Untouched days carry no rows, so swapping them moves nothing but the plan.
 * Days at other positions keep their index and are unaffected.
 *
 * ══ IT IS NOW A TWO-ELEMENT REORDER, AND THAT FIXED A LATENT BUG ══
 *
 * The body used to index `plans[weekIndex].days` — the RAW array, empties included — with indices its
 * callers had computed over `trainingDays(...)`. Those are the same number only on a week with no gap in
 * it, which is every week Holt and the catalog author, which is why nothing had gone wrong yet. On a
 * week with an empty day above a built one it swapped the wrong pair, and could move the empty day
 * itself, changing which schedule position each later session occupies WITHOUT changing the count — so
 * neither the 0123 trigger nor the 0175 guard would have noticed.
 *
 * `reorderWeek` converts schedule indices to raw ones explicitly, so the swap now means what its callers
 * have always thought it meant. Behaviour on a gapless week is identical, which is what its tests assert.
 */
export function swapSessionOrder(
  structure: ProgramStructure,
  weekIndex: number,
  a: number,
  b: number,
): ProgramStructure {
  if (a === b) return structure;
  const n = weekSessionCount(structure, weekIndex);
  if (a < 0 || b < 0 || a >= n || b >= n) return structure;
  return reorderWeek(structure, [], weekIndex, transposition(n, a, b), 'this_week');
}

/** The two-element permutation a swap is, in schedule space. `swapSessionOrder` is this plus `reorderWeek`. */
export function transposition(n: number, a: number, b: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i);
  if (a < 0 || b < 0 || a >= n || b >= n) return out;
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}

/**
 * Sessions in a week, in schedule space — what the reorder sheet lists and what `order` indexes.
 *
 * ⚠ NOT `weekSizes()[weekIndex]`, which floors an unbuilt week at `daysPerWeek` so that a program still
 * being authored reports a sane shape. Those extra slots resolve to `day: null` and there is nothing in
 * them to reorder; counting them would hand the sheet rows with no session behind them.
 */
export function weekSessionCount(structure: ProgramStructure, weekIndex: number): number {
  return trainingDays(plannedDays(structure, weekIndex)).length;
}
