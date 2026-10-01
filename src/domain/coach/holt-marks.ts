/**
 * "UPDATED BY HOLT" — which sessions Holt changed, what changed, and how to put one back.
 *
 * ══ WHY THIS EXISTS (PO 2026-10-01) ══
 *
 * Holt can change the running program from the chat, and the change used to vanish into it: the program
 * was overwritten and nothing on the workout said who changed it, what it was before, or why. An athlete
 * opening Thursday and finding Paused Bench where Bench used to be had no way to know that was Holt —
 * or to take it back after the chat's own Undo had scrolled away.
 *
 * ══ HOW ══
 *
 * Every edit Holt saves goes through `edit-ops`, which materialises `weekPlans` (one explicit plan per
 * week). So the changed sessions are found by comparing each week's days before and after, and each
 * changed day carries a `holtNote`: what changed, what the athlete asked, when, and the day as it WAS.
 * The structure is jsonb, so this needs no migration, and the note travels with the day.
 *
 *   · Display is per scheduled session and only for sessions not yet trained or skipped — once a changed
 *     workout is done, the label has done its job.
 *   · "Undo this change" restores `was` on every untrained session carrying that note, and refuses rather
 *     than resizing the program (the 0123 trigger would reject that write anyway).
 *   · `asked` is the athlete's OWN words from the chat, never a reason Holt made up — "You asked" is a
 *     fact the app has; a "why" would be a claim it doesn't.
 *
 * Pure: type-only `@/` imports, relative runtime imports (node --test).
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import type { SessionMark } from '../program/progress-core.ts';
import { plannedDays, totalSessions, trainingDays } from '../program/progress-core.ts';

export const HOLT_LABEL = 'Updated by Holt';

export interface HoltNote {
  /** One id per change, shared by every session that change touched. */
  id: string;
  /** ISO time the change was saved. */
  at: string;
  /** What changed, in Holt's confirm wording ("Swap Bench Press for Paused Bench Press on Thursday"). */
  what: string;
  /** The athlete's own message that led to it, when there was one. Trimmed to a line. */
  asked: string | null;
  /** The session exactly as it was before this change. */
  was: ProgramDay;
}

const ASKED_MAX = 160;

/** The day without its note — what "did this session change?" compares. */
export function withoutNote(day: ProgramDay): ProgramDay {
  if (!day.holtNote) return day;
  const { holtNote: _drop, ...rest } = day;
  return rest;
}

const sameDay = (a: ProgramDay, b: ProgramDay) => JSON.stringify(withoutNote(a)) === JSON.stringify(withoutNote(b));

/**
 * Keep `was` one level deep: a session changed twice remembers the change before, but not every change
 * before that, so the jsonb does not grow with each edit.
 */
function shallowWas(day: ProgramDay): ProgramDay {
  if (!day.holtNote) return day;
  return { ...day, holtNote: { ...day.holtNote, was: withoutNote(day.holtNote.was) } };
}

