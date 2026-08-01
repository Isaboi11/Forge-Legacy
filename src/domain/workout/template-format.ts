/**
 * Template display rules — pure, so they can be tested.
 *
 * Split from `data/templates-live.ts` because that module imports the Supabase client, which makes it
 * unloadable under `node --test`. These are the decisions worth pinning down: an estimate's rounding, a
 * copy's name, when "reps" means seconds, and which date format each surface gets.
 */

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
}

/**
 * SETS × 3 minutes, rounded to 5, floored at 5.
 *
 * Three minutes is a working set plus its rest — the only thing here long enough to matter. Warm-up and
 * cool-down sets count the same, because pretending to know the difference would be false precision on a
 * number the screen already prefixes with "~". Rounding to 5 says the same thing out loud: this is an
 * expectation, not a measurement.
 */
export function estimatedMinutes(exercises: readonly ExerciseShape[]): number {
  const sets = exercises.reduce((n, e) => n + Math.max(0, e.sets), 0);
  return Math.max(5, Math.round((sets * 3) / 5) * 5);
}

/**
 * "3 × 8", or "2 × 30s" when a cool-down's "reps" are really seconds.
 *
 * The design inferred seconds from `reps >= 20`, which mislabels a genuine 20-rep cool-down set as half a
 * minute. The inference is worth keeping — a 30-second stretch is far commoner than a 30-rep one — but
 * the threshold moved to 30, because 20 reps is an ordinary set and 30 reps of anything is not programmed.
 */
export function schemeText(e: ExerciseShape): string {
  const seconds = (e.section ?? 'main') === 'cooldown' && e.targetReps >= 30;
  return `${e.sets} × ${e.targetReps}${seconds ? 's' : ''}`;
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
