/**
 * CHANGING A RUNNING PROGRAM ALREADY UNDER WAY (Holt Listens step 3, HL-11 — PO scenario P2, 2026-11-19):
 * *"I'm feeling really sore. These miles are taking a toll. I need less miles, less running, more rest days."*
 *
 * Deterministic engine ops — the model never writes a mileage. From the athlete's NEXT open session on:
 *
 *   · `runVolume` — every run's distance (or time) scaled down (`a_little` −15%, `a_lot` −30%) or up (+10% / +20%).
 *   · `restDays`  — one or two easy runs a week become REST: they are marked skipped (the same mark "skip" makes), never
 *                   deleted. ⚠ Migration 0123 refuses a structure write that changes a started program's session count,
 *                   so a rest day is a mark, not a removed session — and nothing is lost: un-skip brings it back.
 *   · `runToBike` — one easy run a week becomes an easy bike ride of about the same time (a cardio row the logger
 *                   already knows: activity `bike`, indoor). Same session, same count.
 *
 * ⚠ WHAT NEVER MOVES: a trained or skipped session; the FINAL week (race week / taper end — the race itself is the
 * long run there); the long run is never the one turned into rest or a ride. Every op goes through `edit-ops`'
 * `commit`, which re-checks the session count before anything could reach the database.
 *
 * Pure: relative imports only.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import { plannedDays, trainingDays, type SessionMark } from '../../program/progress-core.ts';
import { editableSessions } from '../edit-chat.ts';
import { canEdit, commit, materialise, sessionAt } from '../edit-ops.ts';

export type Amount = 'a_little' | 'a_lot';

export interface RunningChange {
  runVolume?: { direction: 'less' | 'more'; amount?: Amount };
  /** How many easy runs a week become rest (1 or 2). */
  restDays?: number;
  /** How many easy runs a week become an easy bike ride (1 or 2). */
  runToBike?: number;
}

export type RunningChangeResult =
  | { ok: true; structure: ProgramStructure; rest: { weekIndex: number; dayIndex: number }[]; lines: string[] }
  | { ok: false; message: string };

const FACTOR = { less: { a_little: 0.85, a_lot: 0.7 }, more: { a_little: 1.1, a_lot: 1.2 } } as const;
/** Easy pace used ONLY to turn a run's distance into a ride's minutes (a ride of about the same time). */
const EASY_MIN_PER_MILE = 11;

const isRun = (e: ProgramExercise) => e.kind === 'cardio' && e.activity === 'run';
const milesOf = (d: ProgramDay) => d.main.filter(isRun).reduce((s, e) => s + (e.targetMi ?? 0), 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const weekMiles = (s: ProgramStructure, w: number) => round1(trainingDays(plannedDays(s, w)).reduce((t, d) => t + milesOf(d), 0));

export function planRunningChange(structure: ProgramStructure, marks: readonly SessionMark[], change: RunningChange): RunningChangeResult {
  const first = editableSessions(structure, marks, 1)[0];
  if (!first) return { ok: false, message: "Every session in this program is done — there's nothing left in it to change." };
  const weeks = Math.max(1, structure.weeks);
  const lastWeek = weeks - 1;
  const fromWeek = first.at.weekIndex;
  if (fromWeek >= lastWeek) return { ok: false, message: "You're in the final week — I'm leaving race week exactly as it is." };

  const plans = materialise(structure);
  const rest: { weekIndex: number; dayIndex: number }[] = [];
  const lines: string[] = [];
  let anyRun = false;
  let biked = 0;

  for (let w = fromWeek; w < lastWeek; w += 1) {
    const days = trainingDays(plans[w].days);
    /* This week's editable run sessions, easy ones first (the long run is the longest and is never picked). */
    const runDays = days
      .map((d, i) => ({ d, i }))
      .filter(({ d, i }) => d.main.some(isRun) && canEdit(marks, w, i));
    if (runDays.length) anyRun = true;
    const longest = days.reduce((best, d, i) => (milesOf(d) > milesOf(days[best] ?? d) ? i : best), 0);
    const easy = runDays.filter(({ i }) => i !== longest).sort((a, b) => milesOf(a.d) - milesOf(b.d));

    // 1 · volume — every editable run this week
    if (change.runVolume) {
      const f = FACTOR[change.runVolume.direction][change.runVolume.amount ?? 'a_little'];
      for (const { i } of runDays) {
        const day = sessionAt(plans, w, i);
        if (!day) continue;
        day.main = day.main.map((e) =>
          isRun(e)
            ? {
                ...e,
                ...(e.targetMi != null ? { targetMi: Math.max(1, round1(e.targetMi * f)) } : {}),
                ...(e.targetSec != null ? { targetSec: Math.max(600, Math.round((e.targetSec * f) / 60) * 60) } : {}),
              }
            : e,
        );
      }
    }

    // 2 · a run becomes a ride (before rest, so the two never take the same session)
    const toBike = Math.min(change.runToBike ?? 0, Math.max(0, easy.length - 1));
    const taken = new Set<number>();
    for (const { i } of easy.slice(0, toBike)) {
      const day = sessionAt(plans, w, i);
      if (!day) continue;
      const miles = milesOf(day);
      const minutes = Math.max(20, Math.round((miles * EASY_MIN_PER_MILE) / 5) * 5);
      day.main = day.main.map((e) =>
        isRun(e)
          ? { name: 'Easy Bike', kind: 'cardio' as const, activity: 'bike' as const, modality: 'indoor' as const, targetMi: null, targetSec: minutes * 60 }
          : e,
      );
      day.name = 'Easy Bike';
      taken.add(i);
      biked += 1;
    }

    // 3 · rest — marked skipped, never removed; at least two runs a week stay
    const restable = easy.filter(({ i }) => !taken.has(i));
    const keepRuns = runDays.length - taken.size;
    const toRest = Math.min(change.restDays ?? 0, Math.max(0, keepRuns - 2), restable.length);
    for (const { i } of restable.slice(0, toRest)) rest.push({ weekIndex: w, dayIndex: i });
  }

  if (!anyRun) return { ok: false, message: "There's no running left in this program for me to change." };

  const result = commit(structure, plans);
  if (!result.ok) return { ok: false, message: result.refusal.message };

  // What changed, in numbers the athlete can check (a week in the middle of what moved).
  const sample = Math.min(lastWeek - 1, fromWeek + Math.floor((lastWeek - fromWeek) / 2));
  if (change.runVolume) {
    const pct = Math.round(Math.abs(1 - FACTOR[change.runVolume.direction][change.runVolume.amount ?? 'a_little']) * 100);
    lines.push(
      `Running ${change.runVolume.direction === 'less' ? 'down' : 'up'} about ${pct}% from week ${fromWeek + 1} — week ${sample + 1} goes from ${weekMiles(structure, sample)} to ${weekMiles(result.structure, sample)} miles.`,
    );
  }
  if (biked) lines.push(`${biked === 1 ? 'One easy run' : `${biked} easy runs`} become${biked === 1 ? 's' : ''} an easy bike ride of about the same time.`);
  if (rest.length) {
    const perWeek = new Set(rest.map((r) => r.weekIndex)).size;
    lines.push(`${rest.length / perWeek === 1 ? 'One easy run a week' : `${rest.length / perWeek} easy runs a week`} becomes a rest day (weeks ${rest[0].weekIndex + 1}–${rest[rest.length - 1].weekIndex + 1}).`);
  }
  lines.push('Race week stays exactly as planned.');
  return { ok: true, structure: result.structure, rest, lines };
}
