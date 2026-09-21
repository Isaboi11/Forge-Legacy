/**
 * "Import from a spreadsheet" — turning pasted rows into a program.
 *
 * The rules are the design's own words, and they are a promise to the athlete rather than a convenience
 * for the parser (`Forge Program Builder.dc.html`):
 *
 *   "Paste rows from Excel or Google Sheets. Include a header row — columns can be in any order. We look
 *    for Week, Day, Exercise, Sets, Reps. One week or the whole program — either works."
 *
 * Every clause of that is load-bearing. Columns in ANY ORDER means the header is read, not assumed.
 * ONE WEEK OR THE WHOLE PROGRAM means a missing Week column is a single week, not an error. And the
 * columns nobody promised — Weight, RPE, Tempo, Notes, whatever a coach keeps — are ignored rather than
 * refused, because a real training sheet has them and rejecting it would be rejecting the actual use case.
 *
 * ══ WHY THIS NEVER GUESSES AN EXERCISE ══
 *
 * A parser that silently corrects "Bench" to "Barbell Bench Press" is deciding what somebody trained.
 * Names come through EXACTLY as written; matching them to the catalogue happens later, separately, and
 * anything unmatched stays a plain name rather than becoming the nearest-looking lift.
 */

// Relative and extensioned: `node --test` loads this file directly and cannot resolve the `@/` alias.
// (`import-session-text` gets away with `@/` because it imports a TYPE, which is stripped before then.)
import { deriveName, type CardioActivity } from '../workout/conditioning.ts';
import {
  activityIn,
  distanceIn,
  durationIn,
  looksLikeSessionText,
  parseSessionCell,
  type SessionItem,
} from './import-session-text.ts';
import {
  afterWeekHeading,
  loadedSetReps,
  cleanDayName,
  cleanExerciseName,
  dayHeadingRow,
  extractScheme,
  firstNumber,
  hasQualifier,
  isAnnotation,
  isChatter,
  isLabelContinuation,
  isPageFooter,
  isRestEntry,
  isRestInstruction,
  looksLikeDayHeading,
  splitDayHeading,
  splitDayLabel,
  weekHeading,
  weekdayKey,
} from './import-scheme.ts';

export interface ParsedItem {
  /** Verbatim from the sheet. Never normalised, never corrected. */
  name: string;
  sets: number;
  reps: number;
  /** True when the sheet did not say, so the preview can show the athlete what it filled in. */
  setsAssumed: boolean;
  repsAssumed: boolean;
  /**
   * ══ THE CARDIO FIELDS ══
   *
   * Set only by the SESSION reader (`parseSessionTable`), for a sheet written one row per DAY with the
   * work as prose — which is how every endurance plan is kept and none of which the sets-and-reps
   * reader above can hold. Absent for an ordinary exercise table, which reads exactly as it did.
   */
  kind?: 'strength' | 'cardio';
  activity?: CardioActivity;
  /** Seconds. `null` is meaningful — the sentence prescribed no clock. */
  targetSec?: number | null;
  /** Canonical miles; yards are converted on the way in. */
  targetMi?: number | null;
  /**
   * The source phrase, whole — "75min bike Z2 w/ 3x8min Z3".
   *
   * Becomes the exercise's coaching note. This is what makes a heuristic reader honest: whatever
   * structure was recognised is laid ON TOP of text that is never discarded, so an interval, a zone or a
   * "calf check" that no field can hold still reaches the athlete in the words the coach wrote.
   */
  note?: string;
}

export interface ParsedDay {
  /** The Day cell's text, verbatim — "Push A", "Lower Body", "Day 1". */
  name: string;
  /** A, B, C … by order of first appearance in the sheet, which is the author's running order. */
  letter: string;
  items: ParsedItem[];
}

export interface ParsedWeek {
  /** The Week cell's number. 1 when the sheet had no Week column. */
  index: number;
  days: ParsedDay[];
}

export type ParseResult =
  | {
      ok: true;
      weeks: ParsedWeek[];
      ignoredColumns: string[];
      rowsRead: number;
      /**
       * Lines the reader decided were NOT training — a greeting, a caption, a disclaimer, a link, a
       * "Rest 2 min between sets". Handed back so the preview can list them: a heuristic that drops text
       * must show what it dropped, or a wrong guess is invisible (stress test, 2026-09-21).
       */
      skipped?: string[];
    }
  | { ok: false; error: string };

/** Defaults when a sheet omits them. Shown as assumed, and adjustable in the preview's steppers. */
const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Header aliases.
 *
 * Deliberately short. A guess this list gets wrong does not fail — it silently mis-imports somebody's
 * program, which is the worst outcome available.
 */
const COLUMNS = {
  week: ['week', 'wk'],
  day: ['day', 'session', 'workout', 'split'],
  exercise: ['exercise', 'movement', 'lift', 'name'],
  sets: ['sets', 'set'],
  reps: ['reps', 'rep', 'repetitions'],
  /** One column holding both — "Sets x Reps", "Scheme", "3x8". Common enough to be worth reading. */
  scheme: ['setsxreps', 'setsreps', 'scheme', 'setrep', 'volume', 'prescription'],
} as const;

type ColumnKey = keyof typeof COLUMNS;

/**
 * Split one line into cells.
 *
 * TAB FIRST, because that is what Excel and Google Sheets put on the clipboard, and a sheet whose cells
 * contain commas ("Squat, paused") would otherwise shatter into nonsense. Semicolons come next — that is
 * what a European locale exports — and commas last.
 */
function splitLine(line: string, delimiter: '\t' | ';' | ','): string[] {
  if (delimiter !== ',') return line.split(delimiter).map((c) => c.trim());

  // CSV, with quoted fields — a coach's "Squat, paused" must survive as one cell.
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
      continue;
    }
    if (c === ',' && !quoted) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function detectDelimiter(lines: string[]): '\t' | ';' | ',' {
  if (lines.some((l) => l.includes('\t'))) return '\t';
  if (lines.some((l) => l.includes(';'))) return ';';
  return ',';
}

/** Accumulates rows into weeks → days → items, keeping first-appearance order throughout. */
class Builder {
  /*
   * Days are keyed by an IDENTITY, not by their name.
   *
   * A six-day split names day 4 "Chest and Triceps" exactly like day 1 — that is what a split IS. Keying
   * by name merged them, and a six-day program imported as four days with fourteen exercises crammed
   * into the first. Two days that share a name are still two days.
   *
   * A TABLE is the opposite case: its Day column repeats the same label on every row of that day, and
   * those rows genuinely are one day. So the caller decides — a table passes the name as the key, and a
   * typed-out workout passes a fresh key per heading.
   */
  private weeks = new Map<number, Map<string, { name: string; items: ParsedItem[] }>>();
  rowsRead = 0;

  add(week: number, dayKey: string, dayName: string, item: ParsedItem) {
    if (!this.weeks.has(week)) this.weeks.set(week, new Map());
    const days = this.weeks.get(week)!;
    if (!days.has(dayKey)) days.set(dayKey, { name: dayName, items: [] });
    days.get(dayKey)!.items.push(item);
    this.last = item;
    this.rowsRead++;
  }

  /** Whether a day was ever given anything. */
  /** A day's items so far — what "Same as Day 1" copies. */
  itemsOf(week: number, dayKey: string): readonly ParsedItem[] {
    return this.weeks.get(week)?.get(dayKey)?.items ?? [];
  }

  has(week: number, dayKey: string): boolean {
    return this.weeks.get(week)?.has(dayKey) ?? false;
  }

  /** The item added most recently, so a loaded-set line can extend it. */
  last: ParsedItem | null = null;

