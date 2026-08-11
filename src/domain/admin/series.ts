/**
 * Date and series handling for the operator dashboard.
 *
 * Small module, one real hazard. See `parseDayLocal`.
 */

export type RangeKey = '7d' | '30d' | '90d' | '1y';

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y', label: '1Y', days: 365 },
];

export function rangeToDays(key: RangeKey): number {
  return RANGES.find((r) => r.key === key)?.days ?? 30;
}

export function rangeLabel(key: RangeKey): string {
  const days = rangeToDays(key);
  return days === 365 ? 'vs prev year' : `vs prev ${days}d`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Parse a `YYYY-MM-DD` day key as LOCAL midnight.
 *
 * ⚠ THIS EXISTS BECAUSE `new Date('2026-08-11')` DOES NOT DO THIS. The ISO date-only form is parsed as
 *   UTC midnight per spec, so west of Greenwich it renders as the 10th — every bucket on the chart
 *   silently labelled a day early, on the one screen whose entire job is to be trusted about dates.
 *   Postgres hands these back already bucketed in the dashboard timezone; re-parsing them as UTC
 *   would undo that work.
 *
 * Returns `null` for anything that is not a well-formed day key, rather than an Invalid Date that
 * propagates as "NaN" into a label.
 */
export function parseDayLocal(iso: string | null | undefined): Date | null {
  if (!iso || typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const out = new Date(y, mo - 1, d);
  // Rejects 2026-02-31 and friends, which the Date constructor would happily roll into March.
  if (out.getFullYear() !== y || out.getMonth() !== mo - 1 || out.getDate() !== d) return null;
  return out;
}

/** "Aug 11". The x-axis tick form. */
export function shortDay(iso: string | null | undefined): string {
  const d = parseDayLocal(iso);
  if (!d) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Aug 11, 2026". The tooltip / readout form. */
export function longDay(iso: string | null | undefined): string {
  const d = parseDayLocal(iso);
  if (!d) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Week of Aug 10". The cohort-row label. */
export function weekLabel(iso: string | null | undefined): string {
  const d = parseDayLocal(iso);
  if (!d) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function toDayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Densify a day series so every day in the range has a row.
 *
 * The RPCs already left-join onto a generated spine, so in practice this changes nothing — which is
 * the point. It is the client-side guard for the day a query is rewritten to `group by` without the
 * spine: a chart that silently skips empty days does not look broken, it looks like a smooth trend,
 * and the days with nothing on them are exactly the ones worth seeing.
 *
 * Preserves the order of the range (oldest first) rather than the order of the input.
 */
export function fillMissingDays<T extends { d: string }>(
  rows: readonly T[] | null | undefined,
  days: number,
  fill: Omit<T, 'd'>,
  endKey?: string,
): T[] {
  const n = Math.max(0, Math.floor(days));
  if (n === 0) return [];
  const end = parseDayLocal(endKey) ?? new Date();
  const byKey = new Map<string, T>();
  for (const r of rows ?? []) if (r && typeof r.d === 'string') byKey.set(r.d.slice(0, 10), r);

  const out: T[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    const key = toDayKey(day);
    out.push(byKey.get(key) ?? ({ ...(fill as object), d: key } as T));
  }
  return out;
}

/**
 * Pull one numeric column out of a day series, with nulls read as 0 so the chart never breaks.
 *
 * `T` is unconstrained on purpose. Constraining it to `Record<string, unknown>` reads well but rejects
 * every plain interface — `DaySeriesRow` has no index signature, so the whole dashboard fails to
 * typecheck. `keyof T` still keeps the call site honest about which field it asked for.
 */
export function column<T>(rows: readonly T[] | null | undefined, key: keyof T): number[] {
  return (rows ?? []).map((r) => {
    const v = r == null ? undefined : r[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  });
}

/** Sum a numeric column. Used for the "N in this window" line under a series. */
export function sumColumn<T>(rows: readonly T[] | null | undefined, key: keyof T): number {
  return column(rows, key).reduce((a, b) => a + b, 0);
}
