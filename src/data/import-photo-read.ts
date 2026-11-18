import type { NoAiConsent } from '@/lib/consent';
import type { Refundable } from '@/domain/ai/ai-call';
import { readProgramPhoto } from '@/data/program-photo-live';
import { cardReadFallsBack, readWorkoutCard } from '@/data/workout-card-read-live';
import { tidyWrittenWorkout } from '@/data/workout-tidy-live';
import { parseProgramTable, type ParsedWeek } from '@/domain/program/import-parse';
import type { PhotoReadResult } from '@/domain/program/photo-read-result';
import type { ImportPhase } from '@/domain/ai/ai-status';
import { cardTableTsv, isMultiDaySheet, sideBySideTsv, writtenToWeeks } from '@/domain/program/written-import';
import { circuitCardText, circuitWorkout, layoutDisagrees, readCircuitCard } from '@/domain/program/circuit-card';
import { checkBeforePosting, readWrittenWorkout, tsvToWrittenText, writtenToTemplate } from '@/domain/workout/written-workout';

/**
 * ONE PHOTO READER FOR EVERY IMPORT DOOR (PO 2026-09-30: "shouldn't this be the same card reader as when I put it in
 * … Build a Program? That should be going through AI as well so we know it works").
 *
 * Build a Program's pictures, Build a Template's picture, Home's "Paste a workout", the builders' import sheet and
 * a picture pasted into Holt's chat all read a photo HERE, the same way the squad screen does:
 *
 *   1. the whole card, line by line (`workout-card-read`) — or, until that function is deployed, the table read,
 *      turned into the same words (`tsvToWrittenText`);
 *   2. a sheet of SEVERAL days or weeks is a program table — that stays the table reader's job, as it always was
 *      (two days printed side by side are unfolded into it first, `sideBySideTsv`);
 *   3. one workout goes through the AI layout (`workout-tidy`) — EVERY photo (PO 09-30, re-affirmed 2026-11-18) —
 *      which `checkAiRewrite` throws away if it changed a single number, and the written reader reads what is left:
 *      sets, ramps, percentages, rest, supersets. A workout APP's screen that code reads line for line
 *      (`circuit-card.ts`) holds the layout to it lift for lift, and is read that way when the layout is thrown away
 *      or did not run — never split into days on its CIRCUIT headings;
 *   4. it comes back as the import preview's weeks (`writtenToWeeks`), with anything to check listed.
 *
 * The athlete still sees every number on the preview and presses Create; nothing is made from here.
 *
 * ⚠ NEVER THROWS, and a refusal keeps its own name (the screens' own messages say which).
 */

export type ImportPhotoRead =
  | {
      kind: 'ok';
      weeks: ParsedWeek[];
      /** Lines not read as training — listed on the preview. */
      skipped: string[];
      /** Things to look at before Create — a number AI could not check, a set count off the card's own tally. */
      checks: string[];
      /** 'card' = read as one workout through the AI check; 'table' = a multi-day sheet, read by the table reader. */
      via: 'card' | 'table';
      /** The words the read was made from, for a paste box that shows them. */
      text: string;
    }
  | { kind: 'unparsed'; error: string }
  | NoAiConsent
  /** `refunded`: the read that failed was given back (Sprint 1) — the screens add "Not charged." */
  | Refundable<Exclude<PhotoReadResult, { kind: 'ok' }>>;

/** Why AI's layout is not the one being shown, in the poster's terms. */
function aiMissLine(kind: string): string {
  return kind === 'unfaithful'
    ? 'The AI check changed a number, so this is the reader’s own reading. Check every number against your photo.'
    : 'The AI check didn’t run on this one. Check every number against your photo.';
}