  done(): ParsedWeek[] {
    return [...this.weeks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, days]) => ({
        index,
        days: [...days.values()].map((d, i) => ({
          name: d.name,
          letter: LETTERS[i] ?? String(i + 1),
          items: d.items,
        })),
      }));
  }
}

function item(name: string, sets: number | undefined, reps: number | undefined): ParsedItem {
  return {
    name,
    sets: sets ?? DEFAULT_SETS,
    reps: reps ?? DEFAULT_REPS,
    setsAssumed: sets == null,
    repsAssumed: reps == null,
  };
}

/**
 * A TYPED-OUT workout — no header row, no columns, just what somebody wrote down.
 *
 *   Monday - Push          - Bench Press 3x8         DAY 1: PUSH
 *   Bench Press 3x8        - Barbell Row 3x8         Bench Press: 3x8
 *   Incline DB 3x10        - Squat 5x5               Fly - 3 x 12
 *
 * All three are the same thing and all three used to be REJECTED, which made the feature useless for
 * anybody who keeps their training in Notes rather than Excel. A line with a scheme is work; a line
 * without one is a heading if it says so and an exercise otherwise.
 */
function parseFreeform(lines: string[]): ParseResult {
  const b = new Builder();
  let week = 1;
  let day: string | null = null;
  /** Bumped on every heading, so two days called the same thing stay two days. */
  let dayOrdinal = 0;
  /*
   * THE WEEKDAYS THAT HAVE GONE BY IN THIS WEEK.
   *
   * A program printed as two weeks back to back does not always announce the second one. It runs Monday
   * to Sunday, and then simply starts at Monday again — and read straight through that is one week of
   * sixteen days, with the two Mondays sitting side by side as if they were different sessions.
   *
   * A weekday coming round AGAIN is the boundary. Repetition is the signal rather than order, because
   * these are lifted out of PDFs whose columns interleave: the second week here lists Sunday between
   * Tuesday and Wednesday, and a rule that watched for the days going backwards would cut it in half.
   */
  const seenDays = new Set<string>();
  /** True directly after a "FOCUS:" label, while a line wrapped off the end of it may still arrive. */
  let afterLabel = false;
  /** Every line read as NOT training, in order — see `ParseResult.skipped`. */
  const skipped: string[] = [];

  /*
   * Read every line's scheme up front, because deciding what a line IS needs its neighbours.
   *
   * "Push" on its own is a heading. So are "Legs", "Core", "Pull" and "Push Day" — none of which match
   * any keyword, none of which shout in capitals, and all of which used to import as an exercise at an
   * invented 3×10 while the day they were naming never got created. Whether a bare line is a heading is
   * not a property of the line; it is a property of where it SITS.
   */
  const rows = lines
    // "**Day 1: Upper Body**" — a chat answer bolds its headings, and the asterisks hid the "Day".
    .map((l) => untab(l.replace(/\*\*|__/g, '').trim()))
    .filter(Boolean)
    .map((line) => {
      const wk = weekHeading(line);
      const { scheme, rest } = extractScheme(line);
      const hasScheme = scheme.sets != null || scheme.reps != null;
      const label = wk == null ? splitDayLabel(line) : null;
      const cardio = wk == null && !hasScheme ? cardioItems(line) : null;
      return {
        line,
        wk,
        scheme,
        rest,
        hasScheme,
        cardio,
        /** "Mon: Squat 5x5, Bench 5x5" / "Monday: Easy run 3 miles" — a day label with its work after it. */
        labelled: label && (label.rest && (hasWork(label.rest) || isRestEntry(label.rest) || sameAs(label.rest) != null)) ? label : null,
        /** Anything that prescribes something — the thing a heading sits above and chatter sits around. */
        isWork: hasScheme || cardio != null || loadedSetReps(line) != null,
      };
    });

  /*
   * ══ WHERE THE PROGRAM STARTS AND ENDS ══
   *
   * What sits above the first prescription and below the last one is where a title page, "Hi Jordan,"
   * and "Sent from my iPhone" live. Lines there are held to a stricter test (`isPreamble`, and the
   * chatter cut-off below) than lines in the middle of the work, which are taken as exercises.
   */
  /*
   * A PDF's RUNNING HEADER — "THE 12 WEEK HYPERTROPHY BLUEPRINT" at the top of every page. It imported as
   * an exercise in every week (stress test, 2026-09-21). A line of three words or more that comes back
   * word for word three times, and prescribes nothing, is the page, not the program.
   */
  const seen = new Map<string, number>();
  for (const r of rows) if (!r.isWork && r.wk == null) seen.set(r.line, (seen.get(r.line) ?? 0) + 1);
  const furniture = new Set(
    [...seen]
      // A day heading repeats every week on purpose — "Day 1 - Upper" twelve times is twelve days.
      .filter(([line, count]) => count >= 3 && line.split(/\s+/).length >= 3 && !looksLikeDayHeading(line) && splitDayLabel(line) == null)
      .map(([line]) => line),
  );

  const firstWork = rows.findIndex((r) => r.isWork || r.labelled != null);
  let lastWork = -1;
  rows.forEach((r, i) => {
    if (r.isWork || r.labelled != null) lastWork = i;
  });
  /** From the first chatter line after the last prescription, everything is the sign-off. */
  let tailFrom = rows.length;
  if (lastWork >= 0) {
    const k = rows.findIndex((r, i) => i > lastWork && !r.isWork && isChatter(r.line));
    if (k >= 0) tailFrom = k;
  }

  /** Scheme-only lines already claimed by the exercise named above them. */
  const consumed = new Set<(typeof rows)[number]>();

  /** Open a day, noticing a weekday that has come round again (see `seenDays`). */
  /** Every day heading opened, so one that ends up holding nothing can be reported rather than vanish. */
  const opened: { week: number; key: string; line: string; label: string }[] = [];
  const openDay = (rawName: string, line: string = rawName) => {
    const key = weekdayKey(rawName);
    if (key) {
      if (seenDays.has(key)) {
        week++;
        seenDays.clear();
        dayOrdinal = 0;
      }
      seenDays.add(key);
    }
    day = cleanDayName(rawName);
    dayOrdinal++;
    opened.push({ week, key: `${dayOrdinal}`, line, label: dayLabelKey(rawName) });
  };

  /** Add the work in a piece of text — one exercise, several ("Bench 4x8, Row 4x8"), or a bout. */
  const addWork = (text: string, source: string) => {
    for (const it of workItems(text, source, skipped)) b.add(week, `${dayOrdinal}`, day ?? 'Day 1', it);
  };

  rows.forEach((row, i) => {
    if (consumed.has(row)) return;

    // Document furniture from a PDF paste. Nobody trained a page number.
    if (isPageFooter(row.line)) return;
    if (furniture.has(row.line)) {
      if (!skipped.includes(row.line)) skipped.push(row.line);
      return;
    }

    // A label naming what the day is for, and whatever wrapped off the end of it.
    if (isAnnotation(row.line)) {
      afterLabel = true;
      return;
    }
    if (afterLabel && !row.hasScheme && isLabelContinuation(row.line)) {
      afterLabel = false;
      return;
    }
    afterLabel = false;

    /*
     * "Warm-up:", "Main:", "Cool-down:" — sections OF a day, never days. Read as headings (they end in a
     * colon) they split one training day into three called "Warm-up", "Main" and "Cool-down". The work
     * under them stays in the day it belongs to; which section it lands in is `toProgramStructure`'s rule.
     */
    if (isSectionLabel(row.line)) return;

    /*
     * "Block 1", "Phase 2 - Hypertrophy", "Cycle 3" — a stretch of several weeks, not a week and not a
     * lift. It imported as an exercise called "Block 1". Whether its weeks repeat is the program's to
     * say, so it is listed as skipped rather than turned into weeks nobody wrote.
     */
    if (/^(?:block|phase|cycle|mesocycle|meso|stage)\s*\d{1,2}\b(?!\s*[x×])/i.test(row.line) && !row.hasScheme) {
      skipped.push(row.line);
      return;
    }

    if (row.wk != null) {
      week = row.wk;
      day = null; // a new week starts its own days
      dayOrdinal = 0;
      seenDays.clear();
      /*
       * "Week 1: Squat 5x5" carries work on the heading line. Consuming the whole line discarded it —
       * and for a program written one week per line, discarded every exercise in the program and then
       * reported that it found none.
       *
       * What follows the heading is only work when it prescribes something or names nothing but a lift.
       * "Week 1: 15 miles" is the week's volume and "Week 4 — deload" is what the week is FOR; neither is
       * an exercise.
       */
      const rest = afterWeekHeading(row.line);
      if (rest && (hasScheme(rest) || (activityIn(rest) != null && cardioItems(rest) != null) || (!/\d/.test(rest) && !isChatter(rest) && !isRestEntry(rest) && !/\bdeload\b/i.test(rest)))) {
        addWork(rest, row.line);
      }
      return;
    }

    // "Mon: Squat 5x5, Bench 5x5" / "Monday: Easy run 3 miles" / "Tuesday: Rest".
    /*
     * "Day 2: Same as Day 1", "Thursday — repeat Monday", or "Same as Day 1" on the line under a heading.
     * A Couch-to-5K week is written exactly this way, and Days 2 and 3 used to vanish. The named day's
     * work is COPIED into this one (PO, 2026-09-21) — the latest day by that name, this week first.
     */
    const copyFrom = (target: string) => {
      const want = dayLabelKey(target);
      const src = [...opened].reverse().find((o) => o.label === want && !(o.week === week && o.key === `${dayOrdinal}`));
      const items = src ? b.itemsOf(src.week, src.key) : [];
      if (!items.length) return false;
      for (const it of items) b.add(week, `${dayOrdinal}`, day ?? 'Day 1', { ...it });
      return true;
    };
    const sameLine = !row.hasScheme ? sameAs(row.line) : null;
    if (sameLine != null && day != null) {
      if (!copyFrom(sameLine)) skipped.push(row.line);
      return;
    }

    if (row.labelled) {
      const target = sameAs(row.labelled.rest);
      if (target != null) {
        openDay(row.labelled.label, row.line);
        copyFrom(target); // a day that could not be copied is listed at the end, like any empty day
        return;
      }
      openDay(row.labelled.label, row.line);
      if (!isRestEntry(row.labelled.rest)) addWork(row.labelled.rest, row.line);
      return;
    }

    /*
     * "Squat" then "65% x 5" / "75% x 5" / "85% x 5+" — the 5/3/1 shape, where the exercise is named
     * once and every line under it is ONE SET at a different load. Read as exercises it produced a day
     * of lifts called "65% x 5"; each one now adds a set to the lift above it instead.
     */
    const setReps = loadedSetReps(row.line);
    if (setReps != null && b.last) {
      b.last.sets = (b.last.setsAssumed ? 0 : b.last.sets) + 1;
      b.last.setsAssumed = false;
      b.last.reps = setReps;
      b.last.repsAssumed = false;
      return;
    }

    // A rest day written as an entry is the absence of a session, and a rest instruction is not a lift.
    if (isRestEntry(row.line)) return;
    if (!row.hasScheme && isRestInstruction(row.line)) {
      skipped.push(row.line);
      return;
    }

    if (row.cardio) {
      for (const it of row.cardio) b.add(week, `${dayOrdinal}`, day ?? 'Day 1', it);
      return;
    }

    if (!row.hasScheme) {
      /*
       * A heading either SAYS it is one, or SITS like one: at a boundary, with work beneath it and
       * either nothing or the end of the previous day above it.
       *
       * The boundary rule is what catches a bare "Push". Its cost is that a genuine exercise written
       * with no sets or reps, immediately above one that has them, reads as a heading — which is rare
       * enough, and visible in the preview, whereas a missed heading silently welds two training days
       * into one.
       */
      const next = rows.slice(i + 1).find((r) => r.wk == null);
      const prev = rows.slice(0, i).reverse().find((r) => r.wk == null);

      /*
       * "Bench Press" then "4x8" on the line below is a name and its scheme, not a heading and a lift
       * called "4x8". A next line that is NOTHING BUT a scheme belongs to this one.
       */
      if (next?.hasScheme && !next.rest) {
        const name = cleanExerciseName(row.line);
        if (name) b.add(week, `${dayOrdinal}`, day ?? 'Day 1', noted(item(name, next.scheme.sets, next.scheme.reps), next.line));
        consumed.add(next);
        return;
      }

      /*
       * "Bench" then "135 x 5" / "185 x 3" — the lift named once, its sets written under it. The name
       * is the exercise the sets belong to, never a heading above them.
       */
      if (next != null && loadedSetReps(next.line) != null) {
        addWork(row.line, row.line);
        return;
      }

      /*
       * ⚠ NOT WHEN IT CARRIES A NUMBER. "Deadlift 70% 1RM" between two prescribed lifts is a lift with an
       * intensity and no sets — a heading never says "70%". Read as a boundary it split the day in two and
       * took the deadlift with it (stress test, 2026-09-21). "Day 2" and "Week 3" say what they are and
       * never needed this rule.
       */
      const atBoundary = next?.isWork === true && (prev == null || prev.isWork) && !/\d/.test(row.line.replace(/^\s*\d{1,2}[.)]\s+/, ''));
      if ((looksLikeDayHeading(row.line) || atBoundary) && !isChatter(row.line)) {
        // "SATURDAY Arms/Chest: Chair Dips" — the day, and the day's first exercise, on one line.
        const split = splitDayHeading(row.line);
        openDay(split.name, row.line);
        if (split.rest) addWork(split.rest, row.line);
        return;
      }

      // What is NOT an exercise: chatter anywhere, the sign-off, and the title page above the program.
      if (
        isChatter(row.line) ||
        i >= tailFrom ||
        (firstWork >= 0 && i < firstWork && isPreamble(row.line))
      ) {
        skipped.push(row.line);
        return;
      }
    }

    addWork(row.line, row.line);
  });

  /*
   * A DAY THAT CAME TO NOTHING. A rest day is meant to ("Wednesday - Rest"), but "Day 2: Same as Day 1"
   * is a real session this reader cannot copy, and it used to vanish without a word.
   */
  for (const o of opened) {
    if (!b.has(o.week, o.key) && !/\brest\b|\boff\b|recovery/i.test(o.line)) skipped.push(o.line);
  }

  if (b.rowsRead === 0) {
    return { ok: false, error: 'No exercises found. Write one per line, like “Bench Press 3x8”.' };
  }
  return { ok: true, weeks: b.done(), ignoredColumns: [], rowsRead: b.rowsRead, skipped };
}

