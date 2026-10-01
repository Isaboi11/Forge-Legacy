/**
 * Template display rules — pure, so they can be tested.
 *
 * Split from `data/templates-live.ts` because that module imports the Supabase client, which makes it
 * unloadable under `node --test`. These are the decisions worth pinning down: an estimate's rounding, a
 * copy's name, how a hold and a cardio block state themselves, and which date format each surface gets.
 */

// Relative + extensioned: a VALUE import, and this file is loaded by `node --test`, where `@/` is not resolved.
import {
  activityFromKey,
  distanceUnitFor,
  fmtDistanceIn,
  fmtDuration,
  TRACKS_DISTANCE,
  type RowUnit,
} from './conditioning.ts';

export type TemplateSection = 'warmup' | 'main' | 'cooldown';

export const TEMPLATE_SECTIONS: TemplateSection[] = ['warmup', 'main', 'cooldown'];

export const SECTION_LABELS: Record<TemplateSection, string> = {
  warmup: 'Warm-up',
  main: 'Main',
  cooldown: 'Cool-down',
};

interface ExerciseShape {
  sets: number;
  targetReps: number;
  section?: TemplateSection;
  /** A timed row's clock — set for a strength row only when it is timed (PO 2026-09-27). */
  targetDurationSec?: number | null;
  kind?: 'strength' | 'cardio';
  /** A cardio block's activity rides here as `cardio:<activity>` — see `workout-template-rows`. */
  catalogKey?: string | null;
  /** A cardio block's distance, canonical miles. */
  targetMi?: number | null;
}

/**
 * A working set plus its rest — the only thing in a session long enough to matter.
 *
 * Exported because the PROGRAM side estimates the same way (`estimatedSessionMinutes` in
 * `domain/program/prescription`), and a template claiming "~45 min" beside a program day claiming
 * "~30 min" for the identical ten sets would be two answers to one question. One constant, two readers.
 */
export const MINUTES_PER_SET = 3;

/**
 * SETS × 3 minutes, rounded to 5, floored at 5.
 *
 * Warm-up and cool-down sets count the same, because pretending to know the difference would be false
 * precision on a number the screen already prefixes with "~". Rounding to 5 says the same thing out
 * loud: this is an expectation, not a measurement.
 */
export function estimatedMinutes(exercises: readonly ExerciseShape[]): number {
  const sets = exercises.reduce((n, e) => n + Math.max(0, e.sets), 0);
  return Math.max(5, Math.round((sets * MINUTES_PER_SET) / 5) * 5);
}

/**
 * What one row asks for, in one line — the SAME line on every surface that shows a saved workout.
 *
 *   3 × 8              sets of reps
 *   3 × 40s            a timed row (a hold, an interval) — its own clock, never a guess
 *   3.0 mi · 30 min    a cardio block: whichever of its two targets were set
 *   Open               a cardio block with neither — "go for a run"
 *
 * ══ TWO THINGS THIS USED TO GET WRONG (library-03, library-10, programs-26, QA 09-26) ══
 *
 * A CARDIO BLOCK read "1 × 0": it has no sets and no reps, and this printed both anyway.
 *
 * A COOL-DOWN ROW OF 30+ REPS read "30s". That was an inference from the days a strength row could not
 * say "seconds" — and it was only ever true on the preview: the builder showed the same row as "30
 * reps" and the logger asked for thirty of them. A hold now carries `targetDurationSec` and says so
 * itself, so the guess is gone and a rep count is printed as the rep count it is.
 *
 * `units` is the athlete's own — kilometres, a rower in metres. Absent means miles, which is storage.
 */
export function schemeText(e: ExerciseShape, units: { metric?: boolean; rowUnit?: RowUnit } = {}): string {
  if (e.kind === 'cardio') {
    const activity = activityFromKey(e.catalogKey) ?? 'run';
    const unit = distanceUnitFor(activity, units.metric ?? false, units.rowUnit);
    const parts = [
      TRACKS_DISTANCE[activity] && e.targetMi != null && e.targetMi > 0 ? `${fmtDistanceIn(e.targetMi, unit)} ${unit}` : '',
      fmtDuration(e.targetDurationSec),
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Open';
  }
  // A TIMED row says its clock: "3 × 40s", "3 × 1m 30s".
  if (e.targetDurationSec != null && e.targetDurationSec > 0) {
    const m = Math.floor(e.targetDurationSec / 60);
    const sec = e.targetDurationSec % 60;
    return `${e.sets} × ${m ? `${m}m${sec ? ` ${sec}s` : ''}` : `${sec}s`}`;
  }
  return `${e.sets} × ${e.targetReps}`;
}

/** "Leg Day" → "Leg Day (copy)" → "Leg Day (copy 2)". Never silently two things with one name. */
export function copyName(name: string): string {
  const m = name.match(/^(.*) \(copy(?: (\d+))?\)$/);
  const base = m ? m[1] : name;
  const n = m ? Number(m[2] ?? 1) + 1 : 1;
  return (base + (n === 1 ? ' (copy)' : ` (copy ${n})`)).slice(0, 60);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Two formats, deliberately, where the design had three (one of them dead code).
 *
 * A STAT is scanned — it drops the year in the current year, because "Jul 14" sitting between two other
 * stats is unambiguous and the year is noise. `now` is injected so the rule is testable rather than
 * dependent on the day the suite runs.
 */
export function statDate(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? '' : ` ’${String(d.getFullYear()).slice(2)}`}`;
}

/** A HISTORY row is read, not scanned — it always carries the year, so no two rows can look like one day. */
export function historyDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "48 min", or nothing at all — a zero-length session is a missing duration, not a real one. */
export function durationText(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '';
  return `${Math.max(1, Math.round(sec / 60))} min`;
}

/** The three blocks with empties dropped — a template with no warm-up shows no warm-up heading. */
export function groupBySection<T extends ExerciseShape>(
  exercises: readonly T[],
): { key: TemplateSection; label: string; items: T[] }[] {
  return TEMPLATE_SECTIONS.map((key) => ({
    key,
    label: SECTION_LABELS[key],
    items: exercises.filter((e) => (e.section ?? 'main') === key),
  })).filter((s) => s.items.length > 0);
}
