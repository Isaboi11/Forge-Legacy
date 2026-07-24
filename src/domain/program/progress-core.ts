/**
 * Program progress, schedule and log derivation — the model behind Program Detail (`Forge Program.dc`).
 * Pure (no JSON, no Supabase) so every rule here is unit-testable under `node --test`.
 *
 * The core idea: a program prescribes `weeks × daysPerWeek` sessions. Saved workouts carrying this
 * program's id ARE the progress — ordered by when they were started, the Nth saved workout is week
 * `floor(N / daysPerWeek)`, day `N % daysPerWeek`. Nothing is stored twice; there is no separate
 * progress cursor to drift out of sync with the workouts the athlete actually logged.
 */

import type { ProgramDay, ProgramStructure } from '@/data/programs-live';

export type ProgramState = 'future' | 'active' | 'graduated' | 'ended_early';

/** A saved workout attributed to a program, with everything the log needs. */
export interface LoggedWorkout {
  id: string;
  name: string;
  startedAt: string; // ISO
  durationSec: number | null;
  exercises: LoggedExercise[];
}
export interface LoggedExercise {
  name: string;
  section: string;
  sets: LoggedSet[];
}
export interface LoggedSet {
  setIndex: number;
  weight: number | null;
  reps: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE
// ─────────────────────────────────────────────────────────────────────────────

/** The prescribed days for a given week — the per-week plan in Customize mode, else the template. */
export function plannedDays(structure: ProgramStructure, weekIndex: number): ProgramDay[] {
  if (structure.vary && structure.weekPlans && structure.weekPlans[weekIndex]) {
    return structure.weekPlans[weekIndex].days;
  }
  return structure.days;
}

/** Days that actually prescribe something — an empty day is not a session the athlete owes. */
export function trainingDays(days: ProgramDay[]): ProgramDay[] {
  return days.filter((d) => d.warmup.length + d.main.length + d.cooldown.length > 0);
}

/** Sessions per week: what the athlete configured, floored by what is actually built. */
export function sessionsPerWeek(structure: ProgramStructure): number {
  const built = trainingDays(plannedDays(structure, 0)).length;
  return Math.max(1, built || structure.daysPerWeek);
}

export function totalSessions(structure: ProgramStructure): number {
  return Math.max(1, structure.weeks) * sessionsPerWeek(structure);
}

export const dayLabel = (d: ProgramDay, i: number) => (d.name.trim() ? d.name : `Day ${d.letter || String.fromCharCode(65 + i)}`);

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgramProgress {
  completed: number;
  total: number;
  /** 1-based, clamped to the program length. */
  week: number;
  /** How many of THIS week's sessions are done. */
  completedThisWeek: number;
  perWeek: number;
  pct: number;
  /** Index of the next prescribed session, or null once every session is logged. */
  nextWeekIndex: number | null;
  nextDayIndex: number | null;
}

export function computeProgress(structure: ProgramStructure, completedCount: number): ProgramProgress {
  const perWeek = sessionsPerWeek(structure);
  const total = totalSessions(structure);
  const completed = Math.max(0, Math.min(total, completedCount));
  const done = completed >= total;
  return {
    completed,
    total,
    week: Math.min(Math.max(1, structure.weeks), Math.floor(completed / perWeek) + 1),
    completedThisWeek: completed % perWeek,
    perWeek,
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    nextWeekIndex: done ? null : Math.floor(completed / perWeek),
    nextDayIndex: done ? null : completed % perWeek,
  };
}

/** The session "Continue Training" should open — the first one not yet logged. */
export function nextSession(
  structure: ProgramStructure,
  completedCount: number,
): { weekIndex: number; dayIndex: number; day: ProgramDay } | null {
  const p = computeProgress(structure, completedCount);
  if (p.nextWeekIndex == null || p.nextDayIndex == null) return null;
  const days = trainingDays(plannedDays(structure, p.nextWeekIndex));
  const day = days[p.nextDayIndex];
  return day ? { weekIndex: p.nextWeekIndex, dayIndex: p.nextDayIndex, day } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE LOG — week → day → exercise → sets, completed rows real, future rows planned
// ─────────────────────────────────────────────────────────────────────────────

export interface LogSet {
  label: string;
  value: string;
}
export interface LogExercise {
  name: string;
  sets: LogSet[];
  /** Prescription shown when the session hasn't been trained yet. */
  planned: string;
}
export interface LogDay {
  name: string;
  num: number;
  completed: boolean;
  date: string | null;
  meta: string;
  exercises: LogExercise[];
}
export interface LogWeek {
  week: number; // 1-based
  days: LogDay[];
  complete: boolean;
  completedCount: number;
}

const fmtWeight = (w: number | null) => (w != null && w > 0 ? `${w} lb` : null);

function plannedLine(d: ProgramDay): LogExercise[] {
  return [...d.warmup, ...d.main, ...d.cooldown].map((ex) => ({
    name: ex.name,
    sets: [],
    planned: ex.sets != null && ex.reps != null ? `${ex.sets} × ${ex.reps}` : '',
  }));
}

function loggedLine(w: LoggedWorkout): LogExercise[] {
  return w.exercises.map((ex) => ({
    name: ex.name,
    planned: '',
    sets: ex.sets.map((s) => {
      const weight = fmtWeight(s.weight);
      return {
        label: `Set ${s.setIndex + 1}`,
        value: weight && s.reps != null ? `${weight} × ${s.reps}` : s.reps != null ? `${s.reps} reps` : '—',
      };
    }),
  }));
}

const dateLabel = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Build the full week-by-week log. Sessions are matched to slots by ORDER, not by name — an athlete who
 * swapped or renamed a day still gets a truthful log, and a workout logged off-plan still occupies the
 * slot it was trained in.
 */
export function buildLog(structure: ProgramStructure, logged: LoggedWorkout[]): LogWeek[] {
  const perWeek = sessionsPerWeek(structure);
  const ordered = [...logged].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));