/**
 * A row copied out of a sheet WITHOUT its header — "Bench Press⇥4⇥8". With no header there is no table to
 * read it as, so it reached this reader with its numbers in cells of their own, where nothing looks for
 * them: it imported as a lift called "Bench Press 4 8" at an invented 3×10 (stress test, 2026-09-21).
 * The two trailing whole numbers are read as sets then reps — the order every sheet in this file keeps
 * them in — and any other tabbed line simply has its tabs read as spaces.
 */
function untab(line: string): string {
  if (!line.includes('\t')) return line;
  const cells = line.split('\t').map((c) => c.trim()).filter(Boolean);
  const reps = cells[cells.length - 1];
  const sets = cells[cells.length - 2];
  if (cells.length >= 3 && /^\d{1,2}$/.test(sets ?? '') && /^\d{1,3}(?:\s*[-–]\s*\d{1,3})?$/.test(reps ?? '') && /\p{L}/u.test(cells[0])) {
    return `${cells.slice(0, -2).join(' ')} ${sets}x${reps}`;
  }
  return cells.join(' ');
}

/** "Same as Day 1" / "Repeat Monday" / "Copy of Day 2" → the day it names ("Day 1"), or null. */
function sameAs(text: string): string | null {
  const m = text.trim().match(/^(?:same\s+as|repeat(?:\s+of)?|copy\s+of|as)\s+(.+?)[.!]*$/i);
  if (!m) return null;
  return dayLabelKey(m[1]) ? m[1].trim() : null;
}

