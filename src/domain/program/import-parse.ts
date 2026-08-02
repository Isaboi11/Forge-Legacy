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

/** Header aliases. Deliberately short — a guess this list gets wrong silently mis-imports a program. */
const COLUMNS = {
  week: ['week', 'wk'],
  day: ['day', 'session', 'workout'],
  exercise: ['exercise', 'movement', 'lift', 'name'],
  sets: ['sets', 'set'],
  reps: ['reps', 'rep', 'repetitions'],
} as const;

type ColumnKey = keyof typeof COLUMNS;

/**
 * Split one line into cells.
 *
 * TAB FIRST, because that is what Excel and Google Sheets put on the clipboard, and a sheet whose cells
 * contain commas ("Row, then press") would otherwise shatter into nonsense. A pasted table is the
 * headline case in the design's copy; an uploaded .csv is the secondary one.
 */
function splitLine(line: string, delimiter: '\t' | ','): string[] {
  if (delimiter === '\t') return line.split('\t').map((c) => c.trim());

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

/** Tabs win when present: a single stray comma inside a cell must not re-interpret the whole table. */
function detectDelimiter(lines: string[]): '\t' | ',' {
  return lines.some((l) => l.includes('\t')) ? '\t' : ',';
}

/**
 * The first number in a cell.
 *
 * Training sheets write ranges and instructions, not integers: "8-10", "8–10" (en dash), "3 x 8",
 * "AMRAP", "8+". Taking the first number reads the lower bound of a range, which is the honest floor —
 * and anything with no number at all falls back to the default and says it did.
 */
function firstNumber(cell: string | undefined): number | null {
  if (!cell) return null;
  const m = cell.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function parseProgramTable(raw: string): ParseResult {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { ok: false, error: 'Nothing to read — paste some rows first.' };
  if (lines.length === 1) {
    return { ok: false, error: 'That looks like a header row on its own. Include the exercise rows beneath it.' };
  }

  const delimiter = detectDelimiter(lines);
  const header = splitLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));

  const at: Partial<Record<ColumnKey, number>> = {};
  const used = new Set<number>();
  for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
    const i = header.findIndex((h, idx) => !used.has(idx) && (COLUMNS[key] as readonly string[]).includes(h));
    if (i >= 0) {
      at[key] = i;
      used.add(i);
    }
  }

  // Exercise is the only column with nothing sensible to fall back to — every other one has a default.
  if (at.exercise === undefined) {
    return {
      ok: false,
      error: 'Couldn’t find an Exercise column. Add a header row with Week, Day, Exercise, Sets and Reps — in any order.',
    };
  }

  const ignoredColumns = splitLine(lines[0], delimiter).filter((_, i) => !used.has(i) && header[i]);

  /** Weeks keyed by their number, days keyed by name within a week — both in first-appearance order. */
  const weeks = new Map<number, Map<string, ParsedItem[]>>();
  let rowsRead = 0;

  for (const line of lines.slice(1)) {
    const cells = splitLine(line, delimiter);
    const name = (cells[at.exercise] ?? '').trim();
    if (!name) continue; // a spacer row between blocks, which sheets are full of

    const weekNo = (at.week !== undefined ? firstNumber(cells[at.week]) : null) ?? 1;
    const dayName = (at.day !== undefined ? (cells[at.day] ?? '').trim() : '') || 'Day 1';

    const setsRaw = at.sets !== undefined ? firstNumber(cells[at.sets]) : null;
    const repsRaw = at.reps !== undefined ? firstNumber(cells[at.reps]) : null;

    if (!weeks.has(weekNo)) weeks.set(weekNo, new Map());
    const days = weeks.get(weekNo)!;
    if (!days.has(dayName)) days.set(dayName, []);
    days.get(dayName)!.push({
      name,
      sets: setsRaw ?? DEFAULT_SETS,
      reps: repsRaw ?? DEFAULT_REPS,
      setsAssumed: setsRaw == null,
      repsAssumed: repsRaw == null,
    });
    rowsRead++;
  }

  if (rowsRead === 0) {
    return { ok: false, error: 'No exercises found. Check that the Exercise column has names in it.' };
  }

  const out: ParsedWeek[] = [...weeks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, days]) => ({
      index,
      days: [...days.entries()].map(([dayName, items], i) => ({
        name: dayName,
        letter: LETTERS[i] ?? String(i + 1),
        items,
      })),
    }));

  return { ok: true, weeks: out, ignoredColumns, rowsRead };
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
