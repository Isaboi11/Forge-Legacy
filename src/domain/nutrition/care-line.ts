import { shiftDay } from './day.ts';
import { floorFor, type AthleteSex } from './targets.ts';

/**
 * THE CARE LINE: Nutrition's response to sustained under-eating (`Nutrition-Stress-Test-2026-09-23` §3.3).
 *
 * The stress test logged weeks of ~600 kcal days and the tab answered with neutral charts and nothing else.
 * Holt's chat has a DISORDERED_EATING guard (`domain/coach/medical-routing.ts`); Nutrition had none. The gap
 * line (`gap-line.ts`) already goes quiet under half the target and says "the care response owns it". This is
 * that care response. Rule and wording approved by the PO, 2026-09-25.
 *
 * THE RULE, all of it here, none of it on a screen (NUT-D4):
 *   · the window is the last 7 COMPLETED days. Today is out: an unfinished day is not a light one;
 *   · a LOW DAY is a LOGGED day under 75% of the clinical floor for the athlete's sex (`floorFor`): under
 *     900 kcal for women, under 1,125 for men and for unspecified (the higher floor, as `targets.ts` rules);
 *   · ⚠ AN UNLOGGED DAY IS NOT A ZERO and never counts. `fetchRangeTotals` returns no row for it, and a
 *     row with `logged: false` is treated the same way. Someone who logs two days a week is not flagged;
 *   · the line shows when 4 or more of the 7 are low days, and is silent while dismissed;
 *   · age does not matter. It shows to under-18s too: a growing body is the one that most needs it.
 *
 * ⚠ THE LINE NEVER SAYS A NUMBER, never uses a warning colour or an alarm icon, never names a condition and
 * never diagnoses. It says what the log shows, gives the likeliest innocent reading first, and points to a
 * doctor or a registered dietitian. The words are the PO's, verbatim.
 */

/** A day is low under this share of the floor. */
export const CARE_LOW_FRACTION = 0.75;
/** Completed days looked at, ending yesterday. */
export const CARE_WINDOW_DAYS = 7;
/** Low days in the window that turn the line on. */
export const CARE_MIN_LOW_DAYS = 4;
/** "I only log some meals" quiets it for a month; "Got it" for a week. */
export const CARE_SNOOZE_DAYS = { partialLogging: 30, acknowledged: 7 } as const;

export type CareDismissal = keyof typeof CARE_SNOOZE_DAYS;

export const CARE_LINE_COPY = {
  title: 'A quick check-in',
  body:
    "Most days this week, what you've logged has been well under what a body needs to train on. If you've only been logging some of your meals, you can ignore this. If you've been eating this little, it's worth talking to a doctor or a registered dietitian.",
  partialLogging: 'I only log some meals',
  acknowledged: 'Got it',
} as const;

export interface CareDay {
  iso: string;
  kcal: number;
  /** False (or the day simply absent) means nothing was logged, which is not a zero. */
  logged: boolean;
}

/** The kcal a logged day must reach not to count as low: 900 for women, 1,125 for men and unspecified. */
export function lowDayThreshold(sex: AthleteSex): number {
  return floorFor(sex) * CARE_LOW_FRACTION;
}

/** The window to read: the seven days before today, oldest first. Hand `from`/`to` to `fetchRangeTotals`. */
export function careWindow(todayIso: string): { from: string; to: string; days: string[] } {
  const days = Array.from({ length: CARE_WINDOW_DAYS }, (_, i) => shiftDay(todayIso, i - CARE_WINDOW_DAYS));
  return { from: days[0], to: days[days.length - 1], days };
}

/** How many low days the window holds. Days outside it (today included) and unlogged days never count. */
export function lowDayCount(days: readonly CareDay[], sex: AthleteSex, todayIso: string): number {
  const window = new Set(careWindow(todayIso).days);
  const threshold = lowDayThreshold(sex);
  const low = new Set<string>();
  for (const d of days) {
    if (window.has(d.iso) && d.logged && d.kcal < threshold) low.add(d.iso);
  }
  return low.size;
}

/** Whether the athlete's dismissal still holds today. `until` is the first day the line may return. */
export function isCareDismissed(dismissedUntil: string | null, todayIso: string): boolean {
  return dismissedUntil != null && todayIso < dismissedUntil;
}

/** Should the care line show today? */
export function careLineActive(input: {
  days: readonly CareDay[];
  sex: AthleteSex;
  todayIso: string;
  dismissedUntil: string | null;
}): boolean {
  if (isCareDismissed(input.dismissedUntil, input.todayIso)) return false;
  return lowDayCount(input.days, input.sex, input.todayIso) >= CARE_MIN_LOW_DAYS;
}

/** The date the line may return after a dismissal. */
export function careDismissedUntil(todayIso: string, choice: CareDismissal): string {
  return shiftDay(todayIso, CARE_SNOOZE_DAYS[choice]);
}
