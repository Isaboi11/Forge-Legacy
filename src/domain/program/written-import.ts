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
    const note = hold ? pieces.filter((_, i) => i !== at).join(', ') : noteParts.join(' · ');

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
      sets: r.repScheme?.length || r.sets,
      reps: r.targetReps,
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

/**
 * Is this photo a PROGRAM SHEET — several days or weeks — rather than one workout? Only then does the table reader
 * take it (`readImportPhoto`). ⚠ NOT "does `parseProgramTable` find two days": it read the PO's single Squatober
 * card as TWO days (2026-09-30), which would have sent the very card this path exists for around the AI check.
 *
 *   · the table read's Day or Week column holds two or more different values; or
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
