/**
 * The ONE local-date helper (QA 09-26 B14).
 *
 * A DATE column (`chapters.start_date`, `progress_photos.taken_on`, a squad record's `achieved_on`) is a
 * calendar day, not an instant. `new Date('2026-09-25')` reads it as UTC MIDNIGHT, and every local getter
 * then shows the day BEFORE for anyone west of Greenwich — the timeline began chapters a day early,
 * squad records said "Aug 2026" for a September record. The mirror bug is `toISOString().slice(0, 10)`
 * for "today": a UTC date, so at 8pm in California the add-photo date was already tomorrow.
 *
 * The rule, in one place: a date-only value becomes LOCAL midnight of that day; "today" is assembled from
 * local parts (what `createChapter` already did). Pure — no imports, nothing reads the clock unless the
 * caller leaves `now` out.
 */

const DAY = 86_400_000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const p2 = (n: number) => String(n).padStart(2, '0');

/** The LOCAL calendar day an instant falls on, as `YYYY-MM-DD`. Never `toISOString().slice(0, 10)`. */
export function localYmd(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** Today on the athlete's calendar. */
export function todayYmd(now: Date = new Date()): string {
  return localYmd(now);
}

/** True for a bare `YYYY-MM-DD` — a calendar day with no time and no zone. */
export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value);
}

/**
 * A stored value as a `Date` whose LOCAL getters show the right day.
 *
 * `YYYY-MM-DD` → local midnight of that day. Anything with a time (`2026-09-25T23:59:00Z`) is a real
 * instant and is parsed as one — its local day is the athlete's day.
 */
export function toLocalDate(value: string): Date {
  const m = DATE_ONLY.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** Move a `YYYY-MM-DD` by whole calendar days (DST-safe: date parts, not milliseconds). */
export function shiftYmd(ymd: string, days: number): string {
  const d = toLocalDate(ymd);
  return localYmd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/** Calendar days from `a` to `b`, counted on the local calendar. DST-safe (both ends are local midnights). */
export function calendarDaysBetween(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / DAY);
}

/**
 * "Day N" of something that began on `start` — Day 1 on the day it began. Home and Legacy both read this,
 * so they can no longer disagree (Home said Day 2 while Legacy said Day 1).
 */
export function dayNumberSince(start: string, now: Date = new Date()): number {
  const s = toLocalDate(start);
  if (!Number.isFinite(s.getTime())) return 1;
  return Math.max(1, calendarDaysBetween(s, now) + 1);
}