/** A day label's identity — "Day 1", "day1", "DAY 1 - Push" → "day1"; "Monday", "Mon" → "mon". */
function dayLabelKey(label: string): string {
  const t = label.trim();
  const numbered = t.match(/^(?:day|session|workout)\s*(\d{1,2})\b/i);
  if (numbered) return `day${Number(numbered[1])}`;
  return weekdayKey(t) ?? '';
}

/** Does this text carry a sets×reps of its own? */
function hasScheme(text: string): boolean {
  const { scheme } = extractScheme(text);
  return scheme.sets != null || scheme.reps != null;
}

/** Does this text prescribe anything — a sets×reps, or a bout with a distance or a clock? */
function hasWork(text: string): boolean {
  const { scheme } = extractScheme(text);
  return scheme.sets != null || scheme.reps != null || cardioItems(text) != null;
}

/**
 * A line of text as a CARDIO bout, or null.
 *
 * ⚠ TYPED-OUT PLANS NEVER READ CARDIO AT ALL. The session reader (`parseSessionCell`) knew what "20 min
 * bike" and "Run 3 miles" were, but only ever ran on a one-row-per-day TABLE; the same lines typed into
 * Notes imported as exercises called "Run 3 miles easy" at an invented 3×10 (stress test, 2026-09-21).
 *
 * ⚠ A DISTANCE WITH NO ACTIVITY NAMED IS A RUN — "Mon: 3 mi easy", "Sat: 8 mi long". PO, 2026-09-21:
 * *"Things that have a certain amount of miles for running … make sure it works."* Only miles and
 * kilometres, which is how runs are written; yards and metres name a carry or a sled as often as a run,
 * so those still need the activity said. The sentence stays on the bout as its note, and the preview
 * shows "Outdoor Run", so a wrong reading is one tap from being seen.
 */
function cardioItems(text: string): ParsedItem[] | null {
  const t = text.trim();
  if (!t) return null;
  const { scheme } = extractScheme(t);
  if (scheme.sets != null || scheme.reps != null) return null;
  if (looksLikeSessionText(t) && !isRestEntry(t)) {
    const items = parseSessionCell(t).map(sessionItem);
    return items.some((i) => i.kind === 'cardio') ? items : null;
  }
  if (!activityIn(t) && /\d\s*(?:mi|miles?|k|km|kms|kilomet(?:er|re)s?)\b/i.test(t)) {
    const mi = distanceIn(t);
    if (mi != null) {
      return [sessionItem({ name: '', note: t, kind: 'cardio', activity: 'run', targetMi: mi, targetSec: durationIn(t) })];
    }
  }
  return null;
}

/**
 * Split one line into the exercises on it — "Bench 4x8, Row 4x8, Squat 5x5", "SS: Curl 3x12 / Pushdown
 * 3x12", "Lateral Raise 3x15 + Rear Delt Fly 3x15".
 *
 * ⚠ ONE LINE, SEVERAL LIFTS, USED TO BE ONE LIFT with a name like "Bench , Row 4x8, Squat 5x5" (stress
 * test, 2026-09-21). Split only when EVERY piece carries its own prescription, so "Squat 5x5, 3 min
 * rest" stays one lift and "90/90 hip switch" is never cut (the slash needs spaces round it).
 */
function workItems(text: string, source: string, skipped: string[]): ParsedItem[] {
  const parts = text
    .split(/\s*(?:[,;]|\s[/+&]\s|\s+and\s+|\s+then\s+)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const pieces = parts.length >= 2 && parts.every(hasWork) ? parts : [text];

  const out: ParsedItem[] = [];
  for (const piece of pieces) {
    const cardio = cardioItems(piece);
    if (cardio) {
      out.push(...cardio);
      continue;
    }
    const { scheme, rest } = extractScheme(piece);
    const hasNumbers = scheme.sets != null || scheme.reps != null;
    const name = cleanExerciseName(hasNumbers ? rest : rest || piece);
    /*
     * A line that is NOTHING but a prescription has no exercise to give it to — "Week 1: 3x8" under a
     * lift named once. It used to become an exercise called "3x8".
     */
    // "Week 4: deload 2x5" says what the week is FOR; there is no lift called "deload".
    if (!name || !/\p{L}/u.test(name) || /^deload(?:\s+week)?$/i.test(name)) {
      skipped.push(source);
      continue;
    }
    out.push(noted(item(name, scheme.sets, scheme.reps), pieces.length > 1 ? piece : source));
  }
  return out;
}

/** Keep the source line as the item's note when it said something the name and numbers cannot hold. */
function noted(it: ParsedItem, source: string): ParsedItem {
  return hasQualifier(source) ? { ...it, note: source.trim() } : it;
}

/** "Warm-up:", "Main", "Cool down:", "Finisher" — a section of a day, not a day. */
function isSectionLabel(line: string): boolean {
  return /^(?:warm\s*-?\s*ups?|main(?:\s+(?:work|lifts?|sets?|workout))?|cool\s*-?\s*downs?|finishers?|accessor(?:y|ies)(?:\s+work)?)\s*:?$/i.test(
    line.replace(/\*\*|__/g, '').trim(),
  );
}

/**
 * A line ABOVE the first prescription that is a title or an introduction rather than a lift — "🔥 MY 4
 * DAY SPLIT 🔥", "ok heres ur workout for this week", "By Coach Alex". An exercise name is short and
 * names a movement; these are long, or name the program itself.
 */
function isPreamble(line: string): boolean {
  const words = line.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  if (words >= 6) return true;
  if (/\b(?:program|programme|plan|split|routine|guide|challenge|phase|ebook|edition)\b/i.test(line)) return true;
  return /^by\s+\p{L}/iu.test(line.trim());
}

/**
 * A markdown table, which is what an answer pasted out of a chat window looks like.
 *
 *   | Day  | Exercise | Sets | Reps |
 *   |------|----------|------|------|
 *   | Push | Bench    | 4    | 8    |
 *
 * The pipes become the delimiter and the `|---|---|` rule is dropped. Without this the whole table read
 * as two exercises named after its own borders.
 */
function unwrapMarkdown(lines: string[]): string[] | null {
  const piped = lines.filter((l) => l.trim().startsWith('|'));
  if (piped.length < 2 || piped.length < lines.length - 1) return null;
  return piped
    .filter((l) => !/^[|\s:-]+$/.test(l))
    .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()).join('\t'));
}

