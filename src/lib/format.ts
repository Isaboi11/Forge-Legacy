// Display formatters shared by the live data-access layer (rank labels, chapter dates).
// Runtime-only (uses Date) — never imported into a Workflow script.
import { calendarDaysBetween, dayNumberSince, toLocalDate } from '@/domain/dates/local-date';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROMAN = ['I', 'II', 'III', 'IV'] as const;

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const roman = (n: number): string => ROMAN[Math.max(1, Math.min(4, n)) - 1];

/*
 * Every formatter below reads a stored value through `toLocalDate` (QA 09-26 B14): a DATE column is that
 * calendar day, a timestamp is the athlete's local day. These used UTC getters, which were right for a
 * DATE but put a chapter sealed at 11pm in California on the next day.
 */

/** '2026-04-06' → 'Apr 6, 2026' */
export function fmtDate(iso: string): string {
  const d = toLocalDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** '2026-06-27' → 'Jun 27' */
export function fmtShort(iso: string): string {
  const d = toLocalDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Chapter "Day N" — Day 1 on the day it began. The same count Home shows. */
export function daysSince(iso: string): number {
  return dayNumberSince(iso);
}

function daysBetween(startIso: string, endIso: string): number {
  return Math.max(0, calendarDaysBetween(toLocalDate(startIso), toLocalDate(endIso)));
}

/** "Jan 15 – Apr 4, 2026 · 79 days" (drops the start year when it matches the end). */
export function dateRangeFull(startIso: string, endIso?: string | null): string {
  if (!endIso) return fmtDate(startIso);
  const s = toLocalDate(startIso);
  const e = toLocalDate(endIso);
  const start = s.getFullYear() === e.getFullYear() ? `${MONTHS[s.getMonth()]} ${s.getDate()}` : `${MONTHS[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()}`;
  return `${start} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()} · ${daysBetween(startIso, endIso)} days`;
}

/** "Jan – Apr 2026 · 79d" (month-level compact). */
export function dateRangeCompact(startIso: string, endIso?: string | null): string {
  const s = toLocalDate(startIso);
  if (!endIso) return `${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
  const e = toLocalDate(endIso);
  const start = s.getFullYear() === e.getFullYear() ? MONTHS[s.getMonth()] : `${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
  return `${start} – ${MONTHS[e.getMonth()]} ${e.getFullYear()} · ${daysBetween(startIso, endIso)}d`;
}
