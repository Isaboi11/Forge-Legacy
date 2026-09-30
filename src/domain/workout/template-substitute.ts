/**
 * Changing ONE row of a saved template — pure, so the rules can be tested.
 *
 * ══ WHY THIS EXISTS ══
 *
 * The Exercise Picker has offered "This & future workouts" on every swap since it was built, and both
 * buttons ran the same code: the swap lived and died with the session (library-02, QA 09-26).
 * `Exercise-002-Exercise-Substitution-Architecture` (LOCKED) §7.3 / §9.1 says what the second button is
 * for — *"Update my template"*, offered when the session came from a personal template — and what it
 * does: the row's exercise changes and NOTHING ELSE does (EX-002-D5). This is that, and nothing wider.
 *
 * The same edit is the "Replace" on a deleted custom exercise's tombstone (`Exercise-001` §8.2), which
 * is a prescription repair rather than a substitution but moves the same one field.
 */

// Relative + extensioned: a VALUE import in a file `node --test` loads, where `@/` does not resolve.
import { isCardioKey } from './conditioning.ts';

/** The hold a rep row becomes when it is swapped for a timed movement — `DEFAULT_HOLD_SEC`, the catalogue's own. */
const SWAP_HOLD_SEC = 30;
/** The reps a timed row becomes when it is swapped for a counted movement — the builders' main-lift default. */
const SWAP_REPS = 10;

interface Row {
  catalogKey: string | null;
  name: string;
  targetReps: number;
  kind?: 'strength' | 'cardio';
  targetDurationSec?: number | null;
  restAfterSec?: number | null;
  repScheme?: number[] | null;
  repsMax?: number | null;
}

/** Which row, and what it was when the athlete looked at it — so a template edited since is never guessed at. */
export interface RowTarget {
  index: number;
  name?: string | null;
  catalogKey?: string | null;
}

export interface RowSubstitute {
  catalogKey: string | null;
  name: string;
  /** `'time'` for a hold. Absent = unknown, and the row keeps the measure it had. */
  unit?: 'reps' | 'time';
}

const same = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Is `rows[target.index]` still the row the athlete meant?
 *
 * ⚠ BY POSITION *AND* IDENTITY, NEVER BY IDENTITY ALONE. A template can hold the same lift twice (a heavy
 * set and a back-off), so "the row called Bench" is two rows. And a session can outlive an edit to its
 * template, so "row 2" may now be something else. Both must agree, or nothing is written.
 */
export function findTemplateRow(rows: readonly Row[], target: RowTarget): number {
  const row = rows[target.index];
  if (!row) return -1;
  if (target.catalogKey && row.catalogKey) return row.catalogKey === target.catalogKey ? target.index : -1;
  return same(row.name, target.name) ? target.index : -1;
}

/**
 * The template with one row's MOVEMENT replaced. Null when the row is no longer there, or the swap is one
 * a template row cannot hold — and then the caller changes nothing.
 *
 * Sets, reps, percentages, rest, section, superset membership and the author's cue all stay (EX-002-D5).
 * The one thing that gives is the MEASURE, and only when it has to: "Crunch 3 × 12" swapped for a plank
 * must not become "Plank 3 × 12", so a counted row taking a hold becomes 30 seconds, and a hold taking a
 * counted move becomes 10 reps. Sets carry over either way.
 *
 * A lift ⇄ cardio swap is refused: a run has no sets and a lift has no distance, so the row would have to
 * be rebuilt from nothing, which is an edit for the builder rather than a one-tap persistence.
 */
export function replaceTemplateRow<T extends Row>(rows: readonly T[], target: RowTarget, to: RowSubstitute): T[] | null {
  const at = findTemplateRow(rows, target);
  if (at < 0) return null;
  const row = rows[at];
  if (row.kind === 'cardio' || isCardioKey(to.catalogKey)) return null;

  let next: T = { ...row, catalogKey: to.catalogKey, name: to.name };
  const timed = row.targetDurationSec != null && row.targetDurationSec > 0;
  if (to.unit === 'time' && !timed) {
    next = { ...next, targetReps: 0, targetDurationSec: SWAP_HOLD_SEC, repScheme: null, repsMax: null };
  } else if (to.unit === 'reps' && timed) {
    next = { ...next, targetReps: SWAP_REPS, targetDurationSec: null, restAfterSec: null };
  }
  return rows.map((r, i) => (i === at ? next : r));
}

/**
 * The template without one row (`Exercise-001` §8.2 "Remove"). Null when the row is no longer there.
 *
 * A superset left with ONE member stops being a superset — the same rule removal takes in the builder
 * and the logger, because a block is found by adjacency and a block of one reads as nothing.
 */
export function removeTemplateRow<T extends Row & { groupId?: string | null }>(rows: readonly T[], target: RowTarget): T[] | null {
  const at = findTemplateRow(rows, target);
  if (at < 0) return null;
  const gid = rows[at].groupId ?? null;
  const next = rows.filter((_, i) => i !== at);
  if (!gid) return next;
  const left = next.filter((r) => r.groupId === gid);
  if (left.length !== 1) return next;
  return next.map((r) => (r.groupId === gid ? { ...r, groupId: null, groupName: null, groupKind: null, groupRounds: null } : r));
}
