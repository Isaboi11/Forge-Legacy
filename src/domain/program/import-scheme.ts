/**
 * Reading sets, reps and an exercise name out of text a human wrote.
 *
 * Split out from the table parser because BOTH input shapes need it. A spreadsheet keeps its numbers in
 * columns right up until somebody types "Bench Press 3x8" into the exercise cell, and a typed-out
 * workout has never had columns at all. One set of rules, so a format that works in one place is not
 * mysteriously rejected in the other.
 *
 * Everything here was written against inputs that actually broke it — merged cells, supersets, weights
 * tacked on the end, en dashes, multiplication signs.
 */

export interface Scheme {
  sets?: number;
  reps?: number;
}

/** `3x8`, `3 x 8`, `3×8`, `5X5`, `4x8-10` → the sets and the FLOOR of the rep range. */
const SCHEME = /(\d{1,2})\s*[x×]\s*(\d{1,3})/i;
/** "4 sets of 12", "3 sets x 10". */
const WORDY = /(\d{1,2})\s*sets?\s*(?:of|x|×)?\s*(\d{1,3})?/i;
/** A trailing load — "@135", "@ 225 lb", "@75%". Never part of the name. */
const TRAILING_LOAD = /\s*@\s*[\d.]+\s*(?:lbs?|kgs?|%|kilos?)?\s*$/i;
/**
 * Leading list decoration, and superset labels.
 *
 * `- `, `• `, `* `, `1. `, `1) `, and `A1)` / `B2.` — the last of which is a superset marker, not part
 * of what the exercise is called. Stripping it means "A1) Bench Press" and "Bench Press" are the same
 * lift, which matters because the catalogue is matched by exact name.
 */
const LEADING_DECORATION = /^\s*(?:[-–—•*·]+\s*|\d{1,2}[.)]\s+|[A-Da-d]\d?[.)]\s*)/;

/**
 * A trailing separator left behind once the scheme is lifted out.
 *
 * "Bench Press: 3x8" and "Bench Press - 3 x 8" both leave the punctuation that JOINED the two halves.
 * It has to go, because the catalogue is matched by exact name and "Bench Press:" matches nothing.
 */
const TRAILING_SEPARATOR = /[\s:;,\-–—|]+$/;

/** Strip decoration, a trailing load and a dangling separator — what the exercise is actually called. */
export function cleanExerciseName(raw: string): string {
  return raw
    .replace(LEADING_DECORATION, '')
    .replace(TRAILING_LOAD, '')
    .replace(TRAILING_SEPARATOR, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pull a sets×reps scheme out of a string, and return what is left of it.
 *
 * Tries the explicit forms first (`3x8`) and the wordy one second ("4 sets of 12"), because "4 sets of
 * 12" also contains no `x` and would otherwise read as a bare number. Returns the remaining text so the
 * caller can use it as the name — "Bench Press 3x8" is one cell in plenty of real sheets.
 */
export function extractScheme(raw: string): { scheme: Scheme; rest: string } {
  const text = raw.replace(TRAILING_LOAD, '');

  const m = text.match(SCHEME);
  if (m) {
    return {
      scheme: { sets: num(m[1]), reps: num(m[2]) },
      rest: (text.slice(0, m.index) + text.slice((m.index ?? 0) + m[0].length)).trim(),
    };
  }

  const w = text.match(WORDY);
  if (w) {
    return {
      scheme: { sets: num(w[1]), reps: w[2] ? num(w[2]) : undefined },
      rest: (text.slice(0, w.index) + text.slice((w.index ?? 0) + w[0].length)).trim(),
    };
  }

  return { scheme: {}, rest: text.trim() };
}

function num(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/**
 * The first number in a cell.
 *
 * Training sheets write ranges and instructions, not integers: "8-10", "8–10" (en dash), "30s", "8/8"
 * per side, "AMRAP", "8+". The first number is the honest floor of a range; a cell with no number at all
 * yields nothing and the caller decides what to assume.
 */
export function firstNumber(cell: string | undefined): number | undefined {
  if (!cell) return undefined;
  const m = cell.match(/\d+(?:\.\d+)?/);
  return m ? num(String(Math.round(Number(m[0])))) : undefined;
}

// ── recognising the lines that are not exercises ────────────────────────────

const WEEKDAYS = /^(mon|tues?|wednes|thurs?|fri|satur|sun)day\b/i;
const DAY_WORD = /^(day|session|workout)\b/i;
const WEEK_WORD = /^week\s*(\d{1,2})/i;

/** "WEEK 3", "Week 3 — deload" → 3. Null when the line is not a week heading. */
export function weekHeading(line: string): number | null {
  const m = line.trim().match(WEEK_WORD);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Is this line the name of a day rather than an exercise?
 *
 * Only asked of lines carrying NO sets×reps, because anything with a scheme is work. Beyond that it
 * takes explicit signals — a weekday, the word Day/Session/Workout, a trailing colon, or shouting in
 * capitals — and nothing else. A line that merely looks like a heading is treated as an exercise, which
 * is the safe way to be wrong: it shows up in the preview with an assumed 3×10 for the athlete to see
 * and delete, whereas a mis-read heading silently swallows the exercise underneath it.
 */
export function looksLikeDayHeading(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (WEEKDAYS.test(t) || DAY_WORD.test(t)) return true;
  if (t.endsWith(':')) return true;
  // ALL CAPS and short — "PUSH", "UPPER BODY". Long shouted lines are usually notes, not headings.
  if (t.length <= 28 && t === t.toUpperCase() && /[A-Z]/.test(t) && !/\d/.test(t)) return true;
  return false;
}

/** The day's name, with any "Day 1:" / "Monday -" scaffolding trimmed off the front. */
export function cleanDayName(line: string): string {
  return (
    line
      .trim()
      .replace(/:$/, '')
      // "Day 1 - Push" / "Monday — Push" → "Push", but "Push" alone survives.
      .replace(/^(?:(?:mon|tues?|wednes|thurs?|fri|satur|sun)day|day|session|workout)\s*\d*\s*[-–—:]\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim() || line.trim()
  );
}
