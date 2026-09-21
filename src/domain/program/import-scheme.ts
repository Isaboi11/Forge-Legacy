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

/**
 * `3x8`, `3 x 8`, `3×8`, `5X5`, `4x8-10` → the sets and the FLOOR of the rep range.
 *
 * ⚠ THE RANGE'S TOP AND A UNIT ARE CONSUMED WITH IT (stress test, 2026-09-21). The match used to stop
 * at the floor, so "Lateral Raise 3x8-10" left "Lateral Raise -10" as the name and "Plank 3x30s" left
 * "Plank s" — neither of which is in the catalogue, so a perfectly ordinary line imported unmatched. The
 * unit itself is not lost: the line is kept as the item's note (`hasQualifier`).
 */
const COMPACT_UNIT = '(?:\\s*(?:s|secs?|seconds?|m|meters?|metres?|yds?|yards?|ft|feet|mins?|minutes?)\\b)?';
const COMPACT = new RegExp(`(?<![\\d.])(\\d{1,2})\\s*[x×]\\s*(\\d{1,3})(?![\\d.])${COMPACT_UNIT}`, 'i');
/**
 * The same with a range's top — "3x8-10". Only a PLAUSIBLE top counts: "4x8 - 90s rest" is four sets of
 * eight and a rest, not a range of eight to ninety.
 */
const COMPACT_RANGE = new RegExp(`(?<![\\d.])(\\d{1,2})\\s*[x×]\\s*(\\d{1,3})\\s*[-–—]\\s*(\\d{1,3})(?![\\d.])${COMPACT_UNIT}`, 'i');

function compactMatch(text: string): RegExpMatchArray | null {
  const ranged = text.match(COMPACT_RANGE);
  if (ranged) {
    const lo = Number(ranged[2]);
    const hi = Number(ranged[3]);
    if (hi > lo && hi <= lo * 3 + 2) return ranged;
  }
  return text.match(COMPACT);
}
/**
 * "3x AMRAP", "4 x max", "3xF", "3 x failure" — the SETS are stated, the reps are "as many as you can".
 *
 * Unread, the line had no scheme at all, and a line with no scheme sitting between two that have one is
 * read as a DAY HEADING by the boundary rule — so "Pull Ups – 3 x AMRAP" split a real training day in two
 * and became the name of the second half. The reps stay unstated and are shown as assumed.
 */
const SETS_TO_FAILURE = /(?<![\d.])(\d{1,2})\s*[x×]\s*(?:amrap|max|failure|f)\b/i;
/**
 * Number words next to a sets/reps word — "three sets of eight", "five by five". Only ADJACENT to one,
 * so "One-arm DB row" keeps its name: a word is only a number when it is plainly counting sets or reps.
 */
const NUMBER_WORDS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', fifteen: '15', twenty: '20',
};
const NUMBER_WORD = `(${Object.keys(NUMBER_WORDS).join('|')})`;
const WORD_BEFORE = new RegExp(`\\b${NUMBER_WORD}(?=\\s+(?:sets?|reps?|by|x|×)\\b)`, 'gi');
const WORD_AFTER = new RegExp(`(?<=\\b(?:of|by|x|×)\\s+)${NUMBER_WORD}\\b`, 'gi');
/** "5 by 5" → "5x5", once the words are digits. */
const BY = /(?<![\d.])(\d{1,2})\s+by\s+(\d{1,3})(?![\d.])/i;

function numberWordsToDigits(text: string): string {
  return text
    .replace(WORD_BEFORE, (w) => NUMBER_WORDS[w.toLowerCase()] ?? w)
    .replace(WORD_AFTER, (w) => NUMBER_WORDS[w.toLowerCase()] ?? w)
    .replace(BY, '$1x$2');
}
/**
 * "4/8" — sets over reps, which is how a split gets texted.
 *
 * Guarded on BOTH sides against a longer number: "5/3/1" is a loading scheme, not five sets of three,
 * and "135 x 5" is a weight — which this read as ONE set of THIRTY-FIVE before the guard, by slicing the
 * first two digits off a three-digit number.
 *
 * Ambiguous against per-side reps ("8/8"), and deliberately resolved toward sets/reps: in a line that
 * names an exercise, the first number is almost always how many times you do it. Per-side counts turn up
 * in a Reps COLUMN, which never reaches here.
 */