  return Array.from({ length: Math.max(1, structure.weeks) }, (_, wi) => {
    const planned = trainingDays(plannedDays(structure, wi));
    const days: LogDay[] = Array.from({ length: perWeek }, (_, di) => {
      const slot = wi * perWeek + di;
      const done = ordered[slot];
      const plan = planned[di];
      const num = slot + 1;

      if (done) {
        const sets = done.exercises.reduce((a, e) => a + e.sets.length, 0);
        const mins = done.durationSec != null ? Math.round(done.durationSec / 60) : null;
        return {
          name: done.name || (plan ? dayLabel(plan, di) : `Day ${di + 1}`),
          num,
          completed: true,
          date: dateLabel(done.startedAt),
          meta: [mins != null ? `${mins} min` : null, `${sets} ${sets === 1 ? 'set' : 'sets'}`]
            .filter(Boolean)
            .join(' · '),
          exercises: loggedLine(done),
        };
      }

      return {
        name: plan ? dayLabel(plan, di) : `Day ${di + 1}`,
        num,
        completed: false,
        date: null,
        meta: plan ? `${plan.main.length + plan.warmup.length + plan.cooldown.length} planned` : 'Rest',
        exercises: plan ? plannedLine(plan) : [],
      };
    });

    const completedCount = days.filter((d) => d.completed).length;
    return { week: wi + 1, days, complete: completedCount === days.length && days.length > 0, completedCount };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS — the tiles above the log
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgramStats {
  workouts: number;
  sets: number;
  volume: number; // lb
  heaviest: number; // lb
}

export function computeStats(logged: LoggedWorkout[]): ProgramStats {
  let sets = 0;
  let volume = 0;
  let heaviest = 0;
  for (const w of logged) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        sets += 1;
        if (s.weight != null && s.weight > 0) {
          heaviest = Math.max(heaviest, s.weight);
          if (s.reps != null) volume += s.weight * s.reps;
        }
      }
    }
  }
  return { workouts: logged.length, sets, volume: Math.round(volume), heaviest };
}

/** Compact volume for a stat tile: 850 → "850 lb", 12,450 → "12.5k lb", 120,000 → "120k lb". */
export function fmtVolume(lb: number): string {
  if (lb <= 0) return '—';
  if (lb < 1000) return `${lb} lb`;
  const k = lb / 1000;
  // Keep a decimal until the number is big enough that it stops carrying information.
  const shown = k < 100 ? k.toFixed(1).replace(/\.0$/, '') : String(Math.round(k));
  return `${shown}k lb`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESENTATION — the five states of the CTA bar
// ─────────────────────────────────────────────────────────────────────────────

export interface StateView {
  pill: string;
  cta: string;
  secondary: string | null;
}

export function viewForState(state: ProgramState, owned: boolean): StateView {
  if (!owned) return { pill: 'Preview', cta: 'Start Program', secondary: null };
  switch (state) {
    case 'active':
      return { pill: 'Active', cta: 'Continue Training', secondary: 'End Program' };
    case 'graduated':
      return { pill: 'Graduated', cta: 'Run Again', secondary: null };
    case 'ended_early':
      return { pill: 'Ended early', cta: 'Restart Program', secondary: null };
    default:
      return { pill: 'Planned', cta: 'Start Program', secondary: 'Remove from Planned' };
  }
}

/** Distinct equipment across the program, for the Equipment pills. */
export function equipmentOf(structure: ProgramStructure): string[] {
  const seen = new Set<string>();
  const scan = (days: ProgramDay[]) => {
    for (const d of days) {
      for (const ex of [...d.warmup, ...d.main, ...d.cooldown]) {
        if (ex.equip) seen.add(ex.equip);
      }
    }
  };
  scan(structure.days);
  for (const w of structure.weekPlans ?? []) scan(w.days);
  return [...seen].sort();
}
