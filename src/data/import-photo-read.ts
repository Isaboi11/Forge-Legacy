import type { NoAiConsent } from '@/lib/consent';
import { readProgramPhoto } from '@/data/program-photo-live';
import { readWorkoutCard } from '@/data/workout-card-read-live';
import { tidyWrittenWorkout } from '@/data/workout-tidy-live';
import { parseProgramTable, type ParsedWeek } from '@/domain/program/import-parse';
import type { PhotoReadResult } from '@/domain/program/photo-read-result';
import { isMultiDaySheet, writtenToWeeks } from '@/domain/program/written-import';
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
 *   2. a sheet of SEVERAL days or weeks is a program table — that stays the table reader's job, as it always was;
 *   3. one workout goes through the AI layout (`workout-tidy`), which `checkAiRewrite` throws away if it changed a
 *      single number, and the written reader reads what is left: sets, ramps, percentages, rest, supersets;
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
  | Exclude<PhotoReadResult, { kind: 'ok' }>;

/** Why AI's layout is not the one being shown, in the poster's terms. */
function aiMissLine(kind: string): string {
  return kind === 'unfaithful'
    ? 'The AI check changed a number, so this is the reader’s own reading. Check every number against your photo.'
    : 'The AI check didn’t run on this one. Check every number against your photo.';
}

export async function readImportPhoto(uri: string, resolveKey: (name: string) => string | undefined): Promise<ImportPhotoRead> {
  /* ── 1. The words on the photo ── */
  const card = await readWorkoutCard(uri);
  let text: string;
  let tsv: string | null = null;
  if (card.kind === 'ok') text = card.text;
  else if (card.kind === 'not_deployed' || card.kind === 'offline' || card.kind === 'unavailable') {
    /* The card reader has no answer (not deployed yet, or down): the table read, as every door used before. */
    const r = await readProgramPhoto(uri);
    if (r.kind !== 'ok') return r;
    tsv = r.tsv;
    text = tsvToWrittenText(r.tsv);
  } else return card;

  /* ── 2. A sheet of several days or weeks is a program table (`isMultiDaySheet` says why that is its own test) ── */
  const table = parseProgramTable(tsv ?? text);
  const dayCount = table.ok ? table.weeks.reduce((n, w) => n + w.days.length, 0) : 0;
  if (table.ok && isMultiDaySheet(text, tsv)) {
    return { kind: 'ok', weeks: table.weeks, skipped: table.skipped ?? [], checks: [], via: 'table', text: tsv ?? text };
  }

  /* ── 3. One workout: AI lays it out, the code reads it ── */
  const checks: string[] = [];
  let words = text;
  const tidy = await tidyWrittenWorkout(text, resolveKey);
  if (tidy.kind === 'ok') words = tidy.text;
  else if (tidy.kind === 'no_consent') return tidy;
  else checks.push(aiMissLine(tidy.kind));

  const w = readWrittenWorkout(words);
  const rows = writtenToTemplate(w, resolveKey);
  if (!rows.length) {
    /* Nothing the written reader could make a lift of: the table reader's reading, if it had one. */
    if (table.ok && dayCount) return { kind: 'ok', weeks: table.weeks, skipped: table.skipped ?? [], checks, via: 'table', text: tsv ?? text };
    return { kind: 'unparsed', error: 'No exercises could be read from that photo. Try a closer, straighter shot.' };
  }
  /* The preview already says which names the library doesn't know, with its own "Did you mean". */
  checks.push(...checkBeforePosting(w, rows).filter((c) => !/isn’t in the exercise library/.test(c)));

  /* ── 4. The preview's weeks ── */
  const { weeks, skipped } = writtenToWeeks(w, rows);
  return { kind: 'ok', weeks, skipped, checks, via: 'card', text: words };
}