const SLASHED = /(?<![\d.\/])(\d{1,2})\s*\/\s*(\d{1,3})(?![\d.\/])/;
/** "4 sets", "4 sets of 12", "3 sets x 10" — the label carries the meaning, wherever it sits. */
const SETS_LABELLED = /(?<![\d.])(\d{1,2})\s*sets?\b(?:\s*(?:of|x|×)\s*(\d{1,3}))?/i;
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

/**
 * ══ WHAT PEOPLE ACTUALLY PASTE AROUND A NAME (stress test, 2026-09-21) ══
 *
 * Every one of these reached the catalogue matcher glued to the name and made an ordinary lift
 * unmatchable — "RDL @RPE8", "Bench 100kg", "Lunges each side", "**Bench Press:**" out of a chat answer,
 * "▪️ Deadlifts" out of an Instagram caption. None of them is part of what the exercise is CALLED, and
 * the line they came from is kept whole as the item's note, so stripping them loses nothing.
 */
/** Markdown emphasis — a chat answer bolds every name. */
const MARKDOWN = /\*\*|__|^#+\s+/g;
/** A name wrapped in quotes, straight or smart. */
const WRAPPING_QUOTES = /^["“”'‘’]+|["“”'‘’]+$/g;
/** Emoji and symbol bullets — "▪️", "👉", "✅", "🔹" — at either end. Nobody names a lift with one. */
const EMOJI_EDGES = /^[\p{Extended_Pictographic}\p{So}️‍\s]+|[\s\p{Extended_Pictographic}\p{So}️‍]+$/gu;
/** A load anywhere in the line — "100kg", "30lb", "135 lbs". */
const LOAD_TOKEN = /\s*\b\d+(?:\.\d+)?\s*(?:kgs?|kilos?|lbs?|pounds?)\b/gi;
/** "@RPE8", "RPE 8-9", "@ 8 RPE", "RIR 2". */
const EFFORT = /\s*@?\s*\b(?:rpe|rir)\s*\d+(?:\.\d+)?(?:\s*[-–—]\s*\d+(?:\.\d+)?)?|\s*@?\s*\b\d+(?:\.\d+)?\s*(?:rpe|rir)\b/gi;
/** "70% 1RM", "@75%", "80% of max". */
const PERCENT = /\s*@?\s*\d{1,3}(?:\.\d+)?\s*%(?:\s*(?:of\s+)?(?:1\s*rm|max|tm|training max))?/gi;
/** "each side", "per leg", "/side", "ea". */
const PER_SIDE = /\s*(?:\/\s*(?:side|leg|arm)|\b(?:each|per)\s+(?:side|leg|arm)s?\b|\bea\b\.?)/gi;
/** "to failure", "till failure", "AMRAP". */
const TO_FAILURE = /\s*\b(?:(?:to|till|until)\s+failure|amrap)\b/gi;
/** "rest 60 sec", "(rest 2 min)" — the rest note written the other way round from `REST_NOTE`. */
const REST_FIRST = /\s*\(?\s*\brest\s*:?\s*\d+\s*(?:s|secs?|seconds?|m|mins?|minutes?)\b\s*\)?/gi;
/** A lone "x" left at either end once its numbers were taken — "Squat x". */
const DANGLING_X = /^\s*[x×]\s+|\s+[x×]\s*$/gi;
/** A superset label in front of the name — "SS:", "Superset -", "Tri-set:". */
const SUPERSET_LABEL = /^\s*(?:ss|super\s*-?\s*set|tri\s*-?\s*set|giant\s*set)\s*\d*\s*[:\-–—]\s*/i;

/**
 * Does a line carry anything the name and a plain sets×reps cannot hold — a load, an effort target, a
 * unit, a side, a rest? When it does, the whole line becomes the item's note so the athlete still has it.
 */
export function hasQualifier(line: string): boolean {
  return /@|%|\/\s*side|\b(?:rpe|rir|amrap|failure|each|per|ea|rest|tempo|kg|kgs|lbs?|sec|secs|seconds?|mins?|minutes?|yds?|yards?|ft|meters?|metres?)\b|\d\s*(?:s|m)\b/i.test(
    line,
  );
}

/** Strip decoration, a trailing load and dangling separators — what the exercise is actually called. */
export function cleanExerciseName(raw: string): string {
  return raw
    .replace(MARKDOWN, '')
    .replace(EMOJI_EDGES, '')
    .replace(LEADING_DECORATION, '')
    .replace(SUPERSET_LABEL, '')
    .replace(WRAPPING_QUOTES, '')
    .replace(TRAILING_LOAD, '')
    .replace(REST_NOTE, '')
    .replace(REST_FIRST, '')
    .replace(LOAD_TOKEN, '')
    .replace(EFFORT, '')
    .replace(PERCENT, '')
    .replace(PER_SIDE, '')
    .replace(TO_FAILURE, '')
    .replace(DANGLING_X, ' ')
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
  const text = numberWordsToDigits(raw.replace(TRAILING_LOAD, ''));

  const compact = compactMatch(text) ?? text.match(SLASHED);
  if (compact?.index != null) {
    return {
      scheme: { sets: num(compact[1]), reps: num(compact[2]) },
      rest: cut(text, [[compact.index, compact.index + compact[0].length]]),
    };
  }

  const toFailure = text.match(SETS_TO_FAILURE);
  if (toFailure?.index != null) {
    return {
      scheme: { sets: num(toFailure[1]) },
      rest: cut(text, [[toFailure.index, toFailure.index + toFailure[0].length]]),
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

/**
 * A weekday, full or abbreviated — "Monday", "Mon", "Tues", "Thurs", "Sat".
 *
 * ⚠ THE ABBREVIATIONS ARE NOT A NICETY (stress test, 2026-09-21). A running table with a Day column of
 * "Mon / Wed / Sat" had no row the session reader recognised as starting a row, so it glued all six rows
 * onto the first and imported ONE run out of six; a texted "mon - chest n tris" was an exercise.
 */
/**
 * The full names always count. An abbreviation only counts standing ALONE or before a separator, so
 * "Sun salutation" and "Sat on bench" stay exercises while "Mon", "Wed:" and "fri - legs" are days.
 */
const WEEKDAY_SRC =
  '(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day\\b|(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\\.?(?=\\s*(?:$|[-–—:|,(/])))';
const WEEKDAYS = new RegExp(`^${WEEKDAY_SRC}`, 'i');
const DAY_WORD = /^(day|session|workout)\b/i;
/** Numbers a week is written with in words — "Week One". Twelve covers every block anyone texts. */
const WEEK_NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
/**
 * "Week 3", "Wk2", "W3", "Week One", "Weeks 1-4" → the (first) week number.
 *
 * ⚠ "Wk2" AND "W3" WERE EXERCISES, and a three-week program imported as one week of four "Day 1"s with
 * three lifts called "Wk2", "W3" and "Block 1" (stress test, 2026-09-21). "Wk" was already a Week COLUMN
 * alias in `import-parse.ts`; a typed heading simply never learned it.
 *
 * A RANGE ("Weeks 1-4") names its first week. Whether weeks 2–4 repeat week 1 is the program's to say,
 * and filling them in would be writing weeks nobody wrote — so they are not.
 */
const WEEK_WORD = new RegExp(
  `^(?:weeks?|wks?|w)\\s*\\.?\\s*#?(\\d{1,2}|${Object.keys(WEEK_NUMBER_WORDS).join('|')})\\b(?:\\s*[-–—]\\s*\\d{1,2}\\b)?`,
  'i',
);

/** "WEEK 3", "Week 3 — deload" → 3. Null when the line is not a week heading. */
export function weekHeading(line: string): number | null {
  const m = line.trim().match(WEEK_WORD);
  if (!m) return null;
  const n = WEEK_NUMBER_WORDS[m[1].toLowerCase()] ?? Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * A rest day written as an entry — "Rest", "Rest day", "Off", "Day off", "Recovery day".
 *
 * ⚠ IT IMPORTED AS AN EXERCISE CALLED "REST" AT AN INVENTED 3×10, which made the rest day a training
 * day — and in a Monday-to-Sunday week that pushed a real day past the builder's six-day limit, where it
 * was dropped (stress test, 2026-09-21). A rest day is the absence of a session: nothing is created.
 * Strict on purpose; "Rest, then a 20 min walk" is not rest.
 */
const REST_ENTRY = /^(?:full\s+|complete\s+)?(?:rest|off|recovery)(?:\s+day)?(?:\s*\/\s*(?:rest|off|recovery))?[.!]*$|^day\s+off[.!]*$/i;

export function isRestEntry(text: string): boolean {
  return REST_ENTRY.test(text.trim());
}

/** "Rest 3 min between sets", "Rest 90s" — an instruction about the gaps, on a line of its own. */
export function isRestInstruction(text: string): boolean {
  return /^rest\b[^a-z]*\d+\s*(?:s|secs?|seconds?|m|mins?|minutes?)\b/i.test(text.trim());
}

/**
 * A DAY LABEL at the front of a line that carries the day's work — "Mon: Squat 5x5, Bench 5x5",
 * "Day 1 - Push: Bench 4x8", "Monday: Easy run 3 miles".
 *
 * ⚠ THESE LINES WERE READ AS ONE EXERCISE, OR AS A DAY WITH NOTHING IN IT. "Mon: Squat 5x5, Bench 5x5,
 * Row 5x5" became a single lift of that name, so a three-day week imported as one day of three junk
 * rows; "Monday: Easy run 3 miles" became a day NAME with no work under it, which is dropped, so a
 * running week lost every run that was not written with an "x" in it (stress test, 2026-09-21).
 *
 * Returns the label (for the day's name) and the work after it, or null. The caller decides whether the
 * remainder is really work — a day called "Monday: Chest" is still just a name.
 */
const DAY_LABEL_PREFIX = new RegExp(`^(${WEEKDAY_SRC}|(?:day|session|workout)\\s*\\d{1,2}\\b)\\s*(?:[-–—:|)]\\s*|\\s+)(.+)$`, 'i');

export function splitDayLabel(line: string): { label: string; rest: string } | null {
  const m = line.trim().match(DAY_LABEL_PREFIX);
  if (!m) return null;
  let label = m[1];
  let rest = m[2].trim();
  // "Day 1 - Push: Bench 4x8" — a name for the day between the label and the work.
  const named = rest.match(/^([^:]{2,30}):\s*(.+)$/);
  if (named && !/\d\s*[x×]\s*\d/.test(named[1])) {
    label = `${label} - ${named[1].trim()}`;
    rest = named[2].trim();
  }
  return { label, rest };
}

/**
 * ══ THE LINES AROUND A PROGRAM THAT ARE NOT THE PROGRAM ══
 *
 * A PDF opens with a title page, a copyright line and a disclaimer; an Instagram caption ends in "Save
 * this for later 📌" and a row of hashtags; an email starts "Hi Jordan," and ends with a phone number and
 * "Sent from my iPhone". Every one of them imported as an exercise at an invented 3×10 (stress test,
 * 2026-09-21), and the PDF's "INTRODUCTION", "NUTRITION" and "FAQ" became training days.
 *
 * This only ever answers for a line that has NO sets×reps and is not cardio — anything with a
 * prescription on it is work, whatever else it says. And nothing it catches is thrown away quietly: the
 * parser hands every skipped line back and the preview lists them.
 */
export function isChatter(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/https?:\/\/|\bwww\.|\.(?:com|net|org|io|co|app)\b/i.test(t)) return true; // a link
  if (/\S+@\S+\.\S+/.test(t)) return true; // an email address
  if (/^[@#]\S+/.test(t) || /(?:^|\s)#\w+\s+#\w+/.test(t) || /\bfollow\s+@/i.test(t)) return true; // handles, hashtags
  if (/©|\ball rights reserved\b|\bdisclaimer\b|\bcopyright\b/i.test(t)) return true;
  if (/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(t)) return true; // a phone number
  if (/^(?:hi|hey|hello|dear|thanks|thank you|thx|cheers|best|regards|sincerely|lmk|let me know|sent from)\b/i.test(t)) return true;
  if (/^[QA]\s*:/i.test(t)) return true; // an FAQ
  // A date on a line of its own — "September 20, 2026", "9/20/26".
  if (/^(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4})$/i.test(t)) return true;
  /*
   * A SENTENCE: long, or finished with sentence punctuation. Exercise names are short and unpunctuated.
   * A parenthetical is a coaching aside on a real lift — "Chair Dips (use sturdy chair, feet closer =
   * easier)" — so it is not counted.
   */
  const bare = t.replace(/\([^)]*\)/g, ' ').trim();
  const words = bare.split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
  if (words >= 9) return true;
  if (words >= 4 && /[.!?]["')\]]*[\s\p{Extended_Pictographic}️]*$/u.test(bare)) return true;
  return false;
}

/**
 * What is left of a line after its week heading — "Week 1: Squat 5x5" carries an exercise.
 *
 * Consuming the whole line threw that exercise away and, for a program written one week per line, threw
 * away every exercise in it and reported "no exercises found". Empty when the heading stood alone.
 */
export function afterWeekHeading(line: string): string {
  return line.trim().replace(WEEK_WORD, '').replace(LEADING_DECORATION, '').replace(/^[\s:;,\-–—|]+/, '').trim();
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
  // "Sept 22", "Oct 3rd", "9/22" — a plan written against the calendar names its days by date.
  if (/^(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2})$/i.test(t)) return true;
  // "Push Day", "Leg Day 🦵", "Upper Body Day" — named for what the day IS. A rest day never gets here.
  if (/^[\p{L}&/ -]{2,24}\s+day[\s\p{Extended_Pictographic}️]*$/iu.test(t)) return true;
  // ALL CAPS and short — "PUSH", "UPPER BODY". Long shouted lines are usually notes, not headings.
  if (t.length <= 28 && t === t.toUpperCase() && /[A-Z]/.test(t) && !/\d/.test(t)) return true;
  return false;
}

/**
 * "FOCUS: ARMS/CHEST", "TARGET: LEGS AND CORE" — a label naming what a day is FOR, printed among its
 * exercises rather than above them.
 *
 * It is neither a day nor work, and it was read as a day: every training day in a real PDF split in
 * half at the label, and the second half — four of the day's five exercises — ended up in a day called
 * "FOCUS: ARMS/CHEST". Where the PDF wrapped the label, days came out named "BACK".
 *
 * The colon must follow the label word directly. "Focus set: Chair Dips" is an exercise, and naming a
 * set is not the same as naming the day.
 */
const ANNOTATION = /^(?:focus|target|goal|aim|emphasis)\s*:/i;

export function isAnnotation(line: string): boolean {
  return ANNOTATION.test(line.trim());
}

/**
 * The second line of a label a PDF wrapped — "TARGET: ARMS, CHEST, AND" / "BACK".
 *
 * Only ever asked of the line directly beneath an annotation. A weekday is excluded: a day heading that
 * happens to follow a label is still a day heading.
 */
export function isLabelContinuation(line: string): boolean {
  const t = line.trim();
  if (!t || WEEKDAYS.test(t) || DAY_WORD.test(t)) return false;
  return t.length <= 28 && t === t.toUpperCase() && /[A-Z]/.test(t) && !/\d/.test(t);
}

/** A page footer carried in from a PDF — "DailyRepsGuy — 20 min. Workout PDF Page 10". Not training. */
export function isPageFooter(line: string): boolean {
  return /\bpage\s+\d+\s*$/i.test(line.trim());
}

/** Monday → "mon". The identity of a weekday, so a week can notice one coming round again. */
export function weekdayKey(line: string): string | null {
  const m = line.trim().match(WEEKDAYS);
  return m ? m[0].slice(0, 3).toLowerCase() : null;
}

/**
 * A weekday heading with the day's FIRST EXERCISE on the same line — "SATURDAY Arms/Chest: Chair Dips".
 *
 * A PDF loses the line break often enough to matter, and the whole line became the day's NAME, taking
 * the exercise with it. Split, the weekday names the day and the remainder is work.
 *
 * Two guards keep a day's own name from being torn off it. A remainder introduced by a DASH or a COLON
 * is part of the name — "WEDNESDAY — REST DAY" is a day called Rest Day, not a rest-day exercise — and
 * a remainder is only work when it is shaped like an entry, which here means a "Category: Movement"
 * prefix. Anything less certain is left alone, because a heading wrongly split loses an exercise into a
 * day name that is visible, while a heading wrongly kept whole is a day nobody can find.
 */
const DAY_WITH_WORK = /^((?:mon|tues?|wednes|thurs?|fri|satur|sun)day)\s+(?![-–—:])(.*)$/i;
const ENTRY_PREFIX = /^[\w/&' -]{2,30}:\s*\S/;

export function splitDayHeading(line: string): { name: string; rest: string } {
  const t = line.trim();
  const m = t.match(DAY_WITH_WORK);
  if (!m) return { name: t, rest: '' };
  const rest = m[2].trim();
  if (!ENTRY_PREFIX.test(rest)) return { name: t, rest: '' };
  return { name: m[1], rest };
}

/**
 * A day heading sitting on a row of its OWN, with no exercise on it.
 *
 * This is how a real training sheet lays a week out: banner rows — "MONDAY — Upper Strength + Zone 2" —
 * between the blocks of lifts, rather than a Day column repeating the label on every line. Those rows have
 * an empty Exercise cell, were skipped as spacers, and a four-day week imported as ONE day holding fifty
 * exercises.
 *
 * Deliberately STRICTER than `looksLikeDayHeading`, which also accepts anything short and shouted. The
 * very same column holds "WARM-UP", "ACCESSORIES", "CORE" and "STRENGTH — BARBELL" — section labels, not
 * days — and every one of them is short, shouted and digit-free. Promoting those turned the same sheet's
 * four training days into twenty-three. So here a day must SAY it is one: a weekday, or Day/Session N.
 */
const DAY_ROW = new RegExp(`^(?:${WEEKDAY_SRC}|(?:day|session|workout)\\s*\\d+\\b)`, 'i');

/** The heading text when a cell on this row names a day, or null when none does. */
export function dayHeadingRow(cells: readonly string[]): string | null {
  for (const c of cells) {
    const t = c.trim();
    if (t && DAY_ROW.test(t)) return t;
  }
  return null;
}

/** The day's name, with any "Day 1:" / "Monday -" scaffolding trimmed off the front. */
export function cleanDayName(line: string): string {
  return (
    line
      .trim()
      // "**Day 1: Upper Body**" out of a chat answer.
      .replace(/\*\*|__/g, '')
      // "1) Push" and "- Push" are numbered days, not days called "1) Push".
      .replace(LEADING_DECORATION, '')
      .replace(/:$/, '')
      // "Day 1 - Push" / "Monday — Push" / "mon - chest" → "Push", but "Push" alone survives.
      .replace(/^(?:(?:mon|tues?|wednes|thurs?|fri|satur|sun)day|(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\.?|day|session|workout)\s*\d*\s*[-–—:]\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim() || line.trim()
  );
}

/**
 * A line that is a SET rather than an exercise — "65% x 5", "135 x 5", "225 x 1", "85% x 5+".
 *
 * This is how 5/3/1, Sheiko and every wave-loading template are written: the exercise is named once and
 * each line beneath it is one set at a different load. Read as exercises they produced a day full of
 * lifts called "65% x 5"; read as sets they are three sets of five, which the program model can hold.
 *
 * The LOAD is deliberately discarded. A program prescribes sets and reps here; the weight is what the
 * athlete logs on the day, and inventing a target load from somebody else's percentages would be
 * prescribing a number nobody wrote.
 */
/* The optional "Set 1:" in front is how a workout SHARED out of a logging app (Hevy, Strong) writes each
   set — "Set 1: 135 lbs x 10". Without it, every set of a shared workout imported as an exercise. */
const LOAD_SET = /^(?:set\s*\d{1,2}\s*[:.)-]?\s*)?(\d{1,3}(?:\.\d+)?)\s*(?:%|lbs?|kgs?)?\s*[x×]\s*(\d{1,3})\s*\+?$/i;

/** The rep count when a line is one loaded set, or null when the line is something else. */
export function loadedSetReps(line: string): number | null {
  const m = line.trim().match(LOAD_SET);
  if (!m) return null;
  const n = Number(m[2]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
