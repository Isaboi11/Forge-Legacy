/**
 * A WORKOUT CARD, READ BY THE WRITTEN READER → THE IMPORT PREVIEW'S WEEKS (PO 2026-09-30).
 *
 * "Shouldn't this be the same card reader as when I put it in … Build a Program? That should be going through AI as
 * well." A photographed card reaches Build a Program, Build a Template, Home's "Paste a workout" and Holt's chat
 * through the same path the squad screen uses — the whole-card read, the AI layout, `checkAiRewrite`, and the
 * written reader (`written-workout.ts`). That reader returns template rows; the import screens preview and create
 * from `ParsedWeek[]`. This is the one conversion between them, and it loses nothing: what sets × reps cannot say
 * — a per-set ramp, percentages, the rest between sets, a superset — rides in `ParsedItem.rx`.
 *
 * Pure, relative imports: tested under `node --test` (`written-import.test.mjs`).
 */
import type { ImportRx, ParsedDay, ParsedItem, ParsedWeek } from './import-parse.ts';
import { readWrittenWorkout, rowsToWrittenText, writtenToTemplate, type WrittenTemplateRow, type WrittenWorkout } from '../workout/written-workout.ts';

/**
 * "20 seconds each set" (the reader's words) or "20 seconds" (the AI layout's note, on both live runs) — a hold, which
 * the import holds as a clock. Only on a lift with no rep count.
 */
const HOLD = /^(\d{1,3})\s*(s|secs?|seconds?|mins?|minutes?)\b(?:\s+each\s+set)?[.,;]?\s*(.*)$/i;

/**
 * IM-1 (Sprint 3): "F-F-F reps" under a lift with no rep count of its own — every set to failure, one F per set (the
 * Bridger Logan cards; the AI layout keeps it as a note). Only a whole ladder of F's; "10-10-10-F" stays the
 * author's words. "to failure" / "AMRAP" in the note does the same, with the lift's own set count.
 */
const ALL_F = /^\s*(F(?:\s*[-–]\s*F){1,19})\s*reps?\.?\s*$/i;
const TO_FAILURE_WORDS = /\b(?:(?:to|till?|until)\s+failure|amrap|max\s+reps|as\s+many\s+(?:reps\s+)?as\s+possible)\b/i;

function failureFromNote(note: string, sets: number): { sets: number; note: string } | null {
  const parts = note.split(' · ').map((x) => x.trim()).filter(Boolean);
  const at = parts.findIndex((x) => ALL_F.test(x));
  if (at >= 0) return { sets: ALL_F.exec(parts[at])![1].split(/[-–]/).length, note: parts.filter((_, i) => i !== at).join(' · ') };
  if (parts.some((x) => TO_FAILURE_WORDS.test(x))) return { sets, note: parts.join(' · ') };
  return null;
}

