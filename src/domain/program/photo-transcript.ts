/**
 * READING A PHOTO OF A PROGRAM — the guard, not the reader.
 *
 * ══ WHAT THIS IS ══
 *
 * `Architecture-Amendment-001-Import.md` §5 named this feature and deferred it: *"Image Import:
 * screenshots of training tables from other apps, photos of printed programs. Requires OCR or vision
 * model parsing. Post-MVP."* This is that, and it is built to stay inside the locked principle §4.3
 * states in the same document — *"Import First, Automate Later … No AI interpretation. No inference."*
 *
 * It stays inside it by giving the model exactly one job: **transcribe the pixels into tab-separated
 * rows.** It does not decide what a program is. It does not name an exercise. It does not fill in a
 * missing set count. `parseProgramTable()` — the same thousand lines that already read a paste — does
 * every bit of the interpreting, so a photo import and a paste of the same table produce byte-identical
 * results and go through the same preview.
 *
 * That is the split `coach-interpret` already runs on, in the words of the coach brief: *"Holt does not
 * write programs. He calls a machine that does."* Here the model does not read a program. It reads
 * characters, and the machine that already reads programs reads those.
 *
 * ══ ⚠ THIS FILE IS THE BOUNDARY, AND IT IS CODE BECAUSE A PROMPT IS A REQUEST ══
 *
 * The system prompt tells the model to emit TSV and nothing else. That is a request. This is the
 * boundary, and it is the same shape as the `ACUTE` acuity override in `coach-interpret/index.ts`:
 * it runs AFTER the model answers and overrules it.
 *
 * The rule that does the work is one line — **a kept line must contain a tab.** It is worth stating why
 * something that simple is enough:
 *
 *   · Model prose has no tabs. *"This image shows a 4-week push/pull program…"* cannot survive.
 *   · A description of a PERSON has no tabs. That matters more than the prose case, and it is the
 *     reason this is a hard filter rather than a tidy-up. The athlete points a camera; the app cannot
 *     enforce what is in frame. So nothing that is not a table row is permitted to come back at all —
 *     the function cannot describe a body because it has no channel that carries a sentence.
 *   · It is verifiable in both directions, which `feedback_verify_guards_empirically` requires and which
 *     the tests beside this file do: real transcripts survive, prose and descriptions do not.
 *
 * ⚠ **DO NOT "FIX" THIS BY ACCEPTING UNTABBED LINES.** A week heading on its own row ("Week 2") is a
 * shape `parseProgramTable` supports from a paste and this rejects from a photo. That is deliberate:
 * the model is told to emit a Week COLUMN instead, so the heading path is never needed, and widening
 * the filter to allow bare lines is the one change that would reopen the prose channel.
 */

/** The transcript, or why there isn't one. Never prose, and never a sentence about what was in frame. */
export type TranscriptResult =
  | { ok: true; tsv: string; rows: number }
  /** The model said it was not a training table, or nothing survived the filter. */
  | { ok: false; reason: 'not_a_program' }
  /** Rows came back, but not enough of one to hand to the parser. */
  | { ok: false; reason: 'unreadable' };

/**
 * Ceilings. A photo of a training table is a page, not a book.
 *
 * These bound what reaches `parseProgramTable`, which has no size limit of its own because a paste is
 * bounded by what a person is willing to paste. A model is not, and a runaway repetition is the classic
 * way a vision transcription fails.
 */
const MAX_ROWS = 600;
const MAX_LINE_CHARS = 300;

/** Fenced blocks are the single most likely wrapper even when the prompt forbids them. */
const FENCE = /^\s*```[\w]*\s*$/;

/**
 * Header aliases, deliberately a SUBSET of `import-parse.ts`'s `COLUMNS`.
 *
 * ⚠ These are not here to parse the header — `parseProgramTable` does that, and duplicating its alias
 * list would be two sources for one question. They are here to answer a different question: *is this a
 * training table at all?* A grid of numbers with a header naming an exercise column is; a receipt, a
 * spreadsheet of expenses, or a screenshot of a text conversation is not.
 */
const TRAINING_VOCABULARY = [
  'exercise', 'movement', 'lift', 'name',
  'set', 'rep', 'scheme', 'volume',
  'week', 'day', 'session', 'workout', 'split',
];

/**
 * How many distinct vocabulary words a header must carry to count as training.
 *
 * ⚠ **TWO, NOT ONE, AND NOT A REQUIRED "EXERCISE" COLUMN.** Both halves of that were got wrong first
 * and caught by the known-good tests rather than by the known-bad ones.
 *
 * Requiring an exercise-name column rejects the entire endurance case — a triathlon plan's header is
 * `Week · Day · Session`, with no movement column anywhere, and `import-session-text.ts` exists
 * precisely to read it. Requiring only one word accepts a contact list on `Name`. Two distinct words
 * takes both: `Week+Day+Session` is three, `Name+Sets+Reps` is three, and `Name · Email · Phone` is one.
 */
const MIN_VOCABULARY = 2;

const cells = (line: string) => line.split('\t');

/** Every cell empty — the blank row a spreadsheet screenshot is full of. */
const isEmptyRow = (line: string) => cells(line).every((c) => c.trim() === '');

/**
 * Does this line read as the header of a training table?
 *
 * Both halves are required. "Name" alone matches a contact list; "Sets" alone matches nothing useful.
 * Together they are specific to a program in a way that a false positive would have to work at.
 */
function looksLikeTrainingHeader(line: string): boolean {
  const lower = line.toLowerCase();
  const hits = TRAINING_VOCABULARY.filter((word) => lower.includes(word));
  return hits.length >= MIN_VOCABULARY;
}

/**
 * Turn whatever the model returned into something safe to hand `parseProgramTable`, or refuse.
 *
 * ⚠ NEVER THROWS and never returns text it was not given — this only ever DROPS. There is no path here
 * that writes a row, corrects a cell, or supplies a default, because a transcript that improves on the
 * photograph is a transcript that is lying about what the athlete's coach wrote.
 */
export function sanitizeTranscript(raw: string | null | undefined): TranscriptResult {
  if (!raw || typeof raw !== 'string') return { ok: false, reason: 'not_a_program' };

  const kept: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (kept.length >= MAX_ROWS) break;
    if (FENCE.test(line)) continue;
    // ⚠ THE BOUNDARY. No tab, no passage. See the header — this is the whole guard.
    if (!line.includes('\t')) continue;

    const trimmed = line.replace(/\s+$/, '').slice(0, MAX_LINE_CHARS);
    if (isEmptyRow(trimmed)) continue;
    kept.push(trimmed);
  }

  if (kept.length === 0) return { ok: false, reason: 'not_a_program' };
  // A header with no rows under it is a photo we could not read, not a photo of the wrong thing. The
  // two get different copy: one is "try a clearer shot", the other is "that isn't a program".
  if (kept.length < 2) return { ok: false, reason: 'unreadable' };
  if (!looksLikeTrainingHeader(kept[0])) return { ok: false, reason: 'not_a_program' };

  return { ok: true, tsv: kept.join('\n'), rows: kept.length - 1 };
}
