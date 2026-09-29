/**
 * Moderation — the page note, the "Reports waiting" summary line, and each report's age tag.
 *
 * Pure and dependency-free so `node --test` can load it directly. Facts only: how many, how old. It
 * never guesses whether a report is spam or who is behind it.
 */

const DAY = 86_400_000;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Whole days since `iso` (0 = within the last 24 hours). Null for a missing or bad date. */
export function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / DAY));
}

export interface ModerationNoteInput {
  open: number;
  actioned: number;
  dismissed: number;
  /** Days the oldest open report has waited; null when none is open. */
  oldestOpenDays: number | null;
  hiddenFoods: number;
}

export function moderationNote(i: ModerationNoteInput): string {
  const foods = i.hiddenFoods > 0 ? ` ${i.hiddenFoods} shared ${plural(i.hiddenFoods, 'food is', 'foods are')} hidden by reports.` : '';
  if (i.open <= 0) {
    if (i.actioned + i.dismissed === 0 && i.hiddenFoods === 0) return 'All clear. Nothing has been reported yet.';
    return i.hiddenFoods > 0 ? `No reports waiting.${foods}` : 'All clear. Nothing reported is waiting on you.';
  }
  const d = i.oldestOpenDays;
  const oldest =
    d == null ? '' : d === 0 ? (i.open === 1 ? ', filed today' : ', the oldest filed today') : `, the oldest waiting ${d} ${plural(d, 'day', 'days')}`;
  return `${i.open} ${plural(i.open, 'report', 'reports')} waiting${oldest}.${foods}`;
}

/** "2 open · oldest 3 days · 14 actioned · 5 dismissed" / "None open · …". */
export function moderationSummary(i: Omit<ModerationNoteInput, 'hiddenFoods'>): string {
  const d = i.oldestOpenDays;
  const head =
    i.open > 0
      ? `${i.open} open${d == null ? '' : d === 0 ? ' · oldest today' : ` · oldest ${d} ${plural(d, 'day', 'days')}`}`
      : 'None open';
  return `${head} · ${i.actioned} actioned · ${i.dismissed} dismissed`;
}

/** A report's age tag: "Today", "1 day waiting", "3 days waiting". `late` (warn colour) past one day. */
export function waitingTag(days: number | null): { text: string; late: boolean } {
  if (days == null || days <= 0) return { text: 'Today', late: false };
  return { text: `${days} ${plural(days, 'day', 'days')} waiting`, late: days > 1 };
}
