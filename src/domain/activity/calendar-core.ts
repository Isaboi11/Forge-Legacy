/**
 * Activity History calendar (W-18 · `Activity History Calendar.dc.html`, variant **1a "Dot under the
 * date"**, PO 10-01). One month at a time, weeks starting Monday, above the list of that month's sessions.
 * Pure (relative runtime imports only) so every rule here runs under `node --test`.
 *
 * ⛔ A DAY YOU DIDN'T TRAIN CARRIES NOTHING. No red, no cross, no "missed", no streak, no "X days since",
 *   and the summary line never compares with last month. That is the app's own rule, not a styling
 *   choice — a grid that marks absence turns a training log into a register of failures. Nothing below
 *   produces a mark for an empty day, and nothing should be added that does.
 *
 * Marks (1a): one dot per session, at most three — solid bronze for lifting, a bronze ring for cardio,
 * grey for mobility and anything else. A record day gets a thin bronze ring round the date; today sits
 * on a raised disc; the day a chapter began or was sealed gets a small diamond in the corner.
 */

import { ACTIVITY_LABEL, matchesFilter, type ActivityFilter, type ActivityRecord, type Modality } from './history-core.ts';

/** A calendar month. `m` is 0-based, as `Date` has it. */
export interface YearMonth {
  y: number;
  m: number;
}

export type MarkKind = 'lift' | 'cardio' | 'other';

const MARK_OF: Record<Modality, MarkKind> = {
  strength: 'lift',
  running: 'cardio',
  walking: 'cardio',
  cycling: 'cardio',
  swimming: 'cardio',
  rowing: 'cardio',
  mobility: 'other',
  other: 'other',
};
export const markKind = (t: Modality): MarkKind => MARK_OF[t];

/** The design draws three dots at most; a fourth session that day still counts everywhere else. */
export const MAX_MARKS = 3;

/** A chapter beginning or being sealed, on the athlete's calendar day (`YYYY-MM-DD`). */
export interface ChapterMark {
  chapterId: string;
  name: string;
  date: string;
  kind: 'began' | 'sealed';
}

export interface CalendarDay {
  day: number;
  /** One per session that day, in list order, capped at `MAX_MARKS`. Empty on a day with no training. */
  marks: MarkKind[];
  sessions: number;
  pr: boolean;
  today: boolean;
  chapter: boolean;
  /** Something to show when tapped — a session, or a chapter event. An empty day is not a control. */
  tappable: boolean;
}
/** `null` is a blank before the 1st or after the last day, padding the grid to whole Monday-first weeks. */
export type CalendarCell = CalendarDay | null;

// ─────────────────────────────────────────────────────────────────────────────
// DATES — always the athlete's LOCAL calendar day, never UTC
// ─────────────────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` for a local date — `toISOString()` would move an 11pm session to tomorrow west of UTC. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function ymOf(d: Date): YearMonth {
  return { y: d.getFullYear(), m: d.getMonth() };
}

