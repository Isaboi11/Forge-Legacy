/**
 * The Bugs page's note — the one line under the title — built from the board's real counts.
 *
 * Facts only: how many critical bugs are open and for how long, what was fixed this week, and what is
 * waiting to be sorted. No guesses about which to do first or why something broke — the design's sample
 * ("I'd do the rest timer first") is an opinion the numbers cannot support.
 *
 * Pure and dependency-free so `node --test` runs it directly.
 */

export interface BugsNoteInput {
  total: number;
  criticalActive: number;
  highActive: number;
  /** open + in progress. */
  active: number;
  /** Days the oldest ACTIVE critical bug has been on the board; null when there is none. */
  oldestCriticalDays: number | null;
  fixed7d: number;
  reportsNew: number;
  crashesNew: number;
}

const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
const days = (d: number) => (d < 1 ? 'less than a day' : n(d, 'day', 'days'));

export function bugsNote(i: BugsNoteInput | null): string | null {
  if (!i) return null;
  if (i.total === 0 && i.reportsNew === 0 && i.crashesNew === 0) {
    return 'The board is empty. File a bug, or track a user report or crash, and it shows up here.';
  }

  let first: string;
  if (i.criticalActive > 0) {
    first = `${n(i.criticalActive, 'critical bug is', 'critical bugs are')} open`;
    if (i.oldestCriticalDays != null) first += i.criticalActive === 1 ? `, for ${days(i.oldestCriticalDays)}` : `, the oldest for ${days(i.oldestCriticalDays)}`;
    first += i.highActive > 0 ? `, with ${i.highActive} high behind ${i.criticalActive === 1 ? 'it' : 'them'}.` : '.';
  } else if (i.highActive > 0) {
    first = `No critical bugs are open; ${n(i.highActive, 'high-severity bug is', 'high-severity bugs are')} still open.`;
  } else if (i.active > 0) {
    first = `Nothing critical or high is open; ${n(i.active, 'lower-severity bug remains', 'lower-severity bugs remain')}.`;
  } else {
    first = 'Nothing on the board is open.';
  }

  const parts: string[] = [];
  if (i.fixed7d > 0) parts.push(`${i.fixed7d} fixed in the last 7 days`);
  const waiting: string[] = [];
  if (i.reportsNew > 0) waiting.push(n(i.reportsNew, 'new user report', 'new user reports'));
  if (i.crashesNew > 0) waiting.push(n(i.crashesNew, 'new crash group', 'new crash groups'));
  if (waiting.length) {
    const w = waiting.join(' and ');
    const plural = i.reportsNew + i.crashesNew > 1;
    parts.push(`${w} ${plural ? 'are' : 'is'} waiting to be sorted`);
  }
  if (!parts.length) return first;
  const second = parts.join(', and ');
  return `${first} ${second.charAt(0).toUpperCase()}${second.slice(1)}.`;
}