export function trimAsked(asked: string | null | undefined): string | null {
  const t = (asked ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length > ASKED_MAX ? `${t.slice(0, ASKED_MAX - 1).trimEnd()}…` : t;
}

/**
 * Stamp every session that differs between `before` and `after` with this change's note.
 *
 * Compares each week's raw days position by position. A structure without `weekPlans` (never the case
 * after an `edit-ops` change) is returned untouched rather than guessed at.
 */
export function markHoltChange(
  before: ProgramStructure,
  after: ProgramStructure,
  /** `what` omitted → each session describes its own change (`describeDayChange`). */
  meta: { id: string; at: string; what?: string | null; asked?: string | null },
): ProgramStructure {
  if (!after.weekPlans) return after;
  const asked = trimAsked(meta.asked);
  const weekPlans = after.weekPlans.map((plan, wi) => {
    const prior = plannedDays(before, wi);
    return {
      ...plan,
      days: plan.days.map((day, i) => {
        const was = prior[i];
        if (!was || sameDay(was, day)) return day;
        const what = meta.what?.trim() || describeDayChange(was, day);
        return { ...day, holtNote: { id: meta.id, at: meta.at, what, asked, was: shallowWas(was) } };
      }),
    };
  });
  return { ...after, weekPlans, days: weekPlans[0]?.days ?? after.days };
}

const dose = (e: ProgramExercise) =>
  e.sets != null && e.reps != null ? `${e.sets} × ${e.reps}` : e.sets != null ? `${e.sets} sets` : e.reps != null ? `${e.reps} reps` : null;

/**
 * What changed in one session, in plain words — for a change that came without a chat confirm to quote
 * (the program screen's Ask Holt sheet). "Bench Press → Paused Bench Press", "Bench Press: 3 × 5 → 4 × 5".
 * Two differences at most; anything bigger is a rebuilt session and says so.
 */
export function describeDayChange(was: ProgramDay, now: ProgramDay): string {
  const a = was.main;
  const b = now.main;
  const out: string[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n && out.length < 3; i++) {
    const x = a[i];
    const y = b[i];
    if (x && !y) out.push(`${x.name} removed`);
    else if (!x && y) out.push(`${y.name} added`);
    else if (x && y && x.name !== y.name) out.push(`${x.name} → ${y.name}`);
    else if (x && y && dose(x) !== dose(y) && dose(y)) out.push(`${y.name}: ${dose(x) ?? '—'} → ${dose(y)}`);
    else if (x && y && JSON.stringify(x) !== JSON.stringify(y)) out.push(`${y.name} adjusted`);
  }
  if (out.length === 0) return `${now.name} adjusted`;
  if (out.length > 2) return `${now.name} rebuilt`;
  return out.join(' · ');
}

/** The note on a scheduled session (`dayIndex` counts training days, as marks do), or null. */
export function holtNoteAt(structure: ProgramStructure, weekIndex: number, dayIndex: number): HoltNote | null {
  return trainingDays(plannedDays(structure, weekIndex))[dayIndex]?.holtNote ?? null;
}

const slot = (w: number, d: number) => `${w}:${d}`;

/** Every scheduled session carrying this change, as [weekIndex, dayIndex] pairs. */
function sessionsWith(structure: ProgramStructure, noteId: string): [number, number][] {
  const out: [number, number][] = [];
  for (let wi = 0; wi < Math.max(1, structure.weeks); wi++) {
    trainingDays(plannedDays(structure, wi)).forEach((d, di) => {
      if (d.holtNote?.id === noteId) out.push([wi, di]);
    });
  }
  return out;
}

/** "Week 3", "Weeks 3–5", "Weeks 3, 5 and 7" — 1-based, for the sheet's HOW LONG line. */
export function holtSpanLabel(structure: ProgramStructure, noteId: string): string | null {
  const weeks = [...new Set(sessionsWith(structure, noteId).map(([w]) => w + 1))].sort((a, b) => a - b);
  if (weeks.length === 0) return null;
  if (weeks.length === 1) return `Week ${weeks[0]}`;
  const contiguous = weeks.every((w, i) => i === 0 || w === weeks[i - 1] + 1);
  if (contiguous) return `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
  return `Weeks ${weeks.slice(0, -1).join(', ')} and ${weeks[weeks.length - 1]}`;
}

export type UndoResult = { ok: true; structure: ProgramStructure; restored: number } | { ok: false; message: string };

/**
 * Put every not-yet-trained session this change touched back the way it was.
 *
 * Trained and skipped sessions keep what they were trained as — the record is not rewritten. If putting
 * them back would change how many sessions the program has, it refuses in words instead.
 */
export function undoHoltChange(structure: ProgramStructure, noteId: string, marks: readonly SessionMark[]): UndoResult {
  const touched = new Set(marks.map((m) => slot(m.weekIndex, m.dayIndex)));
  let restored = 0;
  const weekPlans = Array.from({ length: Math.max(1, structure.weeks) }, (_, wi) => {
    let scheduleIndex = -1;
    return {
      days: plannedDays(structure, wi).map((day) => {
        const isSession = day.warmup.length + day.main.length + day.cooldown.length > 0;
        if (isSession) scheduleIndex += 1;
        if (day.holtNote?.id !== noteId) return day;
        if (isSession && touched.has(slot(wi, scheduleIndex))) return day;
        restored += 1;
        return day.holtNote.was;
      }),
    };
  });
  if (restored === 0) return { ok: false, message: 'Those workouts are already done, so there is nothing left to put back.' };
  const after: ProgramStructure = { ...structure, vary: true, weekPlans, days: weekPlans[0].days };
  if (totalSessions(after) !== totalSessions(structure)) {
    return { ok: false, message: "Putting that back would change how long the program is. Ask Holt and he'll sort it out." };
  }
  return { ok: true, structure: after, restored };
}
