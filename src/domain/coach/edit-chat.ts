import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
/* Relative, not `@/` — the alias is a bundler feature and these modules also run under `node --test`.
   A type-only import may use it (types are erased); a value import may not. */
import type { SessionMark } from '../program/progress-core.ts';
import { plannedDays, trainingDays } from '../program/progress-core.ts';

import { candidatesFor, type CandidateContext, type CatalogExercise } from './candidates.ts';
import { canEdit } from './edit-ops.ts';

/**
 * Changing a plan you are already running, as a conversation.
 *
 * ══ THIS MODULE DECIDES WHAT TO OFFER. `edit-ops.ts` DECIDES WHAT IS LEGAL. ══
 *
 * The split matters. `edit-ops` is the guard: it refuses to touch a session you have trained, refuses
 * anything that would change the number of sessions, and returns a refusal in Holt's words. This module
 * never duplicates those rules — it reads them (`canEdit`) so the conversation only ever *offers* what
 * the guard would *allow*.
 *
 * ⚠ **AN OPTION THE APP THEN REFUSES IS WORSE THAN AN OPTION THAT WAS NEVER THERE.** Offering last
 * Tuesday and then explaining why you cannot have it teaches the athlete the coach does not know his own
 * rules. `edit-ops` says so itself about the swap sheet: a row you can tap and then be told no is worse
 * than a row that was never shown. So the refusals in `edit-ops` are a backstop for races and stale
 * state, not the normal path — the normal path is that they are never reachable.
 *
 * ══ WHY POSITION IS SACRED, RESTATED HERE BECAUSE IT IS EASY TO FORGET ══
 *
 * Progress is a row keyed by `(program_id, week_index, day_index)`, and `ProgramDay` has no id. So an
 * edit that shifts an index re-points a completed session at a different workout, and the app then claims
 * you did something you never did. Everything below changes what is IN a slot; nothing moves a slot, adds
 * one, or removes one.
 */

export interface EditTarget {
  weekIndex: number;
  dayIndex: number;
}

export interface EditableSession {
  at: EditTarget;
  label: string;
  day: ProgramDay;
}

/**
 * The sessions still ahead of the athlete, soonest first.
 *
 * ⚠ TRAINED AND SKIPPED SESSIONS ARE NOT IN HERE AT ALL. That is History Cannot Be Rewritten doing its
 * job at the point where it costs nothing to obey — before anybody has tapped anything.
 */
