/**
 * Changing a plan you are already running, without rewriting what you have done.
 *
 * ══ WHY THIS IS DELICATE ══
 *
 * Progress is POSITIONAL. A completed session is a row keyed by `(program_id, week_index, day_index)` and
 * `ProgramDay` has no id of its own, so *any* edit that shifts an index re-points an existing record at a
 * different workout — the app would then claim you did a session you never did. `progress-core` says so
 * in as many words on `swapSessionOrder`, and migration 0123 exists because a resize could also move the
 * graduation threshold under an athlete who was already running at it.
 *
 * ══ THE THREE RULES, INHERITED FROM THE SWAP THAT SHIPPED BEFORE THIS ══
 *
 *   1. **Never touch a trained or skipped session.** Not a courtesy — a touched slot carries a row.
 *   2. **Keep `totalSessions` invariant.** No adding or removing days or weeks, ever. Asserted below
 *      rather than assumed, because the trigger in 0123 will reject the write and the athlete would only
 *      find out at save time.
 *   3. **Scope to the smallest unit that makes sense.** Materialise `weekPlans` and edit one week, so
 *      changing Thursday because your shoulder hurts does not silently rewrite the next six weeks.
 *
 * Everything here changes what a FUTURE session asks of you. Nothing changes what a past one recorded.
 *
 * ══ WHAT AN EDIT MAY CHANGE ══
 *
 * `EX-002-D5` already settled this for substitution and the same line holds for every operation here:
 * *"only `exerciseId` changes… the athlete is replacing the movement, not the training prescription."*
 * So a swap keeps the sets and reps; a prescription change keeps the movement. One thing at a time, which
 * is also what makes each one legible on a screen.
 *
 * Pure: type-only imports, injected catalogue. The AI tier will call exactly these functions — it never
 * gets a more powerful edit path than the wizard.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import type { SessionMark } from '../program/progress-core.ts';
import { plannedDays, totalSessions } from '../program/progress-core.ts';

import { fillSlot, isCompound, type CandidateContext, type CatalogExercise } from './candidates.ts';
import { prescribeReps, roleFor, type PrescribeContext } from './prescribe.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESULT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type EditRefusalReason =
  | 'already_trained'
  | 'no_such_session'
  | 'no_such_exercise'
  | 'not_cardio'
  | 'would_resize';

export interface EditRefusal {
  reason: EditRefusalReason;
  /** Holt's words, shown verbatim. */
  message: string;
}

export type EditResult =
  | { ok: true; structure: ProgramStructure }
  | { ok: false; refusal: EditRefusal };

/** Which weeks an edit reaches. */
export type EditScope = 'this_week' | 'rest_of_block';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GUARDS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const key = (w: number, d: number) => `${w}:${d}`;

const touchedSet = (marks: readonly SessionMark[]) =>
  new Set(marks.map((m) => key(m.weekIndex, m.dayIndex)));

/**
 * Can this session be changed at all?
 *
 * Exposed so a screen can decide what to OFFER rather than what to refuse. A row the athlete can tap and
 * then be told no is worse than a row that was never offered — the same reasoning that keeps touched days
 * out of the swap sheet instead of showing them greyed.
 */
export function canEdit(marks: readonly SessionMark[], weekIndex: number, dayIndex: number): boolean {
  return !touchedSet(marks).has(key(weekIndex, dayIndex));
}

const trainedRefusal = (): EditRefusal => ({
  reason: 'already_trained',
  message:
    "You've already done that one — it's part of your record now, and I'm not going to change what it says. Tell me which one coming up you want different instead.",
});

/**
 * Every week materialised from whatever it resolves to today.
 *
 * The untouched weeks keep the plan they already had rather than inheriting the edit — the same move
 * `swapSessionOrder` makes, and the reason a program flips to `vary: true` on its first edit.
 */
function materialise(structure: ProgramStructure): { days: ProgramDay[] }[] {
  return Array.from({ length: Math.max(1, structure.weeks) }, (_, wi) => ({
    days: [...plannedDays(structure, wi)].map((d) => ({ ...d, main: [...d.main] })),
  }));
}

/**
 * ⚠ THE INVARIANT, CHECKED RATHER THAN TRUSTED.
 *
 * Migration 0123 puts a trigger on `programs` that rejects a structure write changing the session count on
 * a started program. If an op here ever broke that, the athlete would get a database error at save time
 * with no idea what they did. Failing here instead turns a mystery into a sentence.
 */
