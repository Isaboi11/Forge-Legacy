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

import {
  afterWeekHeading,
  loadedSetReps,
  cleanDayName,
  cleanExerciseName,
  extractScheme,
  firstNumber,
  looksLikeDayHeading,
  weekHeading,
} from './import-scheme.ts';

export interface ParsedItem {
  /** Verbatim from the sheet. Never normalised, never corrected. */
  name: string;
  sets: number;
  reps: number;
  /** True when the sheet did not say, so the preview can show the athlete what it filled in. */
  setsAssumed: boolean;
  repsAssumed: boolean;
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
  | { ok: true; weeks: ParsedWeek[]; ignoredColumns: string[]; rowsRead: number }
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
  private weeks = new Map<number, Map<string, ParsedItem[]>>();
  rowsRead = 0;

  add(week: number, day: string, item: ParsedItem) {
    if (!this.weeks.has(week)) this.weeks.set(week, new Map());
    const days = this.weeks.get(week)!;
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push(item);
    this.last = item;
    this.rowsRead++;
  }

  /** The item added most recently, so a loaded-set line can extend it. */
  last: ParsedItem | null = null;

  done(): ParsedWeek[] {
    return [...this.weeks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, days]) => ({
        index,
        days: [...days.entries()].map(([name, items], i) => ({
          name,
          letter: LETTERS[i] ?? String(i + 1),
          items,
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

  /*
   * Read every line's scheme up front, because deciding what a line IS needs its neighbours.
   *
   * "Push" on its own is a heading. So are "Legs", "Core", "Pull" and "Push Day" — none of which match
   * any keyword, none of which shout in capitals, and all of which used to import as an exercise at an
   * invented 3×10 while the day they were naming never got created. Whether a bare line is a heading is
   * not a property of the line; it is a property of where it SITS.
   */
  const rows = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const wk = weekHeading(line);
      const { scheme, rest } = extractScheme(line);
      return { line, wk, scheme, rest, hasScheme: scheme.sets != null || scheme.reps != null };
    });

  /** Scheme-only lines already claimed by the exercise named above them. */
  const consumed = new Set<(typeof rows)[number]>();

  rows.forEach((row, i) => {
    if (consumed.has(row)) return;
    if (row.wk != null) {
      week = row.wk;
      day = null; // a new week starts its own days
      /*
       * "Week 1: Squat 5x5" carries work on the heading line. Consuming the whole line discarded it —
       * and for a program written one week per line, discarded every exercise in the program and then
       * reported that it found none.
       */
      const rest = afterWeekHeading(row.line);
      if (rest) {
        const { scheme, rest: named } = extractScheme(rest);
        const name = cleanExerciseName(named || rest);
        if (name) b.add(week, day ?? 'Day 1', item(name, scheme.sets, scheme.reps));
      }
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
        if (name) b.add(week, day ?? 'Day 1', item(name, next.scheme.sets, next.scheme.reps));
        consumed.add(next);
        return;
      }

      const atBoundary = next?.hasScheme === true && (prev == null || prev.hasScheme);
      if (looksLikeDayHeading(row.line) || atBoundary) {
        day = cleanDayName(row.line);
        return;
      }
    }

    const name = cleanExerciseName(row.rest || row.line);
    if (!name) return;
    b.add(week, day ?? 'Day 1', item(name, row.scheme.sets, row.scheme.reps));
  });

  if (b.rowsRead === 0) {
    return { ok: false, error: 'No exercises found. Write one per line, like “Bench Press 3x8”.' };
  }
  return { ok: true, weeks: b.done(), ignoredColumns: [], rowsRead: b.rowsRead };
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
  const header = splitLine(lines[0], delimiter);
  const dayCols = header.map((h, i) => [i, h] as const).filter(([, h]) => h && DAYISH.test(h));
  if (dayCols.length < 2 || dayCols.length < header.filter(Boolean).length - 1) return null;

  const b = new Builder();
  for (const [col, label] of dayCols) {
    for (const line of lines.slice(1)) {
      const cell = (splitLine(line, delimiter)[col] ?? '').trim();
      if (!cell) continue;
      const { scheme, rest } = extractScheme(cell);
      const name = cleanExerciseName(rest || cell);
      if (name) b.add(1, cleanDayName(label), item(name, scheme.sets, scheme.reps));
    }
  }
  return b.rowsRead ? { ok: true, weeks: b.done(), ignoredColumns: [], rowsRead: b.rowsRead } : null;
}

export function parseProgramTable(raw: string): ParseResult {
  let lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  lines = unwrapMarkdown(lines) ?? lines;

  if (lines.length === 0) return { ok: false, error: 'Nothing to read — paste some rows first.' };

  const delimiter = detectDelimiter(lines);
  const headerCells = splitLine(lines[0], delimiter);
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

  if (lines.length === 1) {
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

  for (const line of lines.slice(1)) {
    const cells = splitLine(line, delimiter);

    const rawName = (cells[at.exercise] ?? '').trim();
    if (!rawName) continue; // a spacer or a notes row, which every real sheet has

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

    // And last: "Bench Press 3x8" typed into the exercise cell itself.
    const { scheme: inName, rest } = extractScheme(rawName);
    if (sets == null) sets = inName.sets;
    if (reps == null) reps = inName.reps;

    const name = cleanExerciseName(rest || rawName);
    if (!name) continue;
    b.add(week, day, item(name, sets, reps));
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
      const key = resolveKey(i.name);
      return key ? { name: i.name, catalogKey: key, sets: i.sets, reps: i.reps } : { name: i.name, sets: i.sets, reps: i.reps };
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
  for (const w of weeks) for (const d of w.days) for (const i of d.items) if (!resolveKey(i.name)) out.add(i.name);
  return [...out];
}