export function writtenToWeeks(w: WrittenWorkout, rows: readonly WrittenTemplateRow[]): { weeks: ParsedWeek[]; skipped: string[] } {
  const items: ParsedItem[] = rows.map((r) => {
    /* A timed hold becomes a timed set — the preview steps its clock and the logger times it. The words that said
       so come out of the note; any other words the card had stay. */
    const noteParts = (r.coachNote ?? '').split(' · ').map((s) => s.trim()).filter(Boolean);
    /* "20 seconds, Cardio "Scary Arms" superset all 3" and "Cardio "Scary Arms", 20 seconds" (two live runs' notes):
       the clock is whichever comma-separated piece is ONLY a time; the rest of the words stay. */
    const pieces = noteParts.flatMap((s) => s.split(/,\s*/)).map((s) => s.trim()).filter(Boolean);
    const at = r.targetReps === 0 && !r.repScheme?.length ? pieces.findIndex((s) => HOLD.test(s) && !HOLD.exec(s)![3]) : -1;
    const hold = at >= 0 ? HOLD.exec(pieces[at]) : null;
    const durationSec = hold ? Number(hold[1]) * (/^m/i.test(hold[2]) ? 60 : 1) : undefined;
    const plain = hold ? pieces.filter((_, i) => i !== at).join(', ') : noteParts.join(' · ');
    /* A counted lift with no reps of its own whose note says every set goes to failure (IM-1). */
    const failure = !hold && r.targetReps === 0 && !r.repScheme?.length ? failureFromNote(plain, r.sets) : null;
    const note = failure ? failure.note : plain;

    const rx: ImportRx = {
      ...(r.catalogKey ? { catalogKey: r.catalogKey } : null),
      ...(r.repScheme?.length ? { repScheme: r.repScheme } : null),
      ...(r.repsMax != null ? { repsMax: r.repsMax } : null),
      ...(r.percentOfMax != null ? { percentOfMax: r.percentOfMax } : null),
      ...(r.percentScheme?.length ? { percentScheme: r.percentScheme } : null),
      ...(r.percentOf ? { percentOf: r.percentOf } : null),
      ...(r.restSec != null ? { restSec: r.restSec } : null),
      ...(r.restScheme?.length ? { restScheme: r.restScheme } : null),
      ...(r.groupId ? { groupId: r.groupId, groupKind: 'superset' as const } : null),
    };
    return {
      name: r.name,
      sets: failure ? failure.sets || r.sets : r.repScheme?.length || r.sets,
      reps: r.targetReps,
      ...(failure ? { toFailure: true } : null),
      /* Every number here is the card's, read and checked — nothing was filled in. */
      setsAssumed: false,
      repsAssumed: false,
      ...(durationSec ? { durationSec } : null),
      ...(r.section === 'warmup' ? { section: 'warmup' as const } : r.section === 'cooldown' ? { section: 'cooldown' as const } : null),
      ...(note ? { note } : null),
      ...(Object.keys(rx).length ? { rx } : null),
    };
  });

  /* The card's words that are not lifts — the warm-up, the recovery, a line nothing was made of — are listed on the
     preview ("weren't read as training"), so the athlete sees them rather than losing them. */
  const skipped = [w.how, w.after ? `Recovery: ${w.after}` : null, ...w.unread].filter((s): s is string => !!s && !!s.trim());
  const name = w.name && w.name !== 'Workout' ? w.name : 'Day 1';
  return { weeks: items.length ? [{ index: 1, days: [{ name, letter: 'A', items }] }] : [], skipped };
}

/* ── EDIT AS WORDS (PO 2026-09-30: "there should be a way to edit after the AI gives it to me") ───────────────────
 *
 * The preview's steppers re-count a row; they cannot change one rung of a ramp, a percentage or a rest. So a day can
 * be opened as WORDS — the same layout the squad screen's box holds — edited freely, and read back by the code
 * reader. No AI: what the athlete types is read as typed. The words are made from the preview AS IT STANDS (not from
 * the photo's first read), so a rename or a removed row is never undone by opening the editor.
 */

/** The preview's day → the reader's words. Null when a row holds something the words cannot say. */
export function dayToWords(day: ParsedDay): string | null {
  if (day.items.some((it) => it.kind === 'cardio' || it.section === 'cooldown' || (it.section === 'warmup' && !it.rx?.percentScheme?.length))) return null;
  const rows: WrittenTemplateRow[] = day.items.map((it) => {
    const rx = it.rx ?? {};
    const hold = it.durationSec ? `${it.durationSec % 60 === 0 && it.durationSec >= 60 ? `${it.durationSec / 60} min` : `${it.durationSec} seconds`} each set` : null;
    return {
      catalogKey: rx.catalogKey ?? null,
      name: it.name,
      sets: rx.repScheme?.length || it.sets,
      targetReps: it.durationSec ? 0 : it.reps,
      section: it.section === 'warmup' ? 'warmup' : 'main',
      groupId: rx.groupId ?? null,
      groupName: null,
      groupKind: rx.groupId ? 'superset' : null,
      groupRounds: null,
      coachNote: [hold, it.note ?? null].filter(Boolean).join(' · ') || null,
      ...(rx.repScheme?.length ? { repScheme: rx.repScheme } : null),
      ...(rx.repsMax != null ? { repsMax: rx.repsMax } : null),
      ...(rx.percentOfMax != null ? { percentOfMax: rx.percentOfMax } : null),
      ...(rx.percentScheme?.length ? { percentScheme: rx.percentScheme } : null),
      ...(rx.restSec != null ? { restSec: rx.restSec } : null),
      ...(rx.restScheme?.length ? { restScheme: rx.restScheme } : null),
    };
  });
  return rowsToWrittenText({ name: day.name, rows });
}

