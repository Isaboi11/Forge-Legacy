// ONE relative-time line for every social feed (social-24, QA 09-26).
//
// Two posts of the same age read "Just now" on one feed and "0m" on the other: the squad feed's formatter
// said "Just now" under 45 s and then floored the minutes — so 45–59 s printed "0m" — and the Friends feed
// had its own copy that said "just now", lower-case, then "Xm ago". Both feeds now call this.
//
// Pure, with `now` passed in, so it can be tested without a clock.

import { countOf } from './plural.ts';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Compact relative time: "Just now" · "12m" · "3h" · "2d" · "5w" · then a short date ("Aug 6"). */
export function timeAgoAt(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const ms = Math.max(0, now - then);
  // Under a whole minute is "Just now" — never "0m".
  if (ms < MINUTE) return 'Just now';
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  const d = Math.floor(ms / DAY);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  // Pinned to en-US month names like every other date in the app, whatever the device locale.
  const date = new Date(then);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/**
 * The same age, SPOKEN — for a screen reader, where "5m" is read as "5 metres" and a hand-built
 * `${n} minutes ago` said "started 1 minutes ago" (social2-23 / N-22, QA 09-26). "just now" under a
 * minute, then "1 minute ago", "3 hours ago", "2 days ago", "4 weeks ago".
 */
export function spokenAgoAt(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const ms = Math.max(0, now - then);
  if (ms < MINUTE) return 'just now';
  if (ms < HOUR) return `${countOf(Math.floor(ms / MINUTE), 'minute')} ago`;
  if (ms < DAY) return `${countOf(Math.floor(ms / HOUR), 'hour')} ago`;
  if (ms < 7 * DAY) return `${countOf(Math.floor(ms / DAY), 'day')} ago`;
  return `${countOf(Math.floor(ms / (7 * DAY)), 'week')} ago`;
}