function commit(before: ProgramStructure, plans: { days: ProgramDay[] }[]): EditResult {
  const after: ProgramStructure = { ...before, vary: true, weekPlans: plans, days: plans[0].days };
  if (totalSessions(after) !== totalSessions(before)) {
    return {
      ok: false,
      refusal: {
        reason: 'would_resize',
        message:
          "That would change how long the program is, and I can't do that to one you've already started. Duplicate it and I'll build the change into the copy.",
      },
    };
  }
  return { ok: true, structure: after };
}

/** The weeks an edit touches, skipping any session already trained or skipped. */
function targetWeeks(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  weekIndex: number,
  dayIndex: number,
  scope: EditScope,
): number[] {
  const last = scope === 'this_week' ? weekIndex : Math.max(1, structure.weeks) - 1;
  const touched = touchedSet(marks);
  const out: number[] = [];
  for (let w = weekIndex; w <= last; w++) {
    // A later week CAN already be trained — sessions can be done out of order. Skipping rather than
    // refusing keeps "change the rest of the block" useful for someone who jumped ahead once.
    if (!touched.has(key(w, dayIndex))) out.push(w);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Swap one movement for another. **Only the exercise changes.**
 *
 * Sets, reps, the rep range and every cardio target are carried across untouched — `EX-002-D5`: *"the
 * athlete is replacing the movement, not the training prescription."* Swapping a bench press for a floor
 * press because the bench is taken should not quietly re-dose the session.
 */
export function swapExercise(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  at: { weekIndex: number; dayIndex: number; exerciseIndex: number },
  replacement: CatalogExercise,
  scope: EditScope = 'this_week',
): EditResult {
  if (!canEdit(marks, at.weekIndex, at.dayIndex)) return { ok: false, refusal: trainedRefusal() };

  const plans = materialise(structure);
  const source = plans[at.weekIndex]?.days[at.dayIndex]?.main[at.exerciseIndex];
  if (!source) return { ok: false, refusal: noSuchExercise() };

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const row = plans[w]?.days[at.dayIndex]?.main[at.exerciseIndex];
    // Only where the same movement is actually sitting in that slot. A later week whose plan already
    // differs is not the exercise the athlete was looking at, and changing it would be a surprise.
    if (!row || row.catalogKey !== source.catalogKey) continue;
    plans[w].days[at.dayIndex].main[at.exerciseIndex] = {
      ...row,
      catalogKey: replacement.key,
      name: replacement.name,
    };
  }

  return commit(structure, plans);
}

/**
 * Change what a strength slot asks for. The movement stays.
 *
 * Clamped to the Program Builder's own limits, because a program the Builder cannot render is a program
 * the athlete cannot then edit by hand.
 */
export function setPrescription(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  at: { weekIndex: number; dayIndex: number; exerciseIndex: number },
  next: { sets?: number; reps?: number; repsMax?: number | null },
  scope: EditScope = 'this_week',
): EditResult {
  if (!canEdit(marks, at.weekIndex, at.dayIndex)) return { ok: false, refusal: trainedRefusal() };

  const plans = materialise(structure);
  const source = plans[at.weekIndex]?.days[at.dayIndex]?.main[at.exerciseIndex];
  if (!source) return { ok: false, refusal: noSuchExercise() };

  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const row = plans[w]?.days[at.dayIndex]?.main[at.exerciseIndex];
    if (!row || row.catalogKey !== source.catalogKey) continue;
    const updated: ProgramExercise = { ...row };
    if (next.sets != null) updated.sets = clamp(next.sets, 1, 8);
    if (next.reps != null) updated.reps = clamp(next.reps, 1, 60);
    if (next.repsMax !== undefined) {
      updated.repsMax = next.repsMax == null ? null : clamp(next.repsMax, 1, 60);
    }
    plans[w].days[at.dayIndex].main[at.exerciseIndex] = updated;
  }

  return commit(structure, plans);
}

/**
 * Change a cardio bout's target — "make Thursday four miles instead of six".
 *
 * ⚠ `null` IS A REAL VALUE and clears the target rather than zeroing it. The schema is explicit that a
 * null target prescribes an OPEN bout — "go for a run" — and coercing it to 0 prescribes a run of no
 * distance. `undefined` leaves a field alone; `null` clears it.
 */
