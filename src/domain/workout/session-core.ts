/**
 * Turning a PRESCRIPTION into the sets an athlete will actually tick off.
 *
 * Split out of `build-session` for the usual reason: that module reaches for the shipped program JSON
 * and the Supabase-facing types, so none of it can run under `node --test`. This is the part with the
 * rules in it, and it is pure.
 */

import type { ProgramExercise } from '@/data/programs-live';
import { repTargets } from '../program/prescription.ts';
import { contextMaxFor, percentTargets, resolveLoad, type LoadContext } from '../program/percent-max.ts';
import type { GroupKind, SessionExercise, SessionSet } from './types.ts';

/**
 * One `SessionSet` per prescribed set, carrying what that specific set asks for.
 *
 * ══ THE BUG THIS EXISTS TO PREVENT ══
 *
 * The mapping used to stamp a single rep target onto every set — `targetReps: ex.reps` — which is the
 * one line that turned "6-6-4-4" into four sets of six. The session model had held per-set targets all
 * along; the prescription was being flattened on its way in, so an intensity wave arrived as a block of
 * identical sets and the athlete trained a different session from the one they bought.
 */
export function sessionSetsFor(ex: ProgramExercise, load?: LoadContext): SessionSet[] {
  /**
   * ══ IN A CIRCUIT, A ROUND IS A SET ══
   *
   * The PROGRAM says a circuit member is one bout and the block repeats — that is the prescription, and
   * it is what `setCount` reports. A LOG needs a row per round, because four rounds of ten burpees is
   * forty burpees and the athlete has to tick off each one. So the block's round count expands here, at
   * exactly the boundary where a prescription becomes a thing you do.
   *
   * An AMRAP expands to one, deliberately: nobody knows how many rounds are coming, and pre-drawing a
   * guess would either cap the athlete early or leave rows they never owed. They add rounds as they go.
   */
  const rounds = ex.groupId && !ex.groupCapSec ? Math.max(1, ex.groupRounds ?? 1) : 1;
  const base = repTargets(ex);
  const targets = rounds > 1 && base.length === 1 ? Array.from({ length: rounds }, () => base[0]) : base;

  /**
   * The bar each set is asking for, when the program prescribes a percentage and a max is known.
   *
   * Expanded exactly like the rep targets above, so a circuit member's rounds all carry the same load
   * and a per-set ramp keeps one load per rung.
   */
  const pcts = percentTargets(ex);
  const max = contextMaxFor(load, ex);
  const loadFor = (i: number): number | null => {
    const p = pcts.length === 1 && targets.length > 1 ? pcts[0] : pcts[i];
    return resolveLoad(max, p, load?.rules)?.weight ?? null;
  };

  return targets.map((t, setIndex) => {
    const target = loadFor(setIndex);
    return {
      setIndex,
      /**
       * NEVER seeded from the target. `weight` is what the athlete lifted; finishing a session without
       * touching a set would otherwise record a lift that did not happen — and could announce a PR for
       * it. The ask lives in `targetWeight`, beside it.
       */
      weight: null,
      /**
       * A to-failure set carries ZERO, not a plausible-looking number.
       *
       * `targetReps` is arithmetic input — it feeds volume, the e1RM behind PR detection, and the reps
       * column written at save. Inventing "8" for a set whose whole point is that nobody knows the number
       * would put a fabricated rep count into the athlete's history and, worse, into a personal record.
       */
      targetReps: t === 'F' ? 0 : t,
      /*
       * The top of the range, carried through so the athlete can see what they are working toward at
       * the set rather than only on the program screen. Never on a to-failure set (there is no ceiling)
       * and never alongside a ladder, whose targets are already per-set.
       */
      ...(t !== 'F' && ex.repsMax != null && !ex.repScheme?.length && ex.repsMax > t
        ? { targetRepsMax: ex.repsMax }
        : null),
      ...(t === 'F' ? { toFailure: true } : null),
      ...(ex.durationSec != null ? { targetSec: ex.durationSec } : null),
      ...(target != null ? { targetWeight: target } : null),
      actualReps: null,
      done: false,
    };
  });
}

/** Circuit membership, carried onto every exercise so the logger can rebuild the program's own blocks. */
/**
 * The four fields an invite snapshots, taken from a session that is already under way (0121).
 *
 * The inverse of the logger's `templateToSessionExercises`, and the shape 0093 defined: an invite
 * carries the WORKOUT, not a pointer to it, because the person you asked may not own the program it
 * came from and "next session" resolves differently for each of you.
 *
 * ══ WHAT IT DELIBERATELY DROPS ══
 *
 * Everything the guest should not inherit. LOGGED WEIGHT and completed reps, because those are yours and
 * they are not a prescription — sending them would put your working sets on somebody else's bar. And
 * CARDIO BLOCKS, because a leg is a distance and a clock, not a list of sets, and squeezing one into
 * this shape would mean inventing a rep count for a run. A session that is only cardio therefore
 * snapshots to nothing, which reads downstream as a freestyle session under a shared name — the honest
 * answer, and one `workout.tsx` already handles.
 *
 * `targetReps` falls back to the FIRST set's target rather than an average: a 6-6-4-4 wave has no single
 * rep target, and the opening set is the one the guest starts on.
 */
export function sessionToTemplateExercises(
  exercises: readonly SessionExercise[],
): { catalogKey: string | null; name: string; sets: number; targetReps: number }[] {
  return exercises
    .filter((e) => e.kind !== 'cardio' && e.sets.length > 0)
    .map((e) => ({
      catalogKey: e.catalogKey ?? null,
      name: e.name,
      sets: e.sets.length,
      targetReps: e.sets[0]?.targetReps ?? 8,
    }));
}