export function editableSessions(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  limit = 8,
): EditableSession[] {
  const out: EditableSession[] = [];
  for (let weekIndex = 0; weekIndex < Math.max(1, structure.weeks); weekIndex += 1) {
    const days = trainingDays(plannedDays(structure, weekIndex));
    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      if (!canEdit(marks, weekIndex, dayIndex)) continue;
      const day = days[dayIndex];
      if (!day) continue;
      out.push({ at: { weekIndex, dayIndex }, label: `Week ${weekIndex + 1}, day ${dayIndex + 1} — ${day.name}`, day });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT CAN BE CHANGED ABOUT A GIVEN DAY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type EditChangeId = 'swap' | 'sets' | 'distance' | 'duration' | 'rebuild';

export interface EditChange {
  id: EditChangeId;
  label: string;
}

const isCardio = (e: ProgramExercise): boolean => e.kind === 'cardio';
const hasMiles = (e: ProgramExercise): boolean => isCardio(e) && typeof e.targetMi === 'number' && e.targetMi > 0;
const hasSeconds = (e: ProgramExercise): boolean => isCardio(e) && typeof e.targetSec === 'number' && e.targetSec > 0;
const isLift = (e: ProgramExercise): boolean => !isCardio(e);

/**
 * ⚠ **READ OFF THE DAY, NEVER A FIXED MENU.** Offering "change the distance" on a bench-press day is the
 * coach not having looked at the session he wrote. Each option below exists only if there is something in
 * the day it could apply to.
 */
export function changesFor(day: ProgramDay): EditChange[] {
  const out: EditChange[] = [];
  if (day.main.some(isLift)) out.push({ id: 'swap', label: 'Swap an exercise' });
  if (day.main.some(hasMiles)) out.push({ id: 'distance', label: 'Change the distance' });
  if (day.main.some(hasSeconds)) out.push({ id: 'duration', label: 'Change how long' });
  if (day.main.some(isLift)) out.push({ id: 'sets', label: 'Change the sets' });
  out.push({ id: 'rebuild', label: 'Rebuild it around something' });
  return out;
}

export interface EditRow {
  index: number;
  label: string;
}

/** The rows in the day a given change could apply to. */
export function rowsFor(day: ProgramDay, change: EditChangeId): EditRow[] {
  const keep =
    change === 'distance' ? hasMiles : change === 'duration' ? hasSeconds : change === 'sets' || change === 'swap' ? isLift : () => false;
  return day.main
    .map((e, index) => ({ e, index }))
    .filter(({ e }) => keep(e))
    .map(({ e, index }) => ({ index, label: describe(e) }));
}

/** What the athlete sees on the chip — the movement plus what it currently asks for. */
export function describe(e: ProgramExercise): string {
  if (isCardio(e)) {
    if (typeof e.targetMi === 'number' && e.targetMi > 0) return `${e.name} · ${round1(e.targetMi)} mi`;
    if (typeof e.targetSec === 'number' && e.targetSec > 0) return `${e.name} · ${Math.round(e.targetSec / 60)} min`;
    return e.name;
  }
  if (e.sets && e.reps) return `${e.name} · ${e.sets} × ${e.reps}`;
  return e.name;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE VALUES ON OFFER
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface EditValue {
  label: string;
  /** Exactly one of these, matching the op that will be called. */
  sets?: number;
  targetMi?: number;
  targetSec?: number;
  replacement?: CatalogExercise;
}

/** Program Builder clamps, restated so the chat cannot offer something the Builder then refuses to render. */
const SETS_MIN = 1;
const SETS_MAX = 8;

/**
 * ⚠ **OFFERED RELATIVE TO WHAT IS THERE, AND NEVER THE VALUE IT ALREADY HAS.** A chip that changes
 * nothing is a chip that wastes a tap and then looks broken when the plan comes back identical.
 */
export function valuesFor(day: ProgramDay, change: EditChangeId, index: number): EditValue[] {
  const row = day.main[index];
  if (!row) return [];

  if (change === 'sets') {
    const current = row.sets ?? 3;
    return [current - 2, current - 1, current + 1, current + 2]
      .filter((n) => n >= SETS_MIN && n <= SETS_MAX && n !== current)
      .map((n) => ({ label: `${n} sets`, sets: n }));
  }

  if (change === 'distance') {
    const current = row.targetMi ?? 0;
    /* Proportional, not fixed steps: ±1 mile is a big change to a 3-mile run and noise on a 20-mile one. */
    const deltas = current >= 10 ? [-4, -2, 2, 4] : current >= 5 ? [-2, -1, 1, 2] : [-1, -0.5, 0.5, 1];
    return deltas
      .map((d) => round1(current + d))
      .filter((mi) => mi >= 0.5 && mi !== round1(current))
      .map((mi) => ({ label: `${mi} mi`, targetMi: mi }));
  }

  if (change === 'duration') {
    const currentMin = Math.round((row.targetSec ?? 0) / 60);
    const deltas = currentMin >= 60 ? [-20, -10, 10, 20] : [-10, -5, 5, 10];
    return deltas
      .map((d) => currentMin + d)
      .filter((m) => m >= 5 && m !== currentMin)
      .map((m) => ({ label: `${m} min`, targetSec: m * 60 }));
  }

  return [];
}

/**
 * Replacements for a lift: the same movement pattern, filtered by what the athlete can actually do.
 *
 * ⚠ THE PATTERN COMES FROM THE CATALOGUE, NOT THE ROW. A `ProgramExercise` carries a name and a key, not
 * a movement pattern — so an exercise whose key no longer resolves has no honest substitutes and returns
 * none, rather than a list of things that train something else.
 */
export function replacementsFor(
  row: ProgramExercise,
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
  limit = 5,
): EditValue[] {
  const current = pool.find((e) => e.key === row.catalogKey);
  if (!current) return [];
  return candidatesFor(current.pattern, pool, { ...ctx, used: new Set([current.key]) })
    .filter((e) => e.key !== current.key)
    .slice(0, limit)
    .map((e) => ({ label: e.name, replacement: e }));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// HOW FAR THE CHANGE REACHES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ **"JUST THIS WEEK" IS THE DEFAULT AND IS LISTED FIRST, DELIBERATELY.**
 *
 * Most edits are situational — a bad night, a busy Thursday, a shoulder that is off today — and silently
 * rewriting the rest of the block to match a one-off is a much bigger change than the athlete asked for.
 * Both are safe (neither moves an index or changes the count); one is surprising. Same reasoning as
 * EX-002-D3's session-only default.
 */
export const SCOPE_CHOICES = [
  { label: 'Just this week', scope: 'this_week' as const },
  { label: 'Every week from here', scope: 'rest_of_block' as const },
];