export function compareYM(a: YearMonth, b: YearMonth): number {
  return a.y !== b.y ? a.y - b.y : a.m - b.m;
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const t = ym.y * 12 + ym.m + n;
  return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "June 2026". */
export function monthTitle(ym: YearMonth): string {
  return `${MONTHS[ym.m]} ${ym.y}`;
}

/** "Tuesday, Jun 10" — the selected day's heading over the list. */
export function dayTitle(ym: YearMonth, day: number): string {
  return `${WEEKDAYS[new Date(ym.y, ym.m, day).getDay()]}, ${MONTHS[ym.m].slice(0, 3)} ${day}`;
}

/**
 * The months the arrows can reach, oldest first: from the month of the first session to this month — never
 * forward past today.
 *
 * `truncated` — the history read is capped, so when it came back full the oldest month in hand may be only
 * partly loaded. That month is left out rather than shown with half its sessions: a calendar that quietly
 * under-counts a month is worse than one that stops a month early.
 */
export function monthRange(records: readonly ActivityRecord[], now: Date, truncated = false): YearMonth[] {
  const current = ymOf(now);
  let oldest: YearMonth | null = null;
  for (const r of records) {
    const d = new Date(r.startedAt);
    if (Number.isNaN(d.getTime())) continue;
    const ym = ymOf(d);
    if (!oldest || compareYM(ym, oldest) < 0) oldest = ym;
  }
  if (oldest && truncated) oldest = addMonths(oldest, 1);
  if (!oldest || compareYM(oldest, current) > 0) return [current];
  const out: YearMonth[] = [];
  for (let ym = oldest; compareYM(ym, current) <= 0; ym = addMonths(ym, 1)) out.push(ym);
  return out;
}

/** The month's sessions under the type filter, in the order given (the read is newest first). */
export function sessionsInMonth(records: readonly ActivityRecord[], filter: ActivityFilter, ym: YearMonth): ActivityRecord[] {
  return records.filter((r) => {
    const d = new Date(r.startedAt);
    return !Number.isNaN(d.getTime()) && d.getFullYear() === ym.y && d.getMonth() === ym.m && matchesFilter(r, filter);
  });
}

/** The sessions on one day of the month. */
export function sessionsOnDay(sessions: readonly ActivityRecord[], day: number): ActivityRecord[] {
  return sessions.filter((r) => new Date(r.startedAt).getDate() === day);
}

// ─────────────────────────────────────────────────────────────────────────────
// THE GRID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whole Monday-first weeks for the month. `sessions` is already the month under the filter
 * (`sessionsInMonth`); `chapters` is passed only when the filter is All — a chapter is not a Run.
 */
export function buildMonthGrid(
  sessions: readonly ActivityRecord[],
  ym: YearMonth,
  now: Date,
  chapters: readonly ChapterMark[] = [],
): CalendarCell[] {
  const byDay = new Map<number, ActivityRecord[]>();
  for (const r of sessions) {
    const d = new Date(r.startedAt).getDate();
    const list = byDay.get(d);
    if (list) list.push(r);
    else byDay.set(d, [r]);
  }
  const prefix = `${ym.y}-${pad2(ym.m + 1)}-`;
  const chapterDays = new Set(chapters.filter((c) => c.date.startsWith(prefix)).map((c) => Number(c.date.slice(8, 10))));
  const isThisMonth = now.getFullYear() === ym.y && now.getMonth() === ym.m;

  const cells: CalendarCell[] = [];
  const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7; // Monday = 0
  for (let i = 0; i < lead; i++) cells.push(null);
  const nDays = new Date(ym.y, ym.m + 1, 0).getDate();
  for (let day = 1; day <= nDays; day++) {
    // Sessions are newest first; a day's dots read left to right in the order they were trained.
    const list = (byDay.get(day) ?? []).slice().reverse();
    const chapter = chapterDays.has(day);
    cells.push({
      day,
      marks: list.slice(0, MAX_MARKS).map((r) => markKind(r.type)),
      sessions: list.length,
      pr: list.some((r) => r.pr),
      today: isThisMonth && now.getDate() === day,
      chapter,
      tappable: list.length > 0 || chapter,
    });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** The grid as rows of seven. */
export function weeksOf(cells: readonly CalendarCell[]): CalendarCell[][] {
  const out: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
  return out;
}

/** What a screen reader hears for a day — everything the cell shows, nothing it doesn't. */
export function dayA11y(ym: YearMonth, cell: CalendarDay, chapterLine?: string): string {
  const parts = [`${MONTHS[ym.m]} ${cell.day}`];
  if (cell.today) parts.push('today');
  if (cell.sessions) parts.push(`${cell.sessions} session${cell.sessions === 1 ? '' : 's'}`);
  if (cell.pr) parts.push('new record');
  if (cell.chapter && chapterLine) parts.push(chapterLine);
  return parts.join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// THE SUMMARY LINE — this month only, never a comparison
// ─────────────────────────────────────────────────────────────────────────────

/** "45 min" · "11 h" · "11 h 20 min". */
export function fmtHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const r = minutes % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export const FIRST_SESSION_LINE = 'Your first session will show up here.';

/**
 * "14 sessions · 3 new records · 11 h". The records part is left out when there are none, and the time
 * when nothing that month logged a duration. A brand-new account (no sessions at all, of any type) gets
 * the welcome line instead.
 */
export function monthSummary(sessions: readonly ActivityRecord[], filter: ActivityFilter, isNewAccount: boolean): string {
  if (isNewAccount) return FIRST_SESSION_LINE;
  if (sessions.length === 0) return filter === 'all' ? 'No sessions this month.' : `No ${ACTIVITY_LABEL[filter]} sessions this month.`;
  const n = sessions.length;
  const recs = sessions.filter((r) => r.pr).length;
  const minutes = Math.round(sessions.reduce((s, r) => s + (r.durationSec && r.durationSec > 0 ? r.durationSec : 0), 0) / 60);
  return [
    `${n} session${n === 1 ? '' : 's'}`,
    recs ? `${recs} new record${recs === 1 ? '' : 's'}` : '',
    minutes > 0 ? fmtHours(minutes) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ChapterRowSource {
  id: string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  sealed_at: string | null;
}

/** A chapter's begin and seal days. The seal is `end_date` when set, else the local day of `sealed_at`. */
export function chapterMarksFrom(rows: readonly ChapterRowSource[]): ChapterMark[] {
  const out: ChapterMark[] = [];
  for (const c of rows) {
    const name = c.name?.trim() || 'Chapter';
    if (c.start_date) out.push({ chapterId: c.id, name, date: c.start_date.slice(0, 10), kind: 'began' });
    if (c.sealed_at) {
      const sealed = new Date(c.sealed_at);
      const date = c.end_date ? c.end_date.slice(0, 10) : Number.isNaN(sealed.getTime()) ? null : localDateKey(sealed);
      if (date) out.push({ chapterId: c.id, name, date, kind: 'sealed' });
    }
  }
  return out;
}

/**
 * The row a tapped chapter day puts at the top of the list. When one chapter was sealed and the next began
 * the same day, the new one leads (it is where the link goes) and the sealed one is the second line;
 * otherwise there is no second line.
 */
export function chapterRowFor(
  marks: readonly ChapterMark[],
  ym: YearMonth,
  day: number,
): { chapterId: string; title: string; sub: string } | null {
  const key = `${ym.y}-${pad2(ym.m + 1)}-${pad2(day)}`;
  const onDay = marks.filter((c) => c.date === key);
  if (!onDay.length) return null;
  const began = onDay.find((c) => c.kind === 'began');
  const sealed = onDay.find((c) => c.kind === 'sealed');
  const lead = began ?? sealed!;
  return {
    chapterId: lead.chapterId,
    title: `${lead.name} ${lead.kind === 'began' ? 'began' : 'sealed'}`,
    sub: began && sealed ? `${sealed.name} sealed` : '',
  };
}
