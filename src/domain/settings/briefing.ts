/**
 * The morning briefing's schedule — which days it fires, and at what local hour (0159).
 *
 * ⚠ THESE DAYS ARE WHEN THE ATHLETE WANTS TO BE TOLD, NOT WHEN THEY TRAIN.
 *
 * The distinction is the whole design. Forge Legacy has no calendar: `planned_workouts` carries no date,
 * `ProgramStructure` has no weekday, `daysPerWeek` is a count, and progress moves only when a session is
 * logged — never with the clock. A "I train Mon/Wed/Fri" field would hand the app the ability to decide
 * that a Tuesday was a failure, which is what `Calendar-System-Architecture-v1.0` (LOCKED, unbuilt) owns
 * and CAL-D19 forbids notifying about. So the athlete picks when to hear from us, and nothing more.
 *
 * ⚠ WHICH IS WHY THE DEFAULT IS ALL SEVEN DAYS, and it is not the noisy answer it looks like. The quiet
 * rule in `briefing_send()` announces any one open session at most twice and then goes silent until it is
 * trained or skipped, so a seven-day schedule self-limits to roughly two notifications per session
 * whatever the athlete's real rhythm is. Making them guess their own training days up front, in a product
 * that deliberately refuses to model them, would be asking a question the app cannot use the answer to.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

/** ISO day-of-week, matching Postgres `extract(isodow …)`: 1 = Monday … 7 = Sunday. */
export type IsoDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BriefingSchedule {
  days: IsoDay[];
  /** Local hour, 0–23. The sender resolves "local" through `profiles.tz`. */
  hour: number;
}

export const ISO_DAYS: readonly IsoDay[] = [1, 2, 3, 4, 5, 6, 7];

/** Monday-first, because `isodow` is and a week that starts on Sunday would misread the array. */
export const DAY_LABELS: Readonly<Record<IsoDay, string>> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

export const BRIEFING_DEFAULT: BriefingSchedule = { days: [1, 2, 3, 4, 5, 6, 7], hour: 7 };

/** The hours worth offering. A briefing is a morning object; 4am–11am is the whole honest range. */
export const BRIEFING_HOURS: readonly number[] = [4, 5, 6, 7, 8, 9, 10, 11];

/** "7:00 AM" — the picker's label and the confirmation line under it. */
export function formatHour(hour: number): string {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  const suffix = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}

/**
 * A stored row read back against the current shape.
 *
 * ⚠ AN EMPTY DAY LIST FALLS BACK TO THE DEFAULT RATHER THAN MEANING "NEVER". The table's own check
 * constraint refuses `{}`, so an empty array here can only be a stale or corrupt read — and resolving it
 * to silence would present a screen showing no days selected, with a toggle that says the briefing is on.
 * The toggle is the off switch; this is not a second one that can disagree with it.
 */
export function sanitizeBriefing(raw: unknown): BriefingSchedule {
  const out: BriefingSchedule = { ...BRIEFING_DEFAULT, days: [...BRIEFING_DEFAULT.days] };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r.days)) {
    const seen = new Set<IsoDay>();
    for (const d of r.days) {
      const n = typeof d === 'number' ? d : Number(d);
      if (Number.isInteger(n) && n >= 1 && n <= 7) seen.add(n as IsoDay);
    }
    if (seen.size > 0) out.days = ISO_DAYS.filter((d) => seen.has(d));
  }

  if (typeof r.hour === 'number' && Number.isInteger(r.hour) && r.hour >= 0 && r.hour <= 23) {
    out.hour = r.hour;
  }

  return out;
}

/** "Every day" / "Weekdays" / "Mon, Wed, Fri" — what the row says under its label. */
export function describeDays(days: readonly IsoDay[]): string {
  const set = new Set(days);
  if (set.size === 7) return 'Every day';
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d as IsoDay))) return 'Weekdays';
  if (set.size === 2 && set.has(6) && set.has(7)) return 'Weekends';
  if (set.size === 0) return 'No days selected';
  return ISO_DAYS.filter((d) => set.has(d))
    .map((d) => DAY_LABELS[d])
    .join(', ');
}
