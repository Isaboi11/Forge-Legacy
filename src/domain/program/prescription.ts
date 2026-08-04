/**
 * Reading a prescription — how many sets, what each one asks for, and which items are one block.
 *
 * Pure (no JSON, no Supabase, no React) so every rule is unit-testable under `node --test`.
 *
 * ══ WHY THIS MODULE EXISTS ══
 *
 * The program model grew three things a flat `sets` × `reps` pair cannot hold: per-set ladders, work
 * measured in time, and circuits. Every screen that renders a prescription — Program Detail's log, the
 * builder's day rows, the Active Workout header — needs the SAME reading of them, or the same program
 * describes itself differently depending on where you look at it.
 */

import type { ProgramExercise, RepTarget } from '@/data/programs-live';

/** The default when an item prescribes no set count at all. Matches the builder's own default. */
const DEFAULT_SETS = 3;
/** The default rep target for a set with nothing written against it. */
const DEFAULT_REPS = 10;

/**
 * How many sets this item asks for.
 *
 * A ladder's LENGTH is the truth when one is present — `[6, 6, 4, 4]` is four sets whatever `sets` says,
 * because the two disagreeing is an authoring slip and the ladder is the more specific statement.
 */
export function setCount(ex: ProgramExercise): number {
  if (ex.repScheme?.length) return ex.repScheme.length;
  if (ex.sets != null) return Math.max(1, ex.sets);
  /**
   * ONE bout, for a circuit member and for a timed item.
   *
   * A circuit member is performed once per round — the BLOCK's round count is the repetition. Handing it
   * the three-set default instead made every finisher three times its real size: "20 Wall Balls" inside a
   * four-round AMRAP became twelve sets of twenty. The same applies to a bare "30s Sled Push", which is a
   * single thirty-second effort and not three of them.
   */
  if (ex.groupId || ex.durationSec != null) return 1;
  return DEFAULT_SETS;
}

/** What each set asks for, one entry per set. Fills a flat prescription out to its set count. */
export function repTargets(ex: ProgramExercise): RepTarget[] {
  if (ex.repScheme?.length) return [...ex.repScheme];
  return Array.from({ length: setCount(ex) }, () => ex.reps ?? DEFAULT_REPS);
}

/** True when the item is performed for time rather than for reps. */
export const isTimed = (ex: ProgramExercise): boolean => ex.durationSec != null;

/** True when a rep target is "as many as you have", not a number. */
export const isFailure = (r: RepTarget): boolean => r === 'F';

/**
 * A duration, written the way a training app writes it: `45s`, `8m`, `1m 30s`.
 *
 * Whole minutes never render a trailing `0s` — "8m 0s" is not something anybody wrote on a card.
 */
export function durText(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (!m) return `${s}s`;
  return s ? `${m}m ${s}s` : `${m}m`;
}

/**
 * The prescription as one line — what the athlete reads before they start.
 *
 *   4 × 6-6-4-4      a ladder, shown IN FULL rather than averaged
 *   3 × F            to failure
 *   4 × 8            the flat case, unchanged from before
 *   30s              timed, single round
 *   3 × 30s          timed, repeated
 *   15 min           a cardio bout prescribed by duration
 *
 * A ladder is never collapsed to its first or highest number. The whole point of 10-8-6-4 is that it
 * descends, and a card reading "4 × 10" would be describing a different session.
 */