// ── ONE ROW PER DAY, WITH THE WORK AS PROSE ─────────────────────────────────
//
// ══ WHY A SECOND TABLE READER ══
//
// The reader above assumes one row per EXERCISE, with Sets and Reps in their own columns. That is how a
// lifting program is kept. An endurance plan is kept the other way round — one row per DAY, with the
// whole session written as a sentence in one cell:
//
//   Week / Phase | Date       | Day    | Workout (swim / bike / run)                | Strength & Mobility
//   Week 1 — Base|            |        |                                            |
//   FALSE        | Mon, Jun 1 | Monday | 75min bike Z2 w/ 3x8min Z3 + 30min upper…   | UPPER: push-ups 3x10 • …
//
// There is no Exercise column and there never will be, because the cell holds three things. Read by the
// table reader this fell through to the freeform reader and produced ninety "exercises" with names like
// "75min bike Z2 w/ 3x8min Z3" at a fabricated 3 × 10.

/**
 * A DATE CELL — "Mon, Jun 1", "Jun 1", "6/1", "2026-06-01".
 *
 * Used with the weekday to decide where a row STARTS, which is what lets a cell containing a newline be
 * rejoined to the row it belongs to instead of becoming an exercise of its own.
 */
const DATE_CELL = /^(?:(?:mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)[a-z]*,?\s*)?(?:\d{1,4}[/-]\d{1,2}[/-]?\d{0,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{1,2})\b/i;

/** Columns that describe the row rather than prescribing work. Never read as content. */
const METADATA_HEADERS = /^(date|day|week|wk|phase|weekphase|esthrs|hrs|hours|esthours|time|completed|done|notes?)$/;

/** A content column whose work is lifting whatever words are in it — see `parseSessionCell`'s `strengthOnly`. */
const STRENGTH_HEADERS = /strength|mobility|lift|gym|accessor/;

/**
 * Find the header of a one-row-per-day sheet.
 *
 * ⚠ `findHeaderRow` CANNOT BE REUSED HERE: it rejects any row without an Exercise column, which is
 * exactly the row this shape of sheet has. Reusing it meant the session reader never ran at all and the
 * whole plan fell through to the freeform reader, which read each tab-joined row as one lift with a
 * fifty-word name.
 *
 * Deliberately demanding, so an exercise table with a mistyped header still gets the error that helps it
 * rather than being silently read a completely different way. It needs BOTH:
 *   · a Day or Date column, which is what makes it one-row-per-day; and
 *   · a cell somewhere below that genuinely reads as a session (`looksLikeSessionText`).
 */
function findSessionHeader(
  lines: readonly string[],
  delimiter: '\t' | ';' | ',',
): {
  index: number;
  cells: string[];
  dayAt: number | undefined;
  weekAt: number | undefined;
  columns: { index: number; strengthOnly: boolean }[];
} | null {
  for (let i = 0; i < Math.min(lines.length, HEADER_SCAN_LIMIT); i++) {
    const cells = splitLine(lines[i], delimiter);
    const norm = cells.map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));

    const dayAt = norm.findIndex((h) => h === 'day');
    const dateAt = norm.findIndex((h) => h === 'date');
    const weekAt = norm.findIndex((h) => h === 'week' || h === 'wk');
    if (dayAt < 0 && dateAt < 0) continue;

    const columns = norm
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => h && !METADATA_HEADERS.test(h))
      .map(({ h, idx }) => ({ index: idx, strengthOnly: STRENGTH_HEADERS.test(h) }));
    if (!columns.length) continue;

    /*
     * ⚠ THE "SPEAKS" CHECK SCANS EVERY CELL, NOT THE CANDIDATE COLUMNS.
     *
     * It used to look only under the columns the header named, which assumes the body lines up with the
     * header — and a real paste does not. The checkbox column in front of a Google Sheets plan does not
     * come across, so every data row sits one cell to the LEFT of its own header, and a cell-by-column
     * check found nothing but empties and declined the whole sheet.
     */
    const body = lines.slice(i + 1);
    const speaks = body.some((line) => splitLine(line, delimiter).some((c) => looksLikeSessionText(c)));
    if (speaks) {
      return {
        index: i,
        cells,
        dayAt: dayAt >= 0 ? dayAt : dateAt >= 0 ? dateAt : undefined,
        weekAt: weekAt >= 0 ? weekAt : undefined,
        columns,
      };
    }
  }
  return null;
}

function sessionItem(it: SessionItem): ParsedItem {
  /*
   * ⚠ A CARDIO BLOCK'S NAME IS DERIVED, NOT TAKEN FROM THE SHEET — and for consistency, not tidiness.
   * `build-session` renames every cardio block to `deriveName(activity, modality)` on its way into the
   * logger, and has since cardio existed. Keeping the prose would show "Z2 endurance (~38-42mi), rolling
   * terrain" in the builder and "Outdoor Ride" in the session, for one block. Derived HERE rather than at
   * `toProgramStructure` so the preview shows the name that will actually be created.
   *
   * The sentence is not lost. It is the coaching note, which every one of those surfaces draws.
   */
  const activity = it.activity as CardioActivity | undefined;
  const name =
    it.kind === 'cardio' && activity
      ? deriveName(activity, activity === 'swim' ? 'indoor' : 'outdoor')
      : it.name;

  return {
    name,
    // A cardio bout has no sets or reps. It carries one bout, and the targets say what it asks for.
    sets: it.kind === 'cardio' ? 1 : (it.sets ?? DEFAULT_SETS),
    reps: it.kind === 'cardio' ? 0 : (it.reps ?? DEFAULT_REPS),
    setsAssumed: it.kind !== 'cardio' && it.sets == null,
    repsAssumed: it.kind !== 'cardio' && it.reps == null,
    kind: it.kind,
    ...(it.activity ? { activity: it.activity } : {}),
    ...(it.kind === 'cardio' ? { targetSec: it.targetSec ?? null, targetMi: it.targetMi ?? null } : {}),
    note: it.note,
  };
}

/**
 * Read a one-row-per-day sheet.
 *
 * A day that parses to NOTHING is not added. That is how a rest day is meant to read — "Full Rest Day"
 * is the absence of a session, not a session with nothing in it — and it is what keeps a Monday-to-Sunday
 * plan inside the builder's six-day ceiling instead of losing a real training day to the slice.
 */
