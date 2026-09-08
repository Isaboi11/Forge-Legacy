/**
 * capture-date — reading the day a progress set was taken out of the string it was stored as.
 *
 * ⚠ `transformation_entries.label` IS FREE TEXT AND STAYS FREE TEXT. It was a bare `TextInput`
 * ("e.g. Mar 6, 2026") for the whole life of the gallery, so real rows hold hand-typed spellings —
 * `August 17, 2026`, `Mar 6, 2026`, and the literal `Today` that `addTransformationEntry` substitutes
 * when the field is left blank. The capture date is now picked from a calendar, but adding a real
 * `date` column would mean a migration that rewrites those rows, and a migration cannot guess what
 * `Today` meant. So the picker WRITES a spelling this module can read back, and everything older keeps
 * working by being parsed on the way out.
 *
 * ⚠ NEVER `new Date('2026-08-31')`. That parses as UTC midnight, which is the evening BEFORE anywhere
 * west of Greenwich — the athlete taking photos in Utah would see the wrong day printed on their own
 * card. Every path here builds a local date from parts.
 */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Whether `y-m-d` (m is 1-based) is a real calendar day — rejects `Feb 30, 2026` and `Jun 31`. */
function isRealDay(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(y, m - 1, d);
  return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;
}

/**
 * A stored capture label → `YYYY-MM-DD`, or `null` when it is not a date at all.
 *
 * Accepts what athletes actually have: `2026-08-31`, `August 31, 2026`, `Aug 31 2026`, `31 August 2026`.
 * Returns `null` for `Today`, `Now`, and anything else someone typed in the box — those are labels, not
 * dates, and pretending to read a day out of them is how a gallery starts lying about when a photo was
 * taken.
 */
export function captureDateIso(label: string | null | undefined): string | null {
  const s = (label ?? '').trim();
  if (!s) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    return isRealDay(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
  }

  const lower = s.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const monthIdx = MONTHS.findIndex((full) => {
    const short = full.slice(0, 3);
    return lower.split(' ').some((w) => w === full || w === short || w === `${short}.`);
  });
  if (monthIdx < 0) return null;

  // The two numbers left over are the day and the year, in whichever order they were written.
  const nums = lower.match(/\d+/g);
  if (!nums || nums.length !== 2) return null;
  const [a, b] = nums.map(Number);
  const [day, year] = a > 31 ? [b, a] : [a, b];
  if (year < 1900 || year > 2999) return null;
  return isRealDay(year, monthIdx + 1, day) ? `${year}-${pad(monthIdx + 1)}-${pad(day)}` : null;
}

/**
 * When an entry should sort — the day it says it was captured, else when the row was written.
 *
 * ⚠ THIS EXISTS BECAUSE THE DATE BECAME PICKABLE. The list was ordered by `created_at`, which was
 * indistinguishable from capture order for as long as typing the date was tedious enough that nobody
 * backdated anything. A calendar makes "these are from last Sunday" a two-tap entry, and an entry
 * dated last Sunday sitting at the top of the shelf above today's is the gallery contradicting itself.
 *
 * Local NOON, not midnight: a capture date names a day, not an instant, and noon keeps it inside its
 * own day across every DST shift while still letting a row created that same morning — one whose label
 * is not a date, so it falls back to `created_at` — sort below it rather than always above.
 */
export function captureInstant(entry: { label: string; createdAt: string }): number {
  const iso = captureDateIso(entry.label);
  if (iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 12).getTime();
  }
  const t = new Date(entry.createdAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Newest capture first. Stable, so entries sharing a day keep the order the server sent them in —
 * which is `created_at` descending, i.e. the order they were actually added.
 */
export function sortByCapture<T extends { label: string; createdAt: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => captureInstant(b) - captureInstant(a));
}