export function schemeText(ex: ProgramExercise): string {
  if (ex.kind === 'cardio') {
    if (ex.targetSec != null && ex.targetSec > 0) return `${Math.round(ex.targetSec / 60)} min`;
    if (ex.targetMi != null && ex.targetMi > 0) return `${ex.targetMi} mi`;
    return '';
  }

  /**
   * Nothing was written against this item, so nothing is claimed.
   *
   * `repTargets` fills an unspecified item out to the builder's three-by-ten default, which is the right
   * thing when somebody is AUTHORING and wants a starting point. It is the wrong thing to DISPLAY: a
   * line the source left blank would read as a prescription of ten, and the athlete would have no way to
   * tell an author's silence from an author's instruction.
   */
  if (!ex.repScheme?.length && ex.reps == null && ex.durationSec == null) return '';

  if (isTimed(ex)) {
    const n = setCount(ex);
    const d = durText(ex.durationSec);
    return n > 1 ? `${n} × ${d}` : d;
  }

  const targets = repTargets(ex);
  if (!targets.length) return '';
  const uniform = targets.every((t) => t === targets[0]);
  const body = uniform ? String(targets[0]) : targets.join('-');
  /**
   * A circuit member states its reps alone. The "1 ×" is noise at best and a contradiction at worst —
   * the block above it already says ⟳4, and a member reading "1 × 12" invites "one set of twelve" when
   * the athlete owes four.
   */
  if (ex.groupId && targets.length === 1) return body;
  return `${targets.length} × ${body}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUITS — derived from adjacency, never stored as nesting
// ─────────────────────────────────────────────────────────────────────────────

export interface PrescriptionBlock {
  /** null for a loose exercise; the block is then just that one item. */
  groupId: string | null;
  /**
   * What kind of block it is. A SUPERSET alternates set for set and rests once at the end of a round;
   * a CIRCUIT runs rounds under its own banner and optionally a clock. Null for a loose exercise, and
   * 'circuit' for any grouped block that never said — which is every block authored before 0106.
   */
  kind: 'superset' | 'circuit' | null;
  /** The block's own name — "HIIT Finisher". Null for a loose exercise. */
  name: string | null;
  /** Times through. Null when the block is an AMRAP or a loose exercise. */
  rounds: number | null;
  /** An AMRAP's cap in seconds. Null when the block prescribes rounds instead. */
  capSec: number | null;
  items: ProgramExercise[];
}

/** True when this block is bounded by a clock rather than by a round count. */
export const isAmrap = (b: PrescriptionBlock): boolean => b.capSec != null && b.capSec > 0;

/**
 * Turn a flat prescription list into blocks.
 *
 * ADJACENCY, not merely a shared id: two circuits in the same day can carry the same name ("AMRAP #1"
 * and "AMRAP #2" both appear, and a day can hold two blocks both called "Warmup"). Grouping purely by
 * id would fuse a block with a later one that happens to match, silently inventing a round of exercises
 * the athlete never trained together. A block is a RUN of neighbours, so a loose exercise between two
 * circuits correctly ends the first.
 */
export function deriveBlocks(items: readonly ProgramExercise[]): PrescriptionBlock[] {
  const out: PrescriptionBlock[] = [];
  for (const ex of items) {
    const gid = ex.groupId?.trim() || null;
    const last = out[out.length - 1];
    if (gid && last && last.groupId === gid) {
      last.items.push(ex);
      continue;
    }
    out.push({
      groupId: gid,
      kind: gid ? (ex.groupKind === 'superset' ? 'superset' : 'circuit') : null,
      name: gid ? (ex.groupName?.trim() || null) : null,
      rounds: gid ? (ex.groupCapSec ? null : ex.groupRounds ?? null) : null,
      capSec: gid ? ex.groupCapSec ?? null : null,
      items: [ex],
    });
  }
  return out;
}

/**
 * The header a circuit card shows on its right — `⟳3` for rounds, `⟳8m` for a capped AMRAP.
 * Empty for a loose exercise, which has no round count to state.
 */
export function blockRoundsText(b: PrescriptionBlock): string {
  if (isAmrap(b)) return durText(b.capSec);
  return b.rounds && b.rounds > 1 ? String(b.rounds) : '';
}

/**
 * Total prescribed sets across a list, counting a circuit's rounds.
 *
 * A three-exercise finisher run four times is twelve working sets, not three. Program Detail's "planned"
 * meta and the builder's day subtitle both under-counted every circuit before this.
 */
export function plannedSetCount(items: readonly ProgramExercise[]): number {
  return deriveBlocks(items).reduce((total, b) => {
    // An AMRAP prescribes no set count — you get what you get, and claiming a number would invent it.
    if (isAmrap(b)) return total;
    const rounds = b.groupId ? Math.max(1, b.rounds ?? 1) : 1;
    return total + rounds * b.items.reduce((n, ex) => n + setCount(ex), 0);
  }, 0);
}