function parseSessionTable(
  lines: readonly string[],
  delimiter: '\t' | ';' | ',',
  headerAt: number,
  headerCells: readonly string[],
  columns: { index: number; strengthOnly: boolean }[],
  dayAt: number | undefined,
  weekAt?: number,
): ParseResult {
  const b = new Builder();
  let week = 1;
  let dayOrdinal = 0;
  const ignoredColumns = headerCells.filter(
    (h, i) => h && !columns.some((c) => c.index === i) && i !== dayAt && i !== weekAt,
  );

  /*
   * ══ REJOIN THE ROWS THE CLIPBOARD TORE APART ══
   *
   * ⚠ A SPREADSHEET CELL CAN CONTAIN A NEWLINE, and a plan's strength cell nearly always does. Copied
   * out, that newline is indistinguishable from a row break, so ONE row arrives as three or four
   * physical lines:
   *
   *   Mon, Jun 1⇥Monday⇥75min bike Z2 w/ 3x8min Z3 + 30min upper-body strength⇥
   *   UPPER: push-ups or DB bench 3x10 • 1-arm DB row 3x10/side • …
   *   1.8⇥
   *
   * Read literally, that is a day, a lift called "UPPER: …", and a lift called "1.8". A row STARTS at a
   * date or a weekday, so anything else is a continuation of the row above it — and a line whose
   * predecessor already ends in a delimiter simply extends into the next cell.
   */
  const rows: string[] = [];
  for (const line of lines.slice(headerAt + 1)) {
    const startsRow =
      weekHeading(line.trim()) != null ||
      splitLine(line, delimiter).slice(0, 2).some((c) => weekdayKey(c) != null || DATE_CELL.test(c.trim()));
    if (!rows.length || startsRow) {
      rows.push(line);
      continue;
    }
    const prev = rows[rows.length - 1];
    rows[rows.length - 1] = prev.endsWith(delimiter) ? prev + line : prev + delimiter + line;
  }

  /*
   * ══ AND LINE THE BODY UP WITH ITS OWN HEADER ══
   *
   * ⚠ THE HEADER AND THE DATA DO NOT AGREE ON WHICH COLUMN IS WHICH. A plan with a checkbox column in
   * front of it copies WITHOUT that column — the boxes are a control, not a value — so every data row
   * sits one cell to the LEFT of the header that names it. Reading `Workout` at the header's index gave
   * the Day cell for the whole sheet.
   *
   * The WEEKDAY is the anchor, because every data row has one and only one: wherever "Monday" actually
   * sits tells us how far the body has shifted. Measured once, from the first row that has one, and
   * applied to every header index after that — so the header keeps deciding which column MEANS what
   * (including which one is strength) and only the arithmetic is corrected.
   */
  let offset: number | null = null;
  for (const line of rows) {
    // A cell that IS a weekday — not a date that starts with one ("Mon, Jun 1"), which sits in its own column.
    const at = splitLine(line, delimiter).findIndex((c) => weekdayKey(c) != null && !DATE_CELL.test(c.trim()));
    if (at >= 0 && dayAt !== undefined) {
      offset = at - dayAt;
      break;
    }
  }
  const shift = offset ?? 0;
  const dataAt = (headerIndex: number) => headerIndex + shift;

  for (const line of rows) {
    const cells = splitLine(line, delimiter);

    /*
     * A WEEK BANNER, anywhere on the row. These sheets put it in the first column beside the checkbox,
     * so there is no Week column to read — "Week 3 — Base Peak + Rehab" simply appears where "FALSE" is
     * on every other row. Its phase note ("No running • building bike volume") is a description of the
     * week and not work, so the whole row is skipped rather than read.
     */
    let banner = false;
    for (const cell of cells) {
      const wk = weekHeading(cell.trim());
      if (wk != null) {
        week = wk;
        // A new week starts its own days, so the fallback "Day 1" naming restarts with it.
        dayOrdinal = 0;
        banner = true;
        break;
      }
    }
    if (banner) continue;

    /*
     * A WEEK COLUMN. It was treated as metadata and never read, so a two-week running table filed week 2's
     * runs as more days of week 1 (stress test, 2026-09-21). Read like the banner: a new number is a new week.
     */
    const wkCell = weekAt !== undefined ? firstNumber(cells[dataAt(weekAt)]) : undefined;
    if (wkCell != null && wkCell !== week) {
      week = wkCell;
      dayOrdinal = 0;
    }

    const items = columns.flatMap(({ index, strengthOnly }) =>
      (!strengthOnly ? cardioItems(cells[dataAt(index)] ?? '') : null) ??
        parseSessionCell(cells[dataAt(index)] ?? '', { strengthOnly }).map(sessionItem),
    );
    if (!items.length) continue;

    const rawDay = dayAt !== undefined ? (cells[dataAt(dayAt)] ?? '') : '';
    const dayName = cleanDayName(rawDay.trim() || `Day ${dayOrdinal + 1}`);
    dayOrdinal += 1;
    // Keyed by ORDINAL, not by name: a plan runs Monday to Saturday every week, and keying by name would
    // fuse week 2's Monday into week 1's.
    for (const it of items) b.add(week, `${week}:${dayOrdinal}`, dayName, it);
  }

  if (b.rowsRead === 0) {
    return { ok: false, error: 'No sessions found. Check that the workout column has text in it.' };
  }
  return { ok: true, weeks: b.done(), ignoredColumns, rowsRead: b.rowsRead };
}

/** "Day 1", "Push", "Upper A" — the labels a column-per-day sheet puts in its header row. */
const DAYISH = /^(?:day|d|workout|session|w)\s*\d+|^(push|pull|legs?|upper|lower|chest|back|arms?|shoulders?|full\s*body|rest)\b/i;

/**
 * A sheet with ONE COLUMN PER DAY, which is how a great many coaches lay a week out.
 *
 *   Day 1        Day 2       Day 3
 *   Bench 4x8    Squat 5x5   Row 4x8
 *
 * There is no Exercise column because every column is exercises. Read row-wise it produced one absurd
 * lift per line — "Bench Squat 5x5 Row 4x8" — so it is transposed instead: each column becomes a day,
 * each cell in it an exercise.
 */
function parseColumnPerDay(lines: string[], delimiter: '\t' | ';' | ','): ParseResult | null {
  /*
   * ⚠ THE DAY ROW IS SEARCHED FOR, NOT ASSUMED TO BE LINE ONE. A designed PDF (Canva, a coach's
   * template) sets two days side by side under a title — "SUMMER SHRED — 4 DAY SPLIT", then "DAY 1 -
   * PUSH⇥DAY 2 - PULL". Only line one was tried, so the columns were read across and a day came out with
   * lifts called "Bench Press Deadlift" (stress test, 2026-09-21). The lines above the day row are the
   * title; they are listed as skipped.
   */
  const isDayRow = (line: string) => {
    const cells = splitLine(line, delimiter);
    const dayish = cells.filter((h) => h && DAYISH.test(h)).length;
    return dayish >= 2 && dayish >= cells.filter(Boolean).length - 1;
  };
  const at = lines.slice(0, 10).findIndex(isDayRow);
  if (at < 0) return null;
  const header = splitLine(lines[at], delimiter);
  const dayCols = header.map((h, i) => [i, h] as const).filter(([, h]) => h && DAYISH.test(h));

  const b = new Builder();
  for (const [col, label] of dayCols) {
    for (const line of lines.slice(at + 1)) {
      const cell = (splitLine(line, delimiter)[col] ?? '').trim();
      if (!cell) continue;
      const { scheme, rest } = extractScheme(cell);
      const name = cleanExerciseName(rest || cell);
      if (name) b.add(1, label, cleanDayName(label), item(name, scheme.sets, scheme.reps));
    }
  }
  return b.rowsRead ? { ok: true, weeks: b.done(), ignoredColumns: [], rowsRead: b.rowsRead, skipped: lines.slice(0, at) } : null;
}

/** Read one row as a header: which known column sits where, first match wins, no column claimed twice. */
function matchColumns(headerCells: string[]) {
  const header = headerCells.map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  const at: Partial<Record<ColumnKey, number>> = {};
  const used = new Set<number>();
  for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
    const i = header.findIndex((h, idx) => !used.has(idx) && (COLUMNS[key] as readonly string[]).includes(h));
    if (i >= 0) {
      at[key] = i;
      used.add(i);
    }
  }
  return { header, at, used };
}

/**
 * WHERE THE HEADER ROW ACTUALLY IS.
 *
 * It was assumed to be the first line, and a real training sheet almost never puts it there. A coach's
 * week opens with a title ("WEEK 1"), a phase banner, a running prescription block — and only then the
 * Section / Exercise / Sets × Reps row that names the columns.
 *
 * Assuming line one meant the Exercise column was never found, so the whole sheet fell through to the
 * freeform reader — which does not split cells. Every tab-joined row became ONE exercise whose name was
 * the entire row: "Barbell bench press –10 RPE 6–7 3-1-2 tempo. Control the eccentric… ☐* Last 160 x 8".
 * Nothing matched the catalogue, and nothing could.
 *
 * So the header is SEARCHED for instead. Two guards keep the search from inventing one:
 *
 *   - it must have an Exercise column, because that is the column the table reader is built around;
 *   - it must match at least TWO known columns, so a typed-out workout with a line reading "Name" or
 *     "Lift" is not mistaken for a header and everything above it silently discarded.
 *
 * Earliest wins a tie: a sheet repeating its header per block should key off the first one.
 */