/** The athlete's words → a day for the preview, or null when no lift could be read from them. */
export function wordsToDay(text: string, resolveKey: (name: string) => string | undefined, letter = 'A'): ParsedDay | null {
  const w = readWrittenWorkout(text);
  const day = writtenToWeeks(w, writtenToTemplate(w, resolveKey)).weeks[0]?.days[0];
  return day && day.items.length ? { ...day, letter } : null;
}

/**
 * Only offered when the words read back to the SAME day — the same lifts, sets, reps, clocks, ramps, percentages,
 * rests and supersets. A day the words would quietly change (a sheet's cardio block, a cool-down) keeps its
 * steppers and nothing else, the rule `roundTrips` keeps for a posted workout.
 */
export function canEditAsWords(day: ParsedDay, resolveKey: (name: string) => string | undefined): boolean {
  const words = dayToWords(day);
  if (!words) return false;
  const back = wordsToDay(words, resolveKey, day.letter);
  if (!back || back.items.length !== day.items.length) return false;
  const key = (it: ParsedItem) =>
    JSON.stringify([
      it.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      it.rx?.repScheme?.length || it.sets,
      it.durationSec ? 0 : it.reps,
      it.durationSec ?? null,
      it.rx?.repScheme ?? null,
      it.rx?.repsMax ?? null,
      it.rx?.percentOfMax ?? null,
      it.rx?.percentScheme ?? null,
      it.rx?.restSec ?? null,
      it.rx?.restScheme ?? null,
      !!it.rx?.groupId,
      it.section ?? null,
    ]);
  return back.items.every((it, i) => key(it) === key(day.items[i]));
}

