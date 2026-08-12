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
// Relative and extensioned, like every other cross-module domain import: `node --test` loads this file
// directly and cannot resolve the `@/` alias, and the type-only import above is stripped before it tries.
import { MINUTES_PER_SET } from '../workout/template-format.ts';

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
 * The side a per-side prescription refers to, as it is spoken: " per leg", " per side".
 *
 * Empty for everything else, so every existing prescription renders byte-for-byte as it did.
 */
function perText(ex: ProgramExercise): string {
  return ex.per === 'leg' ? ' per leg' : ex.per === 'side' ? ' per side' : '';
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
 *   3 × 10 per leg   a side the athlete owes twice
 *
 * A ladder is never collapsed to its first or highest number. The whole point of 10-8-6-4 is that it
 * descends, and a card reading "4 × 10" would be describing a different session.
 *
 * The per-side suffix hangs off the END of every shape above rather than being woven into any of them,
 * because it modifies the whole ask: "3 × 10-12 per leg" and "2 × 30s per side" are both sentences, and
 * neither needs the rep half to know anything about sides.
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
    return (n > 1 ? `${n} × ${d}` : d) + perText(ex);
  }

  const targets = repTargets(ex);
  if (!targets.length) return '';
  const uniform = targets.every((t) => t === targets[0]);
  /*
   * A RANGE READS AS "10-12", A LADDER AS "6-6-4-4", AND THEY MUST NOT BE CONFUSED.
   *
   * Both use a hyphen, so the range is only ever rendered for a UNIFORM prescription with no ladder —
   * which is the only shape it can mean anything on. `repsMax` is display-only; `repTargets` still
   * reports the floor, so set counts, volume and the logger are untouched.
   */
  const first = targets[0];
  // `typeof first === 'number'` also excludes 'F': a to-failure set has no ceiling to state.
  const hasRange =
    uniform && typeof first === 'number' && !ex.repScheme?.length && ex.repsMax != null && ex.repsMax > first;
  const body = hasRange ? `${first}-${ex.repsMax}` : uniform ? String(first) : targets.join('-');
  /**
   * A circuit member states its reps alone. The "1 ×" is noise at best and a contradiction at worst —
   * the block above it already says ⟳4, and a member reading "1 × 12" invites "one set of twelve" when
   * the athlete owes four.
   */
  if (ex.groupId && targets.length === 1) return body + perText(ex);
  return `${targets.length} × ${body}${perText(ex)}`;
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

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SUPERSET LABELS — A1 / A2, then B1 / B2
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * HOW A SUPERSET'S MEMBERS ARE NAMED, in one place, because three surfaces were each inventing it.
 *
 * ══ WHAT CHANGED AND WHY ══
 *
 * PO: *"On building a superset or adding a superset I don't want them named 'A and B', I want them
 * named 'A1 and A2'. And then if there is a second superset it would go 'B1 and B2' and so on."*
 *
 * They are right, and the old scheme was ambiguous rather than merely different: every superset in a day
 * started again at A, so a day with two of them had two exercises called A and two called B, and "do A
 * next" named four different lifts. The letter now identifies the BLOCK and the number the position
 * inside it, which is how a written program has always done it.
 *
 * ⚠ IT WAS ALSO WRITTEN THREE TIMES — `String.fromCharCode(65 + m)` in the logger,
 * `String.fromCharCode(64 + pairing.pos)` in the Program Builder and again in the Workout Builder, each
 * with its own off-by-one base. One rule, one implementation, and every surface reads it.
 *
 * ══ THE RULES ══
 *
 * · A block is a maximal run of ADJACENT items sharing a `groupId` — the same definition `deriveBlocks`
 *   uses, so the two can never disagree about where a block ends.
 * · Only `groupKind === 'superset'` is lettered. A circuit runs under its own banner and a block that
 *   never declared a kind is a circuit (0106), so neither takes a letter — and the letters therefore
 *   count supersets only, which is what "if there is a SECOND superset it would go B" asks for.
 * · A run of one is not a superset, matching `pairingAt`. A pair broken down to a single member must not
 *   keep drawing a label that says it has a partner.
 *
 * Generic over anything carrying the two group fields, because the same rule has to serve a
 * `ProgramExercise` in a builder and a `SessionExercise` in the live logger.
 */
export interface GroupableItem {
  groupId?: string | null;
  groupKind?: string | null;
}