export function groupFieldsOf(ex: ProgramExercise) {
  return {
    groupId: ex.groupId,
    groupName: ex.groupName,
    groupKind: ex.groupKind,
    groupRounds: ex.groupRounds,
    groupCapSec: ex.groupCapSec ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKS — supersets and circuits, found by adjacency
// ─────────────────────────────────────────────────────────────────────────────

/** A run of adjacent exercises that are performed as one thing. */
export interface SessionBlock {
  groupId: string;
  kind: GroupKind;
  name: string;
  /** Index of the first member in `session.exercises`, and the count of members. */
  start: number;
  count: number;
  rounds: number | null;
  capSec: number | null;
}

/** Absent `groupKind` reads as a circuit — every block that existed before supersets was one. */
export function groupKindOf(ex: Pick<SessionExercise, 'groupKind'> | undefined): GroupKind {
  return ex?.groupKind === 'superset' ? 'superset' : 'circuit';
}

/**
 * The block containing `index`, or null if that exercise stands alone.
 *
 * Found by walking OUTWARD while the group id holds, which is the same adjacency rule the program layer
 * uses. Filtering the whole session by id instead would swallow a later block that happens to share an
 * id and report "exercise 2 of 6" for a three-exercise finisher.
 */
export function blockAt(exercises: readonly SessionExercise[], index: number): SessionBlock | null {
  const ex = exercises[index];
  const gid = ex?.groupId;
  if (!ex || !gid) return null;
  let a = index;
  while (a > 0 && exercises[a - 1].groupId === gid) a -= 1;
  let b = index;
  while (b < exercises.length - 1 && exercises[b + 1].groupId === gid) b += 1;
  const kind = groupKindOf(ex);
  return {
    groupId: gid,
    kind,
    name: ex.groupName?.trim() || (kind === 'superset' ? 'Superset' : 'Circuit'),
    start: a,
    count: b - a + 1,
    rounds: ex.groupRounds ?? null,
    capSec: ex.groupCapSec ?? null,
  };
}

/**
 * How many rounds a superset has: the LONGEST member's set count.
 *
 * Not the shortest, and not the first member's. A superset whose members disagree (you added a fourth
 * set to the press but not to the row) still has four rounds — the fourth simply has one thing in it.
 * Taking the minimum would hide work the athlete had already logged.
 */
export function supersetRounds(exercises: readonly SessionExercise[], b: SessionBlock): number {
  let n = 1;
  for (let i = b.start; i < b.start + b.count; i += 1) n = Math.max(n, exercises[i].sets.length);
  return n;
}

/**
 * Where the athlete is inside a superset: the next unlogged (member, round) pair, scanned ROUND-MAJOR.
 *
 * Round-major is the entire behaviour of a superset. Set 1 of A, then set 1 of B, then set 2 of A —
 * not all of A and then all of B, which is what two ordinary cards side by side would produce.
 * Returns null when every set in the block is done.
 */
export function nextInSuperset(
  exercises: readonly SessionExercise[],
  b: SessionBlock,
): { exIdx: number; setIdx: number; round: number } | null {
  const rounds = supersetRounds(exercises, b);
  for (let r = 0; r < rounds; r += 1) {
    for (let i = b.start; i < b.start + b.count; i += 1) {
      const s = exercises[i].sets[r];
      if (s && !s.done) return { exIdx: i, setIdx: r, round: r };
    }
  }
  return null;
}

/**
 * True when logging (exIdx, setIdx) finishes a ROUND — i.e. rest is owed now.
 *
 * The point of a superset is that you do NOT rest between A and B. Rest belongs after the last member
 * of the round, and this is the one question the logger has to ask to get that right.
 */
export function endsSupersetRound(exercises: readonly SessionExercise[], b: SessionBlock, exIdx: number, setIdx: number): boolean {
  for (let i = exIdx + 1; i < b.start + b.count; i += 1) {
    const s = exercises[i].sets[setIdx];
    if (s && !s.done) return false; // a later member still owes this round
  }
  return true;
}

/**
 * Group `count` adjacent exercises starting at `start` into a superset.
 *
 * The members must already be adjacent, and this returns them adjacent — `blockAt` walks by adjacency,
 * so a pairing whose members are apart would silently read as two separate blocks. `rounds` is the
 * longest member's set count, so a 3-set press paired with a 4-set row gives four rounds.
 */
export function makeSuperset(exercises: readonly SessionExercise[], start: number, count: number, groupId: string): SessionExercise[] {
  const end = Math.min(exercises.length, start + count);
  if (end - start < 2) return exercises.slice();
  let rounds = 1;
  for (let i = start; i < end; i += 1) rounds = Math.max(rounds, exercises[i].sets.length);
  return exercises.map((e, i) =>
    i >= start && i < end ? { ...e, groupId, groupKind: 'superset' as const, groupName: 'Superset', groupRounds: rounds, groupCapSec: null } : e,
  );
}

/** Dissolve the block containing `index` back into ordinary exercises. Logged sets are untouched. */
export function breakBlock(exercises: readonly SessionExercise[], index: number): SessionExercise[] {
  const b = blockAt(exercises, index);
  if (!b) return exercises.slice();
  return exercises.map((e, i) => {
    if (i < b.start || i >= b.start + b.count) return e;
    const { groupId: _g, groupName: _n, groupKind: _k, groupRounds: _r, groupCapSec: _c, ...rest } = e;
    return rest;
  });
}
