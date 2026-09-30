import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
/* Relative, not `@/` — the alias is a bundler feature and these modules also run under `node --test`.
   A type-only import may use it (types are erased); a value import may not. */
import type { SessionMark } from '../program/progress-core.ts';
import { plannedDays, trainingDays } from '../program/progress-core.ts';

import { canStretch, candidatesFor, type CandidateContext, type CatalogExercise } from './candidates.ts';
import { equipmentForEnvironment, type Environment, type Experience } from './constraints.ts';
import { canEdit } from './edit-ops.ts';
import { roomOf } from './recommend.ts';

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
  /**
   * What this same slot holds in the program's OTHER weeks (`slotKeysElsewhere`). QA holt-24: after a
   * "just this week" swap the original was never offered back, so undoing a swap by hand was impossible.
   * It leads the list — it is the athlete's own program, so it is already known to fit them.
   */
  offerBack: readonly string[] = [],
): EditValue[] {
  const current = pool.find((e) => e.key === row.catalogKey);
  if (!current) return [];
  const out: CatalogExercise[] = [];
  const seen = new Set<string>([current.key]);
  const add = (e: CatalogExercise) => {
    if (seen.has(e.key)) return;
    seen.add(e.key);
    out.push(e);
  };
  for (const key of offerBack) {
    const back = pool.find((e) => e.key === key);
    if (back) add(back);
  }
  const at = { ...ctx, used: new Set([current.key]) };
  /* ⚠ THE ATHLETE'S OWN RUNG FIRST, THEN ONE UP — the same two passes `fillSlot` makes (STRETCH_CEILING).
     `difficulty` is technique demand, so a strict beginner list can be two rows long; the stretch fills the
     rest without ever reaching `Advanced` (a pistol squat) for a beginner. */
  for (const e of candidatesFor(current.pattern, pool, at)) add(e);
  if (canStretch(ctx.experience)) for (const e of candidatesFor(current.pattern, pool, at, true)) add(e);
  return out.slice(0, limit).map((e) => ({ label: e.name, replacement: e }));
}

/**
 * The movements this slot (same session, same row) holds in the program's other weeks, nearest week
 * first, when they differ from what is there now — what a "just this week" swap left behind.
 */
export function slotKeysElsewhere(
  structure: ProgramStructure,
  at: { weekIndex: number; dayIndex: number; exerciseIndex: number },
): string[] {
  const keyIn = (w: number) => trainingDays(plannedDays(structure, w))[at.dayIndex]?.main[at.exerciseIndex]?.catalogKey ?? null;
  const here = keyIn(at.weekIndex);
  const weeks = Array.from({ length: Math.max(1, structure.weeks) }, (_, w) => w)
    .filter((w) => w !== at.weekIndex)
    .sort((a, b) => Math.abs(a - at.weekIndex) - Math.abs(b - at.weekIndex) || a - b);
  const out: string[] = [];
  for (const w of weeks) {
    const key = keyIn(w);
    if (key && key !== here && !out.includes(key)) out.push(key);
  }
  return out;
}

const LEVELS: readonly Experience[] = ['beginner', 'intermediate', 'advanced'];

/**
 * The level and the kit a swap inside a RUNNING program is judged against (QA holt-24).
 *
 * ⚠ THE ROOM COMES FROM THE PROGRAM, NOT FROM WHATEVER THE SHEET HAPPENED TO HOLD. The edit flow never
 * asks where they train, so it used `ownedEquipment ?? []` — nothing at all for anybody without a Home Gym
 * profile — and a commercial-gym beginner block was offered only bodyweight squats: Pistol, Shrimp, Sissy,
 * Jump Squat. A Forge program names its room; otherwise the room Holt remembers; otherwise their Home Gym;
 * otherwise a full gym, because the program they are running is the evidence of what they train with.
 *
 * ⚠ AND THE RUNG IS NEVER ABOVE THE PROGRAM'S. A beginner block stays a beginner block whatever level the
 * athlete once told Holt — a swap is a like-for-like change, not a promotion.
 */
export function swapTerms(opts: {
  athleteLevel: Experience | null | undefined;
  /** A Forge program's authored `difficulty`, or null for one Holt or the athlete wrote. */
  programLevel?: string | null;
  /** A Forge program's authored `environment` ("Commercial Gym", "Home — …"), or null. */
  programEnvironment?: string | null;
  rememberedRoom?: Environment | null;
  /** The Home Gym profile. `null` = never set up; `[]` = owns nothing. */
  owned: readonly string[] | null | undefined;
}): { experience: Experience; owned: readonly string[] } {
  const athlete: Experience = opts.athleteLevel ?? 'intermediate';
  const rung = LEVELS.find((l) => l === (opts.programLevel ?? '').trim().toLowerCase()) ?? null;
  const experience = rung && LEVELS.indexOf(rung) < LEVELS.indexOf(athlete) ? rung : athlete;
  const room: Environment = roomOf(opts.programEnvironment) ?? opts.rememberedRoom ?? (opts.owned != null ? 'home' : 'full_gym');
  return { experience, owned: equipmentForEnvironment(room, opts.owned ?? []) };
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

/**
 * What a tapped change actually did, in one sentence (QA holt-05). The typed path names its plan before
 * it applies; the tapped path used to say only "Done." — so the athlete could not tell what moved.
 */
export function describeTappedEdit(
  change: EditChangeId,
  name: string,
  v: { sets?: number; targetMi?: number; targetSec?: number; replacementName?: string },
  scope: 'this_week' | 'rest_of_block',
): string {
  const when = scope === 'this_week' ? 'this week' : 'from here on';
  if (change === 'swap') return `${name} is now ${v.replacementName ?? 'the new movement'}, ${when}.`;
  if (change === 'sets' && typeof v.sets === 'number') return `${name} is now ${v.sets} ${v.sets === 1 ? 'set' : 'sets'}, ${when}.`;
  if (change === 'distance' && typeof v.targetMi === 'number') return `${name} is now ${Math.round(v.targetMi * 10) / 10} mi, ${when}.`;
  if (change === 'duration' && typeof v.targetSec === 'number') {
    const min = Math.round(v.targetSec / 60);
    return `${name} is now ${min} ${min === 1 ? 'minute' : 'minutes'}, ${when}.`;
  }
  return `${name} changed, ${when}.`;
}