export function setCardioTarget(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  at: { weekIndex: number; dayIndex: number; exerciseIndex: number },
  next: { targetMi?: number | null; targetSec?: number | null; targetPaceSec?: number | null },
  scope: EditScope = 'this_week',
): EditResult {
  if (!canEdit(marks, at.weekIndex, at.dayIndex)) return { ok: false, refusal: trainedRefusal() };

  const plans = materialise(structure);
  const source = plans[at.weekIndex]?.days[at.dayIndex]?.main[at.exerciseIndex];
  if (!source) return { ok: false, refusal: noSuchExercise() };
  if (source.kind !== 'cardio') {
    return {
      ok: false,
      refusal: { reason: 'not_cardio', message: "That one isn't a cardio block — tell me the sets and reps instead." },
    };
  }

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const row = plans[w]?.days[at.dayIndex]?.main[at.exerciseIndex];
    if (!row || row.kind !== 'cardio' || row.activity !== source.activity) continue;
    const updated: ProgramExercise = { ...row };
    if (next.targetMi !== undefined) updated.targetMi = next.targetMi;
    if (next.targetSec !== undefined) updated.targetSec = next.targetSec;
    if (next.targetPaceSec !== undefined) updated.targetPaceSec = next.targetPaceSec;
    plans[w].days[at.dayIndex].main[at.exerciseIndex] = updated;
  }

  return commit(structure, plans);
}

/**
 * Rebuild one day around something new to avoid — "my shoulder's off, redo Thursday".
 *
 * ══ IT KEEPS THE DAY'S SHAPE ══
 *
 * The replacement patterns are read off the day that is already there rather than from a skeleton, so the
 * rebuilt day trains the same movements in the same order with the same prescriptions — only the exercises
 * expressing them change. That keeps the exercise count identical, which is what keeps `totalSessions`
 * invariant, and it means the athlete gets back something recognisable rather than a different session.
 *
 * A slot whose pattern has nothing left after the new exclusion keeps its original exercise rather than
 * being dropped: removing it would shorten the day, and the whole point of the guard is that days do not
 * change length.
 */
export function rebuildDay(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  at: { weekIndex: number; dayIndex: number },
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
  prescribeCtx: Omit<PrescribeContext, 'weekIndex' | 'isDeload'>,
  scope: EditScope = 'this_week',
): EditResult {
  if (!canEdit(marks, at.weekIndex, at.dayIndex)) return { ok: false, refusal: trainedRefusal() };

  const plans = materialise(structure);
  const template = plans[at.weekIndex]?.days[at.dayIndex];
  if (!template) {
    return {
      ok: false,
      refusal: { reason: 'no_such_session', message: "I can't find that session in this program." },
    };
  }

  const patternOf = new Map(pool.map((e) => [e.key, e.pattern]));

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const day = plans[w]?.days[at.dayIndex];
    if (!day) continue;
    const used = new Set<string>();
    day.main = day.main.map((row, i) => {
      if (row.kind === 'cardio' || !row.catalogKey) return row;
      const pattern = patternOf.get(row.catalogKey);
      if (!pattern) return row;

      const found = fillSlot(pattern, pool, { ...ctx, used });
      if (!found) {
        // Nothing else trains it — keep what was there rather than shorten the day.
        used.add(row.catalogKey);
        return row;
      }
      used.add(found.exercise.key);

      // The day keeps its dose; only the movement changes. Role is re-derived from position because the
      // rebuilt exercise may be a compound where the old one was not.
      const rx = prescribeReps(roleFor(i, isCompound(found.pattern)), {
        ...prescribeCtx,
        weekIndex: w,
        isDeload: day.name.includes('[DELOAD]'),
      });
      return {
        ...row,
        catalogKey: found.exercise.key,
        name: found.exercise.name,
        sets: row.sets ?? rx.sets,
        reps: row.reps ?? rx.reps,
        repsMax: row.repsMax ?? rx.repsMax,
      };
    });
  }

  return commit(structure, plans);
}

const noSuchExercise = (): EditRefusal => ({
  reason: 'no_such_exercise',
  message: "I can't find that movement in the session — try again from the schedule.",
});