/** `signal`: the screen or sheet closed — every AI call below it stops (Sprint 1, P-G3). */
export async function readImportPhoto(
  uri: string,
  resolveKey: (name: string) => string | undefined,
  signal?: AbortSignal,
  /** IM-4: which step this photo is on, for the screen's progress (`importProgress`). Optional; never awaited. */
  onStep?: (phase: ImportPhase) => void,
): Promise<ImportPhotoRead> {
  /* ── 1. The words on the photo ── */
  onStep?.('card');
  const card = await readWorkoutCard(uri, signal);
  let text: string;
  let tsv: string | null = null;
  if (card.kind === 'ok') text = card.text;
  else if (card.kind === 'not_deployed' || cardReadFallsBack(card)) {
    /* The card reader has no answer (not deployed yet, or down): the table read, as every door used before. Not
       after a timeout — a second read of the same photo would be just as slow (`cardReadFallsBack`, V-D5). */
    const r = await readProgramPhoto(uri, signal);
    if (r.kind !== 'ok') return r;
    tsv = r.tsv;
    text = tsvToWrittenText(r.tsv);
  } else return card;

  /* ── 2. A sheet of several days or weeks is a program table (`isMultiDaySheet` says why that is its own test) ── */
  /* The card reader copies a sheet as lines of text — tabs, pipes or spaced columns. `cardTableTsv` cuts them back
     into the table reader's TSV, which `parseProgramTable` reads (it reads tabs and markdown only). */
  /* Two days printed side by side ("Monday | Thursday") are unfolded into the same TSV, one day after the other. */
  const sideTsv = tsv ? null : sideBySideTsv(text);
  const sheet = tsv ?? sideTsv ?? cardTableTsv(text);
  const table = parseProgramTable(sheet ?? text);
  const dayCount = table.ok ? table.weeks.reduce((n, w) => n + w.days.length, 0) : 0;
  if (table.ok && isMultiDaySheet(text, tsv ?? sideTsv)) {
    return { kind: 'ok', weeks: table.weeks, skipped: table.skipped ?? [], checks: [], via: 'table', text: sheet ?? text };
  }

  /* ── 3. One workout: AI lays it out, the code reads it ── */
  /* A workout app's screen that code reads line for line (`circuit-card.ts`, Sprint 3b): its own reading, held
     ready — the AI layout must agree with it, and stands in for it when the layout is thrown away or did not run. */
  const blocks = readCircuitCard(text);
  const screen = (() => {
    if (!blocks) return null;
    const cw = circuitWorkout(blocks);
    const cRows = writtenToTemplate(cw, resolveKey);
    if (!cRows.length) return null;
    const read = writtenToWeeks(cw, cRows);
    return { ...read, checks: checkBeforePosting(cw, cRows).filter((c) => !/isn’t in the exercise library/.test(c)), text: circuitCardText(blocks) };
  })();
  const screenRead = (why: string): ImportPhotoRead => ({ kind: 'ok', weeks: screen!.weeks, skipped: screen!.skipped, checks: [why, ...screen!.checks], via: 'card', text: screen!.text });

  const checks: string[] = [];
  let words = text;
  onStep?.('layout');
  const tidy = await tidyWrittenWorkout(text, resolveKey, signal);
  if (tidy.kind === 'ok') words = tidy.text;
  else if (tidy.kind === 'no_consent') return tidy;
  else {
    /* No layout to read: the screen's own reading, never the written reader's cut of it into a "day" per CIRCUIT. */
    if (screen) return screenRead(aiMissLine(tidy.kind));
    checks.push(aiMissLine(tidy.kind));
  }

  const w = readWrittenWorkout(words);
  const rows = writtenToTemplate(w, resolveKey);
  if (!rows.length) {
    if (screen) return screenRead(aiMissLine('unfaithful'));
    /* Nothing the written reader could make a lift of: the table reader's reading, if it had one. */
    if (table.ok && dayCount) return { kind: 'ok', weeks: table.weeks, skipped: table.skipped ?? [], checks, via: 'table', text: sheet ?? text };
    return { kind: 'unparsed', error: 'No exercises could be read from that photo. Try a closer, straighter shot.' };
  }
  /* The preview already says which names the library doesn't know, with its own "Did you mean". */
  checks.push(...checkBeforePosting(w, rows).filter((c) => !/isn’t in the exercise library/.test(c)));

  /* ── 4. The preview's weeks ── */
  const { weeks, skipped } = writtenToWeeks(w, rows);
  /* On an app's screen the layout is held to the screen, lift for lift (`layoutDisagrees`): a number moved to the
     wrong lift is a changed number, and the layout is thrown away as `checkAiRewrite` throws one away. */
  if (screen && tidy.kind === 'ok' && layoutDisagrees(weeks[0]?.days[0]?.items ?? [], screen.weeks[0]?.days[0]?.items ?? [])) {
    return screenRead(aiMissLine('unfaithful'));
  }
  return { kind: 'ok', weeks, skipped, checks, via: 'card', text: words };
}