const HEADER_SCAN_LIMIT = 25;

function findHeaderRow(lines: string[], delimiter: '\t' | ';' | ',') {
  let best: { index: number; cells: string[]; columns: ReturnType<typeof matchColumns> } | null = null;
  for (let i = 0; i < Math.min(lines.length, HEADER_SCAN_LIMIT); i++) {
    const cells = splitLine(lines[i], delimiter);
    const columns = matchColumns(cells);
    if (columns.at.exercise === undefined || columns.used.size < 2) continue;
    if (!best || columns.used.size > best.columns.used.size) best = { index: i, cells, columns };
  }
  return best;
}

export function parseProgramTable(raw: string): ParseResult {
  let lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  lines = unwrapMarkdown(lines) ?? lines;

  if (lines.length === 0) return { ok: false, error: 'Nothing to read — paste some rows first.' };

  const delimiter = detectDelimiter(lines);

  // The header is searched for, not assumed — a real sheet buries it under a title and a phase banner.
  const found = findHeaderRow(lines, delimiter);
  const headerAt = found?.index ?? 0;
  const headerCells = found?.cells ?? splitLine(lines[0], delimiter);
  const { header, at, used } = found?.columns ?? matchColumns(headerCells);

  /*
   * No Exercise column means this is not a table — it is a workout somebody typed out. Falling through
   * to the freeform reader rather than refusing is the difference between "import from a spreadsheet"
   * and "import, but only if you already keep a spreadsheet".
   */
  if (at.exercise === undefined) {
    // Every column is exercises — no Exercise column because there is no room for one.
    const transposed = parseColumnPerDay(lines, delimiter);
    if (transposed) return transposed;

    /*
     * ONE ROW PER DAY, WITH THE SESSION AS PROSE. Tried before the "name your Exercise column" error,
     * because for this shape of sheet that advice is wrong: there is no column to name — the cell holds
     * a whole session. `findSessionHeader` does its own search and is strict about what qualifies, so a
     * nearly-right exercise table still gets the error that helps it.
     */
    const session = findSessionHeader(lines, delimiter);
    if (session) {
      return parseSessionTable(lines, delimiter, session.index, session.cells, session.columns, session.dayAt, session.weekAt);
    }

    /*
     * Two very different things arrive here, and telling them apart is the whole job.
     *
     * A header row that matched OTHER known columns is a TABLE whose Exercise column is missing or
     * named something unexpected — the athlete meant to paste a spreadsheet and it is nearly right, so
     * say what is wrong. Anything else is a typed-out workout that never had columns, and refusing it
     * would make this "import from a spreadsheet, but only if you already keep a spreadsheet".
     */
    if (used.size >= 2) {
      return {
        ok: false,
        error: 'Found your other columns but not an Exercise one. Name that column Exercise (or Movement, or Lift) and try again.',
      };
    }
    return parseFreeform(lines);
  }

  if (lines.length === headerAt + 1) {
    return { ok: false, error: 'That looks like a header row on its own. Include the exercise rows beneath it.' };
  }

  const ignoredColumns = headerCells.filter((_, i) => !used.has(i) && header[i]);
  const b = new Builder();

  /*
   * MERGED CELLS. Real sheets fill Week and Day once per block and leave the rest blank — it is what
   * merging cells looks like once it reaches a clipboard. Reading a blank as "no value" put every
   * continuation row into a fabricated "Day 1", quietly splitting one training day into two. The last
   * seen value carries forward, which is what the blank means.
   */
  let week = 1;
  let day = 'Day 1';
  /*
   * MULTI-WEEK SHEETS REPEAT THEIR WHOLE PREAMBLE.
   *
   * Week 2 does not begin at its exercises — it begins at a "WEEK 2" banner, a phase line, a running
   * prescription block and its own copy of the header row, exactly as week 1 did. Only week 1's preamble
   * sits above the header and is skipped by starting there; every later week's lands in the BODY, where
   * the running block's second cell ("20–25 min Z2") falls under Exercise and imported as a lift.
   *
   * So a week banner opens a preamble, and the header row or the first day banner closes it. Rows inside
   * one are dropped ONLY when they carry no prescription, so a week whose sheet dispenses with the
   * repeated header and goes straight to work still keeps that work.
   */
  let inPreamble = false;

  /** "Exercise" / "Movement" / "Lift" in the Exercise column — a repeat of the header, not a lift. */
  const isHeaderWord = (s: string) =>
    (COLUMNS.exercise as readonly string[]).includes(s.toLowerCase().replace(/[^a-z]/g, ''));

  for (const line of lines.slice(headerAt + 1)) {
    const cells = splitLine(line, delimiter);

    const rawName = (cells[at.exercise] ?? '').trim();
    if (!rawName) {
      /*
       * A row with no exercise on it is not always a spacer. A sheet banners its STRUCTURE across whole
       * rows — "WEEK 2", "MONDAY — Upper Strength + Zone 2" — with every other cell blank, and reading
       * those as spacers welded four training days into one day of fifty lifts.
       *
       * Section labels ride the same column and must NOT become days; `dayHeadingRow` is strict about
       * that. Anything else here really is a spacer or a notes row, which every real sheet has.
       */
      for (const cell of cells) {
        const wk = weekHeading(cell.trim());
        if (wk != null) {
          week = wk;
          inPreamble = true;
          break;
        }
      }
      const heading = dayHeadingRow(cells);
      if (heading) {
        day = cleanDayName(heading);
        inPreamble = false;
      }
      continue;
    }

    /*
     * A banner does not always miss the Exercise column. These sheets are laid out by eye, and week 2's
     * banner was indented one cell further than week 1's — so "WEEK 2" arrived AS the exercise name, the
     * week never advanced, and three weeks imported as two with week 2's work folded into week 1.
     *
     * Only `rawName` is examined here, never the whole row: a coaching note reading "Monday and Thursday
     * only" would otherwise turn a real lift into a heading and silently drop it.
     */
    const bannerWeek = weekHeading(rawName);
    const bannerDay = dayHeadingRow([rawName]);
    if (bannerWeek != null || bannerDay) {
      if (bannerWeek != null) {
        week = bannerWeek;
        inPreamble = true;
      }
      if (bannerDay) {
        day = cleanDayName(bannerDay);
        inPreamble = false;
      }
      continue;
    }

    // The header, come round again for the next week.
    if (isHeaderWord(rawName)) {
      inPreamble = false;
      continue;
    }

    /*
     * "Tuesday | Rest" — a rest day on a row of its own. It imported as an exercise called "Rest" at
     * 3×10, which turned every rest day into a training day (stress test, 2026-09-21). Nothing is created;
     * the Day cell still moves on, so a blank-Day row below is not filed under the day before.
     */
    if (isRestEntry(cleanExerciseName(rawName))) {
      const restDay = at.day !== undefined ? (cells[at.day] ?? '').trim() : '';
      if (restDay) day = restDay;
      continue;
    }

    const wkCell = at.week !== undefined ? firstNumber(cells[at.week]) : undefined;
    if (wkCell != null) week = wkCell;

    const dayCell = at.day !== undefined ? (cells[at.day] ?? '').trim() : '';
    if (dayCell) day = dayCell;

    let sets = at.sets !== undefined ? firstNumber(cells[at.sets]) : undefined;
    let reps = at.reps !== undefined ? firstNumber(cells[at.reps]) : undefined;

    // A single "Sets x Reps" column, when that is how the sheet keeps it.
    if ((sets == null || reps == null) && at.scheme !== undefined) {
      const fromScheme = extractScheme(cells[at.scheme] ?? '').scheme;
      sets = sets ?? fromScheme.sets;
      reps = reps ?? fromScheme.reps;
    }

    /*
     * And last: "Bench Press 3x8" typed into the exercise cell itself.
     *
     * ONLY when a column has not already answered. The scheme reader cannot tell a prescription from a
     * number that is part of a lift's NAME — it read "Hip-90/90 mobility" as ninety sets of ninety and
     * handed back "Hip- mobility" — so a sheet that keeps its sets and reps in a proper column must not
     * have its names rewritten on the strength of a second opinion nobody asked for. And the name is
     * only ever trimmed when a scheme genuinely came out of it.
     */
    let named = rawName;
    if (sets == null || reps == null) {
      const { scheme: inName, rest } = extractScheme(rawName);
      if (sets == null) sets = inName.sets;
      if (reps == null) reps = inName.reps;
      if (inName.sets != null || inName.reps != null) named = rest || rawName;
    }

    /*
     * Furniture inside a repeated preamble: the running prescription block, a phase note. It has text in
     * the Exercise column but prescribes nothing, and outside a preamble the very same shape is a real
     * item the sheet simply did not put numbers on — a Zone 2 run — which must still import.
     */
    if (inPreamble && sets == null && reps == null) continue;

    const name = cleanExerciseName(named);
    if (!name) continue;
    b.add(week, day, day, item(name, sets, reps));
  }

  if (b.rowsRead === 0) {
    return { ok: false, error: 'No exercises found. Check that the Exercise column has names in it.' };
  }
  return { ok: true, weeks: b.done(), ignoredColumns, rowsRead: b.rowsRead };
}