const WEEKDAY =/^(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?\b/i;

/* ── A TABLE, COPIED OFF A PHOTO AS LINES OF TEXT (AI audit 2026-11-16, V-D2) ─────────────────────────────────────
 *
 * The card reader (`workout-card-read`) copies a photo line by line. When the photo is a program SHEET, a line is a
 * row of the table, and its cells come back between tabs, between pipes ("Day | Exercise | Sets", with or without
 * the outer pipes of a markdown table), or as columns lined up with spaces. `parseProgramTable` reads only tabs and
 * markdown, and `isMultiDaySheet` looked for a Day/Week column only in the table reader's TSV, so a 3-week sheet read
 * by the card reader went down the one-workout path. `tableIn` finds the table in the text; `cardTableTsv` hands it
 * to `parseProgramTable` as the TSV the table reader would have written.
 *
 * ⚠ IT NEVER GUESSES A CELL. A row of spaced columns is read by the header's own column positions when every cell
 * lines up under a header cell; failing that, by runs of 2+ spaces only when that gives exactly the header's number
 * of cells (a blank cell between runs of spaces is lost, and then which column moved is unknowable). One row that
 * fits neither means there is no table here, and the card takes the one-workout path, as it did before.
 */

const DAY_COLUMNS = ['day', 'week', 'session'];
const KNOWN_COLUMN = /^(?:exercises?|movements?|lifts?|sets?|reps?|workout|weight|load|rest)$/;
/** "**Day**", "Day:", "SETS" → "day", "sets". */
const columnLabel = (cell: string) => cell.toLowerCase().replace(/^[\s*_#]+|[\s*_#:.]+$/g, '');
/** A markdown or drawn rule under a header: "|---|:--:|", "------  ----". */
const isRule = (line: string) => /^[\s|:+=-]+$/.test(line) && /-{2,}|={2,}/.test(line);

type Cut = { cells: string[]; starts: number[] | null };

/** A line's cells. Tabs and pipes keep a blank cell; spaced columns keep where each cell starts. */
function cut(line: string): Cut {
  if (line.includes('\t')) return { cells: line.split('\t').map((c) => c.trim()), starts: null };
  const t = line.trim();
  if (t.includes('|')) return { cells: t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()), starts: null };
  const found = [...line.matchAll(/\S+(?: \S+)*/g)];
  return { cells: found.map((m) => m[0]), starts: found.map((m) => m.index ?? 0) };
}

/** A header row: two or more cells, either a Day/Week/Session column beside a known one, or two known ones. */
function isHeader(cells: string[]): boolean {
  if (cells.length < 2) return false;
  const labels = cells.map(columnLabel);
  const known = labels.filter((l) => KNOWN_COLUMN.test(l)).length;
  return known >= 2 || (known >= 1 && labels.some((l) => DAY_COLUMNS.includes(l)));
}

/**
 * One row under `head`, cell for cell, or null when it cannot be placed without guessing. `lined` = the whole table
 * is spaced columns lined up under the header: each cell starts exactly where a header cell starts, and a blank cell
 * stays blank. Decided for the TABLE, never a row: in ragged text one short row's cell can land on a header's column
 * by chance (photo-18 rendered ragged put an exercise under Reps).
 */
function rowUnder(head: Cut, line: Cut, lined: boolean): string[] | null {
  const n = head.cells.length;
  if (!line.starts) return [...line.cells, ...Array<string>(Math.max(0, n - line.cells.length)).fill('')];
  if (!lined || !head.starts) return line.cells.length === n ? line.cells : null;
  const out = Array<string>(n).fill('');
  const placed = line.starts.every((s, k) => {
    const col = head.starts!.indexOf(s);
    if (col < 0 || out[col]) return false;
    out[col] = line.cells[k];
    return true;
  });
  return placed ? out : null;
}

/** The table in a card's text: where its header is, the header, and each line below it cut into cells (null = not a row). */
function tableIn(text: string): { lines: string[]; at: number; head: string[]; rows: (string[] | null)[] } | null {
  const lines = text.replace(/\r/g, '').replace(/ /g, ' ').split('\n').filter((l) => l.trim());
  const cuts = lines.map(cut);
  const at = cuts.findIndex((c) => isHeader(c.cells));
  if (at < 0) return null;
  const read = (lined: boolean): (string[] | null)[] | null => {
    const rows: (string[] | null)[] = [];
    for (let k = at + 1; k < lines.length; k++) {
      if (isRule(lines[k]) || cuts[k].cells.length < 2) {
        rows.push(null);
        continue;
      }
      const row = rowUnder(cuts[at], cuts[k], lined);
      if (!row) return null;
      rows.push(row);
    }
    return rows;
  };
  const rows = read(true) ?? read(false);
  return rows ? { lines, at, head: cuts[at].cells, rows } : null;
}

/**
 * A table copied off a photo as text → the TSV the table reader writes, for `parseProgramTable`. Lines that are not
 * rows (a title above, a "Week 2" between blocks) stay as written; rules are dropped. Null when there is no table.
 */
export function cardTableTsv(text: string): string | null {
  const t = tableIn(text);
  if (!t) return null;
  const below = t.lines.slice(t.at + 1).flatMap((l, k) => (t.rows[k] ? [t.rows[k]!.join('\t')] : isRule(l) ? [] : [l.trim()]));
  return [...t.lines.slice(0, t.at).map((l) => l.trim()), t.head.join('\t'), ...below].join('\n');
}

/*
 * TWO DAYS SIDE BY SIDE (AI Road to 10 Sprint 3b, IM-1). A program sheet laid out in two columns of days — the PO's
 * 3-week upper/lower sheet — comes off the card reader one printed row per line:
 *
 *   Monday- Upper Body A | Thursday- Upper Body B          ← the two days this part of the sheet holds
 *   Bench Press | 3 X 8-12 | Dips | 3 X 8-12              ← a lift for each, side by side
 *   Abs | | Abs |                                          ← a sub-heading in both columns (more of the same days)
 *   Note: Rest Periods = 1 Minute                          ← the week's own words
 *
 * Read across, it was one day of 24 lifts with the abs on the wrong days. Read down each column it is the sheet: the
 * left day, then the right, every week; a day name seen again starts the next week. Days in a week go in weekday order
 * (Monday, Tuesday, Thursday, Friday), as the athlete trains them. Only when EVERY line with pipes is one of those
 * three shapes; anything else and this is not that sheet (null).
 */
const PAIR_DAY = (cell: string) => WEEKDAY.test(cell) || /^day\s*\d/i.test(cell);
const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function sideBySideTsv(text: string): string | null {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  type Day = { name: string; rows: [string, string][] };
  const weeks: Day[][] = [];
  let week: Day[] = [];
  let pair: [Day, Day] | null = null;
  let pairs = 0;
  for (const line of lines) {
    if (!line.includes('|')) continue; // a note ("Note: Rest Periods = 1 Minute") — the week's words, not a row
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.length === 2 && cells.every(PAIR_DAY)) {
      if (cells.some((c) => week.some((d) => d.name.toLowerCase() === c.toLowerCase()))) {
        weeks.push(week);
        week = [];
      }
      pair = [
        { name: cells[0], rows: [] },
        { name: cells[1], rows: [] },
      ];
      week.push(...pair);
      pairs++;
      continue;
    }
    if (!pair) return null;
    const rx = /^\d{1,2}\s*[x×]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?$/i;
    /* "Abs | | Abs |" or "Abs | Abs": a sub-heading over more of the same two days — no prescription in any cell. */
    if (cells.length <= 4 && !cells.some((c) => rx.test(c))) continue;
    while (cells.length < 4) cells.push('');
    if (cells.length !== 4) return null;
    const [ln, lr, rn, rr] = cells;
    if ((ln && !rx.test(lr)) || (rn && !rx.test(rr))) return null;
    if (ln) pair[0].rows.push([ln, lr]);
    if (rn) pair[1].rows.push([rn, rr]);
  }
  if (week.length) weeks.push(week);
  if (pairs < 1 || !weeks.length || weeks.some((w) => w.some((d) => !d.rows.length))) return null;
  const order = (d: Day) => {
    const i = WEEKDAY_ORDER.indexOf(d.name.slice(0, 3).toLowerCase());
    return i < 0 ? 99 : i;
  };
  const out = ['Week\tDay\tExercise\tSets\tReps'];
  weeks.forEach((w, wi) => {
    const days = [...w].sort((a, b) => order(a) - order(b) || w.indexOf(a) - w.indexOf(b));
    for (const d of days) {
      for (const [name, rx] of d.rows) {
        const m = /^(\d{1,2})\s*[x×]\s*(.+)$/i.exec(rx)!;
        out.push([String(wi + 1), d.name, name, m[1], m[2].replace(/\s+/g, '')].join('\t'));
      }
    }
  });
  return out.join('\n');
}

/** Two or more different values in the Day, Week or Session column. */
function dayColumnVaries(head: readonly string[], rows: readonly string[][]): boolean {
  const labels = head.map(columnLabel);
  for (const col of DAY_COLUMNS) {
    const i = labels.indexOf(col);
    if (i < 0) continue;
    const values = new Set(rows.map((r) => (r[i] ?? '').toLowerCase()).filter((v) => v && columnLabel(v) !== col));
    if (values.size >= 2) return true;
  }
  return false;
}

/**
 * Is this photo a PROGRAM SHEET — several days or weeks — rather than one workout? Only then does the table reader
 * take it (`readImportPhoto`). ⚠ NOT "does `parseProgramTable` find two days": it read the PO's single Squatober
 * card as TWO days (2026-09-30), which would have sent the very card this path exists for around the AI check.
 *
 *   · the table's Day or Week column holds two or more different values — the table read's TSV, or, when the card
 *     reader copied the sheet as text, the table in that text (`tableIn`); or
 *   · the words have two or more DIFFERENT day headings ("Day 1 – Upper" … "Day 2 – Lower", "Monday" … "Wednesday")
 *     or two or more week headings ("Week 1" … "Week 2"), each at the start of its own line.
 */
export function isMultiDaySheet(text: string, tsv: string | null): boolean {
  if (tsv) {
    const rows = tsv.replace(/\r/g, '').split('\n').filter((l) => l.trim()).map((l) => l.split('\t').map((c) => c.trim()));
    const head = (rows[0] ?? []).map((h) => h.toLowerCase());
    for (const col of ['day', 'week', 'session']) {
      const i = head.indexOf(col);
      if (i >= 0 && new Set(rows.slice(1).map((r) => r[i]).filter(Boolean)).size >= 2) return true;
    }
  } else {
    const t = tableIn(text);
    if (t && dayColumnVaries(t.head, t.rows.filter((r): r is string[] => !!r))) return true;
  }
  const days = new Set<string>();
  const weeks = new Set<string>();
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const l = raw.trim();
    const week = /^week\s*[:#-]?\s*(\d{1,2})\b/i.exec(l);
    if (week) weeks.add(week[1]);
    const day = /^day\s*[:#-]?\s*(\d{1,2}|[a-g])\b/i.exec(l);
    if (day) days.add(day[1].toLowerCase());
    else if (WEEKDAY.test(l) && l.split(/\s+/).length <= 4) days.add(l.slice(0, 3).toLowerCase());
  }
  return days.size >= 2 || weeks.size >= 2;
}