/** 0 → 'A' … 25 → 'Z', then 'AA'. Nobody builds 27 supersets in a day; running out silently is still worse. */
export function blockLetter(ordinal: number): string {
  let n = Math.max(0, Math.floor(ordinal));
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/**
 * A label per item, index-aligned with the list — `'A1'`, `'A2'`, null, null, `'B1'`, `'B2'`.
 *
 * Null means "not a member of a superset", which is most rows. Callers render nothing for those rather
 * than an empty tag.
 */
export function supersetLabels(items: readonly GroupableItem[]): (string | null)[] {
  const out: (string | null)[] = new Array(items.length).fill(null);
  const gidOf = (i: number): string | null => items[i]?.groupId?.trim() || null;

  let ordinal = 0;
  let i = 0;
  while (i < items.length) {
    const gid = gidOf(i);
    if (!gid) {
      i += 1;
      continue;
    }
    // The end of this run of adjacent same-group items.
    let end = i;
    while (end + 1 < items.length && gidOf(end + 1) === gid) end += 1;

    if (items[i].groupKind === 'superset' && end - i + 1 >= 2) {
      const letter = blockLetter(ordinal);
      ordinal += 1;
      for (let k = i; k <= end; k += 1) out[k] = `${letter}${k - i + 1}`;
    }
    i = end + 1;
  }
  return out;
}

/** One row's label. The array form is cheaper when a whole list is being drawn — prefer it in a render. */
export function supersetLabelAt(items: readonly GroupableItem[], index: number): string | null {
  return supersetLabels(items)[index] ?? null;
}

/**
 * The same letters, for callers that already hold `deriveBlocks` output rather than the flat list.
 *
 * Index-aligned with `blocks`; null for anything that is not a superset. It must stay in step with
 * `supersetLabels` — both count supersets only, both require two members — which is why it is here
 * beside it rather than re-derived at each call site.
 */
export function supersetBlockLetters(blocks: readonly PrescriptionBlock[]): (string | null)[] {
  let ordinal = 0;
  return blocks.map((b) =>
    b.kind === 'superset' && b.groupId && b.items.length > 1 ? blockLetter(ordinal++) : null,
  );
}

/**
 * The letter alone, for the heading that sits above a block — "Superset A · 2 exercises, alternated".
 *
 * Without it the heading says "Superset" twice on a day with two of them, directly above tags that have
 * gone to the trouble of distinguishing them.
 */
export function supersetLetterAt(items: readonly GroupableItem[], index: number): string | null {
  const label = supersetLabelAt(items, index);
  return label ? label.replace(/\d+$/, '') : null;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// HOW BIG IS THIS SESSION — the one line read before committing to it
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ══ WHY A SESSION IS NOT SUMMARISED BY `main.length` AND `plannedSetCount` ══
 *
 * The preview stated "6 exercises · 19 sets" over a day that DREW eight movement names and four things:
 * three exercise rows and one bordered circuit card. Both numbers were arithmetically correct and both
 * described a session the athlete could not see.
 *
 *   6 exercises   counted the three circuit STATIONS as peers of the three lifts, while the screen
 *                 correctly drew them inside one block — and it excluded the two warm-up rows, so the
 *                 number matched neither the rows above it nor the rows below it.
 *   19 sets       counted the circuit's 3 rounds × 3 stations as nine sets. Nobody calls a round of
 *                 sled-swing-burpee "three sets", and no set count appears anywhere on that card.
 *
 * So the summary counts what the sheet DRAWS: loose exercises are exercises, their sets are sets, and a
 * grouped block is described in its own words ("3-round finisher") rather than dissolved into both
 * totals. A day of three lifts and a finisher reads "3 exercises · 10 sets · 3-round finisher", and
 * every number in that line is a thing you can point at on screen.
 */
export interface SessionSize {
  /** Exercises drawn as their own row. A grouped block is ONE thing and is not in here. */
  exercises: number;
  /** Sets those rows prescribe. A block's rounds are not sets and are not in here either. */
  sets: number;
  /** Each grouped block in its own words — "3-round finisher", "8m amrap". Ordered as authored. */
  blockLabels: string[];
  /** Whole-session estimate, warm-up included. Always rendered behind a "~". */
  minutes: number;
}

/** One station of a circuit, performed once per round. A rep-based station is a guess; a timed one isn't. */
const SEC_PER_CIRCUIT_STATION = 45;
/** Between rounds of a block, and after an AMRAP's clock stops. */
const SEC_BETWEEN_ROUNDS = 60;
/** After a loose timed effort — a 30s sled push is not followed by another one immediately. */
const SEC_AFTER_TIMED_SET = 60;
/**
 * A warm-up movement, flat.
 *
 * NOT `setCount` × the per-set constant: `adopt-core` gives a warm-up parsed as "10 reps" `sets: 1`, and
 * charging it three minutes would price ten bodyweight squats like a working set of squats. Ninety
 * seconds is the whole item — reps and the walk to the next one.
 */
const SEC_PER_WARMUP_ITEM = 90;
/** A prescribed mile, for a cardio bout that states distance instead of time. */
const SEC_PER_MILE = 9 * 60;

/** How long a loose (ungrouped) item takes, rest included. */
function looseSeconds(ex: ProgramExercise): number {
  if (ex.kind === 'cardio') {
    if (ex.targetSec != null && ex.targetSec > 0) return ex.targetSec;
    if (ex.targetMi != null && ex.targetMi > 0) return ex.targetMi * SEC_PER_MILE;
    // An open bout prescribes no length. Claiming one would invent the very thing the author left open.
    return 0;
  }
  if (isTimed(ex)) return setCount(ex) * ((ex.durationSec ?? 0) + SEC_AFTER_TIMED_SET);
  return setCount(ex) * MINUTES_PER_SET * 60;
}

/** How long ONE pass through a circuit station takes. Its rest belongs to the round, not to the station. */
function stationSeconds(ex: ProgramExercise): number {
  return isTimed(ex) ? ex.durationSec ?? 0 : SEC_PER_CIRCUIT_STATION;
}

/**
 * "Can I fit this in right now?" — the question a Home-screen preview is actually asked.
 *
 * Rounded to 5 and floored at 5, the same shape `estimatedMinutes` uses on the template side, and for the
 * same reason: this is an expectation, not a measurement.
 */
export function estimatedSessionMinutes(
  warmup: readonly ProgramExercise[] | undefined,
  main: readonly ProgramExercise[],
): number {
  let sec = (warmup?.length ?? 0) * SEC_PER_WARMUP_ITEM;

  for (const b of deriveBlocks(main)) {
    if (!b.groupId) {
      for (const ex of b.items) sec += looseSeconds(ex);
      continue;
    }
    // An AMRAP's cap IS its duration — the one block in the model that states its own length.
    if (isAmrap(b)) {
      sec += (b.capSec ?? 0) + SEC_BETWEEN_ROUNDS;
      continue;
    }
    const rounds = Math.max(1, b.rounds ?? 1);
    const round = b.items.reduce((n, ex) => n + stationSeconds(ex), 0);
    sec += rounds * round + (rounds - 1) * SEC_BETWEEN_ROUNDS;
  }

  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

/**
 * A grouped block in the words the athlete would use for it.
 *
 * `last` earns the word "finisher": a circuit that ENDS the day is a finisher, and one sitting in the
 * middle of it is not — calling both a finisher would describe the session's shape wrongly to make one
 * sentence shorter. Everything else falls back to what the block actually is.
 */
function blockSizeText(b: PrescriptionBlock, last: boolean): string {
  // AMRAP already names the shape; "8m amrap finisher" adds a word and no information.
  if (isAmrap(b)) return `${durText(b.capSec)} amrap`;
  const noun = last ? 'finisher' : b.kind === 'superset' ? 'superset' : 'circuit';
  return b.rounds && b.rounds > 1 ? `${b.rounds}-round ${noun}` : noun;
}

/** The session measured the way it is drawn. See `SessionSize` for why this is not two `reduce`s. */
export function sessionSize(
  warmup: readonly ProgramExercise[] | undefined,
  main: readonly ProgramExercise[],
): SessionSize {
  const blocks = deriveBlocks(main);
  const loose = blocks.filter((b) => !b.groupId).flatMap((b) => b.items);
  return {
    exercises: loose.length,
    sets: plannedSetCount(loose),
    blockLabels: blocks
      .map((b, i) => ({ b, last: i === blocks.length - 1 }))
      .filter(({ b }) => b.groupId)
      .map(({ b, last }) => blockSizeText(b, last)),
    minutes: estimatedSessionMinutes(warmup, main),
  };
}

/**
 * "~40 min · 3 exercises · 10 sets · 3-round finisher" — the session's size, stated once.
 *
 * Lower-case at the source; the surfaces that want it shouting apply `textTransform` themselves.
 *
 * Duration leads because it is the thing being decided. An athlete standing in the kitchen at 6:40 is
 * not weighing nineteen sets against eleven — they are asking whether this fits before work, and the set
 * count cannot answer that.
 *
 * Empty segments are dropped rather than zeroed: a MOBILITY day with no set counts authored says
 * "~20 min · 6 exercises" and not "· 0 sets", which is a confident claim of emptiness rather than the
 * absence of a claim.
 */
export function sessionSummary(
  warmup: readonly ProgramExercise[] | undefined,
  main: readonly ProgramExercise[],
): string {
  const s = sessionSize(warmup, main);
  const parts = [`~${s.minutes} min`];
  if (s.exercises > 0) parts.push(`${s.exercises} ${s.exercises === 1 ? 'exercise' : 'exercises'}`);
  if (s.sets > 0) parts.push(`${s.sets} ${s.sets === 1 ? 'set' : 'sets'}`);
  parts.push(...s.blockLabels);
  return parts.join(' · ');
}