/** "3 weeks · 4 days each · 48 exercises" — the design's "Here's what we read". */
export function summarize(weeks: readonly ParsedWeek[]): string {
  const items = weeks.reduce((n, w) => n + w.days.reduce((m, d) => m + d.items.length, 0), 0);
  const dayCounts = [...new Set(weeks.map((w) => w.days.length))];
  const days = dayCounts.length === 1 ? `${dayCounts[0]} day${dayCounts[0] === 1 ? '' : 's'} each` : 'varying days';
  const wk = `${weeks.length} week${weeks.length === 1 ? '' : 's'}`;
  return `${wk} · ${days} · ${items} exercise${items === 1 ? '' : 's'}`;
}

/** True when every week holds the same days and the same work — so the program can repeat one week. */
export function weeksAreIdentical(weeks: readonly ParsedWeek[]): boolean {
  if (weeks.length < 2) return true;
  const shape = (w: ParsedWeek) =>
    JSON.stringify(w.days.map((d) => [d.name, d.items.map((i) => [i.name, i.sets, i.reps])]));
  const first = shape(weeks[0]);
  return weeks.every((w) => shape(w) === first);
}

// ── into a program ──────────────────────────────────────────────────────────

/** The builder's persisted shape. Structural only — this module never imports the catalogue. */
export interface ImportedExercise {
  name: string;
  catalogKey?: string;
  sets: number;
  reps: number;
  /** Set only for a session-table import — see `ParsedItem`. Absent means an ordinary lift. */
  kind?: 'strength' | 'cardio';
  activity?: CardioActivity;
  targetSec?: number | null;
  targetMi?: number | null;
  /** The coach's own sentence, carried onto the exercise so nothing the parser could not hold is lost. */
  coachNote?: string | null;
}
export interface ImportedDay {
  letter: string;
  name: string;
  warmup: ImportedExercise[];
  main: ImportedExercise[];
  cooldown: ImportedExercise[];
}
export interface ImportedStructure {
  name: string;
  weeks: number;
  daysPerWeek: number;
  vary: boolean;
  days: ImportedDay[];
  weekPlans: { days: ImportedDay[] }[] | null;
}

/**
 * Turn a parsed table into the structure the builder persists.
 *
 * ══ EVERYTHING LANDS IN `main` ══
 *
 * A spreadsheet has no warm-up column. Splitting the rows by guessing which look like warm-ups — the
 * light ones, the ones with "mobility" in the name — would file an athlete's actual work under a heading
 * they never chose, and warm-ups are excluded from PR detection, so the guess would quietly change what
 * counts as a record. They can move anything in the builder afterwards; the import puts it where they
 * put it.
 *
 * ══ AND IT NEVER INVENTS A CATALOGUE MATCH ══
 *
 * `resolveKey` is exact-match only. A row that resolves gains a `catalogKey` and everything keyed off
 * one — the exercise's detail page, its substitutions, its equipment, its honors. A row that does not
 * stays a plain name and works perfectly well as one. What must not happen is "Bench" quietly becoming
 * Barbell Bench Press, because then the athlete's log says they did something they did not.
 */
export function toProgramStructure(
  weeks: readonly ParsedWeek[],
  programName: string,
  resolveKey: (name: string) => string | undefined,
): ImportedStructure {
  const toDay = (d: ParsedDay): ImportedDay => ({
    letter: d.letter,
    name: d.name,
    warmup: [],
    main: d.items.map((i) => {
      /*
       * A CARDIO BOUT IS NOT LOOKED UP IN THE CATALOGUE. Its `catalogKey` is the `cardio:<activity>`
       * convention the rest of the app already round-trips through, and searching "bike Z2" among 794
       * lifts could only ever produce a wrong answer or none.
       */
      if (i.kind === 'cardio' && i.activity) {
        // `i.name` is already the derived block name — see `sessionItem`.
        return {
          name: i.name,
          catalogKey: `cardio:${i.activity}`,
          sets: 1,
          reps: 0,
          kind: 'cardio' as const,
          activity: i.activity,
          targetSec: i.targetSec ?? null,
          targetMi: i.targetMi ?? null,
          coachNote: i.note ?? null,
        };
      }
      const key = resolveKey(i.name);
      const base = { name: i.name, sets: i.sets, reps: i.reps, ...(i.note ? { coachNote: i.note } : {}) };
      return key ? { ...base, catalogKey: key } : base;
    }),
    cooldown: [],
  });

  const vary = !weeksAreIdentical(weeks);
  const plans = weeks.map((w) => ({ days: w.days.map(toDay) }));

  return {
    name: programName.trim() || 'Imported Program',
    weeks: Math.max(1, weeks.length),
    // The widest week, so a program whose week 3 adds a fourth day still has room for it.
    daysPerWeek: Math.max(1, ...weeks.map((w) => w.days.length)),
    vary,
    // `days` is the repeating template; when weeks vary it is week 1, which is what the builder opens on.
    days: plans[0]?.days ?? [],
    weekPlans: vary ? plans : null,
  };
}

/** Names the sheet used that the catalogue does not know — shown so nothing is silently unmatched. */
export function unmatchedNames(
  weeks: readonly ParsedWeek[],
  resolveKey: (name: string) => string | undefined,
): string[] {
  const out = new Set<string>();
  // A cardio bout is never looked up (see `toProgramStructure`), so it is never "not in the library" —
  // counting "Outdoor Run" here told a runner their runs had not been recognised.
  for (const w of weeks) for (const d of w.days) for (const i of d.items) if (i.kind !== 'cardio' && !resolveKey(i.name)) out.add(i.name);
  return [...out];
}
