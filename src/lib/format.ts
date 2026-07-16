// Display formatters shared by the live data-access layer (rank labels, chapter dates).
// Runtime-only (uses Date) — never imported into a Workflow script.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROMAN = ['I', 'II', 'III', 'IV'] as const;

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const roman = (n: number): string => ROMAN[Math.max(1, Math.min(4, n)) - 1];

/** '2026-04-06' → 'Apr 6, 2026' */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** '2026-06-27T00:00:00Z' → 'Jun 27' */
export function fmtShort(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** whole days from a start date to now (chapter "Day N") */
export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function daysBetween(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000));
}

/** "Jan 15 – Apr 4, 2026 · 79 days" (drops the start year when it matches the end). */
export function dateRangeFull(startIso: string, endIso?: string | null): string {
  if (!endIso) return fmtDate(startIso);
  const s = new Date(startIso);
  const e = new Date(endIso);
  const start = s.getUTCFullYear() === e.getUTCFullYear() ? `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}` : `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}, ${s.getUTCFullYear()}`;
  return `${start} – ${MONTHS[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()} · ${daysBetween(startIso, endIso)} days`;
}

/** "Jan – Apr 2026 · 79d" (month-level compact). */
export function dateRangeCompact(startIso: string, endIso?: string | null): string {
  const s = new Date(startIso);
  if (!endIso) return `${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  const e = new Date(endIso);
  const start = s.getUTCFullYear() === e.getUTCFullYear() ? MONTHS[s.getUTCMonth()] : `${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  return `${start} – ${MONTHS[e.getUTCMonth()]} ${e.getUTCFullYear()} · ${daysBetween(startIso, endIso)}d`;
}
