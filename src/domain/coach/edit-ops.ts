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
import { rawIndexOf } from '../program/schedule-edit.ts';

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
  | 'would_resize'
  | 'duplicate'
  | 'too_few_exercises'
  | 'nothing_to_change';

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

/**
 * The session at SCHEDULE index `dayIndex` in week `w` — the n-th training day, not the n-th array slot.
 *
 * ⚠ Every caller (`edit-chat.ts`, the marks, `canEdit`) counts training days only, while `plans[w].days`
 * keeps the rest days. Indexing the raw array directly edited the wrong session on any week with a gap —
 * Friday's pull-ups asked for, Wednesday's squats changed (Decision Queue #23, stress test 2026-09-21).
 */
function sessionAt(plans: { days: ProgramDay[] }[], w: number, dayIndex: number): ProgramDay | undefined {
  const days = plans[w]?.days;
  if (!days) return undefined;
  const i = rawIndexOf(days, dayIndex);
  return i < 0 ? undefined : days[i];
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
  const source = sessionAt(plans, at.weekIndex, at.dayIndex)?.main[at.exerciseIndex];
  if (!source) return { ok: false, refusal: noSuchExercise() };

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const row = sessionAt(plans, w, at.dayIndex)?.main[at.exerciseIndex];
    // Only where the same movement is actually sitting in that slot. A later week whose plan already
    // differs is not the exercise the athlete was looking at, and changing it would be a surprise.
    if (!row || row.catalogKey !== source.catalogKey) continue;
    sessionAt(plans, w, at.dayIndex)!.main[at.exerciseIndex] = {
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
  const source = sessionAt(plans, at.weekIndex, at.dayIndex)?.main[at.exerciseIndex];
  if (!source) return { ok: false, refusal: noSuchExercise() };

  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const row = sessionAt(plans, w, at.dayIndex)?.main[at.exerciseIndex];
    if (!row || row.catalogKey !== source.catalogKey) continue;
    const updated: ProgramExercise = { ...row };
    if (next.sets != null) updated.sets = clamp(next.sets, 1, 8);
    if (next.reps != null) updated.reps = clamp(next.reps, 1, 60);
    if (next.repsMax !== undefined) {
      updated.repsMax = next.repsMax == null ? null : clamp(next.repsMax, 1, 60);
    }
    sessionAt(plans, w, at.dayIndex)!.main[at.exerciseIndex] = updated;
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
  const source = sessionAt(plans, at.weekIndex, at.dayIndex)?.main[at.exerciseIndex];
  if (!source) return { ok: false, refusal: noSuchExercise() };
  if (source.kind !== 'cardio') {
    return {
      ok: false,
      refusal: { reason: 'not_cardio', message: "That one isn't a cardio block — tell me the sets and reps instead." },
    };
  }

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const row = sessionAt(plans, w, at.dayIndex)?.main[at.exerciseIndex];
    if (!row || row.kind !== 'cardio' || row.activity !== source.activity) continue;
    const updated: ProgramExercise = { ...row };
    if (next.targetMi !== undefined) updated.targetMi = next.targetMi;
    if (next.targetSec !== undefined) updated.targetSec = next.targetSec;
    if (next.targetPaceSec !== undefined) updated.targetPaceSec = next.targetPaceSec;
    sessionAt(plans, w, at.dayIndex)!.main[at.exerciseIndex] = updated;
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
  const template = sessionAt(plans, at.weekIndex, at.dayIndex);
  if (!template) {
    return {
      ok: false,
      refusal: { reason: 'no_such_session', message: "I can't find that session in this program." },
    };
  }

  const patternOf = new Map(pool.map((e) => [e.key, e.pattern]));

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const day = sessionAt(plans, w, at.dayIndex);
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

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ADDING AND REMOVING A MOVEMENT (typed edits, 2026-09-22)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A session must keep at least this many exercises after a removal. One row is not a session the athlete
 * would recognise as the day they signed up for, and zero rows would drop the day from the schedule
 * altogether — `trainingDays` filters empty days, which is a resize by the back door.
 */
export const MIN_EXERCISES_AFTER_REMOVE = 2;

/**
 * Add one movement to the end of a session — "add hammer curls to Monday".
 *
 * ⚠ IT CANNOT RESIZE, AND `commit` STILL CHECKS. Appending to a session that already prescribes something
 * leaves every schedule index where it was; only the rows inside the slot change. The session count is
 * asserted anyway, like every op here.
 *
 * `make` builds the row per week, so a caller can dose it from the rulebook for THAT week (the rep climb,
 * a deload's lighter sets) instead of copying week one's numbers down the block. A later week that already
 * holds the movement is left alone rather than given it twice (PAS §10.3, no duplicates per section).
 */
export function addExercise(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  at: { weekIndex: number; dayIndex: number },
  make: (weekIndex: number, day: ProgramDay) => ProgramExercise,
  scope: EditScope = 'this_week',
): EditResult {
  if (!canEdit(marks, at.weekIndex, at.dayIndex)) return { ok: false, refusal: trainedRefusal() };

  const plans = materialise(structure);
  const first = sessionAt(plans, at.weekIndex, at.dayIndex);
  if (!first) return { ok: false, refusal: noSuchSession() };
  const probe = make(at.weekIndex, first);
  if (probe.catalogKey && first.main.some((e) => e.catalogKey === probe.catalogKey)) {
    return {
      ok: false,
      refusal: { reason: 'duplicate', message: `${probe.name} is already in that session — want more sets of it instead?` },
    };
  }

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const day = sessionAt(plans, w, at.dayIndex);
    if (!day) continue;
    const row = w === at.weekIndex ? probe : make(w, day);
    if (row.catalogKey && day.main.some((e) => e.catalogKey === row.catalogKey)) continue;
    day.main.push(row);
  }

  return commit(structure, plans);
}

/**
 * Take one movement out of a session — "drop the front squats on Lower A".
 *
 * Refused when the session would be left with fewer than `MIN_EXERCISES_AFTER_REMOVE` rows. In later weeks
 * (rest of the block) a session that is already that short is skipped rather than refused, and the row is
 * found by its catalogue key rather than its index — a later week whose plan differs is not the row the
 * athlete was looking at.
 */
export function removeExercise(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  at: { weekIndex: number; dayIndex: number; exerciseIndex: number },
  scope: EditScope = 'this_week',
): EditResult {
  if (!canEdit(marks, at.weekIndex, at.dayIndex)) return { ok: false, refusal: trainedRefusal() };

  const plans = materialise(structure);
  const first = sessionAt(plans, at.weekIndex, at.dayIndex);
  const source = first?.main[at.exerciseIndex];
  if (!first || !source) return { ok: false, refusal: noSuchExercise() };
  if (first.main.length - 1 < MIN_EXERCISES_AFTER_REMOVE) return { ok: false, refusal: tooFew() };

  for (const w of targetWeeks(structure, marks, at.weekIndex, at.dayIndex, scope)) {
    const day = sessionAt(plans, w, at.dayIndex);
    if (!day || day.main.length - 1 < MIN_EXERCISES_AFTER_REMOVE) continue;
    const i =
      w === at.weekIndex
        ? at.exerciseIndex
        : day.main.findIndex((e) => (source.catalogKey ? e.catalogKey === source.catalogKey : e.name === source.name));
    if (i < 0) continue;
    day.main.splice(i, 1);
  }

  return commit(structure, plans);
}

/**
 * Set the sets on several rows at once, in one write — the "more arm work" edit, which touches every
 * matching row across a week (or a block).
 *
 * Each change names its row by position AND, optionally, by catalogue key: a key that no longer matches is
 * a stale plan (the program changed underneath the conversation) and that change is dropped rather than
 * landing on whatever now sits in the slot. A touched session anywhere in the list refuses the whole
 * batch, because a half-applied volume change is not what anybody confirmed.
 */
export function setSetsMany(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  changes: readonly { at: { weekIndex: number; dayIndex: number; exerciseIndex: number }; sets: number; catalogKey?: string }[],
): EditResult {
  if (changes.some((c) => !canEdit(marks, c.at.weekIndex, c.at.dayIndex))) return { ok: false, refusal: trainedRefusal() };

  const plans = materialise(structure);
  let changed = 0;
  for (const c of changes) {
    const day = sessionAt(plans, c.at.weekIndex, c.at.dayIndex);
    const row = day?.main[c.at.exerciseIndex];
    if (!day || !row || row.kind === 'cardio') continue;
    if (c.catalogKey !== undefined && row.catalogKey !== c.catalogKey) continue;
    const sets = Math.min(8, Math.max(1, Math.round(c.sets)));
    if (sets === row.sets) continue;
    day.main[c.at.exerciseIndex] = { ...row, sets };
    changed += 1;
  }
  if (changed === 0) {
    return { ok: false, refusal: { reason: 'nothing_to_change', message: 'That would leave the plan exactly as it is.' } };
  }

  return commit(structure, plans);
}

const tooFew = (): EditRefusal => ({
  reason: 'too_few_exercises',
  message: `That would leave the session with fewer than ${MIN_EXERCISES_AFTER_REMOVE} exercises. Swap it for something else instead?`,
});

const noSuchSession = (): EditRefusal => ({
  reason: 'no_such_session',
  message: "I can't find that session in this program.",
});

const noSuchExercise = (): EditRefusal => ({
  reason: 'no_such_exercise',
  message: "I can't find that movement in the session — try again from the schedule.",
});
