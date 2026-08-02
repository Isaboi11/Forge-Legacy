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
const COMPACT = /(\d{1,2})\s*[x×]\s*(\d{1,3})/i;
/**
 * "4/8" — sets over reps, which is how a split gets texted.
 *
 * Ambiguous against per-side reps ("8/8"), and deliberately resolved toward sets/reps: in a line that
 * names an exercise, the first number is almost always how many times you do it. Per-side counts turn up
 * in a Reps COLUMN, which never reaches here.
 */
const SLASHED = /(\d{1,2})\s*\/\s*(\d{1,3})\b/;
/** "4 sets", "4 sets of 12", "3 sets x 10" — the label carries the meaning, wherever it sits. */
const SETS_LABELLED = /(\d{1,2})\s*sets?\b(?:\s*(?:of|x|×)\s*(\d{1,3}))?/i;
/** "8 reps", "6-8 reps", "12–15 reps", "8/8 reps" — ranges read as their floor. */
const REPS_LABELLED = /(\d{1,3})(?:\s*[-–—/]\s*\d{1,3})?\s*reps?\b/gi;
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
 * "Bench Press: 3x8" and "Bench Press - 3 x 8" both leave the punctuation that JOINED the two halves,
 * and lifting a phrase out of the middle of "Bench press - 4 sets - 6-8 reps" leaves TWO of them with
 * nothing between. The catalogue matches on exact name, and "Bench press - -" is not the name of a lift.
 */
const TRAILING_SEPARATOR = /[\s:;,.\-–—|]+$/;
/** "90s rest", "- 2 min rest" — a prescription about the gap, not about the lift. */
const REST_NOTE = /\s*[-–—:]?\s*\d+\s*(?:s|secs?|seconds?|m|mins?|minutes?)\s*rest\b/gi;
/** A parenthetical left on the end — "(last set AMRAP)", "(slow eccentric)". Notes, not names. */
const TRAILING_PAREN = /\s*\([^)]*\)\s*$/;
/** Parentheses emptied by lifting the scheme out of them — "Deadlift (4 sets of 5)" → "Deadlift ()". */
const EMPTY_PAREN = /\s*\(\s*\)/g;
/** The unit word left standing when its number was taken — "Bench Press reps". */
const ORPHAN_UNIT = /\s+(?:reps?|sets?)\b/gi;
/** The same debris, collapsed when it ends up mid-name: "Bench press - - reps" → "Bench press". */
const INNER_DEBRIS = /\s*[-–—:|,]\s*(?=[-–—:|,]|$)/g;

/** Strip decoration, a trailing load and dangling separators — what the exercise is actually called. */
export function cleanExerciseName(raw: string): string {
  return raw
    .replace(LEADING_DECORATION, '')
    .replace(TRAILING_LOAD, '')
    .replace(REST_NOTE, '')
    .replace(EMPTY_PAREN, '')
    .replace(TRAILING_PAREN, '')
    .replace(ORPHAN_UNIT, '')
    .replace(INNER_DEBRIS, '')
    .replace(TRAILING_SEPARATOR, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cut a set of [start, end) spans out of a string. */
function cut(text: string, spans: [number, number][]): string {
  if (!spans.length) return text.trim();
  const merged = [...spans].sort((a, b) => a[0] - b[0]).reduce<[number, number][]>((acc, sp) => {
    const last = acc[acc.length - 1];
    if (last && sp[0] <= last[1]) last[1] = Math.max(last[1], sp[1]);
    else acc.push([...sp] as [number, number]);
    return acc;
  }, []);
  let out = '';
  let at = 0;
  for (const [a, b] of merged) {
    out += text.slice(at, a);
    at = b;
  }
  return (out + text.slice(at)).trim();
}

/**
 * Pull a sets×reps scheme out of a string, and return what is left of it.
 *
 * ══ THREE SHAPES, IN ORDER OF HOW UNAMBIGUOUS THEY ARE ══
 *
 *   1. COMPACT   "Bench Press 3x8"
 *   2. LABELLED  "Bench press - 4 sets - 6-8 reps"     ← what people actually text each other
 *   3. NEITHER   "Farmer Carry"                        → the caller assumes, and says it assumed
 *
 * Shape 2 is the one this was originally blind to, and it is the single most common way a workout gets
 * written down by hand. It read the sets and lost every rep count, then left "- - 6-8 reps" glued to the
 * exercise's name — so a seven-exercise day imported as seven lifts nobody could match, all at 3×10.
 *
 * ══ THE TYPO CASE ══
 *
 * "Barbell or Dumbbell Shrugs - 3 reps - 10-12 reps" is from a real program, and the first "reps" plainly
 * means sets — every other line in that day reads "N sets - M-K reps". Two rep phrases and no sets phrase
 * is read as sets-then-reps rather than throwing away the first, because the intent is not in doubt.
 */
export function extractScheme(raw: string): { scheme: Scheme; rest: string } {
  const text = raw.replace(TRAILING_LOAD, '');

  const compact = text.match(COMPACT) ?? text.match(SLASHED);
  if (compact?.index != null) {
    return {
      scheme: { sets: num(compact[1]), reps: num(compact[2]) },
      rest: cut(text, [[compact.index, compact.index + compact[0].length]]),
    };
  }

  const setsM = text.match(SETS_LABELLED);
  const repsAll = [...text.matchAll(REPS_LABELLED)];
  const spans: [number, number][] = [];

  if (setsM?.index != null) {
    spans.push([setsM.index, setsM.index + setsM[0].length]);
    let reps = num(setsM[2]);
    if (reps == null && repsAll[0]?.index != null) {
      reps = num(repsAll[0][1]);
      spans.push([repsAll[0].index, repsAll[0].index + repsAll[0][0].length]);
    }
    return { scheme: { sets: num(setsM[1]), reps }, rest: cut(text, spans) };
  }

  if (repsAll.length >= 2 && repsAll[0].index != null && repsAll[1].index != null) {
    // Two rep phrases, no sets phrase — the first is a mislabelled set count.
    spans.push([repsAll[0].index, repsAll[0].index + repsAll[0][0].length]);
    spans.push([repsAll[1].index, repsAll[1].index + repsAll[1][0].length]);
    return { scheme: { sets: num(repsAll[0][1]), reps: num(repsAll[1][1]) }, rest: cut(text, spans) };
  }

  if (repsAll.length === 1 && repsAll[0].index != null) {
    spans.push([repsAll[0].index, repsAll[0].index + repsAll[0][0].length]);
    return { scheme: { reps: num(repsAll[0][1]) }, rest: cut(text, spans) };
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
      // "1) Push" and "- Push" are numbered days, not days called "1) Push".
      .replace(LEADING_DECORATION, '')
      .replace(/:$/, '')
      // "Day 1 - Push" / "Monday — Push" → "Push", but "Push" alone survives.
      .replace(/^(?:(?:mon|tues?|wednes|thurs?|fri|satur|sun)day|day|session|workout)\s*\d*\s*[-–—:]\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim() || line.trim()
  );
}
